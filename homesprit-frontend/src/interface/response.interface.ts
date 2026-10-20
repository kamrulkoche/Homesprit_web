/* ---------------------------------------------------------------------------
   Two response contracts live here, as in hgs-frontend, and they are unrelated:

   - `IResponse<T>` — this app's OWN route handlers (`/api/inquiries`,
     `/api/admin/login`): `{ success, message }` or `{ success, error }`.
   - `ResponseInterface<T>` — what the Redux/saga transport resolves with: the
     backend's `{ status, success, data }` envelope, passed through untouched by
     the `/api/public` proxy. Ported from sp-company-ltd-ui via hgs-frontend so
     sagas read identically across the projects.
   ------------------------------------------------------------------------- */

export interface ISuccessResponse {
  success: true;
  message: string;
}

export interface IErrorResponse {
  success: false;
  error: string;
  /** Per-field messages, keyed by field name, when the failure is a form's. */
  fields?: Record<string, string>;
}

export type IResponse = ISuccessResponse | IErrorResponse;

export interface SuccessResponseIn<T> {
  status: number;
  success: true;
  message?: string;
  data: T;
}

export interface ErrorResponseInterface {
  status: number;
  success: false;
  message: string;
}

export type ResponseInterface<T> = SuccessResponseIn<T> | ErrorResponseInterface;

export default ResponseInterface;
