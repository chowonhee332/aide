import type { CSSProperties } from 'react'
import type { ElementSize } from '@astryxdesign/core/SizeContext'
import { AUI_TOKEN_ENTRIES } from './aide-product-tokens'

export const AIDE_DENSITIES = ['compact', 'default', 'comfortable', 'gigantic'] as const
export type AideDensity = (typeof AIDE_DENSITIES)[number]

export const DEFAULT_AIDE_DENSITY: AideDensity = 'comfortable'
export const AIDE_DENSITY_STORAGE_KEY = 'aide-ui-density'

/* ────────────────────────────────────────────────────────────────────────────
 * Aide-wide density. Three layers, top to bottom:
 *   1. RAW      — the primitive numbers per step. Tune a density here.
 *   2. semantics — RAW re-grouped by intent (nav / type / spacing / control),
 *                  plus the one derived value (nav row size from Astryx bucket).
 *   3. applied  — the CSS custom properties + component props actually consumed
 *                 by AideDensityProvider and the workspace shell.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Layer 1 — raw scale. One row of primitives per density; everything else derives. */
type RawScale = {
  label: string
  description: string
  /** Astryx SizeContext bucket for interactive components. */
  astryxSize: ElementSize
  /** Left nav, in px. */
  lnbWidth: number
  /** Global top nav bar height, in px. */
  gnbHeight: number
  /** GNB action icon px. */
  gnbIconSize: number
  /** GNB profile avatar px. */
  gnbAvatarSize: number
  logoSize: number
  navIconSize: number
  /** Astryx `--font-size-{sm,base,lg}`, in rem. */
  fontSm: number
  fontBase: number
  fontLg: number
  /** Astryx `--size-element-{sm,md,lg}` control heights, in px. */
  elementSm: number
  elementMd: number
  elementLg: number
  /** Astryx `--spacing-1 … --spacing-12`, in px. Hand-tuned for optical rhythm, not a formula. */
  spacing: readonly [number, number, number, number, number, number, number, number, number, number, number, number]
  /**
   * Multiplier applied to Aide's own scalable tokens (`--aui-space-*`,
   * `--aui-type-*-size/leading`, `--aui-control-*`, `--aui-icon-*`) — the tokens
   * the bulk of Aide chrome is styled with. `1` = untouched.
   */
  scale: number
}

const RAW: Record<AideDensity, RawScale> = {
  compact: {
    label: 'Compact',
    description: '정보를 많이 보는 밀도',
    astryxSize: 'sm',
    lnbWidth: 216, gnbHeight: 56, gnbIconSize: 22, gnbAvatarSize: 24, logoSize: 36, navIconSize: 18,
    fontSm: 0.6875, fontBase: 0.8125, fontLg: 1,
    elementSm: 26, elementMd: 30, elementLg: 34,
    spacing: [3, 6, 10, 12, 16, 20, 24, 28, 32, 36, 40, 44],
    scale: 0.9,
  },
  default: {
    label: 'Default',
    description: '균형 잡힌 기본 밀도',
    astryxSize: 'md',
    lnbWidth: 224, gnbHeight: 64, gnbIconSize: 24, gnbAvatarSize: 32, logoSize: 42, navIconSize: 20,
    fontSm: 0.75, fontBase: 0.875, fontLg: 1.0625,
    elementSm: 28, elementMd: 32, elementLg: 36,
    spacing: [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48],
    scale: 1,
  },
  comfortable: {
    label: 'Comfortable',
    description: '여유 있는 작업 밀도',
    astryxSize: 'lg',
    lnbWidth: 230, gnbHeight: 64, gnbIconSize: 24, gnbAvatarSize: 32, logoSize: 48, navIconSize: 22,
    fontSm: 0.8125, fontBase: 0.9375, fontLg: 1.125,
    elementSm: 30, elementMd: 36, elementLg: 42,
    spacing: [4, 8, 14, 18, 24, 28, 32, 36, 40, 44, 48, 56],
    scale: 1.08,
  },
  gigantic: {
    label: 'Gigantic',
    description: '크고 편안한 가독성 중심',
    astryxSize: 'lg',
    lnbWidth: 312, gnbHeight: 76, gnbIconSize: 28, gnbAvatarSize: 40, logoSize: 56, navIconSize: 24,
    fontSm: 0.875, fontBase: 1.0625, fontLg: 1.25,
    elementSm: 34, elementMd: 42, elementLg: 50,
    spacing: [5, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 72],
    scale: 1.2,
  },
}

/** Layer 2 — density semantics. RAW grouped by intent; `navRowSize` is the one derived value. */
type DensitySemantics = {
  nav: { width: string; logo: string; iconSize: number; rowSize: ElementSize }
  gnb: { height: string; iconSize: number; avatarSize: number }
  type: { sm: string; base: string; lg: string }
  control: { sm: string; md: string; lg: string }
  spacing: readonly number[]
  astryxSize: ElementSize
  auiScale: number
}

