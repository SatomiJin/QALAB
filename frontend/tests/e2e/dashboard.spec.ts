import { expect, test, type Page } from '@playwright/test';
import { signedIn } from './support/mock-api.ts';
import { SAMPLE } from './support/mock-learning.ts';
import { EXERCISES } from './support/mock-practice.ts';

const [lesson1, lesson2] = SAMPLE.lessons;
const mc = EXERCISES.find((e) => e.type === 'multiple_choice')!;
const scenario = EXERCISES.find((e) => e.type === 'scenario')!;

const figure = (page: Page, name: string) =>
  page.getByTestId(`figure-${name}-value`);

test.describe('Dashboard', () => {
  test('starts empty for a new learner', async ({ page }) => {
    const { api } = await signedIn(page);
    await page.goto('/dashboard');

    await expect(
      page.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId('continue')).toHaveAttribute(
      'data-state',
      'start',
    );
    await expect(figure(page, 'lessons')).toHaveText('0');
    await expect(figure(page, 'exercises')).toHaveText('0');
    await expect(figure(page, 'average')).toHaveText('–');
    await expect(figure(page, 'streak')).toHaveText('0');
    await expect(
      page.getByTestId('streak-days').locator('li[data-active="true"]'),
    ).toHaveCount(0);
    await expect(page.getByTestId('skill-row')).toHaveCount(7);
    // Nothing started: on phones the skills fold into one line.
    const folded = page.getByTestId('skills-not-started');
    if ((page.viewportSize()?.width ?? 1280) < 768) {
      await expect(folded).toBeVisible();
      await expect(page.getByTestId('skill-table')).toBeHidden();
    } else {
      await expect(folded).toBeHidden();
    }
    await expect(page.getByTestId('retest-empty')).toBeVisible();
    await expect(page.getByTestId('activity-empty')).toBeVisible();
    // The streak is counted in the browser's time zone.
    expect(api.dashboard.timeZones.at(-1)).toBeTruthy();
  });

  test('summarises lessons, answers, streak, weak areas and activity', async ({
    page,
  }) => {
    const { api, user } = await signedIn(page);
    const now = new Date().toISOString();
    api.learning.setProgress(user.id, lesson1.id, {
      status: 'completed',
      progressPercent: 100,
      completedAt: now,
    });
    api.learning.setProgress(user.id, lesson2.id, {
      status: 'in_progress',
      progressPercent: 40,
    });
    api.practice.attempts.push(
      {
        id: 'a1',
        userId: user.id,
        exerciseId: mc.id,
        score: 100,
        isCorrect: true,
        answer: {},
        feedback: { type: 'multiple_choice', options: [] },
        selfAssessment: null,
        attemptedAt: now,
      },
      {
        id: 'a2',
        userId: user.id,
        exerciseId: scenario.id,
        score: 20,
        isCorrect: false,
        answer: {},
        feedback: {
          type: 'scenario',
          parts: [],
          concepts: [
            { concept: 'Boundary values', matched: false },
            { concept: 'Invalid input', matched: true },
          ],
        },
        selfAssessment: null,
        attemptedAt: now,
      },
    );

    await page.goto('/dashboard');
    await expect(page.getByTestId('continue')).toHaveAttribute(
      'data-state',
      'resume',
    );
    await expect(figure(page, 'lessons')).toHaveText('1');
    await expect(page.getByTestId('figure-lessons')).toContainText('of 4');
    await expect(figure(page, 'exercises')).toHaveText('1');
    await expect(page.getByTestId('figure-exercises')).toContainText(
      'of 2 answered',
    );
    await expect(figure(page, 'average')).toHaveText('60');
    await expect(figure(page, 'streak')).toHaveText('1');
    await expect(
      page.getByTestId('streak-days').locator('li').last(),
    ).toHaveAttribute('data-active', 'true');

    const fundamentals = page.locator(
      '[data-testid="skill-row"][data-skill="fundamentals"]',
    );
    await expect(fundamentals).toContainText('1 of 4');
    await expect(fundamentals.locator('[data-verdict]')).toHaveAttribute(
      'data-verdict',
      'inProgress',
    );

    // Average 60 is below the pass mark: fundamentals needs a retest.
    await expect(page.getByTestId('weak-skill')).toHaveCount(1);
    await expect(page.getByTestId('retry-link')).toHaveAttribute(
      'href',
      `/practice/exercises/${scenario.id}`,
    );
    await expect(page.getByTestId('weak-concept')).toHaveCount(1);
    await expect(page.getByTestId('weak-concept')).toContainText(
      'Boundary values',
    );

    const activity = page.getByTestId('activity-item');
    await expect(activity).toHaveCount(5);
    await expect(
      page.locator(
        '[data-testid="activity-item"][data-kind="lesson_completed"]',
      ),
    ).toHaveCount(1);
  });

  test('links skills to their progress and opens the lesson to continue', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto('/dashboard');

    // A skill not started yet: its row on desktop, the folded line on phones.
    await page
      .locator('a[href="/progress?skill=test_design"]')
      .locator('visible=true')
      .click();
    await expect(page).toHaveURL(/\/progress\?skill=test_design$/);

    await page.goto('/dashboard');
    await page
      .getByTestId('continue')
      .getByRole('button', { name: 'Start lesson' })
      .click();
    await expect(page).toHaveURL(`/learning/lessons/${lesson1.id}`);
  });

  test('shows an error state with retry', async ({ page }) => {
    const { api } = await signedIn(page);
    api.dashboard.failing = true;
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible({
      timeout: 15_000,
    });
    api.dashboard.failing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('summary')).toBeVisible();
  });

  test('shows the empty state when nothing is published', async ({ page }) => {
    const { api } = await signedIn(page);
    api.learning.empty = true;
    await page.goto('/dashboard');
    await expect(page.getByTestId('summary')).toHaveCount(0);
    await expect(page.getByText('No courses are published yet')).toBeVisible();
  });

  test('is translated in Vietnamese, QA terms kept', async ({ page }) => {
    await signedIn(page);
    await page.addInitScript(() =>
      window.localStorage.setItem('qalab.language', 'vi'),
    );
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Tổng quan', level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId('figure-exercises')).toContainText('Passed');
    await expect(page.getByTestId('continue')).toContainText('(VI)');
  });
});

