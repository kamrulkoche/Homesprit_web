"""User Pydantic schemas.

One response shape for every place a user is returned to staff — the Users
screen, `/auth/me`, the login response. The public site never receives this
schema; a listing carries only `AgentPublicSchema` (name, email, phone).
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from src.shared.infrastructure.security.password_hasher import MAX_PASSWORD_BYTES

from ...domain.enums.user_role import UserRole
from ...domain.enums.user_status import UserStatus

#: Minimum length for a password an admin sets. The same floor the bootstrap
#: script applies to ADMIN_PASSWORD.
MIN_PASSWORD_LENGTH = 12


def _check_password(value: str) -> str:
    """Length rules, in characters at the bottom and bytes at the top.

    The ceiling is bcrypt's 72 BYTES. Checked here so a long passphrase is a
    422 naming the field, rather than the hasher's ValueError surfacing as a
    500 from inside the use case.
    """
    if len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must not exceed {MAX_PASSWORD_BYTES} bytes")
    return value


class UserResponseSchema(BaseModel):
    """
    A staff account as the dashboard receives it.

    ``password_hash`` is absent by construction — because the field is not
    declared here, ``from_attributes`` conversion cannot surface it.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole
    status: UserStatus
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class UserCreateSchema(BaseModel):
    """What the Users screen sends to add a staff account."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=40)
    role: UserRole = Field(default=UserRole.AGENT)
    password: str = Field(description="Initial password, at least 12 characters")

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        """Apply the length rules."""
        return _check_password(value)

    @field_validator("phone")
    @classmethod
    def blank_to_none(cls, value: Optional[str]) -> Optional[str]:
        """An untouched optional field arrives as ``""``; store null."""
        return value or None


class UserUpdateSchema(BaseModel):
    """
    A partial update. Omitted keys are left alone.

    `password` here is an admin RESETTING someone's password. A user changing
    their own goes through `/admin/account/password` (`account_schema.py`),
    which requires the current one.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=40)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: Optional[str]) -> Optional[str]:
        """Apply the length rules when a new password is supplied."""
        return None if value is None else _check_password(value)

    @field_validator("phone")
    @classmethod
    def blank_to_none(cls, value: Optional[str]) -> Optional[str]:
        """An emptied field means "remove the number"."""
        return value or None
