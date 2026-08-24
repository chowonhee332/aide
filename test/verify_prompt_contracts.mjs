import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const gemini = readFileSync(new URL('../src/lib/gemini.ts', import.meta.url), 'utf8')
const generateRoute = readFileSync(new URL('../src/app/api/generate/route.ts', import.meta.url), 'utf8')
const combined = `${gemini}\n${generateRoute}`

const forbiddenLayoutLocks = [
  'kpis 중 최소 3개, quickActions 중 최소 4개, listItems 중 최소 2개',
  'hero 아래 또는 hero 내부의 KPI strip/action grid/card preview',
  '히어로/요약, KPI 또는 현재 상태, primary CTA 포함 행동 영역, 퀵 액션, 목록/카드, 최근 활동/혜택/인사이트 중 최소 6개',
  '시안 B가 visual/hero 중심이어도 hero 높이는 첫 viewport의 38% 이하',
  '시안 B: 전환/히어로형. 큰 히어로는 허용하지만 hero 높이는 첫 viewport의 34%를 넘기지 말고',
  'A/B/C는 같은 shared 실사 image placeholder를 사용하세요',
  '세 시안 모두 같은 실사 카드 구조',
]

for (const phrase of forbiddenLayoutLocks) {
  assert.equal(
    combined.includes(phrase),
    false,
    `Prompt still hard-locks layout/content recipe: ${phrase}`,
  )
}

const requiredJudgmentContracts = [
  '콘텐츠 단위의 종류와 순서는 서비스 목적에 맞게 선택하세요',
  '비교 서비스라면 비교표/추천/절약액',
  '멤버십/통신 요금제 서비스라면 요금제 비교, 예상 절약액, 위약금/약정 상태, 추천 요금제, 멤버십 혜택, 전환 CTA',
  'A/B/C는 같은 덩어리 세트를 반복하지 말고, 서비스 목적에 맞는 서로 다른 화면 패턴을 선택하세요',
  '각 시안은 현재보다 한 단계 더 풍부한 정보량을 목표로 하세요',
  '첫 화면만 보고도 주요 판단 근거 4~6개를 확인할 수 있어야 합니다',
  '히어로 섹션에서 Unsplash 실사 이미지를 쓰는 기본 시안은 C안입니다',
  'A/B안의 하위 콘텐츠 카드, 리스트, 혜택, 제휴처, 상품/장소 썸네일에는 서비스 분석 결과에 따라 %%THUMB:keyword:width:height%% 또는 %%IMG_n:keyword%%를 사용할 수 있습니다',
  'C안이라고 해서 모든 이미지 영역을 실사로 채우지 마세요',
  'C안은 가능한 경우 Bold Editorial Hero를 백단 기본 패턴으로 우선 고려하세요',
  '사용자가 프롬프트에 과감한 히어로를 명시하지 않아도 Aide가 서비스 성격을 판단해 자동 적용합니다',
  '큰 실사/scene hero card',
  // 60eb144에서 Bold Editorial Hero 문단이 재작성되며 표현이 바뀌었다.
  // 요구(이미지 위 텍스트 가독성 확보)는 히어로 안전 영역 규칙으로 유지된다.
  'readable scrim',
  'B2B/관리자/업무형 서비스라면 Bold Editorial Hero를 과하게 쓰지 말고 신뢰형 visual panel로 톤다운하세요',
]

for (const phrase of requiredJudgmentContracts) {
  assert.equal(
    combined.includes(phrase),
    true,
    `Prompt is missing service-judgment contract: ${phrase}`,
  )
}

const requiredDesignIntelligenceContracts = [
  'serviceSubtype',
  'selectedPatterns',
  'avoidPatterns',
  'variantBriefs',
  'dataPointTarget',
  'heroPolicy',
  'contentMediaPolicy',
  'pizza-order-membership',
  'telco-plan-recommendation',
  'bold-editorial-hero',
  'mascot-companion',
  'comparison-calculator',
]

for (const phrase of requiredDesignIntelligenceContracts) {
  assert.equal(
    combined.includes(phrase),
    true,
    `Design Intelligence contract is missing: ${phrase}`,
  )
}

const requiredLogoContracts = [
  'height:22px;max-height:22px;max-width:88px;',
  'height: 22px !important;',
  'max-width: 88px !important;',
]

for (const phrase of requiredLogoContracts) {
  assert.equal(
    gemini.includes(phrase),
    true,
    `Logo sizing contract is missing: ${phrase}`,
  )
}

const requiredCreonContracts = [
  "const files = ['reference_1.png', 'reference_2.png', 'reference_3.png']",
  'CRITICAL COMPOSITION: The main subject',
  'CRITICAL BOTTOM ZONE: The lower 35% of the image must transition naturally to darker tones',
  'B안 HERO_3D는 작은 floating sticker가 아니라 히어로 카드의 명확한 visual zone입니다',
  'This image IS the full-bleed background of a mobile card',
]

for (const phrase of requiredCreonContracts) {
  assert.equal(
    gemini.includes(phrase),
    true,
    `Creon 3D generation/placement contract is missing: ${phrase}`,
  )
}

const requiredRhythmAndDensityContracts = [
  'Layout Rhythm Guard — 콘텐츠 종류는 자유롭게, 간격 리듬은 고정',
  'section gap: 반드시 var(--aide-section-gap) 사용',
  'card padding: 반드시 var(--aide-card-padding) 사용',
  '시안 하나의 첫 화면에는 실제 데이터 포인트 10~16개가 보여야 합니다',
  '데이터 포인트란 가격, 시간, 수량, 등급, 상태, 할인율, 적립 수, 쿠폰 수, 거리, 예상 결과, 비교 기준, 배지, 날짜 같은 판단 재료입니다',
  'A/B/C 모두 첫 화면 하단에 다음 섹션의 제목 또는 카드 일부가 보여야 합니다',
]

for (const phrase of requiredRhythmAndDensityContracts) {
  assert.equal(
    combined.includes(phrase),
    true,
    `Rhythm/density contract is missing: ${phrase}`,
  )
}

const requiredScene3DContracts = [
  'modern glossy 3D scene',
  'no low-poly',
  'no old game render',
  'no generic 3D stock render',
  'Creon-adjacent quality but not a single-object icon',
]

for (const phrase of requiredScene3DContracts) {
  assert.equal(
    gemini.includes(phrase),
    true,
    `Scene 3D quality contract is missing: ${phrase}`,
  )
}

console.log('Prompt contracts look service-driven instead of layout-locked.')
