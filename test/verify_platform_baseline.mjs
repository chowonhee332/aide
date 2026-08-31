import assert from 'node:assert/strict'
import {
  PLATFORM_BASELINE,
  buildPlatformBaselineCss,
  injectPlatformBaseline,
  normalizePageContainer,
} from '../src/lib/platform-baseline.ts'

// 확정값 (2026-08-31 사용자 승인) — 회귀 방지
assert.equal(PLATFORM_BASELINE.breakpoint.tablet, 768)
assert.equal(PLATFORM_BASELINE.breakpoint.desktop, 1280)
assert.deepEqual(PLATFORM_BASELINE.gutter, { mobile: 16, tablet: 20, desktop: 24 })
assert.equal(PLATFORM_BASELINE.touchMin, 44)

// CSS: 세 거터 값 + 두 브레이크포인트가 미디어쿼리로 나온다
const css = buildPlatformBaselineCss()
assert.match(css, /--aide-page-padding:16px/)
assert.match(css, /@media \(min-width:768px\)[\s\S]*--aide-page-padding:20px/)
assert.match(css, /@media \(min-width:1280px\)[\s\S]*--aide-page-padding:24px/)
assert.match(css, /flex-wrap:nowrap; overflow-x:auto/) // 칩 로우 가로 스크롤
assert.match(css, /data-aide-platform-baseline="1"/)

// injectPlatformBaseline: head에 1회만, 재실행해도 중복 없음
const page = '<!DOCTYPE html><html><head><title>t</title></head><body><main>x</main></body></html>'
const once = injectPlatformBaseline(page)
assert.equal((once.match(/data-aide-platform-baseline/g) ?? []).length, 1)
assert.match(once, /<\/style>\s*<\/head>/)
const twice = injectPlatformBaseline(once)
assert.equal((twice.match(/data-aide-platform-baseline/g) ?? []).length, 1)

// normalizePageContainer: <main>에 aide-page 부여
assert.match(normalizePageContainer('<body><main class="scroll">x</main></body>'), /<main class="scroll aide-page">/)
assert.match(normalizePageContainer('<body><main>x</main></body>'), /<main class="aide-page">/)
// 이미 aide-page면 건드리지 않는다
const already = '<body><div class="aide-page">x</div></body>'
assert.equal(normalizePageContainer(already), already)
// <header> 다음 첫 컨테이너를 잡는다 (헤더에는 거터를 안 얹는다)
assert.match(
  normalizePageContainer('<body><header>h</header><div class="content">x</div></body>'),
  /<header>h<\/header><div class="content aide-page">/,
)

console.log('platform-baseline contract verified')
