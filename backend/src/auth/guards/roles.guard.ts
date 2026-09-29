import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProfilesRepository } from '../../profile/profiles.repository.js';
import type { AuthenticatedRequest } from '../auth-user.js';
import { ROLES_KEY, type UserRole } from '../decorators/roles.decorator.js';

/**
 * Global guard for `@Roles(...)`. The role is read from `profiles` (not from
 * the JWT), so a role change in the database takes effect immediately.
 * RLS `is_admin()` enforces the same rule in the database.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly profiles: ProfilesRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const profile = user
      ? await this.profiles.findById(user.accessToken, user.id)
      : null;

    if (!profile || !roles.includes(profile.role)) {
      throw new ForbiddenException('You do not have access to this resource');
    }
    return true;
  }
}
