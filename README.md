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

## Authentication

Navigate to `http://localhost:8000/auth/login` — the server redirects to Google's
consent screen. After you grant access, Google redirects back to `/auth/callback`,
which returns a JWT:

```json
{ "access_token": "eyJ...", "token_type": "bearer" }
```

Pass it as a `Bearer` token on every API request, or paste it into the
`/docs` **Authorize** button.

Copy `.env.example` to `.env` and fill in your Google credentials before using
the OAuth flow locally.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./dossier.db` | SQLAlchemy connection URL |
| `SECRET_KEY` | *(dev default)* | JWT signing key — **change in production** |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8000/auth/callback` | Registered redirect URI |
| `DEV_USER_EMAIL` | `dev@example.com` | Email seeded by `seed.py` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | JWT lifetime |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/auth/login` | Redirect to Google OAuth |
| `GET` | `/auth/callback` | Exchange code for JWT |
| `GET` | `/me` | Current user |
| `GET` `POST` | `/programs` | List / create programs |
| `GET` `PATCH` `DELETE` | `/programs/{id}` | Get / update / delete a program |
| `GET` `POST` | `/programs/{id}/requirements` | List / create requirements |
| `PATCH` `DELETE` | `/requirements/{id}` | Update / delete a requirement |
| `GET` `POST` | `/programs/{id}/deadlines` | List / create deadlines |
| `PATCH` `DELETE` | `/deadlines/{id}` | Update / delete a deadline |
| `GET` | `/dashboard` | Per-program completion %, next deadline, blocking requirements |
