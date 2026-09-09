import * as React from "react"
import { FormLayout } from "@astryxdesign/core/FormLayout"
import { Text } from "@astryxdesign/core/Text"

/**
 * `field-group` from the aide.md `component_registry`.
 *
 * Composed rather than renamed: Astryx `InputGroup` decorates a *single* input with
 * prefix/suffix addons, which is a different component. `FormLayout` is the piece
 * that arranges several fields, but it carries no legend or help text, so the
 * fieldset semantics stay here and Astryx handles the arrangement and spacing.
 */
function FieldGroup({
  className,
  label,
  help,
  error,
  children,
  ...props
}: React.ComponentProps<"fieldset"> & {
  label: React.ReactNode
  help?: React.ReactNode
  error?: React.ReactNode
}) {
  return (
    <fieldset
      className={className}
      style={{ display: "grid", minWidth: 0, gap: "var(--aui-space-2)", border: 0, padding: 0 }}
      {...props}
    >
      <legend style={{ marginBottom: "var(--aui-space-1)" }}>
        <Text weight="semibold">{label}</Text>
      </legend>
      <FormLayout direction="horizontal">{children}</FormLayout>
      {error || help ? (
        // Astryx `Text` has no error colour role, so the negative token is applied
        // directly — the same `--aui-negative` this component used before.
        <span style={error ? { color: "var(--aui-negative)" } : undefined}>
          <Text type="supporting" color={error ? "inherit" : "secondary"}>
            {error ?? help}
          </Text>
        </span>
      ) : null}
    </fieldset>
  )
}
export { FieldGroup }
