'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StudioView from '@/components/StudioView'
import { loadHistory } from '@/lib/history'
import { readStudioNewHandoff, type StudioNewHandoff } from '@/lib/studio-route-handoff'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Spinner } from '@astryxdesign/core/Spinner'

type RouteState = 'loading' | 'ready' | 'missing'

function RecoveryState({ title, detail }: { title: string; detail: string }) {
  const router = useRouter()
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[var(--aui-page)] text-[var(--aui-text)]">
      <EmptyState
        title={title}
        description={detail}
        headingLevel={1}
        actions={<Button label="홈으로 돌아가기" variant="primary" onClick={() => router.push('/')} />}
      />
    </main>
  )
}

function RouteLoading() {
  return <main className="min-h-screen flex items-center justify-center bg-[var(--aui-page)]"><Spinner label="작업을 불러오는 중" /></main>
}

export function StudioHistoryRoute({ historyId }: { historyId: string }) {
  const router = useRouter()
  const [state, setState] = useState<RouteState>('loading')

  useEffect(() => {
    let active = true
    void loadHistory()
      .then(items => { if (active) setState(items.some(item => item.id === historyId) ? 'ready' : 'missing') })
      .catch(() => { if (active) setState('missing') })
    return () => { active = false }
  }, [historyId])

  if (state === 'loading') return <RouteLoading />
  if (state === 'missing') return <RecoveryState title="저장된 작업을 찾을 수 없습니다" detail="이 링크는 이 브라우저에 저장된 작업에만 연결됩니다. 홈에서 새 작업을 시작하거나 기록을 확인하세요." />
  return <StudioView triggerBrief="" historyId={historyId} onBack={() => router.push('/')} />
}

export function StudioNewRoute() {
  const router = useRouter()
  const [handoff, setHandoff] = useState<StudioNewHandoff | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) setHandoff(readStudioNewHandoff()) })
    return () => { active = false }
  }, [])

  if (handoff === undefined) return <RouteLoading />
  if (!handoff) return <RecoveryState title="새 작업 정보를 찾을 수 없습니다" detail="새 작업은 이 브라우저 탭의 입력 정보를 사용합니다. 홈에서 다시 시작하세요." />
  return (
    <StudioView
      triggerBrief={handoff.brief}
      triggerPreset={handoff.preset}
      triggerPlatform={handoff.platform}
      onBack={() => router.push('/')}
      onBoardSaved={(historyId) => router.replace(`/studio/${encodeURIComponent(historyId)}`)}
    />
  )
}
