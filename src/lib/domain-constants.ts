export type AppDomain = 'finance' | 'commerce' | 'health' | 'food' | 'productivity' | 'social' | 'travel' | 'education' | 'entertainment' | 'business' | 'other';

export const DOMAIN_KEY_TO_LABEL: Record<AppDomain, string> = {
  finance: '금융/결제',
  commerce: '쇼핑/커머스',
  health: '헬스/의료',
  food: '음식/배달',
  productivity: '업무/생산성',
  social: 'SNS/커뮤니티',
  travel: '여행/숙박',
  education: '교육/학습',
  entertainment: '엔터테인먼트',
  business: '비즈니스/SaaS',
  other: '기타',
}

export const DOMAIN_LABEL_TO_KEY: Record<string, AppDomain> = Object.fromEntries(
  Object.entries(DOMAIN_KEY_TO_LABEL).map(([k, v]) => [v, k as AppDomain])
)

export const DOMAIN_HOME_EMPHASIS_OPTIONS: Record<AppDomain, string[]> = {
  finance:       ['잔액·자산 현황 (계좌·포트폴리오)', '빠른 송금·결제 (CTA)', '거래 내역·히스토리', '투자 수익·KPI 지표'],
  commerce:      ['상품 탐색·추천 (카드 그리드)', '프로모션·할인 배너 (히어로)', '빠른 검색·카테고리 필터', '최근 본 상품·관심 목록'],
  health:        ['오늘의 건강 지표 (걸음·심박수)', '예약·일정 관리', '건강 정보·가이드 콘텐츠', '빠른 상담·긴급 CTA'],
  food:          ['빠른 주문·검색 (CTA)', '추천 메뉴·가게 카드', '프로모션·쿠폰 배너', '최근 주문·히스토리'],
  productivity:  ['오늘 할 일·Task 목록', '팀 현황·KPI 대시보드', '최근 문서·활동 히스토리', '빠른 새 작업 생성 (CTA)'],
  social:        ['최신 피드·타임라인', '인기 콘텐츠·트렌딩', '알림·인터랙션 현황', '빠른 글쓰기·업로드 (CTA)'],
  travel:        ['여행지·숙소 탐색 (카드 그리드)', '빠른 검색·예약 CTA', '특가·프로모션 배너', '내 여행 일정·히스토리'],
  education:     ['학습 진도·성취 현황 (KPI)', '강의·콘텐츠 탐색 (카드)', '오늘의 학습 과제 (CTA)', '최근 학습 기록'],
  entertainment: ['추천 콘텐츠·피드 (카드 그리드)', '인기·트렌딩 섹션', '빠른 재생·시작 (CTA)', '최근 시청·활동 히스토리'],
  business:      ['핵심 지표·KPI 대시보드', '팀 활동·워크스페이스 현황', '빠른 실행·새 프로젝트 (CTA)', '최근 작업·히스토리'],
  other:         ['핵심 지표·KPI (숫자·대시보드)', '콘텐츠 탐색·피드 (리스트·카드)', '빠른 실행·CTA (버튼·검색)', '최근 활동·히스토리'],
}
