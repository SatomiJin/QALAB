import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONTENT_STATUSES,
  type ContentStatus,
} from '../admin/content-rules.js';
import { matchConcepts, PASS_SCORE } from '../practice/grading.js';
import {
  DIFFICULTIES,
  EXERCISE_TYPES,
  type Concept,
  type Difficulty,
  type ExerciseType,
  type FieldError,
  isFreeText,
  parseAnswerKey,
  parsePrompt,
} from '../practice/exercise-schema.js';
import { markdownParityErrors } from '../translation/translatable-texts.js';
import { uuidV5 } from './uuid-v5.js';

/**
 * The curriculum as versioned files (`backend/seed/curriculum/`), read and
 * validated without touching the database. Layout and authoring rules:
 * `backend/seed/README.md`.
 *
 * ```text
 * <course-folder>/course.json            course, modules, lessons (metadata)
 * <course-folder>/lessons/<slug>.en.md   lesson body, English (source)
 * <course-folder>/lessons/<slug>.vi.md   lesson body, Vietnamese (manual)
 * <course-folder>/lessons/<slug>.exercises.json   exercises of the lesson
 * ```
 *
 * Every text is bilingual (`{ "en": …, "vi": … }`): English is stored on the
 * content row, Vietnamese becomes a `manual` translation. Ids: courses are
 * found by slug, the rest by an id derived from their keys (`uuidV5`), or by
 * an explicit `id` for content that existed before the importer.
 */

export const SKILL_CODES = [
  'fundamentals',
  'testing_types',
  'test_design',
  'test_docs',
  'defect_mgmt',
  'api_testing',
  'automation',
] as const;
export type SkillCode = (typeof SKILL_CODES)[number];

/** Same limits as the DB `check` constraints and the admin DTOs. */
export const CONTENT_LIMITS = {
  slug: 100,
  title: 160,
  description: 2000,
  markdown: 100000,
  question: 2000,
  explanation: 10000,
  label: 500,
  modelAnswer: 10000,
  minutes: 600,
} as const;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface Bilingual {
  en: string;
  vi: string;
}

/** A translatable text of an exercise outside the row columns. */
export interface ExerciseText {
  /** `option.<id>`, `item.<id>`, `category.<id>`, `rubric.<id>`, `model_answer`. */
  field: string;
  text: Bilingual;
}

export interface CurriculumExercise {
  id: string;
  key: string;
  status: ContentStatus;
  type: ExerciseType;
  difficulty: Difficulty;
  question: Bilingual;
  /** English, normalised by `parsePrompt`. */
  promptData: object;
  /** English, normalised by `parseAnswerKey`. */
  answerData: object;
  explanation: Bilingual;
  texts: ExerciseText[];
}

export interface CurriculumLesson {
  id: string;
  slug: string;
  status: ContentStatus;
  title: Bilingual;
  minutes: number;
  content: Bilingual;
  exercises: CurriculumExercise[];
}

export interface CurriculumModule {
  id: string;
  key: string;
  status: ContentStatus;
  title: Bilingual;
  description: Bilingual;
  lessons: CurriculumLesson[];
}

export interface CurriculumCourse {
  /** Folder name, for messages. */
  folder: string;
  /** Used when no course has this slug yet. */
  id: string;
  skill: SkillCode;
  slug: string;
  order: number;
  status: ContentStatus;
  title: Bilingual;
  description: Bilingual;
  modules: CurriculumModule[];
}

export interface LoadResult {
  courses: CurriculumCourse[];
  /** `<file>: <path> <message>`; empty when everything is valid. */
  errors: string[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Collects errors for one file; every reader returns a usable fallback. */
class Check {
  readonly errors: string[] = [];

  constructor(readonly file: string) {}

  fail(path: string, message: string): void {
    this.errors.push(`${this.file}: ${path ? `${path} ` : ''}${message}`);
  }

  object(
    value: unknown,
    path: string,
    allowed: string[],
    required: string[] = [],
  ): Json | null {
    if (!isObject(value)) {
      this.fail(path, 'must be an object');
      return null;
    }
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) this.fail(join2(path, key), 'is not allowed');
    }
    for (const key of required) {
      if (value[key] === undefined) this.fail(join2(path, key), 'is required');
    }
    return value;
  }

