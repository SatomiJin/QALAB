import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { definedOnly } from '../admin/admin.service.js';
import type { AuthUser } from '../auth/auth-user.js';
import { isPgError, PG_UNIQUE_VIOLATION } from '../common/errors/pg-error.js';
import type { SkillCode } from '../curriculum/curriculum.js';
import type {
  AdminGlossaryListDto,
  AdminGlossaryTermDto,
  CreateGlossaryTermDto,
  GlossaryListDto,
  GlossaryTermDto,
  UpdateGlossaryTermDto,
} from './dto/glossary.dto.js';
import {
  type FieldError,
  phraseErrors,
  type PhraseOwner,
  relatedErrors,
  termUsage,
  type TermUsage,
} from './glossary-rules.js';
import {
  type GlossaryRow,
  type GlossaryWrite,
  GlossaryRepository,
} from './glossary.repository.js';

const NOT_FOUND = 'Glossary term not found';
const NO_USAGE: TermUsage = { lessons: 0, courseIds: [] };

const owner = (row: GlossaryRow): PhraseOwner => ({
  id: row.id,
  term: row.term,
  matchPhrases: row.match_phrases,
});

function toTermDto(
  row: GlossaryRow,
  slugs: ReadonlyMap<string, string>,
): GlossaryTermDto {
  return {
    id: row.id,
    slug: row.slug,
    term: row.term,
    viName: row.vi_name,
    skill: row.skill_code as SkillCode,
    matchPhrases: row.match_phrases,
    definitionEn: row.definition_en,
    definitionVi: row.definition_vi,
    // Related terms the caller cannot see (drafts for learners) are dropped.
    related: row.related_ids.flatMap((id) => slugs.get(id) ?? []),
  };
}

