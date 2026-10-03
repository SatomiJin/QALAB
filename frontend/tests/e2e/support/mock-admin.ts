/**
 * Admin CMS part of the mock backend (docs/api.md › Admin). Own content
 * store, with the backend's rules: 403 for learners, unique slugs (409),
 * publish needs a published lesson in a published module (409), content in
 * use cannot be deleted (409), reorders list every child once (400), answer
 * keys checked against the prompt (400 with `details`), manual Vietnamese
 * translations tied to a hash of their English (stale / 409 when it changed).
 */

import { createHash } from 'node:crypto';

type Status = 'draft' | 'published' | 'archived';
type Result = { status: number; json?: unknown };

interface Course {
  id: string;
  skillId: string;
  slug: string;
  title: string;
  description: string;
  status: Status;
  orderIndex: number;
  updatedAt: string;
}
interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  status: Status;
  orderIndex: number;
}
interface Lesson {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  contentMd: string;
  estimatedMinutes: number;
  status: Status;
  orderIndex: number;
  updatedAt: string;
}
interface Exercise {
  id: string;
  lessonId: string;
  type: string;
  question: string;
  promptData: Record<string, unknown>;
  answerData: Record<string, unknown>;
  explanation: string;
  difficulty: string;
  status: Status;
  orderIndex: number;
  updatedAt: string;
}

const SKILLS = [
  'fundamentals',
  'testing_types',
  'test_design',
  'test_docs',
  'defect_mgmt',
  'api_testing',
  'automation',
].map((code) => ({ id: `skill-${code}`, code, name: `API name ${code}` }));

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
let clock = Date.parse('2026-09-30T09:00:00Z');
const now = () => new Date((clock += 60_000)).toISOString();

const err = (
  status: number,
  error: string,
  message: string,
  details?: { field: string; message: string }[],
): Result => ({
  status,
  json: { statusCode: status, error, message, ...(details ? { details } : {}) },
});
const notFound = (what: string) => err(404, 'Not Found', `${what} not found`);
const invalid = (details: { field: string; message: string }[]) =>
  err(400, 'Bad Request', 'Validation failed', details);
const IN_USE = 'Learners have progress or attempts here. Archive it instead.';
type TranslatableKind = 'course' | 'module' | 'lesson' | 'exercise';
interface SourceText {
  field: string;
  text: string;
  markdown: boolean;
  maxLength: number;
}
const KIND_BY_RESOURCE: Record<string, TranslatableKind> = {
  courses: 'course',
  modules: 'module',
  lessons: 'lesson',
  exercises: 'exercise',
};
const hash = (text: string) =>
  createHash('sha256').update(text, 'utf8').digest('hex');
