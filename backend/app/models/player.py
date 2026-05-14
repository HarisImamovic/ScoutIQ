import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        index=True,
    )
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    nationality = Column(String(100), nullable=True)
    position = Column(String(10), nullable=True)
    club_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    market_value = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    minutes_played = Column(Integer, nullable=True)
    goals = Column(Integer, nullable=True)
    assists = Column(Integer, nullable=True)
    defensive_contributions = Column(Integer, nullable=True)
    saves = Column(Integer, nullable=True)
    chances_created = Column(Integer, nullable=True)
    dribbles = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    club = relationship("Club", back_populates="players")
    user = relationship("User", back_populates="player_profile", foreign_keys=[user_id])
    scouting_reports = relationship("ScoutingReport", back_populates="player")
    saved_by_scouts = relationship("SavedProspect", back_populates="player", cascade="all, delete-orphan")
    views = relationship("PlayerView", back_populates="player", cascade="all, delete-orphan")
    market_value_history = relationship(
        "PlayerMarketValueHistory",
        back_populates="player",
        cascade="all, delete-orphan",
    )
    highlights = relationship(
        "PlayerHighlight",
        back_populates="player",
        cascade="all, delete-orphan",
    )
    contracts = relationship(
        "PlayerContract",
        back_populates="player",
        cascade="all, delete-orphan",
    )
