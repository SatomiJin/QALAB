import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { PageLoader } from '../components/feedback/PageLoader';
import { GuestOnly, RequireAdmin, RequireAuth } from '../features/auth/guards';
import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { PRACTICE_LINKS } from '../layouts/navigation';
import { PracticeLayout } from '../layouts/PracticeLayout';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { RootRoute } from './RootRoute';

/**
 * Pages are loaded on demand (one chunk per page; shared code such as antd
 * goes into common chunks), so the first visit downloads only what it shows.
 * Guards and layouts stay in the main bundle: every page needs them.
 */
function page<M>(load: () => Promise<M>, name: keyof M) {
  return async () => ({
    Component: (await load())[name] as ComponentType,
  });
}

export const routes: RouteObject[] = [
  {
    element: <RootRoute />,
    errorElement: <RouteErrorPage />,
    // Shown while the first page's chunk loads; later navigations keep the
    // current page on screen (with the bar in AppShell) until the next is ready.
    hydrateFallbackElement: <PageLoader />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          {
            element: <MainLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              {
                path: 'dashboard',
                lazy: page(
                  () => import('../features/dashboard/pages/DashboardPage'),
                  'DashboardPage',
                ),
              },
              {
                path: 'learning',
                children: [
                  {
                    index: true,
                    lazy: page(
                      () => import('../features/learning/pages/LearningPage'),
                      'LearningPage',
                    ),
                  },
                  {
                    path: 'courses/:slug',
                    lazy: page(
                      () =>
                        import('../features/learning/pages/CourseDetailPage'),
                      'CourseDetailPage',
                    ),
                  },
                  {
                    path: 'lessons/:lessonId',
                    lazy: page(
                      () => import('../features/learning/pages/LessonPage'),
                      'LessonPage',
                    ),
                  },
                ],
              },
              {
                path: 'practice',
                children: [
                  {
                    element: <PracticeLayout />,
                    children: [
                      {
                        index: true,
                        element: (
                          <Navigate to={PRACTICE_LINKS[0].path} replace />
                        ),
                      },
                      ...PRACTICE_LINKS.map((link) => ({
                        path: link.path.replace('/practice/', ''),
                        lazy: async () => {
                          const { PracticeListPage } =
                            await import('../features/practice/pages/PracticeListPage');
                          return {
                            element: <PracticeListPage kind={link.page} />,
                          };
                        },
                      })),
                    ],
                  },
                  {
                    path: 'exercises/:exerciseId',
                    lazy: page(
                      () => import('../features/practice/pages/ExercisePage'),
                      'ExercisePage',
                    ),
                  },
                ],
              },
              {
                path: 'progress',
                lazy: page(
                  () => import('../features/dashboard/pages/ProgressPage'),
                  'ProgressPage',
                ),
              },
              {
                path: 'profile',
                lazy: page(
                  () => import('../features/profile/ProfilePage'),
                  'ProfilePage',
                ),
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
          {
            path: 'admin',
            element: <RequireAdmin />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="/admin/courses" replace />,
                  },
                  {
                    path: 'courses',
                    lazy: page(
                      () => import('../features/admin/pages/AdminCoursesPage'),
                      'AdminCoursesPage',
                    ),
                  },
                  {
                    path: 'courses/:courseId',
                    lazy: page(
                      () => import('../features/admin/pages/AdminCoursePage'),
                      'AdminCoursePage',
                    ),
                  },
                  {
                    path: 'lessons/:lessonId',
                    lazy: page(
                      () => import('../features/admin/pages/AdminLessonPage'),
                      'AdminLessonPage',
                    ),
                  },
                  {
                    path: 'lessons/:lessonId/preview',
                    lazy: page(
                      () =>
                        import('../features/admin/pages/AdminLessonPreviewPage'),
                      'AdminLessonPreviewPage',
                    ),
                  },
                  {
                    path: 'lessons/:lessonId/exercises/new',
                    lazy: page(
                      () => import('../features/admin/pages/AdminExercisePage'),
                      'AdminNewExercisePage',
                    ),
                  },
                  {
                    path: 'exercises/:exerciseId',
                    lazy: page(
                      () => import('../features/admin/pages/AdminExercisePage'),
                      'AdminExercisePage',
                    ),
                  },
                  {
                    path: 'courses/:courseId/translation',
                    lazy: page(
                      () =>
                        import('../features/admin/pages/AdminTranslationPage'),
                      'AdminCourseTranslationPage',
                    ),
                  },
                  {
                    path: 'courses/:courseId/modules/:moduleId/translation',
                    lazy: page(
                      () =>
                        import('../features/admin/pages/AdminTranslationPage'),
                      'AdminModuleTranslationPage',
                    ),
                  },
                  {
                    path: 'lessons/:lessonId/translation',
                    lazy: page(
                      () =>
                        import('../features/admin/pages/AdminTranslationPage'),
                      'AdminLessonTranslationPage',
                    ),
                  },
                  {
                    path: 'exercises/:exerciseId/translation',
                    lazy: page(
                      () =>
                        import('../features/admin/pages/AdminTranslationPage'),
                      'AdminExerciseTranslationPage',
                    ),
                  },
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'auth',
        element: <AuthLayout />,
        children: [
          { index: true, element: <Navigate to="/auth/login" replace /> },
          {
            element: <GuestOnly />,
            children: [
              {
                path: 'login',
                lazy: page(
                  () => import('../features/auth/pages/LoginPage'),
                  'LoginPage',
                ),
              },
              {
                path: 'register',
                lazy: page(
                  () => import('../features/auth/pages/RegisterPage'),
                  'RegisterPage',
                ),
              },
              {
                path: 'forgot-password',
                lazy: page(
                  () => import('../features/auth/pages/ForgotPasswordPage'),
                  'ForgotPasswordPage',
                ),
              },
            ],
          },
          // Email links: reachable signed in or not.
          {
            path: 'verify',
            lazy: page(
              () => import('../features/auth/pages/VerifyEmailPage'),
              'VerifyEmailPage',
            ),
          },
          {
            path: 'reset-password',
            lazy: page(
              () => import('../features/auth/pages/ResetPasswordPage'),
              'ResetPasswordPage',
            ),
          },
          { path: '*', element: <Navigate to="/auth/login" replace /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
