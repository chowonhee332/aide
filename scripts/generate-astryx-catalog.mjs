#!/usr/bin/env node
/**
 * Generates src/lib/design-systems/generated/astryx-catalog.json from the
 * @astryxdesign/cli component manifest, so the Playground catalog + property
 * panel always reflect the real @astryxdesign/core prop API.
 *
 * Runs in `prebuild`. Do not edit the JSON by hand.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'src/lib/design-systems/generated/astryx-catalog.json')

// Primary, standalone-renderable components. Sub-components (TableCell, SideNavItem…),
// providers and pure utilities are intentionally excluded.
const ALLOW = new Set([
  // Action
  'Button', 'IconButton', 'ToggleButton', 'ButtonGroup', 'Link',
  // Content  (Heading is added by hand in astryx-playground-components.ts — the
  // manifest treats it as a sub-component of Text and omits it from --list)
  'Text', 'Blockquote', 'Avatar', 'AvatarGroup', 'Kbd', 'Thumbnail',
  'Timestamp', 'Citation', 'Icon',
  // Feedback & Status
  'Badge', 'Banner', 'Spinner', 'Skeleton', 'ProgressBar', 'StatusDot', 'Toast', 'EmptyState',
  // Form Controls
  'TextInput', 'TextArea', 'NumberInput', 'Slider', 'Switch', 'SegmentedControl',
  'CheckboxList', 'RadioList', 'Field',
  // Layout / Container
  'Card', 'ClickableCard', 'Divider', 'Stack', 'Grid', 'Section', 'Center', 'AspectRatio', 'Collapsible',
  // Navigation
  'Breadcrumbs', 'Pagination', 'TabList', 'Stepper',
  // Data
  'Table', 'List', 'MetadataList',
  // Overlay (rendered inline as an open surface by the preview)
  'Tooltip', 'Popover', 'Dialog', 'AlertDialog', 'DropdownMenu', 'ContextMenu', 'HoverCard',
  'MoreMenu', 'Lightbox', 'BottomSheet', 'CommandPalette',
  // Navigation shells
  'AppShell', 'SideNav', 'TopNav', 'MobileNav', 'TreeList', 'Outline', 'OverflowList', 'TabMenu',
  // Form — advanced
  'Selector', 'MultiSelector', 'ComplexSelector', 'Typeahead', 'Tokenizer', 'DateInput',
  'TimeInput', 'DateRangeInput', 'DateTimeInput', 'FileInput', 'InputGroup', 'FormLayout',
  'CheckboxInput', 'SelectableCard', 'PowerSearch',
  // Content / misc
  'Calendar', 'Carousel', 'Markdown', 'CodeBlock', 'Toolbar', 'Tokenizer', 'CollapsibleGroup',
  'ToggleButtonGroup', 'AvatarStatusDot', 'ChatComposer', 'ChatMessageBubble',
])

// Need bespoke wiring in AstryxComponentPreview (children / rows / items / open state).
const COMPOSITE = new Set([
  'ButtonGroup', 'AvatarGroup', 'SegmentedControl', 'CheckboxList', 'RadioList', 'Field',
  'Stack', 'Grid', 'Section', 'Center', 'AspectRatio', 'Collapsible',
  'Breadcrumbs', 'Pagination', 'TabList', 'Stepper', 'Table', 'List', 'MetadataList',
  'Tooltip', 'Popover', 'EmptyState', 'Card', 'ClickableCard',
  'Dialog', 'AlertDialog', 'DropdownMenu', 'ContextMenu', 'HoverCard', 'MoreMenu', 'Lightbox',
  'BottomSheet', 'CommandPalette', 'AppShell', 'SideNav', 'TopNav', 'MobileNav', 'TreeList',
  'Outline', 'OverflowList', 'TabMenu', 'Selector', 'MultiSelector', 'ComplexSelector',
  'Typeahead', 'Tokenizer', 'DateInput', 'TimeInput', 'DateRangeInput', 'DateTimeInput',
  'FileInput', 'InputGroup', 'FormLayout', 'CheckboxInput', 'SelectableCard', 'PowerSearch',
  'Calendar', 'Carousel', 'Markdown', 'CodeBlock', 'Toolbar', 'CollapsibleGroup',
  'ToggleButtonGroup', 'AvatarStatusDot', 'ChatComposer', 'ChatMessageBubble',
])

// group/name -> export subpath overrides (rest resolve to ./<name>)
const SUBPATH = {
  Heading: 'Text',
  TabMenu: 'TabList',
  CollapsibleGroup: 'Collapsible',
  ToggleButtonGroup: 'ToggleButton',
  AvatarStatusDot: 'Avatar',
  ChatComposer: 'Chat',
  ChatMessageBubble: 'Chat',
}

const CATEGORY = {
  Action: 'action',
  Content: 'content',
  'Feedback & Status': 'feedback',
  'Form Controls': 'input',
  Container: 'layout',
  Layout: 'layout',
  Navigation: 'navigation',
  'Data Display': 'data',
  Overlay: 'overlay',
}
const SELECTION_IDS = new Set(['astryx-switch', 'astryx-checkbox-list', 'astryx-radio-list', 'astryx-segmented-control'])

// Content props (free text the user types) and the boolean/flag props worth a toggle.
const CONTENT_KEYS = new Set(['label', 'children', 'description', 'placeholder', 'title', 'value', 'cite', 'keys', 'body', 'name', 'src', 'alt'])
const FLAG_KEEP = new Set([
  'isDisabled', 'isLoading', 'isPressed', 'isPulsing', 'isStriped', 'isIndeterminate', 'isDismissable',
  'isFullBleed', 'hasDividers', 'hasHover', 'hasValueLabel', 'defaultIsOpen', 'isInline', 'isCompact',
])
const SKIP_TYPE_ALWAYS = [/=>/, /StyleXStyles/, /CSSProperties/, /ElementType/, /Ref</, /\bReadonlyArray\b/, /\bArray</, /^\{/, /Record</, /ReactNode\[\]/]
const MAX_PROPS = 9
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase()

function parseEnum(type) {
  // "'a' | 'b' | number"  ->  ['a','b']   (string literals only)
  const parts = type.split('|').map((s) => s.trim())
  const lits = parts.filter((p) => /^'[^']*'$/.test(p)).map((p) => p.slice(1, -1))
  return lits.length >= 2 ? lits : null
}

// Returns a PropSchema entry, or null to drop the prop from the panel.
function toPropSchema(prop) {
  const { name, type = '' } = prop
  if (SKIP_TYPE_ALWAYS.some((re) => re.test(type))) return null

  const isFlag = /^(is|has|show)[A-Z]/.test(name) || type === 'boolean'
  if (isFlag) {
    if (!FLAG_KEEP.has(name)) return null
    return { key: name, label: name, type: 'select', options: ['false', 'true'], group: 'state' }
  }

  const options = parseEnum(type)
  if (options) return { key: name, label: name, type: 'select', options, group: 'style' }

  if (!CONTENT_KEYS.has(name)) return null // only enum + known content props survive
  if (name === 'children' || name === 'description') return { key: name, label: name, type: 'textarea', group: 'content' }
  if (type === 'number' || type.startsWith('number')) return { key: name, label: name, type: 'number', group: 'content' }
  return { key: name, label: name, type: 'text', group: 'content' }
}

const GROUP_ORDER = { content: 0, style: 1, state: 2 }

function build(entry) {
  const name = entry.name
  const importName = SUBPATH[name] ?? (entry.group && entry.group !== 'Utilities' && entry.group !== name ? name : name)
  const importPath = `@astryxdesign/core/${SUBPATH[name] ?? importName}`
  const id = `astryx-${kebab(name)}`

  let propSchema = []
  const seen = new Set()
  for (const p of entry.props ?? []) {
    const s = toPropSchema(p)
    if (s && !seen.has(s.key)) { seen.add(s.key); propSchema.push(s) }
  }
  propSchema.sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group])
  propSchema = propSchema.slice(0, MAX_PROPS)

  const pgDefaults = entry.playground?.defaults ?? {}
  // manifest playground defaults sometimes carry rich {__element} nodes — those
  // are not editable strings, drop them.
  const plainDefault = (v) => (v !== null && typeof v === 'object' ? undefined : v)
  const defaultProps = {}
  for (const s of propSchema) {
    let v = plainDefault(pgDefaults[s.key])
    if (v === undefined) {
      const raw = (entry.props ?? []).find((p) => p.name === s.key)?.default
      v = raw === '' || raw === undefined ? undefined : raw
    }
    if (v === undefined && s.type === 'select') v = s.options[0]
    if (v !== undefined) defaultProps[s.key] = String(v).replace(/^'|'$/g, '')
  }
  // Some components (e.g. Link) expose no manifest props — surface their
  // playground text so the panel is not empty.
  for (const key of ['label', 'children']) {
    const val = plainDefault(pgDefaults[key])
    if (val === undefined) continue
    if (!seen.has(key)) {
      propSchema.unshift({ key, label: key, type: key === 'children' ? 'textarea' : 'text', group: 'content' })
      seen.add(key)
    }
    if (defaultProps[key] === undefined) defaultProps[key] = String(val)
  }

  return {
    id,
    astryxName: name,
    importPath,
    name: entry.displayName || name,
    description: (entry.usage?.description || entry.description || '').split(/(?<=[.。])\s/)[0].slice(0, 140),
    category: SELECTION_IDS.has(id) ? 'selection' : CATEGORY[entry.category] || 'content',
    composite: COMPOSITE.has(name),
    defaultProps,
    propSchema,
  }
}

console.log('astryx-catalog: querying @astryxdesign/cli …')
let raw
try {
  raw = execFileSync('npx', ['astryx', 'component', '--list', '--json', '--detail', 'full'], {
    cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  })
} catch (err) {
  if (existsSync(OUT)) {
    console.warn(`astryx-catalog: CLI unavailable (${err.message.split('\n')[0]}); keeping committed ${OUT.replace(root + '/', '')}`)
    process.exit(0)
  }
  throw err
}
const manifest = JSON.parse(raw).data.components
const flat = Object.values(manifest).flat()

const catalog = flat
  .filter((c) => ALLOW.has(c.name))
  .map(build)
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

const missing = [...ALLOW].filter((n) => !catalog.some((c) => c.astryxName === n))
if (missing.length) {
  console.error('astryx-catalog: ALLOW names not found in manifest:', missing.join(', '))
  process.exit(1)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n')
console.log(`astryx-catalog: wrote ${catalog.length} components → ${OUT.replace(root + '/', '')}`)
