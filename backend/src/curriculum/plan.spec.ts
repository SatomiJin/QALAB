import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sourceHash } from '../translation/source-hash.js';
import { loadCurriculum } from './curriculum.js';
import { planWrites } from './plan.js';
import {
  buildCourseRows,
  type ContentRows,
  englishTexts,
  planTranslations,
} from './rows.js';
import { uuidV5 } from './uuid-v5.js';

const t = (en: string, vi = `vi ${en}`) => ({ en, vi });

const COURSE = {
  skill: 'test_design',
  slug: 'demo-course',
  order: 1,
  title: t('Demo'),
  description: t('Demo course'),
  modules: [
    {
      key: 'basics',
      title: t('Basics'),
      description: t('First module'),
      lessons: [{ slug: 'first', title: t('First lesson'), minutes: 5 }],
    },
  ],
};

const EXERCISES = [
  {
    key: 'pick',
    type: 'multiple_choice',
    difficulty: 'easy',
    question: t('Which one?'),
    prompt: {
      options: [
        { id: 'a', text: t('A') },
        { id: 'b', text: t('B') },
      ],
    },
    answer: { correct: ['a'] },
    explanation: t('A is right.'),
  },
  {
    key: 'explain',
    type: 'scenario',
    difficulty: 'medium',
    question: t('Explain boundaries.'),
    answer: {
      expectedConcepts: [
        { concept: 'Boundary', keywords: ['boundar', 'bien'] },
        { concept: 'Invalid', keywords: ['invalid', 'khong hop le'] },
      ],
      modelAnswer: t(
        'Test each boundary and invalid values.',
        'Test mỗi giá trị biên và giá trị không hợp lệ.',
      ),
      rubric: [{ id: 'edges', text: t('I tested the edges') }],
    },
    explanation: t('Boundaries hide defects.'),
  },
];

let root: string;

function writeFixture(
  course: object = COURSE,
  exercises: unknown = EXERCISES,
  vi = 'Một\n\n## Phần',
) {
  const dir = join(root, 'demo-course');
  mkdirSync(join(dir, 'lessons'), { recursive: true });
  writeFileSync(join(dir, 'course.json'), JSON.stringify(course));
  writeFileSync(join(dir, 'lessons', 'first.en.md'), '\nOne\n\n## Part\n');
  writeFileSync(join(dir, 'lessons', 'first.vi.md'), vi);
  writeFileSync(
    join(dir, 'lessons', 'first.exercises.json'),
    JSON.stringify(exercises),
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'qalab-curriculum-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('loadCurriculum', () => {
  it('reads a valid course with derived ids and trimmed Markdown', () => {
    writeFixture();
    const { courses, errors } = loadCurriculum(root);
    expect(errors).toEqual([]);
    const [course] = courses;
    expect(course.id).toBe(uuidV5('course:demo-course'));
    expect(course.modules[0].id).toBe(uuidV5('module:demo-course/basics'));
    const lesson = course.modules[0].lessons[0];
    expect(lesson.id).toBe(uuidV5('lesson:demo-course/first'));
    expect(lesson.content.en).toBe('One\n\n## Part');
    expect(lesson.exercises.map((e) => e.id)).toEqual([
      uuidV5('exercise:demo-course/first/pick'),
      uuidV5('exercise:demo-course/first/explain'),
    ]);
    expect(lesson.exercises[0].promptData).toEqual({
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      multiple: false,
    });
  });

  it('reports unknown fields, missing Vietnamese and broken keys', () => {
    writeFixture({ ...COURSE, extra: 1, title: { en: 'Demo' } }, [
      { ...EXERCISES[0], answer: { correct: ['zzz'] } },
    ]);
    const { errors } = loadCurriculum(root);
    expect(errors.join('\n')).toMatch(/extra is not allowed/);
    expect(errors.join('\n')).toMatch(/title\.vi is required/);
    expect(errors.join('\n')).toMatch(/answerData\.correct/);
  });

  it('rejects a Vietnamese body with another structure', () => {
    writeFixture(COURSE, EXERCISES, 'Một đoạn, không có phần nào');
    expect(loadCurriculum(root).errors.join('\n')).toMatch(/vi has 0 headings/);
  });

  it('rejects a model answer that fails its own grading', () => {
    const scenario = structuredClone(EXERCISES[1]) as {
      answer: { modelAnswer: { vi: string } };
    };
    scenario.answer.modelAnswer.vi = 'Không nhắc tới khái niệm nào.';
    writeFixture(COURSE, [EXERCISES[0], scenario]);
    expect(loadCurriculum(root).errors.join('\n')).toMatch(
      /modelAnswer\.vi matches only 0\/2/,
    );
  });

  it('rejects stray lesson files', () => {
    writeFixture();
    writeFileSync(join(root, 'demo-course', 'lessons', 'frist.en.md'), 'x');
    expect(loadCurriculum(root).errors.join('\n')).toMatch(
      /lessons\/frist\.en\.md belongs to no lesson/,
    );
  });
});

