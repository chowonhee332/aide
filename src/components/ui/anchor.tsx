import * as React from "react"
import { ExternalLink } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function Anchor({ className, external, children, ...props }: React.ComponentProps<"a"> & { external?: boolean }) {
  return <a data-slot="anchor" target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}
    className={cn("inline-flex items-center gap-[var(--aui-space-1)] rounded-[var(--aui-radius-sm)] text-sm font-semibold text-[var(--aui-primary)] underline underline-offset-2 outline-none hover:text-[var(--aui-primary-heavy)] focus-visible:shadow-[var(--aui-shadow-focus)]", className)} {...props}>
    {children}{external && <><ExternalLink aria-hidden className="size-4"/><span className="sr-only">새 창에서 열림</span></>}
  </a>
}
export { Anchor }
