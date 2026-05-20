import type { AppDomain } from './gemini';

// 3 invariant design philosophy axes — always structurally different regardless of domain
// A: 정밀 정보형 — white bg, numbers dominate, color used sparingly
// B: 임팩트 히어로형 — primary-color hero card, massive KPI, chart-forward
// C: 감성 브랜드형 — mood/image/whitespace as hero, warm brand expression

type DomainContext = {
  a: string; // 정밀 정보형 context
  b: string; // 임팩트 히어로형 context
  c: string; // 감성 브랜드형 context
};

const DOMAIN_CONTEXT: Record<AppDomain, DomainContext> = {
  finance: {
    a: '토스·뱅크샐러드처럼: 잔액·거래내역 숫자가 화면을 지배하고, 컬러는 프라이머리 버튼 1개에만 제한. 테이블형 리스트, 날짜/금액 정렬 강조.',
    b: '로빈후드·미래에셋처럼: 수익률 숫자 72px/900w로 히어로 카드 가득 채우기. 실시간 차트가 히어로 카드 하단에 바로 이어짐. 상승=green, 하락=red 강조.',
    c: '카카오페이·N26처럼: 돈보다 "목표/꿈" 중심 감성 카피 + 일러스트/3D 에셋. 저금통·목표 카드에 따뜻한 그라데이션, 달성률은 링 애니메이션으로 표현.',
  },
  commerce: {
    a: '무신사·쿠팡처럼: 상품 리스트를 조밀한 그리드로 빠르게 스캔. 가격·할인율 14px bold, 필터·정렬 탭이 sticky. 카드에 그림자 대신 border 라인.',
    b: '나이키·발렌시아가처럼: 대형 제품 이미지가 히어로 카드 전체 차지, 가격 64px white bold. 구매 CTA가 히어로 카드 내 전폭 버튼으로.',
    c: '29CM·오늘의집처럼: 무드 있는 라이프스타일 이미지 우선, 제품명보다 스토리 카피. 파스텔/어스톤 컬러, 넉넉한 여백, 에디토리얼 레이아웃.',
  },
  health: {
    a: '삼성헬스·애플 피트니스처럼: 걸음수·칼로리·운동 시간 숫자 크게, 링/바 차트 중심. 컬러는 목표 달성 시 accent 1개에만. 주간 통계 라인 차트.',
    b: '스트라바·나이키런처럼: 오늘의 운동 기록 72px/900w로 히어로. 지도 궤적 또는 페이스 차트가 히어로 카드 배경. 퍼스널베스트 뱃지 강조.',
    c: '캄·헤드스페이스처럼: 자연/힐링 이미지가 상단 전폭, 감성 카피("오늘도 잘 하고 있어요"). 부드러운 퍼플·민트 그라데이션, 숫자보다 감정 중심.',
  },
  food: {
    a: '배달의민족·쿠팡이츠처럼: 카테고리 칩 + 가게 리스트 조밀하게. 배달시간·별점·최소주문금액 한 줄에 정보 밀도 높게. 필터 항상 노출.',
    b: '도미노피자·맘스터치처럼: 메인 메뉴 대형 이미지가 히어로 전폭, 가격 64px white bold. "지금 주문" CTA 히어로 내 전폭 버튼. 한정/추천 뱃지 강조.',
    c: '마켓컬리·오이식스처럼: 신선한 식재료 모습·식탁 무드샷 에디토리얼. 초록·흙빛 어스톤, 생산자 스토리 카드, 넉넉한 여백.',
  },
  productivity: {
    a: '노션·리니어처럼: 작업 리스트 조밀한 표 형태, 상태·우선순위·담당자 컬럼 명확. 사이드바 네비게이션, 모든 요소 grid-aligned. 컬러는 상태 뱃지에만.',
    b: '지라·아사나 대시보드처럼: 이번 주 완료/잔여 태스크 숫자 72px 히어로. 번다운 차트가 바로 아래, 팀 진척률 게이지 바. 빨강/초록 진척 강조.',
    c: '비헨스·피그마처럼: 프로젝트 썸네일 대형 그리드, 색감 있는 커버 이미지 중심. 크리에이티브 도구 특유의 다크 bg 또는 컬러풀한 카드.',
  },
  social: {
    a: '트위터·스레드처럼: 텍스트 피드 조밀하게, 좋아요·리트윗·댓글 수 small bold. 시간순 리스트, 프로필 아바타 36px 좌측 고정.',
    b: '인스타그램 리얼스·틱톡처럼: 콘텐츠가 화면 전체(full-bleed), 좋아요·팔로우 숫자 white bold 오버레이. 세로 스크롤 풀스크린 카드.',
    c: '비리얼·폴라로이드처럼: 자연스러운 일상 사진 중심, 날짜 타임스탬프 손글씨체, 따뜻한 필름 톤 필터감.',
  },
  travel: {
    a: '카약·스카이스캐너처럼: 항공편/숙소 리스트 비교표. 가격·시간·경유 정보 조밀하게. 필터·정렬 항상 노출, 최저가 강조 accent.',
    b: '에어비앤비 체험·클룩처럼: 목적지 대형 이미지가 히어로 전폭, 가격 64px white bold. "지금 예약" CTA 히어로 내 전폭 버튼. 후기 별점 강조.',
    c: '에어비앤비 홈·부킹닷컴처럼: 여행지 무드 사진 에디토리얼, "어디든 갈 수 있어요" 감성 카피. 여름/겨울 시즌 그라데이션, 여백 넉넉.',
  },
  education: {
    a: '클래스101·인프런처럼: 강좌 리스트 카드 그리드, 수강생 수·별점·가격 한 줄. 진도율 바, 이수 뱃지 강조. 카테고리 탭 sticky.',
    b: '듀오링고처럼: 오늘의 목표 달성률 72px 히어로, 연속 학습 스트릭 숫자 크게. 경험치 바, 리더보드 순위 강조. 브랜드 primary로 가득 찬 히어로.',
    c: '마스터클래스처럼: 강사 시네마틱 사진 전폭 히어로, 감성 카피 "배움의 격을 높이다". 다크 bg + 골드 accent, 에디토리얼 강사 소개.',
  },
  entertainment: {
    a: '왓챠·웨이브처럼: 콘텐츠 썸네일 조밀한 가로 스크롤 리스트, 장르·평점·러닝타임 small text. 다크 bg, 회색 보조 텍스트.',
    b: '넷플릭스처럼: 대형 히어로 배너가 화면 상단 2/3 차지, 제목 72px white bold, 재생/찜 버튼 히어로 내. 배경 영상/이미지 풀블리드.',
    c: '스포티파이처럼: 앨범 아트 컬러가 bg 그라데이션으로 확산, 무드 플레이리스트 에디토리얼. 아티스트 감성 사진 + 큐레이션 카피.',
  },
  business: {
    a: '세일즈포스·허브스팟처럼: 지표 테이블 + 바·라인 차트 대시보드. 숫자는 모노스페이스, 상태 뱃지 색상 코드. 사이드바 네비, 공백 최소화.',
    b: '그로우·태블로처럼: 핵심 KPI 3개가 상단 히어로 영역 full-width 차지, 72px/900w. 메인 차트(라인/바)가 바로 아래 대형으로. 전환율·매출 숫자 강조.',
    c: '노션 팀 홈·컨플루언스처럼: 팀 무드 이미지/일러스트, 감성 환영 배너. 팀원 아바타, 주간 하이라이트 카드. 따뜻한 워크플레이스 톤.',
  },
  other: {
    a: '클린하고 정보 중심인 앱처럼: 흰 배경, 핵심 데이터를 명확한 계층 구조로. 컬러는 액션 요소에만, 그림자 카드 그리드.',
    b: '임팩트 있는 앱처럼: 핵심 수치/메시지가 상단 히어로를 가득 채움. 72px/900w 타이포, primary 컬러 히어로 카드, 아래 서포팅 카드.',
    c: '감성 있는 브랜드처럼: 무드 이미지·일러스트·3D 에셋이 첫인상. 브랜드 컬러 그라데이션, 감성 카피, 넉넉한 여백.',
  },
};