  string(
    source: Json,
    key: string,
    path: string,
    { max, pattern }: { max: number; pattern?: RegExp },
  ): string {
    const value = source[key];
    const at = join2(path, key);
    if (typeof value !== 'string' || !value.trim()) {
      this.fail(at, 'must be a non-empty string');
      return '';
    }
    if (value.length > max) this.fail(at, `must be at most ${max} characters`);
    if (pattern && !pattern.test(value)) this.fail(at, `must match ${pattern}`);
    return value;
  }

  text(source: Json, key: string, path: string, max: number): Bilingual {
    const at = join2(path, key);
    const value = this.object(source[key], at, ['en', 'vi'], ['en', 'vi']);
    if (!value) return { en: '', vi: '' };
    return {
      en: this.string(value, 'en', at, { max }).trim(),
      vi: this.string(value, 'vi', at, { max }).trim(),
    };
  }

  int(source: Json, key: string, path: string, min: number, max: number) {
    const value = source[key];
    if (!Number.isInteger(value) || (value as number) < min) {
      this.fail(join2(path, key), `must be an integer from ${min} to ${max}`);
      return min;
    }
    if ((value as number) > max) {
      this.fail(join2(path, key), `must be an integer from ${min} to ${max}`);
    }
    return value as number;
  }

  oneOf<T extends string>(
    source: Json,
    key: string,
    path: string,
    values: readonly T[],
    fallback?: T,
  ): T {
    const value = source[key] ?? fallback;
    if (!values.includes(value as T)) {
      this.fail(join2(path, key), `must be one of ${values.join(', ')}`);
      return values[0];
    }
    return value as T;
  }

  list(source: Json, key: string, path: string, min = 0): unknown[] {
    const value = source[key];
    if (!Array.isArray(value) || value.length < min) {
      this.fail(join2(path, key), `must be a list of at least ${min}`);
      return [];
    }
    return value;
  }

  /** Optional explicit id; otherwise derived from `name`. */
  id(source: Json, path: string, name: string): string {
    const value = source.id;
    if (value === undefined) return uuidV5(name);
    if (typeof value !== 'string' || !UUID.test(value)) {
      this.fail(join2(path, 'id'), 'must be a lower-case UUID');
      return uuidV5(name);
    }
    return value;
  }

  fieldErrors(prefix: string, errors: FieldError[]): void {
    for (const error of errors)
      this.fail(join2(prefix, error.field), error.message);
  }
}

const join2 = (path: string, key: string) => (path ? `${path}.${key}` : key);

// Markdown checks -----------------------------------------------------------

/** The Vietnamese body must keep the English structure. */
function checkMarkdownParity(check: Check, path: string, text: Bilingual) {
  for (const message of markdownParityErrors(text.en, text.vi)) {
    check.fail(path, `vi ${message}`);
  }
}

// Exercises -----------------------------------------------------------------

/** `[{ id, text: { en, vi } }]` → English labels; texts kept for translation. */
function readLabels(
  check: Check,
  source: Json,
  key: string,
  path: string,
  kind: 'option' | 'item' | 'category' | 'rubric',
  texts: ExerciseText[],
): { id: string; text: string }[] | undefined {
  if (source[key] === undefined) return undefined;
  return check.list(source, key, path).map((entry, index) => {
    const at = `${join2(path, key)}[${index}]`;
    const label = check.object(entry, at, ['id', 'text'], ['id', 'text']);
    if (!label) return { id: '', text: '' };
    const id = typeof label.id === 'string' ? label.id : '';
    const text = check.text(label, 'text', at, CONTENT_LIMITS.label);
    texts.push({ field: `${kind}.${id}`, text });
    return { id, text: text.en };
  });
}

