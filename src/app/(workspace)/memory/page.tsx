'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@astryxdesign/core/Button'
import { Tab, TabList } from '@astryxdesign/core/TabList'
import { MemoryGraphCanvas } from '@/components/MemoryGraphCanvas'
import { MaterialIcon } from '@/components/ui/material-icon'
import { buildDemoMemoryGraph, MEMORY_DOMAINS, type MemoryDomainId, type MemoryNode } from '@/lib/memory-graph'
import { writeStudioNewHandoff } from '@/lib/studio-route-handoff'
import './memory.css'

const KIND_LABEL = {
  source: '원문', conversation: '대화', decision: '결정', concept: '개념', pattern: '화면 패턴', rule: '업무 규칙',
} as const

export default function MemoryPage() {
  const router = useRouter()
  const graph = useMemo(() => buildDemoMemoryGraph(), [])
  const [activeDomain, setActiveDomain] = useState<MemoryDomainId>('all')
  const [focusedNode, setFocusedNode] = useState<MemoryNode | null>(null)
  const relatedCount = graph.nodes.filter(node => activeDomain === 'all' || node.domain === activeDomain).length

  const startWithMemory = (node: MemoryNode) => {
    writeStudioNewHandoff({
      brief: `[조직 기억 컨텍스트]\n- ${node.title}: ${node.summary}\n\n위 조직 기억을 근거로 서비스 UI를 기획해줘.`,
      platform: 'web',
    })
    router.push('/studio/new')
  }

  return (
    <section className="memory-page" aria-labelledby="memory-title">
      <header className="memory-header">
        <h1 id="memory-title">메모리</h1>
        <TabList
          value={activeDomain}
          onChange={value => setActiveDomain(value as MemoryDomainId)}
          aria-label="도메인 필터"
        >
          <Tab value="all" label="전체" />
          {MEMORY_DOMAINS.map(domain => (
            <Tab key={domain.id} value={domain.id} label={domain.label} />
          ))}
        </TabList>
      </header>

      <div className="memory-workspace">
        <MemoryGraphCanvas
          nodes={graph.nodes}
          edges={graph.edges}
          activeDomain={activeDomain}
          query=""
          selectedIds={focusedNode ? [focusedNode.id] : []}
          onNodeSelect={setFocusedNode}
        />
        <div className="memory-summary" aria-label="기억 통계">
          <div><span>전체 노드</span><strong>{graph.nodes.length.toLocaleString()}</strong></div>
          <div><span>관련 기억</span><strong>{relatedCount.toLocaleString()}</strong></div>
        </div>
        <aside className="memory-detail" aria-live="polite">
          {focusedNode ? (
            <>
              <div className="memory-detail-header">
                <div>
                  <div className="memory-detail-eyebrow">{MEMORY_DOMAINS.find(domain => domain.id === focusedNode.domain)?.label} · {KIND_LABEL[focusedNode.kind]}</div>
                  <h2>{focusedNode.title}</h2>
                </div>
                <MaterialIcon name={focusedNode.approved ? 'verified' : 'pending'} size={20} aria-label={focusedNode.approved ? '승인된 기억' : '검토가 필요한 기억'} />
              </div>
              <p>{focusedNode.summary}</p>
              <code>{focusedNode.sourcePath}</code>
              <div className="memory-detail-actions">
                <Button
                  variant="secondary"
                  label="Obsidian에서 열기"
                  onClick={() => { window.location.href = `obsidian://open?vault=Aide&file=${encodeURIComponent(focusedNode.sourcePath)}` }}
                />
                <Button
                  variant="primary"
                  label="이 기억으로 시작"
                  icon={<MaterialIcon name="auto_awesome" size={17} />}
                  onClick={() => startWithMemory(focusedNode)}
                />
              </div>
            </>
          ) : (
            <div className="memory-empty-detail">노드를 선택하면 출처와 AI가 활용할 내용을 확인할 수 있어요.</div>
          )}
        </aside>
      </div>
    </section>
  )
}
