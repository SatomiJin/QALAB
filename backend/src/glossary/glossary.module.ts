import { Module } from '@nestjs/common';
import { AdminGlossaryController } from './admin-glossary.controller.js';
import { GlossaryController } from './glossary.controller.js';
import { GlossaryRepository } from './glossary.repository.js';
import { GlossaryService } from './glossary.service.js';

@Module({
  controllers: [GlossaryController, AdminGlossaryController],
  providers: [GlossaryService, GlossaryRepository],
})
export class GlossaryModule {}
