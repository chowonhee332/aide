"use client"

import * as React from "react"
import { Token } from "@astryxdesign/core/Token"
import { ToggleButton } from "@astryxdesign/core/ToggleButton"

/**
 * `chip` from the aide.md `component_registry`.
 *
 * The contract's chip is two things at once, and Astryx splits them: a filter chip
 * carrying a pressed state is `ToggleButton`, a dismissible entry is `Token`. The
 * component dispatches on `removable` so callers keep one API.
 */
type ChipProps = {
  selected?: boolean
  variant?: "solid" | "outlined"
  removable?: boolean
  removeLabel?: string
  onRemove?: () => void
  onClick?: (event: React.MouseEvent) => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

/** Astryx takes a string label, so the text is read out of the children. */
function labelOf(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .filter((child): child is string | number => typeof child === "string" || typeof child === "number")
    .join("")
    .trim()
}

function Chip({ selected, removable, onRemove, onClick, disabled, className, children }: ChipProps) {
  const label = labelOf(children)

  if (removable) {
    return (
      <span className={className}>
        <Token label={label} isDisabled={disabled} onClick={onClick} onRemove={onRemove} />
      </span>
    )
  }

  return (
    <span className={className}>
      <ToggleButton label={label} isPressed={selected} isDisabled={disabled} onPressedChange={(_, event) => onClick?.(event)} />
    </span>
  )
}
export { Chip }
