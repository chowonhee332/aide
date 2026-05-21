---
version: alpha
name: KTDS Design System
description: "KT DS 엔터프라이즈 UI 시스템 — Clarity(명확성) · Trust(신뢰감) · Efficiency(효율성)를 핵심 철학으로 한다. 화이트 서피스(#ffffff)와 쿨 뉴트럴 구조 위에 Primary Blue(#1a75ff)를 유일한 인터랙션 강조색으로 사용한다. 버튼은 8px 라운드 사각형(pill 절대 금지), 입력 필드 52px, 카드 16px 라운드에 subtle shadow. 페이지 배경은 반드시 surface-alt(#f7f7f8), 카드/컴포넌트 배경은 surface(#ffffff). Pretendard 폰트. 모바일=하단 탭 바(NavBottom), 데스크탑=좌측 레일(NavSide, 240px). 패키지: @ktds-ui/components (대부분), Toast는 @ktds-ui/context/ToastContext. Carousel은 swiper 별도 설치, Chart는 chart.js 별도 설치."

colors:
  # Brand Primary
  primary:              "#1a75ff"
  primary-text:         "#186ae8"
  primary-fill-neutral: "#E8F1FF"
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
    fontWeight: "700"
    lineHeight: 1.25
    letterSpacing: -0.5px
  headline-lg:
    fontFamily: Pretendard
    fontSize: 24px
    fontWeight: "700"
    lineHeight: 1.33
    letterSpacing: -0.3px
  title-lg:
    fontFamily: Pretendard
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 1.4
  title-md:
    fontFamily: Pretendard
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 1.44
  body-lg:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  body-md:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
  label-lg:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 1.5
  button-md:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 1.5
  body-lg-medium:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: "600"
    lineHeight: 1.5
  body-md-medium:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 1.5
  caption-lg:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.4
  caption-sm:
    fontFamily: Pretendard
    fontSize: 11px
    fontWeight: "400"
    lineHeight: 1.36

rounded:
  none: 0px
  xs:   2px
  sm:   4px
  base: 6px
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

shadows:
  1: "0px 1px 3px rgba(0,0,0,0.16)"    # --dsx-shadow-1 · Card subtle
  2: "0px 3px 4px rgba(0,0,0,0.16)"    # --dsx-shadow-2 · Button FAB
  3: "0px 8px 20px rgba(0,0,0,0.10)"   # --dsx-shadow-3 · Dropdown / Tooltip
  4: "0px 18px 28px rgba(0,0,0,0.08)"  # --dsx-shadow-4 · Drawer / Side panel
  5: "4px 16px 40px rgba(0,0,0,0.10)"  # --dsx-shadow-5 · Modal
  6: "6px 32px 48px rgba(0,0,0,0.10)"  # --dsx-shadow-6 · Full-screen overlay panel

transitions:
  base:     ".2s ease-in-out"                    # --dsx-transition-base · 버튼, 입력 hover/focus
  fade:     ".2s linear"                          # --dsx-transition-fade · Toast, Skeleton shimmer
  collapse: ".25s ease-out"                       # --dsx-transition-collapse · Accordion, Drawer
  popover:  ".16s cubic-bezier(.16, 1, .3, 1)"  # --dsx-transition-popover · Dropdown, Tooltip

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
  textarea-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.border}"
    defaultRows: 5
    maxLength: 1000
  textarea-filled:
    backgroundColor: "{colors.fill-alt}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    border: "none"
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
  nav-bottom-default:
    backgroundColor: "{colors.surface}"
    borderTop: "1px solid {colors.border-alt}"
    minItems: 3
    maxItems: 5
  nav-bottom-item-active:
    textColor: "{colors.primary}"
    iconColor: "{colors.primary}"
  nav-bottom-item-inactive:
    textColor: "{colors.text-alternative}"
    iconColor: "{colors.text-alternative}"
  nav-side-default:
    backgroundColor: "{colors.surface}"
    width: 240px
    defaultExpanded: true
  nav-top-default:
    backgroundColor: "{colors.surface}"
    supportsSubMenu: true
    subMenuDepth: 2
  modal-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    width: 480px
  dialog-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    maxWidth: 480px
    shadow: "{shadows.5}"
  drawer-default:
    backgroundColor: "{colors.surface}"
    defaultPlacement: "right"
    shadow: "{shadows.4}"
  bottom-sheet-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: 16px 24px
  snackbar-default:
    backgroundColor: "#28292c"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
  loading-static:
    position: "static"
    defaultSize: "3"
  loading-absolute:
    position: "absolute"
    defaultSize: "3"
  loading-fixed:
    position: "fixed"
    defaultSize: "3"
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
    border: "1px solid {colors.border}"
  select-filled:
    backgroundColor: "{colors.fill-alt}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 52px
    border: "none"
  select-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 52px
    border: "none"
  select-focused:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 52px
    border: "1px solid {colors.primary-border}"
  slider-default:
    trackColor: "{colors.fill-neutral}"
    fillColor: "{colors.primary}"
    handleColor: "{colors.primary}"
    handleSize: 20px
    trackHeight: 4px
  datepicker-default:
    format: "YYYY/MM/DD"
    directInputDisabled: true
    supportsRange: true
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
  admonition-note:
    backgroundColor: "#f0f4ff"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  admonition-tip:
    backgroundColor: "#efffee"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  admonition-danger:
    backgroundColor: "#feecec"
    textColor: "#e52222"
    rounded: "{rounded.md}"
    padding: 12px 16px
  admonition-caution:
    backgroundColor: "#fef4e6"
    textColor: "#d47800"
    rounded: "{rounded.md}"
    padding: 12px 16px
  admonition-info:
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
  carousel-default:
    requiresPackage: "swiper"
    defaultSlidesPerView: "auto"
    autoplay: false
  rate-default:
    defaultTotal: 5
    defaultStep: 1
    supportsHalfStep: true
  fileuploader-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    border: "1px dashed {colors.border}"
    maxFiles: 1
    maxFileSize: 10485760
    allowFileTypes: ["xlsx","xls","docx","doc","pptx","ppt","txt","pdf","zip","jpg","jpeg","png","gif"]
  dropdown-menu-default:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    shadow: "{shadows.3}"
  tree-menu-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    supportsCheckbox: true
    supportsRadio: true
  chart-default:
    requiresPackage: "chart.js"
    supportedTypes: ["line","bar","doughnut","pie"]
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
    description: "대시보드 — 데스크탑 NavSide 240px + 스탯 카드 행 + 차트 + 목록/사이드. 모바일 NavBottom 하단."
    background: "{colors.surface-alt}"
    desktop-nav: "NavSide 240px 좌측 고정"
    stats: "card-default 행 2–4열  gap={spacing.md}"
    chart: "card-default 전체 너비 or 2/3"
    list: "card-default 2/3 + 사이드 card-default 1/3"
    mobile-nav: "nav-bottom-default 하단"
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
    description: "토스트/스낵바 알림 — 하단 중앙 snackbar-default. 자동 닫힘 3–5초. useToast hook 사용."
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

## Package Imports

모든 컴포넌트는 `@ktds-ui/components`에서 import한다. Toast·Alert Dialog만 예외.

```ts
// 일반 컴포넌트
import {
  Button, ButtonArea, Stack,
  Fab,
  Icon, IconButton,
  Input, Textarea, Select, Slider, DatePicker,
  Checkbox, Radio, Toggle, Chip, Badge, Tag, Avatar,
  Card, Accordion, Tooltip, Table, Pagination, Stepper,
  ProgressBar, Skeleton, Breadcrumb, Divider, Alert, Admonition,
  Loading, Drawer, Dialog, Carousel, Rate, FileUploader,
  DropdownMenu, TreeMenu, Chart, NavBottom, NavSide, NavTop,
  Tablist, MenuTab,
  Heading, Text, TextList, Link, Mark,
} from '@ktds-ui/components';

// Toast — 별도 context 패키지
import { useToast } from '@ktds-ui/context/ToastContext';

// Alert Dialog — 별도 context 패키지
import { useAlert } from '@ktds-ui/context/AlertContext';
```

