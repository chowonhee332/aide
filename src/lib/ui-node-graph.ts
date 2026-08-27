import type { StudioDesignTheme, UIScreenIR, UIScreenItem, UIScreenSection } from './ui-screen-ir'
import type { CanvasComposition } from './design-canvas-ir'

export type UINodeType = 'root' | 'stack' | 'grid' | 'surface' | 'text' | 'icon' | 'media' | 'action' | 'metric' | 'progress' | 'navigation' | 'spacer'
export type UINodeAppearance = 'plain' | 'bordered' | 'elevated' | 'tinted' | 'primary' | 'glass' | 'image'

export interface UINodeLayout {
  direction?: 'row' | 'column'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between'
  gap?: number
  padding?: number
  columns?: number
  span?: number
  minHeight?: number
  overflow?: 'visible' | 'hidden' | 'scroll'
}

export interface UINode {
  id: string
  type: UINodeType
  role?: string
  appearance?: UINodeAppearance
  layout?: UINodeLayout
  text?: string
  value?: string | number
  icon?: string
  imageUrl?: string
  state?: 'default' | 'active' | 'success' | 'warning' | 'error'
  children?: UINode[]
}

export interface UINodeGraph {
  version: 1
  screenId: string
  variant: UIScreenIR['variant']
  platform: UIScreenIR['platform']
  composition: CanvasComposition
  root: UINode
}


function px(value: string, fallback: number): number {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}
const text = (id: string, role: string, value?: string): UINode | null => value ? { id, type: 'text', role, text: value } : null
const compact = <T>(values: Array<T | null | undefined>): T[] => values.filter((value): value is T => Boolean(value))

function itemNode(item: UIScreenItem, index: number, appearance: UINodeAppearance = 'elevated', theme?: StudioDesignTheme): UINode {
  return {
    id: item.id,
    type: 'surface',
    role: 'content-item',
    appearance,
    state: item.state,
    layout: { direction: 'column', gap: 7, padding: theme ? px(theme.cardPadding, 15) : 15, minHeight: 96 },
    children: compact([
      item.icon ? { id: `${item.id}-icon`, type: 'icon', icon: item.icon, role: 'leading-icon' } as UINode : null,
      text(`${item.id}-meta`, 'meta', item.meta || item.badge),
      text(`${item.id}-label`, 'label', item.label),
      text(`${item.id}-description`, 'body', item.description),
      item.value ? { id: `${item.id}-value`, type: 'metric', role: 'value', value: item.value } : null,
      item.actionLabel ? { id: `${item.id}-action`, type: 'action', role: 'secondary', text: item.actionLabel } : null,
      !item.label && index === 0 ? text(`${item.id}-fallback`, 'label', '항목') : null,
    ]),
  }
}

function headingNode(section: UIScreenSection): UINode {
  return {
    id: `${section.id}-heading`, type: 'stack', role: 'section-heading', layout: { direction: 'column', gap: 5 },
    children: compact([text(`${section.id}-eyebrow`, 'eyebrow', section.eyebrow), text(`${section.id}-title`, 'heading', section.title), text(`${section.id}-description`, 'body', section.description)]),
  }
}

function compactItemNode(item: UIScreenItem, index: number, role: string, theme?: StudioDesignTheme): UINode {
  return {
    id: item.id, type: 'stack', role, state: item.state, layout: { direction: 'row', align: 'center', gap: 11, padding: theme ? px(theme.itemGap, 12) + 4 : 12 },
    children: compact([
      item.icon ? { id: `${item.id}-icon`, type: 'icon', icon: item.icon, role: 'leading-icon' } as UINode : null,
      { id: `${item.id}-copy`, type: 'stack', role: 'item-copy', layout: { direction: 'column', gap: 3 }, children: compact([text(`${item.id}-meta`, 'meta', item.meta || item.badge), text(`${item.id}-label`, 'label', item.label), text(`${item.id}-description`, 'body', item.description)]) },
      item.value ? { id: `${item.id}-value`, type: 'metric', role: 'compact-value', value: item.value } : null,
      item.actionLabel ? { id: `${item.id}-action`, type: 'action', role: 'text', text: item.actionLabel } : null,
      !item.label && index === 0 ? text(`${item.id}-fallback`, 'label', '항목') : null,
    ]),
  }
}

