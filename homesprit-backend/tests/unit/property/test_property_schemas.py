"""Unit tests for the property write schemas' validation rules."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from src.modules.property.application.schemas.property_schema import (
    MAX_FEATURES,
    PropertyCreateSchema,
    PropertyImageWriteSchema,
    PropertyUpdateSchema,
)


def _valid(**overrides) -> dict:
    body = {
        "title": "Bright two-bed flat",
        "slug": "bright-two-bed-flat",
        "description": "A bright two-bedroom flat near the park, freshly painted.",
        "property_type": "apartment",
        "listing_type": "rent",
        "price": 1800,
        "address": "1 Main St",
        "city": "Austin",
    }
    body.update(overrides)
    return body


@pytest.mark.unit
class TestPropertyCreateSchema:
    def test_minimal_body_gets_sensible_defaults(self):
        schema = PropertyCreateSchema(**_valid())
        assert schema.status.value == "draft"
        assert schema.features == []
        assert schema.images == []
        assert schema.is_featured is False

    def test_slug_is_lowercased(self):
        assert PropertyCreateSchema(**_valid(slug="Bright-Flat")).slug == "bright-flat"

    @pytest.mark.parametrize("slug", ["has space", "slash/es", "ümlaut!", "  "])
    def test_slug_rejects_url_unsafe_values(self, slug: str):
        with pytest.raises(ValidationError):
            PropertyCreateSchema(**_valid(slug=slug))

    @pytest.mark.parametrize("price", [0, -5, 10_000_000_001])
    def test_price_must_be_positive_and_plausible(self, price: int):
        with pytest.raises(ValidationError):
            PropertyCreateSchema(**_valid(price=price))

    def test_features_are_trimmed_and_deduplicated(self):
        schema = PropertyCreateSchema(
            **_valid(features=[" Pool ", "pool", "", "Garden"])
        )
        assert schema.features == ["Pool", "Garden"]

    def test_too_many_features_is_rejected(self):
        with pytest.raises(ValidationError):
            PropertyCreateSchema(
                **_valid(features=[f"F{i}" for i in range(MAX_FEATURES + 1)])
            )

    def test_year_built_must_be_plausible(self):
        next_year = datetime.now(UTC).year + 1
        assert (
            PropertyCreateSchema(**_valid(year_built=next_year)).year_built == next_year
        )
        with pytest.raises(ValidationError):
            PropertyCreateSchema(**_valid(year_built=next_year + 1))
        with pytest.raises(ValidationError):
            PropertyCreateSchema(**_valid(year_built=1700))

    def test_blank_neighborhood_is_stored_as_null(self):
        assert PropertyCreateSchema(**_valid(neighborhood="")).neighborhood is None


@pytest.mark.unit
class TestImageSchema:
    def test_https_url_is_accepted(self):
        assert PropertyImageWriteSchema(url="https://example.com/a.jpg").url

    @pytest.mark.parametrize(
        "url", ["javascript:alert(1)", "/relative.jpg", "ftp://x/y"]
    )
    def test_non_http_url_is_rejected(self, url: str):
        with pytest.raises(ValidationError):
            PropertyImageWriteSchema(url=url)


@pytest.mark.unit
class TestPropertyUpdateSchema:
    def test_omitted_keys_are_not_set(self):
        schema = PropertyUpdateSchema(price=2000)
        assert schema.model_dump(exclude_unset=True) == {"price": 2000}

    def test_explicit_empty_image_list_is_kept(self):
        # `[]` means "remove every photo", which is not the same as omitting it.
        assert PropertyUpdateSchema(images=[]).model_dump(exclude_unset=True) == {
            "images": []
        }
