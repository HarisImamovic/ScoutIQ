from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)


def _client_ip(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    if request.client:
        return request.client.host
    return None


def record_audit(
    db: Session,
    action: str,
    *,
    actor: Optional[User] = None,
    actor_id: Any = None,
    actor_email: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Any = None,
    request: Optional[Request] = None,
    detail: Optional[str] = None,
    metadata: Optional[dict] = None,
    commit: bool = False,
) -> None:
    try:
        entry = AuditLog(
            actor_id=actor.id if actor is not None else actor_id,
            actor_email=(actor.email if actor is not None else actor_email),
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            ip_address=_client_ip(request),
            detail=detail,
            metadata_json=metadata,
        )
        db.add(entry)
        if commit:
            db.commit()
    except Exception:
        logger.exception("Failed to write audit log entry action=%s", action)
        if commit:
            db.rollback()
