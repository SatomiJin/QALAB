# Deployment (Vercel)

Two Vercel projects from the same GitHub repository: the frontend (static Vite build) and the backend (NestJS as a Vercel Function, detected with zero configuration from `src/main.ts`). Supabase stays the cloud project; migrations are applied with `npx supabase db push` as usual, and the curriculum with `npm run seed:curriculum` (from `backend/`), not by Vercel.

```text
Browser ──► qalab-web (frontend/, static)      https://<frontend-domain>
   │
   └─────► qalab-api (backend/, Function hnd1) https://<backend-domain>/api/v1 ──► Supabase (ap-northeast-1)
```

## 1. Backend project (`qalab-api`)

* Import the repository, **Root Directory `backend`**. Framework: NestJS (detected). No build command or output directory.
* `backend/vercel.json` pins the function to `hnd1` (Tokyo), next to the Supabase project (`ap-northeast-1`): every request makes several database calls, so the regions must match. Change both together if the Supabase project moves.
* Environment variables (Production; Preview only if previews should have their own API, see below). Names and meaning: [`backend/.env.example`](../backend/.env.example).

| Variable | Value on Vercel |
| --- | --- |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://<frontend-domain>` (comma-separated: add custom domains) |
| `CORS_ORIGIN_PATTERN` | optional, preview deployments: `^https://qalab-web-[a-z0-9-]+-<scope>\.vercel\.app$` |
| `FRONTEND_URL` | `https://<frontend-domain>` |
| `SWAGGER_ENABLED` | `false` |
| `TRUST_PROXY_HOPS` | `1` |
| `AUTH_RATE_LIMIT`, `ATTEMPT_RATE_LIMIT` | `5`, `20` (defaults) |
| `AUTH_MIN_RESPONSE_MS` | `1500` (default); raise it if the logs say "over AUTH_MIN_RESPONSE_MS" |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | same place; mark **Sensitive** |
| `GOOGLE_TRANSLATE_API_KEY` | optional; mark Sensitive |

* Check after the deploy: `https://<backend-domain>/api/v1/health` answers `{ "status": "ok" }`.

## 2. Frontend project (`qalab-web`)

* Import the same repository again, **Root Directory `frontend`**. Framework: Vite (detected), output `dist`.
* `frontend/vercel.json`: every path except `/assets/*` falls back to `index.html` (client-side routes such as `/dashboard` survive a reload), hashed `/assets/*` are cached for a year (a missing asset is a `404`: falling back would serve `index.html` as a JS file with the one-year cache, and a tab that asked for a chunk during a deploy kept failing after reloads, seen on 2026-10-07), and basic security headers (`nosniff`, `DENY` framing, referrer policy).
* One variable, for Production **and** Preview: `VITE_API_BASE_URL=https://<backend-domain>/api/v1`. It is baked into the bundle at build time: redeploy after changing it. It is public; never put a key in a `VITE_` variable.

## 3. Supabase dashboard

Authentication → URL Configuration:

* **Site URL** = `https://<frontend-domain>`.
* **Redirect URLs**: `https://<frontend-domain>/auth/verify` and `https://<frontend-domain>/auth/reset-password` (keep the localhost ones for development).

Email links always go to `FRONTEND_URL`, the production frontend, also when you signed up on a preview.

## 4. Domains and CORS

The browser sends `Origin: <page origin>` with every API call; the API answers with `Access-Control-Allow-Origin` only for allowed origins, otherwise the browser blocks the response. Allowed = an exact entry of `CORS_ORIGIN`, or a match of `CORS_ORIGIN_PATTERN`.

