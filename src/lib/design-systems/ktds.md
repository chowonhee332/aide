---
name: KTDS Design System
version: "1.0.0"
description: "KT DS 엔터프라이즈 UI 시스템 — Clarity(명확성) · Trust(신뢰감) · Efficiency(효율성)를 핵심 철학으로 한다. 화이트 서피스(#ffffff)와 쿨 뉴트럴 구조 위에 Primary Blue(#1a75ff)를 유일한 인터랙션 강조색으로 사용한다. 버튼은 8px 라운드 사각형(pill 절대 금지), 입력 필드 52px, 카드 16px 라운드에 subtle shadow. 페이지 배경은 반드시 surface-alt(#f7f7f8), 카드/컴포넌트 배경은 surface(#ffffff). Pretendard 폰트. 모바일=하단 탭 바, 데스크톱=좌측 레일(240px). Material Design 3 시맨틱 토큰 아키텍처 기반."
md3Base: true

colors:
  # Brand Primary
  primary:              "#1a75ff"
  primary-text:         "#155dd8"
  primary-fill-neutral: "#f2f5f9"
  primary-border:       "#1a75ff"
  on-primary:           "#ffffff"
  # Neutral Surface
  surface:              "#ffffff"
  surface-alt:          "#f7f7f8"
  # Neutral Text
  text:                 "#16171a"
  text-neutral:         "rgba(46,47,51,0.88)"
  text-alternative:     "rgba(53,54,58,0.61)"
  text-assistive:       "rgba(53,54,58,0.28)"
  text-strong:          "#000000"
  # Neutral Border
  border:               "rgba(112,115,120,0.35)"
  border-neutral:       "rgba(112,115,120,0.28)"
  border-alt:           "rgba(112,115,120,0.16)"
  # Neutral Fill
  fill:                 "rgba(112,115,120,0.22)"
  fill-neutral:         "rgba(112,115,120,0.12)"
  fill-alt:             "rgba(112,115,120,0.08)"
  # Icon
  icon:                 "#16171a"
  icon-neutral:         "rgba(46,47,51,0.88)"
  # Interaction States
  surface-disabled:     "#f4f4f5"
  text-disabled:        "rgba(53,54,58,0.35)"
  surface-inactive:     "#eaebec"
  # Status
  positive:             "#00c244"
  caution:              "#ff9200"
  negative:             "#ff4242"
  info:                 "#0066ff"

typography:
  display:
    fontFamily: Pretendard
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.5px
  headline:
    fontFamily: Pretendard
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: -0.3px
  title1:
    fontFamily: Pretendard
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
  title2:
    fontFamily: Pretendard
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.44
  body1:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body2:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
  caption1:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  caption2:
    fontFamily: Pretendard
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.36

rounded:
  none: 0px
  xs:   2px
  sm:   4px
  md:   8px
  lg:   12px
  xl:   16px
  2xl:  20px
  full: 9999px

spacing:
  xxs:     4px
  xs:      8px
  sm:      12px
  base:    16px
  md:      20px
  lg:      24px
  lg-alt:  28px
  xl:      32px
  2xl:     40px
  3xl:     48px
  4xl:     56px
  section: 64px
  5xl:     72px
  6xl:     80px

