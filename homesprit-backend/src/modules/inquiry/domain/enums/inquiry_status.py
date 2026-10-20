"""Inquiry status enum."""

from enum import Enum


class InquiryStatus(str, Enum):
    """
    Where a visitor's inquiry stands — the same three states as hgs-backend's
    ContactStatus.

    - NEW: Nobody has replied. The dashboard counts these.
    - CONTACTED: A reply has gone out.
    - CLOSED: Nothing more to do.

    A native Postgres enum here, unlike HGS's TEXT + CHECK: that table was
    adopted from the website's own SQL and kept its shape, whereas this one is
    created by our own migration.
    """

    NEW = "new"
    CONTACTED = "contacted"
    CLOSED = "closed"

    @classmethod
    def all_statuses(cls) -> list[str]:
        """Return all valid status values."""
        return [status.value for status in cls]
