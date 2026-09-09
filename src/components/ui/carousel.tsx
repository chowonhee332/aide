import * as React from "react"
import { Carousel as AstryxCarousel } from "@astryxdesign/core/Carousel"

/**
 * `carousel` from the aide.md `component_registry`, rendered by Astryx `Carousel`.
 *
 * The `items` array API is kept so callers do not change; Astryx takes children,
 * so each item becomes one child. Astryx supplies the scroll container, edge fade
 * and prev/next buttons that this component used to approximate with overflow CSS.
 */
function Carousel({
  items,
  label = "가로 목록",
  className,
}: {
  items: React.ReactNode[]
  label?: string
  className?: string
}) {
  return (
    <div className={className}>
      <AstryxCarousel aria-label={label} hasSnap gap={3}>
        {items.map((item, index) => (
          <div key={index} style={{ width: "70%", flexShrink: 0 }}>
            {item}
          </div>
        ))}
      </AstryxCarousel>
    </div>
  )
}
export { Carousel }
