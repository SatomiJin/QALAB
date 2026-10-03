import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TEXT_LIMITS } from '../../translation/translatable-texts.js';
import type { TranslatableEntity } from '../../translation/translations.repository.js';
import {
  FIELD_TRANSLATION_STATUSES,
  type FieldTranslationStatus,
} from '../translation-rules.js';

/** Same pattern as the `content_translations.field` check. */
export const TRANSLATION_FIELD_PATTERN =
  /^(title|description|content_md|question|explanation|model_answer|(option|item|category|rubric)\.[a-z0-9][a-z0-9_-]{0,39})$/;

/** An exercise has at most 8 options + 6 categories + 20 items + 12 rubric + 4. */
export const TRANSLATION_FIELDS_MAX = 60;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Request ----------------------------------------------------------------------

export class TranslationFieldWriteDto {
  @ApiProperty({ example: 'title', pattern: TRANSLATION_FIELD_PATTERN.source })
  @IsString()
  @Matches(TRANSLATION_FIELD_PATTERN, { message: 'field is not translatable' })
  field: string;

  @ApiProperty({
    description:
      'sourceHash of the English text the translation was written from (from GET). 409 when the English changed since.',
    pattern: '^[0-9a-f]{64}$',
  })
  @IsString()
  @Matches(/^[0-9a-f]{64}$/, { message: 'sourceHash must be a sha-256 hex' })
  sourceHash: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The Vietnamese text (trimmed, not empty). `null` removes the manual translation.',
    maxLength: TEXT_LIMITS.content,
  })
  @Transform(trim)
  @IsDefined({ message: 'text must be a string or null' })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(TEXT_LIMITS.content)
  text: string | null;
}

export class SaveTranslationsDto {
  @ApiProperty({ type: [TranslationFieldWriteDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TRANSLATION_FIELDS_MAX)
  @ValidateNested({ each: true })
  @Type(() => TranslationFieldWriteDto)
  fields: TranslationFieldWriteDto[];
}

// Response ---------------------------------------------------------------------

export class TranslationFieldDto {
  @ApiProperty({ example: 'content_md' })
  field: string;

  @ApiProperty({ description: 'Markdown: headings and code blocks must match' })
  markdown: boolean;

  @ApiProperty({ description: 'Maximum length of the translation' })
  maxLength: number;

  @ApiProperty({ description: 'The current English text' })
  source: string;

  @ApiProperty({ description: 'sha-256 of `source`; send it back to save' })
  sourceHash: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The manual Vietnamese translation, also when stale. Null when there is none.',
  })
  text: string | null;

  @ApiProperty({
    enum: FIELD_TRANSLATION_STATUSES,
    description:
      '`current`: manual translation of this English. `stale`: of an older English (learners see English). `missing`: none.',
  })
  status: FieldTranslationStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'A cached machine translation of the current English, as a starting point',
  })
  machineText: string | null;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  updatedAt: string | null;
}

export class AdminTranslationsDto {
  @ApiProperty({ enum: ['course', 'module', 'lesson', 'exercise'] })
  entityType: TranslatableEntity;

  @ApiProperty({ format: 'uuid' })
  entityId: string;

  @ApiProperty({ enum: ['vi'] })
  language: 'vi';

  @ApiProperty({ type: [TranslationFieldDto] })
  fields: TranslationFieldDto[];
}
