from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.recommender import RecommenderStatus


class RecommenderCreate(BaseModel):
    name: str
    email: str | None = None
    institution: str | None = None
    notes: str | None = None


class RecommenderUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    institution: str | None = None
    notes: str | None = None


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
    status: RecommenderStatus = RecommenderStatus.asked
    due_date: date | None = None
    notes: str | None = None


class ProgramRecommenderUpdate(BaseModel):
    status: RecommenderStatus | None = None
    due_date: date | None = None
    notes: str | None = None


class ProgramRecommenderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recommender_id: int
    program_id: int
    status: RecommenderStatus
    due_date: date | None
    notes: str | None
    recommender: RecommenderRead
