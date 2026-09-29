import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { AppConfigService } from './config/app-config.service.js';

export const API_PREFIX = 'api/v1';
export const DOCS_PATH = 'api/docs';

/**
 * Applies global app configuration. Shared by `main.ts` and e2e tests so
 * tests exercise the same pipeline as production.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfigService);

  app.setGlobalPrefix(API_PREFIX);
  // JSON-only API: CSP is disabled so Swagger UI can load its assets.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({
    origin: config.corsOrigins,
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
