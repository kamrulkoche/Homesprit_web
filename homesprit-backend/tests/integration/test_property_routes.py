"""Integration tests for listings: dashboard CRUD with ownership, and public search."""

import pytest
from fastapi.testclient import TestClient

from src.modules.user.domain.entities.user import User

ADMIN = "/api/v1/admin/properties"
PUBLIC = "/api/v1/public/properties"


@pytest.mark.integration
class TestAdminCrud:
    def test_requires_sign_in(self, client: TestClient):
        assert client.get(ADMIN).status_code == 401

    def test_agent_creates_a_listing_they_own(
        self, client: TestClient, agent: User, agent_headers: dict, create_listing
    ):
        row = create_listing(agent_headers)
        assert row["agent_id"] == str(agent.id)
        assert row["agent"]["name"] == agent.name
        assert [i["display_order"] for i in row["images"]] == [0, 1]
        assert row["listed_at"] is not None  # created straight onto the market
        assert row["is_active"] is True

    def test_draft_has_no_listed_date_until_published(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        row = create_listing(agent_headers, status="draft")
        assert row["listed_at"] is None

        published = client.patch(
            f"{ADMIN}/{row['id']}", json={"status": "available"}, headers=agent_headers
        ).json()["data"]
        assert published["listed_at"] is not None

    def test_duplicate_slug_is_409(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        create_listing(agent_headers)
        response = client.post(
            ADMIN,
            json={**_body(), "title": "Another flat with the same slug"},
            headers=agent_headers,
        )
        assert response.status_code == 409

    def test_invalid_body_is_422_with_field_errors(
        self, client: TestClient, agent_headers: dict
    ):
        response = client.post(
            ADMIN,
            json={**_body(), "price": 0, "slug": "bad slug"},
            headers=agent_headers,
        )
        assert response.status_code == 422
        fields = response.json()["details"]["fields"]
        assert "price" in fields and "slug" in fields

    def test_partial_update_touches_only_sent_keys(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        row = create_listing(agent_headers)
        updated = client.patch(
            f"{ADMIN}/{row['id']}", json={"price": 1950}, headers=agent_headers
        ).json()["data"]
        assert updated["price"] == 1950
        assert updated["title"] == row["title"]
        assert len(updated["images"]) == 2  # omitted, so untouched

    def test_sending_images_replaces_the_set(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        row = create_listing(agent_headers)
        updated = client.patch(
            f"{ADMIN}/{row['id']}",
            json={"images": [{"url": "https://images.example.com/new.jpg"}]},
            headers=agent_headers,
        ).json()["data"]
        assert [i["url"] for i in updated["images"]] == [
            "https://images.example.com/new.jpg"
        ]

    def test_delete_is_soft_and_keeps_the_slug(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        row = create_listing(agent_headers)
        assert (
            client.delete(f"{ADMIN}/{row['id']}", headers=agent_headers).status_code
            == 200
        )

        assert (
            client.get(f"{ADMIN}/{row['id']}", headers=agent_headers).status_code == 404
        )
        assert client.get(f"{PUBLIC}/{row['slug']}").status_code == 404
        # Deleting twice is reported, not silently accepted.
        assert (
            client.delete(f"{ADMIN}/{row['id']}", headers=agent_headers).status_code
            == 404
        )
        # The slug is still reserved by the soft-deleted row.
        assert (
            client.post(ADMIN, json=_body(), headers=agent_headers).status_code == 409
        )


@pytest.mark.integration
class TestOwnership:
    def test_agent_sees_only_their_own_listings(
        self,
        client: TestClient,
        agent_headers: dict,
        other_agent_headers: dict,
        admin_headers: dict,
        create_listing,
    ):
        create_listing(agent_headers, slug="mine")
        create_listing(other_agent_headers, slug="theirs")

        mine = client.get(ADMIN, headers=agent_headers).json()["data"]
        assert [r["slug"] for r in mine["items"]] == ["mine"]
        assert client.get(ADMIN, headers=admin_headers).json()["data"]["total"] == 2

    def test_agent_cannot_widen_their_scope_with_a_filter(
        self,
        client: TestClient,
        other_agent: User,
        agent_headers: dict,
        other_agent_headers: dict,
        create_listing,
    ):
        create_listing(other_agent_headers, slug="theirs")
        response = client.get(
            ADMIN, params={"agent_id": str(other_agent.id)}, headers=agent_headers
        )
        assert response.json()["data"]["total"] == 0

    def test_agent_cannot_read_edit_or_delete_anothers_listing(
        self,
        client: TestClient,
        agent_headers: dict,
        other_agent_headers: dict,
        create_listing,
    ):
        theirs = create_listing(other_agent_headers)
        url = f"{ADMIN}/{theirs['id']}"
        assert client.get(url, headers=agent_headers).status_code == 403
        assert (
            client.patch(url, json={"price": 1}, headers=agent_headers).status_code
            == 403
        )
        assert client.delete(url, headers=agent_headers).status_code == 403

    def test_admin_can_edit_any_listing(
        self,
        client: TestClient,
        admin_headers: dict,
        agent_headers: dict,
        create_listing,
    ):
        row = create_listing(agent_headers)
        response = client.patch(
            f"{ADMIN}/{row['id']}", json={"price": 2500}, headers=admin_headers
        )
        assert response.status_code == 200

    def test_only_admins_feature(
        self,
        client: TestClient,
        admin_headers: dict,
        agent_headers: dict,
        create_listing,
    ):
        assert (
            client.post(
                ADMIN, json=_body(is_featured=True), headers=agent_headers
            ).status_code
            == 403
        )
        row = create_listing(agent_headers)
        url = f"{ADMIN}/{row['id']}"
        assert (
            client.patch(
                url, json={"is_featured": True}, headers=agent_headers
            ).status_code
            == 403
        )
        assert (
            client.patch(
                url, json={"is_featured": True}, headers=admin_headers
            ).status_code
            == 200
        )

    def test_admin_assigns_an_owner_agent_cannot(
        self,
        client: TestClient,
        agent: User,
        other_agent: User,
        admin_headers: dict,
        agent_headers: dict,
    ):
        assigned = client.post(
            ADMIN, json=_body(agent_id=str(agent.id)), headers=admin_headers
        ).json()["data"]
        assert assigned["agent_id"] == str(agent.id)

        response = client.post(
            ADMIN,
            json=_body(slug="other", agent_id=str(other_agent.id)),
            headers=agent_headers,
        )
        assert response.status_code == 403


@pytest.mark.integration
class TestPublicVisibility:
    def test_search_shows_only_listed_homes(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        create_listing(agent_headers, slug="available", status="available")
        create_listing(agent_headers, slug="offer", status="under_offer")
        for status in ("draft", "sold", "rented", "archived"):
            create_listing(agent_headers, slug=status, status=status)

        page = client.get(PUBLIC).json()["data"]
        assert {r["slug"] for r in page["items"]} == {"available", "offer"}

    def test_public_rows_carry_no_audit_columns(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        create_listing(agent_headers)
        row = client.get(PUBLIC).json()["data"]["items"][0]
        for hidden in (
            "is_active",
            "created_by",
            "updated_by",
            "agent_id",
            "updated_at",
        ):
            assert hidden not in row
        assert set(row["agent"]) == {"id", "name", "email", "phone"}

    def test_sold_detail_renders_draft_does_not(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        create_listing(agent_headers, slug="sold-home", status="sold")
        create_listing(agent_headers, slug="draft-home", status="draft")
        assert client.get(f"{PUBLIC}/sold-home").status_code == 200
        assert client.get(f"{PUBLIC}/draft-home").status_code == 404

    def test_query_string_cannot_widen_status(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        create_listing(agent_headers, slug="draft-home", status="draft")
        assert (
            client.get(PUBLIC, params={"status": "draft"}).json()["data"]["total"] == 0
        )

    def test_featured_and_cities(
        self,
        client: TestClient,
        admin_headers: dict,
        agent_headers: dict,
        create_listing,
    ):
        create_listing(admin_headers, slug="feat", city="Denver", is_featured=True)
        create_listing(agent_headers, slug="plain", city="Austin")
        create_listing(agent_headers, slug="austin-2", city="austin")  # case folds

        featured = client.get(f"{PUBLIC}/featured").json()["data"]
        assert [r["slug"] for r in featured] == ["feat"]

        cities = client.get(f"{PUBLIC}/cities").json()["data"]
        assert {c["city"].lower() for c in cities} == {"austin", "denver"}


@pytest.mark.integration
class TestPublicSearch:
    @pytest.fixture(autouse=True)
    def _listings(self, agent_headers: dict, create_listing):
        create_listing(
            agent_headers,
            slug="cheap-rent",
            listing_type="rent",
            price=1200,
            bedrooms=1,
            city="Austin",
        )
        create_listing(
            agent_headers,
            slug="mid-rent",
            listing_type="rent",
            price=2400,
            bedrooms=2,
            city="Denver",
        )
        create_listing(
            agent_headers,
            slug="house-sale",
            listing_type="sale",
            property_type="house",
            price=650000,
            bedrooms=4,
            city="Austin",
            title="Family house with a garden",
        )

    def _slugs(self, client: TestClient, **params) -> list[str]:
        response = client.get(PUBLIC, params=params)
        assert response.status_code == 200, response.text
        return [r["slug"] for r in response.json()["data"]["items"]]

    def test_filters_combine(self, client: TestClient):
        assert self._slugs(client, listing_type="rent", min_price=2000) == ["mid-rent"]
        assert set(self._slugs(client, city="AUSTIN")) == {"cheap-rent", "house-sale"}
        assert self._slugs(client, min_bedrooms=3) == ["house-sale"]
        assert self._slugs(client, property_type="house") == ["house-sale"]

    def test_free_text_search(self, client: TestClient):
        assert self._slugs(client, search="garden") == ["house-sale"]

    def test_sort_by_price(self, client: TestClient):
        assert self._slugs(client, sort="price", order="asc") == [
            "cheap-rent",
            "mid-rent",
            "house-sale",
        ]

    def test_unknown_sort_falls_back_rather_than_erroring(self, client: TestClient):
        assert len(self._slugs(client, sort="password_hash")) == 3

    def test_pagination(self, client: TestClient):
        page = client.get(PUBLIC, params={"page_size": 2, "page": 2}).json()["data"]
        assert (
            page["total"] == 3 and page["total_pages"] == 2 and len(page["items"]) == 1
        )

    def test_inverted_price_range_is_422(self, client: TestClient):
        assert (
            client.get(PUBLIC, params={"min_price": 900, "max_price": 100}).status_code
            == 422
        )


def _body(**overrides):
    from .conftest import listing_body

    return listing_body(**overrides)
