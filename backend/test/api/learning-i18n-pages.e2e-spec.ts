import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type {
  CourseRow,
  LessonRow,
} from '../../src/learning/content.repository.js';
import { FakeAuthServer } from '../support/fake-auth-server.js';
import { FakeContentRepository } from '../support/fake-learning.js';
import {
  FakeTranslationsRepository,
  FakeTranslator,
} from '../support/fake-translation.js';
import { createTestApp } from '../support/create-test-app.js';
import { sourceHash } from '../../src/translation/content-translation.service.js';
import { PIPELINE_VERSION } from '../../src/translation/markdown-translate.js';

let seq = 0;

describe('Learning API: pagination and translation (e2e)', () => {
  let app: INestApplication<App>;
  let auth: FakeAuthServer;
  let content: FakeContentRepository;
  let translator: FakeTranslator;
  let translations: FakeTranslationsRepository;
  let token: string;
  let first: CourseRow;
  let lesson: LessonRow;
  let nextLessonRow: LessonRow;

  const get = (path: string) =>
    request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .auth(token, { type: 'bearer' });

  const slugs = (body: { items: { slug: string }[] }) =>
    body.items.map((item) => item.slug);

  beforeAll(async () => {
    ({ app, auth, content, translator, translations } = await createTestApp());
    const user = auth.createUser({
      email: `pages${++seq}@example.com`,
      password: 'correct-horse-battery',
      displayName: 'Learner',
    });
    token = await auth.signAccessToken(user.id);

    // 30 fundamentals courses (added in reverse order) + 15 test_design.
    const design = content.addSkill('test_design', 2);
    const fundamentals = content.addSkill('fundamentals', 1);
    for (let i = 30; i >= 1; i--) {
      const course = content.addCourse(
        fundamentals,
        `f-${String(i).padStart(2, '0')}`,
        {
          order_index: i,
        },
      );
      if (i === 1) first = course;
    }
    for (let i = 1; i <= 15; i++) {
      content.addCourse(design, `d-${String(i).padStart(2, '0')}`, {
        order_index: i,
      });
    }
    content.addCourse(fundamentals, 'hidden-draft', { status: 'draft' });

    const module = content.addModule(first, 'Module 1');
    lesson = content.addLesson(module, 'l1', { order_index: 1 });
    content.setLessonContent(
      lesson.id,
      '## Heading\n\nWrite a test case for `age >= 18`.',
    );
    nextLessonRow = content.addLesson(module, 'l2', { order_index: 2 });
  });

  beforeEach(() => {
    translator.reset();
    translations.rows.clear();
    translations.failReads = false;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /courses pagination', () => {
    it('returns the first 20 in catalogue order by default', async () => {
      const res = await get('/courses').expect(200);
      expect(res.body).toMatchObject({ total: 45, page: 1, pageSize: 20 });
      expect(res.body.items).toHaveLength(20);
      expect(slugs(res.body).slice(0, 3)).toEqual(['f-01', 'f-02', 'f-03']);
    });

    it('continues across skills on the next pages', async () => {
      const page2 = await get('/courses?page=2').expect(200);
      expect(slugs(page2.body)).toEqual([
        ...Array.from({ length: 10 }, (_, i) => `f-${21 + i}`),
        ...Array.from(
          { length: 10 },
          (_, i) => `d-${String(i + 1).padStart(2, '0')}`,
        ),
      ]);
      const page3 = await get('/courses?page=3').expect(200);
      expect(slugs(page3.body)).toEqual([
        'd-11',
        'd-12',
        'd-13',
        'd-14',
        'd-15',
      ]);
    });

    it('accepts page sizes 50 and 100', async () => {
      const fifty = await get('/courses?pageSize=50').expect(200);
      expect(fifty.body.items).toHaveLength(45);
      expect(fifty.body.pageSize).toBe(50);
      await get('/courses?pageSize=100').expect(200);
    });

    it('pages within a skill filter', async () => {
      const res = await get('/courses?skill=test_design&pageSize=20').expect(
        200,
      );
      expect(res.body.total).toBe(15);
      expect(res.body.items).toHaveLength(15);
    });

    it('returns an empty page past the end', async () => {
      const res = await get('/courses?page=9').expect(200);
      expect(res.body).toMatchObject({ items: [], total: 45, page: 9 });
    });

    it.each([
      ['pageSize=30', 'pageSize'],
      ['pageSize=abc', 'pageSize'],
      ['page=0', 'page'],
      ['page=1.5', 'page'],
      ['page=x', 'page'],
      ['lang=fr', 'lang'],
    ])('rejects %s with 400', async (query, field) => {
      const res = await get(`/courses?${query}`).expect(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field })]),
      );
    });
  });

  describe('?lang=vi', () => {
    it('machine-translates the lesson, keeping code and structure', async () => {
      const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      expect(res.body).toMatchObject({
        title: 'VI: Lesson l1',
        course: { title: 'VI: Course f-01' },
        module: { title: 'VI: Module 1' },
        nextLesson: { id: nextLessonRow.id, title: 'VI: Lesson l2' },
        language: 'vi',
        translation: 'machine',
      });
      // Heading marker kept; code and the QA term sent as notranslate.
      expect(res.body.contentMd).toBe(
        '## VI: Heading\n\nVI: Write a test case for `age >= 18`.',
      );
      expect(translator.calls[0]).toContain(
        'Write a <span class="notranslate">test case</span> for <span class="notranslate">`age &gt;= 18`</span>.',
      );
    });

    it('caches translations: the second request calls no provider', async () => {
      await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      expect(translator.calls).toHaveLength(1);
      const again = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      expect(translator.calls).toHaveLength(1);
      expect(again.body.translation).toBe('machine');
    });

    it('translates again when the source text changes', async () => {
      await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      content.setLessonContent(lesson.id, 'New body.');
      const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      expect(res.body.contentMd).toBe('VI: New body.');
      // Only the changed field is sent again.
      expect(translator.calls[1]).toEqual(['New body.']);
      content.setLessonContent(
        lesson.id,
        '## Heading\n\nWrite a test case for `age >= 18`.',
      );
    });

    it('falls back to English when no provider is configured', async () => {
      translator.isEnabled = false;
      const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      expect(res.body).toMatchObject({
        title: 'Lesson l1',
        language: 'vi',
        translation: 'unavailable',
      });
      expect(translator.calls).toHaveLength(0);
    });

    it('falls back to English when the provider fails, without failing the request', async () => {
      translator.failing = true;
      const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      expect(res.body).toMatchObject({
        title: 'Lesson l1',
        translation: 'unavailable',
      });
      expect(translations.rows.size).toBe(0);
    });

    it('still answers when the translation cache cannot be read', async () => {
      translations.failReads = true;
      const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      expect(res.body).toMatchObject({
        title: 'VI: Lesson l1',
        translation: 'machine',
      });
    });

    it('translates course lists, course detail and continue', async () => {
      const list = await get('/courses?lang=vi&pageSize=20').expect(200);
      expect(list.body.items[0].title).toBe('VI: Course f-01');
      expect(list.body.translation).toBe('machine');

      const detail = await get(`/courses/${first.slug}?lang=vi`).expect(200);
      expect(detail.body.modules[0]).toMatchObject({
        title: 'VI: Module 1',
        lessons: [{ title: 'VI: Lesson l1' }, { title: 'VI: Lesson l2' }],
      });

      const next = await get('/continue?lang=vi').expect(200);
      expect(next.body).toMatchObject({
        item: {
          lessonTitle: 'VI: Lesson l1',
          course: { title: 'VI: Course f-01' },
        },
        translation: 'machine',
      });
    });

    describe('manual translations', () => {
      const manual = (
        entity_type: 'course' | 'module' | 'lesson',
        entity_id: string,
        field: 'title' | 'description' | 'content_md',
        source: string,
        text: string,
      ) =>
        translations.addManual({
          entity_type,
          entity_id,
          field,
          language: 'vi',
          source_hash: sourceHash(source),
          text,
        });

      const lessonBody = () =>
        '## Heading\n\nWrite a test case for `age >= 18`.';

      function translateLessonPage() {
        manual('lesson', lesson.id, 'title', 'Lesson l1', 'Bài l1');
        manual(
          'lesson',
          lesson.id,
          'content_md',
          lessonBody(),
          '## Tiêu đề\n\nViết test case.',
        );
        manual('course', first.id, 'title', 'Course f-01', 'Khoá f-01');
        manual('module', lesson.module_id, 'title', 'Module 1', 'Module một');
        manual('lesson', nextLessonRow.id, 'title', 'Lesson l2', 'Bài l2');
      }

      it('serves manual translations without calling the provider', async () => {
        translateLessonPage();
        const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
        expect(res.body).toMatchObject({
          title: 'Bài l1',
          contentMd: '## Tiêu đề\n\nViết test case.',
          course: { title: 'Khoá f-01' },
          module: { title: 'Module một' },
          nextLesson: { title: 'Bài l2' },
          translation: 'manual',
        });
        expect(translator.calls).toHaveLength(0);
      });

      it('works without a provider key', async () => {
        translateLessonPage();
        translator.isEnabled = false;
        const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
        expect(res.body).toMatchObject({
          title: 'Bài l1',
          translation: 'manual',
        });
      });

      it('prefers a manual translation over a cached machine one', async () => {
        await get(`/lessons/${lesson.id}?lang=vi`).expect(200); // caches machine rows
        translateLessonPage();
        const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
        expect(res.body.title).toBe('Bài l1');
        expect(res.body.translation).toBe('manual');
      });

      it('machine-translates the texts without a manual translation', async () => {
        manual('lesson', lesson.id, 'title', 'Lesson l1', 'Bài l1');
        const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
        expect(res.body.title).toBe('Bài l1');
        expect(res.body.course.title).toBe('VI: Course f-01');
        expect(res.body.translation).toBe('machine');
        expect(translator.calls[0]).not.toContain('Lesson l1');
      });

      it('ignores a manual translation of an older source, and keeps it', async () => {
        manual('lesson', lesson.id, 'title', 'Old title', 'Tiêu đề cũ');
        const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
        expect(res.body.title).toBe('VI: Lesson l1');
        const kept = [...translations.rows.values()].find(
          (row) => row.provider === 'manual' && row.field === 'title',
        );
        expect(kept?.text).toBe('Tiêu đề cũ');
      });

      it('is unavailable when a text has neither translation nor provider', async () => {
        manual('lesson', lesson.id, 'title', 'Lesson l1', 'Bài l1');
        translator.isEnabled = false;
        const res = await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
        expect(res.body).toMatchObject({
          title: 'Bài l1',
          course: { title: 'Course f-01' },
          translation: 'unavailable',
        });
      });
    });

    it('redoes machine translations made by an older pipeline', async () => {
      await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      for (const row of translations.rows.values()) {
        row.pipeline_version = PIPELINE_VERSION - 1;
      }
      await get(`/lessons/${lesson.id}?lang=vi`).expect(200);
      expect(translator.calls).toHaveLength(2);
    });

    it('does not call the provider for English', async () => {
      const res = await get(`/lessons/${lesson.id}?lang=en`).expect(200);
      expect(res.body).toMatchObject({ language: 'en', translation: 'none' });
      await get(`/lessons/${lesson.id}`).expect(200);
      expect(translator.calls).toHaveLength(0);
    });

    it('rejects unsupported languages', async () => {
      await get(`/lessons/${lesson.id}?lang=fr`).expect(400);
      await get(`/courses/${first.slug}?lang=VI`).expect(400);
      await get('/continue?lang=de').expect(400);
    });
  });
});
