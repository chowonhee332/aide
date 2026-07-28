import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parse as parseYaml } from 'yaml'
import { isLeaf, resolveAliases } from '../src/lib/design-token-alias.mjs'

/** The contracts document their own alias syntax; that literal is prose, not a reference. */
const ALIAS_OPTIONS = { skipAliases: ["group.token"], label: "design contract" }

const ROOT = process.cwd()
const CORE = path.join(ROOT, 'src/lib/design-systems/wonhee-design.md')
const PRODUCT = path.join(ROOT, 'src/lib/design-systems/wonhee-product-ui.md')

function readContract(file) {
  const source = fs.readFileSync(file, 'utf8')
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)
  const fenced = source.match(/```yaml\n([\s\S]*?)\n```/)
  if (!frontmatter) throw new Error(`${file}: front matter missing`)
  if (!fenced) throw new Error(`${file}: first fenced yaml contract missing`)
  const metadata = parseYaml(frontmatter[1])
  const parsed = parseYaml(fenced[1])
  if (!parsed?.contract) throw new Error(`${file}: contract root missing`)
  return { file, metadata, contract: parsed.contract }
}

function tokenLeaves(groups, prefix = []) {
  const result = []
  for (const [key, value] of Object.entries(groups ?? {})) {
    if (key.startsWith('$')) continue
    const next = [...prefix, key]
    if (isLeaf(value)) result.push({ path: next.join('.'), leaf: value })
    else if (value !== null && typeof value === 'object') result.push(...tokenLeaves(value, next))
    else result.push({ path: next.join('.'), leaf: null })
  }
  return result
}

function luminance(hex) {
  const rgb = hex.slice(1).match(/.{2}/g)?.map((part) => Number.parseInt(part, 16) / 255)
  if (!rgb || rgb.length !== 3) return null
  const linear = rgb.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  if (la === null || lb === null) return null
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Enforce `contract.component_schema` against `contract.components`, so the
 * declared entry shape and the real entries cannot drift apart.
 * A product entry may inherit `purpose` from the base document.
 */
function lintComponents(document, base, errors, warnings) {
  const schema = document.contract.component_schema ?? base?.contract.component_schema
  const components = document.contract.components
  if (!schema || !components) return

  const baseComponents = base?.contract.components ?? {}
  const keywords = schema.normative_keywords ?? []
  const keywordPattern = keywords.length
    ? new RegExp(`\\b(${keywords.map((word) => word.replace(/ /g, '\\s+')).join('|')})\\b`)
    : null

  for (const [id, entry] of Object.entries(components)) {
    if (!/^[a-z][a-z0-9-]*$/.test(id)) errors.push(`components.${id}: id must be kebab-case`)
    if (!entry || typeof entry !== 'object') {
      errors.push(`components.${id}: entry must be a mapping`)
      continue
    }

    // A family entry groups other components instead of describing one.
    if (entry.members) {
      if (!Array.isArray(entry.members) || !entry.members.length) {
        errors.push(`components.${id}: family entry needs a non-empty members list`)
      }
      continue
    }

    const purpose = entry.purpose ?? baseComponents[id]?.purpose
    if (!purpose) {
      errors.push(`components.${id}: purpose is required`)
    } else if (typeof purpose !== 'string' || /^[A-Z]/.test(purpose) || /[.]$/.test(purpose)) {
      errors.push(`components.${id}: purpose must be a lowercase phrase with no trailing period`)
    }

    // `anatomy` and `slots` both describe structure; either satisfies the schema.
    const described = entry.anatomy ?? entry.slots ?? baseComponents[id]?.anatomy ?? baseComponents[id]?.slots
    if (!described && !entry.inherits) {
      warnings.push(`components.${id}: no anatomy or slots`)
    }

    if (keywordPattern) {
      for (const rule of entry.rules ?? []) {
        if (!keywordPattern.test(String(rule))) {
          warnings.push(`components.${id}: rule without a normative keyword — "${String(rule).slice(0, 48)}"`)
        }
      }
    }
  }
}

function lintDocument(document, base) {
  const errors = []
  const warnings = []
  const required = document.contract.schema?.required_sections ?? []
  for (const section of required) if (!(section in document.contract)) errors.push(`missing contract.${section}`)
  if (String(document.metadata.schema_version) !== String(document.contract.schema?.version)) {
    errors.push(`front matter schema_version and contract.schema.version differ`)
  }

  const groups = document.contract.tokens ?? {}
  for (const token of tokenLeaves(groups)) if (!token.leaf) errors.push(`token ${token.path} must be a {$value} leaf`)
  for (const token of tokenLeaves(document.contract.component_tokens ?? {})) if (!token.leaf) errors.push(`component token ${token.path} must be a {$value} leaf`)

  const roots = { ...(base?.contract ?? {}), ...document.contract, ...(base?.contract.tokens ?? {}), ...groups, tokens: groups, component_tokens: document.contract.component_tokens ?? {} }
  for (const token of [...tokenLeaves(groups), ...tokenLeaves(document.contract.component_tokens ?? {})]) {
    if (!token.leaf) continue
    try { resolveAliases(token.leaf.$value, roots, ALIAS_OPTIONS, [token.path]) } catch (error) { errors.push(`${token.path}: ${error.message}`) }
    if (!token.leaf.$description) warnings.push(`${token.path}: $description missing`)
  }

  const ids = (document.contract.visualization?.sections ?? []).map((section) => section.id)
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicateIds.length) errors.push(`duplicate visualization ids: ${[...new Set(duplicateIds)].join(', ')}`)

  try { resolveAliases(document.contract, roots, ALIAS_OPTIONS) } catch (error) { errors.push(error.message) }

  const documentation = document.contract.documentation
  if (documentation) {
    const pages = documentation.pages ?? {}
    for (const id of documentation.navigation ?? []) if (!(id in pages)) errors.push(`documentation.navigation references missing page group: ${id}`)
    const registry = document.contract.component_registry
    const components = document.contract.components ?? {}
    for (const [category, members] of Object.entries(registry?.categories ?? {})) {
      for (const id of members) if (!(id in components)) errors.push(`component_registry.categories.${category} references missing component: ${id}`)
    }
  }

  lintComponents(document, base, errors, warnings)

  // `inheritance.token_vocabulary`: a product may add groups, never rename one.
  if (base) {
    const baseGroups = Object.keys(base.contract.tokens ?? {})
    const productGroups = new Set(Object.keys(groups))
    const missing = baseGroups.filter((group) => !productGroups.has(group))
    if (missing.length) {
      errors.push(`token groups renamed or dropped from the base contract: ${missing.join(', ')}`)
    }
  }

  if (document.contract.identity?.product === 'Aide') {
    const colors = Object.fromEntries(tokenLeaves(groups.color ?? {}).map(({ path: tokenPath, leaf }) => [tokenPath, leaf?.$value]))
    for (const [foreground, background, minimum] of [['text', 'canvas', 4.5], ['text', 'surface', 4.5], ['text-muted', 'surface', 4.5]]) {
      const ratio = contrast(colors[foreground], colors[background])
      if (ratio !== null && ratio < minimum) errors.push(`contrast ${foreground}/${background} is ${ratio.toFixed(2)}:1; requires ${minimum}:1`)
    }
  }
  return { errors, warnings }
}

