# Design Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a service-aware Design Intelligence layer so Aide analyzes the product intent, UX pattern, content inventory, visual strategy, and A/B/C variant briefs before generating UI.

**Architecture:** Extract the current inline `buildContentInventory()` and `buildGenerationContext()` heuristics from `StudioView.tsx` into a focused `src/lib/design-intelligence.ts` module. The new module will produce a richer `AideGenerationPlan` with service subtype, UX patterns, data-point requirements, visual policies, and variant briefs; `StudioView` will pass that plan into the existing `/api/generate` route without adding a slow extra model call.

**Tech Stack:** Next.js, React, TypeScript, Gemini prompt contracts, local Node verification scripts.

---

### Task 1: Add Failing Contract Tests

**Files:**
- Modify: `test/verify_prompt_contracts.mjs`

- [ ] **Step 1: Add assertions for Design Intelligence contracts**

Add these required strings to the existing `requiredJudgmentContracts` or a new `requiredDesignIntelligenceContracts` array:

```js
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
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
node test/verify_prompt_contracts.mjs
```

Expected: FAIL with `Design Intelligence contract is missing: serviceSubtype`.

---

### Task 2: Extend the Generation Plan Type

**Files:**
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Extend `AideGenerationPlan`**

Update the existing interface with these fields:

```ts
export interface AideGenerationPlan {
  designIntelligence?: {
    serviceSubtype: string;
    selectedPatterns: string[];
    avoidPatterns: string[];
    dataPointTarget: {
      mobileFirstViewport: string;
      minimum: number;
      ideal: number;
      examples: string[];
    };
    contentMediaPolicy: {
      heroPhotoVariant: 'C' | 'none';
      thumbnailImagesAllowed: Array<'A' | 'B' | 'C'>;
      notes: string[];
    };
  };
  variantBriefs?: Record<'A' | 'B' | 'C', {
    strategy: string;
    screenPattern: string;
    heroPolicy: VariantVisualPolicy;
    mustShow: string[];
    shouldAvoid: string[];
    layoutRhythm: string[];
  }>;
  productBrief: {
    serviceIntent: string;
    targetUser: string;
    primaryScenario: string;
    screenPurpose: string;
    coreObjects: string[];
    keyActions: string[];
    successCriteria: string[];
    assumptions: string[];
  };
  contentInventory?: {
    kpis: Array<{ label: string; value: string; meta: string }>;
    quickActions: string[];
    listItems: Array<{ title: string; meta: string; value: string; badge?: string }>;
    activityItems: Array<{ title: string; meta: string; value: string }>;
    sectionIdeas: string[];
    requiredAboveFoldUnits: string[];
  };
  visualStrategy: {
    mode: '3d' | 'photo' | 'data' | 'none';
    sharedAsset: boolean;
    subject: string;
    reason: string;
    usageByVariant: Record<string, string>;
  };
  variantDirector: Record<string, {
    strategy: string;
    layoutRole: string;
    firstViewport: string[];
    mustDifferBy: string[];
  }>;
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS, because the new fields are optional.

---

### Task 3: Create the Design Intelligence Module

**Files:**
- Create: `src/lib/design-intelligence.ts`
- Modify: `src/components/StudioView.tsx`

- [ ] **Step 1: Create `src/lib/design-intelligence.ts`**

Add:

```ts
import type { AideGenerationPlan, AppDomain, VariantVisualPolicy } from './gemini'

export type DesignIntelligenceInput = {
  brief: string
  domain: AppDomain
  platform: 'mobile' | 'web'
  projectSummary: string
  answers: Record<string, string | string[]>
  heroSubject?: string
  heroPrompt?: string
  needsScene3d: boolean
}

type VariantKey = 'A' | 'B' | 'C'

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text))
}

