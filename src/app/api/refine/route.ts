import { NextRequest, NextResponse } from 'next/server'
import { refineUI, resolveImagePlaceholders } from '@/lib/gemini'
import fs from 'fs'
import path from 'path'

export const maxDuration = 120

function getDefaultAideLogoBase64(): string {
  try {
    const data = fs.readFileSync(path.join(process.cwd(), 'public', 'logo_aide.png'))
    return `data:image/png;base64,${data.toString('base64')}`
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const { html, message, brief, designMd, logoDataUrl } = await req.json()
    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const unsplashKey = req.headers.get('x-unsplash-key') ?? undefined

    const effectiveLogoDataUrl = (!logoDataUrl || !logoDataUrl.startsWith('data:'))
      ? getDefaultAideLogoBase64()
      : logoDataUrl
    let text = await refineUI(html, message, brief, designMd, apiKey, effectiveLogoDataUrl)
    const imageWarnings: string[] = []
    text = await resolveImagePlaceholders(text, { apiKey, unsplashKey, imageWarnings })

    if (!text.includes('<html') && !text.includes('<!DOCTYPE')) {
      return NextResponse.json({ error: '유효한 HTML이 반환되지 않았습니다' }, { status: 500 })
    }

    return NextResponse.json({ html: text, summary: '수정이 완료되었습니다.', imageWarnings })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: `수정 중 오류가 발생했습니다: ${message}` }, { status: 500 })
  }
}
