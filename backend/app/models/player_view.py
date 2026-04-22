import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PlayerView(Base):
    __tablename__ = "player_views"

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
    viewed_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    scout = relationship("User", back_populates="player_views")
    player = relationship("Player", back_populates="views")
