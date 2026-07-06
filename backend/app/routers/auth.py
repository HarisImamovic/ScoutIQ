from datetime import datetime, timedelta, timezone

import hashlib
import secrets

import requests as http_requests
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

import logging

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.email import send_password_reset_email
from app.limiter import limiter
from app.models.password_reset_token import PasswordResetToken
from app.models.user import RefreshToken, User

logger = logging.getLogger(__name__)
from app.models.mfa import MfaMethod
from app.schemas.auth import (
    AccessTokenResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleCallbackRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
)
from app.schemas.user import UserResponse
from app.utils.audit import record_audit
from app.utils.mfa import sms_available
from app.utils.notifications import create_notification, format_role, notify_global_admins
from app.security import (
    create_access_token,
    create_mfa_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])

_COOKIE_NAME = "refresh_token"
_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=not settings.debug,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        path=_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=_COOKIE_NAME,
        path=_COOKIE_PATH,
        secure=not settings.debug,
        httponly=True,
        samesite="lax",
    )


def _assert_account_active(user: User) -> None:
    if user.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended.",
        )
    if user.status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )


def _mfa_gate(user: User, db: Session, response: Response) -> LoginResponse:
    confirmed = [
        m.method
        for m in db.query(MfaMethod)
        .filter(MfaMethod.user_id == user.id, MfaMethod.confirmed.is_(True))
        .all()
    ]
    if confirmed:
        return LoginResponse(
            mfa_required=True,
            mfa_token=create_mfa_token(str(user.id), "verify"),
            methods=confirmed,
        )
    if settings.mfa_enforced:
        return LoginResponse(
            mfa_setup_required=True,
            mfa_token=create_mfa_token(str(user.id), "setup"),
            sms_available=sms_available(),
        )
    tokens = _issue_tokens(user, db, response)
    return LoginResponse(access_token=tokens.access_token)


def _issue_tokens(user: User, db: Session, response: Response) -> AccessTokenResponse:
    access_token = create_access_token(subject=str(user.id), role=user.role)
    raw_refresh, refresh_hash = create_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    _set_refresh_cookie(response, raw_refresh)
    return AccessTokenResponse(access_token=access_token)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
    )
    db.add(user)
    db.flush()

    if payload.role == "player":
        from app.models.player import Player
        db.add(Player(
            user_id=user.id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            status="active",
        ))

    notify_global_admins(
        db,
        "profile",
        "New User Registered",
        f"{payload.first_name} {payload.last_name} registered as {format_role(payload.role)}.",
    )

    record_audit(
        db,
        "user.register",
        actor_id=user.id,
        actor_email=user.email,
        target_type="user",
        target_id=user.id,
        request=request,
        detail=f"Self-registered as {payload.role}.",
    )

    db.commit()
    db.refresh(user)
    return user


_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid email or password.",
)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.email == payload.email, User.deleted_at.is_(None))
        .first()
    )

    now = datetime.now(timezone.utc)

    if user and user.locked_until and user.locked_until > now:
        record_audit(
            db, "login.blocked_locked", actor=user, target_type="user", target_id=user.id,
            request=request, detail="Login attempt while account is locked.", commit=True,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account temporarily locked due to repeated failed logins. Try again later.",
        )

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        if user:
            user.failed_login_count = (user.failed_login_count or 0) + 1
            locked = False
            if user.failed_login_count >= settings.login_max_failed_attempts:
                user.locked_until = now + timedelta(minutes=settings.login_lockout_minutes)
                user.failed_login_count = 0
                locked = True
            record_audit(
                db, "login.failed", actor=user, target_type="user", target_id=user.id,
                request=request,
                detail="Account locked after repeated failures." if locked else "Invalid password.",
            )
            db.commit()
        else:
            record_audit(
                db, "login.failed", actor_email=payload.email, request=request,
                detail="Unknown email.", commit=True,
            )
        raise _INVALID_CREDENTIALS

    _assert_account_active(user)

    if user.failed_login_count or user.locked_until:
        user.failed_login_count = 0
        user.locked_until = None

    record_audit(
        db, "login.password_ok", actor=user, target_type="user", target_id=user.id,
        request=request, commit=True,
    )
    return _mfa_gate(user, db, response)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get(_COOKIE_NAME)
    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token.",
        )

    token_hash = hash_refresh_token(raw_refresh)

    record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
        .first()
    )

    if not record:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or has already been used.",
        )

    if record.expires_at < datetime.now(timezone.utc):
        record.revoked = True
        db.commit()
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again.",
        )

    user = (
        db.query(User)
        .filter(User.id == record.user_id, User.deleted_at.is_(None))
        .first()
    )

    if not user or user.status != "active":
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is inactive.",
        )

    record.revoked = True

    new_access = create_access_token(subject=str(user.id), role=user.role)
    new_raw_refresh, new_hash = create_refresh_token()

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=new_hash,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()

    _set_refresh_cookie(response, new_raw_refresh)
    return AccessTokenResponse(access_token=new_access)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get(_COOKIE_NAME)
    if raw_refresh:
        token_hash = hash_refresh_token(raw_refresh)
        record = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked.is_(False),
            )
            .first()
        )
        if record:
            record.revoked = True
            db.commit()
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_first = payload.first_name.strip()
    new_last  = payload.last_name.strip()
    new_email = payload.email.strip()

    if (
        new_first == current_user.first_name
        and new_last == current_user.last_name
        and new_email.lower() == current_user.email.lower()
    ):
        return current_user

    if new_email.lower() != current_user.email.lower():
        conflict = (
            db.query(User)
            .filter(
                User.email == new_email,
                User.id != current_user.id,
                User.deleted_at.is_(None),
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already in use by another account.",
            )

    current_user.first_name = new_first
    current_user.last_name  = new_last
    current_user.email      = new_email
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google sign-in and does not have a password.",
        )
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    current_user.password_hash = hash_password(payload.new_password)
    current_user.updated_at = datetime.now(timezone.utc)
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked.is_(False),
    ).update({"revoked": True}, synchronize_session=False)
    record_audit(
        db, "password.change", actor=current_user, target_type="user",
        target_id=current_user.id, detail="Password changed; sessions revoked.",
    )
    db.commit()


