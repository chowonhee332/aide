import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parse as parseYaml } from 'yaml'
import { isLeaf, resolveAliases } from '../src/lib/design-token-alias.mjs'

/** The contracts document their own alias syntax; that literal is prose, not a reference. */
const ALIAS_OPTIONS = { skipAliases: ["group.token"], label: "design contract" }

const ROOT = process.cwd()
const AIDE = path.join(ROOT, 'src/lib/design-systems/aide.md')

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
/** 사용자가 직접 조작하거나 열고 닫는 컴포넌트 — 상태 선언이 필수다. */
const INTERACTIVE_COMPONENT = /button|field|input|select|checkbox|radio|switch|chip|tabs|slider|menu|search|textarea|toggle|stepper|keypad|number|segmented|navigation|dialog|sheet|popover|dropdown/i

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

    // `validation.errors`: "component missing required anatomy or interactive state".
    // 상호작용 컴포넌트가 상태를 선언하지 않으면 생성 결과에 hover/focus/disabled가
    // 빠진 채로 나온다. inherits로 상위 계약을 물려받는 경우는 제외한다.
    const states = entry.states ?? baseComponents[id]?.states
    if (INTERACTIVE_COMPONENT.test(id) && !states && !entry.inherits) {
      errors.push(`components.${id}: interactive component must declare states`)
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

/**
 * `validation.errors`: "component visual literal that bypasses --aui-*".
 * A contract entry must name a token, never carry a raw colour or shadow value.
 */
function lintVisualLiterals(document, errors) {
  const LITERAL = /(#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/
  const walk = (node, trail) => {
    if (typeof node === 'string') {
      if (LITERAL.test(node)) errors.push(`${trail}: visual literal bypasses --aui-* — "${node.slice(0, 40)}"`)
      return
    }
    if (Array.isArray(node)) return node.forEach((item, index) => walk(item, `${trail}[${index}]`))
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) walk(value, `${trail}.${key}`)
    }
  }
  walk(document.contract.components ?? {}, 'components')
  walk(document.contract.component_tokens ?? {}, 'component_tokens')
}

/**
 * `validation.warnings`: "token has no product or showcase consumer".
 *
 * A token reaches product code two ways: as a `--aui-*` custom property, or as a
 * value through the `AUI_TOKEN_VALUE` bridge for renderers that cannot read CSS
 * variables. Both count, so both are collected here.
 */
function lintTokenConsumers(document, warnings) {
  const roots = ['src/app', 'src/components', 'src/lib']
  const used = new Set()
  const bridged = new Set()
  const visit = (dir) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name)
      if (item.isDirectory()) {
        if (item.name !== 'generated' && item.name !== 'design-systems') visit(full)
        continue
      }
      if (!/\.(ts|tsx|css|mjs)$/.test(item.name)) continue
      const source = fs.readFileSync(full, 'utf8')
      for (const match of source.matchAll(/--aui-[a-z0-9-]+/g)) used.add(match[0])
      for (const match of source.matchAll(/AUI_TOKEN_VALUE(?:\[['"]([a-zA-Z0-9._-]+)['"]\]|\.([a-zA-Z0-9_-]+))/g)) {
        bridged.add(match[1] ?? match[2])
      }
    }
  }
  for (const dir of roots) if (fs.existsSync(path.join(ROOT, dir))) visit(path.join(ROOT, dir))

  const emitted = []
  for (const [group, members] of Object.entries(document.contract.tokens ?? {})) {
    for (const { path: tokenPath, leaf } of tokenLeaves(members)) {
      if (!leaf) continue
      if (group === 'typography') {
        // Only `-size` is expected to have a consumer; screens take weight,
        // leading, and tracking from the standalone ramps instead.
        emitted.push({ name: `--aui-type-${tokenPath}-size`, key: tokenPath })
        continue
      }
      emitted.push({ name: cssName(group, tokenPath), key: tokenPath })
    }
  }
  const seen = new Set()
  for (const { name, key } of emitted) {
    if (seen.has(name)) continue
    seen.add(name)
    if (!used.has(name) && !bridged.has(key)) warnings.push(`${name}: no product or showcase consumer`)
  }
}

function lintDocument(document, base) {
  const errors = []
  const warnings = []
  if (document.metadata.tokens) {
    errors.push('front matter tokens are prohibited; contract.tokens is the only canonical token source')
  }
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
  lintVisualLiterals(document, errors)
  if (document.contract.identity?.product === 'Aide') lintTokenConsumers(document, warnings)

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
  const document = readContract(AIDE)
  const result = lintDocument(document, null)
  console.log(`\n${path.relative(ROOT, document.file)}`)
  for (const warning of result.warnings) console.log(`  WARN  ${warning}`)
  for (const error of result.errors) console.error(`  ERROR ${error}`)
  console.log(`  ${result.errors.length} errors, ${result.warnings.length} warnings`)
  if (result.errors.length > 0) process.exitCode = 1
}

function cssName(group, key) {
  const prefixes = { color: '', dimension: '', radius: 'radius-', shadow: 'shadow-', duration: 'motion-', gradient: 'gradient-', blur: 'blur-', weight: 'weight-', tracking: 'tracking-', leading: 'leading-' }
  return `--aui-${prefixes[group] ?? `${group}-`}${key}`
}

function commandExport() {
  const document = readContract(AIDE)
  const tokens = document.contract.tokens
  const componentTokens = document.contract.component_tokens
  const roots = { ...tokens, tokens, component_tokens: componentTokens }
  const outputDir = path.join(ROOT, 'src/lib/design-systems/generated')
  fs.mkdirSync(outputDir, { recursive: true })
  const resolved = resolveAliases({ tokens, component_tokens: componentTokens }, roots, ALIAS_OPTIONS)
  fs.writeFileSync(path.join(outputDir, 'aide.tokens.json'), `${JSON.stringify(resolved, null, 2)}\n`)

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
  fs.writeFileSync(path.join(outputDir, 'aide.css'), `/* Generated from aide.md. Do not edit. */\n:root {\n${declarations.join('\n')}\n}\n`)
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
