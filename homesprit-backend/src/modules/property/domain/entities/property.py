"""Property entity — one listing."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

import sqlalchemy as sa
from pydantic import ConfigDict, field_validator
from sqlalchemy import Column
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlmodel import Field, Relationship

from src.modules.user.domain.entities.user import User
from src.shared.domain.entities.audited_entity import AuditedEntity
from src.shared.domain.entities.columns import string_array
from src.shared.domain.slug import normalize_slug

from ..enums.listing_type import ListingType
from ..enums.property_status import (
    LISTED_STATUSES,
    VIEWABLE_STATUSES,
    PropertyStatus,
)
from ..enums.property_type import PropertyType
from .property_image import PropertyImage


def _enum_column(enum_cls: type, name: str) -> Column:
    """A native Postgres enum column storing the lowercase VALUES.

    `values_callable` is the part that matters: without it SQLAlchemy persists
    the Python NAME ("UNDER_OFFER") and every value-based query matches
    nothing. hgs-backend writes this inline per column; four enum columns on
    one entity is where a helper starts paying for itself.
    """
    return Column(
        SQLAlchemyEnum(
            enum_cls,
            values_callable=lambda x: [e.value for e in x],
            name=name,
        ),
        nullable=False,
        index=True,
    )


class Property(AuditedEntity, table=True):
    """
    A home or plot on the market, as rendered on `/properties` and
    `/properties/[slug]`.

    Inherits from AuditedEntity: id, is_active, created_at, updated_at,
    created_by, updated_by.

    Two flags that sound alike and are not, exactly as on hgs-backend's
    `Project`:

    - ``status`` is the lifecycle — draft, on the market, sold, archived.
    - ``is_active`` is the soft-delete flag. A deleted listing is invisible
      everywhere, including the dashboard, but the row survives — and so does
      its slug, which stays reserved.

    ``agent_id`` is the OWNER. It is what the ownership rule reads: an agent may
    manage a listing only when this is their id. Unlike ``created_by`` it is a
    real foreign key, because authorization depends on it pointing at someone.

    Table name: properties
    """

    __tablename__ = "properties"
    __table_args__ = (
        sa.CheckConstraint("price > 0", name="ck_properties_price_positive"),
        sa.CheckConstraint("bedrooms >= 0", name="ck_properties_bedrooms"),
        sa.CheckConstraint("bathrooms >= 0", name="ck_properties_bathrooms"),
        sa.CheckConstraint("parking_spaces >= 0", name="ck_properties_parking"),
        sa.CheckConstraint(
            "area_sqft IS NULL OR area_sqft > 0", name="ck_properties_area"
        ),
    )

    model_config = ConfigDict(  # type: ignore[assignment]
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    title: str = Field(max_length=160, nullable=False, description="Headline")

    slug: str = Field(
        max_length=180,
        nullable=False,
        unique=True,
        index=True,
        description="URL segment under /properties/ — unique, soft-deleted rows included",
    )

    description: str = Field(sa_type=sa.Text, nullable=False)

    property_type: PropertyType = Field(
        default=PropertyType.APARTMENT,
        sa_column=_enum_column(PropertyType, "property_type"),
    )

    listing_type: ListingType = Field(
        default=ListingType.SALE,
        sa_column=_enum_column(ListingType, "listing_type"),
    )

    status: PropertyStatus = Field(
        default=PropertyStatus.DRAFT,
        sa_column=_enum_column(PropertyStatus, "property_status"),
    )

    # Whole currency units. A home's price has no cents worth storing, and an
    # integer sorts and compares exactly where a float would not. BIGINT
    # because a sale price passes 2^31 in plenty of markets.
    price: int = Field(
        sa_column=Column(sa.BigInteger(), nullable=False, index=True),
        description="Sale price, or monthly rent when listing_type is rent",
    )

    address: str = Field(max_length=255, nullable=False)
    city: str = Field(max_length=100, nullable=False, index=True)
    neighborhood: Optional[str] = Field(default=None, max_length=100)

    bedrooms: int = Field(default=0, nullable=False, index=True)
    bathrooms: int = Field(default=0, nullable=False)
    area_sqft: Optional[int] = Field(default=None, description="Floor area")
    year_built: Optional[int] = Field(default=None)
    parking_spaces: int = Field(default=0, nullable=False)

    # A text[] rather than a join table, for the reason hgs-backend gives for
    # `projects.tags`: free-form display labels nobody filters on.
    features: List[str] = Field(
        default_factory=list,
        sa_column=Column(string_array(), nullable=False),
        description="Amenity labels — 'Balcony', 'Pool', 'Pet friendly'",
    )

    is_featured: bool = Field(
        default=False,
        nullable=False,
        index=True,
        description="Shown on the homepage. Admins decide this, not agents.",
    )

    # Stamped the first time the listing leaves DRAFT, and never moved after.
    # "Newest" sorts on this rather than created_at, so a draft that sat for a
    # month does not arrive in search results already looking a month old.
    listed_at: Optional[datetime] = Field(
        default=None,
        sa_type=sa.DateTime(timezone=True),
        index=True,
    )

    agent_id: UUID = Field(
        sa_column=Column(
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        ),
        description="The agent who owns this listing",
    )

    # selectin, not the lazy default: the list endpoints return many listings
    # with their photos, and lazy loading would fire one query per row behind
    # the serializer. delete-orphan is what makes "replace the set" delete the
    # photos that fell out of it.
    images: List[PropertyImage] = Relationship(
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin",
            "order_by": "PropertyImage.display_order",
        },
    )

    # Joined: every response that carries a listing carries its agent's name.
    agent: Optional[User] = Relationship(
        sa_relationship_kwargs={"lazy": "joined", "viewonly": True},
    )

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        """The shared slug rule — applied here AND on the write schemas."""
        return normalize_slug(value)

    @field_validator("title", "address", "city")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        """Ensure required text fields are not blank or whitespace."""
        value = value.strip()
        if not value:
            raise ValueError("This field must not be empty")
        return value

    def __repr__(self) -> str:
        """String representation of Property."""
        return f"<Property(id='{self.id}', slug='{self.slug}', status='{self.status}')>"

    @property
    def is_listed(self) -> bool:
        """Whether search results should include this listing."""
        return self.is_active and self.status in LISTED_STATUSES

    @property
    def is_viewable(self) -> bool:
        """Whether its public detail page should render."""
        return self.is_active and self.status in VIEWABLE_STATUSES
