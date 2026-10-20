"""Property domain entities.

Imported by `alembic/env.py` and `database.discover_entities()` so SQLModel
metadata is populated before autogenerate or create_all runs.
"""

from .property import Property
from .property_image import PropertyImage

__all__ = ["Property", "PropertyImage"]
