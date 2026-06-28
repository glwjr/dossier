from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AdminUserRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    created_at: datetime


class WeeklySignup(BaseModel):
    week: str
    count: int


class AdminStats(BaseModel):
    total_users: int
    signups_this_week: int
    weekly_signups: list[WeeklySignup]
    users: list[AdminUserRow]
