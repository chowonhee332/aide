'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StudioView from '@/components/StudioView'
import { loadHistory } from '@/lib/history'
import { readStudioNewHandoff, type StudioNewHandoff } from '@/lib/studio-route-handoff'

type RouteState = 'loading' | 'ready' | 'missing'

function RecoveryState({ title, detail }: { title: string; detail: string }) {
  const router = useRouter()
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[var(--aui-page)] text-[var(--aui-text)]">
      <section className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--aui-text-muted)]">{detail}</p>
        <button type="button" onClick={() => router.push('/')} className="mt-6 px-4 py-2 text-sm font-semibold rounded-[var(--aui-radius-control)] bg-[var(--aui-primary)] text-[var(--aui-on-dark)]">
          홈으로 돌아가기
        </button>
      </section>
    </main>
  )
}

function RouteLoading() {
  return <main className="min-h-screen flex items-center justify-center text-sm text-[var(--aui-text-muted)] bg-[var(--aui-page)]">작업을 불러오는 중…</main>
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
