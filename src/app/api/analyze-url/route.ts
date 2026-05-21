import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'
import { analyzeUrlToDesignMd, type UrlSourceData } from '@/lib/gemini'
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

    const gotoResponse = await page.goto(normalizedUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    await page.evaluate(() => document.fonts.ready).catch(() => null)

    const httpStatus = gotoResponse?.status() ?? 200
    const pageTitle = await page.title().catch(() => '')

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      fullPage: false,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    }) as string

    const sourceData = await page.evaluate((): UrlSourceData => {
      const cssRules: string[] = []
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            cssRules.push(rule.cssText)
          }
        } catch { /* cross-origin stylesheet */ }
      }
      const allCss = cssRules.join('\n')

      const varMatches = allCss.match(/--[\w-]+:\s*[^;]{1,100}/g) ?? []
      const fontMatches = allCss.match(/font-family:\s*[^;]{1,150}/g) ?? []

      const allClasses = Array.from(document.querySelectorAll('[class]'))
        .flatMap(el => (typeof el.className === 'string' ? el.className.split(/\s+/) : []))
        .filter(Boolean)

      // Computed styles: full-page scan approach
      function toHex(rgb: string): string | null {
        const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/)
        if (!m) return null
        if (m[4] !== undefined && parseFloat(m[4]) < 0.15) return null // skip near-transparent
        return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('')
      }

      function isNeutral(hex: string): boolean {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        // white/near-white, black/near-black, or very low saturation gray
        if (r > 240 && g > 240 && b > 240) return true
        if (r < 20 && g < 20 && b < 20) return true
        if (max - min < 20) return true // gray
        return false
      }

      // Scan all interactive elements for background colors
      const interactive = Array.from(document.querySelectorAll('a, button')).slice(0, 400)
      const bgCount: Record<string, number> = {}
      const bgSample: Record<string, { textColor: string | null; borderRadius: string; fontSize: string; fontWeight: string }> = {}

      for (const el of interactive) {
        const s = getComputedStyle(el)
        const bg = toHex(s.backgroundColor)
        if (!bg || isNeutral(bg)) continue
        bgCount[bg] = (bgCount[bg] ?? 0) + 1
        if (!bgSample[bg]) {
          bgSample[bg] = {
            textColor: toHex(s.color),
            borderRadius: s.borderRadius,
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
          }
        }
      }

      const topColors = Object.entries(bgCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)

      const colorLines: string[] = ['## Interactive Element Colors (sorted by frequency)']
      for (const [hex, count] of topColors) {
        const sample = bgSample[hex]
        colorLines.push(`${hex} (used ${count}x): textColor=${sample.textColor ?? 'n/a'}, borderRadius=${sample.borderRadius}, fontSize=${sample.fontSize}, fontWeight=${sample.fontWeight}`)
      }

      // Scan text colors from headings and body text
      const textColorCount: Record<string, number> = {}
      const textEls = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,li,td')).slice(0, 200)
      for (const el of textEls) {
        const hex = toHex(getComputedStyle(el).color)
        if (hex && !isNeutral(hex)) textColorCount[hex] = (textColorCount[hex] ?? 0) + 1
      }
      const topTextColors = Object.entries(textColorCount).sort((a, b) => b[1] - a[1]).slice(0, 3)
      if (topTextColors.length) {
        colorLines.push(`\n## Accent/Brand Text Colors`)
        for (const [hex, count] of topTextColors) colorLines.push(`${hex} (used ${count}x)`)
      }

      // Body & layout
      const bodyS = getComputedStyle(document.body)
      const htmlS = getComputedStyle(document.documentElement)
      colorLines.push(`\n## Page Base`)
      colorLines.push(`body: backgroundColor=${toHex(bodyS.backgroundColor) ?? toHex(htmlS.backgroundColor) ?? '#ffffff'}, color=${toHex(bodyS.color)}, fontFamily=${bodyS.fontFamily.split(',')[0].trim()}, fontSize=${bodyS.fontSize}`)

      // Navigation
      const navEl = document.querySelector('nav, header, [class*="gnb"], [class*="header"], [id*="header"], [id*="nav"]')
      if (navEl) {
        const ns = getComputedStyle(navEl)
        colorLines.push(`nav/header: backgroundColor=${toHex(ns.backgroundColor) ?? 'transparent'}, color=${toHex(ns.color)}`)
      }

      // Headings
      for (const tag of ['h1', 'h2', 'h3'] as const) {
        const el = document.querySelector(tag)
        if (el) {
          const s = getComputedStyle(el)
          colorLines.push(`${tag}: color=${toHex(s.color)}, fontSize=${s.fontSize}, fontWeight=${s.fontWeight}, fontFamily=${s.fontFamily.split(',')[0].trim()}`)
        }
      }

      // Input fields
      const inputEl = document.querySelector('input[type="search"], input[type="text"], input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])')
      if (inputEl) {
        const s = getComputedStyle(inputEl)
        colorLines.push(`input: backgroundColor=${toHex(s.backgroundColor)}, borderColor=${toHex(s.borderColor)}, borderRadius=${s.borderRadius}, fontSize=${s.fontSize}`)
      }

      // Border radius patterns from containers
      const radiusCount: Record<string, number> = {}
      const containerEls = Array.from(document.querySelectorAll('div, section, article, li')).slice(0, 200)
      for (const el of containerEls) {
        const r = getComputedStyle(el).borderRadius
        if (r && r !== '0px') radiusCount[r] = (radiusCount[r] ?? 0) + 1
      }
      const topRadii = Object.entries(radiusCount).sort((a, b) => b[1] - a[1]).slice(0, 4)
      if (topRadii.length) {
        colorLines.push(`\n## Border Radius Patterns`)
        colorLines.push(topRadii.map(([r, c]) => `${r} (${c}x)`).join(', '))
      }

      return {
        cssVariables: [...new Set(varMatches)].slice(0, 200).join('\n'),
        fontFamilies: [...new Set(fontMatches)].slice(0, 30).join('\n'),
        htmlClasses: [...new Set(allClasses)].slice(0, 400).join(' '),
        computedStyles: colorLines.join('\n'),
      }
    }) as UrlSourceData

    const isBlockedByStatus = httpStatus === 403 || httpStatus === 429 || httpStatus === 503
    const isBlockedByTitle = /cloudflare|access denied|just a moment|attention required|403 forbidden|503|security check|ddos|captcha/i.test(pageTitle)
    const hasNoCssData = !sourceData.cssVariables && !sourceData.fontFamilies

    let captureStatus: 'full' | 'partial' | 'blocked' = 'full'
    let captureNote: string | undefined
    if (isBlockedByStatus || isBlockedByTitle) {
      captureStatus = 'blocked'
      captureNote = `보안 차단 감지 (HTTP ${httpStatus}, 페이지 제목: "${pageTitle}")`
    } else if (hasNoCssData) {
      captureStatus = 'partial'
      captureNote = 'CSS 소스 추출 제한 — 스크린샷 기반으로 분석'
    }

    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const designMd = await analyzeUrlToDesignMd(screenshotBuffer, normalizedUrl, sourceData, apiKey, captureStatus)

    return NextResponse.json({ designMd, screenshot: `data:image/png;base64,${screenshotBuffer}`, captureStatus, captureNote })
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
