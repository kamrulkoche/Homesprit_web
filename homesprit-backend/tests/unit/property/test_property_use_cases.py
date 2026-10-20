"""Unit tests for the property use cases, with the repository mocked."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from src.modules.property.application.schemas.property_schema import (
    PropertyUpdateSchema,
)
from src.modules.property.application.use_cases.get_public_properties_use_case import (
    SearchPublicPropertiesUseCase,
)
from src.modules.property.application.use_cases.list_properties_use_case import (
    ListPropertiesUseCase,
)
from src.modules.property.application.use_cases.update_property_use_case import (
    UpdatePropertyUseCase,
)
from src.modules.property.domain.entities.property import Property
from src.modules.property.infrastructure.repositories.property_repository import (
    PropertyFilters,
)
from src.modules.user.domain.entities.user import User
from src.shared.application.schemas.pagination import ListQueryParams
from src.shared.domain.exceptions.forbidden_error import ForbiddenError
from src.shared.domain.exceptions.not_found_error import NotFoundError
from src.shared.domain.exceptions.validation_error import ValidationError


def _listing(owner: User, **fields) -> Property:
    return Property.model_construct(
        id=uuid4(), agent_id=owner.id, slug="a-home", is_featured=False, **fields
    )


@pytest.mark.unit
class TestListProperties:
    async def test_agent_is_narrowed_to_their_own_listings(
        self, agent: User, other_agent: User
    ):
        use_case = ListPropertiesUseCase(MagicMock())
        use_case.repository = MagicMock(list_admin=AsyncMock(return_value=([], 0)))

        # Whatever owner the agent asks for, they get themselves.
        await use_case.execute(
            agent, ListQueryParams(), PropertyFilters(agent_id=other_agent.id)
        )

        filters = use_case.repository.list_admin.await_args.args[1]
        assert filters.agent_id == agent.id

    async def test_admin_filter_is_respected(self, admin: User, agent: User):
        use_case = ListPropertiesUseCase(MagicMock())
        use_case.repository = MagicMock(list_admin=AsyncMock(return_value=([], 0)))

        await use_case.execute(
            admin, ListQueryParams(), PropertyFilters(agent_id=agent.id)
        )
        assert use_case.repository.list_admin.await_args.args[1].agent_id == agent.id

        await use_case.execute(admin, ListQueryParams(), PropertyFilters())
        assert use_case.repository.list_admin.await_args.args[1].agent_id is None


@pytest.mark.unit
class TestUpdateProperty:
    def _use_case(self, listing: Property | None) -> UpdatePropertyUseCase:
        use_case = UpdatePropertyUseCase(MagicMock())
        use_case.repository = MagicMock(
            get_live=AsyncMock(return_value=listing),
            update=AsyncMock(side_effect=lambda row: row),
        )
        return use_case

    async def test_missing_listing_is_not_found(self, admin: User):
        with pytest.raises(NotFoundError):
            await self._use_case(None).execute(
                admin, uuid4(), PropertyUpdateSchema(price=1)
            )

    async def test_agent_cannot_edit_someone_elses_listing(
        self, agent: User, other_agent: User
    ):
        use_case = self._use_case(_listing(other_agent))
        with pytest.raises(ForbiddenError):
            await use_case.execute(agent, uuid4(), PropertyUpdateSchema(price=1))
        use_case.repository.update.assert_not_awaited()

    async def test_agent_cannot_feature_their_own_listing(self, agent: User):
        use_case = self._use_case(_listing(agent))
        with pytest.raises(ForbiddenError):
            await use_case.execute(
                agent, uuid4(), PropertyUpdateSchema(is_featured=True)
            )
        use_case.repository.update.assert_not_awaited()


@pytest.mark.unit
class TestSearchPublicProperties:
    async def test_inverted_price_range_is_a_validation_error(self):
        use_case = SearchPublicPropertiesUseCase(MagicMock())
        use_case.repository = MagicMock(list_public=AsyncMock())

        with pytest.raises(ValidationError):
            await use_case.execute(
                ListQueryParams(), PropertyFilters(min_price=500, max_price=100)
            )
        use_case.repository.list_public.assert_not_awaited()
