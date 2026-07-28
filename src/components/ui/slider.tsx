"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Slider({ label, showValue = true, className, value, defaultValue, onChange, ...props }: React.ComponentProps<"input"> & { label: string; showValue?: boolean }) {
  const [internal, setInternal] = React.useState(Number(defaultValue ?? props.min ?? 0))
  const current = value === undefined ? internal : Number(value)
  return <label data-slot="slider" className={cn("grid gap-[var(--aui-component-slider-gap)]", className)}><span className="flex justify-between text-sm font-semibold text-[var(--aui-text)]"><span>{label}</span>{showValue&&<output className="font-medium tabular-nums text-[var(--aui-text-muted)]">{current}</output>}</span><input type="range" aria-label={label} value={current} className="h-[var(--aui-component-slider-target-height)] w-full cursor-pointer accent-[var(--aui-primary)] disabled:cursor-not-allowed disabled:opacity-40 md:h-[var(--aui-component-slider-compact-target-height)]" onChange={(event)=>{setInternal(Number(event.target.value));onChange?.(event)}} {...props}/></label>
}
export { Slider }
