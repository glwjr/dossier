"""Seed the development database with the dev user and target programs.

Run with:  python seed.py
"""

from sqlalchemy import select

from app.auth import DEV_USER_EMAIL
from app.db import SessionLocal, engine
from app.models.base import Base
from app.models.program import Program, ProgramStatus, Tier
from app.models.user import User

_PROGRAMS = [
    {
        "school": "Columbia University",
        "department": "Neurobiology and Behavior",
        "degree": "PhD",
        "url": "https://nba.columbia.edu/content/phd-program",
        "tier": Tier.match,
        "status": ProgramStatus.researching,
    },
    {
        "school": "Stanford University",
        "department": "Neurosciences",
        "degree": "PhD",
        "url": "https://neuroscience.stanford.edu",
        "tier": Tier.reach,
        "status": ProgramStatus.researching,
    },
    {
        "school": "New York University",
        "department": "Neuroscience",
        "degree": "PhD",
        "url": "https://as.nyu.edu/departments/cns.html",
        "tier": Tier.match,
        "status": ProgramStatus.researching,
    },
    {
        "school": "UC San Francisco",
        "department": "Neuroscience",
        "degree": "PhD",
        "url": "https://neuroscience.ucsf.edu",
        "tier": Tier.reach,
        "status": ProgramStatus.researching,
    },
    {
        "school": "UC Los Angeles",
        "department": "Neuroscience (NSIDP)",
        "degree": "PhD",
        "url": "https://www.neuroscience.ucla.edu",
        "tier": Tier.match,
        "status": ProgramStatus.researching,
    },
    {
        "school": "UC San Diego",
        "department": "Neurosciences (NGP)",
        "degree": "PhD",
        "url": "https://ngp.ucsd.edu",
        "tier": Tier.match,
        "status": ProgramStatus.researching,
    },
]


def seed() -> None:
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        # Dev user
        user = db.scalar(select(User).where(User.email == DEV_USER_EMAIL))
        if user is None:
            user = User(email=DEV_USER_EMAIL, name="Dev User")
            db.add(user)
            db.flush()
            print(f"Created dev user: {DEV_USER_EMAIL}")
        else:
            print(f"Dev user already exists: {DEV_USER_EMAIL}")

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
