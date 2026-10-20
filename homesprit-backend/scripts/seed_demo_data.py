"""Load demo agents, listings and inquiries.

    ./venv/Scripts/python.exe scripts/seed_demo_data.py            # write
    ./venv/Scripts/python.exe scripts/seed_demo_data.py --dry-run  # report only

Follows the rules hgs-backend's seed scripts follow:

- IDEMPOTENT, keyed by natural key — a user by email, a listing by slug, an
  inquiry by (email, listing). A second run reports what it skipped and writes
  nothing.
- An existing row is NEVER updated. Once someone has edited a seeded listing
  in the dashboard, a re-run must not quietly overwrite their work.

Refuses to run when ENVIRONMENT=prod: demo listings on a live site would be
published fiction.

The agents' password comes from DEMO_AGENT_PASSWORD, never from this file.
The admin is not created here — the app bootstraps it from ADMIN_EMAIL /
ADMIN_PASSWORD on startup.
"""

import argparse
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from src.modules.inquiry.domain.entities.inquiry import Inquiry  # noqa: E402
from src.modules.inquiry.domain.enums.inquiry_status import InquiryStatus  # noqa: E402
from src.modules.property.domain.entities.property import Property  # noqa: E402
from src.modules.property.domain.entities.property_image import (  # noqa: E402
    PropertyImage,
)
from src.modules.property.domain.enums.listing_type import ListingType  # noqa: E402
from src.modules.property.domain.enums.property_status import (  # noqa: E402
    PropertyStatus,
)
from src.modules.property.domain.enums.property_type import PropertyType  # noqa: E402
from src.modules.user.application.schemas.user_schema import (  # noqa: E402
    MIN_PASSWORD_LENGTH,
)
from src.modules.user.domain.entities.user import User  # noqa: E402
from src.modules.user.domain.enums.user_role import UserRole  # noqa: E402
from src.shared.infrastructure.database import get_db_context  # noqa: E402
from src.shared.infrastructure.security.password_hasher import (  # noqa: E402
    hash_password,
)
from src.shared.utils.config import settings  # noqa: E402


def photo(photo_id: str, alt: str) -> Dict[str, str]:
    """An Unsplash image at a size the gallery can use."""
    return {
        "url": f"https://images.unsplash.com/photo-{photo_id}?auto=format&fit=crop&w=1600&q=80",
        "alt_text": alt,
    }


AGENTS: List[Dict[str, str]] = [
    {
        "name": "Maya Chen",
        "email": "maya.chen@homesprit.dev",
        "phone": "+1 512 555 0142",
    },
    {
        "name": "Daniel Okafor",
        "email": "daniel.okafor@homesprit.dev",
        "phone": "+1 303 555 0187",
    },
]

KITCHEN = photo("1600566753190-17f0baa2a6c3", "Bright kitchen with an island")
LIVING = photo("1600607687939-ce8a6c25118c", "Open-plan living room")
BEDROOM = photo("1505691938895-1758d7feb511", "Main bedroom with large windows")

