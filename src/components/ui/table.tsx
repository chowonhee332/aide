import * as React from "react"
import { cn } from "@/lib/utils"

function TableContainer({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="table-container" className={cn("w-full overflow-x-auto rounded-[var(--aui-radius-card)] border border-[var(--aui-border-subtle)]", className)} {...props}/> }
function Table({ className, ...props }: React.ComponentProps<"table">) { return <table data-slot="table" className={cn("w-full min-w-[var(--aui-component-table-min-width)] border-collapse text-left text-sm", className)} {...props}/> }
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) { return <thead className={cn("bg-[var(--aui-surface-muted)] text-xs text-[var(--aui-text-muted)]", className)} {...props}/> }
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) { return <tbody className={cn("divide-y divide-[var(--aui-border-subtle)] bg-[var(--aui-surface)]", className)} {...props}/> }
function TableRow({ className, ...props }: React.ComponentProps<"tr">) { return <tr className={cn("transition-colors hover:bg-[var(--aui-surface-muted)]", className)} {...props}/> }
function TableHead({ className, numeric, ...props }: React.ComponentProps<"th"> & { numeric?: boolean }) { return <th scope="col" className={cn("h-[var(--aui-component-table-header-height)] px-[var(--aui-component-table-cell-padding-inline)] font-semibold", numeric&&"text-right tabular-nums", className)} {...props}/> }
function TableCell({ className, numeric, ...props }: React.ComponentProps<"td"> & { numeric?: boolean }) { return <td className={cn("h-[var(--aui-component-table-row-height)] px-[var(--aui-component-table-cell-padding-inline)] text-[var(--aui-text-neutral)]", numeric&&"text-right tabular-nums", className)} {...props}/> }
function TableCaption({ className, ...props }: React.ComponentProps<"caption">) { return <caption className={cn("sr-only", className)} {...props}/> }

export { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption }
