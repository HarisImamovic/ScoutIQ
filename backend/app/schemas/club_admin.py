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
    logo_url: Optional[str] = None


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
    position: Optional[str]
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
    player_id: str
    player_name: str
    position: Optional[str]
    age: Optional[int]
    club_id: str
    weekly_salary: int
    start_date: Optional[date]
    contract_until: Optional[date]
    availability_status: str
    created_at: datetime
    updated_at: Optional[datetime]


_AVAILABILITY_STATUSES = {"active", "injured", "on_loan"}


class CreateContractRequest(BaseModel):
    player_id: str
    weekly_salary: int = Field(ge=1)
    start_date: Optional[date] = None
    contract_until: Optional[date] = None
    availability_status: str = "active"

    @field_validator("availability_status")
    @classmethod
    def validate_availability(cls, v: str) -> str:
        if v not in _AVAILABILITY_STATUSES:
            raise ValueError("availability_status must be 'active', 'injured', or 'on_loan'")
        return v


class UpdateContractRequest(BaseModel):
    weekly_salary: int = Field(ge=1)
    start_date: Optional[date] = None
    contract_until: Optional[date] = None
    availability_status: str = "active"

    @field_validator("availability_status")
    @classmethod
    def validate_availability(cls, v: str) -> str:
        if v not in _AVAILABILITY_STATUSES:
            raise ValueError("availability_status must be 'active', 'injured', or 'on_loan'")
        return v
