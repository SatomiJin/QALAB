import { describe, expect, it } from 'vitest';
import type { GlossaryTerm } from '../../types/api';
import { filterTerms, groupByLetter, normalize, splitCode } from './glossary';
import { glossarySlugFromHref, type MdNode, TermLinker } from './link-terms';

const term = (
  slug: string,
  matchPhrases: string[],
  over: Partial<GlossaryTerm> = {},
): GlossaryTerm => ({
  id: slug,
  slug,
  term: slug,
  viName: null,
  skill: 'fundamentals',
  matchPhrases,
  definitionEn: `About ${slug}`,
  definitionVi: `Về ${slug}`,
  related: [],
  ...over,
});

const GLOSSARY: GlossaryTerm[] = [
  term('test-case', ['test case'], {
    term: 'Test case',
    viName: 'Ca kiểm thử',
    skill: 'test_docs',
    definitionEn: 'Preconditions, steps, test data and an expected result.',
  }),
  term('precondition', ['precondition']),
  term('regression-testing', ['regression testing', 'regression test']),
  term('bug-report', ['bug report']),
  term('defect', ['defect', 'bug']),
  term('rest', ['REST']),
  term('api', ['API'], { skill: 'api_testing' }),
  term('ci', ['CI/CD', 'CI']),
  term('http-header', ['HTTP header', 'header']),
  term('non-functional-testing', ['non-functional']),
  term('bug-resolution', ["won't fix", 'not a bug']),
  term('severity', ['severity']),
  term('priority', ['priority']),
  term('boundary-value-analysis', ['boundary value'], {
    term: 'Boundary value analysis',
  }),
];

const linker = new TermLinker(GLOSSARY);

const paragraph = (...children: MdNode[]): MdNode => ({
  type: 'root',
  children: [{ type: 'paragraph', children }],
});
const text = (value: string): MdNode => ({ type: 'text', value });

/** The tree as `text` / `[label](slug)` so assertions read like Markdown. */
function render(node: MdNode): string {
  if (node.type === 'text') return node.value ?? '';
  if (node.type === 'link' && node.url?.startsWith('/glossary#')) {
    return `[${(node.children ?? []).map(render).join('')}](${glossarySlugFromHref(node.url)})`;
  }
  if (node.type === 'inlineCode') return `\`${node.value}\``;
  return (node.children ?? []).map(render).join('');
}

function linked(tree: MdNode): string {
  linker.link(tree);
  return render(tree);
}

describe('TermLinker', () => {
  it('links the first occurrence of each term only, plurals included', () => {
    expect(
      linked(
        paragraph(text('Write test cases. A test case has a precondition.')),
      ),
    ).toBe(
      'Write [test cases](test-case). A test case has a [precondition](precondition).',
    );
  });

  it('prefers the longest phrase and ignores case for words', () => {
    expect(linked(paragraph(text('Regression Testing and regression.')))).toBe(
      '[Regression Testing](regression-testing) and regression.',
    );
    expect(linked(paragraph(text('File a Bug Report for the bug.')))).toBe(
      'File a [Bug Report](bug-report) for the [bug](defect).',
    );
  });

  it('matches acronyms in capitals only', () => {
    expect(
      linked(paragraph(text('Take a rest, then call the REST API.'))),
    ).toBe('Take a rest, then call the [REST](rest) [API](api).');
    expect(linked(paragraph(text('Run it in ci; CI runs it too.')))).toBe(
      'Run it in ci; [CI](ci) runs it too.',
    );
  });

  it('keeps whole words: no match inside another word or hyphenated term', () => {
    expect(linked(paragraph(text('PageHeader is not a header.')))).toBe(
      'PageHeader is not a [header](http-header).',
    );
    expect(linked(paragraph(text('Non-functional checks.')))).toBe(
      '[Non-functional](non-functional-testing) checks.',
    );
  });

  it('works inside Vietnamese text and accepts both apostrophes', () => {
    expect(
      linked(
        paragraph(text('Viết test case rõ ràng; bug được đánh Won’t fix.')),
      ),
    ).toBe(
      'Viết [test case](test-case) rõ ràng; [bug](defect) được đánh [Won’t fix](bug-resolution).',
    );
  });

  it('leaves code, links and headings alone', () => {
    const tree: MdNode = {
      type: 'root',
      children: [
        { type: 'heading', children: [text('Test case basics')] },
        {
          type: 'paragraph',
          children: [
            { type: 'inlineCode', value: 'test case' },
            text(' and '),
            {
              type: 'link',
              url: 'https://example.com',
              children: [text('test case')],
            },
            text(' then the test case.'),
          ],
        },
        { type: 'code', value: 'expect(API).toBe(1)' },
      ],
    };
    expect(linked(tree)).toBe(
      'Test case basics`test case` and test case then the [test case](test-case).',
    );
    expect(tree.children?.[2]).toEqual({
      type: 'code',
      value: 'expect(API).toBe(1)',
    });
  });

  it('counts first occurrences across the whole text, in reading order', () => {
    const tree: MdNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'strong', children: [text('Severity')] }],
        },
        { type: 'paragraph', children: [text('Severity and priority.')] },
      ],
    };
    expect(linked(tree)).toBe(
      '[Severity](severity)Severity and [priority](priority).',
    );
  });
});

describe('glossary page helpers', () => {
  it('normalises accents and đ', () => {
    expect(normalize('Kiểm thử ĐẦU-cuối')).toBe('kiem thu dau-cuoi');
  });

  it('filters by every word, in the shown language, and by skill', () => {
    const ids = (q: string, skill = '', lang: 'en' | 'vi' = 'en') =>
      filterTerms(GLOSSARY, q, skill as never, lang).map((t) => t.id);

    expect(ids('boundary')).toContain('boundary-value-analysis');
    expect(ids('ca kiem thu', '', 'vi')).toContain('test-case');
    // The Vietnamese name is searchable in English too; definitions only in the shown language.
    expect(ids('ca kiem thu', '', 'en')).toContain('test-case');
    expect(ids('preconditions steps', '', 'en')).toContain('test-case');
    expect(ids('preconditions steps', '', 'vi')).not.toContain('test-case');
    expect(
      ids('', 'api_testing').every(
        (id) => GLOSSARY.find((t) => t.id === id)?.skill === 'api_testing',
      ),
    ).toBe(true);
    expect(ids('zzzz')).toEqual([]);
  });

  it('links nothing without phrases', () => {
    const tree = paragraph(text('A test case.'));
    new TermLinker([]).link(tree);
    expect(render(tree)).toBe('A test case.');
  });

  it('groups by first letter, sorted', () => {
    const groups = groupByLetter(GLOSSARY);
    const letters = groups.map((g) => g.letter);
    expect(letters).toEqual([...letters].sort());
    expect(new Set(letters).size).toBe(letters.length);
    expect(groups.flatMap((g) => g.terms)).toHaveLength(GLOSSARY.length);
  });

  it('splits code spans', () => {
    expect(splitCode('use `>=` not `>`')).toEqual([
      'use ',
      '>=',
      ' not ',
      '>',
      '',
    ]);
  });
});
