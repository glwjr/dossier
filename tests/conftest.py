import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.db import get_db
from app.main import app
from app.models.base import Base
from app.models.user import User

# Named shared in-memory SQLite: all connections in this process see the same
# database, so the session-scoped create_all is visible to per-test connections.
_TEST_DATABASE_URL = (
    "sqlite+pysqlite:///file:testmemdb?mode=memory&cache=shared&uri=true"
)

_engine = create_engine(
    _TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(_engine)
    yield
    Base.metadata.drop_all(_engine)
    _engine.dispose()


@pytest.fixture(autouse=True)
def _reset_demo_rate_limiter():
    # The demo limiter is process-global; clear it so counts don't bleed across
    # tests that hit POST /auth/demo.
    from app.ratelimit import demo_limiter

    demo_limiter.reset()
    yield


@pytest.fixture()
def db_session():
    with _engine.connect() as conn:
        with conn.begin() as txn:
            session = Session(bind=conn)
            # Route commits to flushes so the outer transaction stays open
            # and rolls back cleanly after each test.
            session.commit = session.flush  # type: ignore[method-assign]
            yield session
            session.close()
            txn.rollback()


@pytest.fixture()
def dev_user(db_session: Session) -> User:
    """Seed the dev user into the current test transaction."""
    user = User(email=settings.dev_user_email, name="Dev User")
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture()
def client(db_session: Session, dev_user: User):
    """
    TestClient with get_db and get_current_user both overridden.
    Business-logic tests use this fixture — no JWT needed.
    """

    def override_get_db():
        yield db_session

    def override_get_current_user():
        return dev_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def raw_client(db_session: Session):
    """
    TestClient with only get_db overridden.
    get_current_user is NOT stubbed — use for auth-specific tests.
    """

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
