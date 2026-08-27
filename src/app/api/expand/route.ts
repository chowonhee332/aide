import { NextRequest, NextResponse } from 'next/server'
import type { Browser, Page } from 'puppeteer'
import { expandToPrototype, generateProWithImage, resolveImagePlaceholders, type GenerateParams } from '@/lib/gemini'
import { injectVisualReviewCss, reviewDesignScreenshot } from '@/lib/design-visual-review'
import { GEMINI_ECONOMY_MODEL } from '@/lib/gemini-model-policy'
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

function extractPrototypeScreens(html: string): Array<{ id: string; label: string }> {
  const screens: Array<{ id: string; label: string }> = []
  const seen = new Set<string>()
  for (const match of html.matchAll(/<div\b[^>]*>/gi)) {
    const tag = match[0]
    const className = tag.match(/\bclass=["']([^"']*)["']/i)?.[1] ?? ''
    if (!className.split(/\s+/).includes('aide-screen')) continue
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1]
    if (!id || seen.has(id)) continue
    seen.add(id)
    const label = tag.match(/\bdata-label=["']([^"']+)["']/i)?.[1]
      ?? (id === 'screen-home' ? '홈' : id.replace(/^screen-/, ''))
    screens.push({ id, label })
  }
  return screens.length > 0 ? screens : [{ id: 'screen-home', label: '홈' }]
}

export async function POST(req: NextRequest) {
  let browser: Browser | null = null
  try {
    const { mainHtml, ...params } = await req.json() as { mainHtml: string } & GenerateParams
    const rawLogo = params.logoDataUrl
    const normalizedParams: GenerateParams = {
      ...params,
      // The selected home HTML is preserved verbatim. Lite only creates the
      // subordinate screens and is sufficient for this structured expansion.
      modelId: GEMINI_ECONOMY_MODEL,
      logoDataUrl: (!rawLogo || !rawLogo.startsWith('data:')) ? getDefaultAideLogoBase64() : rawLogo,
    }
    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    const unsplashKey = req.headers.get('x-unsplash-key') ?? undefined

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

    // 디자인 보존: 사용자가 고른 시안을 수정 없이 그대로 확장한다 (확장 전 refineUI 폴리시 제거).
    // draft에도 셸 강제(injectLayoutEssentialsGuard)가 적용돼 구조가 이미 안정적이고,
    // expandToPrototype이 이 HTML을 그대로 screen-home으로 보존 + 공통 UI를 서브 화면에 주입한다.
    console.log('[expand] step1: starting expandToPrototype (design preserved)')
    let html = await expandToPrototype(mainHtml, normalizedParams, apiKey)
    console.log('[expand] step2: html generated, length=', html.length)
    const imageWarnings: string[] = []
    html = await resolveImagePlaceholders(html, { heroImagePrompt: normalizedParams.heroSubject || normalizedParams.heroImagePrompt, apiKey, unsplashKey, imageWarnings })

    const page = await browser.newPage()

    const isWeb = normalizedParams.platform === 'web'
    const vpWidth = isWeb ? 1440 : 390
    const vpHeight = isWeb ? 1024 : 844

    console.log('[expand] step3: browser launched, viewport', vpWidth, vpHeight)
    await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: 2 })
    const baseTag = '<base href="http://localhost:3000">'
    let htmlWithBase = html.includes('<base ') ? html : html.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`)
    await page.setContent(htmlWithBase, { waitUntil: 'networkidle0', timeout: 45000 })
    console.log('[expand] step4: content loaded, waiting for fonts')
    await new Promise(r => setTimeout(r, 1500))
    await page.evaluate(() => document.fonts.ready.then(() => null)).catch(() => null)
    await waitForPageImages(page)
    console.log('[expand] step5: taking screenshot')

    let screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      fullPage: false,
      optimizeForSpeed: false,
    })

    let visualReview: Awaited<ReturnType<typeof reviewDesignScreenshot>> | undefined
    if (normalizedParams.criticalReview && normalizedParams.precomputedDesignIntentPlan) {
      visualReview = await reviewDesignScreenshot({
        screenshotBase64: screenshot,
        html,
        directionPlan: normalizedParams.precomputedDesignIntentPlan,
        platform: isWeb ? 'web' : 'mobile',
        generateVision: (prompt, imageBase64) => generateProWithImage(prompt, imageBase64, 'image/png', apiKey, GEMINI_ECONOMY_MODEL),
      })
      if (visualReview.needsPatch) {
        html = injectVisualReviewCss(html, visualReview)
        htmlWithBase = html.includes('<base ') ? html : html.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`)
        await page.setContent(htmlWithBase, { waitUntil: 'domcontentloaded', timeout: 20_000 })
        await page.evaluate(() => document.fonts.ready.then(() => null)).catch(() => null)
        screenshot = await page.screenshot({ type: 'png', encoding: 'base64', fullPage: false, optimizeForSpeed: true })
      }
    }

    console.log('[expand] step6: done')
    return NextResponse.json({
      html,
      image: `data:image/png;base64,${screenshot}`,
      imageWarnings,
      visualReview,
      screens: extractPrototypeScreens(html),
    })
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
