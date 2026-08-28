import { parse as parseYaml } from 'yaml'
import { isLeaf, resolveAliases } from './design-token-alias.mjs'

/**
 * DESIGN.md는 두 가지 형태로 존재한다.
 *
 * 1. `---` frontmatter에 평면 `colors:` / `spacing:` / `components:`를 쓰는 형태 (ktds.md)
 * 2. 펜스드 ```yaml 블록에 DTCG(`$value`) 기반 `contract:`를 쓰는 형태 (aide.md)
 *
 * gemini.ts의 프롬프트 계약 컴파일러는 1번만 읽도록 작성되어 있어서, 2번 형태인
 * aide.md는 컴포넌트 계약이 하나도 인식되지 않았다(`components: 0개`).
 * 이 모듈은 2번 형태를 1번과 같은 평면 구조로 정규화해, 기존 소비자가 형태를
 * 구분하지 않고 쓸 수 있게 한다. alias(`{dimension.space-4}`) 해석은 반드시
 * `design-token-alias.mjs`를 재사용한다 — 여기서 다시 구현하지 말 것.
 */
export interface FlatDesignContract {
  colors: Record<string, string>
  spacing: Record<string, string>
  rounded: Record<string, string>
  components: Record<string, Record<string, string>>
  /**
   * `contract.responsive`에서 뽑은 레이아웃 리듬 값. 평면 `layout:` 맵과 같은 키를 쓴다
   * (`page-padding`, `page-padding-web`, `gutter`). aide.md는 이 값을 토큰 스케일이 아니라
   * `responsive.modes.*`에 두므로, 이게 없으면 소비자가 `dimension` 스케일에서 엉뚱한
   * 토큰(예: `control-prominent` 48px)을 페이지 여백으로 뽑는다.
   */
  layout: Record<string, string>
  /**
   * `contract.tokens.typography` 역할별 스케일. `flattenTokenGroup`은 스칼라만 펴므로
   * composite typography($value가 객체) 토큰은 여기서 따로 뽑는다. 값은 `size/line/weight`.
   */
  typography: Record<string, { size: string; line: string; weight: string }>
  /** `contract.tokens.shadow` — role → box-shadow value. Model otherwise inlines raw rgba(). */
  shadow: Record<string, string>
}

/** DTCG 그룹(`{ key: { $value, $description } }`)을 평면 `key: value`로 편다. */
function flattenTokenGroup(group: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (typeof group !== 'object' || group === null) return result
  for (const [key, leaf] of Object.entries(group as Record<string, unknown>)) {
    if (key.startsWith('$') || !isLeaf(leaf)) continue
    const value = (leaf as { $value: unknown }).$value
    if (typeof value === 'string' || typeof value === 'number') result[key] = String(value)
  }
  return result
}

/**
 * `contract.component_tokens`는 `default-height` / `default-padding-x`처럼 이름이
 * 구체적이다. 기존 소비자(`pickComponentValue`)는 `height` / `padding`을 찾으므로
 * 표준 이름을 함께 노출해 준다. 원본 키도 그대로 남긴다.
 */
function withCanonicalProps(props: Record<string, string>): Record<string, string> {
  const result = { ...props }
  const height = props['default-height'] ?? props['height']
  if (height && !result.height) result.height = height
  const paddingX = props['default-padding-x'] ?? props['padding-inline']
  if (paddingX && !result.padding) result.padding = `0 ${paddingX}`
  const gap = props['default-gap'] ?? props['gap']
  if (gap && !result.gap) result.gap = gap
  const radius = props['default-radius'] ?? props['radius']
  if (radius && !result.radius) result.radius = radius
  return result
}

/** `component_tokens`의 그룹 이름을 기존 계약 어휘로도 찾을 수 있게 별칭을 단다. */
const COMPONENT_ALIASES: Record<string, string[]> = {
  button: ['button-primary'],
  field: ['input-default'],
}

