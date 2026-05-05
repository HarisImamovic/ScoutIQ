from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class PlayerClubInfo(BaseModel):
    id: str
    name: str
    short_name: Optional[str]
    country: str
    league_name: Optional[str]
    primary_color: Optional[str]


class PlayerStats(BaseModel):
    minutes_played: Optional[int]
    goals: Optional[int]
    assists: Optional[int]
    saves: Optional[int]
    defensive_contributions: Optional[int]
    chances_created: Optional[int]
    dribbles: Optional[int]


class MarketValuePoint(BaseModel):
    value: int
    recorded_at: datetime


class ScoutInterestItem(BaseModel):
    scout_id: str
    scout_name: str
    activity: str
    timestamp: datetime


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
    stats: Optional[PlayerStats]
    market_value_history: list[MarketValuePoint]
    scouting_interest: list[ScoutInterestItem]
