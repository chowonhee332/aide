"use client"
import * as React from "react"
import { Check, Minus } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function Checkbox({ className, children, indeterminate = false, ...props }: Omit<React.ComponentProps<"input">,"type"> & { indeterminate?: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])
  return <label className={cn("inline-flex min-h-[var(--aui-component-control-touch-height)] cursor-pointer items-center gap-[var(--aui-component-control-gap)] text-[length:var(--aui-type-body-size)] leading-[var(--aui-type-body-leading)] text-[var(--aui-text)] md:min-h-[var(--aui-component-control-default-height)]",className)}>
    <span className="relative grid size-[var(--aui-component-selection-indicator-size)] shrink-0 place-items-center"><input ref={inputRef} type="checkbox" aria-checked={indeterminate ? "mixed" : undefined} className="peer absolute inset-0 z-0 appearance-none rounded-[var(--aui-component-selection-checkbox-radius)] border-0 bg-[var(--aui-surface)] shadow-[inset_0_0_0_1.5px_var(--aui-border)] outline-none transition-[background-color,box-shadow] checked:bg-[var(--aui-primary)] checked:shadow-none indeterminate:bg-[var(--aui-primary)] indeterminate:shadow-none focus-visible:shadow-[inset_0_0_0_1.5px_var(--aui-primary),var(--aui-shadow-focus)] disabled:cursor-not-allowed disabled:opacity-40" {...props}/>{indeterminate?<Minus size={16} aria-hidden className="pointer-events-none relative z-10 text-[var(--aui-on-primary)]"/>:<Check size={16} aria-hidden className="pointer-events-none relative z-10 text-[var(--aui-on-primary)] opacity-0 transition-opacity peer-checked:opacity-100"/>}</span>{children}
  </label>
}

function Switch({ className, children, ...props }: Omit<React.ComponentProps<"input">,"type">) {
  return <label className={cn("inline-flex min-h-[var(--aui-component-control-touch-height)] cursor-pointer items-center gap-[var(--aui-component-control-gap)] text-[length:var(--aui-type-body-size)] leading-[var(--aui-type-body-leading)] text-[var(--aui-text)] md:min-h-[var(--aui-component-control-default-height)]",className)}>
    <span className="relative h-[var(--aui-component-selection-switch-height)] w-[var(--aui-component-selection-switch-width)]"><input type="checkbox" role="switch" className="peer absolute inset-0 appearance-none rounded-[var(--aui-radius-pill)] bg-[var(--aui-fill-strong)] outline-none transition-colors checked:bg-[var(--aui-primary)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:cursor-not-allowed disabled:opacity-40" {...props}/><span aria-hidden className="pointer-events-none absolute left-[var(--aui-component-selection-switch-inset)] top-[var(--aui-component-selection-switch-inset)] size-[var(--aui-component-selection-switch-thumb-size)] rounded-[var(--aui-radius-pill)] bg-[var(--aui-surface)] shadow-[var(--aui-shadow-soft)] transition-transform peer-checked:translate-x-4"/></span>{children}
  </label>
}

export { Checkbox, Switch }
