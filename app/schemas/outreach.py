from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.outreach import OutreachResponse


class OutreachContactCreate(BaseModel):
    name: str
    email: str | None = None
    url: str | None = None
    contacted_on: date | None = None
    response: OutreachResponse = OutreachResponse.none
    notes: str | None = None


class OutreachContactUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    url: str | None = None
    contacted_on: date | None = None
    response: OutreachResponse | None = None
    notes: str | None = None


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
