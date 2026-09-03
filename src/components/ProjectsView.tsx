'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { type HistoryItem, loadHistory, deleteHistoryItem, relativeTime } from '@/lib/history'
import { ArrowLeft, Trash2 } from '@/components/ui/material-icon'
import { AIDE_UI } from '@/lib/aide-ui'

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
          <button
            onClick={() => router.push('/')}
            aria-label="홈으로"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--aui-radius-pill)', border: `1px solid ${F.hairline}`, background: 'none', cursor: 'pointer', color: F.ink }}
          >
            <ArrowLeft size={16} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 'var(--aui-weight-semibold)', color: F.ink, margin: 0 }}>프로젝트</h1>
        </div>
        <div role="tablist" aria-label="프로젝트 필터" style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 'var(--aui-radius-pill)', backgroundColor: 'var(--aui-fill)' }}>
          {TABS.map(t => {
            const active = tab === t.id
            const count = items.filter(item => matchesTab(item, t.id)).length
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '7px 16px', borderRadius: 'var(--aui-radius-pill)', border: 'none', cursor: 'pointer',
                  fontSize: 'var(--aui-type-compact-size)', fontWeight: 'var(--aui-weight-semibold)',
                  backgroundColor: active ? F.ink : 'transparent', color: active ? F.canvas : F.inkMuted,
                }}
              >
                {t.label} {count > 0 && `(${count})`}
              </button>
            )
          })}
        </div>
      </header>

      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12, color: F.inkMuted }}>
          <p style={{ fontSize: 15 }}>아직 프로젝트가 없습니다.</p>
          <button
            onClick={() => router.push('/')}
            style={{ padding: '10px 20px', borderRadius: 'var(--aui-radius-pill)', border: 'none', backgroundColor: F.ink, color: F.canvas, cursor: 'pointer', fontSize: 14, fontWeight: 'var(--aui-weight-semibold)' }}
          >
            홈에서 새 프로젝트 시작하기
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20,
          padding: '28px 24px 64px', maxWidth: 1400, margin: '0 auto',
        }}>
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => router.push(`/studio/${encodeURIComponent(item.id)}`)}
              style={{
                cursor: 'pointer', borderRadius: 'var(--aui-radius-card)', overflow: 'hidden',
                border: `1px solid ${F.hairlineSoft}`, backgroundColor: F.surface,
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
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id).then(refresh) }}
                    aria-label="삭제"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--aui-negative)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
