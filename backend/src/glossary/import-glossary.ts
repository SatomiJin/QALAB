import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describeError } from '../common/errors/describe-error.js';
import { loadGlossarySeed, planGlossaryWrites } from './glossary-seed.js';
import type { GlossaryRow } from './glossary.repository.js';

/**
 * Imports `backend/seed/glossary/terms.json` into the linked Supabase project.
 *
 *   npm run seed:glossary -- --dry-run   validate the file only (no network)
 *   npm run seed:glossary                insert the terms that do not exist yet
 *   npm run seed:glossary -- --update    the file wins for existing terms too
 *
 * Service role from `backend/.env`. Terms are matched by slug; new ones are
 * published. Never deletes; an admin's status is kept. Idempotent.
 */

const USAGE =
  'Usage: npm run seed:glossary -- [--dry-run] [--update] [--file <path>]';

function parseArgs(argv: string[]) {
  const args = {
    dryRun: false,
    update: false,
    file: resolve('seed/glossary/terms.json'),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--update') args.update = true;
    else if (arg === '--file' && argv[i + 1]) args.file = resolve(argv[++i]);
    else return null;
  }
  return args;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(USAGE);
    return 2;
  }
  const { terms, errors } = loadGlossarySeed(args.file);
  if (errors.length > 0) {
    console.error(`${errors.length} problem(s) in ${args.file}:`);
    for (const error of errors) console.error(`  - ${error}`);
    return 1;
  }
  console.log(`Glossary: ${terms.length} terms`);
  if (args.dryRun) {
    console.log('Dry run: the file is valid, nothing was written.');
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

  const { data, error } = await db
    .from('glossary_terms')
    .select('id, slug, term, match_phrases, status');
  if (error) throw error;
  const plan = planGlossaryWrites(
    terms,
    data as Pick<
      GlossaryRow,
      'id' | 'slug' | 'term' | 'match_phrases' | 'status'
    >[],
    { update: args.update },
  );
  for (const reason of plan.skipped) console.warn(`  skipped ${reason}`);
  for (let i = 0; i < plan.write.length; i += 100) {
    const { error: writeError } = await db
      .from('glossary_terms')
      .upsert(plan.write.slice(i, i + 100), { onConflict: 'id' });
    if (writeError) throw writeError;
  }
  console.log(
    `Wrote ${plan.write.length} term(s), skipped ${plan.skipped.length}.`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(`Import failed: ${describeError(error)}`);
    process.exit(1);
  },
);
