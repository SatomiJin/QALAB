import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockApi, signedIn } from './support/mock-api.ts';

// Automated WCAG 2.1 A/AA checks (axe-core) on every main screen, in both
// themes: contrast is checked per theme. Interactive states (dialogs, menus)
// are not covered by axe here; keyboard flows have their own tests.

const THEMES = ['light', 'dark'] as const;

// Each test walks several pages and runs axe on each.
test.describe.configure({ timeout: 90_000 });

async function expectNoViolations(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(
    violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
}

async function firstLink(page: Page, testId: string): Promise<string> {
  const link = page.getByTestId(testId).first().locator('a').first();
  return (await link.getAttribute('href'))!;
}

for (const theme of THEMES) {
  test.describe(`Accessibility (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => {
        localStorage.setItem('qalab.theme', t);
      }, theme);
    });

    test('auth pages', async ({ page }) => {
      await mockApi(page);
      for (const path of [
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
      ]) {
        await page.goto(path);
        await expectNoViolations(page);
      }
    });

    test('learner pages', async ({ page }) => {
      await signedIn(page);
      for (const path of [
        '/dashboard',
        '/learning',
        '/practice',
        '/progress',
        '/profile',
      ]) {
        await page.goto(path);
        await expectNoViolations(page);
      }
      await page.goto('/learning');
      await page.goto(await firstLink(page, 'course-item'));
      await expectNoViolations(page);
      await page.goto(await firstLink(page, 'lesson-row'));
      await expectNoViolations(page);
      await page.goto('/practice');
      await page.goto(await firstLink(page, 'exercise-item'));
      await expectNoViolations(page);
    });

    test('no access and not found', async ({ page }) => {
      await signedIn(page);
      await page.goto('/admin/courses');
      await expect(page.getByTestId('bug-report')).toBeVisible();
      await expectNoViolations(page);
      await page.goto('/nowhere');
      await expectNoViolations(page);
    });

    test('admin pages', async ({ page }) => {
      const { api } = await signedIn(page, { role: 'admin' });
      const course = api.admin.addCourse({ status: 'published' });
      const lesson = api.admin.addLesson(api.admin.addModule(course));
      const exercise = api.admin.addExercise(lesson);
      api.admin.addCourse();
      // One text of each translation status.
      api.admin.addTranslation('lesson', lesson.id, 'title', 'Bài học', 'Old');
      for (const path of [
        '/admin/courses',
        `/admin/courses/${course.id}`,
        `/admin/lessons/${lesson.id}`,
        `/admin/lessons/${lesson.id}/exercises/new`,
        `/admin/lessons/${lesson.id}/translation`,
        `/admin/exercises/${exercise.id}/translation`,
      ]) {
        await page.goto(path);
        await expectNoViolations(page);
      }
      await page.goto(`/admin/lessons/${lesson.id}`);
      await page.goto(await firstLink(page, 'admin-exercise'));
      await expectNoViolations(page);
    });
  });
}
