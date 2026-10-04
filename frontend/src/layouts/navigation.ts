export interface NavLinkItem {
  path: string;
  labelKey:
    | 'nav.dashboard'
    | 'nav.learning'
    | 'nav.practice'
    | 'nav.progress'
    | 'nav.admin'
    | 'nav.courses'
    | 'nav.users'
    | 'nav.quiz'
    | 'nav.testCase'
    | 'nav.bugReport'
    | 'nav.scenario';
  /**
   * Other path prefixes that belong to this section (pages that do not live
   * under `path`), so the section stays marked as current there.
   */
  activePaths?: string[];
}

/** Top-level learner sections. Profile lives in the account menu. */
export const MAIN_LINKS: NavLinkItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard' },
  { path: '/learning', labelKey: 'nav.learning' },
  { path: '/practice', labelKey: 'nav.practice' },
  { path: '/progress', labelKey: 'nav.progress' },
];

export const ADMIN_ENTRY: NavLinkItem = {
  path: '/admin',
  labelKey: 'nav.admin',
};

export const ADMIN_LINKS: NavLinkItem[] = [
  {
    path: '/admin/courses',
    labelKey: 'nav.courses',
    activePaths: ['/admin/lessons', '/admin/exercises'],
  },
  { path: '/admin/users', labelKey: 'nav.users' },
];

/** Practice kinds, shown as tabs on the Practice pages. */
export const PRACTICE_LINKS = [
  { path: '/practice/quiz', labelKey: 'nav.quiz', page: 'quiz' },
  { path: '/practice/test-case', labelKey: 'nav.testCase', page: 'testCase' },
  {
    path: '/practice/bug-report',
    labelKey: 'nav.bugReport',
    page: 'bugReport',
  },
  { path: '/practice/scenario', labelKey: 'nav.scenario', page: 'scenario' },
] as const satisfies readonly (NavLinkItem & { page: string })[];
