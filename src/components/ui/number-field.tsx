"use client"

import * as React from "react"
import { Minus, Plus } from "@/components/ui/material-icon"
import { Button } from "./button"
import { cn } from "@/lib/utils"

function NumberField({ label, value, defaultValue = 0, min, max, step = 1, onValueChange, className, disabled }: { label: string; value?: number; defaultValue?: number; min?: number; max?: number; step?: number; onValueChange?: (value: number) => void; className?: string; disabled?: boolean }) {
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value ?? internal
  const update = (next: number) => { const safe = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)); setInternal(safe); onValueChange?.(safe) }
  return <div data-slot="number-field" className={cn("inline-grid gap-1.5", className)}><span className="text-sm font-semibold text-[var(--aui-text)]">{label}</span><div className="inline-flex h-[var(--aui-component-control-touch-height)] items-center rounded-[var(--aui-radius-control)] border border-[var(--aui-border)] bg-[var(--aui-surface)] md:h-[var(--aui-component-control-default-height)]"><Button type="button" variant="ghost" size="icon" aria-label={`${label} 감소`} disabled={disabled || (min !== undefined && current <= min)} onClick={() => update(current-step)}><Minus/></Button><input type="number" aria-label={label} value={current} min={min} max={max} step={step} disabled={disabled} className="h-full w-16 border-0 bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" onChange={(event)=>update(Number(event.target.value))}/><Button type="button" variant="ghost" size="icon" aria-label={`${label} 증가`} disabled={disabled || (max !== undefined && current >= max)} onClick={() => update(current+step)}><Plus/></Button></div></div>
}
export { NumberField }
