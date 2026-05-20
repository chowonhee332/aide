---
version: alpha
name: KTDS Design System
description: "KT DS 엔터프라이즈 UI 시스템 — Clarity(명확성) · Trust(신뢰감) · Efficiency(효율성)를 핵심 철학으로 한다. 화이트 서피스(#ffffff)와 쿨 뉴트럴 구조 위에 Primary Blue(#1a75ff)를 유일한 인터랙션 강조색으로 사용한다. 버튼은 8px 라운드 사각형(pill 절대 금지), 입력 필드 52px, 카드 16px 라운드에 subtle shadow. 페이지 배경은 반드시 surface-alt(#f7f7f8), 카드/컴포넌트 배경은 surface(#ffffff). Pretendard 폰트. 모바일=하단 탭 바, 데스크톱=좌측 레일(240px)."

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
  text:                 "#171719"
  text-neutral:         "#474a4f"
  text-alternative:     "#9a9ba0"
  text-assistive:       "#c8c8cb"
  text-strong:          "#000000"
  # Neutral Border
  border:               "#c5c6c9"
  border-neutral:       "#c9cace"
  border-alt:           "#dcdde0"
  # Neutral Fill
  fill:                 "#d0d1d4"
  fill-neutral:         "#dfe0e2"
  fill-alt:             "#e9eaeb"
  # Icon
  icon:                 "#171719"
  icon-neutral:         "#474a4f"
  # Interaction States
  surface-disabled:     "#f4f4f5"
  text-disabled:        "#caccce"
  surface-inactive:     "#eaebec"
  # Status
  positive:             "#00c244"
  caution:              "#ff9200"
  negative:             "#ff4242"
  info:                 "#0066ff"

