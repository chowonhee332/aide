'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { Coins, Home, FolderOpen, KeyRound, Widgets, Palette, SlidersHorizontal } from '@/components/ui/material-icon'
import { useAideDensity } from '@/components/AideDensityProvider'
import { AIDE_DENSITY_PRESETS } from '@/lib/aide-density'

const NAV_ITEMS = [
  { href: '/', label: '홈', Icon: Home },
  { href: '/projects', label: '프로젝트', Icon: FolderOpen },
  { href: '/playground', label: 'Playground', Icon: Widgets },
  { href: '/aide-ui', label: '디자인 시스템', Icon: Palette },
] as const

/** 몰입형 작업 화면 — LNB를 아이콘만 남기고 콘텐츠를 라운드 카드로 띄운다. */
function isImmersiveRoute(pathname: string) {
  return pathname.startsWith('/playground') || pathname.startsWith('/aide-ui')
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { density, openDensityPicker } = useAideDensity()
  const preset = AIDE_DENSITY_PRESETS[density]
  const immersive = isImmersiveRoute(pathname)

  // 몰입형 라우트에 들어가면 접고, 나가면 편다. 같은 경로 안에서의 수동 토글만 존중한다.
  const [override, setOverride] = useState<{ path: string; collapsed: boolean } | null>(null)
  const collapsed = override?.path === pathname ? override.collapsed : immersive
  const setCollapsed = (next: boolean) => setOverride({ path: pathname, collapsed: next })

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        gap: 'var(--aui-space-3)',
        padding: 'var(--aui-space-3)',
        background: 'var(--aui-page)',
        colorScheme: 'light',
        boxSizing: 'border-box',
      }}
    >
      <SideNav
        header={<SideNavHeading heading="Aide" headingHref="/" icon={<img src="/logo_aide.png" alt="" style={{ height: 'var(--aui-density-logo-size)', width: 'auto' }} />} />}
        footer={
          <SideNavSection title="설정" isHeaderHidden>
            <SideNavItem label="화면 밀도" icon={<SlidersHorizontal size={preset.navIconSize} aria-hidden />} onClick={openDensityPicker} size={preset.navItemSize} />
            <SideNavItem label="API 설정" icon={<KeyRound size={preset.navIconSize} aria-hidden />} href="/?settings=api" size={preset.navItemSize} />
            <SideNavItem label="과금" icon={<Coins size={preset.navIconSize} aria-hidden />} href="/?settings=billing" size={preset.navItemSize} />
          </SideNavSection>
        }
        collapsible={{ isCollapsed: collapsed, onCollapsedChange: setCollapsed }}
        aria-label="워크스페이스 메뉴"
        style={{
          ...(collapsed ? {} : { width: 'var(--aui-density-lnb-width)' }),
          flexShrink: 0,
          height: '100%',
          borderRadius: 'var(--aui-radius-card)',
          overflow: 'hidden',
        }}
      >
        <SideNavSection title="탐색" isHeaderHidden>
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <SideNavItem
              key={href}
              label={label}
              icon={<Icon size={preset.navIconSize} aria-hidden />}
              href={href}
              isSelected={href === '/' ? pathname === '/' : pathname.startsWith(href)}
              size={preset.navItemSize}
            />
          ))}
        </SideNavSection>
      </SideNav>
      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          borderRadius: 'var(--aui-radius-card)',
          overflow: 'auto',
          background: 'var(--aui-canvas)',
          border: '1px solid var(--aui-border-subtle)',
          boxShadow: 'var(--aui-shadow-card)',
        }}
      >
        {children}
      </main>
    </div>
  )
}
