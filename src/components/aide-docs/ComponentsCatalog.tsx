'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { SearchField } from '@/components/ui/search-field'
import { ComponentPreview } from './ComponentPreview'
import { humanizeId } from '@/lib/aide-docs'
import type { ComponentPreviewSize } from '@/lib/aide-docs'

interface CatalogComponent {
  id: string
  title: string
  category: string
  previewSize: ComponentPreviewSize
}

export function ComponentsCatalog({ components, categories }: { components: CatalogComponent[]; categories: string[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return components.filter((component) =>
      (category === 'all' || component.category === category)
      && (!normalizedQuery || `${component.title} ${component.id} ${component.category}`.toLowerCase().includes(normalizedQuery)),
    )
  }, [category, components, query])

  return <>
    <div className="docs-catalog-tools">
      <SearchField value={query} onChange={(event)=>setQuery(event.target.value)} onClear={()=>setQuery('')} placeholder="컴포넌트 검색" aria-label="컴포넌트 검색"/>
      <div className="docs-category-filter" role="group" aria-label="컴포넌트 카테고리">
        {['all', ...categories].map((id)=><button key={id} type="button" aria-pressed={category === id} onClick={()=>setCategory(id)}>{id === 'all' ? 'All' : humanizeId(id)}</button>)}
      </div>
    </div>
    {categories.map((categoryId) => {
      const categoryComponents = filtered.filter((component) => component.category === categoryId)
      if (!categoryComponents.length) return null
      return <section className="docs-component-group docs-page-section" id={categoryId} key={categoryId}>
        <h2>{humanizeId(categoryId)}</h2>
        <div className="docs-component-grid">
          {categoryComponents.map((component) => (
            <article className={`docs-component-card docs-component-card-${component.previewSize}`} key={component.id}>
              <div className={`docs-component-preview docs-component-preview-${component.previewSize}`}><ComponentPreview id={component.id}/></div>
              <h3><Link href={`/aide-ui/components/${component.id}`}>{component.title}</Link></h3>
              <p>{humanizeId(component.category)}</p>
              <span className="docs-component-status">Documented</span>
            </article>
          ))}
        </div>
      </section>
    })}
    {!filtered.length ? <div className="docs-catalog-empty"><b>일치하는 컴포넌트가 없습니다.</b><span>검색어나 카테고리를 변경해 보세요.</span></div> : null}
  </>
}
