from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.requirement import RequirementKind, RequirementStatus


class RequirementCreate(BaseModel):
    label: str
    kind: RequirementKind
    status: RequirementStatus = RequirementStatus.todo
    due_date: date | None = None
    notes: str | None = None


class RequirementUpdate(BaseModel):
    label: str | None = None
    kind: RequirementKind | None = None
    status: RequirementStatus | None = None
    due_date: date | None = None
    notes: str | None = None


class RequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int
    label: str
    kind: RequirementKind
    status: RequirementStatus
    due_date: date | None
    notes: str | None
