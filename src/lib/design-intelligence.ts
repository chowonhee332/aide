import type { AideGenerationPlan, AppDomain, VariantVisualPolicy } from './gemini'

type VariantKey = 'A' | 'B' | 'C'

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

type PatternSelection = {
  selected: string[]
  avoid: string[]
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text))
}

export function detectServiceSubtype(brief: string, domain: AppDomain): string {
  const normalized = brief.toLowerCase()
  if (includesAny(brief, [/피자|pizza|페퍼로니|주문|픽업|스탬프|피자집/])) return 'pizza-order-membership'
  if (includesAny(brief, [/요금제|통신|위약금|번호이동|휴대폰|모바일|데이터|유심|알뜰폰/])) return 'telco-plan-recommendation'
  if (includesAny(brief, [/포인트|쿠폰|멤버십|등급|리워드|적립|혜택/])) return 'membership-reward'
  if (includesAny(brief, [/식물|물주기|몬스테라|화분|성장|루틴/])) return 'plant-care-companion'
  if (includesAny(brief, [/물류|배송|트럭|화물|창고|배차|route|fleet/])) return 'b2b-logistics-dashboard'
  if (domain === 'food') return 'food-order-commerce'
  if (domain === 'commerce') return 'local-store-commerce'
  if (domain === 'business') return 'b2b-dashboard'
  return normalized.includes('ai') ? 'ai-productivity' : `${domain}-service`
}

