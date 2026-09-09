import analysis from './generation-methods/analysis.md'
import composition from './generation-methods/composition.md'
import image from './generation-methods/image.md'
import review from './generation-methods/review.md'
import expansion from './generation-methods/expansion.md'

// Explicit imports use the existing MD asset loader: no cwd-dependent file IO,
// discovery of user-installed skills, or caller-controlled paths at runtime.
export const GENERATION_METHOD_LIMITS = {
  analysis: 1800,
  composition: 1700,
  image: 1000,
  review: 1100,
  expansion: 900,
} as const

export type GenerationMethodStage = keyof typeof GENERATION_METHOD_LIMITS

export function compileGenerationMethod(stage: GenerationMethodStage, source: string): string {
  if (!Object.hasOwn(GENERATION_METHOD_LIMITS, stage)) {
    throw new Error(`[generation-methodology] Unknown stage: ${stage}`)
  }
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
  const header = normalized.match(/^<!-- aide-methodology: ([a-z]+)@([1-9]\d*) -->\n/)
  if (!header || header[1] !== stage) {
    throw new Error(`[generation-methodology] Invalid id/version for ${stage}`)
  }
  const body = normalized.slice(header[0].length).trim()
  for (const section of ['Input', 'Method', 'Output', 'Guardrails']) {
    if (!new RegExp(`^## ${section}\\n\\S`, 'm').test(body)) {
      throw new Error(`[generation-methodology] Missing ${section} for ${stage}`)
    }
  }
  const prompt = `## Aide methodology ${stage}@${header[2]}\n${body}`
  if (prompt.length > GENERATION_METHOD_LIMITS[stage]) {
    throw new Error(`[generation-methodology] ${stage} exceeds character budget`)
  }
  return prompt
}

const sources = { analysis, composition, image, review, expansion }
const methods = Object.fromEntries(
  (Object.keys(sources) as GenerationMethodStage[]).map(stage => [stage, compileGenerationMethod(stage, sources[stage])]),
) as Record<GenerationMethodStage, string>

/** One stage per existing model call; this does not invoke a model or a tool. */
export function getGenerationMethodology(stage: GenerationMethodStage): string {
  if (!Object.hasOwn(methods, stage)) {
    throw new Error(`[generation-methodology] Unknown stage: ${stage}`)
  }
  return methods[stage]
}
