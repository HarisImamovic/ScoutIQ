from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class ClubInfo(BaseModel):
    id: str
    name: str
    short_name: Optional[str]
    country: Optional[str]
    league_name: Optional[str]
    stadium_name: Optional[str]
    stadium_capacity: Optional[int]
    primary_color: Optional[str]


class ClubDashboardStats(BaseModel):
    squad_count: int
    scout_count: int
    pending_reports: int
    approved_reports: int
    rejected_reports: int


class ClubScoutPerformance(BaseModel):
    scout_id: str
    name: str
    report_count: int


class ClubReportSummary(BaseModel):
    id: str
    player_name: str
    position: str
    scout_name: str
    rating: int
    status: str
    created_at: datetime


class ClubDashboardResponse(BaseModel):
    club: ClubInfo
    stats: ClubDashboardStats
    scouts: List[ClubScoutPerformance]
    recent_reports: List[ClubReportSummary]


class ClubPlayerItem(BaseModel):
    id: str
    first_name: str
    last_name: str
    position: str
    age: Optional[int]
    nationality: Optional[str]
    market_value: Optional[int]
    status: str


class ClubReportItem(BaseModel):
    id: str
    player_name: str
    position: str
    scout_id: str
    scout_name: str
    rating: int
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


class UpdateReportStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in {"approved", "rejected"}:
            raise ValueError("status must be 'approved' or 'rejected'")
        return v


class ContractItem(BaseModel):
    id: str
    club_id: str
    player_name: str
    position: str
    age: Optional[int]
    weekly_salary: int
    contract_until: Optional[date]
    availability_status: str
    created_at: datetime
    updated_at: Optional[datetime]


_AVAILABILITY_STATUSES = {"active", "injured", "on_loan"}


class CreateContractRequest(BaseModel):
    player_name: str = Field(min_length=1, max_length=200)
    position: str = Field(min_length=1, max_length=10)
    age: Optional[int] = Field(None, ge=15, le=50)
    weekly_salary: int = Field(ge=1)
    contract_until: Optional[date] = None
    availability_status: str = "active"

    @field_validator("availability_status")
    @classmethod
    def validate_availability(cls, v: str) -> str:
        if v not in _AVAILABILITY_STATUSES:
            raise ValueError("availability_status must be 'active', 'injured', or 'on_loan'")
        return v


class UpdateContractRequest(CreateContractRequest):
    pass
