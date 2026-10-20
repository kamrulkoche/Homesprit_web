"""Shared domain exceptions.

Every use case raises one of these rather than an HTTPException. The mapping to
status codes lives in ``src/shared/api/exception_handlers/``.
"""

from .already_exists_error import AlreadyExistsError
from .domain_exception import DomainException
from .forbidden_error import ForbiddenError
from .not_found_error import NotFoundError
from .repository_error import RepositoryError
from .unauthorized_error import UnauthorizedError
from .validation_error import ValidationError

__all__ = [
    "AlreadyExistsError",
    "DomainException",
    "ForbiddenError",
    "NotFoundError",
    "RepositoryError",
    "UnauthorizedError",
    "ValidationError",
]