_RESET_GENERIC = {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == payload.email, User.deleted_at.is_(None))
        .first()
    )

    if not user or not user.password_hash or user.status != "active":
        return _RESET_GENERIC

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used.is_(False),
    ).update({"used": True})

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
    )
    db.commit()

    reset_link = f"{settings.frontend_url}/reset-password?token={raw_token}"

    background_tasks.add_task(_send_reset_email_safe, user.email, reset_link)

    return _RESET_GENERIC


def _send_reset_email_safe(to_email: str, reset_link: str) -> None:
    try:
        send_password_reset_email(to_email=to_email, reset_link=reset_link)
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()

    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link.")

    if record.used:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link has already been used.")

    if record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link has expired.")

    user = (
        db.query(User)
        .filter(User.id == record.user_id, User.deleted_at.is_(None))
        .first()
    )

    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link.")

    user.password_hash = hash_password(payload.new_password)
    user.updated_at = datetime.now(timezone.utc)
    record.used = True
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.revoked.is_(False),
    ).update({"revoked": True}, synchronize_session=False)
    record_audit(
        db, "password.reset", actor=user, target_type="user", target_id=user.id,
        request=request, detail="Password reset via emailed token; sessions revoked.",
    )
    db.commit()


@router.post("/google/callback", response_model=LoginResponse)
@limiter.limit("20/minute")
def google_callback(
    request: Request,
    payload: GoogleCallbackRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured.",
        )

    token_resp = http_requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": payload.code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
            "code_verifier": payload.code_verifier,
        },
        timeout=10,
    )

    if not token_resp.ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange authorization code with Google.",
        )

    token_data = token_resp.json()
    raw_id_token = token_data.get("id_token")
    if not raw_id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No ID token received from Google.",
        )

    try:
        idinfo = google_id_token.verify_oauth2_token(
            raw_id_token,
            GoogleAuthRequest(),
            settings.google_client_id,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token verification failed.",
        )

    if not idinfo.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is not verified.",
        )

    google_user_id: str = idinfo["sub"]
    email: str = idinfo["email"]
    first_name: str = idinfo.get("given_name") or email.split("@")[0]
    last_name: str = idinfo.get("family_name") or ""
    picture: str | None = idinfo.get("picture")

    user = (
        db.query(User)
        .filter(User.google_id == google_user_id, User.deleted_at.is_(None))
        .first()
    )

    if not user:
        user = (
            db.query(User)
            .filter(User.email == email, User.deleted_at.is_(None))
            .first()
        )
        if user:
            user.google_id = google_user_id
            if not user.avatar_url and picture:
                user.avatar_url = picture
            db.commit()
        else:
            user = User(
                email=email,
                password_hash=None,
                first_name=first_name,
                last_name=last_name,
                role="scout",
                google_id=google_user_id,
                avatar_url=picture,
            )
            db.add(user)
            db.flush()

            notify_global_admins(
                db,
                "profile",
                "New User Registered",
                f"{first_name} {last_name} registered via Google as {format_role('scout')}.",
            )

            record_audit(
                db, "user.register_google", actor_id=user.id, actor_email=user.email,
                target_type="user", target_id=user.id, request=request,
                detail="Auto-created scout account via Google SSO.",
            )

            db.commit()
            db.refresh(user)

    _assert_account_active(user)
    return _mfa_gate(user, db, response)
