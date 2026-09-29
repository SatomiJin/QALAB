import { CloseOutlined, MenuOutlined } from '@ant-design/icons';
import { Button, Drawer, Grid } from 'antd';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet } from 'react-router';
import { UserMenu } from '../features/auth/UserMenu';
import {
  LanguageSwitcher,
  ThemeSwitcher,
} from '../features/preferences/PreferenceControls';
import { ApiStatus } from '../features/system/ApiStatus';
import type { NavLinkItem } from './navigation';
import styles from './AppShell.module.scss';

interface AppShellProps {
  links: NavLinkItem[];
  brandSuffix?: string;
  /** Extra link shown after the main links (e.g. "Back to app"). */
  extra?: ReactNode;
}

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;
}

/**
 * Shared frame for the learner and admin areas: a top bar with the sections
 * and a single reading column, like a document (see docs/design.md).
 * Below the lg breakpoint the sections move into a drawer.
 */
export function AppShell({ links, brandSuffix, extra }: AppShellProps) {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Until breakpoints are measured, assume desktop to avoid a layout flash.
  const isDesktop = screens.lg ?? true;

  const navList = (
    <ul className={styles.navList}>
      {links.map((link) => (
        <li key={link.path}>
          <NavLink
            to={link.path}
            className={linkClass}
            onClick={() => setDrawerOpen(false)}
          >
            {t(link.labelKey)}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand}>
          <img src="/favicon.svg" alt="" width={24} height={24} />
          <span>{t('app.name')}</span>
          {brandSuffix && (
            <span className={styles.brandSuffix}>{brandSuffix}</span>
          )}
        </Link>

        {isDesktop && (
          <nav aria-label={t('nav.mainLabel')} className={styles.nav}>
            {navList}
            {extra}
          </nav>
        )}

        <div className={styles.actions}>
          <LanguageSwitcher />
          <ThemeSwitcher />
          <UserMenu />
          {!isDesktop && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              aria-label={t('nav.open')}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            />
          )}
        </div>
      </header>

      {!isDesktop && (
        <Drawer
          placement="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          size={280}
          closable={false}
          title={
            <div className={styles.drawerHeader}>
              <span>{t('app.name')}</span>
              <Button
                type="text"
                icon={<CloseOutlined />}
                aria-label={t('nav.close')}
                onClick={() => setDrawerOpen(false)}
              />
            </div>
          }
        >
          <nav aria-label={t('nav.mainLabel')} className={styles.drawerNav}>
            {navList}
            {extra}
          </nav>
        </Drawer>
      )}

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <ApiStatus />
      </footer>
    </div>
  );
}
