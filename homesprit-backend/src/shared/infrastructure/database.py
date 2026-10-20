"""Database engine, session factory and schema-verification helpers.

Schema ownership: Alembic is the sole authority. The app NEVER mutates the
schema on startup — it only verifies the DB is at the expected revision.

Ported from hgs-backend. The difference is that this database is Homesprit's
alone; see `alembic/env.py` for why the OWNED_TABLES fence is kept anyway.
"""

from contextlib import contextmanager
from typing import Any, Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlmodel import SQLModel

from ..utils.config import settings


def _engine_kwargs() -> dict[str, Any]:
    """Pool settings, which only a server database accepts.

    SQLite (a local smoke run, or `ENVIRONMENT=test` importing this module)
    rejects `pool_size` and friends outright, so they are applied only to a
    real server URL.
    """
    if settings.database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_timeout": settings.db_pool_timeout,
        "pool_recycle": settings.db_pool_recycle,
        "pool_pre_ping": True,
    }


engine = create_engine(settings.database_url, echo=False, **_engine_kwargs())

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@event.listens_for(engine, "connect")
def _set_statement_timeout(dbapi_connection: Any, connection_record: Any) -> None:
    """Bound every statement so one runaway query cannot pin a pooled connection.

    Postgres only — ``SET statement_timeout`` is not portable, and issuing it
    unconditionally breaks any SQLite-backed engine with a syntax error.
    """
    if engine.dialect.name != "postgresql":
        return

    cursor = dbapi_connection.cursor()
    try:
        cursor.execute(f"SET statement_timeout = {settings.db_statement_timeout_ms}")
    finally:
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session.

    Yields:
        Database session, closed when the request ends.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Context-managed session for use outside a request (startup, scripts).

    Yields:
        Database session, committed on success and rolled back on error.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def discover_entities() -> None:
    """Import entity modules so SQLModel metadata is complete.

    An explicit list, as in hgs-backend: it fails loudly if a module is renamed,
    where a glob would silently skip it. Every entity package must be listed
    here and in `alembic/env.py`, or `create_all` and autogenerate miss it.
    """
    import src.modules.inquiry.domain.entities  # noqa: F401
    import src.modules.property.domain.entities  # noqa: F401
    import src.modules.user.domain.entities  # noqa: F401


def assert_schema_at_head() -> None:
    """Verify the live DB's Alembic revision matches the code's expected head.

    Read-only: NEVER mutates the schema. Migrations are applied by
    `alembic upgrade head` as a deploy step, not here.

    Behaviour by environment:
      - ``dev``: logs a WARNING on drift but allows startup, so a developer can
        run `alembic upgrade head` manually.
      - anything else: raises, because serving against the wrong schema is worse
        than not starting.
    """
    from pathlib import Path

    from alembic.config import Config
    from alembic.runtime.migration import MigrationContext
    from alembic.script import ScriptDirectory

    from .logging import get_logger

    logger = get_logger(__name__)

    project_root = Path(__file__).parent.parent.parent.parent
    alembic_ini = project_root / "alembic.ini"
    if not alembic_ini.exists():
        raise FileNotFoundError(f"alembic.ini not found at {alembic_ini}")

    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("script_location", str(project_root / "alembic"))

    script = ScriptDirectory.from_config(alembic_cfg)
    expected_head = script.get_current_head()

    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        current_rev = ctx.get_current_revision()

    if current_rev == expected_head:
        logger.info(f"Schema is at expected revision: {expected_head}")
        return

    msg = (
        f"Schema revision mismatch: DB is at {current_rev!r}, code expects "
        f"{expected_head!r}. Run `alembic upgrade head` against this DB "
        "before starting the app."
    )

    if settings.environment == "dev":
        logger.warning(msg)
    else:
        raise RuntimeError(msg)


def init_db() -> None:
    """Create this service's tables directly, bypassing Alembic.

    For test fixtures and standalone scripts ONLY — Alembic is the schema owner
    in every real environment.
    """
    discover_entities()
    SQLModel.metadata.create_all(bind=engine)


def close_db() -> None:
    """Dispose of the connection pool on shutdown."""
    engine.dispose()
