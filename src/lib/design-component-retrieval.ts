/**
 * 계약의 컴포넌트를 전부 프롬프트에 넣으면(aide.md 63개, ktds.md 123개) 앞에서 N개를
 * 자르는 방식이 된다. 자르는 기준이 화면과 무관하므로, 정작 그 화면이 쓰는 컴포넌트가
 * 빠지고 쓰지 않는 컴포넌트가 예산을 차지한다.
 *
 * 계약의 `ai.selection_rules`는 이미 답을 적어 두었다 —
 * "retrieve only the components and patterns needed for the current task".
 * 이 모듈이 그 선언을 실제 선별로 구현한다.
 *
 * 디자인 시스템마다 컴포넌트 id 어휘가 다르므로(aide: `button`/`field`,
 * ktds: `button-primary`/`input-default`) 정확한 id가 아니라 **부분 문자열 패턴**으로
 * 맞춘다. 그래야 새 DESIGN.md가 들어와도 매핑 표를 다시 쓰지 않는다.
 */

export interface ComponentRetrievalHints {
  platform: 'mobile' | 'web'
  /** DesignDirection.navigation — bottom-tabs | top-bar | sidebar | minimal */
  navigation?: string
  /** DesignDirection.composition — dashboard | feed | commerce | ... */
  composition?: string
  /** DesignDirection.sectionFlow 또는 UIStructureIR 섹션 role 목록 */
  sectionRoles?: string[]
  /** UIStructureIR.chrome */
  chrome?: { topNav?: boolean; bottomNav?: boolean; sideNav?: boolean }
  /** UIStructureIR 섹션의 repeatPattern 모음 */
  repeatPatterns?: string[]
}

/** 어떤 DESIGN.md에서도 화면의 뼈대가 되는 최소 집합. */
const BASELINE_PATTERNS = ['button', 'card', 'field', 'input', 'section-header', 'badge']

/** 섹션 role/키워드 → 컴포넌트 id 부분 문자열 패턴. */
const ROLE_PATTERNS: Array<[RegExp, string[]]> = [
  [/kpi|metric|summary|status|stat|progress|streak/i, ['metric', 'progress', 'card']],
  [/search|query/i, ['search', 'field', 'input']],
  [/chip|category|filter|tag|tab/i, ['chip', 'tabs', 'segmented']],
  [/table|comparison|compare/i, ['table']],
  [/form|input|field|submit|apply|signup|login/i, ['field', 'input', 'select', 'textarea', 'checkbox', 'radio', 'switch', 'field-group']],
  [/chart|graph|analytics|trend/i, ['chart', 'bar-chart']],
  [/list|ranked|recommendation|activity|recent|history|order/i, ['list', 'list-row', 'list-cell', 'list-section']],
  [/grid|gallery|collection|featured|result/i, ['grid', 'card', 'responsive-grid']],
  [/rail|carousel|horizontal/i, ['card', 'rail', 'responsive-grid']],
  [/cta|conversion|checkout|purchase|action/i, ['button', 'action-bar', 'fixed-bottom-cta']],
  [/feed|post|story|social/i, ['card', 'avatar', 'list-row']],
  [/profile|account|avatar|user|my/i, ['avatar', 'list-row', 'detail-header']],
  [/empty|loading|skeleton/i, ['empty-state', 'loading']],
  [/alert|notice|warning|error|toast|snackbar/i, ['alert', 'toast', 'feedback']],
  [/step|onboard|guide|tutorial|wizard/i, ['stepper', 'prose']],
  [/slider|range|amount|budget/i, ['slider', 'number-field']],
  [/modal|dialog|sheet|popup|overlay/i, ['dialog', 'sheet', 'overlay', 'popover']],
  [/keypad|pin|numeric/i, ['keypad', 'number-field']],
  [/detail|hero|banner|header/i, ['detail-header', 'page-header', 'asset']],
]

