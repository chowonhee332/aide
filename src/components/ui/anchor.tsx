import * as React from "react"
import { Link } from "@astryxdesign/core/Link"

/**
 * `anchor` from the aide.md `component_registry`, rendered by Astryx `Link`.
 *
 * Astryx's `isExternalLink` already does what this component used to assemble by
 * hand: opens a new tab, merges the safe `rel` tokens, appends the external icon
 * and announces the new tab to screen readers. `newTabLabel` keeps that
 * announcement Korean.
 */
function Anchor({
  external,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "isExternalLink" | "newTabLabel"> & { external?: boolean }) {
  return (
    <Link isExternalLink={external} newTabLabel="(새 창에서 열림)" {...props}>
      {children}
    </Link>
  )
}
export { Anchor }
