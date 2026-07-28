import {
  AUI_COMPONENT_CATEGORIES,
  AUI_COMPONENTS,
  AUI_COMPONENT_RECIPES,
  AUI_COMPONENT_RECIPE_FAMILIES,
  AUI_COMPONENT_RECIPE_MODES,
  AUI_DOCUMENTATION,
  AUI_PRODUCT_CONTRACT,
} from './aide-product-tokens'
import { WONHEE_DESIGN_CONTRACT } from './wonhee-design-contract'

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
  return id
    .split('-')
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
      { id: 'overview', title: 'Overview', href: '/aide-ui/components' },
      { id: 'progress-board', title: 'Progress Board', href: '/aide-ui/components/progress-board' },
      ...Object.values(AUI_COMPONENT_CATEGORIES).flat().map((id) => ({
        id,
        title: humanizeId(id),
        href: `/aide-ui/components/${id}`,
        group: Object.entries(AUI_COMPONENT_CATEGORIES).find(([, ids]) => ids.includes(id))?.[0],
      })),
    ]
  }

  return (page.items ?? []).map((id) => ({
    id,
    title: humanizeId(id),
    href: sectionId === 'get-started' && id === 'overview'
      ? '/aide-ui'
      : sectionId === 'get-started'
        ? `/aide-ui/get-started/${id}`
      : `${sectionHref(sectionId)}/${id}`,
  }))
}

export function componentCategory(componentId: string) {
  return Object.entries(AUI_COMPONENT_CATEGORIES)
    .find(([, componentIds]) => componentIds.includes(componentId))?.[0] ?? 'components'
}

export function componentContract(componentId: string): Record<string, unknown> {
  const portableComponents = (WONHEE_DESIGN_CONTRACT.components ?? {}) as Record<string, Record<string, unknown>>
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
  return {
    category: componentCategory(componentId),
    status: registryDefaults.status ?? 'stable',
    ...(renderer ? { renderer } : {}),
    ...portable,
    ...product,
    recipe: {
      family: familyId,
      defaults: recipe.default,
      properties: { ...dict(familyRecipe.properties), ...dict(recipe.properties) },
      slots: recipe.slots ?? familyRecipe.slots,
      specification: { ...dict(familyRecipe.specification), ...dict(recipe.specification) },
      responsive: familyRecipe.responsive,
      'viewport-modes': AUI_COMPONENT_RECIPE_MODES,
    },
    states: product.states ?? portable.states ?? componentDefaults.states,
    ...(tokenBindings[componentId] ? { 'token-bindings': tokenBindings[componentId] } : {}),
    responsive: product.responsive ?? portable.responsive ?? AUI_PRODUCT_CONTRACT.responsive,
    'implementation-rules': componentDefaults.implementation_rules,
    accessibility: AUI_PRODUCT_CONTRACT.accessibility ?? WONHEE_DESIGN_CONTRACT.accessibility,
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
  const core = WONHEE_DESIGN_CONTRACT
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
      contract: AUI_COMPONENTS[id] ?? {},
    })),
  )
}
