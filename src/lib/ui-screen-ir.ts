import YAML from 'yaml'
import { normalizeIconName } from './material-symbols'
import type { CanvasComposition } from './design-canvas-ir'

export type UIScreenVariant = 'A' | 'B' | 'C'
export type UIScreenSectionType =
  | 'app-header' | 'hero' | 'metrics' | 'actions' | 'list' | 'cards' | 'progress' | 'bottom-nav'
  | 'search' | 'tabs' | 'filters' | 'form' | 'chart' | 'timeline' | 'map' | 'feed'
  | 'table' | 'media' | 'chat' | 'calendar' | 'profile' | 'alert' | 'empty-state' | 'commerce-grid'
export type UIScreenSectionLayout = 'stack' | 'grid' | 'carousel' | 'split' | 'compact' | 'featured' | 'full-bleed'

export interface UIScreenItem {
  id: string
  label: string
  value?: string
  description?: string
  badge?: string
  actionLabel?: string
  icon?: string
  imageUrl?: string
  mediaPrompt?: string
  meta?: string
  state?: 'default' | 'active' | 'success' | 'warning' | 'error'
}

export interface UIScreenSection {
  id: string
  type: UIScreenSectionType
  title?: string
  eyebrow?: string
  description?: string
  primaryAction?: string
  secondaryAction?: string
  value?: number
  layout?: UIScreenSectionLayout
  columns?: 1 | 2 | 3 | 4
  placeholder?: string
  items?: UIScreenItem[]
}

export interface UIScreenIR {
  version: 1
  variant: UIScreenVariant
  name: string
  platform: 'mobile' | 'web'
  strategy: string
  // design-canvas-ir.ts의 CanvasComposition을 그대로 쓴다(9종). 여기서 별도로 3종만
  // 허용하면, 방향 생성기가 고른 구도(예: workspace/feed/guided)가 화면 생성 단계에서
  // 조용히 dashboard로 뭉개진다 — 실제로 그랬던 버그였다.
  layout?: CanvasComposition
  sections: UIScreenSection[]
}

export interface StudioDesignTheme {
  primary: string
  primaryStrong: string
  primarySoft: string
  background: string
  surface: string
  surfaceMuted: string
  text: string
  textMuted: string
  border: string
  radius: string
  fontFamily: string
  onPrimary: string
  positive: string
  caution: string
  negative: string
  shadow: string
  // 타이포/간격 스케일. DESIGN.md마다 명명 규칙이 다르므로(예: aide.md는
  // tokens.type.heading, ktds.md는 tokens.typography.headline-lg) typographySize/
  // scaleValue가 후보 키를 순서대로 찾는다. 여기까지만 뽑고 나머지 세부 크기는
  // 렌더러가 이 기준값에서 calc()로 파생한다.
  textDisplay: string
  textHeading: string
  textLabel: string
  textBody: string
  textCaption: string
  sectionGap: string
  cardPadding: string
  itemGap: string
}

export const UI_SCREEN_SECTION_TYPES: UIScreenSectionType[] = [
  'app-header', 'hero', 'metrics', 'actions', 'list', 'cards', 'progress', 'bottom-nav',
  'search', 'tabs', 'filters', 'form', 'chart', 'timeline', 'map', 'feed', 'table',
  'media', 'chat', 'calendar', 'profile', 'alert', 'empty-state', 'commerce-grid',
]
const SECTION_TYPES = new Set<UIScreenSectionType>(UI_SCREEN_SECTION_TYPES)
const SECTION_LAYOUTS = new Set<UIScreenSectionLayout>(['stack', 'grid', 'carousel', 'split', 'compact', 'featured', 'full-bleed'])
const VARIANTS = new Set<UIScreenVariant>(['A', 'B', 'C'])
const CANVAS_COMPOSITIONS = new Set<CanvasComposition>(['dashboard', 'immersive', 'editorial', 'workspace', 'feed', 'map', 'commerce', 'guided', 'experimental'])

function scalar(record: Record<string, unknown>, paths: string[], fallback: string): string {
  for (const path of paths) {
    let current: unknown = record
    for (const part of path.split('.')) current = current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined
    // DTCG 계약은 값을 { $value, $description }으로 감싼다.
    if (current && typeof current === 'object' && typeof (current as Record<string, unknown>).$value === 'string') {
      current = (current as Record<string, unknown>).$value
    }
    if (typeof current === 'string' && current.trim()) return current.trim()
  }
  return fallback
}

