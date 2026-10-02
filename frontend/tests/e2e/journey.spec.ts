import { expect, test, type Page } from '@playwright/test';
import { mockApi, PASSWORD } from './support/mock-api.ts';
import { SAMPLE } from './support/mock-learning.ts';
import { EXERCISES } from './support/mock-practice.ts';

/**
 * Phase 7: the important end-to-end flows of plant.md, one user journey per
 * test, through the UI only. The same journey runs against the real backend
 * and Supabase in backend/test/integration/journey.int-spec.ts.
 */

// Admin forms use Select dropdowns (see admin.spec.ts).
test.use({ reducedMotion: 'reduce' });

const [lesson1] = SAMPLE.lessons;
const [quiz] = EXERCISES;

async function signOut(page: Page) {
  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
}

async function fillLogin(page: Page, email: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  const dropdown = page.locator(
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
  );
  await dropdown.getByTitle(option, { exact: true }).click();
  await expect(dropdown).toBeHidden();
}

/** The first lesson and its quiz show as passed on the Progress page. */
async function expectProgressPassed(page: Page) {
  const lesson = page
    .getByTestId('course-report')
    .first()
    .getByTestId('lesson-result')
    .first();
  await expect(lesson.locator('> div [data-verdict]')).toHaveAttribute(
    'data-verdict',
    'pass',
  );
  await expect(
    lesson.getByTestId('exercise-result').first().locator('[data-verdict]'),
  ).toHaveAttribute('data-verdict', 'pass');
}

test.describe('Journey', () => {
  test('register → login → lesson → quiz → progress → logout → login → progress kept', async ({
    page,
  }) => {
    const api = await mockApi(page);
    const email = 'journey.learner@example.com';

    // 1. Register, then verify with the link from the email.
    await page.goto('/auth/register');
    await page.getByLabel('Display name').fill('Journey Learner');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByTestId('register-sent')).toContainText(email);
    await page.goto(
      `/auth/verify?token_hash=${api.signupLinkFor(email)}&type=email`,
    );
    await expect(page).toHaveURL(/\/dashboard$/);
    await signOut(page);

    // 2. Login.
    await fillLogin(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);

    // 3. Open the lesson from the course page.
    await page.goto('/learning');
    await page.getByRole('link', { name: SAMPLE.course.title }).first().click();
    await page
      .getByRole('link', { name: new RegExp(lesson1.title) })
      .first()
      .click();
    await expect(page).toHaveURL(`/learning/lessons/${lesson1.id}`);
    await expect(page.getByTestId('lesson-status')).toHaveAttribute(
      'data-state',
      'in_progress',
    );

    // 4. Read to the end and complete it (on phones the button is in the
    // bottom bar, shown once most of the lesson is read).
    await page
      .getByRole('navigation', { name: 'Other lessons in this course' })
      .scrollIntoViewIfNeeded();
    await page.getByTestId('complete-lesson').click();
    await expect(page.getByTestId('lesson-status')).toHaveAttribute(
      'data-state',
      'completed',
    );

    // 5. Submit the lesson's quiz.
    await page
      .getByTestId('lesson-exercises')
      .getByTestId('exercise-item')
      .first()
      .getByRole('link')
      .click();
    await expect(page).toHaveURL(`/practice/exercises/${quiz.id}`);
    await page
      .getByRole('radio', { name: 'Reviewing the requirements' })
      .check();
    await page.getByTestId('submit-answer').click();
    await expect(page.getByTestId('result')).toHaveAttribute(
      'data-state',
      'pass',
    );
    await expect(page.getByTestId('result-score')).toHaveText('100');
    // Only the answer is sent: the score comes from the server.
    expect(api.practice.attemptCalls[0].body).toEqual({
      answer: { selected: ['review'] },
    });

    // 6. Verify progress.
    await page.goto('/progress');
    await expectProgressPassed(page);

    // 7. Logout: the session is revoked on the server.
    await signOut(page);
    expect(api.calls).toContainEqual({ method: 'POST', path: '/auth/logout' });

    // 8. Login again, from the protected page asked for.
    await page.goto('/progress');
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fprogress$/);
    await fillLogin(page, email);
    await expect(page).toHaveURL(/\/progress$/);

    // 9. The progress is still there (it came from the API, not the tab).
    await expectProgressPassed(page);
    await page.goto(`/learning/lessons/${lesson1.id}`);
    await expect(page.getByTestId('lesson-status')).toHaveAttribute(
      'data-state',
      'completed',
    );
  });

  test('10. admin creates a course and publishes it, then a learner sees it', async ({
    page,
  }) => {
    const api = await mockApi(page);
    api.addUser({ email: 'admin@example.com', role: 'admin' });
    api.addUser({ email: 'learner@example.com' });

    await page.goto('/auth/login');
    await fillLogin(page, 'admin@example.com');
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/admin/courses');
    await page.getByTestId('new-course').click();
    await choose(page, 'Skill', 'Test Design Techniques');
    await page.getByRole('dialog').getByLabel('Title').fill('Boundary values');
    await page.getByTestId('create-course-submit').click();
    await expect(page).toHaveURL(/\/admin\/courses\/[0-9a-f-]{36}$/);
    const coursePath = new URL(page.url()).pathname;

    await page.getByTestId('add-module').click();
    await page.getByRole('dialog').getByLabel('Title').fill('Partitions');
    await choose(page, 'Status', 'Published');
    await page.getByTestId('module-submit').click();
    await expect(page.getByTestId('admin-module')).toContainText('Partitions');

    await page.getByTestId('add-lesson').click();
    await page.getByRole('dialog').getByLabel('Title').fill('Edges of a range');
    await page.getByTestId('lesson-submit').click();
    await expect(page).toHaveURL(/\/admin\/lessons\//);
    await page
      .getByTestId('lesson-content-input')
      .fill('## Edges\n\nTest both sides of every boundary.');
    await choose(page, 'Status', 'Published');
    await page.getByTestId('save-lesson').click();
    await expect(page.getByText('Changes saved.')).toBeVisible();

    await page.getByTestId('page-back').click();
    await expect(page).toHaveURL(coursePath);
    await page.getByTestId('publish-course').click();
    await expect(page.getByText('Course published.')).toBeVisible();
    await signOut(page);

    // The learner finds it in the catalogue, with its lesson.
    await fillLogin(page, 'learner@example.com');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/learning');
    await page.getByRole('link', { name: 'Boundary values' }).click();
    await expect(page).toHaveURL('/learning/courses/boundary-values');
    await expect(
      page.getByRole('heading', { name: 'Boundary values', level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Edges of a range/ }).first(),
    ).toBeVisible();
  });

  test('without a session every protected page sends you to login', async ({
    page,
  }) => {
    const api = await mockApi(page);
    const pages = [
      '/dashboard',
      '/learning',
      `/learning/courses/${SAMPLE.course.slug}`,
      `/learning/lessons/${lesson1.id}`,
      '/practice/quiz',
      `/practice/exercises/${quiz.id}`,
      '/progress',
      '/profile',
      '/admin/courses',
    ];
    for (const path of pages) {
      await page.goto(path);
      // The dashboard is where login goes anyway: no redirect parameter.
      await expect(page).toHaveURL(
        path === '/dashboard'
          ? '/auth/login'
          : `/auth/login?redirect=${encodeURIComponent(path)}`,
      );
    }
    // No protected endpoint was even called.
    const called = api.calls.filter(
      (c) => c.path !== '/health' && !c.path.startsWith('/auth/'),
    );
    expect(called).toEqual([]);
  });
});
