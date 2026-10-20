"""Turning a client-supplied sort key into a column, safely.

hgs-backend keeps two things in this module: `resolve_sort_column` and the
`OrderableRepository` mixin behind its drag-to-reorder screens. Homesprit has
no hand-ordered resource — listings sort by price, date or size — so only the
first came across. It stays in the file HGS keeps it in, so the import path
reads the same in both projects.
"""

from typing import Optional, Set, Type

from sqlalchemy.orm.attributes import InstrumentedAttribute
from sqlmodel import SQLModel


def resolve_sort_column(
    model: Type[SQLModel],
    requested: Optional[str],
    allowed: Set[str],
    default: str,
) -> InstrumentedAttribute:
    """Turn a client-supplied sort name into a column, safely.

    The sort key arrives in a query string, and ``getattr(model, user_input)``
    would let a caller order by any attribute on the entity — including ones a
    public schema deliberately omits, which leaks their values through the
    ordering. An allowlist per resource is the fix, and it lives here so every
    repository applies it the same way.

    An unknown name falls back to the default rather than erroring: it is
    usually a stale bookmark, and a 422 for that helps nobody.

    Args:
        model: The entity class
        requested: The client's ``sort`` value, possibly None or nonsense
        allowed: Column names this resource permits sorting by
        default: Column used when ``requested`` is absent or rejected

    Returns:
        The SQLAlchemy column to order by
    """
    name = requested if requested is not None and requested in allowed else default
    column: InstrumentedAttribute = getattr(model, name)
    return column
