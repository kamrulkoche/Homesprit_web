"""Inquiry Pydantic schemas.

The usual public/admin split, reversed as hgs-backend reverses it for
`contact`: the public side WRITES and receives only an acknowledgement — never
the stored row, not even its id, so a script cannot enumerate what it has sent
— while staff read everything.

The submit limits are mirrored by the frontend's Zod schema
(`homesprit-frontend/src/helpers/validation/inquiry.schema.ts`), so a message
the form accepts is never refused here. A change to one means editing both.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from ...domain.enums.inquiry_status import InquiryStatus


class InquirySubmitSchema(BaseModel):
    """What the website's inquiry form sends."""

    model_config = ConfigDict(str_strip_whitespace=True)

    property_slug: Optional[str] = Field(
        default=None,
        max_length=180,
        description="The listing asked about. Omit for a general inquiry.",
    )
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=40)
    message: str = Field(min_length=10, max_length=2000)

    @field_validator("property_slug", "phone")
    @classmethod
    def blank_to_none(cls, value: Optional[str]) -> Optional[str]:
        """The form sends an untouched optional field as ``""``; store null."""
        return value or None


class InquirySubmittedSchema(BaseModel):
    """The acknowledgement a visitor gets back."""

    message: str = Field(
        default="Thanks — your message has been sent. An agent will be in touch soon."
    )


class InquiryListingSchema(BaseModel):
    """The listing an inquiry is about, as the inbox shows it."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    slug: str
    city: str
    agent_id: UUID


class InquiryAdminSchema(BaseModel):
    """An inquiry as the dashboard receives it."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    message: str
    status: InquiryStatus
    property_id: Optional[UUID] = None
    listing: Optional[InquiryListingSchema] = None
    created_at: datetime
    updated_at: datetime


class InquiryStatusUpdateSchema(BaseModel):
    """The one thing staff change on an inquiry. The message is never editable."""

    status: InquiryStatus


class InquiryCountsSchema(BaseModel):
    """Per-status totals for the inbox's filter and the dashboard cards."""

    new: int = 0
    contacted: int = 0
    closed: int = 0
    total: int = 0
