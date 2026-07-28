"use client"

import * as React from "react"
import { ChevronRight } from "@/components/ui/material-icon"
import { Checkbox } from "./selection-control"
import { cn } from "@/lib/utils"

type AgreementItem = { id: string; label: React.ReactNode; required?: boolean; href?: string }
function Agreement({ items, legend = "약관 동의", className }: { items: AgreementItem[]; legend?: string; className?: string }) {
  const [checked,setChecked]=React.useState<string[]>([]); const all=items.length>0&&checked.length===items.length; const mixed=checked.length>0&&!all
  const toggleAll=(next:boolean)=>setChecked(next?items.map(item=>item.id):[])
  return <fieldset data-slot="agreement" className={cn("rounded-[var(--aui-radius-card)] bg-[var(--aui-surface-muted)] p-[var(--aui-component-agreement-padding)]",className)}><legend className="sr-only">{legend}</legend><div className="border-b border-[var(--aui-border-subtle)] pb-[var(--aui-component-agreement-section-gap)]"><Checkbox checked={all} indeterminate={mixed} onChange={(event)=>toggleAll(event.target.checked)}><strong>전체 동의</strong></Checkbox></div><div className="grid gap-[var(--aui-space-1)] pt-[var(--aui-component-agreement-section-gap)]">{items.map(item=><div key={item.id} className="flex items-center"><Checkbox className="min-w-0 flex-1" checked={checked.includes(item.id)} onChange={(event)=>setChecked(current=>event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))}><span className="truncate">{item.required?'[필수]':'[선택]'} {item.label}</span></Checkbox>{item.href&&<a href={item.href} aria-label={`${String(item.label)} 자세히 보기`} className="grid size-[var(--aui-component-agreement-detail-action-size)] place-items-center rounded-[var(--aui-radius-control)] text-[var(--aui-text-muted)] outline-none hover:bg-[var(--aui-fill)] focus-visible:shadow-[var(--aui-shadow-focus)]"><ChevronRight className="size-[var(--aui-icon-md)]"/></a>}</div>)}</div></fieldset>
}
export { Agreement, type AgreementItem }
