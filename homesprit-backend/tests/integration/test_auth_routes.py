"""Integration tests for sign-in, the profile endpoint and immediate revocation.

Assertions go through the response envelope: `response.json()["data"]`.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.modules.user.domain.entities.user import User
from src.modules.user.domain.enums.user_status import UserStatus

from .conftest import TEST_PASSWORD, login


@pytest.mark.integration
class TestLogin:
    def test_login_returns_token_and_profile_without_hash(
        self, client: TestClient, agent: User
    ):
        response = client.post(
            "/api/v1/auth/login", json={"email": agent.email, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True and body["status"] == 200
        assert body["data"]["user"]["role"] == "agent"
        assert "password_hash" not in body["data"]["user"]

    def test_email_is_case_insensitive(self, client: TestClient, agent: User):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": agent.email.upper(), "password": TEST_PASSWORD},
        )
        assert response.status_code == 200

    def test_bad_password_is_401_in_the_error_envelope(
        self, client: TestClient, agent: User
    ):
        response = client.post(
            "/api/v1/auth/login", json={"email": agent.email, "password": "wrong"}
        )
        assert response.status_code == 401
        assert response.json() == {
            "status": 401,
            "success": False,
            "error": "Invalid email or password.",
            "details": {"reason": "Invalid email or password."},
        }

    def test_malformed_email_is_422_with_field_details(self, client: TestClient):
        response = client.post(
            "/api/v1/auth/login", json={"email": "not-an-email", "password": "x"}
        )
        assert response.status_code == 422
        assert "email" in response.json()["details"]["fields"]

    def test_sixth_attempt_is_rate_limited(self, client: TestClient, agent: User):
        for _ in range(5):
            client.post(
                "/api/v1/auth/login", json={"email": agent.email, "password": "wrong"}
            )
        response = client.post(
            "/api/v1/auth/login", json={"email": agent.email, "password": TEST_PASSWORD}
        )
        assert response.status_code == 429
        assert "Retry-After" in response.headers


@pytest.mark.integration
class TestSession:
    def test_me_requires_a_token(self, client: TestClient):
        assert client.get("/api/v1/auth/me").status_code == 401

    def test_me_returns_the_profile(
        self, client: TestClient, agent: User, agent_headers: dict
    ):
        response = client.get("/api/v1/auth/me", headers=agent_headers)
        assert response.status_code == 200
        assert response.json()["data"]["email"] == agent.email

    def test_garbage_token_is_401(self, client: TestClient):
        response = client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer not.a.jwt"}
        )
        assert response.status_code == 401

    def test_deactivation_takes_effect_on_the_next_request(
        self, client: TestClient, db_session: Session, agent: User, agent_headers: dict
    ):
        # The token is still cryptographically valid; the per-request DB
        # re-read is what refuses it.
        agent.status = UserStatus.INACTIVE
        db_session.add(agent)
        db_session.commit()

        assert client.get("/api/v1/auth/me", headers=agent_headers).status_code == 401

    def test_logout_acknowledges(self, client: TestClient, agent_headers: dict):
        response = client.post("/api/v1/auth/logout", headers=agent_headers)
        assert response.status_code == 200

    def test_health_is_not_wrapped(self, client: TestClient):
        body = client.get("/health").json()
        assert body["status"] == "healthy" and "success" not in body

    def test_login_works_for_a_fresh_user(self, client: TestClient, make_user):
        user = make_user("fresh@homesprit.dev")
        assert login(client, user)["Authorization"].startswith("Bearer ")
