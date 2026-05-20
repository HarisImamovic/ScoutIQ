from app.bot import send_message


def send_telegram_message(chat_id: str, text: str) -> None:
    send_message(chat_id, text)


def send_report_notification(chat_id: str, player_name: str, new_status: str) -> None:
    icon = "✅" if new_status == "approved" else "❌"
    send_message(
        chat_id,
        f"{icon} Your scouting report for <b>{player_name}</b> has been <b>{new_status}</b>.",
    )
