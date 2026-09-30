import { ConfigProvider } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import {
  LanguageSwitcher,
  ThemeSwitcher,
} from '../features/preferences/PreferenceControls';
import { BrandMark } from '../components/BrandMark';
import { palette } from '../features/preferences/antd-theme';
import { usePreferences } from '../features/preferences/preferences-context';
import styles from './AuthLayout.module.scss';

/**
 * Brand top left, preferences top right, and the form centred on a sheet.
 * Inputs on the sheet use the paper colour so they read as fields to fill.
 */
export function AuthLayout() {
  const { t } = useTranslation();
  const { resolvedTheme } = usePreferences();

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link to="/auth/login" className={styles.brand}>
          <BrandMark />
          <span>{t('app.name')}</span>
        </Link>
        <div className={styles.actions}>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.column}>
          <ConfigProvider
            theme={{
              token: { colorBgContainer: palette[resolvedTheme].paper },
            }}
          >
            <Outlet />
          </ConfigProvider>
        </div>
      </main>
    </div>
  );
}