function sectionNode(section: UIScreenSection, _index: number, screen: UIScreenIR, theme?: StudioDesignTheme): UINode {
  const heading = compact([text(`${section.id}-eyebrow`, 'eyebrow', section.eyebrow), text(`${section.id}-title`, 'heading', section.title), text(`${section.id}-description`, 'body', section.description)])
  if (section.type === 'app-header') return { id: section.id, type: 'navigation', role: 'app-header', appearance: 'plain', layout: { direction: 'row', align: 'center', justify: 'between', gap: 10, padding: 2 }, children: [text(`${section.id}-title`, 'brand', section.title || screen.name)!, { id: `${section.id}-tools`, type: 'stack', role: 'header-tools', layout: { direction: 'row', align: 'center', gap: 6 }, children: (section.items ?? []).slice(0, 3).map((item, itemIndex) => ({ id: item.id, type: 'stack', role: item.state === 'active' || itemIndex === 0 ? 'header-tool-active' : 'header-tool', layout: { direction: 'row', align: 'center', gap: 5, padding: 7 }, children: compact([item.icon ? { id: `${item.id}-icon`, type: 'icon', icon: item.icon } as UINode : null, text(`${item.id}-label`, 'caption', item.label)]) })) }] }
  if (section.type === 'hero') return { id: section.id, type: 'surface', role: 'hero', appearance: screen.layout === 'editorial' ? 'plain' : 'primary', layout: { direction: 'column', justify: 'end', gap: 10, padding: screen.layout === 'immersive' ? 28 : 22, minHeight: screen.layout === 'immersive' ? 340 : screen.layout === 'editorial' ? 255 : 205, overflow: 'hidden' }, children: [...heading, ...compact([section.primaryAction ? { id: `${section.id}-actions`, type: 'stack', role: 'actions', layout: { direction: 'row', gap: 8 }, children: compact([{ id: `${section.id}-primary`, type: 'action', role: 'primary', text: section.primaryAction }, section.secondaryAction ? { id: `${section.id}-secondary`, type: 'action', role: 'secondary', text: section.secondaryAction } : null]) } as UINode : null])] }
  if (section.type === 'bottom-nav') return { id: section.id, type: 'navigation', role: 'bottom-navigation', appearance: 'glass', layout: { direction: 'row', justify: 'between', gap: 4, padding: 10 }, children: section.items?.map((item, itemIndex) => ({ id: item.id, type: 'stack', role: item.state === 'active' || itemIndex === 0 ? 'nav-active' : 'nav-item', layout: { direction: 'column', align: 'center', gap: 3 }, children: compact([item.icon ? { id: `${item.id}-icon`, type: 'icon', icon: item.icon } as UINode : null, text(`${item.id}-label`, 'caption', item.label)]) })) }
  if (section.type === 'search') return { id: section.id, type: 'surface', role: 'search-field', appearance: 'bordered', layout: { direction: 'row', align: 'center', gap: 10, padding: 14 }, children: [{ id: `${section.id}-search-icon`, type: 'icon', icon: 'search', role: 'search-icon' }, text(`${section.id}-placeholder`, 'search-placeholder', section.placeholder || section.title || '검색')!] }
  if (section.type === 'tabs' || section.type === 'filters' || section.type === 'actions') return { id: section.id, type: 'stack', role: `section-${section.type}`, layout: { direction: 'column', gap: 10 }, children: [headingNode(section), { id: `${section.id}-controls`, type: 'stack', role: `${section.type}-controls`, layout: { direction: 'row', gap: 7, overflow: 'scroll' }, children: (section.items ?? []).map((item, itemIndex) => ({ id: item.id, type: 'action', role: item.state === 'active' || itemIndex === 0 ? 'chip-active' : 'chip', text: item.label })) }] }
  if (section.type === 'progress') return { id: section.id, type: 'surface', role: 'progress-section', appearance: 'elevated', layout: { direction: 'column', gap: 10, padding: 18 }, children: [...heading, { id: `${section.id}-progress`, type: 'progress', value: section.value ?? 0 }, ...(section.items?.map((item, itemIndex) => itemNode(item, itemIndex, 'plain', theme)) ?? [])] }
  if (section.type === 'media' && section.items?.[0]?.imageUrl) return { id: section.id, type: 'surface', role: 'media-feature', appearance: 'image', layout: { direction: 'column', gap: 0, overflow: 'hidden' }, children: [{ id: `${section.id}-media`, type: 'media', imageUrl: section.items[0].imageUrl, text: section.items[0].label }, { id: `${section.id}-copy`, type: 'stack', layout: { direction: 'column', gap: 8, padding: 18 }, children: heading }] }
  if (section.type === 'chart') return { id: section.id, type: 'surface', role: 'chart-section', appearance: 'elevated', layout: { direction: 'column', gap: 14, padding: 18 }, children: [headingNode(section), { id: `${section.id}-plot`, type: 'stack', role: 'chart-plot', layout: { direction: 'row', align: 'end', justify: 'between', gap: 8, minHeight: 128 }, children: (section.items ?? []).slice(0, 7).map((item, itemIndex) => ({ id: item.id, type: 'stack', role: 'chart-column', layout: { direction: 'column', align: 'center', justify: 'end', gap: 6 }, children: [{ id: `${item.id}-bar`, type: 'surface', role: 'chart-bar', appearance: item.state === 'active' ? 'primary' : 'tinted', layout: { minHeight: 38 + ((itemIndex * 29 + String(item.value ?? '').length * 13) % 76) } }, text(`${item.id}-label`, 'caption', item.label)!] })) }] }
  if (section.type === 'timeline' || section.type === 'feed' || section.type === 'list' || section.type === 'chat') return { id: section.id, type: 'stack', role: `section-${section.type}`, layout: { direction: 'column', gap: 9 }, children: [headingNode(section), { id: `${section.id}-content`, type: 'stack', role: `${section.type}-stream`, layout: { direction: 'column', gap: 0 }, children: (section.items ?? []).map((item, itemIndex) => compactItemNode(item, itemIndex, `${section.type}-item`, theme)) }] }
  if (section.type === 'map') return { id: section.id, type: 'surface', role: 'map-stage', appearance: 'tinted', layout: { direction: 'column', justify: 'between', gap: 18, padding: 20, minHeight: 230, overflow: 'hidden' }, children: [headingNode(section), { id: `${section.id}-pins`, type: 'stack', role: 'map-pins', layout: { direction: 'row', justify: 'between', align: 'end', gap: 8 }, children: (section.items ?? []).slice(0, 3).map((item, itemIndex) => ({ id: item.id, type: 'stack', role: `map-pin pin-${itemIndex + 1}`, layout: { direction: 'column', align: 'center', gap: 5 }, children: [{ id: `${item.id}-icon`, type: 'icon', icon: item.icon || 'map' }, text(`${item.id}-label`, 'caption', item.label)!] })) }] }
  const columns = section.columns ?? 2
  const appearance: UINodeAppearance = screen.layout === 'editorial' ? 'plain' : screen.layout === 'immersive' ? 'bordered' : 'elevated'
  return { id: section.id, type: 'stack', role: `section-${section.type}`, layout: { direction: 'column', gap: 11 }, children: [headingNode(section), { id: `${section.id}-content`, type: columns > 1 ? 'grid' : 'stack', role: section.type, layout: { direction: 'column', gap: 10, columns }, children: section.items?.map((item, itemIndex) => itemNode(item, itemIndex, appearance, theme)) ?? [] }] }
}

