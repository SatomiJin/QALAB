import { SetMetadata } from '@nestjs/common';

export const USER_ROLES = ['learner', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. Enforced by `RolesGuard`. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
