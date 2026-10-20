"""
Property public API routes — what the website's listing pages read.

Unauthenticated by design. Kept in a separate file from the admin CRUD, as
hgs-backend does for every module: authentication is then a property of which
file a route lives in, and the response model differs too
(`PropertyPublicSchema` carries no audit columns and no soft-delete flag).
"""

from typing import List

from fastapi import APIRouter, Depends, Query

from src.shared.application.schemas.pagination import (
    ListQueryParams,
    PaginatedResponseSchema,
    list_query_params,
)

from ...application.schemas.property_schema import (
    CityCountSchema,
    PropertyPublicSchema,
)
from ...application.use_cases.get_public_properties_use_case import (
    GetPublicPropertyUseCase,
    ListCitiesUseCase,
    ListFeaturedPropertiesUseCase,
    SearchPublicPropertiesUseCase,
)
from ...infrastructure.repositories.property_repository import PropertyFilters
from ..dependencies import (
    get_get_public_property_use_case,
    get_list_cities_use_case,
    get_list_featured_properties_use_case,
    get_search_public_properties_use_case,
    public_property_filters,
)

router = APIRouter(tags=["Public Properties"])


@router.get("", response_model=PaginatedResponseSchema[PropertyPublicSchema])
async def search_properties(
    params: ListQueryParams = Depends(list_query_params),
    filters: PropertyFilters = Depends(public_property_filters),
    use_case: SearchPublicPropertiesUseCase = Depends(
        get_search_public_properties_use_case
    ),
):
    """
    Search homes on the market.

    **Public endpoint** — no authentication.

    Only available and under-offer listings appear. `search` matches title,
    address, city, neighborhood and description. Sort by `listed_at` (the
    default, newest first), `price`, `area_sqft` or `bedrooms`.

    **Errors:**
    - 422 if `min_price` is above `max_price`
    """
    items, total = await use_case.execute(params, filters)
    return PaginatedResponseSchema.build(items, total, params)


@router.get("/featured", response_model=List[PropertyPublicSchema])
async def list_featured_properties(
    limit: int = Query(default=6, ge=1, le=12),
    use_case: ListFeaturedPropertiesUseCase = Depends(
        get_list_featured_properties_use_case
    ),
):
    """
    The homepage's featured row. Possibly empty.

    **Public endpoint.** Declared before `/{slug}` on purpose — FastAPI matches
    in declaration order, and the reverse would look up a listing called
    "featured".
    """
    return await use_case.execute(limit)


@router.get("/cities", response_model=List[CityCountSchema])
async def list_cities(
    use_case: ListCitiesUseCase = Depends(get_list_cities_use_case),
):
    """
    Cities with at least one home on the market, busiest first — the search
    form's city picker.

    **Public endpoint.** Declared before `/{slug}` for the same reason.
    """
    return await use_case.execute()


@router.get("/{slug}", response_model=PropertyPublicSchema)
async def get_property(
    slug: str,
    use_case: GetPublicPropertyUseCase = Depends(get_get_public_property_use_case),
):
    """
    One listing for `/properties/[slug]`.

    **Public endpoint.** Sold and rented homes still resolve, so a shared link
    keeps working; drafts and archived listings do not.

    **Errors:**
    - 404 if no viewable listing has this slug
    """
    return await use_case.execute(slug)
