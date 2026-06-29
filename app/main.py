from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.routers import (
    admin,
    auth,
    dashboard,
    deadlines,
    documents,
    me,
    outreach,
    programs,
    recommenders,
    requirements,
)

app = FastAPI(title="Dossier")

# In production, only the deployed frontend may call the API; locally, allow the
# Next.js dev server. Don't leave localhost in the allowlist in prod.
_origins = (
    [settings.frontend_url] if settings.frontend_url else ["http://localhost:3000"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(programs.router)
app.include_router(requirements.router)
app.include_router(deadlines.router)
app.include_router(recommenders.router)
app.include_router(outreach.router)
app.include_router(documents.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    """Liveness: the process is up. Does not touch the database."""
    return {"status": "ok"}


@app.get("/health/ready")
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


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")
