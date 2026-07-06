import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.email import send_mfa_code_email
from app.limiter import limiter
from app.models.mfa import MfaChallenge, MfaMethod, MfaRecoveryCode
from app.models.user import User
from app.routers.auth import _assert_account_active, _issue_tokens
from app.schemas.mfa import (
    MfaChallengeRequest,
    MfaCodeRequest,
    MfaConfirmResponse,
    MfaLoginCompleteResponse,
    MfaMethodStatus,
    MfaReauthRequest,
    MfaRecoveryCodesResponse,
    MfaRecoveryRequest,
    MfaSmsSetupRequest,
    MfaStatusResponse,
    MfaTotpSetupResponse,
    MfaVerifyRequest,
)
from app.security import decode_access_token, decode_mfa_token, verify_password
from app.utils.mfa import (
    codes_match,
    decrypt_secret,
    encrypt_secret,
    generate_challenge_code,
    generate_recovery_codes,
    generate_totp_secret,
    hash_otp_code,
    mask_email,
    mask_phone,
    normalize_recovery_code,
    send_sms,
    sms_available,
    totp_provisioning_uri,
    totp_qr_data_uri,
    verify_totp,
)
from app.utils.notifications import create_notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/mfa", tags=["MFA"])

_bearer = HTTPBearer(auto_error=False)

_INVALID_CODE = HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid or expired verification code.",
)


def _load_active_user(user_id: str, db: Session) -> User:
    user = (
        db.query(User)
        .filter(User.id == user_id, User.deleted_at.is_(None))
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is no longer valid.",
        )
    _assert_account_active(user)
    return user


def _decode_bearer_mfa(credentials: Optional[HTTPAuthorizationCredentials], purpose: str) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    try:
        payload = decode_mfa_token(credentials.credentials, purpose)
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your verification session has expired. Please log in again.",
        )
    return payload["sub"]


def get_verify_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    user_id = _decode_bearer_mfa(credentials, "verify")
    return _load_active_user(user_id, db)


def get_setup_context(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> tuple[User, bool]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    try:
        payload = decode_access_token(credentials.credentials)
        if payload.get("type") == "access":
            return _load_active_user(payload["sub"], db), False
    except jwt.InvalidTokenError:
        pass
    user_id = _decode_bearer_mfa(credentials, "setup")
    return _load_active_user(user_id, db), True


def _confirmed_methods(user: User, db: Session) -> list[MfaMethod]:
    return (
        db.query(MfaMethod)
        .filter(MfaMethod.user_id == user.id, MfaMethod.confirmed.is_(True))
        .all()
    )


def _create_challenge(
    user: User,
    method: str,
    purpose: str,
    db: Session,
    background: BackgroundTasks,
    phone_override: str | None = None,
) -> None:
    settings = get_settings()
    code = generate_challenge_code()

    db.query(MfaChallenge).filter(
        MfaChallenge.user_id == user.id,
        MfaChallenge.method == method,
        MfaChallenge.purpose == purpose,
    ).delete(synchronize_session=False)

    db.add(
        MfaChallenge(
            user_id=user.id,
            method=method,
            purpose=purpose,
            code_hash=hash_otp_code(code),
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=settings.mfa_challenge_expire_minutes),
        )
    )
    db.commit()

    if method == "email":
        background.add_task(
            send_mfa_code_email, user.email, code, settings.mfa_challenge_expire_minutes
        )
    else:
        phone = phone_override
        if not phone:
            record = (
                db.query(MfaMethod)
                .filter(MfaMethod.user_id == user.id, MfaMethod.method == "sms")
                .first()
            )
            phone = record.phone_number if record else None
        if not phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No phone number configured for SMS verification.",
            )
        background.add_task(
            send_sms,
            phone,
            f"Your ScoutIQ verification code is {code}. It expires in "
            f"{settings.mfa_challenge_expire_minutes} minutes.",
        )


