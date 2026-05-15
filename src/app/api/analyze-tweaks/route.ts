import { NextRequest, NextResponse } from 'next/server'
import { analyzeTweaks } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { html, brief } = await req.json()
    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const spec = await analyzeTweaks(html, brief, apiKey)
    return NextResponse.json(spec)
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
