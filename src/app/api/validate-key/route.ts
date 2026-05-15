import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json() as { apiKey: string }
    if (!apiKey?.trim()) {
      return NextResponse.json({ error: 'API Key를 입력해주세요.' }, { status: 400 })
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() })
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'hi',
      config: { maxOutputTokens: 1, httpOptions: { timeout: 10_000 } },
    })

    return NextResponse.json({ valid: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isAuthError = message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED') || message.includes('invalid API key') || message.includes('401')
    return NextResponse.json(
      { valid: false, error: isAuthError ? '유효하지 않은 API Key입니다.' : `검증 실패: ${message}` },
      { status: isAuthError ? 401 : 500 }
    )
  }
}
