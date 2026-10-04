---
paths:
  - "backend/**"
---

# Backend rules (NestJS)

Applies to everything in `backend/`. Cross-cutting logic rules: [logic.md](logic.md). Database: [database.md](database.md).

## Module layout

One folder per feature under `src/` (`auth/`, `profile/`, …):

```text
src/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts     # HTTP + Swagger only, no logic
├── <feature>.service.ts        # business rules, row → DTO mapping
├── <name>.repository.ts        # Supabase queries only (one per table or per read-only group, e.g. content.repository.ts)
├── <rules>.ts + <rules>.spec.ts # pure business rules, no Nest/Supabase (e.g. learning/outline.ts)
└── dto/<feature>.dto.ts        # request/response classes (class-validator + Swagger)
```

* Put decisions (what counts as "completed", which lesson comes next, how progress merges, how an answer is graded) in pure functions and unit-test them. Services load rows, call those functions, map to DTOs.
* JSON documents whose shape depends on a row's type (exercise `prompt_data`, answer keys, answers) are validated by pure `parse*` functions returning `{ ok, value } | { ok: false, errors: [{ field, message }] }` (`practice/exercise-schema.ts`), not by class-validator. The DTO only checks `@IsObject()`; the service turns parse errors into `400 { details }` with paths like `answer.mapping.login`. Unknown keys are errors.
* Data that is ours and broken (invalid prompt data, missing answer key) is a server bug: throw a plain `Error` with a precise message (the filter logs it and answers a generic 500). Never put secret values (answer keys) in that message.
* Features reuse another module's repositories through `exports` (`LearningModule` exports `ContentRepository` for practice), never by re-declaring the provider.
* The Admin CMS (`src/admin/`) has one repository for all content tables (`AdminContentRepository`, generic `find/insert/update/remove` by `ContentKind`, typed with `RowByKind` / `WriteByKind` / `UpdateByKind`), because courses, modules, lessons and exercises are edited together. Its write types list only the columns the DB grants. Big routers split into several controllers on the same prefix (`AdminCoursesController`, `AdminLessonsController`); a service may use another (`AdminExercisesService` uses `AdminService.findOr404` / `reorder` / `removeUnused`).

