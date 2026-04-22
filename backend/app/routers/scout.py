import uuid as _uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.club import Club
from app.models.player import Player
from app.models.player_view import PlayerView
from app.models.report import ScoutingReport
from app.models.saved_prospect import SavedProspect
from app.models.user import User
from app.schemas.scout import (
    CreateScoutReportRequest,
    RecentPlayerItem,
    SavedProspectSummary,
    ScoutDashboardResponse,
    ScoutDashboardStats,
    ScoutPlayerItem,
    ScoutPlayersResponse,
    ScoutReportItem,
    ScoutSavedProspectItem,
    UpdateScoutReportRequest,
)

router = APIRouter(prefix="/scout", tags=["scout"])

_require_scout = require_role("scout")


def _calc_age(dob: Optional[date]) -> Optional[int]:
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=ScoutDashboardResponse)
def get_dashboard(
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    players_viewed = (
        db.query(func.count(func.distinct(PlayerView.player_id)))
        .filter(PlayerView.scout_id == scout.id)
        .scalar()
    ) or 0

    saved_count = (
        db.query(func.count(SavedProspect.id))
        .filter(SavedProspect.scout_id == scout.id)
        .scalar()
    ) or 0

    reports_count = (
        db.query(func.count(ScoutingReport.id))
        .filter(ScoutingReport.scout_id == scout.id)
        .scalar()
    ) or 0

    recent_subq = (
        db.query(
            PlayerView.player_id,
            func.max(PlayerView.viewed_at).label("last_viewed"),
        )
        .filter(PlayerView.scout_id == scout.id)
        .group_by(PlayerView.player_id)
        .subquery()
    )

    recent_rows = (
        db.query(Player, Club.name.label("club_name"), recent_subq.c.last_viewed)
        .join(recent_subq, Player.id == recent_subq.c.player_id)
        .outerjoin(Club, Player.club_id == Club.id)
        .order_by(recent_subq.c.last_viewed.desc())
        .limit(3)
        .all()
    )

    recently_viewed = [
        RecentPlayerItem(
            id=str(p.id),
            first_name=p.first_name,
            last_name=p.last_name,
            position=p.position,
            nationality=p.nationality,
            club_name=club_name,
            age=_calc_age(p.date_of_birth),
            market_value=p.market_value,
            last_viewed=last_viewed,
        )
        for p, club_name, last_viewed in recent_rows
    ]

    saved_rows = (
        db.query(SavedProspect, Player, Club.name.label("club_name"))
        .join(Player, SavedProspect.player_id == Player.id)
        .outerjoin(Club, Player.club_id == Club.id)
        .filter(SavedProspect.scout_id == scout.id)
        .order_by(SavedProspect.saved_at.desc())
        .limit(3)
        .all()
    )

    saved_prospects = [
        SavedProspectSummary(
            player_id=str(p.id),
            first_name=p.first_name,
            last_name=p.last_name,
            position=p.position,
            nationality=p.nationality,
            club_name=club_name,
            age=_calc_age(p.date_of_birth),
            saved_at=sp.saved_at,
        )
        for sp, p, club_name in saved_rows
    ]

    return ScoutDashboardResponse(
        stats=ScoutDashboardStats(
            players_viewed=players_viewed,
            saved_prospects=saved_count,
            reports_written=reports_count,
        ),
        recently_viewed=recently_viewed,
        saved_prospects=saved_prospects,
    )


# ---------------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------------

@router.get("/players", response_model=ScoutPlayersResponse)
def list_players(
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(6, ge=1, le=50),
    search: str = Query("", max_length=100),
    position: str = Query("", max_length=20),
    club_id: str = Query("", max_length=36),
):
    query = (
        db.query(Player, Club.name.label("club_name"))
        .outerjoin(Club, Player.club_id == Club.id)
        .filter(Player.status == "active")
    )

    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Player.first_name + " " + Player.last_name).ilike(term)
        )

    if position.strip():
        query = query.filter(Player.position == position.strip().upper())

    if club_id.strip():
        try:
            cid = _uuid.UUID(club_id.strip())
            query = query.filter(Player.club_id == cid)
        except ValueError:
            pass

    total = query.count()
    rows = (
        query.order_by(Player.first_name, Player.last_name)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    saved_ids: set = set(
        row[0]
        for row in db.query(SavedProspect.player_id)
        .filter(SavedProspect.scout_id == scout.id)
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
            market_value=p.market_value,
            status=p.status,
            is_saved=p.id in saved_ids,
        )
        for p, club_name in rows
    ]

    return ScoutPlayersResponse(
        items=items,
        total=total,
        page=page,
        pages=max(1, -(-total // limit)),
    )


@router.post("/players/{player_id}/view", status_code=status.HTTP_204_NO_CONTENT)
def record_view(
    player_id: str,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    try:
        pid = _uuid.UUID(player_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid player_id.")

    if not db.query(Player).filter(Player.id == pid).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    db.add(PlayerView(scout_id=scout.id, player_id=pid))
    db.commit()


# ---------------------------------------------------------------------------
# Saved Prospects
# ---------------------------------------------------------------------------

@router.get("/saved-prospects", response_model=list[ScoutSavedProspectItem])
def list_saved_prospects(
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(SavedProspect, Player, Club.name.label("club_name"))
        .join(Player, SavedProspect.player_id == Player.id)
        .outerjoin(Club, Player.club_id == Club.id)
        .filter(SavedProspect.scout_id == scout.id)
        .order_by(SavedProspect.saved_at.desc())
        .all()
    )

    return [
        ScoutSavedProspectItem(
            id=str(sp.id),
            player_id=str(p.id),
            first_name=p.first_name,
            last_name=p.last_name,
            position=p.position,
            age=_calc_age(p.date_of_birth),
            nationality=p.nationality,
            club_name=club_name,
            market_value=p.market_value,
            saved_at=sp.saved_at,
        )
        for sp, p, club_name in rows
    ]


@router.post("/saved-prospects/{player_id}", status_code=status.HTTP_201_CREATED)
def save_prospect(
    player_id: str,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    try:
        pid = _uuid.UUID(player_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid player_id.")

    if not db.query(Player).filter(Player.id == pid).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    try:
        db.add(SavedProspect(scout_id=scout.id, player_id=pid))
        db.commit()
    except IntegrityError:
        db.rollback()

    return {"player_id": player_id}


@router.delete("/saved-prospects/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_prospect(
    player_id: str,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    try:
        pid = _uuid.UUID(player_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid player_id.")

    sp = (
        db.query(SavedProspect)
        .filter(SavedProspect.scout_id == scout.id, SavedProspect.player_id == pid)
        .first()
    )
    if sp:
        db.delete(sp)
        db.commit()


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

@router.get("/reports", response_model=list[ScoutReportItem])
def list_reports(
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    reports = (
        db.query(ScoutingReport)
        .filter(ScoutingReport.scout_id == scout.id)
        .order_by(ScoutingReport.created_at.desc())
        .all()
    )

    return [
        ScoutReportItem(
            id=str(r.id),
            player_id=str(r.player_id) if r.player_id else None,
            player_name=r.player_name,
            position=r.position,
            rating=r.rating,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in reports
    ]


@router.post("/reports", response_model=ScoutReportItem, status_code=status.HTTP_201_CREATED)
def create_report(
    body: CreateScoutReportRequest,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    player_uuid = None
    if body.player_id:
        try:
            player_uuid = _uuid.UUID(body.player_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid player_id.")
        if not db.query(Player).filter(Player.id == player_uuid).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    report = ScoutingReport(
        scout_id=scout.id,
        player_id=player_uuid,
        player_name=body.player_name.strip(),
        position=body.position.strip().upper(),
        rating=body.rating,
        status=body.status,
        notes=body.notes,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ScoutReportItem(
        id=str(report.id),
        player_id=str(report.player_id) if report.player_id else None,
        player_name=report.player_name,
        position=report.position,
        rating=report.rating,
        status=report.status,
        notes=report.notes,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.put("/reports/{report_id}", response_model=ScoutReportItem)
def update_report(
    report_id: str,
    body: UpdateScoutReportRequest,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    try:
        rid = _uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid report_id.")

    report = (
        db.query(ScoutingReport)
        .filter(ScoutingReport.id == rid, ScoutingReport.scout_id == scout.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    report.player_name = body.player_name.strip()
    report.position = body.position.strip().upper()
    report.rating = body.rating
    report.status = body.status
    report.notes = body.notes
    report.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)

    return ScoutReportItem(
        id=str(report.id),
        player_id=str(report.player_id) if report.player_id else None,
        player_name=report.player_name,
        position=report.position,
        rating=report.rating,
        status=report.status,
        notes=report.notes,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
) -> None:
    try:
        rid = _uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid report_id.")

    report = (
        db.query(ScoutingReport)
        .filter(ScoutingReport.id == rid, ScoutingReport.scout_id == scout.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    db.delete(report)
    db.commit()