typography:
  display-lg:
    fontFamily: Pretendard
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.5px
  headline-lg:
    fontFamily: Pretendard
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: -0.3px
  title-lg:
    fontFamily: Pretendard
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
  title-md:
    fontFamily: Pretendard
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.44
  body-lg:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
  button-md:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
  body-lg-medium:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
  body-md-medium:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
  caption-lg:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  caption-sm:
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
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
  button-primary-hover:
    backgroundColor: "{colors.primary-text}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
  button-primary-pressed:
    backgroundColor: "#0f4dab"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
  button-secondary:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
  button-secondary-hover:
    backgroundColor: "{colors.fill-alt}"
    textColor: "{colors.text}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.button-md}"
    height: 48px
    padding: 0 12px
  button-negative:
    backgroundColor: "{colors.negative}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
  button-disabled:
    backgroundColor: "{colors.surface-disabled}"
    textColor: "{colors.text-disabled}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
  button-fab:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 52px
    border: "1px solid {colors.border}"
  input-focused:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 52px
    border: "1px solid {colors.primary-border}"
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 52px
    border: "1px solid {colors.negative}"
  input-disabled:
    backgroundColor: "{colors.surface-disabled}"
    textColor: "{colors.text-disabled}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 52px
    border: "1px solid {colors.border-alt}"
  card-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  list-item-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    height: 56px
    padding: 0 16px
  chip-default:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    height: 32px
    padding: 0 12px
  chip-selected:
    backgroundColor: "{colors.primary-fill-neutral}"
    textColor: "{colors.primary-text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    height: 32px
    padding: 0 12px
  badge-positive:
    backgroundColor: "{colors.positive}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-negative:
    backgroundColor: "{colors.negative}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-caution:
    backgroundColor: "{colors.caution}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  nav-bar-default:
    backgroundColor: "{colors.surface}"
  nav-bar-item-active:
    textColor: "{colors.primary}"
  nav-bar-item-inactive:
    textColor: "{colors.text-alternative}"
  modal-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    width: 480px
  bottom-sheet-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: 16px 24px
  snackbar-default:
    backgroundColor: "#28292c"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
  checkbox-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xs}"
    width: 20px
    height: 20px
  checkbox-checked:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xs}"
    width: 20px
    height: 20px
  checkbox-disabled:
    backgroundColor: "{colors.surface-disabled}"
    rounded: "{rounded.xs}"
    width: 20px
    height: 20px
  radio-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.full}"
    width: 20px
    height: 20px
  radio-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    width: 20px
    height: 20px
  radio-disabled:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-disabled}"
    rounded: "{rounded.full}"
    width: 20px
    height: 20px
  toggle-off:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.full}"
    width: 48px
    height: 28px
  toggle-on:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    width: 48px
    height: 28px
  toggle-disabled:
    backgroundColor: "{colors.surface-disabled}"
    rounded: "{rounded.full}"
    width: 48px
    height: 28px
  select-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 52px
  select-focused:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 52px
  tab-bar:
    backgroundColor: "{colors.surface}"
    height: 48px
  tab-item-active:
    textColor: "{colors.primary}"
    typography: "{typography.label-lg}"
  tab-item-inactive:
    textColor: "{colors.text-alternative}"
    typography: "{typography.body-md}"
  breadcrumb-item:
    textColor: "{colors.text-alternative}"
    typography: "{typography.body-md}"
  breadcrumb-current:
    textColor: "{colors.text}"
    typography: "{typography.label-lg}"
  pagination-item:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    width: 36px
    height: 36px
  pagination-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    width: 36px
    height: 36px
  pagination-item-disabled:
    textColor: "{colors.text-disabled}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    width: 36px
    height: 36px
  stepper-step-default:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    width: 32px
    height: 32px
  stepper-step-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    width: 32px
    height: 32px
  stepper-step-done:
    backgroundColor: "{colors.primary-fill-neutral}"
    textColor: "{colors.primary-text}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    width: 32px
    height: 32px
  progress-bar-default:
    backgroundColor: "{colors.fill-neutral}"
    rounded: "{rounded.full}"
    height: 4px
  skeleton-default:
    backgroundColor: "{colors.fill-alt}"
    rounded: "{rounded.sm}"
  alert-positive:
    backgroundColor: "#d9ffe6"
    textColor: "#009632"
    rounded: "{rounded.md}"
    padding: 12px 16px
  alert-negative:
    backgroundColor: "#feecec"
    textColor: "#e52222"
    rounded: "{rounded.md}"
    padding: 12px 16px
  alert-caution:
    backgroundColor: "#fef4e6"
    textColor: "#d47800"
    rounded: "{rounded.md}"
    padding: 12px 16px
  alert-info:
    backgroundColor: "#eaf2fe"
    textColor: "#0054d1"
    rounded: "{rounded.md}"
    padding: 12px 16px
  table-header:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.caption-lg}"
    padding: 12px 16px
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    padding: 14px 16px
    height: 48px
  table-row-hover:
    backgroundColor: "{colors.fill-alt}"
  tag-default:
    backgroundColor: "{colors.fill-alt}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.sm}"
    padding: 2px 8px
  tag-primary:
    backgroundColor: "{colors.primary-fill-neutral}"
    textColor: "{colors.primary-text}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.sm}"
    padding: 2px 8px
  divider-default:
    backgroundColor: "{colors.border-alt}"
    height: 1px
  divider-strong:
    backgroundColor: "{colors.border}"
    height: 1px
  avatar-sm:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    width: 32px
    height: 32px
  avatar-md:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    width: 40px
    height: 40px
  avatar-lg:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.full}"
    width: 48px
    height: 48px
  accordion-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    padding: 16px 16px
  accordion-item-expanded:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.body-md}"
    padding: 0 16px 16px
  tooltip-default:
    backgroundColor: "#28292c"
    textColor: "#ffffff"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.sm}"
    padding: 6px 10px
    width: 240px
  empty-state-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.title-md}"
    padding: "{spacing.3xl}"
  search-bar-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 0 12px 0 40px
  search-bar-focused:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 0 12px 0 40px
  section-header-default:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.title-lg}"
  ex-list-page:
    description: "목록 페이지 — 섹션 헤더 + 필터 칩 행 + 카드 그리드 + 페이지네이션. 배경 surface-alt."
    background: "{colors.surface-alt}"
    header: "section-header-default"
    filter: "chip-default 그룹 + search-bar-default"
    content: "card-default 그리드 (모바일 1열 / 태블릿 2열 / 데스크탑 3–4열  gap={spacing.base}~{spacing.md})"
    footer: "pagination-item 중앙 정렬"
  ex-form-page:
    description: "폼 페이지 — 중앙 카드에 레이블+인풋 스택 + 제출 버튼. 최대 너비 480px, 모바일 전체폭."
    background: "{colors.surface-alt}"
    container: "card-default  max-width=480px"
    title: "{typography.title-md}"
    fields: "레이블(body-md/{colors.text-neutral}) + input-default 스택  gap={spacing.md}"
    actions: "button-primary 100% 너비 + button-ghost 취소(선택)"
  ex-dashboard:
    description: "대시보드 — 데스크탑 Nav Rail 240px + 스탯 카드 행 + 차트 + 목록/사이드. 모바일 하단 탭 바."
    background: "{colors.surface-alt}"
    desktop-nav: "Nav Rail 240px 좌측 고정"
    stats: "card-default 행 2–4열  gap={spacing.md}"
    chart: "card-default 전체 너비 or 2/3"
    list: "card-default 2/3 + 사이드 card-default 1/3"
    mobile-nav: "nav-bar-default 하단"
  ex-detail-page:
    description: "상세 페이지 — 브레드크럼 + 히어로 카드(전체폭) + 탭/아코디언 콘텐츠. 데스크탑 2/3+1/3 사이드."
    background: "{colors.surface-alt}"
    breadcrumb: "breadcrumb-item"
    hero: "card-default 전체 너비  {typography.headline-lg} + tag-default/badge-* + {typography.body-lg} + button-primary + button-outline"
    content: "accordion-item 목차 or tab-bar 콘텐츠  (데스크탑: 2/3 본문 + 1/3 사이드)"
  ex-auth-page:
    description: "인증 페이지 — 중앙 카드에 로고 + 인풋 2개 + 버튼. 최대 너비 400px."
    background: "{colors.surface-alt}"
    container: "card-default  max-width=400px"
    header: "브랜드 로고 중앙 정렬 + {typography.title-md}"
    fields: "input-default(이메일) + input-default(비밀번호)  gap={spacing.md}"
    actions: "button-primary 100% 너비"
    footer: "divider-default + 소셜 로그인(선택) + {typography.caption-lg} 링크"
  ex-modal-card:
    description: "모달 다이얼로그 — 중앙 modal-default 위에 제목 + 콘텐츠 + 버튼 행. 데스크탑 max-width 480px, 모바일 bottom-sheet 전환 권장."
    background: "{colors.surface}"
    container: "modal-default  max-width=480px"
    header: "{typography.title-md} + button-ghost(닫기) 우측 정렬"
    content: "{typography.body-md}  {colors.text-neutral}  gap={spacing.md}"
    actions: "button-primary + button-ghost 취소  우측 정렬  또는  button-primary 100% 너비"
    overlay: "rgba(0,0,0,0.5)  z-index=300"
  ex-toast:
    description: "토스트/스낵바 알림 — 하단 중앙 snackbar-default. 자동 닫힘 3–5초."
    background: "#28292c"
    container: "snackbar-default  min-width=280px  max-width=480px"
    content: "{typography.body-md}  color=white  + 선택적 action button-ghost(white)"
    position: "하단 중앙 fixed  bottom={spacing.lg}  z-index=400"
    animation: "진입 slide-up 200ms ease-out · 퇴장 fade-out 150ms ease-out"
  ex-empty-state:
    description: "빈 상태 화면 — 목록/테이블이 비었을 때. 중앙 empty-state-default 블록."
    background: "{colors.surface}"
    container: "empty-state-default  p={spacing.3xl}  text-align=center"
    icon: "40px  {colors.text-assistive}  mb={spacing.base}"
    title: "{typography.title-md}  {colors.text}  mb={spacing.xs}"
    body: "{typography.body-md}  {colors.text-alternative}  mb={spacing.lg}"
    actions: "button-primary or button-outline  mt={spacing.md}"
