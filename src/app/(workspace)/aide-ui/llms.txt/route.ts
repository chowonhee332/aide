import {
  AUI_AI_GUIDE,
  AUI_COMPONENT_CATEGORIES,
  AUI_COMPONENTS,
  AUI_DEVELOP_COMMANDS,
  AUI_DOCUMENTATION,
  AUI_PRODUCT_CONTRACT,
  AUI_SCHEMA_VERSION,
  AUI_TOKEN_ENTRIES,
} from '@/lib/aide-product-tokens'
import { AIDE_DESIGN_CONTRACT } from '@/lib/aide-design-contract'
import { humanizeId } from '@/lib/aide-docs'

/**
 * `/aide-ui/llms.txt` — the AI-retrieval entrypoint declared by
 * `contract.ai.llms_txt` in aide.md.
 *
 * Every line is derived from the unified contract, so the file cannot drift from
 * the design system. Section order follows `contract.ai.llms_txt.contents`.
 */

const ROUTE = '/aide-ui/llms.txt'

// The contract declares where this file lives; fail the build if they disagree.
const declaredRoute = AUI_AI_GUIDE.llmsTxt?.route
if (declaredRoute && declaredRoute !== ROUTE) {
  throw new Error(
    `aide.md: contract.ai.llms_txt.route is "${declaredRoute}" but the handler serves "${ROUTE}"`,
  )
}

type Dict = Record<string, unknown>
const dict = (value: unknown): Dict => (value && typeof value === 'object' ? (value as Dict) : {})
const str = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Contract entries describe themselves with `purpose`, sometimes `rule`. Both are optional. */
function describe(...sources: unknown[]): string {
  for (const source of sources) {
    const entry = dict(source)
    const text = str(entry.purpose) || str(entry.rule) || str(entry.summary)
    if (text) return text
  }
  return ''
}

/** `- [Label](href): purpose` — the line shape llms.txt readers expect. */
function indexLine(id: string, href: string, description: string): string {
  return `- [${humanizeId(id)}](${href})${description ? `: ${description}` : ''}`
}

function overview(): string {
  const identity = dict(AUI_PRODUCT_CONTRACT.identity)
  const character = Array.isArray(identity.character) ? (identity.character as Dict[]) : []
  const interactionPrinciplesSource = dict(AIDE_DESIGN_CONTRACT.ai).interaction_principles
  const interactionPrinciples = Array.isArray(interactionPrinciplesSource)
    ? interactionPrinciplesSource
    : []
  const scope = dict(dict(AUI_PRODUCT_CONTRACT.ai).scope_detection)

  const lines = [
    `# ${AUI_DOCUMENTATION.title}`,
    '',
    `> ${AUI_DOCUMENTATION.description}`,
    '',
    `- Schema: v${AUI_SCHEMA_VERSION} · ${AUI_TOKEN_ENTRIES.length} tokens · ${Object.keys(AUI_COMPONENTS).length} components`,
    `- Docs: ${AUI_DOCUMENTATION.route}`,
    '',
    '## Principles',
    '',
    ...character.map((item) => `- **${str(item.id)}**: ${str(item.rule)}`),
    '',
    '### AI interaction',
    '',
    ...interactionPrinciples.map((principle) => `- ${str(principle)}`),
    '',
    '## Scope',
    '',
    ...Object.entries(scope).map(([key, rule]) => `- **${key}**: ${str(rule)}`),
  ]
  return lines.join('\n')
}

function contractLinks(): string {
  const develop = dict(AUI_PRODUCT_CONTRACT.develop)
  const source = dict(develop.source)
  const generated = dict(develop.generated)
  const contracts = Array.isArray(source.contracts) ? (source.contracts as string[]) : []

  return [
    '## Contract files',
    '',
    'Read these before generating any product UI.',
    '',
    ...contracts.map((file) => `- \`${file}\``),
    '',
    ...Object.entries({ ...source, ...generated })
      .filter(([key]) => key !== 'contracts')
      .map(([key, value]) => `- ${key.replace(/_/g, ' ')}: \`${str(value)}\``),
  ].join('\n')
}

function foundationIndex(): string {
  const page = AUI_DOCUMENTATION.pages.foundations
  const items = page?.items ?? []
  const foundations = dict(AIDE_DESIGN_CONTRACT.foundations)

  return [
    '## Foundations',
    '',
    ...items.map((id) =>
      indexLine(id, `${AUI_DOCUMENTATION.route}/foundations/${id}`, describe(foundations[id])),
    ),
  ].join('\n')
}

function componentIndex(): string {
  // A product component may inherit its purpose from the base contract.
  const baseComponents = dict(AIDE_DESIGN_CONTRACT.components)
  const lines = ['## Components', '']

  for (const [category, ids] of Object.entries(AUI_COMPONENT_CATEGORIES)) {
    lines.push(`### ${humanizeId(category)}`, '')
    for (const id of ids) {
      const description = describe(AUI_COMPONENTS[id], baseComponents[id])
      lines.push(indexLine(id, `${AUI_DOCUMENTATION.route}/components/${id}`, description))
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

function patternIndex(): string {
  const patterns = dict(AIDE_DESIGN_CONTRACT.patterns)
  const layouts = dict(AUI_PRODUCT_CONTRACT.layouts)

  return [
    '## Patterns',
    '',
    ...Object.entries(patterns).map(([id, value]) =>
      indexLine(id, `${AUI_DOCUMENTATION.route}/patterns/${id}`, describe(value)),
    ),
    '',
    '### Product layouts',
    '',
    ...Object.entries(layouts).map(([id, value]) => {
      const composition = dict(value).composition
      const shape = Array.isArray(composition) ? composition.join(' + ') : str(composition)
      return `- **${humanizeId(id)}**${shape ? `: ${shape}` : ''}`
    }),
  ].join('\n')
}

function developCommands(): string {
  const skill = AUI_AI_GUIDE.skill ?? {}
  const workflow = Array.isArray(skill.workflow) ? skill.workflow : []

  return [
    '## Develop',
    '',
    ...Object.entries(AUI_DEVELOP_COMMANDS).map(([name, command]) => {
      const value = Array.isArray(command) ? command.join(' && ') : str(command)
      return `- ${name}: \`${value}\``
    }),
    '',
    '### Agent workflow',
    '',
    ...(skill.purpose ? [skill.purpose, ''] : []),
    ...workflow.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Prohibited',
    '',
    ...(Array.isArray(AUI_PRODUCT_CONTRACT.prohibited)
      ? (AUI_PRODUCT_CONTRACT.prohibited as string[]).map((rule) => `- ${rule}`)
      : []),
  ].join('\n')
}

const SECTION_BUILDERS: Record<string, () => string> = {
  overview,
  'contract-links': contractLinks,
  'foundation-index': foundationIndex,
  'component-index': componentIndex,
  'pattern-index': patternIndex,
  'develop-commands': developCommands,
}

// A declared section with no builder would silently vanish from the output.
const declaredSections = AUI_AI_GUIDE.llmsTxt?.contents ?? Object.keys(SECTION_BUILDERS)
const unknownSections = declaredSections.filter((id) => !SECTION_BUILDERS[id])
if (unknownSections.length) {
  throw new Error(
    `aide.md: contract.ai.llms_txt.contents has no builder for: ${unknownSections.join(', ')}`,
  )
}

export const dynamic = 'force-static'

export function GET() {
  const body = declaredSections.map((id) => SECTION_BUILDERS[id]()).join('\n\n')

  return new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
