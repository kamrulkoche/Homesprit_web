# Homesprit — architecture and its lineage

Homesprit is a property-listing platform: a public site where visitors search
homes for sale or rent and send an inquiry, and a staff dashboard where agents
and admins manage listings and answer those inquiries.

It is built on the architecture of two existing projects, not a fresh template:

| Homesprit | Modelled on | Which itself follows |
|---|---|---|
| `homesprit-backend/` | `HGS/hgs-backend` | `sp-company-backend` |
| `homesprit-frontend/` | `HGS/hgs-frontend` | `sp-company-ltd-ui` |

This file records what was inspected, which conventions were carried over,
where Homesprit deliberately differs and why. Read it before changing the
structure of either project.

---

## 1. What was inspected

Both reference projects were read layer by layer, from their own `CLAUDE.md`
down to the implementation files, not just the folder names.

**hgs-backend** — `src/api/app.py` (factory, middleware order, lifespan),
`src/api/v1/router.py` (the central URL map), the whole `src/shared/` kernel
(config loader, engine/session, `BaseRepository`, `AuditedEntity`, the domain
exceptions and their single mapping file, the response-envelope middleware,
JWT + `hasAccess`, bcrypt hasher, in-process rate limiter, pagination
contract, sort allowlist), the `portfolio` module (admin/public router split,
slug rule at two layers, soft delete, child rows replaced wholesale), the
`contact` module (public write + admin inbox on the shared list contract), the
`auth` and `admin_user` modules (enumeration-safe login, per-request DB
re-read), `alembic/env.py` (the `OWNED_TABLES` fence), a hand-written
migration, `pyproject.toml`, `requirements.txt`, `config/`, Dockerfile, and the
unit + integration test fixtures (SQLite-backed app over HTTP).

**hgs-frontend** — `CLAUDE.md` (communities layer, five-file Redux rule,
hybrid SSR-seeded store, admin area), `next.config.mjs`, `eslint.config.mjs`,
`tsconfig.json`, `tailwind.config.ts`, `globals.css`, `config/apiConfig.ts`,
`proxy.ts`, the server-only services (`admin.service.ts`,
`backend/public-api.ts`), the browser transport (`services/api/httpRequest.ts`
+ a domain service), the route handlers (`api/admin/[...path]`, `login`,
`logout`, `api/public/[...path]`, `api/contact`), the `services` Redux domain
(all five files), `rootReducer`/`rootSaga`/`store`/`StoreProvider`, the
interfaces, `sagaErrorHandler`, the Zod schemas, both route-group layouts, the
`/services` worked example, and the admin UI kit (`admin-api`,
`useAdminResource`, `DataTable`, `FormPanel`, `AdminShell`) as composed by the
Enquiries and Portfolio screens.

`sp-company-ltd-ui/jest.config.js` was also read: HGS's frontend has no test
runner, so Homesprit takes its test setup from the project HGS's frontend
names as its own upstream.

---

## 2. Conventions carried over

### Backend

| Convention | Where it lives in Homesprit |
|---|---|
| Modular monolith: `api/ → application/ → domain/`, `infrastructure/` implements | `src/modules/<name>/` |
| Thin routes, one `api/dependencies.py` of DI factories per module | every module |
| Use cases raise **domain exceptions**, never `HTTPException` | `shared/domain/exceptions/` |
| One file maps exceptions to status codes | `shared/api/exception_handlers/business_handlers.py` |
| `{status, success, data}` envelope spliced onto raw bytes | `shared/infrastructure/middleware/response_wrapper_middleware.py` |
| Error envelope `{status, success:false, error, details}`; 422s flattened to `details.fields` | `shared/api/exception_handlers/generic_handlers.py` |
| Config: `config/.env.base` → `config/.env.{ENVIRONMENT}` → `.env` | `shared/utils/config.py` |
| `SECRET_KEY` rejected outside dev if placeholder or < 32 bytes | same |
| Prefixes assigned centrally, never inside module routers | `src/api/v1/router.py` |
| Admin and public routes in **separate files** with separate response schemas | `api/routes/property_routes.py` vs `public_property_routes.py` |
| `hasAccess(roles=[...])`, JWT verified **and** user row re-read every request | `shared/api/auth/dependencies.py` |
| Enumeration-safe login (dummy hash on unknown email) | `modules/auth/application/use_cases/login_use_case.py` |
| bcrypt used directly (not passlib), 72-byte guard | `shared/infrastructure/security/password_hasher.py` |
| Fixed-window in-process rate limiter on login and the public write | `shared/infrastructure/security/rate_limiter.py` |
| `AuditedEntity` (id, is_active, audit stamps) + thread-local actor | `shared/domain/entities/`, `shared/infrastructure/audit_context.py` |
| Native Postgres enums with `values_callable` (lowercase values stored) | every enum column |
| Slug rule applied on the request schema **and** the entity | `shared/domain/slug.py` |
| Shared list contract: `page, page_size, search, sort, order` → `PaginatedResponseSchema` | `shared/application/schemas/pagination.py` |
| Sort column checked against a per-resource allowlist | `shared/infrastructure/ordering.py::resolve_sort_column` |
| Every delete is a **soft** delete | `DeletePropertyUseCase` |
| Child rows replaced wholesale on update (`delete-orphan`) | property images |
| Alembic is the only schema authority; app verifies head on boot, refuses outside dev | `shared/infrastructure/database.py`, `alembic/` |
| Hand-written migrations, `OWNED_TABLES` fence | `alembic/env.py` |
| Initial admin bootstrapped from env, never overwritten | `scripts/setup_admin_service.py` |
| Unit tests mock repositories inline; integration tests run the real app over HTTP on SQLite | `tests/` |
| `string_array()` — `ARRAY` on Postgres, JSON on SQLite | `shared/domain/entities/columns.py` |
| ruff + mypy + bandit, same per-layer mypy overrides | `pyproject.toml`, `.bandit` |
| Makefile target names (`run`, `test`, `db-upgrade`, `quick-check`, …) | `Makefile` |

