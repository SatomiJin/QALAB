import { theme as antdTheme, type ThemeConfig } from 'antd';
import type { ResolvedTheme } from './theme-mode';

// Keep these in sync with the CSS variables in src/styles/global.scss.
// See docs/design.md for what each color means.
export const palette = {
  light: {
    paper: '#F6F7F4',
    sheet: '#FFFFFF',
    ink: '#1E2A36',
    inkMuted: '#5A6673',
    rule: '#DDE1DC',
    highlighter: '#F4D35E',
    highlighterHover: '#EFC93F',
    // Highlighter tints for selected items in menus and selects.
    highlighterTint: 'rgba(244, 211, 94, 0.38)',
    highlighterTintHover: 'rgba(244, 211, 94, 0.52)',
    pass: '#2F7D4E',
    fail: '#C0392B',
    blocked: '#A86200',
  },
  dark: {
    paper: '#12171D',
    sheet: '#1A2129',
    ink: '#E6EAED',
    inkMuted: '#98A3AE',
    rule: '#2A333D',
    highlighter: '#E3C14F',
    highlighterHover: '#EDCD62',
    highlighterTint: 'rgba(227, 193, 79, 0.22)',
    highlighterTintHover: 'rgba(227, 193, 79, 0.32)',
    pass: '#5CB880',
    fail: '#E8776B',
    blocked: '#E0A443',
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
      colorBgElevated: c.sheet,
      colorBorder: c.rule,
      colorBorderSecondary: c.rule,
      colorText: c.ink,
      colorTextSecondary: c.inkMuted,
      colorTextDescription: c.inkMuted,
      // Selected items (dropdown menus, select options) get the highlighter,
      // not a tint derived from Ink (dark-on-dark, looked disabled).
      controlItemBgActive: c.highlighterTint,
      controlItemBgActiveHover: c.highlighterTintHover,
      colorPrimaryBg: c.highlighterTint,
      colorPrimaryBgHover: c.highlighterTintHover,
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
      // The one primary action per screen wears the highlighter.
      Button: {
        colorPrimary: c.highlighter,
        colorPrimaryHover: c.highlighterHover,
        colorPrimaryActive: c.highlighter,
        // Dark ink in both themes: light text on yellow would be unreadable.
        primaryColor: palette.light.ink,
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
