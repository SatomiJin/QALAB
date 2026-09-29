import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { JWT_KEY_SET } from '../../src/auth/jwt-verifier.service.js';
import { ProfilesRepository } from '../../src/profile/profiles.repository.js';
import { SupabaseService } from '../../src/supabase/supabase.service.js';
import { FakeAuthServer, FakeProfilesRepository } from './fake-auth-server.js';

export interface TestApp {
  app: INestApplication<App>;
  auth: FakeAuthServer;
  profiles: FakeProfilesRepository;
}

/**
 * The real app (same modules, pipes, filters and guards as production) with
 * Supabase replaced by in-memory fakes.
 */
export async function createTestApp(
  extra: Pick<ModuleMetadata, 'imports'> = {},
): Promise<TestApp> {
  const profiles = new FakeProfilesRepository();
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
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return { app, auth, profiles };
}
