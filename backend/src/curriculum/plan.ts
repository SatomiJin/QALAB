import { lockedPromptErrors } from '../admin/content-rules.js';
import {
  type ExerciseType,
  type PromptByType,
  parsePrompt,
} from '../practice/exercise-schema.js';
import type { ContentRows, ExerciseRow } from './rows.js';

/**
 * Which rows an import writes. Default: only content that does not exist
 * yet, so edits made in the Admin CMS survive a re-import. `update: true`:
 * the files win, except where the Admin CMS rules forbid the change
 * (content never moves to another parent, an exercise never changes type,
 * an attempted exercise keeps its option / item / category ids).
 */

export interface PlanOptions {
  update: boolean;
  /** Exercises with learner attempts. */
  attempted: ReadonlySet<string>;
}

export type TableName = keyof ContentRows;

export interface TableReport {
  inserted: number;
  updated: number;
  kept: number;
  skipped: number;
}

export interface WritePlan {
  /** Rows to upsert, per table, in write order. */
  write: ContentRows;
  /** The content as it will be stored after the writes. */
  stored: ContentRows;
  report: Record<TableName, TableReport>;
  /** Why rows were skipped. */
  warnings: string[];
}

const TABLES: TableName[] = [
  'courses',
  'modules',
  'lessons',
  'exercises',
  'answers',
];

type AnyRow = ContentRows[TableName][number];

const rowId = (row: AnyRow) =>
  'exercise_id' in row ? row.exercise_id : row.id;

function parentChange(table: TableName, planned: AnyRow, current: AnyRow) {
  const parent = {
    courses: 'skill_id',
    modules: 'course_id',
    lessons: 'module_id',
    exercises: 'lesson_id',
    answers: 'exercise_id',
  }[table] as keyof AnyRow;
  return planned[parent] !== current[parent]
    ? `${table} ${rowId(planned)} belongs to another parent in the database; content never moves (archive it and create a new one)`
    : null;
}

function exerciseConflict(
  planned: ExerciseRow,
  current: ExerciseRow,
  attempted: boolean,
): string | null {
  if (planned.type !== current.type) {
    return `exercise ${planned.id} is ${current.type} in the database; an exercise never changes type`;
  }
  if (!attempted) return null;
  const type = planned.type as ExerciseType;
  const before = parsePrompt(type, current.prompt_data);
  const errors = before.ok
    ? lockedPromptErrors(
        type,
        before.value,
        planned.prompt_data as PromptByType[ExerciseType],
      )
    : [{ field: 'promptData', message: 'stored prompt is invalid' }];
  return errors.length
    ? `exercise ${planned.id} has attempts: ${errors.map((e) => `${e.field} ${e.message}`).join('; ')}`
    : null;
}

export function planWrites(
  planned: ContentRows,
  existing: ContentRows,
  { update, attempted }: PlanOptions,
): WritePlan {
  const write: ContentRows = {
    courses: [],
    modules: [],
    lessons: [],
    exercises: [],
    answers: [],
  };
  const stored: ContentRows = {
    courses: [],
    modules: [],
    lessons: [],
    exercises: [],
    answers: [],
  };
  const report = {} as Record<TableName, TableReport>;
  const warnings: string[] = [];
  const blockedExercises = new Set<string>();

  for (const table of TABLES) {
    const current = new Map(
      (existing[table] as AnyRow[]).map((row) => [rowId(row), row]),
    );
    const counts: TableReport = {
      inserted: 0,
      updated: 0,
      kept: 0,
      skipped: 0,
    };
    const out = write[table] as AnyRow[];
    const after = stored[table] as AnyRow[];

    for (const row of planned[table] as AnyRow[]) {
      const id = rowId(row);
      const found = current.get(id);
      if (!found) {
        out.push(row);
        after.push(row);
        counts.inserted += 1;
        continue;
      }
      if (!update) {
        after.push(found);
        counts.kept += 1;
        continue;
      }
      let problem =
        table === 'answers'
          ? blockedExercises.has(id)
            ? `answer key of exercise ${id} kept with its exercise`
            : null
          : parentChange(table, row, found);
      if (!problem && table === 'exercises') {
        problem = exerciseConflict(
          row as ExerciseRow,
          found as ExerciseRow,
          attempted.has(id),
        );
      }
      if (problem) {
        if (table === 'exercises') blockedExercises.add(id);
        warnings.push(problem);
        after.push(found);
        counts.skipped += 1;
        continue;
      }
      out.push(row);
      after.push(row);
      counts.updated += 1;
    }
    report[table] = counts;
  }
  return { write, stored, report, warnings };
}
