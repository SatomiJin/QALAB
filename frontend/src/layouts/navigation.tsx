import {
  BarChartOutlined,
  BookOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  ReadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

type MenuItem = Required<MenuProps>['items'][number];

export const PRACTICE_LINKS = [
  { path: '/practice/quiz', page: 'quiz' },
  { path: '/practice/test-case', page: 'testCase' },
  { path: '/practice/bug-report', page: 'bugReport' },
  { path: '/practice/scenario', page: 'scenario' },
] as const;

export function useMainMenuItems(): MenuItem[] {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: <Link to="/dashboard">{t('nav.dashboard')}</Link>,
      },
      {
        key: '/learning',
        icon: <ReadOutlined />,
        label: <Link to="/learning">{t('nav.learning')}</Link>,
      },
      {
        key: '/practice',
        icon: <ExperimentOutlined />,
        label: t('nav.practice'),
        children: PRACTICE_LINKS.map((link) => ({
          key: link.path,
          label: <Link to={link.path}>{t(`nav.${link.page}`)}</Link>,
        })),
      },
      {
        key: '/progress',
        icon: <BarChartOutlined />,
        label: <Link to="/progress">{t('nav.progress')}</Link>,
      },
      {
        key: '/profile',
        icon: <UserOutlined />,
        label: <Link to="/profile">{t('nav.profile')}</Link>,
      },
    ],
    [t],
  );
}

export function useAdminMenuItems(): MenuItem[] {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        key: '/admin/courses',
        icon: <BookOutlined />,
        label: <Link to="/admin/courses">{t('nav.courses')}</Link>,
      },
    ],
    [t],
  );
}

/**
 * Picks the menu key for the current path: the longest key that is a
 * prefix of the path, so nested routes keep their parent highlighted.
 */
export function selectedMenuKey(
  pathname: string,
  keys: string[],
): string | undefined {
  return keys
    .filter((key) => pathname === key || pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
}
