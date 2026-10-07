import { expect, test, type Page } from '@playwright/test';
import { SAMPLE } from './support/mock-learning.ts';
import { openNav, signedIn } from './support/mock-api.ts';

async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  const dropdown = page.locator(
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
  );
  await dropdown.getByTitle(option, { exact: true }).click();
  await expect(dropdown).toHaveCount(0);
}

const listed = (page: Page) =>
  page
    .getByTestId('admin-term')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-term')));

async function addPhrase(page: Page, phrase: string) {
  await page.getByRole('combobox', { name: 'Phrases to link' }).fill(phrase);
  await page.keyboard.press('Enter');
}

// No popup animations: an option clicked mid-animation can be missed.
test.use({ reducedMotion: 'reduce' });

test.describe('Admin glossary', () => {
  test('lists every term with its usage and filters by course', async ({
    page,
  }) => {
    await signedIn(page, { role: 'admin' });
    await page.goto('/admin/glossary');

    await expect(
      page.getByRole('heading', { name: 'Glossary', level: 1 }),
    ).toBeVisible();
    await openNav(page);
    await expect(
      page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'Glossary', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Escape');

    expect(await listed(page)).toContain('draft-term');
    await expect(page.getByTestId('admin-term-range')).toHaveText(
      '1–8 of 8 terms',
    );
    const testCase = page.locator('[data-term="test-case"]');
    await expect(testCase.getByTestId('term-usage')).toHaveText(
      'Used in 1 lesson',
    );
    await expect(testCase.locator('[data-status]')).toHaveAttribute(
      'data-status',
      'published',
    );

    // The sample course uses "test case" and "defects", nothing else.
    await choose(page, 'Filter by course', SAMPLE.course.title);
    await expect(page).toHaveURL(/course=/);
    expect(await listed(page)).toEqual(['defect', 'test-case']);

    await choose(page, 'Filter by course', 'Not used in any lesson');
    expect(await listed(page)).not.toContain('test-case');

    await choose(page, 'Filter by status', 'Draft');
    expect(await listed(page)).toEqual(['draft-term']);

    await page.goto('/admin/glossary?q=zzzz');
    await expect(page.getByTestId('terms-empty')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL('/admin/glossary');
  });

  test('creates a term, publishes it, and learners see it linked', async ({
    page,
  }) => {
    await signedIn(page, { role: 'admin' });
    await page.goto('/admin/glossary');
    await page.getByTestId('new-term').click();
    await expect(page).toHaveURL('/admin/glossary/new');
    await expect(page.getByTestId('term-form')).toBeVisible();

    await page.getByTestId('term-name').fill('Testing principles');
    // The slug follows the term until it is edited.
    await expect(page.getByTestId('slug')).toHaveValue('testing-principles');
    await page.getByTestId('term-vi-name').fill('Nguyên tắc kiểm thử');
    await addPhrase(page, 'presence of defects');
    await page
      .getByTestId('term-definition-en')
      .fill('Seven ideas about testing.');
    await page
      .getByTestId('term-definition-vi')
      .fill('Bảy ý tưởng về kiểm thử.');
    await page.getByTestId('save-term').click();

    await expect(page).toHaveURL(/\/admin\/glossary\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId('status-line')).toContainText('Draft');
    // Saved phrase: the panel says where it is used.
    await expect(page.getByTestId('usage-count')).toHaveText(
      'Used in 1 lesson',
    );
    await expect(page.getByTestId('term-usage-panel')).toContainText(
      SAMPLE.course.title,
    );

    // A draft is not shown to learners. Wait for the published terms first:
    // the count of 0 holds before the data loads too, and going back while
    // the refresh token rotates signs out.
    await page.goto('/glossary');
    await expect(page.locator('[data-term]').first()).toBeVisible();
    await expect(page.locator('[data-term="testing-principles"]')).toHaveCount(
      0,
    );

    // Back is a full page load (session refresh, admin chunk, term): slower
    // than 5 s when the workers are busy.
    await page.goBack();
    await expect(page.getByTestId('term-form')).toBeVisible({
      timeout: 15_000,
    });
    await choose(page, 'Status', 'Published');
    await page.getByTestId('save-term').click();
    await expect(page.getByTestId('status-line')).toContainText('Published');

    await page.getByTestId('open-entry').click();
    await expect(page).toHaveURL('/glossary#testing-principles');
    await expect(
      page.locator('[data-term="testing-principles"]'),
    ).toHaveAttribute('data-active', 'true');

    // Lesson 3: "Testing shows the presence of defects." now links the new term.
    await page.goto(`/learning/lessons/${SAMPLE.lessons[2].id}`);
    await expect(
      page
        .getByTestId('lesson-content')
        .locator('[data-glossary-term="testing-principles"]'),
    ).toHaveText('presence of defects');
  });

  test('shows the API errors on the fields: taken phrase and slug', async ({
    page,
  }) => {
    await signedIn(page, { role: 'admin' });
    await page.goto('/admin/glossary/new');
    await page.getByTestId('term-name').fill('Test case');
    await addPhrase(page, 'Test Case');
    await page.getByTestId('term-definition-en').fill('Duplicate.');
    await page.getByTestId('term-definition-vi').fill('Trùng.');
    await page.getByTestId('save-term').click();

    const form = page.getByTestId('term-form');
    await expect(form).toContainText('slug is already used by "Test case"');
    await expect(form).toContainText(
      '"Test Case": phrase is already used by "Test case"',
    );
    await expect(page).toHaveURL('/admin/glossary/new');
  });

  test('deletes a term after confirming', async ({ page }) => {
    await signedIn(page, { role: 'admin' });
    await page.goto('/admin/glossary');
    await page
      .locator('[data-term="draft-term"]')
      .getByRole('link', { name: 'Draft term' })
      .click();
    await expect(page.getByTestId('term-form')).toBeVisible();
    await page.getByTestId('delete-term').click();
    await page.getByTestId('confirm-delete').click();

    await expect(page).toHaveURL('/admin/glossary');
    await expect(page.locator('[data-term="test-case"]')).toBeVisible();
    expect(await listed(page)).not.toContain('draft-term');
  });

  test('a learner gets the no-access page', async ({ page }) => {
    await signedIn(page);
    await page.goto('/admin/glossary');
    await expect(page.getByTestId('bug-report')).toBeVisible();
  });

  test('an unknown term id shows the not-found page', async ({ page }) => {
    await signedIn(page, { role: 'admin' });
    await page.goto('/admin/glossary/7a1d2a4e-0c1b-4d7e-9a3f-999999999999');
    await expect(page.getByTestId('bug-report')).toBeVisible();
  });
});