---

## Overview

Clarity(명확성) · Trust(신뢰감) · Efficiency(효율성)를 핵심 철학으로 삼는 엔터프라이즈 UI. Primary Blue(`#1a75ff`)를 유일한 인터랙션 강조색으로 사용한다. 화이트 서피스와 중립 구조가 기본 레이아웃 정체성이며, 색상은 반드시 Semantic 레이어를 통해 참조한다.

- **브랜드**: KT DS (케이티 디에스)
- **브랜드 컬러**: `#1a75ff` (Primary)
- **모드**: Light / Dark 완전 지원

---

## Colors

색상 직접 참조 금지 — 반드시 역할(Text / Fill / Border / Icon / Surface) 기반 시맨틱 토큰을 사용한다.

### 원시 팔레트 (Primitive Tokens)

#### Primary (Brand Blue)
| Step | Value |
|------|-------|
| /10  | `#0b2d66` |
| /30  | `#0f4dab` |
| /40  | `#155dd8` |
| /50  | `#1a75ff` |
| /60  | `#4891ff` |
| /70  | `#66a3ff` |
| /99  | `#f2f5f9` |

#### Cool Neutral (UI Neutral)
| Step | Value |
|------|-------|
| /10  | `#171719` |
| /15  | `#1b1c1e` |
| /20  | `#28292c` |
| /50  | `#70737c` |
| /98  | `#f4f4f5` |
| /99  | `#f7f7f8` |

#### Status Colors
| Color    | Value |
|----------|-------|
| Positive | `#00c244` |
| Info     | `#0066ff` |
| Caution  | `#ff9200` |
| Negative | `#ff4242` |

### 시맨틱 토큰 — Light Mode (rgba는 CSS 변수로 사용할 것)

| 역할 | CSS Variable | Value |
|------|-------------|-------|
| Text default | `--color-text` | `#171719` |
| Text neutral | `--color-text-neutral` | `rgba(46,47,51,0.88)` |
| Text alternative | `--color-text-alt` | `rgba(55,56,60,0.61)` |
| Text assistive | `--color-text-assistive` | `rgba(55,56,60,0.28)` |
| Surface | `--color-surface` | `#ffffff` |
| Surface alt | `--color-surface-alt` | `#f7f7f8` |
| Border | `--color-border` | `rgba(112,115,124,0.35)` |
| Border alt | `--color-border-alt` | `rgba(112,115,124,0.16)` |
| Fill | `--color-fill` | `rgba(112,115,124,0.22)` |
| Fill neutral | `--color-fill-neutral` | `rgba(112,115,124,0.12)` |
| Fill alt | `--color-fill-alt` | `rgba(112,115,124,0.08)` |

#### Status Alert Colors (Light)
| Category | Background | Text |
|----------|-----------|------|
| Positive | `#d9ffe6` | `#009632` |
| Info | `#eaf2fe` | `#0054d1` |
| Caution | `#fef4e6` | `#d47800` |
| Negative | `#feecec` | `#e52222` |

---

## Typography

Primary Font: **Pretendard** (한국어 최적화)

