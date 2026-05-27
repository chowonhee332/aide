import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'

export const maxDuration = 120

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

// Extract CSS variable values from HTML string
function extractCssVars(html: string): Record<string, string> {
  const vars: Record<string, string> = {}
  const rootMatch = html.match(/:root\s*\{([^}]+)\}/)
  if (rootMatch) {
    const block = rootMatch[1]
    const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g
    let m
    while ((m = varRegex.exec(block)) !== null) {
      vars[`--${m[1]}`] = m[2].trim()
    }
  }
  return vars
}

// Infer design tokens from CSS vars
function buildDesignTokens(cssVars: Record<string, string>) {
  const colors: Record<string, string> = {}
  const spacing: Record<string, string> = {}
  const rounded: Record<string, string> = {}
  const typography: Record<string, string> = {}

  for (const [key, val] of Object.entries(cssVars)) {
    if (key.startsWith('--color-')) colors[key.replace('--color-', '')] = val
    else if (key.startsWith('--spacing-')) spacing[key.replace('--spacing-', '')] = val
    else if (key.startsWith('--rounded-')) rounded[key.replace('--rounded-', '')] = val
    else if (key.startsWith('--font-')) typography[key.replace('--font-', '')] = val
  }

  return { colors, spacing, rounded, typography }
}

export async function POST(req: NextRequest) {
  let browser: Browser | null = null

  try {
    const body = await req.json()
    const { html, platform, screens: screenList } = body as {
      html: string
      platform: 'mobile' | 'web'
      screens: Array<{ id: string; label: string }>
    }

    if (!html) {
      return NextResponse.json({ error: 'html is required' }, { status: 400 })
    }

    const isWeb = platform === 'web'
    const vpWidth = isWeb ? 1440 : 390
    const vpHeight = isWeb ? 1024 : 844

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

    const screensToCapture: Array<{ id: string; label: string }> =
      screenList && screenList.length > 0 ? screenList : [{ id: '__main__', label: '메인 화면' }]

    const capturedScreens: Array<{
      id: string
      label: string
      imageBase64: string
      width: number
      height: number
      domTree: unknown
    }> = []

    for (const screen of screensToCapture) {
      const page = await browser.newPage()
      await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: 2 })

      // Inject script to activate the specific screen before rendering
      const activationScript =
        screen.id === '__main__'
          ? ''
          : `<script>
window.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.aide-screen').forEach(function(s) { s.classList.remove('active'); });
  var t = document.getElementById('${screen.id}');
  if (t) t.classList.add('active');
});
</script>`

      const injectedHtml = html.includes('</head>')
        ? html.replace('</head>', activationScript + '</head>')
        : activationScript + html

      await page.setContent(injectedHtml, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await new Promise(r => setTimeout(r, 1200))
      await page.evaluate(() => document.fonts.ready.then(() => null)).catch(() => null)

      const screenshot = await page.screenshot({
        type: 'png',
        encoding: 'base64',
        fullPage: false,
        optimizeForSpeed: false,
      })

      // Extract DOM tree with computed styles for Figma layer import
      const domTree = await page.evaluate(function () {
        let nodeCount = 0
        const MAX_NODES = 500
        const SKIP_TAGS = new Set(['script', 'style', 'meta', 'link', 'noscript', 'head', 'defs', 'use', 'symbol'])

        function extractNode(el: Element, depth: number): Record<string, unknown> | null {
          if (nodeCount >= MAX_NODES || depth > 9) return null
          const tag = el.tagName.toLowerCase()
          if (SKIP_TAGS.has(tag)) return null

          const rect = el.getBoundingClientRect()
          if (rect.width < 1 || rect.height < 1) return null

          const s = window.getComputedStyle(el)
          if (s.display === 'none' || s.visibility === 'hidden') return null

          let directText = ''
          for (let i = 0; i < el.childNodes.length; i++) {
            const child = el.childNodes[i]
            if (child.nodeType === 3 && child.textContent) {
              directText += child.textContent
            }
          }
          directText = directText.trim()

          nodeCount++

          const children: Array<Record<string, unknown>> = []
          // Don't recurse into SVG internals — treat whole SVG as one box
          if (tag !== 'svg' && el.children) {
            for (let i = 0; i < el.children.length; i++) {
              const child = extractNode(el.children[i], depth + 1)
              if (child) children.push(child)
            }
          }

          const fontFamilyRaw = s.fontFamily || ''
          const fontFamily = fontFamilyRaw.split(',')[0].replace(/['"]/g, '').trim()

          return {
            tag,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            text: directText || null,
            styles: {
              backgroundColor: s.backgroundColor,
              color: s.color,
              fontSize: s.fontSize,
              fontWeight: s.fontWeight,
              fontFamily,
              fontStyle: s.fontStyle,
              borderTopLeftRadius: s.borderTopLeftRadius,
              borderTopRightRadius: s.borderTopRightRadius,
              borderBottomLeftRadius: s.borderBottomLeftRadius,
              borderBottomRightRadius: s.borderBottomRightRadius,
              opacity: s.opacity,
              overflow: s.overflow,
              borderColor: s.borderColor,
              borderWidth: s.borderWidth,
              borderStyle: s.borderStyle,
              lineHeight: s.lineHeight,
              textAlign: s.textAlign,
              letterSpacing: s.letterSpacing,
            },
            children,
          }
        }

        return extractNode(document.body, 0)
      }).catch((e) => {
        console.warn('[export-figma] DOM extraction failed:', e)
        return null
      })

      capturedScreens.push({
        id: screen.id,
        label: screen.label,
        imageBase64: screenshot as string,
        width: vpWidth,
        height: vpHeight,
        domTree,
      })

      await page.close()
    }

    const cssVars = extractCssVars(html)
    const designTokens = buildDesignTokens(cssVars)

    const exportBundle = {
      version: '2.0',
      platform,
      designTokens,
      screens: capturedScreens,
      exportedAt: new Date().toISOString(),
    }

    return NextResponse.json(exportBundle)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[export-figma] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (browser) await safeBrowserClose(browser)
  }
}
