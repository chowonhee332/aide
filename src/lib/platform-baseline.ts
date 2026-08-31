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
 * 칩/세그먼트 로우의 가로 스크롤, 앱바·버튼·배지 라벨 줄바꿈 금지.
 * 여기서 정의하지 않는 것: 색·타이포·radius·shadow·섹션 간격·헤더/탭바 높이
 * (이건 DESIGN.md 계약과 injectDesignContractStyle 소관).
 */

export const PLATFORM_BASELINE = {
  breakpoint: { tablet: 768, desktop: 1280 },
  gutter: { mobile: 16, tablet: 20, desktop: 24 },
  contentMax: { tablet: 720, desktop: 1200 },
  touchMin: 44,          // Apple HIG 44 · WCAG 2.1 SC 2.5.5(AAA). Material 48, WCAG 2.2 AA 24
  fontControl: 16,       // iOS Safari: <16px input 포커스 시 자동 줌 (WebKit 동작 우회, 스펙 아님)
  captionFloor: 12,      // 캡션/메타 텍스트 하한 (관례)
  lineMax: '68ch',       // 본문 줄길이 상한 (Bringhurst 45–75자, 웹 표준 아님)
  focusRing: 2,          // 포커스 링 두께 px (WCAG 2.4.7은 "보임" 필수, 두께는 관례)
  z: { header: 100, bottomBar: 100, sticky: 90, sheet: 200, modal: 300, toast: 400, tooltip: 500 },
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

// 탭 타깃 하한을 적용할 버튼류 (본문 인라인 <a>는 제외 — 텍스트 링크는 44px면 깨진다)
const TAP_TARGET_SELECTOR = [
  'button', '[role="button"]', 'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]',
  '[class*="btn"]', '[class*="button"]', '[class*="chip"]', '[class*="tab-item"]',
  '[class*="icon-btn"]', '[class*="icon-button"]', 'a[class*="btn"]', 'a[role="button"]',
].join(',')

// 라벨이 절대 줄바꿈되면 안 되는 액션/상태 요소 (부분 일치) — 폼 <label> 태그는 제외
const ACTION_LABEL_SELECTOR = [
  'button', '[role="button"]', 'input[type="button"]', 'input[type="submit"]',
  '[class*="btn"]', '[class*="button"]', '[class*="chip"]', '[class*="badge"]',
  '[class*="tag"]', '[class*="pill"]', '[class*="status"]', '[class*="label-"]',
].join(',')

const BODY_TEXT_SELECTOR = [
  'p', 'li', 'dd', 'blockquote', '[class*="body-text"]', '[class*="description"]',
  '[class*="paragraph"]', '[class*="summary"]',
].join(',')

const BOTTOM_FIXED_SELECTOR = [
  '.bottom-navigation', '[class*="tabbar"]', '[class*="tab-bar"]', '[class*="bottom-bar"]',
  '[class*="bottom-nav"]', '[class*="fixed-bottom"]', '.nav-bottom',
].join(',')

const OVERLAY_MAP: Array<[string, keyof typeof PLATFORM_BASELINE.z]> = [
  ['[class*="sheet"],[class*="drawer"],[class*="bottom-sheet"]', 'sheet'],
  ['[class*="modal"],[role="dialog"],[class*="dialog"]', 'modal'],
  ['[class*="toast"],[class*="snackbar"]', 'toast'],
  ['[class*="tooltip"],[role="tooltip"]', 'tooltip'],
]

/**
 * 항상 주입되는 baseline `<style>`. `data-aide-platform-baseline` 로 중복 제거된다.
 * 주입 순서상 injectDesignContractStyle 뒤에 와야 값이 우선한다.
 *
 * 3층 구조:
 *  - 접근성 (WCAG/CSS 스펙): 재스타일은 되지만 제거 불가하게 일반 특이도로
 *  - Aide의 선택 (관례·프로젝트 결정): :where() 특이도 0 → DESIGN.md가 덮을 수 있음
 */
export function buildPlatformBaselineCss(): string {
  const b = PLATFORM_BASELINE
  const zVars = Object.entries(b.z).map(([k, v]) => `  --aide-z-${k}:${v};`).join('\n')
  const overlayRules = OVERLAY_MAP.map(([sel, key]) => `:where(${sel}){ z-index:var(--aide-z-${key}); }`).join('\n')
  return `<style data-aide-platform-baseline="1">
:root{
  --aide-page-padding:${b.gutter.mobile}px;
  --aide-content-max:100%;
  --aide-touch-min:${b.touchMin}px;
  --aide-bp-tablet:${b.breakpoint.tablet}px;
  --aide-bp-desktop:${b.breakpoint.desktop}px;
  --aide-line-max:${b.lineMax};
  scroll-padding-top:var(--aide-header-height,56px);
${zVars}
}
@media (min-width:${b.breakpoint.tablet}px){
  :root{ --aide-page-padding:${b.gutter.tablet}px; --aide-content-max:${b.contentMax.tablet}px; }
}
@media (min-width:${b.breakpoint.desktop}px){
  :root{ --aide-page-padding:${b.gutter.desktop}px; --aide-content-max:${b.contentMax.desktop}px; }
}

/* ── 리셋 (관례) ── */
*,*::before,*::after{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
/* overflow-x:clip 은 스크롤 컨테이너를 만들지 않아 position:sticky 헤더를 안 깬다 (hidden 과 다름) */
html,body{ overflow-x:clip; }
body{ word-break:keep-all; overflow-wrap:break-word; }
:where(code,pre,kbd,samp,[class*="url"],[class*="mono"],[class*="code"]){ word-break:normal; overflow-wrap:normal; }
img,video,svg{ max-width:100%; }
img,video{ height:auto; }

/* ── 페이지 컨테이너: 한 겹에만 거터, 중첩은 0 (:where 특이도 0) ── */
:where(${PAGE_CONTAINER_SELECTOR}){
  box-sizing:border-box; width:100%;
  max-width:var(--aide-content-max);
  margin-inline:auto;
  padding-inline:var(--aide-page-padding);
}
:where(${PAGE_CONTAINER_SELECTOR}) :where(${PAGE_CONTAINER_SELECTOR}){ max-width:none; padding-inline:0; }
:where([data-bleed],.full-bleed,[class*="full-bleed"],[class*="bleed-x"]){
  margin-inline:calc(var(--aide-page-padding) * -1); max-width:none;
}

/* ── 칩·세그먼트·필터 로우: 줄바꿈 금지, 가로 스크롤 (Aide 선택) ── */
:where(${SCROLL_ROW_SELECTOR}){
  display:flex; flex-wrap:nowrap; overflow-x:auto;
  gap:var(--aide-item-gap,8px);
  scrollbar-width:none; -webkit-overflow-scrolling:touch;
}
:where(${SCROLL_ROW_SELECTOR})::-webkit-scrollbar{ display:none; }
:where(${SCROLL_ROW_SELECTOR}) > *{ flex:0 0 auto; white-space:nowrap; }
:where(${APPBAR_SELECTOR}){ flex-wrap:nowrap; }

/* ── 액션 버튼·상태 배지·칩 라벨: 한 줄 고정, 플렉스 로우에서 안 찌그러짐 (Aide 선택) ── */
:where(${ACTION_LABEL_SELECTOR}){ white-space:nowrap; flex-shrink:0; }

/* ── 탭 타깃 하한 (Apple HIG / WCAG 2.5.5) — 인라인 텍스트 링크는 제외 ── */
:where(${TAP_TARGET_SELECTOR}){ min-height:var(--aide-touch-min); }
:where([class*="icon-btn"],[class*="icon-button"],[aria-label]:is(button,a[role="button"])){ min-width:var(--aide-touch-min); }
/* iOS 자동 줌 방지 (WebKit) */
input,select,textarea{ font-size:max(${b.fontControl}px, 1em); }
/* 캡션·메타 텍스트 하한 (관례) */
:where(small,[class*="caption"],[class*="micro"],[class*="meta"],[class*="footnote"],[class*="helper"]){
  font-size:max(${b.captionFloor}px, 0.75rem);
}

/* ── z-index 사다리 (Aide 선택) ── */
:where(${APPBAR_SELECTOR}){ z-index:var(--aide-z-header); }
:where(${BOTTOM_FIXED_SELECTOR}){ z-index:var(--aide-z-bottomBar); padding-bottom:env(safe-area-inset-bottom); }
${overlayRules}

/* ── 접근성: 재스타일 O / 제거 X (일반 특이도 + 마지막 주입) ── */
a:focus-visible,button:focus-visible,[role="button"]:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{
  outline:${b.focusRing}px solid var(--color-primary, #1a73e8);
  outline-offset:2px;
}
:focus:not(:focus-visible){ outline:none; }
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.01ms !important; animation-iteration-count:1 !important;
    transition-duration:.01ms !important; scroll-behavior:auto !important;
  }
}
@media (hover:none){
  :where(button,a[role="button"],[class*="btn"],[class*="chip"]):active{ opacity:.7; }
}

/* ── 본문 줄길이 상한 + disabled 일관성 (Aide 선택) ── */
:where(${BODY_TEXT_SELECTOR}){ max-width:var(--aide-line-max); }
:where([disabled],[aria-disabled="true"]){ pointer-events:none; cursor:not-allowed; opacity:.5; }
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
