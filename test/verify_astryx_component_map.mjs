#!/usr/bin/env node
/**
 * The Aide → Astryx component map must stay complete and truthful.
 *
 * `scripts/astryx-component-map.mjs` is what a later cycle uses to decide whether
 * `/aide-ui` can render Astryx instead of `src/components/ui/*`. A map that silently
 * drifts out of date would make that decision on stale facts, so this asserts both
 * ends against their real sources:
 *
 *   - every `aide.md` `component_registry` id is classified exactly once
 *   - every Astryx name referenced actually exists in the installed catalog
 *
 * It reads the CLI's JSON catalog rather than a copied list, so bumping
 * `@astryxdesign/*` and losing a component fails here instead of during migration.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { MAPPED, NO_COUNTERPART } from '../scripts/astryx-component-map.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Registry ids, read from the contract itself so a contract edit is caught here. */
function readRegistryIds() {
  const lines = readFileSync(path.join(root, 'src/lib/design-systems/aide.md'), 'utf8').split('\n')
  const start = lines.indexOf('  component_registry:')
  assert.notEqual(start, -1, 'aide.md has no component_registry section')

  const ids = []
  let inCategories = false
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (/^ {2}[a-z_]+:/.test(line)) break // next top-level contract section
    if (/^ {4}categories:/.test(line)) { inCategories = true; continue }
    if (inCategories && /^ {4}[a-z_]+:/.test(line)) break // sibling of `categories`
    if (!inCategories) continue
    const item = /^\s+- ([a-z0-9-]+)\s*$/.exec(line)
    if (item) ids.push(item[1])
  }
  return ids
}

/** Component names from the installed Astryx CLI — the authoritative catalog. */
function readAstryxNames() {
  const bin = path.join(root, 'node_modules/@astryxdesign/cli/clients/cli/bin/astryx.mjs')
  const out = execSync(`node ${bin} component --list --json`, { cwd: root, maxBuffer: 1 << 24 }).toString()
  const parsed = JSON.parse(out.slice(out.indexOf('{')))
  const groups = parsed?.data?.components
  assert.ok(groups && typeof groups === 'object', 'astryx CLI returned no component catalog')
  return new Set(Object.values(groups).flat().map((c) => c.name))
}

const registryIds = readRegistryIds()
assert.ok(registryIds.length > 0, 'read no ids from component_registry.categories')

const mappedIds = Object.keys(MAPPED)
const unmappedIds = Object.keys(NO_COUNTERPART)

const overlap = mappedIds.filter((id) => id in NO_COUNTERPART)
assert.deepEqual(overlap, [], `ids classified both ways: ${overlap.join(', ')}`)

const classified = new Set([...mappedIds, ...unmappedIds])
const unclassified = registryIds.filter((id) => !classified.has(id))
assert.deepEqual(
  unclassified,
  [],
  `component_registry ids missing from the map: ${unclassified.join(', ')}. ` +
    `Add each to MAPPED or NO_COUNTERPART in scripts/astryx-component-map.mjs.`,
)

const registrySet = new Set(registryIds)
const stale = [...classified].filter((id) => !registrySet.has(id))
assert.deepEqual(
  stale,
  [],
  `map entries that are no longer in component_registry: ${stale.join(', ')}`,
)

const astryxNames = readAstryxNames()
const bad = []
for (const [id, targets] of Object.entries(MAPPED)) {
  assert.ok(Array.isArray(targets) && targets.length > 0, `${id} maps to nothing`)
  for (const name of targets) if (!astryxNames.has(name)) bad.push(`${id} → ${name}`)
}
assert.deepEqual(
  bad,
  [],
  `mapped to Astryx components that do not exist in the installed catalog: ${bad.join(', ')}`,
)

const covered = ((mappedIds.length / registryIds.length) * 100).toFixed(0)
console.log(
  `✓ astryx component map: ${registryIds.length} registry ids — ` +
    `${mappedIds.length} mapped (${covered}%), ${unmappedIds.length} with no Astryx counterpart ` +
    `(${astryxNames.size} Astryx components available)`,
)
