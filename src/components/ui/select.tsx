import * as React from "react"
import { ChevronDown } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return <span data-slot="select" className={cn("relative block", className)}><select className="h-[var(--aui-component-control-touch-height)] w-full appearance-none rounded-[var(--aui-radius-control)] border border-[var(--aui-border)] bg-[var(--aui-surface)] px-[var(--aui-component-control-inline-padding)] pr-10 text-sm text-[var(--aui-text)] outline-none focus-visible:border-[var(--aui-primary)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:cursor-not-allowed disabled:bg-[var(--aui-fill)] disabled:text-[var(--aui-text-disabled)] md:h-[var(--aui-component-control-default-height)]" {...props}>{children}</select><ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-[var(--aui-component-control-icon-size)] -translate-y-1/2 text-[var(--aui-text-muted)]"/></span>
}
export { Select }
