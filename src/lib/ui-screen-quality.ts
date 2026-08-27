import type { UIScreenIR, UIScreenSection, UIScreenSectionType } from './ui-screen-ir'

export type UIScreenQualityIssueCode = 'duplicate-id' | 'empty-section' | 'missing-navigation' | 'generic-structure' | 'low-diversity' | 'horizontal-overflow' | 'vertical-text' | 'clipped-section'

export interface UIScreenQualityIssue {
  code: UIScreenQualityIssueCode
  severity: 'warning' | 'error'
  message: string
  variant?: UIScreenIR['variant']
  sectionId?: string
}

export interface UIScreenVisualMeasurement {
  documentWidth: number
  viewportWidth: number
  sections: Array<{ id: string; type: string; overflowX: number; clipped: boolean; verticalText: boolean }>
}

const PRODUCT_SPECIFIC = new Set<UIScreenSectionType>(['search', 'form', 'chart', 'timeline', 'map', 'feed', 'table', 'media', 'chat', 'calendar', 'profile', 'commerce-grid'])

export function normalizeUIScreen(screen: UIScreenIR): UIScreenIR {
  const seen = new Set<string>()
  const sections = screen.sections.flatMap((section, index) => {
    if (!section.id || seen.has(section.id)) return []
    seen.add(section.id)
    const items = section.items?.filter(item => item.label.trim()).slice(0, 8)
    const columns = screen.platform === 'mobile' && section.columns && section.columns > 2 ? 2 : section.columns
    const normalized: UIScreenSection = { ...section, columns, items }
    if (section.type === 'bottom-nav') normalized.items = items?.slice(0, 5)
    if (section.type === 'app-header') normalized.items = items?.slice(0, 3)
    if (section.type === 'chart' && (!items || items.length < 2)) return []
    if (section.type === 'map' && (!items || items.length < 1)) return []
    if (!normalized.title && !normalized.description && !normalized.items?.length && !normalized.primaryAction && section.type !== 'search') return []
    return [{ ...normalized, id: section.id || `section-${index}` }]
  })
  const bottomNav = sections.filter(section => section.type === 'bottom-nav')
  const content = sections.filter(section => section.type !== 'bottom-nav')
  // 모델이 고른 layout을 보존한다. 여기서 A/B/C 알파벳으로 덮어쓰면 스트리밍 중
  // 보여준 구도와 최종 결과가 어긋나고, 모델의 실제 선택이 무시된다.
  const layout = screen.layout ?? ({ A: 'dashboard', B: 'editorial', C: 'immersive' } as const)[screen.variant]
  return { ...screen, layout, sections: screen.platform === 'mobile' ? [...content, ...bottomNav.slice(0, 1)] : sections }
}

export function inspectUIScreenStructure(screen: UIScreenIR): UIScreenQualityIssue[] {
  const issues: UIScreenQualityIssue[] = []
  const ids = new Set<string>()
  for (const section of screen.sections) {
    if (ids.has(section.id)) issues.push({ code: 'duplicate-id', severity: 'error', message: `중복 section id: ${section.id}`, variant: screen.variant, sectionId: section.id })
    ids.add(section.id)
    if (!section.title && !section.description && !section.items?.length && !section.primaryAction && section.type !== 'search') issues.push({ code: 'empty-section', severity: 'error', message: `내용이 없는 ${section.type} 블록`, variant: screen.variant, sectionId: section.id })
  }
  if (screen.platform === 'mobile' && !screen.sections.some(section => section.type === 'bottom-nav')) issues.push({ code: 'missing-navigation', severity: 'warning', message: '모바일 화면에 이동 구조가 없습니다.', variant: screen.variant })
  const specificCount = screen.sections.filter(section => PRODUCT_SPECIFIC.has(section.type)).length
  if (specificCount < 2) issues.push({ code: 'generic-structure', severity: 'warning', message: '서비스 전용 UI 블록이 2개 미만입니다.', variant: screen.variant })
  return issues
}

function fingerprint(screen: UIScreenIR) {
  return new Set(screen.sections.map(section => section.type))
}

function jaccard(a: Set<string>, b: Set<string>) {
  const intersection = [...a].filter(value => b.has(value)).length
  const union = new Set([...a, ...b]).size
  return union ? intersection / union : 1
}

export function inspectVariantDiversity(screens: UIScreenIR[]): UIScreenQualityIssue[] {
  const issues: UIScreenQualityIssue[] = []
  for (let left = 0; left < screens.length; left++) {
    for (let right = left + 1; right < screens.length; right++) {
      const similarity = jaccard(fingerprint(screens[left]), fingerprint(screens[right]))
      const sameLayout = screens[left].layout === screens[right].layout
      if (similarity > 0.82 || sameLayout) issues.push({ code: 'low-diversity', severity: 'warning', message: `시안 ${screens[left].variant}/${screens[right].variant}의 구조적 차이가 부족합니다. (유사도 ${Math.round(similarity * 100)}%)` })
    }
  }
  return issues
}

export function inspectVisualMeasurement(screen: UIScreenIR, measurement: UIScreenVisualMeasurement): UIScreenQualityIssue[] {
  const issues: UIScreenQualityIssue[] = []
  if (measurement.documentWidth > measurement.viewportWidth + 2) issues.push({ code: 'horizontal-overflow', severity: 'error', message: `화면이 가로로 ${measurement.documentWidth - measurement.viewportWidth}px 넘칩니다.`, variant: screen.variant })
  for (const section of measurement.sections) {
    if (section.overflowX > 2) issues.push({ code: 'horizontal-overflow', severity: 'error', message: `${section.type} 블록이 가로로 넘칩니다.`, variant: screen.variant, sectionId: section.id })
    if (section.verticalText) issues.push({ code: 'vertical-text', severity: 'error', message: `${section.type} 블록에서 한 글자 줄바꿈이 감지됐습니다.`, variant: screen.variant, sectionId: section.id })
    if (section.clipped) issues.push({ code: 'clipped-section', severity: 'warning', message: `${section.type} 블록 일부가 잘렸습니다.`, variant: screen.variant, sectionId: section.id })
  }
  return issues
}

export function qualitySummary(issues: UIScreenQualityIssue[]) {
  const errors = issues.filter(issue => issue.severity === 'error')
  return { passed: errors.length === 0, score: Math.max(0, 100 - errors.length * 18 - (issues.length - errors.length) * 5), issues }
}

export function buildVisualRepairCss(issues: UIScreenQualityIssue[]) {
  const sectionIds = [...new Set(issues.filter(issue => issue.sectionId && (issue.code === 'horizontal-overflow' || issue.code === 'vertical-text')).map(issue => issue.sectionId!))]
  if (!sectionIds.length) return ''
  return sectionIds.map(id => {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
    return `[data-ui-section-id="${safeId}"]{max-width:100%;min-width:0;overflow-x:hidden}[data-ui-section-id="${safeId}"] .ui-grid{grid-template-columns:1fr!important}[data-ui-section-id="${safeId}"] .ui-item{min-width:0!important;word-break:keep-all!important}[data-ui-section-id="${safeId}"] strong,[data-ui-section-id="${safeId}"] b,[data-ui-section-id="${safeId}"] span{min-width:0;max-width:100%}`
  }).join('')
}

export function injectUIScreenRepairCss(html: string, css: string) {
  if (!css) return html
  const style = `<style id="aide-ui-quality-repair">${css}</style>`
  return html.includes('</head>') ? html.replace('</head>', `${style}</head>`) : `${style}${html}`
}
