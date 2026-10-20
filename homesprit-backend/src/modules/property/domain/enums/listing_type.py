"""Listing type enum."""

from enum import Enum


class ListingType(str, Enum):
    """
    Whether a listing is for sale or for rent.

    It changes what ``price`` means — a sale price, or rent per month — which
    is why the frontend formats the two differently and the search filters on
    it before any price range.
    """

    SALE = "sale"
    RENT = "rent"

    @classmethod
    def all_values(cls) -> list[str]:
        """Return every valid listing type value."""
        return [kind.value for kind in cls]
