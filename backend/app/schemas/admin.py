from datetime import date, datetime
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

T = TypeVar("T")

# ---------------------------------------------------------------------------
# Generic list wrapper
# ---------------------------------------------------------------------------

class ListResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int


# ---------------------------------------------------------------------------
# Response schemas (used by both GET list and POST create)
# ---------------------------------------------------------------------------

class AdminUserItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    club_id: Optional[str] = None
    club_name: Optional[str] = None
    status: str
    created_at: datetime


class AdminClubItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    country: str
    league: str
    scout_count: int
    player_count: int
    status: str
    created_at: datetime


class AdminPlayerItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_name: str
    last_name: str
    date_of_birth: Optional[date]
    nationality: Optional[str]
    position: str
    club_name: Optional[str]
    market_value: Optional[int]
    status: str
    created_at: datetime


class AdminReportItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    player_id: Optional[str] = None
    player_name: str
    position: str
    scout_name: str
    rating: int
    status: str
    notes: Optional[str]
    created_at: datetime


# ---------------------------------------------------------------------------
# Request schemas for CREATE operations
# ---------------------------------------------------------------------------

_VALID_ROLES = {"player", "scout", "club_admin", "global_admin"}
_VALID_USER_STATUSES = {"active", "inactive", "suspended"}
_VALID_CLUB_STATUSES = {"active", "pending", "suspended"}
_VALID_PLAYER_STATUSES = {"active", "injured"}
_VALID_REPORT_STATUSES = {"draft", "submitted", "approved", "rejected"}


class CreateUserRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str
    role: str
    club_id: Optional[str] = None
    status: str = "active"
    position: Optional[str] = Field(None, max_length=20)

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in _VALID_ROLES:
            raise ValueError(f"role must be one of {sorted(_VALID_ROLES)}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_USER_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_USER_STATUSES)}")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        from app.security import validate_password_strength
        if not validate_password_strength(v):
            raise ValueError(
                "Password must be 8–72 characters and include uppercase, "
                "lowercase, a digit, and a special character."
            )
        return v


class CreateClubRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    short_name: Optional[str] = Field(None, max_length=50)
    country: str = Field(min_length=1, max_length=100)
    league_id: Optional[str] = None
    status: str = "active"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_CLUB_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_CLUB_STATUSES)}")
        return v


class CreatePlayerRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    position: str = Field(min_length=1, max_length=20)
    nationality: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    club_id: Optional[str] = None
    market_value: Optional[int] = Field(None, ge=0)
    status: str = "active"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_PLAYER_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_PLAYER_STATUSES)}")
        return v


class CreateReportRequest(BaseModel):
    scout_id: str
    player_id: Optional[str] = None
    player_name: str = Field(min_length=1, max_length=200)
    position: str = Field(min_length=1, max_length=20)
    rating: int = Field(ge=1, le=100)
    status: str = "draft"
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_REPORT_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_REPORT_STATUSES)}")
        return v


# ---------------------------------------------------------------------------
# Request schemas for UPDATE operations
# ---------------------------------------------------------------------------

class UpdateUserRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    role: str
    club_id: Optional[str] = None
    status: str = "active"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in _VALID_ROLES:
            raise ValueError(f"role must be one of {sorted(_VALID_ROLES)}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_USER_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_USER_STATUSES)}")
        return v


class UpdateClubRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    country: str = Field(min_length=1, max_length=100)
    league_id: Optional[str] = None
    status: str = "active"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_CLUB_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_CLUB_STATUSES)}")
        return v


class UpdatePlayerRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    position: str = Field(min_length=1, max_length=10)
    nationality: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    club_id: Optional[str] = None
    market_value: Optional[int] = Field(None, ge=0)
    status: str = "active"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_PLAYER_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_PLAYER_STATUSES)}")
        return v


class UpdateReportRequest(BaseModel):
    player_id: Optional[str] = None
    player_name: str = Field(min_length=1, max_length=200)
    position: str = Field(min_length=1, max_length=10)
    rating: int = Field(ge=1, le=100)
    status: str = "draft"
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_REPORT_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_REPORT_STATUSES)}")
        return v