**외부 패키지 추가 설치 필요:**
```bash
npm install swiper    # Carousel 사용 시
npm install chart.js  # Chart 사용 시
```

---

## Colors

KTDS의 색상 전략은 **신뢰(Trust)와 명확성(Clarity)** 두 가지 원칙으로 수렴한다. KT 브랜드 Blue(`#1a75ff`)를 인터랙션 강조색 하나로 엄격히 제한해 시선을 분산시키지 않고, 화이트 서피스와 쿨 뉴트럴 팔레트로 엔터프라이즈 환경의 데이터 밀도를 소화한다.

- **Primary Blue 단일 강조**: 버튼, 링크, 포커스 링, 활성 탭 등 모든 인터랙션 강조를 `#1a75ff` 하나로 통일한다. Teal·Purple 등 보조 강조색을 도입하면 기업 사용자가 "어디를 눌러야 하는지" 판단이 흐려진다.
- **쿨 뉴트럴 계열**: 한국어 UI는 영문 대비 글자 밀도가 높아 텍스트 레이어 구분이 중요하다. Cool Neutral의 4단계 텍스트 계층(text → text-neutral → text-alt → text-assistive)은 정보 위계를 색상 채도가 아닌 투명도 감소로 표현한다.
- **rgba 시맨틱 토큰**: 다크 모드 전환 시 Surface 색이 반전되므로, 텍스트와 Border 값을 `rgba(R,G,B, opacity)` 형식으로 지정해 어두운 배경 위에서도 투과 비율이 그대로 유지된다.
- **Status Colors 분리**: Positive·Caution·Negative·Info는 주의 집중을 요하는 피드백에만 사용한다. 장식 목적의 컬러로 절대 재사용하지 않는다.

색상 직접 참조 금지 — 반드시 역할(Text / Fill / Border / Icon / Surface) 기반 시맨틱 토큰을 사용한다.

### 원시 팔레트 (Primitive Tokens)

#### Primary (Brand Blue)
| Step | Value |
|------|-------|
| /10  | `#0b2d66` |
| /30  | `#0f4dab` |
| /40  | `#186ae8` |
| /50  | `#1a75ff` |
| /60  | `#4891ff` |
| /70  | `#66a3ff` |
| /99  | `#E8F1FF` |

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

> **토큰명 주의**: YAML/Stitch 스펙에서는 `text-alternative`로 표기하고, CSS 변수는 `--color-text-alt`(단축형)를 사용한다. `--color-text-alternative`는 존재하지 않는다.

#### Status Alert Colors (Light)
| Category | Background | Text |
|----------|-----------|------|
| Positive | `#d9ffe6` | `#009632` |
| Info | `#eaf2fe` | `#0054d1` |
| Caution | `#fef4e6` | `#d47800` |
| Negative | `#feecec` | `#e52222` |

---

## Typography

KTDS의 타이포그래피 전략은 **한국어 정보 밀도에 최적화된 가독성** 확보를 목표로 한다.

- **Pretendard 단일 폰트**: 본고딕 계열이지만 라틴 영역 비례가 우수해 한·영 혼용 UI에서 균일한 글자 간격을 제공한다. 시스템 폰트(Apple SD Gothic / Noto Sans KR)는 플랫폼별 렌더링 차이가 있어 기업 서비스의 시각 일관성을 보장하지 못한다.
- **12개 토큰으로 고정된 스케일**: 디자이너가 임의 크기를 추가하지 못하도록 스케일을 12개 토큰으로 잠근다. `clamp()` 반응형 타이포그래피도 금지한다 — 엔터프라이즈 테이블·폼 UI에서 컬럼 너비 계산이 깨지기 때문이다.
- **16px body-lg 기준선**: 한국어 소형 본문(14px)은 고령 사용자에게 판독이 어렵다. 주 본문은 16px(body-lg)을 기준으로 하되, 보조 설명·레이블에만 14px(body-md)를 허용한다.
- **weight 계층**: Regular(400) → SemiBold(600) → Bold(700) 세 단계만 사용한다. Medium(500)은 weight 차이가 미미해 의도적으로 제외됐다.

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

### Typography React API

> **중요**: KTDS에는 `<Typography>` 컴포넌트가 없다. 제목은 `<Heading>`, 본문은 `<Text>`를 사용한다.
> 상세 props·예제는 하단 **Typography Components** 섹션을 참조.

| 역할 | 컴포넌트 | 주요 size 값 |
|------|----------|-------------|
| 제목 계층 (h1–h6, strong) | `<Heading>` | `display1` `display2` `heading1`–`heading3` `title1`–`title3` `body1` |
| 본문·레이블·캡션 | `<Text>` | `body1`–`body3` `label1`–`label2` `caption1`–`caption2` |
| 목록 | `<TextList>` | variant prop으로 bullet 스타일 결정 |
| 인라인 링크 | `<Link>` | to(CSR) 또는 href(SSR) |
| 인라인 강조 | `<Mark>` | variant: `bold` \| `fill` |

---

## Layout

KTDS의 레이아웃은 **8px 기본 그리드**를 중심으로 모든 spacing을 정의한다. 8px은 대부분의 화면 해상도(360/375/390/414/768/1024/1280px)에서 정수 배율로 떨어지므로 서브픽셀 렌더링 이슈를 방지한다.

모바일·태블릿·데스크탑에 각각 최적화된 내비게이션 패턴을 사용한다. 하나의 반응형 내비게이션으로 통합하지 않는 이유는, 모바일의 엄지 영역(하단)과 데스크탑의 맥락 탐색 영역(좌측 레일)이 본질적으로 다른 UX 모델이기 때문이다.

### 그리드 & 컨테이너

| Breakpoint | Width | Padding | Columns |
|-----------|-------|---------|---------|
| Mobile | < 480px | 16px | 1 |
| Mobile-Large | 480–767px | 16px | 1–2 |
| Tablet | 768–1023px | 24px | 2–3 |
| Desktop | ≥ 1024px | 40px | 3–4 (max 1280px, 좌측 NavSide 240px) |

- **기본 그리드**: 8px — 모든 spacing은 8px 배수 (또는 4px 서브스텝)
- **카드 간격**: 모바일 16px / 태블릿+ 20px

### 터치 타깃
- 최소 터치 영역: **44×44px**
- Primary Button: **48px** height (WCAG AA)
- List Item: min-height **56px**
- Tab Bar 아이콘: **48px** 탭 영역

### 반응형 내비게이션
- **Mobile (≤ 767px)**: `NavBottom` 하단 탭 바 (최소 3개, 최대 5개 메뉴)
- **Tablet (768–1023px)**: `NavTop` 상단 내비게이션 바
- **Desktop (≥ 1024px)**: `NavSide` 좌측 레일 (240px, 기본 펼침 상태)

---

## Elevation & Depth

KTDS는 그림자를 시각적 장식이 아닌 **레이어 계층 신호**로 사용한다. 그림자가 강할수록 해당 요소가 페이지 맥락에서 독립적인 관심 요구임을 사용자에게 전달한다.

