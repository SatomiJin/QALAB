import { expect, test } from '@playwright/test';
import { openNav, signedIn } from './support/mock-api.ts';

test.describe('Foundation', () => {
  test('redirects / to the dashboard', async ({ page }) => {
    await signedIn(page);
    await page.goto('/');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
    await expect(page).toHaveTitle('Dashboard · QA Learning Lab');
    await expect(page.getByTestId('placeholder')).toContainText('Phase 5');
  });

  test('shows API online when the backend is reachable', async ({ page }) => {
    await signedIn(page);
    await page.goto('/dashboard');

    await expect(page.getByTestId('api-status')).toHaveAttribute(
      'data-state',
      'online',
    );
  });

  test('shows API offline when the backend is unreachable', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    api.healthy = false;
    await page.goto('/dashboard');

    await expect(page.getByTestId('api-status')).toHaveAttribute(
      'data-state',
      'offline',
    );
  });

  test('navigates between main sections and practice tabs', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/dashboard');

    await openNav(page);
    await page.getByRole('link', { name: 'Learning', exact: true }).click();
    await expect(page).toHaveURL(/\/learning$/);
    await expect(page.getByRole('heading', { name: 'Learning' })).toBeVisible();

    await openNav(page);
    await page.getByRole('link', { name: 'Practice', exact: true }).click();
    await expect(page).toHaveURL(/\/practice\/quiz$/);

    await page
      .getByRole('navigation', { name: 'Practice types' })
      .getByRole('link', { name: 'Bug reports' })
      .click();
    await expect(page).toHaveURL(/\/practice\/bug-report$/);
    await expect(
      page.getByRole('heading', { name: 'Bug Report practice' }),
    ).toBeVisible();
  });

  test('marks the current section', async ({ page }) => {
    await signedIn(page);
    await page.goto('/practice/scenario');

    await openNav(page);
    await expect(
      page.getByRole('link', { name: 'Practice', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('shows the 404 page as a bug report', async ({ page }) => {
    await signedIn(page);
    await page.goto('/this-does-not-exist');

    const report = page.getByTestId('bug-report');
    await expect(report).toContainText('Page not found');
    await expect(report).toContainText('/this-does-not-exist');
    await page.getByRole('button', { name: 'Go to dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('has no horizontal scroll', async ({ page }) => {
    await signedIn(page);
    for (const path of ['/dashboard', '/practice/test-case', '/profile']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
