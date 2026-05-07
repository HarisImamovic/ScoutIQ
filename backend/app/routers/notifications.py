import uuid as _uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.models.player_highlight import PlayerHighlight
from app.models.user import User
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])

_DAYS_WINDOW = 10


@router.get("", response_model=list[NotificationResponse])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=_DAYS_WINDOW)
    rows = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.created_at >= cutoff,
        )
        .order_by(Notification.created_at.desc())
        .all()
    )

    highlight_ids: list[_uuid.UUID] = []
    for n in rows:
        if n.action_data and n.action_data.get("highlight_id"):
            try:
                highlight_ids.append(_uuid.UUID(n.action_data["highlight_id"]))
            except (ValueError, AttributeError):
                pass

    highlight_status_map: dict[str, str] = {}
    if highlight_ids:
        for h in db.query(PlayerHighlight).filter(PlayerHighlight.id.in_(highlight_ids)).all():
            highlight_status_map[str(h.id)] = h.status

    result = []
    for n in rows:
        data = dict(n.action_data) if n.action_data else None
        if data and data.get("highlight_id"):
            hid = data["highlight_id"]
            data["highlight_status"] = highlight_status_map.get(hid, "deleted")
        result.append(
            NotificationResponse(
                id=str(n.id),
                icon_type=n.icon_type,
                title=n.title,
                body=n.body,
                action_data=data,
                is_read=n.is_read,
                created_at=n.created_at,
            )
        )

    return result


@router.post("/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    db.query(Notification).filter(Notification.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
