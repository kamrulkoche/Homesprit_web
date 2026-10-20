/**
 * API Configuration — single source of truth for the client-side API base URL.
 *
 * Ported from hgs-frontend (which took it from sp-company-ltd-ui) with its
 * central rule intact: every consumer imports `API_BASE_URL` from here rather
 * than reading `process.env`, so no call site can reintroduce the
 * trailing-slash bug (`${base}/properties` producing `//properties`). An ESLint
 * rule enforces it.
 *
 * As in HGS, the default is the RELATIVE `/api/public` — a route handler in
 * this app that forwards to `HOMESPRIT_BACKEND_URL` server-side — so the
 * backend's address never reaches the browser.
 */

/** Raw base URL from the environment, trailing slashes stripped. */
const RAW_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api/public').replace(
  /\/+$/,
  ''
);

/**
 * Local origin, used to absolutise a relative base for server-side callers —
 * Node cannot resolve a relative URL. Never consulted in the browser.
 */
const LOCAL_ORIGIN = (process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3002').replace(
  /\/+$/,
  ''
);

/**
 * API base URL, guaranteed to carry no trailing slash.
 *
 * - Browser  → `/api/public` (relative, same-origin, proxied)
 * - Server   → `http://localhost:3002/api/public`
 * - Absolute → returned untouched
 */
export const API_BASE_URL: string = (() => {
  if (RAW_BASE_URL.startsWith('http://') || RAW_BASE_URL.startsWith('https://')) {
    return RAW_BASE_URL;
  }
  if (typeof window === 'undefined') {
    return `${LOCAL_ORIGIN}${RAW_BASE_URL}`;
  }
  return RAW_BASE_URL;
})();

/** Request timeout in milliseconds. Matches the reference's 10s default. */
export const API_TIMEOUT = 10_000;
