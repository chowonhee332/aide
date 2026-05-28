import { NextRequest, NextResponse } from 'next/server'
import type { Browser } from 'puppeteer'
import { isSafeUrl } from '@/lib/utils'

export const maxDuration = 90

type TextSample = {
  tag: string
  text: string
  href?: string | null
}

type SectionSample = {
  index: number
  role: string
  heading: string
  textSamples: string[]
  ctaSamples: string[]
  repeatedItemCount: number
}

type AsIsAnalysis = {
  sourceUrl: string
  pageTitle: string
  metaDescription: string
  pagePurpose: string
  layoutType: string
  globalNavigation: TextSample[]
  primaryCtas: TextSample[]
  forms: Array<{ label: string; fields: string[]; submitText: string }>
  sections: SectionSample[]
  repeatedPatterns: string[]
  contentInventory: {
    headings: string[]
    buttons: string[]
    links: string[]
  }
  redesignFocus: string[]
}

function uniq(values: string[], limit: number) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value.replace(/\s+/g, ' ').trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
    if (result.length >= limit) break
  }
  return result
}

function inferPurpose(title: string, headings: string[], buttons: string[]) {
  const text = `${title} ${headings.slice(0, 8).join(' ')} ${buttons.slice(0, 8).join(' ')}`.toLowerCase()
  if (/login|로그인|sign in/.test(text)) return '로그인/인증 화면'
  if (/cart|장바구니|order|주문|결제|checkout/.test(text)) return '구매/주문 전환 화면'
  if (/dashboard|대시보드|analytics|관리|통계/.test(text)) return '업무/분석 대시보드'
  if (/search|검색|find|찾기|조회/.test(text)) return '검색/탐색 중심 화면'
  if (/news|공지|소식|자료|report|리포트/.test(text)) return '정보 제공/포털 화면'
  return '서비스 홈 또는 주요 진입 화면'
}

function inferLayout(sections: SectionSample[], navCount: number, formsCount: number) {
  const hasManySections = sections.length >= 5
  const hasRepeatedLists = sections.some(s => s.repeatedItemCount >= 4)
  if (navCount >= 6 && hasManySections) return '상단 GNB 기반 포털/홈 구조'
  if (formsCount > 0 && sections.length <= 3) return '폼 중심 전환 구조'
  if (hasRepeatedLists) return '목록/카드 탐색 구조'
  if (hasManySections) return '섹션형 랜딩/콘텐츠 구조'
  return '단일 핵심 화면 구조'
}

function inferRedesignFocus(analysis: Pick<AsIsAnalysis, 'sections' | 'primaryCtas' | 'forms' | 'globalNavigation'>) {
  const focus: string[] = []
  if (analysis.primaryCtas.length === 0) focus.push('주요 CTA가 약하므로 첫 화면에서 가장 빠르게 발견되도록 재배치')
  if (analysis.globalNavigation.length >= 8) focus.push('내비게이션 항목이 많으므로 1차/2차 메뉴 위계를 명확히 정리')
  if (analysis.sections.length >= 6) focus.push('섹션이 많으므로 핵심 요약, 주요 행동, 보조 탐색의 3영역으로 스캔 가능하게 재구성')
  if (analysis.forms.length > 0) focus.push('입력 폼은 필드 그룹, 도움말, 제출 CTA의 순서를 명확히 정리')
  if (focus.length === 0) focus.push('기존 정보 구조는 유지하되 선택한 design.md의 컴포넌트 리듬으로 완성도 개선')
  focus.push('As-is의 색상/폰트/라운드/그림자는 복사하지 않고 선택된 design.md를 최종 스타일 기준으로 사용')
  return focus
}

