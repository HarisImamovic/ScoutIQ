from datetime import datetime, timezone
from uuid import UUID as PyUUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.player import Player
from app.models.player_market_value_history import PlayerMarketValueHistory
from app.models.report import ScoutingReport
from app.models.saved_prospect import SavedProspect
from app.models.user import User
from app.schemas.player import (
    MarketValuePoint,
    PlayerClubInfo,
    PlayerDashboardResponse,
    PlayerStats,
    ScoutInterestItem,
    UpdateAvailabilityRequest,
)

router = APIRouter(prefix="/player", tags=["Player"])


@router.get("/dashboard", response_model=PlayerDashboardResponse)
def get_player_dashboard(
    current_user: User = Depends(require_role("player")),
    db: Session = Depends(get_db),
):
    player = db.query(Player).filter(Player.user_id == current_user.id).first()

    if player is None:
        return PlayerDashboardResponse(
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            has_club=False,
            club=None,
            player_id=None,
            position=None,
            nationality=None,
            date_of_birth=None,
            age=None,
            market_value=None,
            status="active",
            availability_status="free_agent",
            stats=None,
            market_value_history=[],
            scouting_interest=[],
        )

    has_club = player.club_id is not None
    club_data = None
    if has_club and player.club:
        c = player.club
        club_data = PlayerClubInfo(
            id=str(c.id),
            name=c.name,
            short_name=c.short_name,
            country=c.country,
            league_name=c.league.name if c.league else None,
            primary_color=c.primary_color,
            logo_url=c.logo_url,
        )

    age = None
    if player.date_of_birth:
        today = datetime.now(timezone.utc).date()
        dob = player.date_of_birth
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    mv_history = (
        db.query(PlayerMarketValueHistory)
        .filter(PlayerMarketValueHistory.player_id == player.id)
        .order_by(PlayerMarketValueHistory.recorded_at.asc())
        .all()
    )

    stats = None
    if player.minutes_played is not None:
        stats = PlayerStats(
            minutes_played=player.minutes_played,
            goals=player.goals,
            assists=player.assists,
            saves=player.saves,
            defensive_contributions=player.defensive_contributions,
            chances_created=player.chances_created,
            dribbles=player.dribbles,
        )

    saves = db.query(SavedProspect).filter(SavedProspect.player_id == player.id).all()
    reports = db.query(ScoutingReport).filter(ScoutingReport.player_id == player.id).all()

    activity: dict[str, dict] = {}
    for s in saves:
        sid = str(s.scout_id)
        ts = s.saved_at
        if sid not in activity or ts > activity[sid]["timestamp"]:
            activity[sid] = {"scout_id": sid, "activity": "saved you as a prospect", "timestamp": ts}
    for r in reports:
        sid = str(r.scout_id)
        ts = r.created_at
        if sid not in activity or ts > activity[sid]["timestamp"]:
            activity[sid] = {"scout_id": sid, "activity": "wrote a scouting report", "timestamp": ts}

    top_3 = sorted(activity.values(), key=lambda x: x["timestamp"], reverse=True)[:3]
    scout_ids = [PyUUID(a["scout_id"]) for a in top_3]
    scouts_map = {str(u.id): u for u in db.query(User).filter(User.id.in_(scout_ids)).all()}

    scouting_interest = []
    for a in top_3:
        scout = scouts_map.get(a["scout_id"])
        if scout:
            scouting_interest.append(ScoutInterestItem(
                scout_id=a["scout_id"],
                scout_name=f"{scout.first_name} {scout.last_name}",
                activity=a["activity"],
                timestamp=a["timestamp"],
            ))

    return PlayerDashboardResponse(
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        has_club=has_club,
        club=club_data,
        player_id=str(player.id),
        position=player.position,
        nationality=player.nationality,
        date_of_birth=player.date_of_birth,
        age=age,
        market_value=player.market_value,
        status=player.status,
        availability_status=player.availability_status,
        stats=stats,
        market_value_history=[
            MarketValuePoint(value=h.value, recorded_at=h.recorded_at) for h in mv_history
        ],
        scouting_interest=scouting_interest,
    )


@router.patch("/availability", status_code=status.HTTP_204_NO_CONTENT)
def update_availability(
    payload: UpdateAvailabilityRequest,
    current_user: User = Depends(require_role("player")),
    db: Session = Depends(get_db),
):
    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player profile not found.")
    if payload.availability_status == "under_contract" and not player.club_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot be Under Contract without being assigned to a club.",
        )
    player.availability_status = payload.availability_status
    db.commit()
