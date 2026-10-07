---
paths:
  - "frontend/src/**"
  - "docs/design.md"
---

# Design rules

Full decisions and rationale: [docs/design.md](../../docs/design.md). Use the `frontend-design` skill for any new screen or visual change; record new decisions in `docs/design.md`, not in the vendored `SKILL.md`.

## The system in short

* **Concept:** the app is a marked-up test plan drawn as a blueprint: Prussian-blue ink on drafting paper (faint 24px grid on `body`), a cyanotype in dark mode, plus two devices only:
  1. **Verdicts** (`VerdictTag`: pass / fail / blocked / notRun, plus `inProgress` as an uncoloured outline) are the only saturated colour. Reuse them for any status: progress maps completed → pass, in progress → inProgress, not started → notRun (`verdictFor` in `features/learning/progress.ts`). Tag text is the hue mixed with 25% Ink (`@include tinted-tag`), never the pure hue on its tint (below 4.5:1).
  2. **Mark** (ice blue, `$color-mark`) says "you are here / do this next": strokes under the current nav item, tab or entry, today in the streak strip. The one primary button per screen uses its deeper *Action* shade (`$color-action`, text `$color-on-action`). Never decoration; no yellow.
* **Colours:** Paper, Sheet, Sheet raised (floating layers, hovered cards), Ink, Ink muted, Rule, Rule strong (table headers, section heads, side panels, admin strip), Mark, Action / On action, Grid + four verdicts, each with light and dark values. Links are Ink + underline (except card titles); links never take the ice blue.
* **Type:** Archivo only. Hierarchy through weight and width axis (expanded titles, condensed tags, tabular numbers for IDs/counts). Sentence case. No all-caps, no monospace in the UI (only code inside lesson content is monospace).
* **Sequences:** number items only when they are a real sequence (lessons `1.2`, like test case IDs). Meta lines are separated by gaps (no separator rules, no middle dots); links and buttons never end with "→".
* **Detail pages** open with the page trail: 32px outlined back button + small breadcrumb ("Learning › Course › Lesson"), current page not a link.
* **Translated content** always shows the translation note (small muted sentence + "Show the English original"): "Vietnamese version" for manual translations, "Machine-translated from English" for machine ones. Never present machine translation as authored text.
* **Catalogue pages** (Learning): the page's single "do next" block (Continue) under a 1px Ink rule (Ink muted in dark), with the mark stroke on the item (a 3px line under the text, never a fill behind it) and the one primary button; then filter tabs (Practice tab style); then one list of item cards (cards span the column, text keeps 68ch); then the pager (tabular range, our own 20/50/100 select, Ant Design pager).
* **Practice results** read as a test run of the answer: score (page-title size, tabular) + verdict, pass rule, then checks in fixed columns *Check / Expected / Actual / verdict* (labels inline on mobile); Expected/Actual state facts, the verdict judges. Then explanation, model answer, self-assessment. One primary: *Submit answer*, then *Save self-assessment* until saved, else *Try again*. Exercise rows: question (plain, 2 lines), meta, best score + attempts, verdict (Not run / Passed / Failed) in fixed columns; not numbered. Form steps are numbered (a real sequence).
* **Admin CMS:** content status is a neutral stamp (`StatusTag`: Draft grey tint, Published Ink outline, Archived dashed), never a verdict colour, with a "visible / hidden from learners" sentence. The course outline is the plan: numbered modules as sections, lessons as `1.2` item cards, each with a drag handle and up / down arrows. Editors: trail, title, status line, secondary actions, form with one primary *Save changes*. Markdown fields have a live preview (side by side ≥ 992px, tabs below). Delete is a red danger text button with a confirmation, disabled when in use.
* **Admin users:** user cards like course cards (name link + *Admin* / *You* mark, meta line, `AccountTag` stamp: Active outline, Email not verified grey, Disabled dashed); user page = ruled label / value facts, the dashboard Skills table without links, attempts and change history as log rows; side panel with role select above *Change role* and a danger text *Disable account* (both confirmed), no mark-coloured primary.
* **Dashboard / Progress:** a test summary report and a traceability matrix. Dashboard: Continue block (the one primary), then a ruled row of four figures (no stat cards, no rings, no charts) with the 14-day streak strip (Ink cells, mark under today), Skills as a ruled table with thin Ink bars, *Needs retest* (skills below 70 with a retry link, missed concepts), Recent activity as a test log. Progress: skill tabs, courses as sections, numbered lesson rows with their exercises indented under them; report rows with Rules, not item cards.
* **Glossary:** ruled index entries in A–Z letter sections (no cards), mark stroke under the entry in the URL hash; terms in lesson text are dotted-underlined links with a definition tooltip, first occurrence only. Admin › Glossary = Admin users layout: item cards with usage, filters incl. course of use; term page with a side panel (*Used in lessons*, open entry, delete).
* **Layout:** full-width top bar + centred content column (max 1040px, 32px sides, 16px on mobile), body text ≤ 68ch. Settings pages: 240px label column + ≤ 560px fields, stacked below 992px. Mobile nav in a right drawer, which also holds language and theme (the phone bar keeps only brand, avatar and ☰).
* **Buttons:** `size="large"` only for the screen's one "do next" action (Continue / Start, Submit answer, Try again, Mark as complete); form saves use the default size. The screen's primary gets `@include primary-action` (full width on phones). The page's own verdict (result score, course status) uses `VerdictTag size="large"`.
* **Phones:** touch targets at least 48px (`$touch-target`: drawer links, answer options as whole ruled rows), pager 40px. Meta lines use gaps, never separator rules (they start the wrapped line).
* **Wide screens (from 1200px):** lesson = 68ch text + sticky 240px side column with the lesson actions (bottom bar on phones, footer in between); exercise page and admin editors = main column + sticky 280px panel (`components/SideLayout`, CSS only). The admin top bar has a 3px Rule strong strip.
* **Surfaces:** no cards around page sections. **Openable items** (course, lesson, exercise) are item cards: `@include item-card` on the item, `card-link` on its one link (the whole card opens it; no underline on card titles), `card-list` on the list. Sheet + shadow otherwise only for floating layers (drawer, popover, dropdown) and the auth form. Tables and read-only rows (checks, attempts) keep Rules.
* **Radius:** tags 2px, controls 4px, floating layers 6px, item cards 8px. Nothing larger.
* **Motion:** none on load; only in answer to the person. Use the tokens `$motion-fast` (120ms), `$motion-base` (180ms), `$ease-out`, and the mixins (`item-card` lift on hover/focus, settle on press; `color-transition` for tabs; mark grow-in under nav). Respect `prefers-reduced-motion` via antd's `motion` token and local media queries; never a global `animation-duration` override. Page loads show only the delayed 2px Ink bar (`NavigationBar`).
* **Tab rows** that can overflow use `@include scroll-row` + `useScrollEdges` (fade on the hidden side, current tab scrolled into view).
* **Empty / error states:** `EmptyState` = one muted sentence, left aligned; `ErrorState` = *Blocked* tag + title + message + *Try again*. No antd `Result` / `Empty` artwork in data views (only the crash page, `RouteErrorPage`, keeps `Result`).

