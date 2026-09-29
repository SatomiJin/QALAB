import type { ApiErrorBody, ApiErrorDetail } from '../types/api';
import { authStorage } from './auth-storage';

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly details: ApiErrorDetail[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.statusCode;
    this.error = body.error;
    this.details = body.details ?? [];
  }

  /** `status === 0` means the request never reached the server. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Attach the access token and handle 401. Default `true`. */
  auth?: boolean;
  signal?: AbortSignal;
}

/** Returns `true` when new tokens were stored and the request can be retried. */
export type RefreshHandler = () => Promise<boolean>;

export interface ApiClientConfig {
  baseUrl: string;
  fetch?: typeof fetch;
  /** Current time in ms. Injectable for tests. */
  now?: () => number;
}

/** Refresh this long before the access token expires. */
export const REFRESH_MARGIN_SECONDS = 30;

export interface ApiClient {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  get<T>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T>;
  post<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T>;
  patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T>;
  put<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T>;
  delete<T>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T>;
  /** Renews tokens (`POST /auth/refresh`). Set by the auth feature. */
  setRefreshHandler(handler: RefreshHandler | null): void;
  /** Called when a request is unauthorized and refresh is not possible. */
  setUnauthorizedHandler(handler: (() => void) | null): void;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const url = new URL(`${baseUrl}/${path.replace(/^\/+/, '')}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).statusCode === 'number' &&
    typeof (value as ApiErrorBody).message === 'string'
  );
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const doFetch =
    config.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  let refreshHandler: RefreshHandler | null = null;
  let unauthorizedHandler: (() => void) | null = null;
  // Concurrent 401s share one refresh call.
  let refreshInFlight: Promise<boolean> | null = null;

  async function refreshOnce(): Promise<boolean> {
    if (!refreshHandler) return false;
    refreshInFlight ??= refreshHandler()
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  }

  /**
   * True when the access token is missing (after a reload only the refresh
   * token survives) or about to expire.
   */
  function shouldRefreshFirst(): boolean {
    if (!refreshHandler || !authStorage.getRefreshToken()) return false;
    const expiresAt = authStorage.getExpiresAt();
    if (!authStorage.getAccessToken()) return true;
    if (!expiresAt) return false;
    const now = (config.now ?? Date.now)() / 1000;
    return expiresAt - now < REFRESH_MARGIN_SECONDS;
  }

  async function send(
    path: string,
    options: RequestOptions,
  ): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = options.auth === false ? null : authStorage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body !== undefined)
      headers['Content-Type'] = 'application/json';

    try {
      return await doFetch(buildUrl(config.baseUrl, path, options.query), {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError')
        throw error;
      throw new ApiError({
        statusCode: 0,
        error: 'Network Error',
        message:
          'Cannot reach the server. Check your connection and try again.',
      });
    }
  }

  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    if (options.auth !== false && shouldRefreshFirst()) {
      await refreshOnce();
    }
    let response = await send(path, options);

    if (response.status === 401 && options.auth !== false) {
      if (await refreshOnce()) {
        response = await send(path, options);
      }
      if (response.status === 401) {
        authStorage.clear();
        unauthorizedHandler?.();
      }
    }

    const body = await parseBody(response);

    if (!response.ok) {
      throw new ApiError(
        isErrorBody(body)
          ? body
          : {
              statusCode: response.status,
              error: response.statusText || 'Error',
              message: 'Unexpected server response.',
            },
      );
    }

    return body as T;
  }

  return {
    request,
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) =>
      request(path, { ...options, method: 'POST', body }),
    patch: (path, body, options) =>
      request(path, { ...options, method: 'PATCH', body }),
    put: (path, body, options) =>
      request(path, { ...options, method: 'PUT', body }),
    delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
    setRefreshHandler(handler) {
      refreshHandler = handler;
    },
    setUnauthorizedHandler(handler) {
      unauthorizedHandler = handler;
    },
  };
}
