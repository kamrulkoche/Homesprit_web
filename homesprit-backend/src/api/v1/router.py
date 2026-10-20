"""Main API v1 router that aggregates all module routers.

Prefixes are assigned HERE, centrally, never inside the module routers — a
module router declares only its tags and relative paths. hgs-backend and
sp-company-backend both work this way: one file is the whole URL map.

Two families of routes, and the split matters:

- `/api/v1/admin/*` — staff only. Every route sits behind `hasAccess(...)`.
- `/api/v1/public/*` — anonymous, for the website. Public response schemas
  carry no audit columns. One public WRITE lives here, the inquiry form,
  rate limited per address.

A new prefix is unreachable from the browser until the frontend's matching
proxy allowlist names it (`app/api/admin/[...path]` / `app/api/public/[...path]`).
"""

from fastapi import APIRouter

from ...modules.auth.api.routes.auth_routes import router as auth_router
from ...modules.dashboard.api.routes.dashboard_routes import router as dashboard_router
from ...modules.inquiry.api.routes.inquiry_routes import router as inquiry_admin_router
from ...modules.inquiry.api.routes.public_inquiry_routes import (
    router as inquiry_public_router,
)
from ...modules.property.api.routes.property_routes import (
    router as property_admin_router,
)
from ...modules.property.api.routes.public_property_routes import (
    router as property_public_router,
)
from ...modules.user.api.routes.account_routes import router as account_router
from ...modules.user.api.routes.user_routes import router as user_admin_router

api_router = APIRouter(prefix="/api/v1")

# Authentication
api_router.include_router(auth_router, prefix="/auth")

# Admin — staff only
api_router.include_router(dashboard_router, prefix="/admin/dashboard")
api_router.include_router(property_admin_router, prefix="/admin/properties")
api_router.include_router(inquiry_admin_router, prefix="/admin/inquiries")
api_router.include_router(user_admin_router, prefix="/admin/users")
api_router.include_router(account_router, prefix="/admin/account")

# Public — anonymous, consumed by homesprit-frontend
api_router.include_router(property_public_router, prefix="/public/properties")
api_router.include_router(inquiry_public_router, prefix="/public/inquiries")
