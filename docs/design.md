# Design Direction

Status: **approved; implemented in Phase 1.** Tokens live in `frontend/src/styles/` (CSS variables + SCSS) and `frontend/src/features/preferences/antd-theme.ts` (Ant Design).

Made with the `frontend-design` skill (`.claude/skills/frontend-design`). This file is the project's own design decisions; follow it for all UI work and update it when a decision changes.

## Brief

* **Subject:** a personal lab for learning software testing — test cases, bug reports, severity vs priority, test runs.
* **Audience:** one person. An experienced programmer, new to QA, studying in English and Vietnamese, often in the evening (dark theme matters).
* **Primary job:** work through the curriculum in order, practise writing test artefacts, and see at a glance what is done, what failed, and what is next.

## Concept: the marked-up test plan

A QA engineer's working document is a test plan that gets marked up as testing happens: every case gets a verdict (Pass, Fail, Blocked, Not run), and a highlighter marks where you are. The app is **your test plan for learning QA**, marked up as you go.

That gives the UI two visual devices, and only two:

1. **Verdicts.** Status is the only thing that gets saturated colour. Green means passed, red means failed, amber means blocked, grey means not run yet. Lessons, exercises, and progress all use the same verdict language, so learning the UI is also learning the vocabulary of the job.
2. **The highlighter.** One yellow mark says "you are here / do this next": the current nav item, the lesson to continue, the one primary button on a screen. Never decoration.

Everything else is ink on paper.

## Color

| Name | Light | Dark | Use |
|---|---|---|---|
| Paper | `#F3F4EF` | `#11161C` | Page background |
| Sheet | `#FFFFFF` | `#1B232C` | Raised surfaces: inputs, item cards |
| Sheet raised | `#FFFFFF` | `#232C36` | Floating layers (drawer, popovers, menus), hovered item cards, the avatar |
| Ink | `#1E2A36` | `#E6EAED` | Text, icons, rules |
| Ink muted | `#5A6673` | `#98A3AE` | Secondary text |
| Rule | `#D6DBD4` | `#34404C` | Borders and dividers that carry structure |
| Rule strong | `#B9C0B8` | `#4C5967` | Table headers, section heads, side panels, the admin strip |
| Highlighter | `#F4D35E` | `#DDBB4C` | Current location, next action, primary button (ink text on top) |

Verdicts (text and tag colours; tags use a 14% tint of the same hue as background, and their text is the hue mixed with 25% Ink, `tinted-tag` mixin):

| Verdict | Light | Dark |
|---|---|---|
| Pass | `#2F7D4E` | `#5CB880` |
| Fail | `#C0392B` | `#E8776B` |
| Blocked | `#A86200` | `#E58A4E` |
| Not run | `#6B7580` | `#8C96A0` |

**In progress** (added in Phase 2) is not a result yet, so it gets no colour: Ink text in a 1px Ink-muted outline. Lesson and course progress map to verdicts: completed → Passed, in progress → In progress, not started → Not run.

Links and focus rings use Ink with an underline / 2px outline; there is no separate "brand blue".

Changed in the UI improvement pass (steps C and D): dark mode had no depth (page, cards and inputs were one flat surface, card borders invisible) and light mode read flat. Dark: Paper and Sheet moved apart, a *Sheet raised* step was added, Rule lightened so card borders show, Highlighter toned down for large areas (Ink text still about 9:1), and Blocked moved towards orange (it was close enough to the highlighter to read as "do next"). Light: warmer Paper, a slightly darker Rule, and *Rule strong* instead of Ink or plain Rule for table headers and section heads. The avatar is a Sheet raised disc with a Rule border (the white Ink disc was the brightest thing on a dark screen); the brand tile gets a 1px Rule strong outline in dark; the Ink rule above the Continue block is Ink muted in dark.

