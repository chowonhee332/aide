import { NextRequest, NextResponse } from 'next/server'
import { analyzeAndGenerateQuestions } from '@/lib/gemini'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { designMd, brief, platform } = await req.json()

    if (!brief?.trim()) {
      return NextResponse.json({ error: '기획서를 입력해주세요' }, { status: 400 })
    }

    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const trimmedDesignMd = (designMd ?? '').slice(0, 2000)
    const result = await analyzeAndGenerateQuestions(trimmedDesignMd, brief, platform, apiKey)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: `분석 중 오류가 발생했습니다: ${message}` }, { status: 500 })
  }
}
