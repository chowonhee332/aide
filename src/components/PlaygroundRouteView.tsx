'use client'

import { useRouter } from 'next/navigation'
import BuilderView from '@/components/BuilderView'

export function PlaygroundRouteView({ initialTemplateId, initialDevice }: { initialTemplateId?: string; initialDevice?: 'mobile' | 'desktop' }) {
  const router = useRouter()
  return <BuilderView onBack={() => router.push('/')} initialTemplateId={initialTemplateId} initialDevice={initialDevice} />
}
