"""Alembic migration environment.

READ THIS BEFORE RUNNING AUTOGENERATE.

Ported from hgs-backend, fence included. HGS needs the fence because its
database is shared with a website whose tables are not in its metadata — an
unfenced autogenerate would emit `op.drop_table()` for every one of them.

Homesprit's database is its own, so today the fence changes nothing. It is kept
because it is free, because it makes `alembic check` deterministic if
DATABASE_URL is ever pointed at a server that holds anything else, and because
the failure it produces when you forget a table — an EMPTY migration rather
than a destructive one — is the right direction for that mistake to fail in.

Adding a table means adding its name to `OWNED_TABLES` in the same commit that
adds the entity.
"""

import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from alembic import context  # noqa: E402
from sqlalchemy import engine_from_config, pool  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

from src.shared.utils.config import settings  # noqa: E402

# Import every entity module so it registers with SQLModel.metadata. Keep this
# list in step with `database.discover_entities()`.
import src.modules.inquiry.domain.entities  # noqa: E402, F401
import src.modules.property.domain.entities  # noqa: E402, F401
import src.modules.user.domain.entities  # noqa: E402, F401

#: Tables this service owns. Alembic may only touch these.
OWNED_TABLES = {
    "users",
    "properties",
    "property_images",
    "inquiries",
}

#: Postgres enum types this service owns.
OWNED_TYPES = {
    "user_role",
    "user_status",
    "property_type",
    "listing_type",
    "property_status",
    "inquiry_status",
}


def include_object(object_, name, type_, reflected, compare_to):
    """Restrict autogenerate to the tables this service owns."""
    if type_ == "table":
        return name in OWNED_TABLES
    return True


def include_name(name, type_, parent_names):
    """Refuse to reflect anything outside the public schema or the owned set."""
    if type_ == "schema":
        return name is None
    if type_ == "table":
        return name in OWNED_TABLES
    return True


config = context.config

# fileConfig() is deliberately skipped so the application's own logging
# configuration survives when migrations run in-process.

target_metadata = SQLModel.metadata

# The URL in alembic.ini is a placeholder; settings is the real one.
config.set_main_option("sqlalchemy.url", settings.database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL without a DB connection)."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        include_name=include_name,
        include_schemas=False,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (against a live connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            include_name=include_name,
            include_schemas=False,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
