import { NextRequest, NextResponse } from 'next/server'
import { generateHeroImage, extractDesignPaletteHint } from '@/lib/gemini'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const body = await req.json() as { subject: string; designMd?: string }
    const { subject, designMd } = body
    if (!subject) return NextResponse.json({ error: 'subject required' }, { status: 400 })

    const paletteHint = designMd ? extractDesignPaletteHint(designMd) : undefined
    const result = await generateHeroImage(subject, apiKey, 'scene-card-cover', paletteHint)
    if (!result) return NextResponse.json({ error: 'image generation failed' }, { status: 500 })

    return NextResponse.json({ base64: result.base64, mimeType: result.mimeType })
  } catch (err) {
    console.error('[generate-hero-image]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
