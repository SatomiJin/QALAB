/**
 * `/glossary` and `/admin/glossary*` of the mock API (docs/api.md ›
 * Glossary), with the backend rules: learners read published terms only;
 * admin routes are admins only (403); slugs and phrases (case-insensitive)
 * belong to one term (409 with `details`); related ids exist and are not
 * the term (400); a deleted term leaves the related lists. Usage is counted
 * on the sample course's lessons, like the backend (whole phrase, any case).
 */

import { SAMPLE } from './mock-learning.ts';

type Status = 'draft' | 'published' | 'archived';
type Result = { status: number; json?: unknown };

export interface MockTerm {
  id: string;
  slug: string;
  term: string;
  viName: string | null;
  skill: string;
  matchPhrases: string[];
  definitionEn: string;
  definitionVi: string;
  relatedIds: string[];
  status: Status;
  createdAt: string;
  updatedAt: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS = new Set([
  'slug',
  'term',
  'viName',
  'skill',
  'matchPhrases',
  'definitionEn',
  'definitionVi',
  'relatedIds',
  'status',
]);

let sequence = 0;
const newId = () =>
  `7a1d2a4e-0c1b-4d7e-9a3f-${String(++sequence).padStart(12, '0')}`;
const now = () => new Date().toISOString();

function error(
  statusCode: number,
  error: string,
  message: string,
  details?: { field: string; message: string }[],
): Result {
  return {
    status: statusCode,
    json: { statusCode, error, message, ...(details ? { details } : {}) },
  };
}

const seed = (
  slug: string,
  term: string,
  matchPhrases: string[],
  definitionEn: string,
  over: Partial<MockTerm> = {},
): MockTerm => ({
  id: newId(),
  slug,
  term,
  viName: null,
  skill: 'fundamentals',
  matchPhrases,
  definitionEn,
  definitionVi: `${definitionEn} (vi)`,
  relatedIds: [],
  status: 'published',
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...over,
});

const LESSON_TEXTS = SAMPLE.modules.flatMap((module) =>
  module.lessons.map((lesson) => lesson.contentMd),
);

export class MockGlossary {
  readonly terms = new Map<string, MockTerm>();
  /** Set after the page loaded to make the next call fail with 500. */
  failing = false;

  constructor() {
    const precondition = seed(
      'precondition',
      'Precondition',
      ['precondition'],
      'What must be true before the test starts.',
    );
    const expected = seed(
      'expected-result',
      'Expected result',
      ['expected result'],
      'What the system should do.',
    );
    const priority = seed(
      'priority',
      'Priority',
      ['priority'],
      'How soon the defect should be fixed.',
      { skill: 'defect_mgmt' },
    );
    const severity = seed(
      'severity',
      'Severity',
      ['severity'],
      'How badly the defect hurts.',
      { skill: 'defect_mgmt', relatedIds: [priority.id] },
    );
    const defect = seed(
      'defect',
      'Defect (bug)',
      ['defect', 'bug'],
      'A flaw that can make the software fail.',
      { relatedIds: [severity.id] },
    );
    const testCase = seed(
      'test-case',
      'Test case',
      ['test case'],
      'A set of preconditions, steps, test data and an expected result that checks one thing.',
      {
        viName: 'Ca kiểm thử',
        skill: 'test_docs',
        definitionVi:
          'Tập hợp precondition, các bước, test data và expected result để kiểm tra một điều.',
        relatedIds: [precondition.id, expected.id],
      },
    );
    const boundary = seed(
      'boundary-value-analysis',
      'Boundary value analysis',
      ['boundary value'],
      'Testing the values at the edges of each partition.',
      { skill: 'test_design' },
    );
    const draft = seed(
      'draft-term',
      'Draft term',
      ['draft phrase'],
      'Not visible to learners.',
      { status: 'draft' },
    );
    for (const term of [
      precondition,
      expected,
      priority,
      severity,
      defect,
      testCase,
      boundary,
      draft,
    ]) {
      this.terms.set(term.id, term);
    }
  }

  private sorted(): MockTerm[] {
    return [...this.terms.values()].sort((a, b) =>
      a.term.localeCompare(b.term),
    );
  }

  private usage(term: MockTerm) {
    const lessons = LESSON_TEXTS.filter((text) =>
      term.matchPhrases.some((phrase) =>
        text.toLowerCase().includes(phrase.toLowerCase()),
      ),
    ).length;
    return { lessons, courseIds: lessons > 0 ? [SAMPLE.course.id] : [] };
  }

  private learner(
    term: MockTerm,
    visible: (id: string) => MockTerm | undefined,
  ) {
    return {
      id: term.id,
      slug: term.slug,
      term: term.term,
      viName: term.viName,
      skill: term.skill,
      matchPhrases: term.matchPhrases,
      definitionEn: term.definitionEn,
      definitionVi: term.definitionVi,
      related: term.relatedIds.flatMap((id) => visible(id)?.slug ?? []),
    };
  }

  private admin(term: MockTerm) {
    return {
      ...this.learner(term, (id) => this.terms.get(id)),
      status: term.status,
      relatedIds: term.relatedIds.filter((id) => this.terms.has(id)),
      usage: this.usage(term),
      createdAt: term.createdAt,
      updatedAt: term.updatedAt,
    };
  }

