from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import settings
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

_origins = [o for o in [settings.frontend_url, "http://localhost:3000"] if o]
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
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")
