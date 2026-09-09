/**
 * Aide app chrome ↔ Astryx (`@astryxdesign/theme-neutral`) token bridge.
 *
 * Cycle 1 of "replace Aide app chrome with Astryx" (see MISSION.md). The Aide
 * product chrome styles every primitive in `src/components/ui/*` and most bespoke
 * inline styles through `--aui-*` custom properties, which `layout.tsx` injects at
 * `:root` from `aide.md` via `aide-product-tokens.ts` (`AUI_ROOT_CSS`).
 *
 * This module emits a second `:root` block that re-points the *semantic* `--aui-*`
 * families (colour, radius, shadow, font family) at Astryx `theme-neutral` values
 * (v0.5.2, light mode — chrome is light-only). It is injected AFTER `AUI_ROOT_CSS`
 * so it wins, and it deliberately does NOT touch `aide.md`, `aide-product-tokens.ts`,
 * or the generation pipeline's own `--aide-*` / `--color-*` namespaces — generated
 * customer UI is unaffected.
 *
 * Primary/accent is blue. Astryx core ships a blue `--color-accent` (#0064E0) that
 * `theme-neutral` greys out to monochrome; we restore the blue for both the
 * `--aui-primary*` ramp (Aide primitives) and Astryx's `--color-accent*` (literal
 * Astryx components), via a `[data-astryx-theme]` block so it reaches the
 * `<Theme>` wrapper in `(workspace)/layout.tsx`.
 *
 * Rollback: set `AIDE_CHROME_THEME=aide` to disable the bridge and restore the
 * original Aide look with no code change. Default is `astryx`.
 *
 * Dimensional tokens (`--aui-space-*`, `--aui-type-*-size/leading/weight`,
 * `--aui-component-*`, motion, blur, gradient) are intentionally left alone this
 * cycle to avoid layout regressions; literal `@astryxdesign/core` component swaps
 * are a separate later track.
 */

const RAW = (process.env.AIDE_CHROME_THEME ?? 'astryx').trim().toLowerCase()
export const AIDE_CHROME_THEME: 'astryx' | 'aide' = RAW === 'aide' ? 'aide' : 'astryx'
export const AIDE_CHROME_THEME_ACTIVE = AIDE_CHROME_THEME === 'astryx'

/**
 * Astryx `theme-neutral` v0.5.2 semantic values, light mode, resolved from
 * `node_modules/@astryxdesign/theme-neutral/dist/theme.css`. Hardcoded (rather
 * than importing that stylesheet) so the bridge adds no new global CSS layer or
 * `light-dark()` dependency and stays a single reversible `<style>` block.
 */
const ASTRYX = {
  surface: '#ffffff',
  // Gmail/Google-Cloud-style ground: a faint blue-grey so the white content card
  // reads as a floating panel. (theme-neutral's own body is #f1f1f1.)
  body: '#f5f6fc',
  card: '#ffffff',
  muted: '#f1f1f1',
  gray: '#e5e5e5',
  faint: '#f7f7f7',
  textPrimary: '#171717',
  textSecondary: '#525252',
  textAccent: '#262626',
  iconSecondary: '#737373',
  textDisabled: '#a3a3a3',
  border: 'rgba(0, 0, 0, 0.08)',
  borderStrong: '#d4d4d4',
  overlay: 'rgba(0, 0, 0, 0.5)',
  radiusInner: '0.375rem',
  radiusElement: '0.625rem',
  radiusContainer: '0.75rem',
  radiusPage: '1rem',
  shadowLow: '0 2px 4px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.1)',
  shadowMed: '0 2px 4px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.1)',
  shadowHigh: '0 4px 6px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0, 0, 0, 0.15)',
  green: '#0c5700',
  greenSoft: '#c5e5c0',
  greenBorder: '#b2d1ac',
  red: '#89001a',
  redSoft: '#facecb',
  redBorder: '#e6bab8',
  orange: '#6e3500',
  orangeSoft: '#fad0b5',
  orangeBorder: '#e6bda2',
  // Blue accent — Astryx core's own `--color-accent` before theme-neutral greys it out.
  accent: '#0064e0',
  accentStrong: '#0052bd',
  accentHeavy: '#00429b',
  accentSoft: '#e7f0fd',
  accentTint: 'rgba(0, 100, 224, 0.10)',
  accentMuted: '#78beff',
  accentDisabled: '#a9cbf3',
  blue: '#00458c',
} as const

