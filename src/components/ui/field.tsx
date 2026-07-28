import * as React from "react"
import { cn } from "@/lib/utils"

type FieldProps = React.ComponentProps<"label"> & { label: React.ReactNode; help?: React.ReactNode; error?: React.ReactNode; required?: boolean }

function Field({ className, label, help, error, required, children, ...props }: FieldProps) {
  return <label data-slot="field" className={cn("grid gap-[var(--aui-component-field-label-gap)] text-sm", className)} {...props}>
    <span data-slot="field-label" className="font-semibold text-[var(--aui-text)]">{label}{required&&<span aria-hidden className="ml-1 text-[var(--aui-negative)]">*</span>}</span>
    {children}
    {(error||help)&&<span data-slot="field-message" className={cn("mt-[calc(var(--aui-component-field-message-gap)-var(--aui-component-field-label-gap))] text-xs leading-4",error?"text-[var(--aui-negative)]":"text-[var(--aui-text-muted)]")}>{error??help}</span>}
  </label>
}

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" aria-invalid={props["aria-invalid"]} className={cn("h-[var(--aui-component-field-touch-height)] w-full rounded-[var(--aui-radius-control)] border border-[var(--aui-border)] bg-[var(--aui-surface)] px-[var(--aui-component-field-padding-inline)] text-sm text-[var(--aui-text)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--aui-motion-fast)] placeholder:text-[var(--aui-text-assistive)] focus-visible:border-[var(--aui-primary)] focus-visible:shadow-[var(--aui-shadow-focus)] disabled:cursor-not-allowed disabled:bg-[var(--aui-fill)] disabled:text-[var(--aui-text-disabled)] aria-invalid:border-[var(--aui-negative)] md:h-[var(--aui-component-field-default-height)]",className)} {...props}/>
}

export { Field, Input }
