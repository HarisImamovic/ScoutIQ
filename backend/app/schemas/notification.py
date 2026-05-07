from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    icon_type: str
    title: str
    body: str
    action_data: Optional[dict[str, Any]] = None
    is_read: bool
    created_at: datetime
