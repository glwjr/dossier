# Dossier — CLAUDE.md

PhD application tracker. Every architectural decision below is **settled** —
implement as written, don't re-litigate.

---

## Stack

- Python 3.12, **uv** (`pyproject.toml`)
- **FastAPI**
- **SQLAlchemy 2.0**, declarative, `Mapped[]` / `mapped_column()` — **sync only, no async**
- **Alembic** for migrations
- **Pydantic v2** — separate Create / Update / Read schemas; `ConfigDict(from_attributes=True)`
- SQLite (file) in dev, **Postgres** in prod — selected via `DATABASE_URL` env var
- **pytest** + FastAPI `TestClient`
- **ruff** for lint + format
- **Docker** + **GitHub Actions** CI

---

## The auth seam (critical — honor from commit one)

There are two separable concerns:

1. **Authorization model**: `User` entity, `user_id` owner on all data, every
   query scoped to the current user, every endpoint gated by `current_user`.
   Built from day one — retrofitting touches the entire data layer.

2. **Authentication mechanism**: the Google OAuth handshake. Deferred to
   Phase 2, lives entirely behind one dependency.

```python
# app/auth.py  — Phase 1 stub
def get_current_user(db: Session = Depends(get_db)) -> User:
    # Phase 2: validate OAuth session / token here. Nothing else changes.
    return db.scalar(select(User).where(User.email == DEV_USER_EMAIL))
```

Every router takes `current_user: User = Depends(get_current_user)`.
Every data query is scoped to `current_user.id`.

For nested resources (requirements, deadlines): verify ownership through the
parent program — load `Program` scoped to `current_user.id` first; 404 if not
theirs.

**There must be a test proving one user cannot read or mutate another user's data.**

---

## Working agreement

- **TDD**: write the failing test first, then implement to green.
- **Small steps**: one entity or one endpoint group per increment. Explain
  the plan before writing code.
- **Verify before moving on**: run `pytest` and `ruff` after each increment.
  Never proceed with a red suite.
- **Commits**: one logical change per commit, conventional-commit style.
- **Checkpoints**: stop, summarize done + next, wait for review.

---

## Auth (Phase 2)

`get_current_user` in `app/auth.py` now validates a Bearer JWT issued by
`GET /auth/callback` after the Google OAuth code exchange. The seam is unchanged —
all routers depend on `get_current_user` exactly as before.

New dependencies: `pydantic-settings`, `python-jose[cryptography]`, `httpx` (moved
to main deps). Config centralized in `app/config.py` (`Settings`).

Test fixtures: `client` overrides both `get_db` and `get_current_user` (no JWT
needed for business-logic tests). `raw_client` overrides only `get_db` and is used
for auth-specific tests.

## Guardrails

- **No async** — synchronous SQLAlchemy only.
- **No async** — synchronous SQLAlchemy only (backend).
- Do not add libraries beyond the stack without flagging at a checkpoint.
- Do not add libraries beyond the stack without flagging at a checkpoint.

---

## Build sequence

1. ~~**Skeleton + tooling**~~ — done.
2. ~~**User + auth seam**~~ — done.
3. ~~**Program CRUD**~~ — done.
4. ~~**Requirement CRUD**~~ — done.
5. ~~**Deadline CRUD**~~ — done.
6. ~~**Dashboard** aggregation endpoint~~ — done.
7. ~~**Seed the six programs**, README, final green pass.~~ — done. Phase 1 complete.
8. ~~**Google OAuth** — `/auth/login` + `/auth/callback`, JWT-based `get_current_user`.~~ — done.
9. ~~**Recommender CRUD** — `Recommender` (person-level) + `ProgramRecommender` junction (status, due_date).~~ — done.
10. ~~**OutreachContact CRUD** — per-program faculty contact log.~~ — done.
11. ~~**Document CRUD** — per-program draft tracking.~~ — done.
12. ~~**UI** — Next.js on Vercel.~~ — done. Next.js 14 App Router in `ui/`, TanStack Query, shadcn/ui. Deploy with Vercel root directory = `ui/`.

---

## Phase 1 entities

**Program** — `id, user_id (FK), school, department, degree, url,
tier (reach|match|likely), status (researching|drafting|submitted|interview|decision),
app_fee, notes, created_at, updated_at`

**Requirement** — `id, program_id (FK), label,
kind (sop|cv|transcript|gre|writing_sample|fee|other),
status (todo|in_progress|done|waived), due_date?, notes`

**Deadline** — `id, program_id (FK),
kind (application|fellowship|fee_waiver), due_date, done, notes`

---

## Layout

```
app/
  main.py          # app factory, router registration
  config.py        # pydantic-settings Settings (DATABASE_URL, SECRET_KEY, FRONTEND_URL, etc.)
  db.py            # engine, SessionLocal, get_db
  auth.py          # get_current_user (JWT Bearer validation)
  models/          # Base + User, Program, Requirement, Deadline, Recommender, OutreachContact, Document
  schemas/         # Pydantic v2 Create/Update/Read per entity
  routers/         # programs, requirements, deadlines, recommenders, outreach, documents, dashboard, auth, me
  seed.py          # dev user + six target programs
tests/
alembic/
ui/                # Next.js 14 App Router (deploy via Vercel, root dir = ui/)
  app/
    page.tsx           # Dashboard
    programs/page.tsx  # Program list
    programs/[id]/page.tsx  # Program detail (tabbed)
    recommenders/page.tsx
    auth/callback/page.tsx  # extracts ?token= and stores in localStorage
  components/
    nav.tsx, providers.tsx, require-auth.tsx, ui/…
  lib/
    api.ts, auth.ts, types.ts
Dockerfile
render.yaml
.github/workflows/ci.yml
pyproject.toml
```

## UI notes

- `NEXT_PUBLIC_API_URL` must be set in Vercel (e.g. `https://dossier-nrgz.onrender.com`)
- `FRONTEND_URL` must be set in Render (e.g. `https://your-app.vercel.app`) so OAuth redirect lands back on the UI
- JWT is stored in `localStorage` under key `dossier_token`
- `RequireAuth` wrapper redirects to `/auth/login` if no token found

## Seed programs

Columbia (Neurobiology & Behavior), Stanford (Neurosciences), NYU (Neuroscience),
UCSF (Neuroscience), UCLA (NSIDP), UCSD (NGP).