export function screenIrToNodeGraph(screen: UIScreenIR, theme?: StudioDesignTheme): UINodeGraph {
  // 구도는 모델이 고른 screen.layout을 따른다. 변형 알파벳으로 고정하면
  // 같은 함수의 appearance(screen.layout 기반)와 모순되고 A/B/C가 실제로 달라지지 않는다.
  const composition = screen.layout ?? ({ A: 'dashboard', B: 'editorial', C: 'immersive' } as const)[screen.variant]
  const bottom = screen.sections.filter(section => section.type === 'bottom-nav')
  const content = screen.sections.filter(section => section.type !== 'bottom-nav')
  const sectionGap = theme ? px(theme.sectionGap, composition === 'editorial' ? 22 : 18) : (composition === 'editorial' ? 22 : 18)
  return { version: 1, screenId: `${screen.variant}-${screen.name}`, variant: screen.variant, platform: screen.platform, composition, root: { id: 'root', type: 'root', role: 'screen', layout: { direction: 'column', gap: sectionGap, padding: screen.platform === 'mobile' ? 16 : 32 }, children: [...content.map((section, index) => sectionNode(section, index, screen, theme)), ...bottom.map((section, index) => sectionNode(section, content.length + index, screen, theme))] } }
}

export function validateNodeGraph(graph: UINodeGraph) {
  const ids = new Set<string>(); const errors: string[] = []
  const visit = (node: UINode, depth: number) => {
    if (depth > 12) errors.push(`depth:${node.id}`)
    if (ids.has(node.id)) errors.push(`duplicate:${node.id}`)
    ids.add(node.id)
    if ((node.type === 'text' || node.type === 'action') && !node.text) errors.push(`empty:${node.id}`)
    node.children?.forEach(child => visit(child, depth + 1))
  }
  visit(graph.root, 0)
  return { valid: errors.length === 0, errors, nodeCount: ids.size }
}
