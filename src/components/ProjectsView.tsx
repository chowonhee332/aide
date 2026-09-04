'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { type HistoryItem, loadHistory, deleteHistoryItem, relativeTime } from '@/lib/history'
import { ArrowLeft, Trash2 } from '@/components/ui/material-icon'
import { AIDE_UI } from '@/lib/aide-ui'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Tab, TabList } from '@astryxdesign/core/TabList'

const F = {
  canvas: AIDE_UI.canvas,
  surface: AIDE_UI.surface,
  ink: AIDE_UI.text,
  inkMuted: AIDE_UI.textMuted,
  hairline: AIDE_UI.border,
  hairlineSoft: AIDE_UI.borderSubtle,
}

type ProjectTab = 'board' | 'variant' | 'design'

function matchesTab(item: HistoryItem, tab: ProjectTab) {
  if (tab === 'board') return item.itemType === 'board'
  if (tab === 'variant') return (
    (item.itemType === 'board' && (item.board?.mainVariants?.some(Boolean) ?? false)) ||
    item.itemType === 'variant'
  )
  return item.itemType === 'board' && !!item.board?.prototypeHtml
}

const TABS: Array<{ id: ProjectTab; label: string }> = [
  { id: 'board', label: '전체' },
  { id: 'variant', label: '시안' },
  { id: 'design', label: '프로토타입' },
]

export default function ProjectsView() {
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [tab, setTab] = useState<ProjectTab>('board')
  const [, startTransition] = useTransition()

  const refresh = useCallback(() => {
    loadHistory().then(loaded => startTransition(() => setItems(loaded)))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const filtered = items.filter(item => matchesTab(item, tab))

  return (
    <main style={{ minHeight: '100vh', backgroundColor: F.canvas, fontFamily: 'inherit' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: F.canvas,
        borderBottom: `1px solid ${F.hairlineSoft}`, padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconButton
            onClick={() => router.push('/')}
            label="홈으로"
            icon={<ArrowLeft size={16} />}
            variant="secondary"
          />
          <h1 style={{ fontSize: 20, fontWeight: 'var(--aui-weight-semibold)', color: F.ink, margin: 0 }}>프로젝트</h1>
        </div>
        <TabList value={tab} onChange={(value) => setTab(value as ProjectTab)} aria-label="프로젝트 필터">
          {TABS.map(t => {
            const count = items.filter(item => matchesTab(item, t.id)).length
            return <Tab key={t.id} value={t.id} label={`${t.label}${count > 0 ? ` (${count})` : ''}`} />
          })}
        </TabList>
      </header>

      {filtered.length === 0 ? (
        <EmptyState
          title="아직 프로젝트가 없습니다."
          actions={<Button label="홈에서 새 프로젝트 시작하기" variant="primary" onClick={() => router.push('/')} />}
          style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}
        />
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20,
          padding: '28px 24px 64px', maxWidth: 1400, margin: '0 auto',
        }}>
          {filtered.map(item => (
            <Card
              key={item.id}
              onClick={() => router.push(`/studio/${encodeURIComponent(item.id)}`)}
              style={{
                cursor: 'pointer', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ aspectRatio: item.platform === 'web' ? '16/10' : '9/16', maxHeight: 220, backgroundColor: 'var(--aui-fill)', overflow: 'hidden' }}>
                {item.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail} alt={item.brief || '프로젝트 썸네일'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 13, color: F.ink, margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.brief || '(제목 없음)'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: F.inkMuted }}>{relativeTime(item.createdAt)}</span>
                  <IconButton
                    onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id).then(refresh) }}
                    label="삭제"
                    icon={<Trash2 size={13} />}
                    variant="ghost"
                    size="sm"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
