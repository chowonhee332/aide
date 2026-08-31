import type { AideGenerationPlan, AppDomain, ServiceAnalysis, VariantVisualPolicy } from './gemini'
import { assignVariantArchetypes, buildVariantStructures } from './layout-archetypes'

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
  /** analyzeAndGenerateQuestions가 추출한 서비스 구조 분석 (Phase 1-A) */
  serviceAnalysis?: ServiceAnalysis
  /** as-is 캡처에서 뽑은 화면 셸 계약 — chrome 존재/부재를 아키타입 기본값보다 우선한다 */
  shellContract?: {
    topAppBar?: { present?: boolean; title?: string; leftAction?: string; rightAction?: string }
    bottomNavigation?: { present?: boolean }
    brandLogo?: { present?: boolean }
  }
}

type PatternSelection = {
  selected: string[]
  avoid: string[]
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text))
}

/**
 * 브리프에서 랜딩 페이지 의도를 감지한다.
 * 신호: "랜딩|랜딩페이지|브랜드" + "platform=web" 또는
 *      "제품|제품 소개|제품소개|브랜드" + "platform=web" 또는
 *      "마케팅|메인 홈|공식 사이트|브랜드 사이트" 등
 */
export function detectLandingIntent(brief: string, platform: 'mobile' | 'web'): boolean {
  if (platform !== 'web') return false

  const normalized = brief.toLowerCase()
  const landingKeywords = /랜딩|landing page|brand site|브랜드 사이트|브랜드사이트|제품 소개|제품소개|브랜드 소개|마케팅 페이지|marketing site|product page|공식 (웹)?사이트|메인 홈(페이지)?|corporate site/

  return landingKeywords.test(normalized)
}