function semantics(raw: RawScale): DensitySemantics {
  return {
    nav: {
      width: `${raw.lnbWidth}px`,
      logo: `${raw.logoSize}px`,
      iconSize: raw.navIconSize,
      // Astryx nav rows only have sm/md/lg; the roomier steps share 'lg'.
      rowSize: raw.astryxSize,
    },
    gnb: { height: `${raw.gnbHeight}px`, iconSize: raw.gnbIconSize, avatarSize: raw.gnbAvatarSize },
    type: { sm: `${raw.fontSm}rem`, base: `${raw.fontBase}rem`, lg: `${raw.fontLg}rem` },
    control: { sm: `${raw.elementSm}px`, md: `${raw.elementMd}px`, lg: `${raw.elementLg}px` },
    spacing: raw.spacing,
    astryxSize: raw.astryxSize,
    auiScale: raw.scale,
  }
}

/**
 * Aide tokens the density `scale` multiplies. `control-touch` / `target-touch`
 * are excluded so the 44px minimum touch target survives a Compact scale-down.
 */
const SCALABLE_AUI = /^--aui-(space-\d+|type-.+-(size|leading)|control-(compact|default|prominent)|icon-(sm|md|lg))$/

/** aide.md base values × scale, for every scalable `--aui-*` token whose value is a plain px. */
function scaledAuiTokens(scale: number): Record<string, string> {
  if (scale === 1) return {}
  const out: Record<string, string> = {}
  for (const { cssVar, value } of AUI_TOKEN_ENTRIES) {
    if (!SCALABLE_AUI.test(cssVar)) continue
    const px = value.match(/^(-?[\d.]+)px$/)
    if (!px) continue
    out[cssVar] = `${Math.round(Number(px[1]) * scale * 100) / 100}px`
  }
  return out
}

/** Layer 3 — applied. CSS custom properties for the density wrapper `style`. */
function cssVars(s: DensitySemantics): CSSProperties {
  const spacing = Object.fromEntries(s.spacing.map((px, i) => [`--spacing-${i + 1}`, `${px}px`]))
  return {
    // Aide semantic — consumed by the workspace shell.
    '--aui-density-lnb-width': s.nav.width,
    '--aui-density-gnb-height': s.gnb.height,
    '--aui-density-logo-size': s.nav.logo,
    '--aui-density-nav-icon-size': `${s.nav.iconSize}px`,
    // Astryx raw — let direct @astryxdesign/core components follow the same scale.
    '--size-element-sm': s.control.sm,
    '--size-element-md': s.control.md,
    '--size-element-lg': s.control.lg,
    '--font-size-sm': s.type.sm,
    '--font-size-base': s.type.base,
    '--font-size-lg': s.type.lg,
    ...spacing,
    // Aide's own scale — reaches the bulk of chrome, which is styled with --aui-*.
    ...scaledAuiTokens(s.auiScale),
  } as CSSProperties
}

/** What every consumer reads. Composed from the three layers above. */
export type AideDensityPreset = {
  label: string
  description: string
  /** Astryx `<SizeProvider>` value. */
  astryxSize: ElementSize
  /** `size` prop for Astryx `<SideNavItem>`. */
  navItemSize: ElementSize
  /** icon px for nav items. */
  navIconSize: number
  /** action-icon px for the GNB. */
  gnbIconSize: number
  /** profile-avatar px for the GNB. */
  gnbAvatarSize: number
  /** inline `style` for the density wrapper. */
  variables: CSSProperties
}

function buildPreset(raw: RawScale): AideDensityPreset {
  const s = semantics(raw)
  return {
    label: raw.label,
    description: raw.description,
    astryxSize: s.astryxSize,
    navItemSize: s.nav.rowSize,
    navIconSize: s.nav.iconSize,
    gnbIconSize: s.gnb.iconSize,
    gnbAvatarSize: s.gnb.avatarSize,
    variables: cssVars(s),
  }
}

export const AIDE_DENSITY_PRESETS: Record<AideDensity, AideDensityPreset> = {
  compact: buildPreset(RAW.compact),
  default: buildPreset(RAW.default),
  comfortable: buildPreset(RAW.comfortable),
  gigantic: buildPreset(RAW.gigantic),
}

/**
 * The default density as a static `:root` block, server-rendered into <head>.
 * AideDensityProvider only writes these onto <html> in an effect, so without this
 * the first paint of a hard refresh has no lnb width and no logo size — the shell
 * collapses and the logo falls back to its intrinsic 848px. The provider's inline
 * style still wins afterwards, so a stored non-default choice is unaffected.
 */
export const AIDE_DENSITY_ROOT_CSS = `:root{${Object.entries(
  AIDE_DENSITY_PRESETS[DEFAULT_AIDE_DENSITY].variables as Record<string, string | number>,
)
  .map(([key, value]) => `${key}:${value}`)
  .join(';')}}`
