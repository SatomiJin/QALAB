import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { LessonRow } from '../../src/learning/content.repository.js';
import type { ExerciseRow } from '../../src/practice/exercises.repository.js';
import { sourceHash } from '../../src/translation/content-translation.service.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

let seq = 0;

const mcPrompt = {
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
    { id: 'c', text: 'Option C' },
  ],
};

const classificationPrompt = {
  categories: [
    { id: 'functional', text: 'Functional' },
    { id: 'non-functional', text: 'Non-functional' },
  ],
  items: [
    { id: 'login', text: 'Login works' },
    { id: 'speed', text: 'Loads in 2 s' },
  ],
};

const scenarioKey = {
  expectedConcepts: [
    { concept: 'Boundary', keywords: ['boundary'] },
    { concept: 'Invalid', keywords: ['invalid'] },
  ],
  modelAnswer: 'Test the **boundaries** and invalid values.',
  rubric: [
    { id: 'bva', text: 'I tested both boundaries' },
    { id: 'neg', text: 'I tested an invalid value' },
  ],
};

describe('Practice API (e2e)', () => {
  let t: TestApp;
  let app: INestApplication<App>;

  // fundamentals: basics [l1: mc, classification, draft mc] [l2: scenario (medium)]
  // test_design: design [d1: test case (hard), bug report]
  // hidden: exercise in a draft lesson
  let l1: LessonRow;
  let l2: LessonRow;
  let mc: ExerciseRow;
  let classification: ExerciseRow;
  let draftExercise: ExerciseRow;
  let scenario: ExerciseRow;
  let testCase: ExerciseRow;
  let bugReport: ExerciseRow;
  let inDraftLesson: ExerciseRow;

  const http = () => request(app.getHttpServer());

  async function signedIn() {
    const user = t.auth.createUser({
      email: `practice${++seq}@example.com`,
      password: 'correct-horse-battery',
      displayName: 'Learner',
    });
    return t.auth.signAccessToken(user.id);
  }

  const get = (path: string, token: string) =>
    http().get(`/api/v1${path}`).auth(token, { type: 'bearer' });

  const post = (path: string, token: string, body: object) =>
    http().post(`/api/v1${path}`).auth(token, { type: 'bearer' }).send(body);

  const submit = (exercise: ExerciseRow, token: string, answer: unknown) =>
    post(`/exercises/${exercise.id}/attempts`, token, { answer });

  beforeAll(async () => {
    t = await createTestApp();
    app = t.app;
    const { content, exercises, answers } = t;

    const fundamentals = content.addSkill('fundamentals', 1);
    const testDesign = content.addSkill('test_design', 2);
    const basics = content.addCourse(fundamentals, 'basics');
    const m1 = content.addModule(basics, 'Module 1');
    l1 = content.addLesson(m1, 'l1', { order_index: 1 });
    l2 = content.addLesson(m1, 'l2', { order_index: 2 });
    const draftLesson = content.addLesson(m1, 'draft', {
      order_index: 3,
      status: 'draft',
    });
    const design = content.addCourse(testDesign, 'design');
    const d1 = content.addLesson(content.addModule(design, 'D'), 'd1');

    // Added out of order on purpose: the list sorts by catalogue order.
    testCase = exercises.add(d1.id, 'test_case', {}, { difficulty: 'hard' });
    bugReport = exercises.add(d1.id, 'bug_report', {}, { order_index: 2 });
    scenario = exercises.add(l2.id, 'scenario', {}, { difficulty: 'medium' });
    classification = exercises.add(
      l1.id,
      'classification',
      classificationPrompt,
      {
        order_index: 2,
      },
    );
    mc = exercises.add(l1.id, 'multiple_choice', mcPrompt, { order_index: 1 });
    draftExercise = exercises.add(l1.id, 'multiple_choice', mcPrompt, {
      order_index: 3,
      status: 'draft',
    });
    inDraftLesson = exercises.add(draftLesson.id, 'multiple_choice', mcPrompt);

    answers.set(mc.id, { correct: ['b'] }, 'B is **right** because…');
    answers.set(classification.id, {
      mapping: { login: 'functional', speed: 'non-functional' },
    });
    answers.set(scenario.id, scenarioKey, 'Boundaries hide bugs.');
    answers.set(testCase.id, {
      requiredFields: ['title', 'steps'],
      ...scenarioKey,
    });
    answers.set(bugReport.id, {
      requiredFields: ['title'],
      expectedSeverity: 'major',
      expectedPriority: 'high',
      ...scenarioKey,
    });
    for (const hidden of [draftExercise, inDraftLesson]) {
      answers.set(hidden.id, { correct: ['a'] });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authentication', () => {
    it.each([
      ['get', '/exercises'],
      ['get', `/exercises/${randomUUID()}`],
      ['post', `/exercises/${randomUUID()}/attempts`],
      ['get', `/exercises/${randomUUID()}/attempts`],
      [
        'post',
        `/exercises/${randomUUID()}/attempts/${randomUUID()}/self-assessment`,
      ],
    ] as const)('%s %s needs a token', async (method, path) => {
      await http()[method](`/api/v1${path}`).expect(401);
    });

    it('rejects an expired token', async () => {
      const user = t.auth.createUser({
        email: `expired${++seq}@example.com`,
        password: 'correct-horse-battery',
        displayName: 'X',
      });
      const token = await t.auth.signAccessToken(user.id, { expiresIn: -10 });
      await get('/exercises', token).expect(401);
    });
  });

  describe('GET /exercises', () => {
    it('lists visible exercises in catalogue order', async () => {
      const token = await signedIn();
      const res = await get('/exercises', token).expect(200);
      expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([
        mc.id,
        classification.id,
        scenario.id,
        testCase.id,
        bugReport.id,
      ]);
      expect(res.body).toMatchObject({
        total: 5,
        page: 1,
        pageSize: 20,
        language: 'en',
        translation: 'none',
      });
      expect(res.body.items[0]).toMatchObject({
        type: 'multiple_choice',
        difficulty: 'easy',
        question: 'Question multiple_choice',
        lesson: { id: l1.id, title: 'Lesson l1' },
        course: { slug: 'basics', title: 'Course basics' },
        skill: { code: 'fundamentals' },
        stats: {
          attemptCount: 0,
          bestScore: null,
          lastScore: null,
          lastAttemptedAt: null,
          passed: false,
        },
      });
    });

    it('filters by type, difficulty, skill and lesson', async () => {
      const token = await signedIn();
      const ids = async (query: string) =>
        (await get(`/exercises?${query}`, token).expect(200)).body.items.map(
          (item: { id: string }) => item.id,
        );
      expect(await ids('type=multiple_choice')).toEqual([mc.id]);
      expect(await ids('type=multiple_choice,classification')).toEqual([
        mc.id,
        classification.id,
      ]);
      expect(await ids('difficulty=hard')).toEqual([testCase.id]);
      expect(await ids('skill=test_design')).toEqual([
        testCase.id,
        bugReport.id,
      ]);
      expect(await ids(`lessonId=${l2.id}`)).toEqual([scenario.id]);
      expect(await ids('skill=automation')).toEqual([]);
      expect(await ids(`lessonId=${randomUUID()}`)).toEqual([]);
    });

    it('paginates', async () => {
      const token = await signedIn();
      const res = await get('/exercises?page=1&pageSize=20', token).expect(200);
      expect(res.body.items).toHaveLength(5);
      const past = await get('/exercises?page=2', token).expect(200);
      expect(past.body).toMatchObject({ items: [], total: 5, page: 2 });
    });

    it.each([
      'type=essay',
      'type=multiple_choice,essay',
      'type=',
      'difficulty=extreme',
      'pageSize=10',
      'lessonId=not-a-uuid',
      'skill=Bad Code',
      'userId=x',
    ])('rejects ?%s with 400', async (query) => {
      const token = await signedIn();
      const res = await get(`/exercises?${query}`, token).expect(400);
      expect(res.body.details).toBeDefined();
    });
  });

  describe('GET /exercises/:id', () => {
    it('returns the prompt without any answer key data', async () => {
      const token = await signedIn();
      const res = await get(`/exercises/${mc.id}`, token).expect(200);
      expect(res.body).toMatchObject({
        id: mc.id,
        type: 'multiple_choice',
        prompt: { options: mcPrompt.options, multiple: false },
      });
      const body = JSON.stringify(res.body);
      for (const secret of ['correct', 'explanation', 'answer_data', 'right']) {
        expect(body).not.toContain(secret);
      }
    });

    it('returns classification categories and items', async () => {
      const token = await signedIn();
      const res = await get(`/exercises/${classification.id}`, token).expect(
        200,
      );
      expect(res.body.prompt).toEqual(classificationPrompt);
    });

    it('gives free-text types an empty prompt and hides the model answer', async () => {
      const token = await signedIn();
      const res = await get(`/exercises/${scenario.id}`, token).expect(200);
      expect(res.body.prompt).toEqual({});
      expect(JSON.stringify(res.body)).not.toContain('boundaries');
    });

    it('is 404 for draft exercises, hidden lessons and unknown ids', async () => {
      const token = await signedIn();
      for (const id of [draftExercise.id, inDraftLesson.id, randomUUID()]) {
        const res = await get(`/exercises/${id}`, token).expect(404);
        expect(res.body).toMatchObject({ message: 'Exercise not found' });
      }
    });

    it('is 400 for an invalid id', async () => {
      const token = await signedIn();
      await get('/exercises/nope', token).expect(400);
    });
  });

  describe('POST /exercises/:id/attempts', () => {
    it('grades on the server and returns the review', async () => {
      const token = await signedIn();
      const res = await submit(mc, token, { selected: ['b'] }).expect(201);
      expect(res.body.attempt).toMatchObject({
        exerciseId: mc.id,
        score: 100,
        isCorrect: true,
        answer: { selected: ['b'] },
        feedback: {
          type: 'multiple_choice',
          options: [
            { id: 'a', selected: false, correct: false },
            { id: 'b', selected: true, correct: true },
            { id: 'c', selected: false, correct: false },
          ],
        },
        selfAssessment: null,
      });
      expect(res.body.review).toEqual({
        explanation: 'B is **right** because…',
        modelAnswer: null,
        rubric: [],
      });
    });

    it('stores the attempt for the user in the token', async () => {
      const token = await signedIn();
      const userId = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString(),
      ).sub as string;
      await submit(mc, token, { selected: ['a'] }).expect(201);
      const stored = t.attempts.rows.at(-1)!;
      expect(stored).toMatchObject({
        user_id: userId,
        exercise_id: mc.id,
        score: 0,
        is_correct: false,
      });
    });

    it('rejects a client-sent score, verdict or user id', async () => {
      const token = await signedIn();
      for (const extra of [
        { score: 100 },
        { isCorrect: true },
        { userId: randomUUID() },
      ]) {
        const res = await post(`/exercises/${mc.id}/attempts`, token, {
          answer: { selected: ['a'] },
          ...extra,
        }).expect(400);
        expect(res.body.details[0].field).toBe(Object.keys(extra)[0]);
      }
      const res = await submit(mc, token, {
        selected: ['a'],
        score: 100,
      }).expect(400);
      expect(res.body.details).toEqual([
        { field: 'answer.score', message: 'score is not allowed' },
      ]);
    });

    it('validates the answer against the exercise type', async () => {
      const token = await signedIn();
      const cases: [ExerciseRow, unknown, string][] = [
        [mc, { selected: ['z'] }, 'answer.selected'],
        [mc, { selected: ['a', 'b'] }, 'answer.selected'],
        [
          classification,
          { mapping: { login: 'functional' } },
          'answer.mapping.speed',
        ],
        [scenario, { text: '' }, 'answer.text'],
        [testCase, {}, 'answer.title'],
        [bugReport, { title: 'x', severity: 'blocker' }, 'answer.severity'],
      ];
      for (const [exercise, answer, field] of cases) {
        const res = await submit(exercise, token, answer as object).expect(400);
        expect(
          res.body.details.map((d: { field: string }) => d.field),
        ).toContain(field);
      }
      await post(`/exercises/${mc.id}/attempts`, token, {}).expect(400);
      await post(`/exercises/${mc.id}/attempts`, token, { answer: 'b' }).expect(
        400,
      );
    });

    it('grades each type', async () => {
      const token = await signedIn();
      const classify = await submit(classification, token, {
        mapping: { login: 'functional', speed: 'functional' },
      }).expect(201);
      expect(classify.body.attempt).toMatchObject({
        score: 50,
        isCorrect: false,
      });

      const free = await submit(scenario, token, {
        text: 'Check each boundary and an invalid value.',
      }).expect(201);
      expect(free.body.attempt).toMatchObject({ score: 100, isCorrect: true });
      expect(free.body.review).toEqual({
        explanation: 'Boundaries hide bugs.',
        modelAnswer: scenarioKey.modelAnswer,
        rubric: scenarioKey.rubric,
      });

      const bug = await submit(bugReport, token, {
        title: 'Boundary bug',
        severity: 'major',
        priority: 'low',
      }).expect(201);
      // fields 100 × .3 + severity 20 + priority 0 + concepts 50 × .3 = 65
      expect(bug.body.attempt).toMatchObject({ score: 65, isCorrect: false });

      const tc = await submit(testCase, token, {
        title: 'Age boundary',
        steps: ['Enter 17', ' '],
      }).expect(201);
      expect(tc.body.attempt.answer.steps).toEqual(['Enter 17']);
    });

    it('is 404 for exercises the learner cannot see', async () => {
      const token = await signedIn();
      for (const exercise of [draftExercise, inDraftLesson]) {
        await submit(exercise, token, { selected: ['a'] }).expect(404);
      }
      await post(`/exercises/${randomUUID()}/attempts`, token, {
        answer: { selected: ['a'] },
      }).expect(404);
    });

    it('fails with a generic 500 when the answer key is missing', async () => {
      const token = await signedIn();
      const orphan = t.exercises.add(l1.id, 'multiple_choice', mcPrompt, {
        order_index: 9,
      });
      const res = await submit(orphan, token, { selected: ['a'] }).expect(500);
      expect(res.body).toEqual({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Internal server error',
      });
      t.exercises.setStatus(orphan.id, 'archived');
    });
  });

  describe('GET /exercises/:id/attempts', () => {
    it('has no review before the first attempt', async () => {
      const token = await signedIn();
      const res = await get(`/exercises/${mc.id}/attempts`, token).expect(200);
      expect(res.body).toMatchObject({ items: [], total: 0, review: null });
    });

    it('lists only your attempts, newest first, with stats on the exercise', async () => {
      const token = await signedIn();
      const other = await signedIn();
      await submit(mc, other, { selected: ['b'] }).expect(201);
      await submit(mc, token, { selected: ['a'] }).expect(201);
      await submit(mc, token, { selected: ['b'] }).expect(201);
      await submit(mc, token, { selected: ['c'] }).expect(201);

      const res = await get(`/exercises/${mc.id}/attempts`, token).expect(200);
      expect(res.body.total).toBe(3);
      expect(res.body.items.map((a: { score: number }) => a.score)).toEqual([
        0, 100, 0,
      ]);
      expect(res.body.items.map((a: { answer: object }) => a.answer)).toEqual([
        { selected: ['c'] },
        { selected: ['b'] },
        { selected: ['a'] },
      ]);
      expect(res.body.review.explanation).toBe('B is **right** because…');

      const detail = await get(`/exercises/${mc.id}`, token).expect(200);
      expect(detail.body.stats).toMatchObject({
        attemptCount: 3,
        bestScore: 100,
        lastScore: 0,
        passed: true,
      });
      const list = await get('/exercises?type=multiple_choice', token).expect(
        200,
      );
      expect(list.body.items[0].stats.attemptCount).toBe(3);
    });

    it('is 404 for hidden exercises', async () => {
      const token = await signedIn();
      await get(`/exercises/${draftExercise.id}/attempts`, token).expect(404);
    });
  });

  describe('POST /exercises/:id/attempts/:attemptId/self-assessment', () => {
    const path = (exercise: ExerciseRow, attemptId: string) =>
      `/exercises/${exercise.id}/attempts/${attemptId}/self-assessment`;

    it('saves the ticked rubric items once', async () => {
      const token = await signedIn();
      const { body } = await submit(scenario, token, {
        text: 'invalid',
      }).expect(201);
      const attemptId = body.attempt.id as string;

      const saved = await post(path(scenario, attemptId), token, {
        checked: ['neg'],
      }).expect(200);
      expect(saved.body).toMatchObject({
        id: attemptId,
        score: 50,
        selfAssessment: { checked: ['neg'] },
      });

      const again = await post(path(scenario, attemptId), token, {
        checked: ['bva'],
      }).expect(409);
      expect(again.body.statusCode).toBe(409);

      const history = await get(`/exercises/${scenario.id}/attempts`, token);
      expect(history.body.items[0].selfAssessment).toEqual({
        checked: ['neg'],
      });
    });

    it('rejects unknown rubric ids', async () => {
      const token = await signedIn();
      const { body } = await submit(scenario, token, { text: 'x' }).expect(201);
      const res = await post(path(scenario, body.attempt.id), token, {
        checked: ['nope'],
      }).expect(400);
      expect(res.body.details[0].field).toBe('checked');
    });

    it('is 400 for choice types', async () => {
      const token = await signedIn();
      const { body } = await submit(mc, token, { selected: ['a'] }).expect(201);
      await post(path(mc, body.attempt.id), token, { checked: [] }).expect(400);
    });

    it("is 404 for another user's attempt or another exercise", async () => {
      const token = await signedIn();
      const other = await signedIn();
      const { body } = await submit(scenario, other, { text: 'x' }).expect(201);
      await post(path(scenario, body.attempt.id), token, {
        checked: [],
      }).expect(404);
      await post(path(testCase, body.attempt.id), other, {
        checked: [],
      }).expect(404);
    });
  });

  describe('translation', () => {
    it('serves manual translations, and review texts only after an attempt', async () => {
      const token = await signedIn();
      t.translator.isEnabled = false;
      const manual = (field: string, text: string, source: string) =>
        t.translations.addManual({
          entity_type: 'exercise',
          entity_id: mc.id,
          field: field as never,
          language: 'vi',
          source_hash: sourceHash(source),
          text,
        });
      manual('question', 'Câu hỏi', mc.question);
      manual('explanation', 'Giải thích', 'B is **right** because…');

      const detail = await get(`/exercises/${mc.id}?lang=vi`, token).expect(
        200,
      );
      expect(detail.body.question).toBe('Câu hỏi');
      // Options have no translation: shown in English.
      expect(detail.body.translation).toBe('unavailable');

      const before = await get(`/exercises/${mc.id}/attempts?lang=vi`, token);
      expect(before.body.review).toBeNull();

      const res = await post(`/exercises/${mc.id}/attempts?lang=vi`, token, {
        answer: { selected: ['b'] },
      }).expect(201);
      expect(res.body.review.explanation).toBe('Giải thích');
      expect(res.body).toMatchObject({ language: 'vi', translation: 'manual' });
      t.translator.reset();
    });

    it('machine-translates question and labels when a provider is set', async () => {
      const token = await signedIn();
      const res = await get(
        `/exercises/${classification.id}?lang=vi`,
        token,
      ).expect(200);
      expect(res.body.translation).toBe('machine');
      expect(res.body.prompt.items[0]).toEqual({
        id: 'login',
        text: 'VI: Login works',
      });
    });
  });
});