const PHILOSOPHY_A = `정밀 정보형 (시안 A) — 토스·Linear·Notion 스타일:
- 배경: var(--color-surface) 순백, 카드에 box-shadow: 0 1px 6px rgba(0,0,0,0.07)
- 핵심 KPI: 52px bold, var(--color-text), 바로 아래 보조 텍스트 12px var(--color-text-alt)
- 컬러 규칙: var(--color-primary)는 CTA 버튼·active 탭 아이콘·진행바에만. 나머지는 무채색
- 카드: border: 1px solid var(--color-border-alt), border-radius: var(--rounded-xl), 내부 패딩 var(--spacing-md)
- 헤더: 브랜드명 16px semibold + 우측 아이콘, 아래 얇은 구분선 var(--color-border-alt)
- 섹션 제목: 14px 600, var(--color-text), 상하 var(--spacing-sm) 여백
- 전체 밀도: 정보를 계층적으로 쌓되 텍스트 줄 수를 최소화 — 숫자가 시각적으로 지배`;

const PHILOSOPHY_B = `임팩트 히어로형 (시안 B) — Robinhood·Stripe·Nike 스타일:
- 최상단 히어로 카드: var(--color-primary) 배경, 흰 텍스트, border-radius: var(--rounded-2xl), box-shadow: 0 16px 48px rgba(0,0,0,0.18)
- 핵심 KPI: 72px font-weight:900 white, 히어로 카드 상단 절반 차지
- 히어로 내부: KPI 아래 메인 차트 또는 진행 바(흰색 30% 투명도 배경)
- 나머지 카드: var(--color-surface) bg, 그림자 elevated, border-radius: var(--rounded-xl)
- 섹션 제목: 17px 700, var(--color-text), 카드 간격 var(--spacing-base)
- 하단 탭바: var(--color-surface) bg + 그림자, 활성 아이콘 var(--color-primary)
- 전체 밀도: KPI가 화면 상단 40%를 지배, 나머지는 서포팅 카드로 구성`;

