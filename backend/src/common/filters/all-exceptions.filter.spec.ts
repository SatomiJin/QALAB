import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { toErrorResponse } from './all-exceptions.filter.js';

describe('toErrorResponse', () => {
  it('maps a plain HttpException', () => {
    expect(toErrorResponse(new NotFoundException('Lesson not found'))).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Lesson not found',
    });
  });

  it('keeps validation details', () => {
    const exception = new BadRequestException({
      message: 'Validation failed',
      details: [{ field: 'email', message: 'email must be an email' }],
    });

    expect(toErrorResponse(exception)).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: [{ field: 'email', message: 'email must be an email' }],
    });
  });

  it('joins array messages', () => {
    const exception = new BadRequestException({ message: ['a', 'b'] });

    expect(toErrorResponse(exception).message).toBe('a; b');
  });

  it('uses the standard status text as error name', () => {
    expect(toErrorResponse(new ForbiddenException()).error).toBe('Forbidden');
    expect(toErrorResponse(new ConflictException('dup')).error).toBe(
      'Conflict',
    );
    expect(toErrorResponse(new HttpException('slow down', 429))).toEqual({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'slow down',
    });
  });

  it('hides details of unknown errors', () => {
    const result = toErrorResponse(new Error('db password is hunter2'));

    expect(result).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
  });
});
