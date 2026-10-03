import { contentTexts, markdownParityErrors } from './translatable-texts.js';

describe('contentTexts', () => {
  it('lists course and module texts, skipping empty ones', () => {
    expect(
      contentTexts('course', { title: 'Course', description: '' }).map(
        (text) => text.field,
      ),
    ).toEqual(['title']);
    expect(
      contentTexts('module', { title: 'Module', description: 'About' }),
    ).toEqual([
      { field: 'title', text: 'Module', markdown: false, maxLength: 160 },
      {
        field: 'description',
        text: 'About',
        markdown: false,
        maxLength: 2000,
      },
    ]);
  });

  it('marks the lesson body as Markdown', () => {
    const texts = contentTexts('lesson', { title: 'L', content_md: '# Hi' });
    expect(texts.map((text) => [text.field, text.markdown])).toEqual([
      ['title', false],
      ['content_md', true],
    ]);
  });

  it('lists every exercise text, review texts from the answer key', () => {
    const texts = contentTexts('exercise', {
      question: 'Which one?',
      prompt_data: {
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
      },
      answer: {
        explanation: 'Because.',
        answer_data: {
          modelAnswer: 'Model.',
          rubric: [{ id: 'r1', text: 'Did it' }],
        },
      },
    });
    expect(texts.map((text) => text.field)).toEqual([
      'question',
      'option.a',
      'option.b',
      'explanation',
      'model_answer',
      'rubric.r1',
    ]);
    expect(texts.find((text) => text.field === 'option.a')?.maxLength).toBe(
      500,
    );
  });

  it('lists categories and items of a classification exercise', () => {
    const texts = contentTexts('exercise', {
      question: 'Sort them',
      prompt_data: {
        categories: [{ id: 'c1', text: 'Cat' }],
        items: [{ id: 'i1', text: 'Item' }],
      },
      answer: null,
    });
    expect(texts.map((text) => text.field)).toEqual([
      'question',
      'category.c1',
      'item.i1',
    ]);
  });
});

describe('markdownParityErrors', () => {
  it('accepts the same headings and code blocks', () => {
    expect(
      markdownParityErrors(
        '# A\n\ntext\n\n```js\nx\n```',
        '# Á\n\nchữ\n\n```js\nx\n```',
      ),
    ).toEqual([]);
  });

  it('reports missing headings and code blocks', () => {
    expect(markdownParityErrors('# A\n## B\n```\nx\n```', '# A')).toEqual([
      'has 1 headings, English has 2',
      'must have the same code blocks as English',
    ]);
  });
});
