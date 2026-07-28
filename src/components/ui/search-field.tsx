"use client"

import * as React from "react"
import { Search, X } from "@/components/ui/material-icon"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Input } from "./field"

function SearchField({ className, value, defaultValue, onChange, onClear, ...props }: React.ComponentProps<"input"> & { onClear?: () => void }) {
  const [internal, setInternal] = React.useState(String(defaultValue ?? ""))
  const current = value === undefined ? internal : String(value)
  return <div data-slot="search-field" className={cn("relative", className)}>
    <Search aria-hidden className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--aui-text-muted)]" />
    <Input type="search" value={current} className="appearance-none pl-9 pr-11 [&::-webkit-search-cancel-button]:hidden" onChange={(event) => { setInternal(event.target.value); onChange?.(event) }} {...props} />
    {current && <Button type="button" variant="ghost" size="icon" aria-label="검색어 지우기" className="absolute right-0 top-1/2 -translate-y-1/2" onClick={() => { setInternal(""); onClear?.() }}><X /></Button>}
  </div>
}

export { SearchField }
