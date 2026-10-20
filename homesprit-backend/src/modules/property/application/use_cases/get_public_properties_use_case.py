"""Read-only use cases behind the public listing endpoints.

Grouped in one module, as hgs-backend groups its public portfolio reads: they
share one idea — the public may only see what the repository's LISTED and
VIEWABLE rules let through — and splitting them would scatter it.

None take an actor: `/api/v1/public/*` is anonymous, which is why every one
returns `PropertyPublicSchema` and never the admin shape.
"""

from typing import List, Tuple

from sqlalchemy.orm import Session

from src.shared.application.schemas.pagination import ListQueryParams
from src.shared.domain.exceptions.not_found_error import NotFoundError
from src.shared.domain.exceptions.validation_error import ValidationError

from ...infrastructure.repositories.property_repository import (
    PropertyFilters,
    PropertyRepository,
)
from ..schemas.property_schema import CityCountSchema, PropertyPublicSchema

#: Most listings the homepage's featured row asks for.
MAX_FEATURED = 12


class SearchPublicPropertiesUseCase:
    """The `/properties` search."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = PropertyRepository(session)

    async def execute(
        self, params: ListQueryParams, filters: PropertyFilters
    ) -> Tuple[List[PropertyPublicSchema], int]:
        """Search listed homes.

        Raises:
            ValidationError: A minimum price above the maximum. Answered as a
                422 naming the field rather than an empty page, because "no
                homes match" would be a false statement about the market.
        """
        if (
            filters.min_price is not None
            and filters.max_price is not None
            and filters.min_price > filters.max_price
        ):
            raise ValidationError(
                entity_name="Property",
                field="min_price",
                message="The minimum price is above the maximum.",
            )
        rows, total = await self.repository.list_public(params, filters)
        return [PropertyPublicSchema.model_validate(row) for row in rows], total


class GetPublicPropertyUseCase:
    """One listing for `/properties/[slug]`."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = PropertyRepository(session)

    async def execute(self, slug: str) -> PropertyPublicSchema:
        """Fetch a viewable listing by slug.

        Raises:
            NotFoundError: No viewable listing has this slug. A draft, archived
                or deleted listing is reported as absent, not forbidden — the
                caller is anonymous and has no business learning it exists.
        """
        listing = await self.repository.get_viewable_by_slug(slug)
        if listing is None:
            raise NotFoundError(entity_name="Property", entity_id=slug)
        return PropertyPublicSchema.model_validate(listing)


class ListFeaturedPropertiesUseCase:
    """The homepage's featured row."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = PropertyRepository(session)

    async def execute(self, limit: int) -> List[PropertyPublicSchema]:
        """Featured listings, newest first.

        Returns:
            Possibly empty — the homepage renders without the row. An empty
            selection is a legitimate state, not an error.
        """
        rows = await self.repository.list_featured(min(limit, MAX_FEATURED))
        return [PropertyPublicSchema.model_validate(row) for row in rows]


class ListCitiesUseCase:
    """The search form's city picker."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = PropertyRepository(session)

    async def execute(self) -> List[CityCountSchema]:
        """Every city with a listed home, busiest first."""
        return [
            CityCountSchema(city=city, count=count)
            for city, count in await self.repository.listed_cities()
        ]
