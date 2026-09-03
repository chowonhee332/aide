export const STUDIO_NEW_HANDOFF_KEY = 'aide_studio_new_handoff'

export interface StudioNewHandoff {
  brief: string
  preset?: string
  platform?: string
}

export function writeStudioNewHandoff(handoff: StudioNewHandoff) {
  sessionStorage.setItem(STUDIO_NEW_HANDOFF_KEY, JSON.stringify(handoff))
}

export function readStudioNewHandoff(): StudioNewHandoff | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(STUDIO_NEW_HANDOFF_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const handoff = value as Partial<StudioNewHandoff>
    return typeof handoff.brief === 'string' && handoff.brief.trim()
      ? { brief: handoff.brief, preset: handoff.preset, platform: handoff.platform }
      : null
  } catch {
    return null
  }
}
