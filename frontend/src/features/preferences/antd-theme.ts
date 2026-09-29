import { theme as antdTheme, type ThemeConfig } from 'antd';
import type { ResolvedTheme } from './theme-mode';

// Keep these in sync with the CSS variables in src/styles/global.scss.
const palette = {
  light: {
    colorPrimary: '#1f5eff',
    colorBgLayout: '#f5f7fb',
    colorBgContainer: '#ffffff',
    colorBorderSecondary: '#e6e9f0',
    colorText: '#1f2430',
    colorTextSecondary: '#5b6475',
  },
  dark: {
    colorPrimary: '#4d7dff',
    colorBgLayout: '#0f1115',
    colorBgContainer: '#171a21',
    colorBorderSecondary: '#262b36',
    colorText: '#e6e8ee',
    colorTextSecondary: '#9aa3b5',
  },
} as const;

export function buildAntdTheme(mode: ResolvedTheme): ThemeConfig {
  return {
    algorithm:
      mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      ...palette[mode],
      borderRadius: 8,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    },
  };
}
