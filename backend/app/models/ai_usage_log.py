import uuid

from sqlalchemy import Column, Date, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class AiUsageLog(Base):
    __tablename__ = "ai_usage_log"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_ai_usage_log_user_date"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date = Column(Date, nullable=False)
    request_count = Column(Integer, nullable=False, default=0)
