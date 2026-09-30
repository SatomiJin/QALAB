import { Module } from '@nestjs/common';
import { LearningModule } from '../learning/learning.module.js';
import { AdminContentRepository } from './admin-content.repository.js';
import { AdminCoursesController } from './admin-courses.controller.js';
import { AdminExercisesService } from './admin-exercises.service.js';
import { AdminLessonsController } from './admin-lessons.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [LearningModule],
  controllers: [AdminCoursesController, AdminLessonsController],
  providers: [AdminService, AdminExercisesService, AdminContentRepository],
})
export class AdminModule {}
