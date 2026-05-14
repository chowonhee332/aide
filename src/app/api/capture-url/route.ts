import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  let browser: Browser | null = null
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })
    }

    let normalized = url.trim()
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized

    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await page.goto(normalized, { waitUntil: 'networkidle2', timeout: 45000 })
    await new Promise(r => setTimeout(r, 2500))

    // 스크롤하면서 lazy-load 콘텐츠 모두 로드
    await page.evaluate(async () => {
      await new Promise<void>(resolve => {
        const distance = 400
        const delay = 80
        let scrolled = 0
        const timer = setInterval(() => {
          window.scrollBy(0, distance)
          scrolled += distance
          if (scrolled >= document.body.scrollHeight) {
            window.scrollTo(0, 0)
            clearInterval(timer)
            resolve()
          }
        }, delay)
      })
    })
    await new Promise(r => setTimeout(r, 500))

    const screenshot = await page.screenshot({ type: 'png', encoding: 'base64', fullPage: true })
    return NextResponse.json({ screenshot: screenshot as string })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `캡처 실패: ${message}` }, { status: 500 })
  } finally {
    await browser?.close().catch(() => null)
  }
}