/**
 * 타이포 스케일 값(px)을 찾는다. DESIGN.md는 두 형태가 섞여 있다:
 *  - 축약 문자열: `heading: "22px/30px 700, letter-spacing -0.43px"` (aide.md)
 *  - 객체: `headline-lg: { fontSize: "24px", ... }` (ktds/notion/shopify/ibm)
 * 형태와 무관하게 값에서 맨 앞의 `NNpx`만 뽑는다.
 */
/**
 * DESIGN.md의 typography 스케일은 랜딩페이지 히어로 기준(최대 96px)까지 있지만
 * Aide가 렌더하는 건 고정 높이 컴팩트 카드다. 원본값을 그대로 쓰면 텍스트가
 * 카드를 뚫고 나가 하단 네비가 잘리는 등 레이아웃이 깨진다(실측 확인).
 * 브랜드 간 상대적 크기 차이는 유지하되 컴팩트 UI에 안전한 범위로 눌러준다.
 */
function clampPx(value: string, min: number, max: number): string {
  const match = value.match(/^(\d+(?:\.\d+)?)(px|rem)$/)
  if (!match) return value
  const unit = match[2]
  const px = unit === 'rem' ? Number.parseFloat(match[1]) * 16 : Number.parseFloat(match[1])
  return `${Math.max(min, Math.min(max, px))}px`
}

function typographySize(parsed: Record<string, unknown>, groupPaths: string[], keyPatterns: RegExp[], fallback: string): string {
  for (const groupPath of groupPaths) {
    let group: unknown = parsed
    for (const part of groupPath.split('.')) group = group && typeof group === 'object' ? (group as Record<string, unknown>)[part] : undefined
    if (!group || typeof group !== 'object') continue
    const keys = Object.keys(group as Record<string, unknown>)
    for (const pattern of keyPatterns) {
      const key = keys.find(candidate => pattern.test(candidate))
      if (!key) continue
      const raw = (group as Record<string, unknown>)[key]
      const wrapped = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).$value : undefined
      const source = typeof raw === 'string' ? raw
        : raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).fontSize === 'string' ? (raw as Record<string, unknown>).fontSize as string
        : raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).$value === 'string' ? (raw as Record<string, unknown>).$value as string
        : wrapped && typeof wrapped === 'object' && typeof (wrapped as Record<string, unknown>).fontSize === 'string' ? (wrapped as Record<string, unknown>).fontSize as string
        : undefined
      const size = source?.match(/^\d+(?:\.\d+)?(px|rem)/)?.[0]
      if (size) return size
    }
  }
  return fallback
}

function typographyFontFamily(parsed: Record<string, unknown>, fallback: string): string {
  const typography = (parsed.contract as Record<string, unknown> | undefined)?.tokens as Record<string, unknown> | undefined
  const body = (typography?.typography as Record<string, unknown> | undefined)?.body as Record<string, unknown> | undefined
  const value = body?.$value as Record<string, unknown> | undefined
  return typeof value?.fontFamily === 'string' ? value.fontFamily : fallback
}

/**
 * 간격 스케일 값을 찾는다. 명명된 키(section-gap 등)가 있으면 우선 쓰고,
 * 없으면 xs~2xl 같은 척도 키에서 순서대로 후보를 찾는다.
 */
function scaleValue(parsed: Record<string, unknown>, groupPaths: string[], keyCandidates: string[], fallback: string): string {
  for (const groupPath of groupPaths) {
    let group: unknown = parsed
    for (const part of groupPath.split('.')) group = group && typeof group === 'object' ? (group as Record<string, unknown>)[part] : undefined
    if (!group || typeof group !== 'object') continue
    for (const key of keyCandidates) {
      const raw = (group as Record<string, unknown>)[key]
      if (typeof raw === 'string' && raw.trim()) return raw.trim()
      if (raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).$value === 'string') {
        return ((raw as Record<string, unknown>).$value as string).trim()
      }
    }
  }
  return fallback
}

