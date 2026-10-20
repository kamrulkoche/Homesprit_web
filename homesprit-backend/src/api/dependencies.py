"""API dependencies and dependency injection."""

from typing import Generator

from sqlalchemy.orm import Session

from ..shared.infrastructure.database import get_db


def get_database() -> Generator[Session, None, None]:
    """Get database session dependency.

    Yields:
        Database session
    """
    yield from get_db()
