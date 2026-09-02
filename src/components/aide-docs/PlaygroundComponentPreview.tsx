'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { ComponentPreview } from './ComponentPreview'

// Astryx renderer (+ its stylesheet) is code-split: it loads only once an
// astryx-* component actually renders, so Aide-mode Playground never pays for it.
const AstryxComponentPreview = dynamic(
  () => import('./AstryxComponentPreview').then((mod) => mod.AstryxComponentPreview),
  { ssr: false, loading: () => null },
)

const AstryxTemplateFrozen = dynamic(
  () => import('./AstryxTemplateFrozen').then((mod) => mod.AstryxTemplateFrozen),
  { ssr: false, loading: () => null },
)

type PlaygroundComponentPreviewProps = {
  id: string
  props?: Record<string, string>
  device?: 'mobile' | 'desktop'
  context?: 'docs' | 'playground'
  /** Rendered canvas children for container components (shallow nesting). */
  children?: ReactNode
}

/** Routes a Playground preview to the renderer for its design system. */
export function PlaygroundComponentPreview({ id, props, device, context, children }: PlaygroundComponentPreviewProps) {
  if (id === 'astryx-frozen') {
    return <AstryxTemplateFrozen t={props?.t} label={props?.label} />
  }
  if (id.startsWith('astryx-')) {
    return <AstryxComponentPreview id={id} props={props} device={device} slot={children} />
  }
  return <ComponentPreview id={id} props={props} device={device} context={context} />
}