| Token | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|----------------|
| display-lg | 32px | 700 | 1.25 | -0.5px |
| headline-lg | 24px | 700 | 1.33 | -0.3px |
| title-lg | 20px | 600 | 1.4 | — |
| title-md | 18px | 600 | 1.44 | — |
| body-lg | 16px | 400 | 1.5 | — |
| body-md | 14px | 400 | 1.5 | — |
| label-lg | 14px | 600 | 1.5 | — |
| button-md | 14px | 600 | 1.5 | — |
| body-lg-medium | 16px | 600 | 1.5 | — |
| body-md-medium | 14px | 600 | 1.5 | — |
| caption-lg | 12px | 400 | 1.4 | — |
| caption-sm | 11px | 400 | 1.36 | — |

---

## Layout

### 그리드 & 컨테이너

| Breakpoint | Width | Padding | Columns |
|-----------|-------|---------|---------|
| Mobile | < 480px | 16px | 1 |
| Mobile-Large | 480–767px | 16px | 1–2 |
| Tablet | 768–1023px | 24px | 2–3 |
| Desktop | ≥ 1024px | 40px | 3–4 (max 1280px, 좌측 nav rail 240px) |

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
| 0 | Flat surface, list items | none |
| 1 | Card | `0 2px 8px rgba(0,0,0,0.06)` |
| 2 | Dropdown, tooltip | `0 4px 16px rgba(0,0,0,0.10)` |
| 3 | Modal, bottom sheet | `0 8px 32px rgba(0,0,0,0.16)` |

---

## Shapes

| Token | Value | Usage |
|-------|-------|-------|
| none | 0px | Divider, 전체 너비 요소 |
| xs | 2px | 내부 소형 요소, Checkbox |
| sm | 4px | Tag, Pagination item |
| md | 8px | Button, Input, Select, Modal small |
| lg | 12px | — |
| xl | 16px | Card 기본, Modal |
| 2xl | 20px | Bottom Sheet 상단 |
| full | 9999px | Badge, Avatar, Chip, FAB |

---

## Components

### Button

```
button-primary:    bg={colors.primary}       text=white               h=48px  px=24px  r={rounded.md}
button-secondary:  bg={colors.fill-neutral}  text={colors.text}       h=48px  px=24px  r={rounded.md}
button-outline:    bg=transparent  border=1px {colors.border}  text={colors.text}  h=48px  px=24px  r={rounded.md}
button-ghost:      bg=transparent            text={colors.text}       h=48px  (no border)  px=12px
button-negative:   bg={colors.negative}      text=white               h=48px  px=24px  r={rounded.md}
button-disabled:   bg={colors.surface-disabled}  text={colors.text-disabled}  r={rounded.md}
button-fab:        r={rounded.full}
```

### Input Field

```
input-default:   h=52px  r={rounded.md}  border=1px {colors.border}
input-focused:   border=1px {colors.primary-border}
input-error:     border=1px {colors.negative}
input-disabled:  bg={colors.surface-disabled}  text={colors.text-disabled}
Label: body-md / {colors.text-neutral}  (input 위에 배치)
Placeholder: {colors.text-assistive}
```

### Card

```
card-default:  bg={colors.surface}  r={rounded.xl}  p=20px
               border=1px {colors.border-alt}
               shadow=0 2px 8px rgba(0,0,0,0.06)
```

### List Item

```
list-item-default:  min-h=56px  px=16px
                    border-bottom=1px {colors.border-alt}
                    Leading icon: 24px / {colors.icon}
                    Trailing chevron: 16px / {colors.text-neutral}
```

### Status Badge / Chip

```
r={rounded.full}
badge-positive:  bg={colors.positive}  text=white
badge-negative:  bg={colors.negative}  text=white
badge-caution:   bg={colors.caution}   text=white
badge-info:      bg={colors.info}      text=white

chip-default:   border=1px {colors.border}  h=32px
chip-selected:  bg={colors.primary-fill-neutral}  text={colors.primary-text}  border=1px {colors.primary}
```

### Navigation / Tab Bar

```
nav-bar-default:       bg={colors.surface}  border-top=1px {colors.border-alt}
nav-bar-item-active:   icon+text={colors.primary}
nav-bar-item-inactive: {colors.text-alternative}
```

### Tabs

```
tab-bar:          bg={colors.surface}  border-bottom=1px {colors.border-alt}  h=48px
tab-item-active:  text={colors.primary}  typography=label-lg  border-bottom=2px {colors.primary}
tab-item-inactive: text={colors.text-alternative}  typography=body-md
Tab Scroll: 가로 스크롤 허용 (mobile)
```

### Modal / Bottom Sheet

```
modal-default:        bg={colors.surface}  r={rounded.xl}  p=24px  max-w=480px
                      shadow=0 8px 32px rgba(0,0,0,0.16)
bottom-sheet-default: bg={colors.surface}  r={rounded.2xl} 상단만  px=16px py=24px
```

### Interaction States

```
button-primary-hover:    bg={colors.primary-text}  (#155dd8)
button-primary-pressed:  bg=#0f4dab
button-secondary-hover:  bg={colors.fill-alt}
chip-selected:           bg={colors.primary-fill-neutral}  text={colors.primary-text}  border=1px {colors.primary}
input-focused:           border=1px {colors.primary-border}  (box-shadow 없음)
focus-ring (범용):       outline=2px solid {colors.primary}  outline-offset=2px
```

