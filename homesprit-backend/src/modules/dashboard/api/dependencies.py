"""Dashboard module dependencies for dependency injection."""

from fastapi import Depends
from sqlalchemy.orm import Session

from src.shared.infrastructure.database import get_db

from ..application.use_cases.get_dashboard_use_case import GetDashboardUseCase


def get_dashboard_use_case(db: Session = Depends(get_db)) -> GetDashboardUseCase:
    """Get the overview use case with the shared DB session."""
    return GetDashboardUseCase(db)