# (agent email, days since listed or None for a draft, fields)
LISTINGS: List[Dict[str, Any]] = [
    {
        "agent": "maya.chen@homesprit.dev",
        "listed_days_ago": 2,
        "title": "Modern four-bedroom family home in Zilker",
        "slug": "modern-family-home-zilker",
        "property_type": PropertyType.HOUSE,
        "listing_type": ListingType.SALE,
        "status": PropertyStatus.AVAILABLE,
        "price": 1250000,
        "address": "2104 Barton Hills Dr",
        "city": "Austin",
        "neighborhood": "Zilker",
        "bedrooms": 4,
        "bathrooms": 3,
        "area_sqft": 2850,
        "year_built": 2019,
        "parking_spaces": 2,
        "features": [
            "Open-plan kitchen",
            "Home office",
            "Solar panels",
            "Fenced garden",
        ],
        "is_featured": True,
        "description": (
            "A light-filled modern home a short walk from Zilker Park and Barton Springs. "
            "The ground floor opens into one long kitchen, dining and living space with "
            "sliding doors onto a private garden, and a separate home office faces the "
            "street. Upstairs are four bedrooms, including a main suite with a walk-in "
            "closet and a double vanity. Rooftop solar keeps summer bills low."
        ),
        "images": [
            photo("1600596542815-ffad4c1539a9", "Front of the house at dusk"),
            LIVING,
            KITCHEN,
            BEDROOM,
        ],
    },
    {
        "agent": "maya.chen@homesprit.dev",
        "listed_days_ago": 6,
        "title": "Downtown loft with skyline views",
        "slug": "downtown-loft-skyline-views",
        "property_type": PropertyType.APARTMENT,
        "listing_type": ListingType.RENT,
        "status": PropertyStatus.AVAILABLE,
        "price": 3200,
        "address": "360 Nueces St, Unit 2405",
        "city": "Austin",
        "neighborhood": "Downtown",
        "bedrooms": 1,
        "bathrooms": 1,
        "area_sqft": 910,
        "year_built": 2016,
        "parking_spaces": 1,
        "features": ["Floor-to-ceiling windows", "Gym", "Rooftop pool", "Concierge"],
        "is_featured": True,
        "description": (
            "A twenty-fourth-floor loft with floor-to-ceiling windows on two sides and an "
            "uninterrupted view of the Capitol. Polished concrete floors, a chef's kitchen "
            "and a sleeping area that closes off with sliding panels. Residents share a "
            "rooftop pool, a gym and a 24-hour concierge. Twelve-month lease."
        ),
        "images": [
            photo("1502672260266-1c1ef2d93688", "Loft living area"),
            photo("1522708323590-d24dbb6b0267", "Living room with city views"),
            photo("1484154218962-a197022b5858", "Loft kitchen"),
        ],
    },
    {
        "agent": "maya.chen@homesprit.dev",
        "listed_days_ago": 15,
        "title": "Craftsman bungalow on a quiet street",
        "slug": "craftsman-bungalow-hyde-park",
        "property_type": PropertyType.HOUSE,
        "listing_type": ListingType.SALE,
        "status": PropertyStatus.UNDER_OFFER,
        "price": 689000,
        "address": "4410 Avenue C",
        "city": "Austin",
        "neighborhood": "Hyde Park",
        "bedrooms": 3,
        "bathrooms": 2,
        "area_sqft": 1640,
        "year_built": 1938,
        "parking_spaces": 1,
        "features": ["Original hardwood floors", "Front porch", "Detached studio"],
        "is_featured": False,
        "description": (
            "A carefully restored 1938 craftsman with its original oak floors, a deep front "
            "porch and a detached studio out back that works as a guest room or workshop. "
            "The kitchen and both bathrooms were redone in 2021. Walking distance to the "
            "university and Hyde Park's cafés."
        ),
        "images": [
            photo("1570129477492-45c003edd2be", "Bungalow with a front porch"),
            photo("1493809842364-78817add7ffb", "Sitting room"),
        ],
    },
    {
        "agent": "maya.chen@homesprit.dev",
        "listed_days_ago": 40,
        "title": "Hill Country villa with pool",
        "slug": "hill-country-villa-pool",
        "property_type": PropertyType.VILLA,
        "listing_type": ListingType.SALE,
        "status": PropertyStatus.SOLD,
        "price": 2400000,
        "address": "800 Westlake Dr",
        "city": "Austin",
        "neighborhood": "Westlake",
        "bedrooms": 5,
        "bathrooms": 5,
        "area_sqft": 5200,
        "year_built": 2012,
        "parking_spaces": 3,
        "features": ["Infinity pool", "Wine cellar", "Guest house", "Lake views"],
        "is_featured": False,
        "description": (
            "A limestone villa on two acres above Lake Austin, with an infinity pool, a "
            "separate guest house and a temperature-controlled wine cellar. Sold — kept "
            "on the site so links shared during the sale still resolve."
        ),
        "images": [
            photo("1613490493576-7fde63acd811", "Villa and pool at sunset"),
            photo("1605276374104-dee2a0ed3cd6", "Villa exterior"),
        ],
    },
    {
        "agent": "maya.chen@homesprit.dev",
        "listed_days_ago": None,
        "title": "East Austin townhouse — coming soon",
        "slug": "east-austin-townhouse",
        "property_type": PropertyType.TOWNHOUSE,
        "listing_type": ListingType.SALE,
        "status": PropertyStatus.DRAFT,
        "price": 545000,
        "address": "1187 Chicon St",
        "city": "Austin",
        "neighborhood": "East Austin",
        "bedrooms": 2,
        "bathrooms": 2,
        "area_sqft": 1320,
        "year_built": 2023,
        "parking_spaces": 1,
        "features": ["Roof deck", "EV charger"],
        "is_featured": False,
        "description": (
            "A new-build townhouse with a private roof deck and an EV charger in the "
            "garage. Still a draft: photos and the final price are on their way."
        ),
        "images": [],
    },
    {
        "agent": "daniel.okafor@homesprit.dev",
        "listed_days_ago": 1,
        "title": "Mountain-view townhouse near Wash Park",
        "slug": "mountain-view-townhouse-wash-park",
        "property_type": PropertyType.TOWNHOUSE,
        "listing_type": ListingType.SALE,
        "status": PropertyStatus.AVAILABLE,
        "price": 849000,
        "address": "520 S Gaylord St",
        "city": "Denver",
        "neighborhood": "Washington Park",
        "bedrooms": 3,
        "bathrooms": 3,
        "area_sqft": 2100,
        "year_built": 2018,
        "parking_spaces": 2,
        "features": ["Rooftop terrace", "Mountain views", "Attached garage"],
        "is_featured": True,
        "description": (
            "A three-storey townhouse two blocks from Washington Park with a rooftop "
            "terrace that looks straight at the Front Range. Gas fireplace, quartz kitchen "
            "and a two-car attached garage with storage."
        ),
        "images": [
            photo("1600585154340-be6161a56a0c", "Townhouse exterior"),
            photo("1600210492486-724fe5c67fb0", "Living room with fireplace"),
            photo("1556909114-f6e7ad7d3136", "Kitchen"),
        ],
    },
    {
        "agent": "daniel.okafor@homesprit.dev",
        "listed_days_ago": 4,
        "title": "Sunny two-bed apartment in LoHi",
        "slug": "sunny-two-bed-lohi",
        "property_type": PropertyType.APARTMENT,
        "listing_type": ListingType.RENT,
        "status": PropertyStatus.AVAILABLE,
        "price": 2650,
        "address": "2930 Umatilla St, Apt 4B",
        "city": "Denver",
        "neighborhood": "Lower Highland",
        "bedrooms": 2,
        "bathrooms": 2,
        "area_sqft": 1080,
        "year_built": 2015,
        "parking_spaces": 1,
        "features": ["Balcony", "In-unit laundry", "Pet friendly"],
        "is_featured": False,
        "description": (
            "A corner two-bedroom with morning and afternoon sun, a south-facing balcony "
            "and in-unit laundry. Pets welcome. Steps from the Highland Bridge and the "
            "restaurants on 32nd Avenue."
        ),
        "images": [
            photo("1560448204-e02f11c3d0e2", "Apartment living room"),
            photo("1540518614846-7eded433c457", "Second bedroom"),
        ],
    },
    {
        "agent": "daniel.okafor@homesprit.dev",
        "listed_days_ago": 9,
        "title": "Classic brick family home with big yard",
        "slug": "brick-family-home-park-hill",
        "property_type": PropertyType.HOUSE,
        "listing_type": ListingType.SALE,
        "status": PropertyStatus.AVAILABLE,
        "price": 975000,
        "address": "2245 Dexter St",
        "city": "Denver",
        "neighborhood": "Park Hill",
        "bedrooms": 4,
        "bathrooms": 2,
        "area_sqft": 2400,
        "year_built": 1926,
        "parking_spaces": 2,
        "features": ["Large yard", "Finished basement", "Original fireplace"],
        "is_featured": True,
        "description": (
            "A 1926 brick home on a tree-lined Park Hill street, with a deep back yard, a "
            "finished basement and the original tiled fireplace. Updated electrics and a "
            "new roof in 2022."
        ),
        "images": [
            photo("1568605114967-8130f3a36994", "Brick house and front lawn"),
            photo("1449844908441-8829872d2607", "House from the street"),
            LIVING,
        ],
    },
    {
        "agent": "daniel.okafor@homesprit.dev",
        "listed_days_ago": 12,
        "title": "Ground-floor retail unit on Broadway",
        "slug": "retail-unit-broadway",
        "property_type": PropertyType.COMMERCIAL,
        "listing_type": ListingType.RENT,
        "status": PropertyStatus.AVAILABLE,
        "price": 5800,
        "address": "71 S Broadway",
        "city": "Denver",
        "neighborhood": "Baker",
        "bedrooms": 0,
        "bathrooms": 1,
        "area_sqft": 1900,
        "year_built": 1955,
        "parking_spaces": 0,
        "features": ["Street frontage", "Storage room", "Three-phase power"],
        "is_featured": False,
        "description": (
            "A ground-floor retail unit with twenty-two feet of glass frontage on South "
            "Broadway, a rear storage room and three-phase power. Previously a design "
            "studio; suits a shop, gallery or café."
        ),
        "images": [photo("1486406146926-c627a92ad1ab", "Commercial building")],
    },
    {
        "agent": "daniel.okafor@homesprit.dev",
        "listed_days_ago": 20,
        "title": "Five-acre building plot outside Boulder",
        "slug": "building-plot-boulder",
        "property_type": PropertyType.LAND,
        "listing_type": ListingType.SALE,
        "status": PropertyStatus.AVAILABLE,
        "price": 410000,
        "address": "Lee Hill Rd",
        "city": "Boulder",
        "neighborhood": None,
        "bedrooms": 0,
        "bathrooms": 0,
        "area_sqft": None,
        "year_built": None,
        "parking_spaces": 0,
        "features": ["Utilities at the boundary", "Approved for one dwelling"],
        "is_featured": False,
        "description": (
            "Five gently sloping acres ten minutes from downtown Boulder, approved for a "
            "single dwelling, with power and water at the boundary and open views west."
        ),
        "images": [photo("1500382017468-9049fed747ef", "Open field at sunset")],
    },
    {
        "agent": "daniel.okafor@homesprit.dev",
        "listed_days_ago": 30,
        "title": "Seattle waterfront condo",
        "slug": "seattle-waterfront-condo",
        "property_type": PropertyType.APARTMENT,
        "listing_type": ListingType.SALE,
        "status": PropertyStatus.AVAILABLE,
        "price": 1095000,
        "address": "1521 Alaskan Way, Unit 802",
        "city": "Seattle",
        "neighborhood": "Belltown",
        "bedrooms": 2,
        "bathrooms": 2,
        "area_sqft": 1350,
        "year_built": 2008,
        "parking_spaces": 1,
        "features": ["Water views", "Doorman", "Storage unit"],
        "is_featured": False,
        "description": (
            "An eighth-floor condo looking straight over Elliott Bay to the Olympics, "
            "with a doorman building, a deeded parking space and a storage unit."
        ),
        "images": [
            photo("1512917774080-9991f1c4c750", "Building exterior"),
            photo("1600047509807-ba8f99d2cdde", "Living room"),
        ],
    },
    {
        "agent": "maya.chen@homesprit.dev",
        "listed_days_ago": 8,
        "title": "Garden apartment in Pearl District",
        "slug": "garden-apartment-pearl-district",
        "property_type": PropertyType.APARTMENT,
        "listing_type": ListingType.RENT,
        "status": PropertyStatus.AVAILABLE,
        "price": 2100,
        "address": "1200 NW Marshall St, Unit 103",
        "city": "Portland",
        "neighborhood": "Pearl District",
        "bedrooms": 1,
        "bathrooms": 1,
        "area_sqft": 740,
        "year_built": 2011,
        "parking_spaces": 0,
        "features": ["Private patio", "Bike storage", "Pet friendly"],
        "is_featured": False,
        "description": (
            "A ground-floor one-bedroom with its own walled patio garden, two blocks from "
            "the streetcar. Secure bike storage; cats and small dogs welcome."
        ),
        "images": [
            photo("1583608205776-bfd35f0d9f83", "Apartment interior"),
            photo("1592595896551-12b371d546d5", "Patio"),
        ],
    },
    {
        "agent": "maya.chen@homesprit.dev",
        "listed_days_ago": 3,
        "title": "Mid-century house with a pool in Coral Gables",
        "slug": "mid-century-pool-house-coral-gables",
        "property_type": PropertyType.HOUSE,
        "listing_type": ListingType.SALE,
        "status": PropertyStatus.AVAILABLE,
        "price": 1675000,
        "address": "612 Alhambra Cir",
        "city": "Miami",
        "neighborhood": "Coral Gables",
        "bedrooms": 4,
        "bathrooms": 3,
        "area_sqft": 2700,
        "year_built": 1962,
        "parking_spaces": 2,
        "features": ["Pool", "Impact windows", "Outdoor kitchen"],
        "is_featured": True,
        "description": (
            "A single-storey 1962 house wrapped around a pool and an outdoor kitchen, with "
            "impact windows throughout and terrazzo floors restored to their original "
            "shine."
        ),
        "images": [
            photo("1580587771525-78b9dba3b914", "House and pool"),
            photo("1576941089067-2de3c901e126", "Pool terrace"),
            photo("1564013799919-ab600027ffc6", "Front of the house"),
        ],
    },
]

