import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/material-icon'
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

  return (
    <div className="docs-app">
      <a className="docs-skip-link" href="#docs-main">본문으로 건너뛰기</a>
      <header className="docs-gnb">
        <Link className="docs-brand" href="/aide-ui" aria-label="Aide Design System 홈">
          <span className="docs-brand-mark" aria-hidden>W</span>
          <span>Aide Design System</span>
        </Link>
        <nav className="docs-global-nav" aria-label="디자인 시스템 주요 메뉴">
          {AUI_DOCUMENTATION.navigation.map((id) => (
            <Link key={id} href={sectionHref(id)} aria-current={id === sectionId ? 'page' : undefined}>
              {AUI_DOCUMENTATION.pages[id].title}
            </Link>
          ))}
        </nav>
        <div className="docs-gnb-actions">
          <Link className="docs-back" href="/"><ArrowLeft size={16}/><span>Aide</span></Link>
        </div>
      </header>

      <div className="docs-mobile-local-nav" aria-label={`${AUI_DOCUMENTATION.pages[sectionId].title} 메뉴`}>
        {localNavigation.map((item) => (
          <Link key={item.id} href={item.href} aria-current={item.id === pageId ? 'page' : undefined}>{item.title}</Link>
        ))}
      </div>

      <aside className="docs-lnb" aria-label={`${AUI_DOCUMENTATION.pages[sectionId].title} 메뉴`}>
        <p className="docs-nav-label">Browse {AUI_DOCUMENTATION.pages[sectionId].title}</p>
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
