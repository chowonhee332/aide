import {
  AUI_COMPONENT_CATEGORIES,
  AUI_COMPONENTS,
  AUI_COMPONENT_RECIPES,
  AUI_COMPONENT_RECIPE_FAMILIES,
  AUI_COMPONENT_TOKEN_GROUPS,
  AUI_TOKEN_ENTRIES,
  AUI_DOCUMENTATION,
  AUI_PRODUCT_CONTRACT,
} from './aide-product-tokens'
import { AIDE_DESIGN_CONTRACT } from './aide-design-contract'

export interface DocsNavItem {
  id: string
  title: string
  href: string
  group?: string
}

export interface DocsTocItem {
  id: string
  title: string
}

export type ComponentPreviewSize = 'compact' | 'control' | 'wide'

export const DOCS_SECTION_IDS = AUI_DOCUMENTATION.navigation

export function humanizeId(id: string) {
  // 계약은 kebab-case(anatomy-slot)와 snake_case(when_not)를 모두 쓴다.
  // 둘 다 단어 경계로 보고 첫 글자만 올린다 — "When_not"처럼 남으면 안 된다.
  return id
    .split(/[-_]/)
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ')
}

export function sectionHref(sectionId: string) {
  return sectionId === 'get-started' ? '/aide-ui' : `/aide-ui/${sectionId}`
}

export function sectionNavigation(sectionId: string): DocsNavItem[] {
  const page = AUI_DOCUMENTATION.pages[sectionId]
  if (!page) return []

  if (sectionId === 'components') {
    return [
      { id: 'overview', title: 'Overview', href: '/aide-ui/components', group: 'Guide' },
      ...Object.entries(AUI_COMPONENT_CATEGORIES).flatMap(([category, ids]) =>
        ids.map((id) => ({
          id,
          title: humanizeId(id),
          href: `/aide-ui/components/${id}`,
          group: humanizeId(category),
        })),
      ),
    ]
  }

  const orderedItems = [...(page.items ?? [])].sort((a, b) => navigationRank(sectionId, a) - navigationRank(sectionId, b))
  return orderedItems.map((id) => ({
    id,
    title: humanizeId(id),
    href: sectionId === 'get-started' && id === 'overview'
      ? '/aide-ui'
      : sectionId === 'get-started'
        ? `/aide-ui/get-started/${id}`
      : `${sectionHref(sectionId)}/${id}`,
    group: navigationGroup(sectionId, id),
  }))
}

function navigationGroup(sectionId: string, itemId: string): string | undefined {
  return NAVIGATION_GROUPS[sectionId]?.find(([, ids]) => ids.includes(itemId))?.[0]
}

const NAVIGATION_GROUPS: Record<string, Array<[string, string[]]>> = {
    'get-started': [['Start here', ['overview', 'principles', 'adoption', 'architecture']]],
    foundations: [
      ['Core materials', ['design-token', 'color', 'typography', 'iconography', 'elevation', 'gradient']],
      ['Structure & behavior', ['layout', 'spacing', 'radius', 'motion', 'state']],
      ['Experience', ['inclusive-design', 'international-design', 'voice-and-tone', 'writing']],
    ],
    patterns: [
      ['Screen patterns', ['landing', 'list-screen', 'detail-screen', 'form-screen', 'dashboard', 'workspace']],
      ['State patterns', ['loading', 'empty', 'error-and-recovery']],
      ['AI workflows', ['prompt-to-variants', 'variant-comparison', 'selection-to-prototype', 'file-analysis', 'requirement-traceability', 'generation-recovery']],
    ],
    develop: [
      ['Setup', ['installation', 'react', 'css-variables']],
      ['APIs', ['token-api', 'component-api', 'responsive-api']],
      ['Operations', ['validation', 'migration', 'changelog']],
    ],
    'ai-and-tools': [
      ['Context', ['design-md', 'llms-txt', 'skill']],
      ['Workflow', ['prompt-guide', 'validation', 'export']],
      ['Integrations', ['mcp']],
    ],
}

