import { expect, test, type Page } from '@playwright/test';
import { signedIn } from './support/mock-api.ts';
import { SAMPLE } from './support/mock-learning.ts';
import { EXERCISES } from './support/mock-practice.ts';

const [mc, classification, bugReport, scenario, testCase] = EXERCISES;

const verdicts = (page: Page) =>
  page
    .getByTestId('exercise-item')
    .locator('[data-verdict]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-verdict')));

async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByTitle(option, { exact: true }).click();
}

test.describe('Practice', () => {
  test('each tab lists its exercise types', async ({ page }) => {
    const { api } = await signedIn(page);
    await page.goto('/practice/quiz');

    await expect(
      page.getByRole('heading', { name: 'Quiz', level: 1 }),
    ).toBeVisible();
    const items = page.getByTestId('exercise-item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveAttribute(
      'data-exercise-type',
      'multiple_choice',
    );
    await expect(items.nth(1)).toHaveAttribute(
      'data-exercise-type',
      'classification',
    );
    // Markdown is shown as plain text in the list.
    await expect(items.nth(1).getByRole('link')).toHaveText(
      'Classify each situation as an error, a defect or a failure.',
    );
    await expect(items.nth(0)).toContainText('Multiple choice');
    await expect(items.nth(0)).toContainText(SAMPLE.lessons[0].title);
    expect(await verdicts(page)).toEqual(['notRun', 'notRun']);
    await expect(page.getByTestId('exercise-range')).toHaveText(
      '1–2 of 2 exercises',
    );

    const call = api.calls.find((c) => c.path === '/exercises');
    expect(call).toBeDefined();

    await page
      .getByRole('navigation', { name: 'Practice types' })
      .getByRole('link', { name: 'Scenarios' })
      .click();
    await expect(items).toHaveCount(1);
    await expect(items).toHaveAttribute('data-exercise-type', 'scenario');
  });

  test('filters by difficulty and clears the filters', async ({ page }) => {
    await signedIn(page);
    await page.goto('/practice/scenario');
    await choose(page, 'Filter by difficulty', 'Easy');
    await expect(page).toHaveURL('/practice/scenario?difficulty=easy');
    await expect(page.getByTestId('exercises-empty')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL('/practice/scenario');
    await expect(page.getByTestId('exercise-item')).toHaveCount(1);
  });

  test('multiple choice: wrong, then right; the list shows the verdict', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    await page.goto('/practice/quiz');
    await page.getByTestId('exercise-item').first().getByRole('link').click();
    await expect(page).toHaveURL(`/practice/exercises/${mc.id}`);
    await expect(
      page.getByRole('heading', { name: 'Multiple choice', level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId('exercise-question')).toContainText(
      mc.question,
    );
    await expect(page.getByTestId('attempts-empty')).toBeVisible();

    // Nothing chosen: the form says so, nothing is sent.
    await page.getByTestId('submit-answer').click();
    await expect(page.getByText('Choose an answer.')).toBeVisible();
    expect(api.practice.attemptCalls).toHaveLength(0);

    await page.getByRole('radio', { name: 'Writing the code' }).check();
    await page.getByTestId('submit-answer').click();

    const result = page.getByTestId('result');
    await expect(result).toHaveAttribute('data-state', 'fail');
    await expect(page.getByTestId('result-score')).toHaveText('0');
    await expect(page.getByTestId('answer-form')).toBeHidden();
    const checks = result.getByTestId('check');
    await expect(checks.nth(0)).toHaveAttribute('data-state', 'fail'); // missed
    await expect(checks.nth(0)).toContainText('Not chosen');
    await expect(checks.nth(1)).toHaveAttribute('data-state', 'fail'); // wrong pick
    await expect(checks.nth(2)).toHaveAttribute('data-state', 'none');
    await expect(page.getByTestId('explanation')).toContainText(
      'static testing',
    );
    expect(api.practice.attemptCalls[0].body).toEqual({
      answer: { selected: ['coding'] },
    });

    await expect(page.getByTestId('attempt-item')).toHaveCount(1);

    // Try again keeps the previous choice, then the right one passes.
    await page.getByTestId('try-again').click();
    await expect(
      page.getByRole('radio', { name: 'Writing the code' }),
    ).toBeChecked();
    await page
      .getByRole('radio', { name: 'Reviewing the requirements' })
      .check();
    await page.getByTestId('submit-answer').click();
    await expect(page.getByTestId('result')).toHaveAttribute(
      'data-state',
      'pass',
    );
    await expect(page.getByTestId('result-score')).toHaveText('100');
    await expect(page.getByTestId('attempt-item')).toHaveCount(2);
    await expect(
      page.getByTestId('exercise-status').locator('[data-verdict]'),
    ).toHaveAttribute('data-verdict', 'pass');

    // An older attempt can be shown again.
    await page
      .getByTestId('attempt-item')
      .nth(1)
      .getByRole('button', { name: 'Show result' })
      .click();
    await expect(page.getByTestId('result-score')).toHaveText('0');

    await page.getByTestId('page-back').click();
    await expect(page).toHaveURL('/practice/quiz');
    expect(await verdicts(page)).toEqual(['pass', 'notRun']);
    await expect(page.getByTestId('exercise-item').first()).toContainText(
      'Best 100',
    );
    await expect(page.getByTestId('exercise-item').first()).toContainText(
      '2 attempts',
    );
  });

  test('classification: every item needs a group; partial credit', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto(`/practice/exercises/${classification.id}`);
    await page.getByTestId('submit-answer').click();
    await expect(page.getByText('Choose a group.')).toHaveCount(3);

    const items = page.getByTestId('classify-item');
    await items.nth(0).getByText('Error', { exact: true }).click();
    await items.nth(1).getByText('Defect', { exact: true }).click();
    await items.nth(2).getByText('Defect', { exact: true }).click();
    await page.getByTestId('submit-answer').click();

    await expect(page.getByTestId('result-score')).toHaveText('67');
    await expect(page.getByTestId('result')).toContainText(
      '2 of 3 items in the right group',
    );
    const last = page.getByTestId('check').nth(2);
    await expect(last).toHaveAttribute('data-state', 'fail');
    await expect(last).toContainText('Failure');
  });

  test('bug report: structured form, checks, model answer and self-assessment', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    await page.goto(`/practice/exercises/${bugReport.id}`);

    await page
      .getByLabel('Title')
      .fill('Checkout total ignores the SAVE15 discount');
    await page.getByLabel('Steps to reproduce 1').fill('Add an item');
    await page.getByRole('button', { name: 'Add a step' }).click();
    await page.getByLabel('Steps to reproduce 2').fill('Apply SAVE15');
    await page.getByLabel('Actual result').fill('Total is 18.00 USD');
    await page.getByLabel('Expected result').fill('Total is 17.00 USD');
    await choose(page, 'Severity', 'Major');
    await choose(page, 'Priority', 'Low');
    await page.getByTestId('submit-answer').click();

    expect(api.practice.attemptCalls[0].body).toMatchObject({
      answer: {
        title: 'Checkout total ignores the SAVE15 discount',
        stepsToReproduce: ['Add an item', 'Apply SAVE15'],
        severity: 'major',
        priority: 'low',
        environment: '',
        attachment: '',
      },
    });

    // fields 30 + severity 20 + priority 0 + concepts 30 = 80
    await expect(page.getByTestId('result-score')).toHaveText('80');
    await expect(page.getByTestId('result')).toHaveAttribute(
      'data-state',
      'pass',
    );
    await expect(page.getByTestId('score-parts')).toContainText(
      'Severity: 100 (20% of the score)',
    );
    const priority = page.getByTestId('check').filter({ hasText: /^Priority/ });
    await expect(priority).toHaveAttribute('data-state', 'fail');
    await expect(priority).toContainText('High');
    await expect(priority).toContainText('Low');
    await expect(page.getByTestId('model-answer')).toContainText(
      'Checkout total ignores',
    );

    const self = page.getByTestId('self-assessment');
    await self
      .getByRole('checkbox', {
        name: 'Someone could reproduce it from my steps',
      })
      .check();
    await page.getByTestId('save-self-assessment').click();
    await expect(self).toHaveAttribute('data-state', 'saved');
    await expect(page.getByTestId('self-assessment-saved')).toHaveText(
      'Self-assessment saved: 1 of 1.',
    );
  });

  test('test case: numbered steps can be added and removed', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto(`/practice/exercises/${testCase.id}`);
    await page.getByLabel('Title').fill('Log in with valid credentials');
    await page.getByLabel('Steps 1').fill('Open the login page');
    await page.getByRole('button', { name: 'Add a step' }).click();
    await page.getByRole('button', { name: 'Add a step' }).click();
    await page.getByLabel('Steps 3').fill('Press Log in');
    await page.getByRole('button', { name: 'Remove step 2' }).click();
    await expect(page.getByLabel('Steps 2')).toHaveValue('Press Log in');
    await page.getByLabel('Expected result').fill('The dashboard opens');
    await choose(page, 'Priority', 'High');
    await page.getByTestId('submit-answer').click();

    await expect(page.getByTestId('result-score')).toHaveText('100');
    await expect(page.getByTestId('check')).toHaveCount(6);
  });

  test('scenario: free text is required, then graded by concepts', async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto(`/practice/exercises/${scenario.id}`);
    await page.getByTestId('submit-answer').click();
    await expect(page.getByText('Write your answer.')).toBeVisible();

    await page
      .getByRole('textbox', { name: 'Scenario' })
      .fill('Test the boundaries only.');
    await page.getByTestId('submit-answer').click();
    await expect(page.getByTestId('result-score')).toHaveText('50');
    await expect(page.getByTestId('result')).toHaveAttribute(
      'data-state',
      'fail',
    );
    await expect(page.getByTestId('result')).toContainText(
      'Passes at 70 or more',
    );
    // Saving the checklist is the one primary action until it is saved.
    await expect(page.getByTestId('save-self-assessment')).toHaveClass(
      /ant-btn-primary/,
    );
    await expect(page.getByTestId('try-again')).not.toHaveClass(
      /ant-btn-primary/,
    );
  });

  test('a lesson lists its exercises', async ({ page }) => {
    await signedIn(page);
    await page.goto(`/learning/lessons/${SAMPLE.lessons[1].id}`);
    const section = page.getByTestId('lesson-exercises');
    await expect(
      section.getByRole('heading', { name: 'Practise this lesson' }),
    ).toBeVisible();
    await expect(section.getByTestId('exercise-item')).toHaveCount(2);
    await section
      .getByTestId('exercise-item')
      .first()
      .getByRole('link')
      .click();
    await expect(page).toHaveURL(`/practice/exercises/${classification.id}`);
  });

  test('empty, error and not-found states', async ({ page }) => {
    const { api } = await signedIn(page);
    api.practice.empty = true;
    await page.goto('/practice/quiz');
    await expect(
      page.getByText('No exercises of this kind are published yet.', {
        exact: false,
      }),
    ).toBeVisible();
    // A lesson without exercises shows no practice section.
    await page.goto(`/learning/lessons/${SAMPLE.lessons[0].id}`);
    await expect(page.getByTestId('lesson-content')).toBeVisible();
    await expect(page.getByTestId('lesson-exercises')).toHaveCount(0);

    api.practice.empty = false;
    api.practice.failing = true;
    await page.goto('/practice/test-case');
    await expect(page.getByText('Could not load data')).toBeVisible();
    api.practice.failing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('exercise-item')).toHaveCount(1);

    await page.goto('/practice/exercises/6f1d2a4e-0c1b-4d7e-9a3f-000000009999');
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    await page.goto('/practice/exercises/not-a-uuid');
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
  });

  test('a failed submission keeps the answer and says so', async ({ page }) => {
    const { api } = await signedIn(page);
    api.practice.submitFailing = true;
    await page.goto(`/practice/exercises/${mc.id}`);
    await page
      .getByRole('radio', { name: 'Reviewing the requirements' })
      .check();
    await page.getByTestId('submit-answer').click();
    await expect(page.getByTestId('submit-error')).toContainText(
      'Your answer was not saved.',
    );
    await expect(
      page.getByRole('radio', { name: 'Reviewing the requirements' }),
    ).toBeChecked();
    await expect(page.getByTestId('result')).toHaveCount(0);
  });

  test('Vietnamese UI: labels translated, QA terms and content language kept', async ({
    page,
  }) => {
    await signedIn(page);
    await page.addInitScript(() =>
      localStorage.setItem('qalab.language', 'vi'),
    );
    await page.goto(`/practice/exercises/${bugReport.id}`);
    await expect(
      page.getByRole('heading', { name: 'Bug report', level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId('translation-note')).toHaveAttribute(
      'data-state',
      'manual',
    );
    await expect(page.getByTestId('exercise-question')).toContainText('(VI)');
    await expect(page.getByLabel('Steps to reproduce 1')).toBeVisible();
    await expect(page.getByTestId('submit-answer')).toHaveText('Nộp bài');
  });
});
