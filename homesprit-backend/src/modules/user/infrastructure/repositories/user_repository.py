"""
User repository — queries behind sign-in and staff management.

Extends BaseRepository with the lookups hgs-backend's AdminUserRepository has,
plus the paginated staff list the Users screen needs.
"""

from datetime import UTC, datetime
from typing import List, Optional, Tuple, Type
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.shared.application.schemas.pagination import ListQueryParams
from src.shared.domain.exceptions.repository_error import RepositoryError
from src.shared.infrastructure.base_repository import BaseRepository
from src.shared.infrastructure.ordering import resolve_sort_column

from ...domain.entities.user import User
from ...domain.enums.user_role import UserRole
from ...domain.enums.user_status import UserStatus

#: Columns the staff list may be sorted by — see `resolve_sort_column`.
SORTABLE = {"name", "email", "role", "status", "created_at", "last_login_at"}

DEFAULT_SORT = "name"


class UserRepository(BaseRepository[User]):
    """Repository for User database operations."""

    def __init__(self, session: Session, model: Type[User] = User):
        """Initialize user repository."""
        super().__init__(session, model)

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get a user by email address (case-insensitive).

        The login lookup. The column is normalized to lowercase on write by the
        entity validator, and the needle is lowered here, so "Agent@Home.com"
        still matches.

        Args:
            email: Email address

        Returns:
            The user, or None
        """
        try:
            needle = email.lower().strip()
            statement = select(User).where(func.lower(User.email) == needle)
            return self.session.execute(statement).scalars().first()
        except Exception as e:
            raise RepositoryError(
                entity_name="User", operation="get_by_email", message=str(e)
            ) from e

    async def exists_by_email(
        self, email: str, exclude_id: Optional[UUID] = None
    ) -> bool:
        """
        Check whether a user with this email exists.

        Args:
            email: Email address
            exclude_id: Ignore this row — the user's own ID on update

        Returns:
            True if the email is taken
        """
        try:
            needle = email.lower().strip()
            statement = (
                select(func.count())
                .select_from(User)
                .where(func.lower(User.email) == needle)
            )
            if exclude_id:
                statement = statement.where(User.id != exclude_id)
            count = self.session.execute(statement).scalar()
            return count is not None and count > 0
        except Exception as e:
            raise RepositoryError(
                entity_name="User", operation="exists_by_email", message=str(e)
            ) from e

    async def touch_last_login(self, user: User) -> User:
        """
        Record a successful login.

        Deliberately NOT through ``BaseRepository.update``: that also bumps
        ``updated_at``, which would make every sign-in look like a profile edit.

        Args:
            user: The user who just authenticated

        Returns:
            The updated user
        """
        try:
            user.last_login_at = datetime.now(UTC)
            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)
            return user
        except Exception as e:
            self.session.rollback()
            raise RepositoryError(
                entity_name="User", operation="touch_last_login", message=str(e)
            ) from e

    async def count_active_admins(self, exclude_id: Optional[UUID] = None) -> int:
        """
        Count admins who can still sign in.

        Used to refuse the change that would leave nobody able to manage staff.

        Args:
            exclude_id: Leave this user out of the count — the one being changed

        Returns:
            How many other active admins exist
        """
        try:
            statement = (
                select(func.count())
                .select_from(User)
                .where(User.is_active.is_(True))
                .where(User.role == UserRole.ADMIN)
                .where(User.status == UserStatus.ACTIVE)
            )
            if exclude_id:
                statement = statement.where(User.id != exclude_id)
            return int(self.session.execute(statement).scalar() or 0)
        except Exception as e:
            raise RepositoryError(
                entity_name="User", operation="count_active_admins", message=str(e)
            ) from e

    async def list_paginated(
        self,
        params: ListQueryParams,
        *,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
    ) -> Tuple[List[User], int]:
        """
        List staff for the Users screen.

        Args:
            params: Page, size, search term and sort
            role: Narrow to one role
            status: Narrow to one status

        Returns:
            ``(rows_for_this_page, total_matching_rows)``
        """
        try:
            filters = [User.is_active.is_(True)]
            if role is not None:
                filters.append(User.role == role)
            if status is not None:
                filters.append(User.status == status)

            term = params.normalized_search
            if term:
                pattern = f"%{term}%"
                filters.append(or_(User.name.ilike(pattern), User.email.ilike(pattern)))

            count_statement = select(func.count()).select_from(User)
            for condition in filters:
                count_statement = count_statement.where(condition)
            total = self.session.execute(count_statement).scalar() or 0

            column = resolve_sort_column(User, params.sort, SORTABLE, DEFAULT_SORT)
            ordering = column.desc() if params.order == "desc" else column.asc()

            statement = select(User)
            for condition in filters:
                statement = statement.where(condition)
            statement = (
                statement.order_by(ordering, User.created_at.asc())
                .offset(params.offset)
                .limit(params.limit)
            )
            return list(self.session.execute(statement).scalars().all()), total
        except Exception as e:
            raise RepositoryError(
                entity_name="User", operation="list_paginated", message=str(e)
            ) from e