function navigationRank(sectionId: string, itemId: string): number {
  const groups = NAVIGATION_GROUPS[sectionId] ?? []
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const itemIndex = groups[groupIndex][1].indexOf(itemId)
    if (itemIndex >= 0) return groupIndex * 100 + itemIndex
  }
  return Number.MAX_SAFE_INTEGER
}

export function componentCategory(componentId: string) {
  return Object.entries(AUI_COMPONENT_CATEGORIES)
    .find(([, componentIds]) => componentIds.includes(componentId))?.[0] ?? 'components'
}

// 컴포넌트가 화면 어디에 사는지에 따라 프레임의 방향과 위치가 함께 바뀐다.
// 하단에 사는 것은 화면 아랫부분(아래가 둥근 프레임)에, 상단에 사는 것은 윗부분에 앉힌다.
// 액션은 과업을 끝내는 자리라 화면 하단이 기본이다. 카탈로그 썸네일과 상세 hero가 같은 규칙을 쓴다.
const BOTTOM_ANCHORED = new Set([
  'button', 'icon-button', 'action-bar', 'fixed-bottom-cta',
  'bottom-app-bar', 'sheet', 'toast', 'keypad',
])
const TOP_ANCHORED = new Set([
  'app-header', 'top-navigation', 'global-navigation', 'local-navigation',
  'breadcrumb', 'page-header', 'detail-header', 'section-header', 'tabs',
])

export function componentHeroAnchor(componentId: string): 'top' | 'bottom' | 'center' {
  if (BOTTOM_ANCHORED.has(componentId)) return 'bottom'
  if (TOP_ANCHORED.has(componentId)) return 'top'
  return 'center'
}

// overlay는 이미 자기 표면(카드·시트·말풍선)을 갖고 있어 화면 프레임을 한 번 더 두르면
// 프레임 안에 프레임이 겹쳐 보인다. 이 카테고리만 장식 프레임 없이 트리거를 그대로 보여준다.
export function componentPreviewFramed(componentId: string) {
  return componentCategory(componentId) !== 'overlays'
}

/**
 * `related`와 `prohibited`는 손으로 쓰지 않고 계약에서 파생시킨다.
 * 손으로 쓰면 한쪽만 갱신되어 금방 어긋난다 — number-field는 slider를 가리키는데
 * slider는 number-field를 가리키지 않는 상태가 실제로 있었다.
 */
function portableComponentMap(): Record<string, Record<string, unknown>> {
  return (AIDE_DESIGN_CONTRACT.components ?? {}) as Record<string, Record<string, unknown>>
}

/** `usage.instead` 항목은 "<component-id> when ..." 형태다. 앞 토큰이 id다. */
function insteadIds(entry: Record<string, unknown> | undefined, known: Set<string>): string[] {
  const usage = entry?.usage as { instead?: unknown } | undefined
  if (!Array.isArray(usage?.instead)) return []
  return usage.instead
    .map((item) => String(item).split(/\s+/)[0])
    .filter((id) => known.has(id))
}

const RELATED_LIMIT = 6

function relatedComponents(componentId: string): string[] {
  const components = portableComponentMap()
  const known = new Set(Object.keys(components))

  // 1순위: usage.instead가 명시한 의미 있는 대안 — 양방향으로 모은다.
  const chosen = new Set<string>(insteadIds(components[componentId], known))
  for (const [id, entry] of Object.entries(components)) {
    if (id === componentId) continue
    if (insteadIds(entry, known).includes(componentId)) chosen.add(id)
  }
  chosen.delete(componentId)

  // 2순위: 같은 recipe family 형제로 남은 자리만 채운다.
  // data-display처럼 큰 family를 전부 넣으면 목록이 노이즈가 된다.
  const family = AUI_COMPONENT_RECIPES[componentId]?.family
  if (typeof family === 'string') {
    const siblings = Object.entries(AUI_COMPONENT_RECIPES)
      .filter(([id, recipe]) => id !== componentId && recipe?.family === family && known.has(id))
      .map(([id]) => id)
      .sort()
    for (const id of siblings) {
      if (chosen.size >= RELATED_LIMIT) break
      chosen.add(id)
    }
  }

  return [...chosen].sort().slice(0, RELATED_LIMIT)
}

