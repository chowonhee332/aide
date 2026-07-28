"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<string | undefined>(undefined)

function RadioGroup({ name, label, className, children, ...props }: React.ComponentProps<"div"> & { name: string; label: string }) {
  return <RadioGroupContext.Provider value={name}><div role="radiogroup" aria-label={label} data-slot="radio-group" className={cn("grid gap-1", className)} {...props}>{children}</div></RadioGroupContext.Provider>
}

function Radio({ className, children, ...props }: Omit<React.ComponentProps<"input">, "type" | "name"> & { children: React.ReactNode }) {
  const name = React.useContext(RadioGroupContext)
  return <label className={cn("inline-flex min-h-[var(--aui-component-control-touch-height)] cursor-pointer items-center gap-[var(--aui-component-control-gap)] text-sm text-[var(--aui-text)] md:min-h-[var(--aui-component-control-default-height)]", className)}><span className="relative grid size-[var(--aui-component-selection-indicator-size)] shrink-0 place-items-center"><input type="radio" name={name} className="peer absolute inset-0 z-0 appearance-none rounded-[var(--aui-radius-pill)] border border-[var(--aui-border)] bg-[var(--aui-surface)] outline-none checked:border-[var(--aui-primary)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:cursor-not-allowed disabled:opacity-40" {...props}/><span aria-hidden className="relative z-10 size-2.5 scale-0 rounded-[var(--aui-radius-pill)] bg-[var(--aui-primary)] transition-transform peer-checked:scale-100"/></span>{children}</label>
}

export { RadioGroup, Radio }
