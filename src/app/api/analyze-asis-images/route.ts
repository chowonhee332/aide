import { NextRequest, NextResponse } from 'next/server'
import { analyzeScreensToAsIsAnalysis } from '@/lib/gemini'

export const maxDuration = 120

/**
 * URL이 없는 as-is 서비스(네이티브 앱, 사내 시스템, 접근 차단 사이트)를 위한 경로.
 * 캡처 이미지를 받아 analyze-asis-url과 동일한 AsIsAnalysis 스키마로 돌려준다.
 */

const MAX_IMAGES = 12
const MAX_TOTAL_BYTES = 24 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function POST(req: NextRequest) {
  try {
    const { images, serviceName } = await req.json() as {
      images?: unknown
      serviceName?: unknown
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: '캡처 이미지를 1장 이상 첨부해주세요.' }, { status: 400 })
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `캡처는 최대 ${MAX_IMAGES}장까지 분석할 수 있습니다.` },
        { status: 400 },
      )
    }

    const normalized: Array<{ data: string; mimeType: string }> = []
    let totalBytes = 0
    for (const image of images) {
      const data = (image as { data?: unknown })?.data
      const mimeType = (image as { mimeType?: unknown })?.mimeType
      if (typeof data !== 'string' || !data) {
        return NextResponse.json({ error: '이미지 데이터가 올바르지 않습니다.' }, { status: 400 })
      }
      if (typeof mimeType !== 'string' || !ALLOWED_MIME.has(mimeType)) {
        return NextResponse.json({ error: 'PNG, JPEG, WebP 이미지만 지원합니다.' }, { status: 400 })
      }
      totalBytes += Math.floor((data.length * 3) / 4)
      if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json({ error: '이미지 용량 합계가 너무 큽니다.' }, { status: 413 })
      }
      normalized.push({ data, mimeType })
    }

    const label = typeof serviceName === 'string' && serviceName.trim()
      ? serviceName.trim().slice(0, 100)
      : '캡처 화면'

    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const analysis = await analyzeScreensToAsIsAnalysis(normalized, label, apiKey)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('[analyze-asis-images] error:', error)
    return NextResponse.json({ error: '캡처 화면 분석에 실패했습니다.' }, { status: 500 })
  }
}