Changed in Phase 8 (axe review): the pure verdict hue on its own tint was below WCAG AA (Not run 3.7:1, Pass 3.9:1 in light; Not run 4.4:1 in dark). Tag text is now the hue mixed with 25% Ink (≥ 4.8:1 for every verdict, both themes); the palette itself did not change. Input placeholders use Ink muted (antd's default grey was 1.8:1).

## Type

One family: **Archivo** (variable, weight + width axes, full Vietnamese support), self-hosted via `@fontsource-variable/archivo`. The width axis does the work a second typeface would:

| Role | Setting |
|---|---|
| Page title | 32/38, weight 650, width 112 (expanded, like a printed form header) |
| Section title | 20/28, weight 600, width 106 |
| Body | 15/24, weight 400, width 100 |
| Small / meta | 13/20, weight 450, width 100 |
| Verdict tag | 12/16, weight 650, width 75 (condensed, like a stamp), sentence case |
| IDs and counts (TC-014, 12/40) | body size, `font-variant-numeric: tabular-nums`, width 88 |

Reading measure: body copy max `68ch`. Sentence case everywhere. No all-caps labels, no monospace in the UI. One exception: code inside lesson content (`age >= 18`) is content, and a monospace face keeps `>` and `>=` distinct.

## Layout

The sidebar-plus-header shell reads as an admin template. Replace it with a **top bar and a single reading column**, like a document.

Desktop (≥ 992px):

```text
┌───────────────────────────────────────────────────────────────────────┐
│ ▣ QA Learning Lab   Dashboard  Learning  Practice  Progress   EN ☾  ◯ │  top bar, 56px, on Paper
│                     ▔▔▔▔▔▔▔▔▔  (highlighter under current item)        │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   Quiz   Test cases   Bug reports   Scenarios                         │  Practice sub-nav: tabs on the page
│   ─────────────────────────────────────────────                       │  (highlighter under the current tab)
│                                                                       │
│   Bug report practice                                                 │  page title, left aligned
│   [Not run]  Practise writing bug reports… Opens in Phase 3.          │  verdict tag + one sentence
│                                                                       │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│ ● API online                                                          │  footer: environment status
└───────────────────────────────────────────────────────────────────────┘
```

* Content column: max 1040px, **centred on the screen** (min 32px side padding, 16px on mobile). The top bar and footer stay full width: brand at the far left, controls at the far right. Text inside the column is left aligned; text blocks capped at 68ch. (Changed after review: a left-pinned column left half of a wide screen empty; putting the top bar in the same column made it look cramped.)
* Settings-style pages (Profile): section title in a 240px left column, fields in a column of up to 560px on the right; stacked below 992px.
* **Practice** is one top-level item; its four kinds are tabs above the page title on the Practice pages, not a nested menu. Top nav stays at five items (+ Admin for admins).
* **Profile** moves to the avatar menu (it is not a place you study).
* API status moves out of the header into a quiet footer line — in QA terms, it is the *environment*.
* No cards around page *sections* (headers, lesson text, results, forms). **Items you can open** (a course, a lesson, an exercise) are cards: see *Item cards* below. Other surfaces are only for things that float (drawer, popovers) or take input.

Mobile (< 992px):

```text
┌───────────────────────────────┐
│ ▣ QA Learning Lab        ◯ ☰ │
├───────────────────────────────┤
│ Bug report practice           │
│ [Not run] Opens in Phase 3.   │
│                               │
│ ● API online                  │
└───────────────────────────────┘
☰ opens a right-side drawer with the same five items; the current one is highlighted.
Language and theme sit at the bottom of the drawer, under a Rule.
```

(Changed in the UI improvement pass, step A: with language and theme in the bar, the admin bar (brand + "Admin" + both switchers + avatar + ☰) was 443–446px wide in a 412px phone and cut the menu button. The bar on phones now holds only brand, avatar and ☰; the brand name ellipsises before anything else shrinks. Pages outside their section's path, such as admin lessons and exercises, keep their section marked: `activePaths` in `layouts/navigation.ts`.)

Auth pages: brand top left, preferences top right, and the form centred on a Sheet (440px max, 1px Rule border, 6px radius, no shadow) so it stands off the Paper background. Inputs on that sheet use Paper, so they read as fields to fill in. On mobile the sheet is full width and top aligned. (Changed after review: the first version, a bare column on the page, blended into the background.)

## Components

* **Verdict tag:** condensed text in a 2px-radius tinted chip. The only rounded-rectangle-with-colour in the UI.
* **Buttons:** primary = Highlighter background + Ink text (one per screen). Secondary = Ink outline. Text buttons for low-emphasis actions. 4px radius.
* **Inputs:** Sheet background, Rule border, 4px radius, 2px Ink focus ring.
* **Radius by role:** tags 2px, controls 4px, floating layers 6px, item cards 8px. Nothing larger.
* **Shadow:** on floating layers (drawer, dropdown), and a soft lift under a hovered item card (`--qa-shadow-hover`). Flat everywhere else.
* **Motion:** none on load; only in answer to the person. Tokens: `$motion-fast` 120ms, `$motion-base` 180ms, `$ease-out` `cubic-bezier(0.2, 0, 0, 1)`. The highlighter mark grows in under the new nav item on navigation (it does not travel between items). Item cards lift on hover/focus and settle on press; tabs fade their colour (`color-transition` mixin). Everything is disabled under `prefers-reduced-motion`. While the next page's code loads (lazy routes), a 2px Ink bar slides along the top of the window, only after 200ms so fast navigations show nothing (static under reduced motion).

## Copy

* Empty / not-yet-built pages say what the page will do and when: `[Not run] Practise writing bug reports. Opens in Phase 3.`
* 404 is written as a tiny bug report, because it is one:

  ```text
  Page not found
  Expected   a page at /practice/bugreport
  Actual     nothing is here
  [ Go to dashboard ]
  ```

* Errors state what happened and what to do. They do not apologize.
* **Empty state** (`EmptyState`): one muted sentence, left aligned in the column like the rest of the page (what will appear here and how), optional action below. No illustration.
* **Load error** (`ErrorState`): reported like a test that could not run: a *Blocked* verdict tag beside a section-size title, the message, and *Try again* (primary). Left aligned, `role="alert"`. Changed in Phase 8: both used antd `Result` / `Empty` (centred red icon, inbox drawing), which looked like a different product next to the ruled pages.

## Review against the brief

Checked the first draft against what a generic "learning dashboard" prompt would produce (blue primary, sidebar, stat cards, progress rings, Inter). Changes made:

1. **Sidebar → top bar + reading column.** The sidebar was the default admin shell. A learner reads more than they navigate; five items fit on one line.
2. **Ink primary buttons → highlighter primary buttons.** Near-black buttons are the current default kit. The highlighter already means "do this next", so it becomes the primary action colour instead of a new accent.
3. **Monospace IDs → Archivo tabular + condensed.** Monospace for small data is a known tell; the width axis gives IDs the same "form" feel without a second face.
4. **Cards for every section → no cards.** Structure comes from type, spacing, and rules that separate real sections.
5. **ALL CAPS stamp tags → sentence case condensed tags.** Keeps the stamp feel from the condensed width, not from capitals.

The one bold thing is the verdict + highlighter system. Everything else stays quiet.

## Implementation notes

* Email inputs use `inputMode="email"`, not `type="email"`: native browser validation blocks the submit before Ant Design validates the other fields, and shows untranslated tooltips.
* Primary button text is always the light-theme Ink, so it stays readable on the highlighter in dark mode.
* Auth pages: the Paper input colour comes from a nested `ConfigProvider` in `AuthLayout` (`colorBgContainer = paper`).
* Links are Ink with an underline (global `a` style); nav links and tabs drop the underline and use the highlighter mark instead.

* Reduced motion (OS setting): Ant Design animations are turned off with its `motion` token; our own transitions add their own `prefers-reduced-motion` rule. Never shorten animations globally (`* { animation-duration: 0.01ms }`): antd positions popups during the enter animation, and that rule left every dropdown off-screen (regression test in `tests/e2e/preferences.spec.ts`).

## Learning screens (Phase 2)

* **Learning** (`/learning`): a *Continue* block first, the one "do next" on the page: a reason line (Start here / Pick up where you stopped / Up next), the lesson title marked with a highlighter stroke (a 3px Highlighter line under the text, like the current tab; changed after review: the half-height fill behind the text was hard to read, above all in dark mode), a course | module trail, one primary button. It sits under a 1px Ink rule (the top of the plan). Below it, every skill in order as a section (240px skill column + its courses), like the sections of a test plan. Skills without courses stay listed with "No courses yet." so the whole plan is visible. A course is a row: title link, description, verdict, "1 of 4 lessons", minutes.
* **Course** (`/learning/courses/:slug`): back link, title, description; verdict + count + minutes + skill; primary *Start course* / *Continue course* (secondary *Review from the first lesson* once completed). Modules are sections ("Module 1" in small tabular text, then the title). Lessons are rows of a test run: number `1.2` (tabular), title, minutes, verdict, in fixed columns so they line up.
* **Lesson** (`/learning/lessons/:id`): course | module trail, title, verdict + reading time, an optional *Jump to where you stopped (40%)* text button, the Markdown body at 68ch, then a rule, the primary *Mark as complete* (or "Passed, Completed on …"), and previous / next lesson links with small labels and no arrows. The last lesson links back to the course.
* Lesson Markdown: h2/h3 on the type scale, tables with Rule lines and tabular figures (wide tables scroll inside their own box), quotes with a 3px Rule bar in Ink muted, code on a 7% Ink tint.
* Meta lines are separated by gaps or a 1px Rule, never middle dots.
* Changed after review: the lesson rows first sized their columns per row, so minutes and verdicts did not line up; the Continue block had its own bottom rule right above the first section's rule (a double line).

## Navigation, lists and translation (Phase 2, second pass)

* **Page trail** above every course and lesson title: a 32px outlined back button (arrow icon, tooltip + accessible name "Back to courses" / "Back to the lesson list") and a breadcrumb "Learning › Course › Lesson" in small text; ancestors are muted links, the current page is Ink and not a link. Separators are a small chevron icon.
* **Learning list** replaces the per-skill sections: the Continue block, then skill tabs (same style as the Practice tabs: highlighter mark under the current tab, "All skills" first, scrolling sideways inside their own box on mobile), then one list of course cards (see *Item cards*; cards span the column; text keeps the 68ch measure; the skill name is in each card's meta). An empty skill says "No courses in this skill yet."
* **Pager** under the list: a tabular "1–20 of 46 courses" range on the left; our own page-size select (20 / 50 / 100) and Ant Design's pager on the right. The select is ours because Ant Design hides its size changer on small screens (changed after review: mobile users could not change the page size).
* **Translation note** (Vietnamese UI only): one small muted sentence with a translate icon, flowing as text — "Vietnamese version. QA terms stay in English." (manual) or "Machine-translated from English. QA terms, code and links stay in English." — plus a text button to show the English original (and back). "Not available" gets its own sentence and no button. It sits under the lesson's status line, and under the title on the course and Learning pages.

## Practice screens (Phase 3)

* **The one bold thing: the result is a test run of your answer.** Under a 1px Ink rule: the score in page-title size with tabular figures, "out of 100", and a verdict tag; one muted sentence with the pass rule (choice types: every answer right; free text: 70 or more, keyword checks are approximate). Free-text results list the score parts in small tabular text ("Required fields: 75 (30% of the score)"). Then a table of **checks** with fixed columns *Check / Expected / Actual / verdict*, like executed test steps: required fields filled in, severity and priority, concepts mentioned, options chosen, items in the right group. Rows with nothing to judge (an option rightly left out) are muted and have no verdict. On mobile each check is a block with "Expected" / "Actual" as inline labels.
* After the checks: Explanation, Model answer (free text) and the self-assessment checklist ("Check your answer against the model"), each a section title + Markdown.
* **Lists** (one per Practice tab): the tabs, title and description, two selects (skill, difficulty; full width on mobile), then item cards (see *Item cards*) with fixed columns: question as a link (plain text, two lines max), meta (type, difficulty, lesson), your best score and attempt count (tabular), and the verdict (Not run / Passed / Failed; any passing attempt makes the exercise Passed). No numbering: the list is not a sequence. Same pager as Learning.
* **Exercise page:** page trail (Practice › tab › type), the type as the title, verdict + difficulty + "From the lesson …" link, the question as Markdown at 68ch and 17px, then the form (max 720px). Test case and bug report forms follow the document template field by field; field names stay in English (QA terms) in Vietnamese; steps are numbered (a real sequence) with add / remove. One primary per screen: *Submit answer*; on the result, *Save self-assessment* until it is saved, otherwise *Try again*. *Try again* restores the last answer.
* **Your attempts** under a Rule: date, score, verdict, *Show result* (tabular, fixed columns); the one on screen says "Shown above".
* **Lesson page:** "Practise this lesson" lists the lesson's exercises (same cards, without the lesson) between the article and the footer.
* Changed after review: the multiple-choice checks first said "Chosen, correct" in the Expected column, which read like a result; Expected / Actual now say only *Chosen* / *Not chosen* and the verdict says whether that was right. The attempt verdict tag stretched to its column width; the lesson list ended in a double rule above the footer; the checklist's save button had its own rule.

## Item cards (asked for after Phase 3)

The learner asked for each item to sit in its own rounded card with a light hover, so that items are easier to tell apart and the lists look friendlier. This replaces the flat rows between Rules for **openable items**:

* **Where:** course rows on Learning, lesson rows on a course page, exercise rows on the Practice tabs and on "Practise this lesson". Not for sections, tables or read-only rows (result checks, attempt history, module headings keep Rules).
* **Look:** Sheet background on Paper, 1px Rule border, 8px radius, 16×24px padding (12×16 on mobile), 12px between cards (8px for lessons inside a module). Fixed grid columns inside the card stay, so numbers, minutes, scores and verdicts still line up from card to card; verdicts sit at the right edge.
* **Behaviour:** the whole card opens the item (the title link is stretched over the card with `::after`), so there is one tab stop per card. Hover or keyboard focus: border to Ink muted, soft shadow, lift by 2px (180ms, ease-out); card titles have no underline (the card itself says "this opens"; changed after review: the underline looked out of place inside a card). Press: back down, quicker (120ms). Keyboard focus also draws a 2px Ink ring around the card. Reduced motion: colour and shadow change without movement or transition.
* **Implementation:** mixins `item-card`, `card-link`, `card-list` and `color-transition` in `styles/_tokens.scss`; tokens `$radius-card`, `$shadow-hover` (`--qa-shadow-hover`, light and dark in `global.scss`), `$motion-fast`, `$motion-base`, `$ease-out`.
* Changed after review: on mobile an exercise without attempts had an empty stats line at the bottom of its card (now hidden when empty); lesson verdicts sat in the middle of the card (now at the right edge).

## Brand mark

* Source files: `Assets/Logos/` (the author's "S" logo). The app uses only the monochrome one (`logoiconnobg.png`): recoloured to a Highlighter "S" on an Ink tile with 4px corners, generated into `frontend/public/brand-mark.png` (top bar, 28px, `components/BrandMark.tsx`), `favicon.png` (48px) and `apple-touch-icon.png` (180px). Fixed colours, like a printed logo, the same in both themes (as the first favicon was). The name "QA Learning Lab" stays next to it.
* The neon purple versions are **not** used in the UI: saturated colour is reserved for verdicts, and a purple mark would read as one more status colour. The full-name logo ("Satomi Jin") signs the README; it can also be the GitHub social preview.
* Changed after review: a mask of the bare strokes in Ink looked thin and grey at 24px next to the bold brand name; the filled tile holds its weight.

## Admin CMS (Phase 4)

The same system, no new devices. The admin works on the plan itself, so the screens read as the plan being edited.

* **Content status is not a verdict.** Draft / published / archived use the stamp shape of the verdict tag without saturated colour: *Draft* grey on a grey tint (like Not run), *Published* Ink outline, *Archived* dashed Ink-muted outline. Next to it, one muted sentence says whether learners see the item ("Visible to learners." / "Hidden from learners: it or a parent is not published.") and "In use by learners" when progress or attempts exist.
* **The one bold thing: the course outline is the test plan.** Modules are sections under a Rule with "Module 1" in small tabular text; their lessons are item cards numbered `1.2` (a real sequence). Each row starts with a drag handle and up / down arrows (Ink muted text buttons); lessons show minutes, exercise count, "in use" and the status tag at the right edge.
* **Course list:** page title with the one primary *New course*, two filter selects (skill, status; full width on mobile), course cards (title, skill, module and lesson counts, updated date, status), the shared pager. With one skill and no status filter, the cards get reorder handles.
* **Editors** (course, lesson, exercise): page trail (Courses, Course, Lesson, ...), title, status line, secondary actions (publish / move to draft / archive, *Preview as learner*, delete as a danger text button, disabled with a tooltip when in use), then the form (fields up to 720px) with the one primary *Save changes* / *Create exercise*. Sections are separated by Rules, no cards.
* **Markdown editor:** text area and live preview side by side from 992px (the preview is a Sheet panel as tall as the text area and renders exactly like the lesson page); below that, *Write / Preview* segmented tabs. Character count in small tabular text. The text area uses Archivo like every input (no monospace in the UI).
* **Exercise editor:** question (Markdown), difficulty and status, then *Answer key* with a muted note that learners never see it, and the rows for the type (options with a *Correct* checkbox, categories, items with their correct category, required fields as a checkbox grid, expected Severity / Priority, concepts as concept + keywords pairs, model answer, checklist). Add buttons stay compact under their rows. When learners have answered, an info alert says rows can be edited but not added or removed.
* **Preview as learner:** the lesson page layout (title, Not run tag, module, reading time, 68ch article, "Practise this lesson" with the published exercises only), under a quiet note between an Ink and a Rule line: what the preview is, the status line, and *Back to the editor*.
* **Danger:** delete is the only red outside verdicts (Ant Design danger text button + confirmation dialog). Accepted because destroying content is a failure-grade action and people expect it red; it is never a filled button.
* Changed after review: the breadcrumb first had "Admin, Courses" (two links to the same page); preview panels had a 320px minimum height that left big empty boxes next to short fields; add-row buttons stretched across the section; the preview's exercise card lacked its stats column, so the verdict sat in the middle.

## Translation editor (V1 gap)

* **Same system, no new device.** Trail (… › Lesson › Vietnamese translation), title *Vietnamese translation* with the item's English title under it, the side panel (from 1200px; above the form below) with one muted sentence on what learners see and the three counts.
* **One ruled row per text** (not cards: these are read-and-edit rows, like checks): field name as a small section title (`Option 2`, numbered in list order because label ids mean nothing to an editor) + a translation stamp in the content-status shapes, never verdict colours: *Translated* Ink outline, *Out of date* dashed, *Not translated* grey tint. Then English and Vietnamese side by side from 768px (stacked below); Markdown texts stack at every width: the English rendered as learners see it in a Sheet panel (max 360px, scrolls), then the usual `MarkdownEditor`, sized to the English (4–18 lines).
* **Out of date** is a quiet muted note with one small *Still correct* button, not a warning colour: it is a to-do, not a failure. *Start from the machine translation* is a link button under the field, only when a machine draft exists and the text is not current.
* One primary, *Save translation*; saving with nothing changed says so instead of sending.

## Admin users (Phase 9)

* **No new device.** Users are openable items, so the list is item cards like courses: display name as the card link (with a condensed *Admin* / *You* mark after it), a gap-separated meta line (email, joined, last sign-in, lessons completed, exercises tried), and the account status stamp on the right.
* **Account status is a stamp, not a verdict** (`AccountTag`), in the content-status shapes: *Active* Ink outline, *Email not verified* grey tint, *Disabled* dashed.
* **Filters:** search field (name or email, submitted with Enter) + role and status selects, in the existing filter row; state in the URL.
* **User page** = the settings layout read-only: trail, name as title, status line (stamp, role, email); *Account* as ruled label / value rows (200px label column, stacked on phones); the dashboard's *Skills* table without links (the links go to the viewer's own Progress); *Recent attempts* and *Change history* as test-log rows (time column, what, result with score + verdict).
* **Side panel** (*Manage account*): role select with *Change role* under it (not beside it: the 280px panel is too narrow, and a row that wraps moved the button under the pointer), then *Disable account* as a red danger text button, or *Enable account*. Both role change and disable ask for confirmation saying what follows. No highlighter primary: managing an account is not the page's "do next". On your own account the panel is one muted sentence.
* Log lists drop the last row's bottom rule so the next section's top rule closes them (no double rule).

## Dashboard and progress (Phase 5)

Checked against a generic "learning dashboard" (stat cards with icons, progress rings, a chart, a streak flame): none of those. The dashboard is the **test summary report** of your learning; Progress is its **traceability matrix**.

* **Dashboard** (`/dashboard`): title and description, the Continue block (same as Learning: the page's one highlighter primary), then:
  * **Summary** — the one bold thing: four figures in one row between two Rules, separated by vertical Rules (no cards): *Lessons completed* `1 of 4`, *Exercises passed* `1 of 3 answered`, *Average score* (best score per exercise; `–` without answers), *Streak* `4 days`. The figure is page-title size with tabular figures, the unit small and muted beside it, one muted note below. 2 × 2 on mobile, rules only between columns and rows.
  * **Streak strip** under the streak figure: the last 14 days as small cells like a test run strip, filled Ink = studied, Rule outline = not; today has the 3px highlighter line under it ("you are here"). Each cell has an accessible label with the date.
  * **Skills** — a read-only table with Rules and fixed columns (skill link to Progress filtered by it, lessons with a thin Ink-on-Rule bar and `1 of 4`, exercises `1 of 5 passed`, average, verdict). On mobile each row is a block: name and verdict first, the rest below, "Average" labelled.
  * **Needs retest** — the QA word for weak areas: skills below 70 with a *Failed* tag and a "Retry: Scenario — best 40" link to the worst failed exercise, and concepts missed in the best answers ("missed in 2 of 3"). Side by side from 992px. Before any answer: one sentence saying what will appear.
  * **Recent activity** — a test log: time (tabular) | event (small), item link, lesson | course trail | score + verdict (completed lesson Passed, started In progress, answer Passed / Failed).
* **Progress** (`/progress`): title, skill tabs (as Learning), then each course as a section (courses separated by an Ink rule): title link, verdict and counts, then modules ("Module 1" small tabular + title) and lessons as numbered rows `1.2`, each lesson's exercises indented under it with a dashed Rule (question as two plain lines, type and difficulty, best score and attempts, verdict). Fixed columns so minutes, scores and verdicts line up across the page. The pager below.
* These are **report rows**, not item cards: the page is read, and titles are ordinary links (a card per lesson and exercise would make a wall of boxes). Item cards stay for lists you pick one item from.
* Changed after review: on mobile the skill name was squeezed into the desktop column width and the average stood alone without a label.

## Polish (Phase 8)

Reviewed every screen with screenshots (light + dark × EN + VI × desktop + mobile, plus empty, error and API-down states) and axe-core. Changes:

* **Tag contrast** and **placeholders**: see *Color*.
* **Overflowing tab rows** (skill filter, Practice tabs): they scroll sideways without a scrollbar, so a cut-off last tab ("Automation T…") gave no hint that more existed. The side with hidden tabs now fades out over 48px (`scroll-row` mixin + `hooks/useScrollEdges`), and the current tab is scrolled into view when the page opens from a link.
* **No access (403)** rendered outside every layout (no top bar, text against the window edge). It now shows inside the learner frame, like 404.
* **Page changes**: a new page opens at its top (it kept the previous page's scroll position); Back returns to where you were. Changing a list's filter or page keeps the position. Focus moves to the page content (`main`) after a page change, and a *Skip to content* link (hidden until focused) is the first stop for the keyboard.
* **Empty and error states** rebuilt in the document style (see *Copy*).
* Course page on phones: narrower lesson-number column and gap, so lesson titles wrap less.
* Checked and kept: no page scrolls sideways on a phone (412px) or desktop (1280px); Vietnamese text fits everywhere; one highlighter primary per screen.

## UI improvement pass (after Phase 8)

Plan and status: [ui-improvement-plan.md](ui-improvement-plan.md). Decided in this pass:

* **Phones:** the top bar keeps brand, avatar and ☰; language and theme are in the drawer (see *Layout*). Drawer links are 48px high, pager buttons and the page-size select 40px, and each answer option is a whole ruled row (min 48px, 12px padding, Rule border turning Ink when hovered or chosen; on every screen size). The screen's primary button spans the column (`primary-action` mixin).
* **Meta lines** (course | module, lesson | course) are separated by gaps only (16px columns, 4px rows): a separator rule started the wrapped second line.
* **Dashboard on phones:** skills not started yet fold into one muted line ("Not started: Testing Types, Test Design…", each a link); *Needs retest* with nothing below the pass mark and no missed concepts is one sentence.
* **Large verdict tag** (`VerdictTag size="large"`, 14/20, 4px 8px padding): the page's own verdict, next to the score on a result and the course status. Rows keep the 12px tag.
* **Button sizes:** `large` only for the one "do next" action of a screen (Continue / Start, Submit answer, Try again, Mark as complete). Every form save is the default size, admin included (*Save self-assessment* went from large to default).
* **Section rules span the column:** on the exercise page the rule above *Submit answer* now runs the full column like the result and attempts rules; the fields keep their 720px measure.
* **Course lesson rows:** number column 2.75em, 12px gap, the minutes in a meta line under the title (every size), the verdict centred in the last column.
* **Exercise rows:** the verdict is pinned to the last column; with no attempts it slid into the middle of the card.
* **Lesson actions, one place per size** (one primary per screen): from 1200px a sticky 240px side column next to the 68ch text (read %, *Mark as complete*, next lesson); 768–1199px the footer, as before; on phones a 56px bar fixed to the bottom (Paper, Rule on top) with *Mark as complete* and the next lesson, sliding in once 80% of the lesson is read (completed lessons keep only the next link). This changes the "one reading column" decision: at 1280px the lesson left about 450px empty.
* **Side panel from 1200px** (`components/SideLayout`): the exercise page (verdict, difficulty, lesson link) and the admin course / lesson / exercise editors (status actions, preview, delete; the exercise editor's type note) get a sticky 280px panel with a Rule strong line on top. Below 1200px the same content stays above the main column (CSS only, so forms keep their state on resize). *Save changes* and *Submit answer* stay at the end of their form, next to its errors, instead of moving into the panel as the plan suggested.
* **Admin area:** a 3px Rule strong strip under the top bar (not a colour: verdicts and the highlighter keep their meaning); the current-item mark sits on it.
* Not done: centring the top bar content in a 1200px frame (plan 4.6, optional; it reverses an earlier decision).
