"use client"

import * as React from "react"
import { ChevronDown } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function Accordion({ items, defaultOpenId, className }: { items: Array<{ id: string; title: React.ReactNode; content: React.ReactNode }>; defaultOpenId?: string; className?: string }) {
  const [openId, setOpenId] = React.useState<string | undefined>(defaultOpenId)
  return <div data-slot="accordion" className={cn("w-full overflow-hidden rounded-[var(--aui-radius-card)] bg-[var(--aui-surface)]", className)}>
    {items.map((item) => {
      const open = openId === item.id
      return <div key={item.id} className="border-b border-[var(--aui-border-subtle)] last:border-b-0">
        <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? undefined : item.id)}
          className="flex min-h-[var(--aui-control-touch)] w-full items-center justify-between gap-[var(--aui-space-3)] px-[var(--aui-space-4)] py-[var(--aui-space-3)] text-left text-sm font-semibold text-[var(--aui-text)] outline-none hover:bg-[var(--aui-fill)] focus-visible:shadow-[var(--aui-shadow-focus)]">
          {item.title}
          <ChevronDown aria-hidden className={cn("size-5 shrink-0 text-[var(--aui-text-muted)] transition-transform", open && "rotate-180")}/>
        </button>
        {open && <div className="px-[var(--aui-space-4)] pb-[var(--aui-space-4)] text-sm leading-relaxed text-[var(--aui-text-muted)]">{item.content}</div>}
      </div>
    })}
  </div>
}
export { Accordion }
