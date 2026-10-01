import { fileURLToPath } from 'node:url';
import { EXERCISE_TYPES } from '../practice/exercise-schema.js';
import { curriculumStats, loadCurriculum, SKILL_CODES } from './curriculum.js';
import { buildCourseRows, englishTexts, planTranslations } from './rows.js';
import { uuidV5 } from './uuid-v5.js';

/**
 * The versioned curriculum (`backend/seed/curriculum`) must load without a
 * single problem: every prompt and answer key is accepted by the grader,
 * every text has its Vietnamese version, and every model answer passes its
 * own grading. `npm run seed:curriculum -- --dry-run` runs the same checks.
 */
const root = fileURLToPath(new URL('../../seed/curriculum/', import.meta.url));
const { courses, errors } = loadCurriculum(root);

describe('seed curriculum', () => {
  it('loads without problems', () => {
    expect(errors).toEqual([]);
  });

  it('covers every skill and exercise type', () => {
    const stats = curriculumStats(courses);
    expect(new Set(courses.map((course) => course.skill))).toEqual(
      new Set(SKILL_CODES),
    );
    expect(Object.keys(stats.exerciseTypes).sort()).toEqual(
      [...EXERCISE_TYPES].sort(),
    );
    expect(stats.modules).toBeGreaterThanOrEqual(20);
    expect(stats.lessons).toBeGreaterThanOrEqual(40);
    expect(stats.exercises).toBeGreaterThanOrEqual(100);
  });

  it('gives every lesson at least one exercise', () => {
    const empty = courses.flatMap((course) =>
      course.modules.flatMap((module) =>
        module.lessons
          .filter((lesson) => lesson.exercises.length === 0)
          .map((lesson) => `${course.slug}/${lesson.slug}`),
      ),
    );
    expect(empty).toEqual([]);
  });

  it('keeps the ids of the content seeded before the importer', () => {
    const sample = courses.find(
      (course) => course.slug === 'qa-fundamentals-first-steps',
    );
    expect(sample?.id).toBe('6f1d2a4e-0c1b-4d7e-9a3f-000000000001');
    expect(sample?.modules[0].lessons[0].id).toBe(
      '6f1d2a4e-0c1b-4d7e-9a3f-000000001001',
    );
  });

  it('builds a translation for every text it stores', () => {
    for (const course of courses) {
      const rows = buildCourseRows(course, {
        courseId: course.id,
        skillId: 'skill',
      });
      const { skipped } = planTranslations(rows.texts, englishTexts(rows));
      expect(skipped).toEqual([]);
    }
  });
});

describe('uuidV5', () => {
  it('matches the RFC 9562 test vector', () => {
    // RFC 9562 appendix A.4: name "www.example.com" in the DNS namespace.
    expect(
      uuidV5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
    ).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
  });

  it('is stable and distinct per name', () => {
    expect(uuidV5('module:a/b')).toBe(uuidV5('module:a/b'));
    expect(uuidV5('module:a/b')).not.toBe(uuidV5('module:a/c'));
  });
});
