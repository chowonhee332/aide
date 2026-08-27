import { NextRequest } from 'next/server'
import { GEMINI_DESIGN_MODEL, GEMINI_IMAGE_MODEL } from '@/lib/gemini-model-policy'
import type { Browser } from 'puppeteer'
import { extractDesignPaletteHint, generateHeroImage, generatePro } from '@/lib/gemini'
import { buildUIScreenIRPrompt, compileStudioDesignTheme, parseUIScreenPatch, type SharedUIScreenContent, type UIScreenIR, type UIScreenVariant } from '@/lib/ui-screen-ir'
import { serializeUIScreenToHtml } from '@/lib/ui-screen-serializer'
import { buildVisualRepairCss, injectUIScreenRepairCss, inspectUIScreenStructure, inspectVariantDiversity, inspectVisualMeasurement, normalizeUIScreen, qualitySummary, type UIScreenVisualMeasurement } from '@/lib/ui-screen-quality'

export const maxDuration = 300

type DirectionInput = { name: string; thesis: string; composition: string; density: string; primaryAction: string }

function isBody(value: unknown): value is { brief: string; projectSummary: string; platform: 'mobile' | 'web'; designMd: string; directions: DirectionInput[]; modelId?: string; contentSeed?: SharedUIScreenContent; coreObjects?: string[]; keyDataPoints?: string[]; shellContract?: { topAppBar?: { present?: boolean; title?: string; leftAction?: string; rightAction?: string; preserveExactly?: boolean }; bottomNavigation?: { present?: boolean }; brandLogo?: { present?: boolean } } } {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return typeof body.brief === 'string' && typeof body.projectSummary === 'string' && typeof body.designMd === 'string'
    && (body.platform === 'mobile' || body.platform === 'web') && Array.isArray(body.directions) && body.directions.length >= 3
}

