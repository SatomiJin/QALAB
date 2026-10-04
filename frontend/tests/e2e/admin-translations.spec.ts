import { expect, test, type Page } from '@playwright/test';
import { signedIn } from './support/mock-api.ts';

const row = (page: Page, field: string) =>
  page.locator(`[data-testid="translation-field"][data-field="${field}"]`);

const statuses = (page: Page) =>
  page
    .getByTestId('translation-field')
    .evaluateAll((els) =>
      els.map((el) => [
        el.getAttribute('data-field'),
        el.getAttribute('data-state'),
      ]),
    );

const lastPut = (writes: { key: string; body: Record<string, unknown> }[]) =>
  writes.filter((w) => w.key.startsWith('PUT ')).at(-1)?.body;

test.use({ reducedMotion: 'reduce' });

test.describe('Admin CMS: Vietnamese translations', () => {
  test('translates a lesson from its editor and shows it as current', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const lesson = api.admin.addLesson(
      api.admin.addModule(api.admin.addCourse()),
      { title: 'What is a bug', contentMd: '## Bugs\n\nA bug is a defect.' },
    );
    await page.goto(`/admin/lessons/${lesson.id}`);
    await page.getByTestId('translate-lesson').click();

    await expect(page).toHaveURL(`/admin/lessons/${lesson.id}/translation`);
    expect(await statuses(page)).toEqual([
      ['title', 'missing'],
      ['content_md', 'missing'],
    ]);
    await expect(page.getByTestId('translation-source-title')).toHaveText(
      'What is a bug',
    );
    await expect(page.getByTestId('translation-count-missing')).toContainText(
      '2',
    );

    await page.getByTestId('translation-input-title').fill('  Lỗi là gì ');
    await page
      .getByTestId('translation-input-content_md')
      .fill('## Lỗi\n\nLỗi là một khiếm khuyết.');
    await page.getByTestId('save-translation').click();

    await expect(row(page, 'title')).toHaveAttribute('data-state', 'current');
    await expect(row(page, 'content_md')).toHaveAttribute(
      'data-state',
      'current',
    );
    await expect(page.getByTestId('translation-count-current')).toContainText(
      '2',
    );
    expect(lastPut(api.admin.writes)).toMatchObject({
      fields: [
        { field: 'title', text: 'Lỗi là gì' },
        { field: 'content_md', text: '## Lỗi\n\nLỗi là một khiếm khuyết.' },
      ],
    });

    // Saving again without changes sends nothing.
    const puts = api.admin.writes.length;
    await page.getByTestId('save-translation').click();
    await expect(page.getByText('Nothing changed.')).toBeVisible();
    expect(api.admin.writes.length).toBe(puts);
  });

  test('confirms an out-of-date translation and removes an emptied one', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const course = api.admin.addCourse({
      title: 'Testing basics',
      description: 'Start here',
    });
    api.admin.addTranslation('course', course.id, 'title', 'Cơ bản', 'Basics');
    api.admin.addTranslation('course', course.id, 'description', 'Bắt đầu');
    await page.goto(`/admin/courses/${course.id}`);
    await page.getByTestId('translate-course').click();

    await expect(row(page, 'title')).toHaveAttribute('data-state', 'stale');
    await expect(page.getByTestId('translation-input-title')).toHaveValue(
      'Cơ bản',
    );
    await page.getByTestId('confirm-title').click();
    await page.getByTestId('translation-input-description').fill('');
    await page.getByTestId('save-translation').click();

    await expect(row(page, 'title')).toHaveAttribute('data-state', 'current');
    await expect(row(page, 'description')).toHaveAttribute(
      'data-state',
      'missing',
    );
    expect(lastPut(api.admin.writes)).toMatchObject({
      fields: [
        { field: 'title', text: 'Cơ bản' },
        { field: 'description', text: null },
      ],
    });
  });

  test('opens a module translation from the course outline', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const course = api.admin.addCourse();
    const module = api.admin.addModule(course, { title: 'First steps' });
    await page.goto(`/admin/courses/${course.id}`);
    await page
      .getByRole('button', { name: 'Vietnamese translation of First steps' })
      .click();

    await expect(page).toHaveURL(
      `/admin/courses/${course.id}/modules/${module.id}/translation`,
    );
    expect(await statuses(page)).toEqual([['title', 'missing']]);
  });

  test('starts from the machine translation when there is one', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const lesson = api.admin.addLesson(
      api.admin.addModule(api.admin.addCourse()),
      { title: 'Smoke testing' },
    );
    api.admin.machine.set(`lesson:${lesson.id}:title`, 'Kiểm thử khói');
    await page.goto(`/admin/lessons/${lesson.id}/translation`);

    await page.getByTestId('use-machine-title').click();
    await expect(page.getByTestId('translation-input-title')).toHaveValue(
      'Kiểm thử khói',
    );
  });

  test('shows field errors and a changed English', async ({ page }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const lesson = api.admin.addLesson(
      api.admin.addModule(api.admin.addCourse()),
      { title: 'Old title', contentMd: '## Heading\n\nBody.' },
    );
    await page.goto(`/admin/lessons/${lesson.id}/translation`);

    // Markdown must keep the English headings (checked by the API).
    await page
      .getByTestId('translation-input-content_md')
      .fill('Không có tiêu đề');
    await page.getByTestId('save-translation').click();
    await expect(row(page, 'content_md')).toContainText(
      'text has 0 headings, English has 1',
    );

    // The English changes while the page is open: 409, new English shown.
    await page.getByTestId('translation-input-content_md').fill('');
    await page.getByTestId('translation-input-title').fill('Tiêu đề');
    api.admin.lessons.get(lesson.id)!.title = 'New title';
    await page.getByTestId('save-translation').click();
    await expect(page.getByTestId('translation-error')).toBeVisible();
    await expect(page.getByTestId('translation-source-title')).toHaveText(
      'New title',
    );
    // What was typed is kept; saving again now works.
    await expect(page.getByTestId('translation-input-title')).toHaveValue(
      'Tiêu đề',
    );
    await page.getByTestId('save-translation').click();
    await expect(row(page, 'title')).toHaveAttribute('data-state', 'current');
  });

  test('lists exercise texts and answers 404 for unknown content', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const exercise = api.admin.addExercise(
      api.admin.addLesson(api.admin.addModule(api.admin.addCourse())),
    );
    await page.goto(`/admin/exercises/${exercise.id}`);
    await page.getByTestId('translate-exercise').click();
    // Wait for the (lazy) translation page before reading its rows.
    await expect(page.getByTestId('translation-field')).toHaveCount(4);
    expect((await statuses(page)).map(([field]) => field)).toEqual([
      'question',
      'option.a',
      'option.b',
      'explanation',
    ]);
    await expect(row(page, 'option.b').getByRole('heading')).toHaveText(
      'Option 2',
    );

    await page.goto(
      '/admin/lessons/00000000-0000-4000-8000-999999999999/translation',
    );
    await expect(page.getByTestId('bug-report')).toBeVisible();
  });
});
