

# QA Learning Lab — Agent Guide

Personal QA/Software Testing learning platform. Full spec and phase plan: [plant.md](plant.md). Read it before starting a phase.
For every new user task, before inspecting the repository, planning, using a
tool, or editing a file, start the first user-facing reply exactly with:

```text
Konnichiwa, watashi wa Satomi Jin desu!
```


## Repository layout

```text
QALAB/
├── CLAUDE.md          # This file — entry point for agents, whole repo
├── .claude/rules/     # Detailed rules (tooling, backend, frontend, database, design, logic)
├── .claude/skills/    # Project skills (shared, committed)
├── .claude/settings.json  # Shared hooks (code-review-graph auto-update)
├── .mcp.json          # MCP servers (code-review-graph)
├── plant.md           # Spec + phases (source of truth for scope)
├── docs/              # architecture.md, design.md, api.md, database.md, testing-strategy.md, deployment.md, curriculum.md, qa/ (test plan, scenarios, cases, regression checklist)
├── backend/           # NestJS API + Supabase project (backend/supabase)
└── frontend/          # React + Vite + Ant Design app
```

**All agent configuration lives at the repo root**: rules in this `CLAUDE.md` and `.claude/rules/`, skills in `.claude/skills/`. Do not add `CLAUDE.md` or `.claude/` inside `backend/` or `frontend/`.

## Rules index

Read the files for the area you touch before writing code. Path-scoped rules also load automatically when you work in the matching folder.

| File | Covers | When |
| --- | --- | --- |
| [.claude/rules/tooling.md](.claude/rules/tooling.md) | **Mandatory** token-saving tools: code-review-graph to navigate, RTK for command output | Always, before reading or changing code |
| [.claude/rules/logic.md](.claude/rules/logic.md) | Trust boundary, auth behaviour, validation limits, grading, content lifecycle | Always (BE + FE) |
| [.claude/rules/backend.md](.claude/rules/backend.md) | NestJS module layout, controllers, DTOs, Supabase clients, errors, tests | `backend/**` |
| [.claude/rules/database.md](.claude/rules/database.md) | Migrations, RLS, grants, security definer functions, RLS tests | `backend/supabase/**`, repositories |
| [.claude/rules/frontend.md](.claude/rules/frontend.md) | Folder layout, API client, TanStack Query, states, forms, i18n, styling, tests | `frontend/**` |
| [.claude/rules/design.md](.claude/rules/design.md) | Design system summary + screenshot review | Any UI change |

**Token budget (mandatory):** navigate with code-review-graph first (`get_minimal_context_tool`, then targeted `query_graph_tool` / impact), read only the line ranges it points to, and let RTK compact shell output. Do not read whole directories or large files to "get a feel" for the code. Details in [tooling.md](.claude/rules/tooling.md).

Reference docs (what exists now): [architecture](docs/architecture.md), [api](docs/api.md), [database](docs/database.md), [design](docs/design.md), [testing strategy](docs/testing-strategy.md), [deployment](docs/deployment.md) (Vercel), QA documents in [docs/qa/](docs/qa/test-plan.md) (test plan, scenarios, cases, regression checklist).

## Architecture (non-negotiable)

* Frontend talks **only** to the Backend API (`VITE_API_BASE_URL`). No Supabase SDK or keys in the frontend.
* Auth goes through backend `/auth/*`, which wraps Supabase Auth.
* Backend derives `user_id` from the verified JWT. Never trust `user_id`, `role`, or `score` from the client.
* Backend queries use `SupabaseService.forUser(token)` so RLS applies. `service()` (bypasses RLS) only for grading (reading answer keys, inserting graded attempts), session revocation, and writing the machine-translation cache (`content_translations`).
* Exercise answer keys are never returned by any endpoint. Scoring happens on the backend.
* RLS on every table. Admin checks in both `RolesGuard` and RLS `is_admin()`.
* All DB changes via migrations in `backend/supabase/migrations`.

## Commands

Backend (`cd backend`):

