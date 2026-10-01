---
paths:
  - "frontend/**"
---

# Frontend rules (React + Vite + Ant Design)

Applies to everything in `frontend/`. Visual rules: [design.md](design.md). Cross-cutting logic: [logic.md](logic.md).

## Layout

```text
src/
├── app/          # App, Providers, router
├── features/<x>/ # feature code: <x>-api.ts, queries.ts, pure helpers + *.test.ts, pages/, components, *.module.scss
├── components/   # shared UI (PageHeader, PageTrail, ListPager, VerdictTag, BugReport, feedback/{PageLoader,ErrorState,EmptyState})
├── layouts/      # AppShell, AuthLayout, MainLayout, PracticeLayout, AdminLayout, navigation.ts
├── pages/        # app-level pages (404, no access, route error)
├── hooks/        # shared hooks (useErrorMessage, useDocumentTitle)
├── lib/          # api client, storage, env, query client
├── i18n/locales/ # en.ts (source of truth), vi.ts
├── styles/       # _tokens.scss, global.scss
└── types/api.ts  # mirrors backend DTOs
```

* New feature → new folder in `features/`. Move code to `components/` or `hooks/` only when a second feature needs it.
* Keep components small; split a page when it passes ~250 lines or holds several independent forms.

## Talking to the backend

* Only through `api` from `lib/http.ts`. No `fetch`, no Supabase SDK, no keys.
* Each feature has an API object (`authApi` in `features/auth/auth-api.ts`) with one typed function per endpoint. Public endpoints pass `{ auth: false }` so a `401` does not trigger refresh/sign-out.
* Request/response types live in `types/api.ts` and must match the backend DTOs (and their limits, e.g. `PASSWORD_MIN_LENGTH`). Change both sides together.
* Server data goes through TanStack Query: `useQuery` for reads (query keys as exported `const` arrays, e.g. `ME_QUERY_KEY`), `useMutation` for writes, then update or invalidate the affected keys. Pass `signal` to GET calls.
* A feature with several queries keeps its hooks in `features/<x>/queries.ts` with a key factory (`learningKeys.course(slug)`, all starting with the feature name) so a mutation can invalidate the whole group by prefix. Put the saved result into the detail cache (`setQueryData`) and invalidate the lists.
* Features that write many kinds of content (Admin CMS) wrap writes in one hook (`useAdminMutation` in `features/admin/queries.ts`): the returned detail goes into its cache (`setQueryData`), then every query of the affected features (admin, learning, practice) is invalidated.
* A form keyed by its saved item (`key={item.updatedAt}`, so a save refills it) remounts when the result is cached, and `mutate(vars, { onSuccess })` callbacks are dropped for unmounted components: use `void save.mutateAsync(vars).then(onSuccess, onError)` there.
* Background writes (e.g. reading progress) are fire-and-forget: no error UI, the next write retries. User-triggered writes (e.g. *Mark as complete*) use their own `useMutation` so they have their own `isPending` / error.
* Content requests pass the content language (`useContentLanguage()`, from the UI language) and include it in the query key, so switching language refetches. A per-page override (lesson "English original") is local state; `placeholderData` keeps the same item on screen meanwhile.
* List state (filter, page, page size) lives in the URL (`list-params.ts`: parse with safe defaults, write without defaults); lists use `placeholderData: keepPreviousData`. The last list URL is remembered in `sessionStorage` (try/catch) so back buttons return to it.
* When the API returns `404` for a detail page (or `400` for an invalid id in the URL), render `NotFoundPage` (bug report), not `ErrorState`.
* Page components that hold per-item state (scroll tracking, refs) are keyed by the item id (`<LessonView key={lesson.id} />`) so navigating to the next item starts fresh.
* Retries are set globally (network/5xx only, mutations never). Do not override without a reason.
* Access token stays in memory; refresh token in `localStorage` via `lib/auth-storage.ts`. Never store tokens elsewhere.

## States and errors

