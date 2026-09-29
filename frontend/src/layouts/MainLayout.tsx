import { useAuth } from '../features/auth/auth-context';
import { AppShell } from './AppShell';
import { ADMIN_ENTRY, MAIN_LINKS } from './navigation';

export function MainLayout() {
  const { isAdmin } = useAuth();
  return (
    <AppShell links={isAdmin ? [...MAIN_LINKS, ADMIN_ENTRY] : MAIN_LINKS} />
  );
}
