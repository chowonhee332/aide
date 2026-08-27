"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

const cell = "grid size-[var(--aui-control-default)] place-items-center rounded-[var(--aui-radius-control)] text-sm font-semibold outline-none focus-visible:shadow-[var(--aui-shadow-focus)] disabled:text-[var(--aui-text-disabled)]"

function Pagination({ total, page, defaultPage = 1, onPageChange, label = "페이지 이동", className }: { total: number; page?: number; defaultPage?: number; onPageChange?: (page: number) => void; label?: string; className?: string }) {
  const [internal, setInternal] = React.useState(defaultPage)
  const current = page ?? internal
  const go = (next: number) => { const clamped = Math.min(total, Math.max(1, next)); setInternal(clamped); onPageChange?.(clamped) }
  return <nav data-slot="pagination" aria-label={label} className={cn("flex items-center gap-[var(--aui-space-1)]", className)}>
    <button type="button" aria-label="이전 페이지" disabled={current <= 1} onClick={() => go(current - 1)} className={cn(cell, "text-[var(--aui-text-neutral)] hover:bg-[var(--aui-fill)]")}><ArrowLeft aria-hidden className="size-4"/></button>
    {Array.from({ length: total }, (_, index) => index + 1).map((item) => item === current
      ? <span key={item} aria-current="page" className={cn(cell, "bg-[var(--aui-primary-soft)] text-[var(--aui-primary-heavy)]")}>{item}</span>
      : <button key={item} type="button" aria-label={`${item}페이지`} onClick={() => go(item)} className={cn(cell, "text-[var(--aui-text-neutral)] hover:bg-[var(--aui-fill)]")}>{item}</button>)}
    <button type="button" aria-label="다음 페이지" disabled={current >= total} onClick={() => go(current + 1)} className={cn(cell, "text-[var(--aui-text-neutral)] hover:bg-[var(--aui-fill)]")}><ArrowRight aria-hidden className="size-4"/></button>
  </nav>
}

function PaginationDots({ total, index = 0, label = "현재 위치", className }: { total: number; index?: number; label?: string; className?: string }) {
  return <div data-slot="pagination-dots" role="group" aria-label={`${label} ${index + 1}/${total}`} className={cn("flex items-center gap-[var(--aui-space-2)]", className)}>
    {Array.from({ length: total }, (_, item) => <span key={item} aria-hidden className={cn("size-2 rounded-[var(--aui-radius-pill)]", item === index ? "bg-[var(--aui-primary)]" : "bg-[var(--aui-fill-strong)]")}/>)}
    <span className="sr-only">{index + 1} / {total}</span>
  </div>
}
export { Pagination, PaginationDots }