/**
 * recipe family → component_tokens 그룹. 이름이 같지 않은 것만 적는다
 * (action 계열의 크기 값은 `button` 그룹에 있다).
 */
const FAMILY_TOKEN_GROUP: Record<string, string> = {
  action: 'button',
  field: 'field',
  selection: 'selection',
  navigation: 'navigation',
  'data-display': 'data-display',
  feedback: 'feedback',
  overlay: 'overlay',
}

const SIZE_TOKEN = /(height|size|width)$/i

/**
 * 크기 표는 손으로 쓰지 않는다. `component_tokens`에 이미 값이 있고 `$description`이
 * 그대로 "언제 이 크기를 쓰나"를 설명한다. Carbon의 `Size | Value | Use case`와 같은 모양을
 * 계약에서 그대로 만들어 낸다.
 */
function componentSizes(componentId: string): Record<string, string> {
  const recipe = AUI_COMPONENT_RECIPES[componentId]
  const family = typeof recipe?.family === 'string' ? recipe.family : undefined
  const group = AUI_COMPONENT_TOKEN_GROUPS.has(componentId)
    ? componentId
    : (family ? FAMILY_TOKEN_GROUP[family] : undefined)
  if (!group) return {}

  const sizes: Record<string, string> = {}
  for (const entry of AUI_TOKEN_ENTRIES) {
    const [entryGroup, ...rest] = entry.key.split('.')
    if (entryGroup !== group || !rest.length) continue
    const name = rest.join('.')
    if (!SIZE_TOKEN.test(name)) continue
    sizes[name] = entry.description ? `${entry.value} — ${entry.description}` : entry.value
  }
  return sizes
}

/**
 * anatomy 부위 이름은 컴포넌트 사이에서 공유된다(`label`은 14개 컴포넌트가 쓴다).
 * 설명을 컴포넌트마다 따로 쓰면 같은 부위가 페이지마다 다르게 설명되므로,
 * 계약의 `anatomy_glossary`에 한 번만 적고 이름으로 끌어다 쓴다.
 */
function anatomyWithDescriptions(parts: unknown): Array<{ name: string; description: string; optional: boolean }> | null {
  if (!Array.isArray(parts)) return null
  const glossary = dict(dict(AIDE_DESIGN_CONTRACT.anatomy_glossary).parts)
  return parts.map((raw) => {
    const name = String(raw)
    const optional = name.startsWith('optional-')
    const base = optional ? name.slice('optional-'.length) : name
    const described = glossary[base]
    return {
      name: base,
      description: typeof described === 'string' ? described : '',
      optional,
    }
  })
}

/** 컴포넌트의 부정 규칙(MUST NOT / SHOULD NOT)을 금지 항목으로 끌어올린다. */
function prohibitedRules(componentId: string): string[] {
  const rules = portableComponentMap()[componentId]?.rules
  if (!Array.isArray(rules)) return []
  return rules.map(String).filter((rule) => /\b(MUST NOT|SHOULD NOT)\b/.test(rule))
}

