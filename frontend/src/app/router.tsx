import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { GuestOnly, RequireAdmin, RequireAuth } from '../features/auth/guards';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { PRACTICE_LINKS } from '../layouts/navigation';
import { PracticeLayout } from '../layouts/PracticeLayout';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
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
                element: <PlaceholderPage page="dashboard" phase={5} />,
              },
              {
                path: 'learning',
                element: <PlaceholderPage page="learning" phase={2} />,
              },
              {
                path: 'practice',
                element: <PracticeLayout />,
                children: [
                  {
                    index: true,
                    element: <Navigate to={PRACTICE_LINKS[0].path} replace />,
                  },
                  ...PRACTICE_LINKS.map((link) => ({
                    path: link.path.replace('/practice/', ''),
                    element: <PlaceholderPage page={link.page} phase={3} />,
                  })),
                ],
              },
              {
                path: 'progress',
                element: <PlaceholderPage page="progress" phase={5} />,
              },
              { path: 'profile', element: <ProfilePage /> },
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
                    element: <PlaceholderPage page="adminCourses" phase={4} />,
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
              { path: 'login', element: <LoginPage /> },
              { path: 'register', element: <RegisterPage /> },
              { path: 'forgot-password', element: <ForgotPasswordPage /> },
            ],
          },
          // Email links: reachable signed in or not.
          { path: 'verify', element: <VerifyEmailPage /> },
          { path: 'reset-password', element: <ResetPasswordPage /> },
          { path: '*', element: <Navigate to="/auth/login" replace /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
