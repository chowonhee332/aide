'use client'

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react'
import { SizeProvider } from '@astryxdesign/core/SizeContext'
import { Check, Palette } from '@/components/ui/material-icon'
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
  const [pickerOpen, setPickerOpen] = useState(false)

  const setDensity = useCallback((next: AideDensity) => {
    window.localStorage.setItem(AIDE_DENSITY_STORAGE_KEY, next)
    listeners.forEach((notify) => notify())
  }, [])
  const openDensityPicker = useCallback(() => setPickerOpen(true), [])

  const value = useMemo(
    () => ({ density, setDensity, openDensityPicker }),
    [density, setDensity, openDensityPicker],
  )
  const preset = AIDE_DENSITY_PRESETS[density]

  return (
    <AideDensityContext.Provider value={value}>
      <SizeProvider value={preset.astryxSize}>
        {/* display:contents — density custom properties still inherit, no layout box added */}
        <div data-aide-density={density} style={{ display: 'contents', ...preset.variables }}>{children}</div>
      </SizeProvider>
      {pickerOpen && <DensityPicker density={density} onPick={setDensity} onClose={() => setPickerOpen(false)} />}
    </AideDensityContext.Provider>
  )
}

function DensityPicker({
  density,
  onPick,
  onClose,
}: {
  density: AideDensity
  onPick: (d: AideDensity) => void
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'var(--aui-scrim)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--aui-canvas)', borderRadius: 'var(--aui-radius-overlay)', padding: 'var(--aui-space-8)', width: '480px', maxWidth: 'calc(100vw - 32px)', boxShadow: 'var(--aui-shadow-modal)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aui-space-3)', marginBottom: '8px' }}>
          <Palette size={20} color="var(--aui-primary)" />
          <h2 style={{ fontSize: 'var(--aui-type-section-title-size)', fontWeight: 'var(--aui-weight-bold)', color: 'var(--aui-text)', margin: 0 }}>화면 밀도</h2>
        </div>
        <p style={{ fontSize: 'var(--aui-type-compact-size)', color: 'var(--aui-text-muted)', marginBottom: '20px', lineHeight: 'var(--aui-leading-relaxed)' }}>
          메뉴·컴포넌트·여백 크기를 한 번에 조절합니다. 브라우저 localStorage에만 저장됩니다.
        </p>
        <div role="radiogroup" aria-label="화면 밀도" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aui-space-2)', marginBottom: '20px' }}>
          {(AIDE_DENSITIES).map((id) => {
            const preset = AIDE_DENSITY_PRESETS[id]
            const active = density === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPick(id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--aui-space-3)',
                  padding: 'var(--aui-space-3) var(--aui-space-4)', borderRadius: 'var(--aui-radius-control)',
                  border: `1.5px solid ${active ? 'var(--aui-primary)' : 'var(--aui-border)'}`,
                  background: active ? 'var(--aui-primary-soft)' : 'var(--aui-canvas)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: 'var(--aui-type-label-size)', fontWeight: 'var(--aui-weight-semibold)', color: 'var(--aui-text)' }}>{preset.label}</span>
                  <span style={{ fontSize: 'var(--aui-type-caption-size)', color: 'var(--aui-text-muted)' }}>{preset.description}</span>
                </span>
                {active && <Check size={16} color="var(--aui-primary)" />}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: 'var(--aui-space-2) var(--aui-space-5)', borderRadius: 'var(--aui-radius-control)', border: 'none', background: 'var(--aui-primary)', color: 'var(--aui-on-primary)', fontSize: 'var(--aui-type-label-size)', fontWeight: 'var(--aui-weight-semibold)', cursor: 'pointer' }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}

export function useAideDensity() {
  const context = useContext(AideDensityContext)
  if (!context) throw new Error('useAideDensity must be used inside AideDensityProvider')
  return context
}
