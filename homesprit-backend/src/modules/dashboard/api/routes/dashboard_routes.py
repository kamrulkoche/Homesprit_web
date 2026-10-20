"""Dashboard API route — the overview cards on the dashboard's home screen."""

from fastapi import APIRouter, Depends

from src.modules.user.domain.entities.user import User
from src.shared.api.auth.dependencies import STAFF, hasAccess

from ...application.schemas.dashboard_schema import DashboardResponseSchema
from ...application.use_cases.get_dashboard_use_case import GetDashboardUseCase
from ..dependencies import get_dashboard_use_case

router = APIRouter(tags=["Admin Dashboard"])


@router.get("", response_model=DashboardResponseSchema)
async def get_dashboard(
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: GetDashboardUseCase = Depends(get_dashboard_use_case),
):
    """
    Listing and inquiry counts, plus the latest inquiries.

    **Access:** Admins get office-wide numbers and the active-agent count;
    agents get their own numbers (`scope: "own"`).
    """
    return await use_case.execute(current_user)
