import type { CanvasNode, DesignCanvasIR } from '@/lib/design-canvas-ir'

/**
 * Deterministic wireframe of one DesignDirection's canvas IR. Renders the exact
 * `DesignCanvasIR` that the picked direction feeds into generateUI — no mock UI,
 * no invented palette. The user picks 3 of these instead of the pipeline
 * silently auto-narrowing 6 → 3.
 */

const ORDER_LABEL = ['A', 'B', 'C'] as const

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

export function DirectionWireframe({
  ir,
  order,
  onToggle,
}: {
  ir: DesignCanvasIR
  /** 0-based pick order → A/B/C badge. undefined = not selected. */
  order?: number
  onToggle?: () => void
}) {
  const accent = ir.visualContract?.accent ?? 'var(--aui-primary)'
  const selected = order !== undefined
  const d = ir.direction

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className="group flex w-full flex-col gap-[var(--aui-space-2)] rounded-[var(--aui-radius-card)] border p-[var(--aui-space-3)] text-left transition-[border-color,box-shadow] focus-visible:shadow-[var(--aui-shadow-focus)] focus-visible:outline-none"
      style={{
        borderColor: selected ? accent : 'var(--aui-border-subtle)',
        boxShadow: selected ? `inset 0 0 0 1px ${accent}` : undefined,
      }}
    >
      <div className="relative">
        <div
          className="overflow-hidden rounded-[var(--aui-radius-control)] bg-[var(--aui-surface)] ring-1 ring-inset ring-[var(--aui-border-subtle)]"
          style={{ aspectRatio: `${ir.width} / ${ir.height}` }}
        >
          <svg viewBox={`0 0 ${ir.width} ${ir.height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${d.name} 와이어프레임`}>
            <rect x={0} y={0} width={ir.width} height={ir.height} fill="var(--aui-page)" />
            {ir.nodes.map((node) => (
              <CanvasRect key={node.id} node={node} accent={accent} />
            ))}
          </svg>
        </div>
        {selected && (
          <span
            className="absolute right-[var(--aui-space-2)] top-[var(--aui-space-2)] grid size-6 place-items-center rounded-[var(--aui-radius-pill)] text-xs font-bold text-[var(--aui-on-primary)]"
            style={{ backgroundColor: accent }}
          >
            {ORDER_LABEL[order] ?? order + 1}
          </span>
        )}
      </div>
      <div className="grid gap-[var(--aui-space-1)]">
        <span className="text-sm font-semibold text-[var(--aui-text)]">{d.name}</span>
        <span className="line-clamp-2 text-xs leading-4 text-[var(--aui-text-muted)]">{d.signatureMove || d.thesis}</span>
        <span className="mt-[var(--aui-space-1)] flex flex-wrap gap-[var(--aui-space-1)] text-[10px] font-semibold uppercase tracking-wide text-[var(--aui-text-assistive)]">
          <span className="rounded bg-[var(--aui-fill)] px-1.5 py-0.5">{d.composition}</span>
          <span className="rounded bg-[var(--aui-fill)] px-1.5 py-0.5">{d.density}</span>
          <span className="rounded bg-[var(--aui-fill)] px-1.5 py-0.5">{d.navigation}</span>
          {d.mediaMode !== 'none' && <span className="rounded bg-[var(--aui-fill)] px-1.5 py-0.5">{d.mediaMode}</span>}
        </span>
      </div>
    </button>
  )
}
