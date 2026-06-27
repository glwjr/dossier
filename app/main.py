from fastapi import FastAPI

from app.routers import (
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
