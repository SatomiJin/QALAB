import { sourceHash } from '../translation/source-hash.js';
import type { ContentStatus } from '../admin/content-rules.js';
import type { CurriculumCourse } from './curriculum.js';

/**
 * Pure mapping from the curriculum files to database rows, and the rule for
 * which Vietnamese translations may be written. No Supabase here: the CLI
 * (`import-curriculum.ts`) loads and writes, these functions decide.
 */

export interface CourseRow {
  id: string;
  skill_id: string;
  title: string;
  slug: string;
  description: string;
  status: ContentStatus;
  order_index: number;
}

export interface ModuleRow {
  id: string;
  course_id: string;
  title: string;
  description: string;
  status: ContentStatus;
  order_index: number;
}

export interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  content_md: string;
  estimated_minutes: number;
  status: ContentStatus;
  order_index: number;
}

export interface ExerciseRow {
  id: string;
  lesson_id: string;
  type: string;
  question: string;
  prompt_data: object;
  difficulty: string;
  status: ContentStatus;
  order_index: number;
}

export interface AnswerRow {
  exercise_id: string;
  answer_data: object;
  explanation: string;
}

export type EntityType = 'course' | 'module' | 'lesson' | 'exercise';

/** A text that has a Vietnamese version in the files. */
export interface BilingualText {
  entity_type: EntityType;
  entity_id: string;
  field: string;
  en: string;
  vi: string;
}

export interface ContentRows {
  courses: CourseRow[];
  modules: ModuleRow[];
  lessons: LessonRow[];
  exercises: ExerciseRow[];
  answers: AnswerRow[];
}

export interface CourseRows extends ContentRows {
  texts: BilingualText[];
}

export function buildCourseRows(
  course: CurriculumCourse,
  { courseId, skillId }: { courseId: string; skillId: string },
): CourseRows {
  const rows: CourseRows = {
    courses: [
      {
        id: courseId,
        skill_id: skillId,
        title: course.title.en,
        slug: course.slug,
        description: course.description.en,
        status: course.status,
        order_index: course.order,
      },
    ],
    modules: [],
    lessons: [],
    exercises: [],
    answers: [],
    texts: [],
  };
  const text = (
    entity_type: EntityType,
    entity_id: string,
    field: string,
    value: { en: string; vi: string },
  ) => rows.texts.push({ entity_type, entity_id, field, ...value });

  text('course', courseId, 'title', course.title);
  text('course', courseId, 'description', course.description);
  course.modules.forEach((module, m) => {
    rows.modules.push({
      id: module.id,
      course_id: courseId,
      title: module.title.en,
      description: module.description.en,
      status: module.status,
      order_index: m + 1,
    });
    text('module', module.id, 'title', module.title);
    text('module', module.id, 'description', module.description);
    module.lessons.forEach((lesson, l) => {
      rows.lessons.push({
        id: lesson.id,
        module_id: module.id,
        title: lesson.title.en,
        slug: lesson.slug,
        content_md: lesson.content.en,
        estimated_minutes: lesson.minutes,
        status: lesson.status,
        order_index: l + 1,
      });
      text('lesson', lesson.id, 'title', lesson.title);
      text('lesson', lesson.id, 'content_md', lesson.content);
      lesson.exercises.forEach((exercise, e) => {
        rows.exercises.push({
          id: exercise.id,
          lesson_id: lesson.id,
          type: exercise.type,
          question: exercise.question.en,
          prompt_data: exercise.promptData,
          difficulty: exercise.difficulty,
          status: exercise.status,
          order_index: e + 1,
        });
        rows.answers.push({
          exercise_id: exercise.id,
          answer_data: exercise.answerData,
          explanation: exercise.explanation.en,
        });
        text('exercise', exercise.id, 'question', exercise.question);
        text('exercise', exercise.id, 'explanation', exercise.explanation);
        for (const entry of exercise.texts) {
          text('exercise', exercise.id, entry.field, entry.text);
        }
      });
    });
  });
  return rows;
}

const textKey = (type: EntityType, id: string, field: string) =>
  `${type}:${id}:${field}`;

type Labels = { id: string; text: string }[] | undefined;

/** English text of every translatable field, as stored in these rows. */
export function englishTexts(rows: ContentRows): Map<string, string> {
  const texts = new Map<string, string>();
  const put = (type: EntityType, id: string, field: string, value: unknown) => {
    if (typeof value === 'string') texts.set(textKey(type, id, field), value);
  };
  const putLabels = (id: string, kind: string, labels: Labels) => {
    for (const label of labels ?? []) {
      put('exercise', id, `${kind}.${label.id}`, label.text);
    }
  };
  for (const row of rows.courses) {
    put('course', row.id, 'title', row.title);
    put('course', row.id, 'description', row.description);
  }
  for (const row of rows.modules) {
    put('module', row.id, 'title', row.title);
    put('module', row.id, 'description', row.description);
  }
  for (const row of rows.lessons) {
    put('lesson', row.id, 'title', row.title);
    put('lesson', row.id, 'content_md', row.content_md);
  }
  for (const row of rows.exercises) {
    const prompt = row.prompt_data as Record<string, Labels>;
    put('exercise', row.id, 'question', row.question);
    putLabels(row.id, 'option', prompt.options);
    putLabels(row.id, 'item', prompt.items);
    putLabels(row.id, 'category', prompt.categories);
  }
  for (const row of rows.answers) {
    const key = row.answer_data as { modelAnswer?: string; rubric?: Labels };
    put('exercise', row.exercise_id, 'explanation', row.explanation);
    put('exercise', row.exercise_id, 'model_answer', key.modelAnswer);
    putLabels(row.exercise_id, 'rubric', key.rubric);
  }
  return texts;
}

export interface TranslationRow {
  entity_type: EntityType;
  entity_id: string;
  field: string;
  language: 'vi';
  source_hash: string;
  text: string;
  provider: 'manual';
}

/**
 * A Vietnamese text is written only while the stored English is still the
 * English it was translated from. When an admin changed the English in the
 * CMS (and the import kept it), the file's translation would describe other
 * text: it is skipped and the existing translation goes stale as usual.
 * Surrounding whitespace does not count (older seed rows kept a leading
 * newline); the hash is always of the stored text, as the backend checks it.
 */
export function planTranslations(
  texts: BilingualText[],
  stored: Map<string, string>,
): { rows: TranslationRow[]; skipped: BilingualText[] } {
  const rows: TranslationRow[] = [];
  const skipped: BilingualText[] = [];
  for (const entry of texts) {
    if (!entry.en) continue;
    const current = stored.get(
      textKey(entry.entity_type, entry.entity_id, entry.field),
    );
    if (current === undefined || current.trim() !== entry.en) {
      skipped.push(entry);
      continue;
    }
    rows.push({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      field: entry.field,
      language: 'vi',
      source_hash: sourceHash(current),
      text: entry.vi,
      provider: 'manual',
    });
  }
  return { rows, skipped };
}
