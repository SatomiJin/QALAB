# Architecture

## Overview

```text
┌──────────────┐   HTTPS (JSON)   ┌──────────────┐        ┌──────────────────────┐
│   Frontend   │ ───────────────> │ Backend API  │ ─────> │ Supabase Auth        │
│ React + Vite │  /api/v1/*       │   NestJS     │        │ Supabase PostgreSQL  │
│   (Vercel)   │  Bearer JWT      │ (Render/…)   │        │ (RLS enabled)        │
└──────────────┘                  └──────────────┘        └──────────────────────┘
```

* The frontend has no Supabase SDK and no Supabase keys. It only knows `VITE_API_BASE_URL`.
* The backend wraps Supabase Auth (`/auth/*`) and serves all data.
* The backend verifies the JWT on every protected request and derives `user_id` from it.
* Queries run through a per-request Supabase client carrying the user's JWT, so RLS is enforced as a second layer.
* The service-role key lives only in the backend and is used only for grading (answer keys) and session revocation.

## Request pipeline (backend)

1. `helmet` — security headers
2. CORS — only origins in `CORS_ORIGIN`
3. Global prefix `/api/v1`
4. Guards (Phase 1+) — `JwtAuthGuard`, `RolesGuard`
5. `ValidationPipe` — whitelist + reject unknown fields → `400` with `details`
6. Controller → service → Supabase
7. `AllExceptionsFilter` — converts every error to `{ statusCode, error, message, details? }`

## Request pipeline (frontend)

1. Components call TanStack Query hooks (`features/*`).
2. Hooks call the shared `api` client (`lib/http.ts`).
3. `api` attaches `Authorization: Bearer <accessToken>` when a token exists.
4. On `401`: one shared refresh call (wired in Phase 1), retry once, otherwise clear tokens and notify the unauthorized handler.
5. Non-2xx responses become `ApiError` with the backend error shape; network failures are `status 0`.
6. Queries retry only network/5xx errors.

## Configuration

Env variables are validated at startup (`src/config/env.validation.ts`). Invalid config stops the process with a list of problems.

## Status

| Phase | Backend | Frontend |
|---|---|---|
| 0 — Foundation | Done | Done |