export function compileStudioDesignTheme(designMd: string): StudioDesignTheme {
  let parsed: Record<string, unknown> = {}
  try {
    const source = designMd.replace(/^\uFEFF/, '')
    // 생성용 DESIGN.md는 대부분 `---` frontmatter를 쓴다. `---`는 YAML 문서 구분자라
    // 파일 전체를 넘기면 "multiple documents"로 예외가 나고, 그 예외가 조용히 삼켜져
    // 어떤 DESIGN.md를 골라도 전부 기본 팔레트로 떨어졌다. frontmatter를 먼저 본다.
    // 두 형식이 공존한다: 생성용 프리셋은 `---` frontmatter, 이식용 계약은 ```yaml 블록.
    // 한쪽만 보면 다른 쪽 파일이 통째로 기본값으로 떨어지므로 둘 다 읽어 병합한다.
    const sources = [
      source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1],
      source.match(/```ya?ml\s*([\s\S]*?)```/i)?.[1],
    ].filter((value): value is string => Boolean(value))
    if (sources.length === 0) sources.push(source.replace(/^#.*$/gm, '').trim())
    for (const yamlSource of sources) {
      try {
        const value = YAML.parse(yamlSource)
        if (value && typeof value === 'object') parsed = { ...parsed, ...value as Record<string, unknown> }
      } catch { /* 한 소스가 깨져도 나머지는 살린다 */ }
    }
  } catch { /* DESIGN.md may contain prose around YAML. Defaults remain deterministic. */ }

  // aide.md's machine contract is normative. Legacy/simple frontmatter remains a
  // compatibility fallback for uploaded customer DESIGN.md files.
  const primary = scalar(parsed, ['contract.tokens.color.primary', 'contract.tokens.colors.primary', 'tokens.colors.primary', 'colors.primary', 'primary'], '#2563eb')
  return {
    primary,
    primaryStrong: scalar(parsed, ['contract.tokens.color.primary-strong', 'tokens.colors.primary-strong', 'tokens.colors.primaryStrong', 'tokens.colors.primary_strong', 'colors.primary-strong', 'colors.primaryStrong'], primary),
    primarySoft: scalar(parsed, ['contract.tokens.color.primary-soft', 'tokens.colors.primary-soft', 'tokens.colors.primarySoft', 'tokens.colors.primary_soft', 'colors.primary-soft', 'colors.primarySoft'], 'color-mix(in srgb, var(--ui-primary) 12%, white)'),
    background: scalar(parsed, ['contract.tokens.color.canvas', 'contract.tokens.color.background', 'tokens.colors.background', 'tokens.colors.page', 'tokens.colors.canvas', 'colors.background', 'colors.page', 'colors.canvas', 'background'], '#f6f7f9'),
    surface: scalar(parsed, ['contract.tokens.color.surface', 'tokens.colors.surface', 'colors.surface', 'surface'], '#ffffff'),
    surfaceMuted: scalar(parsed, ['contract.tokens.color.surface-muted', 'tokens.colors.surface-muted', 'tokens.colors.surfaceMuted', 'tokens.colors.surface_muted', 'colors.surface-muted', 'colors.surfaceMuted'], '#f2f4f7'),
    text: scalar(parsed, ['contract.tokens.color.text', 'tokens.colors.text', 'tokens.colors.ink', 'colors.text', 'text'], '#17191c'),
    textMuted: scalar(parsed, ['contract.tokens.color.text-muted', 'tokens.colors.text-muted', 'tokens.colors.textMuted', 'tokens.colors.text_muted', 'colors.text-muted', 'colors.textMuted'], '#68707d'),
    border: scalar(parsed, ['contract.tokens.color.border', 'tokens.colors.border', 'colors.border', 'border'], '#e2e5ea'),
    radius: scalar(parsed, ['contract.tokens.radius.card', 'contract.tokens.radius.lg', 'tokens.radius.card', 'tokens.radius.lg', 'radius.card', 'radius'], '20px'),
    fontFamily: typographyFontFamily(parsed, scalar(parsed, ['tokens.typography.fontFamily', 'tokens.type.fontFamily', 'tokens.type.family', 'typography.fontFamily', 'fontFamily'], 'Pretendard, Inter, system-ui, sans-serif')),
    onPrimary: scalar(parsed, ['contract.tokens.color.on-primary', 'tokens.colors.on-primary', 'tokens.colors.onPrimary', 'colors.on-primary', 'colors.onPrimary'], '#ffffff'),
    positive: scalar(parsed, ['contract.tokens.color.positive', 'tokens.colors.positive', 'colors.positive', 'colors.success'], '#16a34a'),
    caution: scalar(parsed, ['contract.tokens.color.caution', 'tokens.colors.caution', 'colors.caution', 'colors.warning'], '#f59e0b'),
    negative: scalar(parsed, ['contract.tokens.color.negative', 'tokens.colors.negative', 'colors.negative', 'colors.error'], '#ef4444'),
    shadow: scalar(parsed, ['contract.tokens.shadow.card', 'tokens.shadow.card', 'tokens.shadows.card', 'tokens.shadows.2', 'shadow.card', 'shadows.card'], '0 8px 24px rgba(15,23,42,.08)'),
    textDisplay: clampPx(typographySize(parsed, ['contract.tokens.typography', 'tokens.type', 'tokens.typography', 'typography'], [/^display/i, /^hero-display/i], '30px'), 24, 34),
    textHeading: clampPx(typographySize(parsed, ['contract.tokens.typography', 'tokens.type', 'tokens.typography', 'typography'], [/^heading$/i, /^headline/i, /^title-lg/i, /^heading-1$/i, /^title$/i], '21px'), 18, 26),
    textLabel: clampPx(typographySize(parsed, ['contract.tokens.typography', 'tokens.type', 'tokens.typography', 'typography'], [/^label/i, /^title-md/i, /^card-title/i, /^subhead/i, /^body-lg-medium/i], '14px'), 13, 17),
    textBody: clampPx(typographySize(parsed, ['contract.tokens.typography', 'tokens.type', 'tokens.typography', 'typography'], [/^body$/i, /^body-md$/i, /^body-lg$/i, /^body/i, /^text$/i], '13px'), 12, 16),
    textCaption: clampPx(typographySize(parsed, ['contract.tokens.typography', 'tokens.type', 'tokens.typography', 'typography'], [/^caption/i, /^micro/i, /^eyebrow/i, /^body-sm/i], '11px'), 9, 12),
    sectionGap: clampPx(scaleValue(parsed, ['contract.tokens.dimension', 'tokens.spacing', 'spacing'], ['section-gap', 'section', 'space-6', 'xxl', '2xl', 'xl'], '18px'), 14, 28),
    cardPadding: clampPx(scaleValue(parsed, ['contract.tokens.dimension', 'tokens.spacing', 'spacing'], ['card-padding', 'card', 'space-4', 'md', 'base'], '15px'), 12, 20),
    itemGap: clampPx(scaleValue(parsed, ['contract.tokens.dimension', 'tokens.spacing', 'spacing'], ['item-gap', 'item', 'space-2', 'xs', 'sm'], '8px'), 6, 12),
  }
}

function cleanText(value: unknown, max = 140): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
}

