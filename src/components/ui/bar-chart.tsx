import * as React from "react"
import { cn } from "@/lib/utils"

type BarDatum = { label: string; value: number; color?: string }
function BarChart({ data, label, valueLabel = (value)=>String(value), className }: { data: BarDatum[]; label: string; valueLabel?: (value:number)=>string; className?: string }) {
  const max=Math.max(1,...data.map(item=>item.value))
  return <figure data-slot="bar-chart" aria-label={label} className={cn("m-0",className)}><figcaption className="mb-4 text-sm font-semibold text-[var(--aui-text)]">{label}</figcaption><div className="flex h-48 items-end gap-3 border-b border-[var(--aui-border)] px-2">{data.map(item=><div key={item.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2 text-center"><span className="text-xs font-semibold tabular-nums text-[var(--aui-text-muted)]">{valueLabel(item.value)}</span><div role="img" aria-label={`${item.label}: ${valueLabel(item.value)}`} className="min-h-1 rounded-t-[var(--aui-radius-sm)] bg-[var(--aui-primary)]" style={{height:`${item.value/max*100}%`,background:item.color}}/><span className="truncate pb-2 text-xs text-[var(--aui-text-muted)]">{item.label}</span></div>)}</div></figure>
}
export { BarChart, type BarDatum }
