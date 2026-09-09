import * as React from "react"
import { Grid } from "@astryxdesign/core/Grid"

/**
 * `responsive-grid` from the aide.md `component_registry`, rendered by Astryx `Grid`.
 *
 * Astryx's object form of `columns` is the same auto-fit/minmax rule this component
 * wrote by hand, so the track maths moves into the design system.
 */
function ResponsiveGrid({
  minItemWidth = 240,
  className,
  children,
}: {
  /**
   * Narrowest a column may get before the grid drops to fewer columns. Callers pass
   * CSS lengths (`"260px"`); Astryx wants a number, so a px string is unwrapped here.
   */
  minItemWidth?: number | string
  className?: string
  children?: React.ReactNode
}) {
  const minWidth = typeof minItemWidth === "number" ? minItemWidth : Number.parseFloat(minItemWidth) || 240

  return (
    <div className={className}>
      <Grid columns={{ minWidth, repeat: "fit" }} gap={3}>
        {children}
      </Grid>
    </div>
  )
}
export { ResponsiveGrid }
