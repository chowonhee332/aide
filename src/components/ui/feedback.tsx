import * as React from "react"
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "@/components/ui/material-icon"

import { cn } from "@/lib/utils"
import { Button } from "./button"

type Tone = "info" | "success" | "warning" | "error"
const icons = { info: Info, success: CheckCircle2, warning: TriangleAlert, error: AlertCircle }
const tones = { info: "bg-[var(--aui-primary-soft)] text-[var(--aui-primary-heavy)]", success: "bg-[color-mix(in_srgb,var(--aui-positive)_12%,var(--aui-surface))] text-[var(--aui-positive)]", warning: "bg-[var(--aui-caution-soft)] text-[var(--aui-caution-text)]", error: "bg-[var(--aui-negative-soft)] text-[var(--aui-negative)]" }

function InlineMessage({ tone = "info", title, children, className, ...props }: React.ComponentProps<"div"> & { tone?: Tone; title?: React.ReactNode }) {
  const Icon = icons[tone]
  return <div role={tone === "error" ? "alert" : "status"} data-slot="inline-message" className={cn("flex gap-3 rounded-[var(--aui-radius-control)] p-3 text-sm", tones[tone], className)} {...props}><Icon aria-hidden className="mt-0.5 size-4 shrink-0"/><div className="min-w-0">{title&&<strong className="block font-semibold">{title}</strong>}<div className={cn("leading-5", title&&"mt-0.5 opacity-90")}>{children}</div></div></div>
}
function Loader({ label = "불러오는 중", className }: { label?: string; className?: string }) { return <span role="status" data-slot="loader" className={cn("inline-flex justify-self-start items-center gap-[var(--aui-component-control-gap)] text-sm text-[var(--aui-text-muted)]", className)}><span aria-hidden data-slot="loader-indicator" className="box-border size-[var(--aui-component-control-icon-size)] shrink-0 animate-spin [animation-duration:var(--aui-motion-loop)] rounded-[var(--aui-radius-pill)] border-2 border-[var(--aui-border)] border-t-[var(--aui-primary)] motion-reduce:animate-none"/><span>{label}</span></span> }

function Toast({ tone = "info", title, description, action, onClose, className }: { tone?: Tone; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; onClose?: () => void; className?: string }) {
  const Icon = icons[tone]
  return <div role={tone === "error" ? "alert" : "status"} data-slot="toast" className={cn("flex min-w-0 items-start gap-3 rounded-[var(--aui-radius-control)] bg-[var(--aui-inverse-surface)] p-3.5 text-[var(--aui-on-dark)] shadow-[var(--aui-shadow-elevated)]", className)}><Icon aria-hidden className="mt-0.5 size-4 shrink-0"/><div className="min-w-0 flex-1"><strong className="block text-sm font-semibold">{title}</strong>{description&&<p className="m-0 mt-1 text-xs leading-5 opacity-75">{description}</p>}{action&&<div className="mt-2">{action}</div>}</div>{onClose&&<Button type="button" variant="ghost" size="icon-sm" aria-label="알림 닫기" className="-mr-1 -mt-1 text-current hover:bg-white/10 hover:text-current" onClick={onClose}><X/></Button>}</div>
}
export { InlineMessage, Loader, Toast }
