import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings

settings = get_settings()


def send_mfa_code_email(to_email: str, code: str, expires_minutes: int) -> None:
    if not settings.gmail_user or not settings.gmail_app_password:
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your ScoutIQ verification code"
    msg["From"] = settings.gmail_user
    msg["To"] = to_email

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

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.gmail_user, settings.gmail_app_password)
        smtp.sendmail(settings.gmail_user, to_email, msg.as_string())


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    if not settings.gmail_user or not settings.gmail_app_password:
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your ScoutIQ password"
    msg["From"] = settings.gmail_user
    msg["To"] = to_email

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

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.gmail_user, settings.gmail_app_password)
        smtp.sendmail(settings.gmail_user, to_email, msg.as_string())
