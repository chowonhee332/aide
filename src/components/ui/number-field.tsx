"use client"

import * as React from "react"
import { NumberInput } from "@astryxdesign/core/NumberInput"

/**
 * `number-field` from the aide.md `component_registry`, rendered by Astryx
 * `NumberInput`, which ships the stepper buttons, clamping and keyboard handling
 * this component used to assemble from two ghost Buttons and a bare `<input>`.
 */
function NumberField({
  label,
  value,
  defaultValue = 0,
  min,
  max,
  step = 1,
  onValueChange,
  className,
  disabled,
}: {
  label: string
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number) => void
  className?: string
  disabled?: boolean
}) {
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value ?? internal

  return (
    <div className={className}>
      <NumberInput
        label={label}
        // Opt in: Astryx hides the steppers by default, but the aide.md contract's
        // number-field is the increment/decrement control, not a bare numeric input.
        hasNumberSteppers
        value={current}
        min={min}
        max={max}
        step={step}
        isDisabled={disabled}
        onChange={(next: number) => {
          setInternal(next)
          onValueChange?.(next)
        }}
      />
    </div>
  )
}
export { NumberField }
