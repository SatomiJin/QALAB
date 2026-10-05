import { applyDecorators } from '@nestjs/common';
import {
  ApiProperty,
  ApiPropertyOptional,
  type ApiPropertyOptions,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  CONTENT_STATUSES,
  type ContentStatus,
} from '../../admin/content-rules.js';
import { SKILL_CODES, type SkillCode } from '../../curriculum/curriculum.js';
import { GLOSSARY_LIMITS, GLOSSARY_SLUG_PATTERN } from '../glossary-rules.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimEach = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;

// An empty Vietnamese name is "none".
const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

// Responses -----------------------------------------------------------------

export class GlossaryTermDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: 'test-case',
    description: 'Anchor: /glossary#<slug>',
  })
  slug: string;

  @ApiProperty({ example: 'Test case' })
  term: string;

  @ApiProperty({ type: String, nullable: true, example: 'Ca kiểm thử' })
  viName: string | null;

  @ApiProperty({ enum: SKILL_CODES })
  skill: SkillCode;

  @ApiProperty({
    type: [String],
    example: ['test case'],
    description:
      'Phrases linked to this term in lesson text (whole words, plural too; all-caps phrases match in capitals only)',
  })
  matchPhrases: string[];

  @ApiProperty()
  definitionEn: string;

  @ApiProperty()
  definitionVi: string;

  @ApiProperty({
    type: [String],
    example: ['test-scenario'],
    description: 'Slugs of related terms that are visible to the caller',
  })
  related: string[];
}

export class GlossaryListDto {
  @ApiProperty({ type: [GlossaryTermDto], description: 'Sorted by term' })
  items: GlossaryTermDto[];
}

export class GlossaryUsageDto {
  @ApiProperty({
    description: 'Lessons (any status) whose English text uses a phrase',
  })
  lessons: number;

  @ApiProperty({
    type: [String],
    description: 'Ids of the courses of those lessons',
  })
  courseIds: string[];
}

export class AdminGlossaryTermDto extends GlossaryTermDto {
  @ApiProperty({ enum: CONTENT_STATUSES })
  status: ContentStatus;

  @ApiProperty({ type: [String], format: 'uuid' })
  relatedIds: string[];

  @ApiProperty({ type: GlossaryUsageDto })
  usage: GlossaryUsageDto;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class GlossaryCourseRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;
}

export class AdminGlossaryListDto {
  @ApiProperty({
    type: [AdminGlossaryTermDto],
    description: 'Every status, sorted by term',
  })
  items: AdminGlossaryTermDto[];

  @ApiProperty({
    type: [GlossaryCourseRefDto],
    description: 'Every course, for the usage filter',
  })
  courses: GlossaryCourseRefDto[];
}

// Requests ------------------------------------------------------------------
// One decorator set per field, used required by create and optional by PATCH.

const SlugField = () =>
  applyDecorators(
    Transform(trim),
    IsString(),
    MaxLength(GLOSSARY_LIMITS.slugLength),
    Matches(GLOSSARY_SLUG_PATTERN, {
      message:
        'slug must be lowercase letters, digits and single dashes (e.g. test-case)',
    }),
  );

const TextField = (max: number) =>
  applyDecorators(Transform(trim), IsString(), IsNotEmpty(), MaxLength(max));

const ViNameField = () =>
  applyDecorators(
    Transform(trimOrNull),
    ValidateIf((_, value) => value !== null && value !== undefined),
    IsString(),
    MaxLength(GLOSSARY_LIMITS.viNameLength),
  );

const PhrasesField = () =>
  applyDecorators(
    Transform(trimEach),
    IsArray(),
    ArrayMaxSize(GLOSSARY_LIMITS.phrases),
    IsString({ each: true }),
    Length(GLOSSARY_LIMITS.phraseMin, GLOSSARY_LIMITS.phraseMax, {
      each: true,
    }),
  );

const RelatedField = () =>
  applyDecorators(
    IsArray(),
    ArrayMaxSize(GLOSSARY_LIMITS.related),
    IsUUID('all', { each: true }),
  );

const phrasesDoc: ApiPropertyOptions = {
  type: [String],
  maxItems: GLOSSARY_LIMITS.phrases,
  example: ['test case'],
  description: `Each ${GLOSSARY_LIMITS.phraseMin}-${GLOSSARY_LIMITS.phraseMax} characters, used by no other term`,
};
const relatedDoc: ApiPropertyOptions = {
  type: [String],
  format: 'uuid',
  maxItems: GLOSSARY_LIMITS.related,
};
const statusDoc: ApiPropertyOptions = {
  enum: CONTENT_STATUSES,
  description: 'Learners see published terms only',
};

export class CreateGlossaryTermDto {
  @ApiProperty({ maxLength: GLOSSARY_LIMITS.slugLength, example: 'test-case' })
  @SlugField()
  slug: string;

  @ApiProperty({ maxLength: GLOSSARY_LIMITS.termLength, example: 'Test case' })
  @TextField(GLOSSARY_LIMITS.termLength)
  term: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: GLOSSARY_LIMITS.viNameLength,
  })
  @IsOptional()
  @ViNameField()
  viName?: string | null;

  @ApiProperty({ enum: SKILL_CODES })
  @IsIn(SKILL_CODES)
  skill: SkillCode;

  @ApiPropertyOptional(phrasesDoc)
  @IsOptional()
  @PhrasesField()
  matchPhrases?: string[];

  @ApiProperty({ maxLength: GLOSSARY_LIMITS.definitionLength })
  @TextField(GLOSSARY_LIMITS.definitionLength)
  definitionEn: string;

  @ApiProperty({ maxLength: GLOSSARY_LIMITS.definitionLength })
  @TextField(GLOSSARY_LIMITS.definitionLength)
  definitionVi: string;

  @ApiPropertyOptional(relatedDoc)
  @IsOptional()
  @RelatedField()
  relatedIds?: string[];

  @ApiPropertyOptional({ ...statusDoc, default: 'draft' })
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

/** Every field optional; an empty body returns the term unchanged. */
export class UpdateGlossaryTermDto {
  @ApiPropertyOptional({ maxLength: GLOSSARY_LIMITS.slugLength })
  @IsOptional()
  @SlugField()
  slug?: string;

  @ApiPropertyOptional({ maxLength: GLOSSARY_LIMITS.termLength })
  @IsOptional()
  @TextField(GLOSSARY_LIMITS.termLength)
  term?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: GLOSSARY_LIMITS.viNameLength,
  })
  @IsOptional()
  @ViNameField()
  viName?: string | null;

  @ApiPropertyOptional({ enum: SKILL_CODES })
  @IsOptional()
  @IsIn(SKILL_CODES)
  skill?: SkillCode;

  @ApiPropertyOptional(phrasesDoc)
  @IsOptional()
  @PhrasesField()
  matchPhrases?: string[];

  @ApiPropertyOptional({ maxLength: GLOSSARY_LIMITS.definitionLength })
  @IsOptional()
  @TextField(GLOSSARY_LIMITS.definitionLength)
  definitionEn?: string;

  @ApiPropertyOptional({ maxLength: GLOSSARY_LIMITS.definitionLength })
  @IsOptional()
  @TextField(GLOSSARY_LIMITS.definitionLength)
  definitionVi?: string;

  @ApiPropertyOptional(relatedDoc)
  @IsOptional()
  @RelatedField()
  relatedIds?: string[];

  @ApiPropertyOptional(statusDoc)
  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}
