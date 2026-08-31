import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// design-intelligence.ts 는 layout-archetypes 를 런타임 import 하므로(확장자 없음) 소스 텍스트로 검증한다.
const src = readFileSync(new URL('../src/lib/design-intelligence.ts', import.meta.url), 'utf8')

const telcoLine = src.split('\n').find(l => l.includes("return 'telco-plan-recommendation'"))
assert.ok(telcoLine, 'telco 분기를 찾을 수 없음')

// "모바일" "데이터" 는 거의 모든 앱 브리프에 등장 → telco 신호로 쓰면 오분류(백화점 VIP → telco).
assert.doesNotMatch(telcoLine, /모바일/, 'telco 정규식에 범용어 "모바일"이 남아 있음')
assert.doesNotMatch(telcoLine, /데이터/, 'telco 정규식에 범용어 "데이터"가 남아 있음')

// 통신 특화 단어는 유지되어 진짜 통신 브리프는 계속 잡혀야 한다.
assert.match(telcoLine, /요금제/)
assert.match(telcoLine, /위약금|번호이동|유심|알뜰폰/)

// 등급·혜택·멤버십 브리프를 받는 membership-reward 분기가 telco 뒤에 존재한다.
assert.match(src, /멤버십\|등급\|리워드[\s\S]*?return 'membership-reward'/)

console.log('service subtype classification verified (모바일/데이터 ≠ telco)')
