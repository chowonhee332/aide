'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SizeProvider } from '@astryxdesign/core/SizeContext'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'
import { Button } from '@astryxdesign/core/Button'
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
  openDensityPicker: () => void
}

const AideDensityContext = createContext<AideDensityContextValue | null>(null)

function readStoredDensity(): AideDensity {
  if (typeof window === 'undefined') return DEFAULT_AIDE_DENSITY
  try {
    const saved = window.localStorage.getItem(AIDE_DENSITY_STORAGE_KEY)
    if (saved && AIDE_DENSITIES.includes(saved as AideDensity)) return saved as AideDensity
  } catch {
    /* private mode / storage disabled */
  }
  return DEFAULT_AIDE_DENSITY
}

export function AideDensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<AideDensity>(readStoredDensity)
  const [pickerOpen, setPickerOpen] = useState(false)
  const preset = AIDE_DENSITY_PRESETS[density]

  const setDensity = useCallback((next: AideDensity) => {
    setDensityState(next)
    try {
      window.localStorage.setItem(AIDE_DENSITY_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])
  const openDensityPicker = useCallback(() => setPickerOpen(true), [])

  // Write the density scale straight onto <html> — reaches every element including
  // portalled overlays, and does not depend on `display:contents` custom-property
  // inheritance.
  useEffect(() => {
    const root = document.documentElement
    const entries = Object.entries(preset.variables)
    root.setAttribute('data-aide-density', density)
    for (const [key, value] of entries) root.style.setProperty(key, String(value))
    return () => {
      root.removeAttribute('data-aide-density')
      for (const [key] of entries) root.style.removeProperty(key)
    }
  }, [density, preset])

  // Follow the choice made in another tab.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === AIDE_DENSITY_STORAGE_KEY) setDensityState(readStoredDensity())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(
    () => ({ density, setDensity, openDensityPicker }),
    [density, setDensity, openDensityPicker],
  )

  return (
    <AideDensityContext.Provider value={value}>
      <SizeProvider value={preset.astryxSize}>{children}</SizeProvider>
      <DensityPicker
        isOpen={pickerOpen}
        density={density}
        onPick={setDensity}
        onClose={() => setPickerOpen(false)}
      />
    </AideDensityContext.Provider>
  )
}

function DensityPicker({
  isOpen,
  density,
  onPick,
  onClose,
}: {
  isOpen: boolean
  density: AideDensity
  onPick: (d: AideDensity) => void
  onClose: () => void
}) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose() }} purpose="info" width={480}>
      <DialogHeader
        title="화면 밀도"
        subtitle="메뉴·컴포넌트·여백 크기를 한 번에 조절합니다. 브라우저 localStorage에만 저장됩니다."
        onOpenChange={(open) => { if (!open) onClose() }}
      />
      <div style={{ padding: 'var(--aui-space-5)' }}>
        <RadioList
          label="화면 밀도"
          isLabelHidden
          value={density}
          onChange={(value) => onPick(value as AideDensity)}
        >
          {AIDE_DENSITIES.map((id) => (
            <RadioListItem
              key={id}
              value={id}
              label={AIDE_DENSITY_PRESETS[id].label}
              description={AIDE_DENSITY_PRESETS[id].description}
            />
          ))}
        </RadioList>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 'var(--aui-space-3) var(--aui-space-5) var(--aui-space-5)' }}>
        <Button variant="primary" label="완료" onClick={onClose} />
      </div>
    </Dialog>
  )
}

export function useAideDensity() {
  const context = useContext(AideDensityContext)
  if (!context) throw new Error('useAideDensity must be used inside AideDensityProvider')
  return context
}