const PHILOSOPHY_C = `감성 브랜드형 (시안 C) — Airbnb·오늘의집·Spotify 스타일:
- 상단 히어로: 무드 이미지 또는 var(--color-primary)→var(--color-primary-light) 그라데이션 전폭 배치, 높이 220px 이상
- 히어로 내 텍스트: 감성 카피 20px 700 white + 서브카피 13px white/70%
- 카드: var(--color-surface) bg, border-radius: var(--rounded-2xl), box-shadow: 0 4px 16px rgba(0,0,0,0.10), 여백 var(--spacing-lg-alt)
- KPI: 40px 700 var(--color-primary), 숫자보다 의미 중심 레이블이 먼저
- 컬러: 브랜드 컬러를 히어로·버튼·ring/badge에 적극 사용, 따뜻하거나 생동감 있는 팔레트
- 여백: 카드 간격 var(--spacing-lg-alt), 상하 패딩 여유 있게 — 숨 쉬는 레이아웃
- 전체 밀도: 이미지·무드가 먼저 눈에 들어오고, 수치는 두 번째로`;

export function getVariantStyles(domain: AppDomain = 'other'): [string, string, string] {
  const ctx = DOMAIN_CONTEXT[domain] ?? DOMAIN_CONTEXT.other;
  return [
    `${PHILOSOPHY_A}\n\n## 도메인 컨텍스트\n${ctx.a}`,
    `${PHILOSOPHY_B}\n\n## 도메인 컨텍스트\n${ctx.b}`,
    `${PHILOSOPHY_C}\n\n## 도메인 컨텍스트\n${ctx.c}`,
  ];
}

type DomainEffects = {
  a: string; // 정밀 정보형 기대효과
  b: string; // 임팩트 히어로형 기대효과
  c: string; // 감성 브랜드형 기대효과
};