export function detectServiceSubtype(brief: string, domain: AppDomain): string {
  const text = brief.toLowerCase()
  if (includesAny(brief, [/피자|pizza|페퍼로니|주문|픽업|스탬프|피자집/])) return 'pizza-order-membership'
  if (includesAny(brief, [/요금제|통신|위약금|번호이동|휴대폰|모바일|데이터|유심|알뜰폰/])) return 'telco-plan-recommendation'
  if (includesAny(brief, [/포인트|쿠폰|멤버십|등급|리워드|적립|혜택/])) return 'membership-reward'
  if (includesAny(brief, [/식물|물주기|몬스테라|화분|성장|루틴/])) return 'plant-care-companion'
  if (includesAny(brief, [/물류|배송|트럭|화물|창고|배차|route|fleet/])) return 'b2b-logistics-dashboard'
  if (domain === 'food') return 'food-order-commerce'
  if (domain === 'commerce') return 'local-store-commerce'
  if (domain === 'business') return 'b2b-dashboard'
  return text.includes('ai') ? 'ai-productivity' : `${domain}-service`
}

export function selectReferencePatterns(serviceSubtype: string, domain: AppDomain): { selected: string[]; avoid: string[] } {
  if (serviceSubtype === 'pizza-order-membership') {
    return {
      selected: ['order-commerce', 'membership-reward', 'mascot-companion', 'bold-editorial-hero'],
      avoid: ['b2b-dashboard', 'empty-landing', 'generic-finance-dashboard'],
    }
  }
  if (serviceSubtype === 'telco-plan-recommendation') {
    return {
      selected: ['comparison-calculator', 'plan-recommendation', 'membership-benefit', 'trust-editorial-hero'],
      avoid: ['food-commerce-grid', 'empty-landing', 'mascot-only-hero'],
    }
  }
  if (serviceSubtype === 'plant-care-companion') {
    return {
      selected: ['companion-status-home', 'routine-progress', 'growth-scene-3d', 'bold-editorial-hero'],
      avoid: ['dense-finance-table', 'generic-storefront'],
    }
  }
  if (domain === 'business') {
    return {
      selected: ['dashboard-workspace', 'task-queue', 'trust-visual-panel'],
      avoid: ['bold-consumer-editorial', 'cute-mascot-first', 'bottom-tab-heavy-app'],
    }
  }
  return {
    selected: ['service-home', 'recommendation-cards', 'action-led-summary'],
    avoid: ['empty-landing', 'random-image-collage'],
  }
}

