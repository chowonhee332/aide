import type { CanvasNode, DesignCanvasIR, DesignDirection, DesignDirectionRequest } from './design-canvas-ir'

type ContentSeed = {
  headline?: string
  metrics?: Array<{ label: string; value: string }>
}

function node(id: string, kind: CanvasNode['kind'], role: string, x: number, y: number, width: number, height: number, text?: string, caption?: string): CanvasNode {
  return { id, kind, role, x, y, width, height, text, caption }
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

export function buildDesignCanvasIR(
  direction: DesignDirection,
  request: DesignDirectionRequest,
  content: ContentSeed = {},
): DesignCanvasIR {
  const mobile = request.platform === 'mobile'
  const width = mobile ? 390 : 1440
  const height = mobile ? 844 : 1024
  const pad = mobile ? 20 : 48
  const top = direction.navigation === 'top-bar' ? (mobile ? 64 : 72) : pad
  const navWidth = direction.navigation === 'sidebar' && !mobile ? 224 : 0
  const contentX = pad + navWidth
  const contentWidth = width - contentX - pad
  // ServiceAnalysis가 만든 실제 콘텐츠를 우선 사용한다. 없을 때만 요약으로 폴백한다.
  const seed = request.contentSeed
  const seedMetrics = (seed?.kpis ?? []).map(kpi => ({ label: kpi.label, value: kpi.value }))
  const metrics = content.metrics?.length ? content.metrics : seedMetrics
  const headlineSource = content.headline || request.projectSummary || direction.thesis
  const headline = conciseHeadline(headlineSource, mobile)
  const nodes: CanvasNode[] = []

  if (direction.navigation === 'sidebar' && !mobile) {
    nodes.push(node('navigation', 'navigation', 'sidebar', 0, 0, 224, height))
  } else if (direction.navigation === 'top-bar') {
    nodes.push(node('navigation', 'navigation', 'top-bar', 0, 0, width, top))
  } else if (direction.navigation === 'bottom-tabs' && mobile) {
    nodes.push(node('navigation', 'navigation', 'bottom-tabs', 0, height - 72, width, 72))
  }

  const heroHeight = direction.composition === 'immersive' ? (mobile ? 410 : 620)
    : direction.composition === 'editorial' ? (mobile ? 300 : 420)
      : direction.composition === 'workspace' ? (mobile ? 220 : 300)
        : mobile ? 240 : 320
  const heroWidth = direction.composition === 'workspace' && !mobile ? Math.round(contentWidth * 0.62) : contentWidth
  nodes.push(node('focal', direction.mediaMode === 'photo' ? 'image' : 'frame', 'focal-point', contentX, top + pad, heroWidth, heroHeight))
  nodes.push(node('headline', 'text', 'headline', contentX + pad, top + pad * 2, Math.min(heroWidth - pad * 2, mobile ? 300 : 620), mobile ? 92 : 120, headline))
  nodes.push(node('primary-action', 'button', 'primary-action', contentX + pad, top + heroHeight - (mobile ? 44 : 56), mobile ? 132 : 164, mobile ? 44 : 48, direction.primaryAction))

  if (direction.composition === 'workspace' && !mobile) {
    nodes.push(node('side-panel', 'frame', 'detail-panel', contentX + heroWidth + 24, top + pad, contentWidth - heroWidth - 24, heroHeight))
  }

  const sectionTop = top + pad + heroHeight + (direction.density === 'airy' ? 40 : 20)
  const available = contentWidth
  const columns = direction.composition === 'dashboard' ? (mobile ? 3 : 4)
    : direction.composition === 'editorial' ? (mobile ? 2 : 3)
      : direction.composition === 'feed' || direction.composition === 'guided' ? 1
        : mobile ? 2 : 3
  const gap = direction.density === 'compact' ? 12 : direction.density === 'airy' ? 24 : 16
  const cardWidth = (available - gap * (columns - 1)) / columns
  const cardHeight = direction.composition === 'feed' ? (mobile ? 132 : 168)
    : direction.composition === 'editorial' ? (mobile ? 180 : 230)
      : mobile ? 108 : 148
  const labels = direction.sectionFlow.length ? direction.sectionFlow : ['핵심 콘텐츠', '추천', '최근 활동']
  // keyDataPoints = "첫 화면에 실제로 보여야 할 데이터 항목". coreObjects는
  // 데이터가 아니라 도메인 객체라 카드 캡션으로는 쓰지 않는다.
  const dataPoints = (request.keyDataPoints ?? []).filter(Boolean)
  labels.slice(0, 6).forEach((label, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const x = contentX + col * (cardWidth + gap)
    const y = sectionTop + row * (cardHeight + gap)
    const kind: CanvasNode['kind'] = direction.composition === 'dashboard' && index < 3 ? 'metric'
      : direction.composition === 'feed' ? 'list'
        : 'card'
    // 제목은 방향이 정한 sectionFlow, 두 번째 줄은 서비스의 실제 데이터다.
    // 고정 문장 하나로 채우면 모든 카드가 똑같아 보인다.
    // metric은 kpi의 label/value가 한 쌍이라 그대로 쓴다.
    // card/list의 제목은 방향이 정한 sectionFlow이므로, 두 번째 줄에는
    // 특정 항목의 값이 아니라 이 서비스가 다루는 데이터 종류를 보여준다.
    const metric = metrics[index]
    const text = kind === 'metric' && metric ? metric.value : label
    const caption = kind === 'metric'
      ? (metric?.label ?? '')
      : (dataPoints.length ? dataPoints[index % dataPoints.length] : '')
    nodes.push(node(`section-${index + 1}`, kind, label, x, y, cardWidth, cardHeight, text, caption))
  })

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
