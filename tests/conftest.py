import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db import get_db
from app.main import app
from app.models.base import Base

# Named shared in-memory SQLite: all connections in this process see the
# same database, so create_all() in a session fixture is visible to the
# function-scoped db_session connections.
_TEST_DATABASE_URL = (
    "sqlite+pysqlite:///file:testmemdb?mode=memory&cache=shared&uri=true"
)

_engine = create_engine(
    _TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(_engine)
    yield
    Base.metadata.drop_all(_engine)
    _engine.dispose()


@pytest.fixture()
def db_session():
    with _engine.connect() as conn:
        with conn.begin() as txn:
            session = Session(bind=conn)
            yield session
            session.close()
            txn.rollback()


@pytest.fixture()
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
