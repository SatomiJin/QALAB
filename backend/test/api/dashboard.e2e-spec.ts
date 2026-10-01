import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { LessonRow } from '../../src/learning/content.repository.js';
import type { ExerciseRow } from '../../src/practice/exercises.repository.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { userIdFromToken } from '../support/fake-practice.js';

let seq = 0;

const mcPrompt = {
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
  ],
};

const scenarioKey = {
  expectedConcepts: [
    { concept: 'Boundary', keywords: ['boundary'] },
    { concept: 'Invalid', keywords: ['invalid'] },
  ],
  modelAnswer: 'Test the boundaries and invalid values.',
  rubric: [{ id: 'bva', text: 'I tested both boundaries' }],
};

const DAY = 24 * 60 * 60 * 1000;

describe('Dashboard and progress API (e2e)', () => {
  let t: TestApp;
  let app: INestApplication<App>;

  // fundamentals: basics [m1: l1 (mc, draft mc), l2 (scenario), draft lesson (mc)]
  // test_design: design [d1: scenario]
  // automation: no content
  let l1: LessonRow;
  let l2: LessonRow;
  let d1: LessonRow;
  let draftLesson: LessonRow;
  let mc: ExerciseRow;
  let draftExercise: ExerciseRow;
  let scenario: ExerciseRow;
  let designScenario: ExerciseRow;
  let inDraftLesson: ExerciseRow;

  const http = () => request(app.getHttpServer());

  async function signedIn() {
    const user = t.auth.createUser({
      email: `dashboard${++seq}@example.com`,
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
    post(`/exercises/${exercise.id}/attempts`, token, { answer }).expect(201);

  /** Moves every activity of this user back by whole days. */
  function shiftUser(token: string, days: number) {
    const userId = userIdFromToken(token);
    const shift = (iso: string | null) =>
      iso && new Date(Date.parse(iso) - days * DAY).toISOString();
    for (const row of t.attempts.rows) {
      if (row.user_id === userId) row.attempted_at = shift(row.attempted_at)!;
    }
    for (const row of t.progress.rows.values()) {
      if (row.user_id !== userId) continue;
      row.started_at = shift(row.started_at);
      row.completed_at = shift(row.completed_at);
      row.last_accessed_at = shift(row.last_accessed_at)!;
    }
  }

  beforeAll(async () => {
    t = await createTestApp();
    app = t.app;
    const { content, exercises, answers } = t;

    const fundamentals = content.addSkill('fundamentals', 1);
    const testDesign = content.addSkill('test_design', 2);
    content.addSkill('automation', 3);
    const basics = content.addCourse(fundamentals, 'basics');
    const m1 = content.addModule(basics, 'Module 1');
    l1 = content.addLesson(m1, 'l1', { order_index: 1 });
    l2 = content.addLesson(m1, 'l2', { order_index: 2 });
    draftLesson = content.addLesson(m1, 'draft', {
      order_index: 3,
      status: 'draft',
    });
    const design = content.addCourse(testDesign, 'design');
    d1 = content.addLesson(content.addModule(design, 'D'), 'd1');

    mc = exercises.add(l1.id, 'multiple_choice', mcPrompt, { order_index: 1 });
    draftExercise = exercises.add(l1.id, 'multiple_choice', mcPrompt, {
      order_index: 2,
      status: 'draft',
    });
    scenario = exercises.add(l2.id, 'scenario', {});
    designScenario = exercises.add(d1.id, 'scenario', {});
    inDraftLesson = exercises.add(draftLesson.id, 'multiple_choice', mcPrompt);

    answers.set(mc.id, { correct: ['b'] });
    answers.set(scenario.id, scenarioKey);
    answers.set(designScenario.id, scenarioKey);
    for (const hidden of [draftExercise, inDraftLesson]) {
      answers.set(hidden.id, { correct: ['a'] });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authentication and validation', () => {
    it.each(['/dashboard', '/progress'])('%s needs a token', async (path) => {
      await http().get(`/api/v1${path}`).expect(401);
    });

    it('rejects an expired token', async () => {
      const user = t.auth.createUser({
        email: `expired${++seq}@example.com`,
        password: 'correct-horse-battery',
        displayName: 'X',
      });
      const token = await t.auth.signAccessToken(user.id, { expiresIn: -10 });
      await get('/dashboard', token).expect(401);
    });

    it.each([
      ['/dashboard?tz=Mars/Olympus', 'tz'],
      ['/dashboard?tz=' + 'A'.repeat(65), 'tz'],
      ['/dashboard?lang=fr', 'lang'],
      ['/dashboard?userId=someone', 'userId'],
      ['/progress?pageSize=10', 'pageSize'],
      ['/progress?skill=Bad-Code', 'skill'],
      ['/progress?page=0', 'page'],
      ['/progress?userId=someone', 'userId'],
    ])('%s is 400', async (path, field) => {
      const token = await signedIn();
      const res = await get(path, token).expect(400);
      expect(JSON.stringify(res.body)).toContain(field);
    });
  });

  describe('GET /dashboard', () => {
    it('starts empty for a new learner', async () => {
      const token = await signedIn();
      const res = await get('/dashboard', token).expect(200);
      expect(res.body.overall).toEqual({
        totalLessons: 3,
        completedLessons: 0,
        percent: 0,
        exercises: { total: 3, attempted: 0, passed: 0, averageScore: null },
      });
      expect(res.body.streak).toMatchObject({
        current: 0,
        longest: 0,
        activeToday: false,
      });
      expect(res.body.streak.days).toHaveLength(14);
      expect(res.body.continue).toMatchObject({
        reason: 'start',
        lessonId: l1.id,
      });
      expect(
        res.body.skills.map((s: { code: string; status: string }) => [
          s.code,
          s.status,
        ]),
      ).toEqual([
        ['fundamentals', 'not_started'],
        ['test_design', 'not_started'],
        ['automation', 'not_started'],
      ]);
      expect(res.body.skills[2]).toMatchObject({
        totalLessons: 0,
        percent: 0,
        exercises: { total: 0, attempted: 0 },
      });
      expect(res.body.weakAreas).toEqual({ skills: [], concepts: [] });
      expect(res.body.recentActivity).toEqual([]);
      expect(res.body).toMatchObject({
        timeZone: 'UTC',
        language: 'en',
        translation: 'none',
      });
    });

    it('derives progress, streak, weak areas and activity from what the learner did', async () => {
      const token = await signedIn();
      await post(`/lessons/${l1.id}/progress`, token, {
        complete: true,
      }).expect(200);
      await post(`/lessons/${l2.id}/progress`, token, {}).expect(200);
      await submit(mc, token, { selected: ['a'] }); // 0
      await submit(mc, token, { selected: ['b'] }); // 100, passed
      await submit(scenario, token, { text: 'Only the boundary.' }); // 50

      const res = await get('/dashboard?tz=Asia/Ho_Chi_Minh', token).expect(
        200,
      );
      const body = res.body;
      expect(body.overall).toEqual({
        totalLessons: 3,
        completedLessons: 1,
        percent: 33,
        // Best score per exercise: (100 + 50) / 2.
        exercises: { total: 3, attempted: 2, passed: 1, averageScore: 75 },
      });
      expect(body.skills[0]).toMatchObject({
        code: 'fundamentals',
        totalLessons: 2,
        completedLessons: 1,
        percent: 50,
        status: 'in_progress',
        exercises: { total: 2, attempted: 2, passed: 1, averageScore: 75 },
      });
      expect(body.streak).toMatchObject({ current: 1, activeToday: true });
      expect(body.timeZone).toBe('Asia/Ho_Chi_Minh');
      expect(body.continue).toMatchObject({
        reason: 'resume',
        lessonId: l2.id,
      });

      // Fundamentals averages 75: not weak. The missed concept is.
      expect(body.weakAreas.skills).toEqual([]);
      expect(body.weakAreas.concepts).toEqual([
        { concept: 'Invalid', missed: 1, checked: 1 },
      ]);

      expect(body.recentActivity.map((a: { kind: string }) => a.kind)).toEqual(
        expect.arrayContaining([
          'lesson_started',
          'lesson_completed',
          'exercise_attempted',
        ]),
      );
      expect(body.recentActivity).toHaveLength(6);
      const times = body.recentActivity.map(
        (a: { occurredAt: string }) => a.occurredAt,
      );
      expect([...times].sort().reverse()).toEqual(times);
      const attempt = body.recentActivity.find(
        (a: { exercise: { id: string } | null }) =>
          a.exercise?.id === scenario.id,
      );
      expect(attempt).toEqual({
        kind: 'exercise_attempted',
        occurredAt: expect.any(String),
        lesson: { id: l2.id, title: 'Lesson l2' },
        course: {
          id: expect.any(String),
          slug: 'basics',
          title: 'Course basics',
        },
        exercise: { id: scenario.id, type: 'scenario' },
        score: 50,
        isCorrect: false,
      });
    });

    it('lists a skill below the pass mark with the exercise to retry', async () => {
      const token = await signedIn();
      await submit(designScenario, token, { text: 'Nothing relevant.' }); // 0
      const res = await get('/dashboard', token).expect(200);
      expect(res.body.weakAreas.skills).toEqual([
        {
          code: 'test_design',
          name: 'Skill test_design',
          averageScore: 0,
          attemptedExercises: 1,
          passedExercises: 0,
          retry: { id: designScenario.id, type: 'scenario', bestScore: 0 },
        },
      ]);
      expect(res.body.weakAreas.concepts).toEqual([
        { concept: 'Boundary', missed: 1, checked: 1 },
        { concept: 'Invalid', missed: 1, checked: 1 },
      ]);
    });

    it('ignores progress and attempts on content that is not published', async () => {
      const token = await signedIn();
      const userId = userIdFromToken(token);
      const now = new Date().toISOString();
      // Written before the content was unpublished.
      t.progress.rows.set(`${userId}:${draftLesson.id}`, {
        user_id: userId,
        lesson_id: draftLesson.id,
        status: 'completed',
        progress_percent: 100,
        started_at: now,
        completed_at: now,
        last_accessed_at: now,
      });
      for (const exercise of [draftExercise, inDraftLesson]) {
        t.attempts.rows.push({
          id: randomUUID(),
          user_id: userId,
          exercise_id: exercise.id,
          answer: { selected: ['b'] },
          score: 0,
          is_correct: false,
          feedback: { type: 'multiple_choice', options: [] },
          self_assessment: null,
          attempted_at: now,
        });
      }

      const res = await get('/dashboard', token).expect(200);
      expect(res.body.overall).toMatchObject({
        completedLessons: 0,
        exercises: { attempted: 0, averageScore: null },
      });
      expect(res.body.weakAreas.skills).toEqual([]);
      expect(res.body.recentActivity).toEqual([]);
      // Studying counts for the streak, even if the content is gone since.
      expect(res.body.streak).toMatchObject({ current: 1, activeToday: true });
    });

    it('keeps a streak alive until a whole day is missed', async () => {
      const token = await signedIn();
      await post(`/lessons/${l1.id}/progress`, token, {}).expect(200);
      shiftUser(token, 1);
      await post(`/lessons/${l2.id}/progress`, token, {}).expect(200);
      shiftUser(token, 1);

      // Yesterday and the day before: still current, not yet today.
      let res = await get('/dashboard', token).expect(200);
      expect(res.body.streak).toMatchObject({
        current: 2,
        longest: 2,
        activeToday: false,
      });
      expect(
        res.body.streak.days
          .map((d: { active: boolean }) => d.active)
          .slice(-3),
      ).toEqual([true, true, false]);

      shiftUser(token, 1);
      res = await get('/dashboard', token).expect(200);
      expect(res.body.streak).toMatchObject({ current: 0, longest: 2 });
    });

    it('counts days in the time zone asked for', async () => {
      const token = await signedIn();
      await post(`/lessons/${l1.id}/progress`, token, {}).expect(200);
      const userId = userIdFromToken(token);
      // Two events 2 hours apart, around midnight UTC.
      const row = t.progress.rows.get(`${userId}:${l1.id}`)!;
      const today = new Date().toISOString().slice(0, 10);
      row.started_at = `${today}T00:30:00.000Z`;
      row.last_accessed_at = `${today}T00:30:00.000Z`;
      t.progress.rows.set(`${userId}:${l2.id}`, {
        ...row,
        lesson_id: l2.id,
        started_at: new Date(
          Date.parse(row.started_at) - 2 * 3600e3,
        ).toISOString(),
        last_accessed_at: new Date(
          Date.parse(row.started_at) - 2 * 3600e3,
        ).toISOString(),
      });

      const utc = await get('/dashboard?tz=UTC', token).expect(200);
      // 22:30 yesterday and 00:30 today: two days in UTC.
      expect(
        utc.body.streak.days.filter((d: { active: boolean }) => d.active),
      ).toHaveLength(2);
      // In UTC+7 both are the same morning.
      const hcm = await get('/dashboard?tz=Asia/Ho_Chi_Minh', token).expect(
        200,
      );
      expect(
        hcm.body.streak.days.filter((d: { active: boolean }) => d.active),
      ).toHaveLength(1);
    });

    it('shows only the caller’s own data', async () => {
      const busy = await signedIn();
      await post(`/lessons/${l1.id}/progress`, busy, { complete: true }).expect(
        200,
      );
      await submit(mc, busy, { selected: ['b'] });
      const other = await signedIn();
      const res = await get('/dashboard', other).expect(200);
      expect(res.body.overall.completedLessons).toBe(0);
      expect(res.body.overall.exercises.attempted).toBe(0);
      expect(res.body.recentActivity).toEqual([]);
      expect(res.body.streak.current).toBe(0);
    });

    it('translates the titles it shows', async () => {
      t.translator.reset();
      const token = await signedIn();
      await post(`/lessons/${l1.id}/progress`, token, {}).expect(200);
      const res = await get('/dashboard?lang=vi', token).expect(200);
      expect(res.body).toMatchObject({
        language: 'vi',
        translation: 'machine',
      });
      expect(res.body.continue.lessonTitle).toBe('VI: Lesson l1');
      expect(res.body.recentActivity[0].lesson.title).toBe('VI: Lesson l1');
      expect(res.body.recentActivity[0].course.title).toBe('VI: Course basics');
    });
  });

  describe('GET /progress', () => {
    it('lists every course with its lessons, exercises and results', async () => {
      const token = await signedIn();
      await post(`/lessons/${l1.id}/progress`, token, {
        complete: true,
      }).expect(200);
      await submit(mc, token, { selected: ['a'] });
      await submit(mc, token, { selected: ['b'] });

      const res = await get('/progress', token).expect(200);
      expect(res.body).toMatchObject({
        total: 2,
        page: 1,
        pageSize: 20,
        language: 'en',
      });
      const [basics, design] = res.body.items;
      expect(basics).toMatchObject({
        slug: 'basics',
        progress: {
          totalLessons: 2,
          completedLessons: 1,
          status: 'in_progress',
        },
        exercises: { total: 2, attempted: 1, passed: 1, averageScore: 100 },
      });
      const lessons = basics.modules[0].lessons;
      // Draft lessons and exercises are not listed.
      expect(lessons.map((l: { id: string }) => l.id)).toEqual([l1.id, l2.id]);
      expect(lessons[0].progress.status).toBe('completed');
      expect(lessons[0].exercises).toEqual([
        {
          id: mc.id,
          type: 'multiple_choice',
          difficulty: 'easy',
          question: 'Question multiple_choice',
          stats: {
            attemptCount: 2,
            bestScore: 100,
            lastScore: 100,
            lastAttemptedAt: expect.any(String),
            passed: true,
          },
        },
      ]);
      expect(lessons[1].exercises[0].stats).toEqual({
        attemptCount: 0,
        bestScore: null,
        lastScore: null,
        lastAttemptedAt: null,
        passed: false,
      });
      expect(design).toMatchObject({
        slug: 'design',
        progress: { status: 'not_started' },
        exercises: { total: 1, attempted: 0, averageScore: null },
      });
    });

    it('filters by skill and paginates', async () => {
      const token = await signedIn();
      const bySkill = await get('/progress?skill=test_design', token).expect(
        200,
      );
      expect(bySkill.body.items.map((c: { slug: string }) => c.slug)).toEqual([
        'design',
      ]);
      expect(bySkill.body.total).toBe(1);

      const unknown = await get('/progress?skill=nothing', token).expect(200);
      expect(unknown.body).toMatchObject({ items: [], total: 0 });

      const past = await get('/progress?page=2', token).expect(200);
      expect(past.body).toMatchObject({ items: [], total: 2, page: 2 });
    });
  });
});