  /** Validation and conflicts, in the backend's order: 400 first, then 409. */
  private check(id: string | null, next: MockTerm): Result | null {
    const invalid: { field: string; message: string }[] = [];
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(next.slug))
      invalid.push({
        field: 'slug',
        message: 'slug must be lowercase letters, digits and single dashes',
      });
    if (!next.term.trim())
      invalid.push({ field: 'term', message: 'term should not be empty' });
    if (!next.definitionEn.trim())
      invalid.push({
        field: 'definitionEn',
        message: 'definitionEn should not be empty',
      });
    if (!next.definitionVi.trim())
      invalid.push({
        field: 'definitionVi',
        message: 'definitionVi should not be empty',
      });
    const seen = new Set<string>();
    next.matchPhrases.forEach((phrase, i) => {
      if (seen.has(phrase.toLowerCase()))
        invalid.push({
          field: `matchPhrases[${i}]`,
          message: 'phrase is listed twice',
        });
      seen.add(phrase.toLowerCase());
    });
    next.relatedIds.forEach((other, i) => {
      if (other === id)
        invalid.push({
          field: `relatedIds[${i}]`,
          message: 'a term cannot be related to itself',
        });
      else if (!this.terms.has(other))
        invalid.push({
          field: `relatedIds[${i}]`,
          message: 'term does not exist',
        });
    });
    if (invalid.length > 0)
      return error(400, 'Bad Request', 'Validation failed', invalid);

    const taken: { field: string; message: string }[] = [];
    for (const other of this.terms.values()) {
      if (other.id === id) continue;
      if (other.slug === next.slug)
        taken.push({
          field: 'slug',
          message: `slug is already used by "${other.term}"`,
        });
      next.matchPhrases.forEach((phrase, i) => {
        if (
          other.matchPhrases.some(
            (p) => p.toLowerCase() === phrase.toLowerCase(),
          )
        ) {
          taken.push({
            field: `matchPhrases[${i}]`,
            message: `phrase is already used by "${other.term}"`,
          });
        }
      });
    }
    return taken.length > 0
      ? error(409, 'Conflict', 'Already used', taken)
      : null;
  }

  handle(
    method: string,
    path: string,
    body: Record<string, unknown>,
    role: string,
  ): Result | null {
    if (path !== '/glossary' && !path.startsWith('/admin/glossary'))
      return null;
    if (this.failing)
      return error(500, 'Internal Server Error', 'Mock failure');

    if (path === '/glossary' && method === 'GET') {
      const published = this.sorted().filter(
        (term) => term.status === 'published',
      );
      const visible = (id: string) => published.find((term) => term.id === id);
      return {
        status: 200,
        json: { items: published.map((term) => this.learner(term, visible)) },
      };
    }
    if (path === '/glossary') return null;

    if (role !== 'admin') return error(403, 'Forbidden', 'Admins only');
    const unknown = Object.keys(body).filter((key) => !FIELDS.has(key));
    if (unknown.length > 0) {
      return error(
        400,
        'Bad Request',
        'Validation failed',
        unknown.map((field) => ({
          field,
          message: `property ${field} should not exist`,
        })),
      );
    }

    if (path === '/admin/glossary') {
      if (method === 'GET') {
        return {
          status: 200,
          json: {
            items: this.sorted().map((term) => this.admin(term)),
            courses: [{ id: SAMPLE.course.id, title: SAMPLE.course.title }],
          },
        };
      }
      if (method === 'POST') {
        const term: MockTerm = {
          id: newId(),
          slug: String(body.slug ?? ''),
          term: String(body.term ?? ''),
          viName: (body.viName as string | null | undefined) || null,
          skill: String(body.skill ?? 'fundamentals'),
          matchPhrases: (body.matchPhrases as string[] | undefined) ?? [],
          definitionEn: String(body.definitionEn ?? ''),
          definitionVi: String(body.definitionVi ?? ''),
          relatedIds: (body.relatedIds as string[] | undefined) ?? [],
          status: (body.status as Status | undefined) ?? 'draft',
          createdAt: now(),
          updatedAt: now(),
        };
        const problem = this.check(null, term);
        if (problem) return problem;
        this.terms.set(term.id, term);
        return { status: 201, json: this.admin(term) };
      }
      return null;
    }

    const id = path.slice('/admin/glossary/'.length);
    if (!UUID.test(id))
      return error(400, 'Bad Request', 'Validation failed (uuid is expected)');
    const current = this.terms.get(id);
    if (!current) return error(404, 'Not Found', 'Glossary term not found');

    if (method === 'GET') return { status: 200, json: this.admin(current) };
    if (method === 'PATCH') {
      if (Object.keys(body).length === 0)
        return { status: 200, json: this.admin(current) };
      const next: MockTerm = {
        ...current,
        ...(body as Partial<MockTerm>),
        viName:
          body.viName === undefined
            ? current.viName
            : (body.viName as string | null) || null,
        updatedAt: now(),
      };
      const problem = this.check(id, next);
      if (problem) return problem;
      this.terms.set(id, next);
      return { status: 200, json: this.admin(next) };
    }
    if (method === 'DELETE') {
      this.terms.delete(id);
      for (const term of this.terms.values()) {
        term.relatedIds = term.relatedIds.filter((other) => other !== id);
      }
      return { status: 204 };
    }
    return null;
  }
}
