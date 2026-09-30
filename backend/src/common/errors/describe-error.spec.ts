import { describeError } from './describe-error.js';

describe('describeError', () => {
  it('describes PostgREST errors (plain objects) with their code', () => {
    expect(
      describeError({
        code: '42P01',
        message: 'relation "public.content_translations" does not exist',
        details: null,
        hint: null,
      }),
    ).toBe('[42P01] relation "public.content_translations" does not exist');
  });

  it('adds details and hint when present', () => {
    expect(
      describeError({
        code: 'PGRST204',
        message: 'Column not found',
        details: 'x',
        hint: 'y',
      }),
    ).toBe('[PGRST204] Column not found Details: x Hint: y');
  });

  it('uses the stack of real errors', () => {
    expect(describeError(new Error('boom'))).toContain('Error: boom');
  });

  it('falls back to JSON, then to a string', () => {
    expect(describeError({ a: 1 })).toBe('{"a":1}');
    expect(describeError('plain')).toBe('plain');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular)).toBe('[object Object]');
  });
});