export function detectServiceSubtype(brief: string, domain: AppDomain, subtypeHint?: string): string {
  const normalized = brief.toLowerCase()
  if (includesAny(brief, [/피자|pizza|페퍼로니|주문|픽업|스탬프|피자집/])) return 'pizza-order-membership'
  // "모바일" "데이터"는 통신 전용 신호가 아니다(거의 모든 앱 브리프에 등장) → 통신 특화 단어만 남긴다
  if (includesAny(brief, [/요금제|통신사|위약금|번호이동|유심|알뜰폰|셀룰러|LTE|5G/])) return 'telco-plan-recommendation'
  if (includesAny(brief, [/포인트|쿠폰|멤버십|등급|리워드|적립|혜택/])) return 'membership-reward'
  if (includesAny(brief, [/식물|물주기|몬스테라|화분|성장|루틴/])) return 'plant-care-companion'
  if (includesAny(brief, [/물류|배송|트럭|화물|창고|배차|route|fleet/])) return 'b2b-logistics-dashboard'
  if (includesAny(brief, [/운동|헬스|피트니스|걷기|칼로리|다이어트|체중|workout|fitness|체지방/])) return 'health-fitness-tracker'
  if (includesAny(brief, [/투자|주식|펀드|수익률|포트폴리오|ETF|etf|가계부|지출|저축|절세/])) return 'fintech-investment'
  if (includesAny(brief, [/여행|항공|호텔|숙박|투어|패키지|여행지|flight|hotel|booking/])) return 'travel-booking'
  if (includesAny(brief, [/학습|강의|과제|수강|교육|공부|퀴즈|학원|curriculum/])) return 'education-learning'
  if (includesAny(brief, [/커뮤니티|피드|팔로우|소셜|채팅|게시글|댓글|feed|social/])) return 'social-community'
  if (includesAny(brief, [/쇼핑|장바구니|위시리스트|shopping|checkout|wishlist/])) return 'e-commerce-shopping'
  if (domain === 'food') return 'food-order-commerce'
  if (domain === 'commerce') return 'local-store-commerce'
  if (domain === 'business') return 'b2b-dashboard'
  // 정규식 매칭 실패 — LLM이 추출한 서비스 성격 힌트가 있으면 그걸 우선 사용 (Phase 1-B)
  const cleanHint = subtypeHint?.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  if (cleanHint && cleanHint.length >= 3) return cleanHint
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
  if (serviceSubtype === 'health-fitness-tracker') {
    return {
      selected: ['progress-ring-home', 'goal-tracker', 'activity-log', 'wellness-editorial-hero'],
      avoid: ['dense-finance-table', 'generic-storefront', 'b2b-dashboard'],
    }
  }
  if (serviceSubtype === 'fintech-investment') {
    return {
      selected: ['portfolio-dashboard', 'chart-summary', 'savings-goal', 'trust-editorial-hero'],
      avoid: ['cute-mascot-first', 'food-commerce-grid', 'bottom-tab-heavy-app'],
    }
  }
  if (serviceSubtype === 'travel-booking') {
    return {
      selected: ['destination-editorial', 'booking-flow', 'itinerary-card', 'bold-photo-hero'],
      avoid: ['dense-finance-table', 'b2b-dashboard', 'generic-storefront'],
    }
  }
  if (serviceSubtype === 'education-learning') {
    return {
      selected: ['course-progress', 'lesson-list', 'achievement-badge', 'companion-editorial'],
      avoid: ['bold-consumer-editorial', 'finance-chart-heavy', 'generic-storefront'],
    }
  }
  if (serviceSubtype === 'social-community') {
    return {
      selected: ['activity-feed', 'user-profile-card', 'community-highlight', 'editorial-hero'],
      avoid: ['b2b-dashboard', 'dense-finance-table', 'empty-landing'],
    }
  }
  if (serviceSubtype === 'e-commerce-shopping') {
    return {
      selected: ['product-grid', 'flash-sale-hero', 'category-rail', 'bold-editorial-hero'],
      avoid: ['b2b-dashboard', 'empty-landing', 'generic-finance-dashboard'],
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

  if (serviceSubtype === 'health-fitness-tracker') {
    return {
      kpis: [
        { label: '오늘 걸음 수', value: '7,842보', meta: '목표 10,000보의 78%' },
        { label: '소모 칼로리', value: '432kcal', meta: '기초대사량 포함' },
        { label: '이번 주 운동', value: '4회', meta: '목표 5회 중' },
        { label: '체중 변화', value: '-0.8kg', meta: '지난 주 대비' },
      ],
      quickActions: ['운동 시작', '식단 기록', '체중 입력', '루틴 보기', '목표 확인', '수면 기록'],
      listItems: [
        { title: '30분 유산소', meta: '오늘 11:00 · 약 200kcal', value: '시작하기', badge: '추천' },
        { title: '상체 근력 루틴', meta: '8동작 · 35분 예상', value: '루틴 보기', badge: '오늘 예정' },
        { title: '요가 스트레칭', meta: '초급 · 20분', value: '따라하기', badge: '회복' },
      ],
      activityItems: [
        { title: '어제 달리기 완료', meta: '5.2km · 32분', value: '320kcal' },
        { title: '물 섭취 알림', meta: '지금', value: '2/8잔' },
        { title: '주간 목표 달성', meta: '이번 주', value: '4/5회 완료' },
      ],
      sectionIdeas: ['오늘 활동 요약', '운동 KPI', '루틴 추천', '식단/칼로리', '주간 목표', '최근 기록'],
      requiredAboveFoldUnits: ['걸음수/칼로리/운동 횟수 KPI', '퀵 액션', '오늘 루틴 카드', '목표 달성률', '최근 활동'],
    }
  }

  if (serviceSubtype === 'fintech-investment') {
    return {
      kpis: [
        { label: '총 자산', value: '42,850,000원', meta: '전일 대비 +1.2%' },
        { label: '수익률', value: '+8.4%', meta: '연간 기준' },
        { label: '이번 달 지출', value: '324,000원', meta: '예산의 64%' },
        { label: '저축 목표', value: '72%', meta: '12월까지 달성 예정' },
      ],
      quickActions: ['입금', '출금', '투자하기', '포트폴리오', '지출 분석', '목표 설정'],
      listItems: [
        { title: '삼성전자 ETF', meta: '보유 30주 · 수익률 +12.3%', value: '2,430,000원', badge: '수익 중' },
        { title: '미국 S&P500 펀드', meta: '적립식 월 50,000원', value: '1,850,000원', badge: '자동 적립' },
        { title: '비상금 계좌', meta: '연 3.8% 이자', value: '3,000,000원', badge: '안전자산' },
      ],
      activityItems: [
        { title: '배당금 입금', meta: '오늘 09:32', value: '+12,500원' },
        { title: '자동 적립 완료', meta: 'S&P500 펀드', value: '50,000원' },
        { title: '지출 예산 알림', meta: '식비 80% 도달', value: '확인하기' },
      ],
      sectionIdeas: ['자산 현황 요약', '수익률/지출 KPI', '퀵 액션', '보유 자산 리스트', '최근 거래 내역', '목표 저축 진행'],
      requiredAboveFoldUnits: ['총 자산/수익률 KPI', '퀵 액션', '보유 종목 카드', '거래 내역', '목표 진행률'],
    }
  }

  if (serviceSubtype === 'travel-booking') {
    return {
      kpis: [
        { label: '예약 여행', value: '2건', meta: '다음 출발 D-18' },
        { label: '항공 마일리지', value: '24,500마일', meta: '왕복 1회 사용 가능' },
        { label: '적립 혜택', value: '38,000원', meta: '이번 달 예약 시' },
        { label: '인기 여행지', value: '오사카', meta: '이번 달 검색 1위' },
      ],
      quickActions: ['항공권 검색', '호텔 예약', '내 여행 확인', '마일리지 조회', '투어 패키지', '여행 기록'],
      listItems: [
        { title: '오사카 3박 4일 패키지', meta: '12/20~23 · 왕복 항공 포함', value: '348,000원', badge: '인기' },
        { title: '도쿄 비즈니스 호텔', meta: '중심부 · 조식 포함', value: '89,000원/박', badge: '추천' },
        { title: '방콕 리조트 얼리버드', meta: '30% 할인 · 잔여 3실', value: '124,000원/박', badge: '특가' },
      ],
      activityItems: [
        { title: '예약 확정', meta: '오사카 항공 · 12/20 출발', value: 'KE 723' },
        { title: '마일리지 적립', meta: '지난 여행 완료', value: '+1,200마일' },
        { title: '가격 알림 도달', meta: '도쿄 왕복 항공', value: '목표가 도달' },
      ],
      sectionIdeas: ['다가오는 여행', 'KPI 요약', '퀵 액션', '추천 상품 카드', '가격 알림', '최근 여행 기록'],
      requiredAboveFoldUnits: ['다음 여행 일정/마일리지 KPI', '퀵 액션', '추천 패키지 카드', '가격/날짜 메타', '예약 내역'],
    }
  }

  if (serviceSubtype === 'education-learning') {
    return {
      kpis: [
        { label: '오늘 학습', value: '42분', meta: '목표 60분 중 70%' },
        { label: '연속 학습', value: '12일', meta: '개인 최고 기록 도전 중' },
        { label: '완료 강의', value: '18/42', meta: '이번 과정' },
        { label: '획득 뱃지', value: '7개', meta: '이번 달 4개' },
      ],
      quickActions: ['학습 이어하기', '오늘 과제', '강의 목록', '퀴즈 풀기', '학습 기록', '목표 설정'],
      listItems: [
        { title: 'React 기초 마스터하기', meta: '3강 남음 · 23분', value: '82% 완료', badge: '진행 중' },
        { title: 'TypeScript 실전 패턴', meta: '다음 학습 추천', value: '신규', badge: '추천' },
        { title: '오늘의 퀴즈 챌린지', meta: '10문제 · 5분 예상', value: '+50포인트', badge: '오늘 마감' },
      ],
      activityItems: [
        { title: '강의 완료', meta: 'React Hooks 이해하기', value: '+15포인트' },
        { title: '연속 학습 갱신', meta: '12일째', value: '뱃지 획득' },
        { title: '과제 제출', meta: '어제 23:45', value: '검토 중' },
      ],
      sectionIdeas: ['오늘 학습 요약', '진행률 KPI', '이어하기 CTA', '추천 강의', '퀴즈/챌린지', '성취/뱃지'],
      requiredAboveFoldUnits: ['학습 시간/진행률 KPI', '이어하기 CTA', '오늘 과제/추천', '연속 학습', '최근 활동'],
    }
  }

  if (serviceSubtype === 'social-community') {
    return {
      kpis: [
        { label: '새 알림', value: '23개', meta: '읽지 않은 메시지 5개' },
        { label: '팔로워', value: '1,284명', meta: '이번 주 +48명' },
        { label: '인기 게시글', value: '342 좋아요', meta: '내 게시글 기준' },
        { label: '활동 지수', value: '상위 8%', meta: '이번 달' },
      ],
      quickActions: ['게시글 작성', '피드 보기', '채팅', '알림 확인', '프로필 편집', '검색'],
      listItems: [
        { title: '오늘의 인기 게시글', meta: '운동 루틴 공유 · 2시간 전', value: '342 좋아요', badge: '인기' },
        { title: '새 댓글 알림', meta: '내 게시글에 5개', value: '확인하기', badge: '새 알림' },
        { title: '추천 팔로우', meta: '비슷한 관심사 · 공통 친구 3명', value: '팔로우', badge: '추천' },
      ],
      activityItems: [
        { title: '내 게시글 반응', meta: '30분 전', value: '좋아요 +12' },
        { title: '새 팔로워', meta: '오늘', value: '+3명' },
        { title: '댓글 알림', meta: '오늘의 인기 게시글', value: '2개' },
      ],
      sectionIdeas: ['피드 요약', '알림/팔로워 KPI', '퀵 액션', '인기 게시글 카드', '추천 팔로우', '최근 활동'],
      requiredAboveFoldUnits: ['알림/팔로워 KPI', '퀵 액션', '인기 게시글', '추천 팔로우', '최근 활동'],
    }
  }

  if (serviceSubtype === 'e-commerce-shopping') {
    return {
      kpis: [
        { label: '장바구니', value: '5개', meta: '총 128,500원' },
        { label: '포인트', value: '3,200P', meta: '다음 주문에 사용 가능' },
        { label: '쿠폰', value: '4장', meta: '오늘 만료 1장' },
        { label: '배송 중', value: '2건', meta: '오늘 도착 예정 1건' },
      ],
      quickActions: ['장바구니', '주문 내역', '위시리스트', '쿠폰함', '배송 조회', '최근 본 상품'],
      listItems: [
        { title: '나이키 에어맥스 270', meta: '270mm · 관심 상품 할인', value: '98,000원', badge: '15% 할인' },
        { title: '스탠리 텀블러 30oz', meta: '인기 색상 · 무료배송', value: '42,000원', badge: '인기' },
        { title: '유기농 그래놀라 세트', meta: '3팩 묶음 · 리뷰 4.9', value: '24,500원', badge: '리뷰 최고' },
      ],
      activityItems: [
        { title: '배송 출발', meta: '스탠리 텀블러 · 오늘 09:14', value: '오늘 도착 예정' },
        { title: '쿠폰 만료 예정', meta: '내일까지', value: '10,000원 할인' },
        { title: '위시리스트 가격 변동', meta: '에어팟 Pro 2세대', value: '-20,000원' },
      ],
      sectionIdeas: ['장바구니 요약', '쿠폰/포인트 KPI', '퀵 액션', '추천 상품 카드', '배송 현황', '최근 본 상품'],
      requiredAboveFoldUnits: ['장바구니/쿠폰/배송 KPI', '퀵 액션', '추천 상품', '가격/할인 메타', '배송 현황'],
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

function getSubtypeComponentHints(serviceSubtype: string, domain: AppDomain): { a: string; b: string; c: string } {
  if (serviceSubtype === 'pizza-order-membership') {
    return {
      a: '스탬프 카드(격자형) + 메뉴 리스트 아이템(이름/가격/배지) × 4개 이상 + 픽업 시간 chip',
      b: '마스코트 3D 피자 오브젝트 히어로(primary 배경) + "지금 주문하기" 단일 CTA + 스탬프 현황 행',
      c: '피자 사진 2열 그리드 + 카테고리 rail(시그니처/스페셜/세트/음료) + 추천 에디토리얼 카드',
    }
  }
  if (serviceSubtype === 'telco-plan-recommendation') {
    return {
      a: '요금제 비교 카드 3개(요금/데이터/혜택 행 정렬) + 절약액 KPI + 데이터 사용량 게이지',
      b: '"월 XX원 절약" 대형 절약액 히어로 숫자 + "요금제 바꾸기" 단일 CTA + 위약금 계산 행',
      c: '사용 유형별 카테고리 rail(데이터 중심/가성비/무제한/시니어) + 라이프스타일 이미지 카드',
    }
  }
  if (serviceSubtype === 'plant-care-companion') {
    return {
      a: '화분 리스트 아이템(식물 아이콘/이름/물주기 D-Day 배지) × 5개 이상 + 오늘 물주기 요약 chip',
      b: '3D 식물/화분 오브젝트 히어로(자연 배경) + "지금 물주기 기록" 단일 CTA + 다음 일정 행',
      c: '식물 사진 2열 그리드 + 카테고리 rail(관엽/다육/허브/꽃) + 성장 일기 에디토리얼 카드',
    }
  }
  if (serviceSubtype === 'membership-reward') {
    return {
      a: '포인트/쿠폰/등급 KPI strip + 혜택 리스트 아이템(유효기간 배지 포함) × 5개 이상',
      b: '포인트 잔액 대형 KPI 히어로 + "QR 적립" 단일 CTA + 가장 가까운 혜택 행',
      c: '제휴 매장 2열 이미지 그리드 + 카테고리 rail(식품/카페/쇼핑/여가) + 큐레이션 카드',
    }
  }
  if (serviceSubtype === 'b2b-logistics-dashboard') {
    return {
      a: '배차 현황 테이블/리스트(차량번호/경로/상태 badge) × 5행 이상 + 처리량 KPI',
      b: '핵심 처리율/지연 건수 대형 KPI 히어로 + "배차 등록" 단일 CTA + 실시간 상태 행',
      c: '경로 지도 또는 권역 이미지 카드 + 카테고리 rail(권역별/차량별/상태별) + 실적 스토리',
    }
  }
  if (serviceSubtype === 'ai-productivity') {
    return {
      a: '작업 상태 리스트(우선순위/마감/담당자 배지) × 5개 이상 + AI 추천 KPI chip',
      b: 'AI 추천 강조 히어로(진행률/효과 수치) + "지금 시작" 단일 CTA + 추천 항목 행',
      c: '추천 콘텐츠/워크플로 이미지 카드 그리드 + 카테고리 rail + AI 큐레이션 에디토리얼',
    }
  }
  if (serviceSubtype === 'health-fitness-tracker') {
    return {
      a: '활동 지표 리스트(걸음수/칼로리/운동시간 gauge 배지) × 5개 이상 + 오늘 목표 KPI strip',
      b: '오늘 목표 달성률 대형 링/게이지 히어로 + "운동 시작" 단일 CTA + 다음 루틴 행',
      c: '운동 콘텐츠 2열 이미지 그리드 + 카테고리 rail(유산소/근력/요가/수면) + 성취 스토리 카드',
    }
  }
  if (serviceSubtype === 'fintech-investment') {
    return {
      a: '보유 자산 리스트(종목/수익률/평가금액 badge) × 5개 이상 + 총 자산/수익률 KPI strip',
      b: '총 자산/수익률 대형 숫자 히어로 + "투자하기" 단일 CTA + 오늘의 변동 행',
      c: '투자 테마 이미지 카드 그리드 + 카테고리 rail(국내주식/해외ETF/펀드/안전자산) + 트렌드 에디토리얼',
    }
  }
  if (serviceSubtype === 'travel-booking') {
    return {
      a: '여행 일정 리스트(목적지/날짜/상태 badge) × 5개 이상 + 마일리지/혜택 KPI strip',
      b: '목적지 대형 풍경 히어로(출발일/가격 강조) + "예약하기" 단일 CTA + 다가오는 일정 행',
      c: '여행지 사진 2열 그리드 + 카테고리 rail(국내/일본/동남아/유럽) + 큐레이션 에디토리얼 카드',
    }
  }
  if (serviceSubtype === 'education-learning') {
    return {
      a: '강의 리스트(제목/진행률/마감 badge) × 5개 이상 + 오늘 학습 시간/연속 KPI',
      b: '학습 진행률 대형 링/숫자 히어로 + "이어 학습하기" 단일 CTA + 오늘 과제 행',
      c: '추천 강의 2열 이미지 카드 그리드 + 카테고리 rail(개발/디자인/비즈니스/언어) + 에디토리얼 카드',
    }
  }
  if (serviceSubtype === 'social-community') {
    return {
      a: '피드 리스트 아이템(작성자/시간/좋아요 badge) × 5개 이상 + 알림/팔로워 KPI strip',
      b: '인기 게시글 히어로(좋아요 수 강조) + "게시글 작성" 단일 CTA + 추천 팔로우 행',
      c: '게시글/미디어 2열 그리드 + 카테고리 rail(인기/팔로잉/추천/최신) + 에디토리얼 피처 카드',
    }
  }
  if (serviceSubtype === 'e-commerce-shopping') {
    return {
      a: '상품 리스트 아이템(이름/가격/할인율/재고 badge) × 5개 이상 + 장바구니/쿠폰 KPI strip',
      b: '히어로 상품 이미지(할인율 강조) + "구매하기" 단일 CTA + 쿠폰/무료배송 혜택 행',
      c: '상품 사진 2열 그리드 + 카테고리 rail(인기/신상/세일/브랜드) + 에디토리얼 큐레이션 카드',
    }
  }
  // domain-level fallback
  if (domain === 'business') {
    return {
      a: 'KPI 테이블/차트 행 × 5개 이상 + 상태 badge + 필터 row',
      b: '핵심 KPI 대형 숫자 히어로 + 핵심 액션 CTA + 차트/지표 행',
      c: '팀 활동·하이라이트 이미지 카드 그리드 + 섹션 탐색 nav',
    }
  }
  if (domain === 'food') {
    return {
      a: '메뉴/가게 리스트 아이템(이름/가격/별점/시간 배지) × 5개 이상 + 필터 chip row',
      b: '대표 메뉴 이미지 히어로(가격 강조) + "주문하기" 단일 CTA + 인기 아이템 행',
      c: '음식 사진 2열 그리드 + 카테고리 rail + 추천 에디토리얼 카드',
    }
  }
  if (domain === 'health') {
    return {
      a: '건강 지표 리스트(목표량/달성률 gauge) × 5개 이상 + 오늘 요약 KPI',
      b: '오늘 목표 달성률 대형 히어로(링/게이지) + "운동 시작" 단일 CTA + 루틴 행',
      c: '웰니스 이미지 카드 그리드 + 카테고리 rail(운동/식단/수면/명상) + 성취 스토리',
    }
  }
  if (domain === 'commerce') {
    return {
      a: '상품 리스트 아이템(이름/가격/할인율/재고 배지) × 5개 이상 + 필터/정렬 row',
      b: '대표 상품 이미지 히어로(할인율 강조) + "구매하기" 단일 CTA + 혜택 행',
      c: '상품 사진 2열 그리드 + 카테고리 rail + 큐레이션 에디토리얼',
    }
  }
  return {
    a: '핵심 지표/상태 리스트 아이템 × 5개 이상 + 퀵 액션 버튼 행',
    b: '핵심 메시지/수치 히어로 + 단일 CTA + 보조 정보 행',
    c: '콘텐츠/추천 이미지 카드 2열 그리드 + 카테고리 rail',
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
  const componentHints = getSubtypeComponentHints(serviceSubtype, domain)
  const sharedMustShow = [
    ...contentInventory.kpis.map(item => `${item.label}: ${item.value}`),
    ...contentInventory.quickActions,
    ...contentInventory.listItems.map(item => item.title),
    ...contentInventory.activityItems.map(item => item.title),
  ]
  return {
    A: {
      strategy: needsScene3d ? 'Contextual 3D Scene Home' : 'Dense Utility Home',
      screenPattern: needsScene3d ? 'scene-3d-overview' : 'data-first-dashboard',
      heroPolicy: needsScene3d ? 'scene-3d' : 'no-image',
      mustShow: sharedMustShow,
      shouldAvoid: ['old game render', 'generic 3D stock render', 'oversized empty hero', 'same card order as B/C'],
      layoutRhythm: [
        '히어로 없거나 최소(화면 25% 이하). B보다 히어로가 작아야 한다',
        '첫 뷰포트에 서비스 핵심 정보를 최대한 많이(B/C보다 아이템 수 많게)',
        '카드/행 gap: 20px, 내부 padding: 16-20px',
        '섹션별 소제목 + 데이터가 반복되는 리스트 구조 (B의 히어로 집중, C의 이미지 집중과 대비)',
        '색상·타입·카드는 DESIGN.md 그대로 사용하되, 레이아웃 밀도만 다름',
        `[이 서비스의 A안 컴포넌트] ${componentHints.a}`,
      ],
    },
    B: {
      strategy: 'Creon Object 3D Conversion Home',
      screenPattern: serviceSubtype === 'pizza-order-membership' ? 'mascot-companion commerce hero' : 'object-stage recommendation hero',
      heroPolicy: 'creon-object-3d',
      mustShow: sharedMustShow,
      shouldAvoid: ['tiny sticker 3D', 'floating object without content', 'hero-only poster', 'sparse content below hero', 'same information grouping as A/C'],
      layoutRhythm: [
        '히어로 패널이 화면의 35-45%를 차지. A/C보다 히어로가 커야 하지만 45% 초과 금지 — 콘텐츠 공간 확보 필수',
        '3D 오브젝트가 히어로의 핵심 비주얼. 작은 스티커처럼 쓰면 실패',
        'CTA 1개가 히어로 바로 아래에 단독으로 위치. 시선 경쟁 없음',
        '히어로 아래 콘텐츠 밀도는 A/C와 동일해야 한다 — 3D 히어로가 있어도 데이터 포인트 10개 이상, 콘텐츠 덩어리 4개 이상',
        '히어로 아래 섹션은 이 서비스의 coreObjects/keyDataPoints에서 도출하라 — 결정을 돕는 핵심 수치/혜택, 추천/비교, 관련 액션, 최근 활동 중 서비스에 맞는 것을 골라 배치(고정 순서 강제 아님). 각 아이템엔 제목+수치+배지를 채운다',
        '각 섹션은 제목+설명+실제 아이템/수치를 반드시 포함. 제목만 있는 빈 섹션은 실패',
        `[이 서비스의 B안 컴포넌트] ${componentHints.b}`,
      ],
    },
    C: {
      strategy: 'Photo Editorial Service Home',
      screenPattern: cScreenPattern,
      heroPolicy: 'real-photo',
      mustShow: sharedMustShow,
      shouldAvoid: ['photo everywhere', 'random Unsplash thumbnails', 'same white card stack as A/B', 'B2B over-dramatic hero if service is operational'],
      layoutRhythm: [
        '실사 히어로가 화면 35-45%. A보다 크고 감성적, B처럼 3D는 없음',
        '카드 면적의 50% 이상이 이미지 영역. A의 텍스트 리스트, B의 오브젝트와 대비됨',
        '탐색 구조 필수: 가로 스크롤 카테고리 또는 2열 이미지 그리드 중 하나 이상',
        '카드 gap: 20px, 카드 내부 padding: 16-20px',
        '수치/상태보다 이미지·무드·스토리가 앞선다. 숫자는 보조 역할',
        `[이 서비스의 C안 컴포넌트] ${componentHints.c}`,
      ],
    },
  }
}

const SUBTYPE_SCREENS: Record<string, Array<{ id: string; label: string; purpose: string }>> = {
  'fintech-investment': [
    { id: 'screen-portfolio', label: '포트폴리오', purpose: '보유 종목, 수익률, 자산 현황, 매수/매도 버튼' },
    { id: 'screen-market', label: '시장', purpose: '종목 검색, 관심 종목, 시세, 시장 동향' },
    { id: 'screen-history', label: '거래내역', purpose: '매수/매도 이력, 수익 실현 내역, 배당 내역' },
    { id: 'screen-profile', label: '마이', purpose: '계좌 설정, 투자 성향, 목표 저축, 알림 설정' },
  ],
  'travel-booking': [
    { id: 'screen-explore', label: '탐색', purpose: '여행지 추천, 테마 탐색, 특가 항공, 인기 패키지' },
    { id: 'screen-plan', label: '내 여행', purpose: '예약 목록, 다가오는 일정, D-day 카운트, 체크리스트' },
    { id: 'screen-budget', label: '경비', purpose: '예산 대비 지출, 결제 내역, 환율 계산' },
    { id: 'screen-profile', label: '마이', purpose: '여권 정보, 쿠폰/마일리지, 여행 기록, 알림' },
  ],
  'health-fitness-tracker': [
    { id: 'screen-activity', label: '활동', purpose: '걸음수, 칼로리, 운동 시간, 활동 지도' },
    { id: 'screen-routine', label: '루틴', purpose: '오늘의 루틴, 운동 영상, 세트/반복 기록' },
    { id: 'screen-diet', label: '식단', purpose: '식단 기록, 영양소 분석, 식품 검색' },
    { id: 'screen-profile', label: '마이', purpose: '목표 설정, 성취 뱃지, 주간 통계, 알림 설정' },
  ],
  'education-learning': [
    { id: 'screen-courses', label: '강의', purpose: '수강 중인 강의 목록, 진도율, 이어하기 CTA' },
    { id: 'screen-explore', label: '탐색', purpose: '카테고리별 강의 탐색, 추천 강의, 신규 강의' },
    { id: 'screen-quiz', label: '퀴즈', purpose: '오늘의 퀴즈, 챌린지, 복습 문제, 점수 확인' },
    { id: 'screen-profile', label: '마이', purpose: '학습 통계, 성취 뱃지, 수료증, 알림 설정' },
  ],
  'social-community': [
    { id: 'screen-feed', label: '피드', purpose: '팔로잉 게시글, 인기 게시글, 좋아요/댓글 반응' },
    { id: 'screen-explore', label: '탐색', purpose: '트렌딩 해시태그, 추천 계정, 카테고리 탐색' },
    { id: 'screen-messages', label: '메시지', purpose: '1:1 채팅, 그룹 채팅, 읽지 않은 메시지' },
    { id: 'screen-profile', label: '마이', purpose: '내 게시글, 팔로워/팔로잉, 설정, 알림' },
  ],
  'e-commerce-shopping': [
    { id: 'screen-category', label: '카테고리', purpose: '상품 카테고리 탐색, 필터/정렬, 상품 그리드' },
    { id: 'screen-wishlist', label: '위시리스트', purpose: '관심 상품 목록, 가격 변동 알림, 빠른 담기' },
    { id: 'screen-cart', label: '장바구니', purpose: '담긴 상품, 쿠폰 적용, 배송비 계산, 결제' },
    { id: 'screen-profile', label: '마이', purpose: '주문 내역, 배송 조회, 쿠폰함, 포인트' },
  ],
  'pizza-order-membership': [
    { id: 'screen-menu', label: '메뉴', purpose: '전체 메뉴 탐색, 카테고리 필터, 메뉴 상세, 장바구니 담기' },
    { id: 'screen-order', label: '주문하기', purpose: '장바구니 확인, 픽업 시간 선택, 쿠폰 적용, 결제' },
    { id: 'screen-membership', label: '멤버십', purpose: '스탬프 현황, 등급 혜택, 사용 가능 쿠폰, 적립 내역' },
    { id: 'screen-profile', label: '마이', purpose: '주문 내역, 즐겨찾기 메뉴, 알림 설정, 고객센터' },
  ],
  'membership-reward': [
    { id: 'screen-benefits', label: '혜택', purpose: '사용 가능 쿠폰, 임박 혜택, 제휴 할인 카드' },
    { id: 'screen-partners', label: '제휴', purpose: '제휴 매장 지도/목록, 카테고리별 탐색, 거리 정렬' },
    { id: 'screen-history', label: '내역', purpose: '포인트 적립/사용 내역, 쿠폰 사용 이력' },
    { id: 'screen-profile', label: '마이', purpose: '등급 현황, 미션 목록, 알림 설정' },
  ],
  'telco-plan-recommendation': [
    { id: 'screen-compare', label: '요금제 비교', purpose: '요금제 카드 3개 비교, 데이터/통화/요금 행 정렬' },
    { id: 'screen-usage', label: '사용량', purpose: '데이터/통화 사용량 분석, 월별 추이 차트' },
    { id: 'screen-benefits', label: '혜택', purpose: '번호이동 혜택, 제휴 쿠폰, 단말기 지원금' },
    { id: 'screen-profile', label: '마이', purpose: '현재 약정 현황, 위약금 계산, 상담 예약, 설정' },
  ],
  'plant-care-companion': [
    { id: 'screen-plants', label: '내 식물', purpose: '식물 목록, 물주기 D-Day, 개별 식물 상태' },
    { id: 'screen-calendar', label: '캘린더', purpose: '물주기/분갈이 일정, 루틴 관리, 알림 설정' },
    { id: 'screen-diary', label: '성장일기', purpose: '사진 기록, 메모, 성장 타임라인' },
    { id: 'screen-profile', label: '마이', purpose: '내 식물 통계, 레벨/뱃지, 커뮤니티, 설정' },
  ],
  'b2b-logistics-dashboard': [
    { id: 'screen-dispatch', label: '배차', purpose: '배차 현황 목록, 실시간 위치, 배차 등록 CTA' },
    { id: 'screen-routes', label: '경로', purpose: '경로 지도, 권역별 현황, 최적 경로 추천' },
    { id: 'screen-reports', label: '실적', purpose: '일별/주별 처리량, KPI 차트, 지연/완료 통계' },
    { id: 'screen-settings', label: '설정', purpose: '팀 관리, 알림 설정, 계정 정보' },
  ],
  'b2b-dashboard': [
    { id: 'screen-overview', label: '대시보드', purpose: '핵심 KPI 카드, 팀 활동 현황, 최근 알림' },
    { id: 'screen-projects', label: '프로젝트', purpose: '진행 중인 프로젝트 목록, 마일스톤, 담당자' },
    { id: 'screen-reports', label: '리포트', purpose: '데이터 차트, 기간별 분석, 다운로드' },
    { id: 'screen-settings', label: '설정', purpose: '팀 멤버, 권한, 알림, 계정 설정' },
  ],
}

const SUBTYPE_STRATEGY_MAP: Record<string, Record<'A' | 'B' | 'C', string>> = {
  'fintech-investment':      { A: 'Practical Dashboard', B: 'Minimal Premium',   C: 'Editorial Story' },
  'health-fitness-tracker':  { A: 'Practical Dashboard', B: 'Gamified Quest',     C: 'Editorial Story' },
  'travel-booking':          { A: 'Practical Dashboard', B: 'Immersive Hero Scene', C: 'Editorial Story' },
  'education-learning':      { A: 'Practical Dashboard', B: 'Gamified Quest',     C: 'Mascot Companion' },
  'social-community':        { A: 'Challenge Social',    B: 'Editorial Story',    C: 'Mascot Companion' },
  'e-commerce-shopping':     { A: 'Practical Dashboard', B: 'Reward Store First', C: 'Immersive Hero Scene' },
  'pizza-order-membership':  { A: 'Reward Store First',  B: 'Mascot Companion',   C: 'Editorial Story' },
  'membership-reward':       { A: 'Practical Dashboard', B: 'Reward Store First', C: 'Editorial Story' },
  'telco-plan-recommendation': { A: 'Practical Dashboard', B: 'Minimal Premium', C: 'Editorial Story' },
  'plant-care-companion':    { A: 'Practical Dashboard', B: 'Mascot Companion',   C: 'Editorial Story' },
  'b2b-logistics-dashboard': { A: 'Practical Dashboard', B: 'Minimal Premium',   C: 'Editorial Story' },
  'b2b-dashboard':           { A: 'Practical Dashboard', B: 'Minimal Premium',   C: 'Editorial Story' },
}

// 도메인별 기본 A/B/C 전략 — SUBTYPE_STRATEGY_MAP에 없는 동적 서브타입의 베이스로 사용
const DOMAIN_DEFAULT_STRATEGY: Record<AppDomain, Record<'A' | 'B' | 'C', string>> = {
  finance:       { A: 'Practical Dashboard', B: 'Minimal Premium',      C: 'Editorial Story' },
  commerce:      { A: 'Practical Dashboard', B: 'Reward Store First',    C: 'Immersive Hero Scene' },
  health:        { A: 'Practical Dashboard', B: 'Gamified Quest',        C: 'Editorial Story' },
  food:          { A: 'Reward Store First',  B: 'Immersive Hero Scene',  C: 'Editorial Story' },
  productivity:  { A: 'Practical Dashboard', B: 'Minimal Premium',       C: 'Challenge Social' },
  social:        { A: 'Challenge Social',    B: 'Editorial Story',        C: 'Mascot Companion' },
  travel:        { A: 'Practical Dashboard', B: 'Immersive Hero Scene',  C: 'Editorial Story' },
  education:     { A: 'Practical Dashboard', B: 'Gamified Quest',        C: 'Mascot Companion' },
  entertainment: { A: 'Practical Dashboard', B: 'Immersive Hero Scene',  C: 'Editorial Story' },
  business:      { A: 'Practical Dashboard', B: 'Minimal Premium',       C: 'Editorial Story' },
  other:         { A: 'Practical Dashboard', B: 'Minimal Premium',       C: 'Editorial Story' },
}

/**
 * 적응형 A/B/C 전략 결정 (Phase 3-A).
 * 서브타입 정적 매핑 → 도메인 기본값 순으로 base를 잡고,
 * variant_strategy / first_screen_focus 답변으로 강화 방향을 미세 조정한다.
 */
export function resolveRecommendedStrategy(
  serviceSubtype: string,
  domain: AppDomain,
  answers: Record<string, string | string[]>,
): Record<'A' | 'B' | 'C', string> {
  const base = { ...(SUBTYPE_STRATEGY_MAP[serviceSubtype] ?? DOMAIN_DEFAULT_STRATEGY[domain] ?? DOMAIN_DEFAULT_STRATEGY.other) }
  const variantStrategy = typeof answers['variant_strategy'] === 'string' ? answers['variant_strategy'] : ''
  const firstScreenFocus = typeof answers['first_screen_focus'] === 'string' ? answers['first_screen_focus'] : ''

  // variant_strategy 답변에 따라 해당 시안의 전략을 강화 방향으로 고정
  if (variantStrategy.includes('정보형')) base.A = 'Practical Dashboard'
  else if (variantStrategy.includes('전환형')) base.B = base.B === 'Practical Dashboard' ? 'Minimal Premium' : base.B
  else if (variantStrategy.includes('탐색형')) base.C = base.C === 'Practical Dashboard' ? 'Editorial Story' : base.C

  // first_screen_focus가 CTA/실행 중심이면 B를 전환형으로, 이미지/카드 중심이면 C를 탐색형으로 보강
  if (/CTA|빠른|실행|주문|송금|시작/.test(firstScreenFocus) && base.B === 'Practical Dashboard') base.B = 'Minimal Premium'
  if (/카드|이미지|추천|콘텐츠|탐색/.test(firstScreenFocus) && base.C === 'Practical Dashboard') base.C = 'Editorial Story'

  return base
}

export function buildDesignIntelligencePlan(input: DesignIntelligenceInput): {
  generationPlan: AideGenerationPlan
  visualPolicies: [VariantVisualPolicy, VariantVisualPolicy, VariantVisualPolicy]
  sharedVisualSubject: string
} {
  const serviceSubtype = detectServiceSubtype(input.brief, input.domain, input.serviceAnalysis?.serviceSubtypeHint)
  const patternSelection = selectReferencePatterns(serviceSubtype, input.domain)
  const baseInventory = buildIntelligentContentInventory(input.brief, input.domain, serviceSubtype)
  // P3: AI가 생성한 서비스별 실제 콘텐츠(contentSeed)를 우선 사용하고, 부족한 길이는 템플릿으로 패딩.
  // → "telco면 늘 KT 7GB+ 16,900원" 같은 하드코딩 더미 대신 이 브리프에 맞는 콘텐츠가 나온다.
  const seed = input.serviceAnalysis?.contentSeed
  const seededInventory = seed
    ? {
        // kpis는 variantBriefsFor가 [0..3]을 참조하므로 최소 4개 보장 (seed 우선 + 템플릿 패딩)
        kpis: [...seed.kpis, ...baseInventory.kpis].slice(0, Math.max(4, seed.kpis.length)),
        quickActions: [...new Set([...seed.quickActions, ...baseInventory.quickActions])],
        listItems: [...seed.listItems, ...baseInventory.listItems],
        activityItems: [...seed.activityItems, ...baseInventory.activityItems],
        sectionIdeas: baseInventory.sectionIdeas,
        requiredAboveFoldUnits: baseInventory.requiredAboveFoldUnits,
      }
    : baseInventory
  // serviceAnalysis.keyDataPoints로 requiredAboveFoldUnits 보강 (불변 갱신)
  const analysisDataPoints = input.serviceAnalysis?.keyDataPoints ?? []
  const contentInventory = analysisDataPoints.length > 0
    ? {
        ...seededInventory,
        requiredAboveFoldUnits: [...new Set([...analysisDataPoints, ...seededInventory.requiredAboveFoldUnits])].slice(0, 12),
      }
    : seededInventory
  const sharedVisualSubject = input.heroSubject || input.projectSummary
  // A 시안에 scene-3d를 허용하는 서브타입: 마스코트/동반자 중심 앱만.
  // 그 외 서비스에서 A까지 scene-3d가 되면 B(creon-object-3d)와 구분이 없어진다.
  const SCENE_FIRST_SUBTYPES = new Set(['plant-care-companion', 'pizza-order-membership'])
  // 축 3: AI가 판단한 히어로 비주얼 종류로 도메인 적합성 반영.
  // 'data'(금융·통신요금제·B2B 등)는 무관한 스톡 사진을 강제하지 않는다.
  const heroVisualType = input.serviceAnalysis?.heroVisualType
  const hasHeroSubject = Boolean(input.serviceAnalysis?.heroVisualSubject || input.heroSubject)
  // B: data 서비스이면서 쓸 3D 소재조차 없으면 데이터 중심(no-image)으로, 그 외엔 Creon 3D 오브젝트
  const bPolicy: VariantVisualPolicy = (heroVisualType === 'data' && !hasHeroSubject) ? 'no-image' : 'creon-object-3d'
  // C: data 서비스에는 무관한 실사 사진 대신 no-image(에디토리얼·데이터 탐색형), 그 외엔 실사 이미지
  const cPolicy: VariantVisualPolicy = heroVisualType === 'data' ? 'no-image' : 'real-photo'
  const visualPolicies: [VariantVisualPolicy, VariantVisualPolicy, VariantVisualPolicy] = [
    (input.needsScene3d && SCENE_FIRST_SUBTYPES.has(serviceSubtype)) ? 'scene-3d' : 'no-image',
    bPolicy,
    cPolicy,
  ]
  const variantBriefs = variantBriefsFor(input.needsScene3d, serviceSubtype, input.domain, contentInventory)
  const componentHints = getSubtypeComponentHints(serviceSubtype, input.domain)
  const isLandingIntent = detectLandingIntent(input.brief, input.platform)
  const variantArchetypes = assignVariantArchetypes(input.brief, input.domain, isLandingIntent)
  const variantStructures = buildVariantStructures({
    archetypes: variantArchetypes,
    visualPolicies,
    platform: input.platform,
    domain: input.domain,
    serviceSubtype,
    contentInventory,
    shellContract: input.shellContract,
    isLandingIntent,
  })

  return {
    sharedVisualSubject,
    visualPolicies,
    generationPlan: {
      referenceSearchKeyword: serviceSubtype.replace(/-/g, ' ') + ' mobile app UI',
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
        // LLM 분석 coreObjects 우선, 없으면 도메인/서브타입 기본값 (Phase 1-B)
        coreObjects: (input.serviceAnalysis?.coreObjects && input.serviceAnalysis.coreObjects.length > 0)
          ? input.serviceAnalysis.coreObjects
          : buildCoreObjects(input.domain, serviceSubtype),
        keyActions: buildKeyActions(serviceSubtype),
        successCriteria: ['첫 화면에서 서비스 목적이 즉시 이해됨', '주요 CTA가 명확함', '반복 콘텐츠가 실제 서비스처럼 충분함', '선택한 design.md 리듬을 유지함'],
        assumptions: ['입력이 부족한 부분은 서비스 subtype과 도메인 표준 홈 화면으로 보정', 'A/B/C는 동일한 콘텐츠를 유지하고 구조·위계·비주얼 표현만 다른 UX 방향으로 차별화'],
      },
      contentInventory,
      visualStrategy: {
        mode: input.needsScene3d ? '3d' : 'data',
        sharedAsset: false,
        subject: sharedVisualSubject,
        reason: 'A=no-image data-first B=Creon-style transparent HERO_3D C=real-photo',
        usageByVariant: {
          A: '이미지 없음 — 데이터·수치·KPI·카드로만 화면을 채운다',
          B: 'Creon식 단일 3D 오브젝트 (%%HERO_3D%%) — 배경 없는 오브젝트를 작지 않은 hero/card visual zone에 배치',
          C: '실사 이미지 (%%IMG_1:keyword%%) — 기본적으로 C안 히어로에서만 과감하게 사용하고 하위 이미지는 분석 결과에 따라 선택',
        },
      },
      variantDirector: {
        A: {
          strategy: variantBriefs.A.strategy,
          layoutRole: '정보 밀도 최대화 — B/C보다 작은 히어로(또는 없음), 더 많은 아이템을 첫 화면에 노출',
          componentSpec: componentHints.a,
          firstViewport: variantBriefs.A.mustShow,
          mustDifferBy: variantBriefs.A.layoutRhythm,
        },
        B: {
          strategy: variantBriefs.B.strategy,
          layoutRole: '전환 집중 — 화면 35-45%를 차지하는 대형 히어로 + 단일 CTA. 히어로 아래는 A/C와 동일한 정보 밀도로 채워야 함',
          componentSpec: componentHints.b,
          firstViewport: variantBriefs.B.mustShow,
          mustDifferBy: variantBriefs.B.layoutRhythm,
        },
        C: {
          strategy: variantBriefs.C.strategy,
          layoutRole: input.domain === 'business'
            ? '신뢰형 실사/visual panel과 업무 정보를 연결'
            : '탐색·분위기 우선 — 이미지가 카드 면적 50% 이상, A의 조밀함·B의 단일 집중과 달리 둘러보는 경험',
          componentSpec: componentHints.c,
          firstViewport: variantBriefs.C.mustShow,
          mustDifferBy: variantBriefs.C.layoutRhythm,
        },
      },
      // 사용자의 실제 서비스 IA를 우선하고, 분석 결과가 없을 때만 정적 서브타입 패턴을 사용한다.
      expectedSubScreens: input.serviceAnalysis?.informationArchitecture && input.serviceAnalysis.informationArchitecture.length > 0
        ? input.serviceAnalysis.informationArchitecture
        : SUBTYPE_SCREENS[serviceSubtype],
      // 적응형 전략 (Phase 3-A): 서브타입 매핑 + 도메인 기본 + 답변 기반 조정
      recommendedStrategy: resolveRecommendedStrategy(serviceSubtype, input.domain, input.answers),
      // 레이아웃 아키타입 배정 — A/B/C가 서로 다른 골격 + 서비스마다 다른 조합 (다양성)
      variantArchetypes,
      // HTML 생성 전 구조 IR — chrome/scroll/section/visual/CTA 위치를 먼저 고정한다.
      variantStructures,
    },
  }
}
