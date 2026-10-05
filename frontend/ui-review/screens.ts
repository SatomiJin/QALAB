import { AxeBuilder } from '@axe-core/playwright';
import { test, type Page } from '@playwright/test';
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { mockApi, signedIn } from '../tests/e2e/support/mock-api.ts';

/**
 * Captures every screen in light/dark × en/vi (desktop + mobile projects),
 * with horizontal-overflow and axe checks. Not a test suite: nothing here
 * fails on a finding, the reviewer reads the output. Filter with env vars:
 *   UI_REVIEW_SCREENS=dashboard,lesson   (step names below)
 *   UI_REVIEW_THEMES=light   UI_REVIEW_LANGS=vi
 */

const OUT = 'ui-review/out';
mkdirSync(`${OUT}/shots`, { recursive: true });

type Combo = { theme: 'light' | 'dark'; lang: 'en' | 'vi' };
const list = (name: string) => process.env[name]?.split(',').filter(Boolean);
const SCREENS = list('UI_REVIEW_SCREENS');
const COMBOS: Combo[] = (list('UI_REVIEW_THEMES') ?? ['light', 'dark']).flatMap(
  (theme) =>
    (list('UI_REVIEW_LANGS') ?? ['en', 'vi']).map(
      (lang) => ({ theme, lang }) as Combo,
    ),
);

async function prefs(page: Page, c: Combo) {
  await page.addInitScript((c) => {
    localStorage.setItem('qalab.theme', c.theme);
    localStorage.setItem('qalab.language', c.lang);
  }, c);
}

async function pageOverflow(page: Page) {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  return scrollWidth - (page.viewportSize()?.width ?? scrollWidth);
}

async function shoot(page: Page, name: string, c: Combo, project: string) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  // Against the configured viewport, not innerWidth: with mobile emulation
  // the layout viewport grows to fit wide content, so innerWidth hides it.
  const overflow = await pageOverflow(page);
  const file = `${project}-${c.theme}-${c.lang}-${name}.png`;
  await page.screenshot({ path: `${OUT}/shots/${file}`, fullPage: true });
  // Contrast differs per theme, not per language: axe once per theme.
  const axe =
    c.lang === 'en'
      ? (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
        }))
      : [];
  appendFileSync(
    `${OUT}/results.jsonl`,
    JSON.stringify({
      screen: name,
      project,
      ...c,
      file,
      url: page.url(),
      overflow,
      axe,
    }) + '\n',
  );
}

async function firstHref(page: Page, testId: string) {
  const link = page.getByTestId(testId).first().locator('a').first();
  await link.waitFor();
  return (await link.getAttribute('href'))!;
}

type Step = [name: string, go: (page: Page) => Promise<unknown>];

/** Runs every step (later steps depend on earlier navigation), shoots the wanted ones. */
async function run(page: Page, steps: Step[], c: Combo, project: string) {
  for (const [name, go] of steps) {
    await go(page);
    if (!SCREENS || SCREENS.includes(name)) {
      await shoot(page, name, c, project);
    }
  }
}

