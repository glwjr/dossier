"""Shared, opt-in pagination for list endpoints.

Backward compatible: with no query params the full collection is returned, so
existing clients are unaffected. Clients that want to page pass ``limit`` and
``offset``.
"""

from dataclasses import dataclass

from fastapi import Query


@dataclass
class Pagination:
    limit: int | None
    offset: int


def pagination(
    limit: int | None = Query(default=None, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> Pagination:
    return Pagination(limit=limit, offset=offset)
