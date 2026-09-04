'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import { SizeProvider } from '@astryxdesign/core/SizeContext'
import {
  AIDE_DENSITIES,
  AIDE_DENSITY_PRESETS,
  AIDE_DENSITY_STORAGE_KEY,
  DEFAULT_AIDE_DENSITY,
  type AideDensity,
} from '@/lib/aide-density'

type AideDensityContextValue = {
  density: AideDensity
  setDensity: (density: AideDensity) => void
}

const AideDensityContext = createContext<AideDensityContextValue | null>(null)

/** In-tab subscribers, so a `setDensity` call re-renders every provider without a storage round-trip. */
const listeners = new Set<() => void>()

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  const onStorage = (event: StorageEvent) => {
    if (event.key === AIDE_DENSITY_STORAGE_KEY) onStoreChange()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onStoreChange)
    window.removeEventListener('storage', onStorage)
  }
}

function getStoredDensity(): AideDensity {
  const saved = window.localStorage.getItem(AIDE_DENSITY_STORAGE_KEY)
  return saved && AIDE_DENSITIES.includes(saved as AideDensity) ? (saved as AideDensity) : DEFAULT_AIDE_DENSITY
}

export function AideDensityProvider({ children }: { children: React.ReactNode }) {
  const density = useSyncExternalStore(subscribe, getStoredDensity, () => DEFAULT_AIDE_DENSITY)

  const setDensity = useCallback((next: AideDensity) => {
    window.localStorage.setItem(AIDE_DENSITY_STORAGE_KEY, next)
    listeners.forEach((notify) => notify())
  }, [])

  const value = useMemo(() => ({ density, setDensity }), [density, setDensity])
  const preset = AIDE_DENSITY_PRESETS[density]

  return (
    <AideDensityContext.Provider value={value}>
      <SizeProvider value={preset.astryxSize}>
        {/* display:contents — density custom properties still inherit, no layout box added */}
        <div data-aide-density={density} style={{ display: 'contents', ...preset.variables }}>{children}</div>
      </SizeProvider>
    </AideDensityContext.Provider>
  )
}

export function useAideDensity() {
  const context = useContext(AideDensityContext)
  if (!context) throw new Error('useAideDensity must be used inside AideDensityProvider')
  return context
}
