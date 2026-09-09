#!/usr/bin/env node
/**
 * The Aide theme must stay a *small, named* deviation from `@astryxdesign/theme-neutral`.
 *
 * `src/theme/aide-theme.ts` inherits `neutralTheme.tokens` by value and overrides a
 * short list. That inheritance is what keeps the app chrome looking the way it does:
 * Astryx *core* defaults are a different palette entirely (blue-grey #0a1317 text,
 * px radii vs neutral's pure greys and rem radii), so a theme that stopped spreading
 * neutral would silently restyle every screen.
 *
 * This test fails loudly when the built theme drifts — either because a deviation was
 * added without being declared here, or because the spread was dropped and the whole
 * palette moved at once.
 *
 * Regenerate the built output with `npm run theme:build`; `npm run theme:check` proves
 * the committed output matches the source.
 */
import assert from 'node:assert/strict'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { aideTheme } from '../src/theme/generated/aide.js'

/** Every token the Aide theme is allowed to move away from `theme-neutral`. */
const INTENDED = {
  '--color-accent': 'blue product accent (neutral is monochrome #262626)',
  '--color-text-accent': 'follows --color-accent',
  '--color-icon-accent': 'follows --color-accent',
  '--color-background-body': 'Gmail-style blue-grey ground #f5f6fc',
  '--radius-page': '16px workspace cards (neutral ships 28px)',
  '--font-family-body': 'Figtree + Korean fallback stack',
  '--font-family-heading': 'Figtree + Korean fallback stack',
}

/** Compare the light-mode value; tuples and `light-dark()` both resolve to their first slot. */
const lightValue = (v) => {
  if (Array.isArray(v)) return String(v[0]).trim().toLowerCase()
  const s = String(v)
  const m = /light-dark\(\s*([^,]+),/.exec(s)
  return (m ? m[1] : s).trim().toLowerCase()
}

const aide = aideTheme.tokens
const neutral = neutralTheme.tokens

const deviations = []
for (const key of new Set([...Object.keys(neutral), ...Object.keys(aide)])) {
  const a = key in aide ? lightValue(aide[key]) : '(absent)'
  const n = key in neutral ? lightValue(neutral[key]) : '(absent)'
  if (a !== n) deviations.push(key)
}

const unexpected = deviations.filter((k) => !(k in INTENDED))
assert.deepEqual(
  unexpected,
  [],
  `Aide theme drifted from theme-neutral on undeclared tokens: ${unexpected.join(', ')}. ` +
    `Add them to INTENDED here if the change is deliberate.`,
)

const missing = Object.keys(INTENDED).filter((k) => !deviations.includes(k))
assert.deepEqual(
  missing,
  [],
  `Declared deviations that no longer differ from theme-neutral: ${missing.join(', ')}. ` +
    `Drop them from INTENDED, or restore the override in src/theme/aide-theme.ts.`,
)

// The spread itself: if it were removed, only the handful of explicit overrides would
// survive and this count would collapse.
const inherited = Object.keys(neutral).filter(
  (k) => k in aide && lightValue(aide[k]) === lightValue(neutral[k]),
).length
assert.ok(
  inherited > 150,
  `Only ${inherited} tokens still match theme-neutral — the token spread in ` +
    `src/theme/aide-theme.ts was probably dropped, which restyles the whole app.`,
)

// The Korean stack is the one deviation a Figtree-only theme would silently lose.
assert.match(
  String(aide['--font-family-body']),
  /Pretendard/,
  '--font-family-body lost its Korean fallback; Hangul falls through to the browser default.',
)

// theme-neutral's per-component CSS is what the grey chrome look is built from.
assert.ok(
  Object.keys(aideTheme.components ?? {}).length > 0,
  'Aide theme carries no component overrides; theme-neutral.components was not inherited.',
)

console.log(
  `✓ aide theme = theme-neutral + ${deviations.length} declared deviations ` +
    `(${inherited} tokens inherited, components + icons carried over)`,
)
