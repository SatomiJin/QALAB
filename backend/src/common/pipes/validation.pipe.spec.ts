import { ValidationError } from '@nestjs/common';
import { flattenValidationErrors } from './validation.pipe.js';

function error(
  property: string,
  constraints?: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError {
  return { property, constraints, children };
}

describe('flattenValidationErrors', () => {
  it('returns one detail per constraint', () => {
    const result = flattenValidationErrors([
      error('email', {
        isEmail: 'email must be an email',
        isNotEmpty: 'email should not be empty',
      }),
    ]);

    expect(result).toEqual([
      { field: 'email', message: 'email must be an email' },
      { field: 'email', message: 'email should not be empty' },
    ]);
  });

  it('uses dotted paths for nested errors', () => {
    const result = flattenValidationErrors([
      error('steps', undefined, [
        error('0', undefined, [
          error('action', { isNotEmpty: 'action should not be empty' }),
        ]),
      ]),
    ]);

    expect(result).toEqual([
      { field: 'steps.0.action', message: 'action should not be empty' },
    ]);
  });
});
