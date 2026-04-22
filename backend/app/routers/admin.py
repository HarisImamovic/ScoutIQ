import uuid as _uuid
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, status

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
    CreateClubRequest,
    CreatePlayerRequest,
    CreateReportRequest,
    CreateUserRequest,
    ListResponse,
    UpdateClubRequest,
    UpdatePlayerRequest,
    UpdateReportRequest,
    UpdateUserRequest,
)
from app.security import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Helper: scouts lookup list (used by front-end report create modal)
# ---------------------------------------------------------------------------

@router.get("/leagues")
def list_leagues(
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    leagues = db.query(League).order_by(League.name).all()
    return [{"id": str(l.id), "name": l.name} for l in leagues]


@router.get("/scouts")
def list_scouts(
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    scouts = (
        db.query(User)
        .filter(User.role == "scout", User.deleted_at.is_(None))
        .order_by(User.first_name, User.last_name)
        .all()
    )
    return [{"id": str(s.id), "name": f"{s.first_name} {s.last_name}"} for s in scouts]


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

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
            club_id=str(user.club_id) if user.club_id else None,
            club_name=club_name,
            status=user.status,
            created_at=user.created_at,
        )
        for user, club_name in rows
    ]
    return ListResponse(items=items, total=len(items))


@router.post("/users", response_model=AdminUserItem, status_code=status.HTTP_201_CREATED)
def create_user(
    body: CreateUserRequest,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    club_uuid = None
    club = None
    if body.club_id:
        try:
            club_uuid = _uuid.UUID(body.club_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid club_id format.")
        club = db.query(Club).filter(Club.id == club_uuid, Club.deleted_at.is_(None)).first()
        if not club:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    if body.role == "player" and not body.position:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Position is required when creating a player account.",
        )

    new_user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        role=body.role,
        club_id=club_uuid,
        status=body.status,
    )

    try:
        db.add(new_user)
        if body.role == "player":
            db.add(Player(
                first_name=body.first_name.strip(),
                last_name=body.last_name.strip(),
                position=body.position.strip().upper(),
                club_id=club_uuid,
                status="active",
            ))
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    return AdminUserItem(
        id=str(new_user.id),
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        role=new_user.role,
        club_id=str(club_uuid) if club_uuid else None,
        club_name=club.name if club else None,
        status=new_user.status,
        created_at=new_user.created_at,
    )


# ---------------------------------------------------------------------------
# Clubs
# ---------------------------------------------------------------------------

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


