#!/usr/bin/env node
/**
 * Vendors the ready @astryxdesign/core page templates into
 * src/lib/design-systems/generated/astryx-templates/ so the Playground template
 * picker + the JSX→CanvasItem compiler have a committed, offline source.
 *
 * Runs in `prebuild`. Do not edit the generated files by hand.
 *
 * For each ready page template it writes <id>.tsx (the template's page.tsx,
 * verbatim) plus one astryx-templates.manifest.json describing the set.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(root, 'src/lib/design-systems/generated/astryx-templates')
const MANIFEST = join(OUT_DIR, 'astryx-templates.manifest.json')
const TMP = resolve(root, '.astryx-templates-tmp') // relative path required by the CLI

const rel = (p) => p.replace(root + '/', '')

function astryx(args) {
  return execFileSync('npx', ['astryx', ...args], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

console.log('astryx-templates: querying @astryxdesign/cli …')
let listRaw
try {
  listRaw = astryx(['template', '--list', '--json', '--type', 'page'])
} catch (err) {
  if (existsSync(MANIFEST)) {
    console.warn(`astryx-templates: CLI unavailable (${err.message.split('\n')[0]}); keeping committed ${rel(OUT_DIR)}`)
    process.exit(0)
  }
  throw err
}

const pages = JSON.parse(listRaw).data.filter((t) => t.isReady)
console.log(`astryx-templates: ${pages.length} ready page templates`)

rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })
// Clear only the generated template files. Leaving astryx-templates.index.ts and
// the manifest in place (compile-astryx-templates.mjs overwrites them a moment
// later) avoids a window where `next dev`'s file watcher reads a just-deleted
// index and spams "No such file or directory" into the console.
mkdirSync(OUT_DIR, { recursive: true })
for (const f of readdirSync(OUT_DIR)) {
  if (f.endsWith('.tsx') || f.endsWith('.skeleton.txt')) rmSync(join(OUT_DIR, f))
}

const EXTERNAL_DEP = /from '(@heroicons\/react[^']*|recharts|lucide-react)'/g

// A handful of page templates call stylex.create() in userland. StyleX needs its
// build-time babel plugin to turn those calls into static classes; Aide runs SWC
// and does not compile StyleX (it only consumes @astryxdesign/core's *precompiled*
// CSS). Such templates throw "Unexpected 'stylex.create' call at runtime" on mount
// and would only ever show the dashed placeholder, so drop them from the set
// rather than ship a picker tile that opens to nothing. Revisit if the StyleX
// compiler is ever added to the build.
const NEEDS_STYLEX_COMPILER = /from ['"]@stylexjs\/stylex['"]/

const manifest = []
for (const page of pages) {
  const { id, name, description, category } = page
  try {
    astryx(['template', id, `.astryx-templates-tmp/${id}`, '-f'])
  } catch (err) {
    console.warn(`astryx-templates: skip ${id} — ${err.message.split('\n')[0]}`)
    continue
  }
  const srcFile = join(TMP, id, 'page.tsx')
  if (!existsSync(srcFile)) {
    console.warn(`astryx-templates: skip ${id} — no page.tsx emitted`)
    continue
  }
  const source = readFileSync(srcFile, 'utf8')
  if (NEEDS_STYLEX_COMPILER.test(source)) {
    console.warn(`astryx-templates: skip ${id} — userland stylex.create needs the StyleX babel plugin`)
    continue
  }
  cpSync(srcFile, join(OUT_DIR, `${id}.tsx`))

  const deps = [...new Set([...source.matchAll(EXTERNAL_DEP)].map((m) => m[1].replace(/\/.*/, '')))]
  manifest.push({
    id,
    name,
    description: (description || '').split(/(?<=[.。])\s/)[0].slice(0, 160),
    category: page.category || 'page',
    lines: source.split('\n').length,
    deps,
    file: `${id}.tsx`,
  })
}

rmSync(TMP, { recursive: true, force: true })

manifest.sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.tsx')).length
console.log(`astryx-templates: wrote ${files} templates + manifest → ${rel(OUT_DIR)}`)