### Checkbox / Radio

```
checkbox-default:   20×20px  r={rounded.xs}  border=1.5px {colors.border}  bg={colors.surface}
checkbox-checked:   bg={colors.primary}  check icon white  border={colors.primary}
checkbox-disabled:  bg={colors.surface-disabled}  border={colors.border-alt}

radio-default:    20×20px  r={rounded.full}  border=1.5px {colors.border}
radio-selected:   border=1.5px {colors.primary}  inner dot 10px {colors.primary}
radio-disabled:   border={colors.border-alt}  dot={colors.text-disabled}
```

### Toggle / Switch

```
Track:         48×28px  r={rounded.full}
toggle-off:    track={colors.fill}  thumb=white 22px
toggle-on:     track={colors.primary}  thumb=white 22px
toggle-disabled: track={colors.surface-disabled}  thumb={colors.surface-inactive}
```

### Select / Dropdown

```
select-default:  h=52px  r={rounded.md}  border=1px {colors.border}  bg={colors.surface}
select-focused:  border=1px {colors.primary-border}
Chevron icon:    20px  {colors.icon-neutral}
Option list:     bg={colors.surface}  shadow=elevation-2  r={rounded.md}
Option hover:    bg={colors.fill-alt}
Option selected: text={colors.primary}  bg={colors.primary-fill-neutral}
```

### Alert / Banner

```
alert-positive: bg=#d9ffe6  text=#009632  border=1px {colors.positive}  r={rounded.md}
alert-negative: bg=#feecec  text=#e52222  border=1px {colors.negative}  r={rounded.md}
alert-caution:  bg=#fef4e6  text=#d47800  border=1px {colors.caution}   r={rounded.md}
alert-info:     bg=#eaf2fe  text=#0054d1  border=1px {colors.info}      r={rounded.md}
패딩: 12px 16px  아이콘 20px 왼쪽 + 텍스트 + 닫기 버튼 오른쪽
```

### Table

```
table-header:    bg={colors.surface-alt}  text={colors.text-neutral}  typography=caption-lg+weight600  h=44px  px=16px
                 border-bottom=1px {colors.border}
table-row:       bg={colors.surface}  text={colors.text}  typography=body-md  min-h=48px  px=16px
                 border-bottom=1px {colors.border-alt}
table-row-hover: bg={colors.fill-alt}
```

### Pagination

```
pagination-item:          36×36px  r={rounded.sm}  text={colors.text}  typography=body-md
pagination-item-active:   bg={colors.primary}  text=white  r={rounded.sm}
pagination-item-disabled: text={colors.text-disabled}
```

### Stepper

```
stepper-step-default:  32×32px  r={rounded.full}  bg={colors.fill-neutral}  text={colors.text}
stepper-step-active:   bg={colors.primary}  text=white
stepper-step-done:     bg={colors.primary-fill-neutral}  check icon {colors.primary-text}
Label: body-md  {colors.text}  아래 정렬
Connector: 1px {colors.border-alt}
```

### Progress Bar

```
progress-bar-default:  h=4px  r={rounded.full}
Track: bg={colors.fill-neutral}
Fill:  bg={colors.primary}
Animation: left → right  transition 300ms ease-out
```

### Breadcrumb

```
breadcrumb-item:    text={colors.text-alternative}  typography=body-md
breadcrumb-current: text={colors.text}  typography=label-lg
Separator: "/" — {colors.text-assistive}  mx=8px
```

### Tag

```
tag-default:  bg={colors.fill-alt}  text={colors.text-neutral}  typography=caption-lg  r={rounded.sm}  px=8px  py=2px
tag-primary:  bg={colors.primary-fill-neutral}  text={colors.primary-text}  r={rounded.sm}
— Chip과 달리 클릭 불가 라벨 전용
```

### Avatar

```
avatar-sm (32px): r={rounded.full}  bg={colors.fill-neutral}  typography=caption-lg
avatar-md (40px): r={rounded.full}  bg={colors.fill-neutral}  typography=body-md
avatar-lg (48px): r={rounded.full}  bg={colors.fill-neutral}  typography=body-lg
```

### Accordion

```
accordion-item:          bg={colors.surface}  typography=body-lg  px=16px  py=16px
                         border-bottom=1px {colors.border-alt}
accordion-item-expanded: content typography=body-md  {colors.text-neutral}  px=16px  pb=16px
```

### Tooltip

```
tooltip-default:  bg=#28292c  text=white  r={rounded.sm}  typography=caption-lg  px=10px  py=6px  max-w=240px
Arrow: 6px triangle  방향 top/bottom/left/right 자동
Delay: 300ms show  0ms hide
```

### Skeleton

```
skeleton-default:  bg={colors.fill-alt}  shimmer animation  r={rounded.sm}
Text skeleton:  h=14px  r={rounded.sm}
Image skeleton: 임의 크기  r={rounded.md}
Animation: shimmer  1.5s ease-in-out infinite
```

### Divider

```
divider-default: 1px {colors.border-alt}  (카드 내부 약한 구분선)
divider-strong:  1px {colors.border}      (섹션 경계 강한 구분선)
Inset: margin-left=16px  (List Item 내 들여쓰기 구분선)
```

