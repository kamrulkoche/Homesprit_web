"""
User entity — a person who can sign in to the Homesprit dashboard.

The equivalent of hgs-backend's `AdminUser`, widened to two roles.
"""

from datetime import datetime
from typing import Optional

from pydantic import ConfigDict, field_validator
from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlmodel import Field

from src.shared.domain.entities.audited_entity import AuditedEntity

from ..enums.user_role import UserRole
from ..enums.user_status import UserStatus


class User(AuditedEntity, table=True):
    """
    Staff account: an admin or an agent.

    Called `users` rather than HGS's `admin_users` because it is no longer
    admins only. Visitors to the public site have no account at all — an
    inquiry carries their contact details instead.

    Inherits from AuditedEntity: id, is_active, created_at, updated_at,
    created_by, updated_by.

    Attributes:
        name: Display name, also shown on the agent's listings
        email: Login identifier, unique and stored lowercase
        phone: Optional; shown on the agent's public listings
        password_hash: bcrypt hash — NEVER the plaintext, NEVER serialized
        role: Access level (see UserRole)
        status: Account state (see UserStatus); only ACTIVE may sign in
        last_login_at: Updated on each successful login

    Table name: users

    Security:
        - password_hash is excluded from every response schema by construction:
          no response schema declares the field, so `from_attributes`
          conversion cannot surface it.
    """

    __tablename__ = "users"

    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    name: str = Field(
        max_length=120,
        nullable=False,
        description="Display name",
    )

    email: str = Field(
        max_length=255,
        nullable=False,
        unique=True,
        index=True,
        description="Email address (login identifier)",
    )

    phone: Optional[str] = Field(
        default=None,
        max_length=40,
        description="Contact number shown on the agent's listings",
    )

    password_hash: str = Field(
        max_length=255,
        nullable=False,
        description="bcrypt password hash — never exposed through the API",
    )

    # Native Postgres enums whose members are the VALUES ("agent"), not the
    # Python names ("AGENT"). `values_callable` forces that; without it
    # SQLAlchemy persists the NAME and a value-based query matches nothing.
    role: UserRole = Field(
        default=UserRole.AGENT,
        sa_column=Column(
            SQLAlchemyEnum(
                UserRole,
                values_callable=lambda x: [e.value for e in x],
                name="user_role",
            ),
            nullable=False,
            index=True,
        ),
        description="Role: admin or agent",
    )

    status: UserStatus = Field(
        default=UserStatus.ACTIVE,
        sa_column=Column(
            SQLAlchemyEnum(
                UserStatus,
                values_callable=lambda x: [e.value for e in x],
                name="user_status",
            ),
            nullable=False,
            index=True,
        ),
        description="Account status: active, inactive, suspended",
    )

    last_login_at: Optional[datetime] = Field(
        sa_type=DateTime(timezone=True),
        default=None,
        description="Last successful login timestamp",
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        """Validate email shape and normalize to lowercase."""
        if not value or "@" not in value:
            raise ValueError("Invalid email address")
        return value.lower().strip()

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        """Ensure the display name is not blank."""
        value = value.strip()
        if not value:
            raise ValueError("Name must not be empty")
        return value

    def __repr__(self) -> str:
        """String representation of User."""
        return f"<User(id='{self.id}', email='{self.email}', role='{self.role}')>"

    @property
    def can_authenticate(self) -> bool:
        """Whether this account is permitted to sign in.

        Both gates matter: ``status`` is the administrative decision, and
        ``is_active`` is the soft-delete flag from AuditedEntity.
        """
        return self.status == UserStatus.ACTIVE and self.is_active

    @property
    def is_admin(self) -> bool:
        """Whether this user sees everything rather than only their own rows."""
        return self.role == UserRole.ADMIN
