"""Dashboard reads: the listings table and one listing for its edit form."""

from dataclasses import replace
from typing import List, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from src.modules.user.domain.entities.user import User
from src.shared.application.schemas.pagination import ListQueryParams
from src.shared.domain.exceptions.not_found_error import NotFoundError

from ...infrastructure.repositories.property_repository import (
    PropertyFilters,
    PropertyRepository,
)
from ..schemas.property_schema import PropertyAdminSchema
from .property_access import ensure_can_manage


class ListPropertiesUseCase:
    """Page through listings in the dashboard.

    An agent's list is narrowed to their own listings HERE, by overriding the
    owner filter — not by trusting the screen to send it. Whatever an agent
    puts in `?agent_id=`, they get their own rows.
    """

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = PropertyRepository(session)

    async def execute(
        self, actor: User, params: ListQueryParams, filters: PropertyFilters
    ) -> Tuple[List[PropertyAdminSchema], int]:
        """List listings the actor may manage.

        Returns:
            ``(items, total)``
        """
        if not actor.is_admin:
            filters = replace(filters, agent_id=actor.id)
        rows, total = await self.repository.list_admin(params, filters)
        return [PropertyAdminSchema.model_validate(row) for row in rows], total


class GetPropertyUseCase:
    """Read one listing for the edit form."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = PropertyRepository(session)

    async def execute(self, actor: User, property_id: UUID) -> PropertyAdminSchema:
        """Fetch the listing.

        Raises:
            NotFoundError: No live listing has this id
            ForbiddenError: Not the caller's listing
        """
        listing = await self.repository.get_live(property_id)
        if listing is None:
            raise NotFoundError(entity_name="Property", entity_id=property_id)
        ensure_can_manage(actor, listing)
        return PropertyAdminSchema.model_validate(listing)
