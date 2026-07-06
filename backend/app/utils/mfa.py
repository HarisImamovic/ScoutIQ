import base64
import hashlib
import hmac
import io
import re
import secrets
import time

import pyotp
import qrcode
import requests
from cryptography.fernet import Fernet

from app.config import get_settings

TOTP_INTERVAL = 30
_PHONE_RE = re.compile(r"^\+[1-9]\d{7,14}$")
_RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _derive_key(context: str) -> bytes:
    settings = get_settings()
    return hashlib.sha256(f"{settings.jwt_secret_key}::{context}".encode()).digest()


def _fernet() -> Fernet:
    settings = get_settings()
    if settings.mfa_encryption_key:
        return Fernet(settings.mfa_encryption_key)
    return Fernet(base64.urlsafe_b64encode(_derive_key("mfa-secret-encryption")))


def encrypt_secret(raw: str) -> str:
    return _fernet().encrypt(raw.encode()).decode()


def decrypt_secret(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()


def generate_totp_secret() -> str:
    return pyotp.random_base32(length=32)


def totp_provisioning_uri(secret: str, account_email: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=account_email, issuer_name="ScoutIQ")


def totp_qr_data_uri(provisioning_uri: str) -> str:
    img = qrcode.make(provisioning_uri, box_size=6, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def verify_totp(secret: str, code: str, last_used_counter: int | None) -> int | None:
    if not re.fullmatch(r"\d{6}", code):
        return None
    totp = pyotp.TOTP(secret)
    current = int(time.time()) // TOTP_INTERVAL
    for offset in (0, -1, 1):
        counter = current + offset
        if hmac.compare_digest(totp.at(counter * TOTP_INTERVAL), code):
            if last_used_counter is not None and counter <= last_used_counter:
                return None
            return counter
    return None


def hash_otp_code(code: str) -> str:
    return hmac.new(_derive_key("mfa-code-hmac"), code.encode(), hashlib.sha256).hexdigest()


def codes_match(code: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_otp_code(code), stored_hash)


def generate_challenge_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_recovery_codes(count: int) -> list[str]:
    codes = []
    for _ in range(count):
        raw = "".join(secrets.choice(_RECOVERY_ALPHABET) for _ in range(10))
        codes.append(f"{raw[:5]}-{raw[5:]}")
    return codes


def normalize_recovery_code(code: str) -> str:
    return re.sub(r"[\s-]", "", code.strip().upper())


def validate_phone_number(phone: str) -> bool:
    return bool(_PHONE_RE.match(phone))


def mask_phone(phone: str) -> str:
    return f"{phone[:3]}•••{phone[-3:]}"


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}•••@{domain}"


def sms_available() -> bool:
    settings = get_settings()
    return bool(settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number)


def send_sms(to_number: str, body: str) -> None:
    settings = get_settings()
    resp = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
        auth=(settings.twilio_account_sid, settings.twilio_auth_token),
        data={"From": settings.twilio_from_number, "To": to_number, "Body": body},
        timeout=10,
    )
    resp.raise_for_status()
