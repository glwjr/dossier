from datetime import date

from pydantic import BaseModel, ConfigDict


class ShareProgram(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    school: str
    department: str
    degree: str
    tier: str
    status: str
    location: str | None
    url: str | None
    decision_deadline: date | None


class ShareView(BaseModel):
    # Read-only public "slate" — the owner's name and program list, no private
    # notes, requirements, contacts, or financial detail.
    name: str
    programs: list[ShareProgram]
