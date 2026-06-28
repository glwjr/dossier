"""Seed the development database with the dev user and target programs.

Run with:  python seed.py
"""

from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal, engine
from app.models.base import Base
from app.models.program import Program, ProgramStatus, Tier
from app.models.user import User

_PROGRAMS = [
    {
        "school": "State University",
        "department": "Computer Science",
        "degree": "PhD",
        "tier": Tier.likely,
        "status": ProgramStatus.researching,
    },
    {
        "school": "Tech Institute",
        "department": "Computer Science",
        "degree": "PhD",
        "tier": Tier.match,
        "status": ProgramStatus.researching,
    },
    {
        "school": "Prestige University",
        "department": "Computer Science",
        "degree": "PhD",
        "tier": Tier.reach,
        "status": ProgramStatus.researching,
    },
]


def seed() -> None:
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        # Dev user
        user = db.scalar(select(User).where(User.email == settings.dev_user_email))
        if user is None:
            user = User(email=settings.dev_user_email, name="Dev User")
            db.add(user)
            db.flush()
            print(f"Created dev user: {settings.dev_user_email}")
        else:
            print(f"Dev user already exists: {settings.dev_user_email}")

        # Target programs (idempotent — skip if school+department already seeded)
        existing = {
            (p.school, p.department)
            for p in db.scalars(select(Program).where(Program.user_id == user.id)).all()
        }

        added = 0
        for data in _PROGRAMS:
            key = (data["school"], data["department"])
            if key not in existing:
                db.add(Program(**data, user_id=user.id))
                added += 1

        db.commit()

        if added:
            print(f"Seeded {added} program(s).")
        else:
            print("All programs already seeded.")


if __name__ == "__main__":
    seed()
