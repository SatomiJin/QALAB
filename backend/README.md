# QA Learning Lab — Backend

NestJS API for QA Learning Lab. The frontend talks only to this API; the API talks to Supabase (Auth + PostgreSQL with RLS).

## Requirements

* Node.js 22+
* A Supabase cloud project, linked from this folder (`npx supabase link`). There is no local Supabase (no Docker).

## Setup

```bash
npm install
cp .env.example .env   # then fill in the Supabase values
```

Where to find the Supabase values:

| Variable | Supabase dashboard (Project Settings → API) |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |

Other variables (`CORS_ORIGIN_PATTERN`, `AUTH_RATE_LIMIT`, `ATTEMPT_RATE_LIMIT`, `TRUST_PROXY_HOPS`, …) are described in `.env.example`. `CORS_ORIGIN_PATTERN` (optional) allows origins by regular expression, e.g. the frontend's Vercel preview deployments; it must be anchored `^https://…$` or the API does not start.

Deploying to Vercel (environment values, region, CORS for previews, cold starts): [docs/deployment.md](../docs/deployment.md).

Vietnamese content comes first from manual translations in `content_translations` (the seed has the sample course; no key needed). `GOOGLE_TRANSLATE_API_KEY` (optional, paid) adds machine translation for everything else. Create it in Google Cloud (Cloud Translation API enabled, billing on), restrict it to that API. Without it, texts that have no manual translation stay English (`translation: "unavailable"`). Translations are cached in `content_translations`, so each text version is billed once.

### Database

```bash
npx supabase db push                  # apply supabase/migrations to the linked project
npx supabase db push --include-seed   # … and supabase/seed.sql (sample course), first time only
npx supabase db query --linked -f supabase/seed.sql   # re-run the (idempotent) seed after editing it
```

Skills are reference data inside a migration. `seed.sql` holds sample content only; it uses fixed ids and `on conflict do nothing`, so re-running it is safe. Run `npm run test:int` after pushing: it checks RLS against the real database.

### Supabase Auth settings (cloud dashboard)

Email links must open the **frontend**, which posts the token hash to this API. Set once per project:

1. **Authentication → URL Configuration**: Site URL = frontend URL; add `<FRONTEND_URL>/auth/verify` and `<FRONTEND_URL>/auth/reset-password` to Redirect URLs.
2. **Authentication → Email Templates**: paste `supabase/templates/confirmation.html` into *Confirm signup* and `supabase/templates/recovery.html` into *Reset password*. Both link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=…`.
3. **Authentication → Sign In / Providers → Email**: Confirm email on; minimum password length 8.

The same values are recorded in `supabase/config.toml` (`[auth]`). The built-in Supabase SMTP sends only a few emails per hour and only to project team members; set up custom SMTP for real users.

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
| `npm run test:e2e` | API tests with Supertest; Supabase Auth faked in memory (`test/api/*.e2e-spec.ts`) |
| `npm run test:int` | Integration tests against the linked project: RLS + real auth flows (`test/integration/*.int-spec.ts`). Creates and deletes `qalab-it-*@example.com` users; sends no email |
| `npm run db:push` | Apply migrations to the linked project |
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
├── auth/                   # /auth/*, JwtAuthGuard (global), RolesGuard, @Public, @Roles, @CurrentUser
├── profile/                # GET/PATCH /me, ProfilesRepository
└── health/                 # GET /api/v1/health
supabase/
├── config.toml             # Supabase config (auth section mirrors the cloud project)
├── templates/              # Auth email templates
├── migrations/             # All DB changes
└── seed.sql
test/
├── setup-env.ts            # Deterministic env for API tests
├── support/                # Fake Supabase Auth (real ES256 JWTs) + test app factory
├── api/                    # Supertest API tests
└── integration/            # Against the linked Supabase project
```

## Conventions

* All routes are under `/api/v1`.
* Errors always use this shape:

  ```json
  { "statusCode": 400, "error": "Bad Request", "message": "Validation failed", "details": [{ "field": "email", "message": "email must be an email" }] }
  ```

* Unknown fields in request bodies are rejected (`400`).
* Unexpected errors return a generic `500` message; details are only logged server-side.
* Every route needs `Authorization: Bearer <accessToken>` unless marked `@Public()`. Access tokens are verified locally against the project JWKS (ES256).
* Admin routes add `@Roles('admin')`. The role is read from `profiles`, never from the token or the request body.
* Supabase clients:
  * `forUser(token)` — per request, RLS applies. Default choice.
  * `anon()` — fresh client for public auth calls.
  * `service()` — bypasses RLS. Only for grading and session revocation.