- **레벨 0–1 (flat)**: 리스트 아이템·카드 기본면 — 그림자 없이 Surface/Surface-alt 색상 차이로만 분리한다. 과도한 그림자는 엔터프라이즈 데이터 테이블을 복잡하게 만든다.
- **레벨 2 (FAB)**: 페이지 위에 떠 있는 주요 액션 버튼. 고정 위치(fixed)이므로 스크롤 콘텐츠와 명확히 분리되어야 한다.
- **레벨 3 (Dropdown·Tooltip)**: 짧은 수명의 팝업. 과도한 그림자는 닫힘을 방해하므로 blur 반경을 20px로 제한한다.
- **레벨 4–6 (Drawer·Modal·Overlay)**: 사용자의 전체 주의를 요구하는 UI. 그림자가 클수록 배경 콘텐츠와의 깊이 차이를 강조해 "지금 이 레이어가 최상단"임을 인지시킨다.

DSX 공식 그림자 토큰 (`--dsx-shadow-*`):

| Level | CSS Variable | Shadow | Usage |
|-------|-------------|--------|-------|
| 0 | — | none | Flat surface, list items |
| 1 | `--dsx-shadow-1` | `0px 1px 3px rgba(0,0,0,0.16)` | Card subtle |
| 2 | `--dsx-shadow-2` | `0px 3px 4px rgba(0,0,0,0.16)` | Button FAB |
| 3 | `--dsx-shadow-3` | `0px 8px 20px rgba(0,0,0,0.10)` | Dropdown, Tooltip |
| 4 | `--dsx-shadow-4` | `0px 18px 28px rgba(0,0,0,0.08)` | Drawer, Side panel |
| 5 | `--dsx-shadow-5` | `4px 16px 40px rgba(0,0,0,0.10)` | Modal, Dialog |
| 6 | `--dsx-shadow-6` | `6px 32px 48px rgba(0,0,0,0.10)` | Full-screen overlay |

---

## Shapes

KTDS의 모서리 전략은 **신뢰감과 현대성의 균형**이다. 완전한 직각(0px)은 딱딱하고, 완전한 원형(pill)은 유희적이다. 기업 UI는 그 중간에서 일관된 언어를 유지해야 한다.

- **`md` (8px) — 유일한 인터랙션 반경**: Button, Input, Select, Card small 등 모든 주요 인터랙션 요소에 8px을 사용한다. Pill 형태 버튼은 KTDS에서 금지다 — 엔터프라이즈 레이아웃에서 텍스트 버튼과의 정렬이 깨지기 때문이다.
- **`xl` (16px) — 카드·모달**: 큰 컨테이너는 모서리를 크게 해 콘텐츠 영역임을 명시한다.
- **`full` (9999px) — 원형 전용**: Badge, Avatar, Chip, FAB에만 허용한다. 이 요소들은 "숫자 표기용 dot" 또는 "원형 액션 트리거"라는 의미론적 차이가 있어 예외를 인정한다.

| Token | Value | Usage |
|-------|-------|-------|
| none | 0px | Divider, 전체 너비 요소 |
| xs | 2px | 내부 소형 요소, Checkbox |
| sm | 4px | Tag, Pagination item |
| base | 6px | 중간 소형 요소 (`--dsx-radius-large`) |
| md | 8px | Button, Input, Select, Modal small |
| lg | 12px | — |
| xl | 16px | Card 기본, Modal |
| 2xl | 20px | Bottom Sheet 상단 |
| full | 9999px | Badge, Avatar, Chip, FAB |

---

## Transitions

DSX 공식 전환 토큰 (`--dsx-transition-*`):

| Token | Value | Usage |
|-------|-------|-------|
| `--dsx-transition-base` | `.2s ease-in-out` | 버튼, 입력 hover/focus 상태 전환 |
| `--dsx-transition-fade` | `.2s linear` | Toast, Overlay fade |
| `--dsx-transition-collapse` | `.25s ease-out` | Accordion, Drawer 슬라이드 |
| `--dsx-transition-popover` | `.16s cubic-bezier(.16, 1, .3, 1)` | Dropdown, Tooltip 팝오버 |

---

## Components

KTDS 컴포넌트 시스템은 **엔터프라이즈 업무 흐름 효율성**을 최우선으로 설계되었다. 모든 컴포넌트 명세는 상태(default·hover·focused·disabled)를 명시적으로 구분해 인터랙션 피드백이 예측 가능하도록 한다.

- **48px 버튼 높이**: WCAG 2.5.5 Target Size 기준(44px)보다 높게 설정해 모바일 터치 오류를 줄인다. 경험적으로 한국 사용자는 빠른 탭 습관으로 작은 버튼에서 오터치율이 높다.
- **52px 입력 필드**: 버튼(48px)보다 4px 높아 시각적으로 입력 영역임이 구분된다. outlined 변형이 기본인 이유는, filled 변형이 disabled 상태와 구분하기 어렵다는 사용성 테스트 결과에서 비롯되었다.
- **내비게이션 분리(Mobile/Tablet/Desktop)**: NavBottom(모바일)·NavTop(태블릿)·NavSide(데스크탑)를 각각 별개의 컴포넌트로 유지한다. 하나의 반응형 컴포넌트로 통합할 경우 복잡한 조건 분기가 생겨 유지보수 비용이 증가했다.
- **Toast vs Alert Dialog 분리**: 비차단(non-blocking) 알림은 Toast(`useToast`), 사용자 확인이 필요한 파괴적 행동(삭제·초기화)은 Alert Dialog(`useAlert`)를 사용한다. 두 패턴을 혼용하면 사용자가 경고 심각도를 구분하지 못한다.

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

**Size variants:** `small` / `large` (default 없음 — 기본이 표준 48px)

### Input Field

```
import { Input } from '@ktds-ui/components';

Props:
  variant:    'outlined' | 'filled'    (default: 'outlined')
  type:       'text' | 'password' | 'tel' | 'url' | 'search' | 'email'  (default: 'text')
  size:       'small' | 'large'
  full:       bool                     (width 100%)
  clearable:  bool                     (default: false — 지우기 버튼 표시)
  reveal:     bool                     (default: false — type='password'일 때 보기 버튼)
  slotBefore: node                     (입력 필드 앞 요소)
  slotAfter:  node                     (입력 필드 뒤 요소)
  maxLength:  number
  showCount:  bool                     (default: false — maxLength와 함께)
  disabled, readOnly, placeholder, value, className
  onChange, onFocus, onBlur, onClick
```

```
input-default:   h=52px  r={rounded.md}  border=1px {colors.border}
input-focused:   border=1px {colors.primary-border}
input-error:     border=1px {colors.negative}
input-disabled:  bg={colors.surface-disabled}  text={colors.text-disabled}
Label: body-md / {colors.text-neutral}  (input 위에 배치)
Placeholder: {colors.text-assistive}
```

### Textarea

```
import { Textarea } from '@ktds-ui/components';

Props:
  variant:    'outlined' | 'filled'  (default: 'outlined')
  rows:       number                 (default: 5)
  maxLength:  number                 (default: 1000)
  showCount:  bool                   (default: false — maxLength와 함께)
  disabled, readOnly, placeholder, value, className
```

```
textarea-default:  r={rounded.md}  border=1px {colors.border}  rows=5
textarea-filled:   bg={colors.fill-alt}  border=none
Label: body-md  위에 배치 / 입력 최대 글자수 카운트 표시 가능
```

### Card

```
card-default:  bg={colors.surface}  r={rounded.xl}  p=20px
               border=1px {colors.border-alt}
               shadow=var(--dsx-shadow-1)
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

### Navigation

#### NavBottom (Mobile 전용)

```
import { NavBottom } from '@ktds-ui/components';

Props:
  menuItems*: [{
    icon,
    label,
    to | href | onClick,  // 셋 중 하나로 링크 처리
    badge?,               // 선택적 badge 숫자
  }]
  className

