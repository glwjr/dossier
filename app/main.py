from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.routers import (
    admin,
    advisor,
    auth,
    calendar,
    dashboard,
    deadlines,
    documents,
    me,
    programs,
    recommenders,
    requirements,
)

_ROUTERS = (
    admin.router,
    auth.router,
    me.router,
    programs.router,
    requirements.router,
    deadlines.router,
    recommenders.router,
    advisor.router,
    documents.router,
    dashboard.router,
    calendar.router,
)

system_router = APIRouter()


@system_router.get("/health")
def health():
    """Liveness: the process is up. Does not touch the database."""
    return {"status": "ok"}


@system_router.get("/health/ready")
def ready(db: Session = Depends(get_db)):
    """Readiness: the database is reachable."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )
    return {"status": "ready"}


@system_router.get("/", include_in_schema=False)
def root():
    """Minimal API-root response — no redirect to the interactive docs."""
    return {"service": "dossier-api", "status": "ok"}


def create_app() -> FastAPI:
    # Interactive docs are disabled in production (frontend_url set) so the
    # schema isn't exposed publicly; they stay on locally for development.
    docs_enabled = not settings.frontend_url
    app = FastAPI(
        title="Dossier",
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
    )

    # In production, only the deployed frontend may call the API; locally, allow
    # the Next.js dev server. Don't leave localhost in the allowlist in prod.
    origins = (
        [settings.frontend_url] if settings.frontend_url else ["http://localhost:3000"]
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in _ROUTERS:
        app.include_router(router)
    app.include_router(system_router)

    return app


app = create_app()
