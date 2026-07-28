"use client"

import * as React from "react"
import { X } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function Chip({ className, selected, removable, removeLabel, onRemove, children, ...props }: React.ComponentProps<"button"> & { selected?: boolean; removable?: boolean; removeLabel?: string; onRemove?: () => void }) {
  const textLabel = React.Children.toArray(children).filter((child): child is string | number => typeof child === "string" || typeof child === "number").join("").trim()
  const accessibleRemoveLabel = removeLabel ?? `${textLabel || "항목"} 제거`
  return <span data-slot="chip" className={cn("inline-flex h-[var(--aui-component-control-default-height)] items-center rounded-[var(--aui-radius-pill)] border text-sm font-medium transition-colors", selected ? "border-[var(--aui-primary)] bg-[var(--aui-primary-soft)] text-[var(--aui-primary-heavy)]" : "border-[var(--aui-border)] bg-[var(--aui-surface)] text-[var(--aui-text-neutral)]", className)}><button type="button" aria-pressed={selected} className="h-full rounded-[var(--aui-radius-pill)] px-[var(--aui-component-control-inline-padding)] outline-none focus-visible:shadow-[var(--aui-shadow-focus)] disabled:opacity-40" {...props}>{children}</button>{removable&&<button type="button" aria-label={accessibleRemoveLabel} className="mr-1 grid size-[var(--aui-component-control-compact-height)] place-items-center rounded-[var(--aui-radius-pill)] outline-none hover:bg-[var(--aui-fill)] focus-visible:shadow-[var(--aui-shadow-focus)]" onClick={onRemove}><X className="size-3.5"/></button>}</span>
}
export { Chip }
