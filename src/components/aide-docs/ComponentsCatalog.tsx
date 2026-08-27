import Link from 'next/link'
import { ComponentHeroFrame } from './ComponentHeroFrame'
import { humanizeId } from '@/lib/aide-docs'
import type { ComponentPreviewSize } from '@/lib/aide-docs'

interface CatalogComponent {
  id: string
  title: string
  category: string
  previewSize: ComponentPreviewSize
}

export function ComponentsCatalog({ components, categories }: { components: CatalogComponent[]; categories: string[] }) {
  return <>
    {categories.map((categoryId) => {
      const categoryComponents = components.filter((component) => component.category === categoryId)
      if (!categoryComponents.length) return null
      return <section className="docs-component-group" id={categoryId} key={categoryId}>
        <h2 className="docs-component-group-title"><a href={`#${categoryId}`}>{humanizeId(categoryId)}</a></h2>
        <div className="docs-component-grid">
          {categoryComponents.map((component) => (
            <article className={`docs-component-card docs-component-card-${component.previewSize}`} key={component.id}>
              {/* 카드 전체를 링크로 만들되, 프리뷰가 자체적으로 <a>를 렌더링하는 컴포넌트(anchor 등)와
                  중첩되지 않도록 별도 오버레이 링크로 감싼다. */}
              <Link className="docs-component-card-link" href={`/aide-ui/components/${component.id}`} aria-label={component.title}/>
              <figure className={`docs-component-preview docs-component-preview-${component.previewSize}`} aria-label={`${component.title} 미리보기`}>
                <ComponentHeroFrame componentId={component.id} compact/>
              </figure>
              <h3>{component.title}</h3>
            </article>
          ))}
        </div>
      </section>
    })}
  </>
}
