import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const gemini = readFileSync(new URL('../src/lib/gemini.ts', import.meta.url), 'utf8')
const studio = readFileSync(new URL('../src/components/StudioView.tsx', import.meta.url), 'utf8')
const screenIr = readFileSync(new URL('../src/lib/ui-screen-ir.ts', import.meta.url), 'utf8')

assert.match(gemini, /"shellContract": \{/)
assert.match(gemini, /bottomNavigation\.present가 false이면/)
assert.match(gemini, /brandLogo\.present가 false이면/)
assert.equal((studio.match(/logoDataUrl === DEFAULT_AIDE_LOGO_SRC \? undefined : logoDataUrl/g) ?? []).length >= 2, true)
assert.match(studio, /shellContract: readStoredAsIsAnalysis\(\)\?\.shellContract/)
assert.match(screenIr, /shellContract\.bottomNavigation\.present가 false면 bottom-nav를 만들지 않는다/)

console.log('as-is shell presence and absence contract verified')
