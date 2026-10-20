# Homesprit

A property-listing platform: a public site where visitors search homes for sale
or to rent and ask about them, and a staff dashboard where agents and admins
manage listings and answer inquiries.

| | Stack | Port |
|---|---|---|
| [`homesprit-backend/`](homesprit-backend) | Python 3.12, FastAPI, SQLModel/SQLAlchemy 2, Alembic, PostgreSQL | 8001 |
| [`homesprit-frontend/`](homesprit-frontend) | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 3, Redux Toolkit + redux-saga | 3002 |

Both projects follow the architecture of the existing **HGS** projects
(`hgs-backend`, `hgs-frontend`) rather than a fresh template.
**[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** records what was inspected,
every convention carried over, how each requirement maps onto modules, and
every deliberate deviation.

---

## Features

**Public site**
- Home: quick search (buy/rent, city, keyword), featured homes, browse by city.
- `/properties`: search by keyword, city, type, buy/rent, price range and
  bedrooms; sort by newest, price or size; paginated. The URL *is* the search,
  so results are shareable and render server-side on arrival.
- `/properties/[slug]`: gallery, facts, features, the listing agent, and an
  inquiry form. Sold/rented homes keep their page (shared links still work)
  but stop taking inquiries; drafts and archived listings 404.
- `/contact`: a general inquiry, routed to admins.
- Light/dark theme, responsive from phone width up, sitemap, per-page metadata.

**Dashboard (`/admin`)**
- Sign-in with an httpOnly session cookie; the browser never holds the JWT.
- **Roles.** *Admin*: every listing, every inquiry, staff management, featuring
  listings, assigning owners. *Agent*: only their own listings and the
  inquiries about them.
- Overview: listing and inquiry counts (office-wide or own), latest inquiries.
- Listings: searchable/filterable table, create, edit, remove (soft delete),
  photo list with ordering.
- Inquiries: inbox with status workflow (new → contacted → closed), reply by email.
- Team (admin only): add staff, change role/status, reset passwords. The
  backend refuses to leave the office with no active admin.

---

## Running it locally

Prerequisites: Python 3.12+, Node 20+ (developed on 24), PostgreSQL 14+ (developed on 17).

### 1. Backend

```bash
cd homesprit-backend
python -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt     # venv/bin/python on macOS/Linux
cp .env.example .env          # set DATABASE_URL, SECRET_KEY, ADMIN_PASSWORD, DEMO_AGENT_PASSWORD
createdb -U postgres homesprit

PYTHONPATH=. ./venv/Scripts/python.exe -m alembic upgrade head
./venv/Scripts/python.exe scripts/seed_demo_data.py               # 2 agents, 13 listings, 5 inquiries
./venv/Scripts/python.exe -m uvicorn src.api.app:app --port 8001 --reload
```

On first start the app creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
(never overwriting an existing account). API docs: <http://localhost:8001/docs>.
With `make`: `make setup`, `make db-upgrade`, `make seed`, `make run`.
With Docker: `docker compose up` (runs Postgres, migrates, serves).

### 2. Frontend

```bash
cd homesprit-frontend
npm install
cp .env.example .env.local    # HOMESPRIT_BACKEND_URL=http://localhost:8001
npm run dev                   # http://localhost:3002
```

### Demo accounts

Seeded locally: `admin@homesprit.dev` (admin), `maya.chen@homesprit.dev` and
`daniel.okafor@homesprit.dev` (agents). Passwords are whatever you put in
`ADMIN_PASSWORD` / `DEMO_AGENT_PASSWORD`; nothing is hardcoded. On the original
development machine they are in the gitignored `.dev-credentials.txt`.

---

## Tests and checks

```bash
# backend
cd homesprit-backend
./venv/Scripts/python.exe -m pytest tests -q --no-cov             # 114 tests: unit + integration (SQLite, no Postgres needed)
./venv/Scripts/python.exe -m ruff format --check . && ./venv/Scripts/python.exe -m ruff check .
./venv/Scripts/python.exe -m mypy src/ scripts/ --ignore-missing-imports
./venv/Scripts/python.exe -m bandit -r src/ --ini .bandit
PYTHONPATH=. ./venv/Scripts/python.exe -m alembic check           # must report no changes

# frontend
cd homesprit-frontend
npm test                      # 67 tests (Jest + Testing Library)
npm run lint && npm run typecheck && npm run build
```

Verified at submission: all of the above pass; `alembic upgrade head` /
`downgrade base` round-trips against PostgreSQL 17; the seed is idempotent;
and an HTTP-level end-to-end run through the production frontend build
confirmed SSR search results, real 404s for drafts, sign-in via cookie, role
scoping through the proxy (an agent sees 7 of 13 listings and gets 403 on staff
management), the inquiry form, and sign-out.

**Not verified:** a visual pass in a real browser — the browser automation
extension was unavailable in the build session. Components carry responsive
and dark-mode classes throughout, but they have not been looked at on screen.

What the tests cover — backend: login (including enumeration-safe timing),
immediate revocation on deactivation or role change, RBAC and ownership on
every listing and inquiry route, public visibility rules (search vs. detail),
filters/sort/pagination, soft delete and slug reservation, photo replacement,
rate limits, the last-admin guard, dashboard scoping, validation envelopes.
Frontend: URL ↔ search mapping, formatting, Zod schemas, the Redux slice and
saga, the search container's hybrid behaviour, the property card, the inquiry
form, the admin API client, the form conversions, `proxy.ts`, and the
`/api/inquiries` route handler.

---

## How the pieces connect

```
browser ──> homesprit-frontend (:3002)
              │  server-side only
              ├─ public pages (SSR)          ──> GET  <backend>/api/v1/public/properties…
              ├─ /api/public/[...path]       ──> GET  <backend>/api/v1/public/*     (browser sagas)
              ├─ /api/inquiries              ──> POST <backend>/api/v1/public/inquiries
              ├─ /api/admin/login|logout     ──> <backend>/api/v1/auth/*            (sets/clears the cookie)
              └─ /api/admin/[...path]        ──> <backend>/api/v1/admin/*           (adds Bearer from cookie)
                                                   │
                                        homesprit-backend (:8001) ──> PostgreSQL
```

Every JSON response is `{status, success, data}` or
`{status, success: false, error, details}`. The backend's address is
server-only (`HOMESPRIT_BACKEND_URL`); both proxies carry a path allowlist.

## API summary

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/auth/login` · GET `/me` · POST `/logout` | public / signed in |
| GET | `/api/v1/public/properties` (search) · `/featured` · `/cities` · `/{slug}` | public |
| POST | `/api/v1/public/inquiries` | public, rate limited |
| GET POST | `/api/v1/admin/properties` · GET PATCH DELETE `/{id}` | admin, agent (own) |
| GET | `/api/v1/admin/inquiries` · `/counts` · GET PATCH `/{id}` | admin, agent (own) |
| GET POST | `/api/v1/admin/users` · GET PATCH `/{id}` | admin |
| GET | `/api/v1/admin/dashboard` | admin, agent (scoped) |

Full schemas at `/docs` on the running backend.

## Known gaps (v1)

Listing photos are URLs rather than uploads; there are no public visitor
accounts; no refresh tokens or token blacklist (revocation works through the
per-request user re-read); no email delivery (replies are `mailto:`); rate
limits are per process. Each is explained in `docs/ARCHITECTURE.md` §5.

## Repository layout

```
Homesprit/
├── README.md                this file
├── CLAUDE.md                guidance spanning both projects
├── docs/ARCHITECTURE.md     lineage, conventions, mapping, deviations
├── homesprit-backend/       FastAPI service (own CLAUDE.md)
└── homesprit-frontend/      Next.js app (own CLAUDE.md)
```
