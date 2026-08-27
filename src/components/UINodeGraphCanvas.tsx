'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { MaterialIcon } from '@/components/ui/material-icon'
import type { StudioDesignTheme } from '@/lib/ui-screen-ir'
import type { UINode, UINodeGraph } from '@/lib/ui-node-graph'

function layoutStyle(node: UINode): CSSProperties {
  const layout = node.layout
  return { display: node.type === 'grid' ? 'grid' : layout?.direction ? 'flex' : undefined, flexDirection: layout?.direction, alignItems: layout?.align === 'start' ? 'flex-start' : layout?.align === 'end' ? 'flex-end' : layout?.align, justifyContent: layout?.justify === 'between' ? 'space-between' : layout?.justify === 'start' ? 'flex-start' : layout?.justify === 'end' ? 'flex-end' : layout?.justify, gap: layout?.gap, padding: layout?.padding, gridTemplateColumns: node.type === 'grid' ? `repeat(${layout?.columns ?? 2},minmax(0,1fr))` : undefined, minHeight: layout?.minHeight, overflow: layout?.overflow }
}

function Node({ node }: { node: UINode }) {
  const children = node.children?.map(child => <Node key={child.id} node={child}/>)
  if (node.type === 'text') return <div className={`uig-text role-${node.role ?? 'body'}`}>{node.text}</div>
  if (node.type === 'icon') return <span className="uig-icon"><MaterialIcon name={node.icon ?? 'circle'} size={20}/></span>
  if (node.type === 'media') return node.imageUrl ? <img className="uig-media" src={node.imageUrl} alt={node.text ?? ''}/> : null
  if (node.type === 'action') return <button className={`uig-action role-${node.role ?? 'primary'}`}>{node.text}</button>
  if (node.type === 'metric') return <strong className="uig-metric">{node.value}</strong>
  if (node.type === 'progress') return <div className="uig-progress"><i style={{ width: `${Math.max(0, Math.min(100, Number(node.value) || 0))}%` }}/></div>
  const Tag = node.type === 'navigation' ? 'nav' : node.type === 'root' ? 'main' : node.type === 'surface' ? 'section' : 'div'
  return <Tag data-ui-node-id={node.id} data-ui-node-type={node.type} className={`uig-node type-${node.type} role-${node.role ?? 'none'} appearance-${node.appearance ?? 'plain'} state-${node.state ?? 'default'}`} style={layoutStyle(node)}>{children}</Tag>
}

interface LiveCursorPosition {
  x: number
  y: number
  visible: boolean
}

