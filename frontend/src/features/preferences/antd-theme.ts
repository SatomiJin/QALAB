import { theme as antdTheme, type ThemeConfig } from 'antd';
import type { ResolvedTheme } from './theme-mode';

// Keep these in sync with the CSS variables in src/styles/global.scss.
// See docs/design.md for what each color means.
export const palette = {
  light: {
    paper: '#EDF2F6',
    sheet: '#FFFFFF',
    sheetRaised: '#FFFFFF',
    ink: '#12355B',
    inkMuted: '#4F6478',
    rule: '#CFD9E2',
    ruleStrong: '#A9B8C6',
    // The one primary button: ice blue, dark enough for white text.
    action: '#0E6B9E',
    actionHover: '#0B5F8F',
    onAction: '#FFFFFF',
    // Mark tints for selected items in menus and selects.
    markTint: 'rgba(31, 134, 196, 0.14)',
    markTintHover: 'rgba(31, 134, 196, 0.22)',
    pass: '#2F7D4E',
    fail: '#C0392B',
    blocked: '#A86200',
  },
  dark: {
    paper: '#0B2036',
    sheet: '#10294A',
    sheetRaised: '#173357',
    ink: '#E8F1F8',
    inkMuted: '#9FB4C8',
    rule: '#24476B',
    ruleStrong: '#3A6087',
    action: '#8FD8FF',
    actionHover: '#A8E1FF',
    onAction: '#0B2036',
    markTint: 'rgba(143, 216, 255, 0.16)',
    markTintHover: 'rgba(143, 216, 255, 0.24)',
    pass: '#6FD39A',
    fail: '#FF8A7D',
    blocked: '#F0A35E',
  },
} as const;

const FONT_FAMILY =
  "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', sans-serif";

export function buildAntdTheme(
  mode: ResolvedTheme,
  { reduceMotion = false }: { reduceMotion?: boolean } = {},
): ThemeConfig {
  const c = palette[mode];
  return {
    algorithm:
      mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      // OS "reduce motion": turn antd animations off the supported way.
      motion: !reduceMotion,
      // Ink is the "brand" color: links, focus, selected controls.
      colorPrimary: c.ink,
      colorLink: c.ink,
      colorInfo: c.ink,
      colorSuccess: c.pass,
      colorError: c.fail,
      colorWarning: c.blocked,
      colorBgLayout: c.paper,
      colorBgContainer: c.sheet,
      // Drawer, popovers, menus: one step above Sheet in dark.
      colorBgElevated: c.sheetRaised,
      colorBorder: c.rule,
      colorBorderSecondary: c.rule,
      colorText: c.ink,
      colorTextSecondary: c.inkMuted,
      colorTextDescription: c.inkMuted,
      // antd's default placeholder grey is below 4.5:1 on Sheet.
      colorTextPlaceholder: c.inkMuted,
      // Selected items (dropdown menus, select options) get a tint of the
      // mark, not a tint derived from Ink (dark-on-dark, looked disabled).
      controlItemBgActive: c.markTint,
      controlItemBgActiveHover: c.markTintHover,
      colorPrimaryBg: c.markTint,
      colorPrimaryBgHover: c.markTintHover,
      fontFamily: FONT_FAMILY,
      fontSize: 15,
      borderRadius: 4,
      borderRadiusSM: 2,
      borderRadiusLG: 6,
      boxShadow: 'none',
      controlHeight: 36,
      controlOutlineWidth: 0,
      motionDurationMid: '0.15s',
    },
    components: {
      // The one primary action per screen wears the ice-blue action colour.
      Button: {
        colorPrimary: c.action,
        colorPrimaryHover: c.actionHover,
        colorPrimaryActive: c.action,
        // White on the deep ice blue (light), blueprint ink on the pale one
        // (dark): both above 4.5:1.
        primaryColor: c.onAction,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
        fontWeight: 600,
      },
      Input: { activeShadow: 'none' },
      Select: { activeOutlineColor: 'transparent' },
      Alert: { withDescriptionPadding: '12px 16px' },
    },
  };
}