제약: 최소 3개, 최대 5개 메뉴
```

```
nav-bottom-default:       bg={colors.surface}  border-top=1px {colors.border-alt}
nav-bottom-item-active:   icon+text={colors.primary}
nav-bottom-item-inactive: icon+text={colors.text-alternative}
```

#### NavSide (Desktop)

```
import { NavSide } from '@ktds-ui/components';

Props:
  menuName:         string        (default: 'Navigation')
  menuItems:        object[]      (2-depth submenu 지원)
  initialActiveMenu: string | number  (초기 활성 메뉴 ID)
  onClick:          func
  className

동작: 기본 펼침 상태, 접기/펼치기 토글 지원, 2-Depth 하위 메뉴 지원
```

```
nav-side-default:  bg={colors.surface}  width=240px  좌측 고정
                   collapsible=true  defaultExpanded=true
```

#### NavTop (Tablet/Desktop)

```
import { NavTop } from '@ktds-ui/components';

Props:
  menuName:  string
  menuItems: [{
    id, label, href,
    subMenu: [{ id, label, href, subMenu? }]  // 2-depth 지원
  }]

동작: 1-Depth hover/click 시 2-Depth 드롭다운 펼침
```

### Tabs

DSCore에는 두 가지 탭 컴포넌트가 있다:

#### Tablist (일반 탭, 모바일/데스크탑)

```
import { Tablist } from '@ktds-ui/components';

Props:
  data*:       [{ key: string, label: string, content: node }]
  variant:     'text' | 'box'   (default: 'text')
  isSmall:     bool             (default: false)
  activeTabKey: string
  onTabChange: func
```

```
tab-bar:          bg={colors.surface}  border-bottom=1px {colors.border-alt}  h=48px
tab-item-active:  text={colors.primary}  typography=label-lg  border-bottom=2px {colors.primary}
tab-item-inactive: text={colors.text-alternative}  typography=body-md
Tab Scroll: 가로 스크롤 허용 (mobile)
```

#### MenuTab (PC 전용, 브라우저 탭 스타일)

```
import { MenuTab } from '@ktds-ui/components';

Props:
  data*:       [{ key: string, label: string, content: node, closable: bool }]
  activeTabKey: string
  onTabChange: func
  onTabRemove: func

동작: 탭 닫기(×) 버튼, 좌/우 스크롤 아이콘, 동일 메뉴 중복 탭 허용
PC Only
```

### Modal / Bottom Sheet

```
modal-default:        bg={colors.surface}  r={rounded.xl}  p=24px  max-w=480px
                      shadow=var(--dsx-shadow-5)
bottom-sheet-default: bg={colors.surface}  r={rounded.2xl} 상단만  px=16px py=24px
```

### Dialog

```
import { Dialog } from '@ktds-ui/components';

Props:
  isOpen:        boolean
  title:         string
  subTitle:      string
  content:       string
  closeOnOutSide: boolean

구조: 타이틀(최대 1줄) + 서브타이틀 + 콘텐츠 영역 + Cancel/Primary 버튼 행
```

```
dialog-default:  bg={colors.surface}  r={rounded.xl}  p=24px
                 shadow=var(--dsx-shadow-5)  max-w=480px
                 overlay: rgba(0,0,0,0.5)  z-index=300
```

### Drawer

```
import { Drawer } from '@ktds-ui/components';

Props:
  isOpen*:        bool
  placement:      'right' | 'left' | 'bottom'  (default: 'right')
  closeOnOutSide: bool                          (default: false)
  title:          string
  afterOpenChange: func
  onClose:        func
  children*:      node
```

```
drawer-default:  bg={colors.surface}  shadow=var(--dsx-shadow-4)
                 slide animation: var(--dsx-transition-collapse)
                 overlay: rgba(0,0,0,0.5)
```

### Toast

```
import { useToast } from '@ktds-ui/context/ToastContext';

동작:
  - hook 기반 — 컴포넌트 렌더링 없이 함수 호출로 토스트 표시
  - 일시적 노출 후 자동 사라짐 (사용자 행위 불필요)
  - 한 화면에 항상 하나만 표시

// 사용 예시
const toast = useToast();
toast({ message: '저장되었습니다.', variant: 'primary' });
```

```
snackbar-default:  bg=#28292c  text=white  r={rounded.md}
                   position=fixed  bottom={spacing.lg}  z-index=400
                   animation=slide-up 200ms ease-out
```

### Loading

```
import { Loading } from '@ktds-ui/components';

Props:
  position:  'static' | 'absolute' | 'fixed'  (default: 'static')
  size:      '1' | '2' | '3' | '4' | '5'     (default: '3')
  isVisible: bool                              (default: true)
  label:     string
  className

position='static':   일반 인라인 로딩 (콘텐츠 영역 내)
position='absolute': 특정 컨테이너 기준 중앙 위치
position='fixed':    페이지 전체 화면 중앙 위치
```

### Select / Dropdown

```
import { Select } from '@ktds-ui/components';

Props:
  variant:     'outlined' | 'filled' | 'ghost'  (default: 'outlined')
  options:     [{ value: string | number, label: node }]
  size:        'small' | 'large'
  full:        bool            (width 100%)
  disabled:    bool            (default: false)
  invalid:     bool            (default: false)
  placeholder, className, onChange
```

```
select-default:  h=52px  r={rounded.md}  border=1px {colors.border}  bg={colors.surface}
select-filled:   bg={colors.fill-alt}  border=none
select-ghost:    bg=transparent  border=none
select-focused:  border=1px {colors.primary-border}
Chevron icon:    20px  {colors.icon-neutral}
Option list:     bg={colors.surface}  shadow=var(--dsx-shadow-3)  r={rounded.md}
Option hover:    bg={colors.fill-alt}
Option selected: text={colors.primary}  bg={colors.primary-fill-neutral}
```

### Slider

```
import { Slider } from '@ktds-ui/components';

Props:
  min*:    number
  max*:    number
  step:    number          (default: 1)
  value*:  number | number[]  (배열이면 double-handle 모드)
  marks:   number[]        (default: [])
  onChange: func
```

```
slider-default:  track h=4px  bg={colors.fill-neutral}
                 fill bg={colors.primary}
                 handle 20px circle  bg={colors.primary}
                 double-handle: value=[min, max] 배열 전달
```

### DatePicker

```
import { DatePicker } from '@ktds-ui/components';

Props:
  dateRange:  bool             (기간 선택 모드, default: false)
  value:      string | string[]  (YYYY/MM/DD 형식)
  onChange:   func
  minDate:    string           (YYYY/MM/DD)
  maxDate:    string           (YYYY/MM/DD)
  width:      string | number

주의: 직접 텍스트 입력/편집 불가 — 달력 UI로만 선택 가능
```

### Alert / Banner

```
alert-positive: bg=#d9ffe6  text=#009632  border=1px {colors.positive}  r={rounded.md}
alert-negative: bg=#feecec  text=#e52222  border=1px {colors.negative}  r={rounded.md}
alert-caution:  bg=#fef4e6  text=#d47800  border=1px {colors.caution}   r={rounded.md}
alert-info:     bg=#eaf2fe  text=#0054d1  border=1px {colors.info}      r={rounded.md}
패딩: 12px 16px  아이콘 20px 왼쪽 + 텍스트 + 닫기 버튼 오른쪽
```

### Admonition

```
import { Admonition } from '@ktds-ui/components';

Props:
  variant*:  'note' | 'tip' | 'danger' | 'caution' | 'info'
  title:     string
  children*: node  (본문 콘텐츠)
