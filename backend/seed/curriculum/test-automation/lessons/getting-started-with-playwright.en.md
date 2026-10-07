The other lessons in this course show Playwright code. This one gets you from an empty folder to a running test suite: installing Playwright, what the installer creates, running and debugging tests, recording a first draft with codegen, and reading a trace when a test fails. QA Learning Lab tests its own frontend with Playwright, so everything here is used in this project.

## Install

Playwright Test needs a recent Node.js (the docs currently list the latest 22.x, 24.x or 26.x). In a new or existing project:

```bash
npm init playwright@latest
```

The installer asks a few questions (TypeScript or JavaScript, the tests folder, a GitHub Actions workflow, whether to install browsers) and creates:

| File | Purpose |
|---|---|
| `playwright.config.ts` | Configuration: browsers, base URL, retries, reporters, traces |
| `tests/example.spec.ts` | A minimal example test |
| `package.json` and lock file | The `@playwright/test` dependency |

To update later: `npm install -D @playwright/test@latest`, then `npx playwright install --with-deps` for the matching browsers.

## Run tests

| Command | What it does |
|---|---|
| `npx playwright test` | Runs every test, headless, in all configured browsers, in parallel |
| `npx playwright test tests/login.spec.ts` | Runs one file |
| `npx playwright test --project=chromium` | Runs only one configured browser project |
| `npx playwright test --ui` | Opens **UI mode**: pick tests, watch them run step by step, re-run on change |
| `npx playwright show-report` | Opens the **HTML report** of the last run |

UI mode is the best place to write and debug tests: you see every action, the page at each step, and the locator each step used.

## The configuration that matters

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
```

* `baseURL` lets tests call `page.goto('/login')` on any environment.
* `projects` run the same tests in several browsers or emulated devices (desktop and mobile here).
* `retries` re-runs a failed test; keep it at zero locally so flakiness stays visible.
* `trace: 'on-first-retry'` records a trace only when a failed test is retried: cheap, and you get evidence exactly when you need it.

## Record a first draft with codegen

```bash
npx playwright codegen http://localhost:5173
```

A browser opens; every click and fill you make is written as test code next to it. Codegen picks **role, text and test id** locators and refines them until they match one element. Treat the result as a **draft**: rename it, remove unneeded steps, replace text locators that will break in another language with test ids, and add the **assertions** codegen cannot guess (what should be true after the action).

## Debug a failure with the trace viewer

A trace records the whole test: every action, a **DOM snapshot** before and after it, console messages, network requests, errors and the source line. Open it from the HTML report (the trace icon of a failed test), or record one on demand:

```bash
npx playwright test --trace on
```

Read a failing trace in this order: the **error** and the step it happened on, the **snapshot** of the page at that moment (was the element there? hidden? another text?), then the **network** tab (did the API answer with an error?) and the **console**. Most "the test is broken" reports turn out to be a real defect, a changed locator, or a missing wait, and the trace tells you which.

## Sources

* Playwright documentation: [Installation](https://playwright.dev/docs/intro), [Running and debugging tests](https://playwright.dev/docs/running-tests), [Generating tests](https://playwright.dev/docs/codegen-intro), [Trace viewer](https://playwright.dev/docs/trace-viewer-intro) and [Test configuration](https://playwright.dev/docs/test-configuration), checked 7 October 2026. © Microsoft; Playwright and its documentation are under the Apache License 2.0. The configuration and the explanations are written by the QALAB team.

> Key idea: `npm init playwright@latest` sets up the config and an example; `npx playwright test` runs the suite, `--ui` helps you write and debug, `show-report` shows the results. Codegen gives a draft that still needs good locators and assertions, and the trace viewer shows exactly what happened when a test failed.
