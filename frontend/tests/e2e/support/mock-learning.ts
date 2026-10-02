/**
 * Learning part of the mock backend (docs/api.md › Learning). One course
 * mirrors the seed: two modules, four lessons. Progress is kept per user and
 * follows the same forward-only rules as the backend.
 */

type Status = 'not_started' | 'in_progress' | 'completed';

interface Progress {
  status: Status;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
}

const SKILLS = [
  'fundamentals',
  'testing_types',
  'test_design',
  'test_docs',
  'defect_mgmt',
  'api_testing',
  'automation',
].map((code, index) => ({
  id: `skill-${code}`,
  code,
  name: `API name ${code}`,
  description: '',
  orderIndex: index + 1,
}));

const LONG_BODY = Array.from(
  { length: 30 },
  (_, i) =>
    `Paragraph ${i + 1}. A tester produces information: what works, what does not, and what has not been checked yet.`,
).join('\n\n');

const COURSE = {
  id: '6f1d2a4e-0c1b-4d7e-9a3f-000000000001',
  slug: 'qa-fundamentals-first-steps',
  title: 'QA fundamentals: first steps',
  description: 'What software testing is, and how a tester works.',
  skill: { code: 'fundamentals', name: 'API name fundamentals' },
  orderIndex: 1,
};

const MODULES = [
  {
    id: 'module-1',
    title: 'What testing is',
    description: 'The vocabulary every QA engineer uses.',
    lessons: [
      {
        id: '6f1d2a4e-0c1b-4d7e-9a3f-000000001001',
        slug: 'why-we-test',
        title: 'Why we test',
        estimatedMinutes: 6,
        contentMd: `## Testing is about information\n\n| Found during | Cost |\n|---|---|\n| Review | Minutes |\n| Production | Days |\n\n${LONG_BODY}`,
      },
      {
        id: '6f1d2a4e-0c1b-4d7e-9a3f-000000001002',
        slug: 'errors-defects-failures',
        title: 'Errors, defects and failures',
        estimatedMinutes: 7,
        contentMd:
          '## The chain\n\nThe code says `age > 18` instead of `age >= 18`.',
      },
    ],
  },
  {
    id: 'module-2',
    title: 'How testing is done',
    description: '',
    lessons: [
      {
        id: '6f1d2a4e-0c1b-4d7e-9a3f-000000001003',
        slug: 'seven-testing-principles',
        title: 'The seven testing principles',
        estimatedMinutes: 8,
        contentMd: '1. **Testing shows the presence of defects.**',
      },
      {
        id: '6f1d2a4e-0c1b-4d7e-9a3f-000000001004',
        slug: 'stlc-test-process',
        title: 'STLC: the test process',
        estimatedMinutes: 10,
        contentMd:
          // Raw HTML must not be rendered (checked in learning.spec.ts).
          '> Every test case gets a verdict.\n\n<b data-testid="raw-html">raw</b> <script>window.__xss = 1</script>',
      },
    ],
  },
];

