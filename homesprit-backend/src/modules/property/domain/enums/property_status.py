"""Property lifecycle status."""

from enum import Enum


class PropertyStatus(str, Enum):
    """
    Where a listing stands.

    - DRAFT: being written; invisible to the public.
    - AVAILABLE: on the market.
    - UNDER_OFFER: an offer is accepted but the deal has not closed.
    - SOLD / RENTED: the deal closed. The listing stays VIEWABLE so a link
      someone shared still resolves, with a badge saying it is gone.
    - ARCHIVED: taken down; invisible to the public, kept for the record.

    Two public rules hang off this, and they are different on purpose — the
    same split hgs-backend makes between a job that is LISTED and one that is
    merely VIEWABLE:

    - ``LISTED`` — what search results show. Only homes a visitor can still
      act on.
    - ``VIEWABLE`` — what a detail page will render. Also sold and rented
      homes, so an old link does not 404.

    Both sets are applied in ONE place, ``PropertyRepository``.
    """

    DRAFT = "draft"
    AVAILABLE = "available"
    UNDER_OFFER = "under_offer"
    SOLD = "sold"
    RENTED = "rented"
    ARCHIVED = "archived"

    @classmethod
    def all_values(cls) -> list[str]:
        """Return every valid status value."""
        return [status.value for status in cls]


#: Shown in public search results.
LISTED_STATUSES = frozenset({PropertyStatus.AVAILABLE, PropertyStatus.UNDER_OFFER})

#: Rendered on a public detail page.
VIEWABLE_STATUSES = LISTED_STATUSES | {PropertyStatus.SOLD, PropertyStatus.RENTED}

#: Statuses an inquiry may be sent about. A sold home takes no questions.
ENQUIRABLE_STATUSES = LISTED_STATUSES
