"use client"

import * as React from "react"
import { Pagination as AstryxPagination } from "@astryxdesign/core/Pagination"

/**
 * `pagination` and `pagination-dots` from the aide.md `component_registry`, both
 * rendered by Astryx `Pagination` — the dots carousel indicator is its `dots` variant
 * rather than a separate component.
 */
function Pagination({
  total,
  page,
  defaultPage = 1,
  onPageChange,
  className,
}: {
  /** Total number of pages. */
  total: number
  page?: number
  defaultPage?: number
  onPageChange?: (page: number) => void
  label?: string
  className?: string
}) {
  const [internal, setInternal] = React.useState(defaultPage)
  const current = page ?? internal
  return (
    <div className={className}>
      <AstryxPagination
        page={current}
        totalPages={total}
        onChange={(next: number) => {
          setInternal(next)
          onPageChange?.(next)
        }}
      />
    </div>
  )
}

function PaginationDots({
  total,
  index = 0,
  className,
}: {
  total: number
  /** Zero-based position, matching the carousel item index. */
  index?: number
  label?: string
  className?: string
}) {
  return (
    <div className={className}>
      <AstryxPagination variant="dots" page={index + 1} totalPages={total} onChange={() => {}} />
    </div>
  )
}
export { Pagination, PaginationDots }