export function buildIntelligentContentInventory(
  brief: string,
  domain: AppDomain,
  serviceSubtype: string,
): NonNullable<AideGenerationPlan['contentInventory']> {
  if (serviceSubtype === 'pizza-order-membership') {
    return {
      kpis: [
        { label: '스탬프', value: '8/10', meta: '2개 더 모으면 피자 1판 무료' },
        { label: '보유 쿠폰', value: '3장', meta: '오늘 사용 가능 2장' },
        { label: '픽업 예상', value: '15분', meta: '연남본점 기준' },
        { label: '멤버십 등급', value: 'Gold', meta: '이번 달 12,400원 혜택' },
      ],
      quickActions: ['빠른 재주문', '쿠폰 적용 주문', '픽업 시간 선택', '스탬프 확인', '신메뉴 보기', '장바구니'],
      listItems: [
        { title: '치즈 폭탄 페퍼로니 L', meta: '단골 고객 1위 · 쿠폰 적용 가능', value: '18,900원', badge: '오늘의 추천' },
        { title: '하프앤하프 포테이토 L', meta: '최근 주문 메뉴 · 픽업 15분', value: '27,900원', badge: '재주문' },
        { title: '바질 마스카포네 피자 L', meta: '신메뉴 15% · 리뷰 4.8', value: '21,900원', badge: '신메뉴' },
      ],
      activityItems: [
        { title: '지난 주문 완료', meta: '11.24 금', value: '하프앤하프 L' },
        { title: '스탬프 적립', meta: '오늘 주문 시', value: '+2개' },
        { title: '장바구니', meta: '담긴 메뉴 2개', value: '36,800원' },
      ],
      sectionIdeas: ['오늘 추천 메뉴', '멤버십 요약', '빠른 재주문', '인기 메뉴 랭킹', '쿠폰/스탬프', '픽업 매장 상태'],
      requiredAboveFoldUnits: ['추천 메뉴', '가격/할인', '쿠폰/스탬프', '픽업 시간', '주문 CTA', '최근 주문 또는 인기 메뉴'],
    }
  }

  if (serviceSubtype === 'telco-plan-recommendation') {
    return {
      kpis: [
        { label: '월 예상 절약액', value: '24,500원', meta: '현재 사용량 기준' },
        { label: '2년 총 혜택', value: '294,000원', meta: '위약금 차감 후' },
        { label: '데이터 사용량', value: '18.7GB', meta: '최근 30일 평균' },
        { label: '추천 적합도', value: '92%', meta: '통화·데이터 패턴 분석' },
      ],
      quickActions: ['위약금 계산', '사용량 불러오기', '요금제 비교', '번호이동 혜택', '상담 예약', '찜한 요금제'],
      listItems: [
        { title: 'KT 모바일 무제한 7GB+', meta: '데이터 무제한 · 통화 무제한', value: '16,900원', badge: '이동 유리' },
        { title: '라이트 데이터 15GB', meta: '속도제어 3Mbps · 가족 결합 가능', value: '22,000원', badge: '균형형' },
        { title: '프리미엄 100GB', meta: '영상 스트리밍 많은 사용자 추천', value: '34,500원', badge: '고용량' },
      ],
      activityItems: [
        { title: '방금 전 1,204명이 절약 금액을 확인했어요', meta: '실시간 비교', value: '평균 21,800원 절약' },
        { title: '이번 달 약정 만료 예정', meta: 'D-18', value: '이동 가능성 높음' },
        { title: '쿠폰 적용 가능', meta: '온라인 전용', value: '개통비 0원' },
      ],
      sectionIdeas: ['절약 요약', '위약금 대비 절약액 비교', '요금제 추천', '사용량 분석', '혜택 체크리스트', '상담/전환 CTA'],
      requiredAboveFoldUnits: ['절약액', '위약금/약정', '사용량', '추천 요금제', '전환 CTA', '혜택 근거'],
    }
  }

  return {
    kpis: [
      { label: '오늘 핵심 상태', value: '12개', meta: '긴급 3개 포함' },
      { label: '진행률', value: '68%', meta: '어제보다 14% 상승' },
      { label: '맞춤 추천', value: '5개', meta: '사용자 상태 기반' },
      { label: '예상 효과', value: '32%', meta: '시간 절감 기준' },
    ],
    quickActions: ['바로 시작', '추천 보기', '내역 확인', '설정 변경', '혜택 보기', '상담하기'],
    listItems: [
      { title: '추천 항목 A', meta: '현재 상태 기준', value: '높음', badge: '추천' },
      { title: '추천 항목 B', meta: '최근 활동 기반', value: '중간', badge: '인기' },
      { title: '다음 행동', meta: '3분 안에 완료', value: '바로 가능', badge: '빠른 실행' },
    ],
    activityItems: [
      { title: '최근 업데이트', meta: '방금 전', value: '상태 반영 완료' },
      { title: '사용자 활동', meta: '오늘', value: '4건 완료' },
      { title: '새 알림', meta: '읽지 않음', value: '2건' },
    ],
    sectionIdeas: ['핵심 요약', '추천 카드', '빠른 실행', '최근 활동', '혜택/인사이트', '다음 행동'],
    requiredAboveFoldUnits: ['상태', '추천', '액션', '최근 활동', '효과 지표', '다음 섹션 힌트'],
  }
}
```

- [ ] **Step 2: Add `buildDesignIntelligencePlan()`**

Append:

```ts
export function buildDesignIntelligencePlan(input: DesignIntelligenceInput): {
  generationPlan: AideGenerationPlan
  visualPolicies: [VariantVisualPolicy, VariantVisualPolicy, VariantVisualPolicy]
  sharedVisualSubject: string
} {
  const serviceSubtype = detectServiceSubtype(input.brief, input.domain)
  const patterns = selectReferencePatterns(serviceSubtype, input.domain)
  const contentInventory = buildIntelligentContentInventory(input.brief, input.domain, serviceSubtype)
  const sharedVisualSubject = input.heroSubject || input.projectSummary
  const visualPolicies: [VariantVisualPolicy, VariantVisualPolicy, VariantVisualPolicy] = [
    input.needsScene3d ? 'scene-3d' : 'no-image',
    'creon-object-3d',
    'real-photo',
  ]

  const dataPointExamples = ['가격', '시간', '수량', '등급', '상태', '할인율', '적립 수', '쿠폰 수', '거리', '예상 결과', '비교 기준', '배지', '날짜']

  const generationPlan: AideGenerationPlan = {
    designIntelligence: {
      serviceSubtype,
      selectedPatterns: patterns.selected,
      avoidPatterns: patterns.avoid,
      dataPointTarget: {
        mobileFirstViewport: '첫 화면에서 주요 판단 근거 4~6개와 실제 데이터 포인트 10~16개',
        minimum: 10,
        ideal: 14,
        examples: dataPointExamples,
      },
      contentMediaPolicy: {
        heroPhotoVariant: 'C',
        thumbnailImagesAllowed: ['A', 'B', 'C'],
        notes: [
          'C안은 가능한 경우 bold-editorial-hero를 기본 후보로 사용한다.',
          'A/B안 하위 콘텐츠 썸네일은 서비스 분석 결과에 따라 허용한다.',
          'C안 전체를 실사 이미지로 도배하지 않는다.',
        ],
      },
    },
    variantBriefs: {
      A: {
        strategy: input.needsScene3d ? 'context-scene-information' : 'utility-information',
        screenPattern: input.needsScene3d ? 'scene-backed-status-home' : 'dense-decision-dashboard',
        heroPolicy: visualPolicies[0],
        mustShow: contentInventory.requiredAboveFoldUnits.slice(0, 6),
        shouldAvoid: ['empty poster hero', 'random decorative image', 'oversized loose whitespace'],
        layoutRhythm: ['section gap 14-20px', 'card padding 14-20px', 'next section hint visible'],
      },
      B: {
        strategy: 'mascot-conversion',
        screenPattern: patterns.selected.includes('mascot-companion') ? '3d-mascot-hero-order' : '3d-object-conversion-hero',
        heroPolicy: 'creon-object-3d',
        mustShow: [contentInventory.listItems[0].title, contentInventory.kpis[0].label, contentInventory.kpis[1].label, 'primary CTA', contentInventory.quickActions[0]],
        shouldAvoid: ['tiny floating 3D sticker', 'hero-only poster', 'CTA covered by 3D'],
        layoutRhythm: ['3D visual zone clear', 'CTA separated from 3D', 'supporting data below hero'],
      },
      C: {
        strategy: 'bold-editorial-discovery',
        screenPattern: input.domain === 'business' ? 'trust-visual-panel' : 'bold-editorial-hero',
        heroPolicy: 'real-photo',
        mustShow: [contentInventory.listItems[0].title, contentInventory.kpis[0].label, 'primary CTA', 'category/filter rail', contentInventory.sectionIdeas[0]],
        shouldAvoid: ['all-photo collage', 'thin content below hero', 'same structure as A or B'],
        layoutRhythm: ['large hero with readable scrim/gradient', 'content continues below hero', 'next section visible'],
      },
    },
    productBrief: {
      serviceIntent: input.projectSummary,
      targetUser: typeof input.answers['target_audience'] === 'string' ? input.answers['target_audience'] : '서비스의 핵심 사용자',
      primaryScenario: typeof input.answers['primary_journey'] === 'string' ? input.answers['primary_journey'] : '핵심 상태를 확인하고 다음 행동으로 이동',
      screenPurpose: input.platform === 'web' ? '웹 첫 화면에서 정보 구조와 주요 전환을 명확히 제시' : '모바일 첫 화면에서 요약, 추천, 주요 행동을 빠르게 완료',
      coreObjects: contentInventory.requiredAboveFoldUnits.slice(0, 6),
      keyActions: contentInventory.quickActions.slice(0, 4),
      successCriteria: ['서비스 목적 즉시 이해', '주요 CTA 명확', '데이터 포인트 10개 이상', '디자인 시스템 리듬 유지'],
      assumptions: ['입력이 부족한 부분은 서비스 subtype과 selectedPatterns로 보정한다', 'A/B/C는 서로 다른 의사결정을 보여준다'],
    },
    contentInventory,
    visualStrategy: {
      mode: '3d',
      sharedAsset: true,
      subject: sharedVisualSubject,
      reason: input.needsScene3d ? 'A=scene-3d B=Creon object C=real-photo hero' : 'A=no-image B=Creon object C=real-photo hero',
      usageByVariant: {
        A: input.needsScene3d ? 'SCENE_3D integrated scene layer' : 'no hero image; data and content components lead',
        B: 'HERO_3D Creon-style transparent object',
        C: 'IMG_1 bold editorial real-photo hero',
      },
    },
    variantDirector: {
      A: {
        strategy: input.needsScene3d ? 'Context Scene + Information' : 'Information Utility',
        layoutRole: input.needsScene3d ? '3D scene gives context while UI information stays dense' : 'data, comparison, status, and actions lead without a hero image',
        firstViewport: contentInventory.requiredAboveFoldUnits.slice(0, 8),
        mustDifferBy: ['information density', 'comparison/status hierarchy', 'stable rhythm'],
      },
      B: {
        strategy: 'Creon Object Conversion',
        layoutRole: 'single 3D object becomes the focal visual zone and supports immediate CTA',
        firstViewport: [contentInventory.listItems[0].title, contentInventory.kpis[0].label, contentInventory.kpis[1].label, 'primary CTA', contentInventory.quickActions[0], contentInventory.activityItems[0].title],
        mustDifferBy: ['HERO_3D visual zone', 'conversion CTA', 'supporting proof data'],
      },
      C: {
        strategy: 'Bold Editorial Discovery',
        layoutRole: 'large photo hero creates desire/trust, followed by exploration and benefits',
        firstViewport: [contentInventory.listItems[0].title, contentInventory.kpis[0].label, 'primary CTA', 'category/filter rail', contentInventory.sectionIdeas[0]],
        mustDifferBy: ['real-photo hero', 'readable scrim/gradient', 'discovery flow'],
      },
    },
  }

  return { generationPlan, visualPolicies, sharedVisualSubject }
}
```

- [ ] **Step 3: Remove duplicate inline heuristics from `StudioView.tsx`**

In `src/components/StudioView.tsx`, remove the local `buildContentInventory()` function.

Add import:

```ts
import { buildDesignIntelligencePlan } from '@/lib/design-intelligence'
```

- [ ] **Step 4: Replace generation context construction**

Inside `buildGenerationContext`, replace the inline `contentInventory`, `visualPolicies`, and `generationPlan` construction with:

```ts
const intelligence = buildDesignIntelligencePlan({
  brief,
  domain: effectiveDomain,
  platform,
  projectSummary: questionnaire.projectSummary,
  answers,
  heroSubject,
  heroPrompt,
  needsScene3d,
})