function checkCoverage(
  check: Check,
  path: string,
  concepts: Concept[],
  modelAnswer: Bilingual,
) {
  if (concepts.length === 0) return;
  for (const language of ['en', 'vi'] as const) {
    const matched = matchConcepts([modelAnswer[language]], concepts).filter(
      (result) => result.matched,
    ).length;
    if ((matched / concepts.length) * 100 < PASS_SCORE) {
      check.fail(
        `${path}.modelAnswer.${language}`,
        `matches only ${matched}/${concepts.length} expected concepts; the model answer must pass its own grading (add keywords, including unaccented Vietnamese ones)`,
      );
    }
  }
}

function readExercise(
  check: Check,
  raw: unknown,
  path: string,
  idName: string,
): CurriculumExercise | null {
  const source = check.object(
    raw,
    path,
    [
      'key',
      'id',
      'status',
      'type',
      'difficulty',
      'question',
      'prompt',
      'answer',
      'explanation',
    ],
    ['key', 'type', 'difficulty', 'question', 'answer', 'explanation'],
  );
  if (!source) return null;
  const key = check.string(source, 'key', path, { max: 60, pattern: SLUG });
  const type = check.oneOf(source, 'type', path, EXERCISE_TYPES);
  const texts: ExerciseText[] = [];

  // Prompt: bilingual labels → English prompt data.
  const promptPath = join2(path, 'prompt');
  let prompt: unknown = source.prompt ?? {};
  if (type === 'multiple_choice' && isObject(prompt)) {
    prompt = {
      ...prompt,
      options: readLabels(
        check,
        prompt,
        'options',
        promptPath,
        'option',
        texts,
      ),
    };
  } else if (type === 'classification' && isObject(prompt)) {
    prompt = {
      ...prompt,
      categories: readLabels(
        check,
        prompt,
        'categories',
        promptPath,
        'category',
        texts,
      ),
      items: readLabels(check, prompt, 'items', promptPath, 'item', texts),
    };
  }
  const parsedPrompt = parsePrompt(type, prompt);
  if (!parsedPrompt.ok) {
    check.fieldErrors(path, parsedPrompt.errors);
    return null;
  }

  // Answer key: bilingual model answer and rubric → English key.
  const answerPath = join2(path, 'answer');
  let answer: unknown = source.answer;
  let modelAnswer: Bilingual | null = null;
  if (isFreeText(type) && isObject(answer)) {
    modelAnswer = check.text(
      answer,
      'modelAnswer',
      answerPath,
      CONTENT_LIMITS.modelAnswer,
    );
    texts.push({ field: 'model_answer', text: modelAnswer });
    answer = {
      ...answer,
      modelAnswer: modelAnswer.en,
      rubric: readLabels(check, answer, 'rubric', answerPath, 'rubric', texts),
    };
  }
  const parsedKey = parseAnswerKey(type, parsedPrompt.value, answer);
  if (!parsedKey.ok) {
    check.fieldErrors(path, parsedKey.errors);
    return null;
  }
  if (modelAnswer) {
    const { expectedConcepts } = parsedKey.value as {
      expectedConcepts: Concept[];
    };
    checkCoverage(check, answerPath, expectedConcepts, modelAnswer);
  }

  return {
    id: check.id(source, path, `${idName}/${key}`),
    key,
    status: check.oneOf(source, 'status', path, CONTENT_STATUSES, 'published'),
    type,
    difficulty: check.oneOf(source, 'difficulty', path, DIFFICULTIES),
    question: check.text(source, 'question', path, CONTENT_LIMITS.question),
    promptData: parsedPrompt.value,
    answerData: parsedKey.value,
    explanation: check.text(
      source,
      'explanation',
      path,
      CONTENT_LIMITS.explanation,
    ),
    texts,
  };
}

// Files ---------------------------------------------------------------------

const readJson = (check: Check, file: string): unknown => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as unknown;
  } catch (error) {
    check.fail('', `is not valid JSON (${(error as Error).message})`);
    return null;
  }
};

const readText = (file: string) => readFileSync(file, 'utf8').trim();