const DOMAIN_EFFECTS: Record<AppDomain, DomainEffects> = {
  finance: {
    a: '잔액·거래 정보 즉시 파악으로 금융 판단 실수 감소 → 신뢰도 상승 + 이탈률 저하',
    b: '핵심 수치 즉각 각인으로 의사결정 가속 → 투자 실행·금융상품 가입 전환율 향상',
    c: '목표·꿈 중심 감성 자극으로 저축 동기 강화 → 목표 설정 완료율 상승 + 장기 잔존율 강화',
  },
  commerce: {
    a: '가격·스펙 비교 시간 단축으로 결정 피로 감소 → 장바구니 이탈률 저하 + 재방문 구매율 상승',
    b: '제품 강렬 각인으로 구매 충동 자극 → 즉시 전환율·평균 객단가 동반 상승',
    c: '라이프스타일 스토리로 욕구 자극 → 브랜드 팔로우·재구매율·SNS 공유율 향상',
  },
  health: {
    a: '운동·건강 수치 체계화로 목표 달성 가시성 확보 → 일별 오픈율·챌린지 참여율 상승',
    b: '오늘의 기록 즉시 확인으로 성취감 극대화 → 운동 지속률 향상 + 유료 플랜 전환 유도',
    c: '힐링 분위기로 심리적 장벽 해소 → 재방문 부담 제거 + 명상·회복 기능 사용률 증가',
  },
  food: {
    a: '메뉴 결정 시간 단축으로 피크타임 이탈 방지 → 주문 완료율 향상 + 고객 회전율 개선',
    b: '메인 메뉴 강렬 노출로 주문 충동 자극 → 첫 방문 전환율·추천 메뉴 클릭률 상승',
    c: '신선한 무드로 식욕·기대감 자극 → 프리미엄 상품 선택률 상승 + 정기배송 전환 강화',
  },
  productivity: {
    a: '작업 상태 즉시 파악으로 컨텍스트 전환 비용 감소 → 태스크 완료율·마감 준수율 향상',
    b: '진척률 대시보드 즉시 인지로 팀 동기 강화 → 스프린트 달성률 상승 + 관리 효율화',
    c: '성과 시각화로 팀 문화 강화 → 팀원 만족도 상승 + 협업 도구 일일 활성 유저 증가',
  },
  social: {
    a: '정보 밀도 높은 피드로 콘텐츠 탐색 효율 극대화 → 상호작용 수·팔로우 전환율 향상',
    b: '풀스크린 몰입으로 시청 지속 시간 극대화 → 광고 노출 시간·크리에이터 수익 직결',
    c: '일상 감성으로 공감 형성 → 댓글·공유·저장 등 깊은 인터랙션 비율 상승',
  },
  travel: {
    a: '항공편·숙소 비교 효율화로 결정 피로 감소 → 검색→예약 전환 속도·완료율 향상',
    b: '목적지 강렬 각인으로 여행 욕구 자극 → 즉시 예약·업셀 패키지 선택율 상승',
    c: '감성 여행 스토리로 동경 심리 자극 → 위시리스트 저장·소셜 공유·재방문율 향상',
  },
  education: {
    a: '강좌 정보 한눈에 비교로 수강 결정 가속 → 등록 전환율·수강 완주율 향상',
    b: '학습 목표 달성률 즉시 확인으로 성취 동기 강화 → 연속 학습 지속률·유료 업그레이드율 상승',
    c: '프리미엄 감성으로 고급감·신뢰 형성 → 고가 강좌 구매율 상승 + 브랜드 충성도 강화',
  },
  entertainment: {
    a: '빠른 콘텐츠 탐색으로 재생까지 클릭 수 최소화 → 재생 전환율·세션 길이 향상',
    b: '히어로 배너 몰입으로 특정 콘텐츠 시청 집중 유도 → 신규 콘텐츠 첫날 완주율 상승',
    c: '무드 큐레이션으로 감성 탐색 경험 강화 → 플레이리스트 팔로우·구독 갱신율 향상',
  },
  business: {
    a: '지표 즉시 해독으로 회의 준비 시간 단축 → KPI 기반 의사결정 속도 향상 + 데이터 문화 정착',
    b: '핵심 KPI 히어로 노출로 경영진 상황 파악 가속 → 주간 보고 시간 절감 + 목표 집중도 상승',
    c: '팀 비전 감성 표현으로 소속감 강화 → 팀원 만족도·협업 도구 활성 사용률 향상',
  },
  other: {
    a: '정보 계층 명확화로 탐색 시간 단축 → 핵심 기능 발견율 향상 + 지원 문의 감소',
    b: '핵심 가치 즉시 각인으로 첫 방문 이탈 최소화 → 신규 사용자 활성화율·첫 전환 속도 향상',
    c: '브랜드 감성 몰입으로 호감 형성 → 재방문율·추천 바이럴 지수·장기 유료 전환 강화',
  },
};

