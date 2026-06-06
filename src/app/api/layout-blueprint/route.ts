import { NextRequest, NextResponse } from 'next/server'
import { generateLayoutBlueprints, generateDesignIntentAndHeroVisualPlan, type AideGenerationPlan, type AppDomain, type PlatformType } from '@/lib/gemini'
import { getVariantStyles } from '@/lib/variant-refs'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const {
      designMd,
      brief,
      answers,
      projectSummary,
      platform,
      domain,
      generationPlan,
    } = await req.json() as {
      designMd?: string
      brief?: string
      answers?: Record<string, string | string[]>
      projectSummary?: string
      platform?: PlatformType
      domain?: AppDomain
      generationPlan?: AideGenerationPlan
    }

    if (!brief?.trim()) {
      return NextResponse.json({ error: '기획서를 입력해주세요' }, { status: 400 })
    }

    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const effectivePlatform: PlatformType = platform === 'web' ? 'web' : 'mobile'
    const effectiveDomain: AppDomain = domain ?? 'other'
    const variantStyles = getVariantStyles(effectiveDomain)

    const answersText = Object.entries(answers ?? {})
      .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n')

    // Blueprint + 3개 design intent 동시 계산 — A/B/C 생성 시 재계산 불필요
    const [blueprints, intentA, intentB, intentC] = await Promise.all([
      generateLayoutBlueprints({
        designMd: designMd ?? '',
        brief,
        answers: answers ?? {},
        projectSummary: projectSummary ?? brief,
        platform: effectivePlatform,
        domain: effectiveDomain,
        generationPlan,
        apiKey,
      }),
      generateDesignIntentAndHeroVisualPlan({
        brief, answersText, designMd: designMd ?? '',
        generationPlan, variantStyle: variantStyles[0],
        platform: effectivePlatform, domain: effectiveDomain, apiKey,
      }),
      generateDesignIntentAndHeroVisualPlan({
        brief, answersText, designMd: designMd ?? '',
        generationPlan, variantStyle: variantStyles[1],
        platform: effectivePlatform, domain: effectiveDomain, apiKey,
      }),
      generateDesignIntentAndHeroVisualPlan({
        brief, answersText, designMd: designMd ?? '',
        generationPlan, variantStyle: variantStyles[2],
        platform: effectivePlatform, domain: effectiveDomain, apiKey,
      }),
    ])

    return NextResponse.json({ blueprints, designIntents: [intentA, intentB, intentC] })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: `스켈레톤 생성 중 오류가 발생했습니다: ${message}` }, { status: 500 })
  }
}
