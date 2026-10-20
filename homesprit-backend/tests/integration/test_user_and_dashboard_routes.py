"""Integration tests for staff management and the dashboard overview."""

import pytest
from fastapi.testclient import TestClient

from src.modules.user.domain.entities.user import User

from .conftest import login

USERS = "/api/v1/admin/users"
DASHBOARD = "/api/v1/admin/dashboard"


@pytest.mark.integration
class TestUsers:
    def test_agents_cannot_manage_staff(self, client: TestClient, agent_headers: dict):
        assert client.get(USERS, headers=agent_headers).status_code == 403
        assert client.post(USERS, json={}, headers=agent_headers).status_code == 403

    def test_admin_creates_an_agent_who_can_then_sign_in(
        self, client: TestClient, admin_headers: dict
    ):
        response = client.post(
            USERS,
            json={
                "name": "New Agent",
                "email": "New.Agent@Homesprit.dev",
                "role": "agent",
                "password": "a-long-enough-password",
            },
            headers=admin_headers,
        )
        assert response.status_code == 201, response.text
        created = response.json()["data"]
        assert created["email"] == "new.agent@homesprit.dev"
        assert "password" not in created and "password_hash" not in created

        signed_in = client.post(
            "/api/v1/auth/login",
            json={
                "email": "new.agent@homesprit.dev",
                "password": "a-long-enough-password",
            },
        )
        assert signed_in.status_code == 200

    def test_duplicate_email_is_409(
        self, client: TestClient, admin_headers: dict, agent: User
    ):
        response = client.post(
            USERS,
            json={
                "name": "Dup",
                "email": agent.email,
                "password": "a-long-enough-password",
            },
            headers=admin_headers,
        )
        assert response.status_code == 409

    def test_short_password_is_422(self, client: TestClient, admin_headers: dict):
        response = client.post(
            USERS,
            json={"name": "Weak", "email": "weak@homesprit.dev", "password": "short"},
            headers=admin_headers,
        )
        assert response.status_code == 422
        assert "password" in response.json()["details"]["fields"]

    def test_role_filter_and_search(
        self, client: TestClient, admin_headers: dict, agent: User, other_agent: User
    ):
        agents = client.get(
            USERS, params={"role": "agent"}, headers=admin_headers
        ).json()["data"]
        assert agents["total"] == 2
        found = client.get(
            USERS, params={"search": "daniel"}, headers=admin_headers
        ).json()["data"]
        assert [u["email"] for u in found["items"]] == [other_agent.email]

    def test_last_admin_cannot_demote_themselves(
        self, client: TestClient, admin: User, admin_headers: dict
    ):
        response = client.patch(
            f"{USERS}/{admin.id}", json={"role": "agent"}, headers=admin_headers
        )
        assert response.status_code == 422

    def test_deactivating_an_agent_ends_their_session(
        self, client: TestClient, admin_headers: dict, agent: User, agent_headers: dict
    ):
        response = client.patch(
            f"{USERS}/{agent.id}", json={"status": "inactive"}, headers=admin_headers
        )
        assert response.status_code == 200
        assert client.get("/api/v1/auth/me", headers=agent_headers).status_code == 401

    def test_promotion_invalidates_the_old_token_claim(
        self, client: TestClient, admin_headers: dict, agent: User, agent_headers: dict
    ):
        client.patch(
            f"{USERS}/{agent.id}", json={"role": "admin"}, headers=admin_headers
        )
        # The old token says "agent"; the database now says "admin". The
        # mismatch forces a fresh sign-in rather than trusting either.
        assert client.get("/api/v1/auth/me", headers=agent_headers).status_code == 401
        assert client.get(USERS, headers=login(client, agent)).status_code == 200


@pytest.mark.integration
class TestDashboard:
    def test_scopes_counts_by_role(
        self,
        client: TestClient,
        admin_headers: dict,
        agent_headers: dict,
        other_agent_headers: dict,
        create_listing,
    ):
        create_listing(agent_headers, slug="mine", status="available")
        create_listing(agent_headers, slug="mine-draft", status="draft")
        create_listing(other_agent_headers, slug="theirs", status="sold")
        client.post(
            "/api/v1/public/inquiries",
            json={
                "property_slug": "mine",
                "name": "Visitor",
                "email": "v@example.com",
                "message": "Is the flat still available?",
            },
        )

        mine = client.get(DASHBOARD, headers=agent_headers).json()["data"]
        assert mine["scope"] == "own"
        assert mine["properties"]["total"] == 2
        assert mine["properties"]["draft"] == 1
        assert mine["inquiries"]["new"] == 1
        assert mine["agents"] is None
        assert len(mine["recent_inquiries"]) == 1

        everyone = client.get(DASHBOARD, headers=admin_headers).json()["data"]
        assert everyone["scope"] == "all"
        assert everyone["properties"]["total"] == 3
        assert everyone["properties"]["sold"] == 1
        assert everyone["agents"] == 2
        assert everyone["unavailable"] == []
