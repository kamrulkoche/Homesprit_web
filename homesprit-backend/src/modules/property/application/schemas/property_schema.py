"""Property Pydantic schemas.

Hand-mirrored by `homesprit-frontend/src/interface/property.interface.ts`. There
is no generated client, so a change here means editing both sides — the same
arrangement hgs-backend and hgs-frontend keep.

Two response shapes for the same row, deliberately:

- ``PropertyPublicSchema`` — what the anonymous site sees. No audit columns, no
  soft-delete flag, and the agent reduced to name and contact details.
- ``PropertyAdminSchema`` — adds those, for the dashboard.
"""

from datetime import UTC, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from src.shared.domain.slug import normalize_slug

from ...domain.enums.listing_type import ListingType
from ...domain.enums.property_status import PropertyStatus
from ...domain.enums.property_type import PropertyType

#: Most photos one listing may carry. Enough for a full house tour; few enough
#: that a detail page does not ship a hundred images.
MAX_IMAGES = 20

#: Most amenity labels per listing.
MAX_FEATURES = 30

#: A ceiling on price, as a typo guard: an extra three zeros is the realistic
#: mistake, and this rejects it rather than listing a flat at a trillion.
MAX_PRICE = 10_000_000_000

#: Oldest plausible construction year.
MIN_YEAR_BUILT = 1800


def _max_year_built() -> int:
    """Next year — a listing can be sold off-plan before completion."""
    return datetime.now(UTC).year + 1


def _clean_features(values: Optional[List[str]]) -> Optional[List[str]]:
    """Trim, drop blanks and case-insensitive duplicates, keep first spelling."""
    if values is None:
        return None
    seen: set[str] = set()
    cleaned: List[str] = []
    for raw in values:
        label = raw.strip()
        if not label:
            continue
        if len(label) > 60:
            raise ValueError("Each feature must be 60 characters or fewer")
        key = label.lower()
        if key not in seen:
            seen.add(key)
            cleaned.append(label)
    if len(cleaned) > MAX_FEATURES:
        raise ValueError(f"At most {MAX_FEATURES} features")
    return cleaned


def _check_year(value: Optional[int]) -> Optional[int]:
    """Reject a construction year outside a plausible range."""
    if value is None:
        return value
    if not MIN_YEAR_BUILT <= value <= _max_year_built():
        raise ValueError(
            f"Year built must be between {MIN_YEAR_BUILT} and {_max_year_built()}"
        )
    return value


# ---------------------------------------------------------------- child rows


class PropertyImageWriteSchema(BaseModel):
    """One photo as the dashboard form submits it.

    No ``id`` and no ``display_order``: the whole set is replaced on save, in
    the order sent. An id sent back would be meaningless, and honouring it
    would let a caller graft a photo onto someone else's listing.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    url: str = Field(min_length=1, max_length=1000)
    alt_text: Optional[str] = Field(default=None, max_length=255)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        """Only http(s). A `javascript:` URL in an <img> is not an image."""
        if not value.startswith(("https://", "http://")):
            raise ValueError("Image URL must start with http:// or https://")
        return value

    @field_validator("alt_text")
    @classmethod
    def blank_to_none(cls, value: Optional[str]) -> Optional[str]:
        """An untouched optional field arrives as ``""``; store null."""
        return value or None


class PropertyImageResponseSchema(BaseModel):
    """One photo as the API returns it."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    alt_text: Optional[str] = None
    display_order: int


