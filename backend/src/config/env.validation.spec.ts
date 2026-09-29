import { NodeEnv, validateEnv } from './env.validation.js';

const REQUIRED = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
};

describe('validateEnv', () => {
  it('applies defaults when only required variables are set', () => {
    const env = validateEnv({ ...REQUIRED });

    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173');
    expect(env.SWAGGER_ENABLED).toBe(true);
    expect(env.AUTH_RATE_LIMIT).toBe(5);
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });

  it('converts string values from process.env', () => {
    const env = validateEnv({
      ...REQUIRED,
      PORT: '4000',
      SWAGGER_ENABLED: 'false',
      NODE_ENV: 'production',
    });

    expect(env.PORT).toBe(4000);
    expect(env.SWAGGER_ENABLED).toBe(false);
    expect(env.NODE_ENV).toBe(NodeEnv.Production);
  });

  it.each(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])(
    'fails when %s is missing',
    (key) => {
      const config: Record<string, unknown> = { ...REQUIRED };
      delete config[key];

      expect(() => validateEnv(config)).toThrow(key);
    },
  );

  it.each([
    ['PORT', '0'],
    ['PORT', '70000'],
    ['PORT', 'abc'],
    ['NODE_ENV', 'staging'],
    ['SUPABASE_URL', 'not-a-url'],
    ['FRONTEND_URL', 'localhost:5173'],
    ['AUTH_RATE_LIMIT', '0'],
    ['TRUST_PROXY_HOPS', '-1'],
  ])('rejects invalid %s=%s', (key, value) => {
    expect(() => validateEnv({ ...REQUIRED, [key]: value })).toThrow(key);
  });
});
