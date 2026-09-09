/**
 * Aide theme — the portable definition of "our style".
 *
 * This is the authored source for `astryx theme build`, which compiles it to
 * `src/theme/generated/aide.css` (tokens + component overrides, inside
 * `@scope ([data-astryx-theme="aide"])`) and `generated/aide.js` (the built
 * theme object with `__built: true`).
 *
 * Why a theme instead of the hand-copied bridge in `src/lib/aide-chrome-theme.ts`:
 * that module pastes ~40 `theme-neutral` values into `--aui-*` and then patches
 * Astryx's own `--color-accent*` back to blue, because `theme-neutral` greys the
 * accent out. A real theme sets the accent once and Astryx derives the ramp, so
 * the two systems stop disagreeing and the result is a CSS file another project
 * can consume with no Aide code at all.
 *
 * Only deviations from `@astryxdesign/theme-neutral` v0.5.2 are listed. Anything
 * absent here is inherited, which is what makes the migration checkable: the
 * built output must reproduce today's chrome values for every key the bridge
 * currently pins.
 */

import { defineTheme } from '@astryxdesign/core/theme'
import { neutralIconRegistry, neutralTheme } from '@astryxdesign/theme-neutral'

/**
 * Figtree is the Astryx brand face (self-hosted in `public/fonts/figtree`, declared
 * in `globals.css`). The Korean stack behind it is Aide's — `theme-neutral` has no
 * Hangul-capable fallback, so a Korean glyph would drop to the browser default.
 */
const KOREAN_FALLBACKS =
  '"Pretendard Variable", "Pretendard JP Variable", Pretendard, "Pretendard JP", ' +
  '-apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", ' +
  '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", ' +
  '"Segoe UI Emoji", "Segoe UI Symbol", sans-serif'

export const aideTheme = defineTheme({
  name: 'aide',

  icons: neutralIconRegistry,

  /**
   * No `color:` block on purpose. That config derives a whole ramp from the
   * accent, which tints the neutral spine with the accent hue (#fcfcff surfaces,
   * #46464f secondary text) and contrast-adjusts the accent itself (#0064E0 →
   * #0058D2). `theme-neutral` avoids it for the same reason and pins its greys
   * as explicit `tokens` tuples; Aide's chrome is built on those greys, so the
   * accent is pinned below instead of generated.
   */

  /**
   * `theme-neutral`'s own component CSS — the grey chrome look Aide is built on.
   * Astryx core's defaults are a different palette entirely (blue-grey #0a1317
   * text, px radii), so inheriting core would silently restyle the whole app.
   */
  components: neutralTheme.components,

  tokens: {
    // Inherit `theme-neutral`'s pinned token table by value rather than copying
    // it by hand (the previous bridge copied ~40 of these into `--aui-*`).
    // Aide's deviations are the four entries below.
    ...neutralTheme.tokens,

    // Blue accent. `theme-neutral` greys this out (#262626) because it is
    // deliberately monochrome; Astryx core's own accent is this exact blue, so
    // pinning it restores the core value rather than inventing one. Owning the
    // accent means owning its label colour.
    '--color-accent': ['#0064e0', '#2694fe'],
    '--color-on-accent': '#ffffff',
    '--color-text-accent': 'var(--color-accent)',
    '--color-icon-accent': 'var(--color-accent)',

    // Gmail / Google-Cloud ground: a faint blue-grey so the white content card
    // reads as a floating panel. `theme-neutral`'s own body is a flat #f1f1f1.
    '--color-background-body': ['#f5f6fc', '#1b1b1b'],

    // The app's overlay/page radius is 16px; `theme-neutral` ships 1.75rem (28px),
    // which is too round for the workspace cards.
    '--radius-page': '1rem',

    // Set here rather than via the `typography` config: the `...neutralTheme.tokens`
    // spread above re-pins `--font-family-*`, so a `typography.body.fallbacks` value
    // would be silently overwritten and Hangul would fall through to the browser
    // default. Figtree is self-hosted (`public/fonts/figtree`, `@font-face` in
    // `globals.css`); the Korean stack behind it is Aide's.
    '--font-family-body': `Figtree, ${KOREAN_FALLBACKS}`,
    '--font-family-heading': `Figtree, ${KOREAN_FALLBACKS}`,
  },
})

export default aideTheme
