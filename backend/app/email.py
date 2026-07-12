import logging

import requests

from app.config import get_settings

logger = logging.getLogger(__name__)

_RESEND_API_URL = "https://api.resend.com/emails"


def _send(to_email: str, subject: str, plain: str, html: str) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        return

    try:
        response = requests.post(
            _RESEND_API_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": settings.resend_from_email,
                "to": [to_email],
                "subject": subject,
                "text": plain,
                "html": html,
            },
            timeout=10,
        )
        response.raise_for_status()
    except Exception:
        logger.exception("Failed to send email (subject=%r) to %s", subject, to_email)


def send_mfa_code_email(to_email: str, code: str, expires_minutes: int) -> None:
    plain = (
        f"Your ScoutIQ verification code is: {code}\n\n"
        f"This code expires in {expires_minutes} minutes.\n\n"
        f"If you did not request this code, someone may be trying to access your account — "
        f"we recommend changing your password immediately."
    )

    html = f"""\
<html>
  <body style="font-family:sans-serif;color:#1a1a1a;max-width:480px;margin:auto;padding:32px 24px">
    <h2 style="margin-bottom:8px">Your verification code</h2>
    <p style="color:#555;margin-bottom:24px">
      Enter this code to continue signing in to ScoutIQ.
      It expires in <strong>{expires_minutes} minutes</strong>.
    </p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f4f4f5;
                border-radius:8px;padding:16px 24px;text-align:center">{code}</div>
    <p style="margin-top:24px;font-size:13px;color:#888">
      If you didn't request this code, someone may be trying to access your account —
      we recommend changing your password immediately.
    </p>
    <hr style="margin-top:32px;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#aaa">ScoutIQ · Football Scouting Platform</p>
  </body>
</html>"""

    _send(to_email, "Your ScoutIQ verification code", plain, html)


def send_ai_access_requested_email(
    to_email: str, requester_name: str, requester_email: str, message: str, review_link: str
) -> None:
    plain = (
        f"{requester_name} ({requester_email}) requested access to the AI Assistant.\n\n"
        f"Message from requester:\n{message}\n\n"
        f"Review this request: {review_link}"
    )

    html = f"""\
<html>
  <body style="font-family:sans-serif;color:#1a1a1a;max-width:480px;margin:auto;padding:32px 24px">
    <h2 style="margin-bottom:8px">New AI Access Request</h2>
    <p style="color:#555;margin-bottom:8px">
      <strong>{requester_name}</strong> ({requester_email}) requested access to the AI Assistant.
    </p>
    <p style="color:#555;white-space:pre-wrap;background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:24px">{message}</p>
    <a href="{review_link}"
       style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;
              text-decoration:none;border-radius:8px;font-weight:600">
      Review Request
    </a>
    <hr style="margin-top:32px;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#aaa">ScoutIQ · Football Scouting Platform</p>
  </body>
</html>"""

    _send(to_email, f"AI Access Request from {requester_name}", plain, html)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    plain = (
        f"You requested a password reset for your ScoutIQ account.\n\n"
        f"Reset your password here (valid for 10 minutes):\n{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email."
    )

    html = f"""\
<html>
  <body style="font-family:sans-serif;color:#1a1a1a;max-width:480px;margin:auto;padding:32px 24px">
    <h2 style="margin-bottom:8px">Reset your password</h2>
    <p style="color:#555;margin-bottom:24px">
      You requested a password reset for your ScoutIQ account.
      Click the button below — the link expires in <strong>10 minutes</strong>.
    </p>
    <a href="{reset_link}"
       style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;
              text-decoration:none;border-radius:8px;font-weight:600">
      Reset Password
    </a>
    <p style="margin-top:24px;font-size:13px;color:#888">
      If you didn't request this, you can safely ignore this email.<br>
      This link will expire in 10 minutes.
    </p>
    <hr style="margin-top:32px;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#aaa">ScoutIQ · Football Scouting Platform</p>
  </body>
</html>"""

    _send(to_email, "Reset your ScoutIQ password", plain, html)
