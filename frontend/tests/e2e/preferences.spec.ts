import { expect, test, type Page } from '@playwright/test';
import { signedIn } from './support/mock-api.ts';

// Preferences work the same signed in or out; these run signed in.
async function mockHealth(page: Page) {
  await signedIn(page);
}

const html = (page: Page) => page.locator('html');

test.describe('Language', () => {
  // Menus open with an animation; a click during it can be lost (flaky).
  test.use({ reducedMotion: 'reduce' });

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
    expect(background).toBe('rgb(18, 23, 29)');

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

// Regression: a global "reduced motion" CSS rule once cut antd's enter
// animation short and left every dropdown positioned off-screen.
test.describe('Reduced motion (OS setting)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('dropdowns and selects open on screen and work', async ({ page }) => {
    await signedIn(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/profile');

    await page.getByRole('button', { name: 'Theme' }).click();
    const dark = page.getByRole('menuitem', { name: 'Dark' });
    await expect(dark).toBeInViewport();
    await dark.click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Language' }).click();
    const vi = page.getByRole('menuitem', { name: 'Tiếng Việt' });
    await expect(vi).toBeInViewport();
    await vi.click();
    await expect(html(page)).toHaveAttribute('lang', 'vi');

    await page.getByTestId('user-menu').click();
    await expect(
      page.getByRole('menuitem', { name: 'Đăng xuất' }),
    ).toBeInViewport();
    await page.keyboard.press('Escape');

    await page.getByLabel('Mức kinh nghiệm').click();
    await expect(page.getByTitle('Đang làm QA/QC')).toBeInViewport();
  });
});
