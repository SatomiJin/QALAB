import { expect, test, type Page } from '@playwright/test';
import { openNav, signedIn } from './support/mock-api.ts';

async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  const dropdown = page.locator(
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
  );
  await dropdown.getByTitle(option, { exact: true }).click();
  await expect(dropdown).toHaveCount(0);
}

const statuses = (page: Page, testId: string) =>
  page
    .getByTestId(testId)
    .locator('[data-status]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-status')));

// No popup animations: an option clicked mid-animation can be missed.
test.use({ reducedMotion: 'reduce' });

test.describe('Admin CMS', () => {
  test('keeps Courses marked on lesson and exercise pages', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const lesson = api.admin.addLesson(
      api.admin.addModule(api.admin.addCourse()),
    );
    for (const path of [
      `/admin/lessons/${lesson.id}`,
      `/admin/lessons/${lesson.id}/exercises/new?type=scenario`,
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await openNav(page);
      await expect(
        page
          .getByRole('navigation', { name: 'Main navigation' })
          .getByRole('link', { name: 'Courses', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
    }
  });

  test('lists every course with filters and opens one', async ({ page }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const published = api.admin.addCourse({
      title: 'Published course',
      status: 'published',
    });
    api.admin.addCourse({
      title: 'Draft course',
      skillId: 'skill-test_design',
    });
    await page.goto('/admin/courses');

    await expect(
      page.getByRole('heading', { name: 'Courses', level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId('admin-course')).toHaveCount(2);
    expect(await statuses(page, 'admin-course-list')).toEqual([
      'published',
      'draft',
    ]);
    await expect(page.getByTestId('admin-course-range')).toHaveText(
      '1–2 of 2 courses',
    );

    await choose(page, 'Filter by status', 'Draft');
    await expect(page).toHaveURL(/\?status=draft$/);
    await expect(page.getByTestId('admin-course')).toHaveCount(1);
    await expect(page.getByTestId('admin-course')).toContainText(
      'Test Design Techniques',
    );

    await choose(page, 'Filter by skill', 'QA Fundamentals');
    await expect(page.getByTestId('courses-empty')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL(/\/admin\/courses$/);

    await page.getByRole('link', { name: 'Published course' }).click();
    await expect(page).toHaveURL(`/admin/courses/${published.id}`);
    await expect(page.getByTestId('visibility')).toHaveAttribute(
      'data-state',
      'visible',
    );
    // The back button returns to the list.
    await page.getByTestId('page-back').click();
    await expect(page).toHaveURL(/\/admin\/courses$/);
  });

  test('creates a course: the slug follows the title, a used slug shows on the field', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    api.admin.addCourse({ slug: 'boundary-values', title: 'Existing' });
    await page.goto('/admin/courses');

    await page.getByTestId('new-course').click();
    const dialog = page.getByRole('dialog');
    await choose(page, 'Skill', 'Test Design Techniques');
    await dialog.getByLabel('Title').fill('Boundary values');
    await expect(dialog.getByLabel('Slug')).toHaveValue('boundary-values');
    await page.getByTestId('create-course-submit').click();
    await expect(dialog).toContainText(
      'slug is already used by another course',
    );

    await dialog.getByLabel('Slug').fill('Not a slug');
    await page.getByTestId('create-course-submit').click();
    await expect(dialog).toContainText(
      'Use lowercase letters, digits and single dashes.',
    );

    await dialog.getByLabel('Slug').fill('boundary-values-2');
    await page.getByTestId('create-course-submit').click();
    await expect(page).toHaveURL(/\/admin\/courses\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole('heading', { name: 'Boundary values', level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByTestId('status-line').locator('[data-status]'),
    ).toHaveAttribute('data-status', 'draft');
    await expect(page.getByTestId('publish-course')).toBeDisabled();
  });

  test('builds the outline, previews the lesson Markdown and publishes', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const course = api.admin.addCourse({ title: 'Empty course' });
    await page.goto(`/admin/courses/${course.id}`);

    await expect(
      page.getByText('No modules yet. Add the first module.'),
    ).toBeVisible();
    await page.getByTestId('add-module').click();
    await page.getByRole('dialog').getByLabel('Title').fill('Basics');
    await choose(page, 'Status', 'Published');
    await page.getByTestId('module-submit').click();
    await expect(page.getByTestId('admin-module')).toContainText('Module 1');
    await expect(page.getByTestId('admin-module')).toContainText('Basics');

    await page.getByTestId('add-lesson').click();
    await page.getByRole('dialog').getByLabel('Title').fill('Why we test');
    await expect(page.getByRole('dialog').getByLabel('Slug')).toHaveValue(
      'why-we-test',
    );
    await page.getByTestId('lesson-submit').click();
    await expect(page).toHaveURL(/\/admin\/lessons\//);

    await page
      .getByTestId('lesson-content-input')
      .fill(
        '# Testing\n\nIt finds **defects**.\n\n<script>window.hacked = true</script>',
      );
    const preview = page.getByTestId('markdown-preview');
    if ((page.viewportSize()?.width ?? 1280) < 992) {
      await page.getByTestId('markdown-tabs').getByText('Preview').click();
    }
    await expect(
      preview.getByRole('heading', { name: 'Testing' }),
    ).toBeVisible();
    await expect(preview.locator('strong')).toHaveText('defects');
    await expect(preview.locator('script')).toHaveCount(0);
    await choose(page, 'Status', 'Published');
    await page.getByTestId('save-lesson').click();
    await expect(page.getByText('Changes saved.')).toBeVisible();
    const saved = api.admin.writes.find((w) =>
      w.key.startsWith('PATCH /admin/lessons/'),
    );
    expect(saved?.body).toMatchObject({
      status: 'published',
      title: 'Why we test',
    });

    await page.getByTestId('page-back').click();
    await expect(page).toHaveURL(`/admin/courses/${course.id}`);
    await expect(page.getByTestId('admin-lesson')).toContainText('1.1');
    await page.getByTestId('publish-course').click();
    await expect(page.getByText('Course published.')).toBeVisible();
    await expect(page.getByTestId('visibility')).toHaveAttribute(
      'data-state',
      'visible',
    );
  });

  test('reorders modules and lessons with the arrows', async ({ page }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const course = api.admin.addCourse();
    const first = api.admin.addModule(course, { title: 'First module' });
    const second = api.admin.addModule(course, { title: 'Second module' });
    const l1 = api.admin.addLesson(first, { title: 'Lesson one' });
    const l2 = api.admin.addLesson(first, { title: 'Lesson two' });
    await page.goto(`/admin/courses/${course.id}`);

    await page.getByRole('button', { name: 'Move Second module up' }).click();
    await expect(page.getByText('Order saved.')).toBeVisible();
    const modules = page.getByTestId('admin-module').locator('h3');
    await expect(modules).toHaveText(['Second module', 'First module']);
    expect(api.admin.writes.at(-1)).toEqual({
      key: `PATCH /admin/courses/${course.id}/modules/reorder`,
      body: { ids: [second.id, first.id] },
    });

    await page.getByRole('button', { name: 'Move Lesson one down' }).click();
    await expect(page.getByTestId('admin-lesson').first()).toContainText(
      'Lesson two',
    );
    await expect(page.getByTestId('admin-lesson').first()).toContainText('2.1');
    expect(api.admin.writes.at(-1)?.body).toEqual({ ids: [l2.id, l1.id] });
  });

  test('puts the old order back when saving it fails', async ({ page }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const course = api.admin.addCourse();
    api.admin.addModule(course, { title: 'First module' });
    api.admin.addModule(course, { title: 'Second module' });
    await page.goto(`/admin/courses/${course.id}`);
    await expect(page.getByTestId('admin-module')).toHaveCount(2);

    api.admin.failing = true;
    await page.getByRole('button', { name: 'Move Second module up' }).click();
    await expect(page.getByTestId('admin-module').locator('h3')).toHaveText([
      'First module',
      'Second module',
    ]);
  });

  test('blocks deleting content in use and deletes unused content after confirming', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const used = api.admin.addCourse({
      title: 'Used course',
      status: 'published',
    });
    const usedLesson = api.admin.addLesson(api.admin.addModule(used));
    api.admin.used.add(usedLesson.id);
    const unused = api.admin.addCourse({ title: 'Unused course' });

    await page.goto(`/admin/courses/${used.id}`);
    await expect(page.getByTestId('in-use').first()).toBeVisible();
    await expect(page.getByTestId('delete-course')).toBeDisabled();
    await expect(page.getByTestId('delete-module')).toBeDisabled();
    await page.getByTestId('archive-course').click();
    await expect(page.getByText('Course archived.')).toBeVisible();

    await page.goto(`/admin/courses/${unused.id}`);
    await page.getByTestId('delete-course').click();
    await expect(page.getByRole('dialog')).toContainText(
      'Delete “Unused course”?',
    );
    await page.getByTestId('confirm-delete').click();
    await expect(page).toHaveURL(/\/admin\/courses$/);
    await expect(page.getByRole('link', { name: 'Unused course' })).toHaveCount(
      0,
    );
    expect(api.admin.courses.has(unused.id)).toBe(false);
  });

  test('creates a multiple choice exercise with its answer key', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const lesson = api.admin.addLesson(
      api.admin.addModule(api.admin.addCourse()),
    );
    await page.goto(`/admin/lessons/${lesson.id}`);

    await expect(
      page.getByText('No exercises in this lesson yet.'),
    ).toBeVisible();
    await page.getByTestId('add-exercise').click();
    await page.getByRole('menuitem', { name: 'Multiple choice' }).click();
    await expect(page).toHaveURL(
      `/admin/lessons/${lesson.id}/exercises/new?type=multiple_choice`,
    );

    await page
      .getByTestId('exercise-question')
      .fill('Which technique tests the edges?');
    await page
      .getByRole('textbox', { name: 'Option 1', exact: true })
      .fill('Boundary value analysis');
    await page
      .getByRole('textbox', { name: 'Option 2', exact: true })
      .fill('Smoke testing');
    await page.getByTestId('add-option').click();
    await page
      .getByRole('textbox', { name: 'Option 3', exact: true })
      .fill('Error guessing');
    await page.getByTestId('save-exercise').click();
    await expect(page.getByText('Mark the correct option.')).toBeVisible();

    await page.getByTestId('option-correct').first().check();
    await page.getByTestId('save-exercise').click();
    await expect(page).toHaveURL(/\/admin\/exercises\//);
    const created = api.admin.writes.find((w) => w.key.endsWith('/exercises'));
    expect(created?.body).toMatchObject({
      type: 'multiple_choice',
      status: 'draft',
      promptData: {
        options: [
          { id: 'a', text: 'Boundary value analysis' },
          { id: 'b', text: 'Smoke testing' },
          { id: 'c', text: 'Error guessing' },
        ],
        multiple: false,
      },
      answerData: { correct: ['a'] },
    });
    await expect(
      page.getByRole('heading', { name: 'Edit exercise', level: 1 }),
    ).toBeVisible();
  });

  test('writes a scenario key and a bug report key', async ({ page }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const lesson = api.admin.addLesson(
      api.admin.addModule(api.admin.addCourse()),
    );

    await page.goto(`/admin/lessons/${lesson.id}/exercises/new?type=scenario`);
    await page
      .getByTestId('exercise-question')
      .fill('How would you test a date field?');
    await page.getByLabel('Concept 1', { exact: true }).fill('Boundary');
    await page
      .getByLabel('Keywords for concept 1, comma-separated')
      .fill('boundary, edge');
    await page.getByTestId('model-answer').fill('Test the **edges**.');
    await page
      .getByRole('textbox', { name: 'Check 1', exact: true })
      .fill('I tested both edges');
    await page.getByTestId('save-exercise').click();
    await expect(page).toHaveURL(/\/admin\/exercises\//);
    expect(api.admin.writes.at(-1)?.body).toMatchObject({
      type: 'scenario',
      answerData: {
        expectedConcepts: [
          { concept: 'Boundary', keywords: ['boundary', 'edge'] },
        ],
        modelAnswer: 'Test the **edges**.',
        rubric: [{ id: 'rubric-1', text: 'I tested both edges' }],
      },
    });

    await page.goto(
      `/admin/lessons/${lesson.id}/exercises/new?type=bug_report`,
    );
    await page.getByTestId('exercise-question').fill('Report this bug.');
    await page.getByTestId('model-answer').fill('Model');
    await page
      .getByRole('textbox', { name: 'Check 1', exact: true })
      .fill('Has steps');
    await page.getByTestId('save-exercise').click();
    await expect(page.getByText('Choose the expected Severity.')).toBeVisible();
    await choose(page, 'Expected Severity', 'Major');
    await choose(page, 'Expected Priority', 'High');
    await page
      .getByTestId('required-fields')
      .getByLabel('Steps to reproduce')
      .check();
    await page.getByTestId('save-exercise').click();
    await expect(page).toHaveURL(/\/admin\/exercises\//);
    expect(api.admin.writes.at(-1)?.body).toMatchObject({
      type: 'bug_report',
      answerData: {
        requiredFields: ['stepsToReproduce'],
        expectedSeverity: 'major',
        expectedPriority: 'high',
      },
    });
  });

  test('locks answer rows of an exercise learners have answered', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const lesson = api.admin.addLesson(
      api.admin.addModule(api.admin.addCourse()),
    );
    const exercise = api.admin.addExercise(lesson);
    api.admin.used.add(exercise.id);
    await page.goto(`/admin/exercises/${exercise.id}`);

    await expect(page.getByTestId('locked-note')).toBeVisible();
    await expect(page.getByTestId('add-option')).toBeDisabled();
    await expect(page.getByTestId('delete-exercise')).toBeDisabled();
    await page
      .getByRole('textbox', { name: 'Option 2', exact: true })
      .fill('Smoke test');
    await page.getByTestId('save-exercise').click();
    await expect(page.getByText('Changes saved.')).toBeVisible();
    expect(api.admin.writes.at(-1)?.body).toMatchObject({
      promptData: {
        options: [
          { id: 'a', text: 'Boundary value analysis' },
          { id: 'b', text: 'Smoke test' },
        ],
      },
      answerData: { correct: ['a'] },
    });
  });

  test('previews a lesson as learners will see it', async ({ page }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const lesson = api.admin.addLesson(
      api.admin.addModule(api.admin.addCourse()),
      {
        title: 'Draft lesson',
        status: 'draft',
        contentMd: '## Heading\n\nText.',
      },
    );
    api.admin.addExercise(lesson, { question: 'Published question' });
    api.admin.addExercise(lesson, {
      question: 'Draft question',
      status: 'draft',
    });
    await page.goto(`/admin/lessons/${lesson.id}`);

    await page.getByTestId('preview-lesson').click();
    await expect(page).toHaveURL(`/admin/lessons/${lesson.id}/preview`);
    await expect(page.getByTestId('preview-note')).toContainText(
      'Preview as learner',
    );
    await expect(page.getByTestId('visibility')).toHaveAttribute(
      'data-state',
      'hidden',
    );
    await expect(
      page
        .getByTestId('lesson-content')
        .getByRole('heading', { name: 'Heading' }),
    ).toBeVisible();
    await expect(page.getByTestId('exercise-item')).toHaveText([
      /Published question/,
    ]);
    await page.getByRole('link', { name: 'Back to the editor' }).click();
    await expect(page).toHaveURL(`/admin/lessons/${lesson.id}`);
  });

  test('shows loading errors, and not found for unknown content', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    api.admin.failing = true;
    await page.goto('/admin/courses');
    // 5xx is retried (with backoff) before the error shows.
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible({
      timeout: 15_000,
    });

    api.admin.failing = false;
    await page.goto('/admin/courses/00000000-0000-4000-8000-999999999999');
    await expect(page.getByTestId('bug-report')).toBeVisible();
    await page.goto('/admin/lessons/not-a-uuid');
    await expect(page.getByTestId('bug-report')).toBeVisible();
  });

  test('learners get no access to admin pages or the admin API', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    await page.goto('/admin/courses');
    await expect(page.getByTestId('bug-report')).toContainText('No access');
    expect(api.calls.some((call) => call.path.startsWith('/admin/'))).toBe(
      false,
    );
  });
});
