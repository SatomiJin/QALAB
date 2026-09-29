import { expect, test, type Page } from '@playwright/test';

const HEALTH_URL = '**/api/v1/health';

async function mockHealth(page: Page, ok: boolean) {
  await page.route(HEALTH_URL, (route) =>
    ok
      ? route.fulfill({
          json: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptimeSeconds: 1,
          },
        })
      : route.abort('connectionrefused'),
  );
}

// Below the lg breakpoint (992px) the menu lives in a drawer.
async function openMenuIfCollapsed(page: Page) {
  const width = page.viewportSize()?.width ?? 1280;
  if (width < 992) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
  }
}

test.describe('Foundation', () => {
  test('redirects / to the dashboard', async ({ page }) => {
    await mockHealth(page, true);
    await page.goto('/');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
    await expect(page).toHaveTitle('Dashboard · QA Learning Lab');
  });

  test('shows API online when the backend is reachable', async ({ page }) => {
    await mockHealth(page, true);
    await page.goto('/dashboard');

    await expect(page.getByTestId('api-status')).toContainText('API online');
  });

  test('shows API offline when the backend is unreachable', async ({
    page,
  }) => {
    await mockHealth(page, false);
    await page.goto('/dashboard');

    await expect(page.getByTestId('api-status')).toContainText('API offline');
  });

  test('navigates between main sections', async ({ page }) => {
    await mockHealth(page, true);
    await page.goto('/dashboard');

    await openMenuIfCollapsed(page);
    await page.getByRole('link', { name: 'Learning', exact: true }).click();
    await expect(page).toHaveURL(/\/learning$/);
    await expect(page.getByRole('heading', { name: 'Learning' })).toBeVisible();

    await openMenuIfCollapsed(page);
    await page.getByRole('menuitem', { name: 'Practice' }).click();
    await page.getByRole('link', { name: 'Bug Report Practice' }).click();
    await expect(page).toHaveURL(/\/practice\/bug-report$/);
    await expect(
      page.getByRole('heading', { name: 'Bug Report Practice' }),
    ).toBeVisible();
  });

  test('shows the 404 page for unknown routes', async ({ page }) => {
    await mockHealth(page, true);
    await page.goto('/this-does-not-exist');

    await expect(page.getByText('Page not found')).toBeVisible();
    await page.getByRole('button', { name: 'Go to dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('renders the admin and auth layouts', async ({ page }) => {
    await mockHealth(page, true);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/courses$/);
    await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible();

    await page.goto('/auth');
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('has no horizontal scroll', async ({ page }) => {
    await mockHealth(page, true);
    await page.goto('/dashboard');

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
