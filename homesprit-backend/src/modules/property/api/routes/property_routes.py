"""
Property admin API routes — the dashboard's Listings screens.

Admins AND agents reach every endpoint here (`hasAccess(roles=STAFF)`). What an
agent may do to a particular listing is decided in the use cases, which see
the row: an agent lists, reads, edits and deletes only their own.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from src.modules.user.domain.entities.user import User
from src.shared.api.auth.dependencies import STAFF, hasAccess
from src.shared.application.schemas.pagination import (
    DeleteResponseSchema,
    ListQueryParams,
    PaginatedResponseSchema,
    list_query_params,
)

from ...application.schemas.property_schema import (
    PropertyAdminSchema,
    PropertyCreateSchema,
    PropertyUpdateSchema,
)
from ...application.use_cases.create_property_use_case import CreatePropertyUseCase
from ...application.use_cases.delete_property_use_case import DeletePropertyUseCase
from ...application.use_cases.list_properties_use_case import (
    GetPropertyUseCase,
    ListPropertiesUseCase,
)
from ...application.use_cases.update_property_use_case import UpdatePropertyUseCase
from ...infrastructure.repositories.property_repository import PropertyFilters
from ..dependencies import (
    admin_property_filters,
    get_create_property_use_case,
    get_delete_property_use_case,
    get_get_property_use_case,
    get_list_properties_use_case,
    get_update_property_use_case,
)

router = APIRouter(tags=["Admin Properties"])


@router.get("", response_model=PaginatedResponseSchema[PropertyAdminSchema])
async def list_properties(
    params: ListQueryParams = Depends(list_query_params),
    filters: PropertyFilters = Depends(admin_property_filters),
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: ListPropertiesUseCase = Depends(get_list_properties_use_case),
):
    """
    List listings, any status, newest edit first.

    **Access:** Admins see every listing; agents see their own, whatever
    `agent_id` they send.

    Searchable over title, address, city, neighborhood and description. Sort by
    `title`, `price`, `city`, `status`, `bedrooms`, `created_at`, `updated_at`
    or `listed_at`.
    """
    items, total = await use_case.execute(current_user, params, filters)
    return PaginatedResponseSchema.build(items, total, params)


@router.post(
    "", response_model=PropertyAdminSchema, status_code=status.HTTP_201_CREATED
)
async def create_property(
    payload: PropertyCreateSchema,
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: CreatePropertyUseCase = Depends(get_create_property_use_case),
):
    """
    Create a listing.

    **Access:** Admins and agents. An agent's listing is always their own.

    `images` are stored in the order sent; the first is the cover.

    **Errors:**
    - 403 if an agent sets `is_featured` or names another owner
    - 409 if the slug is taken (soft-deleted listings still hold theirs)
    - 422 on any field rule
    """
    return await use_case.execute(current_user, payload)


@router.get("/{property_id}", response_model=PropertyAdminSchema)
async def get_property(
    property_id: UUID,
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: GetPropertyUseCase = Depends(get_get_property_use_case),
):
    """
    Read one listing, for the edit form.

    **Errors:**
    - 403 if an agent asks for someone else's listing
    - 404 if no live listing has this ID
    """
    return await use_case.execute(current_user, property_id)


@router.patch("/{property_id}", response_model=PropertyAdminSchema)
async def update_property(
    property_id: UUID,
    payload: PropertyUpdateSchema,
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: UpdatePropertyUseCase = Depends(get_update_property_use_case),
):
    """
    Update a listing. Partial: only keys present in the body are touched.

    Sending `images` REPLACES every photo, so `[]` removes them all; omit the
    key to leave them alone.

    **Errors:**
    - 403 if it is not your listing, or an agent changes `is_featured`/owner
    - 404 if no live listing has this ID
    - 409 if the new slug belongs to another listing
    """
    return await use_case.execute(current_user, property_id, payload)


@router.delete("/{property_id}", response_model=DeleteResponseSchema)
async def delete_property(
    property_id: UUID,
    current_user: User = Depends(hasAccess(roles=STAFF)),
    use_case: DeletePropertyUseCase = Depends(get_delete_property_use_case),
):
    """
    Remove a listing — a soft delete. It leaves the dashboard and the site, the
    row survives, and its slug stays reserved.

    **Errors:**
    - 403 if it is not your listing
    - 404 if no live listing has this ID
    """
    return await use_case.execute(current_user, property_id)
