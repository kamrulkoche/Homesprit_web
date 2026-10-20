import { AxiosError } from 'axios';

/**
 * The one place a saga's `catch` block goes.
 *
 * Ported unchanged from hgs-frontend, which ported it from
 * `sp-company-ltd-ui` — same exported surface (`ERROR_TYPES`, `ErrorDetails`,
 * `getErrorDetails`, `extractFieldErrors`, `humanizeErrorMessage`,
 * `logSagaError`), so sagas read identically across all three repos. The
 * FastAPI-shaped parsing applies here too: homesprit-backend is FastAPI.
 */

// ====================================
// FIELD ERROR EXTRACTION (Pydantic 422)
// ====================================

export interface IFieldError {
  field: string;
  message: string;
}

type PydanticDetailItem = {
  loc?: unknown[];
  msg?: unknown;
  type?: unknown;
};

// Read the `detail` array from either an AxiosError or the plain object that
// httpRequest's catch forwards (`error.response.data`).
const readDetailArray = (error: unknown): PydanticDetailItem[] | null => {
  if (error instanceof AxiosError) {
    const d = error.response?.data?.detail;
    return Array.isArray(d) ? (d as PydanticDetailItem[]) : null;
  }
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const d = (error as { detail?: unknown }).detail;
    return Array.isArray(d) ? (d as PydanticDetailItem[]) : null;
  }
  return null;
};

// Read the flat `errors` object — the backend's convention for 400/409:
//   { detail: "Validation error", errors: { slug: "already exists" } }
const readErrorsObject = (error: unknown): Record<string, string> | null => {
  const src =
    error instanceof AxiosError
      ? error.response?.data
      : (error as { errors?: unknown } | null);
  const errs =
    src && typeof src === 'object' ? (src as { errors?: unknown }).errors : null;
  if (!errs || typeof errs !== 'object' || Array.isArray(errs)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errs as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
};

/**
 * Pull per-field messages out of a rejection, for form-level display.
 *
 * Returns null when the error is not field-shaped, which is the signal to fall
 * back to `getErrorDetails().message`.
 */
export const extractFieldErrors = (error: unknown): IFieldError[] | null => {
  // 422 Pydantic: `detail` is an array of { loc, msg, type }.
  const detail = readDetailArray(error);
  if (detail) {
    const fromDetail: IFieldError[] = [];
    for (const item of detail) {
      if (!item.loc || !Array.isArray(item.loc) || !item.msg) continue;
      const field = item.loc[item.loc.length - 1];
      if (typeof field !== 'string' || field === 'body') continue;
      const message = (item.msg as string).replace(/^Value error,\s*/i, '');
      fromDetail.push({ field, message });
    }
    if (fromDetail.length > 0) return fromDetail;
  }

  // 400/409: flat `errors` object.
  const errs = readErrorsObject(error);
  if (errs) {
    return Object.entries(errs).map(([field, message]) => ({ field, message }));
  }

  return null;
};

export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  statusCode?: number;
}

// Strip FastAPI's technical prefixes so the user sees a sentence rather than a
// framework artefact ("Value error, slug must be lowercase" -> "slug must be …").
const TECHNICAL_PREFIX = /^(?:validation error|value error)[:,]\s*/i;

export const humanizeErrorMessage = (message: string): string =>
  typeof message === 'string' ? message.replace(TECHNICAL_PREFIX, '').trim() : message;

