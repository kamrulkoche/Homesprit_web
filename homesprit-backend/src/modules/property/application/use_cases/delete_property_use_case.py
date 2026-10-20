"""Use case for deleting a listing."""

from uuid import UUID

from sqlalchemy.orm import Session

from src.modules.user.domain.entities.user import User
from src.shared.application.schemas.pagination import DeleteResponseSchema
from src.shared.domain.exceptions.not_found_error import NotFoundError
from src.shared.infrastructure.logging import get_logger

from ...infrastructure.repositories.property_repository import PropertyRepository
from .property_access import ensure_can_manage

logger = get_logger(__name__)


class DeletePropertyUseCase:
    """Soft-delete a listing.

    Soft, as every delete in hgs-backend is: the row is flagged inactive and
    leaves the dashboard and the site, but survives. Its inquiries keep
    pointing at a real row, and its slug stays reserved, so an old link 404s
    rather than landing on an unrelated home that reused the URL.

    To take a listing off the market without deleting it, set it to ARCHIVED.
    """

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = PropertyRepository(session)

    async def execute(self, actor: User, property_id: UUID) -> DeleteResponseSchema:
        """Delete the listing.

        Raises:
            NotFoundError: No live listing has this id — including one already
                deleted, so a double-submit is visible rather than silent.
            ForbiddenError: Not the caller's listing
        """
        listing = await self.repository.get_live(property_id)
        if listing is None:
            raise NotFoundError(entity_name="Property", entity_id=property_id)
        ensure_can_manage(actor, listing)

        listing.is_active = False
        # Through `update`, not `soft_delete`, so `updated_by` is written in the
        # same statement — `soft_delete` re-reads the row and would drop it.
        listing.updated_by = actor.id
        await self.repository.update(listing)

        logger.info(f"Property soft-deleted: {listing.slug} by {actor.email}")
        return DeleteResponseSchema(id=str(property_id), message="Listing removed")
