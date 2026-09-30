import { readFileSync } from 'node:fs';
import {
  EXERCISE_TYPES,
  type ExerciseType,
  parseAnswerKey,
  parsePrompt,
} from './exercise-schema.js';

/**
 * Every exercise in `supabase/seed.sql` must have a prompt and an answer key
 * the grader accepts; otherwise submitting it fails with a 500 in the app.
 */
const seed = readFileSync(
  new URL('../../supabase/seed.sql', import.meta.url),
  'utf8',
);

const between = (start: string, end: string) => {
  const from = seed.indexOf(start);
  return seed.slice(from, seed.indexOf(end, from));
};

// A SQL literal: '…' (with '' escapes) or a dollar-quoted $tag$…$tag$.
const LITERAL = String.raw`'(?:[^']|'')*'|\$(\w*)\$[\s\S]*?\$\w*\$`;
const unquote = (literal: string) =>
  literal.startsWith("'")
    ? literal.slice(1, -1).replaceAll("''", "'")
    : literal.replace(/^\$\w*\$/, '').replace(/\$\w*\$$/, '');

const UUID = String.raw`'([0-9a-f-]{36})'`;

const exercises = [
  ...between('insert into public.exercises', 'on conflict').matchAll(
    new RegExp(
      String.raw`\(\s*${UUID},\s*${UUID},\s*'(\w+)',\s*(?:${LITERAL}),\s*(${LITERAL}),`,
      'g',
    ),
  ),
].map((match) => ({
  id: match[1],
  type: match[3] as ExerciseType,
  prompt: JSON.parse(unquote(match[5])) as unknown,
}));

const keys = new Map(
  [
    ...between('insert into public.exercise_answers', 'on conflict').matchAll(
      new RegExp(String.raw`\(\s*${UUID},\s*(${LITERAL}),\s*\$md\$`, 'g'),
    ),
  ].map((match) => [match[1], JSON.parse(unquote(match[2])) as unknown]),
);

describe('seed exercises', () => {
  it('covers every exercise type', () => {
    expect(new Set(exercises.map((e) => e.type))).toEqual(
      new Set(EXERCISE_TYPES),
    );
    expect(keys.size).toBe(exercises.length);
  });

  it.each(exercises.map((e) => [e.id, e] as const))(
    '%s has a valid prompt and answer key',
    (_id, exercise) => {
      const prompt = parsePrompt(exercise.type, exercise.prompt);
      expect(prompt).toMatchObject({ ok: true });
      if (!prompt.ok) return;
      expect(
        parseAnswerKey(exercise.type, prompt.value, keys.get(exercise.id)),
      ).toMatchObject({ ok: true });
    },
  );
});