components:
  button:
    primary:
      backgroundColor: "{colors.primary}"
      textColor: "{colors.on-primary}"
      typography: "{typography.label}"
      rounded: "{rounded.md}"
      height: "48px"
      padding: "0 24px"
    primary-hover:
      backgroundColor: "{colors.primary-text}"
      textColor: "{colors.on-primary}"
      typography: "{typography.label}"
      rounded: "{rounded.md}"
      height: "48px"
      padding: "0 24px"
    primary-pressed:
      backgroundColor: "#0f4dab"
      textColor: "{colors.on-primary}"
      typography: "{typography.label}"
      rounded: "{rounded.md}"
      height: "48px"
      padding: "0 24px"
    secondary:
      backgroundColor: "{colors.fill-neutral}"
      textColor: "{colors.text}"
      typography: "{typography.label}"
      rounded: "{rounded.md}"
      height: "48px"
      padding: "0 24px"
    secondary-hover:
      backgroundColor: "{colors.fill-alt}"
      textColor: "{colors.text}"
      typography: "{typography.label}"
      rounded: "{rounded.md}"
      height: "48px"
      padding: "0 24px"
    outline:
      backgroundColor: "transparent"
      textColor: "{colors.text}"
      typography: "{typography.label}"
      rounded: "{rounded.md}"
      height: "48px"
      padding: "0 24px"
      border: "1px solid {colors.border}"
    ghost:
      backgroundColor: "transparent"
      textColor: "{colors.text}"
      typography: "{typography.label}"
      height: "48px"
      padding: "0 12px"
    negative:
      backgroundColor: "{colors.negative}"
      textColor: "{colors.on-primary}"
      typography: "{typography.label}"
      rounded: "{rounded.md}"
      height: "48px"
      padding: "0 24px"
    disabled:
      backgroundColor: "{colors.surface-disabled}"
      textColor: "{colors.text-disabled}"
      typography: "{typography.label}"
      rounded: "{rounded.md}"
      height: "48px"
      padding: "0 24px"
      border: "1px solid {colors.border-alt}"
    fab:
      backgroundColor: "{colors.primary}"
      textColor: "{colors.on-primary}"
      rounded: "{rounded.full}"
  input:
    default:
      backgroundColor: "{colors.surface}"
      textColor: "{colors.text}"
      typography: "{typography.body1}"
      rounded: "{rounded.md}"
      height: "52px"
      border: "1px solid {colors.border}"
    focused:
      border: "1px solid {colors.primary-border}"
    error:
      border: "1px solid {colors.negative}"
    disabled:
      backgroundColor: "{colors.surface-disabled}"
      textColor: "{colors.text-disabled}"
  card:
    default:
      backgroundColor: "{colors.surface}"
      rounded: "{rounded.xl}"
      padding: "{spacing.md}"
      border: "1px solid {colors.border-alt}"
      shadow: "0 2px 8px rgba(0,0,0,0.06)"
  list-item:
    default:
      backgroundColor: "{colors.surface}"
      textColor: "{colors.text}"
      typography: "{typography.body1}"
      minHeight: "56px"
      padding: "0 {spacing.base}"
      border: "0 0 1px {colors.border-alt} solid"
  chip:
    default:
      backgroundColor: "transparent"
      textColor: "{colors.text}"
      typography: "{typography.body2}"
      rounded: "{rounded.full}"
      height: "32px"
      padding: "0 {spacing.sm}"
      border: "1px solid {colors.border}"
    selected:
      backgroundColor: "{colors.primary-fill-neutral}"
      textColor: "{colors.primary-text}"
      typography: "{typography.body2}"
      rounded: "{rounded.full}"
      height: "32px"
      padding: "0 {spacing.sm}"
      border: "1px solid {colors.primary}"
  badge:
    positive:
      backgroundColor: "{colors.positive}"
      textColor: "{colors.on-primary}"
      typography: "{typography.caption1}"
      rounded: "{rounded.full}"
      padding: "2px 8px"
    negative:
      backgroundColor: "{colors.negative}"
      textColor: "{colors.on-primary}"
      typography: "{typography.caption1}"
      rounded: "{rounded.full}"
      padding: "2px 8px"
    caution:
      backgroundColor: "{colors.caution}"
      textColor: "{colors.on-primary}"
      typography: "{typography.caption1}"
      rounded: "{rounded.full}"
      padding: "2px 8px"
    info:
      backgroundColor: "{colors.info}"
      textColor: "{colors.on-primary}"
      typography: "{typography.caption1}"
      rounded: "{rounded.full}"
      padding: "2px 8px"
  nav-bar:
    default:
      backgroundColor: "{colors.surface}"
      border: "1px solid {colors.border-alt}"
    item-active:
      textColor: "{colors.primary}"
      iconColor: "{colors.primary}"
    item-inactive:
      textColor: "{colors.text-alternative}"
      iconColor: "{colors.icon-neutral}"
  modal:
    default:
      backgroundColor: "{colors.surface}"
      rounded: "{rounded.xl}"
      padding: "{spacing.lg}"
      shadow: "0 8px 32px rgba(0,0,0,0.16)"
      maxWidth: "480px"
  bottom-sheet:
    default:
      backgroundColor: "{colors.surface}"
      rounded: "{rounded.2xl} {rounded.2xl} 0 0"
      padding: "{spacing.base} {spacing.lg}"
  snackbar:
    default:
      backgroundColor: "#28292c"
      textColor: "#ffffff"
      rounded: "{rounded.md}"
  checkbox:
    default:
      width: "20px"
      height: "20px"
      rounded: "{rounded.xs}"
      border: "1.5px solid {colors.border}"
      backgroundColor: "{colors.surface}"
    checked:
      backgroundColor: "{colors.primary}"
      border: "1.5px solid {colors.primary}"
      checkColor: "{colors.on-primary}"
    disabled:
      backgroundColor: "{colors.surface-disabled}"
      border: "1.5px solid {colors.border-alt}"
  radio:
    default:
      width: "20px"
      height: "20px"
      rounded: "{rounded.full}"
      border: "1.5px solid {colors.border}"
      backgroundColor: "{colors.surface}"
    selected:
      border: "1.5px solid {colors.primary}"
      innerDot: "10px solid {colors.primary}"
    disabled:
      border: "1.5px solid {colors.border-alt}"
      innerDot: "10px solid {colors.text-disabled}"
  toggle:
    off:
      width: "48px"
      height: "28px"
      rounded: "{rounded.full}"
      backgroundColor: "{colors.fill}"
      thumbColor: "{colors.surface}"
      thumbSize: "22px"
    on:
      backgroundColor: "{colors.primary}"
      thumbColor: "{colors.on-primary}"
    disabled:
      backgroundColor: "{colors.surface-disabled}"
      thumbColor: "{colors.surface-inactive}"
  select:
    default:
      backgroundColor: "{colors.surface}"
      textColor: "{colors.text}"
      typography: "{typography.body1}"
      rounded: "{rounded.md}"
      height: "52px"
      border: "1px solid {colors.border}"
      iconColor: "{colors.icon-neutral}"
    focused:
      border: "1px solid {colors.primary-border}"
  tab:
    bar:
      backgroundColor: "{colors.surface}"
      borderBottom: "1px solid {colors.border-alt}"
      height: "48px"
    item-active:
      textColor: "{colors.primary}"
      typography: "{typography.label}"
      borderBottom: "2px solid {colors.primary}"
    item-inactive:
      textColor: "{colors.text-alternative}"
      typography: "{typography.body2}"
  breadcrumb:
    item:
      textColor: "{colors.text-alternative}"
      typography: "{typography.body2}"
    current:
      textColor: "{colors.text}"
      typography: "{typography.label}"
  pagination:
    item:
      backgroundColor: "transparent"
      textColor: "{colors.text}"
      typography: "{typography.body2}"
      rounded: "{rounded.sm}"
      width: "36px"
      height: "36px"
    item-active:
      backgroundColor: "{colors.primary}"
      textColor: "{colors.on-primary}"
      typography: "{typography.label}"
      rounded: "{rounded.sm}"
    item-disabled:
      textColor: "{colors.text-disabled}"
  stepper:
    step-default:
      indicatorSize: "32px"
      indicatorBg: "{colors.fill-neutral}"
      indicatorText: "{colors.text}"
      typography: "{typography.caption1}"
      rounded: "{rounded.full}"
    step-active:
      indicatorBg: "{colors.primary}"
      indicatorText: "{colors.on-primary}"
    step-done:
      indicatorBg: "{colors.primary-fill-neutral}"
      indicatorText: "{colors.primary-text}"
  progress-bar:
    default:
      height: "4px"
      trackColor: "{colors.fill-neutral}"
      fillColor: "{colors.primary}"
      rounded: "{rounded.full}"
  skeleton:
    default:
      backgroundColor: "{colors.fill-alt}"
      shimmerColor: "{colors.fill-neutral}"
      rounded: "{rounded.sm}"
  alert:
    positive:
      backgroundColor: "#d9ffe6"
      textColor: "#009632"
      iconColor: "#009632"
      rounded: "{rounded.md}"
      padding: "12px {spacing.base}"
      border: "1px solid {colors.positive}"
    negative:
      backgroundColor: "#feecec"
      textColor: "#e52222"
      iconColor: "#e52222"
      rounded: "{rounded.md}"
      padding: "12px {spacing.base}"
      border: "1px solid {colors.negative}"
    caution:
      backgroundColor: "#fef4e6"
      textColor: "#d47800"
      iconColor: "#d47800"
      rounded: "{rounded.md}"
      padding: "12px {spacing.base}"
      border: "1px solid {colors.caution}"
    info:
      backgroundColor: "#eaf2fe"
      textColor: "#0054d1"
      iconColor: "#0054d1"
      rounded: "{rounded.md}"
      padding: "12px {spacing.base}"
      border: "1px solid {colors.info}"
  table:
    header:
      backgroundColor: "{colors.surface-alt}"
      textColor: "{colors.text-neutral}"
      typography: "{typography.caption1}"
      fontWeight: 600
      padding: "12px {spacing.base}"
      borderBottom: "1px solid {colors.border}"
    row:
      backgroundColor: "{colors.surface}"
      textColor: "{colors.text}"
      typography: "{typography.body2}"
      padding: "14px {spacing.base}"
      borderBottom: "1px solid {colors.border-alt}"
      minHeight: "48px"
    row-hover:
      backgroundColor: "{colors.fill-alt}"
  tag:
    default:
      backgroundColor: "{colors.fill-alt}"
      textColor: "{colors.text-neutral}"
      typography: "{typography.caption1}"
      rounded: "{rounded.sm}"
      padding: "2px 8px"
    primary:
      backgroundColor: "{colors.primary-fill-neutral}"
      textColor: "{colors.primary-text}"
      typography: "{typography.caption1}"
      rounded: "{rounded.sm}"
      padding: "2px 8px"
  divider:
    default:
      color: "{colors.border-alt}"
      height: "1px"
    strong:
      color: "{colors.border}"
      height: "1px"
  avatar:
    sm:
      size: "32px"
      rounded: "{rounded.full}"
      backgroundColor: "{colors.fill-neutral}"
      textColor: "{colors.text-neutral}"
      typography: "{typography.caption1}"
    md:
      size: "40px"
      rounded: "{rounded.full}"
      backgroundColor: "{colors.fill-neutral}"
      textColor: "{colors.text-neutral}"
      typography: "{typography.body2}"
    lg:
      size: "48px"
      rounded: "{rounded.full}"
      backgroundColor: "{colors.fill-neutral}"
      textColor: "{colors.text-neutral}"
      typography: "{typography.body1}"
  accordion:
    item:
      backgroundColor: "{colors.surface}"
      textColor: "{colors.text}"
      typography: "{typography.body1}"
      padding: "16px {spacing.base}"
      borderBottom: "1px solid {colors.border-alt}"
    item-expanded:
      contentPadding: "0 {spacing.base} 16px"
      contentColor: "{colors.text-neutral}"
      contentTypography: "{typography.body2}"
  tooltip:
    default:
      backgroundColor: "#28292c"
      textColor: "#ffffff"
      typography: "{typography.caption1}"
      rounded: "{rounded.sm}"
      padding: "6px 10px"
      maxWidth: "240px"
  empty-state:
    default:
      backgroundColor: "{colors.surface}"
      iconColor: "{colors.text-assistive}"
      titleTypography: "{typography.title2}"
      titleColor: "{colors.text}"
      bodyTypography: "{typography.body2}"
      bodyColor: "{colors.text-alternative}"
      padding: "{spacing.3xl}"
  search-bar:
    default:
      backgroundColor: "{colors.surface}"
      textColor: "{colors.text}"
      typography: "{typography.body1}"
      rounded: "{rounded.md}"
      height: "44px"
      border: "1px solid {colors.border}"
      iconColor: "{colors.icon-neutral}"
      padding: "0 {spacing.sm} 0 40px"
    focused:
      border: "1px solid {colors.primary-border}"
  section-header:
    default:
      titleTypography: "{typography.title1}"
      titleColor: "{colors.text}"
      subtitleTypography: "{typography.body2}"
      subtitleColor: "{colors.text-alternative}"
      marginBottom: "{spacing.lg}"
