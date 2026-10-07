import { expect, test, type Page } from '@playwright/test';
import { SAMPLE } from './support/mock-learning.ts';
import { signedIn } from './support/mock-api.ts';

const [lesson1, lesson2, , lesson4] = SAMPLE.lessons;

const filterSkills = async (page: Page) =>
  page
    .getByTestId('skill-filter')
    .getByRole('link')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-skill')));

test.describe('Learning', () => {
  test('lists the courses with a skill filter and a place to start', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/learning');

    await expect(
      page.getByRole('heading', { name: 'Learning', level: 1 }),
    ).toBeVisible();
    await expect(page).toHaveTitle('Learning · QA Learning Lab');
    expect(await filterSkills(page)).toEqual([
      'all',
      'fundamentals',
      'testing_types',
      'test_design',
      'test_docs',
      'defect_mgmt',
      'api_testing',
      'automation',
    ]);
    // Skill names come from the locale files, not the API.
    await expect(
      page
        .getByTestId('skill-filter')
        .getByRole('link', { name: 'QA Fundamentals' }),
    ).toBeVisible();

    const course = page.getByTestId('course-item');
    await expect(course.getByRole('link')).toHaveText(SAMPLE.course.title);
    await expect(course).toContainText('0 of 4 lessons');
    await expect(course).toContainText('QA Fundamentals');
    await expect(course.locator('[data-verdict]')).toHaveAttribute(
      'data-verdict',
      'notRun',
    );
    await expect(page.getByTestId('course-range')).toHaveText(
      '1–1 of 1 courses',
    );

    const next = page.getByTestId('continue');
    await expect(next).toHaveAttribute('data-state', 'start');
    await expect(next).toContainText(lesson1.title);
    await next.getByRole('button', { name: 'Start lesson' }).click();
    await expect(page).toHaveURL(`/learning/lessons/${lesson1.id}`);
  });

  test('shows the lesson actions once: side column, footer or phone bar', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto(`/learning/lessons/${lesson1.id}`);
    await expect(
      page.getByRole('heading', { name: lesson1.title, level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId('complete-lesson')).toHaveCount(1);
    const width = page.viewportSize()?.width ?? 1280;

    if (width >= 1200) {
      // Wide screens: a side column, visible without scrolling.
      await expect(
        page.getByTestId('lesson-aside').getByTestId('complete-lesson'),
      ).toBeInViewport();
      await expect(page.getByTestId('lesson-bar')).toHaveCount(0);
    } else if (width < 768) {
      // Phones: a bottom bar that slides in once most of the lesson is read.
      const bar = page.getByTestId('lesson-bar');
      await expect(bar).toHaveAttribute('data-shown', 'false');
      await page
        .getByRole('navigation', { name: 'Other lessons in this course' })
        .scrollIntoViewIfNeeded();
      await expect(bar).toHaveAttribute('data-shown', 'true');
      await expect(bar.getByTestId('complete-lesson')).toBeInViewport();
      await expect(
        bar.getByRole('link', { name: 'Next lesson' }),
      ).toBeInViewport();
    }
  });

  test('reads a lesson: tracks the visit and scrolling, then completes it', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    await page.goto(`/learning/lessons/${lesson1.id}`);

    await expect(
      page.getByRole('heading', { name: lesson1.title, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: SAMPLE.course.title }),
    ).toHaveAttribute('href', `/learning/courses/${SAMPLE.course.slug}`);
    // Markdown: headings from h2, GFM tables.
    const content = page.getByTestId('lesson-content');
    await expect(
      content.getByRole('heading', {
        name: 'Testing is about information',
        level: 2,
      }),
    ).toBeVisible();
    await expect(content.getByRole('table')).toHaveCount(2);
    await expect(content.getByRole('table').first()).toBeVisible();

    await expect(page.getByTestId('lesson-status')).toHaveAttribute(
      'data-state',
      'in_progress',
    );
    expect(api.learning.progressCalls[0]).toEqual({
      lessonId: lesson1.id,
      body: {},
    });

    // To the end of the lesson (on phones the button is in the bottom bar).
    await page
      .getByRole('navigation', { name: 'Other lessons in this course' })
      .scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        Math.max(
          0,
          ...api.learning.progressCalls.map(
            (call) =>
              (call.body as { progressPercent?: number }).progressPercent ?? 0,
          ),
        ),
      )
      .toBe(100);
    // Only 10-point steps are sent, never one request per scroll event.
    for (const call of api.learning.progressCalls) {
      const percent = (call.body as { progressPercent?: number })
        .progressPercent;
      if (percent !== undefined) expect(percent % 10).toBe(0);
    }

    await page.getByTestId('complete-lesson').click();
    await expect(page.getByTestId('lesson-completed')).toContainText(
      'Completed on',
    );
    await expect(page.getByTestId('lesson-status')).toHaveAttribute(
      'data-state',
      'completed',
    );

    await page
      .getByRole('navigation', { name: 'Other lessons in this course' })
      .getByRole('link', { name: new RegExp(lesson2.title) })
      .click();
    await expect(page).toHaveURL(`/learning/lessons/${lesson2.id}`);
    await expect(
      page.getByRole('heading', { name: lesson2.title, level: 1 }),
    ).toBeVisible();
    // Inline code keeps its characters.
    await expect(
      page.getByTestId('lesson-content').locator('code').first(),
    ).toHaveText('age > 18');
  });

  test('shows course progress and continues from the next lesson', async ({
    page,
  }) => {
    const { api, user } = await signedIn(page);
    api.learning.setProgress(user.id, lesson1.id, {
      status: 'completed',
      progressPercent: 100,
      completedAt: new Date().toISOString(),
    });
    await page.goto(`/learning/courses/${SAMPLE.course.slug}`);

    await expect(
      page.getByRole('heading', { name: SAMPLE.course.title, level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId('course-progress')).toHaveText(
      '1 of 4 lessons',
    );
    const rows = page.getByTestId('lesson-row');
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toHaveAttribute('data-state', 'completed');
    await expect(rows.nth(0)).toContainText('1.1');
    await expect(rows.nth(2)).toContainText('2.1');
    await expect(rows.nth(1)).toHaveAttribute('data-state', 'not_started');

    await page.getByRole('button', { name: 'Continue course' }).click();
    await expect(page).toHaveURL(`/learning/lessons/${lesson2.id}`);
  });

  test('resumes a half-read lesson', async ({ page }) => {
    const { api, user } = await signedIn(page);
    api.learning.setProgress(user.id, lesson1.id, {
      status: 'in_progress',
      progressPercent: 40,
    });
    await page.goto('/learning');

    const next = page.getByTestId('continue');
    await expect(next).toHaveAttribute('data-state', 'resume');
    await expect(next).toContainText('40% read');
    await next.getByRole('button', { name: 'Continue lesson' }).click();

    const jump = page.getByRole('button', {
      name: 'Jump to where you stopped (40%)',
    });
    await expect(jump).toBeVisible();
    const before = await page.evaluate(() => window.scrollY);
    await jump.click();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(before);
  });

  test('does not render raw HTML from lesson content', async ({ page }) => {
    await signedIn(page);
    await page.goto(`/learning/lessons/${lesson4.id}`);

    await expect(page.getByTestId('lesson-content')).toContainText(
      'Every test case gets a verdict.',
    );
    await expect(page.getByTestId('raw-html')).toHaveCount(0);
    expect(
      await page.evaluate(() => 'xss' in window || '__xss' in window),
    ).toBe(false);
  });

  test('shows the empty state when nothing is published', async ({ page }) => {
    const { api } = await signedIn(page);
    api.learning.empty = true;
    await page.goto('/learning');

    await expect(page.getByText('No courses are published yet.')).toBeVisible();
  });

  test('shows an error with retry when the API fails', async ({ page }) => {
    const { api } = await signedIn(page);
    api.learning.failing = true;
    await page.goto('/learning');

    await expect(page.getByText('Could not load data')).toBeVisible({
      timeout: 15_000,
    });
    api.learning.failing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('continue')).toBeVisible();
  });

  test('shows a bug report for unknown courses and lessons', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/learning/courses/no-such-course');
    await expect(page.getByTestId('bug-report')).toBeVisible();

    await page.goto('/learning/lessons/not-a-uuid');
    await expect(page.getByTestId('bug-report')).toBeVisible();
  });

  test('uses Vietnamese skill names and keeps verdicts in English', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('qalab.language', 'vi'),
    );
    await signedIn(page);
    await page.goto('/learning');

    await expect(
      page
        .getByTestId('skill-filter')
        .getByRole('link', { name: 'Nền tảng QA' }),
    ).toBeVisible();
    await expect(page.getByTestId('course-item')).toContainText('Not run');
    await expect(page.getByTestId('course-item')).toContainText('0/4 bài');
  });
});

