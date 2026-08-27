import { parse as parseYaml } from 'yaml'
import md from './design-systems/aide.md'
import { isLeaf, resolveAliases, type TokenLeaf } from './design-token-alias.mjs'

/**
 * aide.md is the source of truth for Aide product chrome, /aide-ui, and the
 * default generated customer UI.
 * This module parses its machine-readable contract into `--aui-*` custom properties
 * that `layout.tsx` injects at :root, so editing the md restyles the product.
 *
 * An uploaded DESIGN.md overrides generated customer screens only.
 */

type TokenGroup = Record<string, TokenLeaf | unknown>

export interface AuiShowcaseSection {
  id: string
  navigation: string
  eyebrow: string
  title: string
  description: string
}

export interface AuiDocumentationPage {
  title: string
  items?: string[]
  categories?: string[]
  page_template?: string[]
}

export interface AuiDocumentation {
  route: string
  title: string
  description: string
  navigation: string[]
  pages: Record<string, AuiDocumentationPage>
  layout?: {
    wide?: Record<string, unknown>
    medium?: Record<string, unknown>
    compact?: Record<string, unknown>
    'left-navigation'?: Record<string, unknown>
    'on-this-page'?: Record<string, unknown>
  }
}

export interface TokenEntry {
  /** Contract key, e.g. `primary-strong` */
  key: string
  /** CSS custom property name, e.g. `--aui-primary-strong` */
  cssVar: string
  value: string
  description?: string
}

/** md group name → `--aui-` prefix. Groups absent here are not emitted. */
const GROUP_PREFIX: Record<string, string> = {
  color: '',
  dimension: '',
  radius: 'radius-',
  shadow: 'shadow-',
  duration: 'motion-',
  weight: 'weight-',
  leading: 'leading-',
  tracking: 'tracking-',
  gradient: 'gradient-',
  blur: 'blur-',
}

/** typography sub-key → CSS suffix. */
const TYPE_SUFFIX: Record<string, string> = {
  fontSize: 'size',
  lineHeight: 'leading',
  fontWeight: 'weight',
  letterSpacing: 'tracking',
  fontFamily: 'family',
}

function extractContract(source: string): Record<string, unknown> {
  const fenced = source.match(/```yaml\n([\s\S]*?)\n```/)
  if (!fenced) throw new Error('aide.md: machine-readable yaml block not found')
  const parsed = parseYaml(fenced[1]) as { contract?: Record<string, unknown> }
  if (!parsed?.contract) throw new Error('aide.md: contract missing')
  return parsed.contract
}

function buildEntries(tokens: Record<string, unknown>): TokenEntry[] {
  const entries: TokenEntry[] = []

  for (const [group, members] of Object.entries(tokens)) {
    if (typeof members !== 'object' || members === null) continue

    if (group === 'typography') {
      for (const [scale, leaf] of Object.entries(members as TokenGroup)) {
        if (scale.startsWith('$') || !isLeaf(leaf)) continue
        const face = leaf.$value as Record<string, unknown>
        if (typeof face !== 'object' || face === null) continue
        for (const [prop, suffix] of Object.entries(TYPE_SUFFIX)) {
          if (face[prop] === undefined) continue
          entries.push({
            key: `${scale}.${prop}`,
            cssVar: `--aui-type-${scale}-${suffix}`,
            value: String(face[prop]),
            description: leaf.$description,
          })
        }
      }
      continue
    }

    const prefix = GROUP_PREFIX[group]
    if (prefix === undefined) continue

    for (const [key, leaf] of Object.entries(members as TokenGroup)) {
      if (key.startsWith('$') || !isLeaf(leaf)) continue
      entries.push({
        key,
        cssVar: `--aui-${prefix}${key}`,
        value: String(leaf.$value),
        description: leaf.$description,
      })
    }
  }

  return entries
}

function buildComponentEntries(groups: Record<string, unknown>): TokenEntry[] {
  const entries: TokenEntry[] = []
  for (const [component, members] of Object.entries(groups)) {
    if (typeof members !== 'object' || members === null) continue
    for (const [key, leaf] of Object.entries(members as TokenGroup)) {
      if (!isLeaf(leaf)) throw new Error(`aide.md: component_tokens.${component}.${key} must use $value`)
      entries.push({
        key: `${component}.${key}`,
        cssVar: `--aui-component-${component}-${key}`,
        value: String(leaf.$value),
        description: leaf.$description,
      })
    }
  }
  return entries
}

const productContract = extractContract(md)
export const AUI_PRODUCT_CONTRACT = productContract
const rawProductTokens = productContract.tokens as Record<string, unknown> | undefined
if (!rawProductTokens) throw new Error('aide.md: contract.tokens missing')
const rawComponentTokens = productContract.component_tokens as Record<string, unknown> | undefined
if (!rawComponentTokens) throw new Error('aide.md: contract.component_tokens missing')
const aliasRoots = { ...rawProductTokens, tokens: rawProductTokens, component_tokens: rawComponentTokens }
const aliasOptions = { label: 'aide.md' }
const productTokens = resolveAliases(rawProductTokens, aliasRoots, aliasOptions) as Record<string, unknown>
const componentTokens = resolveAliases(rawComponentTokens, aliasRoots, aliasOptions) as Record<string, unknown>

const supportedTokenGroups = new Set([...Object.keys(GROUP_PREFIX), 'typography'])
const unknownTokenGroups = Object.keys(productTokens).filter((group) => !supportedTokenGroups.has(group))
if (unknownTokenGroups.length) throw new Error(`aide.md: unsupported token groups: ${unknownTokenGroups.join(', ')}`)

