/**
 * platform-baseline — 디자인 시스템·브리프와 무관하게 모든 Aide 생성물이 공유하는
 * 레이아웃 불변식. 업로드된 DESIGN.md나 aide.md가 색·타이포·컴포넌트를 바꿔도
 * 이 값들은 바뀌지 않는다. 생성 후처리에서 항상 마지막에 주입되어 우선한다.
 *
 * 확정값 (2026-08-31, 사용자 승인):
 * - breakpoints: tablet 768, desktop 1280  (mobile <768 · tablet 768–1279 · desktop ≥1280)
 * - 좌우 거터(page-padding): mobile 16 · tablet 20 · desktop 24
 * - 본문 최대폭(거터 포함): tablet 720 · desktop 1200
 * - 최소 터치 타깃: 44
 *
 * 여기서 정의하는 것: 좌우 거터, 브레이크포인트, 본문 최대폭, 최소 터치 타깃,
 * 칩/세그먼트 로우의 가로 스크롤, 앱바 줄바꿈 금지.
 * 여기서 정의하지 않는 것: 색·타이포·radius·shadow·섹션 간격·헤더/탭바 높이
 * (이건 DESIGN.md 계약과 injectDesignContractStyle 소관).
 */

export const PLATFORM_BASELINE = {
  breakpoint: { tablet: 768, desktop: 1280 },
  gutter: { mobile: 16, tablet: 20, desktop: 24 },
  contentMax: { tablet: 720, desktop: 1200 },
  touchMin: 44,
} as const

// 모델이 붙일 법한 가로 스크롤 로우 클래스명 (부분 일치)
const SCROLL_ROW_SELECTOR = [
  '[class*="chip-row"]', '[class*="chip-rail"]', '[class*="chip-scroll"]', '[class*="chip-list"]',
  '[class*="filter-row"]', '[class*="filter-scroll"]', '[class*="segment-scroll"]',
  '[class*="tab-scroll"]', '[class*="scroller"]', '[class*="h-scroll"]', '[class*="hscroll"]',
].join(',')

// 최상위 페이지 컨테이너로 흔히 쓰이는 클래스명 (부분 일치)
const PAGE_CONTAINER_SELECTOR = [
  '.aide-page', 'main', '[class*="screen"]', '[class*="page-"]', '[class*="app-shell"]',
  '[class*="mobile-shell"]', '[class*="page-shell"]', '[class*="container"]', '[class*="wrapper"]',
].join(',')

const APPBAR_SELECTOR = [
  'header', '.app-header', '.appbar', '[class*="app-bar"]', '[class*="appbar"]',
  '[class*="top-nav"]', '[class*="top-navigation"]', '.aide-shell-appbar',
].join(',')

/**
 * 항상 주입되는 baseline `<style>`. `data-aide-platform-baseline` 로 중복 제거된다.
 * 주입 순서상 injectDesignContractStyle 뒤에 와야 `--aide-page-padding` 값이 우선한다.
 */
