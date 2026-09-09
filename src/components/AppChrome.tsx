'use client'

import Link from 'next/link'
import { Theme } from '@astryxdesign/core/theme'
import { LinkProvider } from '@astryxdesign/core/Link'
import { aideTheme } from '@/theme/generated/aide.js'
import { AideDensityProvider } from '@/components/AideDensityProvider'

/**
 * App-wide Astryx chrome context. Lives at the root layout so every route — not
 * just the `(workspace)` group — gets the Aide theme (`data-astryx-theme="aide"`),
 * light `color-scheme`, and the density scale. `<Theme>` renders a
 * `display: contents` wrapper, so it adds no box to the layout.
 *
 * `LinkProvider` routes every Astryx `href` (SideNav, etc.) through `next/link`
 * so tab switches are client-side navigations, not full document reloads.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={aideTheme} mode="light">
      <LinkProvider component={Link}>
        <AideDensityProvider>{children}</AideDensityProvider>
      </LinkProvider>
    </Theme>
  )
}
