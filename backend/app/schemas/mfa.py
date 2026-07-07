from pydantic import BaseModel, Field, field_validator

from app.utils.mfa import validate_phone_number

_VALID_METHODS = {"totp", "sms", "email"}


class MfaMethodStatus(BaseModel):
    method: str
    confirmed: bool
    destination: str | None = None


class MfaStatusResponse(BaseModel):
    methods: list[MfaMethodStatus]
    sms_available: bool
    recovery_codes_remaining: int


class MfaChallengeRequest(BaseModel):
    method: str

    @field_validator("method")
    @classmethod
    def method_is_valid(cls, v: str) -> str:
        if v not in {"sms", "email"}:
            raise ValueError("Method must be sms or email.")
        return v


class MfaVerifyRequest(BaseModel):
    method: str
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

    @field_validator("method")
    @classmethod
    def method_is_valid(cls, v: str) -> str:
        if v not in _VALID_METHODS:
            raise ValueError(f"Method must be one of: {', '.join(sorted(_VALID_METHODS))}.")
        return v


class MfaRecoveryRequest(BaseModel):
    code: str = Field(..., min_length=8, max_length=20)


class MfaCodeRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class MfaSmsSetupRequest(BaseModel):
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def phone_is_valid(cls, v: str) -> str:
        stripped = v.strip()
        if not validate_phone_number(stripped):
            raise ValueError("Phone number must be in international format, e.g. +38761123456.")
        return stripped


class MfaTotpSetupResponse(BaseModel):
    secret: str
    otpauth_uri: str
    qr_data_uri: str


class MfaConfirmResponse(BaseModel):
    access_token: str | None = None
    token_type: str = "bearer"
    recovery_codes: list[str] | None = None


class MfaLoginCompleteResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MfaReauthRequest(BaseModel):
    password: str | None = None
    code: str | None = None


class MfaRecoveryCodesResponse(BaseModel):
    recovery_codes: list[str]
