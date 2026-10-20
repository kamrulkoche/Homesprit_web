"""Use case for updating a listing."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.modules.user.domain.entities.user import User
from src.shared.domain.exceptions.already_exists_error import AlreadyExistsError
from src.shared.domain.exceptions.not_found_error import NotFoundError
from src.shared.infrastructure.logging import get_logger

from ...domain.entities.property_image import PropertyImage
from ...domain.enums.property_status import PropertyStatus
from ...infrastructure.repositories.property_repository import PropertyRepository
from ..schemas.property_schema import PropertyAdminSchema, PropertyUpdateSchema
from .property_access import ensure_can_feature, ensure_can_manage, resolve_owner

logger = get_logger(__name__)

#: Copied straight across when present. `slug`, `agent_id`, `is_featured` and
#: `images` are absent on purpose — each needs a check or a replacement first.
_SCALAR_FIELDS = (
    "title",
    "description",
    "property_type",
    "listing_type",
    "status",
    "price",
    "address",
    "city",
    "neighborhood",
    "bedrooms",
    "bathrooms",
    "area_sqft",
    "year_built",
    "parking_spaces",
    "features",
)

#: Fields that may be cleared by sending null. Every other field treats null
#: as "not supplied" — a listing cannot have no title or no price.
_NULLABLE_FIELDS = {"neighborhood", "area_sqft", "year_built"}


class UpdatePropertyUseCase:
    """Apply a partial update to a listing."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.session = session
        self.repository = PropertyRepository(session)

    async def execute(
        self, actor: User, property_id: UUID, payload: PropertyUpdateSchema
    ) -> PropertyAdminSchema:
        """Update the listing.

        Only keys present in the request are touched — `exclude_unset` is what
        tells "send null to clear the neighborhood" apart from "did not mention
        the neighborhood".

        Raises:
            NotFoundError: No live listing has this id
            ForbiddenError: Not the caller's listing; or an agent changing the
                featured flag or the owner
            AlreadyExistsError: The new slug belongs to another listing
        """
        listing = await self.repository.get_live(property_id)
        if listing is None:
            raise NotFoundError(entity_name="Property", entity_id=property_id)
        ensure_can_manage(actor, listing)

        supplied = payload.model_dump(exclude_unset=True)

        if "is_featured" in supplied and supplied["is_featured"] is not None:
            if supplied["is_featured"] != listing.is_featured:
                ensure_can_feature(actor)
                listing.is_featured = supplied["is_featured"]

        if "agent_id" in supplied and supplied["agent_id"] is not None:
            listing.agent_id = await resolve_owner(
                self.session, actor, supplied["agent_id"]
            )

        new_slug = supplied.get("slug")
        if new_slug is not None and new_slug != listing.slug:
            if await self.repository.exists_by_slug(new_slug, exclude_id=property_id):
                raise AlreadyExistsError(
                    entity_name="Property", field="slug", value=new_slug
                )
            listing.slug = new_slug

        for field in _SCALAR_FIELDS:
            if field not in supplied:
                continue
            if supplied[field] is None and field not in _NULLABLE_FIELDS:
                continue
            setattr(listing, field, supplied[field])

        # First publication stamps the date "newest" sorts on. Never moved
        # afterwards: re-saving a listing must not bump it back to the top.
        if listing.status != PropertyStatus.DRAFT and listing.listed_at is None:
            listing.listed_at = datetime.now(UTC)

        # Photos are replaced wholesale, never merged — the form posts its full
        # current set, in order. delete-orphan removes the ones that fell out.
        if payload.images is not None:
            listing.images = [
                PropertyImage(
                    property_id=property_id,
                    url=image.url,
                    alt_text=image.alt_text,
                    display_order=index,
                )
                for index, image in enumerate(payload.images)
            ]

        listing.updated_by = actor.id

        try:
            updated = await self.repository.update(listing)
        except IntegrityError as e:
            self.session.rollback()
            raise AlreadyExistsError(
                entity_name="Property", field="slug", value=listing.slug
            ) from e

        logger.info(f"Property updated: {updated.slug} by {actor.email}")
        return PropertyAdminSchema.model_validate(updated)