export function selectReferencePatterns(serviceSubtype: string, domain: AppDomain): PatternSelection {
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
  const normalized = brief.toLowerCase()
  const isMembership = /포인트|쿠폰|멤버십|등급|리워드|적립|혜택/.test(brief)

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
      sectionIdeas: ['히어로 절약 요약', '위약금 대비 절약액 비교', '퀵 액션 그리드', '추천 요금제 3개', '최근 비교 활동', '혜택 체크리스트'],
      requiredAboveFoldUnits: ['절약액 KPI', '위약금/사용량/추천적합도', '퀵 액션', '요금제 카드', '실시간 활동', '혜택 안내'],
    }
  }

  if (domain === 'food' || /음식|레시피|메뉴|장보기|배달|식단|냉장고/.test(brief)) {
    return {
      kpis: [
        { label: '오늘 추천 메뉴', value: '8개', meta: '냉장고 재료 기준' },
        { label: '재료 매칭률', value: '86%', meta: '부족한 재료 3개' },
        { label: '예상 조리 시간', value: '18분', meta: '빠른 저녁 메뉴' },
        { label: '장보기 절약', value: '12,400원', meta: '묶음 구매 기준' },
      ],
      quickActions: ['오늘 메뉴 만들기', '냉장고 스캔', '부족한 재료 담기', '레시피 저장', '영양 균형 보기', '가족 취향 설정'],
      listItems: [
        { title: '토마토 달걀 덮밥', meta: '매칭률 92% · 15분', value: '3,800원', badge: '추천' },
        { title: '닭가슴살 샐러드', meta: '단백질 32g · 저녁용', value: '5,600원', badge: '건강식' },
        { title: '버섯 크림 파스타', meta: '부족 재료 2개 · 22분', value: '6,900원', badge: '인기' },
      ],
      activityItems: [
        { title: '어제 저장한 레시피', meta: '3개', value: '바로 이어보기' },
        { title: '유통기한 임박 재료', meta: '양파 · 우유', value: '오늘 사용 추천' },
        { title: '이번 주 장보기 예산', meta: '72% 사용', value: '18,000원 남음' },
      ],
      sectionIdeas: ['오늘 추천 요약', '재료 매칭 KPI', '퀵 액션', '추천 레시피 카드', '장보기/예산 상태', '최근 저장 레시피'],
      requiredAboveFoldUnits: ['메뉴/재료 KPI', '퀵 액션', '추천 카드', '가격/시간/매칭률 메타', '최근 저장 또는 예산 상태'],
    }
  }

  if (isMembership) {
    return {
      kpis: [
        { label: '보유 포인트', value: '42,800P', meta: '이번 달 +6,200P' },
        { label: '사용 가능 쿠폰', value: '7장', meta: '오늘 만료 1장' },
        { label: '현재 등급', value: 'Gold', meta: '다음 등급까지 12%' },
        { label: '이번 달 혜택', value: '18,400원', meta: '제휴 할인 포함' },
      ],
      quickActions: ['QR 적립', '쿠폰함', '제휴 매장 찾기', '등급 혜택', '포인트 사용', '최근 내역'],
      listItems: [
        { title: '스타벅스 사이즈업 쿠폰', meta: '오늘까지 · 전국 매장', value: '무료', badge: '마감임박' },
        { title: '편의점 10% 할인', meta: '월 3회 사용 가능', value: '최대 3,000원', badge: '인기' },
        { title: '영화 예매 혜택', meta: '주말 적용 가능', value: '4,000원 할인', badge: 'Gold' },
      ],
      activityItems: [
        { title: '강남역 매장에서 적립', meta: '오늘 12:42', value: '+820P' },
        { title: '쿠폰 사용 완료', meta: '어제', value: '2,500원 절약' },
        { title: '등급 미션 진행', meta: '4/5 완료', value: '1회 남음' },
      ],
      sectionIdeas: ['포인트 요약', '쿠폰/등급 KPI', '퀵 액션', '추천 혜택 카드', '최근 적립 내역', '주변 제휴 매장'],
      requiredAboveFoldUnits: ['포인트/쿠폰/등급/혜택 KPI', 'QR 또는 쿠폰 CTA', '혜택 카드', '최근 내역', '주변 제휴 매장'],
    }
  }

  const serviceNameHint = normalized.includes('ai') ? 'AI 추천' : '맞춤 추천'
  return {
    kpis: [
      { label: '오늘 처리할 일', value: '12개', meta: '긴급 3개 포함' },
      { label: '진행률', value: '68%', meta: '어제보다 14% 상승' },
      { label: serviceNameHint, value: '5개', meta: '사용자 상태 기반' },
      { label: '예상 효과', value: '32%', meta: '시간 절감 기준' },
    ],
    quickActions: ['새로 시작', '추천 보기', '상태 확인', '내역 관리', '알림 설정', '도움 받기'],
    listItems: [
      { title: '우선 확인할 항목', meta: '오늘 마감 · 중요도 높음', value: '상세 보기', badge: '긴급' },
      { title: '맞춤 추천 카드', meta: '최근 활동 기반', value: '5분 소요', badge: '추천' },
      { title: '다음 단계 안내', meta: '완료율을 높이는 액션', value: '+18%', badge: '효과' },
    ],
    activityItems: [
      { title: '최근 활동 업데이트', meta: '방금 전', value: '3건 변경' },
      { title: '알림 대기', meta: '오늘', value: '2건' },
      { title: '완료된 액션', meta: '이번 주', value: '24건' },
    ],
    sectionIdeas: ['현재 상태 요약', '핵심 KPI', '퀵 액션', '추천 카드', '최근 활동', '다음 단계 CTA'],
    requiredAboveFoldUnits: ['KPI', '퀵 액션', '추천/내역 카드', '상태/시간/효과 메타', '다음 행동'],
  }
}

function buildCoreObjects(domain: AppDomain, serviceSubtype: string): string[] {
  if (serviceSubtype === 'pizza-order-membership') {
    return ['추천 메뉴', '가격/할인', '픽업 시간', '쿠폰/스탬프', '멤버십 등급', '주문 CTA']
  }
  if (serviceSubtype === 'telco-plan-recommendation') {
    return ['요금제', '예상 절약액', '위약금/약정 상태', '데이터 사용량', '추천 적합도', '전환 CTA']
  }
  if (domain === 'food') {
    return ['추천 메뉴', '재료', '매칭률', '조리 시간', '장보기 CTA']
  }
  return ['핵심 상태', '주요 콘텐츠', '추천 항목', '진행 상태', '주요 CTA']
}

function buildKeyActions(serviceSubtype: string): string[] {
  if (serviceSubtype === 'pizza-order-membership') return ['메뉴 담기', '쿠폰 적용', '픽업 시간 선택', '빠른 재주문']
  if (serviceSubtype === 'telco-plan-recommendation') return ['위약금 계산', '요금제 비교', '추천 요금제 선택', '번호이동 상담']
  return ['상태 확인', '추천 보기', '상세 보기', '주요 액션 실행']
}