test.describe('Learning navigation', () => {
  test('shows Learning › course › lesson and goes back to the lesson list', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto(`/learning/lessons/${lesson2.id}`);

    const trail = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(trail.getByRole('listitem')).toHaveText([
      'Learning',
      SAMPLE.course.title,
      lesson2.title,
    ]);
    await expect(trail.getByText(lesson2.title)).toHaveAttribute(
      'aria-current',
      'page',
    );

    await page.getByRole('link', { name: 'Back to the lesson list' }).click();
    await expect(page).toHaveURL(`/learning/courses/${SAMPLE.course.slug}`);
    await expect(
      page
        .getByRole('navigation', { name: 'Breadcrumb' })
        .getByRole('listitem'),
    ).toHaveText(['Learning', SAMPLE.course.title]);
  });

  test('back from a course returns to the list page the learner was on', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/learning?pageSize=50');
    await page.getByTestId('course-item').getByRole('link').click();
    await expect(page).toHaveURL(`/learning/courses/${SAMPLE.course.slug}`);

    await page.getByRole('link', { name: 'Back to courses' }).click();
    await expect(page).toHaveURL('/learning?pageSize=50');
  });
});

test.describe('Course list pagination', () => {
  test('pages 20 at a time by default, and 50 or 100 on request', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    api.learning.addCourses(45); // 46 courses in total
    await page.goto('/learning');

    await expect(page.getByTestId('course-item')).toHaveCount(20);
    await expect(page.getByTestId('course-range')).toHaveText(
      '1–20 of 46 courses',
    );
    expect(api.learning.courseQueries.at(-1)).toMatchObject({
      page: '1',
      pageSize: '20',
    });

    await page.getByTitle('3', { exact: true }).click();
    await expect(page).toHaveURL('/learning?page=3');
    await expect(page.getByTestId('course-item')).toHaveCount(6);
    await expect(page.getByTestId('course-range')).toHaveText(
      '41–46 of 46 courses',
    );

    // A new page size starts again from the first page.
    await page.getByRole('combobox', { name: 'Courses per page' }).click();
    await page.getByTitle('50 per page').click();
    await expect(page).toHaveURL('/learning?pageSize=50');
    await expect(page.getByTestId('course-item')).toHaveCount(46);

    // The URL keeps the state: reload shows the same list.
    await page.reload();
    await expect(page.getByTestId('course-item')).toHaveCount(46);
  });

  test('filters by skill and resets to the first page', async ({ page }) => {
    const { api } = await signedIn(page);
    api.learning.addCourses(45);
    await page.goto('/learning?page=2');

    const filter = page.getByTestId('skill-filter');
    await filter.getByRole('link', { name: 'Test Design Techniques' }).click();
    await expect(page).toHaveURL('/learning?skill=test_design');
    await expect(
      filter.getByRole('link', { name: 'Test Design Techniques' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('course-range')).toHaveText(
      '1–20 of 45 courses',
    );

    await filter.getByRole('link', { name: 'Automation Testing' }).click();
    await expect(page.getByTestId('courses-empty')).toHaveText(
      'No courses in this skill yet.',
    );

    await filter.getByRole('link', { name: 'All skills' }).click();
    await expect(page).toHaveURL('/learning');
  });

  test('ignores invalid list parameters in the URL', async ({ page }) => {
    const { api } = await signedIn(page);
    await page.goto('/learning?page=-1&pageSize=30&skill=Bad!');

    await expect(page.getByTestId('course-item')).toHaveCount(1);
    expect(api.learning.courseQueries.at(-1)).toEqual({
      page: '1',
      pageSize: '20',
      lang: 'en',
    });
  });

  test('moves to the last page when the page is past the end', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/learning?page=9');
    await expect(page).toHaveURL('/learning');
    await expect(page.getByTestId('course-item')).toHaveCount(1);
  });
});

