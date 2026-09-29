// Source of truth for translation keys. `vi.ts` must provide the same keys.
export const en = {
  app: {
    name: 'QA Learning Lab',
    admin: 'Admin',
  },
  nav: {
    mainLabel: 'Main navigation',
    open: 'Open navigation',
    dashboard: 'Dashboard',
    learning: 'Learning',
    practice: 'Practice',
    quiz: 'Quiz',
    testCase: 'Test Case Practice',
    bugReport: 'Bug Report Practice',
    scenario: 'Scenario Challenge',
    progress: 'Progress',
    profile: 'Profile',
    courses: 'Courses',
    backToApp: 'Back to app',
    user: 'User',
  },
  pages: {
    dashboard: {
      title: 'Dashboard',
      description: 'Your learning progress at a glance.',
    },
    learning: { title: 'Learning', description: 'Courses grouped by skill.' },
    quiz: { title: 'Quiz', description: '' },
    testCase: { title: 'Test Case Practice', description: '' },
    bugReport: { title: 'Bug Report Practice', description: '' },
    scenario: { title: 'Scenario Challenge', description: '' },
    progress: { title: 'Progress', description: '' },
    profile: { title: 'Profile', description: '' },
    adminCourses: {
      title: 'Courses',
      description: 'Create and manage courses, modules, lessons and exercises.',
    },
    login: { title: 'Sign in', description: '' },
  },
  placeholder: {
    comingInPhase: 'Coming in Phase {{phase}}',
  },
  apiStatus: {
    connecting: 'Connecting…',
    online: 'API online',
    offline: 'API offline',
  },
  feedback: {
    loading: 'Loading…',
    loadFailed: 'Could not load data',
    genericError: 'Something went wrong. Please try again.',
    networkError:
      'Cannot reach the server. Check your connection and try again.',
    tryAgain: 'Try again',
  },
  errors: {
    notFoundTitle: 'Page not found',
    notFoundDescription:
      'The page you are looking for does not exist or has been moved.',
    goToDashboard: 'Go to dashboard',
    crashTitle: 'Something went wrong',
    crashDescription:
      'An unexpected error occurred. Reload the page to continue.',
    routeErrorDescription:
      'This page failed to load. Try again, or go back to the dashboard.',
    reload: 'Reload',
  },
  preferences: {
    language: 'Language',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
  },
};

export type TranslationSchema = typeof en;