/** `--aui-*` custom property → Astryx-derived value. Keys absent here keep their aide.md value. */
const OVERRIDES: Record<string, string> = {
  // Surfaces
  'canvas': ASTRYX.surface,
  'page': ASTRYX.body,
  'surface': ASTRYX.surface,
  'surface-raised': ASTRYX.card,
  'surface-muted': ASTRYX.muted,
  'surface-sunken': ASTRYX.muted,
  // Text
  'text': ASTRYX.textPrimary,
  'text-strong': ASTRYX.textPrimary,
  'text-neutral': ASTRYX.textSecondary,
  'text-muted': ASTRYX.textSecondary,
  'text-assistive': ASTRYX.iconSecondary,
  'text-disabled': ASTRYX.textDisabled,
  'on-primary': ASTRYX.surface,
  // Borders / fills
  'border': ASTRYX.borderStrong,
  'border-subtle': ASTRYX.border,
  'fill': ASTRYX.muted,
  'fill-strong': ASTRYX.gray,
  'fill-subtle': ASTRYX.faint,
  // Primary action — blue accent (Astryx core's --color-accent)
  'primary': ASTRYX.accent,
  'primary-strong': ASTRYX.accentStrong,
  'primary-pressed': ASTRYX.accentHeavy,
  'primary-heavy': ASTRYX.accentHeavy,
  'primary-soft': ASTRYX.accentSoft,
  'primary-tint': ASTRYX.accentTint,
  'primary-muted': ASTRYX.accentMuted,
  'primary-disabled': ASTRYX.accentDisabled,
  'primary-outline': ASTRYX.accentMuted,
  // Inverse
  'inverse-surface': ASTRYX.textAccent,
  'inverse-surface-raised': '#404040',
  // Status
  'positive': ASTRYX.green,
  'negative': ASTRYX.red,
  'negative-soft': ASTRYX.redSoft,
  'negative-border': ASTRYX.redBorder,
  'caution': ASTRYX.orange,
  'caution-soft': ASTRYX.orangeSoft,
  'caution-border': ASTRYX.orangeBorder,
  'caution-text': ASTRYX.orange,
  'info': ASTRYX.blue,
  // Scrims
  'scrim': ASTRYX.overlay,
  // Radius
  'radius-sm': ASTRYX.radiusInner,
  'radius-control': ASTRYX.radiusElement,
  'radius-card': ASTRYX.radiusContainer,
  'radius-overlay': ASTRYX.radiusPage,
  // Shadow (full box-shadow tokens only; colour-scalar shadow tokens left alone)
  'shadow-resting': ASTRYX.shadowLow,
  'shadow-subtle': ASTRYX.shadowLow,
  'shadow-raised': ASTRYX.shadowMed,
  'shadow-card': ASTRYX.shadowMed,
  'shadow-floating': ASTRYX.shadowHigh,
  'shadow-modal': ASTRYX.shadowHigh,
  'shadow-elevated': ASTRYX.shadowHigh,
}

/** Figtree (Astryx brand face, `@font-face` already declared in globals.css) ahead of the Korean stack. */
const FIGTREE_STACK =
  '"Figtree", "Pretendard Variable", "Pretendard JP Variable", Pretendard, "Pretendard JP", ' +
  '-apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", ' +
  '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", ' +
  '"Segoe UI Emoji", "Segoe UI Symbol", sans-serif'

const decls = Object.entries(OVERRIDES)
  .map(([key, value]) => `--aui-${key}:${value};`)
  .join('')

/**
 * Override block for `layout.tsx`. Empty string when the bridge is off, so the
 * caller can skip rendering the `<style>` entirely.
 *
 * Astryx's own `--color-accent*` used to be patched back to blue here, because
 * `theme-neutral` greys it out. That is now the Aide theme's job
 * (`src/theme/aide-theme.ts` pins the accent, `layout.tsx` scopes the page to
 * `data-astryx-theme="aide"`), so this block only re-points `--aui-*` — the
 * custom properties Aide's own primitives read.
 */
export const CHROME_THEME_CSS = AIDE_CHROME_THEME_ACTIVE
  ? `:root{color-scheme:light;--font-pretendard:${FIGTREE_STACK};${decls}}`
  : ''
