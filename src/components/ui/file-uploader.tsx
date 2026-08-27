"use client"

import * as React from "react"
import { Upload, X } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

function FileUploader({ label, hint = "파일을 끌어다 놓거나 선택하세요", accept = "이미지, PDF · 최대 10MB", files: initial = [], disabled, className }: { label: string; hint?: string; accept?: string; files?: string[]; disabled?: boolean; className?: string }) {
  const [files, setFiles] = React.useState(initial)
  return <div data-slot="file-uploader" className={cn("grid gap-[var(--aui-space-3)]", className)}>
    <span className="text-xs font-semibold text-[var(--aui-text-muted)]">{label}</span>
    <button type="button" disabled={disabled}
      className="grid min-h-[120px] place-items-center gap-[var(--aui-space-2)] rounded-[var(--aui-radius-card)] border border-dashed border-[var(--aui-border)] bg-[var(--aui-surface)] p-[var(--aui-space-5)] text-center outline-none hover:bg-[var(--aui-fill)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:text-[var(--aui-text-disabled)]">
      <Upload aria-hidden className="size-6 text-[var(--aui-text-muted)]"/>
      <span className="text-sm font-semibold text-[var(--aui-text)]">{hint}</span>
      <span className="text-xs text-[var(--aui-text-muted)]">{accept}</span>
    </button>
    {files.length > 0 && <ul className="grid gap-[var(--aui-space-1)]">
      {files.map((file) => <li key={file} className="flex min-h-[var(--aui-control-default)] items-center justify-between gap-[var(--aui-space-2)] rounded-[var(--aui-radius-control)] bg-[var(--aui-fill)] px-[var(--aui-space-3)] text-sm text-[var(--aui-text-neutral)]">
        <span className="truncate">{file}</span>
        <button type="button" aria-label={`${file} 제거`} onClick={() => setFiles(files.filter((item) => item !== file))} className="grid size-7 shrink-0 place-items-center rounded-[var(--aui-radius-sm)] outline-none hover:bg-[var(--aui-fill-strong)] focus-visible:shadow-[var(--aui-shadow-focus)]"><X aria-hidden className="size-4"/></button>
      </li>)}
    </ul>}
  </div>
}
export { FileUploader }
