from fastapi import FastAPI

from app.routers import dashboard, deadlines, me, programs, requirements

app = FastAPI(title="Dossier")

app.include_router(me.router)
app.include_router(programs.router)
app.include_router(requirements.router)
app.include_router(deadlines.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
