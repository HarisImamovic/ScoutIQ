import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_WHITESPACE_RUN = re.compile(r"[ \t]{2,}")


class AiAccessRequestCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)

    @field_validator("message")
    @classmethod
    def clean_message(cls, v: str) -> str:
        cleaned = _CONTROL_CHARS.sub("", v).replace("\r\n", "\n").replace("\r", "\n")
        cleaned = _WHITESPACE_RUN.sub(" ", cleaned).strip()
        if not cleaned:
            raise ValueError("Message cannot be empty.")
        if len(cleaned) > 1000:
            raise ValueError("Message cannot exceed 1000 characters.")
        return cleaned


class AiAccessRequestMine(BaseModel):
    id: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    created_at: Optional[datetime] = None


class AiAccessRequestDetail(BaseModel):
    id: str
    requester_name: str
    requester_email: str
    message: str
    status: str
    created_at: datetime
