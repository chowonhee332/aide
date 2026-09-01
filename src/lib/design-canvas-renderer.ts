import type { CanvasNode, DesignCanvasIR, DesignDirection, DesignDirectionRequest } from './design-canvas-ir'

type ContentSeed = {
  headline?: string
  metrics?: Array<{ label: string; value: string }>
}

function node(id: string, kind: CanvasNode['kind'], role: string, x: number, y: number, width: number, height: number, text?: string, caption?: string): CanvasNode {
  return { id, kind, role, x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), text, caption }
}

/**
 * A hero headline is a name, not the whole brief. The request carries a summary
 * written for the model, so cut it down to the first clause and cap the length —
 * otherwise the preview shows the user's own input wrapped over three lines.
 */
function conciseHeadline(source: string, mobile: boolean): string {
  const firstClause = source.split(/[.\n·|]|(?:\s+[-—]\s+)/)[0].trim() || source.trim()
  const limit = mobile ? 22 : 40
  if (firstClause.length <= limit) return firstClause
  const cut = firstClause.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > limit * 0.5 ? cut.slice(0, lastSpace) : cut).trim() + '…'
}

interface BodyBox {
  mobile: boolean
  x: number
  y: number
  w: number
  h: number
}

interface BodyContent {
  headline: string
  labels: string[]
  metrics: Array<{ label: string; value: string }>
  dataPoints: string[]
}

function gap(density: DesignDirection['density']): number {
  return density === 'compact' ? 10 : density === 'airy' ? 22 : 14
}

/** Cards laid out on a fixed column grid, filling `count` slots. */
function grid(
  nodes: CanvasNode[],
  idPrefix: string,
  kind: CanvasNode['kind'],
  role: string,
  x: number,
  y: number,
  w: number,
  columns: number,
  g: number,
  rowH: number,
  count: number,
  label: (i: number) => string | undefined,
  caption: (i: number) => string | undefined,
): void {
  const cw = (w - g * (columns - 1)) / columns
  for (let i = 0; i < count; i++) {
    const col = i % columns
    const row = Math.floor(i / columns)
    nodes.push(node(`${idPrefix}-${i + 1}`, kind, role, x + col * (cw + g), y + row * (rowH + g), cw, rowH, label(i), caption(i)))
  }
}

/** A vertical stack of full-width rows. */
function stack(
  nodes: CanvasNode[],
  idPrefix: string,
  kind: CanvasNode['kind'],
  role: string,
  x: number,
  y: number,
  w: number,
  rowH: number,
  g: number,
  count: number,
  label: (i: number) => string | undefined,
  caption: (i: number) => string | undefined,
): void {
  for (let i = 0; i < count; i++) {
    nodes.push(node(`${idPrefix}-${i + 1}`, kind, role, x, y + i * (rowH + g), w, rowH, label(i), caption(i)))
  }
}

// ── Section-band layout — 각 섹션 슬러그가 서로 다른 밴드로 그려진다 ──────────
// authored 구조는 sectionFlow 에 실제 섹션 슬러그(kpi-band, data-table, ...)를 담는다.
// composition 하나로 뭉뚱그리지 않고 슬러그별로 다른 실루엣을 그려야 5개가 달라 보인다.

type BandDrawer = (n: CanvasNode[], id: string, x: number, y: number, w: number, h: number, g: number, c: BodyContent, mobile: boolean) => void

