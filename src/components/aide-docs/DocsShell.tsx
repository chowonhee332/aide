import Link from 'next/link'
import { AUI_DOCUMENTATION } from '@/lib/aide-product-tokens'
import { sectionHref, sectionNavigation, type DocsTocItem } from '@/lib/aide-docs'
import { DocsPageToc } from './DocsPageToc'

interface DocsShellProps {
  sectionId: string
  pageId: string
  toc?: DocsTocItem[]
  children: React.ReactNode
}

export function DocsShell({ sectionId, pageId, toc = [], children }: DocsShellProps) {
  const localNavigation = sectionNavigation(sectionId)
  const sections = AUI_DOCUMENTATION.navigation

  return (
    <div className="docs-app">
      <a className="docs-skip-link" href="#docs-main">본문으로 건너뛰기</a>

      <nav className="docs-mobile-section-nav" aria-label="디자인 시스템 섹션">
        {sections.map((id) => (
          <Link key={id} href={sectionHref(id)} aria-current={id === sectionId ? 'page' : undefined}>
            {AUI_DOCUMENTATION.pages[id].title}
          </Link>
        ))}
      </nav>

      <div className="docs-mobile-local-nav" aria-label={`${AUI_DOCUMENTATION.pages[sectionId].title} 메뉴`}>
        {localNavigation.map((item) => (
          <Link key={item.id} href={item.href} aria-current={item.id === pageId ? 'page' : undefined}>{item.title}</Link>
        ))}
      </div>

      <aside className="docs-lnb" aria-label="디자인 시스템 탐색">
        <p className="docs-nav-label">디자인 시스템</p>
        <nav className="docs-lnb-sections" aria-label="디자인 시스템 섹션">
          {sections.map((id) => (
            <Link key={id} href={sectionHref(id)} aria-current={id === sectionId ? 'page' : undefined}>
              {AUI_DOCUMENTATION.pages[id].title}
            </Link>
          ))}
        </nav>

        <p className="docs-nav-label docs-lnb-section-start">Browse {AUI_DOCUMENTATION.pages[sectionId].title}</p>
        <nav>
          {localNavigation.map((item, index) => {
            const previousGroup = localNavigation[index - 1]?.group
            const showGroup = Boolean(item.group && item.group !== previousGroup)
            return (
              <div className={showGroup ? 'docs-lnb-group docs-lnb-section-start' : 'docs-lnb-group'} key={item.id}>
                {showGroup ? <p>{item.group}</p> : null}
                <Link href={item.href} aria-current={item.id === pageId ? 'page' : undefined}>
                  <span>{item.title}</span>
                </Link>
              </div>
          )})}
        </nav>
      </aside>

      <main className="docs-content" id="docs-main">{children}</main>

      {toc.length > 0 ? <DocsPageToc items={toc}/> : null}
    </div>
  )
}
