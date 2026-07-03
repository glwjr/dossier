"""Small CRUD helpers shared across routers."""

from pydantic import BaseModel


def apply_update(obj: object, body: BaseModel) -> None:
    """Apply a partial Pydantic update to an ORM object in place.

    Only fields explicitly set on ``body`` are copied (PATCH semantics), so
    fields the client omitted keep their current values.
    """
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
