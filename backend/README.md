# QA Learning Lab — Backend

NestJS API for QA Learning Lab. The frontend talks only to this API; the API talks to Supabase (Auth + PostgreSQL with RLS).

## Requirements

* Node.js 22+
* A Supabase project, either:
  * **Local** — Docker Desktop + `npm run db:start`, or
  * **Cloud** — free project at supabase.com

## Setup

```bash
npm install
cp .env.example .env   # then fill in the Supabase values
```

Where to find the Supabase values:

| Variable | Local (`npm run db:status`) | Cloud (Project Settings → API) |
|---|---|---|
| `SUPABASE_URL` | API URL | Project URL |
| `SUPABASE_ANON_KEY` | anon key | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | service_role / secret key |

The app validates all env variables at startup and refuses to boot if any are missing or invalid.

## Run

```bash
npm run start:dev      # watch mode, http://localhost:3000
npm run build && npm run start:prod
```

* Health: `GET http://localhost:3000/api/v1/health`
* Swagger UI: `http://localhost:3000/api/docs`
* OpenAPI JSON: `http://localhost:3000/api/docs-json`

## Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run typecheck` | Type-check src + tests |
| `npm run lint` | Lint with oxlint |
| `npm run format` | Format with Prettier |
| `npm test` | Unit tests (`src/**/*.spec.ts`) |
| `npm run test:e2e` | API tests with Supertest (`test/**/*.e2e-spec.ts`) |
| `npm run db:start` / `db:stop` / `db:status` | Local Supabase (Docker) |
| `npm run db:reset` | Recreate local DB from migrations + seed |
| `npm run db:migration <name>` | Create a new migration file |
| `npm run db:types` | Generate DB types into `src/supabase/database.types.ts` |

## Structure

```text
src/
├── main.ts                 # Bootstrap
├── app.module.ts
├── app.setup.ts            # Global config shared by main + e2e tests
├── config/                 # Env validation + typed AppConfigService
├── common/
│   ├── errors/             # ErrorResponseDto (the single error shape)
│   ├── filters/            # AllExceptionsFilter
│   └── pipes/              # Global ValidationPipe
├── supabase/               # SupabaseService: forUser(), anon(), service()
└── health/                 # GET /api/v1/health
supabase/
├── config.toml             # Local Supabase config
├── migrations/             # All DB changes
└── seed.sql
test/
├── setup-env.ts            # Deterministic env for tests
└── app.e2e-spec.ts
```

## Conventions

* All routes are under `/api/v1`.
* Errors always use this shape:

  ```json
  { "statusCode": 400, "error": "Bad Request", "message": "Validation failed", "details": [{ "field": "email", "message": "email must be an email" }] }
  ```

* Unknown fields in request bodies are rejected (`400`).
* Unexpected errors return a generic `500` message; details are only logged server-side.
* Supabase clients:
  * `forUser(token)` — per request, RLS applies. Default choice.
  * `anon()` — fresh client for public auth calls.
  * `service()` — bypasses RLS. Only for grading and session revocation.
