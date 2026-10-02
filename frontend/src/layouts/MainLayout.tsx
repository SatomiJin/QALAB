import type { ReactNode } from 'react';
import { useAuth } from '../features/auth/auth-context';
import { AppShell } from './AppShell';
import { ADMIN_ENTRY, MAIN_LINKS } from './navigation';

/** Learner frame. `children` replaces the route outlet (see RequireAdmin). */
export function MainLayout({ children }: { children?: ReactNode }) {
  const { isAdmin } = useAuth();
  return (
    <AppShell links={isAdmin ? [...MAIN_LINKS, ADMIN_ENTRY] : MAIN_LINKS}>
      {children}
    </AppShell>
  );
}
