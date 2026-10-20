"""Use case for the dashboard overview.

Reads across three modules — listings, inquiries, staff — which is why it sits
in a module of its own with no tables, as hgs-backend's dashboard does. It goes
through each module's repository rather than writing its own queries, so the
owner scope and the soft-delete filter are applied exactly as the screens they
summarize apply them.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.modules.inquiry.application.schemas.inquiry_schema import (
    InquiryAdminSchema,
    InquiryCountsSchema,
)
from src.modules.inquiry.domain.enums.inquiry_status import InquiryStatus
from src.modules.inquiry.infrastructure.repositories.inquiry_repository import (
    InquiryRepository,
)
from src.modules.property.domain.enums.property_status import PropertyStatus
from src.modules.property.infrastructure.repositories.property_repository import (
    PropertyRepository,
)
from src.modules.user.domain.entities.user import User
from src.modules.user.domain.enums.user_role import UserRole
from src.modules.user.domain.enums.user_status import UserStatus
from src.shared.domain.exceptions.repository_error import RepositoryError
from src.shared.infrastructure.logging import get_logger

from ..schemas.dashboard_schema import DashboardResponseSchema, PropertyCountsSchema

logger = get_logger(__name__)

#: Rows in the "latest inquiries" panel.
RECENT_LIMIT = 5


class GetDashboardUseCase:
    """Aggregate the overview for one signed-in user."""

    def __init__(self, session: Session) -> None:
        """Inject the database session."""
        self.session = session
        self.properties = PropertyRepository(session)
        self.inquiries = InquiryRepository(session)

    async def execute(self, actor: User) -> DashboardResponseSchema:
        """Build the overview, scoped to the actor.

        Each section is read independently. One failing marks only itself
        unavailable — a broken inquiry count should not blank the listing
        cards beside it.
        """
        scope = None if actor.is_admin else actor.id
        unavailable: list[str] = []

        properties = PropertyCountsSchema()
        try:
            by_status = await self.properties.counts_by_status(scope)
            properties = PropertyCountsSchema(
                **{s.value: by_status.get(s.value, 0) for s in PropertyStatus},
                total=sum(by_status.values()),
            )
        except RepositoryError:
            logger.error("Dashboard: listing counts unavailable", exc_info=True)
            unavailable.append("properties")

        inquiries = InquiryCountsSchema()
        recent: list[InquiryAdminSchema] = []
        try:
            by_status = await self.inquiries.counts_by_status(scope)
            inquiries = InquiryCountsSchema(
                **{s.value: by_status.get(s.value, 0) for s in InquiryStatus},
                total=sum(by_status.values()),
            )
            recent = [
                InquiryAdminSchema.model_validate(row)
                for row in await self.inquiries.recent(RECENT_LIMIT, scope)
            ]
        except RepositoryError:
            logger.error("Dashboard: inquiry counts unavailable", exc_info=True)
            unavailable.append("inquiries")

        agents = None
        if actor.is_admin:
            try:
                agents = int(
                    self.session.execute(
                        select(func.count())
                        .select_from(User)
                        .where(User.is_active.is_(True))
                        .where(User.role == UserRole.AGENT)
                        .where(User.status == UserStatus.ACTIVE)
                    ).scalar()
                    or 0
                )
            except Exception:
                logger.error("Dashboard: agent count unavailable", exc_info=True)
                unavailable.append("agents")

        return DashboardResponseSchema(
            scope="all" if actor.is_admin else "own",
            properties=properties,
            inquiries=inquiries,
            agents=agents,
            recent_inquiries=recent,
            unavailable=unavailable,
        )
