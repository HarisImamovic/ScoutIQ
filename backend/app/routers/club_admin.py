import uuid as _uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.club import Club
from app.models.league import League
from app.models.player import Player
from app.models.player_contract import PlayerContract
from app.models.report import ScoutingReport
from app.models.user import User
from app.schemas.club_admin import (
    ClubDashboardResponse,
    ClubDashboardStats,
    ClubInfo,
    ClubPlayerItem,
    ClubReportItem,
    ClubReportSummary,
    ClubScoutPerformance,
    ContractItem,
    CreateContractRequest,
    UpdateContractRequest,
    UpdateReportStatusRequest,
)
from app.schemas.scout import ScoutPlayerItem, ScoutPlayersResponse
from app.utils.notifications import create_notification
from app.utils.telegram import send_report_notification

router = APIRouter(prefix="/club", tags=["club_admin"])

_require_club_admin = require_role("club_admin")


def _calc_age(dob) -> int | None:
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _get_club(admin: User, db: Session) -> Club:
    if not admin.club_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not associated with a club.",
        )
    club = db.query(Club).filter(Club.id == admin.club_id, Club.deleted_at.is_(None)).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")
    return club


def _get_scout_ids(club_id, db: Session) -> list:
    return [
        r[0]
        for r in db.query(User.id)
        .filter(User.club_id == club_id, User.role == "scout", User.deleted_at.is_(None))
        .all()
    ]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=ClubDashboardResponse)
def get_dashboard(
    admin: User = Depends(_require_club_admin),
    db: Session = Depends(get_db),
):
    club = _get_club(admin, db)

    league_name = None
    if club.league_id:
        league = db.query(League).filter(League.id == club.league_id).first()
        if league:
            league_name = league.name

    squad_count = db.query(func.count(Player.id)).filter(Player.club_id == club.id).scalar() or 0

    scout_count = (
        db.query(func.count(User.id))
        .filter(
            User.club_id == club.id,
            User.role == "scout",
            User.deleted_at.is_(None),
            User.status == "active",
        )
        .scalar()
    ) or 0

    scout_ids = _get_scout_ids(club.id, db)

    def _count_reports_by_status(s):
        if not scout_ids:
            return 0
        return (
            db.query(func.count(ScoutingReport.id))
            .filter(ScoutingReport.scout_id.in_(scout_ids), ScoutingReport.status == s)
            .scalar()
        ) or 0

    pending_reports = _count_reports_by_status("submitted")
    approved_reports = _count_reports_by_status("approved")
    rejected_reports = _count_reports_by_status("rejected")

    scouts_data = (
        db.query(User, func.count(ScoutingReport.id).label("report_count"))
        .outerjoin(
            ScoutingReport,
            (ScoutingReport.scout_id == User.id) & (ScoutingReport.status == "approved"),
        )
        .filter(User.club_id == club.id, User.role == "scout", User.deleted_at.is_(None))
        .group_by(User.id)
        .order_by(func.count(ScoutingReport.id).desc())
        .limit(3)
        .all()
    )

    scouts = [
        ClubScoutPerformance(
            scout_id=str(s.id),
            name=f"{s.first_name} {s.last_name}",
            report_count=count,
        )
        for s, count in scouts_data
    ]

    recent_rows = []
    if scout_ids:
        recent_rows = (
            db.query(ScoutingReport, User.first_name, User.last_name)
            .join(User, ScoutingReport.scout_id == User.id)
            .filter(
                ScoutingReport.scout_id.in_(scout_ids),
                ScoutingReport.status.in_(["submitted", "approved", "rejected"]),
            )
            .order_by(ScoutingReport.created_at.desc())
            .limit(3)
            .all()
        )

    recent_reports = [
        ClubReportSummary(
            id=str(r.id),
            player_name=r.player_name,
            position=r.position,
            scout_name=f"{fn} {ln}",
            rating=r.rating,
            status=r.status,
            created_at=r.created_at,
        )
        for r, fn, ln in recent_rows
    ]

    return ClubDashboardResponse(
        club=ClubInfo(
            id=str(club.id),
            name=club.name,
            short_name=club.short_name,
            country=club.country,
            league_name=league_name,
            stadium_name=club.stadium_name,
            stadium_capacity=club.stadium_capacity,
            primary_color=club.primary_color,
            logo_url=club.logo_url,
        ),
        stats=ClubDashboardStats(
            squad_count=squad_count,
            scout_count=scout_count,
            pending_reports=pending_reports,
            approved_reports=approved_reports,
            rejected_reports=rejected_reports,
        ),
        scouts=scouts,
        recent_reports=recent_reports,
    )


