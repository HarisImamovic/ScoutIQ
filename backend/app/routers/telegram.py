import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import require_role
from app.models.user import User

_require_scout = require_role("scout")

router = APIRouter(prefix="/telegram", tags=["telegram"])

_LINK_CODE_TTL_MINUTES = 15


class TelegramStatus(BaseModel):
    connected: bool


class TelegramLinkCode(BaseModel):
    code: str
    expires_at: datetime
    bot_username: str


@router.get("/status", response_model=TelegramStatus)
def get_telegram_status(current_user: User = Depends(_require_scout)):
    return TelegramStatus(connected=current_user.telegram_chat_id is not None)


@router.post("/generate-code", response_model=TelegramLinkCode)
def generate_link_code(
    current_user: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    code = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=_LINK_CODE_TTL_MINUTES)

    current_user.telegram_link_code = code
    current_user.telegram_link_code_expires_at = expires_at
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return TelegramLinkCode(
        code=code,
        expires_at=expires_at,
        bot_username=get_settings().telegram_bot_username,
    )


@router.delete("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_telegram(
    current_user: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    current_user.telegram_chat_id = None
    current_user.telegram_link_code = None
    current_user.telegram_link_code_expires_at = None
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
