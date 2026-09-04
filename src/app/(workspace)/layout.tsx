'use client'

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

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { density, openDensityPicker } = useAideDensity()
  const preset = AIDE_DENSITY_PRESETS[density]

  return (
    <div style={{ minHeight: '100vh', colorScheme: 'light', display: 'flex' }}>
      <SideNav
        header={<SideNavHeading heading="Aide" headingHref="/" icon={<img src="/logo_aide.png" alt="" style={{ height: 'var(--aui-density-logo-size)', width: 'auto' }} />} />}
        footer={
          <SideNavSection title="설정" isHeaderHidden>
            <SideNavItem label="화면 밀도" icon={<SlidersHorizontal size={preset.navIconSize} aria-hidden />} onClick={openDensityPicker} size={preset.navItemSize} />
            <SideNavItem label="API 설정" icon={<KeyRound size={preset.navIconSize} aria-hidden />} href="/?settings=api" size={preset.navItemSize} />
            <SideNavItem label="과금" icon={<Coins size={preset.navIconSize} aria-hidden />} href="/?settings=billing" size={preset.navItemSize} />
          </SideNavSection>
        }
        aria-label="워크스페이스 메뉴"
        style={{ width: 'var(--aui-density-lnb-width)', flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh' }}
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
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}
