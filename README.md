# Dossier

Full-stack PhD application tracker. Keep tabs on programs, requirements, deadlines, recommenders, faculty outreach, and draft documents — all in one place.

- **Backend**: FastAPI + SQLAlchemy, deployed on Render
- **Frontend**: Next.js 16 App Router, deployed on Vercel
- **Auth**: Google OAuth — sign in with your Google account

---

## Local development

### Prerequisites

- Python 3.12+ and [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Node.js 18+

### Backend

```bash
git clone https://github.com/glwjr/dossier.git
cd dossier

# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Edit .env — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and SECRET_KEY at minimum

# Run migrations
uv run alembic upgrade head

# (Optional) seed placeholder programs
uv run python seed.py

# Start the API
uv run uvicorn app.main:app --reload
```

API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd ui

# Create ui/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm install
npm run dev
```

UI available at `http://localhost:3000`.

---

## Authentication

Navigate to `http://localhost:8000/auth/login` — the server redirects to Google's consent screen. After granting access, Google redirects back to `/auth/callback`.

- **With `FRONTEND_URL` set**: the backend redirects to `{FRONTEND_URL}/auth/callback?token=…` and the UI stores the JWT in `localStorage`.
- **Without `FRONTEND_URL`**: the backend returns `{"access_token": "eyJ...", "token_type": "bearer"}` as JSON — useful for testing with `/docs`.

To use the API directly, paste the token into the `/docs` **Authorize** button.

---

## Environment variables

### Backend (`.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./dossier.db` | SQLAlchemy connection URL |
| `SECRET_KEY` | *(dev default)* | JWT signing key — required for local dev; startup rejects the default value when `FRONTEND_URL` is set |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8000/auth/callback` | Must match Google Cloud Console |
| `FRONTEND_URL` | *(empty)* | When set, marks a prod environment: OAuth redirects here with `?token=`, CORS trusts only this origin, and startup rejects the default `SECRET_KEY` |
| `ADMIN_EMAIL` | *(empty)* | When set, this user can access `GET /admin/stats`; blank disables admin access |
| `DEV_USER_EMAIL` | `dev@example.com` | Email seeded by `seed.py` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | JWT lifetime |

### Frontend (`ui/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API |

---

## Google OAuth setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Go to **APIs & Services → Credentials** and create OAuth 2.0 credentials (Web application)
3. Add your backend callback as an authorized redirect URI:
   - Local: `http://localhost:8000/auth/callback`
   - Production: `https://your-api-domain.com/auth/callback`
4. Copy the client ID and secret into your `.env`

---

## API endpoints

Top-level collection endpoints (`/programs`, `/requirements`, `/deadlines`, `/recommenders`, `/outreach`, `/documents`) support **opt-in pagination** via `?limit=` (1–500) and `?offset=` query params. With no params, the full collection is returned, so existing clients are unaffected.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check (process is up; no DB access) |
| `GET` | `/health/ready` | Readiness check (runs `SELECT 1`; 503 if the DB is unreachable) |
| `GET` | `/admin/stats` | User signup stats (requires `ADMIN_EMAIL`; 403 otherwise) |
| `GET` | `/auth/login` | Redirect to Google OAuth |
| `GET` | `/auth/callback` | Exchange code for JWT |
| `GET` | `/me` | Current user |
| `GET` | `/me/export` | Full data export as JSON |
| `GET` | `/dashboard` | Per-program summary (completion %, next deadline, blocking requirements) |
| `GET` | `/requirements` | List all requirements across programs |
| `GET` | `/deadlines` | List all deadlines across programs |
| `GET` | `/outreach` | List all outreach contacts across programs |
| `GET` | `/documents` | List all documents across programs |
| `GET` `POST` | `/programs` | List / create programs |
| `GET` `PATCH` `DELETE` | `/programs/{id}` | Get / update / delete a program |
| `GET` `POST` | `/programs/{id}/requirements` | List / create requirements |
| `PATCH` `DELETE` | `/requirements/{id}` | Update / delete a requirement |
| `GET` `POST` | `/programs/{id}/deadlines` | List / create deadlines |
| `PATCH` `DELETE` | `/deadlines/{id}` | Update / delete a deadline |
| `GET` `POST` | `/recommenders` | List / create recommenders (person-level) |
| `PATCH` `DELETE` | `/recommenders/{id}` | Update / delete a recommender |
| `GET` `POST` | `/programs/{id}/recommenders` | List / assign recommenders to a program |
| `PATCH` `DELETE` | `/programs/{id}/recommenders/{rec_id}` | Update / remove assignment |
| `GET` `POST` | `/programs/{id}/outreach` | List / create faculty outreach contacts |
| `PATCH` `DELETE` | `/outreach/{id}` | Update / delete a contact |
| `GET` `POST` | `/programs/{id}/documents` | List / create documents |
| `PATCH` `DELETE` | `/documents/{id}` | Update / delete a document |

---

## Deployment

### Backend — Render

The `render.yaml` in this repo configures a Docker-based web service (Render **Starter** plan — always on, no spin-down on idle) and a managed Postgres database (**Basic-256mb** plan). The health check path is `/health`. Set the following env vars in the Render dashboard:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` — `https://your-api-domain.com/auth/callback`
- `FRONTEND_URL` — `https://your-frontend-domain.com`
- `ADMIN_EMAIL` *(optional)* — enables `GET /admin/stats` for this user

`DATABASE_URL` and `SECRET_KEY` are handled automatically by Render. Because `FRONTEND_URL` is set in production, the API restricts CORS to that origin and refuses to start with the default `SECRET_KEY`.

### Frontend — Vercel

Deploy the `ui/` directory. Set root directory to `ui/` in the Vercel project settings, then add:

- `NEXT_PUBLIC_API_URL` — `https://your-api-domain.com`

---

## Docker

```bash
# Build
docker build -t dossier .

# Run with SQLite (ephemeral)
docker run -p 8000:8000 dossier

# Run with Postgres and custom settings
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e SECRET_KEY=your-secret \
  -e GOOGLE_CLIENT_ID=... \
  -e GOOGLE_CLIENT_SECRET=... \
  dossier
```

---

## Development

```bash
# Run tests
uv run pytest

# Lint + format
uv run ruff check .
uv run ruff format .

# Create a migration after model changes
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```
