from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

_ROLE_LABELS: dict[str, str] = {
    "player": "Player",
    "scout": "Scout",
    "club_admin": "Club Admin",
    "global_admin": "Global Admin",
}


def format_role(role: str) -> str:
    return _ROLE_LABELS.get(role, role)


def create_notification(
    db: Session,
    user_id: Any,
    icon_type: str,
    title: str,
    body: str,
    action_data: dict | None = None,
) -> None:
    from app.models.notification import Notification

    db.add(
        Notification(
            user_id=user_id,
            icon_type=icon_type,
            title=title,
            body=body,
            action_data=action_data,
        )
    )


def notify_global_admins(
    db: Session,
    icon_type: str,
    title: str,
    body: str,
    action_data: dict | None = None,
) -> None:
    from app.models.user import User

    admins = db.query(User).filter(User.role == "global_admin", User.deleted_at.is_(None)).all()
    for admin in admins:
        create_notification(db, admin.id, icon_type, title, body, action_data)


def notify_club_admins(
    db: Session,
    club_id: Any,
    icon_type: str,
    title: str,
    body: str,
    action_data: dict | None = None,
) -> None:
    from app.models.user import User

    admins = (
        db.query(User)
        .filter(
            User.club_id == club_id,
            User.role == "club_admin",
            User.deleted_at.is_(None),
        )
        .all()
    )
    for admin in admins:
        create_notification(db, admin.id, icon_type, title, body, action_data)
