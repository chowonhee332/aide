import { parse as parseYaml } from 'yaml'
import md from './design-systems/wonhee-design.md'

type Dict = Record<string, unknown>

export interface WonheeComponentContract {
  id: string
  values: Dict
}

export interface WonheeCatalogItem {
  id: string
  category: string
  target: string
  status: string
  reason?: string
}

function contract(): Dict {
  const fenced = md.match(/```yaml\n([\s\S]*?)\n```/)
  if (!fenced) throw new Error('wonhee-design.md: machine-readable contract missing')
  const parsed = parseYaml(fenced[1]) as { contract?: Dict }
  if (!parsed.contract) throw new Error('wonhee-design.md: contract missing')
  return parsed.contract
}

const root = contract()
export const WONHEE_DESIGN_CONTRACT = root
const componentMap = (root.components ?? {}) as Record<string, Dict>
const catalogMap = ((root.reference_catalog as Dict)?.items ?? {}) as Record<string, Dict>
const responsive = (root.responsive ?? {}) as Dict
const accessibility = (root.accessibility ?? {}) as Dict

export const WONHEE_COMPONENTS: WonheeComponentContract[] = Object.entries(componentMap).map(([id, values]) => ({ id, values }))

export const WONHEE_REFERENCE_CATALOG: WonheeCatalogItem[] = Object.entries(catalogMap).map(([id, value]) => ({
  id,
  category: String(value.category ?? 'uncategorized'),
  target: String(value.target ?? id),
  status: String(value.status ?? 'specialized'),
  reason: value.reason ? String(value.reason) : undefined,
}))

export const WONHEE_RESPONSIVE_MODES = Object.entries((responsive.modes ?? {}) as Record<string, Dict>).map(([id, values]) => ({ id, values }))
export const WONHEE_RESPONSIVE_RULES = (responsive.rules ?? []) as string[]
export const WONHEE_ACCESSIBILITY_STANDARD = String(accessibility.standard ?? '')
export const WONHEE_ACCESSIBILITY_REQUIREMENTS = (accessibility.requirements ?? []) as string[]
