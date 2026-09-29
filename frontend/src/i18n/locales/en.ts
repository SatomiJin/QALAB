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
    learning: {
      title: 'Learning',
      description:
        'Work through courses grouped by skill, one lesson at a time.',
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
