---
paths:
  - "frontend/src/**"
  - "docs/design.md"
---

# Design rules

Full decisions and rationale: [docs/design.md](../../docs/design.md). Use the `frontend-design` skill for any new screen or visual change; record new decisions in `docs/design.md`, not in the vendored `SKILL.md`.

## The system in short

* **Concept:** the app is a marked-up test plan. Ink on paper, plus two devices only:
  1. **Verdicts** (`VerdictTag`: pass / fail / blocked / notRun, plus `inProgress` as an uncoloured outline) are the only saturated colour. Reuse them for any status: progress maps completed → pass, in progress → inProgress, not started → notRun (`verdictFor` in `features/learning/progress.ts`).
  2. **Highlighter** (yellow) marks "you are here / do this next": current nav item, current tab, the one primary button per screen. Never decoration.
* **Colours:** Paper, Sheet, Ink, Ink muted, Rule, Highlighter + four verdicts, each with light and dark values. Links are Ink + underline (except card titles); no brand blue.
* **Type:** Archivo only. Hierarchy through weight and width axis (expanded titles, condensed tags, tabular numbers for IDs/counts). Sentence case. No all-caps, no monospace in the UI (only code inside lesson content is monospace).
* **Sequences:** number items only when they are a real sequence (lessons `1.2`, like test case IDs). Meta lines are separated by gaps or a 1px Rule, never middle dots; links and buttons never end with "→".
* **Detail pages** open with the page trail: 32px outlined back button + small breadcrumb ("Learning › Course › Lesson"), current page not a link.
* **Translated content** always shows the translation note (small muted sentence + "Show the English original"): "Vietnamese version" for manual translations, "Machine-translated from English" for machine ones. Never present machine translation as authored text.
* **Catalogue pages** (Learning): the page's single "do next" block (Continue) under a 1px Ink rule, with the highlighter stroke on the item (a 3px line under the text, never a fill behind it) and the one primary button; then filter tabs (Practice tab style); then one list of item cards (cards span the column, text keeps 68ch); then the pager (tabular range, our own 20/50/100 select, Ant Design pager).
* **Practice results** read as a test run of the answer: score (page-title size, tabular) + verdict, pass rule, then checks in fixed columns *Check / Expected / Actual / verdict* (labels inline on mobile); Expected/Actual state facts, the verdict judges. Then explanation, model answer, self-assessment. One primary: *Submit answer*, then *Save self-assessment* until saved, else *Try again*. Exercise rows: question (plain, 2 lines), meta, best score + attempts, verdict (Not run / Passed / Failed) in fixed columns; not numbered. Form steps are numbered (a real sequence).
* **Layout:** full-width top bar + centred content column (max 1040px, 32px sides, 16px on mobile), body text ≤ 68ch. Settings pages: 240px label column + ≤ 560px fields, stacked below 992px. Mobile nav in a right drawer.
* **Surfaces:** no cards around page sections. **Openable items** (course, lesson, exercise) are item cards: `@include item-card` on the item, `card-link` on its one link (the whole card opens it; no underline on card titles), `card-list` on the list. Sheet + shadow otherwise only for floating layers (drawer, popover, dropdown) and the auth form. Tables and read-only rows (checks, attempts) keep Rules.
* **Radius:** tags 2px, controls 4px, floating layers 6px, item cards 8px. Nothing larger.
* **Motion:** none on load; only in answer to the person. Use the tokens `$motion-fast` (120ms), `$motion-base` (180ms), `$ease-out`, and the mixins (`item-card` lift on hover/focus, settle on press; `color-transition` for tabs; highlighter grow-in under nav). Respect `prefers-reduced-motion` via antd's `motion` token and local media queries; never a global `animation-duration` override.

## Copy

* Placeholder pages say what the page will do and when (`[Not run] … Opens in Phase N.`).
* Errors say what happened and what to do; no apologies.
* 404/403 use the `BugReport` component (Expected / Actual).

## Review before done

Take Playwright screenshots of every new or changed screen in **light + dark × EN + VI × desktop + mobile** and check them:

* nothing overflows or wraps badly in Vietnamese;
* contrast is readable in dark (primary button text stays light-theme Ink);
* only one highlighter-primary action per screen;
* no double rules where two blocks meet, and list columns line up across rows;
* the page has no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`) on every screen, not only the dashboard;
* loading, error and empty states look intentional too.

If a decision changes during review, update `docs/design.md` with what changed and why.