export function UINodeGraphCanvas({ graph, theme, activeNodeId }: { graph: UINodeGraph; theme: StudioDesignTheme; activeNodeId?: string | null }) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState<LiveCursorPosition>({ x: 24, y: 24, visible: false })

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !activeNodeId) {
      setCursor(previous => previous.visible ? { ...previous, visible: false } : previous)
      return
    }
    const frame = requestAnimationFrame(() => {
      const target = Array.from(canvas.querySelectorAll<HTMLElement>('[data-ui-node-id]')).find(element => element.dataset.uiNodeId === activeNodeId)
      if (!target) return
      const canvasRect = canvas.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      setCursor({
        x: Math.max(14, targetRect.right - canvasRect.left - 18),
        y: Math.max(14, targetRect.top - canvasRect.top + Math.min(32, targetRect.height / 2)),
        visible: true,
      })
      target.animate(
        [{ outlineColor: 'transparent', outlineOffset: '0px' }, { outlineColor: theme.primary, outlineOffset: '4px' }, { outlineColor: 'transparent', outlineOffset: '7px' }],
        { duration: 900, easing: 'ease-out' },
      )
    })
    return () => cancelAnimationFrame(frame)
  }, [activeNodeId, graph, theme.primary])

  const vars = { '--g-primary':theme.primary,'--g-primary-strong':theme.primaryStrong,'--g-primary-soft':theme.primarySoft,'--g-bg':theme.background,'--g-surface':theme.surface,'--g-muted':theme.surfaceMuted,'--g-text':theme.text,'--g-text-muted':theme.textMuted,'--g-border':theme.border,'--g-radius':theme.radius,'--g-font':theme.fontFamily,'--g-on-primary':theme.onPrimary,'--g-shadow':theme.shadow,'--g-positive':theme.positive,'--g-caution':theme.caution,'--g-negative':theme.negative,'--g-text-display':theme.textDisplay,'--g-text-heading':theme.textHeading,'--g-text-label':theme.textLabel,'--g-text-body':theme.textBody,'--g-text-caption':theme.textCaption,'--g-section-gap':theme.sectionGap,'--g-card-padding':theme.cardPadding,'--g-item-gap':theme.itemGap } as CSSProperties
  return <div ref={canvasRef} className={`uig-canvas ${graph.platform} composition-${graph.composition}`} style={vars}>
    <style>{`.uig-canvas{height:100%;min-height:100%;position:relative;background:var(--g-bg);color:var(--g-text);font-family:var(--g-font);word-break:keep-all;overflow-wrap:break-word}.uig-canvas *{box-sizing:border-box}.uig-node{min-width:0}.type-root{min-height:100%;padding-bottom:86px!important}.type-surface{border-radius:var(--g-radius)}.appearance-bordered{background:var(--g-surface);border:1px solid var(--g-border)}.appearance-elevated{background:var(--g-surface);border:1px solid color-mix(in srgb,var(--g-border) 72%,transparent);box-shadow:var(--g-shadow)}.appearance-tinted{background:var(--g-primary-soft)}.appearance-primary{background:linear-gradient(145deg,var(--g-primary),var(--g-primary-strong));color:var(--g-on-primary);box-shadow:var(--g-shadow);position:relative}.appearance-primary:after{content:'';position:absolute;width:160px;height:160px;right:-58px;top:-68px;border:1px solid rgba(255,255,255,.22);border-radius:50%}.appearance-primary>*{position:relative;z-index:1}.appearance-image{background:var(--g-surface);box-shadow:var(--g-shadow)}.uig-text.role-eyebrow,.uig-text.role-meta{font-size:var(--g-text-caption);font-weight:750;color:var(--g-primary);letter-spacing:.02em}.uig-text.role-heading{font-size:var(--g-text-heading);font-weight:780;line-height:1.22;letter-spacing:-.045em}.role-hero .uig-text.role-heading{font-size:var(--g-text-display)}.appearance-primary .uig-text.role-eyebrow{color:rgba(255,255,255,.8)}.uig-text.role-body{font-size:var(--g-text-body);line-height:1.5;color:var(--g-text-muted)}.appearance-primary .uig-text.role-body{color:rgba(255,255,255,.8)}.uig-text.role-label{font-size:var(--g-text-label);font-weight:700;line-height:1.35}.uig-text.role-caption{font-size:calc(var(--g-text-caption) - 1px);font-weight:650;color:var(--g-text-muted)}.uig-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:var(--g-primary-soft);color:var(--g-primary)}.uig-action{border:0;padding:11px 15px;border-radius:calc(var(--g-radius)*.6);font:inherit;font-size:13px;font-weight:750;background:var(--g-primary);color:var(--g-on-primary)}.appearance-primary .uig-action.role-primary{background:var(--g-on-primary);color:var(--g-primary)}.uig-action.role-secondary{background:var(--g-primary-soft);color:var(--g-primary)}.appearance-primary .uig-action.role-secondary{background:rgba(255,255,255,.16);color:var(--g-on-primary);border:1px solid rgba(255,255,255,.2)}.uig-metric{font-size:var(--g-text-heading);line-height:1;letter-spacing:-.05em}.uig-progress{height:10px;border-radius:999px;background:var(--g-muted);overflow:hidden}.uig-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--g-primary),var(--g-primary-strong))}.uig-media{display:block;width:100%;height:190px;object-fit:cover}.role-content-item.state-success{border-color:color-mix(in srgb,var(--g-positive) 35%,var(--g-border))}.role-content-item.state-warning{border-color:color-mix(in srgb,var(--g-caution) 35%,var(--g-border))}.role-content-item.state-error{border-color:color-mix(in srgb,var(--g-negative) 35%,var(--g-border))}.role-bottom-navigation{position:absolute;left:0;right:0;bottom:0;background:color-mix(in srgb,var(--g-surface) 94%,transparent);border-top:1px solid var(--g-border);backdrop-filter:blur(16px);z-index:4}.role-nav-active{color:var(--g-primary)}.role-nav-active .uig-text{color:var(--g-primary)}.composition-editorial .role-hero{background:var(--g-surface);color:var(--g-text);border:1px solid var(--g-border);border-left:5px solid var(--g-primary)}.composition-editorial .role-hero .uig-text.role-body{color:var(--g-text-muted)}.composition-immersive .role-hero{border-radius:calc(var(--g-radius)*1.45)}.composition-immersive .role-hero .role-heading{font-size:calc(var(--g-text-display) + 4px)}.uig-canvas.web .type-root{padding-bottom:32px!important}.uig-canvas.web .role-bottom-navigation{position:static;border:1px solid var(--g-border);border-radius:var(--g-radius)}.uig-live-cursor{position:absolute;z-index:20;width:24px;height:30px;pointer-events:none;filter:drop-shadow(0 3px 4px rgba(15,23,42,.22));transition:left .42s cubic-bezier(.22,1,.36,1),top .42s cubic-bezier(.22,1,.36,1),opacity .16s ease;transform:rotate(-12deg);color:var(--g-primary)}.uig-live-cursor svg{display:block;width:100%;height:100%}@media(prefers-reduced-motion:reduce){.uig-live-cursor{transition:opacity .16s ease}}`}</style>
    <Node node={graph.root}/>
    <span className="uig-live-cursor" aria-hidden="true" style={{ left: cursor.x, top: cursor.y, opacity: cursor.visible ? 1 : 0 }}>
      <svg viewBox="0 0 24 30" fill="none"><path d="M3 2.5v22.2l5.3-5.1 3.7 7.5 3.8-1.9-3.6-7.1 7.3-.8L3 2.5Z" fill="currentColor" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/></svg>
    </span>
  </div>
}
