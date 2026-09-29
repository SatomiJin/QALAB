import { AppShell } from './AppShell';
import { useMainMenuItems } from './navigation';

export function MainLayout() {
  return <AppShell menuItems={useMainMenuItems()} />;
}
