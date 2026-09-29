import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { AppShell } from './AppShell';
import styles from './AppShell.module.scss';
import { ADMIN_LINKS } from './navigation';

// Only rendered for admins (RequireAdmin route guard + backend RolesGuard).
export function AdminLayout() {
  const { t } = useTranslation();

  return (
    <AppShell
      links={ADMIN_LINKS}
      brandSuffix={t('app.admin')}
      extra={
        <NavLink to="/dashboard" className={styles.navLink} end>
          {t('nav.backToApp')}
        </NavLink>
      }
    />
  );
}
