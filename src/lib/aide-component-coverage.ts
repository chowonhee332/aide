import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { AUI_COMPONENT_CATEGORIES, AUI_COMPONENTS, AUI_COMPONENT_RECIPES, AUI_COMPONENT_RECIPE_FAMILIES, AUI_PRODUCT_CONTRACT } from './aide-product-tokens'
import { AIDE_DESIGN_CONTRACT, AIDE_REFERENCE_CATALOG } from './aide-design-contract'
import { AIDE_PLAYGROUND_COMPONENT_IDS } from './aide-playground-components'

export type ImplementationState = 'implemented' | 'excluded'
const EXCLUDED = new Set(AIDE_REFERENCE_CATALOG.filter((item) => item.status === 'excluded').map((item) => item.id))
export function componentImplementationState(id: string): ImplementationState { return EXCLUDED.has(id) ? 'excluded' : 'implemented' }
export const IMPLEMENTATION_STATE_LABELS: Record<ImplementationState, string> = { implemented: 'implemented', excluded: 'excluded' }

export type CoverageState = 'pass' | 'partial' | 'missing' | 'not-applicable'
export interface CoverageCheck { state: CoverageState; label: string; detail: string }
export interface ComponentCoverage {
  id: string
  definition: CoverageCheck
  registry: CoverageCheck
  preview: CoverageCheck
  source: CoverageCheck
  tokens: CoverageCheck
  recipe: CoverageCheck
  playground: CoverageCheck
  complete: boolean
}
export interface CoverageSummary {
  components: number; complete: number; definitions: number; registered: number
  previews: number; sources: number; tokenConsumers: number; recipes: number; playground: number
}

const ROOT = process.cwd()
const PREVIEW_SOURCE = 'src/components/aide-docs/ComponentPreview.tsx'

