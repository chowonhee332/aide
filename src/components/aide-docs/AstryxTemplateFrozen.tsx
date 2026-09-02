'use client'

// Renders one Astryx page template verbatim — its default export, sized to the
// host frame. Kept behind a dynamic boundary so Aide-mode Playground never loads
// Astryx. Carries the Astryx stylesheet itself — the template tab can be the only
// thing on screen, with the component palette (which also imports it) unmounted.

import '@astryxdesign/core/astryx.css'
import '@astryxdesign/theme-neutral/theme.css'
import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react'

type Props = { t?: string; label?: string }

const cache = new Map<string, Promise<Record<string, unknown>>>()

function loadTemplateModule(id: string): Promise<Record<string, unknown>> {
  let p = cache.get(id)
  if (!p) {
    p = import(
      /* webpackInclude: /\.tsx$/ */
      `@/lib/design-systems/generated/astryx-templates/${id}`
    ) as Promise<Record<string, unknown>>
    cache.set(id, p)
  }
  return p
}

function Placeholder({ label }: { label?: string }) {
  return (
    <div
      data-theme="light"
      style={{
        border: '1px dashed var(--color-border-neutral, #cbd2dc)',
        borderRadius: 8,
        padding: '12px 14px',
        color: 'var(--color-text-secondary, #5b6472)',
        fontSize: 12,
        background: 'var(--color-background-muted, #f5f6f8)',
        textAlign: 'center',
      }}
    >
      {label || 'Astryx block'}
    </div>
  )
}

class Boundary extends Component<{ label?: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <Placeholder label={this.props.label} /> : this.props.children
  }
}

export function AstryxTemplateFrozen({ t, label }: Props) {
  const [Comp, setComp] = useState<ComponentType<unknown> | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!t) return
    let alive = true
    loadTemplateModule(t)
      .then((mod) => {
        if (!alive) return
        const picked = mod.default as ComponentType<unknown> | undefined
        if (picked) setComp(() => picked)
        else setFailed(true)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [t])

  if (!t || failed || !Comp) return <Placeholder label={label} />
  return (
    // colorScheme:'light' pins CSS light-dark() in the Astryx theme to its light
    // values; without it the page paints with the dark palette.
    <div data-theme="light" style={{ width: '100%', height: '100%', minHeight: '100%', colorScheme: 'light' }}>
      <Boundary label={label}>
        <Comp />
      </Boundary>
    </div>
  )
}

export default AstryxTemplateFrozen
