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

## Guardrails

- **No async** — synchronous SQLAlchemy only.
- **No real OAuth** — stub `get_current_user`; keep the seam clean for Phase 2.
- **No Phase 2 entities** (Professor, OutreachLog, Recommender, etc.).
- **No frontend** — API-first; `/docs` is the interim UI.
- Do not add libraries beyond the stack without flagging at a checkpoint.

---

## Build sequence

1. **Skeleton + tooling** — `pyproject.toml`, app structure, `db.py`,
   `GET /health`, pytest transactional fixture, ruff, Dockerfile, CI workflow.
2. **User + auth seam** — `User` model, Alembic baseline, `seed.py` (dev user),
   `get_current_user` stub, `GET /me`. Test that `/me` returns seeded user.
3. **Program CRUD**, scoped to `current_user`. Isolation test.
4. **Requirement CRUD**, nested under program, ownership via parent.
5. **Deadline CRUD**, nested under program, ownership via parent.
6. **Dashboard** aggregation endpoint (`GET /dashboard`): completion %,
   next deadline, days remaining, blocking requirements — real query, not a
   Python loop.
7. **Seed the six programs**, README, final green pass. → Phase 1 done.

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

## Suggested layout

```
app/
  main.py          # app factory, router registration
  db.py            # engine, SessionLocal, get_db
  auth.py          # get_current_user seam
  models/          # Base + User, Program, Requirement, Deadline
  schemas/         # Pydantic v2 Create/Update/Read per entity
  routers/         # programs.py, requirements.py, deadlines.py, dashboard.py, me.py
  seed.py          # dev user + six target programs
tests/
alembic/
Dockerfile
.github/workflows/ci.yml
pyproject.toml
```

## Seed programs

Columbia (Neurobiology & Behavior), Stanford (Neurosciences), NYU (Neuroscience),
UCSF (Neuroscience), UCLA (NSIDP), UCSD (NGP).
