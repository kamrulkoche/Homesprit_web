import axios, { AxiosError, AxiosResponse } from 'axios';
import type ResponseInterface from '@/interface/response.interface';
import { API_BASE_URL, API_TIMEOUT } from '@/config/apiConfig';

/**
 * The one HTTP client the Redux/saga layer uses.
 *
 * Ported from hgs-frontend, which ported it from `sp-company-ltd-ui`. The
 * verb helpers, `responseBody` / `errorResponseBody`, the `httpStatus` plumbing
 * and the cancellation swallow are kept as-is, because sagas in all three repos
 * are written against exactly this surface.
 *
 * Like hgs-frontend's copy it carries no auth interceptor and one instance
 * rather than three: `/api/public/*` is anonymous, and the dashboard
 * authenticates with an httpOnly cookie the browser attaches by itself.
 */

export const responseBody = (response: AxiosResponse) => {
  return response.data;
};

/**
 * Name of the NON-enumerable property carrying the HTTP status on a rejected
 * response body. `httpRequest` rejects with `error.response.data`, which would
 * otherwise lose the status, leaving 404 / 409 / 5xx indistinguishable in a
 * saga's catch block. Non-enumerable so spreads, `JSON.stringify` and deep
 * equality see the body exactly as before.
 */
export const HTTP_STATUS_PROPERTY = 'httpStatus';

/** Attach the status to an object body in place; strings / frozen bodies are left alone. */
export const attachHttpStatus = (body: unknown, status: number | undefined) => {
  if (
    typeof status !== 'number' ||
    !body ||
    typeof body !== 'object' ||
    !Object.isExtensible(body) ||
    Object.prototype.hasOwnProperty.call(body, HTTP_STATUS_PROPERTY)
  ) {
    return;
  }
  try {
    Object.defineProperty(body, HTTP_STATUS_PROPERTY, {
      value: status,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  } catch {
    // Never let status plumbing change how the request rejects.
  }
};

export const errorResponseBody = (error: AxiosError) => {
  // React StrictMode and fast remounts cancel in-flight requests via
  // AbortController; axios rejects those with `ERR_CANCELED`. Surfacing them
  // would flash "failed to load" on the first navigation even though the
  // second mount's request succeeds. Swallow them — the saga's `takeLatest`
  // has already discarded the cancelled worker, so nothing is waiting.
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
    return new Promise(() => {
      /* never resolve, never reject — let the takeLatest cancellation win */
    });
  }

  if (error.response) {
    attachHttpStatus(error.response.data, error.response.status);
    return Promise.reject(error.response.data);
  }

  return Promise.reject(error);
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

export { axiosInstance };

// istanbul ignore next
const httpRequest = {
  get: <T>(url = '', params = {}, headers = {}) =>
    axiosInstance
      .get<ResponseInterface<T>>(url, { params: params, headers })
      .then(responseBody)
      .catch(errorResponseBody),

  post: <T>(url = '', body = {}, headers = {}) =>
    axiosInstance
      .post<ResponseInterface<T>>(url, body, { headers })
      .then(responseBody)
      .catch(errorResponseBody),

  put: <T>(url = '', body = {}, headers = {}) =>
    axiosInstance
      .put<ResponseInterface<T>>(url, body, { headers })
      .then(responseBody)
      .catch(errorResponseBody),

  patch: <T>(url = '', body = {}, headers = {}) =>
    axiosInstance
      .patch<ResponseInterface<T>>(url, body, { headers })
      .then(responseBody)
      .catch(errorResponseBody),

  delete: <T>(url = '', headers = {}, body = {}, params = {}) =>
    axiosInstance
      .delete<ResponseInterface<T>>(url, {
        data: body,
        params,
        headers,
      })
      .then(responseBody)
      .catch(errorResponseBody),

  getBlob: (url = '', params = {}, headers = {}) =>
    axiosInstance
      .get(url, { params, headers, responseType: 'blob' })
      .then((res) => res.data as Blob),
};

export default httpRequest;
