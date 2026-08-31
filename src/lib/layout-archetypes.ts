import type { AppDomain } from './domain-constants'

/**
 * 레이아웃 아키타입 — "구성(composition) 다양성"의 원천.
 *
 * 정확성(셸·리듬·컴포넌트 내부·반응형)은 결정론으로 잠가 품질을 보장하고,
 * 아키타입은 "어떤 섹션을 어떤 골격으로 배치하는가"만 바꿔 다양성을 만든다.
 * 변형(A/B/C)마다 서로 다른 아키타입을 배정하고, 서비스(brief)마다 회전 선택해
 * "같은 도메인이면 늘 비슷한 구조"가 되는 diversity-collapse를 방지한다.
 */
export type LayoutArchetype = {
  id: string
  name: string
  /** 적합 도메인 — 'any'는 전 도메인 */
  bestFor: AppDomain[] | 'any'
  heroPattern: 'kpi-band' | 'object-3d' | 'photo-cover' | 'split' | 'none' | 'mascot' | 'search-first'
  contentPattern: 'dense-list' | 'two-col-grid' | 'bento' | 'feed' | 'rail-stack' | 'timeline' | 'comparison' | 'widgets' | 'form'
  density: 'compact' | 'balanced' | 'airy'
  /** 섹션 IR 골격 — 순서대로 배치할 섹션 종류 */
  sectionRecipe: string[]
  /** 이 아키타입에서 피할 것 */
  forbid: string[]
  /** 프롬프트 주입용 한 줄 설명 */
  description: string
}

export type UISectionVisual = 'none' | 'HERO_3D' | 'SCENE_3D' | 'REAL_PHOTO' | 'CONTENT_THUMB'
export type UISectionCtaPlacement = 'none' | 'bottom' | 'bottom-right' | 'action-row' | 'fixed-bottom'

export type UIStructureSection = {
  id: string
  role: string
  layout: string
  density: LayoutArchetype['density']
  visual: UISectionVisual
  ctaPlacement: UISectionCtaPlacement
  content: string[]
  required: boolean
  viewportPriority: 'above-fold' | 'near-fold' | 'scroll'
  repeatPattern: 'none' | 'list' | 'grid' | 'rail' | 'table' | 'timeline'
}

export type UIStructureIR = {
  variant: 'A' | 'B' | 'C'
  platform: 'mobile' | 'web'
  archetypeId: string
  structureSignature: string
  chrome: {
    topNav: boolean
    bottomNav: boolean
    sideNav: boolean
    scrollArea: 'main'
    fixedChrome: boolean
    contentMustScroll: boolean
    /** false only when an as-is shellContract says the redesign target has no brand logo */
    brandLogo: boolean
    /** present only when an as-is shellContract pins the top app bar — deterministic shell then reproduces it verbatim */
    topAppBar?: { title: string; leftAction: string; rightAction: string }
  }
  sections: UIStructureSection[]
  firstViewport: {
    composition: string
    visibleSectionIds: string[]
    minimumDataPoints: number
    nextContentHint: boolean
  }
  visualSlots: Array<{
    id: string
    kind: UISectionVisual
    placement: string
    required: boolean
  }>
  ctaRules: {
    primaryPlacement: UISectionCtaPlacement
    forbidden: string[]
  }
  antiSamenessRules: string[]
  responsiveRules: string[]
}

