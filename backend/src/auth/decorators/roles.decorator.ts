import { SetMetadata } from '@nestjs/common';

export type UserRole = 'learner' | 'admin';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. Enforced by `RolesGuard`. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
