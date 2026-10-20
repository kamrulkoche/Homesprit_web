"""PropertyImage entity — one photo on a listing."""

from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from pydantic import field_validator
from sqlmodel import Field

from src.shared.domain.entities.base_entity import BaseEntity


class PropertyImage(BaseEntity, table=True):
    """
    A photo of a listing, by URL.

    ``BaseEntity`` (id + created_at), not ``AuditedEntity``: an image has no
    life of its own. The whole set is replaced whenever its listing is saved —
    the same wholesale-replace rule hgs-backend applies to a project's
    deliverables — so it is never edited, soft-deleted or attributed on its own.

    The first image by ``display_order`` is the cover.

    Table name: property_images
    """

    __tablename__ = "property_images"

    property_id: Optional[UUID] = Field(
        default=None,
        sa_column=sa.Column(
            sa.Uuid(),
            sa.ForeignKey("properties.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        description="The listing this photo belongs to",
    )

    url: str = Field(
        max_length=1000,
        nullable=False,
        description="Absolute http(s) URL of the image",
    )

    alt_text: Optional[str] = Field(
        default=None,
        max_length=255,
        description="What the photo shows, for screen readers",
    )

    display_order: int = Field(
        default=0,
        nullable=False,
        description="Ascending position in the gallery; 0 is the cover",
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        """Same rule as the write schema, for any path that skips it."""
        value = value.strip()
        if not value.startswith(("https://", "http://")):
            raise ValueError("Image URL must start with http:// or https://")
        return value
