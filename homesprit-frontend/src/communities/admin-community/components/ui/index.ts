'use client';

/**
 * The admin UI kit — built once, used by every dashboard screen, as in
 * hgs-frontend. A screen that hand-rolls a table, a field or a dialog is a
 * defect: the screens would then disagree about what loading looks like and
 * whether an empty list means "nothing here" or "could not read".
 *
 * `'use client'` like every community barrel, so PLAIN DATA MUST NOT PASS
 * THROUGH HERE. `admin-ui.data.ts` is imported by deep path.
 */

export { DataTable, type DataTableColumn } from './DataTable';
export {
  AdminPageHeader,
  FilterSelect,
  IconButton,
  IconLink,
  Pagination,
  SearchInput,
  StatCard,
  StatusBadge,
  Toolbar,
  type FilterOption,
} from './Controls';
export { EmptyState, ErrorState, LoadingState, SessionExpiredNotice, TableSkeleton } from './States';
export { ConfirmDialog, FormPanel } from './Overlays';
export { ToastProvider, useToast } from './Toast';
export { FormField } from './form/FormField';
export { AdminApiError, adminApi, slugify, type QueryValue } from './admin-api';
export {
  useAdminResource,
  type SortOrder,
  type UseAdminResourceOptions,
  type UseAdminResourceResult,
} from './useAdminResource';
