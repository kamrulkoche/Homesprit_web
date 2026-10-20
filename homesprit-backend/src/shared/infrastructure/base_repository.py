"""Base repository implementation using SQLAlchemy 2.0 patterns.

Provides a standardized base repository that all module-specific repositories
extend. Uses modern SQLAlchemy 2.0 syntax with select(), execute() and
scalars().

Every method wraps its body in try/except and re-raises ``RepositoryError`` so
a caller never sees a raw driver exception. ``IntegrityError`` is deliberately
re-raised unchanged so a caller can map a unique-constraint collision onto a
domain-specific ``AlreadyExistsError``.
"""

from datetime import UTC, datetime
from typing import Generic, List, Optional, Type, TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlmodel import SQLModel

from ..domain.exceptions.repository_error import RepositoryError

TEntity = TypeVar("TEntity", bound=SQLModel)


class BaseRepository(Generic[TEntity]):
    """Generic CRUD repository for a SQLModel entity.

    Constructed as ``Repo(session, EntityClass)`` — the entity class is passed
    explicitly, matching the reference project's convention.
    """

    def __init__(self, session: Session, model: Type[TEntity]):
        """Initialize the repository.

        Args:
            session: Active SQLAlchemy session
            model: SQLModel entity class this repository manages
        """
        self.session = session
        self.model = model

    async def create(self, entity: TEntity) -> TEntity:
        """Persist a new entity.

        Args:
            entity: Entity instance to insert

        Returns:
            The persisted entity, refreshed from the database

        Raises:
            IntegrityError: On a constraint violation (caller maps it)
            RepositoryError: On any other database failure
        """
        try:
            self.session.add(entity)
            self.session.commit()
            self.session.refresh(entity)
            return entity
        except IntegrityError:
            self.session.rollback()
            raise
        except Exception as e:
            self.session.rollback()
            raise RepositoryError(
                entity_name=self.model.__name__, operation="create", message=str(e)
            ) from e

    async def get_by_id(self, entity_id: UUID) -> Optional[TEntity]:
        """Fetch one entity by primary key.

        Args:
            entity_id: Primary key

        Returns:
            The entity, or None if no row matches
        """
        try:
            statement = select(self.model).where(self.model.id == entity_id)
            return self.session.execute(statement).scalars().first()
        except Exception as e:
            raise RepositoryError(
                entity_name=self.model.__name__, operation="get_by_id", message=str(e)
            ) from e

    async def get_all(self, is_active: Optional[bool] = None) -> List[TEntity]:
        """Fetch all entities, optionally filtered by the soft-delete flag.

        Args:
            is_active: True for live rows, False for soft-deleted, None for all

        Returns:
            List of entities
        """
        try:
            statement = select(self.model)
            if is_active is not None and hasattr(self.model, "is_active"):
                statement = statement.where(self.model.is_active == is_active)
            return list(self.session.execute(statement).scalars().all())
        except Exception as e:
            raise RepositoryError(
                entity_name=self.model.__name__, operation="get_all", message=str(e)
            ) from e

    async def update(self, entity: TEntity) -> TEntity:
        """Persist changes to an existing entity, refreshing ``updated_at``.

        Args:
            entity: Entity instance with modified fields

        Returns:
            The updated entity

        Raises:
            IntegrityError: On a constraint violation (caller maps it)
            RepositoryError: On any other database failure
        """
        try:
            if hasattr(entity, "updated_at"):
                entity.updated_at = datetime.now(UTC)
            self.session.add(entity)
            self.session.commit()
            self.session.refresh(entity)
            return entity
        except IntegrityError:
            self.session.rollback()
            raise
        except Exception as e:
            self.session.rollback()
            raise RepositoryError(
                entity_name=self.model.__name__, operation="update", message=str(e)
            ) from e

    async def soft_delete(self, entity_id: UUID) -> bool:
        """Mark an entity inactive rather than removing the row.

        Args:
            entity_id: Primary key

        Returns:
            True if a row was deactivated, False if none matched

        Raises:
            RepositoryError: If the model has no ``is_active`` field, or on failure
        """
        try:
            if not hasattr(self.model, "is_active"):
                raise RepositoryError(
                    entity_name=self.model.__name__,
                    operation="soft_delete",
                    message="Model has no is_active field",
                )

            entity = await self.get_by_id(entity_id)
            if not entity:
                return False

            entity.is_active = False
            if hasattr(entity, "updated_at"):
                entity.updated_at = datetime.now(UTC)

            self.session.add(entity)
            self.session.commit()
            self.session.refresh(entity)
            return True
        except RepositoryError:
            raise
        except Exception as e:
            self.session.rollback()
            raise RepositoryError(
                entity_name=self.model.__name__, operation="soft_delete", message=str(e)
            ) from e

    async def count(self, is_active: Optional[bool] = None) -> int:
        """Count entities, optionally filtered by the soft-delete flag.

        Args:
            is_active: True for live rows, False for soft-deleted, None for all

        Returns:
            Row count
        """
        try:
            statement = select(func.count()).select_from(self.model)
            if is_active is not None and hasattr(self.model, "is_active"):
                statement = statement.where(self.model.is_active == is_active)
            return self.session.execute(statement).scalar() or 0
        except Exception as e:
            raise RepositoryError(
                entity_name=self.model.__name__, operation="count", message=str(e)
            ) from e

    async def exists_by_id(self, entity_id: UUID) -> bool:
        """Check whether a row with this primary key exists.

        Args:
            entity_id: Primary key

        Returns:
            True if the row exists
        """
        try:
            statement = (
                select(func.count())
                .select_from(self.model)
                .where(self.model.id == entity_id)
            )
            count = self.session.execute(statement).scalar()
            return count is not None and count > 0
        except Exception as e:
            raise RepositoryError(
                entity_name=self.model.__name__,
                operation="exists_by_id",
                message=str(e),
            ) from e
