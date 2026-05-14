import { NextRequest, NextResponse } from 'next/server'
import { analyzeTweaks } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { html, brief } = await req.json()
    const spec = await analyzeTweaks(html, brief)
    return NextResponse.json(spec)
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