def _consume_challenge(user: User, method: str, purpose: str, code: str, db: Session) -> bool:
    settings = get_settings()
    challenge = (
        db.query(MfaChallenge)
        .filter(
            MfaChallenge.user_id == user.id,
            MfaChallenge.method == method,
            MfaChallenge.purpose == purpose,
            MfaChallenge.consumed.is_(False),
        )
        .first()
    )
    if not challenge:
        return False
    if challenge.expires_at < datetime.now(timezone.utc):
        db.delete(challenge)
        db.commit()
        return False
    if challenge.attempts >= settings.mfa_challenge_max_attempts:
        db.delete(challenge)
        db.commit()
        return False

    if not codes_match(code, challenge.code_hash):
        challenge.attempts += 1
        db.commit()
        return False

    challenge.consumed = True
    db.commit()
    return True


def _verify_code_for_method(user: User, method: MfaMethod, code: str, purpose: str, db: Session) -> bool:
    if method.method == "totp":
        counter = verify_totp(decrypt_secret(method.secret_encrypted), code, method.last_used_counter)
        if counter is None:
            return False
        method.last_used_counter = counter
        db.commit()
        return True
    return _consume_challenge(user, method.method, purpose, code, db)


def _issue_recovery_codes(user: User, db: Session) -> list[str]:
    settings = get_settings()
    db.query(MfaRecoveryCode).filter(MfaRecoveryCode.user_id == user.id).delete(
        synchronize_session=False
    )
    raw_codes = generate_recovery_codes(settings.mfa_recovery_code_count)
    for raw in raw_codes:
        db.add(
            MfaRecoveryCode(
                user_id=user.id,
                code_hash=hash_otp_code(normalize_recovery_code(raw)),
            )
        )
    db.commit()
    return raw_codes


def _require_reauth(user: User, payload: MfaReauthRequest, db: Session) -> None:
    if user.password_hash:
        if not payload.password or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is incorrect.",
            )
        return
    if not payload.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A verification code from one of your 2FA methods is required.",
        )
    for method in _confirmed_methods(user, db):
        if _verify_code_for_method(user, method, payload.code, "manage", db):
            return
    raise _INVALID_CODE


def _confirm_method(
    user: User,
    method: str,
    in_login_flow: bool,
    db: Session,
    response,
) -> MfaConfirmResponse:
    record = (
        db.query(MfaMethod)
        .filter(MfaMethod.user_id == user.id, MfaMethod.method == method)
        .first()
    )
    if not record:
        raise _INVALID_CODE

    had_confirmed_before = len(_confirmed_methods(user, db)) > 0

    record.confirmed = True
    record.confirmed_at = datetime.now(timezone.utc)
    db.commit()

    create_notification(
        db,
        user.id,
        "profile",
        "Two-Factor Authentication Updated",
        f"A new 2FA method ({method.upper() if method != 'email' else 'Email'}) was added to your account. "
        "If this wasn't you, secure your account immediately.",
    )
    db.commit()

    recovery_codes = None if had_confirmed_before else _issue_recovery_codes(user, db)

    access_token = None
    if in_login_flow:
        tokens = _issue_tokens(user, db, response)
        access_token = tokens.access_token

    return MfaConfirmResponse(access_token=access_token, recovery_codes=recovery_codes)


@router.get("/status", response_model=MfaStatusResponse)
def mfa_status(
    context: tuple[User, bool] = Depends(get_setup_context),
    db: Session = Depends(get_db),
):
    user, _ = context
    records = db.query(MfaMethod).filter(MfaMethod.user_id == user.id).all()
    methods = []
    for r in records:
        destination = None
        if r.method == "sms" and r.phone_number:
            destination = mask_phone(r.phone_number)
        elif r.method == "email":
            destination = mask_email(user.email)
        methods.append(MfaMethodStatus(method=r.method, confirmed=r.confirmed, destination=destination))

    remaining = (
        db.query(MfaRecoveryCode)
        .filter(MfaRecoveryCode.user_id == user.id, MfaRecoveryCode.used_at.is_(None))
        .count()
    )
    return MfaStatusResponse(
        methods=methods,
        sms_available=sms_available(),
        recovery_codes_remaining=remaining,
    )


