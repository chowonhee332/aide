import * as React from "react"
import { cn } from "@/lib/utils"

function Carousel({ items, label = "가로 목록", className }: { items: React.ReactNode[]; label?: string; className?: string }) {
  return <div data-slot="carousel" role="group" aria-label={label} tabIndex={0}
    className={cn("flex snap-x snap-mandatory gap-[var(--aui-space-3)] overflow-x-auto rounded-[var(--aui-radius-card)] outline-none focus-visible:shadow-[var(--aui-shadow-focus)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
    {items.map((item, index) => <div key={index} className="w-[70%] shrink-0 snap-start rounded-[var(--aui-radius-card)] bg-[var(--aui-surface-muted)] p-[var(--aui-space-4)] text-sm text-[var(--aui-text-neutral)]">{item}</div>)}
  </div>
}
export { Carousel }