---

## CSS Implementation

Copy this `:root` block verbatim — Gemini must not alter these values:

```css
:root {
  /* ── KTDS Tokens ───────────────────────────────────────── */
  /* Colors */
  --color-primary: #1a75ff;
  --color-primary-text: #155dd8;
  --color-primary-fill-neutral: #f2f5f9;
  --color-surface: #ffffff;
  --color-surface-alt: #f7f7f8;
  --color-text: #16171a;
  --color-text-neutral: rgba(46,47,51,0.88);
  --color-text-alt: rgba(53,54,58,0.61);
  --color-text-assistive: rgba(53,54,58,0.28);
  --color-border: rgba(112,115,120,0.35);
  --color-border-alt: rgba(112,115,120,0.16);
  --color-fill: rgba(112,115,120,0.22);
  --color-fill-neutral: rgba(112,115,120,0.12);
  --color-fill-alt: rgba(112,115,120,0.08);
  --color-positive: #00c244;
  --color-caution: #ff9200;
  --color-negative: #ff4242;
  --color-info: #0066ff;
  --color-surface-disabled: #f4f4f5;
  --color-text-disabled: rgba(53,54,58,0.35);
  --color-surface-inactive: #eaebec;

  /* Spacing — 8px base (4px substep allowed) */
  --spacing-xxs: 4px;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-base: 16px;
  --spacing-md: 20px;
  --spacing-lg: 24px;
  --spacing-lg-alt: 28px;
  --spacing-xl: 32px;
  --spacing-2xl: 40px;
  --spacing-3xl: 48px;
  --spacing-4xl: 56px;
  --spacing-section: 64px;
  --spacing-5xl: 72px;
  --spacing-6xl: 80px;

  /* Border radius */
  --rounded-none: 0px;
  --rounded-xs: 2px;
  --rounded-sm: 4px;
  --rounded-md: 8px;
  --rounded-lg: 12px;
  --rounded-xl: 16px;
  --rounded-2xl: 20px;
  --rounded-full: 9999px;

  /* Typography — Pretendard */
  --font-sans: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --text-display: 32px;
  --text-headline: 24px;
  --text-title1: 20px;
  --text-title2: 18px;
  --text-body1: 16px;
  --text-body2: 14px;
  --text-caption1: 12px;
  --text-caption2: 11px;

  /* ── MD3 Semantic Color Mapping (KTDS override) ─────────── */
  --md-sys-color-primary: #1a75ff;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #f2f5f9;
  --md-sys-color-on-primary-container: #155dd8;
  --md-sys-color-secondary: #155dd8;
  --md-sys-color-on-secondary: #ffffff;
  --md-sys-color-secondary-container: #f2f5f9;
  --md-sys-color-on-secondary-container: #16171a;
  --md-sys-color-surface: #ffffff;
  --md-sys-color-on-surface: #16171a;
  --md-sys-color-surface-variant: #f7f7f8;
  --md-sys-color-on-surface-variant: rgba(46,47,51,0.88);
  --md-sys-color-background: #ffffff;
  --md-sys-color-on-background: #16171a;
  --md-sys-color-outline: rgba(112,115,120,0.35);
  --md-sys-color-outline-variant: rgba(112,115,120,0.16);
  --md-sys-color-error: #ff4242;
  --md-sys-color-on-error: #ffffff;
  --md-sys-color-error-container: #feecec;
  --md-sys-color-on-error-container: #e52222;

  /* ── MD3 Shape Scale (KTDS override) ────────────────────── */
  --md-sys-shape-corner-extra-small: 4px;
  --md-sys-shape-corner-small: 8px;
  --md-sys-shape-corner-medium: 12px;
  --md-sys-shape-corner-large: 16px;
  --md-sys-shape-corner-extra-large: 20px;
  --md-sys-shape-corner-full: 9999px;

  /* ── MD3 Typescale (KTDS — Pretendard) ──────────────────── */
  --md-sys-typescale-display-large-font: var(--font-sans);
  --md-sys-typescale-display-large-size: 32px;
  --md-sys-typescale-display-large-weight: 700;
  --md-sys-typescale-headline-large-font: var(--font-sans);
  --md-sys-typescale-headline-large-size: 24px;
  --md-sys-typescale-headline-large-weight: 700;
  --md-sys-typescale-title-large-font: var(--font-sans);
  --md-sys-typescale-title-large-size: 20px;
  --md-sys-typescale-title-large-weight: 600;
  --md-sys-typescale-body-large-font: var(--font-sans);
  --md-sys-typescale-body-large-size: 16px;
  --md-sys-typescale-body-large-weight: 400;
  --md-sys-typescale-body-medium-font: var(--font-sans);
  --md-sys-typescale-body-medium-size: 14px;
  --md-sys-typescale-body-medium-weight: 400;
  --md-sys-typescale-label-large-font: var(--font-sans);
  --md-sys-typescale-label-large-size: 14px;
  --md-sys-typescale-label-large-weight: 600;
}
```

