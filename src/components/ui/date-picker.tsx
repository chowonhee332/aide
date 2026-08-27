"use client"

import * as React from "react"
import { Clock } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

const trigger = "flex min-h-[var(--aui-control-default)] w-full items-center justify-between gap-[var(--aui-space-2)] rounded-[var(--aui-radius-control)] border border-[var(--aui-border)] bg-[var(--aui-surface)] px-[var(--aui-component-field-padding-inline)] text-sm text-[var(--aui-text)] outline-none focus-visible:shadow-[var(--aui-shadow-focus)] disabled:bg-[var(--aui-fill)] disabled:text-[var(--aui-text-disabled)]"

function DatePicker({ label, value, placeholder = "날짜 선택", days = 30, onValueChange, disabled, className }: { label: string; value?: string; placeholder?: string; days?: number; onValueChange?: (value: string) => void; disabled?: boolean; className?: string }) {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState(value)
  return <div data-slot="date-picker" className={cn("grid gap-[var(--aui-component-field-label-gap)]", className)}>
    <span className="text-xs font-semibold text-[var(--aui-text-muted)]">{label}</span>
    <button type="button" disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)} className={trigger}>
      <span className={cn(!selected && "text-[var(--aui-text-assistive)]")}>{selected ?? placeholder}</span>
    </button>
    {open && <div role="group" aria-label={label} className="grid grid-cols-7 gap-1 rounded-[var(--aui-radius-card)] bg-[var(--aui-surface)] p-[var(--aui-space-3)] shadow-[var(--aui-shadow-elevated)]">
      {Array.from({ length: days }, (_, index) => index + 1).map((day) => {
        const text = `${day}일`
        return <button key={day} type="button" aria-pressed={selected === text} onClick={() => { setSelected(text); onValueChange?.(text); setOpen(false) }}
          className={cn("grid size-9 place-items-center rounded-[var(--aui-radius-sm)] text-xs outline-none focus-visible:shadow-[var(--aui-shadow-focus)]", selected === text ? "bg-[var(--aui-primary)] text-[var(--aui-on-primary)]" : "text-[var(--aui-text-neutral)] hover:bg-[var(--aui-fill)]")}>{day}</button>
      })}
    </div>}
  </div>
}

function TimePicker({ label, value, placeholder = "시간 선택", times = ["09:00", "12:00", "15:00", "18:00"], onValueChange, disabled, className }: { label: string; value?: string; placeholder?: string; times?: string[]; onValueChange?: (value: string) => void; disabled?: boolean; className?: string }) {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState(value)
  return <div data-slot="time-picker" className={cn("grid gap-[var(--aui-component-field-label-gap)]", className)}>
    <span className="text-xs font-semibold text-[var(--aui-text-muted)]">{label}</span>
    <button type="button" disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)} className={trigger}>
      <span className={cn(!selected && "text-[var(--aui-text-assistive)]")}>{selected ?? placeholder}</span>
      <Clock aria-hidden className="size-4 text-[var(--aui-text-muted)]"/>
    </button>
    {open && <ul className="grid gap-1 rounded-[var(--aui-radius-card)] bg-[var(--aui-surface)] p-[var(--aui-space-2)] shadow-[var(--aui-shadow-elevated)]">
      {times.map((time) => <li key={time}><button type="button" aria-pressed={selected === time} onClick={() => { setSelected(time); onValueChange?.(time); setOpen(false) }}
        className={cn("w-full rounded-[var(--aui-radius-sm)] px-[var(--aui-space-3)] py-[var(--aui-space-2)] text-left text-sm outline-none focus-visible:shadow-[var(--aui-shadow-focus)]", selected === time ? "bg-[var(--aui-primary-soft)] text-[var(--aui-primary-heavy)]" : "text-[var(--aui-text-neutral)] hover:bg-[var(--aui-fill)]")}>{time}</button></li>)}
    </ul>}
  </div>
}
export { DatePicker, TimePicker }
