import { type MockLearning, SAMPLE } from './mock-learning.ts';
import {
  EXERCISES,
  type MockAttempt,
  type MockPractice,
} from './mock-practice.ts';

/**
 * Dashboard and progress part of the mock backend (docs/api.md › Dashboard).
 * Everything is derived from the learning and practice mocks' state, with
 * the backend rules: the best attempt per exercise counts, pass mark 70,
 * streak days in the requested time zone, activity newest first.
 */

type Result = { status: number; json?: unknown };
type Lang = 'en' | 'vi';

const PASS_SCORE = 70;
const STREAK_WINDOW = 14;
const RECENT_LIMIT = 10;
const PAGE_SIZES = [20, 50, 100];

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

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return zone.length <= 64;
  } catch {
    return false;
  }
}

const localDate = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function streakOf(active: Set<string>, today: string) {
  const activeToday = active.has(today);
  let current = 0;
  for (
    let day = activeToday ? today : addDays(today, -1);
    active.has(day);
    day = addDays(day, -1)
  ) {
    current += 1;
  }
  let longest = 0;
  for (const start of active) {
    if (active.has(addDays(start, -1))) continue;
    let length = 0;
    for (let day = start; active.has(day); day = addDays(day, 1)) length += 1;
    longest = Math.max(longest, length);
  }
  const days = Array.from({ length: STREAK_WINDOW }, (_, i) => {
    const date = addDays(today, i - STREAK_WINDOW + 1);
    return { date, active: active.has(date) };
  });
  return { current, longest, activeToday, days };
}

const average = (values: number[]) =>
  values.length
    ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
    : null;

export class MockDashboard {
  /** Dashboard and progress endpoints answer 500 (error state). */
  failing = false;
  /** Every `?tz=` sent, for assertions. */
  readonly timeZones: string[] = [];

  private readonly learning: MockLearning;
  private readonly practice: MockPractice;

  constructor(learning: MockLearning, practice: MockPractice) {
    this.learning = learning;
    this.practice = practice;
  }

  private get exercises() {
    return this.practice.empty ? [] : EXERCISES;
  }

  /** Best attempt per attempted exercise (highest score, then the latest). */
  private best(userId: string): Map<string, MockAttempt & { passed: boolean }> {
    const result = new Map<string, MockAttempt & { passed: boolean }>();
    for (const exercise of this.exercises) {
      const own = this.practice.attempts
        .filter((a) => a.userId === userId && a.exerciseId === exercise.id)
        .sort(
          (a, b) =>
            b.score - a.score || b.attemptedAt.localeCompare(a.attemptedAt),
        );
      if (own.length) {
        result.set(exercise.id, {
          ...own[0],
          passed: own.some((a) => a.isCorrect),
        });
      }
    }
    return result;
  }

  private totals(userId: string, exerciseIds: string[]) {
    const best = this.best(userId);
    const attempted = exerciseIds.flatMap((id) => best.get(id) ?? []);
    return {
      total: exerciseIds.length,
      attempted: attempted.length,
      passed: attempted.filter((a) => a.passed).length,
      averageScore: average(attempted.map((a) => a.score)),
    };
  }

