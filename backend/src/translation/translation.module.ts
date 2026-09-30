import { Module } from '@nestjs/common';
import { ContentTranslationService } from './content-translation.service.js';
import { TranslationsRepository } from './translations.repository.js';
import { GoogleTranslator, Translator } from './translator.js';

@Module({
  providers: [
    ContentTranslationService,
    TranslationsRepository,
    { provide: Translator, useClass: GoogleTranslator },
  ],
  exports: [ContentTranslationService],
})
export class TranslationModule {}