@router.post("/challenge", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
def request_challenge(
    request: Request,
    payload: MfaChallengeRequest,
    background: BackgroundTasks,
    current_user: User = Depends(get_verify_user),
    db: Session = Depends(get_db),
):
    method = (
        db.query(MfaMethod)
        .filter(
            MfaMethod.user_id == current_user.id,
            MfaMethod.method == payload.method,
            MfaMethod.confirmed.is_(True),
        )
        .first()
    )
    if not method:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification method is not enabled on your account.",
        )
    _create_challenge(current_user, payload.method, "login", db, background)


@router.post("/manage/challenge", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
def request_manage_challenge(
    request: Request,
    payload: MfaChallengeRequest,
    background: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    method = (
        db.query(MfaMethod)
        .filter(
            MfaMethod.user_id == current_user.id,
            MfaMethod.method == payload.method,
            MfaMethod.confirmed.is_(True),
        )
        .first()
    )
    if not method:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification method is not enabled on your account.",
        )
    _create_challenge(current_user, payload.method, "manage", db, background)


@router.post("/verify", response_model=MfaLoginCompleteResponse)
@limiter.limit("10/minute")
def verify_mfa(
    request: Request,
    payload: MfaVerifyRequest,
    response: Response,
    current_user: User = Depends(get_verify_user),
    db: Session = Depends(get_db),
):
    method = (
        db.query(MfaMethod)
        .filter(
            MfaMethod.user_id == current_user.id,
            MfaMethod.method == payload.method,
            MfaMethod.confirmed.is_(True),
        )
        .first()
    )
    if not method:
        raise _INVALID_CODE

    if not _verify_code_for_method(current_user, method, payload.code, "login", db):
        raise _INVALID_CODE

    tokens = _issue_tokens(current_user, db, response)
    return MfaLoginCompleteResponse(access_token=tokens.access_token)


@router.post("/recovery", response_model=MfaLoginCompleteResponse)
@limiter.limit("5/minute")
def verify_recovery_code(
    request: Request,
    payload: MfaRecoveryRequest,
    response: Response,
    current_user: User = Depends(get_verify_user),
    db: Session = Depends(get_db),
):
    normalized = normalize_recovery_code(payload.code)
    record = (
        db.query(MfaRecoveryCode)
        .filter(
            MfaRecoveryCode.user_id == current_user.id,
            MfaRecoveryCode.code_hash == hash_otp_code(normalized),
            MfaRecoveryCode.used_at.is_(None),
        )
        .first()
    )
    if not record:
        raise _INVALID_CODE

    record.used_at = datetime.now(timezone.utc)
    db.commit()

    create_notification(
        db,
        current_user.id,
        "profile",
        "Recovery Code Used",
        "A recovery code was used to sign in to your account. If this wasn't you, secure your account immediately.",
    )
    db.commit()

    tokens = _issue_tokens(current_user, db, response)
    return MfaLoginCompleteResponse(access_token=tokens.access_token)


@router.post("/setup/totp", response_model=MfaTotpSetupResponse)
@limiter.limit("5/minute")
def setup_totp(
    request: Request,
    context: tuple[User, bool] = Depends(get_setup_context),
    db: Session = Depends(get_db),
):
    user, _ = context
    existing = (
        db.query(MfaMethod)
        .filter(MfaMethod.user_id == user.id, MfaMethod.method == "totp")
        .first()
    )
    if existing and existing.confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An authenticator app is already configured on this account.",
        )

    secret = generate_totp_secret()
    if existing:
        existing.secret_encrypted = encrypt_secret(secret)
        existing.last_used_counter = None
    else:
        db.add(
            MfaMethod(
                user_id=user.id,
                method="totp",
                secret_encrypted=encrypt_secret(secret),
            )
        )
    db.commit()

    uri = totp_provisioning_uri(secret, user.email)
    return MfaTotpSetupResponse(secret=secret, otpauth_uri=uri, qr_data_uri=totp_qr_data_uri(uri))


@router.post("/setup/totp/confirm", response_model=MfaConfirmResponse)
@limiter.limit("10/minute")
def confirm_totp(
    request: Request,
    payload: MfaCodeRequest,
    response: Response,
    context: tuple[User, bool] = Depends(get_setup_context),
    db: Session = Depends(get_db),
):
    user, in_login_flow = context
    record = (
        db.query(MfaMethod)
        .filter(
            MfaMethod.user_id == user.id,
            MfaMethod.method == "totp",
            MfaMethod.confirmed.is_(False),
        )
        .first()
    )
    if not record or not record.secret_encrypted:
        raise _INVALID_CODE

    counter = verify_totp(decrypt_secret(record.secret_encrypted), payload.code, None)
    if counter is None:
        raise _INVALID_CODE

    record.last_used_counter = counter
    db.commit()
    return _confirm_method(user, "totp", in_login_flow, db, response)


