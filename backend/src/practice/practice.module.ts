import { Module } from '@nestjs/common';
import { LearningModule } from '../learning/learning.module.js';
import { TranslationModule } from '../translation/translation.module.js';
import { AttemptsRepository } from './attempts.repository.js';
import { ExerciseAnswersRepository } from './exercise-answers.repository.js';
import { ExercisesRepository } from './exercises.repository.js';
import { PracticeController } from './practice.controller.js';
import { PracticeService } from './practice.service.js';

@Module({
  imports: [LearningModule, TranslationModule],
  controllers: [PracticeController],
  providers: [
    PracticeService,
    ExercisesRepository,
    ExerciseAnswersRepository,
    AttemptsRepository,
  ],
  exports: [ExercisesRepository],
})
export class PracticeModule {}
