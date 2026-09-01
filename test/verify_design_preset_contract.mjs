import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

// design-presets.ts의 Aide preset은 손으로 유지하지 않고 aide.md 계약에서 파생해야 한다.
// (실측: color가 #0066ff로 하드코딩돼 있었으나 계약의 color.primary는 #1a75ff)
const presets = readFileSync(new URL('../src/lib/design-presets.ts', import.meta.url), 'utf8')

assert.match(presets, /import \{ AUI_TOKEN_GROUPS \} from '\.\/aide-product-tokens'/)
assert.match(presets, /function buildAideRichMeta\(\)/)
assert.match(presets, /aide: buildAideRichMeta\(\),/)
// 하드코딩 팔레트/색이 남아 있으면 안 된다. (aide RICH_META, none preset 둘 다)
assert.doesNotMatch(presets, /aide:\s*\{[\s\S]*?color:\s*'#0066ff'/)
assert.doesNotMatch(presets, /\{ name: 'Primary', hex: '#0066ff' \}/)
assert.doesNotMatch(presets, /none:\s*\{[\s\S]*?color:\s*'#[0-9a-fA-F]{3,8}'/)
assert.match(presets, /none:\s*\{[\s\S]*?color:\s*RICH_META\.aide\.color/)

// 계약 실값 sanity: primary는 #1a75ff, radius 이름은 sm/control/card/overlay/pill.
const md = readFileSync(new URL('../src/lib/design-systems/aide.md', import.meta.url), 'utf8')
const contract = parse(md.match(/```yaml\n([\s\S]*?)\n```/)[1]).contract
assert.equal(contract.tokens.color.primary.$value, '#1a75ff')
assert.deepEqual(
  Object.keys(contract.tokens.radius).filter(k => !k.startsWith('$')),
  ['sm', 'control', 'card', 'overlay', 'pill'],
)

// Studio 카드: 기본 Aide 시스템일 때는 실제 @/components/ui 인스턴스를 렌더한다.
const studio = readFileSync(new URL('../src/components/StudioView.tsx', import.meta.url), 'utf8')
assert.match(studio, /useRealComponents\s*=\s*[!&|]+customDesignMd\s*&&\s*designPreset/)
assert.match(studio, /import \{ Chip \} from '@\/components\/ui\/chip'/)
assert.match(studio, /import \{ Checkbox, Switch \} from '@\/components\/ui\/selection-control'/)
assert.match(studio, /useRealComponents \? \(/)
// Ensures Button component with destructive variant is rendered (allows text content to change)
assert.match(studio, /<Button[^>]*variant=["']destructive["']/)
// Ensures Chip component with selected state is rendered (allows text content to change)
assert.match(studio, /<Chip[^>]*selected/)

console.log('design preset derives from aide.md contract + card renders real components verified')
