import { NextRequest, NextResponse } from 'next/server'
import type { Browser, Page } from 'puppeteer'
import { expandToPrototype, resolveImagePlaceholders, type GenerateParams } from '@/lib/gemini'
import fs from 'fs'
import path from 'path'

export const maxDuration = 180

function getDefaultAideLogoBase64(): string {
  try {
    const filePath = path.join(process.cwd(), 'public', 'logo_aide.png')
    const data = fs.readFileSync(filePath)
    return `data:image/png;base64,${data.toString('base64')}`
  } catch {
    return ''
  }
}

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
    const { mainHtml, ...params } = await req.json() as { mainHtml: string } & GenerateParams
    const rawLogo = params.logoDataUrl
    const normalizedParams: GenerateParams = {
      ...params,
      logoDataUrl: (!rawLogo || !rawLogo.startsWith('data:')) ? getDefaultAideLogoBase64() : rawLogo,
    }
    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const unsplashKey = req.headers.get('x-unsplash-key') ?? undefined
    console.log('[expand] step1: params parsed, starting expandToPrototype')
    let html = await expandToPrototype(mainHtml, normalizedParams, apiKey)
    console.log('[expand] step2: html generated, length=', html.length)
    const imageWarnings: string[] = []
    html = await resolveImagePlaceholders(html, { heroImagePrompt: normalizedParams.heroSubject || normalizedParams.heroImagePrompt, apiKey, unsplashKey, imageWarnings })

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

    const isWeb = normalizedParams.platform === 'web'
    const vpWidth = isWeb ? 1440 : 390
    const vpHeight = isWeb ? 1024 : 844

    console.log('[expand] step3: browser launched, viewport', vpWidth, vpHeight)
    await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: 2 })
    const baseTag = '<base href="http://localhost:3000">'
    const htmlWithBase = html.includes('<base ') ? html : html.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`)
    await page.setContent(htmlWithBase, { waitUntil: 'networkidle0', timeout: 45000 })
    console.log('[expand] step4: content loaded, waiting for fonts')
    await new Promise(r => setTimeout(r, 1500))
    await page.evaluate(() => document.fonts.ready.then(() => null)).catch(() => null)
    await waitForPageImages(page)
    console.log('[expand] step5: taking screenshot')

    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      fullPage: false,
      optimizeForSpeed: false,
    })

    console.log('[expand] step6: done')
    return NextResponse.json({ html, image: `data:image/png;base64,${screenshot}`, imageWarnings })
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown'
    const message = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error ? (err as NodeJS.ErrnoException).cause : undefined
    console.error('[expand] error:', { name, message, cause, stack: err instanceof Error ? err.stack : undefined })
    return NextResponse.json({ error: `프로토타입 확장 중 오류가 발생했습니다: ${message}` }, { status: 500 })
  } finally {
    if (browser) await safeBrowserClose(browser)
  }
}