export function componentContract(componentId: string): Record<string, unknown> {
  const portableComponents = (AIDE_DESIGN_CONTRACT.components ?? {}) as Record<string, Record<string, unknown>>
  const productRegistry = (AUI_PRODUCT_CONTRACT.component_registry ?? {}) as Record<string, unknown>
  const registryDefaults = dict(productRegistry.defaults)
  const componentDefaults = dict(AUI_PRODUCT_CONTRACT.component_defaults)
  const tokenBindings = (productRegistry.token_bindings ?? {}) as Record<string, unknown>
  const portable = portableComponents[componentId] ?? {}
  const product = AUI_COMPONENTS[componentId] ?? {}
  const recipe = AUI_COMPONENT_RECIPES[componentId] ?? {}
  const familyId = typeof recipe.family === 'string' ? recipe.family : undefined
  const familyRecipe = familyId ? AUI_COMPONENT_RECIPE_FAMILIES[familyId] ?? {} : {}
  const sourceOverrides = dict(productRegistry.source_overrides)
  const rendererTemplate = typeof registryDefaults.renderer === 'string' ? registryDefaults.renderer : undefined
  const renderer = sourceOverrides[componentId] ?? rendererTemplate?.replace('<component>', componentId)
  const related = relatedComponents(componentId)
  const prohibited = prohibitedRules(componentId)
  const props = { ...dict(familyRecipe.properties), ...dict(recipe.properties) }
  // component_tokens에서 파생한 표가 값과 용도를 모두 담으므로 우선한다. 손으로 적은
  // `sizes`는 이름만 있거나 일부만 담고 있어 파생본의 부분집합이다. component_tokens가
  // 없는 DESIGN.md에서만 손으로 적은 값으로 되돌아간다.
  const derivedSizes = componentSizes(componentId)
  const sizes = Object.keys(derivedSizes).length ? derivedSizes : (portable.sizes ?? product.sizes)
  return {
    category: componentCategory(componentId),
    status: registryDefaults.status ?? 'stable',
    ...(renderer ? { renderer } : {}),
    ...portable,
    ...product,
    ...(() => {
      const described = anatomyWithDescriptions(product.anatomy ?? portable.anatomy)
      return described ? { anatomy: described } : {}
    })(),
    // `props`는 recipe.properties가 실체다. page_template이 별도 섹션으로 선언하므로
    // recipe 안에 묻어두지 않고 최상위로 올린다.
    ...(Object.keys(props).length ? { props } : {}),
    ...(sizes && Object.keys(sizes).length ? { sizes } : {}),
    recipe: {
      family: familyId,
      defaults: recipe.default,
      slots: recipe.slots ?? familyRecipe.slots,
      specification: { ...dict(familyRecipe.specification), ...dict(recipe.specification) },
      responsive: familyRecipe.responsive,
      // viewport-modes는 시스템 전역 값이라 56개 컴포넌트 페이지마다 같은 표가 반복된다.
      // 컴포넌트별 반응형 동작은 아래 `responsive` 섹션이 이미 설명한다.
    },
    // 전역 기본 상태로 메우지 않는다. card나 prose 같은 표시용 컴포넌트에 hover/pressed를
    // 붙이면 100% 채워진 것처럼 보이지만 사실이 아니다. 컴포넌트가 직접 선언했거나
    // 소속 family가 선언한 상태만 보여주고, 없으면 섹션 자체를 내보내지 않는다.
    ...(() => {
      const familyStates = dict(familyRecipe.properties).state
      const states = product.states ?? portable.states ?? familyStates
      return states ? { states } : {}
    })(),
    ...(tokenBindings[componentId] ? { 'token-bindings': tokenBindings[componentId] } : {}),
    responsive: product.responsive ?? portable.responsive ?? AUI_PRODUCT_CONTRACT.responsive,
    'implementation-rules': componentDefaults.implementation_rules,
    ...(prohibited.length ? { prohibited } : {}),
    ...(related.length ? { related } : {}),
    accessibility: AUI_PRODUCT_CONTRACT.accessibility ?? AIDE_DESIGN_CONTRACT.accessibility,
  }
}

export function componentPreviewSize(componentId: string): ComponentPreviewSize {
  const registry = dict(AUI_PRODUCT_CONTRACT.component_registry)
  const groups = dict(registry.preview_sizes)
  for (const size of ['compact', 'control', 'wide'] as const) {
    if (Array.isArray(groups[size]) && (groups[size] as unknown[]).includes(componentId)) return size
  }
  return 'control'
}