function variantBriefsFor(
  needsScene3d: boolean,
  serviceSubtype: string,
  domain: AppDomain,
  contentInventory: NonNullable<AideGenerationPlan['contentInventory']>,
): Record<VariantKey, NonNullable<AideGenerationPlan['variantBriefs']>[VariantKey]> {
  const cScreenPattern = domain === 'business' ? 'trust-visual-panel' : 'bold-editorial-hero'
  return {
    A: {
      strategy: needsScene3d ? 'Contextual 3D Scene Home' : 'Dense Utility Home',
      screenPattern: needsScene3d ? 'scene-3d-overview' : 'data-first-dashboard',
      heroPolicy: needsScene3d ? 'scene-3d' : 'no-image',
      mustShow: [contentInventory.kpis[0].label, contentInventory.kpis[1].label, contentInventory.quickActions[0], contentInventory.listItems[0].title, contentInventory.activityItems[0].title],
      shouldAvoid: ['old game render', 'generic 3D stock render', 'oversized empty hero', 'same card order as B/C'],
      layoutRhythm: ['compact header', '14-20px section gap', 'high-density first viewport', 'next section peeking at bottom'],
    },
    B: {
      strategy: 'Creon Object 3D Conversion Home',
      screenPattern: serviceSubtype === 'pizza-order-membership' ? 'mascot-companion commerce hero' : 'object-stage recommendation hero',
      heroPolicy: 'creon-object-3d',
      mustShow: [contentInventory.kpis[0].label, contentInventory.kpis[1].label, contentInventory.kpis[2].label, contentInventory.quickActions[0], contentInventory.quickActions[1], contentInventory.listItems[0].title],
      shouldAvoid: ['tiny sticker 3D', 'floating object without content', 'hero-only poster', 'same information grouping as A/C'],
      layoutRhythm: ['large object stage but compact card', 'CTA close to hero', 'KPI strip or decision proof', 'recommendation preview visible'],
    },
    C: {
      strategy: 'Photo Editorial Service Home',
      screenPattern: cScreenPattern,
      heroPolicy: 'real-photo',
      mustShow: [contentInventory.kpis[0].label, 'primary CTA', contentInventory.quickActions[0], contentInventory.listItems[0].title, contentInventory.listItems[1].title, contentInventory.activityItems[0].title],
      shouldAvoid: ['photo everywhere', 'random Unsplash thumbnails', 'same white card stack as A/B', 'B2B over-dramatic hero if service is operational'],
      layoutRhythm: ['bold visual first impression', 'readable scrim if photo hero', 'content resumes immediately below hero', 'thumbnail usage only when it helps comprehension'],
    },
  }
}

