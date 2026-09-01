import type { CanvasNode, DesignCanvasIR } from '@/lib/design-canvas-ir'

/**
 * Deterministic schematic of a `DesignCanvasIR` — the exact structure a picked
 * "메인 구조" feeds into generateUI. No mock UI, no invented palette.
 */

function TextLines({ node }: { node: CanvasNode }) {
  const rows = Math.max(1, Math.min(3, Math.round(node.height / 34)))
  const lineH = 8
  const gap = (node.height - rows * lineH) / (rows + 1)
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <rect
          key={i}
          x={node.x}
          y={node.y + gap + i * (lineH + gap)}
          width={node.width * (i === rows - 1 ? 0.55 : i === 0 ? 1 : 0.82)}
          height={lineH}
          rx={3}
          fill="var(--aui-fill-strong)"
        />
      ))}
    </>
  )
}

function CanvasRect({ node, accent }: { node: CanvasNode; accent: string }) {
  const common = { x: node.x, y: node.y, width: node.width, height: node.height }

  switch (node.kind) {
    case 'navigation':
      return <rect {...common} fill="var(--aui-surface-muted)" stroke="var(--aui-border-subtle)" />
    case 'button':
      return <rect {...common} rx={node.height / 2} fill={accent} />
    case 'text':
      return <TextLines node={node} />
    case 'image':
      return (
        <>
          <rect {...common} fill="var(--aui-fill)" stroke="var(--aui-border-subtle)" />
          <line x1={node.x} y1={node.y} x2={node.x + node.width} y2={node.y + node.height} stroke="var(--aui-border)" />
          <line x1={node.x + node.width} y1={node.y} x2={node.x} y2={node.y + node.height} stroke="var(--aui-border)" />
        </>
      )
    case 'metric':
      return (
        <>
          <rect {...common} rx={8} fill="var(--aui-surface)" stroke="var(--aui-border-subtle)" />
          <rect x={node.x + 12} y={node.y + node.height * 0.3} width={node.width * 0.5} height={14} rx={3} fill="var(--aui-text)" />
          <rect x={node.x + 12} y={node.y + node.height * 0.3 + 20} width={node.width * 0.34} height={7} rx={3} fill="var(--aui-fill-strong)" />
        </>
      )
    case 'list':
      return (
        <>
          <rect {...common} rx={8} fill="var(--aui-surface)" stroke="var(--aui-border-subtle)" />
          {[0.28, 0.55, 0.82].map((f) => (
            <line key={f} x1={node.x + 10} y1={node.y + node.height * f} x2={node.x + node.width - 10} y2={node.y + node.height * f} stroke="var(--aui-border-subtle)" />
          ))}
        </>
      )
    case 'card':
      return (
        <>
          <rect {...common} rx={8} fill="var(--aui-surface)" stroke="var(--aui-border-subtle)" />
          <rect x={node.x + 10} y={node.y + 10} width={node.width * 0.6} height={9} rx={3} fill="var(--aui-text)" />
          <rect x={node.x + 10} y={node.y + 26} width={node.width * 0.42} height={7} rx={3} fill="var(--aui-fill-strong)" />
        </>
      )
    case 'frame':
    default:
      return <rect {...common} rx={node.role === 'focal-point' ? 12 : 6} fill="var(--aui-surface-muted)" stroke="var(--aui-border-subtle)" />
  }
}

/** Just the schematic SVG for a canvas IR — reused by the direction picker and
 *  the questionnaire's "메인 구조" chooser. */
export function WireframeSvg({
  ir,
  accent = 'var(--aui-primary)',
  label,
}: {
  ir: DesignCanvasIR
  accent?: string
  label?: string
}) {
  return (
    <svg
      viewBox={`0 0 ${ir.width} ${ir.height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <rect x={0} y={0} width={ir.width} height={ir.height} fill="var(--aui-page)" />
      {ir.nodes.map((node) => (
        <CanvasRect key={node.id} node={node} accent={accent} />
      ))}
    </svg>
  )
}