### Empty State

```
empty-state-default:  bg={colors.surface}  p={spacing.3xl}  text-align=center
Icon:  40px  {colors.text-assistive}
Title: typography=title-md  {colors.text}  mt=16px
Body:  typography=body-md  {colors.text-alternative}  mt=8px
CTA:   button-primary or button-outline  mt=24px
```

### Search Bar

```
search-bar-default:  h=44px  r={rounded.md}  border=1px {colors.border}  bg={colors.surface}
Search icon: 20px  {colors.icon-neutral}  padding-left=40px
search-bar-focused:  border=1px {colors.primary-border}
Clear button: 20px ×  {colors.icon-neutral}  (입력값 있을 때만 표시)
```

### Section Header

```
section-header-default:  Title: typography=title-lg  {colors.text}
                         Subtitle: typography=body-md  {colors.text-alternative}  mt=4px
                         Action: button-ghost or text link  우측 정렬
                         mb={spacing.lg}  (24px)
```

---

## Do's and Don'ts

**Do**
- 모든 색상은 `var(--color-*)` CSS 변수로 참조 — hex 직접 입력 절대 금지
- Primary Blue(`#1a75ff`)는 핵심 인터랙션(버튼, 링크, 포커스)에만 집중 사용
- 8px 그리드 엄수 — spacing 토큰만 사용
- Radius는 토큰으로만 사용 (`rounded.*`)
- Light/Dark 모두 CSS 변수 참조 시 자동 전환
- 버튼 레이블은 항상 버튼 안 (인라인 텍스트)
- Input 레이블은 반드시 필드 위(above) 배치

**Don't**
- Primary Blue를 배경이나 장식 목적으로 남용하지 않는다
- 8px 그리드 외의 임의 spacing 사용 금지
- 하드코딩된 hex 색상 코드 직접 사용 금지
- 컴포넌트 높이를 터치 타깃 최솟값(44px) 아래로 낮추지 않는다
- 버튼에 pill/full radius 사용 금지 (FAB·Avatar·Chip·Badge 제외)
- 한국어 레이블은 인라인 배치 금지 — 항상 input 위(above)에 위치

---

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 480px | 1열 레이아웃 · 하단 탭 바 · 카드 전체폭 · 컨테이너 padding=16px |
| Mobile-Large | 480–767px | 하단 탭 바 유지 · 카드 최대 2열 가능 |
| Tablet | 768–1023px | 상단 내비게이션 바 · 카드 2–3열 · 컨테이너 padding=24px |
| Desktop | ≥ 1024px | 좌측 레일 240px · 카드 3–4열 · max-width 1280px · 컨테이너 padding=40px |

### 터치 타깃

- 모든 인터랙티브 요소 최소 **44×44px** (WCAG AA)
- Primary Button: **48px** height
- List Item: min-height **56px**
- Tab Bar 아이콘 영역: **48px**
- Chip/Badge 32px → 모바일 padding 증가로 44px 확보

### 콜랩스 전략

- **Navigation**: 모바일(≤ 767px) → `nav-bar-default` 하단 탭 바 · 태블릿 → 상단 내비게이션 · 데스크탑 → 좌측 레일 240px
- **Card Grid**: 데스크탑 3–4열 → 태블릿 2열 → 모바일 1열 (`gap=var(--spacing-base)`)
- **Modal**: 데스크탑 `modal-default` max-width 480px 중앙 · 모바일 `bottom-sheet-default` 전환 권장
- **Table**: 모바일에서 가로 스크롤 허용 — `overflow-x: auto` 래퍼 사용
- **Form**: 데스크탑 max-width 480px 중앙 카드 · 모바일 전체폭

### 이미지 & 미디어

- `object-fit: cover` + `aspect-ratio` 유지 — 비율 왜곡 절대 금지
- 아이콘: 16/20/24px 고정 — 반응형 스케일 금지
- 타이포그래피: `clamp()` 반응형 금지 — 반드시 typography 토큰 고정 사용

---

## Iteration Guide

1. 컴포넌트는 반드시 `components:` 토큰 이름으로 정확히 지칭하라 (예: `button-primary`, `tab-item-active`, `alert-negative`)
2. 색상은 반드시 `var(--color-*)` CSS 변수로만 참조 — hex 직접 입력 절대 금지
3. 수정 후 `npx @google/design.md lint DESIGN.md` 실행으로 스펙 준수 여부 확인
4. 새 섹션 추가 시 배경 레이어를 먼저 결정하라
   - 전체 페이지 배경: `var(--color-surface-alt)` (항상)
   - 카드/모달/시트: `var(--color-surface)` (항상)
   - Primary 강조 영역: `var(--color-primary-fill-neutral)`
5. 버튼 radius는 항상 `var(--rounded-md)` (8px) — pill/full 금지 (FAB·Avatar·Chip 제외)
6. Spacing은 반드시 `var(--spacing-*)` 토큰으로만 사용 — 임의 px 금지
7. 상태 색상(Positive/Negative/Caution/Info) = 반드시 `var(--color-positive/negative/caution/info)`
8. Typography는 반드시 지정된 12개 토큰 중 선택 (display-lg/headline-lg/title-lg/title-md/body-lg/body-md/body-lg-medium/body-md-medium/label-lg/button-md/caption-lg/caption-sm)
9. 다크 모드는 별도 CSS 작성 없음 — `@media (prefers-color-scheme: dark)` 블록이 자동 처리

