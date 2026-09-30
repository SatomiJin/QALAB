/**
 * Admin CMS rules. Pure functions, no Nest/Supabase: which content is in use
 * (and so may only be archived), whether a course may be published, whether
 * a reorder request is complete, and which prompt changes are safe once
 * learners have attempted an exercise.
 */
import type {
  ClassificationPrompt,
  ExerciseType,
  FieldError,
  MultipleChoicePrompt,
  PromptByType,
} from '../practice/exercise-schema.js';

export type ContentStatus = 'draft' | 'published' | 'archived';
export const CONTENT_STATUSES = ['draft', 'published', 'archived'] as const;

/** Parents: course → skill, module → course, lesson → module, exercise → lesson. */
export type ContentKind = 'course' | 'module' | 'lesson' | 'exercise';

/** Lessons with learner progress and exercises with attempts. */
export interface Usage {
  lessons: ReadonlySet<string>;
  exercises: ReadonlySet<string>;
}

export interface UsageTreeModule {
  id: string;
  lessons: { id: string; exercises: { id: string }[] }[];
}

/**
 * Ids of every node that has learner data in it or below it: an exercise
 * with attempts, a lesson with progress or such an exercise, a module with
 * such a lesson. The course is in use when any of its modules is.
 */
export function inUseIds(
  modules: UsageTreeModule[],
  usage: Usage,
): Set<string> {
  const used = new Set<string>();
  for (const module of modules) {
    for (const lesson of module.lessons) {
      for (const exercise of lesson.exercises) {
        if (usage.exercises.has(exercise.id)) used.add(exercise.id);
      }
      const exerciseUsed = lesson.exercises.some((e) => used.has(e.id));
      if (usage.lessons.has(lesson.id) || exerciseUsed) used.add(lesson.id);
    }
    if (module.lessons.some((lesson) => used.has(lesson.id))) {
      used.add(module.id);
    }
  }
  return used;
}

/**
 * A course may be published only when a learner would find something in it:
 * at least one published lesson inside a published module.
 */
export function canPublishCourse(
  modules: { status: ContentStatus; lessons: { status: ContentStatus }[] }[],
): boolean {
  return modules.some(
    (module) =>
      module.status === 'published' &&
      module.lessons.some((lesson) => lesson.status === 'published'),
  );
}

/** Order index for a new item: after its last sibling. */
export function nextOrderIndex(siblings: { order_index: number }[]): number {
  return siblings.reduce((max, row) => Math.max(max, row.order_index), 0) + 1;
}

/**
 * A reorder lists every child of the parent exactly once, so two admins
 * editing at once cannot leave a half-applied order.
 */
export function checkReorder(
  currentIds: readonly string[],
  ids: readonly string[],
): FieldError[] {
  const errors: FieldError[] = [];
  const current = new Set(currentIds);
  if (new Set(ids).size !== ids.length) {
    errors.push({ field: 'ids', message: 'ids must not repeat an entry' });
  }
  if (ids.some((id) => !current.has(id))) {
    errors.push({ field: 'ids', message: 'ids has an item of another parent' });
  }
  if (currentIds.some((id) => !ids.includes(id))) {
    errors.push({ field: 'ids', message: 'ids must list every item' });
  }
  return errors;
}

const idsOf = (labels: { id: string }[]) =>
  labels
    .map((label) => label.id)
    .sort()
    .join(',');

/**
 * Once learners have attempted an exercise, its option / item / category ids
 * are fixed: stored answers and feedback refer to them. Texts may change.
 */
export function lockedPromptErrors<T extends ExerciseType>(
  type: T,
  before: PromptByType[T],
  after: PromptByType[T],
): FieldError[] {
  const message =
    'ids cannot change after learners have attempted the exercise; archive it and create a new one';
  if (type === 'multiple_choice') {
    const [a, b] = [before, after] as MultipleChoicePrompt[];
    const errors =
      idsOf(a.options) === idsOf(b.options)
        ? []
        : [{ field: 'promptData.options', message }];
    if (a.multiple !== b.multiple) {
      errors.push({
        field: 'promptData.multiple',
        message:
          'multiple cannot change after learners have attempted the exercise',
      });
    }
    return errors;
  }
  if (type === 'classification') {
    const [a, b] = [before, after] as ClassificationPrompt[];
    const errors: FieldError[] = [];
    if (idsOf(a.categories) !== idsOf(b.categories)) {
      errors.push({ field: 'promptData.categories', message });
    }
    if (idsOf(a.items) !== idsOf(b.items)) {
      errors.push({ field: 'promptData.items', message });
    }
    return errors;
  }
  return [];
}
