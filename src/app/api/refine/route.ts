import { NextRequest, NextResponse } from 'next/server'
import { refineUI, resolveImagePlaceholders } from '@/lib/gemini'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { html, message, brief, designMd } = await req.json()
    const apiKey = req.headers.get('x-gemini-key') ?? undefined

    let text = await refineUI(html, message, brief, designMd, apiKey)
    text = await resolveImagePlaceholders(text, { apiKey })

    if (!text.includes('<html') && !text.includes('<!DOCTYPE')) {
      return NextResponse.json({ error: '유효한 HTML이 반환되지 않았습니다' }, { status: 500 })
    }

    return NextResponse.json({ html: text, summary: '수정이 완료되었습니다.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: `수정 중 오류가 발생했습니다: ${message}` }, { status: 500 })
  }
}
