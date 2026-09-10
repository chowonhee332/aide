'use client'

import BuilderView from '@/components/BuilderView'

export function PlaygroundRouteView({ initialTemplateId, initialDevice }: { initialTemplateId?: string; initialDevice?: 'mobile' | 'desktop' }) {
  return <BuilderView initialTemplateId={initialTemplateId} initialDevice={initialDevice} />
}