### Frontend

| Convention | Where it lives in Homesprit |
|---|---|
| `app/**/page.tsx` thin: metadata, params, data fetching only | `src/app/` |
| UI in `src/communities/<name>-community/components/<feature>/`, `'use client'` barrels | `website-community`, `admin-community` |
| Plain data (`*.data.ts`) imported by deep path, never through a barrel | e.g. `properties.data.ts` |
| Route groups `(marketing)` / `(admin)` with their own chrome | `src/app/(marketing)`, `src/app/(admin)` |
| Browser never learns the backend address (`HOMESPRIT_BACKEND_URL` is server-only) | `services/backend/public-api.ts`, `services/admin.service.ts` |
| `apiConfig.ts` is the single source of the client base URL, default relative `/api/public` | `src/config/apiConfig.ts` + ESLint rule |
| Server-side readers swallow errors and return `null` (≠ `[]`) | `services/property.service.ts` |
| Hybrid Redux: server fetch → `preloadedState` → `StoreProvider` per page; sagas own later reads | `/properties` |
| Five files per Redux domain; slice + saga registered in `rootReducer` **and** `rootSaga` | `state/features/properties/` |
| `fetchX → fetchXSuccess → fetchXFailed → resetX`; `IAsyncState<T>` spread from `asyncInitial` | properties slice |
| `takeLatest`/`debounce` from `redux-saga/effects`; `call`/`put`/`all` from `typed-redux-saga` | properties saga |
| `logSagaError()` in every catch | `helpers/utils/sagaErrorHandler.ts` |
| Row types in `src/interface/<domain>.interface.ts`, `I`-prefixed, hand-mirrored from Pydantic | `src/interface/` |
| Zod validation in route handlers, mirroring backend limits | `helpers/validation/` |
| httpOnly session cookie set by `/api/admin/login`; `proxy.ts` checks only `exp` | `app/api/admin/login`, `src/proxy.ts` |
| Three-state session (`authenticated` / `unauthenticated` / `unreachable`) | `adminService.getSession()` |
| Catch-all admin proxy with `ALLOWED_PREFIXES`; public GET proxy with its own allowlist | `app/api/admin/[...path]`, `app/api/public/[...path]` |
| Admin UI kit built once (`DataTable`, `FormPanel`, `ConfirmDialog`, `Toolbar`, `Pagination`, `StatusBadge`, `States`, `Toast`, `useAdminResource`, `adminApi`) | `admin-community/components/ui/` |
| A list screen's first page comes from the server as `initialRows`; every write re-reads | `useAdminResource` |
| `cn()` = `clsx` + `tailwind-merge`; `next-themes` class-based dark mode, light default | `helpers/utils/utils.ts`, `providers/ThemeProvider.tsx` |
| Google Fonts `@import` above `@tailwind` (Turbopack ordering) | `src/style/globals.css` |
| `/admin/*` noindex via layout metadata **and** `X-Robots-Tag` header | `(admin)/layout.tsx`, `next.config.mjs` |

---

## 3. How the requirements map onto modules