export function buildDesignIntelligencePlan(input: DesignIntelligenceInput): {
  generationPlan: AideGenerationPlan
  visualPolicies: [VariantVisualPolicy, VariantVisualPolicy, VariantVisualPolicy]
  sharedVisualSubject: string
} {
  const serviceSubtype = detectServiceSubtype(input.brief, input.domain)
  const patternSelection = selectReferencePatterns(serviceSubtype, input.domain)
  const contentInventory = buildIntelligentContentInventory(input.brief, input.domain, serviceSubtype)
  const sharedVisualSubject = input.heroSubject || input.projectSummary
  const visualPolicies: [VariantVisualPolicy, VariantVisualPolicy, VariantVisualPolicy] = [
    input.needsScene3d ? 'scene-3d' : 'no-image',
    'creon-object-3d',
    'real-photo',
  ]
  const variantBriefs = variantBriefsFor(input.needsScene3d, serviceSubtype, input.domain, contentInventory)

  return {
    sharedVisualSubject,
    visualPolicies,
    generationPlan: {
      designIntelligence: {
        serviceSubtype,
        selectedPatterns: patternSelection.selected,
        avoidPatterns: patternSelection.avoid,
        dataPointTarget: {
          mobileFirstViewport: '시안별 첫 viewport에서 판단 가능한 실제 데이터 포인트 10~16개',
          minimum: 10,
          ideal: input.platform === 'web' ? 18 : 14,
          examples: ['가격', '시간', '수량', '등급', '상태', '할인율', '적립 수', '쿠폰 수', '거리', '예상 결과', '비교 기준', '배지', '날짜'],
        },
        contentMediaPolicy: {
          heroPhotoVariant: 'C',
          thumbnailImagesAllowed: ['A', 'B', 'C'],
          notes: [
            'C안만 기본 실사 히어로를 우선 고려한다',
            'A/B/C 하위 콘텐츠 썸네일은 서비스 이해에 도움이 될 때만 사용한다',
            '3D가 필요하면 A는 SCENE_3D, B는 Creon-style transparent HERO_3D를 쓴다',
          ],
        },
      },
      variantBriefs,
      productBrief: {
        serviceIntent: input.projectSummary,
        targetUser: typeof input.answers['target_audience'] === 'string' ? input.answers['target_audience'] : '서비스의 핵심 사용자',
        primaryScenario: typeof input.answers['primary_journey'] === 'string' ? input.answers['primary_journey'] : '핵심 상태를 확인하고 다음 행동으로 이동',
        screenPurpose: input.platform === 'web'
          ? '웹 첫 화면에서 정보 구조와 주요 전환을 명확히 제시'
          : '모바일 첫 화면에서 요약, 추천, 주요 행동을 빠르게 완료',
        coreObjects: buildCoreObjects(input.domain, serviceSubtype),
        keyActions: buildKeyActions(serviceSubtype),
        successCriteria: ['첫 화면에서 서비스 목적이 즉시 이해됨', '주요 CTA가 명확함', '반복 콘텐츠가 실제 서비스처럼 충분함', '선택한 design.md 리듬을 유지함'],
        assumptions: ['입력이 부족한 부분은 서비스 subtype과 도메인 표준 홈 화면으로 보정', 'A/B/C는 같은 소재 강제가 아니라 서로 다른 UX 방향으로 차별화'],
      },
      contentInventory,
      visualStrategy: {
        mode: input.needsScene3d ? '3d' : 'data',
        sharedAsset: false,
        subject: sharedVisualSubject,
        reason: input.needsScene3d
          ? 'A=background SCENE_3D B=Creon-style transparent HERO_3D C=real-photo'
          : 'A=no-image data-first B=Creon-style transparent HERO_3D C=real-photo',
        usageByVariant: {
          A: input.needsScene3d
            ? '배경 포함 3D 씬 (%%SCENE_3D%%) — 화면 전체를 과하게 채우지 않고 서비스 맥락과 안전 영역을 만든다'
            : '이미지 없음 — 데이터·수치·KPI·카드로만 화면을 채운다',
          B: 'Creon식 단일 3D 오브젝트 (%%HERO_3D%%) — 배경 없는 오브젝트를 작지 않은 hero/card visual zone에 배치',
          C: '실사 이미지 (%%IMG_1:keyword%%) — 기본적으로 C안 히어로에서만 과감하게 사용하고 하위 이미지는 분석 결과에 따라 선택',
        },
      },
      variantDirector: {
        A: {
          strategy: variantBriefs.A.strategy,
          layoutRole: input.needsScene3d
            ? '배경 포함 3D 씬이 서비스 맥락을 만들고, 안전 영역에 핵심 상태·CTA·콘텐츠를 배치'
            : '이미지 없이 수치·진행률·상태·KPI 카드로 완성도 높은 정보 화면',
          firstViewport: variantBriefs.A.mustShow,
          mustDifferBy: variantBriefs.A.layoutRhythm,
        },
        B: {
          strategy: variantBriefs.B.strategy,
          layoutRole: 'Creon식 배경 없는 단일 3D 오브젝트를 명확한 visual zone에 두고, 같은 첫 화면 안에 KPI·퀵액션·추천/내역 카드를 함께 노출',
          firstViewport: variantBriefs.B.mustShow,
          mustDifferBy: variantBriefs.B.layoutRhythm,
        },
        C: {
          strategy: variantBriefs.C.strategy,
          layoutRole: input.domain === 'business'
            ? '신뢰형 실사/visual panel과 업무 정보를 연결'
            : '큰 실사/감성 히어로로 서비스 분위기를 전달하고 바로 아래에 실제 정보와 CTA를 연결',
          firstViewport: variantBriefs.C.mustShow,
          mustDifferBy: variantBriefs.C.layoutRhythm,
        },
      },
    },
  }
}
