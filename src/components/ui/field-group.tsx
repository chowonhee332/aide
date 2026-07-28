import * as React from "react"
import { cn } from "@/lib/utils"

function FieldGroup({ className, label, help, error, children, ...props }: React.ComponentProps<"fieldset"> & { label: React.ReactNode; help?: React.ReactNode; error?: React.ReactNode }) {
  return <fieldset data-slot="field-group" className={cn("grid min-w-0 gap-2 border-0 p-0", className)} {...props}><legend className="mb-1 text-sm font-semibold text-[var(--aui-text)]">{label}</legend><div className="grid grid-cols-1 gap-2 sm:grid-flow-col sm:auto-cols-fr">{children}</div>{(error||help)&&<p className={cn("m-0 text-xs", error?"text-[var(--aui-negative)]":"text-[var(--aui-text-muted)]")}>{error??help}</p>}</fieldset>
}
export { FieldGroup }
