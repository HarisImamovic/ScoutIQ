import re
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
import jwt

from app.config import get_settings

settings = get_settings()

_PASSWORD_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[\x20-\x7E]{8,72}$"
)


def validate_password_strength(password: str) -> bool:
    if "\x00" in password:
        return False
    return bool(_PASSWORD_RE.match(password))


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(subject: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "exp", "iat", "type"]},
    )


def create_mfa_token(subject: str, purpose: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": f"mfa_{purpose}",
        "iat": now,
        "exp": now + timedelta(minutes=settings.mfa_token_expire_minutes),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_mfa_token(token: str, purpose: str) -> dict:
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "exp", "iat", "type"]},
    )
    if payload.get("type") != f"mfa_{purpose}":
        raise jwt.InvalidTokenError("Unexpected token type.")
    return payload


def create_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(64)
    hashed = _sha256(raw)
    return raw, hashed


def hash_refresh_token(raw: str) -> str:
    return _sha256(raw)


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
