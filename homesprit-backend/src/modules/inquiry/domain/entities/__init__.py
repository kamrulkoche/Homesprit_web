"""Inquiry domain entities.

Imported by `alembic/env.py` and `database.discover_entities()` so SQLModel
metadata is populated before autogenerate or create_all runs.
"""

from .inquiry import Inquiry

__all__ = ["Inquiry"]
