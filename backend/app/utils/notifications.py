from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session


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