const bandHero: BandDrawer = (n, id, x, y, w, h, _g, c) => {
  n.push(node(id, 'frame', 'focal-point', x, y, w, h))
  n.push(node(`${id}-h`, 'text', 'headline', x + 16, y + h - 56, Math.min(w - 32, 260), 36, c.headline))
}
const bandKpi: BandDrawer = (n, id, x, y, w, h, g, c) => {
  const k = 4
  const cw = (w - g * (k - 1)) / k
  for (let i = 0; i < k; i++) n.push(node(`${id}-${i}`, 'metric', 'kpi', x + i * (cw + g), y, cw, h, c.metrics[i]?.value, c.metrics[i]?.label))
}
const bandChips: BandDrawer = (n, id, x, y, w, h) => {
  let cx = x
  for (let i = 0; i < 5 && cx < x + w - 40; i++) { const cw = 44 + (i % 3) * 14; n.push(node(`${id}-${i}`, 'shape', 'chip', cx, y, cw, Math.min(h, 26))); cx += cw + 8 }
}
const bandSearch: BandDrawer = (n, id, x, y, w, h) => n.push(node(id, 'navigation', 'search', x, y, w, Math.min(h, 40)))
const bandSegment: BandDrawer = (n, id, x, y, w, h) => {
  const seg = (w - 16) / 3
  for (let i = 0; i < 3; i++) n.push(node(`${id}-${i}`, 'shape', 'segment', x + i * (seg + 8), y, seg, Math.min(h, 32)))
}
const bandRail: BandDrawer = (n, id, x, y, w, h, g, c) => {
  const cw = Math.round(w * 0.46)
  for (let i = 0; i < 3; i++) n.push(node(`${id}-${i}`, 'card', 'rail-card', x + i * (cw + g), y, cw, h - 14, lab(c, i), cap(c, i)))
  for (let i = 0; i < 4; i++) n.push(node(`${id}-d${i}`, 'shape', 'page-dot', x + w / 2 - 21 + i * 14, y + h - 8, 6, 6))
}
const bandGrid: BandDrawer = (n, id, x, y, w, h, g, c) => grid(n, id, 'card', 'grid-card', x, y, w, 2, g, (h - g) / 2, 4, i => lab(c, i), i => cap(c, i))
const bandBento: BandDrawer = (n, id, x, y, w, h, g, c) => {
  const bigW = Math.round(w * 0.58)
  n.push(node(`${id}-big`, 'card', 'bento', x, y, bigW, h, lab(c, 0), cap(c, 0)))
  n.push(node(`${id}-s1`, 'card', 'bento', x + bigW + g, y, w - bigW - g, (h - g) / 2, lab(c, 1)))
  n.push(node(`${id}-s2`, 'card', 'bento', x + bigW + g, y + (h - g) / 2 + g, w - bigW - g, (h - g) / 2, lab(c, 2)))
}
const bandList: BandDrawer = (n, id, x, y, w, h, g, c) => { const rows = Math.max(3, Math.min(4, Math.floor((h + g) / (44 + g)))); stack(n, id, 'list', 'row', x, y, w, (h - g * (rows - 1)) / rows, g, rows, i => lab(c, i), i => cap(c, i)) }
const bandTable: BandDrawer = (n, id, x, y, w, h, g) => {
  n.push(node(`${id}-head`, 'shape', 'table-head', x, y, w, 24))
  const rows = 4, rh = (h - 24 - g - g * (rows - 1)) / rows
  for (let r = 0; r < rows; r++) for (let col = 0; col < 4; col++) { const cw = (w - g * 3) / 4; n.push(node(`${id}-${r}-${col}`, 'shape', 'table-cell', x + col * (cw + g), y + 24 + g + r * (rh + g), cw, rh)) }
}
const bandTimeline: BandDrawer = (n, id, x, y, w, h, g) => {
  const rows = 4, rh = (h - g * (rows - 1)) / rows
  for (let i = 0; i < rows; i++) { const ry = y + i * (rh + g); n.push(node(`${id}-dot${i}`, 'shape', 'timeline-dot', x, ry + rh / 2 - 4, 8, 8)); n.push(node(`${id}-${i}`, 'list', 'timeline-row', x + 20, ry, w - 20, rh)) }
}
const bandForm: BandDrawer = (n, id, x, y, w, h, g) => { const rows = 4, rh = Math.min(40, (h - g * (rows - 1)) / rows); for (let i = 0; i < rows; i++) n.push(node(`${id}-${i}`, 'shape', 'input', x, y + i * (rh + g), w * (0.7 + (i % 3) * 0.1), rh)) }
const bandCta: BandDrawer = (n, id, x, y, w, h) => n.push(node(id, 'button', 'primary-action', x, y, w, Math.min(h, 48)))
const bandActions: BandDrawer = (n, id, x, y, w, h, g) => { const k = 4, cw = (w - g * (k - 1)) / k; for (let i = 0; i < k; i++) n.push(node(`${id}-${i}`, 'shape', 'quick-action', x + i * (cw + g), y, cw, Math.min(h, cw))) }
const bandTrust: BandDrawer = (n, id, x, y, w, h) => { for (let i = 0; i < 5; i++) n.push(node(`${id}-${i}`, 'shape', 'trust-logo', x + i * ((w - 4 * 16) / 5 + 16), y + (h - 28) / 2, (w - 4 * 16) / 5, 28)) }
const bandSplit: BandDrawer = (n, id, x, y, w, h, g, c, mobile) => {
  if (mobile) { n.push(node(`${id}-m`, 'frame', 'work-area', x, y, w, h * 0.5)); stack(n, id, 'list', 'detail', x, y + h * 0.5 + g, w, (h * 0.5 - g * 2) / 2, g, 2, i => lab(c, i), () => undefined) }
  else { n.push(node(`${id}-m`, 'frame', 'work-area', x, y, w * 0.62, h)); n.push(node(`${id}-s`, 'frame', 'detail-panel', x + w * 0.62 + g, y, w * 0.38 - g, h)) }
}
const bandMap: BandDrawer = (n, id, x, y, w, h) => { n.push(node(id, 'frame', 'map', x, y, w, h)); n.push(node(`${id}-sheet`, 'frame', 'bottom-sheet', x, y + h - 40, w, 40)) }

