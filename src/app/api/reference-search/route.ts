import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

type RefImage = {
  url: string
  title: string
  source: 'dribbble' | 'playstore'
}

async function fetchDribbble(keyword: string): Promise<RefImage[]> {
  const searchUrl = `https://dribbble.com/search/shots/popular?q=${encodeURIComponent(keyword)}`
  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []
  const html = await res.text()

  // Dribbble SSR: <img src="https://cdn.dribbble.com/..." loading="lazy" alt="...">
  const results: RefImage[] = []
  const imgPattern = /data-srcset="(https:\/\/cdn\.dribbble\.com\/[^"]+)"/g
  const altPattern = /alt="([^"]+)"/g
  let imgMatch: RegExpExecArray | null
  let altMatch: RegExpExecArray | null

  // Extract all CDN image URLs and alts in parallel
  const urls: string[] = []
  const alts: string[] = []

  while ((imgMatch = imgPattern.exec(html)) !== null) {
    // data-srcset may contain multiple sizes — take the first (largest)
    const firstUrl = imgMatch[1].split(' ')[0]
    if (firstUrl && !firstUrl.includes('avatar') && !firstUrl.includes('profile')) {
      urls.push(firstUrl)
    }
  }
  // Reset lastIndex before alt extraction on entire html
  let altHtml = html
  while ((altMatch = altPattern.exec(altHtml)) !== null && alts.length < urls.length + 5) {
    const alt = altMatch[1].trim()
    if (alt && alt.length > 2 && !alt.includes('Dribbble') && !alt.includes('logo')) {
      alts.push(alt)
    }
  }

  for (let i = 0; i < Math.min(urls.length, 9); i++) {
    results.push({ url: urls[i], title: alts[i] ?? `Design ${i + 1}`, source: 'dribbble' })
  }
  return results
}

async function fetchPlayStore(keyword: string): Promise<RefImage[]> {
  // Search Play Store and extract app screenshot images
  const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(keyword)}&c=apps&hl=ko`
  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []
  const html = await res.text()

  // Extract app links from search results
  const appLinks: string[] = []
  const linkPattern = /href="(\/store\/apps\/details\?id=[^"&]+)"/g
  let match: RegExpExecArray | null
  while ((match = linkPattern.exec(html)) !== null && appLinks.length < 4) {
    const link = `https://play.google.com${match[1]}`
    if (!appLinks.includes(link)) appLinks.push(link)
  }

  const results: RefImage[] = []
  await Promise.all(
    appLinks.slice(0, 3).map(async (appUrl) => {
      try {
        const appRes = await fetch(appUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9',
          },
          signal: AbortSignal.timeout(8000),
        })
        if (!appRes.ok) return
        const appHtml = await appRes.text()

        // Extract app name
        const titleMatch = appHtml.match(/<title>([^<]+)<\/title>/)
        const appName = titleMatch ? titleMatch[1].replace(' - Google Play 앱', '').trim() : '앱'

        // Play Store screenshots: https://play-lh.googleusercontent.com/... in img tags
        const screenshotPattern = /src="(https:\/\/play-lh\.googleusercontent\.com\/[A-Za-z0-9_\-]+=w\d[^"]*)"[^>]*(?:class="[^"]*screenshot|itemprop="screenshot)/g
        let ssMatch: RegExpExecArray | null
        let count = 0
        while ((ssMatch = screenshotPattern.exec(appHtml)) !== null && count < 2) {
          results.push({ url: ssMatch[1], title: `${appName} 스크린샷`, source: 'playstore' })
          count++
        }

        // Fallback: look for any play-lh screenshot-style images with specific dimensions
        if (count === 0) {
          const fallbackPattern = /src="(https:\/\/play-lh\.googleusercontent\.com\/[^"]{20,}=w\d{3}[^"]*256[^"]*)"/g
          let fbMatch: RegExpExecArray | null
          while ((fbMatch = fallbackPattern.exec(appHtml)) !== null && count < 2) {
            results.push({ url: fbMatch[1], title: `${appName} 스크린샷`, source: 'playstore' })
            count++
          }
        }
      } catch {
        // Skip failed app fetches
      }
    })
  )
  return results
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const keyword = searchParams.get('q')?.trim()
  const source = searchParams.get('source') ?? 'all'

  if (!keyword) {
    return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 })
  }

  try {
    const tasks: Promise<RefImage[]>[] = []
    if (source === 'all' || source === 'dribbble') tasks.push(fetchDribbble(keyword))
    if (source === 'all' || source === 'playstore') tasks.push(fetchPlayStore(keyword))

    const allResults = await Promise.allSettled(tasks)
    const images: RefImage[] = allResults
      .flatMap(r => r.status === 'fulfilled' ? r.value : [])
      .slice(0, 12)

    return NextResponse.json({ images })
  } catch {
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