## Copy

* A page that is not built yet says what it will do and when (`[Not run] … Opens in Phase N.`). None is left since Phase 5 (`PlaceholderPage` was removed); rebuild it if one is needed again.
* Errors say what happened and what to do; no apologies.
* 404/403 use the `BugReport` component (Expected / Actual), inside the app frame.

## Review before done

Take Playwright screenshots of every new or changed screen in **light + dark × EN + VI × desktop + mobile** (`cd frontend && UI_REVIEW_SCREENS=<names> npm run ui:review`) and check them, or hand the review to the `figma-reviewer` agent (`.claude/agents/figma-reviewer.md`: against Figma frames when a link is given and the Figma connector is authorized, otherwise against this file and `docs/design.md`):

* nothing overflows or wraps badly in Vietnamese;
* contrast is readable in dark (primary button text stays light-theme Ink);
* only one primary (Action) button per screen;
* no double rules where two blocks meet, and list columns line up across rows;
* the page has no horizontal scroll (`document.documentElement.scrollWidth` ≤ the configured viewport width, `page.viewportSize().width`; never `innerWidth` / `clientWidth`, which grow with the content under mobile emulation and hide the overflow) on every screen, admin included;
* loading, error and empty states look intentional too;
* `tests/e2e/accessibility.spec.ts` (axe, both themes) passes: add a new screen to it.

If a decision changes during review, update `docs/design.md` with what changed and why.