function lab(c: BodyContent, i: number) { return c.labels[i % Math.max(1, c.labels.length)] }
function cap(c: BodyContent, i: number) { return c.dataPoints.length ? c.dataPoints[i % c.dataPoints.length] : undefined }

const SECTION_BANDS: Record<string, { weight: number; draw: BandDrawer }> = {
  'summary-hero': { weight: 2.4, draw: bandHero }, 'photo-hero': { weight: 2.6, draw: bandHero },
  'object-3d-hero': { weight: 2.4, draw: bandHero }, 'brand-hero': { weight: 2.4, draw: bandHero },
  'progress-hero': { weight: 2.0, draw: bandHero }, 'featured-hero': { weight: 2.4, draw: bandHero },
  'kpi-band': { weight: 1.0, draw: bandKpi }, 'map-preview': { weight: 2.4, draw: bandMap },
  'search-bar': { weight: 0.5, draw: bandSearch }, 'address-search': { weight: 0.5, draw: bandSearch },
  'category-chips': { weight: 0.5, draw: bandChips }, 'filter-chips': { weight: 0.5, draw: bandChips },
  'preference-chips': { weight: 0.5, draw: bandChips }, 'segmented-tabs': { weight: 0.45, draw: bandSegment },
  'category-rail': { weight: 1.4, draw: bandRail }, 'card-rail': { weight: 1.4, draw: bandRail },
  'horizontal-rail': { weight: 1.4, draw: bandRail }, 'coupon-rail': { weight: 1.2, draw: bandRail },
  'related-recommendations': { weight: 1.2, draw: bandRail }, 'story-rail': { weight: 0.7, draw: bandRail },
  'card-grid': { weight: 2.0, draw: bandGrid }, 'result-grid': { weight: 2.2, draw: bandGrid },
  'product-card-grid': { weight: 2.2, draw: bandGrid }, 'featured-cards': { weight: 2.0, draw: bandGrid },
  'metric-cards': { weight: 1.2, draw: bandGrid }, 'benefit-cards': { weight: 1.4, draw: bandGrid },
  'mixed-size-cards': { weight: 1.8, draw: bandBento }, 'bento-tiles': { weight: 2.0, draw: bandBento },
  'feed-post': { weight: 1.8, draw: bandList }, 'recommendation-list': { weight: 1.5, draw: bandList },
  'ranked-list': { weight: 1.5, draw: bandList }, 'availability-cards': { weight: 1.5, draw: bandList },
  'comparison-table': { weight: 1.7, draw: bandTable }, 'data-table': { weight: 1.9, draw: bandTable },
  'comparison-highlights': { weight: 1.5, draw: bandTable }, 'timeline-list': { weight: 1.5, draw: bandTimeline },
  'recent-activity': { weight: 1.3, draw: bandTimeline }, 'stepper-form': { weight: 1.7, draw: bandForm },
  'conversion-cta': { weight: 0.5, draw: bandCta }, 'cta-footer': { weight: 0.5, draw: bandCta },
  'primary-cta': { weight: 0.5, draw: bandCta }, 'continue-cta': { weight: 0.5, draw: bandCta },
  'quick-actions': { weight: 0.6, draw: bandActions }, 'trust-section': { weight: 0.8, draw: bandTrust },
  'social-proof': { weight: 0.8, draw: bandTrust }, 'detail-panel': { weight: 1.8, draw: bandSplit },
  'left-nav-panel': { weight: 1.8, draw: bandSplit },
}

