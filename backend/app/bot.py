import asyncio
import logging
import threading
from datetime import datetime, timezone

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

from app.config import get_settings

logger = logging.getLogger(__name__)

_app: Application | None = None
_bot_loop: asyncio.AbstractEventLoop | None = None


async def _handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return

    text = update.message.text or ""
    chat_id = str(update.message.chat.id)

    if " " not in text:
        await update.message.reply_text(
            "No link code found. Please use the Connect Telegram button in your ScoutIQ settings."
        )
        return

    code = text.split(" ", 1)[1].strip()

    from app.database import SessionLocal
    from app.models.user import User

    with SessionLocal() as db:
        now = datetime.now(timezone.utc)
        user = (
            db.query(User)
            .filter(
                User.telegram_link_code == code,
                User.telegram_link_code_expires_at > now,
            )
            .first()
        )

        if not user:
            await update.message.reply_text(
                "This link code is invalid or has expired. Please generate a new one from your ScoutIQ settings."
            )
            return

        user.telegram_chat_id = chat_id
        user.telegram_link_code = None
        user.telegram_link_code_expires_at = None
        user.updated_at = now
        db.commit()

    await update.message.reply_text(
        "Your Telegram account has been connected to ScoutIQ! You will now receive report notifications here."
    )


def _build_application(token: str) -> Application:
    application = Application.builder().token(token).build()
    application.add_handler(CommandHandler("start", _handle_start))
    return application


# ---------------------------------------------------------------------------
# Polling mode (development): a dedicated event loop in a daemon thread.
# ---------------------------------------------------------------------------

def _run_in_thread(token: str) -> None:
    global _app, _bot_loop

    _bot_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_bot_loop)

    async def _run() -> None:
        global _app
        _app = _build_application(token)
        await _app.initialize()
        await _app.start()
        await _app.updater.start_polling(drop_pending_updates=True)
        await asyncio.Event().wait()

    _bot_loop.run_until_complete(_run())


def start_bot() -> None:
    """Start the bot in polling mode (used in dev). No-op in webhook mode."""
    settings = get_settings()
    if not settings.telegram_bot_token or settings.telegram_webhook_enabled:
        return
    thread = threading.Thread(target=_run_in_thread, args=(settings.telegram_bot_token,), daemon=True)
    thread.start()


# ---------------------------------------------------------------------------
# Webhook mode (production): the Application shares the FastAPI event loop and
# updates are delivered by Telegram to the /telegram/webhook endpoint.
# ---------------------------------------------------------------------------

async def start_webhook(token: str, webhook_url: str, secret: str) -> None:
    global _app, _bot_loop

    _bot_loop = asyncio.get_running_loop()
    _app = _build_application(token)
    await _app.initialize()
    await _app.start()
    await _app.bot.set_webhook(
        url=webhook_url,
        secret_token=secret or None,
        allowed_updates=["message"],
        drop_pending_updates=True,
    )
    logger.info("Telegram webhook registered at %s", webhook_url)


async def stop_webhook() -> None:
    global _app
    if _app is None:
        return
    try:
        if _app.running:
            await _app.stop()
        await _app.shutdown()
    except Exception:
        logger.exception("Failed to shut down Telegram application cleanly")
    _app = None


async def process_webhook_update(data: dict) -> None:
    if _app is None:
        return
    update = Update.de_json(data, _app.bot)
    await _app.update_queue.put(update)


# ---------------------------------------------------------------------------
# Outbound messages (works in both modes; called from sync background tasks).
# ---------------------------------------------------------------------------

def send_message(chat_id: str, text: str) -> None:
    if not _app or not _bot_loop:
        return
    try:
        future = asyncio.run_coroutine_threadsafe(
            _app.bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML"),
            _bot_loop,
        )
        future.result(timeout=5)
    except Exception:
        logger.exception("Failed to send Telegram message to chat_id=%s", chat_id)
