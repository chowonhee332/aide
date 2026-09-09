"use client"

import * as React from "react"
import { Collapsible } from "@astryxdesign/core/Collapsible"

/**
 * `accordion` from the aide.md `component_registry`, rendered by Astryx `Collapsible`.
 *
 * The single-open behaviour is kept here as controlled `isOpen`/`onOpenChange`
 * rather than handed to `CollapsibleGroup`, so the `defaultOpenId` API and the
 * "click the open item to close it" behaviour survive the swap unchanged.
 */
function Accordion({
  items,
  defaultOpenId,
  className,
}: {
  items: Array<{ id: string; title: React.ReactNode; content: React.ReactNode }>
  defaultOpenId?: string
  className?: string
}) {
  const [openId, setOpenId] = React.useState<string | undefined>(defaultOpenId)
  return (
    <div className={className}>
      {items.map((item) => (
        <Collapsible
          key={item.id}
          value={item.id}
          trigger={item.title}
          isOpen={openId === item.id}
          onOpenChange={(open: boolean) => setOpenId(open ? item.id : undefined)}
        >
          {item.content}
        </Collapsible>
      ))}
    </div>
  )
}
export { Accordion }
