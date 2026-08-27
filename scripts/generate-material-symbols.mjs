import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * VALID_MATERIAL_SYMBOLS를 node_modules/@material-symbols/font-400의 공식 아이콘
 * 목록으로부터 재생성한다. 이 패키지의 index.d.ts가 Material Symbols의 정본 이름
 * 목록이며, public/material-symbols-rounded.woff2가 실제로 지원하는 글리프와
 * 일치한다(같은 아이콘 세트의 다른 weight 빌드일 뿐).
 *
 * 실행: node scripts/generate-material-symbols.mjs
 */

const ROOT = process.cwd()
const SOURCE_DTS = path.join(ROOT, 'node_modules/@material-symbols/font-400/index.d.ts')
const TARGET_TS = path.join(ROOT, 'src/lib/material-symbols.ts')

// @material-symbols/font-400의 index.d.ts는 "현재 공식 이름" 목록이라 일부 레거시
// 별칭 글리프(예: expand_less/expand_more, done, monetization_on)를 빠뜨린다.
// 그런데 그 별칭들은 public/material-symbols-rounded.woff2 안에 실제 글리프로
// 남아 있고, 예전 수작업 화이트리스트가 의존하던 이름이기도 하다. fontTools로
// 실제 폰트 글리프와 대조해 확인한 뒤 여기 고정한다 — 임의로 늘리지 말 것.
const FONT_ONLY_EXTRA_ICONS = [
  'expand_less', 'expand_more', 'done', 'insights', 'sleep', 'monetization_on',
  'restaurant_menu', 'feed', 'place', 'location_on', 'workspace_premium', 'auto_awesome',
  'tips_and_updates', 'magic_button', 'smart_button', 'settings_suggest', 'push_pin',
  'note', 'screenshot', 'work_off', 'hourglass_full', 'insights',
]

function extractIconNames(dtsSource) {
  const match = dtsSource.match(/type MaterialSymbols = \[([\s\S]*?)\];/)
  if (!match) throw new Error('MaterialSymbols 배열을 index.d.ts에서 찾지 못했습니다.')
  const names = [...match[1].matchAll(/"([a-z0-9_]+)"/g)].map(m => m[1])
  if (names.length < 1000) throw new Error(`아이콘 개수가 비정상적으로 적습니다: ${names.length}개`)
  return [...new Set([...names, ...FONT_ONLY_EXTRA_ICONS])]
}

function formatSet(names) {
  const perLine = 6
  const lines = []
  for (let i = 0; i < names.length; i += perLine) {
    lines.push('  ' + names.slice(i, i + perLine).map(n => `'${n}'`).join(', ') + ',')
  }
  return lines.join('\n')
}

const dtsSource = fs.readFileSync(SOURCE_DTS, 'utf8')
const iconNames = extractIconNames(dtsSource).sort()
const targetSource = fs.readFileSync(TARGET_TS, 'utf8')

const setPattern = /export const VALID_MATERIAL_SYMBOLS = new Set\(\[[\s\S]*?\n\]\)/
if (!setPattern.test(targetSource)) {
  throw new Error('material-symbols.ts에서 VALID_MATERIAL_SYMBOLS 선언을 찾지 못했습니다.')
}

const replaced = targetSource.replace(
  setPattern,
  `export const VALID_MATERIAL_SYMBOLS = new Set([\n${formatSet(iconNames)}\n])`,
)

fs.writeFileSync(TARGET_TS, replaced)
console.log(`[generate-material-symbols] ${iconNames.length}개 아이콘으로 VALID_MATERIAL_SYMBOLS 갱신 완료`)
