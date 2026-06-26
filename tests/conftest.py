import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db import get_db
from app.main import app

_TEST_DATABASE_URL = "sqlite://"  # in-memory, discarded after each connection

_engine = create_engine(
    _TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@pytest.fixture()
def db_session():
    """Open a connection, begin a transaction, yield a Session, then roll back.

    Each test gets a clean slate without touching the filesystem.
    """
    with _engine.connect() as conn:
        with conn.begin() as txn:
            session = Session(bind=conn)
            yield session
            session.close()
            txn.rollback()


@pytest.fixture()
def client(db_session: Session):
    """TestClient with get_db overridden to use the transactional test session."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
