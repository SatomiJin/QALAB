Automated tests are worth the most when they run by themselves, on every change, before the change reaches users. That is the job of **CI/CD**: **continuous integration** builds and tests every change as soon as it is pushed, and **continuous delivery/deployment** ships the tested build to staging and production. A test that runs only when someone remembers to start it on their laptop protects almost nothing.

## A typical pipeline

A **pipeline** is the list of steps CI runs for a change, usually fastest first so problems are found early:

```text
pull request opened or updated
  1. install + build             (fails fast on compile errors)
  2. lint + typecheck
  3. unit tests                  (seconds)
  4. API tests                   (a minute or two)
  5. UI tests, in parallel       (a few minutes)
  6. reports + traces uploaded
merged to main
  7. deploy to staging -> smoke tests
  8. deploy to production -> smoke tests
```

The order follows the pyramid: cheap, fast checks first; if the build or the unit tests fail, there is no point waiting for UI tests.

## Run on every pull request

The most important rule: **the suite runs on every pull request, and a failing test blocks the merge.** This gives fast feedback to the person who made the change, while it is still fresh in their head, and keeps the main branch always releasable.

For this to work:

* **The build must fail on a failing test.** A pipeline that shows red tests but still lets the merge through teaches everyone to ignore it. Make the test job a required check.
* **The suite must be fast enough.** If it takes an hour, people stop waiting. Keep the per-PR suite to roughly 10–15 minutes; move slow, broad suites (full cross-browser runs, long regression packs) to a nightly run.
* **The suite must be trustworthy.** Flaky tests in a blocking suite are fixed or quarantined quickly (previous lesson).

## Parallelism and sharding

UI tests are slow one by one, but independent tests can run at the same time. Playwright runs test files in parallel **workers** on one machine, and can split the suite across several CI machines with **sharding**:

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [['html', { open: 'never' }], ['junit', { outputFile: 'results.xml' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
```

With four CI machines, each runs `npx playwright test --shard=1/4` (then `2/4`, `3/4`, `4/4`) and the suite finishes in about a quarter of the time. Parallelism only works if tests are **isolated**: shared data turns parallel runs into flaky runs.

Some settings in this config are there for CI specifically:

* `forbidOnly` fails the run if someone left a `test.only` in the code, which would silently skip every other test.
* `retries: 1` on CI lets one transient failure pass, while the report still marks the test as flaky so it gets fixed.
* `baseURL` from an environment variable lets the same tests run against a local server, staging or production.

## Reports and traces

When a test fails on CI, nobody can look at the screen. The pipeline must keep the evidence:

| Artifact | What it gives you |
| --- | --- |
| **HTML report** | Which tests failed, with error messages and steps |
| **JUnit XML** | Results the CI tool can show in the pull request |
| **Trace** | A step-by-step recording: DOM snapshots, network calls, console logs |
| **Screenshot / video** | What the page looked like when it failed |

Upload them as pipeline artifacts. A failure message plus a trace usually lets you tell a real bug from a test problem in minutes.

## Smoke tests after deploy

Tests before merge check the code; they do not check the deployment (configuration, secrets, database migrations, the real network). After each deploy, a short **smoke suite** runs against the deployed environment: the home page loads, a user can sign in, the main API answers. It takes a minute or two and answers one question: "is this release basically alive?" If it fails on staging, the release stops; if it fails on production, the team rolls back or fixes immediately.

Smoke tests on production must be safe: read-only checks or dedicated test accounts, no real payments.

## What QA owns in CI

QA engineers often design which tests run where (per PR, nightly, after deploy), watch the flaky-test list, keep the suite fast, and make sure failures are investigated, not just rerun.

> Key idea: run fast, isolated tests on every pull request and fail the build when they fail; run in parallel to stay fast, keep reports and traces for every failure, and run a short smoke suite after each deploy.
