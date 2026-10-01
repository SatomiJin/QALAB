import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, DOCS_PATH } from './app.setup.js';
import { AppConfigService } from './config/app-config.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(AppConfigService);
  await app.listen(config.port);

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on http://localhost:${config.port}`);
  if (config.swaggerEnabled) {
    logger.log(`Swagger UI at http://localhost:${config.port}/${DOCS_PATH}`);
  }
}
// Not awaited at the top level: Vercel imports this module and takes over
// `listen()`, so a top-level await keeps the import from ever finishing and
// requests hang (docs/deployment.md). A startup error still exits the process.
void bootstrap();
