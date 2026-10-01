import { createHash } from 'node:crypto';

/** Namespace of every id derived from a curriculum key. Never change it. */
export const CURRICULUM_NAMESPACE = 'c0a1b2c3-5eed-4c0a-9a1b-0c0ffee00001';

const toBytes = (uuid: string) => Buffer.from(uuid.replaceAll('-', ''), 'hex');

/**
 * RFC 9562 version 5 UUID (SHA-1 of namespace + name). The same name always
 * gives the same id, so content without a slug column (modules, exercises)
 * is found again on the next import.
 */
export function uuidV5(name: string, namespace = CURRICULUM_NAMESPACE): string {
  const hash = createHash('sha1')
    .update(toBytes(namespace))
    .update(name, 'utf8')
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