```

```
admonition-note:    bg=#f0f4ff  (메모/참고)
admonition-tip:     bg=#efffee  (팁)
admonition-danger:  bg=#feecec  text=#e52222  (위험)
admonition-caution: bg=#fef4e6  text=#d47800  (주의)
admonition-info:    bg=#eaf2fe  text=#0054d1  (정보)
r={rounded.md}  p=12px 16px
```

### Interaction States

```
button-primary-hover:    bg={colors.primary-text}  (#186ae8)
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
animation: var(--dsx-transition-collapse)
```

### Tooltip

```
tooltip-default:  bg=#28292c  text=white  r={rounded.sm}  typography=caption-lg  px=10px  py=6px  max-w=240px
Arrow: 6px triangle  방향 top/bottom/left/right 자동
Delay: 300ms show  0ms hide
animation: var(--dsx-transition-popover)
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

### Carousel

```
import { Carousel } from '@ktds-ui/components';
// 반드시 swiper 먼저 설치: npm install swiper

Props:
  slides:         node[]          (default: [])
  variant:        string
  slidesPerView:  number | string (default: 'auto')
  autoplay:       bool            (default: false)
  className
```

### Rate

```
import { Rate } from '@ktds-ui/components';

Props:
  icon:   string          (아이콘 커스텀)
  step:   number          (0.5 지원 — 반 단계 증감)
  total:  number          (기본 5개)

기본: 별 5개, 1씩 증감. step=0.5 설정 시 반 단계 선택 가능.
```

### FileUploader

```
import { FileUploader } from '@ktds-ui/components';

Props:
  allowDrop:       bool           (Drag & Drop 허용)
  uploadMsg:       string | node  (default: 'Drop files to upload')
  maxFiles:        number         (default: 1)
  maxFileSize:     number         (default: 10485760 = 10MB)
  allowFileType:   array          (허용: xlsx,xls,docx,doc,pptx,ppt,txt,pdf,zip,jpg,jpeg,png,gif)
  defaultFileList: array          (기존 업로드 파일 목록)
  hideFileList:    bool           (파일 목록 숨김)
  disabled:        bool
  buttonProps:     { variant, size, text }
  fileTypeMsg:     string         (확장자 안내 문구)
  errMsg:          string         (외부 에러 메시지)
  onUpload, onRemove, onDownload, onChange, onDrag
```

### DropdownMenu

```
import { DropdownMenu } from '@ktds-ui/components';

Props:
  label*:         node
  options*:       [{ value: string | number, label: node, icon: string, onClick: func }]
  onOptionSelect: func
  comboboxProps:  object
  trigger:        node | element  (커스텀 트리거 — 기본은 label 버튼)
  disabled:       bool            (default: false)
  className, style
```

```
dropdown-menu-default:  bg={colors.surface}  r={rounded.md}
                        shadow=var(--dsx-shadow-3)
                        animation: var(--dsx-transition-popover)
Option hover: bg={colors.fill-alt}
```

### TreeMenu

```
import { TreeMenu } from '@ktds-ui/components';

Props:
  data:          array        (default: [])  부모/리프 노드 계층 구조
  selectionType: 'checkbox' | 'radio'
  onSelect:      func

구조: 상위 노드(자식 있음, 접기/펼치기) + 리프 노드(자식 없음)
```

### Chart

```
import { Chart } from '@ktds-ui/components';
// 반드시 chart.js 먼저 설치: npm install chart.js

Props:
  chartLabel*:   string    (접근성용 제목)
  chartType*:    'line' | 'bar' | 'doughnut' | 'pie'
  chartData*:    object    (chart.js 데이터 형식)
  chartOptions:  object    (chart.js 옵션)
  chartInfo:     object    (doughnut 추가 정보)
  className

데이터 차트 컬러 팔레트:
Primary Blue → Lime #58cf04 → Cyan #00bdde → Light Blue #00aeff → Violet #6541f2 → Pink #f553da
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
- Carousel 사용 전 `npm install swiper`, Chart 사용 전 `npm install chart.js`
- Toast는 반드시 `useToast` hook 사용 (`@ktds-ui/context/ToastContext`)

**Don't**
- Primary Blue를 배경이나 장식 목적으로 남용하지 않는다
- 8px 그리드 외의 임의 spacing 사용 금지
- 하드코딩된 hex 색상 코드 직접 사용 금지
- 컴포넌트 높이를 터치 타깃 최솟값(44px) 아래로 낮추지 않는다
- 버튼에 pill/full radius 사용 금지 (FAB·Avatar·Chip·Badge 제외)
- 한국어 레이블은 인라인 배치 금지 — 항상 input 위(above)에 위치
- MenuTab을 모바일에서 사용하지 않는다 (PC 전용)
- DatePicker에서 직접 텍스트 입력 허용하지 않는다 (달력 선택만 가능)

---

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 480px | 1열 레이아웃 · NavBottom 하단 · 카드 전체폭 · 컨테이너 padding=16px |
| Mobile-Large | 480–767px | NavBottom 유지 · 카드 최대 2열 가능 |
| Tablet | 768–1023px | NavTop 상단 · 카드 2–3열 · 컨테이너 padding=24px |
| Desktop | ≥ 1024px | NavSide 240px 좌측 · 카드 3–4열 · max-width 1280px · 컨테이너 padding=40px |

### 터치 타깃

- 모든 인터랙티브 요소 최소 **44×44px** (WCAG AA)
- Primary Button: **48px** height
- List Item: min-height **56px**
- Tab Bar 아이콘 영역: **48px**
- Chip/Badge 32px → 모바일 padding 증가로 44px 확보

### 콜랩스 전략

- **Navigation**: 모바일(≤ 767px) → `NavBottom` 하단 · 태블릿 → `NavTop` 상단 · 데스크탑 → `NavSide` 240px 좌측
- **Card Grid**: 데스크탑 3–4열 → 태블릿 2열 → 모바일 1열 (`gap=var(--spacing-base)`)
- **Modal/Dialog**: 데스크탑 `modal-default` max-width 480px 중앙 · 모바일 `bottom-sheet-default` 전환 권장
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
3. 수정 후 `npx @google/design.md lint ktds.md` 실행으로 스펙 준수 여부 확인 (`@google/design.md` npm 패키지 필요)
4. 새 섹션 추가 시 배경 레이어를 먼저 결정하라
   - 전체 페이지 배경: `var(--color-surface-alt)` (항상)
   - 카드/모달/시트: `var(--color-surface)` (항상)
   - Primary 강조 영역: `var(--color-primary-fill-neutral)`
5. 버튼 radius는 항상 `var(--rounded-md)` (8px) — pill/full 금지 (FAB·Avatar·Chip 제외)
6. Spacing은 반드시 `var(--spacing-*)` 토큰으로만 사용 — 임의 px 금지
7. 상태 색상(Positive/Negative/Caution/Info) = 반드시 `var(--color-positive/negative/caution/info)`
8. Typography는 반드시 지정된 12개 토큰 중 선택 (display-lg/headline-lg/title-lg/title-md/body-lg/body-md/body-lg-medium/body-md-medium/label-lg/button-md/caption-lg/caption-sm)
9. 다크 모드는 별도 CSS 작성 없음 — `@media (prefers-color-scheme: dark)` 블록이 자동 처리
10. Drawer 전환 애니메이션은 `var(--dsx-transition-collapse)`, Dropdown/Tooltip은 `var(--dsx-transition-popover)` 사용

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
- **z-index 레이어**: 기본 콘텐츠 0 → Sticky 헤더 100 → Dropdown 200 → Modal/Dialog 300 → Snackbar/Toast 400 → Tooltip 500
- **애니메이션 타이밍**: hover/press `var(--dsx-transition-base)` · expand/collapse `var(--dsx-transition-collapse)` · fade `var(--dsx-transition-fade)` · popover `var(--dsx-transition-popover)`

---

## CSS Implementation

Copy this `:root` block verbatim — AI must not alter these values:

```css
:root {
  /* ── KTDS Tokens ───────────────────────────────────────── */
  /* Colors */
  --color-primary: #1a75ff;
  --color-primary-text: #186ae8;
  --color-primary-fill-neutral: #E8F1FF;
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
  --rounded-base: 6px;
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

  /* Shadows (DSX official) */
  --dsx-shadow-1: 0px 1px 3px rgba(0,0,0,0.16);
  --dsx-shadow-2: 0px 3px 4px rgba(0,0,0,0.16);
  --dsx-shadow-3: 0px 8px 20px rgba(0,0,0,0.10);
  --dsx-shadow-4: 0px 18px 28px rgba(0,0,0,0.08);
  --dsx-shadow-5: 4px 16px 40px rgba(0,0,0,0.10);
  --dsx-shadow-6: 6px 32px 48px rgba(0,0,0,0.10);

  /* Transitions (DSX official) */
  --dsx-transition-base: .2s ease-in-out;
  --dsx-transition-fade: .2s linear;
  --dsx-transition-collapse: .25s ease-out;
  --dsx-transition-popover: .16s cubic-bezier(.16, 1, .3, 1);
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
- 섹션 강조 배경(Primary 관련): `var(--color-primary-fill-neutral)` (#E8F1FF)
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
  NavSide 240px (고정) | Main Content
                         ├── Stat card-default 행 (2–4열  gap=20px)
                         ├── Chart card-default (전체 너비 or 2/3)
                         └── 목록 card-default + 사이드 card-default (2/3 + 1/3)

모바일:
  NavBottom (하단) + 스크롤 콘텐츠 (1열 card-default 스택)
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
  accordion-item 목차 or Tablist 콘텐츠
```

### 인증 페이지 (`ex-auth-page`)

```
배경: var(--color-surface-alt)
중앙 card-default (max-width 400px)

  브랜드 로고 (중앙 정렬)
  title-md (로그인 / 회원가입)
  input-default (이메일)
  input-default (비밀번호)  [reveal=true 옵션 활용]
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

Dialog 컴포넌트 사용 시: <Dialog isOpen title subTitle content closeOnOutSide />
```

### 토스트 알림 (`ex-toast`)

```
position: fixed  하단 중앙  z-index=400
snackbar-default (min-width=280px  max-width=480px)

  body-md (white) + 선택적 action button-ghost(white) 우측
  자동 닫힘: 3–5초
  animation: slide-up 200ms ease-out 진입 · fade-out 150ms ease-out 퇴장

// 반드시 useToast hook 사용
import { useToast } from '@ktds-ui/context/ToastContext';
const toast = useToast();
toast({ message: '알림 내용' });
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

---

## Typography Components

```ts
import { Heading, Text, TextList, Link, Mark } from '@ktds-ui/components';
```

### Heading

제목 계층 표현. h1–h6 태그는 페이지 내에서 순차적으로 사용한다. 순서 무관 강조만 필요하면 `as="strong"`.

```tsx
import { Heading } from '@ktds-ui/components';

<Heading as="h1" size="display1">Display1</Heading>
<Heading as="h2" size="heading1">Heading1</Heading>
<Heading as="h3" size="title1">Title1</Heading>
```

| prop | type | default | values |
|------|------|---------|--------|
| `as` | string | `'strong'` | h1 h2 h3 h4 h5 h6 strong |
| `size` | string | `'heading1'` | display1 display2 heading1 heading2 heading3 title1 title2 title3 body1 |
| `weight` | string | `'bold'` | bold semibold medium regular |
| `children` | node | — | (required) |
| `className` | string | — | — |

**사이즈 프리뷰:**

| size | 해당 토큰 |
|------|----------|
| display1 / display2 | display-lg 계열 (32px+) |
| heading1 / heading2 / heading3 | headline-lg 계열 (24px) |
| title1 / title2 / title3 | title-lg / title-md 계열 (18–20px) |
| body1 | body-lg (16px) |

---

### Text

본문 텍스트 표현. p, span, strong, label 태그로 렌더링된다.

```tsx
import { Text } from '@ktds-ui/components';

<Text as="p" size="body1">본문 내용</Text>
<Text as="span" size="caption1" accent="neutral">보조 텍스트</Text>
<Text as="p" size="body2" ellipsis={2}>두 줄 말줄임</Text>
```

| prop | type | default | values |
|------|------|---------|--------|
| `as` | string | `'p'` | p span strong label |
| `size` | string | — | body1 body2 body3 label1 label2 caption1 caption2 |
| `weight` | string | — | bold semibold medium regular |
| `accent` | string | — | neutral alternative |
| `ellipsis` | number | — | 줄 수 (말줄임 라인 수) |
| `children` | node | — | (required) |
| `className` | string | — | — |

**size → 토큰 매핑:**

| size | 대응 |
|------|------|
| body1 | body-lg (16px/400) |
| body2 | body-md (14px/400) |
| body3 | (소형 본문) |
| label1 | label-lg (14px/600) |
| label2 | (소형 라벨) |
| caption1 | caption-lg (12px/400) |
| caption2 | caption-sm (11px/400) |

---

### TextList

안내사항·주의사항 등 본문 하단 보조 텍스트 목록. 최대 3-depth 중첩.

```tsx
import { TextList } from '@ktds-ui/components';

<TextList variant="disc">
  <li>항목 내용이 노출됩니다.</li>
  <li>항목 내용이 노출됩니다.</li>
</TextList>

// 중첩 예시
<TextList variant="decimal">
  <li>첫 번째 항목
    <TextList variant="dash">
      <li>하위 항목</li>
    </TextList>
  </li>
</TextList>
```

| prop | type | default | values |
|------|------|---------|--------|
| `variant` | string | — | disc dash asterisk caution decimal decimalCircle hangul hangulCircle alpha alphaCircle |
| `children` | node | — | `<li>` 또는 `Text` 컴포넌트만 허용 |
| `className` | string | — | — |

- `bold` 처리는 남용 금지 — 전반적 강조는 가독성을 해침
- Box 컴포넌트와 결합하여 배경 구획 안에 배치 가능
- 타이틀이 필요하면 `Heading` 컴포넌트와 조합

---

### Link

내/외부 페이지 이동. CSR은 `to`, SSR/외부는 `href`. `http://`로 시작하면 자동으로 `target="_blank" title="새창열림"` 추가.

```tsx
import { Link } from '@ktds-ui/components';

// CSR
<Link to="/page">클라이언트 링크</Link>

// SSR / 외부
<Link href="https://example.com">외부 링크</Link>

// 아이콘 조합
<Link to="/page" prefixIcon="link" accent="primary" underline="hover">링크 텍스트</Link>

// 블록 링크 (block 사용 시 role 필수)
<Link href="..." role="button">블록 링크</Link>
```

| prop | type | default | values |
|------|------|---------|--------|
| `to` | string | — | CSR 내부 경로 |
| `href` | string | — | SSR/외부 URL |
| `children` | node | — | (required) |
| `accent` | string | — | primary positive negative caution info |
| `size` | string | — | body1 body2 body3 label1 label2 caption1 caption2 |
| `weight` | string | — | bold medium regular |
| `underline` | string | — | hover always |
| `prefixIcon` | string | — | 아이콘 name (Design Tokens/Icon 참조) |
| `suffixIcon` | string | — | 아이콘 name |
| `onClick` | func | — | — |
| `className` | string | — | — |

---

### Mark

문장·단락 내 인라인 강조 표현.

```tsx
import { Mark } from '@ktds-ui/components';

// 굵기 강조 (기본)
<Mark variant="bold">강조 텍스트</Mark>

// 배경색 강조
<Mark variant="fill" accent="primary">배경 강조</Mark>
<Mark variant="fill" accent="negative">오류 강조</Mark>
```

| prop | type | default | values |
|------|------|---------|--------|
| `variant` | string | `'bold'` | bold fill |
| `accent` | string | — | primary positive negative caution info |
| `children` | node | — | (required) |
| `className` | string | — | — |

---

## Alert Dialog (useAlert)

Alert: 경고 안내만 표시 (닫기만 가능). Confirm: 사용자 선택이 필요한 중요 이벤트.

```tsx
import { useAlert } from '@ktds-ui/context/AlertContext';

function MyComponent() {
  const { alert, confirm } = useAlert();

  // Alert — 닫기만 가능
  const handleAlert = async () => {
    await alert({
      title: '알림',
      message: '처리가 완료되었습니다.',
    });
  };

  // Confirm — 확인/취소 선택
  const handleConfirm = async () => {
    const confirmed = await confirm({
      title: '삭제 확인',
      message: '정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    });
    if (confirmed) {
      // 확인 처리
    }
  };
}
```

| 구분 | 설명 |
|------|------|
| Alert | 경고/안내 문구 + 확인 버튼 1개 (닫기만) |
| Confirm | 중요 이벤트 + 취소·확인 버튼 2개 (사용자 선택) |

- Dialog 컴포넌트 기반 모달로 표시 (z-index: 300)
- **`useAlert`는 `@ktds-ui/context/AlertContext`에서 import** (Toast와 동일한 패턴)
- `await alert()` / `await confirm()`은 Promise를 반환 — `confirm()`은 boolean 반환

---

## Button FAB (Floating Action Button)

화면 모든 콘텐츠 위에 배치되는 주요 액션 버튼. 항상 `r={rounded.full}` (pill 형태).

```tsx
import { Fab } from '@ktds-ui/components';

// 기본형 (아이콘 + 레이블)
<Fab icon="plus" label="추가" onClick={handleClick} />

// 아이콘만 (접근성: label 필수)
<Fab iconOnly="plus" label="메뉴 열기" onClick={handleOpen} />

// 확장/축소형 (여러 옵션)
<Fab
  icon="plus"
  label="메뉴"
  show={true}
  options={[
    { icon: 'edit', label: '편집', onClick: handleEdit },
    { icon: 'delete', label: '삭제', onClick: handleDelete },
  ]}
/>
```

| prop | type | default | description |
|------|------|---------|-------------|
| `icon` | string | — | 아이콘 name (펼침 상태 아이콘) |
| `iconOnly` | string | — | 아이콘 단독 (레이블 숨김) |
| `label` | string | — | (required) FAB 레이블 / 접근성 텍스트 |
| `onClick` | func | — | 클릭 핸들러 |
| `options` | array | `[]` | 확장형 옵션 `[{ icon, iconOnly, label, onClick }]` |
| `show` | bool | `true` | FAB 표시 여부 (스크롤 등 동적 제어) |

```
FAB 배치 규칙:
- 고정 위치: position=fixed  bottom=24px  right=24px
- z-index: 200 (dropdown과 동일, modal보다 낮음)
- shadow: --dsx-shadow-2 (0px 3px 4px rgba(0,0,0,0.16))
- 크기: 56px × 56px (아이콘만) / 자동 너비 (레이블 포함)
- TOP 버튼: show prop으로 스크롤 위치에 따라 동적 표시
```

---

## Button Layout — ButtonArea & Stack

버튼 2개 이상 나열 또는 페이지 최하단 배치 시 사용.

```tsx
import { Button, ButtonArea, Stack } from '@ktds-ui/components';

// Stack — 콘텐츠 내 버튼 나열
<Stack direction="horizontal" gap={8}>
  <Button variant="outline">취소</Button>
  <Button variant="primary">확인</Button>
</Stack>

<Stack direction="vertical" gap={8}>
  <Button variant="primary" size="large">주요 액션</Button>
  <Button variant="outline" size="large">보조 액션</Button>
</Stack>

// ButtonArea — 페이지 최하단 버튼 영역 (margin-top 자동 포함)
<ButtonArea align="center">
  <Button variant="outline" size="large">취소</Button>
  <Button variant="primary" size="large">제출</Button>
</ButtonArea>

<ButtonArea align="right">
  <Button variant="ghost">건너뛰기</Button>
  <Button variant="primary">다음</Button>
</ButtonArea>
```

- **Stack**: 콘텐츠 또는 다른 컴포넌트와 조합 시
- **ButtonArea**: 페이지·폼 최하단 버튼 전용 (`margin-top` 자동 설정됨)
- 최하단 버튼은 `size="large"`, 100% 너비 또는 우측 정렬

---

## Icon / IconButton

### Icon

SVG 아이콘을 CSS 변수로 관리. `--dsx-icon-*` 변수로 등록되어 있으며 `<Icon name="...">` 으로 사용.

```tsx
import { Icon } from '@ktds-ui/components';

<Icon name="chevron" />
<Icon name="close" />
<Icon name="search" />
```

**주요 아이콘 name 목록:**

| 카테고리 | name 목록 |
|----------|-----------|
| 방향 | chevron chevronLeft chevronTop chevronBottom chevronFirst chevronLast prev next arrow |
| 동작 | close closeLarge closeFill plus plusFill edit delete refresh share copy download |
| 상태 | check checked indeterminate info infoFill warning danger note tip successFill errorFill |
| UI | search calendar sort expand moreHorizon moreVertical loading |
| 콘텐츠 | star starFill heart bookmark bookmarkFill link folder eye eyeFill eyeSlash eyeSlashFill |
| 기타 | homeFill smileFill pictureFill nodata return clock empty |

- **Icon 자체를 버튼으로 사용 금지** — 버튼으로 사용 시 `IconButton` 컴포넌트 사용
- `--dsx-icon-size` CSS 변수로 아이콘 크기 제어

---

### IconButton

특정 컨트롤 요소를 아이콘으로 표현할 때 사용. `children`은 접근성을 위해 필수.

```tsx
import { IconButton } from '@ktds-ui/components';

<IconButton name="close" size="medium">닫기</IconButton>
<IconButton name="search" size="small">검색</IconButton>
<IconButton name="moreVertical" size="large">더보기</IconButton>
```

| prop | type | default | values |
|------|------|---------|--------|
| `name` | string | — | (required) 아이콘 name |
| `children` | node | — | (required) 접근성 텍스트 (시각적으로 숨겨짐) |
| `size` | string | — | small medium large (미설정 시 부모 상속) |
| `className` | string | — | — |

---

## 완전한 DSX 토큰 레퍼런스

### Color Tokens — 시맨틱 (--dsx-color-*)

#### Primary

| Token | Value |
|-------|-------|
| `--dsx-color-primary-border-default` | `#1a75ff` |
| `--dsx-color-primary-border-neutral` | `#69a5ff` |
| `--dsx-color-primary-fill-default` | `#1a75ff` |
| `--dsx-color-primary-fill-neutral` | `#e8f1ff` |
| `--dsx-color-primary-icon-default` | `#1a75ff` |
| `--dsx-color-primary-icon-neutral` | `#3385ff` |
| `--dsx-color-primary-text-default` | `#186ae8` |
| `--dsx-color-primary-text-neutral` | `#3385ff` |
| `--dsx-color-primary-surface-default` | `#ffffff` |
| `--dsx-color-primary-surface-neutral` | `#e8f1ff` |

#### Neutral

| Token | Value |
|-------|-------|
| `--dsx-color-neutral-border-default` | `#c5c6c9` |
| `--dsx-color-neutral-border-alternative` | `#70737c29` |
| `--dsx-color-neutral-fill-default` | `#d0d1d4` |
| `--dsx-color-neutral-fill-neutral` | `#e9eaeb` |
| `--dsx-color-neutral-icon-default` | `#171719` |
| `--dsx-color-neutral-icon-neutral` | `#2e2f33e0` |
| `--dsx-color-neutral-surface-alternative` | `#f7f7f8` |
| `--dsx-color-neutral-surface-default` | `#ffffff` |
| `--dsx-color-neutral-text-alternative` | `#37383c9c` |
| `--dsx-color-neutral-text-assistive` | `#37383c47` |
| `--dsx-color-neutral-text-default` | `#171719` |
| `--dsx-color-neutral-text-neutral` | `#2e2f33e0` |
| `--dsx-color-neutral-text-strong` | `#000000` |

#### Interaction / Disabled / Inactive

| Token | Value |
|-------|-------|
| `--dsx-color-interaction-border-disabled` | `#dbdcdf` |
| `--dsx-color-interaction-border-inactive` | `#c2c4c8` |
| `--dsx-color-interaction-dimmer` | `#17171985` |
| `--dsx-color-interaction-fill-disabled` | `#70737c1f` |
| `--dsx-color-interaction-fill-inactive` | `#70737c38` |
| `--dsx-color-interaction-surface-disabled` | `#f4f4f5` |
| `--dsx-color-interaction-surface-inactive` | `#eaebec` |
| `--dsx-color-interaction-text-disabled` | `#37383c59` |
| `--dsx-color-interaction-text-inactive` | `#989ba2` |

#### Inverse

| Token | Value |
|-------|-------|
| `--dsx-color-inverse-surface` | `#1b1c1e` |
| `--dsx-color-inverse-fill` | `#70737c38` |
| `--dsx-color-inverse-icon` | `#f7f7f8` |
| `--dsx-color-inverse-text` | `#f7f7f8` |

#### Status Colors

| Token | positive | info | caution | negative |
|-------|----------|------|---------|----------|
| `-border-default` | `#00bf40` | `#0066ff` | `#ff9200` | `#ff4242` |
| `-fill-default` | `#00bf40` | `#0066ff` | `#ff9200` | `#ff4242` |
| `-fill-neutral` | `#d9ffe6` | `#eaf2fe` | `#fef4e6` | `#feecec` |
| `-text-default` | `#009632` | `#0054d1` | `#d47800` | `#e52222` |
| `-icon-default` | `#00bf40` | `#0066ff` | `#ff9200` | `#ff4242` |

### Font Tokens (--dsx-font-*)

#### Font Family

| Token | Value |
|-------|-------|
| `--dsx-font-family-base` | `Pretendard, -apple-system, BlinkMacSystemFont, Roboto, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, arial, sans-serif` |
| `--dsx-font-family-heading` | (동일) |
| `--dsx-font-family-code` | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace` |

#### Font Size

| Token | Value |
|-------|-------|
| `--dsx-font-size-small` | `.75rem` (12px) |
| `--dsx-font-size-base` | `.875rem` (14px) |
| `--dsx-font-size-large` | `1rem` (16px) |

> **rem 사용 필수**: 접근성을 위해 `px` 대신 `rem` 사용. Sass 함수 `rem(14px)` 활용.
> ```scss
> @use '@ktds-ui/styles/config/index.scss' as *;
> .element { font-size: rem(14px); }
> ```

#### Font Weight

| Token | Value |
|-------|-------|
| `--dsx-font-weight-light` | `300` |
| `--dsx-font-weight-regular` | `400` |
| `--dsx-font-weight-medium` | `500` |
| `--dsx-font-weight-semibold` | `600` |
| `--dsx-font-weight-bold` | `700` |

#### Line Height / Letter Spacing

| Token | Value |
|-------|-------|
| `--dsx-line-height-base` | `1.5` |
| `--dsx-line-height-heading` | `1.3` |
| `--dsx-line-height-reading` | `1.6` |
| `--dsx-line-height-fit` | `1` |
| `--dsx-letter-spacing-base` | `-.005em` |
| `--dsx-letter-spacing-display` | `-.03em` |
| `--dsx-letter-spacing-heading` | `-.015em` |

### Spacing Tokens (--dsx-space-* / --dsx-scale-*)

#### Space (margin · padding · gap용)

| Token | Value |
|-------|-------|
| `--dsx-space-1` | `2px` |
| `--dsx-space-2` | `4px` |
| `--dsx-space-3` | `8px` |
| `--dsx-space-4` | `12px` |
| `--dsx-space-5` | `16px` |
| `--dsx-space-6` | `20px` |
| `--dsx-space-7` | `24px` |
| `--dsx-space-8` | `28px` |
| `--dsx-space-9` | `32px` |
| `--dsx-space-10` | `40px` |
| `--dsx-space-11` | `48px` |
| `--dsx-space-12` | `56px` |
| `--dsx-space-13` | `64px` |
| `--dsx-space-14` | `72px` |
| `--dsx-space-15` | `80px` |

#### Scale (width · height용)

| Token | rem | px |
|-------|-----|-----|
| `--dsx-scale-1` | `.75rem` | `12px` |
| `--dsx-scale-2` | `1rem` | `16px` |
| `--dsx-scale-3` | `1.25rem` | `20px` |
| `--dsx-scale-4` | `1.5rem` | `24px` |
| `--dsx-scale-5` | `2rem` | `32px` |
| `--dsx-scale-6` | `2.5rem` | `40px` |
| `--dsx-scale-7` | `3rem` | `48px` |
| `--dsx-scale-8` | `3.5rem` | `56px` |
| `--dsx-scale-9` | `4rem` | `64px` |
| `--dsx-scale-10` | `4.5rem` | `72px` |

> 표에 없는 크기: `calc(var(--dsx-scale-6) * 1.1)` 처럼 비율 계산 또는 `rem(44px)` Sass 함수 사용

### Border Tokens (--dsx-stroke-* / --dsx-radius-*)

| Token | Value |
|-------|-------|
| `--dsx-stroke-base` | `1px` |
| `--dsx-stroke-thick` | `2px` |
| `--dsx-radius-none` | `0px` |
| `--dsx-radius-small` | `2px` |
| `--dsx-radius-base` | `4px` |
| `--dsx-radius-large` | `6px` |
| `--dsx-radius-xlarge` | `8px` (buttons/inputs 기본) |
| `--dsx-radius-max` | `1000px` (pill/full) |

> `--dsx-radius-xlarge` 이상은 `calc(var(--dsx-radius-base) * 3)` 처럼 배수 계산 사용

### Shadow Tokens (--dsx-shadow-*)

| Token | Value |
|-------|-------|
| `--dsx-shadow-1` | `0px 1px 3px rgba(0,0,0,.16)` |
| `--dsx-shadow-2` | `0px 3px 4px rgba(0,0,0,.16)` |
| `--dsx-shadow-3` | `0px 8px 20px rgba(0,0,0,.1)` |
| `--dsx-shadow-4` | `0px 18px 28px rgba(0,0,0,.08)` |
| `--dsx-shadow-5` | `4px 16px 40px rgba(0,0,0,.1)` |
| `--dsx-shadow-6` | `6px 32px 48px rgba(0,0,0,.1)` |

### Transition Tokens (--dsx-transition-*)

| Token | Value | 사용처 |
|-------|-------|--------|
| `--dsx-transition-base` | `.2s ease-in-out` | :hover, :active 상태 전환 |
| `--dsx-transition-fade` | `.2s linear` | overlay fade in/out |
| `--dsx-transition-collapse` | `.25s ease-out` | 확장/축소 (Accordion, Drawer) |
| `--dsx-transition-popover` | `.16s cubic-bezier(.16, 1, .3, 1)` | slide 팝오버 (Dropdown, Tooltip) |
