import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parse } from 'yaml'

const read = (file) => fs.readFileSync(file, 'utf8')
const aide = read('src/lib/design-systems/aide.md')
const fenced = aide.match(/```yaml\n([\s\S]*?)\n```/)
assert.ok(fenced, 'aide.md must contain the machine-readable contract')
const contract = parse(fenced[1]).contract
assert.equal(contract.schema.id, 'aide-design-system-contract')
assert.equal(contract.schema.kind, 'unified-design-system')
assert.ok(contract.tokens && contract.component_tokens && contract.components)
assert.ok(contract.visualization && contract.documentation && contract.patterns)
assert.ok(contract.consumers.canonical.includes('aide-product-chrome'))
assert.ok(contract.consumers.canonical.includes('generated-customer-ui-default'))
assert.deepEqual(contract.consumers.external_override, ['uploaded-design-md'])

const buttonVariants = contract.components.button.variants
assert.deepEqual(buttonVariants, ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'])
assert.deepEqual(contract.component_recipes.items.button.properties.variant, buttonVariants)
const buttonSource = read('src/components/ui/button.tsx')
for (const variant of buttonVariants) assert.match(buttonSource, new RegExp(`\\b${variant}:`), `Button source must implement ${variant}`)
assert.doesNotMatch(buttonSource, /\bdefault:\s*"bg-primary/, 'Primary must not be named default')

const productLoader = read('src/lib/aide-product-tokens.ts')
const coreLoader = read('src/lib/aide-design-contract.ts')
const generator = read('src/lib/gemini.ts')
const exporter = read('scripts/design-system.mjs')
assert.match(productLoader, /design-systems\/aide\.md/)
assert.match(coreLoader, /design-systems\/aide\.md/)
assert.match(generator, /design-systems', 'aide\.md'/)
assert.match(exporter, /design-systems\/aide\.md/)
assert.doesNotMatch(productLoader, /wonhee-product-ui\.md/)
assert.doesNotMatch(coreLoader, /wonhee-design\.md/)

// documentation.pages.components.page_template이 선언한 섹션은 실제로 렌더링되어야 한다.
// 선언만 하고 그리지 않으면 문서가 계약을 어기는 상태가 되고, 그대로 두면 계속 벌어진다.
// `overview`와 `preview`는 페이지 머리말과 프리뷰 블록이 담당하므로 파생 대상에서 제외한다.
const pageTemplate = contract.documentation.pages.components.page_template
assert.ok(Array.isArray(pageTemplate) && pageTemplate.length, 'components page_template must be declared')

const docsSource = read('src/lib/aide-docs.ts')
const componentEntries = Object.values(contract.components).filter((entry) => entry && !entry.members)
const recipeItems = Object.values(contract.component_recipes.items ?? {})
const recipeFamilies = Object.values(contract.component_recipes.families ?? {})
const someComponent = (key) => componentEntries.some((entry) => entry[key])

// 각 섹션이 어디서 데이터를 받는지. `overview`/`preview`는 페이지 머리말과 프리뷰 블록이
// 담당하므로 계약 공급원을 요구하지 않는다.
const SECTION_SOURCE = {
  overview: () => true,
  preview: () => true,
  usage: () => someComponent('usage'),
  anatomy: () => someComponent('anatomy') || someComponent('slots'),
  props: () => [...recipeItems, ...recipeFamilies].some((recipe) => recipe?.properties),
  variants: () => someComponent('variants'),
  sizes: () => someComponent('sizes'),
  states: () => someComponent('states'),
  responsive: () => Boolean(contract.responsive) || someComponent('responsive'),
  accessibility: () => Boolean(contract.accessibility),
  'token-bindings': () => Boolean(contract.component_registry?.token_bindings),
  // 파생 섹션 — aide-docs.ts가 계약에서 만들어 낸다.
  prohibited: () => /function prohibitedRules\b/.test(docsSource),
  related: () => /function relatedComponents\b/.test(docsSource),
}

for (const section of pageTemplate) {
  const supplier = SECTION_SOURCE[section]
  assert.ok(supplier, `page_template declares "${section}" but nothing supplies it`)
  assert.ok(supplier(), `page_template declares "${section}" but its contract source is empty`)
}

// 조작 패널은 ComponentPreview 의 `case` 별 props 사용으로 걸러진다.
// 계약이 family 단위로 선언한 prop 이 그 컴포넌트에는 해당하지 않는 경우가 많아,
// 전역 목록으로 거르면 눌러도 반응 없는 컨트롤이 남는다.
const coverageSource = read('src/lib/aide-component-coverage.ts')
assert.match(coverageSource, /export function previewCaseProps\(\)/, 'previewCaseProps must derive panel props from ComponentPreview source')
const docsPageSource = read('src/components/aide-docs/DocsPage.tsx')
assert.match(docsPageSource, /previewCaseProps\(\)\.get\(componentId\)/, 'component page must filter panel props per component')

console.log('Unified Aide design-system contract checks passed.')
