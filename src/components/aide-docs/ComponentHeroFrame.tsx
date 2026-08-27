import { ComponentPreview } from './ComponentPreview'
import { componentHeroAnchor, componentPreviewFramed } from '@/lib/aide-docs'

/**
 * 컴포넌트 상세 페이지의 대표 이미지와 Overview 썸네일이 같은 프레임을 쓰도록 공유하는 렌더러.
 * `compact`만 다르면 카드형 그리드에도, 상세 페이지의 큰 hero에도 동일하게 쓸 수 있다.
 */
export function ComponentHeroFrame({ componentId, compact = false }: { componentId: string; compact?: boolean }) {
  const framed = componentPreviewFramed(componentId)
  const anchor = componentHeroAnchor(componentId)

  // Overview 카드에서는 프레임 없이 실물만 보여준다. 상세 hero는 overlay가 아닌 한 프레임을 유지한다.
  if (compact || !framed) {
    return (
      <div className={compact ? 'docs-hero-plain docs-hero-plain-compact' : 'docs-hero-plain'} data-anchor={anchor}>
        <ComponentPreview id={componentId}/>
      </div>
    )
  }

  return (
    <div
      className="docs-hero-example"
      data-fade={anchor === 'bottom' ? 'top' : anchor === 'top' ? 'bottom' : 'none'}
    >
      <div className="docs-hero-frame" data-anchor={anchor}>
        <div className="docs-hero-frame-inner"><ComponentPreview id={componentId}/></div>
      </div>
    </div>
  )
}