const headings = (md: string) =>
  md.split('\n').filter((line) => /^#{1,6}\s/.test(line)).length;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class MockAdmin {
  readonly courses = new Map<string, Course>();
  readonly modules = new Map<string, Module>();
  readonly lessons = new Map<string, Lesson>();
  readonly exercises = new Map<string, Exercise>();
  /** Lessons with learner progress and exercises with attempts. */
  readonly used = new Set<string>();
  /** Every write, for assertions: `PATCH /admin/...` with its body. */
  readonly writes: { key: string; body: Record<string, unknown> }[] = [];
  failing = false;
  /** Manual translations: `<kind>:<id>:<field>` → text + hash of its English. */
  readonly translations = new Map<
    string,
    { text: string; sourceHash: string; updatedAt: string }
  >();
  /** Cached machine translations of the current English, same keys. */
  readonly machine = new Map<string, string>();

  // Setup helpers -----------------------------------------------------------

  addCourse(input: Partial<Course> = {}): Course {
    const course: Course = {
      id: uuid(),
      skillId: 'skill-fundamentals',
      slug: `course-${seq}`,
      title: `Course ${seq}`,
      description: '',
      status: 'draft',
      orderIndex:
        this.children('course', input.skillId ?? 'skill-fundamentals').length +
        1,
      updatedAt: now(),
      ...input,
    };
    this.courses.set(course.id, course);
    return course;
  }

  addModule(course: Course, input: Partial<Module> = {}): Module {
    const module: Module = {
      id: uuid(),
      courseId: course.id,
      title: `Module ${seq}`,
      description: '',
      status: 'published',
      orderIndex: this.children('module', course.id).length + 1,
      ...input,
    };
    this.modules.set(module.id, module);
    return module;
  }

  addLesson(module: Module, input: Partial<Lesson> = {}): Lesson {
    const lesson: Lesson = {
      id: uuid(),
      moduleId: module.id,
      slug: `lesson-${seq}`,
      title: `Lesson ${seq}`,
      contentMd: '## Hello\n\nBody.',
      estimatedMinutes: 5,
      status: 'published',
      orderIndex: this.children('lesson', module.id).length + 1,
      updatedAt: now(),
      ...input,
    };
    this.lessons.set(lesson.id, lesson);
    return lesson;
  }

  addExercise(lesson: Lesson, input: Partial<Exercise> = {}): Exercise {
    const exercise: Exercise = {
      id: uuid(),
      lessonId: lesson.id,
      type: 'multiple_choice',
      question: 'Which technique tests the edges of a range?',
      promptData: {
        options: [
          { id: 'a', text: 'Boundary value analysis' },
          { id: 'b', text: 'Smoke testing' },
        ],
        multiple: false,
      },
      answerData: { correct: ['a'] },
      explanation: 'Boundaries.',
      difficulty: 'easy',
      status: 'published',
      orderIndex: this.children('exercise', lesson.id).length + 1,
      updatedAt: now(),
      ...input,
    };
    this.exercises.set(exercise.id, exercise);
    return exercise;
  }

  // Tree helpers ------------------------------------------------------------

  private children(
    kind: 'course' | 'module' | 'lesson' | 'exercise',
    parent: string,
  ) {
    const list =
      kind === 'course'
        ? [...this.courses.values()].filter((c) => c.skillId === parent)
        : kind === 'module'
          ? [...this.modules.values()].filter((m) => m.courseId === parent)
          : kind === 'lesson'
            ? [...this.lessons.values()].filter((l) => l.moduleId === parent)
            : [...this.exercises.values()].filter((e) => e.lessonId === parent);
    return (list as { id: string; orderIndex: number }[]).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
  }

  /**
   * What learners see of the content edited here: published courses with
   * their published modules and lessons (the item and every parent).
   * `MockLearning` lists them next to its sample course.
   */
  learnerCourses() {
    return [...this.courses.values()]
      .filter((c) => c.status === 'published')
      .map((c) => {
        const skill = this.skill(c.skillId);
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          description: c.description,
          skill: { code: skill.code, name: skill.name },
          orderIndex: c.orderIndex,
          modules: (this.children('module', c.id) as Module[])
            .filter((m) => m.status === 'published')
            .map((m) => ({
              id: m.id,
              title: m.title,
              description: m.description,
              lessons: (this.children('lesson', m.id) as Lesson[])
                .filter((l) => l.status === 'published')
                .map((l) => ({
                  id: l.id,
                  slug: l.slug,
                  title: l.title,
                  estimatedMinutes: l.estimatedMinutes,
                })),
            })),
        };
      });
  }

  private exerciseInUse = (e: Exercise) => this.used.has(e.id);
  private lessonInUse = (l: Lesson): boolean =>
    this.used.has(l.id) ||
    (this.children('exercise', l.id) as Exercise[]).some(this.exerciseInUse);
  private moduleInUse = (m: Module): boolean =>
    (this.children('lesson', m.id) as Lesson[]).some(this.lessonInUse);
  private courseInUse = (c: Course): boolean =>
    (this.children('module', c.id) as Module[]).some(this.moduleInUse);

  private skill(id: string) {
    return SKILLS.find((s) => s.id === id)!;
  }

  private exerciseSummary(e: Exercise) {
    return {
      id: e.id,
      type: e.type,
      difficulty: e.difficulty,
      question: e.question,
      promptData: e.promptData,
      status: e.status,
      orderIndex: e.orderIndex,
      inUse: this.exerciseInUse(e),
    };
  }

  private moduleDto(m: Module) {
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      status: m.status,
      orderIndex: m.orderIndex,
      inUse: this.moduleInUse(m),
      lessons: (this.children('lesson', m.id) as Lesson[]).map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        estimatedMinutes: l.estimatedMinutes,
        status: l.status,
        orderIndex: l.orderIndex,
        inUse: this.lessonInUse(l),
        exercises: (this.children('exercise', l.id) as Exercise[]).map((e) =>
          this.exerciseSummary(e),
        ),
      })),
    };
  }

  private canPublish(c: Course) {
    return (this.children('module', c.id) as Module[]).some(
      (m) =>
        m.status === 'published' &&
        (this.children('lesson', m.id) as Lesson[]).some(
          (l) => l.status === 'published',
        ),
    );
  }

  private courseDto(c: Course) {
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      status: c.status,
      orderIndex: c.orderIndex,
      inUse: this.courseInUse(c),
      skill: this.skill(c.skillId),
      canPublish: this.canPublish(c),
      createdAt: '2026-09-30T08:00:00.000Z',
      updatedAt: c.updatedAt,
      modules: (this.children('module', c.id) as Module[]).map((m) =>
        this.moduleDto(m),
      ),
    };
  }

  private ref(x: { id: string; title: string; status: Status }) {
    return { id: x.id, title: x.title, status: x.status };
  }

  private lessonDto(l: Lesson) {
    const m = this.modules.get(l.moduleId)!;
    const c = this.courses.get(m.courseId)!;
    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      contentMd: l.contentMd,
      estimatedMinutes: l.estimatedMinutes,
      status: l.status,
      orderIndex: l.orderIndex,
      inUse: this.lessonInUse(l),
      visibleToLearners: [l, m, c].every((x) => x.status === 'published'),
      module: this.ref(m),
      course: { ...this.ref(c), slug: c.slug },
      exercises: (this.children('exercise', l.id) as Exercise[]).map((e) =>
        this.exerciseSummary(e),
      ),
      createdAt: '2026-09-30T08:00:00.000Z',
      updatedAt: l.updatedAt,
    };
  }

  private exerciseDto(e: Exercise) {
    const l = this.lessons.get(e.lessonId)!;
    const m = this.modules.get(l.moduleId)!;
    const c = this.courses.get(m.courseId)!;
    return {
      ...this.exerciseSummary(e),
      answerData: e.answerData,
      explanation: e.explanation,
      visibleToLearners: [e, l, m, c].every((x) => x.status === 'published'),
      lesson: this.ref(l),
      module: this.ref(m),
      course: { ...this.ref(c), slug: c.slug },
      createdAt: '2026-09-30T08:00:00.000Z',
      updatedAt: e.updatedAt,
    };
  }

  // Rules -------------------------------------------------------------------

  private slugTaken(
    kind: 'course' | 'lesson',
    slug: unknown,
    self: string,
    parent?: string,
  ) {
    return kind === 'course'
      ? [...this.courses.values()].some((c) => c.slug === slug && c.id !== self)
      : [...this.lessons.values()].some(
          (l) => l.slug === slug && l.moduleId === parent && l.id !== self,
        );
  }

  private slugConflict(kind: 'course' | 'lesson') {
    return err(409, 'Conflict', 'Slug already used', [
      {
        field: 'slug',
        message:
          kind === 'course'
            ? 'slug is already used by another course'
            : 'slug is already used by another lesson in this module',
      },
    ]);
  }

  /** The key checks the UI depends on (backend: `parseAnswerKey`). */
  private checkKey(
    type: string,
    prompt: Record<string, unknown>,
    key: Record<string, unknown>,
  ) {
    const details: { field: string; message: string }[] = [];
    if (type === 'multiple_choice') {
      const ids = ((prompt.options as { id: string }[]) ?? []).map((o) => o.id);
      for (const id of (key.correct as string[]) ?? []) {
        if (!ids.includes(id))
          details.push({
            field: 'answerData.correct',
            message: `correct has unknown id ${id}`,
          });
      }
      if (!((key.correct as string[]) ?? []).length) {
        details.push({
          field: 'answerData.correct',
          message: 'correct must have at least 1 entries',
        });
      }
    }
    if (
      type === 'scenario' &&
      !((key.expectedConcepts as unknown[]) ?? []).length
    ) {
      details.push({
        field: 'answerData.expectedConcepts',
        message: 'expectedConcepts must be a list of 1-20 concepts',
      });
    }
    return details;
  }

  private reorder(
    kind: 'course' | 'module' | 'lesson' | 'exercise',
    parent: string,
    ids: unknown,
  ) {
    const current = this.children(kind, parent).map((x) => x.id);
    const list = Array.isArray(ids) ? (ids as string[]) : [];
    if (
      list.length !== current.length ||
      new Set(list).size !== list.length ||
      list.some((id) => !current.includes(id))
    ) {
      return invalid([{ field: 'ids', message: 'ids must list every item' }]);
    }
    const store = {
      course: this.courses,
      module: this.modules,
      lesson: this.lessons,
      exercise: this.exercises,
    }[kind];
    list.forEach((id, index) => {
      (store.get(id) as { orderIndex: number }).orderIndex = index + 1;
    });
    return { status: 204 };
  }

  private removeTree(
    kind: 'course' | 'module' | 'lesson' | 'exercise',
    id: string,
  ) {
    if (kind === 'course') {
      for (const m of this.children('module', id))
        this.removeTree('module', m.id);
      this.courses.delete(id);
    } else if (kind === 'module') {
      for (const l of this.children('lesson', id))
        this.removeTree('lesson', l.id);
      this.modules.delete(id);
    } else if (kind === 'lesson') {
      for (const e of this.children('exercise', id))
        this.exercises.delete(e.id);
      this.lessons.delete(id);
    } else {
      this.exercises.delete(id);
    }
  }

  // Translations --------------------------------------------------------------

  /** A manual translation saved for `english` (default: the current English). */
  addTranslation(
    kind: TranslatableKind,
    id: string,
    field: string,
    text: string,
    english?: string,
  ): void {
    const source =
      english ??
      this.sourceTexts(kind, id)!.find((entry) => entry.field === field)!.text;
    this.translations.set(`${kind}:${id}:${field}`, {
      text,
      sourceHash: hash(source),
      updatedAt: now(),
    });
  }

  private sourceTexts(kind: TranslatableKind, id: string): SourceText[] | null {
    const text = (
      field: string,
      value: string,
      maxLength: number,
      markdown = false,
    ): SourceText => ({ field, text: value, markdown, maxLength });
    const labels = (prefix: string, list: unknown): SourceText[] =>
      ((list as { id: string; text: string }[] | undefined) ?? []).map((l) =>
        text(`${prefix}.${l.id}`, l.text, 500),
      );
    let texts: SourceText[];
    if (kind === 'course' || kind === 'module') {
      const row = (kind === 'course' ? this.courses : this.modules).get(id);
      if (!row) return null;
      texts = [
        text('title', row.title, 160),
        text('description', row.description, 2000),
      ];
    } else if (kind === 'lesson') {
      const row = this.lessons.get(id);
      if (!row) return null;
      texts = [
        text('title', row.title, 160),
        text('content_md', row.contentMd, 100_000, true),
      ];
    } else {
      const row = this.exercises.get(id);
      if (!row) return null;
      texts = [
        text('question', row.question, 2000, true),
        ...labels('option', row.promptData.options),
        ...labels('category', row.promptData.categories),
        ...labels('item', row.promptData.items),
        text('explanation', row.explanation, 10_000, true),
        text(
          'model_answer',
          String(row.answerData.modelAnswer ?? ''),
          10_000,
          true,
        ),
        ...labels('rubric', row.answerData.rubric),
      ];
    }
    return texts.filter((entry) => entry.text.trim());
  }

  private describeTranslations(kind: TranslatableKind, id: string) {
    const fields = this.sourceTexts(kind, id)!.map((source) => {
      const key = `${kind}:${id}:${source.field}`;
      const manual = this.translations.get(key);
      const sourceHash = hash(source.text);
      let status = 'missing';
      if (manual)
        status = manual.sourceHash === sourceHash ? 'current' : 'stale';
      return {
        field: source.field,
        markdown: source.markdown,
        maxLength: source.maxLength,
        source: source.text,
        sourceHash,
        text: manual?.text ?? null,
        status,
        machineText: this.machine.get(key) ?? null,
        updatedAt: manual?.updatedAt ?? null,
      };
    });
    return { entityType: kind, entityId: id, language: 'vi', fields };
  }

  /** `GET` / `PUT /admin/<kind>s/:id/translations`, with the backend checks. */
  private translationRoute(
    resource: string,
    id: string,
    method: string,
    body: Record<string, unknown>,
  ): Result | undefined {
    const kind = KIND_BY_RESOURCE[resource];
    if (!kind) return undefined;
    const texts = this.sourceTexts(kind, id);
    if (!texts) return notFound(kind.charAt(0).toUpperCase() + kind.slice(1));
    if (method === 'GET') {
      return { status: 200, json: this.describeTranslations(kind, id) };
    }
    if (method !== 'PUT') return undefined;

    const writes = (body.fields ?? []) as {
      field: string;
      sourceHash: string;
      text: string | null;
    }[];
    if (!Array.isArray(writes) || writes.length === 0) {
      return invalid([
        { field: 'fields', message: 'fields must contain at least 1 elements' },
      ]);
    }
    const errors: { field: string; message: string }[] = [];
    const conflicts: { field: string; message: string }[] = [];
    const seen = new Set<string>();
    writes.forEach((write, index) => {
      const at = `fields[${index}]`;
      const source = texts.find((entry) => entry.field === write.field);
      if (!source) {
        errors.push({
          field: `${at}.field`,
          message: `${write.field} is not a text of this content`,
        });
        return;
      }
      if (seen.has(write.field)) {
        errors.push({ field: `${at}.field`, message: 'field is listed twice' });
        return;
      }
      seen.add(write.field);
      if (write.sourceHash !== hash(source.text)) {
        conflicts.push({
          field: `${at}.sourceHash`,
          message: 'The English text changed since it was loaded',
        });
        return;
      }
      const value = write.text === null ? null : write.text.trim();
      if (value === null) return;
      if (!value) {
        errors.push({
          field: `${at}.text`,
          message: 'text must not be empty (null removes the translation)',
        });
      } else if (value.length > source.maxLength) {
        errors.push({
          field: `${at}.text`,
          message: `text must be at most ${source.maxLength} characters`,
        });
      } else if (source.markdown && headings(source.text) !== headings(value)) {
        errors.push({
          field: `${at}.text`,
          message: `text has ${headings(value)} headings, English has ${headings(source.text)}`,
        });
      }
    });
    if (errors.length > 0) return invalid(errors);
    if (conflicts.length > 0) {
      return err(
        409,
        'Conflict',
        'The English text changed since the editor was opened. Reload and translate again.',
        conflicts,
      );
    }
    for (const write of writes) {
      const key = `${kind}:${id}:${write.field}`;
      if (write.text === null) this.translations.delete(key);
      else {
        this.translations.set(key, {
          text: write.text.trim(),
          sourceHash: write.sourceHash,
          updatedAt: now(),
        });
      }
    }
    return { status: 200, json: this.describeTranslations(kind, id) };
  }

  // Routes ------------------------------------------------------------------

  handle(
    method: string,
    path: string,
    body: Record<string, unknown>,
    role: 'learner' | 'admin',
    query: URLSearchParams,
  ): Result | undefined {
    if (!path.startsWith('/admin/')) return undefined;
    if (role !== 'admin')
      return err(403, 'Forbidden', 'You do not have access to this resource');
    if (this.failing)
      return err(500, 'Internal Server Error', 'Internal server error');
    if (method !== 'GET') this.writes.push({ key: `${method} ${path}`, body });

    const parts = path.split('/').slice(2); // ['courses', id, ...]
    const [resource, id, sub, subAction] = parts;
    if (id && id !== 'reorder' && !UUID.test(id)) {
      return err(400, 'Bad Request', 'Validation failed (uuid is expected)');
    }

    if (sub === 'translations') {
      return this.translationRoute(resource, id, method, body);
    }

    if (resource === 'courses') {
      if (!id && method === 'GET') {
        const skill = SKILLS.find((s) => s.code === query.get('skill'));
        const status = query.get('status');
        const page = Number(query.get('page') ?? 1);
        const pageSize = Number(query.get('pageSize') ?? 20);
        if (query.get('skill') && !skill)
          return { status: 200, json: { items: [], total: 0, page, pageSize } };
        const all = [...this.courses.values()]
          .filter((c) => !skill || c.skillId === skill.id)
          .filter((c) => !status || c.status === status)
          .sort(
            (a, b) =>
              SKILLS.findIndex((s) => s.id === a.skillId) -
                SKILLS.findIndex((s) => s.id === b.skillId) ||
              a.orderIndex - b.orderIndex,
          );
        const items = all
          .slice((page - 1) * pageSize, page * pageSize)
          .map((c) => {
            const modules = this.children('module', c.id) as Module[];
            const lessons = modules.flatMap(
              (m) => this.children('lesson', m.id) as Lesson[],
            );
            return {
              id: c.id,
              slug: c.slug,
              title: c.title,
              description: c.description,
              status: c.status,
              orderIndex: c.orderIndex,
              skill: this.skill(c.skillId),
              moduleCount: modules.length,
              lessonCount: lessons.length,
              publishedLessonCount: lessons.filter(
                (l) =>
                  l.status === 'published' &&
                  this.modules.get(l.moduleId)!.status === 'published',
              ).length,
              updatedAt: c.updatedAt,
            };
          });
        return {
          status: 200,
          json: { items, total: all.length, page, pageSize },
        };
      }
      if (!id && method === 'POST') {
        if (!SKILLS.some((s) => s.id === body.skillId)) {
          return invalid([
            { field: 'skillId', message: 'skillId is not a skill' },
          ]);
        }
        if (this.slugTaken('course', body.slug, ''))
          return this.slugConflict('course');
        const course = this.addCourse({
          skillId: String(body.skillId),
          title: String(body.title).trim(),
          slug: String(body.slug),
          description: String(body.description ?? ''),
        });
        return { status: 201, json: this.courseDto(course) };
      }
      if (id === 'reorder' && method === 'PATCH') {
        return this.reorder('course', String(body.skillId), body.ids);
      }
      const course = this.courses.get(id!);
      if (!course) return notFound('Course');
      if (!sub && method === 'GET')
        return { status: 200, json: this.courseDto(course) };
      if (!sub && method === 'PATCH') {
        if (
          body.slug !== undefined &&
          this.slugTaken('course', body.slug, course.id)
        ) {
          return this.slugConflict('course');
        }
        Object.assign(course, body, { updatedAt: now() });
        return { status: 200, json: this.courseDto(course) };
      }
      if (!sub && method === 'DELETE') {
        if (this.courseInUse(course)) return err(409, 'Conflict', IN_USE);
        this.removeTree('course', course.id);
        return { status: 204 };
      }
      if (
        method === 'POST' &&
        (sub === 'publish' || sub === 'unpublish' || sub === 'archive')
      ) {
        if (sub === 'publish' && !this.canPublish(course)) {
          return err(
            409,
            'Conflict',
            'Publish at least one lesson in a published module first',
          );
        }
        course.status =
          sub === 'publish'
            ? 'published'
            : sub === 'archive'
              ? 'archived'
              : 'draft';
        course.updatedAt = now();
        return { status: 200, json: this.courseDto(course) };
      }
      if (sub === 'modules' && method === 'POST') {
        const module = this.addModule(course, {
          title: String(body.title).trim(),
          description: String(body.description ?? ''),
          status: (body.status as Status) ?? 'draft',
        });
        return { status: 201, json: this.moduleDto(module) };
      }
      if (sub === 'modules' && subAction === 'reorder' && method === 'PATCH') {
        return this.reorder('module', course.id, body.ids);
      }
    }

    if (resource === 'modules') {
      const module = this.modules.get(id!);
      if (!module) return notFound('Module');
      if (!sub && method === 'PATCH') {
        Object.assign(module, body);
        return { status: 200, json: this.moduleDto(module) };
      }
      if (!sub && method === 'DELETE') {
        if (this.moduleInUse(module)) return err(409, 'Conflict', IN_USE);
        this.removeTree('module', module.id);
        return { status: 204 };
      }
      if (sub === 'lessons' && method === 'POST') {
        if (this.slugTaken('lesson', body.slug, '', module.id))
          return this.slugConflict('lesson');
        const lesson = this.addLesson(module, {
          title: String(body.title).trim(),
          slug: String(body.slug),
          contentMd: String(body.contentMd ?? ''),
          status: (body.status as Status) ?? 'draft',
        });
        return { status: 201, json: this.lessonDto(lesson) };
      }
      if (sub === 'lessons' && subAction === 'reorder' && method === 'PATCH') {
        return this.reorder('lesson', module.id, body.ids);
      }
    }

    if (resource === 'lessons') {
      const lesson = this.lessons.get(id!);
      if (!lesson) return notFound('Lesson');
      if (!sub && method === 'GET')
        return { status: 200, json: this.lessonDto(lesson) };
      if (!sub && method === 'PATCH') {
        if (
          body.slug !== undefined &&
          this.slugTaken('lesson', body.slug, lesson.id, lesson.moduleId)
        ) {
          return this.slugConflict('lesson');
        }
        Object.assign(lesson, body, { updatedAt: now() });
        return { status: 200, json: this.lessonDto(lesson) };
      }
      if (!sub && method === 'DELETE') {
        if (this.lessonInUse(lesson)) return err(409, 'Conflict', IN_USE);
        this.removeTree('lesson', lesson.id);
        return { status: 204 };
      }
      if (sub === 'exercises' && method === 'POST') {
        const details = this.checkKey(
          String(body.type),
          body.promptData as Record<string, unknown>,
          body.answerData as Record<string, unknown>,
        );
        if (details.length) return invalid(details);
        const exercise = this.addExercise(lesson, {
          type: String(body.type),
          question: String(body.question).trim(),
          promptData: body.promptData as Record<string, unknown>,
          answerData: body.answerData as Record<string, unknown>,
          explanation: String(body.explanation ?? ''),
          difficulty: String(body.difficulty ?? 'easy'),
          status: (body.status as Status) ?? 'draft',
        });
        return { status: 201, json: this.exerciseDto(exercise) };
      }
      if (
        sub === 'exercises' &&
        subAction === 'reorder' &&
        method === 'PATCH'
      ) {
        return this.reorder('exercise', lesson.id, body.ids);
      }
    }

    if (resource === 'exercises') {
      const exercise = this.exercises.get(id!);
      if (!exercise) return notFound('Exercise');
      if (method === 'GET')
        return { status: 200, json: this.exerciseDto(exercise) };
      if (method === 'PATCH') {
        if ('type' in body)
          return invalid([
            { field: 'type', message: 'property type should not exist' },
          ]);
        const details = this.checkKey(
          exercise.type,
          (body.promptData as Record<string, unknown>) ?? exercise.promptData,
          (body.answerData as Record<string, unknown>) ?? exercise.answerData,
        );
        if (details.length) return invalid(details);
        Object.assign(exercise, body, { updatedAt: now() });
        return { status: 200, json: this.exerciseDto(exercise) };
      }
      if (method === 'DELETE') {
        if (this.exerciseInUse(exercise)) return err(409, 'Conflict', IN_USE);
        this.exercises.delete(exercise.id);
        return { status: 204 };
      }
    }
    return err(404, 'Not Found', `Cannot ${method} ${path}`);
  }
}
