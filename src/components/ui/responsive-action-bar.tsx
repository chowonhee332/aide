import * as React from "react"
import { cn } from "@/lib/utils"

function ResponsiveActionBar({ className, fixed = false, children, ...props }: React.ComponentProps<"div"> & { fixed?: boolean }) {
  return <div data-slot="responsive-action-bar" className={cn("flex flex-col-reverse gap-2 border-t border-[var(--aui-border-subtle)] bg-[var(--aui-surface)] p-[var(--aui-component-action-bar-padding)] pb-[max(var(--aui-component-action-bar-padding),env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-[var(--aui-component-action-bar-padding)]", fixed&&"fixed inset-x-0 bottom-0 z-40 shadow-[var(--aui-shadow-elevated)]", className)} {...props}>{children}</div>
}
export { ResponsiveActionBar }