export async function POST(req: NextRequest) {
  let browser: Browser | null = null
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })
    }

    let normalized = url.trim()
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized

    if (!isSafeUrl(normalized)) {
      return NextResponse.json({ error: '허용되지 않는 URL입니다.' }, { status: 400 })
    }

    const puppeteer = await import('puppeteer')
    browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 })
    await page.goto(normalized, { waitUntil: 'networkidle2', timeout: 45000 })
    await new Promise(r => setTimeout(r, 1800))

    await page.evaluate(async () => {
      await new Promise<void>(resolve => {
        const distance = 500
        const delay = 70
        let scrolled = 0
        const maxScroll = Math.min(document.body.scrollHeight, 9000)
        const timer = setInterval(() => {
          window.scrollBy(0, distance)
          scrolled += distance
          if (scrolled >= maxScroll) {
            window.scrollTo(0, 0)
            clearInterval(timer)
            resolve()
          }
        }, delay)
      })
    })
    await new Promise(r => setTimeout(r, 500))

    const raw = await page.evaluate(() => {
      const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()
      const visible = (el: Element) => {
        const rect = el.getBoundingClientRect()
        const style = window.getComputedStyle(el)
        return rect.width > 2 && rect.height > 2 && style.display !== 'none' && style.visibility !== 'hidden'
      }
      const textOf = (el: Element) => clean((el as HTMLElement).innerText || el.textContent || '')
      const sampleText = (selector: string, limit: number) =>
        Array.from(document.querySelectorAll(selector))
          .filter(visible)
          .map(el => ({ tag: el.tagName.toLowerCase(), text: textOf(el).slice(0, 90), href: (el as HTMLAnchorElement).href || null }))
          .filter(item => item.text)
          .slice(0, limit)

      const navigation = sampleText('header a, nav a, [role="navigation"] a, .gnb a, .nav a, .menu a', 24)
      const buttons = sampleText('button, a[role="button"], input[type="submit"], .btn, [class*="button"], [class*="Button"]', 36)
      const headings = sampleText('h1,h2,h3,[class*="title"],[class*="Title"],[class*="heading"],[class*="Heading"]', 40)
      const links = sampleText('main a, section a, article a', 48)

      const sectionEls = Array.from(document.querySelectorAll('main section, section, article, [role="main"] > div, main > div'))
        .filter(visible)
        .slice(0, 16)

      const sections = sectionEls.map((section, index) => {
        const heading = textOf(section.querySelector('h1,h2,h3,[class*="title"],[class*="Title"],[class*="heading"],[class*="Heading"]') || section).slice(0, 80)
        const texts = Array.from(section.querySelectorAll('p,li,span,strong,em'))
          .filter(visible)
          .map(el => textOf(el))
          .filter(text => text.length >= 4 && text.length <= 120)
          .slice(0, 8)
        const ctas = Array.from(section.querySelectorAll('button,a[role="button"],a,.btn,[class*="button"],[class*="Button"]'))
          .filter(visible)
          .map(el => textOf(el))
          .filter(text => text.length >= 2 && text.length <= 40)
          .slice(0, 5)
        const repeatedItemCount = Math.max(
          section.querySelectorAll('li').length,
          section.querySelectorAll('article').length,
          section.querySelectorAll('[class*="card"],[class*="Card"],[class*="item"],[class*="Item"]').length,
        )
        return {
          index: index + 1,
          role: section.getAttribute('role') || section.tagName.toLowerCase(),
          heading,
          textSamples: texts,
          ctaSamples: ctas,
          repeatedItemCount,
        }
      })

      const forms = Array.from(document.querySelectorAll('form')).filter(visible).slice(0, 8).map(form => ({
        label: textOf(form.querySelector('h1,h2,h3,legend,label') || form).slice(0, 80),
        fields: Array.from(form.querySelectorAll('input,select,textarea')).map(field => clean((field as HTMLInputElement).placeholder || field.getAttribute('name') || field.getAttribute('aria-label') || field.id)).filter(Boolean).slice(0, 12),
        submitText: textOf(form.querySelector('button,input[type="submit"]') || form).slice(0, 60),
      }))

      const patternCandidates = [
        ['card', document.querySelectorAll('[class*="card"],[class*="Card"],article').length],
        ['list', document.querySelectorAll('ul li, ol li').length],
        ['table', document.querySelectorAll('table tr').length],
        ['banner/carousel', document.querySelectorAll('[class*="banner"],[class*="Banner"],[class*="carousel"],[class*="slide"]').length],
        ['form', document.querySelectorAll('form input, form select, form textarea').length],
      ].filter(([, count]) => Number(count) > 0).map(([label, count]) => `${label}: ${count}개 감지`)

      return {
        title: clean(document.title),
        description: clean(document.querySelector('meta[name="description"]')?.getAttribute('content')),
        navigation,
        buttons,
        headings,
        links,
        sections,
        forms,
        patterns: patternCandidates,
      }
    })

    const headings = uniq(raw.headings.map(item => item.text), 18)
    const buttons = uniq(raw.buttons.map(item => item.text), 18)
    const links = uniq(raw.links.map(item => item.text), 18)
    const sections = raw.sections
      .filter(section => section.heading || section.textSamples.length > 0 || section.ctaSamples.length > 0)
      .slice(0, 12)
      .map(section => ({
        ...section,
        textSamples: uniq(section.textSamples, 6),
        ctaSamples: uniq(section.ctaSamples, 5),
      }))

    const base = {
      sourceUrl: normalized,
      pageTitle: raw.title,
      metaDescription: raw.description,
      globalNavigation: raw.navigation.slice(0, 18),
      primaryCtas: raw.buttons.slice(0, 12),
      forms: raw.forms,
      sections,
      repeatedPatterns: raw.patterns,
      contentInventory: { headings, buttons, links },
    }

    const analysis: AsIsAnalysis = {
      ...base,
      pagePurpose: inferPurpose(raw.title, headings, buttons),
      layoutType: inferLayout(sections, raw.navigation.length, raw.forms.length),
      redesignFocus: inferRedesignFocus(base),
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `As-is 분석 실패: ${message}` }, { status: 500 })
  } finally {
    await browser?.close().catch(() => null)
  }
}