function bandFor(slug: string) {
  return SECTION_BANDS[slug] ?? { weight: 1.4, draw: bandList }
}

function isSectionSlugList(flow: string[]): boolean {
  if (flow.length < 3) return false
  return flow.filter(s => s in SECTION_BANDS).length >= Math.ceil(flow.length * 0.5)
}

/** authored 섹션 순서를 위→아래 밴드로 그린다. 슬러그마다 실루엣이 다르다. */
function layoutSectionBands(nodes: CanvasNode[], direction: DesignDirection, box: BodyBox, content: BodyContent): void {
  const { mobile, x, y, w, h } = box
  const g = gap(direction.density)
  const slugs = content.labels.slice(0, 7)
  const bands = slugs.map(bandFor)
  const totalWeight = bands.reduce((s, b) => s + b.weight, 0) || 1
  const usableH = h - g * (bands.length - 1)
  let cursor = y
  bands.forEach((band, i) => {
    const bh = Math.max(28, Math.round((usableH * band.weight) / totalWeight))
    band.draw(nodes, `sec-${i}-${slugs[i].replace(/[^a-z0-9]+/gi, '')}`, x, cursor, w, bh, g, content, mobile)
    cursor += bh + g
  })
}

/**
 * Body layout per composition. Same branch runs for mobile and web — only the
 * numbers scale with `box`. This is what makes the 6 wireframes read as
 * genuinely different structures instead of hero + 2-col grid every time.
 */
