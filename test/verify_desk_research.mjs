import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const routePath = new URL('../src/app/api/desk-research/route.ts', import.meta.url)
assert.ok(existsSync(routePath), 'desk-research route가 없음')
const route = readFileSync(routePath, 'utf8')
const gemini = readFileSync(new URL('../src/lib/gemini.ts', import.meta.url), 'utf8')
const studio = readFileSync(new URL('../src/components/StudioView.tsx', import.meta.url), 'utf8')

// route: LLM 지목 → SSRF 필터 → 자체 puppeteer 캡처 → 실패해도 절대 throw 안 함
assert.match(route, /generatePro\(prompt, apiKey, GEMINI_ECONOMY_MODEL\)/)  // 지목은 economy 모델
assert.match(route, /isSafeUrl\(r\.url\)/)                                   // SSRF 가드
assert.match(route, /puppeteer/)                                            // 자체 캡처 (외부 API 아님)
assert.match(route, /return NextResponse\.json\(\{ references: \[\] \}\)/)   // 빈 결과 폴백
assert.match(route, /Promise\.allSettled\(/)                                 // 일부 실패 허용

// gemini.ts: 파라미터 + 프롬프트 섹션 + 멀티모달 이미지에 포함
assert.match(gemini, /deskResearchRefs\?: Array<\{ url: string; rationale: string; screenshotBase64: string \}>/)
assert.match(gemini, /iaText, deskResearchRefs \} = params/)
assert.match(gemini, /데스크 리서치 레퍼런스 — 정보구조·완성도 참고 \(스타일 복사 금지\)/)
assert.match(gemini, /\.\.\.validDeskRefs\.map\(r => \(\{ data: r\.screenshotBase64, mimeType: 'image\/png' \}\)\)/)
assert.match(gemini, /fullPrompt = prompt \+ referenceSection \+ iaSection \+ deskResearchSection/)

// StudioView: 생성 전에 1회 호출하고 세 시안 body에 실어보낸다
assert.match(studio, /fetch\('\/api\/desk-research'/)
assert.match(studio, /detectLandingIntent\(brief, platform === 'web' \? 'web' : 'mobile'\)/)
assert.match(studio, /\n\s*deskResearchRefs,\n/)

console.log('desk research pipeline verified')
