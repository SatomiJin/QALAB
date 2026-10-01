A UI test drives the real interface the way a user does: open a page, type, click, and check what appears. It is the most realistic kind of automated test and also the easiest to make fragile. Two habits keep UI tests maintainable whatever tool you use: **stable locators** and **page objects**. The examples use Playwright with TypeScript.

## Locators: how a test finds an element

A **locator** tells the tool which element to act on. If it depends on details that change often (the page layout, generated class names), the test breaks even though the feature still works.

Prefer locators that describe the element the way a user or the product sees it:

| Locator | Example | Stability |
| --- | --- | --- |
| **Role + accessible name** | `getByRole('button', { name: 'Sign in' })` | High: matches what the user sees and what screen readers use |
| **Label** | `getByLabel('Email')` | High: tied to the form field's label |
| **Test id** | `getByTestId('checkout-total')` | High: a `data-testid` added on purpose, independent of text and layout |
| **Text** | `getByText('Order placed')` | Medium: breaks when wording or language changes |
| **CSS class / structure** | `.btn-primary:nth-child(2)` | Low: breaks when styling or order changes |
| **Long XPath** | `/html/body/div[2]/div/form/button` | Very low: breaks when any parent changes |

Role and label locators have a bonus: if a test cannot find the button by its role and name, a screen reader user probably cannot either, so the test also catches accessibility problems. Use a **test id** when there is no good role or label (a total amount, a row in a table) or when the UI text is translated.

## A first UI test

```ts
import { test, expect } from '@playwright/test';

test('registered user can sign in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('learner@example.com');
  await page.getByLabel('Password').fill('Correct-Pass-1');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

It reads almost like a manual test case: steps, then an expected result. But imagine 30 tests that all sign in this way. When the button is renamed "Log in", you fix 30 files.

## The Page Object Model

The **Page Object Model (POM)** puts the knowledge of *how a page works* (its locators and actions) in one class per page. Tests then talk to the page in the language of the feature, not of the HTML.

```ts
import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
    this.error = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
```

```ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

test('wrong password shows an error', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.signIn('learner@example.com', 'wrong-password');

  await expect(login.error).toHaveText('Invalid email or password');
});
```

Now a renamed button is a one-line change in `LoginPage`, and every test keeps working.

## Rules for good page objects

* **One class per page or component** (a header, a date picker), named after what the user sees.
* **Methods describe user actions**: `signIn`, `addToBasket`, not `clickButton3`.
* **Keep assertions in the tests**, not hidden in page objects, so each test shows clearly what it checks. Exposing locators (like `login.error`) lets the test assert on them.
* **No test logic in pages**: a page object does not decide whether a result is correct.
* **Do not build a page object for everything at once.** Create it when a second test needs the same page.

## UI tests are the top of the pyramid

Even with good locators and page objects, UI tests are the slowest and most expensive level. Use them for the journeys a user really takes (sign in, checkout), and check calculations and validation rules lower down.

> Key idea: find elements by role, label or test id rather than CSS paths, and wrap each page's locators and actions in a page object so a UI change is fixed in one place.
