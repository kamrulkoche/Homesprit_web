"""
Public inquiry route — the website's inquiry forms post here.

The one public endpoint that WRITES. It is anonymous by necessity, so it is
rate limited per address instead. The website calls it from its own
`/api/inquiries` route handler, server side, forwarding the visitor's address
in `X-Forwarded-For` — without that every submission would share the Next.js
server's address and one limit. Exactly hgs-backend's `/public/contact`.
"""

from fastapi import APIRouter, Depends, Request, status

from src.shared.infrastructure.security.rate_limiter import (
    client_key,
    enforce,
    inquiry_limiter,
)

from ...application.schemas.inquiry_schema import (
    InquirySubmitSchema,
    InquirySubmittedSchema,
)
from ...application.use_cases.inquiry_use_cases import SubmitInquiryUseCase
from ..dependencies import get_submit_inquiry_use_case

router = APIRouter(tags=["Public Inquiries"])


@router.post(
    "", response_model=InquirySubmittedSchema, status_code=status.HTTP_201_CREATED
)
async def submit_inquiry(
    payload: InquirySubmitSchema,
    request: Request,
    use_case: SubmitInquiryUseCase = Depends(get_submit_inquiry_use_case),
):
    """
    Send an inquiry, about a listing (`property_slug`) or in general.

    **Access:** Public, rate limited per address.

    The response carries an acknowledgement only — never the stored row.

    **Errors:**
    - 404 if `property_slug` names no public listing
    - 422 if a field fails validation, or the home is sold or rented
    - 429 when one address sends too many in the window
    """
    enforce(inquiry_limiter, client_key(request))
    return await use_case.execute(payload)
