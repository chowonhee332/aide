"use client"

import * as React from "react"
import { DateInput } from "@astryxdesign/core/DateInput"
import { TimeInput } from "@astryxdesign/core/TimeInput"

/** Astryx types these as template literals (`YYYY-MM-DD`, `HH:MM`); derive rather than restate. */
type ISODate = React.ComponentProps<typeof DateInput>["value"]
type ISOTime = React.ComponentProps<typeof TimeInput>["value"]

/**
 * `date-picker` and `time-picker` from the aide.md `component_registry`, rendered by
 * Astryx `DateInput` / `TimeInput`.
 *
 * These used to be approximations — a popover holding a flat grid of day numbers and
 * a short list of preset times — so the `days` and `times` props that sized those
 * stand-ins are gone; Astryx ships a real calendar and time field. Values are ISO
 * (`YYYY-MM-DD`, `HH:MM`) instead of the display strings the stand-ins emitted.
 */
function DatePicker({
  label,
  value,
  placeholder = "날짜 선택",
  onValueChange,
  disabled,
  className,
}: {
  label: string
  /** ISO date, `YYYY-MM-DD`. */
  value?: ISODate
  placeholder?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const [selected, setSelected] = React.useState(value)
  return (
    <div className={className}>
      <DateInput
        label={label}
        placeholder={placeholder}
        value={selected}
        isDisabled={disabled}
        onChange={(next?: ISODate) => {
          setSelected(next)
          onValueChange?.(next ?? "")
        }}
      />
    </div>
  )
}

function TimePicker({
  label,
  value,
  placeholder = "시간 선택",
  onValueChange,
  disabled,
  className,
}: {
  label: string
  /** ISO time, `HH:MM`. */
  value?: ISOTime
  placeholder?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const [selected, setSelected] = React.useState(value)
  return (
    <div className={className}>
      <TimeInput
        label={label}
        placeholder={placeholder}
        value={selected}
        isDisabled={disabled}
        onChange={(next?: ISOTime) => {
          setSelected(next)
          onValueChange?.(next ?? "")
        }}
      />
    </div>
  )
}
export { DatePicker, TimePicker }
