from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class PlayerClubInfo(BaseModel):
    id: str
    name: str
    short_name: Optional[str]
    country: str
    league_name: Optional[str]
    primary_color: Optional[str]
    logo_url: Optional[str] = None


class PlayerStats(BaseModel):
    minutes_played: Optional[int]
    goals: Optional[int]
    assists: Optional[int]
    saves: Optional[int]
    defensive_contributions: Optional[int]
    chances_created: Optional[int]
    dribbles: Optional[int]

    @classmethod
    def from_player(cls, player) -> "PlayerStats":
        return cls(
            minutes_played=player.minutes_played,
            goals=player.goals,
            assists=player.assists,
            saves=player.saves,
            defensive_contributions=player.defensive_contributions,
            chances_created=player.chances_created,
            dribbles=player.dribbles,
        )


class UpdatePlayerStatsRequest(BaseModel):
    minutes_played: Optional[int] = Field(None, ge=0)
    goals: Optional[int] = Field(None, ge=0)
    assists: Optional[int] = Field(None, ge=0)
    saves: Optional[int] = Field(None, ge=0)
    defensive_contributions: Optional[int] = Field(None, ge=0)
    chances_created: Optional[int] = Field(None, ge=0)
    dribbles: Optional[int] = Field(None, ge=0)


class MarketValuePoint(BaseModel):
    value: int
    recorded_at: datetime


class ScoutInterestItem(BaseModel):
    scout_id: str
    scout_name: str
    activity: str
    timestamp: datetime


_VALID_AVAILABILITY = {"free_agent", "under_contract", "talks_in_progress"}


class UpdateAvailabilityRequest(BaseModel):
    availability_status: str

    @field_validator("availability_status")
    @classmethod
    def check_availability(cls, v: str) -> str:
        if v not in _VALID_AVAILABILITY:
            raise ValueError(f"availability_status must be one of: {', '.join(sorted(_VALID_AVAILABILITY))}.")
        return v


class HighlightCreate(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    title: Optional[str] = Field(None, max_length=200)


class HighlightResponse(BaseModel):
    id: str
    title: Optional[str]
    url: str
    embed_url: str
    status: str
    created_at: datetime


class HighlightStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def check_status(cls, v: str) -> str:
        if v not in ("approved", "rejected"):
            raise ValueError("Status must be 'approved' or 'rejected'.")
        return v


class PlayerDashboardResponse(BaseModel):
    first_name: str
    last_name: str
    has_club: bool
    club: Optional[PlayerClubInfo]
    player_id: Optional[str]
    position: Optional[str]
    nationality: Optional[str]
    date_of_birth: Optional[date]
    age: Optional[int]
    market_value: Optional[int]
    status: str
    availability_status: str
    stats: Optional[PlayerStats]
    market_value_history: list[MarketValuePoint]
    scouting_interest: list[ScoutInterestItem]
