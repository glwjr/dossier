from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.deadline import DeadlineKind
from app.schemas.validators import Notes


class DeadlineCreate(BaseModel):
    kind: DeadlineKind
    due_date: date
    done: bool = False
    notes: Notes | None = None


class DeadlineUpdate(BaseModel):
    kind: DeadlineKind | None = None
    due_date: date | None = None
    done: bool | None = None
    notes: Notes | None = None


class ProgramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school: str
    department: str


class DeadlineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int
    kind: DeadlineKind
    due_date: date
    done: bool
    notes: str | None


class DeadlineWithProgramRead(DeadlineRead):
    program: ProgramSummary
