import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

// ── Generated catalog shape ──────────────────────────────────────────────────
const catalog = JSON.parse(read('src/lib/design-systems/generated/astryx-catalog.json'))
assert.ok(Array.isArray(catalog) && catalog.length >= 40, 'catalog has the full generated set')

const CATEGORIES = new Set(['action', 'content', 'feedback', 'input', 'layout', 'navigation', 'overlay', 'selection', 'data'])
const ids = new Set()
for (const entry of catalog) {
  const where = `entry ${entry.id}`
  assert.match(entry.id, /^astryx-[a-z0-9-]+$/, `${where}: namespaced kebab id`)
  assert.ok(!ids.has(entry.id), `${where}: id is unique`)
  ids.add(entry.id)
  assert.ok(entry.astryxName && entry.importPath.startsWith('@astryxdesign/core/'), `${where}: resolvable import`)
  assert.ok(CATEGORIES.has(entry.category), `${where}: known category "${entry.category}"`)
  assert.equal(typeof entry.composite, 'boolean', `${where}: composite flag`)
  assert.ok(Array.isArray(entry.propSchema), `${where}: propSchema array`)

  const keys = new Set(entry.propSchema.map((p) => p.key))
  for (const p of entry.propSchema) {
    assert.ok(p.key && p.label && p.type, `${where}: prop "${p.key}" well-formed`)
    if (p.type === 'select') assert.ok(p.options?.length >= 2, `${where}: select "${p.key}" has options`)
  }
  for (const key of Object.keys(entry.defaultProps)) {
    assert.ok(keys.has(key), `${where}: default "${key}" is declared in propSchema`)
  }
}

// ── Renderer covers every catalog id (+ the hand-added Heading) ──────────────
const renderer = read('src/components/aide-docs/AstryxComponentPreview.tsx')
const catalogModule = read('src/lib/astryx-playground-components.ts')
assert.match(catalogModule, /from '\.\/design-systems\/generated\/astryx-catalog\.json'/, 'catalog module consumes the generated JSON')
assert.match(catalogModule, /astryx-heading/, 'Heading is added by hand')

const allIds = [...ids, 'astryx-heading']
for (const id of allIds) {
  const entry = catalog.find((e) => e.id === id)
  const composite = id === 'astryx-heading' ? false : entry.composite
  if (composite) {
    assert.ok(renderer.includes(`case '${id}'`), `renderer has a composite case for ${id}`)
  } else {
    const inMap = new RegExp(`'${id}':\\s*[A-Z]`).test(renderer)
    const special = renderer.includes(`id === '${id}'`)
    assert.ok(inMap || special, `renderer renders ${id} (SIMPLE map or special-case)`)
  }
}

console.log(`ok — ${catalog.length} generated + 1 hand-added Astryx Playground components, renderer covers all`)
