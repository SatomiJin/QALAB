import { expect, test } from '@playwright/test';
import { SAMPLE } from './support/mock-learning.ts';
import { openNav, signedIn } from './support/mock-api.ts';

const stlcLesson = SAMPLE.lessons[3];

test.describe('Glossary', () => {
  test('a term in a lesson opens its glossary entry, and Back returns', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto(`/learning/lessons/${stlcLesson.id}`);

    // "> Every test case gets a verdict." links its first QA term.
    const term = page
      .getByTestId('lesson-content')
      .locator('[data-glossary-term="test-case"]');
    await expect(term).toHaveText('test case');
    await expect(term).toHaveAttribute('href', '/glossary#test-case');
    // Raw HTML in the same lesson is still not rendered.
    await expect(page.getByTestId('raw-html')).toHaveCount(0);

    await term.click();
    await expect(page).toHaveURL('/glossary#test-case');
    const entry = page.locator('[data-term="test-case"]');
    await expect(entry).toHaveAttribute('data-active', 'true');
    await expect(entry).toBeInViewport();

    await page.goBack();
    await expect(page).toHaveURL(`/learning/lessons/${stlcLesson.id}`);
  });

  test('searches, filters by topic and follows related terms', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/glossary');

    await expect(
      page.getByRole('heading', { name: 'Glossary', level: 1 }),
    ).toBeVisible();
    await expect(page).toHaveTitle('Glossary · QA Learning Lab');
    await openNav(page);
    await expect(
      page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'Glossary' }),
    ).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Escape');

    const search = page.getByTestId('glossary-search');
    await search.fill('boundary');
    await expect(
      page.locator('[data-term="boundary-value-analysis"]'),
    ).toBeVisible();
    await expect(page.locator('[data-term="test-plan"]')).toHaveCount(0);

    await search.fill('zzzz');
    await expect(page.locator('[data-state="empty"]')).toBeVisible();
    await search.fill('');

    // Related links clear the filters, so the target is always on screen.
    await search.fill('severity');
    await page
      .locator('[data-term="severity"]')
      .getByRole('link', { name: 'Priority' })
      .click();
    await expect(page).toHaveURL('/glossary#priority');
    await expect(search).toHaveValue('');
    await expect(page.locator('[data-term="priority"]')).toHaveAttribute(
      'data-active',
      'true',
    );
  });

  test('shows the Vietnamese name and definition in Vietnamese', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('qalab.language', 'vi'),
    );
    await signedIn(page);
    await page.goto('/glossary#test-case');

    const entry = page.locator('[data-term="test-case"]');
    await expect(entry).toContainText('Test case');
    await expect(entry).toContainText('Ca kiểm thử');
    await expect(entry).toContainText('expected result');
  });

  test('shows published terms only, and an error with retry', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    await page.goto('/glossary');
    await expect(page.locator('[data-term="test-case"]')).toBeVisible();
    await expect(page.locator('[data-term="draft-term"]')).toHaveCount(0);

    api.glossary.failing = true;
    await page.reload();
    await expect(page.locator('[data-state="error"]')).toBeVisible({
      timeout: 15_000,
    });
    api.glossary.failing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('[data-term="test-case"]')).toBeVisible();
  });
});
