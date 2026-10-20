"""Unit tests for the ownership rules in `property_access`."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from src.modules.property.application.use_cases.property_access import (
    can_manage,
    ensure_can_feature,
    ensure_can_manage,
    resolve_owner,
)
from src.modules.property.domain.entities.property import Property
from src.modules.user.domain.entities.user import User
from src.shared.domain.exceptions.forbidden_error import ForbiddenError
from src.shared.domain.exceptions.validation_error import ValidationError

REPO_PATH = "src.modules.property.application.use_cases.property_access.UserRepository"


def _listing(owner: User) -> Property:
    return Property.model_construct(id=uuid4(), agent_id=owner.id, slug="x")


@pytest.mark.unit
class TestCanManage:
    def test_owner_may_manage(self, agent: User):
        assert can_manage(agent, _listing(agent))

    def test_admin_may_manage_anyones(self, admin: User, agent: User):
        assert can_manage(admin, _listing(agent))

    def test_other_agent_may_not(self, agent: User, other_agent: User):
        assert not can_manage(other_agent, _listing(agent))
        with pytest.raises(ForbiddenError):
            ensure_can_manage(other_agent, _listing(agent))


@pytest.mark.unit
class TestFeaturing:
    def test_only_admins_feature(self, admin: User, agent: User):
        ensure_can_feature(admin)
        with pytest.raises(ForbiddenError):
            ensure_can_feature(agent)


@pytest.mark.unit
class TestResolveOwner:
    async def test_nothing_requested_means_the_caller(self, agent: User):
        assert await resolve_owner(MagicMock(), agent, None) == agent.id

    async def test_agent_naming_themselves_is_fine(self, agent: User):
        assert await resolve_owner(MagicMock(), agent, agent.id) == agent.id

    async def test_agent_naming_someone_else_is_forbidden(
        self, agent: User, other_agent: User
    ):
        with pytest.raises(ForbiddenError):
            await resolve_owner(MagicMock(), agent, other_agent.id)

    async def test_admin_may_assign_an_active_user(self, admin: User, agent: User):
        with patch(REPO_PATH) as repo_cls:
            repo_cls.return_value.get_by_id = AsyncMock(return_value=agent)
            assert await resolve_owner(MagicMock(), admin, agent.id) == agent.id

    async def test_admin_may_not_assign_a_suspended_user(
        self, admin: User, suspended_agent: User
    ):
        with patch(REPO_PATH) as repo_cls:
            repo_cls.return_value.get_by_id = AsyncMock(return_value=suspended_agent)
            with pytest.raises(ValidationError):
                await resolve_owner(MagicMock(), admin, suspended_agent.id)

    async def test_admin_may_not_assign_a_missing_user(self, admin: User):
        with patch(REPO_PATH) as repo_cls:
            repo_cls.return_value.get_by_id = AsyncMock(return_value=None)
            with pytest.raises(ValidationError):
                await resolve_owner(MagicMock(), admin, uuid4())
