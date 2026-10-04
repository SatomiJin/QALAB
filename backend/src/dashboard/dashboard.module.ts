import { Module } from '@nestjs/common';
import { LearningModule } from '../learning/learning.module.js';
import { PracticeModule } from '../practice/practice.module.js';
import { TranslationModule } from '../translation/translation.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardRepository } from './dashboard.repository.js';
import { DashboardService } from './dashboard.service.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [LearningModule, PracticeModule, TranslationModule],
  controllers: [DashboardController],
  providers: [DashboardService, ProgressService, DashboardRepository],
  exports: [DashboardRepository],
})
export class DashboardModule {}
