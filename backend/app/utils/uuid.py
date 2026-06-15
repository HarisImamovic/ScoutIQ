from __future__ import annotations

import uuid as _uuid

from fastapi import HTTPException, status


def parse_uuid(raw: str, field: str) -> _uuid.UUID:
    try:
        return _uuid.UUID(raw)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid {field}.",
        )


def try_parse_uuid(raw: str) -> _uuid.UUID | None:
    try:
        return _uuid.UUID(raw)
    except ValueError:
        return None
