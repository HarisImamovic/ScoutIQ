from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import require_global_admin, require_role
from app.email import send_ai_access_requested_email
from app.limiter import limiter
from app.models.ai_access_request import AiAccessRequest
from app.models.user import User
from app.schemas.ai import (
    AiAccessRequestCreate,
    AiAccessRequestDetail,
    AiAccessRequestMine,
)
from app.utils.audit import record_audit
from app.utils.notifications import create_notification, notify_global_admins
from app.utils.uuid import parse_uuid

router = APIRouter(prefix="/ai/access-requests", tags=["ai-access"])

_require_scout = require_role("scout")


@router.post("", response_model=AiAccessRequestMine, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def create_access_request(
    request: Request,
    body: AiAccessRequestCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    if current_user.ai_access:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have access to the AI Assistant.",
        )

    existing = (
        db.query(AiAccessRequest)
        .filter(
            AiAccessRequest.user_id == current_user.id,
            AiAccessRequest.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a pending access request. Please wait for a decision.",
        )

    req = AiAccessRequest(user_id=current_user.id, message=body.message, status="pending")
    db.add(req)
    db.flush()

    requester_name = f"{current_user.first_name} {current_user.last_name}"
    notify_global_admins(
        db,
        "profile",
        "AI Access Requested",
        f"{requester_name} requested access to the AI Assistant.",
        action_data={
            "type": "ai_access_request",
            "request_id": str(req.id),
            "requester_name": requester_name,
        },
    )

    admin_emails = [
        email
        for (email,) in db.query(User.email)
        .filter(User.role == "global_admin", User.deleted_at.is_(None))
        .all()
    ]
    review_link = f"{get_settings().frontend_url}/dashboard/notifications"
    for admin_email in admin_emails:
        background_tasks.add_task(
            send_ai_access_requested_email,
            admin_email,
            requester_name,
            current_user.email,
            body.message,
            review_link,
        )

    record_audit(
        db, "ai_access.request", actor=current_user, target_type="ai_access_request",
        target_id=req.id, request=request, detail="Scout requested AI access.",
    )

    db.commit()
    db.refresh(req)
    return AiAccessRequestMine(
        id=str(req.id), status=req.status, message=req.message, created_at=req.created_at
    )


@router.get("/mine", response_model=AiAccessRequestMine)
def my_access_request(
    current_user: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    req = (
        db.query(AiAccessRequest)
        .filter(AiAccessRequest.user_id == current_user.id)
        .order_by(AiAccessRequest.created_at.desc())
        .first()
    )
    if not req:
        return AiAccessRequestMine()
    return AiAccessRequestMine(
        id=str(req.id), status=req.status, message=req.message, created_at=req.created_at
    )


@router.get("/{request_id}", response_model=AiAccessRequestDetail)
def get_access_request(
    request_id: str,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    rid = parse_uuid(request_id, "request_id format")
    row = (
        db.query(AiAccessRequest, User)
        .join(User, AiAccessRequest.user_id == User.id)
        .filter(AiAccessRequest.id == rid)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    req, requester = row
    return AiAccessRequestDetail(
        id=str(req.id),
        requester_name=f"{requester.first_name} {requester.last_name}",
        requester_email=requester.email,
        message=req.message,
        status=req.status,
        created_at=req.created_at,
    )


def _resolve_request(request_id: str, db: Session) -> tuple[AiAccessRequest, User]:
    rid = parse_uuid(request_id, "request_id format")
    row = (
        db.query(AiAccessRequest, User)
        .join(User, AiAccessRequest.user_id == User.id)
        .filter(AiAccessRequest.id == rid)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    req, requester = row
    if req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This request has already been reviewed.",
        )
    return req, requester


@router.post("/{request_id}/approve", response_model=AiAccessRequestDetail)
@limiter.limit("30/minute")
def approve_access_request(
    request: Request,
    request_id: str,
    admin: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    req, requester = _resolve_request(request_id, db)

    now = datetime.now(timezone.utc)
    req.status = "approved"
    req.reviewed_by = admin.id
    req.reviewed_at = now
    if requester.role == "scout":
        requester.ai_access = True
        requester.updated_at = now

    create_notification(
        db, requester.id, "profile", "AI Access Approved",
        "Your request for AI Assistant access has been approved. You can now use the AI Assistant.",
    )
    record_audit(
        db, "ai_access.request_approve", actor=admin, target_type="user",
        target_id=requester.id, request=request,
        detail=f"Approved AI access request {req.id} for {requester.email}.",
    )

    db.commit()
    db.refresh(req)
    return AiAccessRequestDetail(
        id=str(req.id),
        requester_name=f"{requester.first_name} {requester.last_name}",
        requester_email=requester.email,
        message=req.message,
        status=req.status,
        created_at=req.created_at,
    )


@router.post("/{request_id}/reject", response_model=AiAccessRequestDetail)
@limiter.limit("30/minute")
def reject_access_request(
    request: Request,
    request_id: str,
    admin: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    req, requester = _resolve_request(request_id, db)

    req.status = "rejected"
    req.reviewed_by = admin.id
    req.reviewed_at = datetime.now(timezone.utc)

    create_notification(
        db, requester.id, "profile", "AI Access Declined",
        "Your request for AI Assistant access was not approved at this time.",
    )
    record_audit(
        db, "ai_access.request_reject", actor=admin, target_type="user",
        target_id=requester.id, request=request,
        detail=f"Rejected AI access request {req.id} for {requester.email}.",
    )

    db.commit()
    db.refresh(req)
    return AiAccessRequestDetail(
        id=str(req.id),
        requester_name=f"{requester.first_name} {requester.last_name}",
        requester_email=requester.email,
        message=req.message,
        status=req.status,
        created_at=req.created_at,
    )
