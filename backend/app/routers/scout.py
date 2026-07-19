from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.limiter import limiter
from app.models.club import Club
from app.models.player import Player
from app.models.player_view import PlayerView
from app.models.report import ScoutingReport
from app.models.saved_prospect import SavedProspect
from app.models.user import User
from app.utils.age import calc_age
from app.utils.notifications import create_notification, notify_club_admins
from app.utils.uuid import parse_uuid, try_parse_uuid
from app.schemas.scout import (
    CreateScoutReportRequest,
    PlayerDropdownItem,
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


def _report_item(report: ScoutingReport) -> ScoutReportItem:
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

    last_activity = (
        db.query(func.max(PlayerView.viewed_at))
        .filter(PlayerView.scout_id == scout.id)
        .scalar()
    ) or scout.created_at

    new_players_since_last_visit = (
        db.query(func.count(Player.id))
        .filter(Player.status == "active", Player.created_at > last_activity)
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
        db.query(Player, Club.name.label("club_name"), Club.logo_url.label("club_logo_url"), recent_subq.c.last_viewed)
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
            club_logo_url=club_logo_url,
            age=calc_age(p.date_of_birth),
            market_value=p.market_value,
            last_viewed=last_viewed,
        )
        for p, club_name, club_logo_url, last_viewed in recent_rows
    ]

    saved_rows = (
        db.query(SavedProspect, Player, Club.name.label("club_name"), Club.logo_url.label("club_logo_url"))
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
            club_logo_url=club_logo_url,
            age=calc_age(p.date_of_birth),
            saved_at=sp.saved_at,
        )
        for sp, p, club_name, club_logo_url in saved_rows
    ]

    return ScoutDashboardResponse(
        stats=ScoutDashboardStats(
            players_viewed=players_viewed,
            saved_prospects=saved_count,
            reports_written=reports_count,
        ),
        recently_viewed=recently_viewed,
        saved_prospects=saved_prospects,
        new_players_since_last_visit=new_players_since_last_visit,
    )


# ---------------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------------

@router.get("/players/dropdown", response_model=list[PlayerDropdownItem])
def players_dropdown(
    _: User = Depends(_require_scout),
    db: Session = Depends(get_db),
    search: str = Query("", max_length=100),
    position: str = Query("", max_length=20),
):
    query = (
        db.query(Player, Club.name.label("club_name"))
        .outerjoin(Club, Player.club_id == Club.id)
    )
    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Player.first_name + " " + Player.last_name).ilike(term)
        )
    if position.strip():
        query = query.filter(Player.position == position.strip().upper())
    rows = (
        query.order_by(Player.first_name, Player.last_name)
        .limit(20)
        .all()
    )
    return [
        PlayerDropdownItem(
            id=str(p.id),
            first_name=p.first_name,
            last_name=p.last_name,
            position=p.position,
            club_name=club_name,
        )
        for p, club_name in rows
    ]


@router.get("/players", response_model=ScoutPlayersResponse)
def list_players(
    scout: User = Depends(require_role("scout", "global_admin")),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(6, ge=1, le=50),
    search: str = Query("", max_length=100),
    position: str = Query("", max_length=20),
    club_id: str = Query("", max_length=36),
):
    query = (
        db.query(Player, Club.name.label("club_name"), Club.logo_url.label("club_logo_url"))
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
        cid = try_parse_uuid(club_id.strip())
        if cid:
            query = query.filter(Player.club_id == cid)

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
            age=calc_age(p.date_of_birth),
            nationality=p.nationality,
            club_id=str(p.club_id) if p.club_id else None,
            club_name=club_name,
            club_logo_url=club_logo_url,
            market_value=p.market_value,
            status=p.status,
            is_saved=p.id in saved_ids,
        )
        for p, club_name, club_logo_url in rows
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
    pid = parse_uuid(player_id, "player_id")

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
        db.query(SavedProspect, Player, Club.name.label("club_name"), Club.logo_url.label("club_logo_url"))
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
            age=calc_age(p.date_of_birth),
            nationality=p.nationality,
            club_name=club_name,
            club_logo_url=club_logo_url,
            market_value=p.market_value,
            saved_at=sp.saved_at,
        )
        for sp, p, club_name, club_logo_url in rows
    ]


