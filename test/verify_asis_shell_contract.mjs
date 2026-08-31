import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const gemini = readFileSync(new URL('../src/lib/gemini.ts', import.meta.url), 'utf8')
const studio = readFileSync(new URL('../src/components/StudioView.tsx', import.meta.url), 'utf8')
const screenIr = readFileSync(new URL('../src/lib/ui-screen-ir.ts', import.meta.url), 'utf8')
const archetypes = readFileSync(new URL('../src/lib/layout-archetypes.ts', import.meta.url), 'utf8')
const designIntel = readFileSync(new URL('../src/lib/design-intelligence.ts', import.meta.url), 'utf8')

assert.match(gemini, /"shellContract": \{/)
assert.match(gemini, /bottomNavigation\.present가 false이면/)
assert.match(gemini, /brandLogo\.present가 false이면/)
assert.equal((studio.match(/logoDataUrl === DEFAULT_AIDE_LOGO_SRC \? undefined : logoDataUrl/g) ?? []).length >= 2, true)
assert.match(studio, /shellContract: readStoredAsIsAnalysis\(\)\?\.shellContract/)
assert.match(screenIr, /shellContract\.bottomNavigation\.present가 false면 bottom-nav를 만들지 않는다/)

// ── 결정론 강제 (프롬프트 불릿이 아니라 코드가 셸 계약을 못박는다) ──
// A: gemini.ts가 shellContract를 후처리로 강제 (브리프 지시로 하단바 제거 override 포함)
assert.match(gemini, /function injectShellContract\(/)
assert.match(gemini, /injectShellContract\(html, effectiveShellContract\)/)
assert.match(gemini, /const briefWantsNoBottomNav =/)
assert.match(gemini, /briefWantsNoBottomNav \? \{ bottomNavigation: \{ present: false \} \}/)
// 중첩 <div>에도 잔해 안 남기는 깊이 카운팅 제거기
assert.match(gemini, /function stripElementsByClass\(/)
assert.match(gemini, /result = stripElementsByClass\(/)
// injectMissingMobileChrome가 present:false면 하단바를 새로 만들지 않는다
assert.match(gemini, /injectMissingMobileChrome\(html, variantStructure, domain, effectiveShellContract\?\.bottomNavigation\?\.present === false\)/)
assert.match(gemini, /ir\.chrome\.bottomNav && !hasBottomNav && !suppressBottomNav/)
// C: brandLogo.present === false면 로고 슬롯 프롬프트·주입을 끈다
assert.match(gemini, /const suppressBrandLogo = asIsAnalysis\?\.shellContract\?\.brandLogo\?\.present === false/)
assert.match(gemini, /const effectiveLogoDataUrl = suppressBrandLogo \? '' : logoDataUrl/)
assert.match(gemini, /\$\{effectiveLogoDataUrl \? `\\n## ⚠️ 브랜드 로고 슬롯/)
assert.doesNotMatch(gemini, /html = applyLogoDataUrlOnce\(html, logoDataUrl\)/)
// B: 아키타입 chrome이 shellContract를 아키타입 기본값보다 우선
assert.match(archetypes, /bottomNav: !isWeb && shellBottomNav !== false/)
assert.match(archetypes, /brandLogo: shellBrandLogo !== false/)
assert.match(designIntel, /shellContract: input\.shellContract/)

console.log('as-is shell presence and absence contract verified (+ deterministic enforcement)')
