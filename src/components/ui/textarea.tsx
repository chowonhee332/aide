"use client"

import * as React from "react"
import { TextArea } from "@astryxdesign/core/TextArea"

/**
 * `textarea` from the aide.md `component_registry`, rendered by Astryx `TextArea`.
 *
 * The native-textarea prop shape is kept so call sites do not change: Astryx
 * reports `onChange` as `(value, event)` rather than `(event)`, so the event is
 * handed back through in the original position.
 */
type TextareaProps = Omit<React.ComponentProps<"textarea">, "onChange"> & {
  label?: string
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
}

function Textarea({
  label,
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled,
  rows,
  className,
  ...props
}: TextareaProps) {
  const [internal, setInternal] = React.useState(String(defaultValue ?? ""))
  const current = value !== undefined ? String(value) : internal

  return (
    <div className={className}>
      {/* Callers usually wrap this in `Field`, which renders the visible label;
          Astryx still needs one for the accessible name. */}
      <TextArea
        label={label ?? "입력"}
        isLabelHidden={!label}
        value={current}
        placeholder={placeholder}
        isDisabled={disabled}
        rows={rows}
        onChange={(next: string, event: React.ChangeEvent<HTMLTextAreaElement>) => {
          setInternal(next)
          onChange?.(event)
        }}
        {...props}
      />
    </div>
  )
}
export { Textarea }
