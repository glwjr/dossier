"""Seed the development database.

Run with:  python seed.py
"""

from sqlalchemy import select

from app.auth import DEV_USER_EMAIL
from app.db import SessionLocal, engine
from app.models.base import Base
from app.models.user import User


def seed() -> None:
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == DEV_USER_EMAIL))
        if existing is None:
            db.add(User(email=DEV_USER_EMAIL, name="Dev User"))
            db.commit()
            print(f"Seeded dev user: {DEV_USER_EMAIL}")
        else:
            print(f"Dev user already exists: {DEV_USER_EMAIL}")


if __name__ == "__main__":
    seed()
