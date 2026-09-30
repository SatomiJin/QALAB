import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { describeError } from '../errors/describe-error.js';
import {
  ErrorDetailDto,
  ErrorResponseDto,
} from '../errors/error-response.dto.js';

function statusText(status: number): string {
  return STATUS_CODES[status] ?? 'Error';
}

export function toErrorResponse(exception: unknown): ErrorResponseDto {
  if (!(exception instanceof HttpException)) {
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    // Never leak internal error messages to clients.
    return {
      statusCode: status,
      error: statusText(status),
      message: 'Internal server error',
    };
  }

  const statusCode = exception.getStatus();
  const body = exception.getResponse();
  const result: ErrorResponseDto = {
    statusCode,
    error: statusText(statusCode),
    message: exception.message,
  };

  if (typeof body === 'object' && body !== null) {
    const { message, details } = body as {
      message?: unknown;
      details?: unknown;
    };
    if (typeof message === 'string') {
      result.message = message;
    } else if (Array.isArray(message)) {
      result.message = message.map(String).join('; ');
    }
    if (Array.isArray(details)) {
      result.details = details as ErrorDetailDto[];
    }
  } else if (typeof body === 'string') {
    result.message = body;
  }

  return result;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = toErrorResponse(exception);

    if (body.statusCode >= 500) {
      this.logger.error(describeError(exception));
    }

    response.status(body.statusCode).json(body);
  }
}
