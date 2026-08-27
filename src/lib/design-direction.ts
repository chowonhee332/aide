import type {
  CanvasComposition,
  CanvasDensity,
  CanvasMediaMode,
  CanvasNavigation,
  DesignDirection,
  DesignDirectionRequest,
} from './design-canvas-ir'

type TextGenerator = (prompt: string) => Promise<string>

const COMPOSITIONS: CanvasComposition[] = ['dashboard', 'immersive', 'editorial', 'workspace', 'feed', 'map', 'commerce', 'guided', 'experimental']
const DENSITIES: CanvasDensity[] = ['compact', 'balanced', 'airy']
const MEDIA_MODES: CanvasMediaMode[] = ['none', 'data', 'illustration', 'photo', 'mixed']
const NAVIGATIONS: CanvasNavigation[] = ['bottom-tabs', 'top-bar', 'sidebar', 'minimal']

const FALLBACK_DIRECTIONS: Array<Omit<DesignDirection, 'id'>> = [
  { name: '인사이트 보드', thesis: '핵심 상태와 다음 행동을 한 화면에서 판단한다.', userFeeling: '명확함과 통제감', composition: 'dashboard', density: 'compact', mediaMode: 'data', navigation: 'bottom-tabs', focalPoint: '핵심 지표', primaryAction: '주요 목표 시작', sectionFlow: ['상태 요약', '빠른 행동', '추세', '최근 활동'], paletteIntent: '높은 가독성의 절제된 데이터 팔레트', typographyIntent: '숫자와 상태가 빠르게 읽히는 조밀한 계층', signatureMove: '가로로 이어지는 단일 KPI 리본', avoid: ['대형 장식 이미지', '동일 크기 카드 반복'] },
  { name: '모먼트 스테이지', thesis: '하나의 강력한 장면과 행동으로 서비스의 감정을 전달한다.', userFeeling: '몰입감과 기대감', composition: 'immersive', density: 'airy', mediaMode: 'illustration', navigation: 'minimal', focalPoint: '상태가 반영된 대형 비주얼', primaryAction: '핵심 경험 진입', sectionFlow: ['몰입 장면', '단일 CTA', '다음 목표', '보상'], paletteIntent: '강한 주조색과 넓은 여백', typographyIntent: '크고 짧은 에디토리얼 헤드라인', signatureMove: '비주얼과 상태 수치가 하나로 연결된 스테이지', avoid: ['KPI 카드 3개', '관리자 대시보드'] },
  { name: '에디토리얼 저널', thesis: '이야기와 큐레이션을 통해 서비스를 탐색하게 한다.', userFeeling: '발견과 취향', composition: 'editorial', density: 'airy', mediaMode: 'photo', navigation: 'top-bar', focalPoint: '대형 에디토리얼 스토리', primaryAction: '추천 콘텐츠 탐색', sectionFlow: ['커버 스토리', '테마', '큐레이션', '개인화 추천'], paletteIntent: '이미지를 받쳐주는 중립 팔레트', typographyIntent: '잡지처럼 대비가 큰 타입 스케일', signatureMove: '세로 리듬을 깨는 오프셋 이미지 카드', avoid: ['진행률 대시보드', '마스코트 중심 구성'] },
  { name: '행동 워크스페이스', thesis: '정보를 읽는 것보다 즉시 작업하는 데 집중한다.', userFeeling: '속도와 집중', composition: 'workspace', density: 'compact', mediaMode: 'none', navigation: 'sidebar', focalPoint: '현재 작업 패널', primaryAction: '새 작업 시작', sectionFlow: ['내비게이션', '현재 작업', '상세 패널', '활동 로그'], paletteIntent: '중립 표면과 명확한 액션 색', typographyIntent: '작은 크기에서도 명확한 제품형 타입', signatureMove: '선택에 따라 변하는 양분 패널', avoid: ['포스터형 히어로', '큰 라운드 카드 벽'] },
  { name: '소셜 퀘스트', thesis: '개인의 진행과 다른 사람의 활동을 하나의 흐름으로 만든다.', userFeeling: '성취감과 연결감', composition: 'feed', density: 'balanced', mediaMode: 'mixed', navigation: 'bottom-tabs', focalPoint: '오늘의 챌린지', primaryAction: '챌린지 참여', sectionFlow: ['오늘의 퀘스트', '친구 활동', '랭킹', '보상'], paletteIntent: '상태별 액센트가 있는 활기찬 팔레트', typographyIntent: '친근하지만 게임처럼 과하지 않은 계층', signatureMove: '진행도와 소셜 반응이 겹쳐지는 피드 카드', avoid: ['정적인 기업형 표', '이미지 없는 단순 리스트'] },
  { name: '가이드 플로우', thesis: '복잡한 선택을 하나씩 안내해 결과에 도달하게 한다.', userFeeling: '안심과 전진감', composition: 'guided', density: 'balanced', mediaMode: 'illustration', navigation: 'minimal', focalPoint: '현재 선택 단계', primaryAction: '다음 단계 진행', sectionFlow: ['목표 요약', '현재 질문', '선택지', '결과 미리보기'], paletteIntent: '신뢰감 있는 부드러운 저채도 팔레트', typographyIntent: '질문과 답이 명확히 구분되는 대화형 계층', signatureMove: '선택과 결과가 동시에 보이는 프리뷰 카드', avoid: ['많은 KPI', '긴 피드'] },
]

