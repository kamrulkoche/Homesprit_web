"""
Integration test fixtures.

Runs the real FastAPI app over HTTP against a throwaway SQLite database — the
same trade hgs-backend makes. It exercises middleware -> routing -> auth ->
use case -> repository end to end, but NOT Postgres-specific DDL (native enum
types, `gen_random_uuid()`, `text[]`), which the Alembic migration owns and
which `alembic upgrade head` + `alembic check` verify against a real database.
"""

from collections.abc import Callable, Generator
from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

from src.api.app import create_app
from src.modules.inquiry.domain.entities.inquiry import Inquiry
from src.modules.property.domain.entities.property import Property
from src.modules.property.domain.entities.property_image import PropertyImage
from src.modules.user.domain.entities.user import User
from src.modules.user.domain.enums.user_role import UserRole
from src.modules.user.domain.enums.user_status import UserStatus
from src.shared.infrastructure.database import get_db
from src.shared.infrastructure.security.password_hasher import hash_password
from src.shared.infrastructure.security.rate_limiter import (
    inquiry_limiter,
    login_limiter,
    password_change_limiter,
)

TEST_PASSWORD = "integration-test-password"


@pytest.fixture(scope="session")
def _hashed_password() -> str:
    """Hash once per session — bcrypt at cost 12 is ~250ms a call."""
    return hash_password(TEST_PASSWORD)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """An isolated in-memory database, rebuilt for every test.

    StaticPool + a single connection keeps every session on the same in-memory
    database; the default pool would hand each connection its own empty one.
    Tables are named explicitly so adding an entity elsewhere never silently
    changes what this suite runs against.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(
        bind=engine,
        tables=[
            User.__table__,  # type: ignore[attr-defined]
            Property.__table__,  # type: ignore[attr-defined]
            PropertyImage.__table__,  # type: ignore[attr-defined]
            Inquiry.__table__,  # type: ignore[attr-defined]
        ],
    )
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def make_user(db_session: Session, _hashed_password: str) -> Callable[..., User]:
    """Persist a user. Every one signs in with TEST_PASSWORD."""

    def factory(
        email: str,
        role: UserRole = UserRole.AGENT,
        status: UserStatus = UserStatus.ACTIVE,
    ) -> User:
        user = User(
            name=email.split("@")[0].replace(".", " ").title(),
            email=email,
            password_hash=_hashed_password,
            role=role,
            status=status,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return factory


@pytest.fixture
def admin(make_user: Callable[..., User]) -> User:
    """An admin."""
    return make_user("admin@homesprit.dev", role=UserRole.ADMIN)


@pytest.fixture
def agent(make_user: Callable[..., User]) -> User:
    """An agent."""
    return make_user("maya@homesprit.dev")


@pytest.fixture
def other_agent(make_user: Callable[..., User]) -> User:
    """A second agent, for the ownership tests."""
    return make_user("daniel@homesprit.dev")


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """The real app, wired to the test database.

    The limiters are module-level singletons, so they are cleared per test:
    otherwise the sixth sign-in of a run gets a 429 for a correct password — a
    failure that depends on test ORDER, the worst kind to debug.
    """
    login_limiter._windows.clear()
    inquiry_limiter._windows.clear()
    password_change_limiter._windows.clear()

    app = create_app()

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with patch("src.api.app.assert_schema_at_head"):
        with TestClient(app) as test_client:
            yield test_client


def login(client: TestClient, user: User) -> dict[str, str]:
    """Sign in and return the Authorization header."""
    response = client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}


@pytest.fixture
def admin_headers(client: TestClient, admin: User) -> dict[str, str]:
    """Signed-in admin."""
    return login(client, admin)


@pytest.fixture
def agent_headers(client: TestClient, agent: User) -> dict[str, str]:
    """Signed-in agent."""
    return login(client, agent)


@pytest.fixture
def other_agent_headers(client: TestClient, other_agent: User) -> dict[str, str]:
    """Signed-in second agent."""
    return login(client, other_agent)


def listing_body(**overrides: Any) -> dict[str, Any]:
    """A valid create body. Published (`available`) unless overridden."""
    body: dict[str, Any] = {
        "title": "Bright two-bed flat near the park",
        "slug": "bright-two-bed-flat",
        "description": "A bright two-bedroom flat near the park, freshly painted throughout.",
        "property_type": "apartment",
        "listing_type": "rent",
        "status": "available",
        "price": 1800,
        "address": "1 Main St",
        "city": "Austin",
        "bedrooms": 2,
        "bathrooms": 1,
        "features": ["Balcony"],
        "images": [
            {"url": "https://images.example.com/a.jpg", "alt_text": "Living room"},
            {"url": "https://images.example.com/b.jpg"},
        ],
    }
    body.update(overrides)
    return body


@pytest.fixture
def create_listing(client: TestClient) -> Callable[..., dict[str, Any]]:
    """POST a listing as the given user and return its admin row."""

    def factory(headers: dict[str, str], **overrides: Any) -> dict[str, Any]:
        response = client.post(
            "/api/v1/admin/properties", json=listing_body(**overrides), headers=headers
        )
        assert response.status_code == 201, response.text
        return response.json()["data"]

    return factory