* Every data view renders loading (`PageLoader`), error (`ErrorState` with retry), and empty (`EmptyState`) states. With several queries, check `isPending` / `isError` per query (`a.isError || b.isError`) so TypeScript narrows `data`; `a.error ?? b.error` does not narrow.
* User-facing error text comes from `useErrorMessage(error)` (or `errorMessage(error, t)` inside a callback, e.g. a mutation's `onError`).
* Forms whose API errors come back under a prefix (`answer.title`, `answer.mapping.login`, `answer.steps[2]`) map them with a feature helper (`answerFieldErrors` in `features/practice/answers.ts`) onto `form.setFields`; details with no field go into the form's `Alert`.
* A page that swaps a form for its result keeps the form **mounted but hidden** (`hidden`), so "Try again" keeps what was typed; restore a previous answer with `form.setFieldsValue`.
* Lists of text rows share `components/ListPager` (range, page-size select, pager); give it the feature's range label and `rangeTestId`.
* Optional sections on a page (a lesson's exercises) render nothing while loading or empty, and a one-line retry on error, so the main content does not jump. Backend `400` field `details` are mapped onto the form with `applyFieldErrors` / `hasFieldErrors` (`features/auth/form-helpers.ts`).
* Forms: Ant Design `Form` with client rules mirroring backend limits; the backend stays the authority. Emails use `inputMode="email"`, not `type="email"`.
* Give every `Form` a `name` when two forms can be on screen (a page form and a dialog): field ids are the field names otherwise, and duplicate ids point labels at the wrong input. Custom controls inside `Form.Item` forward the `id` prop to the real input (`StatusSelect`, `MarkdownEditor`), or the label is not linked.
* `applyFieldErrors` maps `details` of `400` and `409` (e.g. a used slug) onto fields. Nested paths from JSON documents (`promptData.options[1].text`, `answerData.mapping.login`) are mapped by a feature helper (`exerciseFieldErrors` in `features/admin/exercise-form.ts`); list-level errors go to the form's `Alert`.
* Values the user does not type but the API needs (label ids of options / items / rubric) live in the form store (set when a row is added: `nextLabelId`) and are read with `form.getFieldsValue(true)` on submit.
* Reorderable lists use `features/admin/SortableList.tsx` (dnd-kit: pointer, touch, keyboard, translated screen-reader announcements; plus up / down buttons). The new order shows at once, `onReorder` saves it, a rejected promise puts the old order back. Derive the shown order during render (`local.base === items ? local.order : items`), not with `setState` in an effect.
* Hard deletes go through `DeleteButton` (confirmation dialog; disabled with the "archive instead" tooltip when `inUse`).

## Routing and access

* Routes in `app/router.tsx`. Protected pages wrap in `RequireAuth`, admin pages in `RequireAdmin`, guest-only pages in `GuestOnly`. These are UX only; never rely on them for security.
* Each page sets its title with `useDocumentTitle(t('…'))`.

## i18n

* No literal UI strings in TSX. Add keys to `en.ts` first (it defines the type), then the same keys in `vi.ts` (typecheck fails if one is missing).
* Group keys by feature (`auth.login.title`, `profile.…`). Standard QA terms (test case, bug report, severity, priority, Pass/Fail…) stay English in Vietnamese; verdict labels (`verdict.*`) are identical in `vi.ts`.
* Counts use i18next plurals (`minutes_one` / `minutes_other`, called as `t('learning.minutes', { count })`); `vi.ts` defines both keys too.
* Fixed domain lists (skills) are translated by code in the locale files (`skills.<code>.name`, see `useSkillText`), with the API text as fallback for unknown codes. Content itself (course/lesson titles, Markdown) is not translated in the UI.
* Check that Vietnamese text (usually longer) does not break the layout.

## Styling

* SCSS modules per component (`X.module.scss`), using tokens from `styles/_tokens.scss`. No hex/rgb values outside the token files.
* A new colour means: add it to `global.scss` (light + dark CSS variables), `_tokens.scss`, and `features/preferences/antd-theme.ts`, and record it in `docs/design.md`.
* Prefer Ant Design components and theme tokens over custom CSS; override antd through the theme, not global selectors.
* Styles shared by a feature's pages live in one feature module (`features/learning/Learning.module.scss`, imported as `shared`); page-specific styles next to the page.
* Detail pages start with `PageTrail` (back button + breadcrumb, `components/PageTrail.tsx`). The back button goes to the level above (lesson → its course, course → the remembered list), not `history.back()`.
* Ant Design `Pagination` hides its size changer on small screens: render the page-size `Select` yourself (`aria-label`, options from `PAGE_SIZES`) next to `Pagination showSizeChanger={false}`.
* Row lists that should read as a table (lessons, later attempts) use fixed grid column widths so columns line up across rows.

## Dashboard and progress

* Feature folder `features/dashboard/`: `dashboard-api.ts`, `queries.ts` (`dashboardKeys`), pages `DashboardPage` / `ProgressPage`, sections `SummaryFigures`, `SkillTable`, `RetestSection`, `ActivityLog`, `CourseReport`, pure helpers in `dashboard.ts` (`browserTimeZone`, `activityVerdict`, `activityPath`, `dayToDate`).
* Queries of **derived** data (dashboard, progress) use `staleTime: 0`, so each visit refetches; mutations elsewhere do not have to know about them.
* Pieces used by several pages of different features live in the owning feature, exported: `features/learning/ContinueBlock.tsx`, `features/learning/SkillFilter.tsx` (takes the `pathname` it links to).
* A local date from the API (`YYYY-MM-DD`) is shown with `dayToDate` (local noon), never `new Date('YYYY-MM-DD')`, which is UTC midnight and shows the previous day west of UTC.
* Tables that become blocks on mobile set column widths on `thead th` only, so the body cells can use the full width.

## Admin CMS

* Feature folder `features/admin/`: pages under `pages/`, shared pieces (`StatusTag`, `StatusLine`, `SortableList`, `DeleteButton`, `MarkdownEditor`, `CourseFields` / `SlugField`, dialogs) next to them, pure helpers in `content.ts` (slugify, list params, move) and `exercise-form.ts` (form values and API payload per exercise type), tested in `admin.test.ts`.
* Content status uses `StatusTag` (never `VerdictTag`: a status is not a result).
* Slugs are generated from the title (`slugify`, accents removed) until the slug field is edited by hand (`form.isFieldTouched('slug')`).
* Editing Markdown uses `MarkdownEditor` (live preview with `LessonMarkdown`, side by side from `lg`, tabs below).

## Markdown content

* Render lesson/content Markdown (lessons, exercise questions, explanations, model answers) only with `LessonMarkdown` (`react-markdown` + `remark-gfm`; pass `testId` when it is not the lesson body). In lists, show a question as one plain line (`plainText`). Never enable raw HTML (`rehype-raw`) or use `dangerouslySetInnerHTML`: content comes from the database. An e2e test checks that `<script>` / HTML in content is not rendered.
* Content `h1` is demoted to `h2` (the page title is the only `h1`); external links open in a new tab with `rel="noreferrer noopener"`; tables scroll inside their own wrapper.

## Tests

| Layer | File | Notes |
| --- | --- | --- |
| Unit | `src/**/*.test.ts` | pure logic (api client, redirects, storage) |
| E2E | `tests/e2e/*.spec.ts` | Playwright, desktop + mobile, production build, API mocked by `tests/e2e/support/mock-api.ts` |

* Keep `mock-api.ts` in sync with `docs/api.md` whenever the contract changes. Each feature's endpoints live in their own mock (`support/mock-learning.ts`, `support/mock-practice.ts` which grades with the backend rules, `support/mock-dashboard.ts` which derives the dashboard from the learning and practice mocks), delegated from `MockApi.handle`'s default branch; mocks copy the backend rules (forward-only progress, continue choice) and expose switches for states (`empty`, `failing`) and a call log (`progressCalls`).
* Test files import with the `.ts` extension (`'./support/mock-api.ts'`); a missing extension fails the build that Playwright runs first.
* Screenshot reviews: write a throwaway spec + config outside the committed suites (or delete them after); do not leave review harnesses in `tests/`.
* Select by role/label or `data-testid` / `data-state`; never by translated text when the test is not about the text. Labels that are substrings of others ("Option 1" / "Remove: Option 1", "Skill" / "Filter by skill") need `exact: true` or a role (`getByRole('textbox', { name, exact: true })`).
* Specs that pick many Select options run with `test.use({ reducedMotion: 'reduce' })` and pick inside the open dropdown (`.ant-select-dropdown:not(.ant-select-dropdown-hidden)`), then expect it closed: a click during the open animation can be lost.
* A 5xx error state appears only after the global retries: give that assertion a longer timeout (15 s).
* Set mock failure switches only after the page has loaded, or the initial GET fails instead of the write under test.
* A fixed bug gets a regression test.

## Deployment

* `frontend/vercel.json`: SPA fallback to `index.html`, long cache for hashed `/assets/*`, security headers. `VITE_` variables are public and build-time; never put secrets there. See `docs/deployment.md`.

## Before you finish

```bash
npm run typecheck && npm run lint && npm test && npm run test:e2e
npm run format
```

Then the screenshot review in [design.md](design.md).
