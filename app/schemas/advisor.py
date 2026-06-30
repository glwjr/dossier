from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.advisor import AdvisorResponse


class AdvisorCreate(BaseModel):
    name: str
    email: EmailStr | None = None
    url: str | None = None
    research_area: str | None = None
    contacted_on: date | None = None
    response: AdvisorResponse = AdvisorResponse.none
    notes: str | None = None


class AdvisorUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    url: str | None = None
    research_area: str | None = None
    contacted_on: date | None = None
    response: AdvisorResponse | None = None
    notes: str | None = None


class ProgramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school: str
    department: str


class AdvisorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int
    name: str
    email: str | None
    url: str | None
    research_area: str | None
    contacted_on: date | None
    response: AdvisorResponse
    notes: str | None


class AdvisorWithProgramRead(AdvisorRead):
    program: ProgramSummary