async function closeBrowser(browser: Browser | null) {
  if (!browser) return
  try { await browser.close() } catch { browser.process()?.kill('SIGKILL') }
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const stream = new ReadableStream<Uint8Array>({ start(value) { controller = value } })
  const emit = (event: string, data: unknown) => {
    try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) } catch { /* closed */ }
  }

  ;(async () => {
    let browser: Browser | null = null
    try {
      const body: unknown = await req.json()
      if (!isBody(body)) throw new Error('서비스 설명, DESIGN.md, 세 가지 디자인 방향이 필요합니다.')
      const apiKey = req.headers.get('x-gemini-key') ?? undefined
      const prompt = buildUIScreenIRPrompt(body)
      const screens = new Map<UIScreenVariant, UIScreenIR>()
      const seen = new Set<string>()
      let consumedLines = 0

      const ingest = (accumulated: string, includeLastLine = false) => {
        const normalized = accumulated.replace(/^```(?:jsonl?|JSONL?)?\s*/i, '').replace(/```\s*$/i, '')
        const lines = normalized.split(/\r?\n/)
        const limit = includeLastLine ? lines.length : Math.max(0, lines.length - 1)
        for (let index = consumedLines; index < limit; index++) {
          const line = lines[index]?.trim()
          if (!line) continue
          try {
            const patch = parseUIScreenPatch(JSON.parse(line))
            if (!patch) continue
            const signature = `${patch.variant}:${patch.section?.id ?? (patch.screen ? 'screen' : 'done')}`
            if (seen.has(signature)) continue
            seen.add(signature)
            if (patch.screen) screens.set(patch.variant, { ...patch.screen, sections: [] })
            if (patch.section) {
              const screen = screens.get(patch.variant)
              if (!screen) continue
              screen.sections.push(patch.section)
            }
            emit('ui_patch', patch)
          } catch { /* wait for or skip malformed model line */ }
        }
        consumedLines = limit
      }

      emit('step', { label: '구조화 UI 설계 시작' })
      const finalText = await generatePro(prompt, apiKey, body.modelId || GEMINI_DESIGN_MODEL, text => ingest(text))
      ingest(finalText, true)
      const variants = (['A', 'B', 'C'] as const).map(variant => screens.get(variant))
      if (variants.some(screen => !screen || screen.sections.length < 4)) throw new Error('구조화 UI 결과가 불완전합니다. 다시 시도해주세요.')
      const normalizedVariants = (variants as UIScreenIR[]).map(normalizeUIScreen)
      const structureIssues = [...normalizedVariants.flatMap(inspectUIScreenStructure), ...inspectVariantDiversity(normalizedVariants)]
      const structureQuality = qualitySummary(structureIssues)
      emit('quality', { stage: 'structure', ...structureQuality })

      const theme = compileStudioDesignTheme(body.designMd)
      const paletteHint = extractDesignPaletteHint(body.designMd)
      let sharedGeneratedMedia: string | undefined
      for (const screen of normalizedVariants) {
        const mediaItem = screen.sections.find(section => section.type === 'media')?.items?.find(item => item.mediaPrompt && !item.imageUrl)
        if (!mediaItem?.mediaPrompt) continue
        if (!sharedGeneratedMedia) {
          emit('step', { label: '공유 미디어 1개 생성' })
          const generated = await generateHeroImage(mediaItem.mediaPrompt, apiKey, 'scene-card-cover', paletteHint, GEMINI_IMAGE_MODEL)
          if (generated) sharedGeneratedMedia = `data:${generated.mimeType};base64,${generated.base64}`
        }
        if (sharedGeneratedMedia) mediaItem.imageUrl = sharedGeneratedMedia
      }
      const puppeteer = await import('puppeteer')
      browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
      const results = []
      for (const screen of normalizedVariants) {
        let html = serializeUIScreenToHtml(screen, theme)
        const page = await browser.newPage()
        await page.setViewport({ width: body.platform === 'mobile' ? 390 : 1440, height: body.platform === 'mobile' ? 844 : 1024, deviceScaleFactor: 1 })
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20_000 })
        const measure = () => page.evaluate(() => {
          const root = document.querySelector('.ui-screen') as HTMLElement | null
          const viewportWidth = root?.clientWidth ?? document.documentElement.clientWidth
          return {
            documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
            viewportWidth,
            sections: Array.from(document.querySelectorAll<HTMLElement>('[data-ui-section-id]')).map(section => {
              const textNodes = Array.from(section.querySelectorAll<HTMLElement>('strong,h2,b,span')).filter(node => (node.textContent?.trim().length ?? 0) >= 2)
              const verticalText = textNodes.some(node => {
                const rect = node.getBoundingClientRect(); const length = node.textContent?.trim().length ?? 1
                return rect.height > rect.width * 1.8 && rect.width < Math.min(32, length * 8)
              })
              const intentionalCarousel = Boolean(section.querySelector('.carousel')) || section.closest('.immersive') && section.dataset.uiSectionType === 'cards'
              return { id: section.dataset.uiSectionId ?? '', type: section.dataset.uiSectionType ?? '', overflowX: intentionalCarousel ? 0 : Math.max(0, section.scrollWidth - section.clientWidth), clipped: !intentionalCarousel && getComputedStyle(section).overflow === 'hidden' && section.scrollHeight > section.clientHeight + 2, verticalText }
            }),
          }
        }) as Promise<UIScreenVisualMeasurement>
        let visualIssues = inspectVisualMeasurement(screen, await measure())
        let visualQuality = qualitySummary(visualIssues)
        if (!visualQuality.passed) {
          const repairCss = buildVisualRepairCss(visualIssues)
          if (repairCss) {
            html = injectUIScreenRepairCss(html, repairCss)
            await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20_000 })
            visualIssues = inspectVisualMeasurement(screen, await measure())
            visualQuality = qualitySummary(visualIssues)
          }
        }
        emit('quality', { stage: 'visual', variant: screen.variant, ...visualQuality })
        const screenshot = await page.screenshot({ type: 'png', encoding: 'base64', fullPage: true, optimizeForSpeed: true })
        await page.close()
        results.push({ screenIr: screen, html, image: `data:image/png;base64,${screenshot}`, variantDescription: { strategy: screen.strategy, intent: screen.name }, quality: visualQuality })
      }
      emit('done', { variants: results, theme })
    } catch (error) {
      console.error('[generate-ui-ir]', error)
      emit('error', { error: error instanceof Error ? error.message : '구조화 UI 생성에 실패했습니다.' })
    } finally {
      await closeBrowser(browser)
      try { controller.close() } catch { /* closed */ }
    }
  })()

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
}
