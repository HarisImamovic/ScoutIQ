import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Club(Base):
    __tablename__ = "clubs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    short_name = Column(String(50), nullable=True)
    country = Column(String(100), nullable=False)
    league_id = Column(
        UUID(as_uuid=True),
        ForeignKey("leagues.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    logo_url = Column(String, nullable=True)
    primary_color = Column(String(7), nullable=True)
    stadium_name = Column(String(200), nullable=True)
    stadium_capacity = Column(Integer, nullable=True)
    status = Column(
        Enum("active", "pending", "suspended", name="club_status", create_type=False),
        nullable=False,
        default="active",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    league = relationship("League", back_populates="clubs")
    players = relationship("Player", back_populates="club")
    player_contracts = relationship("PlayerContract", back_populates="club", cascade="all, delete-orphan")
