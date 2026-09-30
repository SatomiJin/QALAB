import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { JWT_KEY_SET } from '../../src/auth/jwt-verifier.service.js';
import { ContentRepository } from '../../src/learning/content.repository.js';
import { LessonProgressRepository } from '../../src/learning/lesson-progress.repository.js';
import { ProfilesRepository } from '../../src/profile/profiles.repository.js';
import { SupabaseService } from '../../src/supabase/supabase.service.js';
import { TranslationsRepository } from '../../src/translation/translations.repository.js';
import { Translator } from '../../src/translation/translator.js';
import { FakeAuthServer, FakeProfilesRepository } from './fake-auth-server.js';
import {
  FakeContentRepository,
  FakeLessonProgressRepository,
} from './fake-learning.js';
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
}

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
  const auth = await FakeAuthServer.create((user) => profiles.addFor(user));

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
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return { app, auth, profiles, content, progress, translator, translations };
}