export type VariantPanelInfo = {
  name: string
  strategy: string
  tagline: string
  rationale: string
  points: string[]
  bestFor: string
  expectedEffect: string
}

export function getVariantInfo(domain: AppDomain = 'other'): Record<'A' | 'B' | 'C', VariantPanelInfo> {
  const fx = DOMAIN_EFFECTS[domain] ?? DOMAIN_EFFECTS.other;
  return {
    A: {
      name: '정밀 정보형',
      strategy: '인지 부하 최소화 · 데이터 계층 설계',
      tagline: '숫자와 구조가 신뢰를 만든다',
      rationale: '흰 배경 위에 컬러를 CTA 단 하나에만 제한해 시선이 데이터에 집중되도록 강제합니다. Gestalt 근접성 원칙으로 정보를 카드 단위로 묶어 처음 보는 사용자도 학습 없이 구조를 파악합니다.',
      points: [
        '컬러는 primary 버튼 · active 탭에만 → 나머지 무채색으로 데이터 집중 유도',
        'KPI 52px bold → F-패턴 시선에서 첫 번째 정박점 자동 확보',
        'border 1px + 최소 shadow → 색 없이 구조만으로 클릭 어포던스 전달',
        '반복 방문자 멘탈모델 완전 일치 → 재방문 탐색 비용 0, 업무 효율 직결',
      ],
      bestFor: '대시보드 · 어드민 · 정보 집약형 B2B · 전문가 사용자',
      expectedEffect: fx.a,
    },
    B: {
      name: '임팩트 히어로형',
      strategy: '시선 독점 · Pre-attentive 강제 각인',
      tagline: '0.5초 안에 핵심을 각인시키는 공격적 설계',
      rationale: 'Primary 컬러 히어로 블록이 화면 상단 40%를 점령해 스크롤 전에 핵심 수치를 강제 노출합니다. 72px/900w 대형 KPI는 Pre-attentive Processing을 활용해 의식적 집중 전에 뇌가 먼저 인지합니다.',
      points: [
        '히어로 카드 전체를 primary 컬러로 → 색 하나로 3단계 계층 흐름 완성',
        '72px/900w KPI → Pre-attentive 인지, 이탈 전 핵심 지표 전달 보장',
        '차트 · 게이지를 히어로 내부에 배치 → 스크롤 없이 맥락 데이터까지 전달',
        'Bold 레이아웃 = 브랜드 자신감 시각화 → 사용자가 제품을 "강하다"고 무의식 인식',
      ],
      bestFor: '피트니스 · 금융 · 소셜 · 모바일 퍼스트 B2C',
      expectedEffect: fx.b,
    },
    C: {
      name: '감성 브랜드형',
      strategy: '무드 · 이미지 · 여백으로 감성 설계',
      tagline: '이미지가 먼저 말하고, 숫자는 두 번째로',
      rationale: '상단 히어로에 무드 이미지나 그라데이션을 배치해 브랜드의 감성적 가치를 첫인상으로 전달합니다. 넉넉한 여백과 브랜드 컬러 적극 활용으로 "숨 쉬는 레이아웃"과 고급감을 동시에 구현합니다.',
      points: [
        '전폭 히어로에 무드 이미지 · 그라데이션 → 첫 0.3초에 브랜드 감성 각인',
        'KPI primary 컬러 40px → 숫자보다 의미 레이블이 먼저, 감정 기반 인식',
        'border-radius 2xl + 카드 간격 여유 → 고급 브랜드가 쓰는 "숨 쉬는" 레이아웃',
        '브랜드 컬러를 히어로 · 버튼 · 링 · 뱃지에 → 화면 전체에 일관된 브랜드 경험',
      ],
      bestFor: 'B2C 커머스 · 라이프스타일 · 엔터테인먼트 · 감성 중심 서비스',
      expectedEffect: fx.c,
    },
  };
}
