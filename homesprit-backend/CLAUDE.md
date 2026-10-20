# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Homesprit's API. Modelled on `../../HGS/hgs-backend` (itself on `sp-company-backend`):
same layering, envelope, exception mapping, config loader and Makefile targets.
When in doubt, read how hgs-backend does it. Deviations: `../docs/ARCHITECTURE.md` §4.

## Commands (no make on the dev machine — direct forms)

```bash
python -m venv venv && ./venv/Scripts/python.exe -m pip install -r requirements.txt
./venv/Scripts/python.exe -m uvicorn src.api.app:app --port 8001 --reload   # /docs, /health
PYTHONPATH=. ./venv/Scripts/python.exe -m alembic upgrade head
PYTHONPATH=. ./venv/Scripts/python.exe -m alembic check                     # must report no changes
./venv/Scripts/python.exe scripts/seed_demo_data.py [--dry-run]             # dev only, idempotent

./venv/Scripts/python.exe -m pytest tests -q --no-cov
./venv/Scripts/python.exe -m pytest tests/integration/test_property_routes.py -v --no-cov
./venv/Scripts/python.exe -m ruff format --check . && ./venv/Scripts/python.exe -m ruff check .
./venv/Scripts/python.exe -m mypy src/ scripts/ --ignore-missing-imports
./venv/Scripts/python.exe -m bandit -r src/ --ini .bandit
```

## Layout

```
src/api/app.py         factory: CORS -> ResponseWrapper -> AuditContext, handlers, /health
src/api/v1/router.py   THE URL map — prefixes assigned here only
src/modules/<name>/    api/{routes,dependencies.py} · application/{schemas,use_cases} ·
                       domain/{entities,enums} · infrastructure/repositories
src/shared/            kernel ported from hgs-backend
```

Modules: `user` (staff accounts: admin-only `/admin/users`, plus self-service
`/admin/account` for any staff member acting on themselves), `auth` (login/me/logout),
`property` (listings + images; admin router and public router in separate
files), `inquiry` (public submit + scoped inbox), `dashboard` (counts, no tables).

## Rules

- Use cases raise domain exceptions; the mapping is in
  `shared/api/exception_handlers/business_handlers.py`. Only dependencies raise `HTTPException`.
- Routes return bare payloads; `ResponseWrapperMiddleware` adds the envelope.
- Role: `Depends(hasAccess(roles=STAFF | ADMIN_ONLY))`. Ownership:
  `property/application/use_cases/property_access.py` and `_scope_for` /
  `_ensure_visible` in `inquiry_use_cases.py`. An agent's list scope is forced in
  the use case, whatever the query string says.
- Agents cannot set `is_featured` or another owner (403). The last active admin
  cannot be demoted or deactivated (422).
- Enums are native Postgres enums with `values_callable` (lowercase values).
- Lists use `list_query_params` + `PaginatedResponseSchema`; sort keys go
  through `resolve_sort_column` allowlists.
- New table: entity + `OWNED_TABLES` + `discover_entities()` + a hand-curated
  migration (autogenerate a draft, read it, rewrite it), then `alembic check`.

## Tests

`tests/conftest.py` sets `ENVIRONMENT=test` (→ `config/.env.test`, which skips
the root `.env`). Unit tests mock repositories; integration tests run the real
app over HTTP against in-memory SQLite (tables named explicitly in
`tests/integration/conftest.py`), clearing the rate limiters per test.
Assertions go through the envelope: `response.json()["data"]`.
