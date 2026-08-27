import * as React from "react"
import { Plus } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function FloatingActionButton({ className, label = "새로 만들기", icon, extended, ...props }: React.ComponentProps<"button"> & { label?: string; icon?: React.ReactNode; extended?: boolean }) {
  return <button type="button" data-slot="floating-action-button" aria-label={extended ? undefined : label}
    className={cn("inline-flex items-center gap-[var(--aui-space-2)] bg-[var(--aui-primary)] text-[var(--aui-on-primary)] shadow-[var(--aui-shadow-elevated)] outline-none transition-colors hover:bg-[var(--aui-primary-strong)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:bg-[var(--aui-fill)] disabled:text-[var(--aui-text-disabled)]",
      extended ? "h-[var(--aui-control-prominent)] rounded-[var(--aui-radius-pill)] px-[var(--aui-space-5)] text-sm font-semibold" : "size-[var(--aui-control-prominent)] justify-center rounded-[var(--aui-radius-pill)]", className)} {...props}>
    {icon ?? <Plus aria-hidden className="size-6"/>}{extended && label}
  </button>
}
export { FloatingActionButton }
