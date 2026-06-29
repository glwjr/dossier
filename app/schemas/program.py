from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.program import ProgramStatus, Tier


class ProgramCreate(BaseModel):
    school: str
    department: str
    degree: str
    url: str | None = None
    tier: Tier
    status: ProgramStatus = ProgramStatus.researching
    app_fee: int | None = Field(default=None, ge=0)
    notes: str | None = None


class ProgramUpdate(BaseModel):
    school: str | None = None
    department: str | None = None
    degree: str | None = None
    url: str | None = None
    tier: Tier | None = None
    status: ProgramStatus | None = None
    app_fee: int | None = Field(default=None, ge=0)
    notes: str | None = None


class ProgramRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    school: str
    department: str
    degree: str
    url: str | None
    tier: Tier
    status: ProgramStatus
    app_fee: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