**Spacing rules:** card padding = `var(--spacing-md)` (20px) · mobile container padding = `var(--spacing-base)` (16px) · tablet container = `var(--spacing-lg)` (24px) · desktop container = `var(--spacing-2xl)` (40px) · card gap mobile = `var(--spacing-base)` (16px) · card gap tablet+ = `var(--spacing-md)` (20px).

**Component heights:** Primary button = 48px · Input field = 52px · List item min-height = 56px · Tab icon area = 48px. All touch targets minimum 44px.

**Button-primary spec:** height 48px · padding `var(--spacing-lg)` horizontal (24px) · radius `var(--rounded-md)` (8px) · bg `var(--color-primary)` · color white.

**Pretendard font CDN — HTML `<head>`에 반드시 포함 (Material Symbols CDN과 별개):**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
```
`body { font-family: var(--font-sans); background-color: var(--color-surface-alt); }` 선언 필수.

**Surface 레이어 원칙 (반드시 준수):**
- 페이지/앱 전체 배경: `var(--color-surface-alt)` (#F7F7F8) — Neutral/Surface/alternative
- 카드·모달·시트·컴포넌트 배경: `var(--color-surface)` (#FFFFFF) — Neutral/Surface/default
- 섹션 강조 배경(Primary 관련): `var(--color-primary-fill-neutral)` (#F2F5F9)
- 절대로 페이지 전체 배경을 #FFFFFF(흰색)로 사용하지 말 것.

**다크 모드 CSS — HTML `<style>` 내 `:root` 블록 다음에 반드시 포함:**
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #1a75ff;
    --color-primary-text: #1a75ff;
    --color-primary-fill-neutral: #01020c;
    --color-surface: #1a1b1d;
    --color-surface-alt: #0b0c0e;
    --color-text: #f7f7f8;
    --color-text-neutral: rgba(247,247,248,0.88);
    --color-text-alt: rgba(247,247,248,0.61);
    --color-text-assistive: rgba(247,247,248,0.28);
    --color-border: rgba(112,115,120,0.52);
    --color-border-alt: rgba(112,115,120,0.28);
    --color-fill: rgba(112,115,120,0.30);
    --color-fill-neutral: rgba(112,115,120,0.20);
    --color-fill-alt: rgba(112,115,120,0.12);
    --color-surface-disabled: rgba(112,115,120,0.16);
    --color-text-disabled: rgba(247,247,248,0.35);
    --color-surface-inactive: #28292c;
    --color-positive: #1ed45a;
    --color-caution: #ffa938;
    --color-negative: #ff6363;
    --color-info: #3385ff;
    --md-sys-color-primary: #1a75ff;
    --md-sys-color-on-primary: #ffffff;
    --md-sys-color-primary-container: #01020c;
    --md-sys-color-on-primary-container: #1a75ff;
    --md-sys-color-secondary: #0f4dab;
    --md-sys-color-surface: #1a1b1d;
    --md-sys-color-on-surface: #f7f7f8;
    --md-sys-color-surface-variant: #0b0c0e;
    --md-sys-color-on-surface-variant: rgba(247,247,248,0.88);
    --md-sys-color-background: #1a1b1d;
    --md-sys-color-on-background: #f7f7f8;
    --md-sys-color-outline: rgba(112,115,120,0.52);
    --md-sys-color-outline-variant: rgba(112,115,120,0.28);
    --md-sys-color-error: #ff6363;
    --md-sys-color-error-container: #750404;
  }
}
```

## MD3 구조 지침

⚠️ 이 시스템은 **Material Design 3 컴포넌트 구조**를 기반으로 한다. HTML/CSS를 생성할 때 MD3 컴포넌트 패턴을 그대로 사용하고, 위의 `--md-sys-*` CSS 변수로 스타일을 오버라이드하라.

**MD3 컴포넌트 → KTDS 구현 매핑:**

| MD3 컴포넌트 | KTDS 스펙 |
|---|---|
| Filled Button (Primary) | height 48px · `var(--rounded-md)` · bg `var(--color-primary)` · text white |
| Tonal Button (Secondary) | height 48px · `var(--rounded-md)` · bg `var(--color-fill-neutral)` · text `var(--color-text)` |
| Outlined Button (Outline) | height 48px · `var(--rounded-md)` · border 1px `var(--color-border)` · text `var(--color-text)` |
| Text Button (Ghost) | height 48px · no border/bg · text `var(--color-text)` |
| Error Button (Negative) | height 48px · `var(--rounded-md)` · bg `var(--color-negative)` · text white |
| Outlined Text Field | height 52px · `var(--rounded-md)` · border 1px `var(--color-border)` · focus border `var(--color-primary)` |
| Elevated Card / Filled Card | `var(--rounded-xl)` · padding `var(--spacing-md)` · shadow `0 2px 8px rgba(0,0,0,0.06)` |
| List Item | min-height 56px · padding 0 `var(--spacing-base)` · divider 1px `var(--color-border-alt)` |
| Navigation Bar (bottom) | bg `var(--color-surface)` · active icon+label `var(--color-primary)` · border-top 1px `var(--color-border-alt)` |
| Navigation Rail (desktop) | width 240px · active indicator `var(--color-primary-fill-neutral)` |
| Chip (Assist/Filter) | `var(--rounded-full)` · height 32px · border 1px `var(--color-border)` |
| Dialog | max-width 480px · `var(--rounded-xl)` · padding `var(--spacing-lg)` |
| Bottom Sheet | `var(--rounded-2xl)` 상단만 · padding `var(--spacing-base)` `var(--spacing-lg)` |
| Snackbar / Toast | `var(--rounded-md)` · bg `#28292c` · text white |

