A **flaky test** passes and fails on the same code without anything changing. It is one of the most expensive problems in automation: every red build has to be investigated, and once people learn that "it is probably just flaky", they start ignoring real failures too. A suite nobody trusts is worse than no suite.

## Why flakiness matters

* **Lost time**: someone reruns the pipeline, waits, investigates a failure that is not a bug.
* **Lost trust**: after a few false alarms, a real regression gets merged with "rerun it, it is flaky".
* **Hidden bugs**: sometimes the flakiness is in the product (a real race condition users will hit), and calling it "test noise" hides it.

## Common causes

| Cause | What happens | Example |
| --- | --- | --- |
| **Timing** | The test checks before the app is ready, or depends on how fast something is | A fixed `waitForTimeout(2000)` that is too short on a busy CI machine |
| **Shared state** | Tests use the same data, account or setting | Two tests edit the same user's profile in parallel |
| **Order dependence** | A test passes only if another ran before it (or fails if one did) | Test B expects the product that test A created |
| **External services** | A third-party API, email or payment sandbox is slow or down | A test that waits for a real email from a mail provider |
| **Environment and time** | Results depend on the date, time zone, screen size or locale | A "due tomorrow" test that fails just after midnight UTC |
| **Random data or order** | Unseeded random values or an unsorted list from the API | Asserting the first row of a list the backend returns in any order |
| **Animations and leftovers** | Clicks land during a transition or on a previous toast | Clicking a button while a dialog is still sliding in |

## Test isolation

Most flakiness disappears when tests are **isolated**: each one can run alone, in any order, in parallel, any number of times, and gives the same result. In practice:

* **Fresh state per test**: Playwright gives each test a new browser context (no cookies or storage from other tests). Keep it that way: do not share logged-in pages between tests by hand.
* **Own data per test**: unique users, orders and names created in fixtures, cleaned up afterwards (see the API lesson).
* **No order dependence**: if test B needs a product, B creates it.
* **Control what you do not own**: replace third-party services with a stub or mock at the edge, so a slow payment sandbox does not fail your checkout test. Keep a few separate tests that do check the real integration.
* **Control time and randomness**: fix the clock or time zone in the test, seed random values, sort lists before comparing.

Playwright can mock a network call so a test does not depend on an external service:

```ts
test('shows the shipping estimate', async ({ page }) => {
  await page.route('**/api/shipping-estimate', (route) =>
    route.fulfill({ json: { days: 3 } }),
  );
  await page.goto('/checkout');
  await expect(page.getByTestId('shipping-estimate')).toHaveText('Arrives in 3 days');
});
```

## Investigating a flaky test

1. **Reproduce it**: run the test many times, alone and with the suite. In Playwright: `npx playwright test checkout.spec.ts --repeat-each=20`. Try parallel and serial runs (`--workers=1`) to see whether other tests matter.
2. **Collect evidence**: keep traces, screenshots, videos and logs for failed runs. Compare a passing and a failing run step by step.
3. **Find the pattern**: only on CI? Only in parallel? Only after a certain test? Only at certain times? Each points to a cause in the table above.
4. **Fix the root cause**: replace the sleep with a web-first assertion, give the test its own data, stub the external service. Then repeat the runs to confirm it is stable.
5. **Check the product too**: if the app itself behaves differently under timing (a double submit creates two orders), that is a bug to report, not a test to fix.

## Retries and quarantine

**Retries** (running a failed test again automatically) are a safety net, not a cure. Keep them low (one or two on CI), and track which tests pass only on retry: Playwright reports them as **flaky**, which is a to-do list.

**Quarantine** means moving a known flaky test out of the blocking suite temporarily, with a ticket and an owner, so it stops blocking everyone while someone fixes it. A quarantined test that nobody fixes is just a deleted test with extra steps, so give it a deadline.

> Key idea: flaky tests destroy trust; make every test isolated (own data, fresh state, no order dependence, controlled external services and time), investigate failures with repeated runs and traces, and fix root causes instead of adding sleeps or retries.
