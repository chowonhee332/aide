'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AIDE_UI } from '@/lib/aide-ui'
import { Coins, Home, FolderOpen, KeyRound, Widgets, Palette } from '@/components/ui/material-icon'

const F = {
  canvas: AIDE_UI.canvas,
  surface: AIDE_UI.surface,
  inkMuted: AIDE_UI.textMuted,
  hairlineSoft: AIDE_UI.borderSubtle,
}

const NAV_ITEMS = [
  { href: '/', label: '홈', Icon: Home },
  { href: '/projects', label: '프로젝트', Icon: FolderOpen },
  { href: '/playground', label: 'Playground', Icon: Widgets },
  { href: '/aide-ui', label: '디자인 시스템', Icon: Palette },
] as const

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: F.canvas }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* LNB — persistent left menu, always shows all four sections */}
        <nav
          aria-label="워크스페이스 메뉴"
          style={{
            width: 216, flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh',
            padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          <Link
            href="/"
            aria-label="Aide 홈"
            style={{ display: 'flex', alignItems: 'center', height: 52, padding: '0 12px', marginBottom: 16 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_aide.png" alt="Aide" style={{ height: 42, width: 'auto' }} />
          </Link>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderRadius: 'var(--aui-radius-control)',
                  fontSize: 14, fontWeight: active ? 'var(--aui-weight-semibold)' : 'var(--aui-weight-regular)',
                  color: active ? F.ink : F.inkMuted,
                  backgroundColor: active ? 'var(--aui-fill)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                <Icon size={19} aria-hidden />
                {label}
              </Link>
            )
          })}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 16 }}>
            <Link href="/?settings=api" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--aui-radius-control)', color: F.inkMuted, fontSize: 14, textDecoration: 'none' }}>
              <KeyRound size={19} aria-hidden />
              API 설정
            </Link>
            <Link href="/?settings=billing" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--aui-radius-control)', color: F.inkMuted, fontSize: 14, textDecoration: 'none' }}>
              <Coins size={19} aria-hidden />
              과금
            </Link>
          </div>
        </nav>
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
