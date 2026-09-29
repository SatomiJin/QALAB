import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { AuthenticatedRequest, AuthUser } from '../auth-user.js';

/** The user from the verified JWT. Only valid on routes behind `JwtAuthGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) {
      // A public route asked for the user: a programming error, not a 401.
      throw new InternalServerErrorException('No authenticated user');
    }
    return user;
  },
);