const { generationPlan, visualPolicies, sharedVisualSubject } = intelligence
return { heroSubject, heroPrompt, effectiveDomain, sharedVisualSubject, generationPlan, visualPolicies }
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

---

### Task 4: Wire Design Intelligence Into Prompt Contracts

**Files:**
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Add Design Intelligence section to `generateUI()` prompt**

In the `fullPrompt` body near `## Aide Generation Plan`, add:

```ts
${generationPlan?.designIntelligence ? `## Design Intelligence Layer — 서비스 분석 기반 UI 계약 (CRITICAL)
\`\`\`json
${JSON.stringify(generationPlan.designIntelligence, null, 2)}
\`\`\`

적용 규칙:
- serviceSubtype과 selectedPatterns를 기준으로 화면 패턴을 선택하세요.
- avoidPatterns에 있는 패턴은 사용하지 마세요.
- dataPointTarget.minimum 이상 실제 데이터 포인트를 첫 화면에 노출하세요.
- contentMediaPolicy.heroPhotoVariant가 C이면 히어로 실사는 C안에서 우선 사용하고, A/B의 하위 썸네일은 분석 결과에 따라만 사용하세요.
` : ''}

${generationPlan?.variantBriefs ? `## Variant Briefs — A/B/C 시안별 구현 계약 (CRITICAL)
\`\`\`json
${JSON.stringify(generationPlan.variantBriefs, null, 2)}
\`\`\`

적용 규칙:
- 현재 시안의 strategy, screenPattern, heroPolicy, mustShow, shouldAvoid, layoutRhythm을 실제 HTML 구조에 반영하세요.
- mustShow는 화면에 실제 텍스트/수치/상태로 보여야 하며, 얇은 라벨로 대체하면 실패입니다.
- shouldAvoid에 적힌 구조나 visual treatment는 사용하지 마세요.
` : ''}
```

- [ ] **Step 2: Run contract test**

Run:

```bash
node test/verify_prompt_contracts.mjs
```

Expected: PASS.

---

### Task 5: Verification

**Files:**
- Test: `test/verify_prompt_contracts.mjs`
- Verify: `src/lib/design-intelligence.ts`
- Verify: `src/components/StudioView.tsx`
- Verify: `src/lib/gemini.ts`

- [ ] **Step 1: Run prompt contract test**

Run:

```bash
node test/verify_prompt_contracts.mjs
```

Expected: `Prompt contracts look service-driven instead of layout-locked.`

- [ ] **Step 2: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: no output and exit code 0.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: exit code 0. Existing `<img>` warnings may remain.

- [ ] **Step 4: Run diff whitespace check**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 5: Manual smoke test**

Use this prompt in the app:

```text
피자 가게 멤버십 앱을 만들고 싶어.

