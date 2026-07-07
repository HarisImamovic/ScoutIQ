import json
import logging
from datetime import date
from typing import Iterator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from groq import APIConnectionError, APIStatusError, APITimeoutError, Groq, RateLimitError
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.dependencies import require_role
from app.limiter import limiter
from app.models.ai_usage_log import AiUsageLog
from app.models.player import Player
from app.models.report import ScoutingReport
from app.models.saved_prospect import SavedProspect
from app.models.user import User
from app.security import decode_access_token
from app.utils.age import calc_age

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)

_REPORT_STATUSES = ("submitted", "approved", "rejected")
_MAX_CONTEXT_CHARS = 12_000


def require_ai_access(current_user: User = Depends(require_role("scout"))) -> User:
    if not current_user.ai_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI access has not been enabled for your account. "
            "Contact a Global Admin to request access.",
        )
    return current_user

def _system_prompt() -> str:
    return get_settings().ai_system_prompt

_groq: Groq | None = None


def _get_groq_client() -> Groq:
    global _groq
    if _groq is None:
        _groq = Groq(api_key=get_settings().groq_api_key)
    return _groq


def _ai_rate_key(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = decode_access_token(auth[7:])
            return f"ai_user_{payload['sub']}"
        except Exception:
            pass
    from slowapi.util import get_remote_address
    return get_remote_address(request)


class HistoryMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=500)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[HistoryMessage] = Field(default_factory=list)

    @field_validator("history")
    @classmethod
    def _trim_history(cls, v: list) -> list:
        return v[-10:]


def _check_and_increment_daily_usage(db: Session, user_id, daily_limit: int, global_limit: int) -> int:
    today = date.today()

    global_used = (
        db.query(func.coalesce(func.sum(AiUsageLog.request_count), 0))
        .filter(AiUsageLog.date == today)
        .scalar()
    ) or 0
    if global_used >= global_limit:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI assistant has reached its shared daily capacity. Please try again tomorrow.",
        )

    record = (
        db.query(AiUsageLog)
        .filter(AiUsageLog.user_id == user_id, AiUsageLog.date == today)
        .first()
    )
    used = record.request_count if record else 0
    if used >= daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily limit of {daily_limit} requests reached. Try again tomorrow.",
        )
    if record:
        record.request_count += 1
    else:
        db.add(AiUsageLog(user_id=user_id, date=today, request_count=1))
    db.commit()
    return used + 1


def _build_context(db: Session, current_user: User, settings) -> str:
    total_active = db.query(Player).filter(Player.status == "active").count()
    players = (
        db.query(Player)
        .options(joinedload(Player.club))
        .filter(Player.status == "active")
        .order_by(Player.market_value.desc().nulls_last(), Player.last_name, Player.id)
        .limit(settings.ai_max_players_context)
        .all()
    )

    reports = (
        db.query(ScoutingReport)
        .filter(
            ScoutingReport.scout_id == current_user.id,
            ScoutingReport.status.in_(_REPORT_STATUSES),
        )
        .order_by(ScoutingReport.created_at.desc())
        .limit(settings.ai_max_reports_context)
        .all()
    )

    saved_prospects = (
        db.query(SavedProspect)
        .options(joinedload(SavedProspect.player).joinedload(Player.club))
        .filter(SavedProspect.scout_id == current_user.id)
        .limit(settings.ai_max_prospects_context)
        .all()
    )

    if total_active > len(players):
        lines = [
            f"=== PLAYERS (showing {len(players)} of {total_active} active players — this list is INCOMPLETE; "
            "state that clearly when answering ranking or 'top N' questions) ==="
        ]
    else:
        lines = [f"=== PLAYERS (all {total_active} active players) ==="]
    for p in players:
        age = calc_age(p.date_of_birth)
        club = p.club.name if p.club else "Free agent"
        parts = [
            f"{p.first_name} {p.last_name}",
            p.position or "N/A",
            f"age {age}" if age else "age ?",
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

    lines.append("\n=== YOUR REPORTS (listed newest to oldest by date written) ===")
    if reports:
        for r in reports:
            notes = (r.notes[:80] + "…") if r.notes and len(r.notes) > 80 else (r.notes or "")
            date_str = r.created_at.strftime("%Y-%m-%d") if r.created_at else "unknown date"
            lines.append(
                f"[{date_str}] {r.player_name}, {r.position}, rating {r.rating}/100, {r.status}"
                + (f" — {notes}" if notes else "")
            )
    else:
        lines.append("No submitted or approved reports yet.")

    lines.append("\n=== YOUR SAVED PROSPECTS ===")
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

    context = "\n".join(lines)
    if len(context) > _MAX_CONTEXT_CHARS:
        context = context[:_MAX_CONTEXT_CHARS] + "\n[Context truncated]"
    return context


@router.get("/usage")
def get_usage(
    current_user: User = Depends(require_ai_access),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    today = date.today()
    record = (
        db.query(AiUsageLog)
        .filter(AiUsageLog.user_id == current_user.id, AiUsageLog.date == today)
        .first()
    )
    used = record.request_count if record else 0
    return {
        "requests_today": used,
        "daily_limit": settings.ai_daily_request_limit,
        "remaining": max(0, settings.ai_daily_request_limit - used),
    }


@router.post("/chat")
@limiter.limit(
    f"{get_settings().ai_requests_per_minute}/minute",
    key_func=_ai_rate_key,
)
def chat(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(require_ai_access),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI assistant is not configured.",
        )

    used = _check_and_increment_daily_usage(
        db,
        current_user.id,
        settings.ai_daily_request_limit,
        settings.ai_global_daily_request_limit,
    )
    remaining = settings.ai_daily_request_limit - used

    context = _build_context(db, current_user, settings)

    messages = [
        {
            "role": "system",
            "content": (
                _system_prompt()
                + f"\n\n=== PLATFORM DATA ===\n{context}\n=== END PLATFORM DATA ==="
            ),
        }
    ]
    for h in body.history:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": f"=== USER INPUT ===\n{body.message}"})

    user_id_str = str(current_user.id)
    db.close()

    groq_client = _get_groq_client()
    model = settings.groq_model
    timeout = float(settings.groq_request_timeout)

    def generate() -> Iterator[str]:
        stream = None
        try:
            stream = groq_client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=1024,
                temperature=0.1,
                stream=True,
                timeout=timeout,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'chunk': delta})}\n\n"
            yield f"data: {json.dumps({'done': True, 'remaining': remaining})}\n\n"
        except GeneratorExit:
            logger.info("AI client disconnected for user %s; aborting stream.", user_id_str)
            raise
        except RateLimitError:
            logger.warning("Groq rate limit hit for user %s", user_id_str)
            yield f"data: {json.dumps({'error': 'rate_limit'})}\n\n"
        except APITimeoutError:
            logger.error("Groq timeout for user %s", user_id_str)
            yield f"data: {json.dumps({'error': 'timeout'})}\n\n"
        except (APIConnectionError, APIStatusError) as exc:
            logger.exception("Groq API error for user %s: %s", user_id_str, exc)
            yield f"data: {json.dumps({'error': 'service_unavailable'})}\n\n"
        except Exception:
            logger.exception("Unexpected AI streaming error for user %s", user_id_str)
            yield f"data: {json.dumps({'error': 'service_unavailable'})}\n\n"
        finally:
            close = getattr(stream, "close", None)
            if callable(close):
                try:
                    close()
                except Exception:
                    logger.debug("Failed to close Groq stream cleanly for user %s", user_id_str)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
