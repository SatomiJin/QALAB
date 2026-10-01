import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express } from 'express';
import * as helmetExports from 'helmet';
import type { HelmetOptions } from 'helmet';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { AppConfigService } from './config/app-config.service.js';

type Helmet = (
  options?: Readonly<HelmetOptions>,
) => (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void;

/**
 * helmet ships separate ESM and CommonJS type files. Vercel's NestJS build
 * type-checks against the CommonJS ones, where the default import is the
 * whole module rather than the function (TS2349 "not callable"), while the
 * local build uses the ESM ones. Unwrap either shape instead of relying on
 * one; fail loudly if neither holds.
 */
function loadHelmet(): Helmet {
  const exported = (helmetExports as unknown as { default?: unknown }).default;
  const candidate =
    typeof exported === 'function'
      ? exported
      : (exported as { default?: unknown } | undefined)?.default;
  if (typeof candidate !== 'function') {
    throw new Error('helmet could not be loaded');
  }
  return candidate as Helmet;
}

const helmet = loadHelmet();

export const API_PREFIX = 'api/v1';
export const DOCS_PATH = 'api/docs';

/**
 * Applies global app configuration. Shared by `main.ts` and e2e tests so
 * tests exercise the same pipeline as production.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfigService);

  if (config.trustProxyHops > 0) {
    // Lets rate limiting see the client IP behind the host's proxy.
    const server = app.getHttpAdapter().getInstance() as Express;
    server.set('trust proxy', config.trustProxyHops);
  }
  // Lesson Markdown may be 100 000 characters (up to ~400 kB of UTF-8, more
  // once JSON-escaped): above the 100 kB default.
  (app as NestExpressApplication).useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix(API_PREFIX);
  // JSON-only API: CSP is disabled so Swagger UI can load its assets.
  app.use(helmet({ contentSecurityPolicy: false }));
  const pattern = config.corsOriginPattern;
  app.enableCors({
    // Exact origins, plus the preview-deployment pattern when configured.
    origin: pattern ? [...config.corsOrigins, pattern] : config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (config.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('QA Learning Lab API')
        .setDescription('Backend API for the QA Learning Lab platform')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(DOCS_PATH, app, document, {
      jsonDocumentUrl: `${DOCS_PATH}-json`,
    });
  }
}
