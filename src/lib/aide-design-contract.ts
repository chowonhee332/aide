import { parse as parseYaml } from 'yaml'
import md from './design-systems/aide.md'

type Dict = Record<string, unknown>

export interface AideComponentContract {
  id: string
  values: Dict
}

export interface AideCatalogItem {
  id: string
  category: string
  target: string
  status: string
  reason?: string
}

function contract(): Dict {
  const fenced = md.match(/```yaml\n([\s\S]*?)\n```/)
  if (!fenced) throw new Error('aide.md: machine-readable contract missing')
  const parsed = parseYaml(fenced[1]) as { contract?: Dict }
  if (!parsed.contract) throw new Error('aide.md: contract missing')
  return parsed.contract
}

export const AIDE_DESIGN_CONTRACT = contract()
const componentMap = (AIDE_DESIGN_CONTRACT.components ?? {}) as Record<string, Dict>
const catalogMap = ((AIDE_DESIGN_CONTRACT.reference_catalog as Dict)?.items ?? {}) as Record<string, Dict>
const responsive = (AIDE_DESIGN_CONTRACT.responsive ?? {}) as Dict
const accessibility = (AIDE_DESIGN_CONTRACT.accessibility ?? {}) as Dict

export const AIDE_COMPONENTS: AideComponentContract[] = Object.entries(componentMap).map(([id, values]) => ({ id, values }))
export const AIDE_REFERENCE_CATALOG: AideCatalogItem[] = Object.entries(catalogMap).map(([id, value]) => ({
  id,
  category: String(value.category ?? 'uncategorized'),
  target: String(value.target ?? id),
  status: String(value.status ?? 'specialized'),
  reason: value.reason ? String(value.reason) : undefined,
}))
export const AIDE_RESPONSIVE_MODES = Object.entries((responsive.modes ?? {}) as Record<string, Dict>).map(([id, values]) => ({ id, values }))
export const AIDE_RESPONSIVE_RULES = (responsive.rules ?? []) as string[]
export const AIDE_ACCESSIBILITY_STANDARD = String(accessibility.standard ?? '')
export const AIDE_ACCESSIBILITY_REQUIREMENTS = (accessibility.requirements ?? []) as string[]