@router.post("/clubs", response_model=AdminClubItem, status_code=status.HTTP_201_CREATED)
def create_club(
    body: CreateClubRequest,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    league_uuid = None
    league = None
    if body.league_id:
        try:
            league_uuid = _uuid.UUID(body.league_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid league_id format.")
        league = db.query(League).filter(League.id == league_uuid).first()
        if not league:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found.")

    new_club = Club(
        name=body.name.strip(),
        short_name=body.short_name.strip() if body.short_name else None,
        country=body.country.strip(),
        league_id=league_uuid,
        status=body.status,
    )

    db.add(new_club)
    db.commit()
    db.refresh(new_club)

    return AdminClubItem(
        id=str(new_club.id),
        name=new_club.name,
        country=new_club.country,
        league=league.name if league else "—",
        scout_count=0,
        player_count=0,
        status=new_club.status,
        created_at=new_club.created_at,
    )


# ---------------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------------

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


@router.post("/players", response_model=AdminPlayerItem, status_code=status.HTTP_201_CREATED)
def create_player(
    body: CreatePlayerRequest,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    club_uuid = None
    club = None
    if body.club_id:
        try:
            club_uuid = _uuid.UUID(body.club_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid club_id format.")
        club = db.query(Club).filter(Club.id == club_uuid, Club.deleted_at.is_(None)).first()
        if not club:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    new_player = Player(
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        position=body.position.strip(),
        nationality=body.nationality.strip() if body.nationality else None,
        date_of_birth=body.date_of_birth,
        club_id=club_uuid,
        market_value=body.market_value,
        status=body.status,
    )

    db.add(new_player)
    db.commit()
    db.refresh(new_player)

    return AdminPlayerItem(
        id=str(new_player.id),
        first_name=new_player.first_name,
        last_name=new_player.last_name,
        date_of_birth=new_player.date_of_birth,
        nationality=new_player.nationality,
        position=new_player.position,
        club_name=club.name if club else None,
        market_value=new_player.market_value,
        status=new_player.status,
        created_at=new_player.created_at,
    )


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

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


@router.post("/reports", response_model=AdminReportItem, status_code=status.HTTP_201_CREATED)
def create_report(
    body: CreateReportRequest,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    try:
        scout_uuid = _uuid.UUID(body.scout_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid scout_id format.",
        )

    scout = (
        db.query(User)
        .filter(User.id == scout_uuid, User.role == "scout", User.deleted_at.is_(None))
        .first()
    )
    if not scout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scout not found.",
        )

    player_uuid = None
    if body.player_id:
        try:
            player_uuid = _uuid.UUID(body.player_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid player_id format.",
            )
        if not db.query(Player).filter(Player.id == player_uuid).first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Player not found.",
            )

    new_report = ScoutingReport(
        scout_id=scout_uuid,
        player_id=player_uuid,
        player_name=body.player_name.strip(),
        position=body.position.strip(),
        rating=body.rating,
        status=body.status,
        notes=body.notes,
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return AdminReportItem(
        id=str(new_report.id),
        player_name=new_report.player_name,
        position=new_report.position,
        scout_name=f"{scout.first_name} {scout.last_name}",
        rating=new_report.rating,
        status=new_report.status,
        notes=new_report.notes,
        created_at=new_report.created_at,
    )


# ---------------------------------------------------------------------------
# Users – Update & Delete
# ---------------------------------------------------------------------------

@router.put("/users/{user_id}", response_model=AdminUserItem)
def update_user(
    user_id: str,
    body: UpdateUserRequest,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    try:
        uid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid user_id format.")

    user = db.query(User).filter(User.id == uid, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    new_email = body.email.lower()
    if user.email != new_email:
        conflict = (
            db.query(User)
            .filter(User.email == new_email, User.deleted_at.is_(None), User.id != uid)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists.")

    club_uuid = None
    club = None
    if body.club_id:
        try:
            club_uuid = _uuid.UUID(body.club_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid club_id format.")
        club = db.query(Club).filter(Club.id == club_uuid, Club.deleted_at.is_(None)).first()
        if not club:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    user.email = new_email
    user.first_name = body.first_name.strip()
    user.last_name = body.last_name.strip()
    user.role = body.role
    user.club_id = club_uuid
    user.status = body.status
    user.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)

    return AdminUserItem(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        club_id=str(club_uuid) if club_uuid else None,
        club_name=club.name if club else None,
        status=user.status,
        created_at=user.created_at,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
) -> None:
    try:
        uid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid user_id format.")

    user = db.query(User).filter(User.id == uid, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.deleted_at = datetime.now(timezone.utc)
    db.commit()


# ---------------------------------------------------------------------------
# Clubs – Update & Delete
# ---------------------------------------------------------------------------

@router.put("/clubs/{club_id}", response_model=AdminClubItem)
def update_club(
    club_id: str,
    body: UpdateClubRequest,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    try:
        cid = _uuid.UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid club_id format.")

    club = db.query(Club).filter(Club.id == cid, Club.deleted_at.is_(None)).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    league_uuid = None
    league = None
    if body.league_id:
        try:
            league_uuid = _uuid.UUID(body.league_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid league_id format.")
        league = db.query(League).filter(League.id == league_uuid).first()
        if not league:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found.")

    club.name = body.name.strip()
    club.country = body.country.strip()
    club.league_id = league_uuid
    club.status = body.status
    club.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(club)

    scout_count = (
        db.query(func.count(User.id))
        .filter(User.club_id == club.id, User.role == "scout", User.deleted_at.is_(None))
        .scalar()
    ) or 0
    player_count = (
        db.query(func.count(Player.id))
        .filter(Player.club_id == club.id)
        .scalar()
    ) or 0

    return AdminClubItem(
        id=str(club.id),
        name=club.name,
        country=club.country,
        league=league.name if league else "—",
        scout_count=scout_count,
        player_count=player_count,
        status=club.status,
        created_at=club.created_at,
    )


@router.delete("/clubs/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(
    club_id: str,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
) -> None:
    try:
        cid = _uuid.UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid club_id format.")

    club = db.query(Club).filter(Club.id == cid, Club.deleted_at.is_(None)).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    club.deleted_at = datetime.now(timezone.utc)
    db.commit()


# ---------------------------------------------------------------------------
# Players – Update & Delete
# ---------------------------------------------------------------------------

@router.put("/players/{player_id}", response_model=AdminPlayerItem)
def update_player(
    player_id: str,
    body: UpdatePlayerRequest,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    try:
        pid = _uuid.UUID(player_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid player_id format.")

    player = db.query(Player).filter(Player.id == pid).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    club_uuid = None
    club = None
    if body.club_id:
        try:
            club_uuid = _uuid.UUID(body.club_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid club_id format.")
        club = db.query(Club).filter(Club.id == club_uuid, Club.deleted_at.is_(None)).first()
        if not club:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")

    player.first_name = body.first_name.strip()
    player.last_name = body.last_name.strip()
    player.position = body.position.strip()
    player.nationality = body.nationality.strip() if body.nationality else None
    player.date_of_birth = body.date_of_birth
    player.club_id = club_uuid
    player.market_value = body.market_value
    player.status = body.status

    db.commit()
    db.refresh(player)

    return AdminPlayerItem(
        id=str(player.id),
        first_name=player.first_name,
        last_name=player.last_name,
        date_of_birth=player.date_of_birth,
        nationality=player.nationality,
        position=player.position,
        club_name=club.name if club else None,
        market_value=player.market_value,
        status=player.status,
        created_at=player.created_at,
    )


@router.delete("/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(
    player_id: str,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
) -> None:
    try:
        pid = _uuid.UUID(player_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid player_id format.")

    player = db.query(Player).filter(Player.id == pid).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    db.delete(player)
    db.commit()


# ---------------------------------------------------------------------------
# Reports – Update & Delete
# ---------------------------------------------------------------------------

@router.put("/reports/{report_id}", response_model=AdminReportItem)
def update_report(
    report_id: str,
    body: UpdateReportRequest,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
):
    try:
        rid = _uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid report_id format.")

    report = db.query(ScoutingReport).filter(ScoutingReport.id == rid).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    report.player_name = body.player_name.strip()
    report.position = body.position.strip()
    report.rating = body.rating
    report.status = body.status
    report.notes = body.notes
    report.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(report)

    scout = db.query(User).filter(User.id == report.scout_id).first()
    return AdminReportItem(
        id=str(report.id),
        player_name=report.player_name,
        position=report.position,
        scout_name=f"{scout.first_name} {scout.last_name}" if scout else "Unknown",
        rating=report.rating,
        status=report.status,
        notes=report.notes,
        created_at=report.created_at,
    )


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    _: User = Depends(require_global_admin),
    db: Session = Depends(get_db),
) -> None:
    try:
        rid = _uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid report_id format.")

    report = db.query(ScoutingReport).filter(ScoutingReport.id == rid).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    db.delete(report)
    db.commit()
