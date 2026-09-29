import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { PRACTICE_LINKS } from '../layouts/navigation';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';

// Auth guards (protected + admin-only routes) are added in Phase 1.
export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
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
            element: <Navigate to={PRACTICE_LINKS[0].path} replace />,
          },
          ...PRACTICE_LINKS.map((link) => ({
            path: link.path.slice(1),
            element: <PlaceholderPage page={link.page} phase={3} />,
          })),
          {
            path: 'progress',
            element: <PlaceholderPage page="progress" phase={5} />,
          },
          {
            path: 'profile',
            element: <PlaceholderPage page="profile" phase={1} />,
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/courses" replace /> },
          {
            path: 'courses',
            element: <PlaceholderPage page="adminCourses" phase={4} />,
          },
        ],
      },
      {
        path: 'auth',
        element: <AuthLayout />,
        children: [
          { index: true, element: <Navigate to="/auth/login" replace /> },
          {
            path: 'login',
            element: <PlaceholderPage page="login" phase={1} />,
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