function layoutBody(nodes: CanvasNode[], direction: DesignDirection, box: BodyBox, content: BodyContent): void {
  const { mobile, x, y, w, h } = box
  const g = gap(direction.density)
  // authored 구조(sectionFlow 가 섹션 슬러그 목록)면 슬러그별 밴드로 그린다.
  if (isSectionSlugList(content.labels)) {
    layoutSectionBands(nodes, direction, box, content)
    return
  }
  const lab = (i: number) => content.labels[i % content.labels.length]
  const cap = (i: number) => (content.dataPoints.length ? content.dataPoints[i % content.dataPoints.length] : undefined)
  const heroKind: CanvasNode['kind'] =
    direction.mediaMode === 'photo' || direction.mediaMode === 'illustration' || direction.mediaMode === 'mixed' ? 'image' : 'frame'

  switch (direction.composition) {
    case 'carousel': {
      // 좌우로 넘기는 큰 카드. 현재 카드 + 다음 카드 미리보기 + 페이지 닷.
      nodes.push(node('section-title', 'text', 'section-title', x, y, Math.min(w * 0.55, 240), 22, content.labels[0]))
      const cy = y + 22 + g
      const cardW = Math.round(w * (mobile ? 0.84 : 0.4))
      const cardH = Math.round((mobile ? h * 0.6 : h * 0.72))
      nodes.push(node('slide-1', 'card', 'slide', x, cy, cardW, cardH, lab(0), cap(0)))
      nodes.push(node('slide-2', 'card', 'slide', x + cardW + g, cy, cardW, cardH, lab(1), cap(1)))
      if (!mobile) nodes.push(node('slide-3', 'card', 'slide', x + (cardW + g) * 2, cy, cardW, cardH, lab(2), cap(2)))
      const dotsY = cy + cardH + g
      for (let i = 0; i < 4; i++) {
        nodes.push(node(`dot-${i + 1}`, 'shape', 'page-dot', x + w / 2 - 21 + i * 14, dotsY, 6, 6))
      }
      stack(nodes, 'below', 'list', 'row', x, dotsY + 16, w, mobile ? 40 : 52, g, mobile ? 2 : 3, lab, cap)
      break
    }
    case 'immersive': {
      const heroH = Math.round(h * (mobile ? 0.62 : 0.66))
      nodes.push(node('focal', heroKind, 'focal-point', x, y, w, heroH))
      nodes.push(node('headline', 'text', 'headline', x + 20, y + heroH - (mobile ? 118 : 150), Math.min(w - 40, mobile ? 300 : 560), mobile ? 84 : 108, content.headline))
      nodes.push(node('primary-action', 'button', 'primary-action', x + 20, y + heroH - (mobile ? 44 : 52), mobile ? 140 : 180, mobile ? 44 : 48, direction.primaryAction))
      const restY = y + heroH + g
      grid(nodes, 'teaser', 'card', 'teaser', x, restY, w, mobile ? 2 : 4, g, Math.max(0, h - heroH - g), mobile ? 2 : 4, lab, cap)
      break
    }
    case 'editorial': {
      // 카드 그리드. 지배적 히어로 없이 얇은 섹션 타이틀 + 균일 카드가 body를 채운다.
      nodes.push(node('section-title', 'text', 'section-title', x, y, Math.min(w * 0.6, 320), 26, content.labels[0]))
      const gy = y + 26 + g
      const cols = mobile ? 2 : 3
      const rows = 3
      const rowH = (h - 26 - g - g * (rows - 1)) / rows
      grid(nodes, 'story', 'card', 'story', x, gy, w, cols, g, rowH, cols * rows, lab, cap)
      break
    }
    case 'feed': {
      const colW = mobile ? w : Math.min(w, 640)
      const colX = mobile ? x : x + (w - colW) / 2
      const rowH = mobile ? 116 : 132
      const count = Math.max(3, Math.min(6, Math.floor((h + g) / (rowH + g))))
      stack(nodes, 'row', 'list', 'feed-item', colX, y, colW, rowH, g, count, lab, cap)
      break
    }
    case 'dashboard': {
      const kpiH = mobile ? 76 : 104
      const kpiCount = mobile ? 2 : 4
      const cw = (w - g * (kpiCount - 1)) / kpiCount
      for (let i = 0; i < kpiCount; i++) {
        const metric = content.metrics[i]
        nodes.push(node(`kpi-${i + 1}`, 'metric', 'kpi', x + i * (cw + g), y, cw, kpiH, metric?.value ?? lab(i), metric?.label ?? ''))
      }
      const gy = y + kpiH + g * 1.5
      const cols = mobile ? 2 : 3
      const rows = 2
      const rowH = Math.max(60, (h - kpiH - g * 1.5 - g) / rows)
      grid(nodes, 'panel', mobile ? 'card' : 'list', 'panel', x, gy, w, cols, g, rowH, cols * rows, lab, cap)
      break
    }
    case 'guided': {
      const colW = mobile ? w : Math.min(w, 560)
      const colX = mobile ? x : x + (w - colW) / 2
      nodes.push(node('stepper', 'navigation', 'stepper', colX, y, colW, 22))
      const stepH = Math.round(h * 0.46)
      const focalY = y + 22 + g
      nodes.push(node('focal', 'frame', 'focal-point', colX, focalY, colW, stepH))
      const qY = focalY + stepH + g
      nodes.push(node('headline', 'text', 'question', colX, qY, colW, 52, content.headline))
      stack(nodes, 'choice', 'card', 'choice', colX, qY + 52 + g, colW, mobile ? 50 : 58, g, 3, lab, () => undefined)
      nodes.push(node('primary-action', 'button', 'primary-action', colX, y + h - (mobile ? 44 : 48), colW, mobile ? 44 : 48, direction.primaryAction))
      break
    }
    case 'commerce': {
      const barH = mobile ? 40 : 48
      nodes.push(node('filter-bar', 'navigation', 'filter', x, y, w, barH))
      const gy = y + barH + g
      const cols = mobile ? 2 : 4
      const rows = mobile ? 3 : 2
      const rowH = Math.max(96, (h - barH - g - g * (rows - 1)) / rows)
      grid(nodes, 'product', 'card', 'product', x, gy, w, cols, g, rowH, cols * rows, lab, cap)
      break
    }
    case 'workspace': {
      if (mobile) {
        const mainH = Math.round(h * 0.42)
        nodes.push(node('panel-main', 'frame', 'work-area', x, y, w, mainH))
        const restH = h - mainH - g
        stack(nodes, 'panel', 'list', 'detail', x, y + mainH + g, w, (restH - g) / 2, g, 2, lab, cap)
      } else {
        const leftW = Math.round(w * 0.62)
        nodes.push(node('panel-main', 'frame', 'work-area', x, y, leftW, h))
        nodes.push(node('panel-side', 'frame', 'detail-panel', x + leftW + g, y, w - leftW - g, h))
      }
      break
    }
    case 'map': {
      const mapH = Math.round(h * (mobile ? 0.66 : 0.72))
      nodes.push(node('focal', 'frame', 'map', x, y, w, mapH))
      const sheetY = y + mapH - (mobile ? 56 : 72)
      nodes.push(node('sheet', 'frame', 'bottom-sheet', x, sheetY, w, h - (sheetY - y)))
      stack(nodes, 'poi', 'list', 'place', x + 12, sheetY + 16, w - 24, mobile ? 48 : 56, 8, mobile ? 2 : 3, lab, cap)
      break
    }
    case 'experimental':
    default: {
      // 깨진 그리드: 한 개 큰 프레임 + 크기가 다른 조각들.
      const bigW = mobile ? w : Math.round(w * 0.58)
      const bigH = Math.round(h * (mobile ? 0.4 : 0.54))
      nodes.push(node('focal', heroKind, 'focal-point', x, y, bigW, bigH))
      nodes.push(node('headline', 'text', 'headline', x, y + bigH + g, bigW, mobile ? 68 : 92, content.headline))
      if (!mobile) {
        const asideX = x + bigW + g
        const asideW = w - bigW - g
        nodes.push(node('aside-1', 'card', 'aside', asideX, y, asideW, Math.round(bigH * 0.55), lab(0), cap(0)))
        nodes.push(node('aside-2', 'list', 'aside', asideX, y + Math.round(bigH * 0.55) + g, asideW, bigH - Math.round(bigH * 0.55) - g, lab(1), cap(1)))
      }
      const fragY = y + bigH + g + (mobile ? 68 : 92) + g
      grid(nodes, 'frag', 'card', 'fragment', x, fragY, w, mobile ? 2 : 3, g, mobile ? 96 : 120, mobile ? 2 : 3, lab, cap)
      break
    }
  }
}

