An automated test is only as good as what it checks and how long it is willing to wait. A test that checks too little passes while the feature is broken. A test that waits the wrong way fails while the feature works, or wastes minutes on every run. This lesson covers both.

## Meaningful assertions

An **assertion** is the expected result of a test written as code: "this must be true, otherwise fail". A test without a real assertion is not a test, it is a script that clicks.

| Weak assertion | Why it is weak | Meaningful assertion |
| --- | --- | --- |
| The page loaded | An error page also loads | The order confirmation shows order number and total |
| Status code is `200` | The body may still be wrong | Status `201` **and** `total` is `24` |
| An element exists | It may be hidden or show the wrong value | The element is visible and has text `"3 items"` |
| No exception was thrown | Silence is not proof | The new row appears in the list |

Good habits:

* **Assert the outcome the user or the client cares about**, not an internal detail that may change.
* **Be specific**: an exact value when it is known, not "not empty".
* **One behaviour per test**, with as many assertions as that behaviour needs. A test named "applies a coupon" checks the discounted total, not ten unrelated things.
* **Make failures readable**: `expected "17.00" but got "18.00"` tells you more than `expected true but got false`.

## Why waiting is needed

Web applications are asynchronous. After a click, the browser sends a request, the server answers, the page updates. A test that checks the result immediately can check too early and fail, even though a user waiting half a second would see the right result.

## The wrong way: fixed sleeps

```ts
await page.getByRole('button', { name: 'Place order' }).click();
await page.waitForTimeout(5000); // wait 5 seconds and hope
expect(await page.getByTestId('order-status').textContent()).toBe('Confirmed');
```

A fixed sleep is always wrong in one direction:

* **Too short**: on a slow CI machine the order takes 6 seconds, the test fails. This is a classic cause of **flaky tests** (next lesson).
* **Too long**: on a fast run the order is confirmed in 300 ms, and the test still waits 5 seconds. Across 500 tests, that is more than 40 minutes of nothing.

Raising the number "until it passes" only moves the problem.

## The right way: wait for a condition

Wait for **the thing you need**, with a timeout as a safety limit. Most tools offer this. Playwright builds it in at two levels.

**Auto-waiting actions.** Before `click()` or `fill()`, Playwright waits until the element is attached, visible, stable and enabled. You do not add waits before actions.

**Web-first assertions.** `await expect(locator).toHaveText(...)` retries the check until it passes or the timeout (5 seconds by default) runs out:

```ts
await page.getByRole('button', { name: 'Place order' }).click();
await expect(page.getByTestId('order-status')).toHaveText('Confirmed');
```

On a fast run this finishes as soon as the text appears; on a slow run it waits longer; it fails only if the text never appears. Compare the two styles:

```ts
// reads the text once, immediately: may be too early
expect(await page.getByTestId('order-status').textContent()).toBe('Confirmed');

// retries until the text matches or the timeout ends
await expect(page.getByTestId('order-status')).toHaveText('Confirmed');
```

Useful web-first assertions: `toBeVisible()`, `toHaveText()`, `toHaveValue()`, `toHaveCount()`, `toHaveURL()`, `toBeEnabled()`.

## Waiting for something that is not on the page

Sometimes the condition is a network call or a URL change. Wait for that event, not for time:

```ts
const saved = page.waitForResponse((r) => r.url().includes('/api/profile') && r.ok());
await page.getByRole('button', { name: 'Save' }).click();
await saved;
await expect(page).toHaveURL(/\/profile$/);
```

Start waiting **before** the action that triggers it, or the response may arrive before you listen.

## Timeouts are limits, not waits

A timeout says "give up after this long". Raising a timeout for a page that is genuinely slow is fine; using it to hide a bug in the app or a missing wait in the test is not. If a step regularly needs 20 seconds, that is worth reporting as a performance issue.

## Sources

* Playwright documentation: [Auto-waiting (actionability)](https://playwright.dev/docs/actionability), [Assertions](https://playwright.dev/docs/test-assertions). © Microsoft; Playwright and its documentation are under the Apache License 2.0. The code here is written by the QALAB team.

> Key idea: assert specific outcomes the user cares about, and wait for conditions (auto-waiting, web-first assertions, expected responses) instead of fixed sleeps, which are both slow and flaky.
