import type { ComponentCategory, ComponentDefinition, PropSchema } from './builder-types'
import rawCatalog from './design-systems/generated/astryx-catalog.json'

/**
 * Astryx (@astryxdesign/core) Playground catalog.
 *
 * propSchema + defaults are generated from the @astryxdesign/cli manifest
 * (scripts/generate-astryx-catalog.mjs → design-systems/generated/astryx-catalog.json)
 * so the property panel mirrors the real component API. Interactive previews are
 * rendered by AstryxComponentPreview; renderHTML here is a minimal static-export
 * fallback (a full serializer is a later step).
 */

export interface AstryxCatalogEntry {
  id: string
  astryxName: string
  importPath: string
  name: string
  description: string
  category: string
  composite: boolean
  defaultProps: Record<string, string>
  propSchema: PropSchema[]
}

const generated = rawCatalog as AstryxCatalogEntry[]

const esc = (value: string | undefined) =>
  (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const SPACING_STEPS = ['0', '1', '2', '3', '4', '5', '6', '8', '10']

// Components the manifest under-specifies for a drag-and-drop leaf. Container
// components (see CONTAINER_COMPONENT_IDS in BuilderView) also get the layout
// props — gap / padding / columns — the manifest hides behind object/union types.
const OVERRIDES: Record<string, Partial<AstryxCatalogEntry>> = {
  'astryx-stack': {
    defaultProps: { direction: 'vertical', gap: '2' },
    propSchema: [
      { key: 'direction', label: 'direction', type: 'select', options: ['vertical', 'horizontal'], group: 'style' },
      { key: 'gap', label: 'gap', type: 'select', options: SPACING_STEPS, group: 'style' },
    ],
  },
  'astryx-grid': {
    defaultProps: { columns: '3', gap: '4', align: 'stretch', justify: 'stretch' },
    propSchema: [
      { key: 'columns', label: 'columns', type: 'select', options: ['1', '2', '3', '4', '5', '6'], group: 'style' },
      { key: 'gap', label: 'gap', type: 'select', options: SPACING_STEPS, group: 'style' },
      { key: 'align', label: 'align', type: 'select', options: ['start', 'center', 'end', 'stretch'], group: 'style' },
      { key: 'justify', label: 'justify', type: 'select', options: ['start', 'center', 'end', 'stretch'], group: 'style' },
    ],
  },
  'astryx-card': {
    defaultProps: { padding: '4', variant: 'default', elevation: 'none' },
    propSchema: [
      { key: 'padding', label: 'padding', type: 'select', options: SPACING_STEPS, group: 'style' },
      { key: 'variant', label: 'variant', type: 'select', options: ['default', 'muted', 'transparent'], group: 'style' },
      { key: 'elevation', label: 'elevation', type: 'select', options: ['none', 'low', 'medium', 'high'], group: 'style' },
    ],
  },
  'astryx-section': {
    defaultProps: { padding: '6', variant: 'section' },
    propSchema: [
      { key: 'padding', label: 'padding', type: 'select', options: SPACING_STEPS, group: 'style' },
      { key: 'variant', label: 'variant', type: 'select', options: ['section', 'transparent'], group: 'style' },
    ],
  },
}

// Template compiler output — a subtree that stays verbatim (icons, charts,
// images, `.map()` rows, or a whole `mode: 'whole'` page). Rendered by
// AstryxTemplateFrozen; not a container, not draggable from the palette.
const FROZEN_ENTRY: AstryxCatalogEntry = {
  id: 'astryx-frozen',
  astryxName: 'Frozen',
  importPath: '',
  name: 'Astryx 블록',
  description: '템플릿에서 그대로 가져온 편집 불가 블록 (아이콘·차트·이미지 등).',
  category: 'content',
  composite: true,
  defaultProps: { label: 'Astryx 블록' },
  propSchema: [{ key: 'label', label: 'label', type: 'text', group: 'content' }],
}

const HEADING_ENTRY: AstryxCatalogEntry = {
  id: 'astryx-heading',
  astryxName: 'Heading',
  importPath: '@astryxdesign/core/Text',
  name: 'Heading',
  description: '시맨틱 제목 (h1–h6). 테마 타입 스케일을 따른다.',
  category: 'content',
  composite: false,
  defaultProps: { children: 'Section title', level: '3' },
  propSchema: [
    { key: 'children', label: 'children', type: 'text', group: 'content' },
    { key: 'level', label: 'level', type: 'select', options: ['1', '2', '3', '4', '5', '6'], group: 'style' },
    { key: 'type', label: 'type', type: 'select', options: ['display-1', 'display-2', 'display-3'], group: 'style' },
  ],
}

function toDefinition(entry: AstryxCatalogEntry): ComponentDefinition {
  const merged = { ...entry, ...OVERRIDES[entry.id] }
  return {
    id: merged.id,
    name: merged.name,
    icon: 'widgets',
    designSystem: 'astryx',
    category: merged.category as ComponentCategory,
    description: merged.description || undefined,
    canvasBehavior: 'stack',
    supportedDevices: ['mobile', 'desktop'],
    defaultProps: merged.defaultProps,
    propSchema: merged.propSchema,
    renderHTML: (props) => {
      const text = props.label ?? props.children ?? props.title ?? props.value ?? merged.name
      return `<div data-astryx="${merged.id}">${esc(String(text))}</div>`
    },
  }
}

export const ASTRYX_PLAYGROUND_COMPONENTS: ComponentDefinition[] = [
  ...generated.map(toDefinition),
  toDefinition(HEADING_ENTRY),
  toDefinition(FROZEN_ENTRY),
].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

export const ASTRYX_PLAYGROUND_COMPONENT_IDS = ASTRYX_PLAYGROUND_COMPONENTS.map((component) => component.id)

/** id → catalog entry, for the renderer's prop coercion + composite routing. */
export const ASTRYX_CATALOG_BY_ID: Record<string, AstryxCatalogEntry> = Object.fromEntries(
  [...generated, HEADING_ENTRY, FROZEN_ENTRY].map((entry) => [entry.id, { ...entry, ...OVERRIDES[entry.id] }]),
)
