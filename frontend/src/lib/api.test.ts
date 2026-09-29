import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './api';
import { authStorage } from './auth-storage';

const BASE_URL = 'http://api.test/api/v1';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setup() {
  const fetchMock = vi.fn<typeof fetch>();
  const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchMock });
  return { client, fetchMock };
}

function lastRequest(
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  index = -1,
) {
  const call = fetchMock.mock.calls.at(index)!;
  return { url: String(call[0]), init: call[1]! };
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
  });
  authStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createApiClient', () => {
  it('builds the URL with query params and skips empty values', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, []));

    await client.get('/courses', {
      query: { skill: 'api_testing', page: 2, q: undefined, x: null },
    });

    expect(lastRequest(fetchMock).url).toBe(
      `${BASE_URL}/courses?skill=api_testing&page=2`,
    );
  });

  it('sends JSON bodies with the right headers', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(201, { id: '1' }));

    const result = await client.post<{ id: string }>('/things', { name: 'a' });

    const { init } = lastRequest(fetchMock);
    expect(result).toEqual({ id: '1' });
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"name":"a"}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('attaches the access token when present', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, {}));
    authStorage.setTokens({
      accessToken: 'abc',
      refreshToken: 'r',
      expiresAt: 0,
    });

    await client.get('/me');

    expect(
      (lastRequest(fetchMock).init.headers as Record<string, string>)
        .Authorization,
    ).toBe('Bearer abc');
  });

  it('does not attach the token when auth is false', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, {}));
    authStorage.setTokens({
      accessToken: 'abc',
      refreshToken: 'r',
      expiresAt: 0,
    });

    await client.get('/health', { auth: false });

    expect(
      (lastRequest(fetchMock).init.headers as Record<string, string>)
        .Authorization,
    ).toBeUndefined();
  });

  it('returns undefined for 204 responses', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(client.delete('/things/1')).resolves.toBeUndefined();
  });

  it('throws ApiError with the backend error body', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      json(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details: [{ field: 'email', message: 'email must be an email' }],
      }),
    );

    const error = await client
      .post('/auth/register', {})
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: [{ field: 'email', message: 'email must be an email' }],
    });
  });

  it('throws a generic ApiError for non-standard error bodies', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      new Response('<html>bad gateway</html>', { status: 502 }),
    );

    await expect(client.get('/x')).rejects.toMatchObject({
      status: 502,
      message: 'Unexpected server response.',
    });
  });

  it('maps network failures to status 0', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = (await client.get('/x').catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.isNetworkError).toBe(true);
  });

  it('rethrows aborts unchanged', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockRejectedValue(new DOMException('aborted', 'AbortError'));

    await expect(client.get('/x')).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  describe('401 handling', () => {
    const unauthorized = () =>
      json(401, {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Unauthorized',
      });

    it('clears tokens and calls the unauthorized handler when no refresh handler is set', async () => {
      const { client, fetchMock } = setup();
      const onUnauthorized = vi.fn();
      client.setUnauthorizedHandler(onUnauthorized);
      authStorage.setTokens({
        accessToken: 'old',
        refreshToken: 'r',
        expiresAt: 0,
      });
      fetchMock.mockResolvedValue(unauthorized());

      await expect(client.get('/me')).rejects.toMatchObject({ status: 401 });
      expect(onUnauthorized).toHaveBeenCalledOnce();
      expect(authStorage.getAccessToken()).toBeNull();
      expect(authStorage.getRefreshToken()).toBeNull();
    });

    it('refreshes once and retries with the new token', async () => {
      const { client, fetchMock } = setup();
      authStorage.setTokens({
        accessToken: 'old',
        refreshToken: 'r',
        expiresAt: 0,
      });
      client.setRefreshHandler(async () => {
        authStorage.setTokens({
          accessToken: 'new',
          refreshToken: 'r2',
          expiresAt: 0,
        });
        return true;
      });
      fetchMock
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(json(200, { ok: true }));

      await expect(client.get('/me')).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(
        (lastRequest(fetchMock).init.headers as Record<string, string>)
          .Authorization,
      ).toBe('Bearer new');
    });

    it('shares one refresh call between concurrent 401s', async () => {
      const { client, fetchMock } = setup();
      const refresh = vi.fn(async () => {
        authStorage.setTokens({
          accessToken: 'new',
          refreshToken: 'r2',
          expiresAt: 0,
        });
        return true;
      });
      client.setRefreshHandler(refresh);
      fetchMock.mockImplementation(async (_url, init) =>
        ((init?.headers ?? {}) as Record<string, string>).Authorization ===
        'Bearer new'
          ? json(200, {})
          : unauthorized(),
      );
      authStorage.setTokens({
        accessToken: 'old',
        refreshToken: 'r',
        expiresAt: 0,
      });

      await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);

      expect(refresh).toHaveBeenCalledOnce();
    });

    it('gives up when refresh fails', async () => {
      const { client, fetchMock } = setup();
      const onUnauthorized = vi.fn();
      client.setUnauthorizedHandler(onUnauthorized);
      client.setRefreshHandler(async () => {
        throw new Error('refresh failed');
      });
      fetchMock.mockResolvedValue(unauthorized());

      await expect(client.get('/me')).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    it('does not refresh for public requests', async () => {
      const { client, fetchMock } = setup();
      const refresh = vi.fn(async () => true);
      client.setRefreshHandler(refresh);
      fetchMock.mockResolvedValue(unauthorized());

      await expect(
        client.post('/auth/login', {}, { auth: false }),
      ).rejects.toMatchObject({ status: 401 });
      expect(refresh).not.toHaveBeenCalled();
    });
  });
});