export const ARCHETYPE_POOL: Record<string, LayoutArchetype> = {
  'kpi-dashboard': {
    id: 'kpi-dashboard', name: 'KPI 대시보드', bestFor: ['finance', 'business', 'health', 'productivity'],
    heroPattern: 'kpi-band', contentPattern: 'dense-list', density: 'compact',
    sectionRecipe: ['kpi-band', 'quick-actions', 'status-analysis', 'recommendation-list', 'recent-activity'],
    forbid: ['large emotional photo hero', 'sparse single-CTA poster'],
    description: '상단 KPI 밴드 + 빠른 액션 그리드 + 분석/추천 리스트. 데이터·수치가 주인공인 조밀한 대시보드.',
  },
  'comparison-decision': {
    id: 'comparison-decision', name: '비교·결정형', bestFor: ['finance', 'commerce', 'travel', 'business'],
    heroPattern: 'kpi-band', contentPattern: 'comparison', density: 'compact',
    sectionRecipe: ['savings-summary', 'comparison-table', 'recommended-option', 'benefit-checklist', 'conversion-cta'],
    forbid: ['decorative full-bleed photo', 'feed/timeline'],
    description: '절약/이득 요약 + 비교표(2~3안) + 추천안 + 전환 CTA. 사용자가 "고르는" 의사결정 화면.',
  },
  'feed-stream': {
    id: 'feed-stream', name: '피드 스트림', bestFor: ['social', 'entertainment', 'education'],
    heroPattern: 'none', contentPattern: 'feed', density: 'balanced',
    sectionRecipe: ['story-rail', 'feed-post', 'feed-post', 'suggested-follow', 'feed-post'],
    forbid: ['KPI band', 'comparison table'],
    description: '상단 스토리/필터 레일 + 세로 피드(사진·반응·댓글). 둘러보며 소비하는 타임라인.',
  },
  'magazine-editorial': {
    id: 'magazine-editorial', name: '매거진 에디토리얼', bestFor: ['travel', 'commerce', 'food', 'entertainment'],
    heroPattern: 'photo-cover', contentPattern: 'two-col-grid', density: 'airy',
    sectionRecipe: ['photo-hero', 'category-chips', 'featured-cards', 'story-collection', 'offer-banner'],
    forbid: ['dense KPI grid', 'comparison table'],
    description: '대형 사진 히어로 + 카테고리 칩 + 2열 이미지 카드 + 큐레이션. 감성·탐색 중심 매거진.',
  },
  'object-hero': {
    id: 'object-hero', name: '오브젝트 히어로', bestFor: 'any',
    heroPattern: 'object-3d', contentPattern: 'rail-stack', density: 'balanced',
    sectionRecipe: ['object-3d-hero', 'primary-cta', 'simulator-cards', 'top-recommendations', 'guide-section'],
    forbid: ['tiny sticker 3D', 'empty poster below hero'],
    description: '3D 오브젝트 히어로 + 단일 CTA + 액션 카드 + 추천. 전환·상징성이 강한 B2C 홈.',
  },
  'search-explore': {
    id: 'search-explore', name: '검색·탐색형', bestFor: ['commerce', 'travel', 'food', 'education'],
    heroPattern: 'search-first', contentPattern: 'two-col-grid', density: 'balanced',
    sectionRecipe: ['search-bar', 'category-rail', 'result-grid', 'curated-collection', 'recent-viewed'],
    forbid: ['large 3D mascot hero', 'KPI band'],
    description: '상단 검색 + 카테고리 레일 + 결과 그리드. 찾고 비교하며 탐색하는 화면.',
  },
  'card-carousel': {
    id: 'card-carousel', name: '카드 캐러셀', bestFor: ['entertainment', 'social', 'education', 'commerce'],
    heroPattern: 'photo-cover', contentPattern: 'rail-stack', density: 'balanced',
    sectionRecipe: ['featured-hero', 'horizontal-rail', 'horizontal-rail', 'ranked-list', 'horizontal-rail'],
    forbid: ['dense table', 'form'],
    description: '대표 히어로 + 가로 스크롤 레일 여러 개. 넷플릭스/스포티파이식 콘텐츠 둘러보기.',
  },
  'progress-quest': {
    id: 'progress-quest', name: '진행·퀘스트형', bestFor: ['health', 'education', 'finance'],
    heroPattern: 'object-3d', contentPattern: 'widgets', density: 'balanced',
    sectionRecipe: ['progress-hero', 'daily-missions', 'streak-rewards', 'quick-actions', 'recent-records'],
    forbid: ['comparison table', 'magazine grid'],
    description: '진행률/레벨 히어로 + 일일 미션 + 보상/streak. 게임화된 습관·학습 홈.',
  },
  'companion-status': {
    id: 'companion-status', name: '컴패니언 상태형', bestFor: ['health', 'education', 'social'],
    heroPattern: 'mascot', contentPattern: 'widgets', density: 'balanced',
    sectionRecipe: ['companion-status-hero', 'today-routine', 'care-actions', 'progress-cards', 'tips-section'],
    forbid: ['dense data table', 'generic storefront'],
    description: '마스코트/컴패니언 상태 히어로 + 오늘의 루틴 + 케어 액션. 동반자형 앱 홈.',
  },
  'detail-report': {
    id: 'detail-report', name: '상세·리포트형', bestFor: ['finance', 'business', 'health'],
    heroPattern: 'split', contentPattern: 'timeline', density: 'compact',
    sectionRecipe: ['summary-hero', 'segmented-tabs', 'metric-cards', 'timeline-list', 'related-recommendations'],
    forbid: ['emotional photo hero', 'carousel rails'],
    description: '요약 히어로 + 탭/세그먼트 + 지표 카드 + 타임라인. 리포트/분석 결과 화면.',
  },
  'bento-grid': {
    id: 'bento-grid', name: '벤토 그리드', bestFor: 'any',
    heroPattern: 'none', contentPattern: 'bento', density: 'balanced',
    sectionRecipe: ['bento-tiles', 'highlight-tile', 'mixed-size-cards', 'quick-actions'],
    forbid: ['single dense list only', 'full-bleed photo hero'],
    description: '크기가 다른 타일을 모자이크로 배치한 벤토 그리드. 모던하고 정보를 한눈에.',
  },
  'split-workspace': {
    id: 'split-workspace', name: '스플릿 워크스페이스', bestFor: ['business', 'productivity'],
    heroPattern: 'split', contentPattern: 'widgets', density: 'compact',
    sectionRecipe: ['left-nav-panel', 'overview-widgets', 'data-table', 'activity-side-panel'],
    forbid: ['mobile bottom tabbar', 'emotional photo hero'],
    description: '좌측 패널 + 우측 위젯/테이블 워크스페이스. 웹 B2B 대시보드형.',
  },
  'order-commerce': {
    id: 'order-commerce', name: '주문·커머스 홈', bestFor: ['food', 'commerce'],
    heroPattern: 'search-first', contentPattern: 'rail-stack', density: 'balanced',
    sectionRecipe: ['address-search', 'promo-strip', 'category-rail', 'product-card-grid', 'cart-preview'],
    forbid: ['generic KPI dashboard', 'single poster hero'],
    description: '주소/검색 + 프로모션 + 카테고리 + 상품/가게 카드 + 장바구니 진입. 주문 행동이 빠른 커머스 홈.',
  },
  'wallet-membership': {
    id: 'wallet-membership', name: '월렛·멤버십', bestFor: ['finance', 'commerce', 'business'],
    heroPattern: 'kpi-band', contentPattern: 'widgets', density: 'compact',
    sectionRecipe: ['wallet-summary', 'benefit-cards', 'coupon-rail', 'membership-tier', 'nearby-actions'],
    forbid: ['large decorative photo', 'empty 3D-only hero'],
    description: '잔액/등급/혜택 요약 + 쿠폰/멤버십/근처 액션. 사용자가 보유 자산과 혜택을 바로 판단하는 화면.',
  },
  'booking-map': {
    id: 'booking-map', name: '예약·지도형', bestFor: ['travel', 'food', 'health'],
    heroPattern: 'search-first', contentPattern: 'two-col-grid', density: 'balanced',
    sectionRecipe: ['search-and-date', 'map-preview', 'availability-cards', 'recommendation-list', 'saved-places'],
    forbid: ['dense admin table', 'unrelated editorial feed'],
    description: '검색/날짜 + 지도/위치 미리보기 + 예약 가능 카드. 장소·시간 선택이 중요한 탐색 화면.',
  },
  'onboarding-wizard': {
    id: 'onboarding-wizard', name: '온보딩·설정형', bestFor: ['education', 'health', 'productivity', 'other'],
    heroPattern: 'split', contentPattern: 'form', density: 'balanced',
    sectionRecipe: ['goal-summary', 'stepper-form', 'preference-chips', 'preview-card', 'continue-cta'],
    forbid: ['long feed', 'unstructured card wall'],
    description: '목표 요약 + 단계형 입력 + 선택 칩 + 미리보기. 사용자를 설정/시작 흐름으로 이끄는 화면.',
  },
}

