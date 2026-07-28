"use client"

import * as React from "react"
import { Star } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function Rating({ label, max = 5, value, defaultValue = 0, onValueChange, readOnly, className }: { label: string; max?: number; value?: number; defaultValue?: number; onValueChange?: (value:number)=>void; readOnly?: boolean; className?: string }) {
  const [internal,setInternal]=React.useState(defaultValue); const current=value??internal
  return <fieldset data-slot="rating" className={cn("border-0 p-0",className)}><legend className="mb-1.5 text-sm font-semibold text-[var(--aui-text)]">{label}</legend><div className="flex" role="radiogroup" aria-label={label}>{Array.from({length:max},(_,index)=>index+1).map((item)=><button key={item} type="button" role="radio" aria-checked={current===item} aria-label={`${item}점`} disabled={readOnly} className="grid size-11 place-items-center rounded-[var(--aui-radius-sm)] text-[var(--aui-fill-strong)] outline-none hover:text-[var(--aui-caution)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:opacity-100 md:size-10" onClick={()=>{setInternal(item);onValueChange?.(item)}}><Star aria-hidden className={cn("size-6",item<=current&&"fill-[var(--aui-caution)] text-[var(--aui-caution)]")}/></button>)}</div></fieldset>
}
export { Rating }
