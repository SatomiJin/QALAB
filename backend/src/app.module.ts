import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { AdminUsersModule } from './admin-users/admin-users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RateLimitModule } from './common/rate-limit/rate-limit.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';
import { LearningModule } from './learning/learning.module.js';
import { PracticeModule } from './practice/practice.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';

@Module({
  imports: [
    AppConfigModule,
    SupabaseModule,
    RateLimitModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    LearningModule,
    PracticeModule,
    DashboardModule,
    AdminModule,
    AdminUsersModule,
  ],
})
export class AppModule {}
