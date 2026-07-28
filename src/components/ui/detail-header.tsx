import * as React from "react"
import { cn } from "@/lib/utils"

function DetailHeader({ className, eyebrow, title, description, metadata, actions, headingLevel = "h1", ...props }: React.ComponentProps<"header"> & { eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; metadata?: React.ReactNode; actions?: React.ReactNode; headingLevel?: "h1" | "h2" | "h3" }) {
  const Heading = headingLevel
  return <header data-slot="detail-header" className={cn("flex flex-col gap-[var(--aui-component-detail-header-content-gap)] border-b border-[var(--aui-border-subtle)] pb-[var(--aui-component-detail-header-padding-bottom)] sm:flex-row sm:items-end sm:justify-between", className)} {...props}><div className="min-w-0">{eyebrow&&<div className="mb-[var(--aui-component-detail-header-eyebrow-gap)] text-xs font-semibold text-[var(--aui-primary)]">{eyebrow}</div>}<Heading className="m-0 text-2xl font-bold text-[var(--aui-text)]">{title}</Heading>{description&&<p className="m-0 mt-[var(--aui-component-detail-header-description-gap)] max-w-2xl text-sm leading-6 text-[var(--aui-text-muted)]">{description}</p>}{metadata&&<div className="mt-[var(--aui-component-detail-header-metadata-gap)] text-xs text-[var(--aui-text-assistive)]">{metadata}</div>}</div>{actions&&<div className="flex shrink-0 flex-wrap gap-[var(--aui-component-detail-header-action-gap)]">{actions}</div>}</header>
}
export { DetailHeader }