const LESSONS = MODULES.flatMap((module) =>
  module.lessons.map((lesson) => ({ ...lesson, module })),
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZES = [20, 50, 100];

type Result = { status: number; json?: unknown };
type Lang = 'en' | 'vi';
type CourseInfo = typeof COURSE;
type PublishedCourse = CourseInfo & {
  modules: {
    id: string;
    title: string;
    description: string;
    lessons: {
      id: string;
      slug: string;
      title: string;
      estimatedMinutes: number;
    }[];
  }[];
};

function notFound(message: string): Result {
  return {
    status: 404,
    json: { statusCode: 404, error: 'Not Found', message },
  };
}

function badRequest(field: string, message: string): Result {
  return {
    status: 400,
    json: {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: [{ field, message }],
    },
  };
}

const serverError: Result = {
  status: 500,
  json: {
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'Internal server error',
  },
};

export class MockLearning {
  /** No published courses at all (empty state). */
  empty = false;
  /** Learning endpoints answer 500 (error state). */
  failing = false;
  /** What `?lang=vi` returns: machine translation, or English fallback. */
  translation: 'manual' | 'machine' | 'unavailable' = 'machine';
  /** Every progress request body, for assertions. */
  readonly progressCalls: { lessonId: string; body: unknown }[] = [];
  /** Every `/courses` query, for assertions. */
  readonly courseQueries: Record<string, string>[] = [];
  /** Extra lesson-less courses (skill `test_design`) to fill pages. */
  private readonly extraCourses: CourseInfo[] = [];
  private readonly progress = new Map<string, Progress>(); // user:lesson
  /** Courses published in the admin mock (wired by `MockApi`). */
  publishedCourses: () => PublishedCourse[] = () => [];

  addCourses(count: number): void {
    const start = this.extraCourses.length;
    for (let i = 1; i <= count; i++) {
      const n = String(start + i).padStart(3, '0');
      this.extraCourses.push({
        id: `00000000-0000-4000-8000-000000000${n}`,
        slug: `design-course-${n}`,
        title: `Design course ${n}`,
        description: '',
        skill: { code: 'test_design', name: 'API name test_design' },
        orderIndex: start + i,
      });
    }
  }

  /** The user's progress on every sample lesson (for the dashboard mock). */
  progressOf(userId: string): ({ lessonId: string } & Progress)[] {
    return LESSONS.map((l) => ({ lessonId: l.id, ...this.get(userId, l.id) }));
  }

  /** Lesson-less courses added with `addCourses`. */
  get extras(): readonly CourseInfo[] {
    return this.extraCourses;
  }

  get(userId: string, lessonId: string): Progress {
    return (
      this.progress.get(`${userId}:${lessonId}`) ?? {
        status: 'not_started',
        progressPercent: 0,
        startedAt: null,
        completedAt: null,
        lastAccessedAt: null,
      }
    );
  }

  /** Pre-set progress, e.g. a lesson half read in an earlier visit. */
  setProgress(userId: string, lessonId: string, patch: Partial<Progress>) {
    const now = new Date().toISOString();
    this.progress.set(`${userId}:${lessonId}`, {
      ...this.get(userId, lessonId),
      startedAt: now,
      lastAccessedAt: now,
      ...patch,
    });
  }

  /** Content text in the requested language (mock translation: a prefix). */
  text(value: string, lang: Lang): string {
    return lang === 'vi' && this.translation !== 'unavailable' && value
      ? `(VI) ${value}`
      : value;
  }

  localized(lang: Lang) {
    return {
      language: lang,
      translation: lang === 'en' ? 'none' : this.translation,
    };
  }

  summary(userId: string, lang: Lang) {
    const statuses = LESSONS.map((l) => this.get(userId, l.id).status);
    const completed = statuses.filter((s) => s === 'completed').length;
    return {
      ...COURSE,
      title: this.text(COURSE.title, lang),
      description: this.text(COURSE.description, lang),
      estimatedMinutes: LESSONS.reduce((sum, l) => sum + l.estimatedMinutes, 0),
      progress: {
        totalLessons: LESSONS.length,
        completedLessons: completed,
        status:
          completed === LESSONS.length
            ? 'completed'
            : statuses.some((s) => s !== 'not_started')
              ? 'in_progress'
              : 'not_started',
      },
    };
  }

  extraSummary(course: CourseInfo, lang: Lang) {
    return {
      ...course,
      title: this.text(course.title, lang),
      estimatedMinutes: 0,
      progress: { totalLessons: 0, completedLessons: 0, status: 'not_started' },
    };
  }

  /** A course published through the admin mock, with the user's progress. */
  private publishedDetail(course: PublishedCourse, userId: string, lang: Lang) {
    const lessons = course.modules.flatMap((m) => m.lessons);
    const statuses = lessons.map((l) => this.get(userId, l.id).status);
    const completed = statuses.filter((s) => s === 'completed').length;
    return {
      ...course,
      title: this.text(course.title, lang),
      description: this.text(course.description, lang),
      estimatedMinutes: lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0),
      progress: {
        totalLessons: lessons.length,
        completedLessons: completed,
        status:
          lessons.length > 0 && completed === lessons.length
            ? 'completed'
            : statuses.some((s) => s !== 'not_started')
              ? 'in_progress'
              : 'not_started',
      },
      modules: course.modules.map((m) => ({
        ...m,
        title: this.text(m.title, lang),
        description: this.text(m.description, lang),
        lessons: m.lessons.map((l) => ({
          ...l,
          title: this.text(l.title, lang),
          progress: this.get(userId, l.id),
        })),
      })),
      nextLessonId:
        lessons.find((l) => this.get(userId, l.id).status !== 'completed')
          ?.id ?? null,
    };
  }

  private nextLessonId(userId: string): string | null {
    return (
      LESSONS.find((l) => this.get(userId, l.id).status !== 'completed')?.id ??
      null
    );
  }

  continueItem(userId: string, lang: Lang) {
    const touched = LESSONS.map((l) => ({ l, p: this.get(userId, l.id) }))
      .filter(({ p }) => p.lastAccessedAt)
      .sort((a, b) => b.p.lastAccessedAt!.localeCompare(a.p.lastAccessedAt!));
    const latest = touched[0];
    let lesson = latest && latest.p.status !== 'completed' ? latest.l : null;
    let reason = 'resume';
    if (!lesson) {
      const nextId = this.nextLessonId(userId);
      lesson = LESSONS.find((l) => l.id === nextId) ?? null;
      reason = latest ? 'next' : 'start';
      // A lesson that was already opened is resumed, not started.
      if (lesson && this.get(userId, lesson.id).status === 'in_progress') {
        reason = 'resume';
      }
    }
    if (!lesson) return null;
    return {
      reason,
      lessonId: lesson.id,
      lessonTitle: this.text(lesson.title, lang),
      estimatedMinutes: lesson.estimatedMinutes,
      course: {
        id: COURSE.id,
        slug: COURSE.slug,
        title: this.text(COURSE.title, lang),
      },
      module: {
        id: lesson.module.id,
        title: this.text(lesson.module.title, lang),
      },
      progress: this.get(userId, lesson.id),
    };
  }

  handle(
    method: string,
    path: string,
    body: Record<string, unknown>,
    userId: string,
    query: URLSearchParams,
  ): Result | null {
    const isLearning =
      /^\/(skills|courses|continue)(\/|$)/.test(path) ||
      path.startsWith('/lessons/');
    if (!isLearning) return null;
    if (this.failing) return serverError;

    const langParam = query.get('lang') ?? 'en';
    if (langParam !== 'en' && langParam !== 'vi') {
      return badRequest('lang', 'lang must be one of: en, vi');
    }
    const lang: Lang = langParam;

    if (method === 'GET' && path === '/skills') {
      return { status: 200, json: SKILLS };
    }

    if (method === 'GET' && path === '/courses') {
      this.courseQueries.push(Object.fromEntries(query));
      const page = Number(query.get('page') ?? 1);
      const pageSize = Number(query.get('pageSize') ?? 20);
      if (!Number.isInteger(page) || page < 1) {
        return badRequest('page', 'page must not be less than 1');
      }
      if (!PAGE_SIZES.includes(pageSize)) {
        return badRequest('pageSize', 'pageSize must be one of 20, 50, 100');
      }
      const skill = query.get('skill');
      const all = this.empty
        ? []
        : [
            this.summary(userId, lang),
            ...this.extraCourses.map((c) => this.extraSummary(c, lang)),
            ...this.publishedCourses().map((c) => {
              const {
                modules: _m,
                nextLessonId: _n,
                ...summary
              } = this.publishedDetail(c, userId, lang);
              return summary;
            }),
          ];
      const matching = all.filter((c) => !skill || c.skill.code === skill);
      return {
        status: 200,
        json: {
          items: matching.slice((page - 1) * pageSize, page * pageSize),
          total: matching.length,
          page,
          pageSize,
          ...this.localized(lang),
        },
      };
    }

    if (method === 'GET' && path.startsWith('/courses/')) {
      const published = this.publishedCourses().find(
        (c) => path === `/courses/${c.slug}`,
      );
      if (published && !this.empty) {
        return {
          status: 200,
          json: {
            ...this.publishedDetail(published, userId, lang),
            ...this.localized(lang),
          },
        };
      }
      if (this.empty || path !== `/courses/${COURSE.slug}`) {
        return notFound('Course not found');
      }
      return {
        status: 200,
        json: {
          ...this.summary(userId, lang),
          modules: MODULES.map((module) => ({
            id: module.id,
            title: this.text(module.title, lang),
            description: this.text(module.description, lang),
            lessons: module.lessons.map(({ contentMd: _c, ...lesson }) => ({
              ...lesson,
              title: this.text(lesson.title, lang),
              progress: this.get(userId, lesson.id),
            })),
          })),
          nextLessonId: this.nextLessonId(userId),
          ...this.localized(lang),
        },
      };
    }

    if (method === 'GET' && path === '/continue') {
      const item = this.empty ? null : this.continueItem(userId, lang);
      return {
        status: 200,
        json: item
          ? { item, ...this.localized(lang) }
          : { item: null, language: lang, translation: 'none' },
      };
    }

    const match = /^\/lessons\/([^/]+)(\/progress)?$/.exec(path);
    if (match) {
      const [, id, progressPath] = match;
      if (!UUID.test(id)) {
        return {
          status: 400,
          json: {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Validation failed (uuid is expected)',
          },
        };
      }
      const index = LESSONS.findIndex((l) => l.id === id);
      if (this.empty || index === -1) return notFound('Lesson not found');
      const lesson = LESSONS[index];

      if (method === 'POST' && progressPath) {
        this.progressCalls.push({ lessonId: id, body });
        const old = this.get(userId, id);
        const now = new Date().toISOString();
        const completed = body.complete === true || old.status === 'completed';
        const next: Progress = {
          status: completed ? 'completed' : 'in_progress',
          progressPercent: completed
            ? 100
            : Math.max(old.progressPercent, Number(body.progressPercent ?? 0)),
          startedAt: old.startedAt ?? now,
          completedAt: completed ? (old.completedAt ?? now) : null,
          lastAccessedAt: now,
        };
        this.progress.set(`${userId}:${id}`, next);
        return { status: 200, json: next };
      }

      if (method === 'GET' && !progressPath) {
        const ref = (l: (typeof LESSONS)[number] | undefined) =>
          l ? { id: l.id, title: this.text(l.title, lang) } : null;
        return {
          status: 200,
          json: {
            id: lesson.id,
            slug: lesson.slug,
            title: this.text(lesson.title, lang),
            // Like the real pipeline: Markdown markers stay where they are.
            contentMd:
              lang === 'vi' && this.translation !== 'unavailable'
                ? lesson.contentMd.replace(/^(#{1,6} |> |d+. )?/, '$1(VI) ')
                : lesson.contentMd,
            estimatedMinutes: lesson.estimatedMinutes,
            course: {
              id: COURSE.id,
              slug: COURSE.slug,
              title: this.text(COURSE.title, lang),
            },
            module: {
              id: lesson.module.id,
              title: this.text(lesson.module.title, lang),
            },
            previousLesson: ref(LESSONS[index - 1]),
            nextLesson: ref(LESSONS[index + 1]),
            progress: this.get(userId, id),
            ...this.localized(lang),
          },
        };
      }
    }
    return null;
  }
}

export const SAMPLE = {
  course: COURSE,
  lessons: LESSONS.map(({ id, title }) => ({ id, title })),
  modules: MODULES,
  skills: SKILLS,
};