/** Classify any thrown value into a type, a user-facing message and a status. */
export const getErrorDetails = (error: unknown): ErrorDetails => {
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status;
    const rawDetail = error.response?.data?.detail;
    // FastAPI 422 returns `detail` as an array of { loc, msg, type }.
    const detail = Array.isArray(rawDetail)
      ? rawDetail
          .map((d: { msg?: string; loc?: string[] }) =>
            humanizeErrorMessage(d.msg || String(d.loc?.join('.') ?? ''))
          )
          .filter(Boolean)
          .join('. ')
      : typeof rawDetail === 'string'
        ? humanizeErrorMessage(rawDetail)
        : rawDetail;
    const serverMessage =
      error.response?.data?.message || error.response?.data?.error || detail;

    if (!error.response) {
      return {
        type: ERROR_TYPES.NETWORK_ERROR,
        message: 'Network error. Please check your connection and try again.',
      };
    }

    if (statusCode === 401 || statusCode === 403) {
      return {
        type: ERROR_TYPES.AUTHENTICATION_ERROR,
        message: serverMessage || 'Your session has ended. Please sign in again.',
        statusCode,
      };
    }

    if (statusCode === 400 || statusCode === 422) {
      return {
        type: ERROR_TYPES.VALIDATION_ERROR,
        message: serverMessage || 'Invalid data provided. Please check your input.',
        statusCode,
      };
    }

    if (statusCode && statusCode >= 500) {
      return {
        type: ERROR_TYPES.SERVER_ERROR,
        message: serverMessage || 'Server error. Please try again later.',
        statusCode,
      };
    }

    return {
      type: ERROR_TYPES.UNKNOWN_ERROR,
      message: serverMessage || error.message || 'An unexpected error occurred.',
      statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      type: ERROR_TYPES.UNKNOWN_ERROR,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  // Plain object — the shape `httpRequest` rejects with.
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const obj = error as Record<string, unknown>;
    const errorsObj = obj.errors;

    const detailArrayMsg = Array.isArray(obj.detail)
      ? (obj.detail as Array<{ msg?: unknown; loc?: unknown[] }>)
          .map((d) =>
            humanizeErrorMessage(
              String(d.msg || (Array.isArray(d.loc) ? d.loc.join('.') : ''))
            )
          )
          .filter(Boolean)
          .join('. ')
      : null;

    const msg =
      (typeof obj.message === 'string' && obj.message) ||
      (typeof obj.error === 'string' && obj.error) ||
      (errorsObj &&
        typeof errorsObj === 'object' &&
        !Array.isArray(errorsObj) &&
        Object.values(errorsObj as Record<string, string>).join('. ')) ||
      (typeof obj.detail === 'string' && humanizeErrorMessage(obj.detail)) ||
      detailArrayMsg;

    // A validation envelope is expected business feedback the form surfaces,
    // not a code defect — classify it so `logSagaError` warns instead of errors.
    const isValidationEnvelope =
      (errorsObj && typeof errorsObj === 'object' && !Array.isArray(errorsObj)) ||
      Array.isArray(obj.detail) ||
      (typeof obj.detail === 'string' && /validation error/i.test(obj.detail));

    if (typeof msg === 'string' && msg) {
      return {
        type: isValidationEnvelope
          ? ERROR_TYPES.VALIDATION_ERROR
          : ERROR_TYPES.UNKNOWN_ERROR,
        message: msg,
        statusCode:
          typeof obj.statusCode === 'number'
            ? obj.statusCode
            : // The non-enumerable status `httpRequest` attaches to a rejected
              // body (see `HTTP_STATUS_PROPERTY`).
              typeof obj.httpStatus === 'number'
              ? obj.httpStatus
              : undefined,
      };
    }
  }

  return {
    type: ERROR_TYPES.UNKNOWN_ERROR,
    message: 'An unexpected error occurred.',
  };
};

// Raw Error objects log as `{}` because their properties are non-enumerable —
// build a serializable view so the console always shows something useful.
function serializeErrorForLog(error: unknown): Record<string, unknown> {
  if (error instanceof AxiosError) {
    return {
      name: error.name,
      message: error.message,
      ...(error.response && {
        status: error.response.status,
        data: error.response.data,
      }),
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    return { ...error } as Record<string, unknown>;
  }
  return { value: String(error) };
}

/**
 * Log a saga failure and return its classified details.
 *
 * EVERY saga catch block calls this — `const d = logSagaError('fetchXSaga', e)`
 * — and dispatches `fetchXFailed(d.message)`.
 *
 * Network errors, auth expiry and validation rejections are environmental rather than
 * defects, so they log as warnings. Everything else is a red console error.
 */
export const logSagaError = (sagaName: string, error: unknown): ErrorDetails => {
  const errorDetails = getErrorDetails(error);
  const prefix = `Error in ${sagaName}: [${errorDetails.type}] ${errorDetails.message}`;
  const payload = {
    type: errorDetails.type,
    message: errorDetails.message,
    statusCode: errorDetails.statusCode,
    originalError: serializeErrorForLog(error),
  };

  if (
    errorDetails.type === ERROR_TYPES.NETWORK_ERROR ||
    errorDetails.type === ERROR_TYPES.VALIDATION_ERROR ||
    errorDetails.type === ERROR_TYPES.AUTHENTICATION_ERROR
  ) {
    console.warn(prefix, payload);
  } else {
    console.error(prefix, payload);
  }

  return errorDetails;
};
