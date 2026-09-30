// Source of truth for translation keys. `vi.ts` must provide the same keys.
export const en = {
  app: {
    name: 'QA Learning Lab',
    admin: 'Admin',
  },
  nav: {
    mainLabel: 'Main navigation',
    practiceLabel: 'Practice types',
    open: 'Open navigation',
    close: 'Close navigation',
    dashboard: 'Dashboard',
    learning: 'Learning',
    practice: 'Practice',
    quiz: 'Quiz',
    testCase: 'Test cases',
    bugReport: 'Bug reports',
    scenario: 'Scenarios',
    progress: 'Progress',
    profile: 'Profile',
    admin: 'Admin',
    courses: 'Courses',
    backToApp: 'Back to app',
  },
  userMenu: {
    label: 'Account menu',
    profile: 'Profile',
    admin: 'Admin',
    signOut: 'Sign out',
  },
  pages: {
    dashboard: {
      title: 'Dashboard',
      description: 'See what is done, what failed, and what to study next.',
    },
    quiz: {
      title: 'Quiz',
      description: 'Check your understanding with short quizzes.',
    },
    testCase: {
      title: 'Test Case practice',
      description:
        'Practise writing test cases: preconditions, steps, data and expected results.',
    },
    bugReport: {
      title: 'Bug Report practice',
      description:
        'Practise writing bug reports, with Severity and Priority set separately.',
    },
    scenario: {
      title: 'Scenario challenge',
      description: 'Reason through realistic testing situations.',
    },
    progress: {
      title: 'Progress',
      description: 'Lessons and exercises per course, with their results.',
    },
    adminCourses: {
      title: 'Courses',
      description: 'Create and manage courses, modules, lessons and exercises.',
    },
  },
  placeholder: {
    opensInPhase: 'Opens in Phase {{phase}}.',
  },
  verdict: {
    pass: 'Passed',
    fail: 'Failed',
    blocked: 'Blocked',
    notRun: 'Not run',
    inProgress: 'In progress',
  },
  apiStatus: {
    connecting: 'Connecting to the API…',
    online: 'API online',
    offline: 'API offline',
  },
  feedback: {
    loading: 'Loading…',
    loadFailed: 'Could not load data',
    genericError: 'Something went wrong. Try again.',
    networkError:
      'Cannot reach the server. Check your connection and try again.',
    tooManyRequests: 'Too many attempts. Wait a minute, then try again.',
    tryAgain: 'Try again',
  },
  errors: {
    expected: 'Expected',
    actual: 'Actual',
    notFoundTitle: 'Page not found',
    notFoundExpected: 'a page at {{path}}',
    notFoundActual: 'nothing is here',
    noAccessTitle: 'No access',
    noAccessExpected: 'admin access to {{path}}',
    noAccessActual: 'this account is a learner',
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
  auth: {
    fields: {
      email: 'Email',
      password: 'Password',
      displayName: 'Display name',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      currentPassword: 'Current password',
    },
    validation: {
      emailRequired: 'Enter your email.',
      emailInvalid: 'Enter a valid email address.',
      passwordRequired: 'Enter your password.',
      passwordMin: 'Use at least {{min}} characters.',
      passwordMax: 'Use at most {{max}} characters.',
      passwordMismatch: 'The passwords do not match.',
      displayNameRequired: 'Enter a display name.',
      displayNameMax: 'Use at most {{max}} characters.',
    },
    passwordHint: 'At least {{min}} characters.',
    backToLogin: 'Back to sign in',
    login: {
      title: 'Sign in',
      submit: 'Sign in',
      forgot: 'Forgot password?',
      noAccount: 'New here?',
      register: 'Create an account',
      invalidCredentials: 'Email or password is incorrect.',
      notVerified:
        'Verify your email before signing in. The link is in the email we sent when you signed up.',
      resend: 'Send a new verification link',
      resent:
        'If this account still needs verifying, a new link is on its way.',
      sessionExpired: 'Your session ended. Sign in again to continue.',
    },
    register: {
      title: 'Create an account',
      description: 'Your lessons, attempts and progress are saved to it.',
      submit: 'Create account',
      haveAccount: 'Already have an account?',
      signIn: 'Sign in',
      sentTitle: 'Check your email',
      sentBody:
        'We sent a verification link to <strong>{{email}}</strong>. Open it to finish creating your account. It expires in 1 hour.',
      resend: 'Send the link again',
      resent:
        'If this account still needs verifying, a new link is on its way.',
    },
    verify: {
      title: 'Verify email',
      verifying: 'Checking your verification link…',
      success: 'Email verified. Welcome to QA Learning Lab.',
      failedTitle: 'This link does not work',
      failed:
        'The verification link is invalid, already used, or expired. Enter your email to get a new one.',
      missing:
        'Open this page from the link in your verification email, or request a new link below.',
      submit: 'Send a new link',
      sent: 'If this account still needs verifying, a new link is on its way.',
    },
    forgot: {
      title: 'Reset your password',
      description:
        'Enter the email you signed up with. We will send a link to choose a new password.',
      submit: 'Send reset link',
      sentTitle: 'Check your email',
      sentBody:
        'If an account exists for <strong>{{email}}</strong>, a reset link is on its way. It expires in 1 hour.',
    },
    reset: {
      title: 'Choose a new password',
      submit: 'Set new password',
      successTitle: 'Password changed',
      successBody:
        'Sign in with your new password. Every device that was signed in has been signed out.',
      signIn: 'Sign in',
      invalidTitle: 'This link does not work',
      invalid:
        'The reset link is invalid, already used, or expired. Request a new one.',
      missing: 'Open this page from the link in your password reset email.',
      requestNew: 'Request a new link',
    },
  },
  trail: {
    label: 'Breadcrumb',
  },
  skills: {
    fundamentals: {
      name: 'QA Fundamentals',
      description: 'What testing is, why it matters, SDLC and STLC.',
    },
    testing_types: {
      name: 'Testing Types',
      description: 'Functional, non-functional, smoke, regression and more.',
    },
    test_design: {
      name: 'Test Design Techniques',
      description:
        'Equivalence partitioning, boundary values, decision tables, state transitions.',
    },
    test_docs: {
      name: 'Test Documentation',
      description: 'Test plans, test cases, test runs and reports.',
    },
    defect_mgmt: {
      name: 'Defect Management',
      description:
        'Writing bug reports, Severity vs Priority, defect life cycle.',
    },
    api_testing: {
      name: 'API Testing',
      description: 'HTTP, REST, status codes and API test cases.',
    },
    automation: {
      name: 'Automation Testing',
      description: 'When to automate, the test pyramid, UI and API automation.',
    },
  },
  learning: {
    title: 'Learning',
    description:
      'Work through the skills in order, or open any course. Your place is saved as you read.',
    minutes_one: '{{count}} min',
    minutes_other: '{{count}} min',
    lessonsDone: '{{done}} of {{total}} lessons',
    empty:
      'No courses are published yet. They will appear here, grouped by skill.',
    noCourses: 'No courses yet.',
    list: {
      filterLabel: 'Filter courses by skill',
      all: 'All skills',
      range: '{{start}}–{{end}} of {{total}} courses',
      emptySkill: 'No courses in this skill yet.',
      pageSizeLabel: 'Courses per page',
      pageSize: '{{count}} per page',
    },
    translation: {
      manual: 'Vietnamese version. QA terms stay in English.',
      machine:
        'Machine-translated from English. QA terms, code and links stay in English.',
      unavailable:
        'The Vietnamese version is not available right now, so this is shown in English.',
      original: 'Showing the English original.',
      showOriginal: 'Show the English original',
      showTranslation: 'Show the Vietnamese version',
    },
    continue: {
      label: 'Continue learning',
      start: 'Start here',
      resume: 'Pick up where you stopped',
      next: 'Up next',
      startAction: 'Start lesson',
      resumeAction: 'Continue lesson',
      read: '{{percent}}% read',
      allDone:
        'Every published lesson is completed. New courses will appear here.',
    },
    course: {
      backToList: 'Back to courses',
      start: 'Start course',
      continue: 'Continue course',
      review: 'Review from the first lesson',
      modulesLabel: 'Modules and lessons',
      moduleNumber: 'Module {{number}}',
      noLessons: 'No lessons in this module yet.',
    },
    lesson: {
      backToLessons: 'Back to the lesson list',
      readingTime_one: '{{count}} min read',
      readingTime_other: '{{count}} min read',
      resumeAt: 'Jump to where you stopped ({{percent}}%)',
      complete: 'Mark as complete',
      completedOn: 'Completed on {{date}}',
      completeFailed: 'Could not save your progress. Try again.',
      neighbours: 'Other lessons in this course',
      previous: 'Previous lesson',
      next: 'Next lesson',
      backToCourse: 'Back to the course',
      empty: 'This lesson has no content yet.',
    },
  },
  profile: {
    title: 'Profile',
    description: 'Your account, and what you want to get out of the lab.',
    account: 'Account',
    email: 'Email',
    role: 'Role',
    memberSince: 'Member since',
    roles: {
      learner: 'Learner',
      admin: 'Admin',
    },
    about: 'About you',
    displayName: 'Display name',
    experienceLevel: 'Experience level',
    experienceLevelPlaceholder: 'Not set',
    levels: {
      beginner: 'Beginner',
      some_qa: 'Some QA experience',
      working_qa: 'Working QA/QC',
      automation_qa: 'Automation QA',
    },
    learningGoals: 'Learning goals',
    learningGoalsHint:
      'Type a goal and press Enter. Up to {{max}} goals, {{length}} characters each.',
    learningGoalsMax: 'Keep it to {{max}} goals.',
    learningGoalLength: 'Each goal can have at most {{length}} characters.',
    save: 'Save profile',
    saved: 'Profile saved.',
    password: {
      title: 'Change password',
      submit: 'Change password',
      changed: 'Password changed.',
      currentIncorrect: 'The current password is incorrect.',
    },
  },
};

export type TranslationSchema = typeof en;