function toAdminDto(
  row: GlossaryRow,
  slugs: ReadonlyMap<string, string>,
  usage: TermUsage,
): AdminGlossaryTermDto {
  return {
    ...toTermDto(row, slugs),
    status: row.status,
    relatedIds: row.related_ids.filter((id) => slugs.has(id)),
    usage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const slugMap = (rows: readonly GlossaryRow[]) =>
  new Map(rows.map((row) => [row.id, row.slug]));

function invalid(details: FieldError[]): BadRequestException {
  return new BadRequestException({ message: 'Validation failed', details });
}

/**
 * Glossary: learners read published terms; admins manage every term as
 * themselves (RLS `is_admin()`, after the controller's `@Roles('admin')`).
 */
@Injectable()
export class GlossaryService {
  constructor(private readonly repo: GlossaryRepository) {}

  async list(user: AuthUser): Promise<GlossaryListDto> {
    // Learner view for everyone (admins too): published only, explicitly.
    const rows = await this.repo.list(user.accessToken, {
      publishedOnly: true,
    });
    const slugs = slugMap(rows);
    return { items: rows.map((row) => toTermDto(row, slugs)) };
  }

  async adminList(user: AuthUser): Promise<AdminGlossaryListDto> {
    const [rows, lessons, courses] = await Promise.all([
      this.repo.list(user.accessToken, { publishedOnly: false }),
      this.repo.listLessonTexts(user.accessToken),
      this.repo.listCourseTitles(user.accessToken),
    ]);
    const slugs = slugMap(rows);
    const usage = termUsage(rows.map(owner), lessons);
    return {
      items: rows.map((row) =>
        toAdminDto(row, slugs, usage.get(row.id) ?? NO_USAGE),
      ),
      courses,
    };
  }

  async adminGet(user: AuthUser, id: string): Promise<AdminGlossaryTermDto> {
    const rows = await this.repo.list(user.accessToken, {
      publishedOnly: false,
    });
    const row = rows.find((entry) => entry.id === id);
    if (!row) throw new NotFoundException(NOT_FOUND);
    return this.describe(user, row, rows);
  }

  async create(
    user: AuthUser,
    dto: CreateGlossaryTermDto,
  ): Promise<AdminGlossaryTermDto> {
    const rows = await this.repo.list(user.accessToken, {
      publishedOnly: false,
    });
    const write: GlossaryWrite = {
      slug: dto.slug,
      term: dto.term,
      vi_name: dto.viName ?? null,
      skill_code: dto.skill,
      match_phrases: dto.matchPhrases ?? [],
      definition_en: dto.definitionEn,
      definition_vi: dto.definitionVi,
      related_ids: dto.relatedIds ?? [],
      status: dto.status ?? 'draft',
    };
    this.check(null, write, rows);
    const row = await this.write(() =>
      this.repo.insert(user.accessToken, write),
    );
    return this.describe(user, row, [...rows, row]);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateGlossaryTermDto,
  ): Promise<AdminGlossaryTermDto> {
    const rows = await this.repo.list(user.accessToken, {
      publishedOnly: false,
    });
    const current = rows.find((entry) => entry.id === id);
    if (!current) throw new NotFoundException(NOT_FOUND);

    const patch = definedOnly<Partial<GlossaryWrite>>({
      slug: dto.slug,
      term: dto.term,
      vi_name: dto.viName,
      skill_code: dto.skill,
      match_phrases: dto.matchPhrases,
      definition_en: dto.definitionEn,
      definition_vi: dto.definitionVi,
      related_ids: dto.relatedIds,
      status: dto.status,
    });
    if (Object.keys(patch).length === 0) {
      return this.describe(user, current, rows);
    }
    this.check(id, { ...current, ...patch }, rows);
    const row = await this.write(() =>
      this.repo.update(user.accessToken, id, patch),
    );
    if (!row) throw new NotFoundException(NOT_FOUND);
    return this.describe(
      user,
      row,
      rows.map((entry) => (entry.id === id ? row : entry)),
    );
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    // No learner data hangs on a term: hard delete (the UI confirms first).
    if (!(await this.repo.remove(user.accessToken, id))) {
      throw new NotFoundException(NOT_FOUND);
    }
  }

  private check(
    id: string | null,
    write: GlossaryWrite,
    rows: readonly GlossaryRow[],
  ): void {
    const errors = [
      ...phraseErrors(id, write.match_phrases, rows.map(owner)),
      ...relatedErrors(
        id,
        write.related_ids,
        new Set(rows.map((row) => row.id)),
      ),
    ];
    const slugOwner = rows.find(
      (row) => row.slug === write.slug && row.id !== id,
    );
    if (slugOwner) {
      errors.unshift({
        field: 'slug',
        message: `slug is already used by "${slugOwner.term}"`,
      });
    }
    if (errors.length === 0) return;
    // A taken slug or phrase is a conflict; anything else a bad request.
    const conflict = errors.every(
      (error) =>
        error.field === 'slug' ||
        error.message.startsWith('phrase is already used'),
    );
    if (conflict) {
      throw new ConflictException({ message: 'Already used', details: errors });
    }
    throw invalid(errors);
  }

  /** The DB catches what changed between the check and the write. */
  private async write<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (isPgError(error, PG_UNIQUE_VIOLATION)) {
        const phrase = (error as { hint?: string }).hint === 'match';
        throw new ConflictException({
          message: 'Already used',
          details: [
            phrase
              ? {
                  field: 'matchPhrases',
                  message: 'a phrase is already used by another term',
                }
              : {
                  field: 'slug',
                  message: 'slug is already used by another term',
                },
          ],
        });
      }
      throw error;
    }
  }

  private async describe(
    user: AuthUser,
    row: GlossaryRow,
    rows: readonly GlossaryRow[],
  ): Promise<AdminGlossaryTermDto> {
    const lessons = await this.repo.listLessonTexts(user.accessToken);
    const usage = termUsage([owner(row)], lessons).get(row.id) ?? NO_USAGE;
    return toAdminDto(row, slugMap(rows), usage);
  }
}