INQUIRIES: List[Dict[str, Any]] = [
    {
        "slug": "modern-family-home-zilker",
        "name": "Priya Raman",
        "email": "priya.raman@example.com",
        "phone": "+1 512 555 0110",
        "message": "We'd love to view this on Saturday morning. Is the office large enough for two desks?",
        "status": InquiryStatus.NEW,
    },
    {
        "slug": "downtown-loft-skyline-views",
        "name": "Tom Becker",
        "email": "tom.becker@example.com",
        "phone": None,
        "message": "Is a six-month lease possible? I'm relocating for a contract role.",
        "status": InquiryStatus.CONTACTED,
    },
    {
        "slug": "mountain-view-townhouse-wash-park",
        "name": "Alicia Gomez",
        "email": "alicia.gomez@example.com",
        "phone": "+1 720 555 0199",
        "message": "Could you share the HOA fees and what they cover? Thanks!",
        "status": InquiryStatus.NEW,
    },
    {
        "slug": "sunny-two-bed-lohi",
        "name": "Sam Lee",
        "email": "sam.lee@example.com",
        "phone": None,
        "message": "Do you accept two medium-sized dogs? Both are very well behaved.",
        "status": InquiryStatus.CLOSED,
    },
    {
        "slug": None,
        "name": "Jordan Ellis",
        "email": "jordan.ellis@example.com",
        "phone": None,
        "message": "I'm looking to sell my condo in Denver next spring. Can someone call me to talk about a valuation?",
        "status": InquiryStatus.NEW,
    },
]


