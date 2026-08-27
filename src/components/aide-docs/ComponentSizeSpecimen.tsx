'use client'

import { ComponentPreview } from './ComponentPreview'
import { humanizeId } from '@/lib/aide-docs'

/**
 * 크기는 라디오로 하나씩 바꿔 보는 것보다 나란히 놓고 비교하는 편이 빠르다.
 * 값은 계약의 component_tokens에서 파생한 것을 그대로 받아 쓰므로 문서가 실제와 어긋나지 않는다.
 */
export interface SizeSpecimenItem {
  /** recipe properties의 size 값 — 컴포넌트에 그대로 전달한다. */
  value: string
  /** component_tokens에서 파생한 실제 치수. 없으면 표기하지 않는다. */
  measure?: string
}

export function ComponentSizeSpecimen({ id, items }: { id: string; items: SizeSpecimenItem[] }) {
  if (!items.length) return null
  return <div className="docs-size-specimen">
    {items.map((item) => (
      <figure key={item.value}>
        <figcaption>{humanizeId(item.value)}</figcaption>
        <div className="docs-size-specimen-stage">
          <ComponentPreview id={id} props={{ size: item.value }}/>
          {item.measure ? <span className="docs-size-specimen-measure">{item.measure}</span> : null}
        </div>
      </figure>
    ))}
  </div>
}