export const AUI_TOKEN_ENTRIES: TokenEntry[] = [...buildEntries(productTokens), ...buildComponentEntries(componentTokens)]
/** `contract.component_tokens`의 그룹 이름 — 컴포넌트별 크기 표를 파생할 때 쓴다. */
export const AUI_COMPONENT_TOKEN_GROUPS = new Set(Object.keys(componentTokens))
export const AUI_TOKEN_VALUE = Object.fromEntries(AUI_TOKEN_ENTRIES.map((entry) => [entry.key, entry.value])) as Record<string, string>

const visualization = productContract.visualization as { sections?: AuiShowcaseSection[] } | undefined
if (!visualization?.sections?.length) throw new Error('aide.md: contract.visualization.sections missing')

export const AUI_SHOWCASE_SECTIONS: AuiShowcaseSection[] = visualization.sections.map((section) => ({
  id: String(section.id),
  navigation: String(section.navigation),
  eyebrow: String(section.eyebrow),
  title: String(section.title),
  description: String(section.description),
}))

const documentation = productContract.documentation as AuiDocumentation | undefined
if (!documentation?.navigation?.length || !documentation.pages) throw new Error('aide.md: contract.documentation missing')
for (const id of documentation.navigation) {
  if (!documentation.pages[id]) throw new Error(`aide.md: documentation.navigation references missing page group: ${id}`)
}
export const AUI_DOCUMENTATION: AuiDocumentation = documentation

const develop = productContract.develop as { commands?: Record<string, string | string[]> } | undefined
const ai = productContract.ai as { skill?: { id?: string; purpose?: string; workflow?: string[] }; llms_txt?: { route?: string; contents?: string[] }; future_integrations?: string[] } | undefined
export const AUI_DEVELOP_COMMANDS = develop?.commands ?? {}
export const AUI_AI_GUIDE = {
  skill: ai?.skill ?? {},
  llmsTxt: ai?.llms_txt ?? {},
  futureIntegrations: ai?.future_integrations ?? [],
}
const componentRegistry = productContract.component_registry as { categories?: Record<string, string[]> } | undefined
export const AUI_COMPONENT_CATEGORIES = componentRegistry?.categories ?? {}
const allComponents = (productContract.components ?? {}) as Record<string, Record<string, unknown>>
const registeredComponentIds = new Set(Object.values(AUI_COMPONENT_CATEGORIES).flat())
// The unified contract also contains portable abstract families. Product docs,
// previews, and Playground expose only concrete registry members.
export const AUI_COMPONENTS = Object.fromEntries(
  Object.entries(allComponents).filter(([id]) => registeredComponentIds.has(id)),
) as Record<string, Record<string, unknown>>
const componentRecipes = (productContract.component_recipes ?? {}) as Record<string, unknown>
export const AUI_COMPONENT_RECIPE_MODES = (componentRecipes.viewport_modes ?? {}) as Record<string, Record<string, unknown>>
export const AUI_COMPONENT_RECIPE_FAMILIES = (componentRecipes.families ?? {}) as Record<string, Record<string, unknown>>
export const AUI_COMPONENT_RECIPES = (componentRecipes.items ?? {}) as Record<string, Record<string, unknown>>

const duplicateShowcaseIds = AUI_SHOWCASE_SECTIONS.filter((section, index, all) => all.findIndex((candidate) => candidate.id === section.id) !== index)
if (duplicateShowcaseIds.length) throw new Error(`aide.md: duplicate visualization section ids: ${duplicateShowcaseIds.map((section) => section.id).join(', ')}`)

/** cssVar prefix → showcase group. First match wins; anything else is a colour. */
const GROUP_OF: Array<[string, string]> = [
  ['--aui-component-', 'component'],
  ['--aui-type-', 'typography'],
  ['--aui-radius-', 'radius'],
  ['--aui-shadow-', 'shadow'],
  ['--aui-motion-', 'motion'],
  ['--aui-space-', 'space'],
  ['--aui-weight-', 'weight'],
  ['--aui-leading-', 'leading'],
  ['--aui-tracking-', 'tracking'],
  ['--aui-gradient-', 'gradient'],
  ['--aui-blur-', 'blur'],
]

/** Dimension keys that are layout measures rather than colours. */
const MEASURE_KEYS = /^(icon|control|target|toolbar|panel|content|hero|header)-/

/** Contract groups kept for the /aide-ui showcase, so it never re-lists tokens by hand. */
export const AUI_TOKEN_GROUPS: Record<string, TokenEntry[]> = AUI_TOKEN_ENTRIES.reduce(
  (acc, entry) => {
    const matched = GROUP_OF.find(([prefix]) => entry.cssVar.startsWith(prefix))
    const group = matched ? matched[1] : MEASURE_KEYS.test(entry.key) ? 'dimension' : 'color'
    ;(acc[group] ??= []).push(entry)
    return acc
  },
  {} as Record<string, TokenEntry[]>,
)

/**
 * `:root` declarations for every contract token. Injected after globals.css so the
 * md wins; tokens the md does not define keep their globals.css fallback value.
 */
export const AUI_ROOT_CSS = `:root{${AUI_TOKEN_ENTRIES.map((e) => `${e.cssVar}:${e.value};`).join('')}}`

/** `schema_version` from the md frontmatter, so the showcase never hardcodes a version. */
export const AUI_SCHEMA_VERSION: string =
  md.match(/^---\n[\s\S]*?^schema_version:\s*"?([^"\n]+)"?\s*$/m)?.[1]?.trim() ?? 'unknown'
