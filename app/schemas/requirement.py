from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.requirement import RequirementKind, RequirementStatus
from app.schemas.validators import Notes, ShortStr


class RequirementCreate(BaseModel):
    label: ShortStr
    kind: RequirementKind
    status: RequirementStatus = RequirementStatus.todo
    due_date: date | None = None
    notes: Notes | None = None


class RequirementUpdate(BaseModel):
    label: ShortStr | None = None
    kind: RequirementKind | None = None
    status: RequirementStatus | None = None
    due_date: date | None = None
    notes: Notes | None = None


class ProgramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school: str
    department: str


class RequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int
    label: str
    kind: RequirementKind
    status: RequirementStatus
    due_date: date | None
    notes: str | None


class RequirementWithProgramRead(RequirementRead):
    program: ProgramSummary
