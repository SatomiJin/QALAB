import { expect, test } from '@playwright/test';
import { openNav, signedIn } from './support/mock-api.ts';

// Phase 8 regressions: navigation, focus, scroll, overflowing tabs, states.

test.describe('Navigation and focus', () => {
  test('a skip link leads to the page content', async ({ page }) => {
    await signedIn(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('moving to another page focuses its content and starts at the top', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/dashboard');
    await expect(page.getByTestId('summary')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await openNav(page);
    await page.getByRole('link', { name: 'Learning', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Learning', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('main')).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('changing a list filter keeps focus on the tabs', async ({ page }) => {
    await signedIn(page);
    await page.goto('/learning');
    const tab = page
      .getByTestId('skill-filter')
      .locator('[data-skill="fundamentals"]');
    await tab.click();
    await expect(page).toHaveURL(/skill=fundamentals/);
    await expect(tab).toBeFocused();
  });

  test('learners asking for admin pages keep the app navigation', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/admin/courses');

    await expect(page.getByTestId('bug-report')).toContainText('No access');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.locator('main')).toContainText('No access');
  });
});

test.describe('Overflowing tabs', () => {
  test.use({ viewport: { width: 760, height: 900 } });

  test('fade on the side with hidden tabs and show the current one', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/learning');
    const filter = page.getByTestId('skill-filter');
    await expect(filter).toHaveAttribute('data-more-end', '');
    await expect(filter).not.toHaveAttribute('data-more-start', '');

    // The last tab, opened from a link: scrolled into view.
    await page.goto('/learning?skill=automation');
    const current = filter.locator('[aria-current="page"]');
    await expect(current).toHaveAttribute('data-skill', 'automation');
    await expect(current).toBeInViewport({ ratio: 1 });
    await expect(filter).toHaveAttribute('data-more-start', '');
  });
});

test.describe('States', () => {
  test('a load error reads as Blocked with a retry', async ({ page }) => {
    const { api } = await signedIn(page);
    api.dashboard.failing = true;
    await page.goto('/dashboard');

    const state = page.locator('[data-state="error"]');
    await expect(state).toBeVisible({ timeout: 15_000 });
    await expect(state.locator('[data-verdict="blocked"]')).toBeVisible();
    await expect(state).toHaveAttribute('role', 'alert');

    api.dashboard.failing = false;
    await state.getByRole('button').click();
    await expect(page.getByTestId('summary')).toBeVisible();
  });
});
