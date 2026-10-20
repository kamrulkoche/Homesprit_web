"""User role enum for role-based access control."""

from enum import Enum


class UserRole(str, Enum):
    """
    Staff role enumeration for RBAC.

    hgs-backend ships one member (ADMIN) and notes that adding a second is "a
    new member plus a migration, not a refactor". Homesprit is that second
    member: `hasAccess(roles=[...])` is unchanged, it simply has two values to
    choose from.

    - ADMIN: everything — every listing, every inquiry, staff accounts.
    - AGENT: their OWN listings and the inquiries about them. The ownership half
      of that rule is enforced in the use cases, not here; a role says what
      kind of thing you may do, the row says whether this one is yours.
    """

    ADMIN = "admin"
    AGENT = "agent"

    @classmethod
    def all_roles(cls) -> list[str]:
        """Return all valid role values."""
        return [role.value for role in cls]
