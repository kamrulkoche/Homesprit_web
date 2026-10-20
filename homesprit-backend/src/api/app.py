"""FastAPI application factory."""

from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..shared.api import exception_registry
from ..shared.api.exception_handlers import register_all_exception_handlers
from ..shared.infrastructure.database import assert_schema_at_head, close_db
from ..shared.infrastructure.logging import get_logger, setup_logging
from ..shared.infrastructure.middleware import (
    AuditContextMiddleware,
    ResponseWrapperMiddleware,
)
from ..shared.utils.config import settings
from .v1.router import api_router

setup_logging()
logger = get_logger(__name__)

API_DESCRIPTION = """
Backend for Homesprit — property listings, inquiries and the staff dashboard.

## Two families of endpoints

- `/api/v1/public/*` — anonymous. What the website reads, plus the inquiry form.
- `/api/v1/admin/*` — staff only. Admins see everything; agents see their own
  listings and the inquiries about them.

Every successful JSON response is wrapped as `{status, success: true, data}`;
every error as `{status, success: false, error, details}`.

## Authorizing requests in this page

1. Call `POST /api/v1/auth/login` with a staff email and password.
2. Copy `access_token` from the response.
3. Click **Authorize** and paste it **without** the `Bearer ` prefix.
"""


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup: verify the schema, bootstrap the first admin. Shutdown: close the pool."""
    logger.info(f"Starting {settings.app_name}...")

    # Alembic is the sole schema authority. The app NEVER migrates on startup;
    # it only checks the revision. In dev this warns; anywhere else it refuses
    # to start, because serving against the wrong schema is worse than not
    # starting.
    try:
        assert_schema_at_head()
    except Exception as e:
        logger.error(f"Schema check failed: {e}")
        raise

    if settings.setup_admin:
        try:
            from scripts.setup_admin_service import SetupAdminService

            from ..shared.infrastructure.database import get_db_context

            with get_db_context() as db:
                await SetupAdminService(db).setup_admin()
        except Exception as e:
            # Never block startup on this: a broken bootstrap should not take
            # the API down, and the operator can always create the account.
            logger.error(f"Initial admin setup failed: {e}", exc_info=True)

    logger.info("Application startup completed")
    yield

    logger.info("Shutting down application...")
    try:
        close_db()
    except Exception as e:
        logger.error(f"Application shutdown error: {e}")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        description=API_DESCRIPTION,
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Same order as hgs-backend: CORS -> ResponseWrapper -> AuditContext.
    # Starlette wraps the LAST-added outermost, so a request passes through
    # AuditContext first and CORS last.
    #
    # A crash-500 never passes back through CORSMiddleware at any ordering
    # (Starlette binds the bare Exception handler outside every user
    # middleware), so `unhandled_exception_handler` adds its own CORS headers.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(ResponseWrapperMiddleware)
    app.add_middleware(AuditContextMiddleware)

    app.include_router(api_router)

    register_all_exception_handlers()
    exception_registry.apply_to_app(app)

    @app.get("/health", tags=["Health"])
    async def health_check():
        """Health check — outside `/api/` so it is not wrapped in the envelope."""
        return {
            "status": "healthy",
            "service": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    @app.get("/", tags=["Root"])
    async def root():
        """Service information."""
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/health",
        }

    return app


app = create_app()
