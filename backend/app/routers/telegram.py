import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.bot import process_webhook_update
from app.config import get_settings
from app.database import get_db
from app.dependencies import require_role
from app.limiter import limiter
from app.models.user import User

logger = logging.getLogger(__name__)

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
@limiter.limit("5/minute")
def generate_link_code(
    request: Request,
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


@router.post("/webhook", include_in_schema=False)
async def telegram_webhook(request: Request):
    settings = get_settings()
    if not settings.telegram_webhook_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")

    secret = settings.telegram_webhook_secret
    provided = request.headers.get("x-telegram-bot-api-secret-token", "")
    if not secret or not hmac.compare_digest(provided, secret):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload.")

    try:
        await process_webhook_update(data)
    except Exception:
        logger.exception("Failed to process Telegram webhook update")

    return Response(status_code=status.HTTP_200_OK)
