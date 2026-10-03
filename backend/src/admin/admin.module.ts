import { Module } from '@nestjs/common';
import { LearningModule } from '../learning/learning.module.js';
import { TranslationModule } from '../translation/translation.module.js';
import { AdminContentRepository } from './admin-content.repository.js';
import { AdminCoursesController } from './admin-courses.controller.js';
import { AdminExercisesService } from './admin-exercises.service.js';
import { AdminLessonsController } from './admin-lessons.controller.js';
import { AdminTranslationsController } from './admin-translations.controller.js';
import { AdminTranslationsService } from './admin-translations.service.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [LearningModule, TranslationModule],
  controllers: [
    AdminCoursesController,
    AdminLessonsController,
    AdminTranslationsController,
  ],
  providers: [
    AdminService,
    AdminExercisesService,
    AdminTranslationsService,
    AdminContentRepository,
  ],
})
export class AdminModule {}