| Requirement | Backend module | Frontend |
|---|---|---|
| Public site + listings | `property` (public router) | `website-community`: `home`, `propertylist` |
| Property details + search | `property` (`GET /public/properties`, `/{slug}`, `/cities`) | `/properties`, `/properties/[slug]` |
| Authentication | `auth` + `user` | `/admin/login`, `api/admin/login|logout`, `proxy.ts` |
| Role-based access | `user` (`UserRole`: `admin`, `agent`) + `hasAccess` + ownership checks in use cases | sidebar items per role, Users screen admin-only |
| Admin dashboard | `dashboard` | `/admin/dashboard` |
| Property CRUD | `property` (admin router) | `/admin/properties`, `/new`, `/[id]` |
| Inquiry management | `inquiry` (public write + admin inbox) | inquiry form on detail + `/contact`; `/admin/inquiries` |
| Self-service account | `user` (`/admin/account`, `/admin/account/password` — caller only, current password required, rate limited) | `/admin/account` |
| Saved homes | — (no visitor accounts) | `homesprit_saved` cookie of slugs, read server-side by `/saved`; heart on every card |
| About, FAQ, privacy, terms | — | `/about` (live counts), `/faq` (+ FAQPage JSON-LD), `/privacy`, `/terms`; copy in `*.data.ts` |
| PostgreSQL | Alembic migrations, native enums, `text[]` | — |
| REST integration | `/api/v1/public/*`, `/api/v1/admin/*`, `/api/v1/auth/*` | server readers + route-handler proxies |
| Validation + errors | Pydantic + domain exceptions | Zod in route handlers; `AdminApiError.fields` in forms |
| Responsive UI | — | `DataTable` table/cards split, mobile drawer, fluid grids |
| Tests | pytest unit + integration | Jest + Testing Library |

---

## 4. Incompatible or unneeded patterns, and what was done instead

**Kept the language, changed nothing structural.** Both references are already
FastAPI and Next.js, so no cross-framework translation was needed. What
differs is scope.

Backend — dropped because Homesprit has no use for them:

- **Content engine** (`site_pages`/`page_sections`/`section_items`). It exists
  in HGS to make forty marketing bands editable. Homesprit's editable content
  is properties; its marketing copy stays in code.
- **Media uploads + `StaticFiles` mount, CV private storage.** Property images
  are URLs in v1 (see "Deliberate gaps").
- **Notifications, newsletter, careers, blog, team, services, settings.**
  Unrelated HGS business, not copied.
- **`OrderableRepository` / reorder endpoint.** Nothing here is
  hand-ordered — listings sort by price, date or size. `resolve_sort_column`
  is kept; it stays in `ordering.py`, the file HGS keeps it in.
- **`ContentStatus`.** A property's lifecycle (`available`, `under_offer`,
  `sold`, …) is its own enum; there is no second content type to share with.

Backend — changed:

- **`admin_users` → `users`, with two roles.** HGS has one role and calls its
  table `admin_users` because it has no other accounts. Homesprit has agents
  as well as admins, so the table is `users` and `UserRole` has two members.
  `hasAccess(roles=[...])` is unchanged — the seam HGS left for "adding EDITOR
  later is a new member" is exactly what was used.
- **Ownership on top of roles.** An agent manages only their own listings and
  sees only inquiries about them. Role checks stay in `hasAccess`; ownership is
  decided in the use cases (a `ForbiddenError`, mapped to 403 in the one
  handler file), because only the use case has the row.
- **A dedicated database.** HGS shares a Postgres with the website and the
  `OWNED_TABLES` fence is what keeps Alembic off the website's tables. Homesprit
  owns its whole database. The fence is kept anyway — it costs nothing and
  makes `alembic check` deterministic if this ever points at a shared server.
- **`docker-compose.yml` includes Postgres.** HGS's compose has none because it
  connects to a hosted Supabase; Homesprit's database is its own.
- **Ports 8001 / 3002.** HGS already takes 8000 / 3001 on this machine.
- **`config/.env.test`.** HGS has only `dev` and `prod`; Homesprit adds `test`,
  which the root `tests/conftest.py` selects so the suite never reads a
  developer's `.env` (and therefore never a real `DATABASE_URL`).
- **`HTTP_422_UNPROCESSABLE_CONTENT`.** The ported exception handlers use the
  current Starlette constant; HGS's copies still use the deprecated
  `..._ENTITY` name, which warns.
- **Session length is a week, not a year.** HGS chose a year for one admin;
  several agents on shared office machines is a different trade. The
  per-request user re-read is unchanged, so deactivation is still immediate.