test.describe('Lesson translation (Vietnamese UI)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('qalab.language', 'vi'),
    );
  });

  test('shows the machine translation, and the English original on request', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    await page.goto(`/learning/lessons/${lesson1.id}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      `(VI) ${lesson1.title}`,
    );
    const note = page.getByTestId('translation-note');
    await expect(note).toHaveAttribute('data-state', 'machine');
    await expect(note).toContainText('Bản dịch máy từ tiếng Anh');

    await note.getByRole('button', { name: 'Xem bản gốc tiếng Anh' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      lesson1.title,
    );
    await expect(note).toHaveAttribute('data-state', 'original');

    await note.getByRole('button', { name: 'Xem bản tiếng Việt' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      `(VI) ${lesson1.title}`,
    );
    // Switching language does not count as another visit.
    expect(
      api.learning.progressCalls.filter(
        (call) => JSON.stringify(call.body) === '{}',
      ),
    ).toHaveLength(1);
  });

  test('shows a translation written by a person, with the original on request', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    api.learning.translation = 'manual';
    await page.goto(`/learning/lessons/${lesson1.id}`);

    const note = page.getByTestId('translation-note');
    await expect(note).toHaveAttribute('data-state', 'manual');
    await expect(note).toContainText('Bản tiếng Việt');
    await expect(note).not.toContainText('dịch máy');
    await note.getByRole('button', { name: 'Xem bản gốc tiếng Anh' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      lesson1.title,
    );
  });

  test('says when the translation is not available', async ({ page }) => {
    const { api } = await signedIn(page);
    api.learning.translation = 'unavailable';
    await page.goto(`/learning/lessons/${lesson1.id}`);

    const note = page.getByTestId('translation-note');
    await expect(note).toHaveAttribute('data-state', 'unavailable');
    await expect(note.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      lesson1.title,
    );
  });

  test('translates the course page and the list', async ({ page }) => {
    await signedIn(page);
    await page.goto('/learning');
    await expect(page.getByTestId('course-item').getByRole('link')).toHaveText(
      `(VI) ${SAMPLE.course.title}`,
    );
    await page.goto(`/learning/courses/${SAMPLE.course.slug}`);
    await expect(page.getByTestId('translation-note')).toHaveAttribute(
      'data-state',
      'machine',
    );
    await expect(page.getByTestId('lesson-row').first()).toContainText(
      `(VI) ${lesson1.title}`,
    );
  });

  test('shows no note in the English UI', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('qalab.language', 'en'),
    );
    await signedIn(page);
    await page.goto(`/learning/lessons/${lesson1.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      lesson1.title,
    );
    await expect(page.getByTestId('translation-note')).toHaveCount(0);
  });
});
