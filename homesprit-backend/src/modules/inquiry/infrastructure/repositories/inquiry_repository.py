"""
Inquiry repository — queries behind the inquiries inbox.

The owner scope lives here, as a single `_scope` clause every read applies:
an agent's inbox is the inquiries about listings whose `agent_id` is theirs.
General inquiries (no listing) belong to nobody's listing and so only ever
reach an admin.
"""

from typing import Dict, List, Optional, Tuple, Type
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from src.modules.property.domain.entities.property import Property
from src.shared.application.schemas.pagination import ListQueryParams
from src.shared.domain.exceptions.repository_error import RepositoryError
from src.shared.infrastructure.base_repository import BaseRepository
from src.shared.infrastructure.ordering import resolve_sort_column

from ...domain.entities.inquiry import Inquiry
from ...domain.enums.inquiry_status import InquiryStatus

#: Columns the inbox may be sorted by.
SORTABLE = {"created_at", "name", "email", "status"}

#: Newest first — an inbox is read from the top.
DEFAULT_SORT = "created_at"


def _scope(statement: Select, agent_id: Optional[UUID]) -> Select:
    """Narrow a query to one agent's listings. ``None`` means "everything".

    An inner join, so a general inquiry (null `property_id`) can never satisfy
    an agent's scope.
    """
    if agent_id is None:
        return statement
    return statement.join(Property, Property.id == Inquiry.property_id).where(
        Property.agent_id == agent_id
    )


class InquiryRepository(BaseRepository[Inquiry]):
    """Repository for Inquiry database operations."""

    def __init__(self, session: Session, model: Type[Inquiry] = Inquiry):
        """Initialize the inquiry repository."""
        super().__init__(session, model)

    async def list_paginated(
        self,
        params: ListQueryParams,
        *,
        agent_id: Optional[UUID] = None,
        status: Optional[InquiryStatus] = None,
        property_id: Optional[UUID] = None,
    ) -> Tuple[List[Inquiry], int]:
        """List inquiries for the inbox.

        Args:
            params: Page, size, search and sort
            agent_id: Restrict to this agent's listings; None for an admin
            status: Narrow to one status
            property_id: Narrow to one listing

        Returns:
            ``(rows_for_this_page, total_matching_rows)``
        """
        try:
            filters = [Inquiry.is_active.is_(True)]
            if status is not None:
                filters.append(Inquiry.status == status)
            if property_id is not None:
                filters.append(Inquiry.property_id == property_id)

            term = params.normalized_search
            if term:
                pattern = f"%{term}%"
                filters.append(
                    or_(
                        Inquiry.name.ilike(pattern),
                        Inquiry.email.ilike(pattern),
                        Inquiry.phone.ilike(pattern),
                        Inquiry.message.ilike(pattern),
                    )
                )

            count_statement = _scope(
                select(func.count()).select_from(Inquiry), agent_id
            )
            for condition in filters:
                count_statement = count_statement.where(condition)
            total = self.session.execute(count_statement).scalar() or 0

            column = resolve_sort_column(Inquiry, params.sort, SORTABLE, DEFAULT_SORT)
            descending = params.order == "desc" or params.sort is None
            ordering = column.desc() if descending else column.asc()

            statement = _scope(select(Inquiry), agent_id)
            for condition in filters:
                statement = statement.where(condition)
            statement = (
                statement.order_by(ordering, Inquiry.created_at.desc(), Inquiry.id)
                .offset(params.offset)
                .limit(params.limit)
            )
            rows = list(self.session.execute(statement).unique().scalars().all())
            return rows, total
        except Exception as e:
            raise RepositoryError(
                entity_name="Inquiry", operation="list_paginated", message=str(e)
            ) from e

    async def counts_by_status(self, agent_id: Optional[UUID] = None) -> Dict[str, int]:
        """Inquiries per status, scoped like the list.

        Returns:
            ``{status_value: count}`` for every status that has rows
        """
        try:
            statement = _scope(
                select(Inquiry.status, func.count()).where(Inquiry.is_active.is_(True)),
                agent_id,
            ).group_by(Inquiry.status)
            return {
                (
                    row[0].value if isinstance(row[0], InquiryStatus) else str(row[0])
                ): int(row[1])
                for row in self.session.execute(statement)
            }
        except Exception as e:
            raise RepositoryError(
                entity_name="Inquiry", operation="counts_by_status", message=str(e)
            ) from e

    async def recent(
        self, limit: int, agent_id: Optional[UUID] = None
    ) -> List[Inquiry]:
        """The newest inquiries, for the dashboard's "latest" panel."""
        try:
            statement = (
                _scope(select(Inquiry), agent_id)
                .where(Inquiry.is_active.is_(True))
                .order_by(Inquiry.created_at.desc(), Inquiry.id)
                .limit(limit)
            )
            return list(self.session.execute(statement).unique().scalars().all())
        except Exception as e:
            raise RepositoryError(
                entity_name="Inquiry", operation="recent", message=str(e)
            ) from e
