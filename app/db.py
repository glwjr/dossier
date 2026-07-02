from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")
_connect_args = (
    {"check_same_thread": False}
    if _is_sqlite
    # Postgres: bound how long a single statement can run so a pathological
    # query can't pin a worker, and cap connection setup time.
    else {"connect_timeout": 10, "options": "-c statement_timeout=30000"}
)
engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    # Validate a pooled connection before use — Render drops idle/old
    # connections, which otherwise surface as intermittent errors on the first
    # query after an idle period or a DB restart.
    pool_pre_ping=True,
)

if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
