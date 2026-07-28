import * as React from "react"
import { cn } from "@/lib/utils"

function ResponsiveGrid({ className, minItemWidth = "var(--aui-component-responsive-grid-min-item-width)", style, ...props }: React.ComponentProps<"div"> & { minItemWidth?: string }) {
  return <div data-slot="responsive-grid" className={cn("grid gap-[var(--aui-component-responsive-grid-gap)]", className)} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minItemWidth}), 1fr))`, ...style }} {...props}/>
}
export { ResponsiveGrid }
