/** Postgres error codes the services turn into HTTP answers. */
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

/**
 * True when a Supabase (PostgREST) error carries the given Postgres code.
 * Such errors are plain objects with a `code` string, not `Error`s.
 */
export function isPgError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === code
  );
}