* **Production**: the frontend domain is stable (`qalab-web.vercel.app`, or a custom domain such as `qalab.example.com`), so it goes in `CORS_ORIGIN`. Add every domain the frontend is served from; `https://` and no trailing slash, exactly as the browser shows it.
* **Preview deployments** get a new URL per deployment (`qalab-web-<hash>-<scope>.vercel.app`) and per branch (`qalab-web-git-<branch>-<scope>.vercel.app`). They cannot be listed, so set `CORS_ORIGIN_PATTERN` to a regular expression for exactly that project and Vercel scope. `<scope>` is the team or account slug shown in the preview URLs (copy it from one). The API refuses to start with a pattern that is not anchored `^https://…$`, so a typo cannot open it to every site; keep the project name and scope in it (`.*\.vercel\.app` would allow anyone's Vercel app).
* **Custom domains** (optional): frontend `qalab.example.com`, API `api.qalab.example.com`. Add them in each project's Settings → Domains, then put the frontend one in `CORS_ORIGIN` and `FRONTEND_URL`, the API one in `VITE_API_BASE_URL`, and update the Supabase redirect URLs. Domains do not change preview handling.
* **Previews share production data.** With one backend, a preview frontend uses the production API and database: the same accounts and progress. Fine for checking UI changes; do not test destructive admin actions there. A fully separate preview stack would need a second Supabase project and a second backend deployment.

## 5. Cold starts

A Vercel Function is started on demand. After a while without requests the next one waits for a fresh start (Node, Nest modules, first Supabase connection): typically a second or two; later requests are fast. This is about idle time, not about domains or CORS.

* Keep Swagger off in production (`SWAGGER_ENABLED=false`): building the OpenAPI document is part of every start.
* Keep the function in the database's region (`hnd1`); a far region adds latency to every request, cold or warm.
* Optional: an external uptime monitor (e.g. every 5 minutes on `/api/v1/health`) keeps one instance warm. Not needed for a personal app.

## 6. Known limits on Vercel

* **Rate limits are per instance.** `RateLimitGuard` counts in memory (`RateLimitStore`); requests can reach different instances, and instances restart, so the `/auth/*` limit (brute force) and the attempt limit are weaker than on one long-running server. Shared counters need a store such as Redis (e.g. Upstash): not done yet.
* Request bodies are limited to 4.5 MB by Vercel (the API allows 1 MB).
* **ES modules only.** The backend is ESM (`"type": "module"`, Nest 12 packages are ESM-only). Vercel's function loader cannot `require()` an ES module, which local Node 22 can: a CommonJS dependency that `require()`s `@nestjs/common` builds fine and then crashes every request with `500 FUNCTION_INVOCATION_FAILED` / `ERR_REQUIRE_ESM` in the runtime logs. That is why `@nestjs/throttler` was replaced by our own guard. Check new dependencies for this before adding them.
* **Type-checking uses the CommonJS types of dual packages** (e.g. `helmet`): a default import that is a function locally can be the module object there (`TS2349 not callable`). `app.setup.ts` unwraps helmet for both shapes.

## 7. Troubleshooting

* Requests hang ("Waiting for response") on a Ready deployment: `main.ts` must not top-level `await bootstrap()`. Vercel imports the module and takes over `listen()`, so the import never finishes; `void bootstrap()` is used.
* `500 FUNCTION_INVOCATION_FAILED`: open the project's **Logs** (runtime, level Error) and reload the failing URL. `Invalid environment configuration: - NAME: …` = a missing or invalid variable (fix it, then **Redeploy**: variables apply to new deployments only). `ERR_REQUIRE_ESM` = a CommonJS dependency (see above).
* Vercel login page instead of the API: that URL is a preview / branch URL behind Deployment Protection; use the production domain.
* `/api/v1/health` only proves the app started. `POST /api/v1/auth/login` with an unknown account answering `401 Invalid email or password` proves the Supabase URL and keys work (5 tries a minute, then `429`).

## 8. Before pushing

```bash
cd backend && npm run typecheck && npm run lint && npm test && npm run test:e2e && npm run build
cd ../frontend && npm run typecheck && npm run lint && npm test && npm run build
```

`.env` files are git-ignored; keys live only in the Vercel and Supabase dashboards. The repository is public: check staged changes for keys before every commit.