def seed(dry_run: bool) -> None:
    """Write whatever is missing; report everything."""
    if settings.environment == "prod":
        raise SystemExit("Refusing to seed demo data with ENVIRONMENT=prod.")

    password = None
    if not dry_run:
        from os import getenv

        password = getenv("DEMO_AGENT_PASSWORD") or ""
        if len(password) < MIN_PASSWORD_LENGTH:
            raise SystemExit(
                f"Set DEMO_AGENT_PASSWORD (at least {MIN_PASSWORD_LENGTH} characters) in .env first."
            )
    password_hash = hash_password(password) if password else ""

    now = datetime.now(UTC)
    created = {"users": 0, "properties": 0, "inquiries": 0}
    skipped = {"users": 0, "properties": 0, "inquiries": 0}

    with get_db_context() as db:
        agents: Dict[str, User] = {}
        for spec in AGENTS:
            existing = (
                db.execute(select(User).where(User.email == spec["email"]))
                .scalars()
                .first()
            )
            if existing is not None:
                agents[spec["email"]] = existing
                skipped["users"] += 1
                continue
            created["users"] += 1
            print(f"  + agent    {spec['email']}")
            if dry_run:
                continue
            user = User(**spec, password_hash=password_hash, role=UserRole.AGENT)
            db.add(user)
            db.flush()
            agents[spec["email"]] = user

        listings: Dict[str, Property] = {}
        for spec in LISTINGS:
            spec = dict(spec)
            existing = (
                db.execute(select(Property).where(Property.slug == spec["slug"]))
                .scalars()
                .first()
            )
            if existing is not None:
                listings[spec["slug"]] = existing
                skipped["properties"] += 1
                continue
            created["properties"] += 1
            print(f"  + listing  {spec['slug']}")
            owner = agents.get(spec.pop("agent"))
            if dry_run or owner is None:
                continue
            days = spec.pop("listed_days_ago")
            images = spec.pop("images")
            listing = Property(
                **spec,
                agent_id=owner.id,
                listed_at=None if days is None else now - timedelta(days=days),
                created_by=owner.id,
                updated_by=owner.id,
            )
            listing.images = [
                PropertyImage(
                    url=image["url"], alt_text=image["alt_text"], display_order=i
                )
                for i, image in enumerate(images)
            ]
            db.add(listing)
            db.flush()
            listings[listing.slug] = listing

        for spec in INQUIRIES:
            listing = listings.get(spec["slug"]) if spec["slug"] else None
            property_id = listing.id if listing else None
            statement = select(Inquiry).where(Inquiry.email == spec["email"])
            statement = statement.where(
                Inquiry.property_id == property_id
                if property_id
                else Inquiry.property_id.is_(None)
            )
            if db.execute(statement).scalars().first() is not None:
                skipped["inquiries"] += 1
                continue
            created["inquiries"] += 1
            print(f"  + inquiry  {spec['email']} -> {spec['slug'] or '(general)'}")
            if dry_run or (spec["slug"] and listing is None):
                continue
            db.add(
                Inquiry(
                    property_id=property_id,
                    name=spec["name"],
                    email=spec["email"],
                    phone=spec["phone"],
                    message=spec["message"],
                    status=spec["status"],
                )
            )

        if dry_run:
            db.rollback()

    verb = "Would create" if dry_run else "Created"
    print(
        f"{verb}: {created['users']} agents, {created['properties']} listings, "
        f"{created['inquiries']} inquiries. Skipped (already present): "
        f"{skipped['users']} agents, {skipped['properties']} listings, "
        f"{skipped['inquiries']} inquiries."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dry-run", action="store_true", help="Report without writing")
    seed(parser.parse_args().dry_run)
