import { PlaygroundRouteView } from '@/components/PlaygroundRouteView'

export default async function PlaygroundPage({ searchParams }: { searchParams: Promise<{ template?: string; device?: string }> }) {
  const { template, device } = await searchParams
  return <PlaygroundRouteView initialTemplateId={template} initialDevice={device === 'desktop' ? 'desktop' : 'mobile'} />
}
