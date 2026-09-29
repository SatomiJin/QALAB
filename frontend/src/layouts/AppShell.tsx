import { MenuOutlined, UserOutlined } from '@ant-design/icons';
import {
  Avatar,
  Button,
  Drawer,
  Grid,
  Layout,
  Menu,
  type MenuProps,
} from 'antd';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router';
import {
  LanguageSwitcher,
  ThemeSwitcher,
} from '../features/preferences/PreferenceControls';
import { ApiStatus } from '../features/system/ApiStatus';
import { selectedMenuKey } from './navigation';
import styles from './AppShell.module.scss';

type MenuItem = Required<MenuProps>['items'][number];

interface AppShellProps {
  menuItems: MenuItem[];
  brandSuffix?: string;
  headerExtra?: ReactNode;
}

function collectKeys(items: MenuItem[]): string[] {
  return items.flatMap((item) => {
    if (!item || !('key' in item) || item.key === undefined) return [];
    const children =
      'children' in item && Array.isArray(item.children) ? item.children : [];
    return [String(item.key), ...collectKeys(children as MenuItem[])];
  });
}

/**
 * Shared frame for the learner and admin areas: a fixed sidebar on desktop,
 * a drawer opened from the header on smaller screens.
 */
export function AppShell({
  menuItems,
  brandSuffix,
  headerExtra,
}: AppShellProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Until breakpoints are measured, assume desktop to avoid a layout flash.
  const isDesktop = screens.lg ?? true;

  const selected = selectedMenuKey(pathname, collectKeys(menuItems));
  const openParent = selected?.split('/').slice(0, 2).join('/');

  const brand = (
    <Link to="/" className={styles.brand}>
      <img src="/favicon.svg" alt="" width={28} height={28} />
      <span>
        {t('app.name')}
        {brandSuffix && (
          <small className={styles.brandSuffix}>{brandSuffix}</small>
        )}
      </span>
    </Link>
  );

  const menu = (
    <nav aria-label={t('nav.mainLabel')}>
      <Menu
        mode="inline"
        items={menuItems}
        selectedKeys={selected ? [selected] : []}
        defaultOpenKeys={openParent ? [openParent] : []}
        className={styles.menu}
        // Close the drawer after picking a page (leaf items only).
        onClick={() => setDrawerOpen(false)}
      />
    </nav>
  );

  return (
    <Layout className={styles.shell}>
      {isDesktop && (
        <Layout.Sider width={232} theme="light" className={styles.sider}>
          {brand}
          {menu}
        </Layout.Sider>
      )}
      {!isDesktop && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          size={264}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          {brand}
          {menu}
        </Drawer>
      )}
      <Layout>
        <Layout.Header className={styles.header}>
          <div className={styles.headerLeft}>
            {!isDesktop && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                aria-label={t('nav.open')}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              />
            )}
            {headerExtra}
          </div>
          <div className={styles.headerRight}>
            <ApiStatus />
            <LanguageSwitcher />
            <ThemeSwitcher />
            {/* Replaced by the user menu in Phase 1. */}
            <Avatar icon={<UserOutlined />} aria-label={t('nav.user')} />
          </div>
        </Layout.Header>
        <Layout.Content className={styles.content}>
          <main className={styles.main}>
            <Outlet />
          </main>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
