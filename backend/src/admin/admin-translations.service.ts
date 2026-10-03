import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { PIPELINE_VERSION } from '../translation/markdown-translate.js';
import {
  contentTexts,
  type SourceText,
} from '../translation/translatable-texts.js';
import {
  type TranslatableEntity,
  TranslationsRepository,
} from '../translation/translations.repository.js';
import { AdminContentRepository } from './admin-content.repository.js';
import { AdminService } from './admin.service.js';
import type {
  AdminTranslationsDto,
  SaveTranslationsDto,
} from './dto/admin-translations.dto.js';
import {
  describeTranslations,
  planTranslationWrites,
} from './translation-rules.js';

/** The only content language besides English. */
const LANGUAGE = 'vi';

/**
 * Manual Vietnamese translations in the Admin CMS. Everything runs as the
 * admin: content reads and translation writes go through RLS (`is_admin()`,
 * manual rows only); the controller's `@Roles('admin')` checked first.
 */
@Injectable()
export class AdminTranslationsService {
  constructor(
    private readonly admin: AdminService,
    private readonly repo: AdminContentRepository,
    private readonly translations: TranslationsRepository,
  ) {}

  async get(
    user: AuthUser,
    kind: TranslatableEntity,
    id: string,
  ): Promise<AdminTranslationsDto> {
    const texts = await this.sourceTexts(user, kind, id);
    return this.describe(user, kind, id, texts);
  }

  /**
   * Saves (or removes, `text: null`) the listed fields. All or nothing: the
   * whole request is checked before anything is written.
   */
  async save(
    user: AuthUser,
    kind: TranslatableEntity,
    id: string,
    dto: SaveTranslationsDto,
  ): Promise<AdminTranslationsDto> {
    const texts = await this.sourceTexts(user, kind, id);
    const plan = planTranslationWrites(texts, dto.fields);
    if (!plan.ok) {
      if (plan.conflict) {
        throw new ConflictException({
          message:
            'The English text changed since the editor was opened. Reload and translate again.',
          details: plan.errors,
        });
      }
      throw new BadRequestException({
        message: 'Validation failed',
        details: plan.errors,
      });
    }
    await this.translations.saveManual(
      user.accessToken,
      plan.save.map((entry) => ({
        entity_type: kind,
        entity_id: id,
        field: entry.field,
        language: LANGUAGE,
        source_hash: entry.sourceHash,
        text: entry.text,
      })),
    );
    await this.translations.removeManual(
      user.accessToken,
      kind,
      id,
      LANGUAGE,
      plan.remove,
    );
    return this.describe(user, kind, id, texts);
  }

  private async describe(
    user: AuthUser,
    kind: TranslatableEntity,
    id: string,
    texts: SourceText[],
  ): Promise<AdminTranslationsDto> {
    const rows = await this.translations.findForEntity(
      user.accessToken,
      kind,
      id,
      LANGUAGE,
    );
    return {
      entityType: kind,
      entityId: id,
      language: LANGUAGE,
      fields: describeTranslations(texts, rows, PIPELINE_VERSION),
    };
  }

  /** The row's English texts; 404 when the row does not exist. */
  private async sourceTexts(
    user: AuthUser,
    kind: TranslatableEntity,
    id: string,
  ): Promise<SourceText[]> {
    switch (kind) {
      case 'course':
        return contentTexts(kind, await this.admin.findOr404(user, kind, id));
      case 'module':
        return contentTexts(kind, await this.admin.findOr404(user, kind, id));
      case 'lesson':
        return contentTexts(kind, await this.admin.findOr404(user, kind, id));
      default: {
        const exercise = await this.admin.findOr404(user, 'exercise', id);
        const answer = await this.repo.findAnswer(user.accessToken, id);
        return contentTexts('exercise', { ...exercise, answer });
      }
    }
  }
}
