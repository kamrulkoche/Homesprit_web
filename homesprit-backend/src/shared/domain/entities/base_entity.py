"""
Base entity class for the domain layer.

This module provides a minimal base class for entities that don't need
full audit tracking (created_by, updated_by, is_active).
"""

from datetime import UTC, datetime
from typing import Optional
from uuid import UUID, uuid4

from pydantic import ConfigDict
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class BaseEntity(SQLModel):
    """
    Minimal base class for domain entities.

    Provides only:
    - id: Unique identifier (UUID)
    - created_at: Creation timestamp

    Use this for entities that don't need:
    - Soft delete (is_active)
    - Audit tracking (created_by, updated_by, updated_at)

    For full audit tracking, use AuditedEntity instead.
    This is typically used for:
    - Log/audit tables
    - Historical records
    - Event tracking
    """

    # Primary key
    id: Optional[UUID] = Field(
        default_factory=uuid4,
        primary_key=True,
        index=True,
        description="Unique identifier",
    )

    # Creation timestamp only (no updated_at for immutable records).
    # Stored as TIMESTAMP WITH TIME ZONE so the column holds a true UTC instant.
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_type=DateTime(timezone=True),
        nullable=False,
        description="Creation timestamp",
    )

    model_config = ConfigDict(  # type: ignore[assignment]
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "created_at": "2026-01-01T00:00:00Z",
            }
        },
    )
