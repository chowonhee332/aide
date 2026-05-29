import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 180

type ExportScreen = {
  id: string
  label: string
}

function buildScreenHtml(html: string, screen?: ExportScreen) {
  if (!screen || screen.id === '__main__') return html

  const safeId = screen.id.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const screenStyle = `<style id="aide-figma-export-screen">
    .aide-screen{display:none!important;}
    #${screen.id}{display:block!important;position:relative!important;top:auto!important;left:auto!important;width:100%!important;height:100%!important;overflow:hidden!important;}
  </style>`
  const activationScript = `<script>
    window.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.aide-screen').forEach(function(s){ s.classList.remove('active'); });
      var target = document.getElementById('${safeId}');
      if (target) target.classList.add('active');
    });
  </script>`

  if (html.includes('</head>')) {
    return html.replace('</head>', `${screenStyle}${activationScript}</head>`)
  }
  return `${screenStyle}${activationScript}${html}`
}

async function readCodeToDesignResponse(response: Response) {
  if (response.status === 303) {
    const location = response.headers.get('location')
    if (!location) throw new Error('code.to.design returned 303 without a download URL')
    const redirected = await fetch(location)
    if (!redirected.ok) {
      throw new Error(`code.to.design download failed: ${redirected.status} ${await redirected.text()}`)
    }
    return redirected.text()
  }

  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || `code.to.design failed: ${response.status}`)
  }
  return text
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-code-to-design-key') || process.env.CODE_TO_DESIGN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'code.to.design API Key is not configured. Add CODE_TO_DESIGN_API_KEY on the server or save it in the API Key modal.' }, { status: 500 })
    }

    const body = await req.json()
    const { html, platform, screens: screenList } = body as {
      html: string
      platform: 'mobile' | 'web'
      screens?: ExportScreen[]
    }

    if (!html) {
      return NextResponse.json({ error: 'html is required' }, { status: 400 })
    }

    const isWeb = platform === 'web'
    const width = isWeb ? 1440 : 390
    const height = isWeb ? 1024 : 844
    const screensToExport = screenList && screenList.length > 0
      ? screenList
      : [{ id: '__main__', label: 'Main' }]

    const endpoint = screensToExport.length > 1 ? '/html-multi' : '/html'
    const payload = screensToExport.length > 1
      ? {
          screens: screensToExport.map(screen => ({
            html: buildScreenHtml(html, screen),
          })),
          clip: true,
          fullsizeImages: true,
        }
      : {
          html: buildScreenHtml(html, screensToExport[0]),
          clip: true,
          width,
          height,
          fullsizeImages: true,
        }

    const response = await fetch(`https://api.to.design${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'manual',
    })

    const clipboardHtml = await readCodeToDesignResponse(response)

    return NextResponse.json({
      version: 'code.to.design',
      mode: screensToExport.length > 1 ? 'html-multi' : 'html',
      platform,
      screenCount: screensToExport.length,
      clipboardHtml,
      exportedAt: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[export-figma] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