export function buildPlatformBaselineCss(): string {
  const b = PLATFORM_BASELINE
  return `<style data-aide-platform-baseline="1">
:root{
  --aide-page-padding:${b.gutter.mobile}px;
  --aide-content-max:100%;
  --aide-touch-min:${b.touchMin}px;
  --aide-bp-tablet:${b.breakpoint.tablet}px;
  --aide-bp-desktop:${b.breakpoint.desktop}px;
}
@media (min-width:${b.breakpoint.tablet}px){
  :root{ --aide-page-padding:${b.gutter.tablet}px; --aide-content-max:${b.contentMax.tablet}px; }
}
@media (min-width:${b.breakpoint.desktop}px){
  :root{ --aide-page-padding:${b.gutter.desktop}px; --aide-content-max:${b.contentMax.desktop}px; }
}
/* 최상위 페이지 컨테이너 한 겹에만 거터를 얹는다. 중첩된 같은 성격의 컨테이너는
   거터를 0으로 눌러 이중 여백을 막는다 (:where로 특이도 0 → 명시적 클래스 규칙은 이김). */
:where(${PAGE_CONTAINER_SELECTOR}){
  box-sizing:border-box;
  width:100%;
  max-width:var(--aide-content-max);
  margin-inline:auto;
  padding-inline:var(--aide-page-padding);
}
:where(${PAGE_CONTAINER_SELECTOR}) :where(${PAGE_CONTAINER_SELECTOR}){
  max-width:none;
  padding-inline:0;
}
/* full-bleed opt-out: 페이지 거터를 상쇄해 화면 끝까지 */
:where([data-bleed],.full-bleed,[class*="full-bleed"],[class*="bleed-x"]){
  margin-inline:calc(var(--aide-page-padding) * -1);
  max-width:none;
}
/* 칩·세그먼트·필터 로우: 줄바꿈 금지, 가로 스크롤 */
:where(${SCROLL_ROW_SELECTOR}){
  display:flex; flex-wrap:nowrap; overflow-x:auto;
  gap:var(--aide-item-gap,8px);
  scrollbar-width:none; -webkit-overflow-scrolling:touch;
}
:where(${SCROLL_ROW_SELECTOR})::-webkit-scrollbar{ display:none; }
:where(${SCROLL_ROW_SELECTOR}) > *{ flex:0 0 auto; white-space:nowrap; }
/* 앱바 컨트롤은 절대 줄바꿈하지 않는다 */
:where(${APPBAR_SELECTOR}){ flex-wrap:nowrap; }
</style>`
}

/**
 * baseline `<style>` 를 `<head>` 끝에 주입한다. 이미 있으면 교체 (중복 제거).
 * 체인에서 injectDesignContractStyle 뒤, 가능한 마지막에 호출해 값이 우선하게 한다.
 */
export function injectPlatformBaseline(html: string): string {
  const css = buildPlatformBaselineCss()
  const cleaned = html.replace(
    /<style\b[^>]*data-aide-platform-baseline=["'][^"']*["'][^>]*>[\s\S]*?<\/style>/gi,
    '',
  )
  if (/<\/head>/i.test(cleaned)) return cleaned.replace(/<\/head>/i, `${css}\n</head>`)
  if (/<body[^>]*>/i.test(cleaned)) return cleaned.replace(/(<body[^>]*>)/i, `$1\n${css}`)
  return css + cleaned
}

/**
 * 최상위 콘텐츠 래퍼에 `aide-page` 클래스를 보장한다. 모델이 컨테이너 클래스명을
 * 제각각 쓰면 injectDesignContractStyle의 `.aide-page` 규칙이 안 닿아 거터가 샌다.
 */
export function normalizePageContainer(html: string): string {
  if (/class=["'][^"']*\baide-page\b/.test(html)) return html

  const addClass = (attrs: string): string => {
    if (/class=(["'])[^"']*\1/i.test(attrs)) {
      return attrs.replace(/class=(["'])([^"']*)\1/i, (_m, q, val) => `class=${q}${val} aide-page${q}`)
    }
    return ` class="aide-page"${attrs}`
  }

  // 1) <main> 이 있으면 그것이 스크롤/콘텐츠 영역이다
  if (/<main\b/i.test(html)) {
    return html.replace(/<main\b([^>]*)>/i, (_m, attrs) => `<main${addClass(attrs)}>`)
  }
  // 2) <body> 바로 다음 첫 구조 래퍼 (헤더가 <header>면 건너뛰고 그 다음 div/section)
  const afterBody = /(<body[^>]*>\s*(?:<header\b[^>]*>[\s\S]*?<\/header>\s*)?)(<(?:div|section)\b)([^>]*)>/i
  if (afterBody.test(html)) {
    return html.replace(afterBody, (_m, lead, tag, attrs) => `${lead}${tag}${addClass(attrs)}>`)
  }
  return html
}
