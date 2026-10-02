// Deterministic env for API tests. The app ignores .env files when
// NODE_ENV=test, and API tests never talk to a real Supabase project.
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.CORS_ORIGIN_PATTERN = String.raw`^https://qalab-web-[a-z0-9-]+-team\.vercel\.app$`;
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.SWAGGER_ENABLED = 'true';
process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
// High enough that only the dedicated rate-limit spec ever hits it.
process.env.AUTH_RATE_LIMIT ??= '1000';
process.env.ATTEMPT_RATE_LIMIT ??= '1000';
// No response floor, except in the spec that tests it.
process.env.AUTH_MIN_RESPONSE_MS ??= '0';
