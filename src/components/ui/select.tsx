"use client"

import * as React from "react"
import { Selector } from "@astryxdesign/core/Selector"

/**
 * `select` from the aide.md `component_registry`, rendered by Astryx `Selector`.
 *
 * Callers pass `<option>` children like a native select; Astryx takes an `options`
 * array instead, so the children are read here rather than changing every call
 * site. Anything that is not an `<option>` element is ignored, which is what a
 * native select does with stray children anyway.
 */
type SelectProps = {
  label?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  children?: React.ReactNode
}

function optionsFromChildren(children: React.ReactNode): { value: string; label: string }[] {
  const collected: { value: string; label: string }[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== "option") return
    const props = child.props as { value?: string | number; children?: React.ReactNode }
    const text = React.Children.toArray(props.children)
      .filter((node): node is string | number => typeof node === "string" || typeof node === "number")
      .join("")
    collected.push({ value: String(props.value ?? text), label: text })
  })
  return collected
}

function Select({
  label,
  value,
  defaultValue,
  onChange,
  disabled,
  placeholder,
  className,
  children,
}: SelectProps) {
  const options = React.useMemo(() => optionsFromChildren(children), [children])
  const [internal, setInternal] = React.useState(defaultValue ?? "")
  const current = value ?? internal

  return (
    <div className={className}>
      {/* Astryx requires an accessible label; callers usually wrap this in `Field`,
          which renders the visible one, so hide ours when none was given. */}
      <Selector
        label={label ?? "선택"}
        isLabelHidden={!label}
        options={options}
        value={current}
        placeholder={placeholder}
        isDisabled={disabled}
        onChange={(next: string) => {
          setInternal(next)
          onChange?.(next)
        }}
      />
    </div>
  )
}
export { Select }
