import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=True)
    google_id = Column(String(255), nullable=True, unique=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(
        Enum("player", "scout", "club_admin", "global_admin", name="user_role"),
        nullable=False,
    )
    club_id = Column(UUID(as_uuid=True), nullable=True)
    avatar_url = Column(String, nullable=True)
    status = Column(
        Enum("active", "inactive", "suspended", name="user_status"),
        nullable=False,
        default="active",
    )
    telegram_chat_id = Column(String(50), nullable=True)
    telegram_link_code = Column(String(100), nullable=True)
    telegram_link_code_expires_at = Column(DateTime(timezone=True), nullable=True)
    ai_access = Column(Boolean, nullable=False, default=False)
    failed_login_count = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    scouting_reports = relationship(
        "ScoutingReport",
        back_populates="scout",
        cascade="all, delete-orphan",
    )
    saved_prospects = relationship(
        "SavedProspect",
        back_populates="scout",
        cascade="all, delete-orphan",
    )
    player_views = relationship(
        "PlayerView",
        back_populates="scout",
        cascade="all, delete-orphan",
    )
    password_reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    player_profile = relationship(
        "Player",
        back_populates="user",
        uselist=False,
        foreign_keys="[Player.user_id]",
    )
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    mfa_methods = relationship(
        "MfaMethod",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    mfa_recovery_codes = relationship(
        "MfaRecoveryCode",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    mfa_challenges = relationship(
        "MfaChallenge",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="refresh_tokens")
