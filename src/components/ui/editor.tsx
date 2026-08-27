import * as React from "react"
import { Pencil } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function Editor({ label, value, placeholder = "내용을 작성하세요", tools = ["굵게", "기울임", "목록", "링크"], readOnly, className }: { label: string; value?: string; placeholder?: string; tools?: string[]; readOnly?: boolean; className?: string }) {
  return <div data-slot="editor" className={cn("grid gap-[var(--aui-component-field-label-gap)]", className)}>
    <span className="text-xs font-semibold text-[var(--aui-text-muted)]">{label}</span>
    <div className="overflow-hidden rounded-[var(--aui-radius-control)] border border-[var(--aui-border)] bg-[var(--aui-surface)]">
      <div role="toolbar" aria-label={`${label} 서식`} className="flex items-center gap-[var(--aui-space-1)] border-b border-[var(--aui-border-subtle)] px-[var(--aui-space-2)] py-[var(--aui-space-1)]">
        <Pencil aria-hidden className="size-4 text-[var(--aui-text-muted)]"/>
        {tools.map((tool) => <button key={tool} type="button" className="rounded-[var(--aui-radius-sm)] px-[var(--aui-space-2)] py-1 text-xs font-semibold text-[var(--aui-text-neutral)] outline-none hover:bg-[var(--aui-fill)] focus-visible:shadow-[var(--aui-shadow-focus)]">{tool}</button>)}
      </div>
      <div role="textbox" aria-readonly={readOnly} aria-label={label} tabIndex={0}
        className="min-h-[120px] px-[var(--aui-space-3)] py-[var(--aui-space-3)] text-sm leading-relaxed text-[var(--aui-text)] outline-none focus-visible:shadow-[var(--aui-shadow-focus)]">
        {value ?? <span className="text-[var(--aui-text-assistive)]">{placeholder}</span>}
      </div>
    </div>
  </div>
}
export { Editor }
