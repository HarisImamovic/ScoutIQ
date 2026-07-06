import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.bot import start_bot, start_webhook, stop_webhook
from app.config import get_settings
from app.limiter import limiter
from app.routers import auth, admin, club_admin, scout, player, highlights, notifications, ai, ai_access, telegram, mfa
from app.tasks import start_background_tasks

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.debug:
        problems = settings.validate_for_production()
        if problems:
            for p in problems:
                logger.error("Production config problem: %s", p)
            raise RuntimeError(
                "Refusing to start with DEBUG=false and insecure configuration: "
                + "; ".join(problems)
            )
    start_background_tasks()
    if settings.telegram_webhook_enabled:
        try:
            await start_webhook(
                settings.telegram_bot_token,
                settings.telegram_webhook_url,
                settings.telegram_webhook_secret,
            )
        except Exception:
            logger.exception("Failed to start Telegram webhook")
    else:
        start_bot()
    yield
    if settings.telegram_webhook_enabled:
        await stop_webhook()


app = FastAPI(
    title="ScoutIQ API",
    version="1.0.0",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

app.state.limiter = limiter


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        )
        if settings.enable_hsts:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_bytes: int) -> None:
        super().__init__(app)
        self._max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next) -> Response:
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > self._max_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body is too large."},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header."},
                )
        return await call_next(request)


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_request_body_bytes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return await http_exception_handler(request, exc)
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred."},
    )


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(mfa.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(club_admin.router, prefix="/api/v1")
app.include_router(scout.router, prefix="/api/v1")
app.include_router(player.router, prefix="/api/v1")
app.include_router(highlights.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(ai_access.router, prefix="/api/v1")
app.include_router(telegram.router, prefix="/api/v1")

_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(os.path.join(_static_dir, "logos"), exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")
