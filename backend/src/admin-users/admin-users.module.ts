import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersRepository } from './admin-users.repository.js';
import { AdminUsersService } from './admin-users.service.js';
import { UserAccountsRepository } from './user-accounts.repository.js';

@Module({
  imports: [DashboardModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminUsersRepository, UserAccountsRepository],
})
export class AdminUsersModule {}