export function parseFencedDesignContract(designMd: string): FlatDesignContract | null {
  const fenced = designMd.match(/```yaml\n([\s\S]*?)\n```/)
  if (!fenced) return null

  let contract: Record<string, unknown> | undefined
  try {
    contract = (parseYaml(fenced[1]) as { contract?: Record<string, unknown> })?.contract
  } catch {
    return null
  }
  if (!contract) return null

  const rawTokens = contract.tokens as Record<string, unknown> | undefined
  if (!rawTokens) return null
  const rawComponentTokens = (contract.component_tokens ?? {}) as Record<string, unknown>
  const layout = flattenResponsiveLayout(contract)

  let tokens: Record<string, unknown>
  let componentTokens: Record<string, unknown>
  try {
    const roots = { ...rawTokens, tokens: rawTokens, component_tokens: rawComponentTokens }
    const options = { label: 'DESIGN.md contract' }
    tokens = resolveAliases(rawTokens, roots, options) as Record<string, unknown>
    componentTokens = resolveAliases(rawComponentTokens, roots, options) as Record<string, unknown>
  } catch {
    // alias가 깨진 문서라도 계약 전체를 버리지 않는다. 해석 없이 원본으로 진행한다.
    tokens = rawTokens
    componentTokens = rawComponentTokens
  }

  const components: Record<string, Record<string, string>> = {}
  for (const [name, members] of Object.entries(componentTokens)) {
    const flat = withCanonicalProps(flattenTokenGroup(members))
    if (!Object.keys(flat).length) continue
    components[name] = flat
    for (const alias of COMPONENT_ALIASES[name] ?? []) components[alias] = flat
  }

  return {
    colors: flattenTokenGroup(tokens.color),
    spacing: flattenTokenGroup(tokens.dimension),
    rounded: flattenTokenGroup(tokens.radius),
    components,
    layout,
    typography: flattenTypography(tokens.typography),
    shadow: flattenTokenGroup(tokens.shadow),
  }
}

/** composite typography 토큰(`$value: { fontSize, fontWeight, lineHeight }`)을 role → {size,line,weight}로 편다. */
function flattenTypography(group: unknown): Record<string, { size: string; line: string; weight: string }> {
  const result: Record<string, { size: string; line: string; weight: string }> = {}
  if (typeof group !== 'object' || group === null) return result
  for (const [key, leaf] of Object.entries(group as Record<string, unknown>)) {
    if (key.startsWith('$') || typeof leaf !== 'object' || leaf === null) continue
    const value = (leaf as { $value?: unknown }).$value
    if (typeof value !== 'object' || value === null) continue
    const v = value as Record<string, unknown>
    const size = v.fontSize ?? v['font-size']
    if (typeof size !== 'string' && typeof size !== 'number') continue
    const line = v.lineHeight ?? v['line-height'] ?? ''
    const weight = v.fontWeight ?? v['font-weight'] ?? ''
    result[key] = { size: String(size), line: String(line), weight: String(weight) }
  }
  return result
}

/**
 * `contract.responsive.modes.{compact,wide}.page-padding`와 `responsive.grid.gutter`를
 * 평면 `layout:` 맵 키로 정규화한다. 값이 없으면 빈 맵을 돌려주고, 소비자는 기존
 * 토큰 스케일 폴백을 계속 쓴다.
 */
function flattenResponsiveLayout(contract: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  const responsive = contract.responsive as Record<string, unknown> | undefined
  if (!responsive) return result
  const str = (value: unknown): string | undefined =>
    typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
  const modes = responsive.modes as Record<string, Record<string, unknown>> | undefined
  const compact = str(modes?.compact?.['page-padding'])
  if (compact) result['page-padding'] = compact
  const wide = str(modes?.wide?.['page-padding'] ?? modes?.medium?.['page-padding'])
  if (wide) result['page-padding-web'] = wide
  const gutter = str((responsive.grid as Record<string, unknown> | undefined)?.gutter)
  if (gutter) result['gutter'] = gutter
  return result
}