/**
 * Deterministic wireframe IR for one DesignDirection. Header and a bottom bar
 * (mobile app tabbar / web footer) are mandatory structural elements on every
 * canvas. The web shell itself is the variation axis — GNB, LNB, GNB+LNB, or a
 * minimal centered column — driven by `direction.navigation`.
 */
export function buildDesignCanvasIR(
  direction: DesignDirection,
  request: DesignDirectionRequest,
  content: ContentSeed = {},
): DesignCanvasIR {
  const mobile = request.platform === 'mobile'
  const width = mobile ? 360 : 1440
  const height = mobile ? 800 : 1024
  const pad = mobile ? 16 : 40
  const nodes: CanvasNode[] = []

  // ServiceAnalysis가 만든 실제 콘텐츠를 우선 사용한다. 없을 때만 요약으로 폴백한다.
  const seed = request.contentSeed
  const seedMetrics = (seed?.kpis ?? []).map(kpi => ({ label: kpi.label, value: kpi.value }))
  const metrics = content.metrics?.length ? content.metrics : seedMetrics
  const headlineSource = content.headline || request.projectSummary || direction.thesis
  const headline = conciseHeadline(headlineSource, mobile)
  const labels = direction.sectionFlow.length
    ? direction.sectionFlow
    : ['핵심 콘텐츠', '추천', '최근 활동', '더 보기', '알림', '설정']
  // keyDataPoints = "첫 화면에 실제로 보여야 할 데이터 항목". coreObjects는 도메인
  // 객체라 카드 캡션으로 쓰지 않는다.
  const dataPoints = (request.keyDataPoints ?? []).filter(Boolean)
  const bodyContent: BodyContent = { headline, labels, metrics, dataPoints }

  let bodyX: number
  let bodyY: number
  let bodyW: number
  let bodyH: number

  if (mobile) {
    // 앱 셸: 상단 헤더 + 하단 앱바는 방향과 무관하게 항상 존재한다.
    const headerH = 56
    const tabbarH = 64
    nodes.push(node('shell-header', 'navigation', 'app-header', 0, 0, width, headerH))
    nodes.push(node('shell-tabbar', 'navigation', 'bottom-tabs', 0, height - tabbarH, width, tabbarH))
    bodyX = pad
    bodyY = headerH + pad
    bodyW = width - pad * 2
    bodyH = height - tabbarH - bodyY
  } else if (direction.navigation === 'sidebar') {
    // 좌측 LNB만.
    const rail = 248
    const footerH = 56
    nodes.push(node('shell-lnb', 'navigation', 'sidebar', 0, 0, rail, height))
    nodes.push(node('shell-footer', 'navigation', 'footer', rail, height - footerH, width - rail, footerH))
    bodyX = rail + pad
    bodyY = pad
    bodyW = width - bodyX - pad
    bodyH = height - footerH - bodyY
  } else if (direction.navigation === 'top-and-side') {
    // GNB + LNB 혼합 (대시보드/어드민).
    const barH = 56
    const rail = 240
    const footerH = 56
    nodes.push(node('shell-gnb', 'navigation', 'top-bar', 0, 0, width, barH))
    nodes.push(node('shell-lnb', 'navigation', 'sidebar', 0, barH, rail, height - barH))
    nodes.push(node('shell-footer', 'navigation', 'footer', rail, height - footerH, width - rail, footerH))
    bodyX = rail + pad
    bodyY = barH + pad
    bodyW = width - bodyX - pad
    bodyH = height - footerH - bodyY
  } else if (direction.navigation === 'minimal') {
    // 상단 최소 바 + 좁은 중앙 컬럼, 넓은 여백.
    const barH = 44
    const footerH = 40
    const colW = Math.min(760, width - pad * 2)
    const colX = (width - colW) / 2
    nodes.push(node('shell-gnb', 'navigation', 'top-bar', colX + colW / 2 - 210, 24, 420, barH))
    nodes.push(node('shell-footer', 'navigation', 'footer', colX, height - footerH - 24, colW, footerH))
    bodyX = colX
    bodyY = 24 + barH + 40
    bodyW = colW
    bodyH = height - footerH - 24 - bodyY
  } else {
    // GNB만 (기본). 상단 전역 내비 + 넓은 단일 컬럼 + 하단 푸터.
    const barH = 64
    const footerH = 88
    const colW = Math.min(1200, width - pad * 2)
    nodes.push(node('shell-gnb', 'navigation', 'top-bar', 0, 0, width, barH))
    nodes.push(node('shell-footer', 'navigation', 'footer', 0, height - footerH, width, footerH))
    bodyX = (width - colW) / 2
    bodyY = barH + pad
    bodyW = colW
    bodyH = height - footerH - bodyY
  }

  layoutBody(nodes, direction, { mobile, x: bodyX, y: bodyY, w: bodyW, h: bodyH }, bodyContent)

  return {
    version: 1,
    id: `canvas-${direction.id}`,
    platform: request.platform,
    width,
    height,
    direction,
    nodes,
  }
}
