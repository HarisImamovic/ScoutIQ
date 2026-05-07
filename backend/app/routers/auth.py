from datetime import datetime, timedelta, timezone

import hashlib
import secrets

import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.email import send_password_reset_email
from app.limiter import limiter
from app.models.password_reset_token import PasswordResetToken
from app.models.user import RefreshToken, User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleCallbackRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPairResponse,
    UpdateProfileRequest,
)
from app.schemas.user import UserResponse
from app.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
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

    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenPairResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.email == payload.email, User.deleted_at.is_(None))
        .first()
    )

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

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

    access_token = create_access_token(subject=str(user.id), role=user.role)
    raw_refresh, refresh_hash = create_refresh_token()

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
        )
    )

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    return TokenPairResponse(access_token=access_token, refresh_token=raw_refresh)


@router.post("/refresh", response_model=TokenPairResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hash_refresh_token(payload.refresh_token)

    record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or has already been used.",
        )

    if record.expires_at < datetime.now(timezone.utc):
        record.revoked = True
        db.commit()
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

    return TokenPairResponse(access_token=new_access, refresh_token=new_raw_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hash_refresh_token(payload.refresh_token)
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
    db.commit()


_RESET_GENERIC = {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
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

    try:
        send_password_reset_email(to_email=user.email, reset_link=reset_link)
    except Exception:
        pass

    return _RESET_GENERIC


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
    db.commit()


@router.post("/google/callback", response_model=TokenPairResponse)
@limiter.limit("20/minute")
def google_callback(
    request: Request,
    payload: GoogleCallbackRequest,
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
            db.commit()
            db.refresh(user)

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

    access_token = create_access_token(subject=str(user.id), role=user.role)
    raw_refresh, refresh_hash = create_refresh_token()

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    return TokenPairResponse(access_token=access_token, refresh_token=raw_refresh)
