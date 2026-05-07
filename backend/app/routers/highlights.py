import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.player import Player
from app.models.player_highlight import PlayerHighlight
from app.models.user import User
from app.schemas.player import HighlightCreate, HighlightResponse
from app.utils.embed import resolve_embed_url

router = APIRouter(tags=["highlights"])

_MAX_HIGHLIGHTS = 6


# ---------------------------------------------------------------------------
# Player — manage own highlights
# ---------------------------------------------------------------------------

@router.get("/player/highlights", response_model=list[HighlightResponse])
def get_my_highlights(
    current_user: User = Depends(require_role("player")),
    db: Session = Depends(get_db),
):
    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        return []

    rows = (
        db.query(PlayerHighlight)
        .filter(PlayerHighlight.player_id == player.id)
        .order_by(PlayerHighlight.created_at.desc())
        .all()
    )
    return [_to_response(h) for h in rows]


@router.post("/player/highlights", response_model=HighlightResponse, status_code=status.HTTP_201_CREATED)
def add_highlight(
    body: HighlightCreate,
    current_user: User = Depends(require_role("player")),
    db: Session = Depends(get_db),
):
    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player profile not found.",
        )

    count = (
        db.query(PlayerHighlight)
        .filter(PlayerHighlight.player_id == player.id)
        .count()
    )
    if count >= _MAX_HIGHLIGHTS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"You have reached the maximum of {_MAX_HIGHLIGHTS} highlights.",
        )

    embed_url = resolve_embed_url(body.url)
    if not embed_url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="URL must be a valid YouTube, Vimeo, or Google Drive video link.",
        )

    title = body.title.strip() if body.title and body.title.strip() else None

    highlight = PlayerHighlight(
        player_id=player.id,
        title=title,
        url=body.url.strip(),
        embed_url=embed_url,
    )
    db.add(highlight)
    db.commit()
    db.refresh(highlight)
    return _to_response(highlight)


@router.delete("/player/highlights/{highlight_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_highlight(
    highlight_id: str,
    current_user: User = Depends(require_role("player")),
    db: Session = Depends(get_db),
):
    try:
        hid = _uuid.UUID(highlight_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid highlight_id.",
        )

    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player profile not found.",
        )

    highlight = (
        db.query(PlayerHighlight)
        .filter(
            PlayerHighlight.id == hid,
            PlayerHighlight.player_id == player.id,
        )
        .first()
    )
    if not highlight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Highlight not found.",
        )

    db.delete(highlight)
    db.commit()


# ---------------------------------------------------------------------------
# Scout / Club Admin / Global Admin — read-only view of a player's highlights
# ---------------------------------------------------------------------------

@router.get("/highlights/player/{player_id}", response_model=list[HighlightResponse])
def get_player_highlights(
    player_id: str,
    current_user: User = Depends(require_role("scout", "club_admin", "global_admin")),
    db: Session = Depends(get_db),
):
    try:
        pid = _uuid.UUID(player_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid player_id.",
        )

    player = (
        db.query(Player)
        .filter(Player.id == pid, Player.status == "active")
        .first()
    )
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found.",
        )

    rows = (
        db.query(PlayerHighlight)
        .filter(PlayerHighlight.player_id == pid)
        .order_by(PlayerHighlight.created_at.desc())
        .all()
    )
    return [_to_response(h) for h in rows]


def _to_response(h: PlayerHighlight) -> HighlightResponse:
    return HighlightResponse(
        id=str(h.id),
        title=h.title,
        url=h.url,
        embed_url=h.embed_url,
        created_at=h.created_at,
    )