# ---------------------------------------------------------------------------
# Players — squad (players belonging to this club)
# ---------------------------------------------------------------------------

@router.get("/players", response_model=list[ClubPlayerItem])
def get_squad(
    admin: User = Depends(_require_club_admin),
    db: Session = Depends(get_db),
    search: str = Query("", max_length=100),
    position: str = Query("", max_length=20),
):
    club = _get_club(admin, db)

    query = db.query(Player).filter(Player.club_id == club.id)

    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter((Player.first_name + " " + Player.last_name).ilike(term))

    if position.strip():
        query = query.filter(Player.position == position.strip().upper())

    players = query.order_by(Player.first_name, Player.last_name).all()

    return [
        ClubPlayerItem(
            id=str(p.id),
            first_name=p.first_name,
            last_name=p.last_name,
            position=p.position,
            age=_calc_age(p.date_of_birth),
            nationality=p.nationality,
            market_value=p.market_value,
            status=p.status,
        )
        for p in players
    ]


# ---------------------------------------------------------------------------
# Players — browse all (shared with scouts, for /dashboard/players)
# ---------------------------------------------------------------------------

@router.get("/players/browse", response_model=ScoutPlayersResponse)
def browse_players(
    _: User = Depends(_require_club_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(6, ge=1, le=50),
    search: str = Query("", max_length=100),
    position: str = Query("", max_length=20),
):
    query = (
        db.query(Player, Club.name.label("club_name"), Club.logo_url.label("club_logo_url"))
        .outerjoin(Club, Player.club_id == Club.id)
        .filter(Player.status == "active")
    )

    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter((Player.first_name + " " + Player.last_name).ilike(term))

    if position.strip():
        query = query.filter(Player.position == position.strip().upper())

    total = query.count()
    rows = (
        query.order_by(Player.first_name, Player.last_name)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [
        ScoutPlayerItem(
            id=str(p.id),
            first_name=p.first_name,
            last_name=p.last_name,
            position=p.position,
            age=_calc_age(p.date_of_birth),
            nationality=p.nationality,
            club_id=str(p.club_id) if p.club_id else None,
            club_name=club_name,
            club_logo_url=club_logo_url,
            market_value=p.market_value,
            status=p.status,
            is_saved=False,
        )
        for p, club_name, club_logo_url in rows
    ]

    return ScoutPlayersResponse(
        items=items,
        total=total,
        page=page,
        pages=max(1, -(-total // limit)),
    )


# ---------------------------------------------------------------------------
# Reports — all reports from club's scouts
# ---------------------------------------------------------------------------

@router.get("/reports", response_model=list[ClubReportItem])
def get_reports(
    admin: User = Depends(_require_club_admin),
    db: Session = Depends(get_db),
):
    club = _get_club(admin, db)
    scout_ids = _get_scout_ids(club.id, db)

    if not scout_ids:
        return []

    rows = (
        db.query(ScoutingReport, User.first_name, User.last_name)
        .join(User, ScoutingReport.scout_id == User.id)
        .filter(
            ScoutingReport.scout_id.in_(scout_ids),
            ScoutingReport.status.in_(["submitted", "approved", "rejected"]),
        )
        .order_by(ScoutingReport.created_at.desc())
        .all()
    )

    return [
        ClubReportItem(
            id=str(r.id),
            player_name=r.player_name,
            position=r.position,
            scout_id=str(r.scout_id),
            scout_name=f"{fn} {ln}",
            rating=r.rating,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r, fn, ln in rows
    ]


@router.put("/reports/{report_id}/status", response_model=ClubReportItem)
def update_report_status(
    report_id: str,
    body: UpdateReportStatusRequest,
    background_tasks: BackgroundTasks,
    admin: User = Depends(_require_club_admin),
    db: Session = Depends(get_db),
):
    club = _get_club(admin, db)

    try:
        rid = _uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid report_id.")

    scout_ids = _get_scout_ids(club.id, db)

    row = (
        db.query(ScoutingReport, User.first_name, User.last_name)
        .join(User, ScoutingReport.scout_id == User.id)
        .filter(ScoutingReport.id == rid, ScoutingReport.scout_id.in_(scout_ids))
        .first()
    )

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    report, fn, ln = row

    if report.status not in ("submitted", "approved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only submitted, approved, or rejected reports can be actioned.",
        )

    report.status = body.status
    report.updated_at = datetime.now(timezone.utc)

    create_notification(
        db,
        report.scout_id,
        "file",
        f"Report {body.status.capitalize()}",
        f"Your report for {report.player_name} has been {body.status}.",
    )

    scout = db.query(User).filter(User.id == report.scout_id).first()
    db.commit()
    db.refresh(report)

    if scout and scout.telegram_chat_id:
        background_tasks.add_task(
            send_report_notification,
            scout.telegram_chat_id,
            report.player_name,
            body.status,
        )

    return ClubReportItem(
        id=str(report.id),
        player_name=report.player_name,
        position=report.position,
        scout_id=str(report.scout_id),
        scout_name=f"{fn} {ln}",
        rating=report.rating,
        status=report.status,
        notes=report.notes,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


# ---------------------------------------------------------------------------
# Contracts (salaries)
# ---------------------------------------------------------------------------

@router.get("/contracts", response_model=list[ContractItem])
def list_contracts(
    admin: User = Depends(_require_club_admin),
    db: Session = Depends(get_db),
):
    club = _get_club(admin, db)
    rows = (
        db.query(PlayerContract, Player)
        .join(Player, PlayerContract.player_id == Player.id)
        .filter(PlayerContract.club_id == club.id)
        .order_by(PlayerContract.created_at.desc())
        .all()
    )
    return [_contract_to_item(c, p) for c, p in rows]


@router.post("/contracts", response_model=ContractItem, status_code=status.HTTP_201_CREATED)
def create_contract(
    body: CreateContractRequest,
    admin: User = Depends(_require_club_admin),
    db: Session = Depends(get_db),
):
    club = _get_club(admin, db)

    try:
        pid = _uuid.UUID(body.player_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid player_id.")

    player = db.query(Player).filter(Player.id == pid, Player.club_id == club.id).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found in your club.")

    existing = (
        db.query(PlayerContract)
        .filter(PlayerContract.player_id == pid, PlayerContract.club_id == club.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This player already has a contract with your club.",
        )

    contract = PlayerContract(
        player_id=pid,
        club_id=club.id,
        weekly_salary=body.weekly_salary,
        start_date=body.start_date,
        contract_until=body.contract_until,
        availability_status=body.availability_status,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return _contract_to_item(contract, player)


@router.put("/contracts/{contract_id}", response_model=ContractItem)
def update_contract(
    contract_id: str,
    body: UpdateContractRequest,
    admin: User = Depends(_require_club_admin),
    db: Session = Depends(get_db),
):
    club = _get_club(admin, db)

    try:
        cid = _uuid.UUID(contract_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid contract_id.")

    row = (
        db.query(PlayerContract, Player)
        .join(Player, PlayerContract.player_id == Player.id)
        .filter(PlayerContract.id == cid, PlayerContract.club_id == club.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    contract, player = row
    contract.weekly_salary = body.weekly_salary
    contract.start_date = body.start_date
    contract.contract_until = body.contract_until
    contract.availability_status = body.availability_status
    contract.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(contract)
    return _contract_to_item(contract, player)


@router.delete("/contracts/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: str,
    admin: User = Depends(_require_club_admin),
    db: Session = Depends(get_db),
):
    club = _get_club(admin, db)

    try:
        cid = _uuid.UUID(contract_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid contract_id.")

    contract = (
        db.query(PlayerContract)
        .filter(PlayerContract.id == cid, PlayerContract.club_id == club.id)
        .first()
    )
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    db.delete(contract)
    db.commit()


def _contract_to_item(c: PlayerContract, p: Player) -> ContractItem:
    age = None
    if p.date_of_birth:
        today = date.today()
        age = today.year - p.date_of_birth.year - (
            (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
        )
    return ContractItem(
        id=str(c.id),
        player_id=str(c.player_id),
        player_name=f"{p.first_name} {p.last_name}",
        position=p.position,
        age=age,
        club_id=str(c.club_id),
        weekly_salary=c.weekly_salary,
        start_date=c.start_date,
        contract_until=c.contract_until,
        availability_status=c.availability_status,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )
