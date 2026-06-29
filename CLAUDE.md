# Dossier — CLAUDE.md

PhD application tracker. Architectural decisions below are settled — don't re-litigate them.

---

## Stack

- Python 3.12, **uv** (`pyproject.toml`)
- **FastAPI**
- **SQLAlchemy 2.0** declarative, `Mapped[]` / `mapped_column()` — **sync only, no async**
- **Alembic** for migrations
- **Pydantic v2** — separate Create / Update / Read schemas; `ConfigDict(from_attributes=True)`
- SQLite in dev, **Postgres** in prod — selected via `DATABASE_URL` env var
- **pytest** + FastAPI `TestClient`
- **ruff** for lint + format
- **Docker** + **GitHub Actions** CI
- **Next.js 16** App Router, TanStack Query, shadcn/ui (Base UI variant)

---

## Auth

Two separable concerns kept deliberately separate:

1. **Authorization model** — `User` entity, `user_id` owner on every row, every query scoped to `current_user`, every endpoint gated by `Depends(get_current_user)`. Ownership of nested resources (requirements, deadlines, etc.) is verified through the parent program — load `Program` scoped to `current_user.id` first; 404 if not theirs.

2. **Authentication mechanism** — Google OAuth + JWT, entirely behind `get_current_user` in `app/auth.py`. Validates a Bearer JWT issued by `/auth/callback` after the OAuth code exchange. Replacing the auth mechanism in the future touches only that one function.

Test fixtures: `client` overrides both `get_db` and `get_current_user` (no JWT needed for business-logic tests). `raw_client` overrides only `get_db` and is used for auth-specific tests.

There is a test proving one user cannot read or mutate another user's data.

---

## Guardrails

- **No async** — synchronous SQLAlchemy only.
- Do not add libraries beyond the stack without discussion.

---

## Working agreement

- **TDD**: write the failing test first, then implement to green.
- **Verify before moving on**: run `pytest` and `ruff` after each change. Never proceed with a red suite.
- **Commits**: one logical change per commit, conventional-commit style.

---

## Data model

**Program** — `id, user_id (FK), school, department, degree, url, tier (reach|match|likely), status (researching|drafting|submitted|interview|accepted|waitlisted|rejected), app_fee, notes, created_at, updated_at`

**Requirement** — `id, program_id (FK), label, kind (sop|cv|transcript|gre|writing_sample|fee|other), status (todo|in_progress|done|waived), due_date?, notes`

**Deadline** — `id, program_id (FK), kind (application|fellowship|fee_waiver), due_date, done, notes`

**Recommender** — `id, user_id (FK), name, institution?, email?, notes` (person-level)

**ProgramRecommender** — junction: `program_id, recommender_id, status (asked|confirmed|submitted), due_date?, notes`

**OutreachContact** — `id, program_id (FK), name, email?, url?, contacted_on?, response (none|positive|negative|meeting_scheduled), notes`

**Document** — `id, program_id (FK), kind (sop|personal_statement|cv|writing_sample|other), title, status (draft|in_progress|final), url?, notes`

---

## Layout

```
app/
  main.py       # app factory, router registration, CORS
  config.py     # pydantic-settings Settings
  db.py         # engine, SessionLocal, get_db
  auth.py       # get_current_user (JWT Bearer validation)
  models/       # Base + one file per entity
  schemas/      # Pydantic v2 Create/Update/Read per entity
  routers/      # programs, requirements, deadlines, recommenders, outreach, documents, dashboard, auth, me
seed.py         # dev user + placeholder programs (replace with your own)
tests/
alembic/
ui/             # Next.js 16 App Router (Vercel, root dir = ui/)
  middleware.ts → proxy.ts      # auth redirect middleware (renamed for Next.js 16)
  app/
    page.tsx                    # Dashboard (status filter: All / Active / Decided)
    programs/page.tsx           # Program list + board view (desktop only); CSV export
    programs/[id]/page.tsx      # Program detail (tabbed: requirements, deadlines, recommenders, outreach, documents)
    requirements/page.tsx       # Cross-program requirements (search, sort, filter, bulk status update)
    timeline/page.tsx           # Cross-program deadline timeline with urgency indicators
    recommenders/page.tsx       # Person-level recommender management + pending letters panel
    outreach/page.tsx           # Outreach contacts (per-program, listed cross-program)
    documents/page.tsx          # Cross-program documents view
    account/page.tsx            # Account info + sign out
    auth/callback/page.tsx      # Extracts ?token= and stores in localStorage
  components/
    nav.tsx, providers.tsx, require-auth.tsx
    command-palette.tsx         # Cmd+K search across programs, requirements, recommenders
    program-dialog.tsx, requirement-dialog.tsx, deadline-dialog.tsx
    recommender-dialog.tsx, assign-recommender-dialog.tsx, assign-to-program-dialog.tsx
    outreach-dialog.tsx, document-dialog.tsx
  lib/
    api.ts           # fetch wrapper with Bearer auth, redirects to /auth/login on 401
    auth.ts          # getToken / setToken / clearToken (localStorage key: dossier_token)
    types.ts         # TypeScript interfaces for all entities
    display.ts       # centralized display label maps for all enum values
    use-page-title.ts  # sets document.title per page
Dockerfile
render.yaml
.github/workflows/ci.yml
pyproject.toml
```

---

## UI patterns (Base UI / shadcn quirks)

- **Dialog trigger**: Base UI has no `asChild` prop. Use controlled `open` state + a `<span style={{ display: "contents" }} onClick={handleOpen}>` wrapper instead of `DialogTrigger`.
- **SelectValue**: Base UI renders the raw `value` string, not the item label. Always pass the display label as children: `<SelectValue>{LABEL_MAP[value]}</SelectValue>`.
- **`onValueChange`** returns `string | null` — always null-guard before using: `v && doSomething(v)`.
- All enum display labels live in `ui/lib/display.ts` — add new ones there, never inline.

---

## Deployment

- Backend: `https://api.dossiertool.com` (Render, Docker, Starter plan — always on, no idle spin-down)
- Frontend: `https://my.dossiertool.com` (Vercel, root dir = `ui/`)

**Render env vars:** `DATABASE_URL`, `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI=https://api.dossiertool.com/auth/callback`, `FRONTEND_URL=https://my.dossiertool.com`

**Vercel env vars:** `NEXT_PUBLIC_API_URL=https://api.dossiertool.com`

**Google Cloud Console:** register `https://api.dossiertool.com/auth/callback` as an authorized redirect URI. Google redirects to the backend, which issues a JWT and redirects to `{FRONTEND_URL}/auth/callback?token=…`.

See `.env.example` for local dev setup.