function oneOf<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return typeof value === 'string' && choices.includes(value as T) ? value as T : fallback
}

function strings(value: unknown, max: number): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, max) : []
}

function normalizeDirection(value: unknown, index: number): DesignDirection | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.name !== 'string' || typeof raw.thesis !== 'string') return null
  return {
    id: `direction-${index + 1}`,
    name: raw.name.slice(0, 30),
    thesis: raw.thesis.slice(0, 160),
    userFeeling: typeof raw.userFeeling === 'string' ? raw.userFeeling.slice(0, 80) : '명확함',
    composition: oneOf(raw.composition, COMPOSITIONS, 'dashboard'),
    density: oneOf(raw.density, DENSITIES, 'balanced'),
    mediaMode: oneOf(raw.mediaMode, MEDIA_MODES, 'none'),
    navigation: oneOf(raw.navigation, NAVIGATIONS, 'bottom-tabs'),
    focalPoint: typeof raw.focalPoint === 'string' ? raw.focalPoint.slice(0, 100) : '핵심 콘텐츠',
    primaryAction: typeof raw.primaryAction === 'string' ? raw.primaryAction.slice(0, 80) : '시작하기',
    sectionFlow: strings(raw.sectionFlow, 6),
    paletteIntent: typeof raw.paletteIntent === 'string' ? raw.paletteIntent.slice(0, 120) : '제품에 맞는 명확한 팔레트',
    typographyIntent: typeof raw.typographyIntent === 'string' ? raw.typographyIntent.slice(0, 120) : '명확한 제품형 타입 계층',
    signatureMove: typeof raw.signatureMove === 'string' ? raw.signatureMove.slice(0, 140) : '독자적인 정보 구조',
    avoid: strings(raw.avoid, 4),
  }
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('디자인 방향 JSON 배열을 찾지 못했습니다.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export function buildDirectionPrompt(input: DesignDirectionRequest): string {
  return `당신은 제품 UI 아트 디렉터다. 코드나 HTML을 쓰지 말고, 서로 시각적·구조적으로 먼 6개의 디자인 방향을 설계해라.

서비스: ${input.projectSummary || input.brief}
상세: ${input.brief.slice(0, 3000)}
플랫폼: ${input.platform}
도메인: ${input.domain || 'other'}
타깃: ${input.targetAudience || '일반 사용자'}
여정: ${input.primaryJourney || '핵심 행동 완료'}
핵심 객체: ${(input.coreObjects || []).join(', ')}
핵심 데이터: ${(input.keyDataPoints || []).join(', ')}
디자인 시스템 요약: ${(input.designSystemSummary || '').slice(0, 1200)}
최종 시안 미디어 역할: ${input.visualRoles?.length === 3 ? `A=${input.visualRoles[0]}, B=${input.visualRoles[1]}, C=${input.visualRoles[2]}` : '후속 단계에서 결정'}

규칙:
- 여섯 안의 composition, density, mediaMode, navigation 조합을 가능한 겹치지 마라.
- 색상·폰트·라운드·그림자·컴포넌트 스타일은 여섯 안 모두 위 디자인 시스템을 공유한다. 시안별 새 팔레트를 만들지 마라.
- 차이는 focal point, section flow, CTA 위치, 정보 밀도, 미디어 배치로 만들라.
- paletteIntent는 새 hex·새 색상 제안이 아니라 DESIGN.md 토큰의 사용 비중(주조/보조/중립 면적)만 설명한다.
- 관습적인 header + hero + KPI 3개 + card 2개 + bottom tabs 반복을 금지한다.
- 서비스의 실제 사용 목적을 유지하되 하나 정도는 과감한 실험안으로 만들라.
- 최종 미디어 역할이 주어졌다면 6개 후보 안에 data/3d/photo 역할과 자연스럽게 결합될 방향을 충분히 포함하라. 3D는 illustration 또는 mixed, photo는 photo 또는 mixed, data는 data 또는 none이 적합하다.
- 출력은 설명 없이 JSON 배열만 사용한다.

각 객체 스키마:
{"name":"","thesis":"","userFeeling":"","composition":"dashboard|immersive|editorial|workspace|feed|map|commerce|guided|experimental","density":"compact|balanced|airy","mediaMode":"none|data|illustration|photo|mixed","navigation":"bottom-tabs|top-bar|sidebar|minimal","focalPoint":"","primaryAction":"","sectionFlow":[""],"paletteIntent":"","typographyIntent":"","signatureMove":"","avoid":[""]}`
}

