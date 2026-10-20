"""Integration tests for the public inquiry form and the scoped inbox."""

import pytest
from fastapi.testclient import TestClient

PUBLIC = "/api/v1/public/inquiries"
ADMIN = "/api/v1/admin/inquiries"


def _inquiry(**overrides) -> dict:
    body = {
        "property_slug": "bright-two-bed-flat",
        "name": "Priya Raman",
        "email": "priya@example.com",
        "phone": "",
        "message": "Could I view the flat on Saturday morning?",
    }
    body.update(overrides)
    return body


@pytest.mark.integration
class TestPublicSubmit:
    def test_acknowledges_without_echoing_the_row(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        create_listing(agent_headers)
        response = client.post(PUBLIC, json=_inquiry())
        assert response.status_code == 201
        assert set(response.json()["data"]) == {"message"}

    def test_general_inquiry_needs_no_listing(self, client: TestClient):
        response = client.post(PUBLIC, json=_inquiry(property_slug=None))
        assert response.status_code == 201

    def test_unknown_or_draft_listing_is_404(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        create_listing(agent_headers, slug="draft-home", status="draft")
        assert (
            client.post(PUBLIC, json=_inquiry(property_slug="nope")).status_code == 404
        )
        assert (
            client.post(PUBLIC, json=_inquiry(property_slug="draft-home")).status_code
            == 404
        )

    def test_sold_listing_takes_no_questions(
        self, client: TestClient, agent_headers: dict, create_listing
    ):
        create_listing(agent_headers, slug="sold-home", status="sold")
        assert (
            client.post(PUBLIC, json=_inquiry(property_slug="sold-home")).status_code
            == 422
        )

    def test_short_message_is_refused(self, client: TestClient):
        response = client.post(PUBLIC, json=_inquiry(property_slug=None, message="hi"))
        assert response.status_code == 422
        assert "message" in response.json()["details"]["fields"]

    def test_rate_limited_per_address(self, client: TestClient):
        headers = {"X-Forwarded-For": "203.0.113.9"}
        body = _inquiry(property_slug=None)
        for _ in range(5):
            assert client.post(PUBLIC, json=body, headers=headers).status_code == 201
        limited = client.post(PUBLIC, json=body, headers=headers)
        assert limited.status_code == 429 and "Retry-After" in limited.headers
        other = client.post(
            PUBLIC, json=body, headers={"X-Forwarded-For": "203.0.113.10"}
        )
        assert other.status_code == 201


@pytest.mark.integration
class TestInboxScope:
    @pytest.fixture(autouse=True)
    def _inquiries(
        self,
        client: TestClient,
        agent_headers: dict,
        other_agent_headers: dict,
        create_listing,
    ):
        create_listing(agent_headers, slug="mine")
        create_listing(other_agent_headers, slug="theirs")
        client.post(PUBLIC, json=_inquiry(property_slug="mine", email="a@example.com"))
        client.post(
            PUBLIC, json=_inquiry(property_slug="theirs", email="b@example.com")
        )
        client.post(PUBLIC, json=_inquiry(property_slug=None, email="c@example.com"))

    def test_admin_sees_everything(self, client: TestClient, admin_headers: dict):
        page = client.get(ADMIN, headers=admin_headers).json()["data"]
        assert page["total"] == 3

    def test_agent_sees_only_inquiries_about_their_listings(
        self, client: TestClient, agent_headers: dict
    ):
        page = client.get(ADMIN, headers=agent_headers).json()["data"]
        assert [r["email"] for r in page["items"]] == ["a@example.com"]
        assert page["items"][0]["listing"]["slug"] == "mine"

        counts = client.get(f"{ADMIN}/counts", headers=agent_headers).json()["data"]
        assert counts == {"new": 1, "contacted": 0, "closed": 0, "total": 1}

    def test_agent_cannot_open_or_change_anothers_inquiry(
        self, client: TestClient, admin_headers: dict, agent_headers: dict
    ):
        rows = client.get(ADMIN, headers=admin_headers).json()["data"]["items"]
        for row in rows:
            if row["email"] == "a@example.com":
                continue
            url = f"{ADMIN}/{row['id']}"
            assert client.get(url, headers=agent_headers).status_code == 403
            assert (
                client.patch(
                    url, json={"status": "closed"}, headers=agent_headers
                ).status_code
                == 403
            )

    def test_status_change_and_filter(self, client: TestClient, agent_headers: dict):
        row = client.get(ADMIN, headers=agent_headers).json()["data"]["items"][0]
        updated = client.patch(
            f"{ADMIN}/{row['id']}", json={"status": "contacted"}, headers=agent_headers
        )
        assert (
            updated.status_code == 200
            and updated.json()["data"]["status"] == "contacted"
        )

        new_only = client.get(ADMIN, params={"status": "new"}, headers=agent_headers)
        assert new_only.json()["data"]["total"] == 0

    def test_invalid_status_is_422(self, client: TestClient, agent_headers: dict):
        row = client.get(ADMIN, headers=agent_headers).json()["data"]["items"][0]
        response = client.patch(
            f"{ADMIN}/{row['id']}", json={"status": "deleted"}, headers=agent_headers
        )
        assert response.status_code == 422
