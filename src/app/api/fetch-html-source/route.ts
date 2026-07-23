import { NextRequest, NextResponse } from 'next/server'
import { isSafeUrl } from '@/lib/utils'

export const maxDuration = 30

const MAX_HTML_CHARS = 120_000

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function extractTitle(html: string) {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return title?.replace(/\s+/g, ' ').trim().slice(0, 120) || null
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })
    }

    const normalized = normalizeUrl(url)
    if (!isSafeUrl(normalized)) {
      return NextResponse.json({ error: '허용되지 않는 URL입니다.' }, { status: 400 })
    }

    const res = await fetch(normalized, {
      headers: {
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'user-agent': 'Aide HTML source importer',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      return NextResponse.json({ error: `HTML을 가져오지 못했습니다. (${res.status})` }, { status: 400 })
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (contentType && !/(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
      return NextResponse.json({ error: 'HTML 또는 텍스트 링크만 가져올 수 있습니다.' }, { status: 400 })
    }

    const html = (await res.text()).slice(0, MAX_HTML_CHARS)
    if (!html.trim()) {
      return NextResponse.json({ error: '비어 있는 HTML입니다.' }, { status: 400 })
    }

    return NextResponse.json({
      url: res.url || normalized,
      title: extractTitle(html),
      html,
      truncated: html.length >= MAX_HTML_CHARS,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `HTML 링크 처리 실패: ${message}` }, { status: 500 })
  }
}
