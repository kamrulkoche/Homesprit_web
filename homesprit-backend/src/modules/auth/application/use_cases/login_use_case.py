"""Use case for authenticating a user with email and password."""

from src.modules.user.application.schemas.user_schema import UserResponseSchema
from src.modules.user.infrastructure.repositories.user_repository import (
    UserRepository,
)
from src.shared.api.auth.jwt_handler import create_access_token
from src.shared.domain.exceptions.unauthorized_error import UnauthorizedError
from src.shared.infrastructure.logging import get_logger
from src.shared.infrastructure.security.password_hasher import (
    hash_password,
    verify_password,
)
from src.shared.utils.config import settings

from ..schemas.auth_schema import LoginRequestSchema, LoginResponseSchema

logger = get_logger(__name__)

# A real bcrypt hash of a throwaway value, used to equalize timing on the
# unknown-email path. Computed at import rather than hardcoded: a literal that
# is not a well-formed bcrypt string would send verify_password down its
# malformed-hash branch, which returns FAST and defeats the equalization.
_DUMMY_HASH = hash_password("not-a-real-password-timing-equalizer")


class LoginUseCase:
    """Authenticate a user and issue an access token."""

    def __init__(self, repository: UserRepository):
        """Initialize use case with repository."""
        self.repository = repository

    async def execute(self, data: LoginRequestSchema) -> LoginResponseSchema:
        """
        Authenticate and mint an access token.

        Raises:
            UnauthorizedError: If the credentials are wrong or the account
                cannot sign in. The message is identical for an unknown email
                and a wrong password, and so is the time taken.
        """
        user = await self.repository.get_by_email(data.email)

        if user is None:
            # Hash against a dummy value anyway, so this path costs the same as
            # a wrong password and cannot be told apart by timing.
            verify_password(data.password, _DUMMY_HASH)
            logger.warning(f"Login attempt for unknown email: {data.email}")
            raise UnauthorizedError()

        if not verify_password(data.password, user.password_hash):
            logger.warning(f"Failed login (bad password) for: {user.email}")
            raise UnauthorizedError()

        if not user.can_authenticate:
            # Distinct message on purpose: the password WAS right, so naming the
            # reason leaks nothing and saves a support ticket.
            logger.warning(
                f"Login blocked for {user.email}: "
                f"status={user.status}, is_active={user.is_active}"
            )
            raise UnauthorizedError(
                "This account is not active. Please contact an admin."
            )

        if user.id is None:
            raise ValueError("Persisted user must have an ID")

        token = create_access_token(
            user_id=user.id, email=user.email, role=user.role.value
        )

        user = await self.repository.touch_last_login(user)
        logger.info(f"Signed in: {user.email} ({user.role.value})")

        return LoginResponseSchema(
            access_token=token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=UserResponseSchema.model_validate(user),
        )
