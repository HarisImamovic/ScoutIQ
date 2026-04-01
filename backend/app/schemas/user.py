from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    club_id: UUID | None
    avatar_url: str | None
    status: str
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ErrorResponse(BaseModel):
    detail: str