test.describe('Progress', () => {
  test('lists each course with its lessons, exercises and results', async ({
    page,
  }) => {
    const { api, user } = await signedIn(page);
    api.learning.setProgress(user.id, lesson1.id, {
      status: 'completed',
      progressPercent: 100,
      completedAt: new Date().toISOString(),
    });
    api.practice.attempts.push({
      id: 'a1',
      userId: user.id,
      exerciseId: mc.id,
      score: 100,
      isCorrect: true,
      answer: {},
      feedback: { type: 'multiple_choice', options: [] },
      selfAssessment: null,
      attemptedAt: new Date().toISOString(),
    });
    api.learning.addCourses(2);

    await page.goto('/progress');
    await expect(
      page.getByRole('heading', { name: 'Progress', level: 1 }),
    ).toBeVisible();
    const reports = page.getByTestId('course-report');
    await expect(reports).toHaveCount(3);
    const sample = reports.first();
    await expect(sample.getByTestId('lesson-result')).toHaveCount(4);
    await expect(sample.getByTestId('exercise-result')).toHaveCount(
      EXERCISES.length,
    );
    const first = sample.getByTestId('lesson-result').first();
    await expect(first.locator('> div [data-verdict]')).toHaveAttribute(
      'data-verdict',
      'pass',
    );
    await expect(
      first.getByTestId('exercise-result').first().locator('[data-verdict]'),
    ).toHaveAttribute('data-verdict', 'pass');
    await expect(page.getByTestId('progress-range')).toContainText(
      '1–3 of 3 courses',
    );

    await first
      .getByTestId('exercise-result')
      .first()
      .getByRole('link')
      .click();
    await expect(page).toHaveURL(`/practice/exercises/${mc.id}`);
  });

  test('filters by skill in the URL', async ({ page }) => {
    const { api } = await signedIn(page);
    api.learning.addCourses(1);
    await page.goto('/progress');
    await page
      .getByTestId('skill-filter')
      .getByRole('link', { name: 'Test Design Techniques' })
      .click();
    await expect(page).toHaveURL(/\/progress\?skill=test_design$/);
    await expect(page.getByTestId('course-report')).toHaveCount(1);

    await page.goto('/progress?skill=automation');
    await expect(page.getByTestId('progress-empty')).toBeVisible();
  });

  test('shows error and empty states', async ({ page }) => {
    const { api } = await signedIn(page);
    api.dashboard.failing = true;
    await page.goto('/progress');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible({
      timeout: 15_000,
    });

    api.dashboard.failing = false;
    api.learning.empty = true;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(
      page.getByText('No courses are published yet. Your results'),
    ).toBeVisible();
  });
});
