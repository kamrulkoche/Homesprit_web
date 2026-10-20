"""Use cases behind the inquiry form and the inquiries inbox.

One module, as hgs-backend's `contact_use_cases.py`: a submit, a list, a count,
a read and a status change over one table share the scope rule below, and
splitting them would scatter it.

The scope rule: an admin sees every inquiry; an agent sees the ones about
listings they own. `_scope_for` turns the actor into the repository's
`agent_id` argument, and `_ensure_visible` applies the same rule to a single
row.
"""

from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from src.modules.property.domain.enums.property_status import ENQUIRABLE_STATUSES
from src.modules.property.infrastructure.repositories.property_repository import (
    PropertyRepository,
)
from src.modules.user.domain.entities.user import User
from src.shared.application.schemas.pagination import ListQueryParams
from src.shared.domain.exceptions.forbidden_error import ForbiddenError
from src.shared.domain.exceptions.not_found_error import NotFoundError
from src.shared.domain.exceptions.validation_error import ValidationError
from src.shared.infrastructure.logging import get_logger

from ...domain.entities.inquiry import Inquiry
from ...domain.enums.inquiry_status import InquiryStatus
from ...infrastructure.repositories.inquiry_repository import InquiryRepository
from ..schemas.inquiry_schema import (
    InquiryAdminSchema,
    InquiryCountsSchema,
    InquiryStatusUpdateSchema,
    InquirySubmitSchema,
    InquirySubmittedSchema,
)

logger = get_logger(__name__)


def _scope_for(actor: User) -> Optional[UUID]:
    """The repository scope for this actor: None for an admin, their id otherwise."""
    return None if actor.is_admin else actor.id


def _ensure_visible(actor: User, inquiry: Inquiry) -> None:
    """Raise unless the actor may read or change this inquiry.

    Raises:
        ForbiddenError: An agent opening an inquiry about someone else's
            listing, or a general one (which belongs to no listing).
    """
    if actor.is_admin:
        return
    if inquiry.listing is None or inquiry.listing.agent_id != actor.id:
        raise ForbiddenError("You can only see inquiries about your own listings.")


class SubmitInquiryUseCase:
    """Record a question sent from the website."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = InquiryRepository(session)
        self.properties = PropertyRepository(session)

    async def execute(self, payload: InquirySubmitSchema) -> InquirySubmittedSchema:
        """Store the inquiry as ``new``.

        Raises:
            NotFoundError: The slug names no listing the public can see. Same
                answer as the detail page gives, so this cannot be used to
                probe for drafts.
            ValidationError: The listing is sold or rented. Its page still
                renders, but it no longer takes questions.
        """
        property_id: Optional[UUID] = None

        if payload.property_slug:
            listing = await self.properties.get_viewable_by_slug(payload.property_slug)
            if listing is None:
                raise NotFoundError(
                    entity_name="Property", entity_id=payload.property_slug
                )
            if listing.status not in ENQUIRABLE_STATUSES:
                raise ValidationError(
                    entity_name="Inquiry",
                    field="property_slug",
                    message="This home is no longer on the market.",
                )
            property_id = listing.id

        inquiry = Inquiry(
            property_id=property_id,
            name=payload.name,
            email=str(payload.email).lower(),
            phone=payload.phone,
            message=payload.message,
            status=InquiryStatus.NEW,
        )
        created = await self.repository.create(inquiry)
        logger.info(f"Inquiry received: {created.id} (property={property_id})")
        return InquirySubmittedSchema()


class ListInquiriesUseCase:
    """Page through the inbox."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = InquiryRepository(session)

    async def execute(
        self,
        actor: User,
        params: ListQueryParams,
        *,
        status: Optional[InquiryStatus] = None,
        property_id: Optional[UUID] = None,
    ) -> Tuple[List[InquiryAdminSchema], int]:
        """List the inquiries this actor may see, newest first by default.

        Returns:
            ``(items, total)``
        """
        rows, total = await self.repository.list_paginated(
            params,
            agent_id=_scope_for(actor),
            status=status,
            property_id=property_id,
        )
        return [InquiryAdminSchema.model_validate(row) for row in rows], total


class GetInquiryCountsUseCase:
    """Totals for the inbox filter and the dashboard."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = InquiryRepository(session)

    async def execute(self, actor: User) -> InquiryCountsSchema:
        """Count the actor's inquiries per status."""
        counts = await self.repository.counts_by_status(_scope_for(actor))
        known = {value: counts.get(value, 0) for value in InquiryStatus.all_statuses()}
        return InquiryCountsSchema(**known, total=sum(counts.values()))


class GetInquiryUseCase:
    """Read one inquiry."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = InquiryRepository(session)

    async def execute(self, actor: User, inquiry_id: UUID) -> InquiryAdminSchema:
        """Fetch an inquiry by id.

        Raises:
            NotFoundError: No inquiry has this id
            ForbiddenError: Not about one of the agent's listings
        """
        inquiry = await self.repository.get_by_id(inquiry_id)
        if inquiry is None or not inquiry.is_active:
            raise NotFoundError(entity_name="Inquiry", entity_id=inquiry_id)
        _ensure_visible(actor, inquiry)
        return InquiryAdminSchema.model_validate(inquiry)


class UpdateInquiryStatusUseCase:
    """Mark an inquiry new, contacted or closed."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.repository = InquiryRepository(session)

    async def execute(
        self, actor: User, inquiry_id: UUID, payload: InquiryStatusUpdateSchema
    ) -> InquiryAdminSchema:
        """Change the status.

        Raises:
            NotFoundError: No inquiry has this id
            ForbiddenError: Not about one of the agent's listings
        """
        inquiry = await self.repository.get_by_id(inquiry_id)
        if inquiry is None or not inquiry.is_active:
            raise NotFoundError(entity_name="Inquiry", entity_id=inquiry_id)
        _ensure_visible(actor, inquiry)

        inquiry.status = payload.status
        inquiry.updated_by = actor.id
        updated = await self.repository.update(inquiry)
        return InquiryAdminSchema.model_validate(updated)
