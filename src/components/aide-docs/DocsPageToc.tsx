'use client'

import { useEffect, useState } from 'react'
import type { DocsTocItem } from '@/lib/aide-docs'

/** 스크롤에 따라 지금 보고 있는 섹션을 우측 목차에 실시간으로 반영한다. */
export function DocsPageToc({ items }: { items: DocsTocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id)

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section))
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (!visible.length) return
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveId(topMost.target.id)
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [items])

  return (
    <aside className="docs-page-toc" aria-label="현재 페이지 목차">
      <p className="docs-nav-label">On this page</p>
      <nav>
        {items.map((item) => (
          <a key={item.id} href={`#${item.id}`} aria-current={item.id === activeId ? 'page' : undefined}>{item.title}</a>
        ))}
      </nav>
    </aside>
  )
}
