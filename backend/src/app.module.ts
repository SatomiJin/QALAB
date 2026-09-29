import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { HealthModule } from './health/health.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';

@Module({
  imports: [
    AppConfigModule,
    SupabaseModule,
    HealthModule,
    AuthModule,
    ProfileModule,
  ],
})
export class AppModule {}
