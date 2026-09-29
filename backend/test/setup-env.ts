// Deterministic env for API tests. The app ignores .env files when
// NODE_ENV=test, and API tests never talk to a real Supabase project.
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.SWAGGER_ENABLED = 'true';
process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
// High enough that only the dedicated rate-limit spec ever hits it.
process.env.AUTH_RATE_LIMIT ??= '1000';
