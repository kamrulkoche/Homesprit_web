"""
Audited entity class for the domain layer.

This module provides the base class with common auditing fields for all domain entities.
"""

from datetime import UTC, datetime
from typing import Optional
from uuid import UUID, uuid4

from pydantic import ConfigDict
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class AuditedEntity(SQLModel):
    """
    Base class for all domain entities with common auditing fields.

    All entities inherit the following fields:
    - id: Unique identifier (UUID)
    - is_active: Soft delete flag
    - created_at: Creation timestamp
    - updated_at: Last update timestamp
    - created_by: User who created the record
    - updated_by: User who last updated the record

    NOTE: as in hgs-backend, ``created_by`` / ``updated_by`` carry NO foreign
    key. Homesprit DOES have a ``users`` table, but ``users`` itself inherits
    this class, and a self-referencing FK on the very first row would make
    bootstrapping the initial admin impossible. They are plain nullable UUIDs
    recording who acted. Ownership that matters for authorization —
    ``properties.agent_id`` — is a real FK on the entity that needs it.
    """

    # Primary key
    id: Optional[UUID] = Field(
        default_factory=uuid4,
        primary_key=True,
        index=True,
        description="Unique identifier",
    )

    # Soft delete flag
    is_active: bool = Field(
        default=True, index=True, description="Soft delete flag - False means deleted"
    )

    # Audit fields - who created/updated
    created_by: Optional[UUID] = Field(
        default=None,
        description="User who created this record",
    )
    updated_by: Optional[UUID] = Field(
        default=None,
        description="User who last updated this record",
    )

    # Timestamps — stored as TIMESTAMP WITH TIME ZONE so the columns hold
    # true UTC instants (not server-local naive wall-clock values).
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_type=DateTime(timezone=True),
        nullable=False,
        description="Creation timestamp",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_type=DateTime(timezone=True),
        nullable=False,
        description="Last update timestamp",
    )

    model_config = ConfigDict(  # type: ignore[assignment]
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "is_active": True,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        },
    )
