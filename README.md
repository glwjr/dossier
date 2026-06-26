# Dossier

Backend API for tracking PhD applications — programs, requirements, and deadlines.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)

## Setup

```bash
git clone https://github.com/glwjr/dossier.git
cd dossier
uv venv && source .venv/bin/activate
uv pip install -e ".[dev]"
```

## Run

```bash
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`. Interactive docs at `/docs`.

## Migrate

```bash
alembic upgrade head
```

## Seed

Populates the dev user and the six target programs:

```bash
python seed.py
```

The dev user email defaults to `dev@example.com`. Override with the
`DEV_USER_EMAIL` environment variable.

## Test

```bash
pytest
```

## Docker

```bash
# Build
docker build -t dossier .

# Run (SQLite, ephemeral)
docker run -p 8000:8000 dossier

# Run with a persistent database and custom settings
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e DEV_USER_EMAIL=you@example.com \
  dossier
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./dossier.db` | SQLAlchemy connection URL |
| `DEV_USER_EMAIL` | `dev@example.com` | Email of the Phase 1 dev user returned by `get_current_user` |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/me` | Current user |
| `GET` `POST` | `/programs` | List / create programs |
| `GET` `PATCH` `DELETE` | `/programs/{id}` | Get / update / delete a program |
| `GET` `POST` | `/programs/{id}/requirements` | List / create requirements |
| `PATCH` `DELETE` | `/requirements/{id}` | Update / delete a requirement |
| `GET` `POST` | `/programs/{id}/deadlines` | List / create deadlines |
| `PATCH` `DELETE` | `/deadlines/{id}` | Update / delete a deadline |
| `GET` | `/dashboard` | Per-program completion %, next deadline, blocking requirements |
