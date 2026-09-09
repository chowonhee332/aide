"use client"

import * as React from "react"
import { Slider as AstryxSlider } from "@astryxdesign/core/Slider"

/**
 * `slider` from the aide.md `component_registry`, rendered by Astryx `Slider`.
 *
 * Callers use the native range-input prop shape, so the numeric `onChange` Astryx
 * reports is turned back into a change event before it is handed on. Astryx shows
 * the value in a tooltip by default; `showValue` maps to its always-visible text.
 */
function Slider({
  label,
  showValue = true,
  className,
  value,
  defaultValue,
  onChange,
  min,
  max,
  step,
  disabled,
}: Omit<React.ComponentProps<"input">, "onChange"> & {
  label: string
  showValue?: boolean
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [internal, setInternal] = React.useState(Number(defaultValue ?? min ?? 0))
  const current = value === undefined ? internal : Number(value)

  return (
    <div className={className}>
      <AstryxSlider
        label={label}
        value={current}
        min={min === undefined ? undefined : Number(min)}
        max={max === undefined ? undefined : Number(max)}
        step={step === undefined ? undefined : Number(step)}
        isDisabled={disabled}
        valueDisplay={showValue ? "text" : "none"}
        onChange={(next: number) => {
          setInternal(next)
          onChange?.({
            target: { value: String(next) },
          } as React.ChangeEvent<HTMLInputElement>)
        }}
      />
    </div>
  )
}
export { Slider }
