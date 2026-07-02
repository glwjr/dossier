from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    calendar_token: str | None
    is_demo: bool
    email_reminders: bool
    created_at: datetime


class UserUpdate(BaseModel):
    email_reminders: bool | None = None
