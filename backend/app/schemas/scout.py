from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class ScoutDashboardStats(BaseModel):
    players_viewed: int
    saved_prospects: int
    reports_written: int


class RecentPlayerItem(BaseModel):
    id: str
    first_name: str
    last_name: str
    position: Optional[str]
    nationality: Optional[str]
    club_name: Optional[str]
    club_logo_url: Optional[str] = None
    age: Optional[int]
    market_value: Optional[int]
    last_viewed: datetime


class SavedProspectSummary(BaseModel):
    player_id: str
    first_name: str
    last_name: str
    position: Optional[str]
    nationality: Optional[str]
    club_name: Optional[str]
    club_logo_url: Optional[str] = None
    age: Optional[int]
    saved_at: datetime


class ScoutDashboardResponse(BaseModel):
    stats: ScoutDashboardStats
    recently_viewed: List[RecentPlayerItem]
    saved_prospects: List[SavedProspectSummary]
    new_players_since_last_visit: int = 0


class ScoutPlayerItem(BaseModel):
    id: str
    first_name: str
    last_name: str
    position: Optional[str]
    age: Optional[int]
    nationality: Optional[str]
    club_id: Optional[str]
    club_name: Optional[str]
    club_logo_url: Optional[str] = None
    market_value: Optional[int]
    status: str
    is_saved: bool


class ScoutPlayersResponse(BaseModel):
    items: List[ScoutPlayerItem]
    total: int
    page: int
    pages: int


class ScoutSavedProspectItem(BaseModel):
    id: str
    player_id: str
    first_name: str
    last_name: str
    position: Optional[str]
    age: Optional[int]
    nationality: Optional[str]
    club_name: Optional[str]
    club_logo_url: Optional[str] = None
    market_value: Optional[int]
    saved_at: datetime


class ScoutReportItem(BaseModel):
    id: str
    player_id: Optional[str]
    player_name: str
    position: str
    rating: int
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


_SCOUT_REPORT_STATUSES = {"draft", "submitted"}


class CreateScoutReportRequest(BaseModel):
    player_id: Optional[str] = None
    player_name: str = Field(min_length=1, max_length=200)
    position: str = Field(min_length=1, max_length=20)
    rating: int = Field(ge=1, le=100)
    status: str = "draft"
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _SCOUT_REPORT_STATUSES:
            raise ValueError("status must be 'draft' or 'submitted'")
        return v


class UpdateScoutReportRequest(BaseModel):
    player_id: Optional[str] = None
    player_name: str = Field(min_length=1, max_length=200)
    position: str = Field(min_length=1, max_length=20)
    rating: int = Field(ge=1, le=100)
    status: str = "draft"
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _SCOUT_REPORT_STATUSES:
            raise ValueError("status must be 'draft' or 'submitted'")
        return v


class PlayerDropdownItem(BaseModel):
    id: str
    first_name: str
    last_name: str
    position: Optional[str]
    club_name: Optional[str]
