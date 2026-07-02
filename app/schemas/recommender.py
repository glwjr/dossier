from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.recommender import RecommenderStatus
from app.schemas.validators import Notes, ShortStr


class RecommenderCreate(BaseModel):
    name: ShortStr
    email: EmailStr | None = None
    institution: ShortStr | None = None
    notes: Notes | None = None


class RecommenderUpdate(BaseModel):
    name: ShortStr | None = None
    email: EmailStr | None = None
    institution: ShortStr | None = None
    notes: Notes | None = None


class ProgramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school: str
    department: str


class ProgramAssignmentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    program_id: int
    status: RecommenderStatus
    due_date: date | None
    program: ProgramSummary


class RecommenderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    email: str | None
    institution: str | None
    notes: str | None


class RecommenderWithAssignmentsRead(RecommenderRead):
    program_assignments: list[ProgramAssignmentSummary] = []


class ProgramRecommenderCreate(BaseModel):
    recommender_id: int
    status: RecommenderStatus = RecommenderStatus.to_ask
    due_date: date | None = None
    notes: Notes | None = None


class ProgramRecommenderUpdate(BaseModel):
    status: RecommenderStatus | None = None
    due_date: date | None = None
    notes: Notes | None = None


class ProgramRecommenderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recommender_id: int
    program_id: int
    status: RecommenderStatus
    due_date: date | None
    notes: str | None
    recommender: RecommenderRead