export async function generateDesignDirections(input: DesignDirectionRequest, generateText: TextGenerator): Promise<DesignDirection[]> {
  try {
    const parsed = extractJson(await generateText(buildDirectionPrompt(input)))
    if (!Array.isArray(parsed)) throw new Error('배열이 아닙니다.')
    const normalized = parsed.map(normalizeDirection).filter((item): item is DesignDirection => item !== null)
    if (normalized.length >= 6) return normalized.slice(0, 6).map((item, index) => ({ ...item, id: `direction-${index + 1}` }))
  } catch (error) {
    console.warn('[design-direction] fallback:', error instanceof Error ? error.message : error)
  }
  return FALLBACK_DIRECTIONS.map((direction, index) => ({ ...direction, id: `direction-${index + 1}` }))
}

function directionDistance(a: DesignDirection, b: DesignDirection): number {
  return Number(a.composition !== b.composition) * 4
    + Number(a.mediaMode !== b.mediaMode) * 3
    + Number(a.navigation !== b.navigation) * 2
    + Number(a.density !== b.density)
}

function visualRoleFit(direction: DesignDirection, role: 'data' | '3d' | 'photo'): number {
  if (role === 'data') {
    return (direction.mediaMode === 'data' || direction.mediaMode === 'none' ? 8 : 0)
      + (direction.composition === 'dashboard' || direction.composition === 'workspace' ? 4 : 0)
  }
  if (role === '3d') {
    return (direction.mediaMode === 'illustration' || direction.mediaMode === 'mixed' ? 8 : 0)
      + (direction.composition === 'immersive' || direction.composition === 'guided' || direction.composition === 'feed' ? 4 : 0)
  }
  return (direction.mediaMode === 'photo' || direction.mediaMode === 'mixed' ? 8 : 0)
    + (direction.composition === 'editorial' || direction.composition === 'commerce' || direction.composition === 'map' ? 4 : 0)
}

/**
 * A/B/C의 실제 이미지 정책과 디자인 방향을 함께 최적화한다.
 * 방향을 먼저 고른 뒤 고정 visualPolicy를 덧씌우면 photo 방향이 no-image로
 * 렌더되는 식의 충돌이 생기므로, 최대 6개 후보의 순열을 작게 전수 평가한다.
 */
export function selectDirectionsForVisualRoles(
  directions: DesignDirection[],
  roles: Array<'data' | '3d' | 'photo'>,
): DesignDirection[] {
  if (roles.length < 3 || directions.length < 3) return selectDiverseDirections(directions, 3)
  let best: DesignDirection[] = []
  let bestScore = Number.NEGATIVE_INFINITY
  for (let a = 0; a < directions.length; a++) {
    for (let b = 0; b < directions.length; b++) {
      if (b === a) continue
      for (let c = 0; c < directions.length; c++) {
        if (c === a || c === b) continue
        const candidate = [directions[a], directions[b], directions[c]]
        const fit = candidate.reduce((sum, direction, index) => sum + visualRoleFit(direction, roles[index]), 0)
        const diversity = directionDistance(candidate[0], candidate[1])
          + directionDistance(candidate[0], candidate[2])
          + directionDistance(candidate[1], candidate[2])
        const score = fit * 5 + diversity
        if (score > bestScore) { bestScore = score; best = candidate }
      }
    }
  }
  return best.length === 3 ? best : selectDiverseDirections(directions, 3)
}

export function selectDiverseDirections(directions: DesignDirection[], count = 3): DesignDirection[] {
  if (directions.length <= count) return directions.slice()
  const selected: DesignDirection[] = [directions[0]]
  const remaining = directions.slice(1)
  while (selected.length < count && remaining.length) {
    let bestIndex = 0
    let bestScore = -1
    remaining.forEach((candidate, index) => {
      const score = Math.min(...selected.map(chosen => directionDistance(candidate, chosen)))
      if (score > bestScore) { bestScore = score; bestIndex = index }
    })
    selected.push(remaining.splice(bestIndex, 1)[0])
  }
  return selected
}
