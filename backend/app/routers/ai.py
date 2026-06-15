import logging

from groq import Groq
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.dependencies import require_role
from app.limiter import limiter
from app.models.player import Player
from app.models.report import ScoutingReport
from app.models.saved_prospect import SavedProspect
from app.models.user import User
from app.utils.age import calc_age

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an AI scouting assistant for ScoutIQ, a professional football scouting platform. "
    "You have access to real data from the platform's database. "
    "Answer the scout's questions accurately and concisely using only the provided data. "
    "If the data doesn't contain what's needed, say so clearly. "
    "Be professional, direct, and helpful."
)


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)


class ChatResponse(BaseModel):
    response: str


def _build_context(db: Session, current_user: User) -> str:
    players = (
        db.query(Player)
        .options(joinedload(Player.club))
        .filter(Player.status == "active")
        .limit(40)
        .all()
    )

    reports = (
        db.query(ScoutingReport)
        .filter(ScoutingReport.status == "published", ScoutingReport.scout_id == current_user.id)
        .order_by(ScoutingReport.created_at.desc())
        .limit(20)
        .all()
    )

    saved_prospects = (
        db.query(SavedProspect)
        .options(joinedload(SavedProspect.player).joinedload(Player.club))
        .filter(SavedProspect.scout_id == current_user.id)
        .all()
    )

    lines = ["PLAYERS:"]
    for p in players:
        age = calc_age(p.date_of_birth)
        club = p.club.name if p.club else "Free agent"
        parts = [
            f"{p.first_name} {p.last_name}",
            p.position or "N/A",
            str(age) if age else "?",
            club,
            f"€{p.market_value:,}" if p.market_value else "val=?",
        ]
        stats = []
        if p.goals is not None:
            stats.append(f"G{p.goals}")
        if p.assists is not None:
            stats.append(f"A{p.assists}")
        if p.minutes_played is not None:
            stats.append(f"{p.minutes_played}min")
        if p.defensive_contributions is not None:
            stats.append(f"D{p.defensive_contributions}")
        if p.saves is not None:
            stats.append(f"S{p.saves}")
        if p.chances_created is not None:
            stats.append(f"CC{p.chances_created}")
        if p.dribbles is not None:
            stats.append(f"Dr{p.dribbles}")
        if stats:
            parts.append("/".join(stats))
        lines.append(", ".join(parts))

    lines.append(f"\nREPORTS (scout: {current_user.first_name} {current_user.last_name}):")
    for r in reports:
        notes = (r.notes[:80] + "…") if r.notes and len(r.notes) > 80 else (r.notes or "")
        lines.append(
            f"{r.player_name}, {r.position}, {r.rating}/10" + (f", {notes}" if notes else "")
        )

    lines.append(f"\nSAVED PROSPECTS (scout: {current_user.first_name} {current_user.last_name}):")
    if saved_prospects:
        for sp in saved_prospects:
            p = sp.player
            if not p:
                continue
            age = calc_age(p.date_of_birth)
            club = p.club.name if p.club else "Free agent"
            lines.append(f"{p.first_name} {p.last_name}, {p.position or 'N/A'}, age {age or '?'}, {club}")
    else:
        lines.append("None saved yet.")

    return "\n".join(lines)


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
def chat(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(require_role("scout")),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI assistant is not configured.",
        )

    context = _build_context(db, current_user)

    try:
        client = Groq(api_key=settings.groq_api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"{context}\n\nQuestion: {body.message}"},
            ],
            max_tokens=1024,
            temperature=0.7,
        )
        return ChatResponse(response=completion.choices[0].message.content)
    except Exception as exc:
        logger.exception("Groq API call failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to get a response from the AI service.",
        )
