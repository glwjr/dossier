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

1. **Authorization model** — `User` entity, `user_id` owner on every row, every query scoped to `current_user`, every endpoint gated by `Depends(get_current_user)`. Ownership of nested resources (requirements, deadlines, etc.) is verified through the parent program via the shared `get_program_or_404` helper in `app/ownership.py` — load `Program` scoped to `current_user.id` first; 404 if not theirs.

2. **Authentication mechanism** — Google OAuth + JWT (signed/verified with **PyJWT**), entirely behind `get_current_user` in `app/auth.py`. Validates a Bearer JWT issued by `/auth/callback` after the OAuth code exchange. Replacing the auth mechanism in the future touches only that one function.

**Admin**: a single `ADMIN_EMAIL` env var gates `GET /admin/stats` (`app/routers/admin.py`, `_require_admin` → 403 for everyone else). Leave it blank to disable admin access entirely.

**Demo login**: `POST /auth/demo` (`app/routers/auth.py`) mints a JWT for a fresh throwaway `User` (`is_demo=True`, email `demo-<token>@demo.local`) seeded with a deep clone of a template account's data (`app/demo.py::clone_user_data`), so each visitor gets an isolated, editable copy with no sign-up. It's **POST**, not GET, so link-preview bots/crawlers can't spawn accounts. Cleanup is lazy (piggybacks on demo traffic): TTL eviction + a hard-cap eviction of the oldest, plus per-IP rate limiting (`app/ratelimit.py`). Demo accounts are blocked (403) from account-management mutations — `DELETE /me` and the calendar-token endpoints — via `_reject_demo` in `app/routers/me.py`. Set `DEMO_TEMPLATE_EMAIL` to enable; blank disables the endpoint (501). The template is built by `python seed.py <that-email>`, version-gated so content changes redeploy cleanly (bump `DEMO_TEMPLATE_VERSION` in `seed.py`; version tracked in the `app_meta` table).

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

**User** — `id, email (unique), name, calendar_token? (unique), is_demo, created_at`

**Program** — `id, user_id (FK), school, department, degree, url?, tier (reach|match|likely), status (researching|drafting|submitted|interview|accepted|waitlisted|rejected), location?, app_fee?, stipend?, required_letters?, decision_deadline?, notes?, created_at, updated_at`

**Requirement** — `id, program_id (FK), label, kind (sop|cv|transcript|gre|writing_sample|fee|other), status (todo|in_progress|done|waived), due_date?, notes`

**Deadline** — `id, program_id (FK), kind (application|fellowship|fee_waiver|interview), due_date, done, notes`

**Recommender** — `id, user_id (FK), name, institution?, email?, notes` (person-level)

**ProgramRecommender** — junction: `program_id, recommender_id, status (to_ask|asked|confirmed|submitted), due_date?, notes`

**Advisor** — `id, program_id (FK), name, email?, url?, research_area?, contacted_on?, response (none|positive|negative|meeting_scheduled), notes` (formerly OutreachContact)

**Document** — `id, program_id (FK), kind (sop|personal_statement|cv|writing_sample|other), title, status (draft|in_progress|final), url?, notes`

**AppMeta** — operational key/value store (`key` PK, `value`); currently holds the seeded demo-template version.

---

## Layout

