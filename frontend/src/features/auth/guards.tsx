import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { ErrorState } from '../../components/feedback/ErrorState';
import { PageLoader } from '../../components/feedback/PageLoader';
import { NoAccessPage } from '../../pages/NoAccessPage';
import { useAuth } from './auth-context';
import { loginPath, safeRedirect } from './redirect';

/** Signed-in users only; others go to login and come back afterwards. */
export function RequireAuth() {
  const { status, signedOutByUser } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <PageLoader />;
  if (status === 'signedOut') {
    // After an explicit sign-out, do not offer to come back to this page.
    const to = signedOutByUser
      ? '/auth/login'
      : loginPath(location.pathname + location.search);
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}

/**
 * Admins only. UX guard: the backend (RolesGuard) and RLS (`is_admin()`)
 * enforce the same rule, so hiding the UI is not the protection.
 */
export function RequireAdmin() {
  const { profile, profileQuery, isAdmin } = useAuth();

  if (profileQuery.isPending) return <PageLoader />;
  if (profileQuery.isError || !profile) {
    return (
      <ErrorState error={profileQuery.error} onRetry={profileQuery.refetch} />
    );
  }
  return isAdmin ? <Outlet /> : <NoAccessPage />;
}

/** Login / register / forgot password: skip them when already signed in. */
export function GuestOnly() {
  const { status } = useAuth();
  const [params] = useSearchParams();

  if (status === 'checking') return <PageLoader />;
  if (status === 'signedIn') {
    return <Navigate to={safeRedirect(params.get('redirect'))} replace />;
  }
  return <Outlet />;
}
