/**
 * Standard QA terms that stay in English in Vietnamese content, because that
 * is what learners use at work (plant.md › Language & Theme). They are sent
 * to the translator marked `notranslate`.
 *
 * `caseSensitive` terms are ordinary words in lower case ("the tests pass"),
 * so only the capitalised verdict form is kept.
 */
const TERMS: { term: string; caseSensitive?: boolean }[] = [
  { term: 'test cases' },
  { term: 'test case' },
  { term: 'test plans' },
  { term: 'test plan' },
  { term: 'test runs' },
  { term: 'test run' },
  { term: 'test data' },
  { term: 'test scenario' },
  { term: 'test summary report' },
  { term: 'test pyramid' },
  { term: 'bug reports' },
  { term: 'bug report' },
  { term: 'bugs' },
  { term: 'bug' },
  { term: 'defects' },
  { term: 'defect' },
  { term: 'severity' },
  { term: 'priority' },
  { term: 'smoke testing' },
  { term: 'smoke test' },
  { term: 'smoke' },
  { term: 'regression testing' },
  { term: 'regression' },
  { term: 'retest' },
  { term: 'boundary value analysis' },
  { term: 'equivalence partitioning' },
  { term: 'entry criteria' },
  { term: 'exit criteria' },
  { term: 'root cause' },
  { term: 'QA' },
  { term: 'QC' },
  { term: 'SDLC' },
  { term: 'STLC' },
  { term: 'ISTQB' },
  { term: 'API' },
  { term: 'REST' },
  { term: 'HTTP' },
  { term: 'UI' },
  { term: 'Pass', caseSensitive: true },
  { term: 'Passed', caseSensitive: true },
  { term: 'Fail', caseSensitive: true },
  { term: 'Failed', caseSensitive: true },
  { term: 'Blocked', caseSensitive: true },
  { term: 'Not run', caseSensitive: true },
];

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longest first, so "test cases" wins over "test case" and "bug report"
// over "bug".
const sorted = [...TERMS].sort((a, b) => b.term.length - a.term.length);

const wholeWords = (terms: string[], flags: string) =>
  new RegExp(
    `(?<![\\w-])(?:${terms.map(escapeRegExp).join('|')})(?![\\w-])`,
    flags,
  );

const INSENSITIVE = wholeWords(
  sorted.filter((t) => !t.caseSensitive).map((t) => t.term),
  'gi',
);
const SENSITIVE = wholeWords(
  sorted.filter((t) => t.caseSensitive).map((t) => t.term),
  'g',
);

/**
 * Wraps every glossary term in `text` with `wrap`. Matches are held as
 * placeholders until both passes ran, so the second pass never matches
 * inside the output of the first.
 */
export function protectTerms(
  text: string,
  wrap: (term: string) => string,
): string {
  const placeholders: string[] = [];
  const hold = (term: string) => {
    placeholders.push(wrap(term));
    // Private-use characters: never part of real text.
    return `${placeholders.length - 1}`;
  };
  return text
    .replace(INSENSITIVE, hold)
    .replace(SENSITIVE, hold)
    .replace(/(\d+)/g, (_, i: string) => placeholders[Number(i)]);
}