@router.post("/saved-prospects/{player_id}", status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def save_prospect(
    player_id: str,
    request: Request,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    pid = parse_uuid(player_id, "player_id")

    player = db.query(Player).filter(Player.id == pid).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    scout_name = f"{scout.first_name} {scout.last_name}"
    player_name = f"{player.first_name} {player.last_name}"

    try:
        db.add(SavedProspect(scout_id=scout.id, player_id=pid))
        db.flush()

        if scout.club_id:
            notify_club_admins(
                db, scout.club_id, "star", "Prospect Saved",
                f"{scout_name} saved {player_name} as a prospect.",
            )

        if player.user_id:
            create_notification(
                db, player.user_id, "star", "Scout Interest",
                "A scout saved you as a prospect.",
            )

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
    pid = parse_uuid(player_id, "player_id")

    sp = (
        db.query(SavedProspect)
        .filter(SavedProspect.scout_id == scout.id, SavedProspect.player_id == pid)
        .first()
    )
    if sp:
        player = db.query(Player).filter(Player.id == pid).first()
        db.delete(sp)

        if scout.club_id and player:
            scout_name = f"{scout.first_name} {scout.last_name}"
            player_name = f"{player.first_name} {player.last_name}"
            notify_club_admins(
                db, scout.club_id, "star", "Prospect Unsaved",
                f"{scout_name} removed {player_name} from saved prospects.",
            )

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

    return [_report_item(r) for r in reports]


@router.post("/reports", response_model=ScoutReportItem, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def create_report(
    body: CreateScoutReportRequest,
    request: Request,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    player_uuid = None
    if body.player_id:
        player_uuid = parse_uuid(body.player_id, "player_id")
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
    db.flush()

    if body.status == "submitted" and scout.club_id:
        notify_club_admins(
            db, scout.club_id, "file", "Report Pending Review",
            f"{scout.first_name} {scout.last_name} submitted a report for {body.player_name.strip()}.",
        )

    if player_uuid:
        linked_player = db.query(Player).filter(Player.id == player_uuid).first()
        if linked_player and linked_player.user_id:
            create_notification(
                db, linked_player.user_id, "file", "New Report",
                "A scout wrote a report about you.",
            )

    db.commit()
    db.refresh(report)

    return _report_item(report)


@router.put("/reports/{report_id}", response_model=ScoutReportItem)
def update_report(
    report_id: str,
    body: UpdateScoutReportRequest,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
):
    rid = parse_uuid(report_id, "report_id")

    report = (
        db.query(ScoutingReport)
        .filter(ScoutingReport.id == rid, ScoutingReport.scout_id == scout.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    if body.player_id:
        player_uuid = parse_uuid(body.player_id, "player_id")
        if not db.query(Player).filter(Player.id == player_uuid).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")
        report.player_id = player_uuid

    old_status = report.status
    report.player_name = body.player_name.strip()
    report.position = body.position.strip().upper()
    report.rating = body.rating
    report.status = body.status
    report.notes = body.notes
    report.updated_at = datetime.now(timezone.utc)

    if body.status == "submitted" and old_status != "submitted" and scout.club_id:
        notify_club_admins(
            db, scout.club_id, "file", "Report Pending Review",
            f"{scout.first_name} {scout.last_name} submitted a report for {body.player_name.strip()}.",
        )

    db.commit()
    db.refresh(report)

    return _report_item(report)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    scout: User = Depends(_require_scout),
    db: Session = Depends(get_db),
) -> None:
    rid = parse_uuid(report_id, "report_id")

    report = (
        db.query(ScoutingReport)
        .filter(ScoutingReport.id == rid, ScoutingReport.scout_id == scout.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    db.delete(report)
    db.commit()