Frontend — changed:

- **No static fallback content.** HGS pairs every read with hardcoded arrays
  because its marketing pages must render with the backend down. A listing
  that is not in the database cannot be shown honestly, so Homesprit renders a
  "could not load listings" state instead — the same decision HGS makes for
  job openings, and for the same reason. The null-vs-empty rule is kept: `null`
  is "could not read", `[]` is "nothing matches".
- **Smaller admin kit.** Only the components the five screens use were ported
  (`DataTable`, `FormPanel`, `ConfirmDialog`, `Toolbar`/`SearchInput`/
  `FilterSelect`, `Pagination`, `StatusBadge`, `States`, `Buttons`, `Toast`,
  `AdminPageHeader`, `StatCard`, form fields). Same names, same props
  contracts, so a developer moving between the two finds the same thing.
- **The small kit controls share one file.** `AdminPageHeader`, `Toolbar`,
  `SearchInput`, `FilterSelect`, `Pagination`, `StatusBadge`, `IconButton`,
  `IconLink` and `StatCard` live in `ui/Controls.tsx` rather than one file
  each; the barrel exports them under HGS's names, so screen imports read the
  same. `DataTable`, `Overlays`, `States`, `Toast`, `admin-api` and
  `useAdminResource` keep their own files.
- **`useAdminResource` lost `reorder`, `unpaginated` and `updateMethod`** —
  nothing here is hand-ordered, every list is on the shared contract, every
  update is a PATCH.
- **No `(marketing)/loading.tsx`.** A route-level loading boundary starts the
  response streaming before the page runs, so `notFound()` for a draft or
  unknown listing would answer `200` instead of `404` (Next 16 docs:
  `not-found.md`, "Status codes"). A real 404 matters more on a listing site
  than a skeleton. Verified: drafts and unknown slugs return 404, sold
  listings 200.
- **No framer-motion.** The HGS Toast animates with it; Homesprit's uses no
  motion library, and the global `prefers-reduced-motion` block covers the
  CSS transitions that remain.
- **Jest + Testing Library** — from `sp-company-ltd-ui`, since HGS has no test
  runner.
- **Own visual identity.** The token *structure* (`brand-*` ramp, `ink`,
  shadow and motion custom properties, `font-display`/`font-body`) follows HGS;
  the values do not, because Homesprit is not HGS.
- **No localization layer.** Neither reference project has one on the side
  that was copied (HGS is English-only). Currency, number and date formatting
  go through `helpers/utils/format.ts` with a single locale from `siteConfig`,
  so adding locales later is one place.

---

## 5. Deliberate gaps (v1)

- **Property images are URLs**, entered in the form, not uploads. The
  `MediaStorage` + `/media` mount + `/api/media` passthrough pattern from HGS is
  the documented path to add uploads.
- **No public user accounts.** Visitors are anonymous, as on the HGS site;
  only staff sign in. An inquiry carries the visitor's contact details.
- **No refresh tokens, no token blacklist.** Same as HGS: revocation works
  because every request re-reads the user row. Deactivating an agent takes
  effect on their next request.
- **No email delivery.** An inquiry lands in the dashboard; replying is a
  `mailto:` link, as in HGS's Enquiries screen.
- **Rate limits are per process.** Same trade as HGS, same reasoning.

---

## 6. Implementation checklist

- [x] Locate and read both references (paths: `F:\Office\HGS\hgs-backend`, `F:\Office\HGS\hgs-frontend`)
- [x] Record conventions, mapping and adaptations (this file)
- [x] Backend kernel ported (`src/shared/`)
- [x] Modules: `user`, `auth`, `property`, `inquiry`, `dashboard`
- [x] Central router, app factory, config layers
- [x] Alembic env + hand-written migration
- [x] Bootstrap admin + demo seed script
- [x] Backend unit + integration tests; ruff, mypy, bandit
- [x] Frontend scaffold: config, ESLint guardrail, Tailwind tokens, fonts
- [x] Server readers, browser transport, route-handler proxies, `proxy.ts`
- [x] Redux `properties` domain (five files) + hybrid SSR seeding
- [x] Public pages: home, listings + filters, detail + inquiry, contact
- [x] Admin: login, dashboard, properties list/create/edit, inquiries, users
- [x] Jest tests; lint, type check, production build
- [x] Run against PostgreSQL end to end (HTTP-level, through the frontend's proxies)
- [ ] Visual check in a browser — not done: the browser automation extension was not connected
- [x] README / submission documentation
