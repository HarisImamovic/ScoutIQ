from __future__ import annotations

from fastapi import Request
from slowapi.util import get_remote_address

from app.security import decode_access_token


def user_or_ip_key(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = decode_access_token(auth[7:])
            return f"user_{payload['sub']}"
        except Exception:
            pass
    return get_remote_address(request)
