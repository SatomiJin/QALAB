# QA Learning Lab — Frontend

React + TypeScript + Vite + Ant Design + SCSS. UI in English and Vietnamese, Light / Dark / System theme. Talks **only** to the backend API (`VITE_API_BASE_URL`); it has no Supabase SDK or keys.

## Setup

```bash
npm install
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:3000/api/v1
npx playwright install chromium   # once, for E2E tests
```

## Run

```bash
npm run dev       # http://localhost:5173 (the backend CORS allows this origin)
npm run build     # type-check + production build to dist/
npm run preview   # serve dist/
```

Start the backend (`cd ../backend && npm run start:dev`) to see **API online** in the header.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Type-check and build |
| `npm run typecheck` | Type-check only |
| `npm run lint` | oxlint |
| `npm run format` | Prettier |
| `npm test` | Unit tests (Vitest, `src/**/*.test.ts`) |
| `npm run test:e2e` | Playwright E2E (`tests/e2e`), desktop + mobile, against a production build |

E2E tests mock the backend with `page.route` (`tests/e2e/support/mock-api.ts`, a stateful fake of the API contract), so they do not need the backend running.

## Structure

```text
src/
├── main.tsx              # Entry; shows a config error screen if env is invalid
├── app/                  # App root, Providers (Query, preferences, AntD App, auth), router
├── components/           # ErrorBoundary, PageHeader, VerdictTag, BugReport, feedback/
├── layouts/              # AppShell (top bar/drawer + footer), Main, Admin, Practice (tabs), Auth layouts
├── pages/                # Route pages (placeholders until their phase)
├── features/
│   ├── auth/             # AuthProvider, session refresh, guards, UserMenu, auth pages
│   ├── profile/          # Profile page
│   ├── preferences/      # Language + theme
│   └── system/           # API health
├── i18n/                 # i18next setup, locales/en.ts (source of truth), locales/vi.ts
├── hooks/
├── lib/
│   ├── api.ts            # HTTP client: JWT, error mapping, 401 → refresh → retry
│   ├── auth-storage.ts   # Access token in memory, refresh token in localStorage
│   ├── http.ts           # Shared `api` instance
│   ├── query-client.ts   # TanStack Query defaults (no retry on 4xx)
│   └── env.ts            # Env validation
├── types/                # API types mirroring backend DTOs
└── styles/               # Global SCSS + tokens
tests/e2e/                # Playwright specs
```

## Conventions

* All server data goes through TanStack Query hooks that call `api` from `lib/http.ts`.
* API errors are `ApiError` (`status`, `error`, `message`, `details`). `status === 0` is a network error.
* Every data view handles loading (`PageLoader`), error (`ErrorState`), and empty (`EmptyState`).
* Visual direction: [docs/design.md](../docs/design.md). Below 992px the top-bar links move into a right-side drawer.
* Routes are wrapped in `RequireAuth` / `RequireAdmin` / `GuestOnly` (`features/auth/guards.tsx`).
* **No hardcoded UI text.** Add keys to `i18n/locales/en.ts` and the same keys to `vi.ts`; `t()` keys are type-checked, and a unit test checks both files have the same keys and placeholders.
* **No hardcoded colors.** Use SCSS tokens from `styles/_tokens.scss` (CSS variables that switch with the theme) or Ant Design tokens. Theme palettes live in `features/preferences/antd-theme.ts` and `styles/global.scss`.
* Tests that must not depend on the language use `data-testid` / `data-state`.
