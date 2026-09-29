import { expect, test, type Page } from '@playwright/test';

async function mockHealth(page: Page) {
  await page.route('**/api/v1/health', (route) =>
    route.fulfill({
      json: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 1,
      },
    }),
  );
}

const html = (page: Page) => page.locator('html');

test.describe('Language', () => {
  test.beforeEach(async ({ page }) => {
    await mockHealth(page);
  });

  test('defaults to the browser language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'vi-VN' });
    const page = await context.newPage();
    await mockHealth(page);
    await page.goto('/dashboard');

    await expect(
      page.getByRole('heading', { name: 'Tổng quan' }),
    ).toBeVisible();
    await expect(html(page)).toHaveAttribute('lang', 'vi');
    await context.close();
  });

  test('switches to Vietnamese and remembers the choice', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('menuitem', { name: 'Tiếng Việt' }).click();

    await expect(
      page.getByRole('heading', { name: 'Tổng quan' }),
    ).toBeVisible();
    await expect(page.getByTestId('api-status')).toContainText('API hoạt động');
    await expect(page).toHaveTitle('Tổng quan · QA Learning Lab');
    await expect(html(page)).toHaveAttribute('lang', 'vi');

    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Tổng quan' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Ngôn ngữ' }).click();
    await page.getByRole('menuitem', { name: 'English' }).click();
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('translates Ant Design built-in texts', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('menuitem', { name: 'Tiếng Việt' }).click();

    // The Empty component's image alt comes from the antd locale.
    await expect(page.getByRole('img', { name: 'Trống' })).toBeVisible();
  });
});

test.describe('Theme', () => {
  test.beforeEach(async ({ page }) => {
    await mockHealth(page);
  });

  test('follows the OS setting by default', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await mockHealth(page);
    await page.goto('/dashboard');

    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await context.close();
  });

  test('switches to dark and remembers the choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/dashboard');
    await expect(html(page)).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: 'Theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();

    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(background).toBe('rgb(15, 17, 21)');

    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('explicit light overrides a dark OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/dashboard');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Theme' }).click();
    await page.getByRole('menuitem', { name: 'Light' }).click();

    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });

  test('applies the saved theme before the app renders', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('qalab.theme', 'dark'));
    await page.emulateMedia({ colorScheme: 'light' });

    // Block the app bundle: only the inline script in index.html runs.
    await page.route('**/assets/*.js', (route) => route.abort());
    await page.goto('/dashboard');

    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  });
});
