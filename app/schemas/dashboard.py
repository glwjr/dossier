from datetime import date

from pydantic import BaseModel

from app.schemas.program import ProgramRead
from app.schemas.requirement import RequirementRead


class DashboardEntry(BaseModel):
    program: ProgramRead
    completion_pct: float
    next_deadline: date | None
    days_remaining: int | None
    blocking_requirements: list[RequirementRead]
