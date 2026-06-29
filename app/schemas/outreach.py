from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.outreach import OutreachResponse


class OutreachContactCreate(BaseModel):
    name: str
    email: EmailStr | None = None
    url: str | None = None
    contacted_on: date | None = None
    response: OutreachResponse = OutreachResponse.none
    notes: str | None = None


class OutreachContactUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    url: str | None = None
    contacted_on: date | None = None
    response: OutreachResponse | None = None
    notes: str | None = None


class ProgramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school: str
    department: str


class OutreachContactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int
    name: str
    email: str | None
    url: str | None
    contacted_on: date | None
    response: OutreachResponse
    notes: str | None


class OutreachContactWithProgramRead(OutreachContactRead):
    program: ProgramSummary
