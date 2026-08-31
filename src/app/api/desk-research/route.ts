import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'
import { isSafeUrl } from '@/lib/utils'
import { generatePro } from '@/lib/gemini'
import { GEMINI_ECONOMY_MODEL } from '@/lib/gemini-model-policy'

export const maxDuration = 120

type Ref = { url: string; rationale: string; screenshotBase64: string }

// LLM이 지목한 실제 레퍼런스 사이트를 자체 puppeteer로 캡처한다.
// 외부 API·ToS 의존 없음. 실패는 조용히 스킵하고 generation을 절대 막지 않는다.
export async function POST(req: NextRequest) {
  try {
    const { brief, projectSummary, platform, isLandingIntent } = await req.json()
    if (!brief || typeof brief !== 'string') return NextResponse.json({ references: [] })
    const apiKey = req.headers.get('x-gemini-key') ?? undefined

    const kind = isLandingIntent
      ? '브랜드/제품 랜딩·마케팅 사이트'
      : platform === 'web'
        ? '웹 서비스/제품 사이트'
        : '모바일 앱 (앱 소개 페이지도 가능)'

    const prompt = `너는 UX 리서처다. 아래 기획 개요에 맞는 실제 레퍼런스 ${kind} 3개를 고른다.

규칙:
- 실존하고 지금 접속 가능한 유명 서비스만. 추측성·가짜 URL 금지.
- 정보구조·섹션 구성·히어로 처리가 특히 잘 된 사례.
- 같은 회사 중복 금지. 국내/해외 섞어도 됨.
- 로그인 벽이 없는 공개 페이지 URL.

기획 개요:
${(projectSummary ?? '').toString().slice(0, 400)}
${brief.slice(0, 1500)}

출력은 JSON 배열만, 다른 텍스트 금지. 형식:
[{"url":"https://example.com","rationale":"이 사례에서 참고할 점 한 문장(한국어)"}]`

    let picked: Array<{ url: string; rationale: string }> = []
    try {
      const raw = await generatePro(prompt, apiKey, GEMINI_ECONOMY_MODEL)
      const jsonText = raw.match(/\[[\s\S]*\]/)?.[0] ?? '[]'
      picked = (JSON.parse(jsonText) as Array<{ url?: string; rationale?: string }>)
        .filter(r => r && typeof r.url === 'string')
        .slice(0, 3)
        .map(r => ({ url: r.url!.trim(), rationale: (r.rationale ?? '').toString().slice(0, 200) }))
    } catch {
      picked = []
    }

    const safe = picked
      .map(r => ({ ...r, url: /^https?:\/\//i.test(r.url) ? r.url : `https://${r.url}` }))
      .filter(r => isSafeUrl(r.url))
    if (safe.length === 0) return NextResponse.json({ references: [] })

    const puppeteer = await import('puppeteer')
    const browser: Browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    })
    try {
      const settled = await Promise.allSettled(
        safe.map(async (r): Promise<Ref> => {
          const page = await browser.newPage()
          try {
            await page.setViewport({
              width: platform === 'web' ? 1440 : 414,
              height: 1400,
              deviceScaleFactor: 1,
            })
            await page.goto(r.url, { waitUntil: 'networkidle2', timeout: 20000 })
            await new Promise(res => setTimeout(res, 1200))
            const shot = (await page.screenshot({ type: 'png', encoding: 'base64', fullPage: false })) as string
            return { url: r.url, rationale: r.rationale, screenshotBase64: shot }
          } finally {
            await page.close().catch(() => null)
          }
        }),
      )
      const references: Ref[] = settled.flatMap(s => (s.status === 'fulfilled' ? [s.value] : []))
      return NextResponse.json({ references })
    } finally {
      await browser.close().catch(() => null)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ references: [], error: message })
  }
}
