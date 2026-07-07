from html import escape

from app.bot import send_message


def send_telegram_message(chat_id: str, text: str) -> None:
    send_message(chat_id, text)


def send_report_notification(chat_id: str, player_name: str, new_status: str) -> None:
    icon = "✅" if new_status == "approved" else "❌"
    safe_name = escape(player_name)
    safe_status = escape(new_status)
    send_message(
        chat_id,
        f"{icon} Your scouting report for <b>{safe_name}</b> has been <b>{safe_status}</b>.",
    )