function commandLint() {
  const core = readContract(CORE)
  const product = readContract(PRODUCT)
  let failed = false
  for (const [document, base] of [[core, null], [product, core]]) {
    const result = lintDocument(document, base)
    console.log(`\n${path.relative(ROOT, document.file)}`)
    for (const warning of result.warnings) console.log(`  WARN  ${warning}`)
    for (const error of result.errors) console.error(`  ERROR ${error}`)
    console.log(`  ${result.errors.length} errors, ${result.warnings.length} warnings`)
    failed ||= result.errors.length > 0
  }
  if (failed) process.exitCode = 1
}

function cssName(group, key) {
  const prefixes = { color: '', dimension: '', radius: 'radius-', shadow: 'shadow-', duration: 'motion-', gradient: 'gradient-', blur: 'blur-', weight: 'weight-', tracking: 'tracking-', leading: 'leading-' }
  return `--aui-${prefixes[group] ?? `${group}-`}${key}`
}

function commandExport() {
  const product = readContract(PRODUCT)
  const tokens = product.contract.tokens
  const componentTokens = product.contract.component_tokens
  const roots = { ...tokens, tokens, component_tokens: componentTokens }
  const outputDir = path.join(ROOT, 'src/lib/design-systems/generated')
  fs.mkdirSync(outputDir, { recursive: true })
  const resolved = resolveAliases({ tokens, component_tokens: componentTokens }, roots, ALIAS_OPTIONS)
  fs.writeFileSync(path.join(outputDir, 'wonhee-product-ui.tokens.json'), `${JSON.stringify(resolved, null, 2)}\n`)

  const declarations = []
  for (const [group, members] of Object.entries(tokens)) {
    for (const { path: tokenPath, leaf } of tokenLeaves(members)) {
      if (!leaf) continue
      const value = resolveAliases(leaf.$value, roots, ALIAS_OPTIONS)
      if (group === 'typography' && value !== null && typeof value === 'object') {
        const suffixes = { fontFamily: 'family', fontSize: 'size', fontWeight: 'weight', lineHeight: 'leading', letterSpacing: 'tracking' }
        for (const [property, suffix] of Object.entries(suffixes)) {
          if (value[property] !== undefined) declarations.push(`  --aui-type-${tokenPath}-${suffix}: ${value[property]};`)
        }
        continue
      }
      if (value !== null && typeof value === 'object') continue
      declarations.push(`  ${cssName(group, tokenPath.replaceAll('.', '-'))}: ${value};`)
    }
  }
  for (const { path: tokenPath, leaf } of tokenLeaves(componentTokens)) {
    if (!leaf) continue
    const value = resolveAliases(leaf.$value, roots, ALIAS_OPTIONS)
    if (typeof value === 'object') continue
    declarations.push(`  --aui-component-${tokenPath.replaceAll('.', '-')}: ${value};`)
  }
  fs.writeFileSync(path.join(outputDir, 'wonhee-product-ui.css'), `/* Generated from wonhee-product-ui.md. Do not edit. */\n:root {\n${declarations.join('\n')}\n}\n`)
  console.log(`exported ${declarations.length} CSS variables and DTCG-style JSON to ${path.relative(ROOT, outputDir)}`)
}

function flatten(value, prefix = '', output = {}) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) output[prefix] = JSON.stringify(value)
  else for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, output)
  return output
}

function commandDiff(files) {
  if (files.length !== 2) throw new Error('usage: npm run design:diff -- <before.md> <after.md>')
  const before = flatten(readContract(path.resolve(files[0])).contract)
  const after = flatten(readContract(path.resolve(files[1])).contract)
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  const changes = keys.filter((key) => before[key] !== after[key])
  if (!changes.length) return console.log('no machine-contract changes')
  for (const key of changes) console.log(`${key}\n  - ${before[key] ?? '<missing>'}\n  + ${after[key] ?? '<missing>'}`)
}

const [command = 'lint', ...args] = process.argv.slice(2)
if (command === 'lint') commandLint()
else if (command === 'export') commandExport()
else if (command === 'diff') commandDiff(args)
else throw new Error(`unknown command: ${command}`)
