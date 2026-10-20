"""Who may do what to a listing — the ownership half of authorization.

The ROLE half lives in the routes: `hasAccess(roles=STAFF)` lets admins and
agents through and keeps everyone else out. But "this agent may edit THIS
listing" depends on the row, which only exists once the use case has loaded
it, so that rule lives here, raised as a ``ForbiddenError`` the shared handler
maps to 403.

Kept in one module so the three write use cases cannot drift into three
slightly different readings of "owner".
"""

from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from src.modules.user.domain.entities.user import User
from src.modules.user.infrastructure.repositories.user_repository import (
    UserRepository,
)
from src.shared.domain.exceptions.forbidden_error import ForbiddenError
from src.shared.domain.exceptions.validation_error import ValidationError

from ...domain.entities.property import Property


def can_manage(actor: User, listing: Property) -> bool:
    """Admins manage every listing; an agent manages the ones they own."""
    return actor.is_admin or listing.agent_id == actor.id


def ensure_can_manage(actor: User, listing: Property) -> None:
    """Raise unless the actor may read or change this listing.

    Raises:
        ForbiddenError: For an agent touching someone else's listing. A 403,
            not a 404: the caller is signed-in staff, and pretending a
            colleague's listing does not exist would only confuse them.
    """
    if not can_manage(actor, listing):
        raise ForbiddenError("You can only manage your own listings.")


def ensure_can_feature(actor: User) -> None:
    """Raise unless the actor may change the homepage's featured row.

    Featuring is an editorial decision about the whole site, so it is the
    admins' — otherwise every agent would feature every listing.
    """
    if not actor.is_admin:
        raise ForbiddenError("Only an admin can feature a listing.")


async def resolve_owner(
    session: Session, actor: User, requested: Optional[UUID]
) -> UUID:
    """Decide who owns a listing being created or reassigned.

    Args:
        session: Active database session
        actor: The signed-in user
        requested: The ``agent_id`` the form sent, or None

    Returns:
        The owner's id — the caller's own when nothing was requested

    Raises:
        ForbiddenError: An agent naming someone other than themselves
        ValidationError: An admin naming an account that cannot sign in. A
            listing must belong to someone who can answer its inquiries.
    """
    if actor.id is None:
        raise ValueError("Authenticated user must have an ID")

    if requested is None or requested == actor.id:
        return actor.id

    if not actor.is_admin:
        raise ForbiddenError("Agents can only list properties under their own name.")

    owner = await UserRepository(session).get_by_id(requested)
    if owner is None or not owner.can_authenticate:
        raise ValidationError(
            entity_name="Property",
            field="agent_id",
            message="Choose an active staff member to own this listing.",
        )
    return requested
