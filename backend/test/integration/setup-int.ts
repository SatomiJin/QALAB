import { existsSync } from 'node:fs';

// Uses the real Supabase project from backend/.env. Values are never printed.
if (existsSync('.env')) process.loadEnvFile('.env');

for (const key of [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]) {
  if (!process.env[key]) {
    throw new Error(`${key} is required for integration tests (backend/.env)`);
  }
}

process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL ??= 'http://localhost:5173';
process.env.AUTH_RATE_LIMIT = '1000';