@router.post("/setup/email", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
def setup_email(
    request: Request,
    background: BackgroundTasks,
    context: tuple[User, bool] = Depends(get_setup_context),
    db: Session = Depends(get_db),
):
    user, _ = context
    existing = (
        db.query(MfaMethod)
        .filter(MfaMethod.user_id == user.id, MfaMethod.method == "email")
        .first()
    )
    if existing and existing.confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email verification is already configured on this account.",
        )
    if not existing:
        db.add(MfaMethod(user_id=user.id, method="email"))
        db.commit()
    _create_challenge(user, "email", "setup", db, background)


@router.post("/setup/email/confirm", response_model=MfaConfirmResponse)
@limiter.limit("10/minute")
def confirm_email(
    request: Request,
    payload: MfaCodeRequest,
    response: Response,
    context: tuple[User, bool] = Depends(get_setup_context),
    db: Session = Depends(get_db),
):
    user, in_login_flow = context
    if not _consume_challenge(user, "email", "setup", payload.code, db):
        raise _INVALID_CODE
    return _confirm_method(user, "email", in_login_flow, db, response)


@router.post("/setup/sms", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
def setup_sms(
    request: Request,
    payload: MfaSmsSetupRequest,
    background: BackgroundTasks,
    context: tuple[User, bool] = Depends(get_setup_context),
    db: Session = Depends(get_db),
):
    if not sms_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMS verification is not available.",
        )
    user, _ = context
    existing = (
        db.query(MfaMethod)
        .filter(MfaMethod.user_id == user.id, MfaMethod.method == "sms")
        .first()
    )
    if existing and existing.confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SMS verification is already configured on this account.",
        )
    if existing:
        existing.phone_number = payload.phone_number
    else:
        db.add(MfaMethod(user_id=user.id, method="sms", phone_number=payload.phone_number))
    db.commit()
    _create_challenge(user, "sms", "setup", db, background, phone_override=payload.phone_number)


@router.post("/setup/sms/confirm", response_model=MfaConfirmResponse)
@limiter.limit("10/minute")
def confirm_sms(
    request: Request,
    payload: MfaCodeRequest,
    response: Response,
    context: tuple[User, bool] = Depends(get_setup_context),
    db: Session = Depends(get_db),
):
    user, in_login_flow = context
    if not _consume_challenge(user, "sms", "setup", payload.code, db):
        raise _INVALID_CODE
    return _confirm_method(user, "sms", in_login_flow, db, response)


@router.post("/methods/{method}/remove", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
def remove_method(
    request: Request,
    method: str,
    payload: MfaReauthRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if method not in {"totp", "sms", "email"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown method.")

    record = (
        db.query(MfaMethod)
        .filter(MfaMethod.user_id == current_user.id, MfaMethod.method == method)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Method not configured.")

    confirmed = _confirmed_methods(current_user, db)
    if record.confirmed and len(confirmed) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your last active 2FA method.",
        )

    _require_reauth(current_user, payload, db)

    db.delete(record)
    db.commit()

    create_notification(
        db,
        current_user.id,
        "profile",
        "Two-Factor Authentication Updated",
        f"A 2FA method ({method.upper() if method != 'email' else 'Email'}) was removed from your account. "
        "If this wasn't you, secure your account immediately.",
    )
    db.commit()


@router.post("/recovery-codes/regenerate", response_model=MfaRecoveryCodesResponse)
@limiter.limit("3/minute")
def regenerate_recovery_codes(
    request: Request,
    payload: MfaReauthRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _confirmed_methods(current_user, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enable a 2FA method before generating recovery codes.",
        )
    _require_reauth(current_user, payload, db)
    return MfaRecoveryCodesResponse(recovery_codes=_issue_recovery_codes(current_user, db))
