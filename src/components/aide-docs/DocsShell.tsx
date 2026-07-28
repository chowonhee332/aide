import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/material-icon'
import { AUI_DOCUMENTATION, AUI_SCHEMA_VERSION, AUI_TOKEN_ENTRIES } from '@/lib/aide-product-tokens'
import { sectionHref, sectionNavigation, type DocsTocItem } from '@/lib/aide-docs'

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
      <header className="docs-gnb">
        <Link className="docs-brand" href="/aide-ui" aria-label="Wonhee Design System 홈">
          <span className="docs-brand-mark" aria-hidden>W</span>
          <span>Wonhee Design System</span>
        </Link>
        <nav className="docs-global-nav" aria-label="디자인 시스템 주요 메뉴">
          {AUI_DOCUMENTATION.navigation.map((id) => (
            <Link key={id} href={sectionHref(id)} aria-current={id === sectionId ? 'page' : undefined}>
              {AUI_DOCUMENTATION.pages[id].title}
            </Link>
          ))}
        </nav>
        <div className="docs-gnb-actions">
          <span className="docs-product-badge">PRODUCT UI</span>
          <span className="docs-version">v{AUI_SCHEMA_VERSION} · {AUI_TOKEN_ENTRIES.length} tokens</span>
          <Link className="docs-back" href="/"><ArrowLeft size={16}/><span>Aide</span></Link>
        </div>
      </header>

      <div className="docs-mobile-local-nav" aria-label={`${AUI_DOCUMENTATION.pages[sectionId].title} 메뉴`}>
        {localNavigation.map((item) => (
          <Link key={item.id} href={item.href} aria-current={item.id === pageId ? 'page' : undefined}>{item.title}</Link>
        ))}
      </div>

      <aside className="docs-lnb" aria-label={`${AUI_DOCUMENTATION.pages[sectionId].title} 메뉴`}>
        <p className="docs-nav-label">{AUI_DOCUMENTATION.pages[sectionId].title}</p>
        <nav>
          {localNavigation.map((item, index) => {
            const previousGroup = localNavigation[index - 1]?.group
            const showGroup = Boolean(item.group && item.group !== previousGroup)
            return (
            <Link
              key={item.id}
              className={showGroup ? 'docs-lnb-section-start' : undefined}
              href={item.href}
              aria-current={item.id === pageId ? 'page' : undefined}
            >
              {showGroup ? <small>{item.group?.replaceAll('-', ' ')}</small> : null}
              <span>{item.title}</span>
            </Link>
          )})}
        </nav>
      </aside>

      <main className="docs-content">{children}</main>

      {toc.length > 0 ? (
        <aside className="docs-page-toc" aria-label="현재 페이지 목차">
          <p className="docs-nav-label">On this page</p>
          <nav>
            {toc.map((item) => <a key={item.id} href={`#${item.id}`}>{item.title}</a>)}
          </nav>
        </aside>
      ) : null}
    </div>
  )
}
