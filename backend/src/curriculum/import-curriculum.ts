import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describeError } from '../common/errors/describe-error.js';
import { curriculumStats, loadCurriculum } from './curriculum.js';
import { planWrites, type TableName } from './plan.js';
import {
  buildCourseRows,
  type ContentRows,
  englishTexts,
  planTranslations,
} from './rows.js';

/**
 * Imports `backend/seed/curriculum` into the linked Supabase project.
 *
 *   npm run seed:curriculum -- --dry-run   validate the files only (no network)
 *   npm run seed:curriculum                insert what does not exist yet
 *   npm run seed:curriculum -- --update    also overwrite existing content
 *
 * Runs with the service role (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
 * from `backend/.env`): it writes manual translations, which no API role
 * may. Never deletes anything. Idempotent: a second run changes nothing.
 */

const USAGE =
  'Usage: npm run seed:curriculum -- [--dry-run] [--update] [--dir <folder>]';

interface Args {
  dryRun: boolean;
  update: boolean;
  dir: string;
}

function parseArgs(argv: string[]): Args | null {
  const args: Args = {
    dryRun: false,
    update: false,
    dir: resolve('seed/curriculum'),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--update') args.update = true;
    else if (arg === '--dir' && argv[i + 1]) args.dir = resolve(argv[++i]);
    else return null;
  }
  return args;
}

const PAGE = 1000;

/** Every row of a table (PostgREST returns at most 1000 per request). */
async function selectAll<T>(
  db: SupabaseClient,
  table: string,
  columns: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .order(table === 'exercise_answers' ? 'exercise_id' : 'id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < PAGE) return rows;
  }
}

async function loadExisting(db: SupabaseClient): Promise<ContentRows> {
  const [courses, modules, lessons, exercises, answers] = await Promise.all([
    selectAll<ContentRows['courses'][number]>(
      db,
      'courses',
      'id, skill_id, title, slug, description, status, order_index',
    ),
    selectAll<ContentRows['modules'][number]>(
      db,
      'modules',
      'id, course_id, title, description, status, order_index',
    ),
    selectAll<ContentRows['lessons'][number]>(
      db,
      'lessons',
      'id, module_id, title, slug, content_md, estimated_minutes, status, order_index',
    ),
    selectAll<ContentRows['exercises'][number]>(
      db,
      'exercises',
      'id, lesson_id, type, question, prompt_data, difficulty, status, order_index',
    ),
    selectAll<ContentRows['answers'][number]>(
      db,
      'exercise_answers',
      'exercise_id, answer_data, explanation',
    ),
  ]);
  return { courses, modules, lessons, exercises, answers };
}

async function attemptedExercises(
  db: SupabaseClient,
  ids: string[],
): Promise<Set<string>> {
  const attempted = new Set<string>();
  for (let i = 0; i < ids.length; i += 50) {
    const { data, error } = await db
      .from('exercise_attempts')
      .select('exercise_id')
      .in('exercise_id', ids.slice(i, i + 50));
    if (error) throw error;
    for (const row of data as { exercise_id: string }[]) {
      attempted.add(row.exercise_id);
    }
  }
  return attempted;
}

const TABLE: Record<TableName, { name: string; onConflict: string }> = {
  courses: { name: 'courses', onConflict: 'id' },
  modules: { name: 'modules', onConflict: 'id' },
  lessons: { name: 'lessons', onConflict: 'id' },
  exercises: { name: 'exercises', onConflict: 'id' },
  answers: { name: 'exercise_answers', onConflict: 'exercise_id' },
};

async function upsert(
  db: SupabaseClient,
  table: string,
  rows: object[],
  onConflict: string,
) {
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db
      .from(table)
      .upsert(rows.slice(i, i + 100), { onConflict });
    if (error) throw error;
  }
}

const merge = (all: ContentRows[]): ContentRows => ({
  courses: all.flatMap((rows) => rows.courses),
  modules: all.flatMap((rows) => rows.modules),
  lessons: all.flatMap((rows) => rows.lessons),
  exercises: all.flatMap((rows) => rows.exercises),
  answers: all.flatMap((rows) => rows.answers),
});

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(USAGE);
    return 2;
  }

  const { courses, errors } = loadCurriculum(args.dir);
  if (errors.length > 0) {
    console.error(`${errors.length} problem(s) in ${args.dir}:`);
    for (const error of errors) console.error(`  - ${error}`);
    return 1;
  }
  const stats = curriculumStats(courses);
  console.log(
    `Curriculum: ${stats.skills} skills, ${stats.courses} courses, ${stats.modules} modules, ${stats.lessons} lessons, ${stats.exercises} exercises ${JSON.stringify(stats.exerciseTypes)}`,
  );
  if (args.dryRun) {
    console.log('Dry run: the files are valid, nothing was written.');
    return 0;
  }

  if (existsSync('.env')) process.loadEnvFile('.env');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    return 1;
  }
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: skills, error: skillsError } = await db
    .from('skills')
    .select('id, code');
  if (skillsError) throw skillsError;
  const skillIds = new Map(
    (skills as { id: string; code: string }[]).map((s) => [s.code, s.id]),
  );
  const existing = await loadExisting(db);
  const courseBySlug = new Map(existing.courses.map((c) => [c.slug, c.id]));

  const planned = courses.map((course) => {
    const skillId = skillIds.get(course.skill);
    if (!skillId)
      throw new Error(`skill ${course.skill} is not in the database`);
    return buildCourseRows(course, {
      courseId: courseBySlug.get(course.slug) ?? course.id,
      skillId,
    });
  });
  const allPlanned = merge(planned);
  const existingIds = new Set(existing.exercises.map((e) => e.id));
  const attempted = args.update
    ? await attemptedExercises(
        db,
        allPlanned.exercises
          .map((e) => e.id)
          .filter((id) => existingIds.has(id)),
      )
    : new Set<string>();

  const plan = planWrites(allPlanned, existing, {
    update: args.update,
    attempted,
  });
  for (const table of Object.keys(TABLE) as TableName[]) {
    const { name, onConflict } = TABLE[table];
    await upsert(db, name, plan.write[table], onConflict);
  }

  const { rows: translations, skipped } = planTranslations(
    planned.flatMap((rows) => rows.texts),
    englishTexts(plan.stored),
  );
  await upsert(
    db,
    'content_translations',
    translations,
    'entity_type,entity_id,field,language,provider',
  );

  for (const table of Object.keys(TABLE) as TableName[]) {
    const r = plan.report[table];
    console.log(
      `${TABLE[table].name.padEnd(17)} inserted ${r.inserted}, updated ${r.updated}, kept ${r.kept}, skipped ${r.skipped}`,
    );
  }
  console.log(
    `translations      written ${translations.length}, skipped ${skipped.length} (English changed in the CMS)`,
  );
  for (const warning of plan.warnings) console.warn(`  ! ${warning}`);
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(`Import failed: ${describeError(error)}`);
    process.exitCode = 1;
  },
);