function dictionary(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function readProjectFile(relativePath: string) {
  const absolutePath = path.join(ROOT, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null
}

function previewIds() {
  const source = readProjectFile(PREVIEW_SOURCE) ?? ''
  return new Set([...source.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map((match) => match[1]))
}

function registryOccurrences() {
  const occurrences = new Map<string, string[]>()
  for (const [category, ids] of Object.entries(AUI_COMPONENT_CATEGORIES)) {
    for (const id of ids) occurrences.set(id, [...(occurrences.get(id) ?? []), category])
  }
  return occurrences
}

function rendererFor(id: string) {
  const registry = dictionary(AUI_PRODUCT_CONTRACT.component_registry)
  const defaults = dictionary(registry.defaults)
  const overrides = dictionary(registry.source_overrides)
  const override = overrides[id]
  if (typeof override === 'string') return override
  return typeof defaults.renderer === 'string' ? defaults.renderer.replace('<component>', id) : null
}

function sourcePath(renderer: string) { return renderer.split('#')[0] }

function tokenCheck(id: string, renderer: string | null): CoverageCheck {
  if (!renderer || renderer.startsWith('composition:')) {
    return { state: 'not-applicable', label: 'Composition', detail: '문서 조합 패턴이며 독립 primitive source가 없습니다.' }
  }
  const bindings = dictionary(dictionary(AUI_PRODUCT_CONTRACT.component_registry).token_bindings)
  const hasBinding = Object.keys(dictionary(bindings[id])).length > 0
  const source = readProjectFile(sourcePath(renderer)) ?? ''
  const variables = [...new Set([...source.matchAll(/var\((--aui-[a-z0-9-]+)/gi)].map((match) => match[1]))]
  const componentVariables = variables.filter((variable) => variable.startsWith('--aui-component-'))
  const semanticVariables = variables.filter((variable) => !variable.startsWith('--aui-component-'))
  if (hasBinding && componentVariables.length) return { state: 'pass', label: 'Component + semantic', detail: `MD binding과 component token ${componentVariables.length}개를 source가 소비합니다.` }
  if (hasBinding || componentVariables.length) return { state: 'pass', label: 'Component token', detail: hasBinding ? 'MD component token binding이 정의되어 있습니다.' : `component token ${componentVariables.length}개를 source가 소비합니다.` }
  if (semanticVariables.length) return { state: 'pass', label: 'Semantic token', detail: `semantic token ${semanticVariables.length}개를 source가 소비합니다.` }
  return { state: 'missing', label: 'No token use', detail: 'source에서 --aui-* 토큰 소비를 찾지 못했습니다.' }
}

export function componentCoverage(): { rows: ComponentCoverage[]; summary: CoverageSummary } {
  const portable = dictionary(AIDE_DESIGN_CONTRACT.components)
  const registered = registryOccurrences()
  const previews = previewIds()
  const playgroundOccurrences = AIDE_PLAYGROUND_COMPONENT_IDS.reduce((map, id) => map.set(id, (map.get(id) ?? 0) + 1), new Map<string, number>())
  // Portable `components` also contains abstract families such as `feedback` and
  // `asset`; the product board tracks only concrete product definitions/registry IDs.
  const ids = [...new Set([...registered.keys(), ...Object.keys(AUI_COMPONENTS)])].sort()
  const rows = ids.map((id): ComponentCoverage => {
    const definitionSources = [portable[id] ? 'portable' : null, AUI_COMPONENTS[id] ? 'product' : null].filter(Boolean)
    const categories = registered.get(id) ?? []
    const renderer = rendererFor(id)
    const isComposition = renderer?.startsWith('composition:') ?? false
    const rendererPath = renderer && !isComposition ? sourcePath(renderer) : null
    const sourceExists = rendererPath ? fs.existsSync(path.join(ROOT, rendererPath)) : false
    const definition: CoverageCheck = definitionSources.length ? { state: 'pass', label: definitionSources.join(' + '), detail: `${definitionSources.join(', ')} MD contract에 정의되어 있습니다.` } : { state: 'missing', label: 'Missing', detail: 'portable/product MD definition이 없습니다.' }
    const registry: CoverageCheck = categories.length === 1 ? { state: 'pass', label: categories[0], detail: `${categories[0]} category에 한 번 등록되어 있습니다.` } : categories.length > 1 ? { state: 'partial', label: `Duplicate ×${categories.length}`, detail: `여러 category에 중복 등록: ${categories.join(', ')}` } : { state: 'missing', label: 'Unregistered', detail: 'component_registry.categories에 없습니다.' }
    const preview: CoverageCheck = previews.has(id) ? { state: 'pass', label: 'Rendered', detail: `${PREVIEW_SOURCE}에 명시적인 case가 있습니다.` } : { state: 'missing', label: 'Fallback only', detail: '명시적인 preview case가 없어 fallback이 표시됩니다.' }
    const source: CoverageCheck = isComposition ? { state: 'not-applicable', label: 'Composition', detail: renderer ?? 'composition' } : sourceExists ? { state: 'pass', label: 'Exists', detail: renderer ?? '' } : { state: 'missing', label: 'Missing', detail: renderer ?? 'renderer가 정의되지 않았습니다.' }
    const tokens = tokenCheck(id, renderer)
    const recipeDefinition = dictionary(AUI_COMPONENT_RECIPES[id])
    const recipeFamily = typeof recipeDefinition.family === 'string' ? dictionary(AUI_COMPONENT_RECIPE_FAMILIES[recipeDefinition.family]) : {}
    const recipe: CoverageCheck = Object.keys(recipeDefinition).length && Object.keys(recipeFamily).length
      ? { state: 'pass', label: String(recipeDefinition.family), detail: '컴포넌트 recipe와 유효한 family specification이 연결되어 있습니다.' }
      : { state: 'missing', label: 'Missing', detail: 'component_recipes.items 또는 family specification이 없습니다.' }
    const playgroundCount = playgroundOccurrences.get(id) ?? 0
    const playground: CoverageCheck = playgroundCount === 1 ? { state: 'pass', label: 'Available', detail: 'Playground 카탈로그에서 동일한 component id로 조합할 수 있습니다.' } : playgroundCount > 1 ? { state: 'partial', label: `Duplicate ×${playgroundCount}`, detail: 'Playground 카탈로그에 중복 등록되어 있습니다.' } : { state: 'missing', label: 'Unavailable', detail: 'Playground 카탈로그에서 이 component id를 찾지 못했습니다.' }
    const complete = definition.state === 'pass' && registry.state === 'pass' && preview.state === 'pass' && (source.state === 'pass' || source.state === 'not-applicable') && (tokens.state === 'pass' || tokens.state === 'not-applicable') && recipe.state === 'pass' && playground.state === 'pass'
    return { id, definition, registry, preview, source, tokens, recipe, playground, complete }
  })
  const summary: CoverageSummary = {
    components: rows.length,
    complete: rows.filter((row) => row.complete).length,
    definitions: rows.filter((row) => row.definition.state === 'pass').length,
    registered: rows.filter((row) => row.registry.state === 'pass').length,
    previews: rows.filter((row) => row.preview.state === 'pass').length,
    sources: rows.filter((row) => row.source.state === 'pass' || row.source.state === 'not-applicable').length,
    tokenConsumers: rows.filter((row) => row.tokens.state === 'pass' || row.tokens.state === 'not-applicable').length,
    recipes: rows.filter((row) => row.recipe.state === 'pass').length,
    playground: rows.filter((row) => row.playground.state === 'pass').length,
  }
  return { rows, summary }
}

/**
 * ComponentPreview 의 `case '<id>':` 블록이 실제로 읽는 prop 이름.
 *
 * 조작 패널을 계약의 props 로만 만들면, family 가 선언했지만 그 컴포넌트에는 해당하지 않는
 * 옵션까지 라디오로 올라온다(navigation family 의 `orientation` 이 app-header 에,
 * data-display 의 `emphasis` 가 badge 에 붙는 식). 눌러도 그림이 그대로라 고장으로 읽힌다.
 * 소스를 직접 읽어 case 별로 걸러 낸다.
 */
const DERIVED_PROP_SOURCES: Record<string, string[]> = {
  buttonVariant: ['variant'], buttonSize: ['size'], disabled: ['state', 'disabled'],
  options: ['options'], label: ['label', 'title'], title: ['title'], description: ['description'],
  navigationItems: ['options'], chartData: ['options'],
}

let previewCasePropsCache: Map<string, Set<string>> | null = null

export function previewCaseProps(): Map<string, Set<string>> {
  if (previewCasePropsCache) return previewCasePropsCache
  const source = readProjectFile(PREVIEW_SOURCE) ?? ''
  const body = source.slice(source.indexOf('switch (id)'))
  const map = new Map<string, Set<string>>()
  for (const match of body.matchAll(/case '([a-z0-9-]+)':([\s\S]*?)(?=\n    case '|\n    default:)/g)) {
    const [, id, block] = match
    const used = new Set<string>()
    for (const hit of block.matchAll(/props\.([a-zA-Z]+)/g)) used.add(hit[1])
    for (const hit of block.matchAll(/props\['([a-z-]+)'\]/g)) used.add(hit[1])
    for (const [variable, sources] of Object.entries(DERIVED_PROP_SOURCES)) {
      if (new RegExp(`\\b${variable}\\b`).test(block)) sources.forEach((name) => used.add(name))
    }
    map.set(id, used)
  }
  previewCasePropsCache = map
  return map
}

export function assertComponentCoverageIntegrity() {
  const broken = componentCoverage().rows.filter((row) => row.definition.state !== 'pass' || row.registry.state !== 'pass' || row.preview.state !== 'pass' || (row.source.state !== 'pass' && row.source.state !== 'not-applicable') || (row.tokens.state !== 'pass' && row.tokens.state !== 'not-applicable') || row.recipe.state !== 'pass' || row.playground.state !== 'pass')
  if (broken.length) throw new Error(`Aide component parity failed: ${broken.map((row) => row.id).join(', ')}`)
}
