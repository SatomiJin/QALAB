# QA Learning Lab — Agent Guide

Personal QA/Software Testing learning platform. Full spec and phase plan: [plant.md](plant.md). Read it before starting a phase.

## Repository layout

```text
QALAB/
├── CLAUDE.md          # This file — agent rules for the whole repo
├── .claude/skills/    # Project skills (shared, committed)
├── plant.md           # Spec + phases (source of truth for scope)
├── docs/              # architecture.md, design.md, api.md, database.md, testing-strategy.md, curriculum.md
├── backend/           # NestJS API + Supabase project (backend/supabase)
└── frontend/          # React + Vite + Ant Design app
```

**All agent configuration lives at the repo root**: rules in this `CLAUDE.md`, skills in `.claude/skills/`. Do not add `CLAUDE.md` or `.claude/` inside `backend/` or `frontend/`.

## Architecture (non-negotiable)

* Frontend talks **only** to the Backend API (`VITE_API_BASE_URL`). No Supabase SDK or keys in the frontend.
* Auth goes through backend `/auth/*`, which wraps Supabase Auth.
* Backend derives `user_id` from the verified JWT. Never trust `user_id`, `role`, or `score` from the client.
* Backend queries use `SupabaseService.forUser(token)` so RLS applies. `service()` (bypasses RLS) only for grading answer keys and session revocation.
* Exercise answer keys are never returned by any endpoint. Scoring happens on the backend.
* RLS on every table. Admin checks in both `RolesGuard` and RLS `is_admin()`.
* All DB changes via migrations in `backend/supabase/migrations`.

## Commands

Backend (`cd backend`):

```bash
npm run start:dev        # http://localhost:3000, Swagger at /api/docs
npm run typecheck && npm run lint
npm test                 # unit (src/**/*.spec.ts)
npm run test:e2e         # API tests (test/**/*.e2e-spec.ts)
npx supabase migration new <name>
npx supabase db push     # apply migrations to the linked cloud project
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
* Prettier config is shared (`singleQuote`, `trailingComma: all`). Run `npm run format` in the project you touched.
* Backend errors always use `{ statusCode, error, message, details? }`.
* Frontend server data goes through TanStack Query hooks calling `api` from `lib/http.ts`.
* Every data view handles loading, error, and empty states.
* **i18n:** no hardcoded UI text. Add keys to `frontend/src/i18n/locales/en.ts` (source of truth) and `vi.ts`. Standard QA terms stay in English in Vietnamese UI.
* **Theme:** no hardcoded colors. Use SCSS tokens (`styles/_tokens.scss`, CSS variables) or Ant Design tokens. Check light and dark.
* Tests that must not depend on UI language use `data-testid` / `data-state`.
* Do not install dependencies without a stated reason.

## UI work

Use the `frontend-design` skill (`.claude/skills/frontend-design`) for any new screen or visual change. Project-specific design decisions (palette, type, layout, principles) are recorded in [docs/design.md](docs/design.md); follow them and update that file when they change. Do not edit the vendored `SKILL.md`.

Review UI with screenshots (Playwright) in light + dark, EN + VI, desktop + mobile before calling it done.

## Working process

1. Work one phase at a time, as defined in `plant.md`.
2. After a phase: inspect, run all relevant tests, fix issues, summarize changed files, explain how to verify, list known limitations.
3. **Stop and wait for approval** before starting the next phase.
4. A feature is done only when the Definition of Done in `plant.md` is met — compiling is not enough.

## Safety

* Never commit `.env` files or print secret values. `backend/.env` holds the Supabase service-role key.
* The GitHub repo (`SatomiJin/QALAB`) is **public**: scan staged changes for keys before committing.
* Stop dev servers by port, never by killing all `node` processes.
* Commit only when asked. End commit messages with the Co-Authored-By line.