* The translatable texts of a content row (field name, English, Markdown or not, limit) come from one pure function, `contentTexts(kind, row)` in `translation/translatable-texts.ts`, with `markdownParityErrors` (headings / code fences) shared by the CMS and the curriculum importer. The CMS translation editor (`AdminTranslationsController` / `AdminTranslationsService`, one GET + PUT per kind on the content's own path) keeps its decisions in `admin/translation-rules.ts` (`describeTranslations`, `planTranslationWrites`), and writes through `TranslationsRepository.saveManual` / `removeManual` as the admin (`TranslationModule` exports the repository).
* Row → DTO mapping and text refs shared by several services live in the feature's `mapping.ts` (`learning/mapping.ts`: `toCourseSummary`, `toContinueItem`, `continueRefs`, `courseText`…), not exported from a service file. A service that shows another feature's texts collects all refs and translates **once** per response.
* Loading the catalogue is `LearningService.loadCatalogue` (all visible outlines) / `loadCoursePage` (one page, filter, total); other features reuse them instead of rebuilding outlines. `LearningModule` exports `LearningService` and `LessonProgressRepository`, `PracticeModule` exports `ExercisesRepository`.
* Derived data (dashboard) is read from SQL views by one read-only repository (`DashboardRepository`), filtered on the user id; the pure rules on top (streak, weak areas) are in `dashboard/stats.ts`. Several routes of one feature can share a controller (`DashboardController`: `/dashboard`, `/progress`).
* Admin user management is its own module, `src/admin-users/` (`AdminUsersController` on `admin/users`): `AdminUsersRepository` (as the admin: SQL functions, attempts, audit log), `UserAccountsRepository` (service role, Auth ban only, kept separate so the service-role surface is one small class), rules in `user-rules.ts`. It reuses `DashboardRepository.listSkillProgress` (exported by `DashboardModule`) and `toSkillProgress` from `dashboard/mapping.ts`.
* Command-line scripts live in `src/<feature>/` too (`curriculum/import-curriculum.ts`), so they reuse the app's pure rules (`parsePrompt`, `lockedPromptErrors`, `sourceHash`) and are typechecked and unit-tested like the rest; they are built by `nest build` and run from `dist/` (`npm run seed:curriculum`). A script imports only pure modules, never a Nest service (pure helpers a service also needs move to their own file, e.g. `translation/source-hash.ts`). Keep the decisions in pure functions (`curriculum.ts` load + validate, `rows.ts` mapping, `plan.ts` what to write) and the script to I/O.
* Time zones in queries are validated with `@IsTimeZone()` + `@MaxLength(64)` before they reach SQL.
* Lists that would need many ids in an `.in()` filter (hundreds of exercises) read the user's rows once instead (`listExerciseResults`): PostgREST filters go in the URL.

* Shared code: `src/common/` (errors, filters, pipes), `src/config/` (env), `src/supabase/` (`SupabaseService`).
* ESM: relative imports end in `.js` (`'./profile.service.js'`). Type-only imports use `import type`.
* `main.ts` calls `void bootstrap()`, never a top-level `await`: Vercel imports the entry and takes over `listen()`, so awaiting it hangs every request.
* Keep the layers: controller → service → repository. Controllers never touch Supabase; repositories never throw HTTP exceptions.

## Controllers

* Every route is protected by the global `JwtAuthGuard`. Opt out only with `@Public()`.
* Admin routes: `@Roles('admin')` (checked by `RolesGuard` against `profiles.role`) **and** an RLS policy using `is_admin()`.
* Get the user with `@CurrentUser() user: AuthUser` (`id`, `email`, `accessToken`). Never read a user id, role or score from the body, params or query.
* Document every route in Swagger: `@ApiTags`, `@ApiBearerAuth` (protected), `@Api<Status>Response({ type: ErrorResponseDto })` for each error status, `@ApiOkResponse({ type: XDto })` for success.
* Use `@HttpCode` for non-201 POSTs (e.g. `200` login, `200` lesson progress, `204` logout).
* UUID path params go through `ParseUUIDPipe` (invalid → `400`). Query strings use a DTO class (`@Query() query: XQueryDto`), so unknown query params are `400` too. Numbers in query strings need `@Transform` to `Number` (the pipe has no implicit conversion); defaults are class field initialisers. Shared query DTOs extend each other (`ListCoursesQueryDto extends LanguageQueryDto`).
* Content a learner may not see is `404` whatever the reason (draft, archived, unpublished parent, unknown) — never `403`, which would confirm it exists.
* Static segments on a parameterised path are declared before it (`PATCH courses/reorder` above `PATCH courses/:id`), or `ParseUUIDPipe` answers `400` for "reorder".
* PATCH DTOs have only optional fields; the service writes `definedOnly(...)` of them, and an empty body returns the resource unchanged.
* Rate limits: `@RateLimit('auth' | 'attempts')` (`common/rate-limit/rate-limit.guard.ts`) on a controller or route. `auth` counts per client IP, `attempts` per user (`req.user` from the global `JwtAuthGuard`); each route has its own budget; limits come from config (`AUTH_RATE_LIMIT`, `ATTEMPT_RATE_LIMIT`), one fixed window per minute (`FixedWindowCounter`, unit-tested), `429` with `Retry-After`. Counters are in memory in the global `RateLimitStore` (per instance on serverless; a shared store such as Redis would replace it there). A new limit = a new name + env variable.
* Auth endpoints whose timing could reveal an account (they make Supabase send an email) run through `AuthService.evenly(action, work)`, which uses `withMinDuration` (`common/timing/min-duration.ts`, unit-tested with a fake clock) and `AUTH_MIN_RESPONSE_MS`; it logs a warning when a request takes longer than the floor. API tests run with the floor at `0` (`test/setup-env.ts`); `test/api/auth-timing.e2e-spec.ts` sets it to 300 ms.
* `@nestjs/throttler` was removed: it is CommonJS and `require()`s the ESM-only `@nestjs/common` 12, which works on local Node but crashes on Vercel (`ERR_REQUIRE_ESM`). Before adding a dependency, check that it is ESM or does not `require()` an ESM-only package (Nest 12 packages are ESM-only).
* List query params that accept several values take them comma-separated (`?type=a,b`): `@Transform` split to an array, `@IsIn(values, { each: true })`.

## DTOs and validation

* Request DTOs are classes with class-validator decorators and `@ApiProperty`. The global `ValidationPipe` uses `whitelist + forbidNonWhitelisted`, so unknown or protected fields (`role`, `id`, `userId`, `score`) are rejected with `400`.
* Normalise with `@Transform` (trim, lower-case emails). Validation limits must match the DB `check` constraints and the frontend constants in `frontend/src/types/api.ts`.
* API is camelCase; DB is snake_case. Map in the service (`toXDto(row)`), never leak rows.
* Response DTOs never include secrets, answer keys or other users' data.

## Data access

* `SupabaseService.forUser(user.accessToken)` for all user data, so RLS applies.
* `anon()` only for public auth calls. `service()` (bypasses RLS) only for reading answer keys (`ExerciseAnswersRepository`), revoking sessions, banning / unbanning accounts (`UserAccountsRepository.setDisabled`, Auth admin API), and writing server-generated data no API role may write (the machine-translation cache `TranslationsRepository.saveMachine`, graded attempts `AttemptsRepository.insert`); filter its results before returning. Manual translations from the CMS are written as the admin, not with `service()`.
* Data an admin needs from `auth.users` (email, verified, banned, last sign-in) is read through a security definer SQL function that checks `is_admin()` (`admin_list_users`, `admin_get_user`), called with `.rpc()` as the admin, not with `service()`. A function returning one row is `returns setof jsonb` → `((data ?? []) as Row[])[0] ?? null`; a page is one `jsonb` `{ total, items }`.
* Errors a SQL function raises on purpose carry a code the service maps: `42501` → `403`, `P0002` → `404`, `P0001` + `hint` (`self`, `disabled`…) → `409` with the rule's message (`admin-users/admin-users.service.ts` `functionError`). Check the same rule in a pure function first for the clear message; the function catches races.
* Repository pattern: `const { data, error } = await …; if (error) throw error; return data;` Select explicit columns (`COLUMNS` constant), use `maybeSingle()` when a row may be missing, and let the service turn `null` into `NotFoundException`.
* Postgres errors the client can cause are mapped in the service with `isPgError(error, code)` (`common/errors/pg-error.ts`): `23505` unique → `409` with `details[field]`, `23503` restrict FK → `409`. Check the rule first (clear message), keep the mapping for races.
* Multi-row changes that must be all-or-nothing (reorders) go through a SQL function called with `.rpc()` as the user; read `rpc` results as `(data ?? []) as Row[]` (`overrideTypes` does not fit set-returning functions).
* Two-table writes without a transaction (exercise + answer key) validate everything first, write the parent, then the child, and remove the parent if the child write fails.
* Typed lists: end the chain with `.overrideTypes<Row[], { merge: false }>()` (`.returns()` is deprecated in supabase-js 2.117). Guard `.in()` with an early `return []` for empty id lists.
* Learner reads of content also filter `status = 'published'` explicitly: RLS lets admins read drafts, but learner endpoints must show everyone the learner view.

## Errors

* External providers (translation, later AI) sit behind an abstract class used as the DI token (`Translator`), with the real client (`GoogleTranslator`) as `useClass` and a fake in tests. Keys go in headers, never URLs or error messages; set a timeout; batch requests.
* Optional features degrade instead of failing the request: catch provider/cache errors, log a warning, return the fallback and say so in the response (`translation: "unavailable"`).
* Throw Nest HTTP exceptions (`BadRequestException`, `NotFoundException`, …). `AllExceptionsFilter` turns everything into `{ statusCode, error, message, details? }`.
* Field errors go in `details: [{ field, message }]` with `field` = the camelCase DTO property, so the frontend can show them on the form.
* Messages are English, short, and never reveal whether an account exists or internal details.
* Log errors with `describeError()` (`src/common/errors/describe-error.ts`): Supabase errors are plain objects and `String(error)` logs `[object Object]`. A 500 with `[42P01] relation … does not exist` means a migration has not been pushed.

## App setup

* `configureApp` (shared with tests) sets the JSON body limit to 1 MB: lesson Markdown may be 100 000 characters.

## Config

* CORS allows the exact origins of `CORS_ORIGIN` plus, optionally, one `CORS_ORIGIN_PATTERN` regular expression (Vercel preview deployments), validated at startup to be anchored `^https://…$`. Optional variables that `.env.example` lists empty turn `''` into `undefined` before validation. Deployment settings: `docs/deployment.md`; `backend/vercel.json` pins the function region to the Supabase region.
* New env variables: add to `env.validation.ts` (validated at startup), expose through `AppConfigService`, add to `.env.example` with a safe placeholder, and document in `backend/README.md`.

## Tests

| Layer | File | Notes |
| --- | --- | --- |
| Unit | `src/**/*.spec.ts` | pure logic, no network |
| API | `test/api/*.e2e-spec.ts` | real Nest app via `test/support/create-test-app.ts`; Supabase Auth faked by `test/support/fake-auth-server.ts` (real ES256 JWTs) |
| Integration | `test/integration/*.int-spec.ts` | linked cloud project; RLS checked directly with supabase-js as a user |

* Each endpoint: happy path, validation `400`, `401` without/expired token, `403` wrong role, not found, plus the rules in `plant.md` for the phase.
* When a new Supabase Auth call is used, extend the fake server to model it.
* API tests never hit Supabase for data: every repository has an in-memory fake in `test/support/fake-*.ts` (`FakeProfilesRepository`, `FakeContentRepository`, `FakeLessonProgressRepository`, `FakeExercisesRepository`, `FakeExerciseAnswersRepository`, `FakeAttemptsRepository`), registered in `create-test-app.ts` with `overrideProvider`. A read policy that depends on the caller is modelled with a hook (`FakeTranslationsRepository.canRead(row, token)`, user id from the fake JWT via `userIdFromToken`).
* The admin fake (`FakeAdminContentRepository`, `test/support/fake-admin.ts`) works on the learner fakes' stores (they expose `courses` / `modules` / `lessons` / `rows`), so an admin write is what learner endpoints (do not) show. It mirrors unique slugs (`23505`), restrict FKs (`23503`), cascades and `reorder_content` (`22023`). To test a race, replace a fake method for one request and restore it in `finally`.
* User management has `FakeAdminUsersRepository` (`test/support/fake-admin-users.ts`) built on the auth server (email, ban, sign-in), the profiles and the learning / practice stores; it mirrors the SQL functions' errors (`42501`, `P0002`, `P0001` + hint). `UserAccountsRepository` is **not** faked: it runs against `FakeAuthClient.admin.updateUserById`, and the fake server refuses sign-in (`user_banned`) and refresh for a banned user, as GoTrue does.
* Views have a fake too (`FakeDashboardRepository`, `test/support/fake-dashboard.ts`), computed from the other fakes' stores with the view rules (published only, best attempt, own rows). Tests that need past days move a user's timestamps back (`shiftUser`) instead of mocking the clock.
* Admin endpoints: one parameterised test over the full route list for `403` (learner) and `401` (no token).
* `test/api/security.e2e-spec.ts` reads every route (GET, POST, PUT, PATCH, DELETE) from the app's OpenAPI document and checks: `401` without / with an expired / with a tampered token, `400` for a non-UUID path id, `404` for an unknown id on GET / DELETE. A new route is covered automatically; a new **public** route must be added to its `PUBLIC` list on purpose (the test fails otherwise). So every route needs Swagger decorators, and a GET / DELETE with an id must answer `404` for an unknown one.
* The full user journey (plant.md › Important E2E flows) also runs against the real stack in `test/integration/journey.int-spec.ts`; content it creates is deleted in `afterAll` after the users (their progress / attempts cascade, then the restrict FKs allow the delete).
* The seeded curriculum (`seed/curriculum/`) is checked by `curriculum/curriculum.spec.ts`: it loads every file with the importer's validator (prompts and answer keys through the grader's parsers, Vietnamese for every text, model answers passing their own grading). A fake must mirror what RLS/filters/triggers do (published-only, per-user rows, forward-only progress), or the API test proves nothing.
* Sanity-check a new suite by breaking the rule it guards once (e.g. drop a visibility check) and seeing it fail.
* Integration test users: `qalab-it-*@example.com`, created with the admin API, deleted after each file. Never send real email from tests.

## Before you finish

```bash
npm run typecheck && npm run lint && npm test && npm run test:e2e
npm run test:int   # when migrations or RLS changed (after db push)
npm run format
```

Update `docs/api.md` (and Swagger) for every contract change.