// 변형별 후보군 — A=정보/비교, B=전환/행동, C=탐색/브랜드
const SLOT_CANDIDATES: Record<'A' | 'B' | 'C', string[]> = {
  A: ['kpi-dashboard', 'comparison-decision', 'detail-report', 'wallet-membership', 'feed-stream', 'bento-grid'],
  B: ['object-hero', 'progress-quest', 'companion-status', 'order-commerce', 'search-explore', 'comparison-decision', 'onboarding-wizard'],
  C: ['magazine-editorial', 'card-carousel', 'booking-map', 'bento-grid', 'search-explore', 'feed-stream'],
}

const DOMAIN_PREFERRED: Partial<Record<AppDomain, Record<'A' | 'B' | 'C', string[]>>> = {
  food: {
    A: ['order-commerce', 'search-explore', 'comparison-decision'],
    B: ['object-hero', 'order-commerce', 'progress-quest'],
    C: ['magazine-editorial', 'booking-map', 'card-carousel'],
  },
  commerce: {
    A: ['comparison-decision', 'wallet-membership', 'kpi-dashboard'],
    B: ['order-commerce', 'object-hero', 'search-explore'],
    C: ['magazine-editorial', 'card-carousel', 'booking-map'],
  },
  finance: {
    A: ['comparison-decision', 'wallet-membership', 'kpi-dashboard'],
    B: ['object-hero', 'progress-quest', 'detail-report'],
    C: ['detail-report', 'bento-grid', 'search-explore'],
  },
  travel: {
    A: ['comparison-decision', 'booking-map', 'detail-report'],
    B: ['search-explore', 'object-hero', 'booking-map'],
    C: ['magazine-editorial', 'booking-map', 'card-carousel'],
  },
  health: {
    A: ['kpi-dashboard', 'detail-report', 'progress-quest'],
    B: ['progress-quest', 'companion-status', 'onboarding-wizard'],
    C: ['booking-map', 'magazine-editorial', 'bento-grid'],
  },
  business: {
    A: ['kpi-dashboard', 'split-workspace', 'detail-report'],
    B: ['comparison-decision', 'onboarding-wizard', 'object-hero'],
    C: ['split-workspace', 'bento-grid', 'detail-report'],
  },
  productivity: {
    A: ['split-workspace', 'kpi-dashboard', 'detail-report'],
    B: ['onboarding-wizard', 'progress-quest', 'object-hero'],
    C: ['bento-grid', 'feed-stream', 'card-carousel'],
  },
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function suitable(id: string, domain: AppDomain): boolean {
  const a = ARCHETYPE_POOL[id]
  return a && (a.bestFor === 'any' || a.bestFor.includes(domain))
}

/**
 * A/B/C에 서로 다른 아키타입을 배정한다.
 * - brief 해시로 시드 → 같은 서비스는 안정적, 다른 서비스는 다른 조합 (cross-service 다양성)
 * - 도메인 적합 후보 우선, 없으면 전체 후보 폴백
 * - 3개가 절대 겹치지 않게 강제 (anti-collapse)
 */
export function assignVariantArchetypes(
  brief: string,
  domain: AppDomain,
): Record<'A' | 'B' | 'C', LayoutArchetype> {
  const seed = hashString(`${brief}::${domain}`)
  const used = new Set<string>()

  const pick = (slot: 'A' | 'B' | 'C', offset: number): LayoutArchetype => {
    const preferred = DOMAIN_PREFERRED[domain]?.[slot] ?? []
    const all = [...preferred, ...SLOT_CANDIDATES[slot]].filter((id, index, arr) => arr.indexOf(id) === index)
    const fit = all.filter(id => suitable(id, domain) && !used.has(id))
    const pool = fit.length > 0 ? fit : all.filter(id => !used.has(id))
    const list = pool.length > 0 ? pool : all
    const chosen = list[(seed + offset) % list.length]
    used.add(chosen)
    return ARCHETYPE_POOL[chosen]
  }

  return { A: pick('A', 0), B: pick('B', 1), C: pick('C', 2) }
}

function visualForPolicy(policy: string, isHero: boolean): UISectionVisual {
  if (!isHero) return policy === 'real-photo' ? 'CONTENT_THUMB' : 'none'
  if (policy === 'scene-3d' || policy === 'scene-3d-card-cover') return 'SCENE_3D'
  if (policy === 'creon-object-3d') return 'HERO_3D'
  if (policy === 'real-photo') return 'REAL_PHOTO'
  return 'none'
}

function sectionLayout(section: string, archetype: LayoutArchetype): string {
  if (/table|comparison/.test(section)) return 'comparison-table'
  if (/grid|tiles|cards|widgets|missions|actions/.test(section)) return archetype.contentPattern === 'bento' ? 'bento-grid' : 'card-grid'
  if (/rail|carousel|collection/.test(section)) return 'horizontal-rail'
  if (/timeline|activity|history|records/.test(section)) return 'timeline-list'
  if (/hero|summary|progress|status|photo|object|search/.test(section)) return `${archetype.heroPattern}-hero`
  if (/list|recommendation|ranked|results/.test(section)) return 'stacked-list'
  return archetype.contentPattern
}

function sectionContent(section: string, fallback: string[]): string[] {
  if (/kpi|summary|savings|metric|progress/.test(section)) return ['headline', 'primaryMetric', 'secondaryMetric', 'statusBadge', 'supportingCopy']
  if (/actions|cta|shortcut/.test(section)) return ['primaryAction', 'secondaryAction', 'shortcutItems']
  if (/comparison|table/.test(section)) return ['optionA', 'optionB', 'recommendedOption', 'decisionReason']
  if (/recommendation|top|result|featured|cards|grid|rail|collection/.test(section)) return ['itemTitle', 'itemMeta', 'itemValue', 'badge', 'detailAction']
  if (/activity|timeline|history|records/.test(section)) return ['eventTitle', 'eventTime', 'eventStatus', 'eventValue']
  if (/search|category|chips|filter/.test(section)) return ['searchInput', 'categoryTabs', 'filterChip', 'resultHint']
  if (/story/.test(section)) return ['avatarCircle', 'storyLabel', 'unseenIndicator']
  if (/feed|post|card-item/.test(section)) return ['authorAvatar', 'authorName', 'postContent', 'postImage', 'reactionBar', 'commentCount']
  if (/follow|suggest/.test(section)) return ['userAvatar', 'userName', 'userBio', 'followAction']
  if (/hero|banner|photo|object|split/.test(section)) return ['brandTagline', 'heroSubcopy', 'primaryCta', 'trustBadge']
  if (/benefit|checklist|feature|why/.test(section)) return ['benefitIcon', 'benefitTitle', 'benefitDescription']
  if (/profile|member|wallet|tier/.test(section)) return ['userAvatar', 'userName', 'tierBadge', 'primaryValue', 'expiryInfo', 'primaryAction']
  if (/status|analysis|insight/.test(section)) return ['statusLabel', 'statusValue', 'trendIndicator', 'statusDetail', 'actionLink']
  if (/map|location|nearby/.test(section)) return ['mapArea', 'locationPin', 'nearbyList', 'filterChip', 'distanceBadge']
  if (/onboarding|welcome|intro|permission/.test(section)) return ['illustrationOrIcon', 'headline', 'description', 'primaryCta', 'skipLink']
  if (/booking|schedule|slot|calendar/.test(section)) return ['dateSelector', 'timeSlotGrid', 'selectedSlotSummary', 'confirmAction']
  if (/order|cart|checkout/.test(section)) return ['itemThumb', 'itemName', 'quantityControl', 'priceRow', 'orderAction']
  if (/detail|report|overview/.test(section)) return ['sectionTitle', 'primaryStat', 'chartArea', 'breakdownList', 'footnote']
  return fallback
}

function repeatPattern(section: string, layout: string): UIStructureSection['repeatPattern'] {
  if (/table|comparison/.test(layout) || /table|comparison/.test(section)) return 'table'
  if (/timeline|activity|history|records/.test(section)) return 'timeline'
  if (/rail|carousel/.test(layout) || /rail/.test(section)) return 'rail'
  if (/grid|bento|cards|widgets/.test(layout)) return 'grid'
  if (/list|recommendation|result|feed/.test(layout) || /list|feed|recommendation|result/.test(section)) return 'list'
  return 'none'
}

function viewportPriority(index: number): UIStructureSection['viewportPriority'] {
  if (index <= 1) return 'above-fold'
  if (index <= 3) return 'near-fold'
  return 'scroll'
}

function compositionFor(archetype: LayoutArchetype, variant: 'A' | 'B' | 'C'): string {
  if (variant === 'A') return `dense-decision:${archetype.heroPattern}:${archetype.contentPattern}`
  if (variant === 'B') return `conversion-hero:${archetype.heroPattern}:${archetype.contentPattern}`
  return `exploration-brand:${archetype.heroPattern}:${archetype.contentPattern}`
}

export function buildVariantStructures(args: {
  archetypes: Record<'A' | 'B' | 'C', LayoutArchetype>
  visualPolicies: [string, string, string]
  platform: 'mobile' | 'web'
  domain: AppDomain
  serviceSubtype?: string
  contentInventory?: {
    kpis: Array<{ label: string; value: string; meta: string }>
    quickActions: string[]
    listItems: Array<{ title: string; meta: string; value: string; badge?: string }>
    activityItems: Array<{ title: string; meta: string; value: string }>
    sectionIdeas: string[]
    requiredAboveFoldUnits: string[]
  }
  /** as-is 화면 셸 계약 — 있으면 chrome 존재/부재를 아키타입 기본값보다 우선한다 */
  shellContract?: {
    topAppBar?: { present?: boolean; title?: string; leftAction?: string; rightAction?: string }
    bottomNavigation?: { present?: boolean }
    brandLogo?: { present?: boolean }
  }
}): Record<'A' | 'B' | 'C', UIStructureIR> {
  const variants = ['A', 'B', 'C'] as const
  const isWeb = args.platform === 'web'
  const shell = args.shellContract
  const shellBottomNav = shell?.bottomNavigation?.present
  const shellBrandLogo = shell?.brandLogo?.present
  const pinnedTopAppBar = shell?.topAppBar?.present
    ? {
        title: shell.topAppBar.title ?? '',
        leftAction: shell.topAppBar.leftAction ?? 'none',
        rightAction: shell.topAppBar.rightAction ?? 'none',
      }
    : undefined
  const sideNav = isWeb && ['business', 'productivity'].includes(args.domain)

  return variants.reduce((acc, variant, variantIdx) => {
    const archetype = args.archetypes[variant]
    const policy = args.visualPolicies[variantIdx] ?? 'no-image'
    const sections = archetype.sectionRecipe.map((recipe, index): UIStructureSection => {
      const isHero = index === 0 || /hero|summary|status|search|savings|progress|photo|object/.test(recipe)
      const visual = visualForPolicy(policy, isHero)
      const layout = sectionLayout(recipe, archetype)
      return {
        id: recipe.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || `section-${index + 1}`,
        role: recipe,
        layout,
        density: archetype.density,
        visual,
        ctaPlacement: /cta|hero|summary|savings|progress|status/.test(recipe) ? (visual === 'SCENE_3D' ? 'bottom-right' : 'bottom') : 'none',
        content: sectionContent(recipe, args.contentInventory?.requiredAboveFoldUnits ?? ['title', 'meta', 'value', 'action']),
        required: index < 4,
        viewportPriority: viewportPriority(index),
        repeatPattern: repeatPattern(recipe, layout),
      }
    })

    const visualSlots = sections
      .filter(section => section.visual !== 'none')
      .map(section => ({
        id: `${section.id}-visual`,
        kind: section.visual,
        placement: section.layout,
        required: section.visual === 'HERO_3D' || section.visual === 'SCENE_3D' || section.visual === 'REAL_PHOTO',
      }))

    acc[variant] = {
      variant,
      platform: args.platform,
      archetypeId: archetype.id,
      structureSignature: [
        args.domain,
        args.serviceSubtype ?? 'general',
        variant,
        archetype.id,
        archetype.heroPattern,
        archetype.contentPattern,
        archetype.sectionRecipe.join('+'),
      ].join('::'),
      chrome: {
        topNav: true,
        // 아키타입 기본값은 mobile=하단탭바. as-is 셸 계약이 present:false면 그걸 우선한다.
        bottomNav: !isWeb && shellBottomNav !== false,
        sideNav,
        scrollArea: 'main',
        fixedChrome: true,
        contentMustScroll: true,
        brandLogo: shellBrandLogo !== false,
        ...(pinnedTopAppBar ? { topAppBar: pinnedTopAppBar } : {}),
      },
      sections,
      firstViewport: {
        composition: compositionFor(archetype, variant),
        visibleSectionIds: sections.filter(section => section.viewportPriority !== 'scroll').map(section => section.id),
        minimumDataPoints: variant === 'A' ? 14 : variant === 'B' ? 10 : 12,
        nextContentHint: true,
      },
      visualSlots,
      ctaRules: {
        primaryPlacement: visualSlots.some(slot => slot.kind === 'SCENE_3D') ? 'bottom-right' : 'bottom',
        forbidden: ['center-floating button', 'CTA covering core image subject', 'CTA inside ambiguous middle of content block'],
      },
      antiSamenessRules: [
        `Variant ${variant} must keep structureSignature distinct from the other variants.`,
        'Do not reuse the same section order as another variant.',
        'Do not use the same heroPattern and contentPattern pair as another variant.',
        'Do not solve difference with color/radius/shadow changes; difference must appear in section order, content pattern, visual role, and CTA placement.',
      ],
      responsiveRules: isWeb
        ? ['desktop starts at 1024px with grid or side navigation', 'mobile widths collapse to one column', 'do not render mobile bottom tab on desktop']
        : ['390px mobile first', 'main content scrolls under fixed/sticky chrome', 'bottom navigation/action never covers content'],
    }
    return acc
  }, {} as Record<'A' | 'B' | 'C', UIStructureIR>)
}

/** 프롬프트 주입용 — 단일 아키타입을 지시문으로 직렬화 */
export function archetypeToPrompt(a: LayoutArchetype): string {
  return [
    `이 시안의 레이아웃 아키타입: **${a.name}** (${a.id})`,
    `- 성격: ${a.description}`,
    `- 히어로: ${a.heroPattern} / 콘텐츠 골격: ${a.contentPattern} / 밀도: ${a.density}`,
    `- 섹션 순서(골격, 콘텐츠는 이 서비스에 맞게 채움): ${a.sectionRecipe.join(' → ')}`,
    `- 피할 것: ${a.forbid.join(', ')}`,
    `⚠️ 이 아키타입의 골격을 따르되, 색·간격·컴포넌트 토큰은 DESIGN.md 결정론 규칙을 그대로 유지하세요. 골격은 다르게, 정확성은 동일하게.`,
  ].join('\n')
}
