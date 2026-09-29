import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import styles from './PracticeLayout.module.scss';
import { PRACTICE_LINKS } from './navigation';

/** Practice is one section; its four kinds are tabs on the page. */
export function PracticeLayout() {
  const { t } = useTranslation();

  return (
    <>
      <nav aria-label={t('nav.practiceLabel')} className={styles.tabs}>
        {PRACTICE_LINKS.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              isActive ? `${styles.tab} ${styles.active}` : styles.tab
            }
          >
            {t(link.labelKey)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}
