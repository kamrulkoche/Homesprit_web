"""Property module dependencies for dependency injection.

Besides the usual use-case factories, this holds the two filter dependencies.
They are functions rather than `Depends(PropertyFilters)` for the reason
`list_query_params` gives in the shared kernel: FastAPI would render a model
dependency as one opaque object in /docs and lose every per-parameter
description.
"""

from typing import Optional
from uuid import UUID

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from src.shared.infrastructure.database import get_db

from ..application.use_cases.create_property_use_case import CreatePropertyUseCase
from ..application.use_cases.delete_property_use_case import DeletePropertyUseCase
from ..application.use_cases.get_public_properties_use_case import (
    GetPublicPropertyUseCase,
    ListCitiesUseCase,
    ListFeaturedPropertiesUseCase,
    SearchPublicPropertiesUseCase,
)
from ..application.use_cases.list_properties_use_case import (
    GetPropertyUseCase,
    ListPropertiesUseCase,
)
from ..application.use_cases.update_property_use_case import UpdatePropertyUseCase
from ..domain.enums.listing_type import ListingType
from ..domain.enums.property_status import PropertyStatus
from ..domain.enums.property_type import PropertyType
from ..infrastructure.repositories.property_repository import PropertyFilters

# ------------------------------------------------------------------ filters


def public_property_filters(
    city: Optional[str] = Query(
        default=None, max_length=100, description="Exact city, any case"
    ),
    property_type: Optional[PropertyType] = Query(default=None),
    listing_type: Optional[ListingType] = Query(
        default=None, description="sale or rent"
    ),
    min_price: Optional[int] = Query(default=None, ge=0),
    max_price: Optional[int] = Query(default=None, ge=0),
    min_bedrooms: Optional[int] = Query(default=None, ge=0, le=50),
    min_bathrooms: Optional[int] = Query(default=None, ge=0, le=50),
) -> PropertyFilters:
    """The filters the public search accepts.

    No `status`: what the public may see is the repository's decision, never
    the query string's.
    """
    return PropertyFilters(
        city=city or None,
        property_type=property_type,
        listing_type=listing_type,
        min_price=min_price,
        max_price=max_price,
        min_bedrooms=min_bedrooms,
        min_bathrooms=min_bathrooms,
    )


def admin_property_filters(
    status: Optional[PropertyStatus] = Query(default=None),
    city: Optional[str] = Query(default=None, max_length=100),
    property_type: Optional[PropertyType] = Query(default=None),
    listing_type: Optional[ListingType] = Query(default=None),
    agent_id: Optional[UUID] = Query(
        default=None, description="Admins only; ignored for an agent"
    ),
    featured: Optional[bool] = Query(default=None),
) -> PropertyFilters:
    """The filters the dashboard's listings table accepts."""
    return PropertyFilters(
        status=status,
        city=city or None,
        property_type=property_type,
        listing_type=listing_type,
        agent_id=agent_id,
        featured=featured,
    )


# ---------------------------------------------------------------- admin


def get_list_properties_use_case(
    db: Session = Depends(get_db),
) -> ListPropertiesUseCase:
    """Get the dashboard list use case with the shared DB session."""
    return ListPropertiesUseCase(db)


def get_get_property_use_case(db: Session = Depends(get_db)) -> GetPropertyUseCase:
    """Get the single-listing use case with the shared DB session."""
    return GetPropertyUseCase(db)


def get_create_property_use_case(
    db: Session = Depends(get_db),
) -> CreatePropertyUseCase:
    """Get the create use case with the shared DB session."""
    return CreatePropertyUseCase(db)


def get_update_property_use_case(
    db: Session = Depends(get_db),
) -> UpdatePropertyUseCase:
    """Get the update use case with the shared DB session."""
    return UpdatePropertyUseCase(db)


def get_delete_property_use_case(
    db: Session = Depends(get_db),
) -> DeletePropertyUseCase:
    """Get the delete use case with the shared DB session."""
    return DeletePropertyUseCase(db)


# --------------------------------------------------------------- public


def get_search_public_properties_use_case(
    db: Session = Depends(get_db),
) -> SearchPublicPropertiesUseCase:
    """Get the public search use case with the shared DB session."""
    return SearchPublicPropertiesUseCase(db)


def get_get_public_property_use_case(
    db: Session = Depends(get_db),
) -> GetPublicPropertyUseCase:
    """Get the public detail use case with the shared DB session."""
    return GetPublicPropertyUseCase(db)


def get_list_featured_properties_use_case(
    db: Session = Depends(get_db),
) -> ListFeaturedPropertiesUseCase:
    """Get the featured-row use case with the shared DB session."""
    return ListFeaturedPropertiesUseCase(db)


def get_list_cities_use_case(db: Session = Depends(get_db)) -> ListCitiesUseCase:
    """Get the city-picker use case with the shared DB session."""
    return ListCitiesUseCase(db)
