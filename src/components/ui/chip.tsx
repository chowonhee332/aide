"use client"

import * as React from "react"
import { X } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

type ChipProps = React.ComponentProps<"button"> & {
  selected?: boolean
  variant?: "solid" | "outlined"
  removable?: boolean
  removeLabel?: string
  onRemove?: () => void
}

function Chip({ className, selected, variant = "solid", removable, removeLabel, onRemove, children, ...props }: ChipProps) {
  const textLabel = React.Children.toArray(children).filter((child): child is string | number => typeof child === "string" || typeof child === "number").join("").trim()
  const accessibleRemoveLabel = removeLabel ?? `Remove ${textLabel || "item"}`
  const appearance = selected
    ? variant === "outlined"
      ? "bg-[color-mix(in_srgb,var(--aui-primary)_5%,transparent)] text-[var(--aui-primary)] shadow-[inset_0_0_0_1px_var(--aui-component-chip-outlined-active-border)]"
      : "bg-[var(--aui-inverse-surface)] text-[var(--aui-component-chip-solid-active-content)]"
    : variant === "outlined"
      ? "bg-transparent text-[var(--aui-text)] shadow-[inset_0_0_0_1px_var(--aui-border)]"
      : "bg-[var(--aui-fill-subtle)] text-[var(--aui-text)]"
  const rootClassName = cn(
    "inline-flex h-[var(--aui-component-chip-height)] items-center gap-[var(--aui-component-chip-gap)] rounded-[var(--aui-component-chip-radius)] px-[var(--aui-component-chip-padding-inline)] py-1 text-[length:var(--aui-type-body-size)] font-medium leading-none transition-colors outline-none focus-visible:shadow-[var(--aui-shadow-focus)] disabled:opacity-40",
    appearance,
    className
  )

  if (!removable) {
    return <button data-slot="chip" type="button" aria-pressed={selected} className={rootClassName} {...props}>{children}</button>
  }

  return <span data-slot="chip" className={cn(rootClassName, "pr-0.5")}><button type="button" aria-pressed={selected} className="outline-none" {...props}>{children}</button><button type="button" aria-label={accessibleRemoveLabel} className="grid size-5 place-items-center rounded-[var(--aui-component-chip-radius)] outline-none hover:bg-[var(--aui-fill)] focus-visible:shadow-[var(--aui-shadow-focus)]" onClick={onRemove}><X className="size-3"/></button></span>
}
export { Chip }
