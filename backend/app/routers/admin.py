from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies import require_global_admin
from app.models.club import Club
from app.models.league import League
from app.models.player import Player
from app.models.report import ScoutingReport
from app.models.user import User
from app.schemas.admin import (
    AdminClubItem,
    AdminPlayerItem,
    AdminReportItem,
    AdminUserItem,
    ListResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=ListResponse[AdminUserItem])
def list_users(
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(User, Club.name.label("club_name"))
        .outerjoin(Club, User.club_id == Club.id)
        .filter(User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
        .all()
    )

    items = [
        AdminUserItem(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            club_name=club_name,
            status=user.status,
            created_at=user.created_at,
        )
        for user, club_name in rows
    ]
    return ListResponse(items=items, total=len(items))


@router.get("/clubs", response_model=ListResponse[AdminClubItem])
def list_clubs(
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Club, League.name.label("league_name"))
        .outerjoin(League, Club.league_id == League.id)
        .filter(Club.deleted_at.is_(None))
        .order_by(Club.created_at.desc())
        .all()
    )

    scout_counts = {
        row.club_id: row.cnt
        for row in db.query(User.club_id, func.count(User.id).label("cnt"))
        .filter(User.role == "scout", User.club_id.isnot(None), User.deleted_at.is_(None))
        .group_by(User.club_id)
        .all()
    }

    player_counts = {
        row.club_id: row.cnt
        for row in db.query(Player.club_id, func.count(Player.id).label("cnt"))
        .filter(Player.club_id.isnot(None))
        .group_by(Player.club_id)
        .all()
    }

    items = [
        AdminClubItem(
            id=str(club.id),
            name=club.name,
            country=club.country,
            league=league_name or "—",
            scout_count=scout_counts.get(club.id, 0),
            player_count=player_counts.get(club.id, 0),
            status=club.status,
            created_at=club.created_at,
        )
        for club, league_name in rows
    ]
    return ListResponse(items=items, total=len(items))


@router.get("/players", response_model=ListResponse[AdminPlayerItem])
def list_players(
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Player, Club.name.label("club_name"))
        .outerjoin(Club, Player.club_id == Club.id)
        .order_by(Player.created_at.desc())
        .all()
    )

    items = [
        AdminPlayerItem(
            id=str(player.id),
            first_name=player.first_name,
            last_name=player.last_name,
            date_of_birth=player.date_of_birth,
            nationality=player.nationality,
            position=player.position,
            club_name=club_name,
            market_value=player.market_value,
            status=player.status,
            created_at=player.created_at,
        )
        for player, club_name in rows
    ]
    return ListResponse(items=items, total=len(items))


@router.get("/reports", response_model=ListResponse[AdminReportItem])
def list_reports(
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ScoutingReport, User.first_name, User.last_name)
        .join(User, ScoutingReport.scout_id == User.id)
        .order_by(ScoutingReport.created_at.desc())
        .all()
    )

    items = [
        AdminReportItem(
            id=str(report.id),
            player_name=report.player_name,
            position=report.position,
            scout_name=f"{first_name} {last_name}",
            rating=report.rating,
            status=report.status,
            notes=report.notes,
            created_at=report.created_at,
        )
        for report, first_name, last_name in rows
    ]
    return ListResponse(items=items, total=len(items))
