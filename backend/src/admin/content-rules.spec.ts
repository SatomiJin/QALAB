import {
  canPublishCourse,
  checkReorder,
  inUseIds,
  lockedPromptErrors,
  nextOrderIndex,
} from './content-rules.js';

describe('inUseIds', () => {
  const modules = [
    {
      id: 'm1',
      lessons: [
        { id: 'l1', exercises: [{ id: 'e1' }, { id: 'e2' }] },
        { id: 'l2', exercises: [] },
      ],
    },
    { id: 'm2', lessons: [{ id: 'l3', exercises: [{ id: 'e3' }] }] },
    { id: 'm3', lessons: [] },
  ];

  it('marks nothing without learner data', () => {
    const used = inUseIds(modules, {
      lessons: new Set(),
      exercises: new Set(),
    });
    expect([...used]).toEqual([]);
  });

  it('marks a lesson with progress and its module, not its siblings', () => {
    const used = inUseIds(modules, {
      lessons: new Set(['l2']),
      exercises: new Set(),
    });
    expect([...used].sort()).toEqual(['l2', 'm1']);
  });

  it('marks an attempted exercise, its lesson and its module', () => {
    const used = inUseIds(modules, {
      lessons: new Set(),
      exercises: new Set(['e3']),
    });
    expect([...used].sort()).toEqual(['e3', 'l3', 'm2']);
  });

  it('ignores ids from elsewhere', () => {
    const used = inUseIds(modules, {
      lessons: new Set(['other']),
      exercises: new Set(['other']),
    });
    expect(used.size).toBe(0);
  });
});

describe('canPublishCourse', () => {
  it('needs a published lesson in a published module', () => {
    expect(
      canPublishCourse([
        { status: 'published', lessons: [{ status: 'published' }] },
      ]),
    ).toBe(true);
  });

  it('refuses an empty course', () => {
    expect(canPublishCourse([])).toBe(false);
    expect(canPublishCourse([{ status: 'published', lessons: [] }])).toBe(
      false,
    );
  });

  it('refuses published lessons in a draft or archived module', () => {
    expect(
      canPublishCourse([
        { status: 'draft', lessons: [{ status: 'published' }] },
        { status: 'archived', lessons: [{ status: 'published' }] },
        { status: 'published', lessons: [{ status: 'draft' }] },
      ]),
    ).toBe(false);
  });
});

describe('nextOrderIndex', () => {
  it('starts at 1 and goes after the highest sibling', () => {
    expect(nextOrderIndex([])).toBe(1);
    expect(nextOrderIndex([{ order_index: 3 }, { order_index: 7 }])).toBe(8);
  });
});

describe('checkReorder', () => {
  it('accepts every child exactly once, in any order', () => {
    expect(checkReorder(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([]);
  });

  it('refuses duplicates, strangers and missing children', () => {
    expect(checkReorder(['a', 'b'], ['a', 'a', 'b'])).toEqual([
      { field: 'ids', message: 'ids must not repeat an entry' },
    ]);
    expect(checkReorder(['a', 'b'], ['a', 'b', 'x'])).toEqual([
      { field: 'ids', message: 'ids has an item of another parent' },
    ]);
    expect(checkReorder(['a', 'b'], ['b'])).toEqual([
      { field: 'ids', message: 'ids must list every item' },
    ]);
  });
});

describe('lockedPromptErrors', () => {
  const options = [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ];

  it('allows new texts with the same option ids', () => {
    expect(
      lockedPromptErrors(
        'multiple_choice',
        { options, multiple: false },
        {
          options: [
            { id: 'b', text: 'Bee' },
            { id: 'a', text: 'Ay' },
          ],
          multiple: false,
        },
      ),
    ).toEqual([]);
  });

  it('refuses changed option ids or a changed multiple flag', () => {
    const errors = lockedPromptErrors(
      'multiple_choice',
      { options, multiple: false },
      { options: [...options, { id: 'c', text: 'C' }], multiple: true },
    );
    expect(errors.map((error) => error.field)).toEqual([
      'promptData.options',
      'promptData.multiple',
    ]);
  });

  it('refuses changed category or item ids', () => {
    const before = {
      categories: options,
      items: [
        { id: 'x', text: 'X' },
        { id: 'y', text: 'Y' },
      ],
    };
    const errors = lockedPromptErrors('classification', before, {
      categories: options,
      items: [{ id: 'x', text: 'X' }],
    });
    expect(errors.map((error) => error.field)).toEqual(['promptData.items']);
  });

  it('has nothing to lock for free-text types', () => {
    expect(lockedPromptErrors('scenario', {}, {})).toEqual([]);
  });
});
