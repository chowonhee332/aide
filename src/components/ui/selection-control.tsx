"use client"
import * as React from "react"
import { Check, Minus } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function Checkbox({ className, children, indeterminate = false, ...props }: Omit<React.ComponentProps<"input">,"type"> & { indeterminate?: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])
  return <label className={cn("inline-flex min-h-[var(--aui-component-control-touch-height)] cursor-pointer items-center gap-[var(--aui-component-control-gap)] text-sm text-[var(--aui-text)] md:min-h-[var(--aui-component-control-default-height)]",className)}>
    <span className="relative grid size-[var(--aui-component-selection-indicator-size)] shrink-0 place-items-center"><input ref={inputRef} type="checkbox" aria-checked={indeterminate ? "mixed" : undefined} className="peer absolute inset-0 z-0 appearance-none rounded-[calc(var(--aui-radius-control)/2)] border border-[var(--aui-border)] bg-[var(--aui-surface)] outline-none transition-[background-color,border-color,box-shadow] checked:border-[var(--aui-primary)] checked:bg-[var(--aui-primary)] indeterminate:border-[var(--aui-primary)] indeterminate:bg-[var(--aui-primary)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:cursor-not-allowed disabled:opacity-40" {...props}/>{indeterminate?<Minus size={14} aria-hidden className="pointer-events-none relative z-10 text-[var(--aui-on-primary)]"/>:<Check size={14} aria-hidden className="pointer-events-none relative z-10 text-[var(--aui-on-primary)] opacity-0 transition-opacity peer-checked:opacity-100"/>}</span>{children}
  </label>
}

function Switch({ className, children, ...props }: Omit<React.ComponentProps<"input">,"type">) {
  return <label className={cn("inline-flex min-h-[var(--aui-component-control-touch-height)] cursor-pointer items-center gap-[var(--aui-component-control-gap)] text-sm text-[var(--aui-text)] md:min-h-[var(--aui-component-control-default-height)]",className)}>
    <span className="relative h-[var(--aui-component-selection-switch-height)] w-[var(--aui-component-selection-switch-width)]"><input type="checkbox" role="switch" className="peer absolute inset-0 appearance-none rounded-[var(--aui-radius-pill)] bg-[var(--aui-fill-strong)] outline-none transition-colors checked:bg-[var(--aui-primary)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:cursor-not-allowed disabled:opacity-40" {...props}/><span aria-hidden className="pointer-events-none absolute left-1 top-1 size-4 rounded-[var(--aui-radius-pill)] bg-[var(--aui-surface)] shadow-[var(--aui-shadow-soft)] transition-transform peer-checked:translate-x-4"/></span>{children}
  </label>
}

export { Checkbox, Switch }
