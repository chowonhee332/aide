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
  return <input data-slot="input" aria-invalid={props["aria-invalid"]} className={cn("h-[var(--aui-component-field-touch-height)] w-full rounded-[var(--aui-component-field-radius)] border-0 bg-[var(--aui-surface)] px-[var(--aui-component-field-padding-inline)] text-[length:var(--aui-type-body-size)] font-normal leading-[var(--aui-type-body-leading)] text-[var(--aui-text)] shadow-[inset_0_0_0_1px_var(--aui-border)] outline-none transition-[box-shadow,background-color] duration-[var(--aui-motion-fast)] placeholder:text-[var(--aui-text-assistive)] focus-visible:shadow-[inset_0_0_0_1.5px_var(--aui-primary),var(--aui-shadow-focus)] disabled:cursor-not-allowed disabled:bg-[var(--aui-primary-disabled)] disabled:text-[var(--aui-text-disabled)] aria-invalid:shadow-[inset_0_0_0_1.5px_var(--aui-negative)] md:h-[var(--aui-component-field-default-height)]",className)} {...props}/>
}

export { Field, Input }