function readLesson(
  check: Check,
  raw: unknown,
  path: string,
  lessonsDir: string,
  courseSlug: string,
  errors: string[],
): CurriculumLesson | null {
  const source = check.object(
    raw,
    path,
    ['slug', 'id', 'status', 'title', 'minutes'],
    ['slug', 'title', 'minutes'],
  );
  if (!source) return null;
  const slug = check.string(source, 'slug', path, {
    max: CONTENT_LIMITS.slug,
    pattern: SLUG,
  });
  const idName = `lesson:${courseSlug}/${slug}`;
  const base = join(lessonsDir, slug);

  const content = { en: '', vi: '' };
  for (const language of ['en', 'vi'] as const) {
    const file = `${base}.${language}.md`;
    if (!existsSync(file)) {
      check.fail(path, `has no lessons/${slug}.${language}.md`);
      continue;
    }
    content[language] = readText(file);
    if (!content[language])
      check.fail(path, `lessons/${slug}.${language}.md is empty`);
    if (content[language].length > CONTENT_LIMITS.markdown) {
      check.fail(path, `lessons/${slug}.${language}.md is too long`);
    }
  }
  if (content.en && content.vi) checkMarkdownParity(check, path, content);

  const exercises: CurriculumExercise[] = [];
  const exercisesFile = `${base}.exercises.json`;
  if (existsSync(exercisesFile)) {
    const exerciseCheck = new Check(exercisesFile);
    const list = readJson(exerciseCheck, exercisesFile);
    if (list !== null && !Array.isArray(list)) {
      exerciseCheck.fail('', 'must be a list of exercises');
    }
    const keys = new Set<string>();
    (Array.isArray(list) ? list : []).forEach((entry, index) => {
      const exercise = readExercise(
        exerciseCheck,
        entry,
        `[${index}]`,
        `exercise:${courseSlug}/${slug}`,
      );
      if (!exercise) return;
      if (keys.has(exercise.key)) {
        exerciseCheck.fail(`[${index}].key`, `${exercise.key} is used twice`);
      }
      keys.add(exercise.key);
      exercises.push(exercise);
    });
    errors.push(...exerciseCheck.errors);
  }

  return {
    id: check.id(source, path, idName),
    slug,
    status: check.oneOf(source, 'status', path, CONTENT_STATUSES, 'published'),
    title: check.text(source, 'title', path, CONTENT_LIMITS.title),
    minutes: check.int(source, 'minutes', path, 1, CONTENT_LIMITS.minutes),
    content,
    exercises,
  };
}

