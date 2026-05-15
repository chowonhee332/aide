import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'
import { analyzeUrlToDesignMd } from '@/lib/gemini'
import { isSafeUrl } from '@/lib/utils'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  let browser: Browser | null = null

  try {
    const { url } = await req.json() as { url: string }

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })
    }

    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    if (!isSafeUrl(normalizedUrl)) {
      return NextResponse.json({ error: '허용되지 않는 URL입니다.' }, { status: 400 })
    }

    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
      ],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 })
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' })
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    await page.goto(normalizedUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await page.evaluate(() => document.fonts.ready).catch(() => null)

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      fullPage: false,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    }) as string

    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const designMd = await analyzeUrlToDesignMd(screenshotBuffer, normalizedUrl, apiKey)

    return NextResponse.json({ designMd, screenshot: `data:image/png;base64,${screenshotBuffer}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[analyze-url] error:', message)

    if (message.includes('net::ERR') || message.includes('Navigation timeout')) {
      return NextResponse.json({ error: `페이지를 열 수 없습니다. URL을 확인해주세요.` }, { status: 422 })
    }
    return NextResponse.json({ error: `분석 중 오류가 발생했습니다: ${message}` }, { status: 500 })
  } finally {
    await browser?.close().catch(() => null)
  }
}
