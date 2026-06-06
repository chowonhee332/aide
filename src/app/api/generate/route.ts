import { NextRequest } from 'next/server'
import type { Browser, Page } from 'puppeteer'
import { generateUI, resolveImagePlaceholders, extractDesignPaletteHint, refineUI } from '@/lib/gemini'
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

async function auditResponsiveHtml(browser: Browser, html: string, options: { requireLogo?: boolean } = {}): Promise<string[]> {
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 1024 },
  ]
  const issues: string[] = []

  for (const vp of viewports) {
    const page = await browser.newPage()
    try {
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.evaluate(() => document.fonts.ready.then(() => null)).catch(() => null)
      await new Promise(r => setTimeout(r, 250))

      const metrics = await page.evaluate(() => {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const body = document.body
        const root = document.documentElement
        const cssText = Array.from(document.querySelectorAll('style')).map(style => style.textContent ?? '').join('\n')
        const mediaMinWidthCount = (cssText.match(/@media\s*[^{]*min-width/gi) ?? []).length
        const hasTabletDesktopBreakpoint = /@media\s*[^{]*min-width\s*:\s*(?:640|720|768|800|900|960|1024|1200|1280)px/i.test(cssText)
        const hasDesktopExpansionCss = /@media\s*[^{]*min-width[\s\S]{0,2200}(grid-template-columns|repeat\(|minmax\(|auto-fit|auto-fill|desktop-nav|sidebar|aside|margin-left|max-width\s*:\s*(?:none|100%|1[12]\d\dpx|14\d\dpx)|width\s*:\s*100%)/i.test(cssText)
        const hasMobileNavCss = /\.(?:mobile-(?:nav|tabbar|tab-bar)|bottom-(?:nav|tabbar)|tabbar|tab-bar)\b|\.nav-bottom\b|\.bottom-nav\b/i.test(cssText)
        const hidesMobileNavWide = /@media\s*[^{]*min-width[\s\S]{0,2200}(?:mobile-(?:nav|tabbar|tab-bar)|bottom-(?:nav|tabbar)|tabbar|tab-bar|nav-bottom|bottom-nav)[\s\S]{0,520}display\s*:\s*none/i.test(cssText)
        const fixedMobileWidthCss = /(?:^|[}\n])\s*(?:\.|#)?(?:app|page|shell|wrapper|container|screen|root|mobile|phone)[^{]{0,80}\{[^}]{0,800}(?:width|max-width)\s*:\s*(?:3[2-9]\d|4\d\d|5[0-2]\d)px/i.test(cssText)
        const all = Array.from(document.querySelectorAll<HTMLElement>('body *'))
        const visible = all.filter(el => {
          const rect = el.getBoundingClientRect()
          const style = window.getComputedStyle(el)
          return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden'
        })
        const overflowX = Math.max(body.scrollWidth, root.scrollWidth) - vw
        const rootCandidates = Array.from(document.body.children).filter(el => {
          const rect = (el as HTMLElement).getBoundingClientRect()
          return rect.width > 20 && rect.height > 20
        }).map(el => {
          const rect = (el as HTMLElement).getBoundingClientRect()
          return { tag: el.tagName, className: (el as HTMLElement).className?.toString() ?? '', width: rect.width, left: rect.left }
        })
        const narrowShell = vw >= 768 && rootCandidates.some(item =>
          item.width >= 300 && item.width <= 540 && Math.abs(item.left + item.width / 2 - vw / 2) < 160
        )
        const mobileChromeVisible = vw >= 768 && visible.some(el => {
          const rect = el.getBoundingClientRect()
          const name = `${el.className ?? ''} ${el.id ?? ''}`.toLowerCase()
          return /(bottom|mobile|tabbar|tab-bar|home-indicator|notch|status-bar)/.test(name) &&
            rect.top > vh * 0.62 &&
            rect.height >= 32
        })
        const clipped = visible.filter(el => {
          const rect = el.getBoundingClientRect()
          const style = window.getComputedStyle(el)
          if (rect.width < 20 || rect.height < 10) return false
          if (style.overflow === 'visible' && style.textOverflow !== 'ellipsis') return false
          return el.scrollWidth > el.clientWidth + 3 || el.scrollHeight > el.clientHeight + 3
        }).slice(0, 8).map(el => {
          const rect = el.getBoundingClientRect()
          return {
            tag: el.tagName,
            className: el.className?.toString().slice(0, 80) ?? '',
            text: (el.textContent ?? '').trim().slice(0, 60),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        })
        const offscreen = visible.filter(el => {
          const rect = el.getBoundingClientRect()
          return rect.left < -8 || rect.right > vw + 8
        }).slice(0, 8).map(el => {
          const rect = el.getBoundingClientRect()
          return {
            tag: el.tagName,
            className: el.className?.toString().slice(0, 80) ?? '',
            text: (el.textContent ?? '').trim().slice(0, 60),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          }
        })
        const firstViewportContentCount = visible.filter(el => {
          const rect = el.getBoundingClientRect()
          const text = (el.textContent ?? '').trim()
          const isMeaningfulText = text.length >= 8 && rect.width >= 40 && rect.height >= 12
          const isMeaningfulMedia = ['IMG', 'BUTTON'].includes(el.tagName) && rect.width >= 40 && rect.height >= 28
          return rect.top >= 0 && rect.top < vh * 0.92 && (isMeaningfulText || isMeaningfulMedia)
        }).length
        const firstViewportTextChars = Array.from(new Set(visible.filter(el => {
          const rect = el.getBoundingClientRect()
          const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
          if (rect.top < 0 || rect.top >= vh * 0.92) return false
          if (text.length < 4 || text.length > 120) return false
          if (el.children.length > 4) return false
          return /[가-힣A-Za-z0-9]/.test(text)
        }).map(el => (el.textContent ?? '').replace(/\s+/g, ' ').trim()))).join(' ').length
        const firstViewportCards = visible.filter(el => {
          const rect = el.getBoundingClientRect()
          const name = `${el.tagName} ${el.className ?? ''} ${el.id ?? ''}`.toLowerCase()
          const text = (el.textContent ?? '').trim()
          return rect.top >= 0 &&
            rect.top < vh * 0.92 &&
            rect.width >= 84 &&
            rect.height >= 48 &&
            text.length >= 8 &&
            /(card|item|tile|coupon|benefit|reward|history|list|quick|stat|kpi|summary)/.test(name)
        }).length
        const firstViewportButtons = visible.filter(el => {
          const rect = el.getBoundingClientRect()
          return rect.top >= 0 &&
            rect.top < vh * 0.92 &&
            rect.width >= 44 &&
            rect.height >= 28 &&
            ['BUTTON', 'A'].includes(el.tagName)
        }).length
        const headerArea = visible.filter(el => {
          const rect = el.getBoundingClientRect()
          return rect.top >= 0 && rect.top < Math.min(140, vh * 0.18)
        })
        const hasBrandIdentity = headerArea.some(el => {
          const rect = el.getBoundingClientRect()
          const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
          const name = `${el.tagName} ${el.className ?? ''} ${el.id ?? ''}`.toLowerCase()
          if (/(brand|logo|app-name|service-name|aide-text-brand|aide-brand-logo)/.test(name)) return true
          if (el.tagName === 'IMG' && rect.width >= 24 && rect.height >= 16) return true
          return /^[가-힣A-Za-z0-9][가-힣A-Za-z0-9\s]{1,16}$/.test(text) && rect.width >= 36 && rect.height >= 14
        })
        const hasVisibleProvidedLogo = Array.from(document.querySelectorAll<HTMLElement>('.aide-brand-logo')).some(el => {
          const rect = el.getBoundingClientRect()
          const style = getComputedStyle(el)
          return rect.top >= 0 &&
            rect.top < Math.min(160, vh * 0.22) &&
            rect.width >= 24 &&
            rect.height >= 16 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity || '1') > 0.05
        })
        const englishUiLeaks = visible.filter(el => {
          const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
          if (!text || text.length > 32) return false
          if (/[가-힣]/.test(text)) return false
          if (!/[A-Za-z]{3,}/.test(text)) return false
          if (/^[A-Z]{1,4}$/.test(text)) return false
          if (/^(AI|API|URL|D-\d+|\d+%|\d+px)$/i.test(text)) return false
          const name = `${el.className ?? ''} ${el.id ?? ''}`.toLowerCase()
          return /(title|heading|label|tab|button|btn|section|card|badge|chip|nav|routine|store|magazine|today)/.test(name) ||
            ['BUTTON', 'A', 'H1', 'H2', 'H3', 'SPAN', 'P'].includes(el.tagName)
        }).slice(0, 8).map(el => (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40))
        const ktdsBrandLeaks = visible.filter(el => {
          const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
          const identity = [
            text,
            el.getAttribute('aria-label') ?? '',
            el.getAttribute('alt') ?? '',
            el.getAttribute('title') ?? '',
            el.getAttribute('src') ?? '',
            `${el.className ?? ''}`,
            `${el.id ?? ''}`,
          ].join(' ')
          if (!/(?:\bkt\s*ds\b|ktds|kt-ds)/i.test(identity)) return false
          const rect = el.getBoundingClientRect()
          const name = `${el.tagName} ${el.className ?? ''} ${el.id ?? ''}`.toLowerCase()
          return rect.top < 180 || /(brand|logo|header|appbar|gnb|nav)/.test(name)
        }).slice(0, 4).map(el => {
          const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
          return (text || el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('class') || el.tagName).slice(0, 40)
        })
        const awkwardWraps = visible.filter(el => {
          const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
          if (!text || text.length > 28) return false
          if (!/[가-힣]/.test(text)) return false
          if (el.children.length > 3) return false

          const name = `${el.tagName} ${el.className ?? ''} ${el.id ?? ''}`.toLowerCase()
          const isAtomicUi =
            ['BUTTON', 'A', 'SPAN'].includes(el.tagName) ||
            /(btn|button|cta|badge|chip|pill|tag|tab|label|meta|stat|kcal|time|price|rating|category)/.test(name)
          const isShortKorean = /^[가-힣0-9%·.,\s]+$/.test(text) && text.replace(/\s/g, '').length <= 12
          if (!isAtomicUi && !isShortKorean) return false

          const range = document.createRange()
          range.selectNodeContents(el)
          const lineRects = Array.from(range.getClientRects()).filter(rect => rect.width > 2 && rect.height > 4)
          range.detach()
          if (lineRects.length <= 1) return false

          const narrowLines = lineRects.filter(rect => rect.width < 46).length
          const elementRect = el.getBoundingClientRect()
          const computed = window.getComputedStyle(el)
          const lineHeight = parseFloat(computed.lineHeight || '0') || parseFloat(computed.fontSize || '16') * 1.2
          const looksMultiline = elementRect.height > lineHeight * 1.55 || lineRects.length >= 2
          return looksMultiline && (isAtomicUi || narrowLines > 0)
        }).slice(0, 10).map(el => {
          const rect = el.getBoundingClientRect()
          return {
            tag: el.tagName,
            className: el.className?.toString().slice(0, 80) ?? '',
            text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        })
        const threeDAssets = Array.from(document.querySelectorAll<HTMLImageElement>('img')).filter(img =>
          /%%(?:SCENE_3D|HERO_3D|SHARED_HERO_3D_SCENE|SHARED_HERO_3D|HERO_SCENE_3D|MASCOT_3D|REWARD_OBJECT_3D|HERO_3D_IMAGE)/.test(img.getAttribute('src') ?? '')
        )
        const threeDIntegrationIssues = threeDAssets.flatMap(img => {
          const issues: Array<{ role: string; issue: string; className: string; width: number; height: number }> = []
          const src = img.getAttribute('src') ?? ''
          const role = src.match(/%%(SCENE_3D|HERO_3D|SHARED_HERO_3D_SCENE|SHARED_HERO_3D|HERO_SCENE_3D|MASCOT_3D|REWARD_OBJECT_3D|HERO_3D_IMAGE)(?::|%%)/)?.[1] ?? '3D'
          const rect = img.getBoundingClientRect()
          const ancestors: HTMLElement[] = []
          let node: HTMLElement | null = img.parentElement
          while (node && ancestors.length < 5) {
            ancestors.push(node)
            node = node.parentElement
          }
          const ancestorClassText = ancestors.map(el => `${el.tagName} ${el.className ?? ''} ${el.id ?? ''}`).join(' ').toLowerCase()
          const hasStage = /(aide-visual-stage|hero-visual|mascot-stage|scene-visual|reward-stage|visual-stage|image-stage|hero-scene|hero-card|aide-card)/.test(ancestorClassText)
          const has3dClass = /(aide-hero-3d|aide-3d-asset|hero-3d|mascot|reward-object)/.test(`${img.className ?? ''}`.toLowerCase())
          const stageEl = ancestors.find(el => /(aide-visual-stage|hero-visual|mascot-stage|scene-visual|reward-stage|visual-stage|hero-scene|hero-card|aide-card)/.test(`${el.className ?? ''} ${el.id ?? ''}`.toLowerCase()))
          const stageRect = stageEl?.getBoundingClientRect()
          const nearbyMeaningful = visible.some(el => {
            if (el === img || el.contains(img)) return false
            const text = (el.textContent ?? '').trim()
            const tag = el.tagName
            if (text.length < 3 && !['BUTTON', 'A'].includes(tag)) return false
            const r = el.getBoundingClientRect()
            const xGap = Math.max(0, Math.max(rect.left, r.left) - Math.min(rect.right, r.right))
            const yGap = Math.max(0, Math.max(rect.top, r.top) - Math.min(rect.bottom, r.bottom))
            return xGap < 180 && yGap < 160
          })
          const parentText = ancestors.slice(0, 3).map(el => (el.textContent ?? '').trim()).join(' ').replace(/\s+/g, ' ')
          const hasSemanticContext = parentText.length >= 12 || nearbyMeaningful
          const hasSurface = ancestors.some(el => {
            const style = window.getComputedStyle(el)
            return style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none' || style.boxShadow !== 'none' || style.borderRadius !== '0px'
          })
          const imgStyle = window.getComputedStyle(img)
          const isSceneRole = role === 'SCENE_3D' || role === 'SHARED_HERO_3D_SCENE' || role === 'HERO_SCENE_3D'
          const min3dWidth = isSceneRole
            ? Math.min(260, vw * 0.62)
            : Math.min(200, vw * 0.50)
          const imageTooSmall = rect.width < min3dWidth
          const stageAreaRatio = stageRect ? (rect.width * rect.height) / Math.max(1, stageRect.width * stageRect.height) : 1
          const stageTooEmpty = stageRect
            ? stageAreaRatio < (isSceneRole ? 0.28 : 0.22) && !/thumb|small|mini|compact/i.test(`${img.className ?? ''} ${stageEl?.className ?? ''}`)
            : false

          if (!hasStage) issues.push({ role, issue: '3D image is not inside a visual/card/hero stage wrapper', className: img.className?.toString() ?? '', width: Math.round(rect.width), height: Math.round(rect.height) })
          if (!has3dClass) issues.push({ role, issue: '3D image is missing aide-hero-3d/aide-3d-asset class', className: img.className?.toString() ?? '', width: Math.round(rect.width), height: Math.round(rect.height) })
          if (!hasSurface && !isSceneRole) issues.push({ role, issue: 'transparent 3D has no designed surface/CSS grounding/stage background', className: img.className?.toString() ?? '', width: Math.round(rect.width), height: Math.round(rect.height) })
          if (isSceneRole && stageRect) {
            const fit = imgStyle.objectFit
            const coversStage = fit === 'cover' && rect.width >= stageRect.width * 0.92 && rect.height >= stageRect.height * 0.92
            const integratedLayer = fit === 'contain' &&
              rect.width >= Math.min(220, vw * 0.46) &&
              rect.height >= Math.min(180, vh * 0.24) &&
              (stageAreaRatio >= 0.18 || rect.width >= stageRect.width * 0.42 || rect.height >= stageRect.height * 0.45)
            if (!coversStage && !integratedLayer) {
              issues.push({ role, issue: '3D scene is neither a cover scene nor a substantial integrated scene layer', className: img.className?.toString() ?? '', width: Math.round(rect.width), height: Math.round(rect.height) })
            }
          }
          if (!hasSemanticContext) issues.push({ role, issue: '3D image is not connected to nearby copy, KPI, CTA, progress, or reward content', className: img.className?.toString() ?? '', width: Math.round(rect.width), height: Math.round(rect.height) })
          if (imageTooSmall) issues.push({ role, issue: '3D image is too small and reads like a sticker', className: img.className?.toString() ?? '', width: Math.round(rect.width), height: Math.round(rect.height) })
          if (stageTooEmpty) issues.push({ role, issue: '3D stage has too much empty space around the asset', className: img.className?.toString() ?? '', width: Math.round(rect.width), height: Math.round(rect.height) })
          // Check if a button/CTA significantly overlaps the 3D image
          const coveringButton = Array.from(document.querySelectorAll<HTMLElement>('button, a, [class*="btn"], [class*="cta"]')).find(el => {
            const br = el.getBoundingClientRect()
            if (br.width < 60 || br.height < 28) return false
            const overlapX = Math.max(0, Math.min(rect.right, br.right) - Math.max(rect.left, br.left))
            const overlapY = Math.max(0, Math.min(rect.bottom, br.bottom) - Math.max(rect.top, br.top))
            const overlapArea = overlapX * overlapY
            const imgArea = rect.width * rect.height
            return imgArea > 0 && overlapArea / imgArea > 0.25
          })
          if (coveringButton) issues.push({ role, issue: 'CTA button or interactive element covers more than 25% of the 3D image — separate them into distinct layout zones', className: img.className?.toString() ?? '', width: Math.round(rect.width), height: Math.round(rect.height) })
          return issues
        }).slice(0, 8)
        const thumbnailIssues = Array.from(document.querySelectorAll<HTMLImageElement>('img')).filter(img => {
          const src = img.getAttribute('src') ?? ''
          if (!/%%THUMB:|images\.unsplash|photo-|source\.unsplash/.test(src)) return false
          const rect = img.getBoundingClientRect()
          if (rect.width < 42 || rect.height < 42) return false
          const context = (img.closest('li, article, section, .aide-card, .card, .item')?.textContent ?? '').toLowerCase()
          const contextSuggestsPlant = /식물|몬스테라|선인장|화분|물주기|햇빛|잎|plant|monstera|cactus/.test(context)
          const srcSuggestsPlant = /plant|monstera|cactus|succulent|houseplant|indoor/.test(src.toLowerCase())
          return contextSuggestsPlant && !srcSuggestsPlant && /%%THUMB:/.test(src)
        }).slice(0, 6).map(img => {
          const rect = img.getBoundingClientRect()
          return {
            src: (img.getAttribute('src') ?? '').slice(0, 80),
            context: (img.closest('li, article, section, .aide-card, .card, .item')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        })
        return { overflowX, narrowShell, mobileChromeVisible, clipped, offscreen, firstViewportContentCount, firstViewportTextChars, firstViewportCards, firstViewportButtons, hasBrandIdentity, hasVisibleProvidedLogo, englishUiLeaks, ktdsBrandLeaks, awkwardWraps, threeDIntegrationIssues, thumbnailIssues, mediaMinWidthCount, hasTabletDesktopBreakpoint, hasDesktopExpansionCss, hasMobileNavCss, hidesMobileNavWide, fixedMobileWidthCss }
      })

      if (metrics.overflowX > 4) issues.push(`${vp.name} ${vp.width}px: horizontal overflow ${Math.round(metrics.overflowX)}px`)
      if (vp.name === 'mobile' && metrics.mediaMinWidthCount < 2) issues.push(`responsive CSS: only ${metrics.mediaMinWidthCount} min-width @media rule(s); need mobile/tablet/desktop transitions`)
      if (vp.name === 'mobile' && !metrics.hasTabletDesktopBreakpoint) issues.push('responsive CSS: no tablet/desktop min-width breakpoint detected')
      if (vp.name === 'desktop' && !metrics.hasDesktopExpansionCss) issues.push(`${vp.name} ${vp.width}px: CSS does not define a clear desktop expansion grid/sidebar/wide layout`)
      if (vp.name === 'desktop' && metrics.fixedMobileWidthCss && !metrics.hasDesktopExpansionCss) issues.push(`${vp.name} ${vp.width}px: CSS appears fixed to a mobile-width shell without wide breakpoint override`)
      if (vp.name === 'desktop' && metrics.hasMobileNavCss && !metrics.hidesMobileNavWide) issues.push(`${vp.name} ${vp.width}px: mobile/bottom nav CSS is not hidden or replaced at wide viewport`)
      if (metrics.narrowShell) issues.push(`${vp.name} ${vp.width}px: layout is still a narrow mobile shell instead of expanding responsively`)
      if (metrics.mobileChromeVisible) issues.push(`${vp.name} ${vp.width}px: mobile bottom/tab/status chrome remains visible on tablet/desktop`)
      if (metrics.offscreen.length > 0) issues.push(`${vp.name} ${vp.width}px: ${metrics.offscreen.length} visible element(s) extend outside viewport`)
      if (metrics.clipped.length > 4) issues.push(`${vp.name} ${vp.width}px: multiple text/content blocks appear clipped or internally overflowing`)
      if (!metrics.hasBrandIdentity) issues.push(`${vp.name} ${vp.width}px: header lacks a clear app brand/logo identity`)
      if (options.requireLogo && !metrics.hasVisibleProvidedLogo) issues.push(`${vp.name} ${vp.width}px: provided .aide-brand-logo image is missing or not visibly rendered in the top app/header area`)
      if (metrics.englishUiLeaks.length > 0) issues.push(`${vp.name} ${vp.width}px: Korean UI contains untranslated English labels (${metrics.englishUiLeaks.slice(0, 4).join(', ')})`)
      if (metrics.ktdsBrandLeaks.length > 0) issues.push(`${vp.name} ${vp.width}px: KTDS design-system logo/name is being used as the product brand (${metrics.ktdsBrandLeaks.join(', ')})`)
      if (metrics.awkwardWraps.length > 0) {
        const samples = metrics.awkwardWraps.slice(0, 4).map(item => `"${item.text}" ${item.width}x${item.height}`).join(', ')
        issues.push(`${vp.name} ${vp.width}px: short Korean UI labels wrap awkwardly across lines (${samples})`)
      }
      if (metrics.threeDIntegrationIssues.length > 0) {
        const samples = metrics.threeDIntegrationIssues.slice(0, 4).map(item => `${item.role}: ${item.issue} (${item.width}x${item.height})`).join('; ')
        issues.push(`${vp.name} ${vp.width}px: 3D visual is not integrated into the UI composition (${samples})`)
      }
      if (metrics.thumbnailIssues.length > 0) {
        const samples = metrics.thumbnailIssues.slice(0, 3).map(item => `"${item.context}" ${item.width}x${item.height}`).join('; ')
        issues.push(`${vp.name} ${vp.width}px: plant-care thumbnails use irrelevant or low-confidence image keywords (${samples})`)
      }
      if (metrics.firstViewportContentCount < 8) issues.push(`${vp.name} ${vp.width}px: first viewport looks too sparse (${metrics.firstViewportContentCount} meaningful visible items)`)
      if (metrics.firstViewportTextChars < (vp.name === 'mobile' ? 160 : 240)) issues.push(`${vp.name} ${vp.width}px: first viewport has too little real content text (${metrics.firstViewportTextChars} chars); design variants need enough data to compare`)
      if (metrics.firstViewportCards < (vp.name === 'mobile' ? 3 : 5)) issues.push(`${vp.name} ${vp.width}px: first viewport has too few content cards/items (${metrics.firstViewportCards}); add service-relevant comparison, recommendation, benefit, status, history, or action content`)
      if (metrics.firstViewportButtons < 1) issues.push(`${vp.name} ${vp.width}px: first viewport has no visible CTA/button`)
    } catch (err) {
      issues.push(`${vp.name} ${vp.width}px: responsive audit failed (${err instanceof Error ? err.message : String(err)})`)
    } finally {
      await page.close().catch(() => null)
    }
  }

  return [...new Set(issues)].slice(0, 12)
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
          const repairMessage = `생성된 HTML이 실제 viewport 반응형 검사를 통과하지 못했습니다. 이번 수정은 ${repairAttempt}/2번째 반응형 repair입니다.

발견된 문제:
${responsiveIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

수정 지침:
- 390px, 768px, 1440px 모두에서 horizontal overflow가 없어야 합니다.
- CSS에 최소 2개 이상의 min-width @media rule을 작성하세요. 768px 전후 tablet 전환과 1024px 전후 desktop 전환이 모두 필요합니다.
- 1024px 이상에서는 반드시 desktop 확장 구조가 보여야 합니다: 2~4컬럼 grid, sidebar/aside, 넓은 content max-width, 또는 GNB + content grid 중 하나.
- 모바일 기준 UI라도 768px 이상에서는 좁은 390px shell에 갇히지 말고 grid/flex/clamp/minmax로 확장해야 합니다.
- 768px 이상에서는 모바일 하단 탭바, 상태바, 노치, 홈 인디케이터를 숨기거나 상단/좌측 내비게이션으로 전환하세요.
- 최상위 wrapper에 width:390px, max-width:420px, height 고정값을 두지 마세요. width:100%, max-width, clamp, grid-template-columns를 사용하세요.
- 텍스트가 잘리거나 세로로 쌓이지 않게 min-width:0, flex-wrap, line-height, gap을 조정하세요.
- 버튼, CTA, 칩, 배지, 탭, 메타 라벨, 가격/시간/칼로리/평점/카테고리 같은 짧은 UI 텍스트는 한 줄로 유지하세요.
- 짧은 UI 라벨에는 white-space: nowrap, word-break: keep-all, overflow-wrap: normal, flex: 0 0 auto, min-width: max-content를 적용하세요.
- CTA/button 내부는 justify-content:center, text-align:center, letter-spacing:0으로 두고, 글자 사이가 벌어지는 space-between/grid 배치를 쓰지 마세요.
- 메타 row는 display:flex; align-items:center; gap: var(--spacing-*); flex-wrap: wrap으로 구성하고, 각 meta item은 inline-flex + white-space:nowrap으로 만드세요.
- 3D placeholder(%%SCENE_3D%%, %%HERO_3D%%)는 단독 img로 빈 공간에 두지 마세요.
- %%HERO_3D%% 이미지는 모바일 기준 width: clamp(200px, 56%, 320px), height는 히어로 높이의 90~140%이어야 합니다. 160px 이하 작은 크기는 실패입니다.
- Banner Character 패턴 필수: 히어로를 position:relative + overflow:hidden으로 만들고, 텍스트+CTA는 왼쪽 56%(z-index:2), 3D는 position:absolute; right:-6%; bottom:-10%; width:clamp(200px,56%,320px); height:130%로 배치하세요. width:100% 전체폭 CTA 버튼은 사용 금지입니다.
- CTA 버튼이 %%HERO_3D%% 이미지를 25% 이상 덮으면 실패입니다.
- 3D는 반드시 .aide-visual-stage 또는 hero/card visual wrapper 안에 넣고, img에는 .aide-hero-3d 클래스를 붙이세요.
- %%SCENE_3D%%는 과한 wallpaper가 아니라 UI 캔버스에 통합되는 큰 3D scene layer입니다. Ambient Canvas, Split Workspace, Anchored Scene, Hero Cover 중 하나를 판단하고, cover는 정말 필요한 경우에만 사용하세요. contain/right-bottom anchor/grid split도 허용됩니다.
- %%HERO_3D%%는 토큰 기반 surface, border-radius, overflow:hidden, CSS 기반 grounding(::after 또는 stage background), anchor alignment를 가진 stage 안에 배치하세요. 이미지 파일 자체에는 그림자가 없습니다.
- 3D 주변 120~180px 안에 해당 3D의 의미를 설명하는 텍스트, KPI, CTA, 진행률, 보상 정보 중 하나 이상이 있어야 합니다.
- 큰 hero/stage 안에서 3D가 작은 스티커처럼 보이면 실패입니다. 단, 무조건 같은 크기로 키우지 말고 HERO_3D/SCENE_3D 역할을 먼저 판단하세요. HERO_3D는 Banner Character/Product Object/Companion Accent/Scene Substitute 배율을 따르고, SCENE_3D는 Ambient Canvas/Split Workspace/Anchored Scene/Hero Cover 중 하나로 배치하세요.
- 헤더 상단에는 명확한 앱 브랜드/로고가 있어야 합니다. 제공된 로고가 있으면 헤더/앱바 브랜드 위치에 <span class="aide-logo-slot" aria-label="brand logo"></span> 슬롯을 유지하세요. Aide가 마지막에 실제 로고 이미지로 치환합니다. 텍스트 브랜드명으로 대체하면 실패입니다.
- KTDS는 디자인 시스템 이름일 뿐 제품 브랜드가 아닙니다. 헤더/로고/브랜드 영역의 "kt ds" 텍스트나 로고 이미지는 제거하세요. 제공된 로고가 있으면 로고 슬롯을, 로고가 없으면 브리프의 앱 이름 텍스트 브랜드를 사용하세요.
- 브랜드명, 공간명, 사용자명, 식물명은 계층을 분리하세요. 예: 앱명 "초록이" / 공간 "거실" / 식물명 "몬스테라 문이".
- 한국어 앱에서는 Today's Routine, Store, Magazine 같은 영어 UI 라벨을 쓰지 말고 "오늘의 루틴", "스토어", "매거진"처럼 한국어로 통일하세요.
- 반려식물/식물 케어 썸네일은 %%THUMB:indoor plant:...%%, %%THUMB:monstera plant:...%%, %%THUMB:houseplant care:...%%, %%THUMB:succulent plant:...%%처럼 식물 관련 키워드만 사용하세요. 어둡거나 무관한 랜덤 이미지 금지.
- 첫 viewport에는 실제 서비스 콘텐츠와 CTA가 충분히 보여야 합니다.
- A/B/C는 시안 선택용 결과물이므로 모든 시안의 첫 viewport에 비교 가능한 정보량이 있어야 합니다. 빈 히어로/포스터형 화면은 실패입니다.
- 모바일 첫 viewport에는 사용자가 서비스 목적, 현재 상태, 선택지, 다음 행동을 판단할 만큼 충분한 실제 콘텐츠가 보여야 합니다.
- 각 시안은 현재보다 한 단계 더 풍부한 정보량을 목표로 하세요.
- 첫 화면만 보고도 주요 판단 근거 4~6개를 확인할 수 있어야 합니다.
- 시안 하나의 첫 화면에는 실제 데이터 포인트 10~16개가 보여야 합니다.
- 데이터 포인트란 가격, 시간, 수량, 등급, 상태, 할인율, 적립 수, 쿠폰 수, 거리, 예상 결과, 비교 기준, 배지, 날짜 같은 판단 재료입니다.
- 콘텐츠 단위의 종류와 순서는 서비스 목적에 맞게 선택하세요. 비교 서비스라면 비교표/추천/절약액, 루틴 서비스라면 상태/미션/진행률, 커머스라면 검색/카테고리/상품, 대시보드라면 KPI/필터/작업 큐를 우선 검토하세요.
- 멤버십/통신 요금제 서비스라면 요금제 비교, 예상 절약액, 위약금/약정 상태, 추천 요금제, 멤버십 혜택, 전환 CTA를 서비스 맥락에 맞게 선택하세요.
- 브리프의 핵심 기능어를 첫 화면에 반영하세요. 단, 모든 서비스에 같은 보조 블록과 같은 순서를 강제하지 마세요.
- 시안 B가 visual/hero 중심이어도 빈 포스터가 되면 실패입니다. 전환에 필요한 계산 결과, 혜택, 추천, 신뢰 근거 중 해당 서비스에 맞는 정보를 자연스럽게 연결하세요.
- Layout Rhythm Guard — 콘텐츠 종류는 자유롭게, 간격 리듬은 고정: section gap은 var(--aide-section-gap)을 사용하고, 모바일 주요 섹션 간 실제 간격은 14~20px 범위로 유지하세요.
- card padding은 var(--aide-card-padding)을 사용하고, 모바일 주요 카드 내부 padding은 14~20px 범위로 유지하세요.
- A/B/C 모두 첫 화면 하단에 다음 섹션의 제목 또는 카드 일부가 보여야 합니다.
- A안 SCENE_3D는 modern glossy 3D scene이어야 합니다. no low-poly, no old game render, no generic 3D stock render.
- 기존 디자인 시스템 토큰, 이미지 placeholder, 데이터 URL, 라우터 스크립트, 콘텐츠 의미는 유지하세요.`
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
      const heroPrompt = normalizedParams.sharedVisualMode === '3d'
        ? (normalizedParams.sharedVisualSubject || normalizedParams.heroSubject || normalizedParams.heroImagePrompt || normalizedParams.brief)
        : (normalizedParams.heroSubject || normalizedParams.heroImagePrompt || (has3dPlaceholder ? normalizedParams.brief : undefined))
      const imageWarnings: string[] = []
      const finalHtml = await resolveImagePlaceholders(auditedRawHtml, {
        heroImagePrompt: heroPrompt,
        apiKey,
        unsplashKey,
        imageWarnings,
        paletteHint: extractDesignPaletteHint(normalizedParams.designMd),
        sceneImageModel: normalizedParams.visualPolicy === 'scene-3d' ? 'gemini-3.1-flash-image' : undefined,
        heroImageModel: normalizedParams.visualPolicy === 'creon-object-3d' ? 'gemini-2.5-flash-image' : undefined,
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
