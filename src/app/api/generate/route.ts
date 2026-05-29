import { NextRequest, NextResponse } from 'next/server'
import type { Browser, Page } from 'puppeteer'
import { generateUI, resolveImagePlaceholders } from '@/lib/gemini'

export const maxDuration = 180

async function safeBrowserClose(browser: Browser) {
  try {
    await Promise.race([
      browser.close(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('close timeout')), 5000)),
    ])
  } catch {
    browser.process()?.kill('SIGKILL')
  }
}

async function waitForPageImages(page: Page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images)
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>(resolve => {
        const done = () => resolve()
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
      })
    }))
  }).catch(() => null)
}

export async function POST(req: NextRequest) {
  let browser: Browser | null = null

  try {
    const params = await req.json()
    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    console.log('[generate] step1: params parsed, starting generateUI')

    const html = await generateUI(params, apiKey)
    const has3dPlaceholder = /%%(?:HERO_3D_IMAGE|HERO_SCENE_3D|MASCOT_3D|REWARD_OBJECT_3D)/.test(html)
    const heroPrompt = params.heroSubject || params.heroImagePrompt || (has3dPlaceholder ? params.brief : undefined)
    const finalHtml = await resolveImagePlaceholders(html, {
      heroImagePrompt: heroPrompt,
      apiKey,
    })
    console.log('[generate] step2: html generated, length=', finalHtml.length)

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

    const isWeb = params.platform === 'web'
    const vpWidth = isWeb ? 1440 : 390
    const vpHeight = isWeb ? 1024 : 844

    console.log('[generate] step3: browser launched, setting viewport', vpWidth, vpHeight)
    await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: 2 })
    await page.setContent(finalHtml, { waitUntil: 'networkidle0', timeout: 45000 })
    console.log('[generate] step4: content loaded, waiting for fonts')
    await new Promise(r => setTimeout(r, 1500))
    await page.evaluate(() => document.fonts.ready.then(() => null)).catch(() => null)
    await waitForPageImages(page)
    console.log('[generate] step5: fonts ready, taking screenshot')

    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      fullPage: false,
      optimizeForSpeed: false,
    })

    console.log('[generate] step6: screenshot done')
    return NextResponse.json({ html: finalHtml, image: `data:image/png;base64,${screenshot}`, has3dHero: has3dPlaceholder })
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown'
    const message = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error ? (err as NodeJS.ErrnoException).cause : undefined
    console.error('[generate] error:', { name, message, cause, stack: err instanceof Error ? err.stack : undefined })
    return NextResponse.json({ error: `UI 생성 중 오류가 발생했습니다: ${message}` }, { status: 500 })
  } finally {
    if (browser) await safeBrowserClose(browser)
  }
}
