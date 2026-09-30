import { SAMPLE } from './mock-learning.ts';

/**
 * Practice part of the mock backend (docs/api.md › Practice). Exercises
 * mirror the seed (one per type, on the sample lessons). Attempts are kept
 * per user and graded here with the same rules as the backend
 * (`backend/src/practice/grading.ts`), in a smaller form: exact match for
 * multiple choice, % for classification, required fields + severity/priority
 * + keyword coverage for the free-text types (pass at 70).
 */

type Result = { status: number; json?: unknown };
type Lang = 'en' | 'vi';
type Type =
  | 'multiple_choice'
  | 'classification'
  | 'test_case'
  | 'bug_report'
  | 'scenario';

interface Label {
  id: string;
  text: string;
}

interface Concept {
  concept: string;
  keywords: string[];
}

interface MockExercise {
  id: string;
  type: Type;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  lessonIndex: number;
  prompt: {
    options?: Label[];
    multiple?: boolean;
    categories?: Label[];
    items?: Label[];
  };
  key: {
    correct?: string[];
    mapping?: Record<string, string>;
    requiredFields?: string[];
    expectedSeverity?: string;
    expectedPriority?: string;
    expectedConcepts?: Concept[];
    modelAnswer?: string;
    rubric?: Label[];
  };
  explanation: string;
}

interface MockAttempt {
  id: string;
  userId: string;
  exerciseId: string;
  score: number;
  isCorrect: boolean;
  answer: Record<string, unknown>;
  feedback: Record<string, unknown>;
  selfAssessment: { checked: string[] } | null;
  attemptedAt: string;
}

const id = (n: number) => `6f1d2a4e-0c1b-4d7e-9a3f-00000000200${n}`;

const RUBRIC = [
  { id: 'bva', text: 'I tested both boundaries' },
  { id: 'invalid', text: 'I included invalid input' },
];

export const EXERCISES: MockExercise[] = [
  {
    id: id(1),
    type: 'multiple_choice',
    difficulty: 'easy',
    lessonIndex: 0,
    question:
      'Which of these activities is testing, even though no code is run?',
    prompt: {
      multiple: false,
      options: [
        { id: 'review', text: 'Reviewing the requirements' },
        { id: 'coding', text: 'Writing the code' },
        { id: 'deploy', text: 'Deploying to production' },
      ],
    },
    key: { correct: ['review'] },
    explanation: 'Reviewing requirements is **static testing**.',
  },
  {
    id: id(2),
    type: 'classification',
    difficulty: 'easy',
    lessonIndex: 1,
    question:
      'Classify each situation as an **error**, a **defect** or a **failure**.',
    prompt: {
      categories: [
        { id: 'error', text: 'Error' },
        { id: 'defect', text: 'Defect' },
        { id: 'failure', text: 'Failure' },
      ],
      items: [
        { id: 'misread', text: 'A developer misreads the rule' },
        { id: 'wrong-rate', text: 'The code applies 10 % instead of 15 %' },
        { id: 'charged', text: 'A customer is charged the wrong amount' },
      ],
    },
    key: {
      mapping: { misread: 'error', 'wrong-rate': 'defect', charged: 'failure' },
    },
    explanation: 'The chain is error → defect → failure.',
  },
  {
    id: id(3),
    type: 'bug_report',
    difficulty: 'medium',
    lessonIndex: 1,
    question:
      'Write a bug report. With `SAVE15`, the total is **18.00 USD** instead of 17.00 USD.',
    prompt: {},
    key: {
      requiredFields: [
        'title',
        'stepsToReproduce',
        'actualResult',
        'expectedResult',
      ],
      expectedSeverity: 'major',
      expectedPriority: 'high',
      expectedConcepts: [
        { concept: 'Discount code', keywords: ['save15', 'discount'] },
        { concept: 'Actual total', keywords: ['18'] },
      ],
      modelAnswer: '**Title:** Checkout total ignores part of the discount',
      rubric: [
        { id: 'repro', text: 'Someone could reproduce it from my steps' },
      ],
    },
    explanation: 'Numbers matter in a bug report.',
  },
  {
    id: id(4),
    type: 'scenario',
    difficulty: 'medium',
    lessonIndex: 2,
    question:
      'Your manager wants every possible age tested. What do you test instead?',
    prompt: {},
    key: {
      expectedConcepts: [
        { concept: 'Boundary values', keywords: ['boundar', '17', '66'] },
        { concept: 'Invalid values', keywords: ['invalid', 'negative'] },
      ],
      modelAnswer: 'Test **17, 18, 65, 66** and invalid input.',
      rubric: RUBRIC,
    },
    explanation: 'Exhaustive testing is impossible.',
  },
  {
    id: id(5),
    type: 'test_case',
    difficulty: 'easy',
    lessonIndex: 3,
    question:
      'Write a test case for logging in with a valid email and password.',
    prompt: {},
    key: {
      requiredFields: ['title', 'steps', 'expectedResult', 'priority'],
      expectedConcepts: [
        { concept: 'Valid credentials', keywords: ['valid'] },
        { concept: 'Dashboard shown', keywords: ['dashboard'] },
      ],
      modelAnswer:
        '| Field | Value |\n|---|---|\n| Title | Log in with valid credentials |',
      rubric: [{ id: 'data', text: 'I gave concrete test data' }],
    },
    explanation: 'A test case must be repeatable.',
  },
];