for (const c of COMBOS) {
  test(`guest ${c.theme} ${c.lang}`, async ({ page }, info) => {
    await prefs(page, c);
    await mockApi(page);
    await run(
      page,
      [
        ['login', (p) => p.goto('/auth/login')],
        ['register', (p) => p.goto('/auth/register')],
        ['forgot-password', (p) => p.goto('/auth/forgot-password')],
        ['reset-password-invalid', (p) => p.goto('/auth/reset-password')],
        ['verify-invalid', (p) => p.goto('/auth/verify')],
      ],
      c,
      info.project.name,
    );
  });

  test(`learner ${c.theme} ${c.lang}`, async ({ page }, info) => {
    await prefs(page, c);
    await signedIn(page);
    await run(
      page,
      [
        ['dashboard-new', (p) => p.goto('/dashboard')],
        ['learning', (p) => p.goto('/learning')],
        ['course', async (p) => p.goto(await firstHref(p, 'course-item'))],
        ['lesson', async (p) => p.goto(await firstHref(p, 'lesson-row'))],
        ['practice', (p) => p.goto('/practice')],
        ['exercise', async (p) => p.goto(await firstHref(p, 'exercise-item'))],
        [
          'exercise-result',
          async (p) => {
            const choice = p
              .locator('form input[type=checkbox], form input[type=radio]')
              .first();
            if (await choice.count()) await choice.check({ force: true });
            await p
              .getByRole('button', { name: /Submit answer|Nộp bài/ })
              .click();
            await p.waitForTimeout(500);
          },
        ],
        ['dashboard', (p) => p.goto('/dashboard')],
        ['progress', (p) => p.goto('/progress')],
        ['glossary', (p) => p.goto('/glossary#test-case')],
        ['profile', (p) => p.goto('/profile')],
        ['not-found', (p) => p.goto('/nowhere')],
        ['no-access', (p) => p.goto('/admin/courses')],
      ],
      c,
      info.project.name,
    );
  });

  test(`states ${c.theme} ${c.lang}`, async ({ page }, info) => {
    await prefs(page, c);
    const { api } = await signedIn(page);
    api.learning.empty = true;
    api.practice.empty = true;
    await run(
      page,
      [
        ['empty-learning', (p) => p.goto('/learning')],
        ['empty-practice', (p) => p.goto('/practice')],
        ['empty-progress', (p) => p.goto('/progress')],
      ],
      c,
      info.project.name,
    );
    api.learning.empty = false;
    api.practice.empty = false;
    api.learning.failing = true;
    api.dashboard.failing = true;
    const failed = async (p: Page, url: string) => {
      await p.goto(url);
      // The error state shows after the global retries.
      await p
        .locator('[data-state="error"]')
        .first()
        .waitFor({ timeout: 20_000 });
    };
    await run(
      page,
      [
        ['error-learning', (p) => failed(p, '/learning')],
        ['error-dashboard', (p) => failed(p, '/dashboard')],
      ],
      c,
      info.project.name,
    );
  });

  test(`admin ${c.theme} ${c.lang}`, async ({ page }, info) => {
    await prefs(page, c);
    const { api } = await signedIn(page, { role: 'admin' });
    const course = api.admin.addCourse({
      title: 'Boundary value analysis in practice',
      status: 'published',
    });
    const module = api.admin.addModule(course, { title: 'Foundations' });
    const lesson = api.admin.addLesson(module, {
      title: 'Equivalence partitioning',
      contentMd: [
        '## Why partitions',
        '',
        'Inputs that behave the same form one partition: test one value from each.',
        '',
        '```js',
        'isAdult(17); // invalid partition',
        '```',
      ].join('\n'),
    });
    api.admin.addLesson(module, { title: 'Boundary values' });
    const exercise = api.admin.addExercise(lesson);
    // Translation statuses: title out of date, body missing with a machine
    // draft, exercise question current.
    api.admin.addTranslation(
      'lesson',
      lesson.id,
      'title',
      'Phân vùng tương đương',
      'Equivalence classes',
    );
    api.admin.machine.set(
      `lesson:${lesson.id}:content_md`,
      '## Vì sao phân vùng\n\nMáy dịch.',
    );
    api.admin.addTranslation(
      'exercise',
      exercise.id,
      'question',
      'Kỹ thuật nào kiểm thử các biên của một khoảng?',
    );
    api.admin.addCourse({ title: 'Draft course' });
    const admin = [...api.users.values()][0]!;
    const learner = api.addUser({
      email: 'nguyen.thi.thu.huong.qa.engineer@example.com',
      displayName: 'Nguyễn Thị Thu Hương',
      createdAt: '2026-09-12T08:00:00.000Z',
      lastSignInAt: '2026-10-03T21:15:00.000Z',
      experienceLevel: 'some_qa',
      learningGoals: ['Boundary value analysis', 'Bug reports'],
    });
    api.addUser({
      email: 'new.learner@example.com',
      displayName: 'New learner',
      verified: false,
      createdAt: '2026-10-02T08:00:00.000Z',
    });
    api.addUser({
      email: 'disabled@example.com',
      displayName: 'Disabled learner',
      disabled: true,
      createdAt: '2026-09-02T08:00:00.000Z',
    });
    api.accounts.skills.set(learner.id, [
      {
        code: 'fundamentals',
        name: 'QA Fundamentals',
        totalLessons: 6,
        completedLessons: 4,
        percent: 67,
        status: 'in_progress',
        exercises: { total: 12, attempted: 5, passed: 4, averageScore: 78 },
      },
      {
        code: 'test_design',
        name: 'Test Design',
        totalLessons: 5,
        completedLessons: 0,
        percent: 0,
        status: 'not_started',
        exercises: { total: 9, attempted: 0, passed: 0, averageScore: null },
      },
    ]);
    api.accounts.attempts.set(learner.id, [
      {
        id: 'attempt-2',
        exerciseId: exercise.id,
        exerciseType: 'bug_report',
        question:
          'The checkout button stays disabled after a valid card number is entered. Write the bug report.',
        lessonId: lesson.id,
        score: 55,
        isCorrect: false,
        attemptedAt: '2026-10-03T21:20:00.000Z',
      },
      {
        id: 'attempt-1',
        exerciseId: exercise.id,
        exerciseType: 'multiple_choice',
        question: 'Which technique tests the edges of a range?',
        lessonId: lesson.id,
        score: 100,
        isCorrect: true,
        attemptedAt: '2026-10-02T09:00:00.000Z',
      },
    ]);
    api.accounts.log(admin, learner, 'disabled', 'active', 'disabled');
    api.accounts.log(admin, learner, 'enabled', 'disabled', 'active');
    await run(
      page,
      [
        ['admin-courses', (p) => p.goto('/admin/courses')],
        ['admin-course', (p) => p.goto(`/admin/courses/${course.id}`)],
        ['admin-lesson', (p) => p.goto(`/admin/lessons/${lesson.id}`)],
        [
          'admin-lesson-preview',
          (p) => p.goto(`/admin/lessons/${lesson.id}/preview`),
        ],
        [
          'admin-new-exercise',
          (p) => p.goto(`/admin/lessons/${lesson.id}/exercises/new`),
        ],
        [
          'admin-exercise',
          async (p) => {
            await p.goto(`/admin/lessons/${lesson.id}`);
            await p.goto(await firstHref(p, 'admin-exercise'));
          },
        ],
        [
          'admin-lesson-translation',
          (p) => p.goto(`/admin/lessons/${lesson.id}/translation`),
        ],
        [
          'admin-exercise-translation',
          (p) => p.goto(`/admin/exercises/${exercise.id}/translation`),
        ],
        ['admin-users', (p) => p.goto('/admin/users')],
        ['admin-user', (p) => p.goto(`/admin/users/${learner.id}`)],
        ['admin-glossary', (p) => p.goto('/admin/glossary')],
        [
          'admin-glossary-term',
          (p) =>
            p.goto(
              `/admin/glossary/${[...api.glossary.terms.values()].find((t) => t.slug === 'test-case')!.id}`,
            ),
        ],
      ],
      c,
      info.project.name,
    );
  });
}

test.afterAll(() => {
  // Every worker rewrites the summary from all rows recorded so far; the
  // last one to finish leaves the complete file.
  const rows = readFileSync(`${OUT}/results.jsonl`, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as { overflow: number; axe: unknown[] });
  writeFileSync(
    `${OUT}/summary.json`,
    JSON.stringify(
      {
        screens: rows.length,
        overflow: rows.filter((r) => r.overflow > 0),
        axe: rows.filter((r) => r.axe.length > 0),
      },
      null,
      2,
    ),
  );
});