```bash
npm run start:dev        # http://localhost:3000, Swagger at /api/docs
npm run typecheck && npm run lint
npm test                 # unit (src/**/*.spec.ts)
npm run test:e2e         # API tests (test/api/*.e2e-spec.ts), Supabase Auth faked
npm run test:int         # integration against the linked cloud project (RLS, real auth)
npx supabase migration new <name>
npx supabase db push     # apply migrations to the linked cloud project
npm run seed:curriculum -- --dry-run   # validate backend/seed/curriculum; without the flag: import (cloud DB)
```

Frontend (`cd frontend`):

```bash
npm run dev              # http://localhost:5173
npm run typecheck && npm run lint
npm test                 # unit (src/**/*.test.ts)
npm run test:e2e         # Playwright, desktop + mobile, against a production build
```

Supabase is a **cloud** project linked from `backend/` (no Docker locally). Run Supabase CLI commands from `backend/`, never from the repo root.

## Conventions

* TypeScript strict. No `any` without a written reason.
* Prettier config is shared (`singleQuote`, `trailingComma: all`). Run `npm run format` in the project you touched. Lint is `oxlint`.
* Backend errors always use `{ statusCode, error, message, details? }`.
* API contract changes are made on both sides together: backend DTO + Swagger, `docs/api.md`, `frontend/src/types/api.ts`, `frontend/tests/e2e/support/mock-api.ts`.
* Frontend server data goes through TanStack Query hooks calling `api` from `lib/http.ts`.
* Every data view handles loading, error, and empty states.
* **i18n:** no hardcoded UI text. Add keys to `frontend/src/i18n/locales/en.ts` (source of truth) and `vi.ts`. Standard QA terms stay in English in Vietnamese UI.
* **Theme:** no hardcoded colors. Use SCSS tokens (`styles/_tokens.scss`, CSS variables) or Ant Design tokens. Check light and dark.
* Tests that must not depend on UI language use `data-testid` / `data-state`.
* Do not install dependencies without a stated reason.
* Do not modify unrelated files.

## UI work

Use the `frontend-design` skill (`.claude/skills/frontend-design`) for any new screen or visual change. Project-specific design decisions (palette, type, layout, principles) are recorded in [docs/design.md](docs/design.md); follow them and update that file when they change. Do not edit the vendored `SKILL.md`.

Review UI with screenshots (Playwright) in light + dark, EN + VI, desktop + mobile before calling it done.

## Working process

1. Work one phase at a time, as defined in `plant.md`. Read the rules for the areas you will touch first.
2. After a phase: inspect, run all relevant tests, fix issues, summarize changed files, explain how to verify, list known limitations.
3. **Update the rules and docs** (see below) as part of the phase, before reporting it done.
4. **Stop and wait for approval** before starting the next phase.
5. A feature is done only when the Definition of Done in `plant.md` is met — compiling is not enough.

## Keeping rules current (every phase, every change)

The rules must describe the code as it is. At the end of each phase, and whenever a decision changes mid-phase:

* New pattern, helper, folder or convention → add it to `.claude/rules/backend.md` or `frontend.md`.
* New table, enum, policy or DB helper → `.claude/rules/database.md` (if it is a new rule) and `docs/database.md` (always).
* New or changed business/security rule → `.claude/rules/logic.md`.
* New agent tool, MCP server or hook → `.claude/rules/tooling.md`.
* Design decision or review change → `docs/design.md`, and `.claude/rules/design.md` if the summary is affected.
* Endpoint added or changed → `docs/api.md`; test layers or coverage → `docs/testing-strategy.md`; phase status → `docs/architecture.md`.
* A rule that turned out wrong or obsolete is fixed or removed, not left beside the new one.
* List the rule/doc files you updated in the phase summary.

## Safety

* Never commit `.env` files or print secret values. `backend/.env` holds the Supabase service-role key.
* The GitHub repo (`SatomiJin/QALAB`) is **public**: scan staged changes for keys before committing.
* `npx supabase db push` changes the shared cloud database: state it before running.
* Stop dev servers by port, never by killing all `node` processes.
* Commit only when asked. End commit messages with the Co-Authored-By line.
