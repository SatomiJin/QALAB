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
| Paper | `#F6F7F4` | `#12171D` | Page background |
| Sheet | `#FFFFFF` | `#1A2129` | Raised surfaces: inputs, drawer, popovers |
| Ink | `#1E2A36` | `#E6EAED` | Text, icons, rules |
| Ink muted | `#5A6673` | `#98A3AE` | Secondary text |
| Rule | `#DDE1DC` | `#2A333D` | Borders and dividers that carry structure |
| Highlighter | `#F4D35E` | `#E3C14F` | Current location, next action, primary button (ink text on top) |

Verdicts (text and tag colours; tags use a 12–16% tint of the same hue as background):

| Verdict | Light | Dark |
|---|---|---|
| Pass | `#2F7D4E` | `#5CB880` |
| Fail | `#C0392B` | `#E8776B` |
| Blocked | `#A86200` | `#E0A443` |
| Not run | `#6B7580` | `#8C96A0` |

Links and focus rings use Ink with an underline / 2px outline; there is no separate "brand blue".

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

Reading measure: body copy max `68ch`. Sentence case everywhere. No all-caps labels, no monospace.

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
* No cards around page content. Surfaces are only for things that float (drawer, popovers) or take input.

Mobile (< 992px):

```text
┌───────────────────────────────┐
│ ▣ QA Learning Lab     EN ☾ ☰ │
├───────────────────────────────┤
│ Bug report practice           │
│ [Not run] Opens in Phase 3.   │
│                               │
│ ● API online                  │
└───────────────────────────────┘
☰ opens a right-side drawer with the same five items; the current one is highlighted.
```

Auth pages: brand top left, preferences top right, and the form centred on a Sheet (440px max, 1px Rule border, 6px radius, no shadow) so it stands off the Paper background. Inputs on that sheet use Paper, so they read as fields to fill in. On mobile the sheet is full width and top aligned. (Changed after review: the first version, a bare column on the page, blended into the background.)

## Components

* **Verdict tag:** condensed text in a 2px-radius tinted chip. The only rounded-rectangle-with-colour in the UI.
* **Buttons:** primary = Highlighter background + Ink text (one per screen). Secondary = Ink outline. Text buttons for low-emphasis actions. 4px radius.
* **Inputs:** Sheet background, Rule border, 4px radius, 2px Ink focus ring.
* **Radius by role:** tags 2px, controls 4px, floating layers 6px. Nothing larger.
* **Shadow:** only on floating layers (drawer, dropdown). Flat everywhere else.
* **Motion:** none on load. The highlighter mark grows in under the new nav item on navigation (it does not travel between items) (150ms, disabled under `prefers-reduced-motion`).

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

## Not in this pass

Dashboard content, lesson reader, practice forms, and admin screens are designed in their own phases, using this system.
