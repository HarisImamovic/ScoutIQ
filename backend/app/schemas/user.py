from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, model_validator


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    club_id: UUID | None
    avatar_url: str | None
    status: str
    ai_access: bool = False
    last_login_at: datetime | None
    created_at: datetime
    has_password: bool = True

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _compute_has_password(cls, data: Any) -> Any:
        if not isinstance(data, dict) and hasattr(data, "password_hash"):
            return {
                k: getattr(data, k, None)
                for k in [
                    "id", "email", "first_name", "last_name", "role",
                    "club_id", "avatar_url", "status", "ai_access",
                    "last_login_at", "created_at",
                ]
            } | {"has_password": bool(data.password_hash)}
        return data


class ErrorResponse(BaseModel):
    detail: str