export function parseUIScreenPatch(value: unknown): { variant: UIScreenVariant; screen?: Omit<UIScreenIR, 'sections'>; section?: UIScreenSection; done?: true } | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (!VARIANTS.has(raw.variant as UIScreenVariant)) return null
  const variant = raw.variant as UIScreenVariant
  if (raw.type === 'screen') {
    if ((raw.platform !== 'mobile' && raw.platform !== 'web') || typeof raw.name !== 'string' || typeof raw.strategy !== 'string') return null
    const layout = CANVAS_COMPOSITIONS.has(raw.layout as CanvasComposition) ? raw.layout as CanvasComposition : 'dashboard'
    return { variant, screen: { version: 1, variant, name: raw.name.slice(0, 50), platform: raw.platform, strategy: raw.strategy.slice(0, 180), layout } }
  }
  if (raw.type === 'section' && raw.section && typeof raw.section === 'object') {
    const sectionRaw = raw.section as Record<string, unknown>
    if (typeof sectionRaw.id !== 'string' || !SECTION_TYPES.has(sectionRaw.type as UIScreenSectionType)) return null
    const items = Array.isArray(sectionRaw.items) ? sectionRaw.items.slice(0, 8).flatMap((item, index) => {
      if (!item || typeof item !== 'object') return []
      const row = item as Record<string, unknown>
      const label = cleanText(row.label, 60)
      if (!label) return []
      const state: UIScreenItem['state'] = row.state === 'active' || row.state === 'success' || row.state === 'warning' || row.state === 'error' ? row.state : 'default'
      return [{ id: cleanText(row.id, 40) ?? `item-${index}`, label, value: cleanText(row.value, 30), description: cleanText(row.description), badge: cleanText(row.badge, 24), actionLabel: cleanText(row.actionLabel, 30), icon: normalizeIconName(cleanText(row.icon, 24)), imageUrl: cleanText(row.imageUrl, 500), mediaPrompt: cleanText(row.mediaPrompt, 180), meta: cleanText(row.meta, 60), state }]
    }) : undefined
    const columns = [1, 2, 3, 4].includes(Number(sectionRaw.columns)) ? Number(sectionRaw.columns) as 1 | 2 | 3 | 4 : undefined
    return { variant, section: { id: sectionRaw.id.slice(0, 40), type: sectionRaw.type as UIScreenSectionType, title: cleanText(sectionRaw.title, 80), eyebrow: cleanText(sectionRaw.eyebrow, 40), description: cleanText(sectionRaw.description), primaryAction: cleanText(sectionRaw.primaryAction, 36), secondaryAction: cleanText(sectionRaw.secondaryAction, 36), value: typeof sectionRaw.value === 'number' ? Math.max(0, Math.min(100, sectionRaw.value)) : undefined, layout: SECTION_LAYOUTS.has(sectionRaw.layout as UIScreenSectionLayout) ? sectionRaw.layout as UIScreenSectionLayout : undefined, columns, placeholder: cleanText(sectionRaw.placeholder, 80), items } }
  }
  if (raw.type === 'done') return { variant, done: true }
  return null
}

