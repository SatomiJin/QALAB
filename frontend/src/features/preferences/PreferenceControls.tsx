import {
  DesktopOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, type MenuProps } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_LABELS, LANGUAGES, isLanguage } from '../../i18n/language';
import { usePreferences } from './preferences-context';
import { THEME_MODES, isThemeMode, type ThemeMode } from './theme-mode';

const THEME_ICONS: Record<ThemeMode, ReactNode> = {
  light: <SunOutlined />,
  dark: <MoonOutlined />,
  system: <DesktopOutlined />,
};

const THEME_LABEL_KEYS = {
  light: 'preferences.themeLight',
  dark: 'preferences.themeDark',
  system: 'preferences.themeSystem',
} as const;

// No Tooltip on these triggers: it overlaps the opened dropdown and blocks
// the first menu item. The aria-label/title carry the name instead.
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage } = usePreferences();

  const items: MenuProps['items'] = LANGUAGES.map((code) => ({
    key: code,
    label: LANGUAGE_LABELS[code],
  }));

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: [language],
        onClick: ({ key }) => isLanguage(key) && setLanguage(key),
      }}
    >
      <Button
        type="text"
        icon={<GlobalOutlined />}
        aria-label={t('preferences.language')}
      >
        {language.toUpperCase()}
      </Button>
    </Dropdown>
  );
}

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { themeMode, setThemeMode } = usePreferences();

  const items: MenuProps['items'] = THEME_MODES.map((mode) => ({
    key: mode,
    icon: THEME_ICONS[mode],
    label: t(THEME_LABEL_KEYS[mode]),
  }));

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: [themeMode],
        onClick: ({ key }) => isThemeMode(key) && setThemeMode(key),
      }}
    >
      <Button
        type="text"
        icon={THEME_ICONS[themeMode]}
        aria-label={t('preferences.theme')}
        title={t('preferences.theme')}
      />
    </Dropdown>
  );
}
