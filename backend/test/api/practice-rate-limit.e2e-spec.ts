import request from 'supertest';

// Config is validated when the app module is first imported, so the limit
// must be set before importing it (each spec file has its own module graph).
process.env.ATTEMPT_RATE_LIMIT = '3';
const { createTestApp } = await import('../support/create-test-app.js');
type TestApp = Awaited<ReturnType<typeof createTestApp>>;

describe('Attempt rate limiting (e2e)', () => {
  let t: TestApp;
  let exerciseId: string;
  let seq = 0;

  const token = async () => {
    const user = t.auth.createUser({
      email: `limit${++seq}@example.com`,
      password: 'correct-horse-battery',
      displayName: 'L',
    });
    return t.auth.signAccessToken(user.id);
  };

  const submit = (accessToken: string) =>
    request(t.app.getHttpServer())
      .post(`/api/v1/exercises/${exerciseId}/attempts`)
      .auth(accessToken, { type: 'bearer' })
      .send({ answer: { selected: ['a'] } });

  beforeEach(async () => {
    t = await createTestApp();
    const skill = t.content.addSkill('fundamentals');
    const course = t.content.addCourse(skill, 'c');
    const lesson = t.content.addLesson(t.content.addModule(course, 'M'), 'l');
    const exercise = t.exercises.add(lesson.id, 'multiple_choice', {
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
    });
    t.answers.set(exercise.id, { correct: ['a'] });
    exerciseId = exercise.id;
  });

  afterEach(async () => {
    await t.app.close();
  });

  it('limits submissions per user, not per IP', async () => {
    const first = await token();
    for (let i = 0; i < 3; i++) await submit(first).expect(201);
    const limited = await submit(first).expect(429);
    expect(limited.body).toMatchObject({
      statusCode: 429,
      message: 'Too many requests. Try again later.',
    });
    expect(t.attempts.rows).toHaveLength(3);

    // Same IP, another user: own budget.
    await submit(await token()).expect(201);
  });

  it('does not limit reading attempts or the auth throttler', async () => {
    const learner = await token();
    for (let i = 0; i < 6; i++) {
      await request(t.app.getHttpServer())
        .get(`/api/v1/exercises/${exerciseId}/attempts`)
        .auth(learner, { type: 'bearer' })
        .expect(200);
    }
  });
});
