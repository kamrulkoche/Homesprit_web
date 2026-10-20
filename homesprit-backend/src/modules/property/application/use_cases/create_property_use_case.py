"""Use case for creating a listing."""

from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.modules.user.domain.entities.user import User
from src.shared.domain.exceptions.already_exists_error import AlreadyExistsError
from src.shared.infrastructure.logging import get_logger

from ...domain.entities.property import Property
from ...domain.entities.property_image import PropertyImage
from ...domain.enums.property_status import PropertyStatus
from ...infrastructure.repositories.property_repository import PropertyRepository
from ..schemas.property_schema import PropertyAdminSchema, PropertyCreateSchema
from .property_access import ensure_can_feature, resolve_owner

logger = get_logger(__name__)


class CreatePropertyUseCase:
    """Create a listing together with its photos."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.session = session
        self.repository = PropertyRepository(session)

    async def execute(
        self, actor: User, payload: PropertyCreateSchema
    ) -> PropertyAdminSchema:
        """Create the listing.

        Args:
            actor: The signed-in admin or agent
            payload: Validated create request

        Returns:
            The persisted listing

        Raises:
            AlreadyExistsError: If the slug is taken — checked up front for a
                clear message, and again from the unique index, which is the
                only thing that sees a concurrent insert.
            ForbiddenError: An agent featuring the listing or naming another
                owner.
            ValidationError: An admin naming an owner who cannot sign in.
        """
        if payload.is_featured:
            ensure_can_feature(actor)

        agent_id = await resolve_owner(self.session, actor, payload.agent_id)

        if await self.repository.exists_by_slug(payload.slug):
            raise AlreadyExistsError(
                entity_name="Property", field="slug", value=payload.slug
            )

        listing = Property(
            title=payload.title,
            slug=payload.slug,
            description=payload.description,
            property_type=payload.property_type,
            listing_type=payload.listing_type,
            status=payload.status,
            price=payload.price,
            address=payload.address,
            city=payload.city,
            neighborhood=payload.neighborhood,
            bedrooms=payload.bedrooms,
            bathrooms=payload.bathrooms,
            area_sqft=payload.area_sqft,
            year_built=payload.year_built,
            parking_spaces=payload.parking_spaces,
            features=payload.features,
            is_featured=payload.is_featured,
            agent_id=agent_id,
            # A listing created straight onto the market is listed now; a
            # draft gets its date when it is first published.
            listed_at=(
                datetime.now(UTC) if payload.status != PropertyStatus.DRAFT else None
            ),
            created_by=actor.id,
            updated_by=actor.id,
        )
        listing.images = [
            PropertyImage(url=image.url, alt_text=image.alt_text, display_order=index)
            for index, image in enumerate(payload.images)
        ]

        try:
            created = await self.repository.create(listing)
        except IntegrityError as e:
            self.session.rollback()
            logger.warning(f"Property slug collision on create: {payload.slug}")
            raise AlreadyExistsError(
                entity_name="Property", field="slug", value=payload.slug
            ) from e

        logger.info(f"Property created: {created.slug} by {actor.email}")
        return PropertyAdminSchema.model_validate(created)