---

## Known Gaps

문서에 명시되지 않은 경우 아래 규칙으로 추론하라:

> **색상 토큰 이중 표현 주의:** YAML `colors:` 블록의 hex 값은 흰 배경 기준 근사치다. 실제 CSS는 `var(--color-*)` 변수를 사용하며 rgba 반투명 값을 포함한다. 코드 작성 시 반드시 CSS 변수를 사용하고, hex 직접 사용 금지.
> | YAML hex (근사) | CSS `var(--color-*)` (실제) |
> |---|---|
> | `text-neutral: "#474a4f"` | `rgba(46,47,51,0.88)` |
> | `text-alternative: "#9a9ba0"` | `rgba(55,56,60,0.61)` |
> | `text-assistive: "#c8c8cb"` | `rgba(55,56,60,0.28)` |
> | `border: "#c5c6c9"` | `rgba(112,115,124,0.35)` |
> | `border-alt: "#dcdde0"` | `rgba(112,115,124,0.16)` |
> | `fill: "#d0d1d4"` | `rgba(112,115,124,0.22)` |
> | `fill-neutral: "#dfe0e2"` | `rgba(112,115,124,0.12)` |
> | `fill-alt: "#e9eaeb"` | `rgba(112,115,124,0.08)` |

- **데이터 차트/그래프**: Primary Blue 시작 → Accent 팔레트 순서 (Lime #58cf04 → Cyan #00bdde → Light Blue #00aeff → Violet #6541f2 → Pink #f553da)
- **로딩 스피너**: `border: 3px solid var(--color-border-alt)` + `border-top-color: var(--color-primary)` + `border-radius: 50%` + rotate animation 700ms linear infinite
- **아이콘 크기**: 16px (인라인/캡션), 20px (body), 24px (heading/list), 40px (empty state)
- **포커스 링**: `outline: 2px solid var(--color-primary)` + `outline-offset: 2px`
- **z-index 레이어**: 기본 콘텐츠 0 → Sticky 헤더 100 → Dropdown 200 → Modal 300 → Snackbar 400 → Tooltip 500
- **애니메이션 타이밍**: hover/press `150ms ease-out` · expand/collapse `200ms ease-out` · modal/sheet 진입 `300ms ease-in-out`

---

## CSS Implementation

Copy this `:root` block verbatim — AI must not alter these values:

```css
:root {
  /* ── KTDS Tokens ───────────────────────────────────────── */
  /* Colors */
  --color-primary: #1a75ff;
  --color-primary-text: #155dd8;
  --color-primary-fill-neutral: #f2f5f9;
  --color-surface: #ffffff;
  --color-surface-alt: #f7f7f8;
  --color-text: #171719;
  --color-text-neutral: rgba(46,47,51,0.88);
  --color-text-alt: rgba(55,56,60,0.61);
  --color-text-assistive: rgba(55,56,60,0.28);
  --color-border: rgba(112,115,124,0.35);
  --color-border-alt: rgba(112,115,124,0.16);
  --color-fill: rgba(112,115,124,0.22);
  --color-fill-neutral: rgba(112,115,124,0.12);
  --color-fill-alt: rgba(112,115,124,0.08);
  --color-positive: #00c244;
  --color-caution: #ff9200;
  --color-negative: #ff4242;
  --color-info: #0066ff;
  --color-surface-disabled: #f4f4f5;
  --color-text-disabled: rgba(55,56,60,0.35);
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
  --text-display-lg: 32px;
  --text-headline-lg: 24px;
  --text-title-lg: 20px;
  --text-title-md: 18px;
  --text-body-lg: 16px;
  --text-body-md: 14px;
  --text-label-lg: 14px;
  --text-button-md: 14px;
  --text-body-lg-medium: 16px;
  --text-body-md-medium: 14px;
  --text-caption-lg: 12px;
  --text-caption-sm: 11px;
}
```

**Spacing rules:** card padding = `var(--spacing-md)` (20px) · mobile container padding = `var(--spacing-base)` (16px) · tablet container = `var(--spacing-lg)` (24px) · desktop container = `var(--spacing-2xl)` (40px) · card gap mobile = `var(--spacing-base)` (16px) · card gap tablet+ = `var(--spacing-md)` (20px).

**Component heights:** Primary button = 48px · Input field = 52px · List item min-height = 56px · Tab Bar icon area = 48px. All touch targets minimum 44px.

**Button-primary spec:** height 48px · padding `var(--spacing-lg)` horizontal (24px) · radius `var(--rounded-md)` (8px) · bg `var(--color-primary)` · color white.

**Pretendard font CDN — HTML `<head>`에 반드시 포함:**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
```
`body { font-family: var(--font-sans); background-color: var(--color-surface-alt); }` 선언 필수.

**Surface 레이어 원칙 (반드시 준수):**
- 페이지/앱 전체 배경: `var(--color-surface-alt)` (#F7F7F8)
- 카드·모달·시트·컴포넌트 배경: `var(--color-surface)` (#FFFFFF)
- 섹션 강조 배경(Primary 관련): `var(--color-primary-fill-neutral)` (#F2F5F9)
- 절대로 페이지 전체 배경을 #FFFFFF(흰색)로 사용하지 말 것.

**다크 모드 CSS — HTML `<style>` 내 `:root` 블록 다음에 반드시 포함:**
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #1a75ff;
    --color-primary-text: #1a75ff;
    --color-primary-fill-neutral: #02060e;
    --color-surface: #1b1c1e;
    --color-surface-alt: #0f0f10;
    --color-text: #f7f7f8;
    --color-text-neutral: rgba(194,196,200,0.88);
    --color-text-alt: rgba(174,176,182,0.61);
    --color-text-assistive: rgba(174,176,182,0.28);
    --color-border: rgba(112,115,124,0.52);
    --color-border-alt: rgba(112,115,124,0.35);
    --color-fill: rgba(112,115,124,0.35);
    --color-fill-neutral: rgba(112,115,124,0.16);
    --color-fill-alt: rgba(112,115,124,0.12);
    --color-surface-disabled: #2e2f33;
    --color-text-disabled: rgba(174,176,182,0.35);
    --color-surface-inactive: #333438;
    --color-positive: #1ed45a;
    --color-caution: #ffa938;
    --color-negative: #ff6363;
    --color-info: #3385ff;
  }
}
```

---

## Page Templates

각 템플릿은 YAML `components:` 내 `ex-*` 토큰으로도 참조 가능하다.

### 목록 페이지 (`ex-list-page`)

```
배경: var(--color-surface-alt)

section-header-default (title-lg 제목 + 우측 button-primary)
  ↓ gap={spacing.lg}
필터 행: chip-default 그룹 + search-bar-default
  ↓ gap={spacing.base}
card-default 그리드
  모바일:    1열  gap=16px
  태블릿:    2열  gap=20px
  데스크탑:  3–4열  gap=20px
  ↓
pagination-item (중앙 정렬)
```

### 폼 페이지 (`ex-form-page`)

```
배경: var(--color-surface-alt)
중앙 card-default (max-width 480px  모바일=전체폭)

  title-md 제목
  body-md 설명 (선택)
  ──────────────────────
  레이블(body-md/{colors.text-neutral}) + input-default 스택  gap={spacing.md}
  ──────────────────────
  button-primary (100% 너비)
  button-ghost 취소 (선택)
```

### 대시보드 (`ex-dashboard`)

```
배경: var(--color-surface-alt)

데스크탑:
  Nav Rail 240px (고정) | Main Content
                         ├── Stat card-default 행 (2–4열  gap=20px)
                         ├── Chart card-default (전체 너비 or 2/3)
                         └── 목록 card-default + 사이드 card-default (2/3 + 1/3)

모바일:
  nav-bar-default (하단) + 스크롤 콘텐츠 (1열 card-default 스택)
```

### 상세 페이지 (`ex-detail-page`)

```
배경: var(--color-surface-alt)

breadcrumb-item
  ↓
Hero card-default (전체 너비)
  headline-lg + tag-default/badge-* + body-lg 설명
  button-primary + button-outline
  ↓
콘텐츠 영역 (데스크탑: 2/3 본문 + 1/3 사이드)
  accordion-item 목차 or tab-bar 콘텐츠
```

### 인증 페이지 (`ex-auth-page`)

```
배경: var(--color-surface-alt)
중앙 card-default (max-width 400px)

  브랜드 로고 (중앙 정렬)
  title-md (로그인 / 회원가입)
  input-default (이메일)
  input-default (비밀번호)
  button-primary (100% 너비)
  divider-default + 소셜 로그인 (선택)
  caption-lg 링크 (계정 없음? 회원가입)
```

### 모달 다이얼로그 (`ex-modal-card`)

```
overlay: rgba(0,0,0,0.5)  z-index=300
modal-default (max-width 480px  모바일=bottom-sheet-default 전환)

  헤더: title-md + button-ghost(×) 우측 고정
  ──────────────────────
  콘텐츠: body-md / {colors.text-neutral}  gap={spacing.md}
  ──────────────────────
  액션 행 (우측 정렬):
    button-primary + button-ghost 취소
    또는 button-primary 100% 너비 (단순 확인 모달)
```

### 토스트 알림 (`ex-toast`)

```
position: fixed  하단 중앙  z-index=400
snackbar-default (min-width=280px  max-width=480px)

  body-md (white) + 선택적 action button-ghost(white) 우측
  자동 닫힘: 3–5초
  animation: slide-up 200ms ease-out 진입 · fade-out 150ms ease-out 퇴장
```

### 빈 상태 (`ex-empty-state`)

```
배경: var(--color-surface)  (목록 카드 또는 테이블 내부)
empty-state-default (p={spacing.3xl}  text-align=center)

  아이콘 40px  {colors.text-assistive}
  title-md  {colors.text}  mt=16px
  body-md   {colors.text-alternative}  mt=8px
  button-primary or button-outline  mt=24px
```
