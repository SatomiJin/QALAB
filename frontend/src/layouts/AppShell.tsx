import { CloseOutlined, MenuOutlined } from '@ant-design/icons';
import { Button, Drawer, Grid } from 'antd';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { BrandMark } from '../components/BrandMark';
import { NavigationBar } from '../components/NavigationBar';
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
  /** Page to show instead of the route outlet (guards that block a route). */
  children?: ReactNode;
}

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;
}

/**
 * Shared frame for the learner and admin areas: a top bar with the sections
 * and a single reading column, like a document (see docs/design.md).
 * Below the lg breakpoint the sections move into a drawer.
 */
export function AppShell({
  links,
  brandSuffix,
  extra,
  children,
}: AppShellProps) {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const shownPath = useRef(pathname);

  // After moving to another page, start keyboard and screen-reader users at
  // its content instead of leaving focus on the link that was clicked.
  // Not on the first page, and not when only the search params change.
  useEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);
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
      <NavigationBar />
      <a href="#main" className={styles.skipLink}>
        {t('nav.skipToContent')}
      </a>
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand}>
          <BrandMark />
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

      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        {children ?? <Outlet />}
      </main>

      <footer className={styles.footer}>
        <ApiStatus />
      </footer>
    </div>
  );
}
