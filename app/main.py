from fastapi import FastAPI

from app.routers import me, programs

app = FastAPI(title="Dossier")

app.include_router(me.router)
app.include_router(programs.router)


@app.get("/health")
def health():
    return {"status": "ok"}
