import { NextRequest } from 'next/server'
import type { Browser, Page } from 'puppeteer'
import { generateUI, resolveImagePlaceholders, extractDesignPaletteHint, refineUI } from '@/lib/gemini'
import { auditResponsiveHtml, buildResponsiveRepairMessage } from '@/lib/responsive-audit'
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
      const isDraftRequest = params.qualityMode === 'draft'
      const normalizedParams = {
        ...params,
        logoDataUrl: resolvedLogoDataUrl,
        modelId: isDraftRequest ? 'gemini-3.1-pro-preview' : params.modelId,
      }
      const apiKey = req.headers.get('x-gemini-key') ?? undefined
      const unsplashKey = req.headers.get('x-unsplash-key') ?? undefined
      const isDraft = normalizedParams.qualityMode === 'draft'
      console.log('[generate] step1: params parsed, starting generateUI')

      const { html: rawHtml, variantDescription } = await generateUI({
        ...normalizedParams,
        criticalReview: isDraft ? false : normalizedParams.criticalReview,
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

      let auditedRawHtml = rawHtml
      const auditOptions = { requireLogo: Boolean(normalizedParams.logoDataUrl) }
      if (!isDraft) {
        emit('step', { label: '반응형 레이아웃 검수 중...' })
        let responsiveIssues = await auditResponsiveHtml(browser, auditedRawHtml, auditOptions)
        for (let repairAttempt = 1; repairAttempt <= 2 && responsiveIssues.length > 0; repairAttempt += 1) {
          emit('step', { label: repairAttempt === 1 ? '반응형 레이아웃 수정 중...' : '반응형 레이아웃 재수정 중...' })
          const repairMessage = buildResponsiveRepairMessage(responsiveIssues, repairAttempt)
          try {
            auditedRawHtml = await refineUI(auditedRawHtml, repairMessage, normalizedParams.brief, normalizedParams.designMd, apiKey, normalizedParams.logoDataUrl, normalizedParams.domain)
            responsiveIssues = await auditResponsiveHtml(browser, auditedRawHtml, auditOptions)
          } catch (err) {
            console.warn('[generate] responsive repair skipped:', err instanceof Error ? err.message : String(err))
            break
          }
        }
      } else {
        emit('step', { label: '빠른 초안 모드로 검수 단계를 줄이는 중...' })
      }

      emit('step', { label: '이미지 생성 중...' })
      const has3dPlaceholder = /%%(?:SCENE_3D|HERO_3D|SHARED_HERO_3D_SCENE|SHARED_HERO_3D|HERO_SCENE_3D|MASCOT_3D|REWARD_OBJECT_3D|HERO_3D_IMAGE)/.test(auditedRawHtml)
      // brief는 절대 이미지 프롬프트 fallback으로 쓰지 않는다.
      // brief 전체가 넘어가면 수백 글자짜리 기획서가 Gemini 이미지 API에 전달되어 엉뚱한 이미지가 생성된다.
      const heroPrompt = normalizedParams.sharedVisualMode === '3d'
        ? (normalizedParams.sharedVisualSubject || normalizedParams.heroSubject || normalizedParams.heroImagePrompt || undefined)
        : (normalizedParams.heroSubject || normalizedParams.heroImagePrompt || undefined)
      const imageWarnings: string[] = []
      const finalHtml = await resolveImagePlaceholders(auditedRawHtml, {
        heroImagePrompt: heroPrompt,
        apiKey,
        unsplashKey,
        imageWarnings,
        paletteHint: extractDesignPaletteHint(normalizedParams.designMd),
        sceneImageModel: (normalizedParams.visualPolicy === 'scene-3d' || normalizedParams.visualPolicy === 'scene-3d-card-cover')
          ? 'gemini-2.5-flash-image'
          : undefined,
        heroImageModel: normalizedParams.visualPolicy === 'creon-object-3d' ? 'gemini-2.5-flash-image' : undefined,
        sceneCardCover: normalizedParams.visualPolicy === 'scene-3d-card-cover',
        onImageEvent: (label: string) => emit('step', { label }),
      })
      if (!isDraft) {
        const finalResponsiveIssues = await auditResponsiveHtml(browser, finalHtml, auditOptions)
        if (finalResponsiveIssues.length > 0) {
          console.warn('[generate] final responsive audit issues:', finalResponsiveIssues)
          imageWarnings.push(`최종 이미지 치환 후 반응형 검수 경고: ${finalResponsiveIssues.slice(0, 3).join(' / ')}`)
        }
      }
      console.log('[generate] step2: html generated, length=', finalHtml.length)

      emit('step', { label: '스크린샷 캡처 중...' })

      const page = await browser.newPage()

      const isWeb = normalizedParams.platform === 'web'
      const vpWidth = isWeb ? 1440 : 390
      const vpHeight = isWeb ? 1024 : 844

      console.log('[generate] step3: browser launched, setting viewport', vpWidth, vpHeight)
      await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: isDraft ? 1 : 2 })
      const baseTag = '<base href="http://localhost:3000">'
      const htmlWithBase = finalHtml.includes('<base ') ? finalHtml : finalHtml.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`)
      await page.setContent(htmlWithBase, { waitUntil: isDraft ? 'domcontentloaded' : 'networkidle0', timeout: isDraft ? 20000 : 45000 })
      console.log('[generate] step4: content loaded, waiting for fonts')
      await new Promise(r => setTimeout(r, isDraft ? 300 : 1500))
      await page.evaluate(() => document.fonts.ready.then(() => null)).catch(() => null)
      await Promise.race([
        waitForPageImages(page),
        new Promise(resolve => setTimeout(resolve, isDraft ? 2500 : 9000)),
      ])
      console.log('[generate] step5: fonts ready, taking screenshot')

      const screenshot = await page.screenshot({
        type: 'png',
        encoding: 'base64',
        fullPage: true,
        optimizeForSpeed: isDraft,
      })

      console.log('[generate] step6: screenshot done')
      emit('done', {
        html: finalHtml,
        image: `data:image/png;base64,${screenshot}`,
        has3dHero: has3dPlaceholder,
        imageWarnings,
        variantDescription,
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