function dict(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function documentationContent(sectionId: string, pageId: string): Record<string, unknown> {
  const core = AIDE_DESIGN_CONTRACT
  const product = AUI_PRODUCT_CONTRACT

  if (sectionId === 'get-started') {
    const identity = dict(core.identity)
    const byPage: Record<string, Record<string, unknown>> = {
      overview: { identity, schema: core.schema },
      principles: { principles: identity.principles, 'decision-order': core.decision_order, prohibited: core.prohibited },
      adoption: { inheritance: core.inheritance, implementation: dict(core.develop).integration, scope: dict(product.ai).scope_detection },
      architecture: { schema: core.schema, inheritance: core.inheritance, 'component-schema': core.component_schema, validation: core.validation },
    }
    return byPage[pageId] ?? {}
  }

  if (sectionId === 'foundations') {
    const foundation = dict(dict(core.foundations)[pageId])
    const portableTokens = dict(dict(core.tokens)[pageId])
    const productTokens = dict(dict(product.tokens)[pageId])
    return {
      ...foundation,
      ...(Object.keys(portableTokens).length ? { 'portable-tokens': portableTokens } : {}),
      ...(Object.keys(productTokens).length ? { 'product-tokens': productTokens } : {}),
    }
  }

  if (sectionId === 'patterns') {
    const productComponents = dict(product.components)
    const feedback = dict(dict(core.components).feedback)
    const state = dict(dict(core.foundations).state)
    const statePatterns: Record<string, Record<string, unknown>> = {
      loading: { purpose: '진행 중인 작업을 설명하고 최종 구조를 예고한다', states: state.content, component: productComponents.loading, feedback },
      empty: { purpose: '비어 있는 이유와 유용한 다음 행동을 제공한다', component: productComponents['empty-state'], feedback },
      'error-and-recovery': { purpose: '문제를 명확히 설명하고 입력을 보존한 복구 행동을 제공한다', component: productComponents.alert, feedback, accessibility: core.accessibility },
    }
    return {
      ...(statePatterns[pageId] ?? {}),
      ...dict(dict(core.patterns)[pageId]),
      ...dict(dict(product.layouts)[pageId]),
      'responsive-contract': product.responsive ?? core.responsive,
    }
  }

  if (sectionId === 'develop') {
    const portable = dict(core.develop)
    const aide = dict(product.develop)
    const byPage: Record<string, Record<string, unknown>> = {
      installation: { package: aide.package_name, status: aide.status, source: aide.source },
      react: { integration: dict(portable.integration).react, primitives: dict(aide.source).primitives, rules: dict(product.component_defaults).implementation_rules },
      'css-variables': { integration: dict(portable.integration).css, generated: aide.generated, 'token-format': dict(dict(core.schema).token_format) },
      'token-api': { tokens: product.tokens, generated: portable.generated_targets },
      'component-api': { schema: core.component_schema, defaults: product.component_defaults, registry: product.component_registry },
      'responsive-api': { portable: core.responsive, product: product.responsive },
      validation: { portable: portable.verification, commands: aide.commands, validation: product.validation },
      migration: { versioning: portable.versioning, commands: aide.commands },
      changelog: { versioning: portable.versioning, schema: product.schema },
    }
    return byPage[pageId] ?? { portable, product: aide }
  }

  if (sectionId === 'ai-and-tools') {
    const portable = dict(core.ai)
    const aide = dict(product.ai)
    const byPage: Record<string, Record<string, unknown>> = {
      'design-md': { context: aide.context_files, scope: aide.scope_detection, execution: portable.context_order },
      'llms-txt': { delivery: aide.llms_txt, retrieval: portable.retrieval_units },
      skill: { skill: aide.skill, workflow: dict(aide.skill).workflow, 'self-audit': portable.self_audit },
      'prompt-guide': { 'context-order': portable.context_order, 'selection-rules': portable.selection_rules, 'required-output': portable.generation_output },
      validation: { 'self-audit': portable.self_audit, 'product-validation': product.validation },
      export: { delivery: portable.delivery, generated: dict(product.develop).generated },
      mcp: { 'future-integrations': aide.future_integrations, delivery: portable.delivery },
    }
    return byPage[pageId] ?? { portable, product: aide }
  }

  return {}
}

export function allComponents() {
  return Object.entries(AUI_COMPONENT_CATEGORIES).flatMap(([category, componentIds]) =>
    componentIds.map((id) => ({
      id,
      title: humanizeId(id),
      category,
      previewSize: componentPreviewSize(id),
      // 카탈로그 카드가 목록에서 바로 고를 수 있도록 한 줄 목적을 함께 넘긴다.
      purpose: (() => {
        const value = portableComponentMap()[id]?.purpose ?? AUI_COMPONENTS[id]?.purpose
        return typeof value === 'string' ? value : ''
      })(),
      contract: AUI_COMPONENTS[id] ?? {},
    })),
  )
}
