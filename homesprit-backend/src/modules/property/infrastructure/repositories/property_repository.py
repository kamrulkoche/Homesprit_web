"""
Property repository — every query behind listings, public and admin.

The visibility rules live HERE and nowhere else, which is the lesson
hgs-backend's ProjectRepository records: when each endpoint assembles its own
`where`, one of them eventually forgets a clause and a draft leaks onto the
public site.

- admin list   — every live row; an agent's view is narrowed by `agent_id`
- public list  — live AND status in LISTED_STATUSES
- public page  — live AND status in VIEWABLE_STATUSES
"""

from dataclasses import dataclass, replace
from typing import Dict, List, Optional, Tuple, Type
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from src.shared.application.schemas.pagination import ListQueryParams
from src.shared.domain.exceptions.repository_error import RepositoryError
from src.shared.infrastructure.base_repository import BaseRepository
from src.shared.infrastructure.ordering import resolve_sort_column

from ...domain.entities.property import Property
from ...domain.enums.listing_type import ListingType
from ...domain.enums.property_status import (
    LISTED_STATUSES,
    VIEWABLE_STATUSES,
    PropertyStatus,
)
from ...domain.enums.property_type import PropertyType

#: Columns the dashboard list may sort by.
ADMIN_SORTABLE = {
    "title",
    "price",
    "city",
    "status",
    "bedrooms",
    "created_at",
    "updated_at",
    "listed_at",
}
ADMIN_DEFAULT_SORT = "updated_at"

#: Columns the public search may sort by. Narrower than the admin set on
#: purpose: `updated_at` would let a visitor infer when an agent last touched a
#: listing, which is nobody's business.
PUBLIC_SORTABLE = {"listed_at", "price", "area_sqft", "bedrooms"}
PUBLIC_DEFAULT_SORT = "listed_at"


@dataclass(frozen=True)
class PropertyFilters:
    """The filters both lists accept beyond the shared page/search/sort.

    One value object rather than eight keyword arguments threaded through the
    use case into here — and the public and admin lists share most of them.
    """

    city: Optional[str] = None
    property_type: Optional[PropertyType] = None
    listing_type: Optional[ListingType] = None
    status: Optional[PropertyStatus] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    min_bedrooms: Optional[int] = None
    min_bathrooms: Optional[int] = None
    agent_id: Optional[UUID] = None
    featured: Optional[bool] = None


