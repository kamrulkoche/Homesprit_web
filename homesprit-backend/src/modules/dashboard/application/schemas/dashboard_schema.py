"""Dashboard response schemas."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from src.modules.inquiry.application.schemas.inquiry_schema import (
    InquiryAdminSchema,
    InquiryCountsSchema,
)


class PropertyCountsSchema(BaseModel):
    """Live listings per status, plus the total."""

    draft: int = 0
    available: int = 0
    under_offer: int = 0
    sold: int = 0
    rented: int = 0
    archived: int = 0
    total: int = 0


class DashboardResponseSchema(BaseModel):
    """The overview the dashboard's home screen renders.

    ``scope`` says whose numbers these are, so the screen can label them —
    "Your listings" for an agent, "All listings" for an admin — rather than
    leaving an agent to wonder why the office total looks small.

    ``unavailable`` lists any section whose read failed, so its cards render
    as unknown rather than as a zero that looks like real data. The same
    contract hgs-backend's dashboard uses.
    """

    scope: Literal["all", "own"]
    properties: PropertyCountsSchema
    inquiries: InquiryCountsSchema
    agents: Optional[int] = Field(
        default=None, description="Active agents. Admins only; null for an agent."
    )
    recent_inquiries: List[InquiryAdminSchema] = Field(default_factory=list)
    unavailable: List[str] = Field(default_factory=list)