class AgentPublicSchema(BaseModel):
    """The listing agent, as a visitor sees them: who to call, nothing more."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    phone: Optional[str] = None


# -------------------------------------------------------------------- writes


class PropertyCreateSchema(BaseModel):
    """Payload for creating a listing."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=5, max_length=160)
    slug: str = Field(
        min_length=1,
        max_length=180,
        description="URL segment under /properties/. Lowercased; letters, "
        "numbers and hyphens only; unique.",
    )
    description: str = Field(min_length=20, max_length=5000)
    property_type: PropertyType
    listing_type: ListingType
    status: PropertyStatus = Field(default=PropertyStatus.DRAFT)
    price: int = Field(gt=0, le=MAX_PRICE, description="Whole currency units")
    address: str = Field(min_length=3, max_length=255)
    city: str = Field(min_length=2, max_length=100)
    neighborhood: Optional[str] = Field(default=None, max_length=100)
    bedrooms: int = Field(default=0, ge=0, le=50)
    bathrooms: int = Field(default=0, ge=0, le=50)
    area_sqft: Optional[int] = Field(default=None, gt=0, le=1_000_000)
    year_built: Optional[int] = None
    parking_spaces: int = Field(default=0, ge=0, le=50)
    features: List[str] = Field(default_factory=list)
    is_featured: bool = Field(
        default=False, description="Admins only — an agent sending true gets a 403"
    )
    agent_id: Optional[UUID] = Field(
        default=None,
        description="Owner. Admins may assign anyone; omitted means the caller. "
        "An agent may only name themselves.",
    )
    images: List[PropertyImageWriteSchema] = Field(
        default_factory=list, max_length=MAX_IMAGES
    )

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        """Shared slug rule at the boundary, so a bad slug is a 422 not a 500."""
        return normalize_slug(value)

    @field_validator("features")
    @classmethod
    def validate_features(cls, value: List[str]) -> List[str]:
        """Trim and de-duplicate amenity labels."""
        return _clean_features(value) or []

    @field_validator("year_built")
    @classmethod
    def validate_year(cls, value: Optional[int]) -> Optional[int]:
        """A plausible construction year."""
        return _check_year(value)

    @field_validator("neighborhood")
    @classmethod
    def blank_to_none(cls, value: Optional[str]) -> Optional[str]:
        """An untouched optional field arrives as ``""``; store null."""
        return value or None


class PropertyUpdateSchema(BaseModel):
    """
    A partial update. ``None`` means "not supplied" — an omitted key leaves the
    stored value alone.

    ``images`` is the one key worth knowing about, as with hgs-backend's
    deliverables: supplying it REPLACES the whole set, so ``[]`` removes every
    photo. A partial update that should leave photos alone omits the key.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    title: Optional[str] = Field(default=None, min_length=5, max_length=160)
    slug: Optional[str] = Field(default=None, min_length=1, max_length=180)
    description: Optional[str] = Field(default=None, min_length=20, max_length=5000)
    property_type: Optional[PropertyType] = None
    listing_type: Optional[ListingType] = None
    status: Optional[PropertyStatus] = None
    price: Optional[int] = Field(default=None, gt=0, le=MAX_PRICE)
    address: Optional[str] = Field(default=None, min_length=3, max_length=255)
    city: Optional[str] = Field(default=None, min_length=2, max_length=100)
    neighborhood: Optional[str] = Field(default=None, max_length=100)
    bedrooms: Optional[int] = Field(default=None, ge=0, le=50)
    bathrooms: Optional[int] = Field(default=None, ge=0, le=50)
    area_sqft: Optional[int] = Field(default=None, gt=0, le=1_000_000)
    year_built: Optional[int] = None
    parking_spaces: Optional[int] = Field(default=None, ge=0, le=50)
    features: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    agent_id: Optional[UUID] = None
    images: Optional[List[PropertyImageWriteSchema]] = Field(
        default=None, max_length=MAX_IMAGES
    )

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: Optional[str]) -> Optional[str]:
        """Shared slug rule at the boundary."""
        return None if value is None else normalize_slug(value)

    @field_validator("features")
    @classmethod
    def validate_features(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        """Trim and de-duplicate amenity labels."""
        return _clean_features(value)

    @field_validator("year_built")
    @classmethod
    def validate_year(cls, value: Optional[int]) -> Optional[int]:
        """A plausible construction year."""
        return _check_year(value)


# ----------------------------------------------------------------- responses


class PropertyPublicSchema(BaseModel):
    """A listing as the public site receives it."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    slug: str
    description: str
    property_type: PropertyType
    listing_type: ListingType
    status: PropertyStatus
    price: int
    address: str
    city: str
    neighborhood: Optional[str] = None
    bedrooms: int
    bathrooms: int
    area_sqft: Optional[int] = None
    year_built: Optional[int] = None
    parking_spaces: int
    features: List[str] = Field(default_factory=list)
    is_featured: bool
    listed_at: Optional[datetime] = None
    images: List[PropertyImageResponseSchema] = Field(default_factory=list)
    agent: Optional[AgentPublicSchema] = None

    @field_validator("features", mode="before")
    @classmethod
    def null_features_are_empty(cls, value: Optional[List[str]]) -> List[str]:
        """A null array column reads as no features."""
        return value or []


class PropertyAdminSchema(PropertyPublicSchema):
    """A listing as the dashboard receives it: plus ownership and audit trail."""

    agent_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None


class CityCountSchema(BaseModel):
    """One option in the public city picker."""

    city: str
    count: int
