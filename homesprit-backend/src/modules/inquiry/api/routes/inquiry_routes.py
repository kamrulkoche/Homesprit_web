"""
Inquiry admin API routes — the inquiries inbox.

Admins see every inquiry; agents see the ones about their own listings. There
is no delete: an inquiry is a record of what someone asked, and staff close it
rather than remove it.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.modules.user.domain.entities.user import User
from src.shared.api.auth.dependencies import STAFF, hasAccess
from src.shared.application.schemas.pagination import (
    ListQueryParams,
    PaginatedResponseSchema,
    list_query_params,
)

from ...application.schemas.inquiry_schema import (
    InquiryAdminSchema,
    InquiryCountsSchema,
    InquiryStatusUpdateSchema,
)
from ...application.use_cases.inquiry_use_cases import (
    GetInquiryCountsUseCase,
    GetInquiryUseCase,
    ListInquiriesUseCase,
    UpdateInquiryStatusUseCase,
)
from ...domain.enums.inquiry_status import InquiryStatus
from ..dependencies import (
    get_inquiry_counts_use_case,
    get_inquiry_use_case,
    get_list_inquiries_use_case,
    get_update_inquiry_status_use_case,
)

router = APIRouter(tags=["Admin Inquiries"])


@router.get("", response_model=PaginatedResponseSchema[InquiryAdminSchema])
async def list_inquiries(
    status: Optional[InquiryStatus] = Query(default=None),
    property_id: Optional[UUID] = Query(
        default=None, description="One listing's inquiries"
    ),
    params: ListQueryParams = Depends(list_query_params),
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: ListInquiriesUseCase = Depends(get_list_inquiries_use_case),
):
    """
    List inquiries, newest first.

    **Access:** Admins see all; agents see those about their own listings.

    Searchable over name, email, phone and message. Sort by `created_at`,
    `name`, `email` or `status`.
    """
    items, total = await use_case.execute(
        current_user, params, status=status, property_id=property_id
    )
    return PaginatedResponseSchema.build(items, total, params)


@router.get("/counts", response_model=InquiryCountsSchema)
async def get_inquiry_counts(
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: GetInquiryCountsUseCase = Depends(get_inquiry_counts_use_case),
):
    """
    Count the caller's inquiries per status.

    **Note:** declared before `/{inquiry_id}` so "counts" is not parsed as a UUID.
    """
    return await use_case.execute(current_user)


@router.get("/{inquiry_id}", response_model=InquiryAdminSchema)
async def get_inquiry(
    inquiry_id: UUID,
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: GetInquiryUseCase = Depends(get_inquiry_use_case),
):
    """
    Read one inquiry.

    **Errors:**
    - 403 if an agent opens an inquiry that is not about their listing
    - 404 if no inquiry has this ID
    """
    return await use_case.execute(current_user, inquiry_id)


@router.patch("/{inquiry_id}", response_model=InquiryAdminSchema)
async def update_inquiry_status(
    inquiry_id: UUID,
    payload: InquiryStatusUpdateSchema,
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: UpdateInquiryStatusUseCase = Depends(get_update_inquiry_status_use_case),
):
    """
    Mark an inquiry new, contacted or closed.

    **Errors:**
    - 403 if an agent changes an inquiry that is not about their listing
    - 404 if no inquiry has this ID
    - 422 if the status is not one of the three
    """
    return await use_case.execute(current_user, inquiry_id, payload)
