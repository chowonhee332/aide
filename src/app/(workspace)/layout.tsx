'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Avatar, type AvatarSize } from '@astryxdesign/core/Avatar'
import { Coins, Home, FolderOpen, Hub, KeyRound, Menu, Widgets, Palette, SlidersHorizontal } from '@/components/ui/material-icon'
import { useAideDensity } from '@/components/AideDensityProvider'
import { AIDE_DENSITY_PRESETS } from '@/lib/aide-density'
import './workspace.css'

/** Drive-style grouping: the shell separates work from tooling with a section break. */
const NAV_GROUPS = [
  {
    title: '작업',
    items: [
      { href: '/', label: '홈', Icon: Home },
      { href: '/projects', label: '프로젝트', Icon: FolderOpen },
      { href: '/memory', label: '메모리', Icon: Hub },
    ],
  },
  {
    title: '도구',
    items: [
      { href: '/playground', label: 'Playground', Icon: Widgets },
      { href: '/aide-ui', label: '디자인 시스템', Icon: Palette },
    ],
  },
] as const

/** 몰입형 작업 화면 — LNB를 아이콘만 남기고 콘텐츠를 라운드 카드로 띄운다. */
function isImmersiveRoute(pathname: string) {
  return pathname.startsWith('/playground') || pathname.startsWith('/aide-ui') || pathname.startsWith('/studio')
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { density, openDensityPicker } = useAideDensity()
  const preset = AIDE_DENSITY_PRESETS[density]
  const immersive = isImmersiveRoute(pathname)

  // 몰입형 라우트에 들어가면 접고, 나가면 편다. 같은 경로 안에서의 수동 토글만 존중한다.
  const [override, setOverride] = useState<{ path: string; collapsed: boolean } | null>(null)
  const collapsed = override?.path === pathname ? override.collapsed : immersive
  const setCollapsed = (next: boolean) => setOverride({ path: pathname, collapsed: next })

  // 설정 모달은 홈 page.tsx가 소유한다. 홈에 있으면 커스텀 이벤트로 바로 열고,
  // 다른 라우트면 홈으로 이동해 마운트 시 딥링크 이펙트가 열게 한다.
  const openSettings = (setting: 'api' | 'billing') => {
    if (pathname === '/') window.dispatchEvent(new CustomEvent('aide:open-settings', { detail: setting }))
    else router.push(`/?settings=${setting}`)
  }

  return (
    <div
      className="aide-workspace-shell"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--aui-page)',
        colorScheme: 'light',
        boxSizing: 'border-box',
      }}
    >
      <TopNav
        label="전역 메뉴"
        heading={
          // marginLeft nudges the hamburger so its glyph lines up with the LNB
          // icon column below (shell gutter + SideNav inset ≈ 12px).
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '12px' }}>
            <IconButton
              label={collapsed ? '메뉴 열기' : '메뉴 닫기'}
              tooltip="메뉴"
              variant="ghost"
              icon={<Menu size={preset.gnbIconSize} aria-hidden />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <TopNavHeading
              headingHref="/"
              logo={<img src="/logo_aide.png" alt="Aide" width={37} height={28} style={{ height: 'calc(var(--aui-density-logo-size) * 1.134)', width: 'auto' }} />}
            />
          </div>
        }
        endContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aui-space-3)', paddingInlineEnd: 'var(--aui-space-2)' }}>
            <IconButton
              label="화면 밀도"
              tooltip="화면 밀도"
              variant="ghost"
              icon={<SlidersHorizontal size={preset.gnbIconSize} aria-hidden />}
              onClick={openDensityPicker}
            />
            <IconButton
              label="API 설정"
              tooltip="API 설정"
              variant="ghost"
              icon={<KeyRound size={preset.gnbIconSize} aria-hidden />}
              onClick={() => openSettings('api')}
            />
            <IconButton
              label="과금"
              tooltip="과금"
              variant="ghost"
              icon={<Coins size={preset.gnbIconSize} aria-hidden />}
              onClick={() => openSettings('billing')}
            />
            <Avatar alt="프로필" size={preset.gnbAvatarSize as AvatarSize} tooltip="프로필" />
          </div>
        }
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          gap: 'var(--aui-space-3)',
          padding: '0 var(--aui-space-3) var(--aui-space-3)',
          boxSizing: 'border-box',
        }}
      >
        <SideNav
          collapsible={{ isCollapsed: collapsed, onCollapsedChange: setCollapsed, hasButton: false }}
          aria-label="워크스페이스 메뉴"
          style={{
            ...(collapsed ? {} : { width: 'var(--aui-density-lnb-width)' }),
            flexShrink: 0,
            height: '100%',
            borderRadius: '20px',
            overflow: 'hidden',
          }}
        >
          {NAV_GROUPS.map((group, groupIndex) => (
            <SideNavSection key={group.title} title={group.title} isHeaderHidden>
              {groupIndex > 0 && <div aria-hidden style={{ height: 'var(--aui-space-4)' }} />}
              {group.items.map(({ href, label, Icon }) => (
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
          ))}
        </SideNav>
        <main
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            borderRadius: '20px',
            overflow: 'auto',
            background: 'var(--aui-canvas)',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