function readCourse(folder: string, dir: string, errors: string[]) {
  const file = join(dir, 'course.json');
  const check = new Check(file);
  const source = check.object(
    readJson(check, file),
    '',
    [
      'skill',
      'slug',
      'id',
      'order',
      'status',
      'title',
      'description',
      'modules',
    ],
    ['skill', 'slug', 'order', 'title', 'description', 'modules'],
  );
  if (!source) {
    errors.push(...check.errors);
    return null;
  }
  const slug = check.string(source, 'slug', '', {
    max: CONTENT_LIMITS.slug,
    pattern: SLUG,
  });
  const lessonsDir = join(dir, 'lessons');
  const used = new Set<string>();
  const moduleKeys = new Set<string>();
  const lessonSlugs = new Set<string>();

  const modules = check.list(source, 'modules', '', 1).flatMap((raw, m) => {
    const path = `modules[${m}]`;
    const module = check.object(
      raw,
      path,
      ['key', 'id', 'status', 'title', 'description', 'lessons'],
      ['key', 'title', 'description', 'lessons'],
    );
    if (!module) return [];
    const key = check.string(module, 'key', path, { max: 60, pattern: SLUG });
    if (moduleKeys.has(key)) check.fail(`${path}.key`, `${key} is used twice`);
    moduleKeys.add(key);
    const lessons = check
      .list(module, 'lessons', path, 1)
      .flatMap((entry, l) => {
        const lesson = readLesson(
          check,
          entry,
          `${path}.lessons[${l}]`,
          lessonsDir,
          slug,
          errors,
        );
        if (!lesson) return [];
        if (lessonSlugs.has(lesson.slug)) {
          check.fail(
            `${path}.lessons[${l}].slug`,
            `${lesson.slug} is used twice`,
          );
        }
        lessonSlugs.add(lesson.slug);
        for (const suffix of ['en.md', 'vi.md', 'exercises.json']) {
          used.add(`${lesson.slug}.${suffix}`);
        }
        return [lesson];
      });
    return [
      {
        id: check.id(module, path, `module:${slug}/${key}`),
        key,
        status: check.oneOf(
          module,
          'status',
          path,
          CONTENT_STATUSES,
          'published',
        ),
        title: check.text(module, 'title', path, CONTENT_LIMITS.title),
        description: check.text(
          module,
          'description',
          path,
          CONTENT_LIMITS.description,
        ),
        lessons,
      },
    ];
  });

  // A file no lesson refers to is a typo (or a forgotten lesson).
  if (existsSync(lessonsDir)) {
    for (const name of readdirSync(lessonsDir)) {
      if (!used.has(name))
        check.fail('', `lessons/${name} belongs to no lesson`);
    }
  }

  const course: CurriculumCourse = {
    folder,
    id: check.id(source, '', `course:${slug}`),
    skill: check.oneOf(source, 'skill', '', SKILL_CODES),
    slug,
    order: check.int(source, 'order', '', 0, 1000),
    status: check.oneOf(source, 'status', '', CONTENT_STATUSES, 'published'),
    title: check.text(source, 'title', '', CONTENT_LIMITS.title),
    description: check.text(
      source,
      'description',
      '',
      CONTENT_LIMITS.description,
    ),
    modules,
  };
  errors.push(...check.errors);
  return course;
}

/** Reads every `<folder>/course.json` under `root`. */
export function loadCurriculum(root: string): LoadResult {
  const errors: string[] = [];
  if (!existsSync(root)) return { courses: [], errors: [`${root}: not found`] };
  const courses = readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .sort()
    .flatMap((folder) => {
      const course = readCourse(folder, join(root, folder), errors);
      return course ? [course] : [];
    });

  const seen = new Map<string, string>();
  const unique = (value: string, what: string) => {
    if (seen.has(value)) {
      errors.push(`${what} is used by ${seen.get(value)} too`);
    }
    seen.set(value, what);
  };
  for (const course of courses) {
    unique(
      `slug:${course.slug}`,
      `course slug ${course.slug} (${course.folder})`,
    );
    for (const entity of allEntities(course)) {
      unique(entity.id, `id ${entity.id} (${course.folder} ${entity.what})`);
    }
  }
  return { courses, errors };
}

function* allEntities(course: CurriculumCourse) {
  yield { id: course.id, what: 'course' };
  for (const module of course.modules) {
    yield { id: module.id, what: `module ${module.key}` };
    for (const lesson of module.lessons) {
      yield { id: lesson.id, what: `lesson ${lesson.slug}` };
      for (const exercise of lesson.exercises) {
        yield {
          id: exercise.id,
          what: `exercise ${lesson.slug}/${exercise.key}`,
        };
      }
    }
  }
}

export interface CurriculumStats {
  skills: number;
  courses: number;
  modules: number;
  lessons: number;
  exercises: number;
  exerciseTypes: Record<string, number>;
}

export function curriculumStats(courses: CurriculumCourse[]): CurriculumStats {
  const modules = courses.flatMap((course) => course.modules);
  const lessons = modules.flatMap((module) => module.lessons);
  const exercises = lessons.flatMap((lesson) => lesson.exercises);
  const exerciseTypes: Record<string, number> = {};
  for (const exercise of exercises) {
    exerciseTypes[exercise.type] = (exerciseTypes[exercise.type] ?? 0) + 1;
  }
  return {
    skills: new Set(courses.map((course) => course.skill)).size,
    courses: courses.length,
    modules: modules.length,
    lessons: lessons.length,
    exercises: exercises.length,
    exerciseTypes,
  };
}
