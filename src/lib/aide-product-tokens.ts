import { parse as parseYaml } from 'yaml'
import md from './design-systems/aide-product-ui.md'

/**
 * aide-product-ui.md is the source of truth for Aide product chrome tokens.
 * This module parses its machine-readable contract into `--aui-*` custom properties
 * that `layout.tsx` injects at :root, so editing the md restyles the product.
 *
 * Generated artifacts and user DESIGN.md are out of scope — see the md's
 * `excluded_consumers`.
 */

type TokenLeaf = { $value?: unknown; $description?: string }
type TokenGroup = Record<string, TokenLeaf | unknown>

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
  if (!fenced) throw new Error('aide-product-ui.md: machine-readable yaml block not found')
  const parsed = parseYaml(fenced[1]) as { contract?: { tokens?: Record<string, TokenGroup> } }
  const tokens = parsed?.contract?.tokens
  if (!tokens) throw new Error('aide-product-ui.md: contract.tokens missing')
  return tokens
}

function isLeaf(node: unknown): node is TokenLeaf {
  return typeof node === 'object' && node !== null && '$value' in node
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

export const AUI_TOKEN_ENTRIES: TokenEntry[] = buildEntries(extractContract(md))

/** Contract groups kept for the /aide-ui showcase, so it never re-lists tokens by hand. */
export const AUI_TOKEN_GROUPS: Record<string, TokenEntry[]> = AUI_TOKEN_ENTRIES.reduce(
  (acc, entry) => {
    const group = entry.cssVar.startsWith('--aui-type-')
      ? 'typography'
      : entry.cssVar.startsWith('--aui-radius-')
        ? 'radius'
        : entry.cssVar.startsWith('--aui-shadow-')
          ? 'shadow'
          : entry.cssVar.startsWith('--aui-motion-')
            ? 'motion'
            : entry.cssVar.startsWith('--aui-space-')
              ? 'space'
              : 'color'
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
