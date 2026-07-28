"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type SegmentedOption = { value: string; label: React.ReactNode; disabled?: boolean }
function SegmentedControl({ options, value, defaultValue, onValueChange, label, className }: { options: SegmentedOption[]; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; label: string; className?: string }) {
  const [internal, setInternal] = React.useState(defaultValue ?? options[0]?.value)
  const selected = value ?? internal
  return <div role="radiogroup" aria-label={label} data-slot="segmented-control" className={cn("grid min-h-[var(--aui-component-control-touch-height)] auto-cols-fr grid-flow-col rounded-[var(--aui-radius-control)] bg-[var(--aui-fill)] p-[var(--aui-component-selection-segment-padding)] md:min-h-[var(--aui-component-control-default-height)]", className)}>{options.map((option) => <button key={option.value} type="button" role="radio" aria-checked={selected === option.value} disabled={option.disabled} className="min-w-0 rounded-[calc(var(--aui-radius-control)-4px)] px-[var(--aui-component-control-inline-padding)] text-sm font-medium text-[var(--aui-text-muted)] outline-none transition-[background-color,color,box-shadow] hover:text-[var(--aui-text)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:opacity-40 aria-checked:bg-[var(--aui-surface)] aria-checked:font-semibold aria-checked:text-[var(--aui-text)] aria-checked:shadow-[var(--aui-shadow-soft)]" onClick={() => { setInternal(option.value); onValueChange?.(option.value) }}>{option.label}</button>)}</div>
}
export { SegmentedControl, type SegmentedOption }
