import type { CSSProperties } from 'react'

export const AIDE_DENSITIES = ['compact', 'default', 'comfortable', 'gigantic'] as const
export type AideDensity = (typeof AIDE_DENSITIES)[number]

type DensityPreset = {
  label: string
  description: string
  astryxSize: 'sm' | 'md' | 'lg'
  navItemSize: 'sm' | 'md' | 'lg'
  navIconSize: number
  variables: CSSProperties
}

const densityVariables = (values: Record<string, string>): CSSProperties => values as CSSProperties

/**
 * Aide-wide density presets.
 *
 * Primitive sizing values live here. Semantic variables (`--aui-density-*`) are
 * consumed by the workspace shell, while Astryx primitives let direct Astryx
 * components follow the same scale. Component code should use size props only
 * for local exceptions; its default comes from `AideDensityProvider`.
 */
export const AIDE_DENSITY_PRESETS: Record<AideDensity, DensityPreset> = {
  compact: {
    label: 'Compact',
    description: '정보를 많이 보는 밀도',
    astryxSize: 'sm',
    navItemSize: 'sm',
    navIconSize: 18,
    variables: densityVariables({
      '--aui-density-lnb-width': '224px',
      '--aui-density-logo-size': '36px',
      '--aui-density-nav-icon-size': '18px',
      '--size-element-sm': '26px', '--size-element-md': '30px', '--size-element-lg': '34px',
      '--font-size-sm': '0.6875rem', '--font-size-base': '0.8125rem', '--font-size-lg': '1rem',
      '--spacing-1': '3px', '--spacing-2': '6px', '--spacing-3': '10px', '--spacing-4': '12px', '--spacing-5': '16px', '--spacing-6': '20px', '--spacing-7': '24px', '--spacing-8': '28px', '--spacing-9': '32px', '--spacing-10': '36px', '--spacing-11': '40px', '--spacing-12': '44px',
    }),
  },
  default: {
    label: 'Default',
    description: '균형 잡힌 기본 밀도',
    astryxSize: 'md',
    navItemSize: 'md',
    navIconSize: 20,
    variables: densityVariables({
      '--aui-density-lnb-width': '248px',
      '--aui-density-logo-size': '42px',
      '--aui-density-nav-icon-size': '20px',
      '--size-element-sm': '28px', '--size-element-md': '32px', '--size-element-lg': '36px',
      '--font-size-sm': '0.75rem', '--font-size-base': '0.875rem', '--font-size-lg': '1.0625rem',
      '--spacing-1': '4px', '--spacing-2': '8px', '--spacing-3': '12px', '--spacing-4': '16px', '--spacing-5': '20px', '--spacing-6': '24px', '--spacing-7': '28px', '--spacing-8': '32px', '--spacing-9': '36px', '--spacing-10': '40px', '--spacing-11': '44px', '--spacing-12': '48px',
    }),
  },
  comfortable: {
    label: 'Comfortable',
    description: '여유 있는 작업 밀도',
    astryxSize: 'lg',
    navItemSize: 'lg',
    navIconSize: 22,
    variables: densityVariables({
      '--aui-density-lnb-width': '272px',
      '--aui-density-logo-size': '48px',
      '--aui-density-nav-icon-size': '22px',
      '--size-element-sm': '30px', '--size-element-md': '36px', '--size-element-lg': '42px',
      '--font-size-sm': '0.8125rem', '--font-size-base': '0.9375rem', '--font-size-lg': '1.125rem',
      '--spacing-1': '4px', '--spacing-2': '8px', '--spacing-3': '14px', '--spacing-4': '18px', '--spacing-5': '24px', '--spacing-6': '28px', '--spacing-7': '32px', '--spacing-8': '36px', '--spacing-9': '40px', '--spacing-10': '44px', '--spacing-11': '48px', '--spacing-12': '56px',
    }),
  },
  gigantic: {
    label: 'Gigantic',
    description: '크고 편안한 가독성 중심',
    astryxSize: 'lg',
    navItemSize: 'lg',
    navIconSize: 24,
    variables: densityVariables({
      '--aui-density-lnb-width': '312px',
      '--aui-density-logo-size': '56px',
      '--aui-density-nav-icon-size': '24px',
      '--size-element-sm': '34px', '--size-element-md': '42px', '--size-element-lg': '50px',
      '--font-size-sm': '0.875rem', '--font-size-base': '1.0625rem', '--font-size-lg': '1.25rem',
      '--spacing-1': '5px', '--spacing-2': '10px', '--spacing-3': '16px', '--spacing-4': '22px', '--spacing-5': '28px', '--spacing-6': '34px', '--spacing-7': '40px', '--spacing-8': '46px', '--spacing-9': '52px', '--spacing-10': '58px', '--spacing-11': '64px', '--spacing-12': '72px',
    }),
  },
}

export const DEFAULT_AIDE_DENSITY: AideDensity = 'comfortable'
export const AIDE_DENSITY_STORAGE_KEY = 'aide-ui-density'
