import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { analyzeScreensToDesignMd } from '@/lib/gemini'

export const maxDuration = 120

/**
 * URL이 없는 서비스의 캡처 이미지로 DESIGN.md를 만든다.
 *
 * 배율(1x/2x/3x)을 모르면 spacing·radius·font-size가 전부 배수로 틀어지므로,
 * 모델 추정에만 맡기지 않고 서버에서 실제 픽셀 크기를 재서 함께 넘긴다.
 */

const MAX_IMAGES = 10
const MAX_TOTAL_BYTES = 24 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function POST(req: NextRequest) {
  try {
    const { images, serviceName } = await req.json() as { images?: unknown; serviceName?: unknown }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: '캡처 이미지를 1장 이상 첨부해주세요.' }, { status: 400 })
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `캡처는 최대 ${MAX_IMAGES}장까지 분석할 수 있습니다.` }, { status: 400 })
    }

    const prepared: Array<{ data: string; mimeType: string; width?: number; height?: number }> = []
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

      // 크기 측정에 실패해도 분석은 진행한다. 배율 추정만 모델에 맡겨진다.
      let width: number | undefined
      let height: number | undefined
      try {
        const meta = await sharp(Buffer.from(data, 'base64')).metadata()
        width = meta.width
        height = meta.height
      } catch {
        // 손상된 이미지가 아니라 포맷 메타 누락일 수 있어 여기서 막지 않는다.
      }
      prepared.push({ data, mimeType, width, height })
    }

    const label = typeof serviceName === 'string' && serviceName.trim()
      ? serviceName.trim().slice(0, 100)
      : '캡처 화면'

    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const designMd = await analyzeScreensToDesignMd(prepared, label, apiKey)

    if (!designMd) {
      return NextResponse.json({ error: '캡처에서 디자인 시스템을 읽지 못했습니다.' }, { status: 422 })
    }

    return NextResponse.json({
      designMd,
      sourceLabel: label,
      dimensions: prepared.map(p => ({ width: p.width ?? null, height: p.height ?? null })),
    })
  } catch (error) {
    console.error('[analyze-screens-design-md] error:', error)
    return NextResponse.json({ error: '캡처 분석에 실패했습니다.' }, { status: 500 })
  }
}