class PropertyRepository(BaseRepository[Property]):
    """Repository for Property database operations."""

    def __init__(self, session: Session, model: Type[Property] = Property):
        """Initialize property repository."""
        super().__init__(session, model)

    # ------------------------------------------------------------ lookups

    async def get_live(self, property_id: UUID) -> Optional[Property]:
        """Get a listing that has not been soft-deleted.

        Returns:
            The listing, or None when absent or deleted
        """
        entity = await self.get_by_id(property_id)
        if entity is None or not entity.is_active:
            return None
        return entity

    async def get_viewable_by_slug(self, slug: str) -> Optional[Property]:
        """Get a listing for its public detail page.

        Args:
            slug: URL segment, matched against the lowercase-normalized column

        Returns:
            The listing when it is live and in VIEWABLE_STATUSES, else None
        """
        try:
            statement = (
                select(Property)
                .where(Property.slug == slug.strip().lower())
                .where(Property.is_active.is_(True))
                .where(Property.status.in_(VIEWABLE_STATUSES))
            )
            return self.session.execute(statement).scalars().first()
        except Exception as e:
            raise RepositoryError(
                entity_name="Property", operation="get_viewable_by_slug", message=str(e)
            ) from e

    async def exists_by_slug(
        self, slug: str, exclude_id: Optional[UUID] = None
    ) -> bool:
        """Check whether a slug is taken.

        Ignores ``is_active`` deliberately: the unique index still holds a
        soft-deleted row's slug, so a check that skipped them would say "free"
        and the insert would then fail.
        """
        try:
            statement = (
                select(func.count())
                .select_from(Property)
                .where(Property.slug == slug.strip().lower())
            )
            if exclude_id:
                statement = statement.where(Property.id != exclude_id)
            count = self.session.execute(statement).scalar()
            return count is not None and count > 0
        except Exception as e:
            raise RepositoryError(
                entity_name="Property", operation="exists_by_slug", message=str(e)
            ) from e

    # -------------------------------------------------------------- lists

    @staticmethod
    def _filter_conditions(
        filters: PropertyFilters, term: Optional[str]
    ) -> List[ColumnElement[bool]]:
        """Translate the filter object into WHERE clauses. No visibility here."""
        conditions: List[ColumnElement[bool]] = []

        if filters.city:
            # Case-insensitive equality, not a LIKE: "Austin" must not match
            # "East Austin" when the visitor picked a city from a list.
            conditions.append(func.lower(Property.city) == filters.city.strip().lower())
        if filters.property_type is not None:
            conditions.append(Property.property_type == filters.property_type)
        if filters.listing_type is not None:
            conditions.append(Property.listing_type == filters.listing_type)
        if filters.status is not None:
            conditions.append(Property.status == filters.status)
        if filters.min_price is not None:
            conditions.append(Property.price >= filters.min_price)
        if filters.max_price is not None:
            conditions.append(Property.price <= filters.max_price)
        if filters.min_bedrooms is not None:
            conditions.append(Property.bedrooms >= filters.min_bedrooms)
        if filters.min_bathrooms is not None:
            conditions.append(Property.bathrooms >= filters.min_bathrooms)
        if filters.agent_id is not None:
            conditions.append(Property.agent_id == filters.agent_id)
        if filters.featured is not None:
            conditions.append(Property.is_featured.is_(filters.featured))

        if term:
            pattern = f"%{term}%"
            conditions.append(
                or_(
                    Property.title.ilike(pattern),
                    Property.address.ilike(pattern),
                    Property.city.ilike(pattern),
                    Property.neighborhood.ilike(pattern),
                    Property.description.ilike(pattern),
                )
            )
        return conditions

    def _page(
        self,
        conditions: List[ColumnElement[bool]],
        params: ListQueryParams,
        *,
        sortable: set,
        default_sort: str,
        default_desc: bool,
    ) -> Tuple[List[Property], int]:
        """Count, then fetch one ordered page. Shared by both lists."""
        count_statement = select(func.count()).select_from(Property)
        for condition in conditions:
            count_statement = count_statement.where(condition)
        total = self.session.execute(count_statement).scalar() or 0

        column = resolve_sort_column(Property, params.sort, sortable, default_sort)
        # With no explicit sort the default column runs in its natural
        # direction for this list (newest first), not the shared `asc`.
        descending = params.order == "desc" or (params.sort is None and default_desc)
        ordering = (
            column.desc().nulls_last() if descending else column.asc().nulls_last()
        )

        statement = select(Property)
        for condition in conditions:
            statement = statement.where(condition)
        statement = (
            # The id tiebreaker keeps paging stable: without it, rows that tie
            # on price can swap between page 1 and page 2 and appear twice.
            statement.order_by(ordering, Property.created_at.desc(), Property.id)
            .offset(params.offset)
            .limit(params.limit)
        )
        rows = list(self.session.execute(statement).unique().scalars().all())
        return rows, total

    async def list_admin(
        self, params: ListQueryParams, filters: PropertyFilters
    ) -> Tuple[List[Property], int]:
        """List live listings for the dashboard, any status.

        Archived and draft rows are included — an archived listing has to be
        findable to be restored. The caller narrows an agent to their own rows
        through ``filters.agent_id``.
        """
        try:
            conditions = [Property.is_active.is_(True)]
            conditions += self._filter_conditions(filters, params.normalized_search)
            return self._page(
                conditions,
                params,
                sortable=ADMIN_SORTABLE,
                default_sort=ADMIN_DEFAULT_SORT,
                default_desc=True,
            )
        except Exception as e:
            raise RepositoryError(
                entity_name="Property", operation="list_admin", message=str(e)
            ) from e

    async def list_public(
        self, params: ListQueryParams, filters: PropertyFilters
    ) -> Tuple[List[Property], int]:
        """List what public search shows: live and LISTED.

        ``filters.status`` is ignored here: the public rule decides status, and
        a query string must not be able to widen it to drafts.
        """
        try:
            public_filters = replace(filters, status=None)
            conditions = [
                Property.is_active.is_(True),
                Property.status.in_(LISTED_STATUSES),
            ]
            conditions += self._filter_conditions(
                public_filters, params.normalized_search
            )
            return self._page(
                conditions,
                params,
                sortable=PUBLIC_SORTABLE,
                default_sort=PUBLIC_DEFAULT_SORT,
                default_desc=True,
            )
        except Exception as e:
            raise RepositoryError(
                entity_name="Property", operation="list_public", message=str(e)
            ) from e

    async def list_featured(self, limit: int) -> List[Property]:
        """The homepage's featured row: featured, live, LISTED, newest first."""
        try:
            statement = (
                select(Property)
                .where(Property.is_active.is_(True))
                .where(Property.is_featured.is_(True))
                .where(Property.status.in_(LISTED_STATUSES))
                .order_by(Property.listed_at.desc().nulls_last(), Property.id)
                .limit(limit)
            )
            return list(self.session.execute(statement).unique().scalars().all())
        except Exception as e:
            raise RepositoryError(
                entity_name="Property", operation="list_featured", message=str(e)
            ) from e

    async def listed_cities(self) -> List[Tuple[str, int]]:
        """Each city with at least one LISTED home, and how many.

        Feeds the search form's city picker, so it can only ever offer a city
        that returns results.
        """
        try:
            statement = (
                select(Property.city, func.count())
                .where(Property.is_active.is_(True))
                .where(Property.status.in_(LISTED_STATUSES))
                .group_by(Property.city)
                .order_by(func.count().desc(), Property.city)
            )
            return [
                (str(row[0]), int(row[1])) for row in self.session.execute(statement)
            ]
        except Exception as e:
            raise RepositoryError(
                entity_name="Property", operation="listed_cities", message=str(e)
            ) from e

    async def counts_by_status(self, agent_id: Optional[UUID] = None) -> Dict[str, int]:
        """Live listings per status, for the dashboard. Scoped to one agent when given."""
        try:
            statement = (
                select(Property.status, func.count())
                .where(Property.is_active.is_(True))
                .group_by(Property.status)
            )
            if agent_id is not None:
                statement = statement.where(Property.agent_id == agent_id)
            return {
                (
                    row[0].value if isinstance(row[0], PropertyStatus) else str(row[0])
                ): int(row[1])
                for row in self.session.execute(statement)
            }
        except Exception as e:
            raise RepositoryError(
                entity_name="Property", operation="counts_by_status", message=str(e)
            ) from e