export interface SharedUIScreenContent {
  kpis: Array<{ label: string; value: string; meta?: string }>
  quickActions: string[]
  listItems: Array<{ title: string; meta?: string; value?: string; badge?: string }>
  activityItems: Array<{ title: string; meta?: string; value?: string }>
}

export function buildUIScreenIRPrompt(input: {
  brief: string
  projectSummary: string
  platform: 'mobile' | 'web'
  designMd: string
  directions: Array<{ name: string; thesis: string; composition: string; density: string; primaryAction: string }>
  contentSeed?: SharedUIScreenContent
  coreObjects?: string[]
  keyDataPoints?: string[]
  shellContract?: {
    topAppBar?: { present?: boolean; title?: string; leftAction?: string; rightAction?: string; preserveExactly?: boolean }
    bottomNavigation?: { present?: boolean }
    brandLogo?: { present?: boolean }
  }
}): string {
  const sharedContent = input.contentSeed
    ? JSON.stringify(input.contentSeed, null, 2)
    : JSON.stringify({ coreObjects: input.coreObjects ?? [], keyDataPoints: input.keyDataPoints ?? [] }, null, 2)
  const shellContract = input.shellContract ? JSON.stringify(input.shellContract, null, 2) : '(기존 화면 셸 계약 없음)'
  return `당신은 Google Stitch 수준의 제품 UI 설계 엔진이다. HTML이나 CSS를 쓰지 말고 실제 화면을 구성하는 구조화 UI 패치만 만든다.

서비스: ${input.projectSummary}
기획: ${input.brief.slice(0, 3000)}
플랫폼: ${input.platform}
DESIGN.md (색상·타이포·라운드·밀도·컴포넌트 규칙의 유일한 기준):
${input.designMd.slice(0, 5000)}

세 방향:
${input.directions.slice(0, 3).map((d, i) => `${['A','B','C'][i]}. ${d.name} / ${d.thesis} / 구도 ${d.composition} / 밀도 ${d.density} / CTA ${d.primaryAction}`).join('\n')}

공유 콘텐츠 계약 — A/B/C 모두 동일한 정보를 사용한다:
${sharedContent}

기존 화면 셸 계약 — 존재와 부재를 A/B/C 모두 그대로 유지한다:
${shellContract}

출력은 코드펜스 없는 JSONL이다. 한 줄은 반드시 독립적으로 JSON.parse 가능해야 한다.
각 시안은 screen 1줄 → section 5~8줄 → done 1줄 순서로 출력한다. A를 끝내고 B, C 순서로 만든다.

screen: {"type":"screen","variant":"A","name":"짧은 이름","platform":"${input.platform}","strategy":"구체적인 설계 전략","layout":"dashboard|immersive|editorial|workspace|feed|map|commerce|guided|experimental"}
section: {"type":"section","variant":"A","section":{"id":"고유-id","type":"app-header|hero|metrics|actions|list|cards|progress|bottom-nav|search|tabs|filters|form|chart|timeline|map|feed|table|media|chat|calendar|profile|alert|empty-state|commerce-grid","layout":"stack|grid|carousel|split|compact|featured|full-bleed","columns":2,"title":"...","eyebrow":"...","description":"...","placeholder":"...","primaryAction":"...","secondaryAction":"...","value":72,"items":[{"id":"...","label":"...","value":"...","description":"...","badge":"...","meta":"...","actionLabel":"...","icon":"search|home|person|notifications|map|star|check|add","imageUrl":"실제 https URL이 제공된 경우만","mediaPrompt":"이미지 생성이 꼭 필요한 media 블록만 구체적인 장면 설명","state":"default|active|success|warning|error"}]}}
done: {"type":"done","variant":"A"}

규칙:
- A/B/C는 서로 다른 제품이 아니라 동일한 홈 화면의 디자인 대안이다.
- 위 [공유 콘텐츠 계약]의 KPI label/value/meta, quickActions, listItems title/value/badge, activityItems를 A/B/C 모두에 동일하게 넣는다. 생략·추가·재명명·수치 변경을 금지한다.
- 달라져야 하는 것은 section type, 순서, 그룹핑, 시각적 위계, 밀도, 이미지 사용, CTA 배치뿐이다.
- 한 시안에만 새로운 혜택, 등급, 기간, 기능, 신청 단계를 만들지 말라. 기획에 없는 개인정보나 수치도 추론하지 말라.
- 화면에 보이는 모든 문구와 데이터는 서비스 기획과 공유 콘텐츠 계약에 근거한 현실적인 한국어 콘텐츠여야 한다.
- 임시 문구, lorem ipsum, skeleton, 검색 버튼 같은 무관한 기본값, 의미 없는 도형을 금지한다.
- A/B/C는 공유 콘텐츠는 같고 표현 구조와 핵심 행동의 배치만 확실히 달라야 하며 동일 DESIGN.md를 지킨다.
- A/B/C의 layout은 각각 서로 다른 값을 사용한다. 방향이 제시한 구도(위 '구도' 항목)를 최우선으로 반영한다.
- shellContract.topAppBar.preserveExactly가 true면 앱바 제목과 좌·우 액션을 그대로 유지한다.
- shellContract.bottomNavigation.present가 false면 bottom-nav를 만들지 않는다. true인 경우에만 마지막 section으로 둔다.
- shellContract.brandLogo.present가 false면 이미지·텍스트 로고를 만들지 않는다.
- shellContract가 없을 때만 모바일 서비스 성격에 따라 bottom-nav 필요 여부를 판단한다. 웹은 필요할 때만 app-header 내비게이션을 쓴다.
- hero는 장식이 아니라 핵심 행동/상태를 전달한다. metrics는 실제 핵심 수치만 사용한다.
- 서비스 특성에 맞는 전용 블록(search, chart, timeline, map, feed, form, chat, commerce-grid 등)을 최소 2개 사용한다. 모든 서비스를 hero+metrics+cards로 환원하지 않는다.
- 각 화면은 최소 4개 section과 9개의 의미 있는 item/action/data unit을 포함해 실제 운영 서비스처럼 완성한다.
- item.icon, meta, badge, value, state를 내용에 맞게 사용해 단순 텍스트 박스 나열을 피한다.
- 모든 아이콘은 Google Material Symbols Rounded만 사용한다. item.icon에는 아래 허용 이름 중 하나만 쓴다:
  search, home, person, notifications, map, star, check, add, schedule, bolt, favorite, explore, shopping_bag, chat, calendar_month, trending_up, directions_walk, eco, pets, tune
- 이모지, Font Awesome, Lucide, Heroicons, 직접 만든 SVG, CSS 도형 아이콘, 아이콘 이름을 일반 텍스트로 노출하는 방식을 금지한다.
- 완성 제품 화면을 설계한다. 회색 placeholder, 빈 카드, skeleton, wireframe 주석, 의미 없는 장식 블록은 금지한다.
- imageUrl은 입력에 실제 URL이 존재할 때만 사용한다. 임의 URL, picsum, placeholder 이미지를 만들지 않는다.
- HTML, CSS, markdown, 설명 문장을 출력하지 않는다.`
}
