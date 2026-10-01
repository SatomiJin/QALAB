import { createHash } from 'node:crypto';

/**
 * Ties a translation to the exact English source: sha-256 of its UTF-8 text,
 * hex. The curriculum importer and SQL seeds compute the same value.
 */
export function sourceHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
