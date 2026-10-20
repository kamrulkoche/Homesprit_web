"""Inquiry module dependencies for dependency injection."""

from fastapi import Depends
from sqlalchemy.orm import Session

from src.shared.infrastructure.database import get_db

from ..application.use_cases.inquiry_use_cases import (
    GetInquiryCountsUseCase,
    GetInquiryUseCase,
    ListInquiriesUseCase,
    SubmitInquiryUseCase,
    UpdateInquiryStatusUseCase,
)


def get_submit_inquiry_use_case(db: Session = Depends(get_db)) -> SubmitInquiryUseCase:
    """Get the form-submission use case with the shared DB session."""
    return SubmitInquiryUseCase(db)


def get_list_inquiries_use_case(db: Session = Depends(get_db)) -> ListInquiriesUseCase:
    """Get the inbox-listing use case with the shared DB session."""
    return ListInquiriesUseCase(db)


def get_inquiry_counts_use_case(
    db: Session = Depends(get_db),
) -> GetInquiryCountsUseCase:
    """Get the per-status totals use case with the shared DB session."""
    return GetInquiryCountsUseCase(db)


def get_inquiry_use_case(db: Session = Depends(get_db)) -> GetInquiryUseCase:
    """Get the single-inquiry use case with the shared DB session."""
    return GetInquiryUseCase(db)


def get_update_inquiry_status_use_case(
    db: Session = Depends(get_db),
) -> UpdateInquiryStatusUseCase:
    """Get the status-change use case with the shared DB session."""
    return UpdateInquiryStatusUseCase(db)
