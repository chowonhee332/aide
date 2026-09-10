'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialIcon } from '@/components/ui/material-icon'
import { MEMORY_DOMAINS, type MemoryDomainId, type MemoryEdge, type MemoryNode } from '@/lib/memory-graph'

interface ViewTransform { x: number; y: number; scale: number }

interface MemoryGraphCanvasProps {
  nodes: MemoryNode[]
  edges: MemoryEdge[]
  activeDomain: MemoryDomainId
  query: string
  selectedIds: string[]
  onNodeSelect: (node: MemoryNode) => void
}

function drawStar(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath()
  context.moveTo(x, y - radius)
  context.quadraticCurveTo(x + radius * 0.18, y - radius * 0.18, x + radius, y)
  context.quadraticCurveTo(x + radius * 0.18, y + radius * 0.18, x, y + radius)
  context.quadraticCurveTo(x - radius * 0.18, y + radius * 0.18, x - radius, y)
  context.quadraticCurveTo(x - radius * 0.18, y - radius * 0.18, x, y - radius)
  context.closePath()
}

export function MemoryGraphCanvas({ nodes, edges, activeDomain, query, selectedIds, onNodeSelect }: MemoryGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 0.72 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const dragRef = useRef<{ x: number; y: number; viewX: number; viewY: number; moved: boolean } | null>(null)
  const nodeMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const normalizedQuery = query.trim().toLocaleLowerCase('ko')

  const isRelated = useCallback((node: MemoryNode) => {
    const domainMatch = activeDomain === 'all' || node.domain === activeDomain
    const queryMatch = !normalizedQuery || `${node.title} ${node.summary} ${node.sourcePath}`.toLocaleLowerCase('ko').includes(normalizedQuery)
    return domainMatch && queryMatch
  }, [activeDomain, normalizedQuery])

  const resolveColor = useCallback((node: MemoryNode, styles: CSSStyleDeclaration) => {
    const token = MEMORY_DOMAINS.find(domain => domain.id === node.domain)?.colorToken ?? '--aui-primary'
    return styles.getPropertyValue(token).trim() || styles.getPropertyValue('--aui-primary').trim()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)
    const styles = getComputedStyle(wrapper)
    const muted = styles.getPropertyValue('--aui-border-subtle').trim()
    const text = styles.getPropertyValue('--aui-text').trim()
    const surface = styles.getPropertyValue('--aui-surface').trim()
    const originX = width / 2 + view.x
    const originY = height / 2 + view.y
    const toScreen = (node: MemoryNode) => ({ x: originX + node.x * view.scale, y: originY + node.y * view.scale })

    context.lineCap = 'round'
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) return
      const a = toScreen(source)
      const b = toScreen(target)
      const active = isRelated(source) && isRelated(target)
      const selected = selectedSet.has(source.id) || selectedSet.has(target.id)
      context.beginPath()
      context.moveTo(a.x, a.y)
      context.lineTo(b.x, b.y)
      context.strokeStyle = active ? resolveColor(source, styles) : muted
      context.globalAlpha = selected ? 0.72 : active ? 0.24 : 0.07
      context.lineWidth = selected ? 1.6 : 0.7
      context.setLineDash(edge.inferred ? [2, 5] : [])
      context.stroke()
    })
    context.setLineDash([])

    nodes.forEach(node => {
      const point = toScreen(node)
      if (point.x < -20 || point.x > width + 20 || point.y < -20 || point.y > height + 20) return
      const active = isRelated(node)
      const selected = selectedSet.has(node.id)
      const hovered = hoveredId === node.id
      const radius = Math.max(1.8, node.weight * view.scale * 2.35) + (selected ? 3 : 0)
      const color = active ? resolveColor(node, styles) : muted
      context.globalAlpha = selected ? 1 : active ? 0.78 : 0.2
      if (selected || hovered) {
        context.beginPath()
        context.arc(point.x, point.y, radius + 6, 0, Math.PI * 2)
        context.fillStyle = surface
        context.globalAlpha = 0.82
        context.fill()
      }
      context.globalAlpha = selected ? 1 : active ? 0.84 : 0.2
      drawStar(context, point.x, point.y, radius)
      context.fillStyle = color
      context.fill()

      if ((node.weight > 2.3 && activeDomain === node.domain) || selected || hovered) {
        context.globalAlpha = 1
        context.font = `${selected ? 600 : 500} 12px var(--font-pretendard, sans-serif)`
        context.fillStyle = text
        context.fillText(node.title, point.x + radius + 7, point.y + 4)
      }
    })
    context.globalAlpha = 1
  }, [activeDomain, edges, hoveredId, isRelated, nodeMap, nodes, resolveColor, selectedSet, view])

  useEffect(() => {
    draw()
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const observer = new ResizeObserver(draw)
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [draw])

  useEffect(() => {
    const nextView = (() => {
      if (activeDomain === 'all') return { x: 0, y: 0, scale: 0.72 }
      const domainNodes = nodes.filter(node => node.domain === activeDomain)
      if (!domainNodes.length) return null
      const center = domainNodes.reduce((sum, node) => ({ x: sum.x + node.x, y: sum.y + node.y }), { x: 0, y: 0 })
      return { x: -(center.x / domainNodes.length) * 1.12, y: -(center.y / domainNodes.length) * 1.12, scale: 1.12 }
    })()
    if (!nextView) return
    queueMicrotask(() => setView(nextView))
  }, [activeDomain, nodes])

  const nodeAt = useCallback((clientX: number, clientY: number) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return null
    const rect = wrapper.getBoundingClientRect()
    const graphX = (clientX - rect.left - rect.width / 2 - view.x) / view.scale
    const graphY = (clientY - rect.top - rect.height / 2 - view.y) / view.scale
    let closest: MemoryNode | null = null
    let distance = 18 / view.scale
    for (const node of nodes) {
      const current = Math.hypot(node.x - graphX, node.y - graphY)
      if (current < distance) {
        closest = node
        distance = current
      }
    }
    return closest
  }, [nodes, view])

  const fit = useCallback(() => setView({ x: 0, y: 0, scale: 0.72 }), [])

  return (
    <div ref={wrapperRef} className="memory-graph-canvas">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`조직 기억 그래프. 노드 ${nodes.length.toLocaleString()}개. 드래그로 이동하고 휠로 확대할 수 있습니다.`}
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId)
          dragRef.current = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y, moved: false }
        }}
        onPointerMove={event => {
          const drag = dragRef.current
          if (drag) {
            const dx = event.clientX - drag.x
            const dy = event.clientY - drag.y
            drag.moved = drag.moved || Math.abs(dx) + Math.abs(dy) > 4
            setView(current => ({ ...current, x: drag.viewX + dx, y: drag.viewY + dy }))
            return
          }
          setHoveredId(nodeAt(event.clientX, event.clientY)?.id ?? null)
        }}
        onPointerUp={event => {
          const drag = dragRef.current
          dragRef.current = null
          if (!drag?.moved) {
            const node = nodeAt(event.clientX, event.clientY)
            if (node) onNodeSelect(node)
          }
        }}
        onPointerLeave={() => { dragRef.current = null; setHoveredId(null) }}
        onWheel={event => {
          event.preventDefault()
          const next = Math.min(2.2, Math.max(0.32, view.scale * (event.deltaY > 0 ? 0.9 : 1.1)))
          setView(current => ({ ...current, scale: next }))
        }}
      />
      <div className="memory-graph-controls" aria-label="그래프 화면 제어">
        <button type="button" aria-label="확대" onClick={() => setView(current => ({ ...current, scale: Math.min(2.2, current.scale * 1.18) }))}><MaterialIcon name="add" size={19} /></button>
        <button type="button" aria-label="축소" onClick={() => setView(current => ({ ...current, scale: Math.max(0.32, current.scale / 1.18) }))}><MaterialIcon name="remove" size={19} /></button>
        <button type="button" aria-label="전체 보기" onClick={fit}><MaterialIcon name="fit_screen" size={19} /></button>
      </div>
      <div className="memory-graph-legend" aria-hidden="true">
        <span><i className="is-active" />활성 기억</span>
        <span><i />전체 기억</span>
        <span><b />AI 추론 관계</span>
      </div>
    </div>
  )
}
