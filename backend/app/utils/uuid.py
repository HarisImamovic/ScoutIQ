from __future__ import annotations

import uuid as _uuid
from typing import Iterable

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


def parse_uuid_list(raws: Iterable[str]) -> list[_uuid.UUID]:
    uuids = []
    for raw in raws:
        try:
            uuids.append(_uuid.UUID(raw))
        except ValueError:
            pass
    return uuids
