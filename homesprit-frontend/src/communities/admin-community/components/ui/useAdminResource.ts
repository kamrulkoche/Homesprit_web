'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminApiError, adminApi } from './admin-api';
import type { IPaginated } from '@/interface/admin.interface';

/**
 * The list-screen hook every dashboard resource is built on — ported from
 * hgs-frontend, keeping its four rules:
 *
 *  1. The FIRST page may arrive from the server as `initialRows`. When it does,
 *     the hook does not fetch on mount — which is also what keeps `setState`
 *     out of an effect body, as `react-hooks/set-state-in-effect` requires.
 *  2. Every write RE-READS the list rather than patching state. The server
 *     decides things the client would otherwise have to predict — a listing's
 *     `listed_at` on first publish, its position under the current sort.
 *  3. A search or filter change refetches, debounced, and resets to page 1.
 *  4. A 401 surfaces distinctly (`isUnauthorized`), so a screen can say "your
 *     session expired" rather than "something went wrong".
 *
 * Dropped from the HGS hook: `reorder` (nothing here is hand-ordered),
 * `unpaginated` (every Homesprit list is on the shared contract) and
 * `updateMethod` (every update is a PATCH).
 */

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 20;

export type SortOrder = 'asc' | 'desc';

export interface UseAdminResourceOptions<TRow> {
  /** Path under `/api/admin/`, e.g. `properties`. */
  basePath: string;
  /** First page, read server-side. Its presence suppresses the mount fetch. */
  initialRows?: TRow[];
  initialTotal?: number;
  initialSearch?: string;
  initialFilters?: Record<string, string>;
  pageSize?: number;
  defaultSort?: string;
  defaultOrder?: SortOrder;
}

export interface UseAdminResourceResult<TRow, TWrite> {
  rows: TRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: (value: string) => void;
  filters: Record<string, string>;
  /** An empty value CLEARS the filter rather than sending a blank one. */
  setFilter: (key: string, value: string) => void;
  sort: string | undefined;
  order: SortOrder;
  setSort: (column: string, order?: SortOrder) => void;
  isLoading: boolean;
  error: string | null;
  isUnauthorized: boolean;
  reload: () => Promise<void>;
  /** Resolve to the row / true on success, null / false on failure. */
  create: (body: TWrite) => Promise<TRow | null>;
  update: (id: string, body: Partial<TWrite>) => Promise<TRow | null>;
  remove: (id: string) => Promise<boolean>;
  isSaving: boolean;
  saveError: string | null;
  fieldErrors: Record<string, string>;
  clearErrors: () => void;
}

export function useAdminResource<TRow, TWrite = Partial<TRow>>({
  basePath,
  initialRows,
  initialTotal,
  initialSearch,
  initialFilters,
  pageSize = DEFAULT_PAGE_SIZE,
  defaultSort,
  defaultOrder = 'asc',
}: UseAdminResourceOptions<TRow>): UseAdminResourceResult<TRow, TWrite> {
  const [rows, setRows] = useState<TRow[]>(initialRows ?? []);
  const [total, setTotal] = useState(initialTotal ?? initialRows?.length ?? 0);
  const [totalPages, setTotalPages] = useState(() =>
    Math.max(1, Math.ceil((initialTotal ?? initialRows?.length ?? 0) / pageSize))
  );

  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState(initialSearch ?? '');
  const [filters, setFilters] = useState<Record<string, string>>(() => ({ ...initialFilters }));
  const [sort, setSortState] = useState<string | undefined>(defaultSort);
  const [order, setOrder] = useState<SortOrder>(defaultOrder);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /** Set while the server-rendered first page is still what is on screen. */
  const skipNextFetch = useRef(initialRows !== undefined);
  /** Set by `setSearch`, so only typing pays the debounce. */
  const debounceNext = useRef(false);
  /** Guards against a slow page-1 response landing after a fast page-2 one. */
  const requestId = useRef(0);

  const fetchRows = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    try {
      const payload = await adminApi.get<IPaginated<TRow>>(basePath, {
        page,
        page_size: pageSize,
        search,
        sort,
        order: sort ? order : undefined,
        ...filters,
      });
      if (id !== requestId.current) return;
      setRows(payload?.items ?? []);
      setTotal(payload?.total ?? 0);
      setTotalPages(Math.max(1, payload?.total_pages ?? 1));
      setError(null);
      setIsUnauthorized(false);
    } catch (err) {
      if (id !== requestId.current) return;
      const unauthorized = err instanceof AdminApiError && err.status === 401;
      setIsUnauthorized(unauthorized);
      setError(
        unauthorized
          ? 'Your session expired. Sign in again to continue.'
          : err instanceof Error
            ? err.message
            : 'Could not load this list.'
      );
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [basePath, page, pageSize, search, sort, order, filters]);

  // Everything happens inside the timer rather than the effect body — which is
  // what `set-state-in-effect` asks for, and what coalesces a burst of
  // keystrokes, or a filter change and its page reset, into one request.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const delay = debounceNext.current ? SEARCH_DEBOUNCE_MS : 0;
    debounceNext.current = false;
    const timer = setTimeout(() => void fetchRows(), delay);
    return () => clearTimeout(timer);
  }, [fetchRows]);

  const setSearch = useCallback((value: string) => {
    debounceNext.current = true;
    setSearchState(value);
    setPage(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((current) => {
      const next = { ...current };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
    setPage(1);
  }, []);

  const setSort = useCallback((column: string, nextOrder?: SortOrder) => {
    setSortState(column);
    setOrder((current) => nextOrder ?? (current === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  }, []);

  const clearErrors = useCallback(() => {
    setSaveError(null);
    setFieldErrors({});
  }, []);

  const applyWriteError = useCallback((err: unknown) => {
    if (err instanceof AdminApiError) {
      setSaveError(err.status === 401 ? 'Your session expired. Sign in again to continue.' : err.message);
      setFieldErrors(err.fields ?? {});
      return;
    }
    setSaveError(err instanceof Error ? err.message : 'Could not save.');
    setFieldErrors({});
  }, []);

  /** Run a write, then re-read the list. Null/false on failure, with errors set. */
  const write = useCallback(
    async <R,>(action: () => Promise<R>): Promise<R | null> => {
      setIsSaving(true);
      clearErrors();
      try {
        const result = await action();
        await fetchRows();
        return result;
      } catch (err) {
        applyWriteError(err);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchRows, clearErrors, applyWriteError]
  );

  const create = useCallback(
    (body: TWrite) => write(() => adminApi.post<TRow>(basePath, body)),
    [write, basePath]
  );
  const update = useCallback(
    (id: string, body: Partial<TWrite>) => write(() => adminApi.patch<TRow>(`${basePath}/${id}`, body)),
    [write, basePath]
  );
  const remove = useCallback(
    async (id: string) => (await write(() => adminApi.del(`${basePath}/${id}`).then(() => true))) === true,
    [write, basePath]
  );

  return {
    rows,
    total,
    page,
    totalPages,
    pageSize,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    sort,
    order,
    setSort,
    isLoading,
    error,
    isUnauthorized,
    reload: fetchRows,
    create,
    update,
    remove,
    isSaving,
    saveError,
    fieldErrors,
    clearErrors,
  };
}