**구조 원칙:**
- 버튼 레이블은 항상 버튼 안 (인라인 텍스트)
- Input 레이블은 반드시 필드 위(above) 배치 — 인라인 placeholder-only 금지
- 상태(Positive/Negative/Caution/Info)는 항상 `var(--color-positive/negative/caution/info)` 사용
- Disabled 상태: bg `var(--color-surface-disabled)` · text `var(--color-text-disabled)`

## Overview

Clarity(명확성) · Trust(신뢰감) · Efficiency(효율성)를 핵심 철학으로 삼는 엔터프라이즈 UI. Material Design 3 시맨틱 토큰 아키텍처를 채택하며, Primary Blue(`#1a75ff`)를 유일한 인터랙션 강조색으로 사용한다. 화이트 서피스와 중립 구조가 기본 레이아웃 정체성이며, 색상은 반드시 Semantic 레이어를 통해 참조한다.

- **브랜드**: KT DS (케이티 디에스)
- **브랜드 컬러**: `#1a75ff` (Primary/50)
- **베이스**: Material Design 3 semantic token architecture
- **모드**: Light / Dark 완전 지원

---

## Colors

색상 직접 참조 금지 — 반드시 역할(Text / Fill / Border / Icon / Surface) 기반 시맨틱 토큰을 사용한다.

### 원시 팔레트 (Primitive Tokens)

#### Primary (Brand Blue)
| Step | Value |
|------|-------|
| /5   | `#01020c` |
| /10  | `#0b2d66` |
| /20  | `#0c3a82` |
| /30  | `#0f4dab` |
| /40  | `#155dd8` |
| /50  | `#1a75ff` |
| /60  | `#4891ff` |
| /70  | `#66a3ff` |
| /80  | `#96c0ff` |
| /90  | `#b8d4ff` |
| /95  | `#e8f1ff` |
| /99  | `#f2f5f9` |

#### Cool Neutral (UI Neutral)
| Step | Value |
|------|-------|
| /5   | `#0b0c0e` |
| /10  | `#16171a` |
| /15  | `#1a1b1d` |
| /20  | `#28292c` |
| /25  | `#35363a` |
| /30  | `#45464b` |
| /40  | `#595b62` |
| /50  | `#707378` |
| /60  | `#878a93` |
| /70  | `#989ba2` |
| /80  | `#aeb0b6` |
| /90  | `#c2c4c8` |
| /95  | `#dbdcdf` |
| /98  | `#f4f4f5` |
| /99  | `#f7f7f8` |

#### Status Colors (기준값)
| Color    | /50 (Default Fill) |
|----------|--------------------|
| Positive | `#00c244` |
| Info     | `#0066ff` |
| Caution  | `#ff9200` |
| Negative | `#ff4242` |

#### Accent Colors (기준값)
| Color      | /50 (Default Fill) |
|------------|--------------------|
| Lime       | `#58cf04` |
| Red Orange | `#ff5e00` |
| Cyan       | `#00bdde` |
| Light Blue | `#00aeff` |
| Violet     | `#6541f2` |
| Pink       | `#f553da` |

---

### 시맨틱 토큰 — Light Mode

#### Primary
| Token                  | Value |
|------------------------|-------|
| Primary/Text/default   | `#155dd8` |
| Primary/Text/neutral   | `#4891ff` |
| Primary/Fill/default   | `#1a75ff` |
| Primary/Fill/neutral   | `#f2f5f9` |
| Primary/Border/default | `#1a75ff` |
| Primary/Border/neutral | `#66a3ff` |
| Primary/Icon/default   | `#1a75ff` |
| Primary/Icon/neutral   | `#4891ff` |

#### Neutral
| Token                      | Value |
|----------------------------|-------|
| Neutral/Text/default       | `#16171a` |
| Neutral/Text/neutral       | `rgba(46,47,51,0.88)` |
| Neutral/Text/alternative   | `rgba(53,54,58,0.61)` |
| Neutral/Text/assistive     | `rgba(53,54,58,0.28)` |
| Neutral/Text/strong        | `#000000` |
| Neutral/Surface/default    | `#ffffff` |
| Neutral/Surface/alternative| `#f7f7f8` |
| Neutral/Border/default     | `rgba(112,115,120,0.35)` |
| Neutral/Border/neutral     | `rgba(112,115,120,0.28)` |
| Neutral/Border/alternative | `rgba(112,115,120,0.16)` |
| Neutral/Icon/default       | `#16171a` |
| Neutral/Icon/neutral       | `rgba(46,47,51,0.88)` |
| Neutral/Fill/default       | `rgba(112,115,120,0.22)` |
| Neutral/Fill/neutral       | `rgba(112,115,120,0.12)` |
| Neutral/Fill/alternative   | `rgba(112,115,120,0.08)` |
| Neutral/Fill/strong        | `rgba(112,115,120,0.35)` |

#### Interaction
| Token                        | Value |
|------------------------------|-------|
| Interaction/Text/inactive    | `#989ba2` |
| Interaction/Text/disabled    | `rgba(53,54,58,0.35)` |
| Interaction/Surface/inactive | `#eaebec` |
| Interaction/Surface/disabled | `#f4f4f5` |
| Interaction/Border/inactive  | `#c2c4c8` |
| Interaction/Border/disabled  | `#dbdcdf` |
| Interaction/Fill/inactive    | `rgba(112,115,120,0.22)` |
| Interaction/Fill/disabled    | `rgba(112,115,120,0.12)` |
| Interaction/Dimmer/dimmer    | `rgba(22,23,26,0.52)` |

