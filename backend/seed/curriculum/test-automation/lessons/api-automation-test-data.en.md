API tests send HTTP requests straight to the backend and check the response: status code, body and side effects. No browser, no layout, so they are fast and stable, and they sit in the middle of the pyramid. Most of the difficulty is not the request itself but the **test data**: every test needs the right data to exist before it starts, and must not trip over data left by other tests.

## What an API test checks

For each request, check what matters to the contract:

| Check | Example |
| --- | --- |
| **Status code** | `201` after creating an order, `400` for an invalid body, `401` without a token |
| **Body** | The order has `status: "pending"` and the right `total` |
| **Side effect** | Reading the order again with `GET /orders/:id` returns it |
| **Error format** | A `400` names the invalid field |

Checking only the status code is a weak test: a `200` with the wrong total still passes.

## A first API test

Playwright's `request` fixture sends HTTP calls without opening a browser:

```ts
import { test, expect } from '@playwright/test';

test('creates an order with the basket total', async ({ request }) => {
  const response = await request.post('/api/orders', {
    data: { items: [{ sku: 'MUG-BLUE', quantity: 2 }] },
  });

  expect(response.status()).toBe(201);
  const order = await response.json();
  expect(order.total).toBe(24);
  expect(order.status).toBe('pending');
});
```

## Test data: the hard part

Tests that share data become dependent on each other. Typical problems:

* Test A deletes the user that test B logs in with. B fails, but only when A runs first.
* Two tests run in parallel and both try to register `test@example.com`. One gets `409 Conflict`.
* A test expects "3 orders" in a list, but yesterday's run left 40 orders behind.

The rules that avoid this:

1. **Each test creates the data it needs** (through the API, not the UI: it is faster).
2. **Data is unique**: add a random or time-based part to emails, names and ids.
3. **Each test cleans up** what it created, or runs against data nobody else uses.
4. **Never depend on another test having run first.**

## Setup and teardown with fixtures

A **fixture** prepares something before a test and cleans it up after. In Playwright you define your own fixtures with `test.extend`. The code before `use()` is the **setup**, the code after it is the **teardown**, and it runs even when the test fails.

```ts
import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

type User = { id: string; email: string; password: string };

export const test = base.extend<{ user: User }>({
  user: async ({ request }, use) => {
    // setup: a fresh user for this test only
    const email = `qa-${randomUUID()}@example.com`;
    const password = 'Correct-Pass-1';
    const response = await request.post('/api/users', { data: { email, password } });
    const { id } = await response.json();

    await use({ id, email, password });

    // teardown: runs after the test, pass or fail
    await request.delete(`/api/users/${id}`);
  },
});

test('a new user has no orders', async ({ request, user }) => {
  const response = await request.get(`/api/users/${user.id}/orders`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
});
```

Every test that asks for `user` gets its own account, so tests can run in any order and in parallel.

## Factories

When many tests need similar data, a **factory** builds it with sensible defaults and lets each test override only what it cares about:

```ts
export function buildOrder(overrides: Partial<{ sku: string; quantity: number; coupon: string }> = {}) {
  return { sku: 'MUG-BLUE', quantity: 1, ...overrides };
}

// a test that is about coupons says only that
const order = buildOrder({ coupon: 'SAVE15' });
```

The test now shows what is special about its data, and the defaults are fixed in one place.

## API tests also prepare UI tests

A UI test for "edit an order" does not need to click through checkout first. Create the order with one API call in a fixture, then open the edit page. The UI test gets shorter, faster and checks only the screen it is about.

> Key idea: check status code, body and side effects; give every test its own unique data through fixtures and factories, created by API and cleaned up afterwards, so tests never depend on each other.
