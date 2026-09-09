"use client"

import { ProgressBar } from "@astryxdesign/core/ProgressBar"
import { Skeleton as AstryxSkeleton } from "@astryxdesign/core/Skeleton"

/**
 * `progress` and `loading` from the aide.md `component_registry`, rendered by
 * Astryx instead of Aide's own Tailwind markup (see `scripts/astryx-component-map.mjs`).
 *
 * Astryx components take no `className` — layout customisation goes through
 * `xstyle`, which needs the StyleX babel plugin this build does not run
 * (`scripts/generate-astryx-templates.mjs` documents the same limit). So sizing
 * is passed as props and any outer spacing stays on a wrapper element, which is
 * the pattern the rest of the app already uses for Astryx.
 */

function Progress({
  value = 0,
  className,
  label,
}: {
  value?: number
  className?: string
  label?: string
}) {
  const safe = Math.max(0, Math.min(100, value))
  return (
    <div className={className}>
      {/* Astryx requires an accessible label; hide it visually when the caller
          gave none so the bar keeps its screen-reader name either way. */}
      <ProgressBar
        label={label ?? "Progress"}
        isLabelHidden={!label}
        hasValueLabel={Boolean(label)}
        value={safe}
      />
    </div>
  )
}

type SkeletonProps = {
  /** Width in px (number) or any CSS length. Defaults to filling the parent. */
  width?: number | string
  /** Height in px (number) or any CSS length. */
  height?: number | string
  /** Token-scale corner radius; `rounded` for avatars and pills. */
  radius?: "none" | 0 | 1 | 2 | 3 | 4 | "rounded"
  /** Stagger index so a stack of placeholders animates as a wave. */
  index?: number
}

function Skeleton({ width, height = 12, radius, index }: SkeletonProps) {
  return <AstryxSkeleton width={width} height={height} radius={radius} index={index} />
}

export { Progress, Skeleton }
