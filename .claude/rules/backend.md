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

* Shared code: `src/common/` (errors, filters, pipes), `src/config/` (env), `src/supabase/` (`SupabaseService`).
* ESM: relative imports end in `.js` (`'./profile.service.js'`). Type-only imports use `import type`.
* Keep the layers: controller → service → repository. Controllers never touch Supabase; repositories never throw HTTP exceptions.

## Controllers

* Every route is protected by the global `JwtAuthGuard`. Opt out only with `@Public()`.
* Admin routes: `@Roles('admin')` (checked by `RolesGuard` against `profiles.role`) **and** an RLS policy using `is_admin()`.
* Get the user with `@CurrentUser() user: AuthUser` (`id`, `email`, `accessToken`). Never read a user id, role or score from the body, params or query.
* Document every route in Swagger: `@ApiTags`, `@ApiBearerAuth` (protected), `@Api<Status>Response({ type: ErrorResponseDto })` for each error status, `@ApiOkResponse({ type: XDto })` for success.
* Use `@HttpCode` for non-201 POSTs (e.g. `200` login, `200` lesson progress, `204` logout).
* UUID path params go through `ParseUUIDPipe` (invalid → `400`). Query strings use a DTO class (`@Query() query: XQueryDto`), so unknown query params are `400` too. Numbers in query strings need `@Transform` to `Number` (the pipe has no implicit conversion); defaults are class field initialisers. Shared query DTOs extend each other (`ListCoursesQueryDto extends LanguageQueryDto`).
* Content a learner may not see is `404` whatever the reason (draft, archived, unpublished parent, unknown) — never `403`, which would confirm it exists.
* Rate limits are named throttlers in `AuthModule`'s `ThrottlerModule` (limits from config, not hard-coded): `default` for `/auth/*` per IP (`ThrottlerGuard`), `attempts` for attempt submission per user (`AttemptThrottlerGuard`, tracker = `req.user.id`). Every throttler applies to every guarded route, so each route skips the others (`@SkipThrottle({ attempts: true })` on `AuthController`, `@SkipThrottle({ default: true })` on the attempt route). A new limit = a new named throttler + env variable.
* List query params that accept several values take them comma-separated (`?type=a,b`): `@Transform` split to an array, `@IsIn(values, { each: true })`.

## DTOs and validation

* Request DTOs are classes with class-validator decorators and `@ApiProperty`. The global `ValidationPipe` uses `whitelist + forbidNonWhitelisted`, so unknown or protected fields (`role`, `id`, `userId`, `score`) are rejected with `400`.
* Normalise with `@Transform` (trim, lower-case emails). Validation limits must match the DB `check` constraints and the frontend constants in `frontend/src/types/api.ts`.
* API is camelCase; DB is snake_case. Map in the service (`toXDto(row)`), never leak rows.
* Response DTOs never include secrets, answer keys or other users' data.

## Data access

* `SupabaseService.forUser(user.accessToken)` for all user data, so RLS applies.
* `anon()` only for public auth calls. `service()` (bypasses RLS) only for reading answer keys (`ExerciseAnswersRepository`), revoking sessions, and writing server-generated data no API role may write (the translation cache `TranslationsRepository.saveMachine`, graded attempts `AttemptsRepository.insert`); filter its results before returning.
* Repository pattern: `const { data, error } = await …; if (error) throw error; return data;` Select explicit columns (`COLUMNS` constant), use `maybeSingle()` when a row may be missing, and let the service turn `null` into `NotFoundException`.
* Typed lists: end the chain with `.overrideTypes<Row[], { merge: false }>()` (`.returns()` is deprecated in supabase-js 2.117). Guard `.in()` with an early `return []` for empty id lists.
* Learner reads of content also filter `status = 'published'` explicitly: RLS lets admins read drafts, but learner endpoints must show everyone the learner view.

## Errors

* External providers (translation, later AI) sit behind an abstract class used as the DI token (`Translator`), with the real client (`GoogleTranslator`) as `useClass` and a fake in tests. Keys go in headers, never URLs or error messages; set a timeout; batch requests.
* Optional features degrade instead of failing the request: catch provider/cache errors, log a warning, return the fallback and say so in the response (`translation: "unavailable"`).
* Throw Nest HTTP exceptions (`BadRequestException`, `NotFoundException`, …). `AllExceptionsFilter` turns everything into `{ statusCode, error, message, details? }`.
* Field errors go in `details: [{ field, message }]` with `field` = the camelCase DTO property, so the frontend can show them on the form.
* Messages are English, short, and never reveal whether an account exists or internal details.
* Log errors with `describeError()` (`src/common/errors/describe-error.ts`): Supabase errors are plain objects and `String(error)` logs `[object Object]`. A 500 with `[42P01] relation … does not exist` means a migration has not been pushed.

## Config

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
* Seed content the app parses (exercise prompts and answer keys) is checked by a unit test that reads `supabase/seed.sql` (`practice/seed-exercises.spec.ts`). A fake must mirror what RLS/filters/triggers do (published-only, per-user rows, forward-only progress), or the API test proves nothing.
* Sanity-check a new suite by breaking the rule it guards once (e.g. drop a visibility check) and seeing it fail.
* Integration test users: `qalab-it-*@example.com`, created with the admin API, deleted after each file. Never send real email from tests.

## Before you finish

```bash
npm run typecheck && npm run lint && npm test && npm run test:e2e
npm run test:int   # when migrations or RLS changed (after db push)
npm run format
```

Update `docs/api.md` (and Swagger) for every contract change.
