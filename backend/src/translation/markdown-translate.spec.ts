import {
  htmlToInline,
  inlineToHtml,
  prepareInline,
  prepareMarkdown,
} from './markdown-translate.js';

/** Stand-in translator: upper-cases text outside tags and protected spans. */
function shout(html: string): string {
  return html
    .split(/(<span class="notranslate">[\s\S]*?<\/span>|<[^>]+>)/)
    .map((part, i) => (i % 2 === 1 ? part : part.toUpperCase()))
    .join('');
}

const SAMPLE = `Software testing is **finding out how a product behaves**.

## Testing is about information

* what works as expected,
* what has *not* been checked yet.

1. **Error (mistake)**: a person misreads "at least 18".
2. **Defect**: the code says \`age > 18\` instead of \`age >= 18\`.

| Found during | Typical cost |
|---|---|
| Requirements review | Minutes |
| Production | Days & more |

> Key idea: read the [ISTQB syllabus](https://www.istqb.org/syllabus) first.

\`\`\`ts
if (total > 50) applyShipping();
\`\`\`

---
Plain line with a bug report and a test case, then Pass or Fail.`;

describe('prepareMarkdown', () => {
  it('round-trips unchanged with an identity translator', () => {
    const prepared = prepareMarkdown(SAMPLE);
    expect(prepared.assemble(prepared.pieces)).toBe(SAMPLE);
  });

  it('leaves structure, code, URLs and fenced blocks out of the text', () => {
    const { pieces } = prepareMarkdown(SAMPLE);
    const all = pieces.join('\n');
    expect(all).not.toContain('##');
    expect(all).not.toContain('|');
    expect(all).not.toContain('applyShipping');
    expect(all).toContain('<span class="notranslate">`age &gt;= 18`</span>');
    expect(all).toContain('<a href="https://www.istqb.org/syllabus">');
  });

  it('translates running text but keeps protected parts and Markdown intact', () => {
    const prepared = prepareMarkdown(SAMPLE);
    const result = prepared.assemble(prepared.pieces.map(shout));

    expect(result).toContain(
      'SOFTWARE TESTING IS **FINDING OUT HOW A PRODUCT BEHAVES**.',
    );
    expect(result).toContain('## TESTING IS ABOUT INFORMATION');
    expect(result).toContain('* WHAT HAS *NOT* BEEN CHECKED YET.');
    expect(result).toContain(
      '2. **Defect**: THE CODE SAYS `age > 18` INSTEAD OF `age >= 18`.',
    );
    expect(result).toContain('| REQUIREMENTS REVIEW | MINUTES |');
    expect(result).toContain('|---|---|');
    expect(result).toContain('| PRODUCTION | DAYS & MORE |');
    expect(result).toContain(
      '> KEY IDEA: READ THE [ISTQB SYLLABUS](https://www.istqb.org/syllabus) FIRST.',
    );
    expect(result).toContain('```ts\nif (total > 50) applyShipping();\n```');
    expect(result).toContain(
      'WITH A bug report AND A test case, THEN Pass OR Fail.',
    );
  });
});

describe('glossary', () => {
  it('keeps QA terms in English, longest match first', () => {
    const html = inlineToHtml(
      'Write test cases and bug reports; set Severity.',
    );
    expect(html).toBe(
      'Write <span class="notranslate">test cases</span> and <span class="notranslate">bug reports</span>; set <span class="notranslate">Severity</span>.',
    );
  });

  it('keeps verdicts only in their capitalised form', () => {
    expect(inlineToHtml('Tests pass, the verdict is Pass.')).toBe(
      'Tests pass, the verdict is <span class="notranslate">Pass</span>.',
    );
  });

  it('matches whole words only', () => {
    expect(inlineToHtml('debugging and bugfix')).toBe('debugging and bugfix');
  });
});

describe('htmlToInline', () => {
  it('tolerates spaces a translator adds inside tags and decodes entities', () => {
    expect(
      htmlToInline(
        '<b> Lỗi </b> và <i> sai </i> &#39;x&#39; &amp; <a href="u"> link </a>',
      ),
    ).toBe("**Lỗi** và *sai* 'x' & [link](u)");
  });
});

describe('prepareInline', () => {
  it('keeps surrounding whitespace and skips empty text', () => {
    const prepared = prepareInline('  Why we test ');
    expect(prepared.pieces).toEqual(['Why we test']);
    expect(prepared.assemble(['Vì sao cần kiểm thử'])).toBe(
      '  Vì sao cần kiểm thử ',
    );
    expect(prepareInline('   ').pieces).toEqual([]);
  });
});
