import { StudioHistoryRoute } from '@/components/StudioRouteView'

export default async function StudioHistoryPage({ params }: { params: Promise<{ historyId: string }> }) {
  const { historyId } = await params
  return <StudioHistoryRoute historyId={historyId} />
}
