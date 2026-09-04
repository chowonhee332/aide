'use client'

import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { AideDensityProvider } from '@/components/AideDensityProvider'

/**
 * App-wide Astryx chrome context. Lives at the root layout so every route — not
 * just the `(workspace)` group — gets the neutral theme (`data-astryx-theme`),
 * light `color-scheme`, and the density scale. `<Theme>` renders a
 * `display: contents` wrapper, so it adds no box to the layout.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={neutralTheme} mode="light">
      <AideDensityProvider>{children}</AideDensityProvider>
    </Theme>
  )
}
