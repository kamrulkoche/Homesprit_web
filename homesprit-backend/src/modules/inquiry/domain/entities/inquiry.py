"""Inquiry entity — one question a visitor sent."""

from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from pydantic import ConfigDict
from sqlalchemy import Column
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlmodel import Field, Relationship

from src.modules.property.domain.entities.property import Property
from src.shared.domain.entities.audited_entity import AuditedEntity

from ..enums.inquiry_status import InquiryStatus


class Inquiry(AuditedEntity, table=True):
    """
    A message from a visitor, usually about one listing.

    ``property_id`` is nullable: the `/contact` page sends a general inquiry
    about no listing in particular. Those go to admins only. One about a
    listing is also visible to the agent who owns that listing — which is
    decided by joining through ``properties.agent_id`` at read time rather than
    copied onto this row, so reassigning a listing moves its open inquiries
    with it.

    ``AuditedEntity`` gives ``updated_by``: who last changed the status. A
    visitor has no account, so ``created_by`` stays null.

    The message is what the visitor wrote and is never editable. There is no
    delete: an inquiry is closed, not removed.

    Table name: inquiries
    """

    __tablename__ = "inquiries"

    model_config = ConfigDict(  # type: ignore[assignment]
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    property_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            sa.Uuid(),
            # RESTRICT is safe because listings are only ever soft-deleted.
            sa.ForeignKey("properties.id", ondelete="RESTRICT"),
            nullable=True,
            index=True,
        ),
        description="The listing asked about; null for a general inquiry",
    )

    name: str = Field(max_length=100, nullable=False)
    email: str = Field(max_length=255, nullable=False, index=True)
    phone: Optional[str] = Field(default=None, max_length=40)
    message: str = Field(sa_type=sa.Text, nullable=False)

    status: InquiryStatus = Field(
        default=InquiryStatus.NEW,
        sa_column=Column(
            SQLAlchemyEnum(
                InquiryStatus,
                values_callable=lambda x: [e.value for e in x],
                name="inquiry_status",
            ),
            nullable=False,
            index=True,
        ),
    )

    # Joined: every admin row shows which listing it is about. Named
    # `listing` rather than `property`, which would shadow the builtin inside
    # this class body.
    listing: Optional[Property] = Relationship(
        sa_relationship_kwargs={"lazy": "joined", "viewonly": True},
    )

    def __repr__(self) -> str:
        """String representation of Inquiry."""
        return (
            f"<Inquiry(id='{self.id}', email='{self.email}', status='{self.status}')>"
        )
