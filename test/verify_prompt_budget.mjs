import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Prompt budget regression guard for the A/B/C generation path.
//
// SOURCE-TEXT check: measures the byte span of each prompt-building block in
// gemini.ts and fails if a block grows past its ceiling. The generation path
// sends ~3 near-identical ~48K-token prompts per run, so unreviewed prompt
// growth is a real cost/quality regression.
//
// The 2026-08-27 slimming pass ratchets these ceilings DOWN step by step, and
// adds one dedup invariant per step at the bottom. Never raise a ceiling
// without a written reason in the commit message.

const src = readFileSync(new URL('../src/lib/gemini.ts', import.meta.url), 'utf8')

/** Char span of `function NAME(...) { ... }` (handles multi-line signatures). */
function functionSpan(name) {
  const decl = new RegExp(`\\n(?:export )?function ${name}\\b`).exec(src)
  assert.ok(decl, `function ${name} not found in gemini.ts`)
  const open = src.indexOf('{', src.indexOf('(', decl.index))
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) return src.slice(decl.index, i + 1)
  }
  throw new Error(`unbalanced braces scanning ${name}`)
}

// name -> current ceiling. Baseline captured 2026-08-27 before slimming;
// ratcheted down as each slimming step lands. Never raise without a written
// reason in the commit message.
const CEILINGS = {
  buildQualityRules: 17450, // step A: injected CSS out; step B: 3D role taxonomy -> hero layer; step E: checklists out
  buildArtDirectionLayer: 2050,
  buildMediaLayoutSafetyLayer: 4100,
  buildBrandAndChromeLayer: 3250,
  buildHeroVisualIntegrationLayer: 5400,
  buildComponentReferenceSnippets: 17000,
  extractDesignMdForPrompt: 2450,
}

let total = 0
const report = []
for (const [name, ceiling] of Object.entries(CEILINGS)) {
  const size = functionSpan(name).length
  total += size
  report.push(`  ${name.padEnd(34)} ${String(size).padStart(6)} / ${ceiling}`)
  assert.ok(size <= ceiling, `${name} is ${size} chars, over ceiling ${ceiling}.`)
}

// --- Dedup / contradiction invariants (added as each slimming step lands) ---
const qualityRules = functionSpan('buildQualityRules')
const fullSrc = src

// Step A: CSS that Aide injects deterministically must not be re-authored in the
// prompt for the model to copy.
assert.ok(
  !/\.btn-primary:hover\s*\{\s*opacity/.test(qualityRules),
  'buildQualityRules re-authors interactive-state CSS — injectBaseTransitions owns it',
)
assert.ok(
  !/:root\s*\{\s*\n\s*--aide-page-padding:/.test(fullSrc),
  'prompt re-authors the :root rhythm block — buildAideContractStyle injects it',
)
assert.ok(
  !/position:\s*fixed;\s*bottom:\s*0;\s*left:\s*0;\s*right:\s*0;\s*z-index:\s*100/.test(qualityRules),
  'buildQualityRules re-authors fixed-tabbar CSS — injectLayoutEssentialsGuard owns it',
)

// Step D: no skeleton-loading mandate on the A/B/C comparison mock (contradicts
// invariant #6 "no fake UI" and the "skeleton block = 실패" rule).
assert.ok(
  !/반드시 \*\*스켈레톤 로딩\*\*/.test(qualityRules),
  'buildQualityRules still mandates skeleton loading — contradicts the "skeleton = 실패" rule',
)
assert.ok(
  !/skeleton-card|@keyframes shimmer/.test(qualityRules),
  'buildQualityRules embeds a skeleton example — remove it from the comparison-mock prompt',
)

// Step A: the "8의 배수" spacing authority conflicts with the token/rhythm-var
// authority; there must be exactly one.
assert.ok(
  !/8의 배수/.test(qualityRules),
  'buildQualityRules still has the "8px grid" spacing authority — conflicts with the token/--aide-* authority',
)

// Step B: the 3D role taxonomy + size ratios are DEFINED once, in the hero
// layer. buildQualityRules may point to it but must not restate the 4 roles
// with their width/height ratios.
assert.ok(
  /Banner Character:[\s\S]{0,200}배너 너비 40~60%/.test(functionSpan('buildHeroVisualIntegrationLayer')),
  '3D role taxonomy + ratios should be defined in buildHeroVisualIntegrationLayer',
)
assert.ok(
  !/Banner Character —[\s\S]{0,200}배너 너비의 40~60%/.test(qualityRules),
  'buildQualityRules restates the 3D role taxonomy with ratios — point to the hero layer instead',
)

// Step E: the restatement-only checklists are gone.
assert.ok(
  !/체크리스트 — 코드 작성 전 반드시 확인/.test(src),
  'the "코드 작성 전 반드시 확인" checklist is back — it only restates rules stated above it',
)
assert.ok(
  !/시각 계층 체크리스트/.test(qualityRules),
  'buildQualityRules "시각 계층 체크리스트" is back — restatement only',
)

console.log('Prompt budget OK. Measured builder span total:', total, 'chars')
console.log(report.join('\n'))
