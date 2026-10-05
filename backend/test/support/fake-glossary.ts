import { randomUUID } from 'node:crypto';
import type { LessonText } from '../../src/glossary/glossary-rules.js';
import type {
  CourseTitleRow,
  GlossaryRow,
  GlossaryWrite,
} from '../../src/glossary/glossary.repository.js';
import type { FakeProfilesRepository } from './fake-auth-server.js';
import type { FakeContentRepository } from './fake-learning.js';
import { userIdFromToken } from './fake-practice.js';

const pgError = (code: string, message: string, hint?: string) => ({
  code,
  message,
  hint,
});

/**
 * In-memory `GlossaryRepository` mirroring the table: RLS (learners read
 * published rows, only admins write: `42501`), unique slug (`23505`), the
 * phrase trigger (`23505`, hint `match`), the related-ids cleanup trigger.
 * Lessons come from the learning fake, whatever their status (admin view).
 */
export class FakeGlossaryRepository {
  readonly rows = new Map<string, GlossaryRow>();

  constructor(
    private readonly profiles: FakeProfilesRepository,
    private readonly content: FakeContentRepository,
  ) {}

  private isAdmin(token: string): boolean {
    return this.profiles.rows.get(userIdFromToken(token))?.role === 'admin';
  }

  private requireAdmin(token: string): void {
    if (!this.isAdmin(token)) throw pgError('42501', 'admin only');
  }

  private checkUnique(id: string, row: GlossaryWrite): void {
    for (const other of this.rows.values()) {
      if (other.id === id) continue;
      if (other.slug === row.slug) throw pgError('23505', 'slug taken');
      const mine = new Set(row.match_phrases.map((p) => p.toLowerCase()));
      if (other.match_phrases.some((p) => mine.has(p.toLowerCase()))) {
        throw pgError('23505', 'glossary phrase already used', 'match');
      }
    }
  }

  /** Test helper: a stored term (published unless said otherwise). */
  add(over: Partial<GlossaryRow> = {}): GlossaryRow {
    const now = new Date().toISOString();
    const slug = over.slug ?? `term-${this.rows.size + 1}`;
    const row: GlossaryRow = {
      id: randomUUID(),
      slug,
      term: `Term ${slug}`,
      vi_name: null,
      skill_code: 'fundamentals',
      match_phrases: [],
      definition_en: `About ${slug}`,
      definition_vi: `Về ${slug}`,
      related_ids: [],
      status: 'published',
      created_at: now,
      updated_at: now,
      ...over,
    };
    this.rows.set(row.id, row);
    return row;
  }

  list(
    token: string,
    options: { publishedOnly: boolean },
  ): Promise<GlossaryRow[]> {
    const admin = this.isAdmin(token);
    return Promise.resolve(
      [...this.rows.values()]
        .filter((row) => row.status === 'published' || admin)
        .filter((row) => !options.publishedOnly || row.status === 'published')
        .sort((a, b) => (a.term < b.term ? -1 : a.term > b.term ? 1 : 0))
        .map((row) => ({ ...row })),
    );
  }

  find(token: string, id: string): Promise<GlossaryRow | null> {
    const row = this.rows.get(id);
    const visible = row && (row.status === 'published' || this.isAdmin(token));
    return Promise.resolve(visible ? { ...row } : null);
  }

  insert(token: string, write: GlossaryWrite): Promise<GlossaryRow> {
    this.requireAdmin(token);
    const id = randomUUID();
    this.checkUnique(id, write);
    const now = new Date().toISOString();
    const row = { id, ...write, created_at: now, updated_at: now };
    this.rows.set(id, row);
    return Promise.resolve({ ...row });
  }

  update(
    token: string,
    id: string,
    patch: Partial<GlossaryWrite>,
  ): Promise<GlossaryRow | null> {
    const current = this.rows.get(id);
    // RLS: a learner's update matches no row.
    if (!current || !this.isAdmin(token)) return Promise.resolve(null);
    const next = { ...current, ...patch, updated_at: new Date().toISOString() };
    this.checkUnique(id, next);
    this.rows.set(id, next);
    return Promise.resolve({ ...next });
  }

  remove(token: string, id: string): Promise<boolean> {
    if (!this.isAdmin(token) || !this.rows.delete(id)) {
      return Promise.resolve(false);
    }
    for (const row of this.rows.values()) {
      row.related_ids = row.related_ids.filter((other) => other !== id);
    }
    return Promise.resolve(true);
  }

  listLessonTexts(): Promise<LessonText[]> {
    return Promise.resolve(
      [...this.content.lessons.values()].map(({ row }) => ({
        lessonId: row.id,
        courseId: this.content.modules.get(row.module_id)!.row.course_id,
        contentMd: row.content_md,
      })),
    );
  }

  listCourseTitles(): Promise<CourseTitleRow[]> {
    return Promise.resolve(
      [...this.content.courses.values()]
        .map(({ row }) => ({ id: row.id, title: row.title }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    );
  }
}