```
app/
  main.py       # create_app() factory (app = create_app()), routers, CORS, /health probes; docs disabled in prod
  config.py     # pydantic-settings Settings (fails fast if SECRET_KEY is dev default in prod; validates demo TTL)
  db.py         # engine, SessionLocal, get_db
  auth.py       # get_current_user (JWT Bearer validation, PyJWT), create_access_token
  ownership.py  # get_program_or_404 — shared owner-scoped parent lookup
  pagination.py # opt-in limit/offset Pagination dependency for list endpoints
  demo.py       # clone_user_data + purge_expired/surplus_demo_users (ephemeral demo accounts)
  ratelimit.py  # in-process fixed-window per-IP limiter (guards POST /auth/demo)
  models/       # Base + one file per entity (incl. app_meta.py)
  schemas/      # Pydantic v2 Create/Update/Read per entity
  routers/      # programs, requirements, deadlines, recommenders, advisor, documents, dashboard, calendar, auth, me, admin
seed.py         # seeds a user's sample data; `python seed.py <email>` builds the demo template, `--demo` reseeds it (version-gated)
tests/
alembic/
web/            # static marketing site (dossiertool.com) — the login page; hosts Google + demo CTAs
  index.html
ui/             # Next.js 16 App Router (Vercel, root dir = ui/) — the app (my.dossiertool.com), auth-only
  middleware.ts → proxy.ts      # redirects unauthenticated visitors to the marketing site (NEXT_PUBLIC_MARKETING_URL)
  app/
    page.tsx                    # Dashboard (status filter: All / Active / Decided)
    programs/page.tsx           # Program list + board view (desktop only); CSV export
    programs/[id]/page.tsx      # Program detail (tabbed: requirements, deadlines, recommenders, advisors, documents)
    requirements/page.tsx       # Cross-program requirements (search, sort, filter, bulk status update)
    timeline/page.tsx           # Cross-program deadline timeline with urgency indicators
    recommenders/page.tsx       # Person-level recommender management + pending letters panel
    advisors/page.tsx           # Advisor contacts (per-program, listed cross-program)
    documents/page.tsx          # Cross-program documents view
    compare/page.tsx            # Side-by-side program comparison
    account/page.tsx            # Account info + sign out; demo-aware (hides delete/calendar, "Exit demo")
    admin/page.tsx              # Admin stats dashboard (signups; ADMIN_EMAIL-gated)
    auth/callback/page.tsx      # Extracts ?token= and stores in localStorage (no in-app login page)
  components/
    nav.tsx, providers.tsx, require-auth.tsx
    command-palette.tsx         # Cmd+K search across programs, requirements, recommenders
    program-dialog.tsx, requirement-dialog.tsx, deadline-dialog.tsx
    recommender-dialog.tsx, assign-recommender-dialog.tsx, assign-to-program-dialog.tsx
    advisor-dialog.tsx, document-dialog.tsx
  lib/
    api.ts           # fetch wrapper with Bearer auth; on 401 redirects to the marketing site
    auth.ts          # getToken / setToken / clearToken (localStorage key: dossier_token); redirect helpers → marketing site
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
- Frontend app: `https://my.dossiertool.com` (Vercel, root dir = `ui/`) — auth-only
- Marketing/landing site: `https://dossiertool.com` (static `web/`) — the login page (Google + demo CTAs)

**Migrations + demo seed run in Render's `preDeployCommand`** (`alembic upgrade head && python seed.py --demo`), once per deploy — NOT in the Docker `CMD` (which only starts uvicorn). This avoids races if the web service ever scales past one instance. ⚠️ If you run the image anywhere other than Render, run that command yourself before serving.

**Render env vars:** `DATABASE_URL`, `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI=https://api.dossiertool.com/auth/callback`, `FRONTEND_URL=https://my.dossiertool.com`, `ADMIN_EMAIL` (optional — enables `/admin/stats`). Demo login (all optional): `DEMO_TEMPLATE_EMAIL` (set to enable, e.g. `demo@dossiertool.com`; must match the seeded template email), `DEMO_TTL_HOURS` (default 168; must be ≥ the token lifetime or startup fails), `DEMO_MAX_USERS` (default 500), `DEMO_RATE_LIMIT_PER_MINUTE` (default 10, 0 disables).

**Render plans:** web service on **Starter** (always on); Postgres on **Basic-256mb**. Setting `FRONTEND_URL` flips prod behavior: CORS drops `localhost:3000` and trusts only the deployed UI, startup refuses the dev `SECRET_KEY`, and the interactive docs (`/docs`, `/redoc`, `/openapi.json`) are disabled. `GET /` returns a minimal JSON status (no docs redirect). `healthCheckPath` is `/health`.

**Vercel env vars:** `NEXT_PUBLIC_API_URL=https://api.dossiertool.com`, `NEXT_PUBLIC_MARKETING_URL=https://dossiertool.com` (where logged-out visitors are redirected).

**Google Cloud Console:** register `https://api.dossiertool.com/auth/callback` as an authorized redirect URI. Google redirects to the backend, which issues a JWT and redirects to `{FRONTEND_URL}/auth/callback?token=…`.

See `.env.example` for local dev setup.