const REPEAT_PATTERNS: Record<string, string[]> = {
  list: ['list', 'list-row', 'list-cell', 'list-section'],
  grid: ['grid', 'card', 'responsive-grid'],
  rail: ['card', 'responsive-grid'],
  table: ['table'],
  timeline: ['stepper', 'list', 'list-row'],
}

function matchesAny(id: string, patterns: string[]): boolean {
  const lower = id.toLowerCase()
  return patterns.some(pattern => lower.includes(pattern))
}

/**
 * 화면이 실제로 쓸 컴포넌트만 고른다. 신호가 전혀 없으면 `available`을 그대로 돌려주어
 * 호출자가 기존 우선순위 정렬로 처리하게 둔다(무신호 상황에서 임의로 줄이지 않는다).
 */
export function selectRelevantComponents(
  available: string[],
  hints: ComponentRetrievalHints,
  limit = 32,
): string[] {
  const wanted = new Set<string>(BASELINE_PATTERNS)

  // 내비게이션: chrome 불리언이 있으면 그것을, 없으면 direction.navigation을 쓴다.
  const chrome = hints.chrome
  const nav = hints.navigation ?? ''
  const hasBottom = chrome?.bottomNav || /bottom-tabs/.test(nav)
  const hasTop = chrome?.topNav || /top-bar/.test(nav)
  const hasSide = chrome?.sideNav || /sidebar/.test(nav)
  // 어떤 형태든 내비게이션이 있으면 일반 `navigation` 그룹도 필요하다.
  // 이름이 세분화되지 않은 DESIGN.md(aide는 `navigation` 하나뿐)를 놓치지 않기 위함이다.
  if (hasBottom || hasTop || hasSide) wanted.add('navigation')
  if (hasBottom) wanted.add('bottom-app-bar').add('nav-bottom')
  if (hasTop) wanted.add('top-navigation').add('app-header').add('global-navigation').add('nav-top')
  if (hasSide) wanted.add('side-navigation').add('side-panel').add('nav-side')
  if (hints.platform === 'mobile') {
    wanted.add('nav-bottom').add('fixed-bottom-cta')
  } else {
    wanted.add('breadcrumb').add('page-header')
  }

  for (const pattern of hints.repeatPatterns ?? []) {
    for (const id of REPEAT_PATTERNS[pattern] ?? []) wanted.add(id)
  }

  const roleText = [...(hints.sectionRoles ?? []), hints.composition ?? ''].join(' ')
  for (const [matcher, ids] of ROLE_PATTERNS) {
    if (matcher.test(roleText)) for (const id of ids) wanted.add(id)
  }

  const patterns = [...wanted]
  const selected = available.filter(id => matchesAny(id, patterns))
  // 선별 결과가 지나치게 빈약하면(어휘가 완전히 다른 DESIGN.md) 원본을 그대로 넘긴다.
  if (selected.length < 6) return available
  return selected.slice(0, limit)
}

/** `precomputedDesignIntentPlan`(DesignDirection JSON)에서 선별 힌트를 뽑는다. */
export function hintsFromDirectionPlan(
  plan: string | undefined,
  platform: 'mobile' | 'web',
): ComponentRetrievalHints {
  const hints: ComponentRetrievalHints = { platform }
  if (!plan) return hints
  try {
    const parsed = JSON.parse(plan) as {
      navigation?: unknown
      composition?: unknown
      sectionFlow?: unknown
      focalPoint?: unknown
      primaryAction?: unknown
    }
    if (typeof parsed.navigation === 'string') hints.navigation = parsed.navigation
    if (typeof parsed.composition === 'string') hints.composition = parsed.composition
    const flow = Array.isArray(parsed.sectionFlow)
      ? parsed.sectionFlow.filter((item): item is string => typeof item === 'string')
      : []
    const extra = [parsed.focalPoint, parsed.primaryAction].filter(
      (item): item is string => typeof item === 'string',
    )
    if (flow.length || extra.length) hints.sectionRoles = [...flow, ...extra]
  } catch {
    // 계획이 JSON이 아니면 플랫폼 기본값만 쓴다.
  }
  return hints
}
