import { NextRequest, NextResponse } from 'next/server'
import { extractDocumentToMarkdown } from '@/lib/gemini'

export const maxDuration = 180

/**
 * RFP·기능요구사항을 텍스트로 확정하는 전처리 경로.
 *
 * PDF(네이티브·스캔본)와 페이지 캡처 이미지를 모두 받는다. 결과는 텍스트라
 * 기존 prdDoc에 그대로 들어가고, 생성 파이프라인은 무변경으로 남는다.
 * 여러 장은 한 문서로 묶어 넘긴다 — 요구사항 표는 행이 페이지를 넘어가므로
 * 낱장으로 나눠 읽으면 잘린 행을 복원하지 못한다.
 */

const MAX_FILES = 20
const MAX_TOTAL_BYTES = 24 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
])

export async function POST(req: NextRequest) {
  try {
    const { files, fileName } = await req.json() as { files?: unknown; fileName?: unknown }

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `한 번에 최대 ${MAX_FILES}장까지 첨부할 수 있습니다.` },
        { status: 400 },
      )
    }

    const prepared: Array<{ data: string; mimeType: string }> = []
    let totalBytes = 0
    let pdfCount = 0
    for (const file of files) {
      const data = (file as { data?: unknown })?.data
      const mimeType = (file as { mimeType?: unknown })?.mimeType
      if (typeof data !== 'string' || !data) {
        return NextResponse.json({ error: '파일 데이터가 올바르지 않습니다.' }, { status: 400 })
      }
      if (typeof mimeType !== 'string' || !ALLOWED_MIME.has(mimeType)) {
        return NextResponse.json({ error: 'PDF, PNG, JPEG, WebP만 지원합니다.' }, { status: 400 })
      }
      if (mimeType === 'application/pdf') pdfCount += 1

      totalBytes += Math.floor((data.length * 3) / 4)
      if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json(
          { error: `용량 합계가 너무 큽니다. ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB 이하로 올려주세요.` },
          { status: 413 },
        )
      }
      prepared.push({ data, mimeType })
    }

    // PDF는 그 자체가 다중 페이지 문서다. 이미지와 섞으면 페이지 순서를 보장할 수 없다.
    if (pdfCount > 0 && prepared.length > 1) {
      return NextResponse.json(
        { error: 'PDF는 한 번에 한 개씩 올려주세요. 이미지는 여러 장을 함께 올릴 수 있습니다.' },
        { status: 400 },
      )
    }

    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const text = await extractDocumentToMarkdown(prepared, apiKey)

    if (!text) {
      return NextResponse.json(
        { error: '문서에서 내용을 읽지 못했습니다. 스캔 품질이 낮거나 보호된 파일일 수 있습니다.' },
        { status: 422 },
      )
    }

    const label = typeof fileName === 'string' && fileName ? fileName : '첨부 문서'
    return NextResponse.json({ text, fileName: label, chars: text.length, pages: prepared.length })
  } catch (error) {
    console.error('[parse-document] error:', error)
    return NextResponse.json({ error: '문서 분석에 실패했습니다.' }, { status: 500 })
  }
}
