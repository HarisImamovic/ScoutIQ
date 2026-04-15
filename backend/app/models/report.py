import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ScoutingReport(Base):
    __tablename__ = "scouting_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scout_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    player_id = Column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    player_name = Column(String(200), nullable=False)
    position = Column(String(10), nullable=False)
    rating = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="draft")
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(DateTime(timezone=True), nullable=True)

    scout = relationship("User", back_populates="scouting_reports")
    player = relationship("Player", back_populates="scouting_reports")
