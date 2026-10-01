import { Module } from '@nestjs/common';
import { TranslationModule } from '../translation/translation.module.js';
import { ContentRepository } from './content.repository.js';
import { LearningController } from './learning.controller.js';
import { LearningService } from './learning.service.js';
import { LessonProgressRepository } from './lesson-progress.repository.js';

@Module({
  imports: [TranslationModule],
  controllers: [LearningController],
  providers: [LearningService, ContentRepository, LessonProgressRepository],
  exports: [ContentRepository, LearningService, LessonProgressRepository],
})
export class LearningModule {}
