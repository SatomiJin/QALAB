import { Card } from 'antd';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import {
  LanguageSwitcher,
  ThemeSwitcher,
} from '../features/preferences/PreferenceControls';
import styles from './AuthLayout.module.scss';

export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
      <main className={styles.container}>
        <div className={styles.brand}>
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <span>{t('app.name')}</span>
        </div>
        <Card>
          <Outlet />
        </Card>
      </main>
    </div>
  );
}
