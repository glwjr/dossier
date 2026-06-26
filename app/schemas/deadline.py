from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.deadline import DeadlineKind


class DeadlineCreate(BaseModel):
    kind: DeadlineKind
    due_date: date
    done: bool = False
    notes: str | None = None


class DeadlineUpdate(BaseModel):
    kind: DeadlineKind | None = None
    due_date: date | None = None
    done: bool | None = None
    notes: str | None = None


class DeadlineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int
    kind: DeadlineKind
    due_date: date
    done: bool
    notes: str | None
