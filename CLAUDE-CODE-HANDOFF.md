# PhD Application Tracker — Claude Code Handoff

> Operational build doc. Every architectural decision below is **settled** — implement as written, don't re-litigate. Product rationale (why this exists, who it's for) lives in the separate strategy spec and is out of scope here.

## Context

Greenfield project, nothing built yet. A backend service that lets a PhD applicant track programs, requirements, deadlines, and (later) faculty outreach and recommenders — replacing the spreadsheet applicants currently use. The primary purpose is a **backend SWE portfolio piece**, so server-side engineering quality is the point: clean API design, real multi-tenancy, tests, and a deploy.

Single user dogfoods it first (the developer's own applications), then it opens to others. It is **server-based, not local-first**, and **single-player** (one user gets full value with no one else present).

## Stack (settled)

- Python 3.12, **uv** for dependency + venv management (`pyproject.toml`)
- **FastAPI**
- **SQLAlchemy 2.0**, declarative, `Mapped[]` / `mapped_column()` — **synchronous, NOT async**. No async DB driver.
- **Alembic** for migrations
- **Pydantic v2** — separate Create / Update / Read schemas per entity; `ConfigDict(from_attributes=True)`
- SQLite (file) in dev, **Postgres** in prod, selected via `DATABASE_URL`
- **pytest** + FastAPI `TestClient`
- **ruff** for lint/format
- **Docker** (single Dockerfile) + **GitHub Actions** CI
- Deploy target: Fly.io or Railway (developer's call); Dockerfile + `DATABASE_URL` keep it portable

## The architectural backbone: the auth seam

This is the single most important decision and must be honored from the **first commit**. There are two separable concerns:

1. **Authorization model** — a `User` entity, a `user_id` owner on user data, every query scoped to the current user, every endpoint gated by a `current_user` dependency. This is **built in from day one** because retrofitting it touches the entire data layer.
2. **Authentication mechanism** — the actual Google OAuth handshake. This lives **entirely behind one dependency** and is deferred to Phase 2.

Implement a single seam, `get_current_user`, and make Phase 1 stub it:

```python
# app/auth.py  (Phase 1)
def get_current_user(db: Session = Depends(get_db)) -> User:
    # Phase 1: return the seeded dev user.
    # Phase 2: validate the OAuth session / token here. NOTHING ELSE CHANGES.
    return db.scalar(select(User).where(User.email == DEV_USER_EMAIL))
```

Every router endpoint takes `current_user: User = Depends(get_current_user)`, and every data query is scoped to `current_user.id`:

```python
programs = db.scalars(
    select(Program).where(Program.user_id == current_user.id)
).all()
```

For nested resources (requirements, deadlines), **verify ownership through the parent program** — load the program scoped to `current_user.id` first; 404 if it isn't theirs. There must be a test proving one user cannot read or mutate another user's data.

Result: full multi-tenancy and row-level isolation from commit one; Phase 2 swaps only the body of `get_current_user`.

## Phase 1 scope (this handoff)

Entities: **User, Program, Requirement, Deadline.** Nothing else.

**Program** — `id, user_id (FK), school, department, degree, url, tier (reach|match|likely), status (researching|drafting|submitted|interview|decision), app_fee, notes, created_at, updated_at`

**Requirement** — `id, program_id (FK), label, kind (sop|cv|transcript|gre|writing_sample|fee|other), status (todo|in_progress|done|waived), due_date?, notes`  *(Program 1—∗ Requirement)*

**Deadline** — `id, program_id (FK), kind (application|fellowship|fee_waiver), due_date, done, notes`  *(Program 1—∗ Deadline)*

**Endpoints**
```
GET    /me
GET/POST          /programs                  GET/PATCH/DELETE /programs/{id}
GET/POST          /programs/{id}/requirements   PATCH/DELETE  /requirements/{id}
GET/POST          /programs/{id}/deadlines      PATCH/DELETE  /deadlines/{id}
GET    /dashboard
```

`GET /dashboard` is the one computed endpoint: for each of the current user's programs, return completion % (done requirements / total), the next upcoming deadline, days remaining, and the list of still-blocking requirements. This aggregation is a deliberate signal — implement it as a real query, not a Python loop over everything.

**Suggested layout**
```
app/
  main.py          # app factory, router registration
  db.py            # engine, SessionLocal, get_db dependency
  auth.py          # get_current_user seam
  models/          # Base + User, Program, Requirement, Deadline
  schemas/         # Pydantic v2 Create/Update/Read per entity
  routers/         # programs.py, requirements.py, deadlines.py, dashboard.py, me.py
  seed.py          # seeds dev user + the six target programs
tests/
alembic/
Dockerfile
.github/workflows/ci.yml
pyproject.toml
```

**Seed data** (`seed.py`): dev user + the six target programs — Columbia (Neurobiology & Behavior), Stanford (Neurosciences), NYU (Neuroscience), UCSF (Neuroscience), UCLA (NSIDP), UCSD (NGP).

## Build sequence — small, verifiable increments

Work through these in order. **Stop at each checkpoint, summarize what's done and what's next, run the suite + linter, and wait for review before continuing.** Do not scaffold the whole app at once.

1. **Skeleton + tooling.** `pyproject.toml` (uv), app structure, `db.py` (engine/session/`get_db`), a `GET /health` endpoint, pytest wired with a transactional test fixture, ruff config, Dockerfile, CI workflow that runs `ruff` + `pytest`. → checkpoint
2. **User + auth seam.** `User` model, `Base`, Alembic baseline migration, `seed.py` creating the dev user, `get_current_user` returning the dev user, `GET /me`. Test that `/me` returns the seeded user. → checkpoint
3. **Program CRUD**, scoped to `current_user`. Include an **isolation test**: a second user cannot see/modify the first user's programs. → checkpoint
4. **Requirement CRUD**, nested under program, ownership verified through the parent. → checkpoint
5. **Deadline CRUD**, nested under program, ownership verified through the parent. → checkpoint
6. **Dashboard** aggregation endpoint + tests. → checkpoint
7. **Seed the six programs**, write the README (run, test, migrate, seed, docker), final green pass. → **Phase 1 done.**

## Working agreement

- **TDD.** For each endpoint group, write the failing test first, then implement to green.
- **Small steps.** One entity or one endpoint group per increment. Explain the plan for the increment before writing code; don't dump large blocks unannounced.
- **Verify before moving on.** Run `pytest` and `ruff` after each increment. Never proceed with a red suite.
- **Commits.** One logical change per commit, conventional-commit style.
- **Ask, don't assume.** If a requirement here is ambiguous, surface it at the checkpoint rather than guessing.

## Guardrails — out of scope for Phase 1

- **No async.** Synchronous SQLAlchemy only.
- **No real OAuth.** Stub `get_current_user`; leave the seam clean for Phase 2.
- **No Phase 2 entities** (Professor, OutreachLog, Recommender, RecommendationRequest, Document) and **no reminder engine.** But the user-scoping seam must make them trivial to add later.
- **No frontend.** API-first; FastAPI's `/docs` is the interim UI for dogfooding.
- Do not add libraries beyond the stack above without flagging it at a checkpoint.

## Definition of done (Phase 1)

- CRUD for programs, requirements, deadlines — all scoped to the current user, with a passing cross-user isolation test.
- `GET /dashboard` returns completion %, next deadline, and days remaining per program.
- Full pytest suite green; ruff clean.
- Dockerfile builds and runs; CI passes on push.
- Seeded with the six target programs; README documents run/test/migrate/seed.

---

*Tip: the Working Agreement + Guardrails + Stack sections make a good persistent `CLAUDE.md` in the repo root. Use the Build Sequence as the kickoff prompt.*
