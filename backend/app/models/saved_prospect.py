import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SavedProspect(Base):
    __tablename__ = "saved_prospects"
    __table_args__ = (UniqueConstraint("scout_id", "player_id", name="uq_saved_prospect"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scout_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    player_id = Column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    saved_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    scout = relationship("User", back_populates="saved_prospects")
    player = relationship("Player", back_populates="saved_by_scouts")
