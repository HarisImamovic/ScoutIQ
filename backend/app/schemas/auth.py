from pydantic import BaseModel, EmailStr, field_validator

from app.security import validate_password_strength

_VALID_ROLES = {"player", "scout", "club_admin", "global_admin"}


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str

    @field_validator("password")
    @classmethod
    def password_meets_policy(cls, v: str) -> str:
        if not validate_password_strength(v):
            raise ValueError(
                "Password must be 8–72 characters and contain at least one uppercase letter, "
                "one lowercase letter, one digit, and one special character (@$!%*?&_-#)."
            )
        return v

    @field_validator("role")
    @classmethod
    def role_is_valid(cls, v: str) -> str:
        if v not in _VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(_VALID_ROLES))}.")
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("This field cannot be blank.")
        if len(stripped) > 100:
            raise ValueError("This field cannot exceed 100 characters.")
        return stripped


class UpdateProfileRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("This field cannot be blank.")
        if len(stripped) > 100:
            raise ValueError("This field cannot exceed 100 characters.")
        return stripped


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_meets_policy(cls, v: str) -> str:
        if not validate_password_strength(v):
            raise ValueError(
                "Password must be 8–72 characters and contain at least one uppercase letter, "
                "one lowercase letter, one digit, and one special character."
            )
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleCallbackRequest(BaseModel):
    code: str
    code_verifier: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_meets_policy(cls, v: str) -> str:
        if not validate_password_strength(v):
            raise ValueError(
                "Password must be 8–72 characters and contain at least one uppercase letter, "
                "one lowercase letter, one digit, and one special character."
            )
        return v
