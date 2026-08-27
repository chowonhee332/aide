import { AUI_TOKEN_VALUE } from './aide-product-tokens'

/**
 * TypeScript bridge to the Aide Design System CSS tokens.
 * Static component styling should prefer Tailwind semantic classes; use these
 * references for dynamic inline styles that depend on runtime state.
 */
export const AIDE_UI = {
  canvas: 'var(--aui-canvas)',
  page: 'var(--aui-page)',
  surface: 'var(--aui-surface)',
  surfaceMuted: 'var(--aui-surface-muted)',
  text: 'var(--aui-text)',
  textNeutral: 'var(--aui-text-neutral)',
  textMuted: 'var(--aui-text-muted)',
  textAssistive: 'var(--aui-text-assistive)',
  textDisabled: 'var(--aui-text-disabled)',
  onPrimary: 'var(--aui-on-primary)',
  onDark: 'var(--aui-on-dark)',
  onDarkStrong: 'var(--aui-on-dark-strong)',
  onDarkMuted: 'var(--aui-on-dark-muted)',
  onDarkSubtle: 'var(--aui-on-dark-subtle)',
  onDarkFaint: 'var(--aui-on-dark-faint)',
  inverseSurface: 'var(--aui-inverse-surface)',
  inverseSurfaceRaised: 'var(--aui-inverse-surface-raised)',
  primary: 'var(--aui-primary)',
  primaryStrong: 'var(--aui-primary-strong)',
  primarySoft: 'var(--aui-primary-soft)',
  primaryTint: 'var(--aui-primary-tint)',
  border: 'var(--aui-border)',
  borderSubtle: 'var(--aui-border-subtle)',
  fill: 'var(--aui-fill)',
  fillStrong: 'var(--aui-fill-strong)',
  primaryMuted: 'var(--aui-primary-muted)',
  primaryDisabled: 'var(--aui-primary-disabled)',
  scrimSoft: 'var(--aui-scrim-soft)',
  scrim: 'var(--aui-scrim)',
  scrimStrong: 'var(--aui-scrim-strong)',
  shadowLine: 'var(--aui-shadow-line)',
  shadowSoft: 'var(--aui-shadow-soft)',
  shadowMedium: 'var(--aui-shadow-medium)',
  positive: 'var(--aui-positive)',
  caution: 'var(--aui-caution)',
  negative: 'var(--aui-negative)',
  negativeSoft: 'var(--aui-negative-soft)',
  negativeBorder: 'var(--aui-negative-border)',
  cautionSoft: 'var(--aui-caution-soft)',
  cautionBorder: 'var(--aui-caution-border)',
  cautionText: 'var(--aui-caution-text)',
  radiusSm: 'var(--aui-radius-sm)',
  radiusControl: 'var(--aui-radius-control)',
  radiusCard: 'var(--aui-radius-card)',
  radiusOverlay: 'var(--aui-radius-overlay)',
  shadowCard: 'var(--aui-shadow-card)',
  shadowElevated: 'var(--aui-shadow-elevated)',
} as const;

/** Concrete values compiled from the MD for renderers that cannot resolve CSS variables. */
export const AIDE_UI_RAW = {
  page: AUI_TOKEN_VALUE.page,
  surface: AUI_TOKEN_VALUE.surface,
  heroGradientStart: AUI_TOKEN_VALUE['hero-gradient-start'],
  heroGradientMiddle: AUI_TOKEN_VALUE['hero-gradient-middle'],
  heroGradientEnd: AUI_TOKEN_VALUE['hero-gradient-end'],
} as const;

/** This belongs to generated artifacts, not Aide product chrome. */
export const DEFAULT_GENERATED_BRAND_COLOR = '#FF385C';
