"""Column types shared by entities across modules.

One place for the SQLAlchemy type expressions that more than one entity needs,
so a dialect quirk is solved once rather than copied.
"""

from sqlalchemy import ARRAY, String
from sqlalchemy.types import JSON, TypeEngine


def string_array() -> TypeEngine:
    """A list-of-strings column that works on Postgres AND on SQLite.

    ``properties.features`` carries one, and a bare ``ARRAY(String)`` is a Postgres type
    with no SQLite equivalent at all: SQLite's compiler raises
    ``UnsupportedCompilationError`` rather than approximating it.

    That matters because the integration suite deliberately runs the real app
    against a throwaway SQLite database, so it needs no Postgres and no network.
    Without this variant, the properties table could not exist in that suite at
    all, and the module that matters most would have no end-to-end coverage.

    ``with_variant`` keeps the Postgres side EXACTLY as it was — the emitted
    DDL is still ``VARCHAR[]``, so this changes no migration and no stored data.
    SQLite gets a JSON column instead, which round-trips a Python list through
    the same attribute.

    The one behaviour that does NOT carry over is Postgres array *operators*
    (``@>``, ``ANY``). Nothing queries this column — features are display labels
    the agent edits as one field — but a future query using them would pass on
    Postgres and fail on SQLite, so it belongs in a Postgres-backed test.

    Returns:
        The column type to pass to ``Column(...)``
    """
    return ARRAY(String).with_variant(JSON(), "sqlite")