#### Status (Light)
| Category | Text/default | Fill/default | Fill/neutral | Border/default |
|----------|-------------|-------------|--------------|---------------|
| Normal   | `#595b62`   | `#45464b`   | `#eaebec`    | `#707378` |
| Positive | `#009632`   | `#00c244`   | `#d9ffe6`    | `#00c244` |
| Info     | `#0054d1`   | `#0066ff`   | `#eaf2fe`    | `#0066ff` |
| Caution  | `#d47800`   | `#ff9200`   | `#fef4e6`    | `#ff9200` |
| Negative | `#e52222`   | `#ff4242`   | `#feecec`    | `#ff4242` |

---

### 시맨틱 토큰 — Dark Mode

#### Primary (Dark)
| Token                  | Value |
|------------------------|-------|
| Primary/Text/default   | `#1a75ff` |
| Primary/Fill/default   | `#0f4dab` |
| Primary/Fill/neutral   | `#01020c` |
| Primary/Border/default | `#4891ff` |
| Primary/Icon/default   | `#1a75ff` |

#### Neutral (Dark)
| Token                      | Value |
|----------------------------|-------|
| Neutral/Text/default       | `#f7f7f8` |
| Neutral/Text/strong        | `#ffffff` |
| Neutral/Surface/default    | `#1a1b1d` |
| Neutral/Surface/alternative| `#0b0c0e` |
| Neutral/Border/default     | `rgba(112,115,120,0.52)` |

#### Status (Dark)
| Category | Text/default | Fill/default | Fill/neutral | Border/default |
|----------|-------------|-------------|--------------|---------------|
| Positive | `#00c244`   | `#1ed45a`   | `#004517`    | `#1ed45a` |
| Info     | `#0066ff`   | `#3385ff`   | `#002966`    | `#3385ff` |
| Caution  | `#ff9200`   | `#ffa938`   | `#663a00`    | `#ffa938` |
| Negative | `#ffb5b5`   | `#ff6363`   | `#750404`    | `#ff6363` |

---

## Typography

