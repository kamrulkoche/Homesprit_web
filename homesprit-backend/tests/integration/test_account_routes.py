"""Integration tests for the self-service My account routes."""

import pytest
from fastapi.testclient import TestClient

from src.modules.user.domain.entities.user import User

from .conftest import TEST_PASSWORD

ACCOUNT = "/api/v1/admin/account"
PASSWORD = f"{ACCOUNT}/password"
NEW_PASSWORD = "a-brand-new-long-password"


@pytest.mark.integration
class TestAccountProfile:
    def test_requires_a_session(self, client: TestClient):
        assert client.get(ACCOUNT).status_code == 401
        assert client.patch(ACCOUNT, json={"name": "X Y"}).status_code == 401

    def test_returns_the_callers_own_profile(
        self, client: TestClient, agent: User, agent_headers: dict
    ):
        response = client.get(ACCOUNT, headers=agent_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["email"] == agent.email
        assert "password_hash" not in data

    def test_agent_updates_own_name_and_phone(
        self, client: TestClient, agent_headers: dict
    ):
        response = client.patch(
            ACCOUNT,
            json={"name": "Maya Okafor", "phone": "+1 512 555 0142"},
            headers=agent_headers,
        )
        assert response.status_code == 200, response.text
        data = response.json()["data"]
        assert data["name"] == "Maya Okafor"
        assert data["phone"] == "+1 512 555 0142"

    def test_blank_phone_clears_it(self, client: TestClient, agent_headers: dict):
        client.patch(ACCOUNT, json={"phone": "555"}, headers=agent_headers)
        response = client.patch(ACCOUNT, json={"phone": ""}, headers=agent_headers)
        assert response.json()["data"]["phone"] is None

    def test_role_and_status_are_ignored(self, client: TestClient, agent_headers: dict):
        response = client.patch(
            ACCOUNT,
            json={"name": "Still Agent", "role": "admin", "status": "inactive"},
            headers=agent_headers,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["role"] == "agent"
        assert data["status"] == "active"

    def test_short_name_is_422(self, client: TestClient, agent_headers: dict):
        response = client.patch(ACCOUNT, json={"name": "X"}, headers=agent_headers)
        assert response.status_code == 422
        assert "name" in response.json()["details"]["fields"]


@pytest.mark.integration
class TestPasswordChange:
    def test_changes_password_and_new_one_signs_in(
        self, client: TestClient, agent: User, agent_headers: dict
    ):
        response = client.post(
            PASSWORD,
            json={"current_password": TEST_PASSWORD, "new_password": NEW_PASSWORD},
            headers=agent_headers,
        )
        assert response.status_code == 200, response.text

        old = client.post(
            "/api/v1/auth/login", json={"email": agent.email, "password": TEST_PASSWORD}
        )
        assert old.status_code == 401
        new = client.post(
            "/api/v1/auth/login", json={"email": agent.email, "password": NEW_PASSWORD}
        )
        assert new.status_code == 200

    def test_wrong_current_password_is_422_not_401(
        self, client: TestClient, agent_headers: dict
    ):
        response = client.post(
            PASSWORD,
            json={"current_password": "not-my-password", "new_password": NEW_PASSWORD},
            headers=agent_headers,
        )
        assert response.status_code == 422
        assert response.json()["details"]["field"] == "current_password"

    def test_same_password_is_refused(self, client: TestClient, agent_headers: dict):
        response = client.post(
            PASSWORD,
            json={"current_password": TEST_PASSWORD, "new_password": TEST_PASSWORD},
            headers=agent_headers,
        )
        assert response.status_code == 422
        assert response.json()["details"]["field"] == "new_password"

    def test_short_new_password_is_422(self, client: TestClient, agent_headers: dict):
        response = client.post(
            PASSWORD,
            json={"current_password": TEST_PASSWORD, "new_password": "short"},
            headers=agent_headers,
        )
        assert response.status_code == 422
        assert "new_password" in response.json()["details"]["fields"]

    def test_guessing_is_rate_limited(self, client: TestClient, agent_headers: dict):
        body = {"current_password": "wrong-guess", "new_password": NEW_PASSWORD}
        for _ in range(5):
            assert (
                client.post(PASSWORD, json=body, headers=agent_headers).status_code
                == 422
            )
        response = client.post(PASSWORD, json=body, headers=agent_headers)
        assert response.status_code == 429
        assert "Retry-After" in response.headers
