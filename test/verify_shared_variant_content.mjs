import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const intelligence = readFileSync(new URL('../src/lib/design-intelligence.ts', import.meta.url), 'utf8')
const gemini = readFileSync(new URL('../src/lib/gemini.ts', import.meta.url), 'utf8')
const studio = readFileSync(new URL('../src/components/StudioView.tsx', import.meta.url), 'utf8')

assert.match(intelligence, /const sharedMustShow = \[/)
assert.equal((intelligence.match(/mustShow: sharedMustShow/g) ?? []).length, 3)
assert.match(gemini, /contentInventory 전체가 A\/B\/C 공통 콘텐츠 계약/)
assert.match(gemini, /콘텐츠 집합은 같아야 합니다/)
assert.match(gemini, /시안별로 별도 팔레트나 임의 hex를 만들면 실패/)
assert.match(studio, /Token Reference/)
assert.match(studio, /Preview only/)
assert.match(studio, /gridTemplateColumns: '175px 140px 1fr 1fr', gap: 1/)
assert.equal((studio.match(/flexDirection: 'column', gap: 1/g) ?? []).length >= 4, true)

console.log('shared variant content and token preview contract verified')
