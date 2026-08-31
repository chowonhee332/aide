import { NextRequest } from 'next/server'
import type { Browser, Page } from 'puppeteer'
import { generateUI, resolveImagePlaceholders, extractDesignPaletteHint, generateProWithImage } from '@/lib/gemini'
import { injectVisualReviewCss, reviewDesignScreenshot } from '@/lib/design-visual-review'
import { GEMINI_DESIGN_MODEL, GEMINI_ECONOMY_MODEL } from '@/lib/gemini-model-policy'
import fs from 'fs'
import path from 'path'

export const maxDuration = 300

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
  const encoder = new TextEncoder()
  let streamController!: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream<Uint8Array>({
    start(controller) { streamController = controller },
  })

  const emit = (event: string, data: unknown) => {
    try {
      streamController.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
    } catch { /* stream already closed */ }
  }

  ;(async () => {
    let browser: Browser | null = null
    try {
      const params = await req.json()
      const rawLogo: string | undefined = params.logoDataUrl
      const resolvedLogoDataUrl = (!rawLogo || !rawLogo.startsWith('data:'))
        ? getDefaultAideLogoBase64()
        : rawLogo
      const normalizedParams = {
        ...params,
        logoDataUrl: resolvedLogoDataUrl,
        modelId: params.modelId || GEMINI_DESIGN_MODEL,
      }
      const apiKey = req.headers.get('x-gemini-key') ?? undefined
      const unsplashKey = req.headers.get('x-unsplash-key') ?? undefined
      const isDraft = normalizedParams.qualityMode === 'draft'
      console.log('[generate] step1: params parsed, starting generateUI')

      const { html: rawHtml, variantDescription } = await generateUI({
        ...normalizedParams,
        onStep: (label: string) => emit('step', { label }),
        onHtmlChunk: (partialHtml: string) => emit('html_chunk', { html: partialHtml }),
      }, apiKey)

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

      emit('step', { label: '구조 보정 후 바로 이미지 처리 중...' })

      emit('step', { label: '이미지 생성 중...' })
      const has3dPlaceholder = /%%(?:SCENE_3D|HERO_3D|SHARED_HERO_3D_SCENE|SHARED_HERO_3D|HERO_SCENE_3D|MASCOT_3D|REWARD_OBJECT_3D|HERO_3D_IMAGE)/.test(rawHtml)
      // brief는 절대 이미지 프롬프트 fallback으로 쓰지 않는다.
      // brief 전체가 넘어가면 수백 글자짜리 기획서가 Gemini 이미지 API에 전달되어 엉뚱한 이미지가 생성된다.
      const heroPrompt = normalizedParams.sharedVisualMode === '3d'
        ? (normalizedParams.sharedVisualSubject || normalizedParams.heroSubject || normalizedParams.heroImagePrompt || undefined)
        : (normalizedParams.heroSubject || normalizedParams.heroImagePrompt || undefined)
      const imageWarnings: string[] = []
      // 히어로가 임팩트 목적일 때 시네마틱 프롬프트로 전환한다.
      // 씬 정책은 기본 dramatic, 오브젝트 정책은 브리프가 "화려/시네마틱/드라마틱/분해"를 요구할 때만.
      const briefText = String(normalizedParams.brief ?? '')
      const heroDramatic =
        normalizedParams.visualPolicy === 'scene-3d' ||
        normalizedParams.visualPolicy === 'scene-3d-card-cover' ||
        /화려|드라마틱|시네마틱|웅장|몰입|임팩트|exploded|분해|입체감|impact|dramatic|cinematic/i.test(briefText)
      let finalHtml = await resolveImagePlaceholders(rawHtml, {
        heroImagePrompt: heroPrompt,
        apiKey,
        unsplashKey,
        imageWarnings,
        paletteHint: extractDesignPaletteHint(normalizedParams.designMd),
        // 3D 히어로는 임팩트가 목적이므로 flash-lite가 아니라 flash-image를 쓴다.
        // pro 이미지 모델(gemini-3-pro-image)은 이 경로에서 미사용 — generateHeroImage 기본값이 flash-image.
        sceneCardCover: normalizedParams.visualPolicy === 'scene-3d-card-cover',
        heroDramatic,
        onImageEvent: (label: string) => emit('step', { label }),
      })
      console.log('[generate] step2: html generated, length=', finalHtml.length)

      emit('step', { label: '스크린샷 캡처 중...' })

      const page = await browser.newPage()

      const isWeb = normalizedParams.platform === 'web'
      const vpWidth = isWeb ? 1440 : 390
      const vpHeight = isWeb ? 1024 : 844

      console.log('[generate] step3: browser launched, setting viewport', vpWidth, vpHeight)
      await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: isDraft ? 1 : 2 })
      const baseTag = '<base href="http://localhost:3000">'
      let htmlWithBase = finalHtml.includes('<base ') ? finalHtml : finalHtml.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`)
      await page.setContent(htmlWithBase, { waitUntil: isDraft ? 'domcontentloaded' : 'networkidle0', timeout: isDraft ? 20000 : 45000 })
      console.log('[generate] step4: content loaded, waiting for fonts')
      await new Promise(r => setTimeout(r, isDraft ? 300 : 1500))
      await page.evaluate(() => document.fonts.ready.then(() => null)).catch(() => null)
      await Promise.race([
        waitForPageImages(page),
        new Promise(resolve => setTimeout(resolve, isDraft ? 2500 : 9000)),
      ])
      console.log('[generate] step5: fonts ready, taking screenshot')

      let screenshot = await page.screenshot({
        type: 'png',
        encoding: 'base64',
        fullPage: true,
        optimizeForSpeed: isDraft,
      })

      let visualReview: Awaited<ReturnType<typeof reviewDesignScreenshot>> | undefined
      // A/B/C 초안은 빠른 비교용이다. 스크린샷 Vision 검수는 최종 품질 모드에서만 실행해
      // draft 시안 3개에 대한 추가 모델 호출과 스크린샷 입력 비용을 제거한다.
      if (!isDraft && normalizedParams.criticalReview && normalizedParams.precomputedDesignIntentPlan) {
        emit('step', { label: '시각 밸런스 검수 중...' })
        visualReview = await reviewDesignScreenshot({
          screenshotBase64: screenshot,
          html: finalHtml,
          directionPlan: normalizedParams.precomputedDesignIntentPlan,
          platform: isWeb ? 'web' : 'mobile',
          generateVision: (prompt, imageBase64) => generateProWithImage(prompt, imageBase64, 'image/png', apiKey, GEMINI_ECONOMY_MODEL),
        })
        if (visualReview.needsPatch) {
          finalHtml = injectVisualReviewCss(finalHtml, visualReview)
          htmlWithBase = finalHtml.includes('<base ') ? finalHtml : finalHtml.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`)
          await page.setContent(htmlWithBase, { waitUntil: 'domcontentloaded', timeout: 20000 })
          await new Promise(r => setTimeout(r, 300))
          await page.evaluate(() => document.fonts.ready.then(() => null)).catch(() => null)
          screenshot = await page.screenshot({
            type: 'png',
            encoding: 'base64',
            fullPage: true,
            optimizeForSpeed: true,
          })
        }
      }

      console.log('[generate] step6: screenshot done')
      emit('done', {
        html: finalHtml,
        image: `data:image/png;base64,${screenshot}`,
        has3dHero: has3dPlaceholder,
        imageWarnings,
        variantDescription,
        visualReview,
      })
    } catch (err) {
      const name = err instanceof Error ? err.name : 'unknown'
      const message = err instanceof Error ? err.message : String(err)
      const cause = err instanceof Error ? (err as NodeJS.ErrnoException).cause : undefined
      console.error('[generate] error:', { name, message, cause, stack: err instanceof Error ? err.stack : undefined })
      emit('error', { error: `UI 생성 중 오류가 발생했습니다: ${message}` })
    } finally {
      if (browser) await safeBrowserClose(browser)
      try { streamController.close() } catch { /* already closed */ }
    }
  })()

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
