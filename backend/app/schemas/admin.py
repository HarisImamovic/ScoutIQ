from datetime import date, datetime
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ListResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int


class AdminUserItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    club_name: Optional[str]
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
    player_name: str
    position: str
    scout_name: str
    rating: int
    status: str
    notes: Optional[str]
    created_at: datetime