사용자는 동네 피자집을 자주 이용하는 10~30대 고객이고, 앱에서 피자 주문, 쿠폰 적립, 멤버십 등급, 오늘의 추천 메뉴를 쉽게 확인하고 싶어해.

앱에는 귀여운 피자 조각 3D 캐릭터가 있어. 이 캐릭터는 사용자가 쿠폰을 모으거나 주문할 때 옆에서 안내해주는 브랜드 마스코트 역할을 해. 밝고 친근하고 맛있어 보이는 분위기였으면 좋겠어.

핵심 기능:
- 오늘의 추천 피자와 할인 혜택
- 내 멤버십 등급과 보유 쿠폰
- 스탬프 적립 현황
- 빠른 재주문
- 인기 메뉴 랭킹
- 가까운 매장 픽업 시간
- 신메뉴 이벤트
- 장바구니와 주문 CTA
```

Expected:
- A: information/utility variant with stamps, coupons, pickup time, order history, and dense rhythm.
- B: larger Creon-style pizza mascot/object as the hero visual zone, not a tiny sticker.
- C: bold editorial real-photo hero with readable scrim/gradient and discovery content below.
- All variants: stable 14-20px rhythm, 10+ visible data points, next section hint visible.

---

## Self-Review

**Spec coverage:** This plan covers service subtype analysis, UX pattern selection, content inventory, visual strategy, variant briefs, prompt integration, and verification.

**Placeholder scan:** No TBD/TODO placeholders remain. Every task has concrete files, code, commands, and expected outputs.

**Type consistency:** `AideGenerationPlan.designIntelligence`, `AideGenerationPlan.variantBriefs`, `VariantVisualPolicy`, `buildDesignIntelligencePlan()`, and `DesignIntelligenceInput` are consistently named across tasks.
