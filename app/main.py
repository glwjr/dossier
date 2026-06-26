from fastapi import FastAPI

app = FastAPI(title="Dossier")


@app.get("/health")
def health():
    return {"status": "ok"}