const FREE: Type[] = ['test_case', 'bug_report', 'scenario'];
const TYPES: Type[] = ['multiple_choice', 'classification', ...FREE];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bad(details: { field: string; message: string }[]): Result {
  return {
    status: 400,
    json: {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details,
    },
  };
}

const notFound = (message: string): Result => ({
  status: 404,
  json: { statusCode: 404, error: 'Not Found', message },
});

const serverError: Result = {
  status: 500,
  json: {
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'Internal server error',
  },
};

const normalize = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function concepts(texts: unknown[], list: Concept[] = []) {
  const haystack = normalize(
    texts.filter((t) => typeof t === 'string').join('\n'),
  );
  return list.map(({ concept, keywords }) => ({
    concept,
    matched: keywords.some((k) =>
      new RegExp(`(?:^|[^\\p{L}\\p{N}])${normalize(k)}`, 'u').test(haystack),
    ),
  }));
}

const percent = (part: number, whole: number) =>
  whole === 0 ? 100 : Math.round((part / whole) * 100);

function combine(
  parts: { part: string; score: number; weight: number; applies: boolean }[],
) {
  const active = parts.filter((p) => p.applies);
  const total = active.reduce((sum, p) => sum + p.weight, 0);
  return {
    score: Math.round(
      active.reduce((sum, p) => sum + p.score * p.weight, 0) / total,
    ),
    parts: active.map(({ part, score, weight }) => ({
      part,
      score,
      weight: Math.round((weight / total) * 100),
    })),
  };
}

const present = (value: unknown) =>
  Array.isArray(value)
    ? value.length > 0
    : value !== null && value !== undefined && value !== '';

export class MockPractice {
  /** No exercises published (empty states). */
  empty = false;
  /** Practice endpoints answer 500 (error state). */
  failing = false;
  /** Only attempt submission answers 500. */
  submitFailing = false;
  /** Every submitted body, for assertions. */
  readonly attemptCalls: { exerciseId: string; body: unknown }[] = [];
  private readonly attempts: MockAttempt[] = [];
  private clock = Date.parse('2026-09-30T08:00:00Z');

  private text(value: string, lang: Lang) {
    return lang === 'vi' && value ? `(VI) ${value}` : value;
  }

  private stats(userId: string, exerciseId: string) {
    const own = this.own(userId, exerciseId);
    return {
      attemptCount: own.length,
      bestScore: own.length ? Math.max(...own.map((a) => a.score)) : null,
      lastScore: own[0]?.score ?? null,
      lastAttemptedAt: own[0]?.attemptedAt ?? null,
      passed: own.some((a) => a.isCorrect),
    };
  }