Primary Font: **Pretendard** (한국어 최적화), `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `sans-serif`

| Token    | Size  | Weight | Line Height | Letter Spacing |
|----------|-------|--------|-------------|----------------|
| Display  | 32px  | 700    | 1.25        | -0.5px         |
| Headline | 24px  | 700    | 1.33        | -0.3px         |
| Title1   | 20px  | 600    | 1.4         | —              |
| Title2   | 18px  | 600    | 1.44        | —              |
| Body1    | 16px  | 400    | 1.5         | —              |
| Body2    | 14px  | 400    | 1.5         | —              |
| Caption1 | 12px  | 400    | 1.4         | —              |
| Caption2 | 11px  | 400    | 1.36        | —              |

---

## Layout

### 그리드 & 컨테이너

| Breakpoint   | Width        | Padding | Columns |
|--------------|-------------|---------|---------|
| Mobile       | < 480px      | 16px    | 1 (2열 아이콘 그리드 허용) |
| Mobile-Large | 480–767px    | 16px    | 1–2     |
| Tablet       | 768–1023px   | 24px    | 2–3     |
| Desktop      | ≥ 1024px     | 40px    | 3–4 (max 1280px, 좌측 nav rail 240px) |

- **기본 그리드**: 8px — 모든 spacing은 8px 배수 (또는 4px 서브스텝)
- **카드 간격**: 모바일 16px / 태블릿+ 20px

### 터치 타깃
- 최소 터치 영역: **44×44px**
- Primary Button: **48px** height (WCAG AA)
- List Item: min-height **56px**
- Tab Bar 아이콘: **48px** 탭 영역

### 반응형 내비게이션
- **Mobile (≤ 767px)**: 하단 탭 바
- **Tablet (768–1023px)**: 상단 내비게이션 바
- **Desktop (≥ 1024px)**: 좌측 레일 (240px)

---

## Elevation & Depth

| Level | Usage | Shadow |
|-------|-------|--------|
| 0     | Flat surface, list items | none |
| 1     | Card | `0 2px 8px rgba(0,0,0,0.06)` |
| 2     | Dropdown, tooltip | `0 4px 16px rgba(0,0,0,0.10)` |
| 3     | Modal, bottom sheet | `0 8px 32px rgba(0,0,0,0.16)` |

- **Dimmer**: `Interaction/Dimmer/dimmer` — 모달 뒤 오버레이

---

## Shapes

| Token   | Value  | Usage |
|---------|--------|-------|
| none    | 0px    | Divider, 전체 너비 요소 |
| xs      | 2px    | 내부 소형 요소 |
| sm      | 4px    | Chip, Tag |
| md      | 8px    | Button, Input, Card small |
| lg      | 12px   | — |
| xl      | 16px   | Card 기본 |
| 2xl–3xl | 20–24px| 대형 Card, Sheet |
| full    | 9999px | Badge, Avatar, Circular Button |

---

## Components

### Button

```
Primary:   bg={colors.primary}       text=white               h=48px  px=24px  r={rounded.md}
Secondary: bg={colors.fill-neutral}  text={colors.text}       h=48px  px=24px  r={rounded.md}
Outline:   bg=transparent  border=1px {colors.border}  text={colors.text}  h=48px  px=24px  r={rounded.md}
Ghost:     bg=transparent            text={colors.text}       h=48px  (no border)
Negative:  bg={colors.negative}      text=white               h=48px  px=24px  r={rounded.md}
Disabled:  bg={colors.surface-disabled}  text={colors.text-disabled}
Icon/Fab:  r={rounded.full}
```

### Input Field

```
h=52px  r={rounded.md}  border=1px {colors.border}
Focus: border={colors.primary-border}
Error: border={colors.negative}
Label: body2 / {colors.text-neutral}
Placeholder: {colors.text-assistive}
```

### Card

```
bg={colors.surface}  r={rounded.xl}  p=20px
border=1px {colors.border-alt}
shadow=0 2px 8px rgba(0,0,0,0.06)
```

### List Item

```
min-h=56px  px=16px
border-bottom=1px {colors.border-alt}
Leading icon: 24px / {colors.icon}
Trailing chevron: 16px / {colors.text-neutral}
```

### Status Badge / Chip

```
r={rounded.full}
Positive:  bg={colors.positive}  text=white
Negative:  bg={colors.negative}  text=white
Caution:   bg={colors.caution}   text=white
Info:      bg={colors.info}      text=white
```

### Navigation / Tab Bar

```
Active:  icon+text={colors.primary}
Inactive: {colors.icon-neutral}
bg={colors.surface}
border-top=1px {colors.border-alt}
```

### Modal / Bottom Sheet

```
Mobile:  전체 화면 bottom sheet
Tablet+: 중앙 dialog (max-width 480px)
```

### Interaction States (상태 색상)

```
button-primary-hover:    bg={colors.primary-text}  (#155dd8)
button-primary-pressed:  bg=#0f4dab
button-secondary-hover:  bg={colors.fill-alt}
chip-selected:           bg={colors.primary-fill-neutral}  text={colors.primary-text}  border=1px {colors.primary}
input-focus:             border=1px {colors.primary-border}  (box-shadow/outline 없음)
focus-ring (범용):       outline=2px solid {colors.primary}  outline-offset=2px
```

### Checkbox / Radio

```
Checkbox default:    20×20px  r={rounded.xs}  border=1.5px {colors.border}  bg={colors.surface}
Checkbox checked:    bg={colors.primary}  check icon white  border={colors.primary}
Checkbox disabled:   bg={colors.surface-disabled}  border={colors.border-alt}

Radio default:       20×20px  r={rounded.full}  border=1.5px {colors.border}
Radio selected:      border=1.5px {colors.primary}  inner dot 10px {colors.primary}
Radio disabled:      border={colors.border-alt}  dot={colors.text-disabled}
```

### Toggle / Switch

```
Track:    48×28px  r={rounded.full}
Off:      track={colors.fill}  thumb=white 22px
On:       track={colors.primary}  thumb=white 22px
Disabled: track={colors.surface-disabled}  thumb={colors.surface-inactive}
```

### Select / Dropdown

```
h=52px  r={rounded.md}  border=1px {colors.border}  bg={colors.surface}
Focus:        border=1px {colors.primary-border}
Chevron icon: 20px  {colors.icon-neutral}
Option list:  bg={colors.surface}  shadow=elevation-2  r={rounded.md}
Option hover: bg={colors.fill-alt}
Option selected: text={colors.primary}  bg={colors.primary-fill-neutral}
```

### Tabs

```
Tab Bar:      bg={colors.surface}  border-bottom=1px {colors.border-alt}  h=48px
Tab Active:   text={colors.primary}  typography=label  border-bottom=2px {colors.primary}
Tab Inactive: text={colors.text-alternative}  typography=body2
Tab Scroll:   가로 스크롤 허용 (mobile)  overflow-x=auto  scrollbar-hidden
```

### Breadcrumb

```
Item:      text={colors.text-alternative}  typography=body2
Current:   text={colors.text}  typography=label
Separator: "/" — {colors.text-assistive}  mx=8px
```

### Pagination

```
Item:     36×36px  r={rounded.sm}  text={colors.text}  typography=body2
Active:   bg={colors.primary}  text=white  r={rounded.sm}
Disabled: text={colors.text-disabled}
Prev/Next: 36×36px  icon button  border=1px {colors.border-alt}
```

### Stepper

```
Indicator:   32×32px  r={rounded.full}
Default:     bg={colors.fill-neutral}  text={colors.text}  typography=caption1
Active:      bg={colors.primary}  text=white
Done:        bg={colors.primary-fill-neutral}  check icon {colors.primary-text}
Label:       body2  {colors.text}  아래 정렬
Connector:   1px {colors.border-alt}  인디케이터 사이 연결선
```

### Progress Bar

```
Height:  4px  r={rounded.full}
Track:   bg={colors.fill-neutral}
Fill:    bg={colors.primary}
Animation: left → right  transition 300ms ease-out
```

### Skeleton

```
bg={colors.fill-alt}  shimmer animation  r={rounded.sm}
Text skeleton:  h=14px  r={rounded.sm}
Image skeleton: 임의 크기  r={rounded.md}
Animation: shimmer  1.5s ease-in-out infinite
```

### Alert / Banner

인라인 알림 (Alert):
```
Positive: bg=#d9ffe6  text=#009632  icon={colors.positive}  border=1px {colors.positive}  r={rounded.md}
Negative: bg=#feecec  text=#e52222  icon={colors.negative}  border=1px {colors.negative}  r={rounded.md}
Caution:  bg=#fef4e6  text=#d47800  icon={colors.caution}   border=1px {colors.caution}   r={rounded.md}
Info:     bg=#eaf2fe  text=#0054d1  icon={colors.info}      border=1px {colors.info}       r={rounded.md}
패딩: 12px 16px  아이콘 20px 왼쪽 + 텍스트 + 닫기 버튼 오른쪽
```

전체 너비 배너 (Banner):
```
r=none  페이지 상단/하단 고정  동일 색상 체계
```

### Table

```
Header:     bg={colors.surface-alt}  text={colors.text-neutral}  typography=caption1+weight600  h=44px  px=16px
            border-bottom=1px {colors.border}
Row:        bg={colors.surface}  text={colors.text}  typography=body2  min-h=48px  px=16px
            border-bottom=1px {colors.border-alt}
Row hover:  bg={colors.fill-alt}
Striped:    짝수 행 bg={colors.fill-alt}  (선택적)
```

### Tag

```
Default: bg={colors.fill-alt}  text={colors.text-neutral}  typography=caption1  r={rounded.sm}  px=8px  py=2px
Primary: bg={colors.primary-fill-neutral}  text={colors.primary-text}  r={rounded.sm}
— Chip과 달리 클릭 불가 라벨 전용
```

### Divider

```
Default: 1px {colors.border-alt}  (카드 내부 약한 구분선)
Strong:  1px {colors.border}      (섹션 경계 강한 구분선)
Inset:   margin-left=16px         (List Item 내 들여쓰기 구분선)
```

### Avatar

```
SM (32px): r={rounded.full}  bg={colors.fill-neutral}  typography=caption1  이니셜 or 이미지
MD (40px): r={rounded.full}  bg={colors.fill-neutral}  typography=body2
LG (48px): r={rounded.full}  bg={colors.fill-neutral}  typography=body1
```

### Accordion

```
Item:     bg={colors.surface}  typography=body1  px=16px  py=16px
          border-bottom=1px {colors.border-alt}
          chevron 16px {colors.icon-neutral}  (expanded시 rotate 180°)
Expanded: content typography=body2  {colors.text-neutral}  px=16px  pb=16px
```

### Tooltip

```
bg=#28292c  text=white  r={rounded.sm}  typography=caption1  px=10px  py=6px  max-w=240px
Arrow: 6px triangle  방향 top/bottom/left/right 자동
Delay: 300ms show  0ms hide
```

### Empty State

```
Container:  bg={colors.surface}  p={spacing.3xl}  text-align=center
Icon:       40px  {colors.text-assistive}
Title:      typography=title2  {colors.text}  mt=16px
Body:       typography=body2  {colors.text-alternative}  mt=8px
CTA:        button-primary or button-outline  mt=24px
```

### Search Bar

```
h=44px  r={rounded.md}  border=1px {colors.border}  bg={colors.surface}
Search icon: 20px  {colors.icon-neutral}  padding-left=40px
Focus:       border=1px {colors.primary-border}
Clear button: 20px ×  {colors.icon-neutral}  (입력값 있을 때만 표시)
```

### Section Header

```
Title:    typography=title1  {colors.text}
Subtitle: typography=body2  {colors.text-alternative}  mt=4px
Action:   button-ghost or text link (선택)  우측 정렬
mb={spacing.lg}  (24px — 헤더와 콘텐츠 사이)
```

---

## Do's and Don'ts

**Do**
- 모든 색상은 Semantic 토큰으로 참조 — 헥스 직접 사용 금지
- Primary Blue(`#1a75ff`)는 핵심 인터랙션(버튼, 링크, 포커스)에만 집중 사용
- 8px 그리드 엄수 — spacing 토큰만 사용
- Radius는 토큰으로만 사용 (`rounded.*`)
- Neutral/Text/default ↔ Neutral/Surface/default 대비율 4.5:1 이상 유지
- Light/Dark 모두 Semantic 레이어 참조 시 자동 전환

**Don't**
- Primary Blue를 배경이나 장식 목적으로 남용하지 않는다
- 8px 그리드 외의 임의 spacing 사용 금지
- 하드코딩된 hex 색상 코드 직접 사용 금지
- 컴포넌트 높이를 터치 타깃 최솟값(44px) 아래로 낮추지 않는다
- 한국어 레이블은 인라인 배치 금지 — 항상 input 위(above)에 위치

---

## Iteration Guide

1. 컴포넌트는 반드시 `components:` 토큰 이름으로 정확히 지칭하라 (예: `button-primary`, `tab-item-active`, `alert-negative`)
2. 색상은 반드시 `var(--color-*)` CSS 변수로만 참조 — hex 직접 입력 절대 금지
3. 새 섹션 추가 시 배경 레이어를 먼저 결정하라
   - 전체 페이지 배경: `var(--color-surface-alt)` (항상)
   - 카드/모달/시트: `var(--color-surface)` (항상)
   - Primary 강조 영역: `var(--color-primary-fill-neutral)`
4. 버튼 radius는 항상 `var(--rounded-md)` (8px) — pill/full 금지 (FAB·Avatar·Chip 제외)
5. 한 번에 한 컴포넌트만 수정 — 여러 컴포넌트를 동시에 재설계하지 않는다
6. Spacing은 반드시 `var(--spacing-*)` 토큰으로만 사용 — 임의 px 금지
7. 상태 색상(Positive/Negative/Caution/Info) = 반드시 `var(--color-positive/negative/caution/info)` — 다른 색상 대체 금지
8. Typography는 반드시 지정된 9개 토큰 중 선택 (display/headline/title1/title2/body1/body2/label/caption1/caption2) — font-size 임의 지정 금지
9. 다크 모드는 별도 CSS 작성 없음 — `@media (prefers-color-scheme: dark)` 블록이 자동 처리
10. 새 컴포넌트 변형 추가 시 `components:` 블록에 별도 항목으로 추가 — 기존 항목 수정 금지

---

## Known Gaps

문서에 명시되지 않은 경우 아래 규칙으로 추론하라:

- **데이터 차트/그래프**: Primary Blue 시작 → Accent 팔레트 순서 (Lime #58cf04 → Cyan #00bdde → Light Blue #00aeff → Violet #6541f2 → Pink #f553da)
- **로딩 스피너**: `border: 3px solid var(--color-border-alt)` + `border-top-color: var(--color-primary)` + `border-radius: 50%` + rotate animation 700ms linear infinite
- **Drag & Drop**: 드래그 중 카드 `opacity: 0.7` + `box-shadow: 0 4px 16px rgba(0,0,0,0.10)` + `cursor: grabbing`
- **아이콘 크기**: 16px (인라인/캡션), 20px (body), 24px (heading/list), 32px (empty state 보조), 40px (empty state 주요)
- **포커스 링 (범용)**: `outline: 2px solid var(--color-primary)` + `outline-offset: 2px` — 모든 인터랙티브 요소
- **z-index 레이어**: 기본 콘텐츠 0 → Sticky 헤더 100 → Dropdown 200 → Modal 300 → Snackbar 400 → Tooltip 500
- **애니메이션 타이밍**: hover/press `150ms ease-out` · expand/collapse `200ms ease-out` · modal/sheet 진입 `300ms ease-in-out`
- **빈 상태(Empty State)**: surface 배경, text-assistive 아이콘 40px, title2 제목, body2 설명, button-primary CTA

---

## Page Templates

### 목록 페이지 (List Page)

```
배경: var(--color-surface-alt)

Section Header (title1 제목 + 우측 button-primary)
  ↓ gap={spacing.lg}
필터 행: Chip 그룹 + Search Bar
  ↓ gap={spacing.base}
Card 그리드
  모바일:    1열  gap=16px
  태블릿:    2열  gap=20px
  데스크탑:  3–4열  gap=20px
  ↓
Pagination (중앙 정렬)
```

### 폼 페이지 (Form Page)

```
배경: var(--color-surface-alt)
중앙 Card (max-width 480px  모바일=전체폭)

  title2 제목
  body2 설명 (선택)
  ──────────────────────
  레이블 + Input 스택  gap={spacing.md}
  ──────────────────────
  button-primary (100% 너비)
  button-ghost 취소 (선택)
```

### 대시보드 (Dashboard)

```
배경: var(--color-surface-alt)

데스크탑:
  Nav Rail 240px (고정) | Main Content
                         ├── Stat Cards 행 (2–4열  gap=20px)
                         ├── Chart Card (전체 너비 or 2/3)
                         └── 목록 Card + 사이드 Card (2/3 + 1/3)

모바일:
  하단 Tab Bar + 스크롤 콘텐츠 (1열 Card 스택)
```

### 상세 페이지 (Detail Page)

```
배경: var(--color-surface-alt)

Breadcrumb
  ↓
Hero Card (전체 너비)
  title1/headline + Tag/Badge + body1 설명
  button-primary + button-outline
  ↓
콘텐츠 영역 (데스크탑: 2/3 본문 + 1/3 사이드)
  Accordion 목차 or Tab 콘텐츠
```

### 인증 페이지 (Auth Page)

```
배경: var(--color-surface-alt)
중앙 Card (max-width 400px)

  브랜드 로고 (중앙 정렬)
  title2 (로그인 / 회원가입)
  Input (이메일)
  Input (비밀번호)
  button-primary (100% 너비)
  Divider + 소셜 로그인 (선택)
  caption1 링크 (계정 없음? 회원가입)
```