describe('planWrites', () => {
  const load = (): ContentRows => {
    writeFixture();
    const [course] = loadCurriculum(root).courses;
    return buildCourseRows(course, { courseId: course.id, skillId: 'skill' });
  };
  const none: ContentRows = {
    courses: [],
    modules: [],
    lessons: [],
    exercises: [],
    answers: [],
  };

  it('inserts everything into an empty database', () => {
    const planned = load();
    const plan = planWrites(planned, none, {
      update: false,
      attempted: new Set(),
    });
    expect(plan.write).toEqual({ ...none, ...pick(planned) });
    expect(plan.report.exercises).toEqual({
      inserted: 2,
      updated: 0,
      kept: 0,
      skipped: 0,
    });
  });

  it('keeps existing rows (CMS edits) unless updating', () => {
    const planned = load();
    const edited = structuredClone(pick(planned));
    edited.lessons[0].title = 'Edited in the CMS';
    const plan = planWrites(planned, edited, {
      update: false,
      attempted: new Set(),
    });
    expect(plan.write).toEqual(none);
    expect(plan.stored.lessons[0].title).toBe('Edited in the CMS');
    expect(plan.report.lessons.kept).toBe(1);

    const update = planWrites(planned, edited, {
      update: true,
      attempted: new Set(),
    });
    expect(update.write.lessons[0].title).toBe('First lesson');
    expect(update.report.lessons.updated).toBe(1);
  });

  it('never moves content or changes an exercise type', () => {
    const planned = load();
    const existing = structuredClone(pick(planned));
    existing.lessons[0].module_id = 'another-module';
    existing.exercises[0].type = 'classification';
    const plan = planWrites(planned, existing, {
      update: true,
      attempted: new Set(),
    });
    expect(plan.write.lessons).toEqual([]);
    expect(plan.write.exercises.map((e) => e.order_index)).toEqual([2]);
    expect(plan.write.answers).toHaveLength(1);
    expect(plan.warnings.join('\n')).toMatch(/another parent/);
    expect(plan.warnings.join('\n')).toMatch(/never changes type/);
  });

  it('keeps the ids of an attempted exercise', () => {
    const planned = load();
    const existing = structuredClone(pick(planned));
    const prompt = existing.exercises[0].prompt_data as {
      options: { id: string; text: string }[];
    };
    prompt.options[1].id = 'old-b';
    const id = existing.exercises[0].id;
    const attempted = planWrites(planned, existing, {
      update: true,
      attempted: new Set([id]),
    });
    expect(attempted.write.exercises.map((e) => e.id)).not.toContain(id);
    expect(attempted.write.answers.map((a) => a.exercise_id)).not.toContain(id);
    expect(attempted.warnings.join('\n')).toMatch(/has attempts/);

    const fresh = planWrites(planned, existing, {
      update: true,
      attempted: new Set(),
    });
    expect(fresh.write.exercises.map((e) => e.id)).toContain(id);
  });
});

describe('planTranslations', () => {
  it('writes Vietnamese only for the English it was made from', () => {
    writeFixture();
    const [course] = loadCurriculum(root).courses;
    const rows = buildCourseRows(course, { courseId: course.id, skillId: 's' });
    const stored = structuredClone(pick(rows));
    stored.modules[0].title = 'Edited in the CMS';
    // Older seed rows kept the Markdown with a leading newline.
    stored.lessons[0].content_md = `\n${rows.lessons[0].content_md}\n`;

    const plan = planTranslations(rows.texts, englishTexts(stored));
    expect(plan.skipped.map((s) => `${s.entity_type}.${s.field}`)).toEqual([
      'module.title',
    ]);
    const body = plan.rows.find((row) => row.field === 'content_md');
    expect(body?.source_hash).toBe(sourceHash(stored.lessons[0].content_md));
    expect(plan.rows.map((row) => row.field)).toEqual(
      expect.arrayContaining([
        'option.a',
        'model_answer',
        'rubric.edges',
        'explanation',
      ]),
    );
    expect(plan.rows.every((row) => row.provider === 'manual')).toBe(true);
  });
});

function pick(rows: ContentRows): ContentRows {
  return {
    courses: rows.courses,
    modules: rows.modules,
    lessons: rows.lessons,
    exercises: rows.exercises,
    answers: rows.answers,
  };
}