  private own(userId: string, exerciseId: string) {
    return this.attempts
      .filter((a) => a.userId === userId && a.exerciseId === exerciseId)
      .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt));
  }

  private summary(exercise: MockExercise, userId: string, lang: Lang) {
    const lesson = SAMPLE.lessons[exercise.lessonIndex];
    return {
      id: exercise.id,
      type: exercise.type,
      difficulty: exercise.difficulty,
      question: this.text(exercise.question, lang),
      lesson: { id: lesson.id, title: this.text(lesson.title, lang) },
      course: {
        id: SAMPLE.course.id,
        slug: SAMPLE.course.slug,
        title: this.text(SAMPLE.course.title, lang),
      },
      skill: { code: 'fundamentals', name: 'API name fundamentals' },
      stats: this.stats(userId, exercise.id),
    };
  }

  private review(exercise: MockExercise, lang: Lang) {
    const free = FREE.includes(exercise.type);
    return {
      explanation: this.text(exercise.explanation, lang),
      modelAnswer: free
        ? this.text(exercise.key.modelAnswer ?? '', lang)
        : null,
      rubric: free
        ? (exercise.key.rubric ?? []).map((r) => ({
            ...r,
            text: this.text(r.text, lang),
          }))
        : [],
    };
  }

  private localized(lang: Lang) {
    return { language: lang, translation: lang === 'en' ? 'none' : 'manual' };
  }

  /** Validates like `parseAnswer`: returns details, or the normalised answer. */
  private parse(exercise: MockExercise, raw: unknown) {
    const details: { field: string; message: string }[] = [];
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return { details: [{ field: 'answer', message: 'must be an object' }] };
    }
    const answer = raw as Record<string, unknown>;
    switch (exercise.type) {
      case 'multiple_choice': {
        const selected = answer.selected as string[];
        const ids = exercise.prompt.options!.map((o) => o.id);
        if (
          !Array.isArray(selected) ||
          selected.length === 0 ||
          (!exercise.prompt.multiple && selected.length > 1) ||
          selected.some((s) => !ids.includes(s))
        )
          details.push({
            field: 'answer.selected',
            message: 'selected is invalid',
          });
        return { details, answer: { selected } };
      }
      case 'classification': {
        const mapping = (answer.mapping ?? {}) as Record<string, string>;
        for (const item of exercise.prompt.items!) {
          if (!mapping[item.id])
            details.push({
              field: `answer.mapping.${item.id}`,
              message: `${item.id} must be classified`,
            });
        }
        return { details, answer: { mapping } };
      }
      case 'scenario': {
        const text = typeof answer.text === 'string' ? answer.text.trim() : '';
        if (!text)
          details.push({
            field: 'answer.text',
            message: 'text must not be empty',
          });
        return { details, answer: { text } };
      }
      default: {
        const normalized: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(answer)) {
          normalized[k] = Array.isArray(v)
            ? v.map((s: string) => s.trim()).filter(Boolean)
            : typeof v === 'string'
              ? v.trim()
              : v;
        }
        if (!Object.values(normalized).some(present))
          details.push({
            field: 'answer.title',
            message: 'Fill in at least one field',
          });
        return { details, answer: normalized };
      }
    }
  }

  private grade(exercise: MockExercise, answer: Record<string, unknown>) {
    const { key, prompt } = exercise;
    switch (exercise.type) {
      case 'multiple_choice': {
        const selected = answer.selected as string[];
        const options = prompt.options!.map((o) => ({
          id: o.id,
          selected: selected.includes(o.id),
          correct: key.correct!.includes(o.id),
        }));
        const isCorrect = options.every((o) => o.selected === o.correct);
        return {
          score: isCorrect ? 100 : 0,
          isCorrect,
          feedback: { type: 'multiple_choice', options },
        };
      }
      case 'classification': {
        const mapping = answer.mapping as Record<string, string>;
        const items = prompt.items!.map((i) => ({
          id: i.id,
          chosen: mapping[i.id],
          correct: key.mapping![i.id],
          isCorrect: mapping[i.id] === key.mapping![i.id],
        }));
        const correctCount = items.filter((i) => i.isCorrect).length;
        return {
          score: percent(correctCount, items.length),
          isCorrect: correctCount === items.length,
          feedback: {
            type: 'classification',
            items,
            correctCount,
            total: items.length,
          },
        };
      }
      default: {
        const fields = (key.requiredFields ?? []).map((field) => ({
          field,
          present: present(answer[field]),
        }));
        const texts = Object.entries(answer)
          .filter(([k]) => !['testCaseId', 'bugId', 'attachment'].includes(k))
          .flatMap(([, v]) => (Array.isArray(v) ? v : [v]));
        const found = concepts(texts, key.expectedConcepts);
        const fieldScore = percent(
          fields.filter((f) => f.present).length,
          fields.length,
        );
        const conceptScore = percent(
          found.filter((c) => c.matched).length,
          found.length,
        );
        if (exercise.type === 'scenario') {
          const { score, parts } = combine([
            {
              part: 'concepts',
              score: conceptScore,
              weight: 100,
              applies: true,
            },
          ]);
          return {
            score,
            isCorrect: score >= 70,
            feedback: { type: 'scenario', parts, concepts: found },
          };
        }
        if (exercise.type === 'test_case') {
          const { score, parts } = combine([
            {
              part: 'fields',
              score: fieldScore,
              weight: 40,
              applies: fields.length > 0,
            },
            {
              part: 'concepts',
              score: conceptScore,
              weight: 60,
              applies: found.length > 0,
            },
          ]);
          return {
            score,
            isCorrect: score >= 70,
            feedback: { type: 'test_case', parts, fields, concepts: found },
          };
        }
        const match = (expected: string, given: unknown) => ({
          expected,
          given: (given as string | null) ?? null,
          match: given === expected,
        });
        const severity = match(key.expectedSeverity!, answer.severity);
        const priority = match(key.expectedPriority!, answer.priority);
        const { score, parts } = combine([
          {
            part: 'fields',
            score: fieldScore,
            weight: 30,
            applies: fields.length > 0,
          },
          {
            part: 'severity',
            score: severity.match ? 100 : 0,
            weight: 20,
            applies: true,
          },
          {
            part: 'priority',
            score: priority.match ? 100 : 0,
            weight: 20,
            applies: true,
          },
          {
            part: 'concepts',
            score: conceptScore,
            weight: 30,
            applies: found.length > 0,
          },
        ]);
        return {
          score,
          isCorrect: score >= 70,
          feedback: {
            type: 'bug_report',
            parts,
            fields,
            severity,
            priority,
            concepts: found,
          },
        };
      }
    }
  }

  private attemptDto({ userId: _user, ...attempt }: MockAttempt) {
    return attempt;
  }

  handle(
    method: string,
    path: string,
    body: Record<string, unknown>,
    userId: string,
    query: URLSearchParams,
  ): Result | null {
    if (!path.startsWith('/exercises')) return null;
    if (this.failing) return serverError;
    const lang = (query.get('lang') ?? 'en') as Lang;
    const visible = this.empty ? [] : EXERCISES;

    if (method === 'GET' && path === '/exercises') {
      const types = query.get('type')?.split(',');
      if (types?.some((t) => !TYPES.includes(t as Type))) {
        return bad([
          { field: 'type', message: 'type must be one or more of …' },
        ]);
      }
      const page = Number(query.get('page') ?? 1);
      const pageSize = Number(query.get('pageSize') ?? 20);
      const skill = query.get('skill');
      const difficulty = query.get('difficulty');
      const lessonId = query.get('lessonId');
      const matching = visible
        .filter((e) => !types || types.includes(e.type))
        .filter(() => !skill || skill === 'fundamentals')
        .filter((e) => !difficulty || e.difficulty === difficulty)
        .filter(
          (e) => !lessonId || SAMPLE.lessons[e.lessonIndex].id === lessonId,
        );
      return {
        status: 200,
        json: {
          items: matching
            .slice((page - 1) * pageSize, page * pageSize)
            .map((e) => this.summary(e, userId, lang)),
          total: matching.length,
          page,
          pageSize,
          ...this.localized(lang),
        },
      };
    }

    const match =
      /^\/exercises\/([^/]+)(\/attempts)?(?:\/([^/]+)\/self-assessment)?$/.exec(
        path,
      );
    if (!match) return null;
    const [, exerciseId, attemptsPart, attemptId] = match;
    if (!UUID.test(exerciseId))
      return bad([{ field: 'id', message: 'uuid is expected' }]);
    const exercise = visible.find((e) => e.id === exerciseId);
    if (!exercise) return notFound('Exercise not found');

    if (method === 'GET' && !attemptsPart) {
      return {
        status: 200,
        json: {
          ...this.summary(exercise, userId, lang),
          prompt: {
            ...exercise.prompt,
            options: exercise.prompt.options?.map((o) => ({
              ...o,
              text: this.text(o.text, lang),
            })),
            items: exercise.prompt.items?.map((o) => ({
              ...o,
              text: this.text(o.text, lang),
            })),
            categories: exercise.prompt.categories?.map((o) => ({
              ...o,
              text: this.text(o.text, lang),
            })),
          },
          ...this.localized(lang),
        },
      };
    }

    if (method === 'POST' && attemptsPart && !attemptId) {
      this.attemptCalls.push({ exerciseId, body });
      if (this.submitFailing) return serverError;
      const parsed = this.parse(exercise, body.answer);
      if (parsed.details.length > 0) return bad(parsed.details);
      const graded = this.grade(exercise, parsed.answer!);
      this.clock += 60_000;
      const attempt: MockAttempt = {
        id: `00000000-0000-4000-8000-${String(this.attempts.length + 1).padStart(12, '0')}`,
        userId,
        exerciseId,
        answer: parsed.answer!,
        ...graded,
        selfAssessment: null,
        attemptedAt: new Date(this.clock).toISOString(),
      };
      this.attempts.push(attempt);
      return {
        status: 201,
        json: {
          attempt: this.attemptDto(attempt),
          review: this.review(exercise, lang),
          ...this.localized(lang),
        },
      };
    }

    if (method === 'GET' && attemptsPart && !attemptId) {
      const page = Number(query.get('page') ?? 1);
      const pageSize = Number(query.get('pageSize') ?? 20);
      const own = this.own(userId, exerciseId);
      return {
        status: 200,
        json: {
          items: own
            .slice((page - 1) * pageSize, page * pageSize)
            .map((a) => this.attemptDto(a)),
          total: own.length,
          page,
          pageSize,
          review: own.length ? this.review(exercise, lang) : null,
          ...this.localized(lang),
        },
      };
    }

    if (method === 'POST' && attemptId) {
      const attempt = this.own(userId, exerciseId).find(
        (a) => a.id === attemptId,
      );
      if (!attempt) return notFound('Attempt not found');
      if (!FREE.includes(exercise.type)) {
        return {
          status: 400,
          json: {
            statusCode: 400,
            error: 'Bad Request',
            message: 'This exercise type has no self-assessment',
          },
        };
      }
      if (attempt.selfAssessment) {
        return {
          status: 409,
          json: {
            statusCode: 409,
            error: 'Conflict',
            message: 'The self-assessment is already saved',
          },
        };
      }
      attempt.selfAssessment = { checked: body.checked as string[] };
      return { status: 200, json: this.attemptDto(attempt) };
    }

    return null;
  }
}
