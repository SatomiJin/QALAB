import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module.js';
import { HealthModule } from './health/health.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';

@Module({
  imports: [AppConfigModule, SupabaseModule, HealthModule],
})
export class AppModule {}