  private events(userId: string) {
    const lessons = this.learning.empty ? [] : this.learning.progressOf(userId);
    const events: {
      kind: string;
      occurredAt: string;
      lessonId: string;
      exerciseId: string | null;
      score: number | null;
      isCorrect: boolean | null;
    }[] = [];
    const base = { exerciseId: null, score: null, isCorrect: null };
    for (const p of lessons) {
      if (p.startedAt)
        events.push({
          ...base,
          kind: 'lesson_started',
          occurredAt: p.startedAt,
          lessonId: p.lessonId,
        });
      if (p.completedAt)
        events.push({
          ...base,
          kind: 'lesson_completed',
          occurredAt: p.completedAt,
          lessonId: p.lessonId,
        });
      if (p.lastAccessedAt)
        events.push({
          ...base,
          kind: 'lesson_visited',
          occurredAt: p.lastAccessedAt,
          lessonId: p.lessonId,
        });
    }
    for (const a of this.practice.attempts) {
      const exercise = this.exercises.find((e) => e.id === a.exerciseId);
      if (a.userId !== userId || !exercise) continue;
      events.push({
        kind: 'exercise_attempted',
        occurredAt: a.attemptedAt,
        lessonId: SAMPLE.lessons[exercise.lessonIndex].id,
        exerciseId: a.exerciseId,
        score: a.score,
        isCorrect: a.isCorrect,
      });
    }
    return events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  private dashboard(userId: string, lang: Lang, timeZone: string) {
    const l = this.learning;
    const progress = l.empty ? [] : l.progressOf(userId);
    const completed = progress.filter((p) => p.status === 'completed').length;
    const started = progress.filter((p) => p.status !== 'not_started').length;
    const totalLessons = progress.length;
    const exerciseIds = this.exercises.map((e) => e.id);
    const exercises = this.totals(userId, exerciseIds);
    const percent = totalLessons
      ? Math.round((completed / totalLessons) * 100)
      : 0;

    // Everything is in the one sample course (skill `fundamentals`).
    const skills = SAMPLE.skills.map((skill) => {
      const own = skill.code === 'fundamentals';
      return {
        code: skill.code,
        name: skill.name,
        totalLessons: own ? totalLessons : 0,
        completedLessons: own ? completed : 0,
        percent: own ? percent : 0,
        status:
          own && totalLessons > 0 && completed === totalLessons
            ? 'completed'
            : own && started > 0
              ? 'in_progress'
              : 'not_started',
        exercises: own
          ? exercises
          : { total: 0, attempted: 0, passed: 0, averageScore: null },
      };
    });

    const best = this.best(userId);
    const weakSkills =
      exercises.averageScore !== null && exercises.averageScore < PASS_SCORE
        ? [
            {
              code: 'fundamentals',
              name: SAMPLE.skills[0].name,
              averageScore: exercises.averageScore,
              attemptedExercises: exercises.attempted,
              passedExercises: exercises.passed,
              retry:
                [...best.values()]
                  .filter((a) => !a.passed)
                  .sort((a, b) => a.score - b.score)
                  .map((a) => ({
                    id: a.exerciseId,
                    type: this.exercises.find((e) => e.id === a.exerciseId)!
                      .type,
                    bestScore: a.score,
                  }))[0] ?? null,
            },
          ]
        : [];

    const concepts = new Map<
      string,
      { concept: string; missed: number; checked: number }
    >();
    for (const attempt of best.values()) {
      const found = (attempt.feedback.concepts ?? []) as {
        concept: string;
        matched: boolean;
      }[];
      for (const { concept, matched } of found) {
        const entry = concepts.get(concept.toLowerCase()) ?? {
          concept,
          missed: 0,
          checked: 0,
        };
        entry.checked += 1;
        if (!matched) entry.missed += 1;
        concepts.set(concept.toLowerCase(), entry);
      }
    }

    const events = this.events(userId);
    const today = localDate(new Date().toISOString(), timeZone);
    const lessonTitle = (id: string) =>
      l.text(SAMPLE.lessons.find((lesson) => lesson.id === id)!.title, lang);

    return {
      overall: {
        totalLessons,
        completedLessons: completed,
        percent,
        exercises,
      },
      streak: streakOf(
        new Set(events.map((e) => localDate(e.occurredAt, timeZone))),
        today,
      ),
      continue: l.empty ? null : l.continueItem(userId, lang),
      skills,
      weakAreas: {
        skills: weakSkills,
        concepts: [...concepts.values()]
          .filter((c) => c.missed > 0)
          .sort(
            (a, b) =>
              b.missed / b.checked - a.missed / a.checked ||
              b.missed - a.missed ||
              a.concept.localeCompare(b.concept),
          )
          .slice(0, 5),
      },
      recentActivity: events
        .filter((e) => e.kind !== 'lesson_visited')
        .slice(0, RECENT_LIMIT)
        .map((e) => ({
          kind: e.kind,
          occurredAt: e.occurredAt,
          lesson: { id: e.lessonId, title: lessonTitle(e.lessonId) },
          course: {
            id: SAMPLE.course.id,
            slug: SAMPLE.course.slug,
            title: l.text(SAMPLE.course.title, lang),
          },
          exercise: e.exerciseId
            ? {
                id: e.exerciseId,
                type: this.exercises.find((x) => x.id === e.exerciseId)!.type,
              }
            : null,
          score: e.score,
          isCorrect: e.isCorrect,
        })),
      timeZone,
      ...l.localized(lang),
    };
  }

  private courseResult(userId: string, lang: Lang) {
    const l = this.learning;
    const exercisesOf = (lessonIndex: number) =>
      this.exercises.filter((e) => e.lessonIndex === lessonIndex);
    let lessonIndex = 0;
    return {
      ...l.summary(userId, lang),
      exercises: this.totals(
        userId,
        this.exercises.map((e) => e.id),
      ),
      modules: SAMPLE.modules.map((module) => ({
        id: module.id,
        title: l.text(module.title, lang),
        lessons: module.lessons.map((lesson) => {
          const index = lessonIndex++;
          return {
            id: lesson.id,
            title: l.text(lesson.title, lang),
            estimatedMinutes: lesson.estimatedMinutes,
            progress: l.get(userId, lesson.id),
            exercises: exercisesOf(index).map((e) => ({
              id: e.id,
              type: e.type,
              difficulty: e.difficulty,
              question: this.practice.text(e.question, lang),
              stats: this.practice.stats(userId, e.id),
            })),
          };
        }),
      })),
    };
  }

  handle(
    method: string,
    path: string,
    userId: string,
    query: URLSearchParams,
  ): Result | null {
    if (method !== 'GET' || (path !== '/dashboard' && path !== '/progress')) {
      return null;
    }
    if (this.failing) return serverError;

    const langParam = query.get('lang') ?? 'en';
    if (langParam !== 'en' && langParam !== 'vi') {
      return badRequest('lang', 'lang must be one of: en, vi');
    }
    const lang: Lang = langParam;

    if (path === '/dashboard') {
      const tz = query.get('tz') ?? 'UTC';
      this.timeZones.push(tz);
      if (!isTimeZone(tz))
        return badRequest('tz', 'tz must be an IANA time zone');
      return { status: 200, json: this.dashboard(userId, lang, tz) };
    }

    const page = Number(query.get('page') ?? 1);
    const pageSize = Number(query.get('pageSize') ?? 20);
    if (!Number.isInteger(page) || page < 1) {
      return badRequest('page', 'page must not be less than 1');
    }
    if (!PAGE_SIZES.includes(pageSize)) {
      return badRequest('pageSize', 'pageSize must be one of 20, 50, 100');
    }
    const skill = query.get('skill');
    const all = this.learning.empty
      ? []
      : [
          this.courseResult(userId, lang),
          ...this.learning.extras.map((course) => ({
            ...this.learning.extraSummary(course, lang),
            exercises: {
              total: 0,
              attempted: 0,
              passed: 0,
              averageScore: null,
            },
            modules: [],
          })),
        ];
    const matching = all.filter((c) => !skill || c.skill.code === skill);
    return {
      status: 200,
      json: {
        items: matching.slice((page - 1) * pageSize, page * pageSize),
        total: matching.length,
        page,
        pageSize,
        ...this.learning.localized(lang),
      },
    };
  }
}
