"""Property type enum."""

from enum import Enum


class PropertyType(str, Enum):
    """
    What kind of property a listing is. A search filter and a card label.

    Stored as a native Postgres enum, values lowercase, like every enum here.
    """

    APARTMENT = "apartment"
    HOUSE = "house"
    TOWNHOUSE = "townhouse"
    VILLA = "villa"
    LAND = "land"
    COMMERCIAL = "commercial"

    @classmethod
    def all_values(cls) -> list[str]:
        """Return every valid type value."""
        return [kind.value for kind in cls]
