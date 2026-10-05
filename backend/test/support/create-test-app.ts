import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AdminContentRepository } from '../../src/admin/admin-content.repository.js';
import { AdminUsersRepository } from '../../src/admin-users/admin-users.repository.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { DashboardRepository } from '../../src/dashboard/dashboard.repository.js';
import { JWT_KEY_SET } from '../../src/auth/jwt-verifier.service.js';
import { ContentRepository } from '../../src/learning/content.repository.js';
import { LessonProgressRepository } from '../../src/learning/lesson-progress.repository.js';
import { AttemptsRepository } from '../../src/practice/attempts.repository.js';
import { ExerciseAnswersRepository } from '../../src/practice/exercise-answers.repository.js';
import { ExercisesRepository } from '../../src/practice/exercises.repository.js';
import { ProfilesRepository } from '../../src/profile/profiles.repository.js';
import { SupabaseService } from '../../src/supabase/supabase.service.js';
import { TranslationsRepository } from '../../src/translation/translations.repository.js';
import { Translator } from '../../src/translation/translator.js';
import { FakeAdminContentRepository } from './fake-admin.js';
import { FakeAdminUsersRepository } from './fake-admin-users.js';
import { GlossaryRepository } from '../../src/glossary/glossary.repository.js';
import { FakeAuthServer, FakeProfilesRepository } from './fake-auth-server.js';
import { FakeGlossaryRepository } from './fake-glossary.js';
import { FakeDashboardRepository } from './fake-dashboard.js';
import {
  FakeContentRepository,
  FakeLessonProgressRepository,
} from './fake-learning.js';
import {
  FakeAttemptsRepository,
  FakeExerciseAnswersRepository,
  FakeExercisesRepository,
  userIdFromToken,
} from './fake-practice.js';
import {
  FakeTranslationsRepository,
  FakeTranslator,
} from './fake-translation.js';

export interface TestApp {
  app: INestApplication<App>;
  auth: FakeAuthServer;
  profiles: FakeProfilesRepository;
  content: FakeContentRepository;
  progress: FakeLessonProgressRepository;
  translator: FakeTranslator;
  translations: FakeTranslationsRepository;
  exercises: FakeExercisesRepository;
  answers: FakeExerciseAnswersRepository;
  attempts: FakeAttemptsRepository;
  admin: FakeAdminContentRepository;
  dashboard: FakeDashboardRepository;
  adminUsers: FakeAdminUsersRepository;
  glossary: FakeGlossaryRepository;
}

const REVIEW_FIELD = /^(explanation|model_answer|rubric\..+)$/;

/**
 * The real app (same modules, pipes, filters and guards as production) with
 * Supabase replaced by in-memory fakes.
 */
export async function createTestApp(
  extra: Pick<ModuleMetadata, 'imports'> = {},
): Promise<TestApp> {
  const profiles = new FakeProfilesRepository();
  const content = new FakeContentRepository();
  const progress = new FakeLessonProgressRepository();
  const translator = new FakeTranslator();
  const translations = new FakeTranslationsRepository();
  const exercises = new FakeExercisesRepository(content);
  const answers = new FakeExerciseAnswersRepository();
  const attempts = new FakeAttemptsRepository();
  const admin = new FakeAdminContentRepository(
    content,
    exercises,
    answers,
    progress,
    attempts,
  );
  const dashboard = new FakeDashboardRepository(
    content,
    exercises,
    progress,
    attempts,
  );
  // Mirrors the content_translations read policy for exercise review texts.
  translations.canRead = (row, token) =>
    row.entity_type !== 'exercise' ||
    !REVIEW_FIELD.test(row.field) ||
    attempts.hasAttempted(userIdFromToken(token), row.entity_id);
  const auth = await FakeAuthServer.create((user) => profiles.addFor(user));
  const adminUsers = new FakeAdminUsersRepository(
    auth,
    profiles,
    content,
    progress,
    exercises,
    attempts,
  );

  const glossary = new FakeGlossaryRepository(profiles, content);

  const fakeSupabase: Pick<SupabaseService, 'anon' | 'service' | 'forUser'> = {
    anon: () => auth.client() as never,
    service: () => auth.client() as never,
    forUser: () => {
      throw new Error('Data access goes through the faked repositories');
    },
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...(extra.imports ?? [])],
  })
    .overrideProvider(SupabaseService)
    .useValue(fakeSupabase)
    .overrideProvider(JWT_KEY_SET)
    .useValue(auth.keySet)
    .overrideProvider(ProfilesRepository)
    .useValue(profiles)
    .overrideProvider(ContentRepository)
    .useValue(content)
    .overrideProvider(LessonProgressRepository)
    .useValue(progress)
    .overrideProvider(Translator)
    .useValue(translator)
    .overrideProvider(TranslationsRepository)
    .useValue(translations)
    .overrideProvider(ExercisesRepository)
    .useValue(exercises)
    .overrideProvider(ExerciseAnswersRepository)
    .useValue(answers)
    .overrideProvider(AttemptsRepository)
    .useValue(attempts)
    .overrideProvider(AdminContentRepository)
    .useValue(admin)
    .overrideProvider(DashboardRepository)
    .useValue(dashboard)
    .overrideProvider(AdminUsersRepository)
    .useValue(adminUsers)
    .overrideProvider(GlossaryRepository)
    .useValue(glossary)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return {
    app,
    auth,
    profiles,
    content,
    progress,
    translator,
    translations,
    exercises,
    answers,
    attempts,
    admin,
    dashboard,
    adminUsers,
    glossary,
  };
}
