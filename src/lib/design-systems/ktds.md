---
version: alpha
name: KTDS Design System
description: "KT DS 엔터프라이즈 UI 시스템 — Clarity(명확성) · Trust(신뢰감) · Efficiency(효율성)를 핵심 철학으로 한다. 최종 기준은 DSCore Storybook(https://dscore-ui.ktds.co.kr/)에 게시된 stable Docs이다. 화이트 서피스(#ffffff)와 쿨 뉴트럴 구조 위에 Primary Blue(#1a75ff)를 유일한 인터랙션 강조색으로 사용한다. 일반 Button은 8px 라운드 사각형이며 pill/capsule 버튼은 금지한다. 단, Badge·Chip·Avatar·FAB처럼 의미상 원형/캡슐형인 컴포넌트는 rounded.full 예외를 허용한다. 입력 필드는 default 32px·small 24px·large 40px, 카드는 B2B/B2C 구분 없이 shadow-only(B2C 스타일)로 통일한다. 페이지 배경은 반드시 primary-fill-neutral(#F2F5F9), 카드/컴포넌트 배경은 surface(#ffffff). Pretendard 폰트. 모바일=하단 탭 바(NavBottom), 태블릿=상단 NavTop, 데스크탑=서비스 성격에 따라 Header/GNB 또는 NavSide(업무형 240px)를 선택한다. 패키지: @ktds-ui/components (일반 컴포넌트), @ktds-ui/layout (레이아웃 컴포넌트: SideNavigation·Header·Footer·Content·ContentTitle·SplitLayout), Toast는 @ktds-ui/context/ToastContext. Carousel은 swiper 별도 설치, Chart는 chart.js 별도 설치."

colors:
  # Brand Primary
  primary:              "#1a75ff"
  primary-text:         "#186ae8"
  primary-text-neutral: "#4891ff"
  primary-fill:         "#1a75ff"
  primary-fill-neutral: "#F2F5F9"
  primary-border:       "#1a75ff"
  primary-border-neutral: "#66a3ff"
  primary-icon:         "#1a75ff"
  primary-icon-neutral: "#4891ff"
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

# 페이지·섹션·카드 레이아웃 리듬 — 모든 화면에서 일관된 간격 기준
layout:
  page-padding:       16px   # 좌우 페이지 여백 (모바일 기준)
  page-padding-web:   24px   # 좌우 페이지 여백 (태블릿/웹)
  section-gap:        24px   # 섹션 간 수직 간격
  card-padding:       16px   # 카드 내부 패딩
  card-gap:           12px   # 카드 내부 아이템 간 간격
  item-gap:           8px    # 인라인·행 내부 요소 간격
  header-height:      56px   # 앱바/헤더 높이
  tabbar-height:      72px   # 하단 탭바 높이

shadows:
  1: "0px 1px 3px rgba(0,0,0,0.16)"    # --dsx-shadow-1 · Card subtle
  b2c-card: "0px 5px 10px rgba(0,0,0,0.05)"  # --dsx-shadow-b2c-card · B2C Card
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
  button-normal:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
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
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 32px
    border: "1px solid {colors.border}"
  input-large:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 40px
    border: "1px solid {colors.border}"
  input-small:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.md}"
    height: 24px
    border: "1px solid {colors.border}"
  input-focused:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 32px
    border: "1px solid {colors.primary-border}"
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 32px
    border: "1px solid {colors.negative}"
  input-disabled:
    backgroundColor: "{colors.surface-disabled}"
    textColor: "{colors.text-disabled}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 32px
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
  card-b2b:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
    border: "none"
    shadow: "{shadows.b2c-card}"
  card-b2c:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
    border: "none"
    shadow: "{shadows.b2c-card}"
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
  badge-filled-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-filled-positive:
    backgroundColor: "{colors.positive}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-filled-negative:
    backgroundColor: "{colors.negative}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-tint-primary:
    backgroundColor: "{colors.primary-fill-neutral}"
    textColor: "{colors.primary-text}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-outlined-primary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    border: "1px solid {colors.primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-ghost-primary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-ring:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    border: "2px solid {colors.surface}"
    note: "Avatar 우측 상단 위치 전용 (position prop 사용)"
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
  loading-default:
    defaultSize: "3"
    sizes: ["1","2","3","4","5"]
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
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 32px
    border: "1px solid {colors.border}"
  select-large:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 40px
    border: "1px solid {colors.border}"
  select-small:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.md}"
    height: 24px
    border: "1px solid {colors.border}"
  select-filled:
    backgroundColor: "{colors.fill-alt}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 32px
    border: "none"
  select-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: 32px
    border: "none"
  select-focused:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 32px
    border: "1px solid {colors.primary-border}"
  slider-default:
    trackColor: "{colors.fill-neutral}"
    fillColor: "{colors.primary}"
    handleColor: "{colors.primary}"
    handleSize: 20px
    trackHeight: 4px
  datepicker-default:
    format: "YYYY-MM-DD"
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
  avatar-size-1:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.caption-sm}"
    rounded: "{rounded.full}"
    width: 20px
    height: 20px
  avatar-size-2:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.caption-sm}"
    rounded: "{rounded.full}"
    width: 24px
    height: 24px
  avatar-size-3:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    width: 28px
    height: 28px
  avatar-size-4:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.caption-lg}"
    rounded: "{rounded.full}"
    width: 32px
    height: 32px
  avatar-size-5:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    width: 36px
    height: 36px
  avatar-size-6:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    width: 40px
    height: 40px
  avatar-size-7:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.full}"
    width: 48px
    height: 48px
  avatar-size-8:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.title-md}"
    rounded: "{rounded.full}"
    width: 56px
    height: 56px
  avatar-size-9:
    backgroundColor: "{colors.fill-neutral}"
    textColor: "{colors.text-neutral}"
    typography: "{typography.headline-lg}"
    rounded: "{rounded.full}"
    width: 72px
    height: 72px
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
    requiresPackage: "chart.js/auto"
    supportedTypes: ["line","bar","doughnut","pie"]
    colorPalette: ["#69A5FF","#FF8C8C","#FFC06E","#88F03E","#9E86FC"]
  ex-list-page:
    description: "목록 페이지 — 섹션 헤더 + 필터 칩 행 + 카드 그리드 + 페이지네이션. 배경 surface-alt."
    background: "{colors.primary-fill-neutral}"
    header: "section-header-default"
    filter: "chip-default 그룹 + search-bar-default"
    content: "card-default 그리드 (모바일 1열 / 태블릿 2열 / 데스크탑 3–4열  gap={spacing.base}~{spacing.md})"
    footer: "pagination-item 중앙 정렬"
  ex-form-page:
    description: "폼 페이지 — 중앙 카드에 레이블+인풋 스택 + 제출 버튼. 최대 너비 480px, 모바일 전체폭."
    background: "{colors.primary-fill-neutral}"
    container: "card-default  max-width=480px"
    title: "{typography.title-md}"
    fields: "레이블(body-md/{colors.text-neutral}) + input-default 스택  gap={spacing.md}"
    actions: "button-primary 100% 너비 + button-ghost 취소(선택)"
  ex-dashboard:
    description: "대시보드 — 데스크탑 NavSide 240px + 스탯 카드 행 + 차트 + 목록/사이드. 모바일 NavBottom 하단."
    background: "{colors.primary-fill-neutral}"
    desktop-nav: "NavSide 240px 좌측 고정"
    stats: "card-default 행 2–4열  gap={spacing.md}"
    chart: "card-default 전체 너비 or 2/3"
    list: "card-default 2/3 + 사이드 card-default 1/3"
    mobile-nav: "nav-bottom-default 하단"
  ex-detail-page:
    description: "상세 페이지 — 브레드크럼 + 히어로 카드(전체폭) + 탭/아코디언 콘텐츠. 데스크탑 2/3+1/3 사이드."
    background: "{colors.primary-fill-neutral}"
    breadcrumb: "breadcrumb-item"
    hero: "card-default 전체 너비  {typography.headline-lg} + tag-default/badge-* + {typography.body-lg} + button-primary + button-outline"
    content: "accordion-item 목차 or tab-bar 콘텐츠  (데스크탑: 2/3 본문 + 1/3 사이드)"
  ex-auth-page:
    description: "인증 페이지 — 중앙 카드에 로고 + 인풋 2개 + 버튼. 최대 너비 400px."
    background: "{colors.primary-fill-neutral}"
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

responsive:
  breakpoints:
    mobile: "< 480px"
    mobile-large: "480–767px"
    tablet: "768–1023px"
    desktop: "≥ 1024px"
  navigation:
    mobile: ".nav-bottom (하단 탭바, position:fixed, bottom:0, left:0, right:0)"
    tablet: ".nav-top (상단 내비, position:fixed, top:0, left:0, right:0, height:56px)"
    desktop: ".nav-side (좌측 레일, position:fixed, left:0, top:0, width:240px, height:100vh)"
  padding:
    mobile: "16px"
    tablet: "24px"
    desktop: "40px"
  grid:
    mobile: "1열"
    mobile-large: "2열"
    tablet: "3열, card gap:20px"
    desktop: "4열, card gap:20px, max-width:1280px, main-content margin-left:240px"
---

## Overview

Clarity(명확성) · Trust(신뢰감) · Efficiency(효율성)를 핵심 철학으로 삼는 엔터프라이즈 UI. Primary Blue(`#1a75ff`)를 유일한 인터랙션 강조색으로 사용한다. 화이트 서피스와 중립 구조가 기본 레이아웃 정체성이며, 색상은 반드시 Semantic 레이어를 통해 참조한다.

- **브랜드**: KT DS (케이티 디에스)
- **브랜드 컬러**: `#1a75ff` (Primary)
- **모드**: Light / Dark 완전 지원

---

## Source of Truth

이 문서는 **DSCore Storybook 최종 문서**를 기준으로 유지한다.

- 기준 URL: `https://dscore-ui.ktds.co.kr/`
- 확인일: 2026-06-02
- 기준 문서: Storybook `index.json`의 `type: docs` 항목과 각 `iframe.html?viewMode=docs&id=...` 문서
- 컴포넌트 상태: Storybook에 stable Docs로 노출된 항목은 사용 가능 컴포넌트로 본다. 로컬 소스 확인 여부보다 Storybook 문서를 우선한다.
- 단, B2B/B2C 카드 표면 정책처럼 서비스 적용을 위해 추가한 규칙은 **KTDS 적용 프로필 확장 규칙**으로 별도 표기한다.

### Storybook Docs Inventory

#### Foundations

`Colors`, `Typography`, `Iconography`, `Layout`, `Interaction`, `Object Style`

#### Design Tokens

`Color`, `Font`, `Icon`, `Spacing`, `Border`, `Shadow`, `Transition`

#### UX Guideline

`적용 범위`, `적용 지침`, `서식 및 레이블 규칙`, `접근성`

#### UX Principle for AI

`AI Ethics`, `Transparency`, `Fairness`, `Accountability`, `Safety`, `Privacy`, `Reliability`

#### Typography

`Heading`, `Text`, `Text List`, `Link`, `Mark`

#### Components

`Overview`, `Accordion`, `Admonition`, `Alert Dialog`, `Anchor`, `Avatar`, `Badge`, `Bottom Sheet`, `Breadcrumb`, `Button`, `Button: FAB`, `Card`, `Carousel`, `Chart`, `Checkbox`, `Chip`, `Date Picker`, `Dialog`, `Drawer`, `Dropdown Menu`, `Editor`, `Empty`, `FileUploader`, `Input`, `List`, `Loading`, `Navigation: Bottom`, `Navigation: Side`, `Navigation: Top`, `Pagination`, `Radio`, `Rate`, `Select`, `Slider`, `Stepper`, `Switch`, `Tab: Menu Tab`, `TabList`, `Table`, `Tag`, `Textarea`, `Toast`, `Tooltip`, `Tree Menu`

#### High-Impact Story Variants

생성 결과에서 자주 필요한 공식 Storybook variant는 아래를 우선 반영한다.

- Button: `With Icon`, `Button Stack`, `Button Stack Vertical`, `Alignment`, `Alignment Vertical`
- Input: `Input Clear`, `Input Reveal`, `With Slot`
- Card: `Example 1`-`Example 4` 카드 레이아웃 패턴
- Bottom Sheet: `Default`, `With Controls`
- Navigation Bottom: `With Badge`
- Table: `With Checkbox Selection`, `With Radio Selection`, `With Height`
- Date Picker: `Date Range`, `With Min And Max Date`
- Chart: `Line Chart`, `Bar Chart`, `Doughnut Chart`, `Pie Chart`, `Mix Chart`
- Toast: `Primary Variant`, `With Icon`, `Long Message`
- Empty: `Empty Text`, `Empty Icon Text`, `Empty Data`
- FileUploader: `Button File Uploader`, `Max Files And Size`, `With Error Message`, `With Default Files`

---

## Package Imports

모든 일반 컴포넌트는 `@ktds-ui/components`에서 import한다. Toast·Alert Dialog만 context 패키지를 사용한다.

```ts
// Storybook stable Docs 기준 컴포넌트 + 관련 헬퍼(ButtonArea, Stack, FormItem 등)
import {
  Accordion,
  Admonition,
  Anchor,
  Avatar,
  Badge,
  BottomSheet,
  Breadcrumb,
  Button, ButtonArea, Stack,
  Card,
  Carousel,
  Chart,
  Checkbox, CheckboxGroup,
  Chip,
  DatePicker,
  Dialog,
  Drawer,
  DropdownMenu,
  Editor,
  Empty,
  Fab,
  FileUploader,
  Form, FormItem,
  Heading, Text, Link, Mark,
  Icon, IconButton,
  Input,
  List,
  Loading,
  NavBottom, NavSide, NavTop,
  Pagination,
  Radio, RadioGroup,
  Rate,
  Select,
  Slider,
  Stepper,
  Switch,
  Tablist, MenuTab,
  Table,
  Tag,
  Textarea,
  Tooltip,
  TreeMenu,
} from '@ktds-ui/components';

// Toast — 별도 context 패키지
import { useToast } from '@ktds-ui/context/ToastContext';

// Alert Dialog — 별도 context 패키지
import { useAlert } from '@ktds-ui/context/AlertContext';

// 레이아웃 컴포넌트
import {
  SideNavigation,
  Header,
  Footer,
  Content,
  ContentTitle,
  SplitLayout,
} from '@ktds-ui/layout';
```

**외부 패키지 추가 설치 필요:**
```bash
npm install swiper    # Carousel 사용 시
npm install chart.js  # Chart 사용 시
```

**Bottom Sheet 사용:** Storybook stable Docs 기준 `BottomSheet` 컴포넌트를 우선 사용한다. `Drawer placement="bottom"`은 `BottomSheet`를 사용할 수 없는 프로젝트 fallback으로만 사용한다.

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
| /99  | `#F2F5F9` |

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

### 핵심 Semantic Tokens — Light

#### Primary
| 역할 | CSS Variable | Value |
|------|-------------|-------|
| Primary/Text/default | `--color-primary-text` | `#186ae8` |
| Primary/Text/neutral | `--color-primary-text-neutral` | `#4891ff` |
| Primary/Fill/default | `--color-primary-fill` | `#1a75ff` |
| Primary/Fill/neutral (BG) | `--color-primary-fill-neutral` | `#F2F5F9` |
| Primary/Border/default | `--color-primary-border` | `#1a75ff` |
| Primary/Border/neutral | `--color-primary-border-neutral` | `#66a3ff` |
| Primary/Icon/default | `--color-primary-icon` | `#1a75ff` |
| Primary/Icon/neutral | `--color-primary-icon-neutral` | `#4891ff` |

#### Neutral
| 역할 | CSS Variable | Value |
|------|-------------|-------|
| Neutral/Text/default | `--color-text` | `#171719` |
| Neutral/Text/neutral | `--color-text-neutral` | `rgba(46,47,51,0.88)` |
| Neutral/Text/alternative | `--color-text-alt` | `rgba(55,56,60,0.61)` |
| Neutral/Text/assistive | `--color-text-assistive` | `rgba(55,56,60,0.28)` |
| Neutral/Text/strong | `--color-text-strong` | `#000000` |
| Neutral/Surface/default | `--color-surface` | `#ffffff` |
| Neutral/Surface/alternative | `--color-surface-alt` | `#f7f7f8` |
| Neutral/Border/default | `--color-border` | `rgba(112,115,124,0.35)` |
| Neutral/Border/neutral | `--color-border-neutral` | `rgba(112,115,124,0.28)` |
| Neutral/Border/alternative | `--color-border-alt` | `rgba(112,115,124,0.16)` |
| Neutral/Icon/default | `--color-icon` | `#171719` |
| Neutral/Icon/neutral | `--color-icon-neutral` | `rgba(46,47,51,0.88)` |
| Neutral/Fill/default | `--color-fill` | `rgba(112,115,124,0.22)` |
| Neutral/Fill/neutral | `--color-fill-neutral` | `rgba(112,115,124,0.12)` |
| Neutral/Fill/alternative | `--color-fill-alt` | `rgba(112,115,124,0.08)` |
| Neutral/Fill/strong | `--color-fill-strong` | `rgba(112,115,124,0.35)` |

#### Interaction
| 역할 | CSS Variable | Value |
|------|-------------|-------|
| Interaction/Text/inactive | `--color-text-inactive` | `#989ba2` |
| Interaction/Text/disabled | `--color-text-disabled` | `rgba(55,56,60,0.35)` |
| Interaction/Surface/inactive | `--color-surface-inactive` | `#eaebec` |
| Interaction/Surface/disabled | `--color-surface-disabled` | `#f4f4f5` |
| Interaction/Border/inactive | `--color-border-inactive` | `#e1e2e4` |
| Interaction/Border/disabled | `--color-border-disabled` | `#eaebec` |
| Interaction/Fill/inactive | `--color-fill-inactive` | `rgba(112,115,124,0.22)` |
| Interaction/Fill/disabled | `--color-fill-disabled` | `rgba(112,115,124,0.12)` |
| Interaction/Dimmer/dimmer | `--color-dimmer` | `rgba(23,23,25,0.52)` |

#### Inverse
| 역할 | CSS Variable | Value |
|------|-------------|-------|
| Inverse/text-inverse | `--color-inverse-text` | `#f7f7f8` |
| Inverse/Surface-inverse | `--color-inverse-surface` | `#1b1c1e` |
| Inverse/fill-inverse | `--color-inverse-fill` | `rgba(112,115,124,0.22)` |
| Inverse/icon-inverse | `--color-inverse-icon` | `#f7f7f8` |

### 핵심 Semantic Tokens — Dark

#### Primary
| 역할 | CSS Variable | Value |
|------|-------------|-------|
| Primary/Text/default | `--color-primary-text` | `#1a75ff` |
| Primary/Text/neutral | `--color-primary-text-neutral` | `#1253b5` |
| Primary/Fill/default | `--color-primary-fill` | `#1253b5` |
| Primary/Fill/neutral (BG) | `--color-primary-fill-neutral` | `#02060e` |
| Primary/Border/default | `--color-primary-border` | `#4891ff` |
| Primary/Border/neutral | `--color-primary-border-neutral` | `#1253b5` |
| Primary/Icon/default | `--color-primary-icon` | `#1a75ff` |
| Primary/Icon/neutral | `--color-primary-icon-neutral` | `#1253b5` |

#### Neutral
| 역할 | CSS Variable | Value |
|------|-------------|-------|
| Neutral/Text/default | `--color-text` | `#f7f7f8` |
| Neutral/Text/neutral | `--color-text-neutral` | `rgba(194,196,200,0.88)` |
| Neutral/Text/alternative | `--color-text-alt` | `rgba(174,176,182,0.61)` |
| Neutral/Text/assistive | `--color-text-assistive` | `rgba(174,176,182,0.28)` |
| Neutral/Text/strong | `--color-text-strong` | `#ffffff` |
| Neutral/Surface/default | `--color-surface` | `#1b1c1e` |
| Neutral/Surface/alternative | `--color-surface-alt` | `#0f0f10` |
| Neutral/Border/default | `--color-border` | `rgba(112,115,124,0.52)` |
| Neutral/Border/neutral | `--color-border-neutral` | `rgba(112,115,124,0.43)` |
| Neutral/Border/alternative | `--color-border-alt` | `rgba(112,115,124,0.35)` |
| Neutral/Icon/default | `--color-icon` | `#f7f7f8` |
| Neutral/Icon/neutral | `--color-icon-neutral` | `rgba(194,196,200,0.88)` |
| Neutral/Fill/default | `--color-fill` | `rgba(112,115,124,0.35)` |
| Neutral/Fill/neutral | `--color-fill-neutral` | `rgba(112,115,124,0.16)` |
| Neutral/Fill/alternative | `--color-fill-alt` | `rgba(112,115,124,0.12)` |
| Neutral/Fill/strong | `--color-fill-strong` | `rgba(112,115,124,0.43)` |

#### Interaction
| 역할 | CSS Variable | Value |
|------|-------------|-------|
| Interaction/Text/inactive | `--color-text-inactive` | `#5a5c63` |
| Interaction/Text/disabled | `--color-text-disabled` | `rgba(152,155,162,0.35)` |
| Interaction/Surface/inactive | `--color-surface-inactive` | `#333438` |
| Interaction/Surface/disabled | `--color-surface-disabled` | `#2e2f33` |
| Interaction/Border/inactive | `--color-border-inactive` | `#37383c` |
| Interaction/Border/disabled | `--color-border-disabled` | `#333438` |
| Interaction/Fill/inactive | `--color-fill-inactive` | `rgba(112,115,124,0.22)` |
| Interaction/Fill/disabled | `--color-fill-disabled` | `rgba(112,115,124,0.12)` |
| Interaction/Dimmer/dimmer | `--color-dimmer` | `rgba(23,23,25,0.74)` |

#### Inverse
| 역할 | CSS Variable | Value |
|------|-------------|-------|
| Inverse/text-inverse | `--color-inverse-text` | `#171719` |
| Inverse/Surface-inverse | `--color-inverse-surface` | `#f7f7f8` |
| Inverse/fill-inverse | `--color-inverse-fill` | `rgba(112,115,124,0.08)` |
| Inverse/icon-inverse | `--color-inverse-icon` | `#171719` |

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
| Desktop | ≥ 1024px | 40px | 3–4 (max 1280px, 업무형은 좌측 NavSide 240px / 탐색·커머스·브랜드형은 Header·GNB) |

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
- **Desktop (≥ 1024px)**: 서비스 성격에 따라 선택한다. B2B SaaS·어드민·CRM·ERP·대시보드·업무 도구는 `NavSide` 좌측 레일(240px, 기본 펼침 상태)을 사용하고, 포털·커머스·예약·여행·교육·엔터테인먼트·브랜드/마케팅형 서비스는 `Header`/상단 GNB를 사용한다.

---

## Elevation & Depth

KTDS는 그림자와 구분선을 시각적 장식이 아닌 **레이어 계층 신호**로 사용한다. B2B와 B2C는 정보 밀도와 감성 톤이 다르므로 카드 분리 방식도 다르게 적용한다.

- **B2B 카드 기본면**: `border: 1px solid var(--color-border-alt)`만 사용하고 shadow는 사용하지 않는다. 업무 화면에서는 테이블·폼·필터가 많아 shadow보다 약한 구분선이 더 안정적이다.
- **B2C 카드 기본면**: border 없이 `--dsx-shadow-b2c-card`만 사용한다. 소비자 서비스에서는 표면이 가볍게 떠 보이는 표현이 더 자연스럽다.
- **금지**: 카드에 border와 shadow를 동시에 적용하지 않는다. 두 신호가 겹치면 컨테이너가 과하게 무거워 보인다.
- **레벨 2 (FAB)**: 페이지 위에 떠 있는 주요 액션 버튼. 고정 위치(fixed)이므로 스크롤 콘텐츠와 명확히 분리되어야 한다.
- **레벨 3 (Dropdown·Tooltip)**: 짧은 수명의 팝업. 과도한 그림자는 닫힘을 방해하므로 blur 반경을 20px로 제한한다.
- **레벨 4–6 (Drawer·Modal·Overlay)**: 사용자의 전체 주의를 요구하는 UI. 그림자가 클수록 배경 콘텐츠와의 깊이 차이를 강조해 "지금 이 레이어가 최상단"임을 인지시킨다.

DSX 공식 그림자 토큰 (`--dsx-shadow-*`):

| Level | CSS Variable | Shadow | Usage |
|-------|-------------|--------|-------|
| 0 | — | none | Flat surface, list items |
| 1 | `--dsx-shadow-1` | `0px 1px 3px rgba(0,0,0,0.16)` | Card subtle base |
| B2C card | `--dsx-shadow-b2c-card` | `0px 5px 10px rgba(0,0,0,0.05)` | B2C Card |
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
- **Input/Select 높이 체계**: Storybook props 기준 `size`는 `small` / `large`만 노출되며, 미지정 기본 상태가 32px이다. 실제 높이는 small 24px, default 32px, large 40px를 사용한다. outlined 변형이 기본이다.
- **내비게이션 분리(Mobile/Tablet/Desktop)**: NavBottom(모바일)·NavTop(태블릿)·NavSide/Header(데스크탑)를 각각 별개의 컴포넌트로 유지한다. 데스크탑에서 NavSide는 업무형 정보 구조에 우선하고, 상단 Header/GNB는 탐색·커머스·브랜드형 서비스에 우선한다. 하나의 반응형 컴포넌트로 통합할 경우 복잡한 조건 분기가 생겨 유지보수 비용이 증가했다.
- **Toast vs Alert Dialog 분리**: 비차단(non-blocking) 알림은 Toast(`useToast`), 사용자 확인이 필요한 파괴적 행동(삭제·초기화)은 Alert Dialog(`useAlert`)를 사용한다. 두 패턴을 혼용하면 사용자가 경고 심각도를 구분하지 못한다.

### Button

```tsx
import { Button } from '@ktds-ui/components';

<Button variant="primary">저장</Button>
<Button variant="outline" size="small">취소</Button>
<Button variant="negative" prefixIcon="delete">삭제</Button>
```

| prop | type | default | values |
|------|------|---------|--------|
| `variant` | string | `'outline'` | primary secondary outline ghost negative normal |
| `size` | string | `'default'` | small default large |
| `prefixIcon` | string | — | 아이콘 name (앞) |
| `suffixIcon` | string | — | 아이콘 name (뒤) |
| `iconOnly` | string | — | 아이콘 name — 아이콘만 표시 (children은 스크린리더용 숨김 텍스트) |
| `disabled` | bool | `false` | — |

```
button-primary:    bg={colors.primary}       text=white               h=48px  px=24px  r={rounded.md}
button-secondary:  bg={colors.fill-neutral}  text={colors.text}       h=48px  px=24px  r={rounded.md}
button-outline:    bg=transparent  border=1px {colors.border}  text={colors.text}  h=48px  px=24px  r={rounded.md}
button-ghost:      bg=transparent            text={colors.text}       h=48px  (no border)  px=12px
button-negative:   bg={colors.negative}      text=white               h=48px  px=24px  r={rounded.md}
button-normal:     bg={colors.fill-neutral}  text={colors.text-neutral}  h=48px  px=24px  r={rounded.md}
button-disabled:   bg={colors.surface-disabled}  text={colors.text-disabled}  r={rounded.md}
button-fab:        r={rounded.full}
```

**Size variants:** `small` / `default` / `large` (Storybook 기본값은 `default`)

### Input Field

```
import { Input } from '@ktds-ui/components';

Props:
  variant:    'outlined' | 'filled'    (default: 'outlined')
  type:       'text' | 'password' | 'tel' | 'url' | 'search' | 'email'  (default: 'text')
  size:       'small' | 'large'             (small=24px, default=32px, large=40px)
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
input-size-large:  h=40px
input-size-default: h=32px  (size 미지정)
input-size-small:  h=24px
input-default:     r={rounded.md}  border=1px {colors.border}
input-focused:     border=1px {colors.primary-border}
input-error:       border=1px {colors.negative}
input-disabled:    bg={colors.surface-disabled}  text={colors.text-disabled}
Label: body-md / {colors.text-neutral}  (input 위에 배치)
Placeholder: {colors.text-assistive}
```

### Textarea

```
import { Textarea } from '@ktds-ui/components';

Props:
  variant:    'outlined' | 'filled'  (default: 'outlined')
  rows:       number                 (default: 5)
  count:      number                 (default: 1000 — 최대 글자 수, 하단 카운터 자동 표시)
  value:      string                 (controlled 입력값)
  invalid:    bool                   (유효성 오류 상태)
  disabled, readOnly, placeholder, className
```

```
textarea-default:  r={rounded.md}  border=1px {colors.border}  rows=5
textarea-filled:   bg={colors.fill-alt}  border=none
Label: body-md  위에 배치 / 입력 최대 글자수 카운트 표시 가능
```

### Card

```
import { Card } from '@ktds-ui/components';

Props:
  variant:   'vertical' | 'horizontal'  (default: 'vertical')
  media:     node  (img / iframe / video 등 미디어 영역)
  children:  node  (카드 본문 콘텐츠)
  float:     node  (플로팅 영역 — 주로 IconButton 배치)

구조: dsx-Card-media → dsx-Card-content → dsx-Card-float
```

```tsx
// 세로형 카드 (기본)
<Card media={<img src="..." alt="..." />} float={<IconButton name="bookmark" />}>
  <Heading level="4">카드 제목</Heading>
  <Text>카드 설명 텍스트</Text>
</Card>

// 가로형 카드
<Card variant="horizontal" media={<img src="..." alt="..." />}>
  <Heading level="4">가로형 카드</Heading>
</Card>
```

```
card-default:
  bg={colors.surface}  r={rounded.xl}  p=20px
  B2B: border=1px solid {colors.border-alt}  shadow=none
  B2C: border=none  shadow=var(--dsx-shadow-b2c-card)
  Do not combine border and shadow on the same card.
```

### List Item

```
list-item-default:  min-h=56px  px=16px
                    border-bottom=1px {colors.border-alt}
                    Leading icon: 24px / {colors.icon}
                    Trailing chevron: 16px / {colors.text-neutral}
```

### Badge

상태 표시, 숫자 카운트, 아이콘 오버레이 등 다양한 배지 표현.

```tsx
import { Badge } from '@ktds-ui/components';

<Badge variant="filled" accent="primary">NEW</Badge>
<Badge variant="tint" accent="positive">승인</Badge>
<Badge variant="outlined" accent="negative" size="small">오류</Badge>
<Badge variant="ring" accent="primary" size="dot" />

// Avatar 위에 위치 배지
<Badge variant="filled" accent="primary" size="xsmall" position="topEnd">3</Badge>
```

| prop | type | default | values |
|------|------|---------|--------|
| `variant` | string | `'tint'` | filled tint outlined ghost ring |
| `size` | string | `'medium'` | dot xsmall small medium large xlarge |
| `accent` | string | — | primary positive negative caution info normal |
| `round` | bool | — | pill 형태 강제 |
| `position` | string | — | topStart topEnd bottomStart bottomEnd (상위 relative 기준 절대 위치) |
| `prefixIcon` | string | — | 아이콘 name |
| `suffixIcon` | string | — | 아이콘 name |
| `iconOnly` | string | — | 아이콘 name — 아이콘만 표시 (`aria-label`로 children 사용) |
| `children` | string | — | 배지 텍스트 (required) |

```
variant=filled:   bg={accent 색상}  text=white  r={rounded.full}
variant=tint:     bg={accent fill-neutral}  text={accent text}  r={rounded.full}
variant=outlined: bg=transparent  border=1px {accent 색상}  text={accent 색상}  r={rounded.full}
variant=ghost:    bg=transparent  text={accent 색상}  r={rounded.full}
variant=ring:     bg={accent 색상}  border=2px solid {colors.surface}  r={rounded.full}

size=dot:    4×4px  (숫자 없는 알림 점)
size=xsmall: 12×12px
size=small:  16×16px
size=medium: 20px (기본)
size=large:  24px
size=xlarge: 28px
```

### Chip (선택형 필터 태그)

```
import { Chip } from '@ktds-ui/components';

Props:
  id:          string   input id (미설정 시 랜덤 생성)
  checked:     bool     controlled 체크 상태
  label:       string   표시 텍스트
  prefixIcon:  string   앞쪽 아이콘 name
  suffixIcon:  string   뒤쪽 아이콘 name
  onChange:    func     (checked: bool) => void  (controlled 시 필수)
  disabled:    bool     비활성화
```

```tsx
// uncontrolled
<Chip label="전체" />
<Chip label="승인" prefixIcon="checkCircle" />

// controlled (checked + onChange 함께 사용)
<Chip label="진행중" checked={filter === '진행중'} onChange={(v) => setFilter(v ? '진행중' : '')} />
```

```
chip-default:   border=1px {colors.border}  h=32px  r={rounded.full}
chip-selected:  bg={colors.primary-fill-neutral}  text={colors.primary-text}  border=1px {colors.primary}
```

### Navigation

Desktop navigation must be chosen by service type, not by viewport alone.

- Use `NavSide` / `SideNavigation` for B2B SaaS, admin, CRM, ERP, analytics dashboard, internal tools, and dense work management.
- Use `Header` / top GNB for portal, commerce, booking, travel, education, entertainment, consumer, and brand/marketing services.
- Never use mobile `NavBottom` on desktop web.

#### NavBottom (Mobile 전용)

```
import { NavBottom } from '@ktds-ui/components';

Props:
  menuItems*: [{
    icon*:    string   아이콘 name
    label*:   string   메뉴 레이블 (활성 비교 기준)
    href?:    string   링크 URL (href 또는 onClick 중 하나)
    badge?:   node     뱃지 노드 (Badge 컴포넌트 등)
    onClick?: func     클릭 핸들러
  }]
  className?: string

제약: 최소 3개, 최대 5개 메뉴 권장
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

```tsx
import { Dialog, Button } from '@ktds-ui/components';

// 단순 텍스트 content
<Dialog
  isOpen={isOpen}
  title="삭제 확인"
  subTitle="주의 사항"
  content="정말 삭제하시겠습니까?"
  size="default"
  onClose={() => setIsOpen(false)}
  closeOnOutSide={false}
  buttons={
    <>
      <Button size="large" onClick={() => setIsOpen(false)}>취소</Button>
      <Button variant="negative" size="large" onClick={handleDelete}>삭제</Button>
    </>
  }
/>

// content를 render prop으로 — Form Grid 안에 넣을 때
<Dialog
  isOpen={isOpen}
  title="코드그룹 등록"
  subTitle="코드그룹에 대한 정보를 입력하세요"
  size="large"
  onClose={onClose}
  content={() => (
    <Form variant="grid" column={2}>
      <FormItem label="코드그룹 ID" isRequired className="dsx-w-full"><Input full /></FormItem>
      <FormItem label="코드그룹명" isRequired><Input full /></FormItem>
      <FormItem label="사용여부" isRequired>
        <RadioGroup value={radioValue} options={radioOptions} onChange={handleRadioChange} />
      </FormItem>
      <FormItem label="유효기간" isRequired>
        <DatePicker dateRange />
      </FormItem>
    </Form>
  )}
  buttons={
    <>
      <Button size="large" onClick={onClose}>취소</Button>
      <Button variant="primary" size="large" onClick={handleRegister}>등록</Button>
    </>
  }
/>
```

| prop | type | default | values |
|------|------|---------|--------|
| `isOpen` | bool | — | (required) |
| `title` | string | — | 다이얼로그 제목 |
| `subTitle` | string | — | 서브 제목 |
| `content` | node\|func | `''` | 본문 내용. 함수 전달 시 `content()` 호출 (render prop) |
| `size` | string | `'default'` | default small large full |
| `onClose` | func | — | 닫기 핸들러 |
| `closeOnOutSide` | bool | `false` | 외부 클릭 시 닫힘 |
| `buttons` | node | — | 하단 버튼 영역 JSX 노드 직접 전달 |

```
size=small:   max-w=320px
size=default: max-w=480px
size=large:   max-w=640px
size=full:    width=100vw  height=100vh

dialog-default:  bg={colors.surface}  r={rounded.xl}  p=24px
                 shadow=var(--dsx-shadow-5)
                 overlay: rgba(0,0,0,0.5)  z-index=300
```

### AlertDialog

명령형(programmatic) 확인/취소 다이얼로그. 직접 렌더링하지 말고 **AlertContext의 `useAlert`** 훅으로 사용할 것.

```
import { AlertDialog } from '@ktds-ui/components';

Props:
  title:     string   다이얼로그 제목
  message:   string   본문 메시지
  onConfirm: func     확인 버튼 콜백 (required)
  onCancel:  func     취소 버튼 콜백 (없으면 취소 버튼 미표시)

주의: isOpen prop 없음 — 마운트 즉시 표시됨.
      #portal-root에 createPortal로 렌더링.
      AlertContext를 통해 useAlert() 훅으로 호출하는 것이 권장 패턴.
```

```tsx
// 권장: AlertContext 사용
const { showAlert } = useAlert();
showAlert({
  title: '삭제 확인',
  message: '정말 삭제하시겠습니까?',
  onConfirm: handleDelete,
  onCancel: () => {},
});
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

```tsx
import { Loading } from '@ktds-ui/components';

<Loading />
<Loading size="5" label="데이터를 불러오는 중..." />
```

| prop | type | default | values |
|------|------|---------|--------|
| `size` | string | `'3'` | '1' '2' '3' '4' '5' (1=최소, 5=최대) |
| `label` | string | — | 접근성 및 표시 레이블 |
| `className` | string | — | — |

```
Loading은 인라인 스피너만 렌더링 (position prop 없음).
페이지 전체 로딩: Loading을 fixed overlay div 안에 직접 배치.
컨테이너 로딩: absolute overlay div 안에 배치.

스피너 스타일:
  border: 3px solid var(--color-border-alt)
  border-top-color: var(--color-primary)
  border-radius: 50%
  animation: rotate 700ms linear infinite
```

### Select / Dropdown

```
import { Select } from '@ktds-ui/components';

Props:
  variant:     'outlined' | 'filled' | 'ghost'  (default: 'outlined')
  options:     [{ value: string | number, label: node }]
  size:        'small' | 'large'             (small=24px, default=32px, large=40px)
  full:        bool            (width 100%)
  disabled:    bool            (default: false)
  invalid:     bool            (default: false)
  placeholder, className, onChange
```

```
select-size-large:  h=40px
select-size-default: h=32px  (size 미지정)
select-size-small:  h=24px
select-default:     r={rounded.md}  border=1px {colors.border}  bg={colors.surface}
select-filled:      bg={colors.fill-alt}  border=none
select-ghost:       bg=transparent  border=none
select-focused:     border=1px {colors.primary-border}
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
  value:      string | string[]  (YYYY-MM-DD 형식)
  onChange:   func
  minDate:    string           (YYYY-MM-DD)
  maxDate:    string           (YYYY-MM-DD)
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
import { Switch } from '@ktds-ui/components';

Props:
  id:        string   input id (미설정 시 랜덤 생성)
  checked:   bool     controlled 체크 상태
  disabled:  bool     비활성화
  onChange:  func     (event) => void
  className: string

동작: checked prop 없으면 uncontrolled (내부 state). checked 설정 시 controlled.
```

```tsx
// uncontrolled
<Switch onChange={(e) => console.log(e.target.checked)} />

// controlled
<Switch checked={isOn} onChange={(e) => setIsOn(e.target.checked)} />
<Switch checked={isOn} disabled />
```

```
Track:         48×28px  r={rounded.full}
toggle-off:    track={colors.fill}  thumb=white 22px
toggle-on:     track={colors.primary}  thumb=white 22px
toggle-disabled: track={colors.surface-disabled}  thumb={colors.surface-inactive}
```

### Table

```
import { Table } from '@ktds-ui/components';

Props:
  columns*:       array | object   헤더 정의. 각 항목: { label, field, width?, sort?, align?, childRow? }
  data:           array            행 데이터 (default: [])
  sort:           bool             전체 컬럼 정렬 버튼 활성화
  selectionType:  'checkbox' | 'radio'   행 선택 타입
  selectionField: string | string[]      링크로 표시할 field명 (클릭 시 onRowClick 호출)
  horizonScroll:  bool             가로 스크롤 활성화
  height:         number | string  테이블 최대 높이 (세로 스크롤)
  align:          'left' | 'center' | 'right'   텍스트 정렬 (default: 'left')
  children:       node             caption 텍스트 (접근성용 — default: 'table caption')
  setRows:        func             선택된 행 데이터 콜백. checkbox → array, radio → object
  onRowClick:     func             selectionField 링크 클릭 시 행 데이터 콜백

columns 구조:
  { label: string, field: string, width?: number|string, sort?: bool, align?: string, childRow?: column[] }
  childRow로 중첩 헤더(멀티 레벨 th) 구성 가능
```

```tsx
const columns = [
  { label: '이름', field: 'name', width: 120 },
  { label: '이메일', field: 'email' },
  { label: '상태', field: 'status', align: 'center', width: 80 },
];
const data = [
  { name: '홍길동', email: 'hong@example.com', status: '활성' },
  { name: '김철수', email: 'kim@example.com', status: '비활성' },
];

// 기본 테이블
<Table columns={columns} data={data}>사용자 목록</Table>

// 정렬 + 체크박스 선택 + 높이 고정
<Table
  columns={columns}
  data={data}
  sort
  selectionType="checkbox"
  height={400}
  setRows={(rows) => setSelectedRows(rows)}
>
  사용자 목록
</Table>

// 행 링크 + 클릭 콜백
<Table
  columns={columns}
  data={data}
  selectionField="name"
  onRowClick={(row) => router.push(`/users/${row.id}`)}
>
  사용자 목록
</Table>
```

```
table-header:    bg={colors.surface-alt}  text={colors.text-neutral}  typography=caption-lg+weight600  h=44px  px=16px
                 border-bottom=1px {colors.border}
table-row:       bg={colors.surface}  text={colors.text}  typography=body-md  min-h=48px  px=16px
                 border-bottom=1px {colors.border-alt}
table-row-hover: bg={colors.fill-alt}
table-row-selected: bg={colors.primary-fill-neutral}
데이터 없을 때: Empty 컴포넌트 자동 표시 (variant="data", desc="데이터가 없습니다.")
```

### Pagination

```
import { Pagination } from '@ktds-ui/components';

Props:
  totalResults*:  number                총 결과 수 (필수)
  variant:        'default' | 'outline' (default: 'default')
  pageRange:      number                한 번에 표시되는 페이지 링크 수 (default: 5)
  resultsPerPage: number                페이지당 결과 수 (default: 10)
  page:           number                현재 페이지 (default: 1)
  mode:           'basic' | 'ellipsis' 페이지 표시 방식 (default: 'basic')
                                        basic: pageRange 단위로 이동
                                        ellipsis: 현재 페이지 기준 ... 생략
  options:        string[]              추가 기능 ['total', 'sizes', 'jump']
                                        total: "총 N건" 표시
                                        sizes: 페이지당 결과 수 Select
                                        jump: 페이지 직접 이동 Input
  pageSizes:      number[]              sizes 옵션의 선택지 (default: [10, 50, 100])
  setPage:        func                  페이지 변경 콜백 (page: number) => void
  setPageSize:    func                  페이지 크기 변경 콜백 (size: number) => void
```

```tsx
// 기본
<Pagination totalResults={250} setPage={setPage} />

// 모든 옵션 + ellipsis 모드
<Pagination
  totalResults={1000}
  page={currentPage}
  resultsPerPage={pageSize}
  mode="ellipsis"
  pageRange={7}
  options={['total', 'sizes', 'jump']}
  pageSizes={[10, 25, 50, 100]}
  setPage={setCurrentPage}
  setPageSize={setPageSize}
/>
```

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
import { Progress } from '@ktds-ui/components';

Props:
  value*:    number   현재 값
  max*:      number   최대 값
  size:      '1' | '2' | '3'  (default: '3')  1=가장 가늘음, 3=두꺼움
  className: string
```

```tsx
<Progress value={60} max={100} />
<Progress value={30} max={100} size="1" />
```

```
progress-bar-default:  h=4px  r={rounded.full}
Track: bg={colors.fill-neutral}
Fill:  bg={colors.primary}
Animation: left → right  transition 300ms ease-out
```

### Breadcrumb

```
import { Breadcrumb, BreadcrumbItem } from '@ktds-ui/components';

<Breadcrumb>
  <BreadcrumbItem href="/home" icon="home">홈</BreadcrumbItem>
  <BreadcrumbItem href="/settings">설정</BreadcrumbItem>
  <BreadcrumbItem current>사용자 관리</BreadcrumbItem>
</Breadcrumb>

// 항목이 많을 때 중간 생략
<Breadcrumb showItems={2}>
  <BreadcrumbItem href="/">홈</BreadcrumbItem>
  ...여러 항목...
  <BreadcrumbItem current>현재 페이지</BreadcrumbItem>
</Breadcrumb>
```

Breadcrumb props:
  children*:  node     BreadcrumbItem 목록
  showItems:  number   표시할 마지막 N개 항목 (초과 시 중간 "..." 생략)
  separator:  string   구분 아이콘 name (default: 'chevron')
  className:  string

BreadcrumbItem props:
  children*:  node     레이블 텍스트 (required)
  href:       string   링크 URL (없으면 <span> 렌더)
  icon:       string   아이콘 name
  current:    bool     현재 페이지 (aria-current="page", <em> 렌더)

```
breadcrumb-item:    text={colors.text-alternative}  typography=body-md
breadcrumb-current: text={colors.text}  typography=label-lg
Separator: chevron 아이콘  {colors.text-assistive}
```

### Tag

```
tag-default:  bg={colors.fill-alt}  text={colors.text-neutral}  typography=caption-lg  r={rounded.sm}  px=8px  py=2px
tag-primary:  bg={colors.primary-fill-neutral}  text={colors.primary-text}  r={rounded.sm}
— Chip과 달리 클릭 불가 라벨 전용
```

### Avatar

프로필 이미지 또는 이니셜 아바타. 이미지 없을 경우 배경+이니셜/아이콘으로 폴백.

```tsx
import { Avatar } from '@ktds-ui/components';

<Avatar size="6" src="/user.jpg" label="홍길동" />
<Avatar size="7" icon="smileFill" accent="primary" />
<Avatar as="button" size="5" label="KD" badgeProps={{ icon: 'check', size: 'xsmall' }} />
```

| prop | type | default | values |
|------|------|---------|--------|
| `as` | string | `'span'` | span button |
| `variant` | string | `'default'` | default ring |
| `size` | string | `'6'` | '1' '2' '3' '4' '5' '6' '7' '8' '9' (20px ~ 72px) |
| `src` | string | — | 이미지 URL |
| `label` | string | — | 이니셜 또는 접근성 텍스트 |
| `icon` | string | — | 아이콘 name (이미지/이니셜 없을 때) |
| `disabled` | bool | — | — |
| `accent` | string | — | primary positive negative caution info normal |
| `badgeProps` | object | — | `{ icon, label, size }` — 아바타 우측 하단 배지 |
| `className` | string | — | — |

```
size 참조:
  '1'=20px  '2'=24px  '3'=28px  '4'=32px  '5'=36px
  '6'=40px  '7'=48px  '8'=56px  '9'=72px
variant=ring: border=2px solid {colors.primary}  (선택/활성 상태 강조)
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
  allowDrop:       bool    (Drag & Drop 허용, 기본: false)
  uploadMsg:       string  (default: 'Drop files to upload' — allowDrop 시 표시)
  maxFiles:        number  (default: 1)
  maxFileSize:     number  (default: 10485760 = 10MB)
  allowFileType:   array   (허용 확장자, default: xlsx,xls,docx,doc,pptx,ppt,txt,pdf,zip,jpg,jpeg,png,gif)
  defaultFileList: array   (기존 업로드 파일 목록, {name, size} 형태)
  disabled:        bool
  fileTypeMsg:     string  (확장자 안내 문구, allowDrop 없을 때 하단 표시)
  errMsg:          string  (외부에서 전달하는 에러 메시지)
  onUpload:  async func    (files: File[]) => void  (업로드 완료 시 uploadFileList 갱신)
  onRemove:  async func    (file: File) => void
  onDownload:      func    (file) => string  (다운로드 URL 반환)
  onChange:        func    (files: File[]) => void  (선택 시 콜백)
```

### Anchor

페이지 내 섹션 이동을 위한 목차형 네비게이션. 스크롤 위치에 따라 활성 항목이 자동 갱신된다.

```
import { Anchor } from '@ktds-ui/components';

Props:
  title:      string    목차 제목 (dsx-Anchor-title)
  list*:      [{ id: string, label: string }]  이동할 섹션 목록
  onScroll:   func      스크롤/클릭 시 콜백 (id: string) => void
  scrollType: 'auto' | 'instant' | 'smooth'  (default: 'smooth')

동작: list[n].id는 페이지 내 요소의 id와 매핑됨.
      스크롤하면 현재 뷰포트 위치 기준으로 data-state="active" 항목이 자동 변경됨.
      클릭 시 해당 id 요소로 스크롤 이동 (scrollType 적용).
```

```tsx
<Anchor
  title="목차"
  list={[
    { id: 'section-1', label: '1. 개요' },
    { id: 'section-2', label: '2. 상세 내용' },
    { id: 'section-3', label: '3. 마무리' },
  ]}
  onScroll={(id) => console.log('active:', id)}
/>

// 각 섹션에 id 부여
<section id="section-1">...</section>
<section id="section-2">...</section>
```

---

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
  onSelect:      func          선택 변경 시 콜백 (items: number[]) => void
  selectedMenu:  number        외부에서 선택 항목 제어 (controlled)

data 노드 구조:
  { key: number (required), label: string (required), icon?: string, children?: TreeNode[] }

구조: 상위 노드(자식 있음, 접기/펼치기) + 리프 노드(자식 없음)
depth별 padding: depth * 28 + 8px
```

```tsx
<TreeMenu
  data={[
    { key: 1, label: '상위 메뉴', children: [
      { key: 2, label: '하위 메뉴 A' },
      { key: 3, label: '하위 메뉴 B', icon: 'folder' },
    ]},
    { key: 4, label: '단독 메뉴' },
  ]}
  selectionType="radio"
  selectedMenu={2}
  onSelect={(items) => console.log(items)}
/>
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

데이터 차트 컬러 팔레트 (프로젝트 예시 팔레트):
['#69A5FF', '#FF8C8C', '#FFC06E', '#88F03E', '#9E86FC']
```

### Stack

자식 요소를 가로(기본) 또는 세로로 나열하는 Flex 래퍼.

```
import { Stack } from '@ktds-ui/components';

Props:
  vertical:  bool   세로 정렬 (기본: 가로)
  inline:    bool   inline-flex 모드
  children*: node
  className: string
```

```tsx
// 가로 나열 (버튼 그룹)
<Stack>
  <Button variant="outline">취소</Button>
  <Button variant="primary">저장</Button>
</Stack>

// 세로 나열
<Stack vertical>
  <Input label="이름" />
  <Input label="이메일" />
</Stack>
```

---

### Combobox

Select/Dropdown 트리거 버튼. DropdownMenu 내부 트리거로 사용되며 단독으로도 사용 가능.

```
import { Combobox } from '@ktds-ui/components';

Props:
  label:    string  (default: 'Dropdown Menu')
  variant:  'outlined' | 'filled' | 'ghost'  (default: 'outlined')
  expanded: bool    (default: false)  aria-expanded 연동
  icon:     string  앞쪽 아이콘 name
  onClick:  func
  className: string
```

```tsx
<Combobox label="옵션 선택" expanded={isOpen} onClick={() => setIsOpen(!isOpen)} />
<Combobox label="필터" variant="ghost" icon="filter" expanded={false} />
```

---

### CheckboxGroup

여러 Checkbox를 하나의 그룹으로 관리. controlled/uncontrolled 모두 지원.

```
import { CheckboxGroup } from '@ktds-ui/components';

Props:
  options*:      [{ value: string, label: string, disabled?: bool }]
  value:         string[]   controlled 선택값
  defaultValue:  string[]   uncontrolled 초기값
  name:          string     (미설정 시 랜덤 생성)
  invalid:       bool       유효성 오류 상태
  vertical:      bool       세로 정렬 (기본: 가로)
  onChange:      func       (newValues: string[]) => void
  className:     string
```

```tsx
<CheckboxGroup
  options={[
    { value: 'a', label: '옵션 A' },
    { value: 'b', label: '옵션 B' },
    { value: 'c', label: '옵션 C', disabled: true },
  ]}
  defaultValue={['a']}
  onChange={(values) => console.log(values)}
/>

// controlled
<CheckboxGroup options={options} value={selected} onChange={setSelected} vertical />
```

---

### RadioGroup

여러 Radio를 하나의 그룹으로 관리. controlled/uncontrolled 모두 지원.

```
import { RadioGroup } from '@ktds-ui/components';

Props:
  options*:      [{ value: string, label: string, disabled?: bool }]
  value:         string    controlled 선택값
  defaultValue:  string    uncontrolled 초기값
  name:          string    (미설정 시 랜덤 생성)
  invalid:       bool      유효성 오류 상태
  vertical:      bool      세로 정렬 (기본: 가로)
  onChange:      func      (event, value: string) => void
  className:     string
```

```tsx
<RadioGroup
  options={[
    { value: 'yes', label: '예' },
    { value: 'no', label: '아니오' },
  ]}
  defaultValue="yes"
  onChange={(e, value) => console.log(value)}
/>
```

---

### Form / FormItem

폼 레이아웃 컴포넌트. `Form`이 그리드/인라인 레이아웃을 제공하고, `FormItem`이 레이블+필드+에러 메시지를 묶는다.

```
import { Form, FormItem } from '@ktds-ui/components';

Form Props:
  children*:  node
  onSubmit*:  func    (event.preventDefault 자동 처리)
  variant:    'grid' | 'inline'  (default: 'inline')
  column:     number             컬럼 수 (grid 모드, default: 1)

FormItem Props:
  label*:      string   레이블 텍스트
  children*:   node     Input, Select, Checkbox 등 폼 필드
  error:       string   에러 메시지 (입력 시 필드에 invalid 상태 자동 적용)
  isRequired:  bool     필수 항목 표시 (*)
  className:   string
```

```tsx
// 그리드 폼 (2열)
<Form variant="grid" column={2} onSubmit={handleSubmit}>
  <FormItem label="이름" isRequired error={errors.name}>
    <Input placeholder="이름 입력" value={name} onChange={(e) => setName(e.target.value)} />
  </FormItem>
  <FormItem label="이메일" isRequired error={errors.email}>
    <Input type="email" placeholder="이메일 입력" value={email} onChange={(e) => setEmail(e.target.value)} />
  </FormItem>
  <FormItem label="성별">
    <RadioGroup options={[{ value: 'm', label: '남' }, { value: 'f', label: '여' }]} />
  </FormItem>
</Form>

// 인라인 폼
<Form variant="inline" onSubmit={handleSubmit}>
  <FormItem label="검색어">
    <Input placeholder="검색어 입력" />
  </FormItem>
  <Button type="submit" variant="primary">검색</Button>
</Form>
```

---

### Popover

트리거 요소 주변에 부동(floating) 레이어를 표시. `document.body`에 포털 렌더링.

```
import { Popover } from '@ktds-ui/components';

Props:
  children*:     node    팝오버 내용
  trigger:       string | node  트리거 (string이면 내부 Button 생성, node면 cloneElement)
  position:      'top' | 'bottom' | ['top'|'bottom', 'start'|'end']  (default: 'bottom')
  isOpen:        bool    (default: false)  외부 제어
  popoverState:  func    열림/닫힘 상태 콜백 (state: bool) => void
  inactiveEvent: bool    트리거 클릭 이벤트 비활성화 (외부에서 직접 제어할 때)
  className:     string

동작:
  - 뷰포트 가장자리 자동 위치 보정
  - 외부 클릭 시 자동 닫힘
  - Esc 키로 닫힘 + 트리거로 포커스 복귀
  - 스크롤/리사이즈 시 위치 재계산
```

```tsx
// 기본 사용
<Popover trigger="설정 열기" position="bottom">
  <div className="dsx-Popover-inner">
    <Button variant="ghost">메뉴 1</Button>
    <Button variant="ghost">메뉴 2</Button>
  </div>
</Popover>

// 커스텀 트리거 + 외부 제어
const [open, setOpen] = useState(false);
<Popover
  trigger={<Button variant="outline" suffixIcon="chevronBottom">사용자</Button>}
  isOpen={open}
  popoverState={setOpen}
  position={['bottom', 'end']}
>
  <div className="dsx-Popover-inner">팝오버 내용</div>
</Popover>
```

---

## Layout Components

Next.js 기반 페이지 레이아웃 구성 컴포넌트. `@ktds-ui/layout`에서 import.

```ts
import {
  SideNavigation,
  Header,
  Footer,
  Content,
  ContentTitle,
  SplitLayout,
} from '@ktds-ui/layout';
```

### SideNavigation

좌측 사이드 내비게이션. Next.js `usePathname` / `useRouter` 기반으로 현재 경로에 따라 활성 메뉴 자동 강조.

```
Props:
  selectedMenu*:  object  현재 선택된 최상위 메뉴
    {
      label:    string
      subMenu:  [
        {
          label:   string
          path:    string
          subMenu?: [{ label: string, path: string }]
        }
      ]
    }
```

```tsx
<SideNavigation
  selectedMenu={{
    label: '관리',
    subMenu: [
      { label: '사용자 목록', path: '/admin/users' },
      { label: '권한 설정', path: '/admin/roles' },
    ],
  }}
/>
```

---

### Header

상단 헤더. 검색(Popover), 사용자 메뉴(Popover), 비밀번호 변경(Dialog) 포함. `next-auth` 세션 연동.

```
Props:
  menuData*:        array   사이드 내비게이션에 전달할 전체 메뉴 데이터
  setSelectedMenu*: func    메뉴 선택 시 상위로 전달하는 setter (selectedMenu 상태 업데이트)
```

```tsx
const [selectedMenu, setSelectedMenu] = useState(menuData[0]);

<Header menuData={menuData} setSelectedMenu={setSelectedMenu} />
```

---

### Footer

정적 푸터. props 없음.

```tsx
<Footer />
```

---

### Content

페이지 본문 래퍼. `<main className="content">` 렌더링.

```
Props:
  children*: node
```

```tsx
<Content>
  <ContentTitle title="페이지 제목" />
  {/* 본문 콘텐츠 */}
</Content>
```

---

### ContentTitle

페이지 상단 타이틀 영역. Heading + 설명 텍스트 + Breadcrumb + 우측 슬롯.

```
Props:
  title*:      string
  desc:        string   제목 아래 설명 텍스트
  breadcrumb:  (string | { label: string, icon?: string })[]
  depth:       1 | 2 | 3 | 4 | 5   Heading 레벨 (default: 1)
  children:    node     우측 슬롯 (버튼 등 액션 영역)
```

```tsx
<ContentTitle
  title="사용자 관리"
  desc="시스템에 등록된 사용자를 조회하고 관리합니다."
  breadcrumb={['홈', '관리', '사용자 관리']}
  depth={2}
>
  <Button variant="primary" prefixIcon="plus">사용자 추가</Button>
</ContentTitle>
```

---

### SplitLayout

콘텐츠 영역을 N열로 분할하는 레이아웃 컨테이너.

```
Props:
  children*: node
  column:    number   열 수 (CSS 클래스 `splitLayout--column-N` 적용)
```

```tsx
<SplitLayout column={2}>
  <div>왼쪽 패널</div>
  <div>오른쪽 패널</div>
</SplitLayout>
```

---

### 전체 페이지 조합 예시

```tsx
import { Header, SideNavigation, Content, ContentTitle, Footer } from '@ktds-ui/layout';

export default function AdminLayout({ children }) {
  const [selectedMenu, setSelectedMenu] = useState(menuData[0]);

  return (
    <>
      <Header menuData={menuData} setSelectedMenu={setSelectedMenu} />
      <div className="wrap">
        <SideNavigation selectedMenu={selectedMenu} />
        <Content>
          {children}
        </Content>
      </div>
      <Footer />
    </>
  );
}
```

---

## Page Patterns

엔터프라이즈 업무 화면에서 반복 사용되는 표준 페이지 레이아웃 패턴. 실제 소스(`/sample/`) 기반.

### Pattern 01 — 목록 조회 (List + Filter + Dialog)

가장 기본적인 목록 페이지. 인라인 필터 폼 → 목록 타이틀(건수) + 액션 버튼 → 테이블 → 페이지네이션 → 등록 Dialog.

```tsx
import { Table, Pagination, Button, Form, FormItem, Stack, Select, Text } from '@ktds-ui/components';
import { ContentTitle } from '@ktds-ui/layout';

// 컬럼 정의
const columns = [
  { label: '순번', field: 'no', width: 50 },
  { label: '그룹', field: 'group' },
  { label: '이름', field: 'name' },
  { label: '상태', field: 'status', width: 80 },
];

export const ListPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <ContentTitle title="배치 관리" breadcrumb={['배치 관리', '목록']} />

      {/* 인라인 필터 */}
      <Form variant="inline">
        <FormItem label="그룹">
          <Select placeholder="전체" options={options} onChange={setValue} />
        </FormItem>
        <FormItem label="상태">
          <Select placeholder="전체" options={statusOptions} onChange={setStatus} />
        </FormItem>
        <Stack>
          <Button variant="outline">초기화</Button>
          <Button variant="normal">검색</Button>
        </Stack>
      </Form>

      {/* 목록 타이틀 + 액션 */}
      <ContentTitle
        title={<>목록 <Text as="span" size="body3" weight="regular">(총 {total}건)</Text></>}
        depth={2}
      >
        <Button variant="outline">엑셀 다운로드</Button>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>등록</Button>
      </ContentTitle>

      {/* 테이블 */}
      <Table columns={columns} data={data} sort>목록 테이블</Table>

      {/* 페이지네이션 */}
      <Pagination
        totalResults={total}
        options={['sizes', 'jump']}
        pageSizes={[10, 50, 100]}
        setPage={setPage}
        setPageSize={setPageSize}
      />

      {/* 등록 Dialog */}
      <Dialog
        isOpen={dialogOpen}
        size="large"
        title="등록"
        content={() => (
          <Form variant="grid" column={2}>
            <FormItem label="이름" isRequired className="dsx-w-full">
              <Input full />
            </FormItem>
          </Form>
        )}
        onClose={() => setDialogOpen(false)}
        buttons={
          <>
            <Button size="large" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button variant="primary" size="large" onClick={handleSave}>저장</Button>
          </>
        }
      />
    </>
  );
};
```

---

### Pattern 02 — 마스터/디테일 (SplitLayout + Form)

좌측 목록(TreeMenu 또는 Table) + 우측 상세 폼. `SplitLayout`으로 분할.

```tsx
import { Table, Button, Form, FormItem, RadioGroup, Stack, Input } from '@ktds-ui/components';
import { ContentTitle, SplitLayout } from '@ktds-ui/layout';

export const MasterDetailPage = () => (
  <>
    <ContentTitle title="메뉴 관리" breadcrumb={['시스템 관리', '메뉴 관리']} />
    <Form variant="inline">{/* 공통 인라인 필터 */}</Form>

    <SplitLayout>
      {/* 좌측: 목록 */}
      <article>
        <ContentTitle title="메뉴 리스트" depth={2}>
          <Button variant="primary">메뉴 등록</Button>
        </ContentTitle>
        <TreeMenu data={treeData} selectionType="radio" onSelect={handleSelect} />
      </article>

      {/* 우측: 상세 */}
      <article>
        <ContentTitle title="메뉴 상세정보" depth={2} />
        <Form variant="grid" column={2}>
          <FormItem label="메뉴명" isRequired className="dsx-w-full">
            <Input full />
          </FormItem>
          <FormItem label="사용여부" isRequired className="dsx-w-full">
            <RadioGroup options={[{value:'Y',label:'사용'},{value:'N',label:'미사용'}]} />
          </FormItem>
          <FormItem label="사용기간" className="dsx-w-full">
            <DatePicker dateRange />
          </FormItem>
        </Form>
        <Stack className="button-wrap">
          <Button size="large">삭제</Button>
          <Button size="large" variant="primary">저장</Button>
        </Stack>
      </article>
    </SplitLayout>
  </>
);
```

---

### Pattern 03 — 마스터/탭 디테일 (SplitLayout + Tablist)

좌측 목록 + 우측 탭 상세. 오른쪽 영역에 `Tablist`로 복수 탭 콘텐츠.

```tsx
import { Table, Pagination, Tablist } from '@ktds-ui/components';
import { ContentTitle, SplitLayout } from '@ktds-ui/layout';

const [activeTab, setActiveTab] = useState('tab-1');
const tabData = [
  { key: 'tab-1', label: '상세정보', content: <DetailForm /> },
  { key: 'tab-2', label: 'URL 권한', content: <UrlAuthTable /> },
  { key: 'tab-3', label: '사용자 권한', content: <UserAuthTable /> },
];

<SplitLayout>
  <article>
    {/* 인라인 필터 + 목록 테이블 + 페이지네이션 */}
    <Table columns={columns} data={data} sort />
    <Pagination totalResults={total} options={['sizes', 'jump']} setPage={setPage} />
  </article>
  <article>
    <Tablist activeTabKey={activeTab} onTabChange={setActiveTab} data={tabData} />
  </article>
</SplitLayout>
```

---

### Pattern 04 — 로그인 페이지

```tsx
import { Input, Checkbox, Heading, Text, Stack, Button, Icon } from '@ktds-ui/components';
import { Footer } from '@ktds-ui/layout';

<div className="login-wrap">
  <section className="login">
    <h1 className="login-logo">
      <img src="/logo.svg" alt="서비스명" />
    </h1>
    <div className="login-form">
      <Input size="large" full clearable slotBefore={<Icon name="user" />} placeholder="아이디" />
      <Input size="large" full clearable slotBefore={<Icon name="lock" />} placeholder="비밀번호" type="password" reveal />
    </div>
    <Checkbox>아이디 저장</Checkbox>
    <Button size="large" variant="primary" onClick={handleLogin}>로그인</Button>
  </section>
  <Footer />
</div>
```

---

### Pattern 05 — 대시보드 (Chart + Table + Progress)

```tsx
import { Heading, Chart, Table, Progress } from '@ktds-ui/components';

// Bar Chart
<Chart
  chartLabel="요일별 활성 사용자"
  chartType="bar"
  chartData={{
    labels: ['월','화','수','목','금','토','일'],
    datasets: [
      { label: '지난 주', data: [8000,5500,7000,6000,9000,3000,1000], backgroundColor: '#9AD0F5' },
      { label: '이번 주', data: [10000,8500,9000,7500,12000,4000,2000], backgroundColor: '#FFB1C1' },
    ],
  }}
  chartOptions={{ scales: { y: { beginAtZero: true } } }}
/>

// Doughnut Chart
<Chart
  chartLabel="고객 유형"
  chartType="doughnut"
  chartData={{
    labels: ['프리미엄', '일반', '유입'],
    datasets: [{ data: [5000,1000,1000], backgroundColor: ['#9AD0F5','#FFB1C1','#AEEAEE'] }],
  }}
/>

// Progress
<Progress value={72} max={100} size="2" />
```

> 대시보드 레이아웃은 CSS Grid로 구성: `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-md);`

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
- Bottom Sheet는 공식 `BottomSheet` 컴포넌트를 우선 사용하고, 지원되지 않는 환경에서만 `Drawer placement="bottom"` fallback을 사용
- AI 생성 UI는 UX Guideline의 접근성·레이블 규칙과 UX Principle for AI의 Transparency/Fairness/Accountability/Safety/Privacy/Reliability를 기본 체크리스트로 삼는다

**Don't**
- Primary Blue를 배경이나 장식 목적으로 남용하지 않는다
- 8px 그리드 외의 임의 spacing 사용 금지
- 하드코딩된 hex 색상 코드 직접 사용 금지
- 컴포넌트 높이를 터치 타깃 최솟값(44px) 아래로 낮추지 않는다
- 버튼에 pill/full radius 사용 금지 (FAB·Avatar·Chip·Badge 제외)
- 한국어 레이블은 인라인 배치 금지 — 항상 input 위(above)에 위치
- MenuTab을 모바일에서 사용하지 않는다 (PC 전용)
- DatePicker에서 직접 텍스트 입력 허용하지 않는다 (달력 선택만 가능)
- 사용자가 이해할 수 없는 AI 판단 결과를 설명 없이 표시하지 않는다. AI 추천/자동화 상태는 근거, 신뢰도, 사용자가 되돌릴 수 있는 행동을 함께 제공한다.

---

## Aide Generated UI Composition Rules

이 섹션은 Aide가 KTDS를 HTML/CSS 시안으로 생성할 때 적용하는 제품 화면 품질 규칙이다. Storybook 컴포넌트 규칙을 덮어쓰지 않고, 생성 결과가 와이어프레임처럼 보이지 않게 하는 보조 계약이다.

### First Viewport Contract

- 첫 화면은 반드시 `상단 내비/브랜드`, `핵심 요약 또는 hero`, `주요 CTA`, `보조 콘텐츠 또는 다음 섹션 힌트`를 포함한다.
- 화면을 빈 카드와 큰 공백으로 채우지 않는다. 각 섹션은 제목, 보조 설명, 상태/수치/시간/담당자/가격/진행률 등 실제 서비스 데이터를 포함한다.
- KTDS의 기본 레이어는 `body/page background = var(--color-primary-fill-neutral)`, `content surface/card = var(--color-surface)`이다.
- Primary Blue는 CTA, 활성 탭, 링크, 포커스, 핵심 상태 강조에만 사용한다. 넓은 장식 배경이나 그라데이션 용도로 사용하지 않는다.
- B2B/관리자/대시보드는 `border-only card`를 우선하고, B2C/모바일 홈은 `shadow-only card`를 사용할 수 있다. 같은 카드에 border와 shadow를 동시에 쓰지 않는다.

### Spacing Rhythm

- 모바일 page padding: `var(--spacing-base)` 16px. 태블릿: `var(--spacing-lg)` 24px. 데스크탑: `var(--spacing-2xl)` 40px.
- 모바일 section gap: 20-24px 범위에서 `var(--spacing-md)` 또는 `var(--spacing-lg)`를 사용한다. 같은 화면 안에서 section gap을 제각각 만들지 않는다.
- 카드 gap: 모바일 `var(--spacing-base)` 16px, 태블릿 이상 `var(--spacing-md)` 20px.
- 카드 padding: 기본 `var(--spacing-md)` 20px. 정보 밀도가 높은 리스트 카드는 16px까지 줄일 수 있지만, 같은 리스트 안에서는 동일해야 한다.
- 제목-본문-CTA 간격은 `8px -> 12/16px -> 20/24px` 리듬으로 구성한다. 큰 여백을 감각적으로 넣지 말고 정보 그룹 단위로만 사용한다.
- 하단 `NavBottom`, floating CTA, 장바구니 버튼이 있으면 스크롤 콘텐츠에 `padding-bottom: calc(72px + env(safe-area-inset-bottom) + var(--spacing-lg))` 이상을 둔다.

### Button And Label Safety

- 한국어 버튼 레이블은 한 줄 유지가 기본이다. 버튼 폭이 부족하면 버튼을 넓히거나 문구를 줄이고, 2줄 줄바꿈 버튼을 만들지 않는다.
- 모바일 주요 CTA는 최소 48px 높이, 좌우 padding 24px, 텍스트 중앙 정렬, `white-space: nowrap`을 기본으로 한다.
- 아이콘은 반드시 Google Material Symbols Rounded를 사용한다. 아이콘만 있는 액션은 반드시 `IconButton` 규칙을 따르며, ligature 텍스트(`home`, `star`, `person`)가 일반 텍스트처럼 노출되면 실패로 간주한다.
- Input, Select, DatePicker, Textarea는 레이블을 필드 위에 둔다. placeholder만으로 필드 의미를 전달하지 않는다.

### 3D And Media Integration

KTDS는 엔터프라이즈 UI 시스템이므로 3D/이미지는 장식이 아니라 정보 구조를 보조해야 한다.

- 3D 이미지를 빈 공간에 얹어 놓지 않는다. 반드시 카드/hero surface, soft patch, contact shadow, caption/CTA 중 하나와 관계를 만든다.
- 3D가 hero의 주인공이면 visual zone을 명확히 확보한다. 권장 비율은 hero card 폭의 28-40%, 높이의 40-70%이다.
- 3D 아래에는 `contact shadow` 또는 `soft surface patch`를 둬서 UI 표면 위에 서 있는 느낌을 만든다. 단, shadow는 KTDS shadow 토큰 또는 매우 약한 rgba만 사용한다.
- 정보형 B2B 화면에서는 3D를 대형 hero로 쓰지 않는다. 필요한 경우 작은 badge/accent로만 사용하거나 실사/차트/아이콘으로 대체한다.
- 음식, 커머스, 여행, 콘텐츠 탐색처럼 실물성이 중요한 화면은 무관한 3D보다 도메인 관련 실사/콘텐츠 이미지를 우선한다.
- 모든 이미지에는 `object-fit: cover` 또는 `contain`을 명확히 지정하고, `aspect-ratio`로 영역을 안정화한다.

### AI UX Principles For Generated Screens

- Transparency: AI 추천, 자동 점수, 예측 결과에는 `왜 추천했는지`를 한 줄 근거로 제공한다.
- Fairness: 사람/고객/직원 목록에서는 성별, 나이, 지역 등 민감 속성으로 차별적 우선순위를 암시하지 않는다.
- Accountability: 자동화 액션에는 확인, 되돌리기, 수정 가능한 CTA를 제공한다.
- Safety: 삭제, 결제, 전송, 승인 같은 위험 액션은 `Alert Dialog` 또는 명확한 confirm 패턴을 사용한다.
- Privacy: 개인정보는 마스킹하거나 최소 노출한다. 예: 전화번호/이메일/식별자는 전체 노출 대신 일부 생략.
- Reliability: 데이터가 없거나 로딩 중인 상태에는 `Empty`, `Loading`, `Skeleton`, `Toast` 등 공식 컴포넌트 패턴을 사용한다.

---

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 480px | 1열 레이아웃 · NavBottom 하단 · 카드 전체폭 · 컨테이너 padding=16px |
| Mobile-Large | 480–767px | NavBottom 유지 · 카드 최대 2열 가능 |
| Tablet | 768–1023px | NavTop 상단 · 카드 2–3열 · 컨테이너 padding=24px |
| Desktop | ≥ 1024px | 업무형은 NavSide 240px 좌측 · 탐색/커머스/브랜드형은 Header/GNB · 카드 3–4열 · max-width 1280px · 컨테이너 padding=40px |

### 터치 타깃

- 모든 인터랙티브 요소 최소 **44×44px** (WCAG AA)
- Primary Button: **48px** height
- List Item: min-height **56px**
- Tab Bar 아이콘 영역: **48px**
- Chip/Badge 32px → 모바일 padding 증가로 44px 확보

### 콜랩스 전략

- **Navigation**: 모바일(≤ 767px) → `NavBottom` 하단 · 태블릿 → `NavTop` 상단 · 데스크탑 업무형 → `NavSide` 240px 좌측 · 데스크탑 탐색/커머스/브랜드형 → `Header`/상단 GNB
- **Card Grid**: 데스크탑 3–4열 → 태블릿 2열 → 모바일 1열. 카드 간격은 모바일 `var(--spacing-base)`(16px), 태블릿 이상 `var(--spacing-md)`(20px)로 고정한다.
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
   - 전체 페이지 배경: `var(--color-primary-fill-neutral)` (항상)
   - 카드/모달/시트: `var(--color-surface)` (항상)
   - Primary 강조 영역: `var(--color-primary-fill-neutral)`
5. 버튼 radius는 항상 `var(--rounded-md)` (8px) — pill/full 금지 (FAB·Avatar·Chip 제외)
6. Spacing은 반드시 `var(--spacing-*)` 토큰으로만 사용 — 임의 px 금지
7. 상태 색상(Positive/Negative/Caution/Info) = 반드시 `var(--color-positive/negative/caution/info)`
8. Typography는 반드시 지정된 12개 토큰 중 선택 (display-lg/headline-lg/title-lg/title-md/body-lg/body-md/body-lg-medium/body-md-medium/label-lg/button-md/caption-lg/caption-sm)
9. 다크 모드는 별도 CSS 작성 없음 — `@media (prefers-color-scheme: dark)` 블록이 자동 처리
10. Drawer 전환 애니메이션은 `var(--dsx-transition-collapse)`, Dropdown/Tooltip은 `var(--dsx-transition-popover)` 사용

---

## Storybook Priority & Project Extensions

Storybook Docs에 명시된 import, props, token 값을 최우선으로 사용한다. Storybook에 없는 값은 임의로 만들지 말고, 아래처럼 **프로젝트 적용 규칙**으로 명확히 분리된 경우에만 사용한다.

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

- **데이터 차트/그래프**: `Chart`의 공식 API는 Storybook Docs 기준 `chartLabel`, `chartType`, `chartData`, `chartOptions`, `chartInfo`, `className`이다. 컬러 배열 `['#69A5FF', '#FF8C8C', '#FFC06E', '#88F03E', '#9E86FC']`는 프로젝트 예시 팔레트로만 사용한다.
- **로딩 스피너**: `border: 3px solid var(--color-border-alt)` + `border-top-color: var(--color-primary)` + `border-radius: 50%` + rotate animation 700ms linear infinite
- **아이콘 크기**: 16px (인라인/캡션), 20px (body), 24px (heading/list), 40px (empty state)
- **포커스 링**: `outline: 2px solid var(--color-primary)` + `outline-offset: 2px`
- **z-index 레이어**: 기본 콘텐츠 0 → Sticky 헤더 100 → Dropdown 200 → Modal/Dialog 300 → Snackbar/Toast 400 → Tooltip 500
- **애니메이션 타이밍**: hover/press `var(--dsx-transition-base)` · expand/collapse `var(--dsx-transition-collapse)` · fade `var(--dsx-transition-fade)` · popover `var(--dsx-transition-popover)`
- **Storybook stable 컴포넌트 우선:** `Accordion`, `List`, `Drawer`, `Slider`, `Stepper`, `Carousel` 등은 Storybook Docs 기준으로 사용 가능 컴포넌트다. 구현 시 각 Storybook 문서의 import/props/guideline을 우선한다.
- **Bottom Sheet 구현:** Storybook stable Docs의 `BottomSheet` 컴포넌트를 우선한다. `Drawer placement="bottom"`은 공식 BottomSheet를 사용할 수 없는 환경에서만 fallback으로 사용한다.
- **Editor 컴포넌트:** Storybook Docs에 등록되어 있으므로 사용 가능 목록에는 포함한다. 단, 실제 에디터 기능 범위와 플러그인 정책은 프로젝트 적용 전 Storybook 예제와 제품 정책을 함께 확인한다.

---

## CSS Implementation

Copy this `:root` block verbatim — AI must not alter these values:

```css
:root {
  /* ── KTDS Tokens ───────────────────────────────────────── */
  /* Colors */
  --color-primary: #1a75ff;
  --color-primary-text: #186ae8;
  --color-primary-text-neutral: #4891ff;
  --color-primary-fill: #1a75ff;
  --color-primary-fill-neutral: #F2F5F9;
  --color-primary-border: #1a75ff;
  --color-primary-border-neutral: #66a3ff;
  --color-primary-icon: #1a75ff;
  --color-primary-icon-neutral: #4891ff;
  --color-surface: #ffffff;
  --color-surface-alt: #f7f7f8;
  --color-text: #171719;
  --color-text-neutral: rgba(46,47,51,0.88);
  --color-text-alt: rgba(55,56,60,0.61);
  --color-text-assistive: rgba(55,56,60,0.28);
  --color-text-strong: #000000;
  --color-border: rgba(112,115,124,0.35);
  --color-border-neutral: rgba(112,115,124,0.28);
  --color-border-alt: rgba(112,115,124,0.16);
  --color-fill: rgba(112,115,124,0.22);
  --color-fill-neutral: rgba(112,115,124,0.12);
  --color-fill-alt: rgba(112,115,124,0.08);
  --color-fill-strong: rgba(112,115,124,0.35);
  --color-icon: #171719;
  --color-icon-neutral: rgba(46,47,51,0.88);
  --color-text-inactive: #989ba2;
  --color-border-inactive: #e1e2e4;
  --color-border-disabled: #eaebec;
  --color-fill-inactive: rgba(112,115,124,0.22);
  --color-fill-disabled: rgba(112,115,124,0.12);
  --color-dimmer: rgba(23,23,25,0.52);
  --color-inverse-text: #f7f7f8;
  --color-inverse-surface: #1b1c1e;
  --color-inverse-fill: rgba(112,115,124,0.22);
  --color-inverse-icon: #f7f7f8;
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
  --dsx-shadow-b2c-card: 0px 5px 10px rgba(0,0,0,0.05);
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

**Component heights:** Primary button = 48px · Input/Select = L 40px / M 32px / S 24px · List item min-height = 56px · Tab Bar icon area = 48px. 터치 환경에서는 44px 이상의 wrapper 또는 Large size 사용을 권장한다.

**Button-primary spec:** height 48px · padding `var(--spacing-lg)` horizontal (24px) · radius `var(--rounded-md)` (8px) · bg `var(--color-primary)` · color white.

**Card spec:** B2B card = `border: 1px solid var(--color-border-alt)` + `box-shadow: none`; B2C card = `border: 0` + `box-shadow: var(--dsx-shadow-b2c-card)`. Border와 shadow를 한 카드에 동시에 적용하지 않는다.

**Pretendard font CDN — HTML `<head>`에 반드시 포함:**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
```
`body { font-family: var(--font-sans); background-color: var(--color-primary-fill-neutral); }` 선언 필수.

**Surface 레이어 원칙 (반드시 준수):**
- 페이지/앱 전체 배경: `var(--color-primary-fill-neutral)` (#F2F5F9)
- 카드·모달·시트·컴포넌트 배경: `var(--color-surface)` (#FFFFFF)
- 섹션 강조 배경(Primary 관련): `var(--color-primary-fill-neutral)` (#F2F5F9)
- 절대로 페이지 전체 배경을 #FFFFFF(흰색)로 사용하지 말 것.

**다크 모드 CSS — HTML `<style>` 내 `:root` 블록 다음에 반드시 포함:**
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #1253b5;
    --color-primary-text: #1a75ff;
    --color-primary-text-neutral: #1253b5;
    --color-primary-fill: #1253b5;
    --color-primary-fill-neutral: #02060e;
    --color-primary-border: #4891ff;
    --color-primary-border-neutral: #1253b5;
    --color-primary-icon: #1a75ff;
    --color-primary-icon-neutral: #1253b5;
    --color-surface: #1b1c1e;
    --color-surface-alt: #0f0f10;
    --color-text: #f7f7f8;
    --color-text-neutral: rgba(194,196,200,0.88);
    --color-text-alt: rgba(174,176,182,0.61);
    --color-text-assistive: rgba(174,176,182,0.28);
    --color-text-strong: #ffffff;
    --color-border: rgba(112,115,124,0.52);
    --color-border-neutral: rgba(112,115,124,0.43);
    --color-border-alt: rgba(112,115,124,0.35);
    --color-fill: rgba(112,115,124,0.35);
    --color-fill-neutral: rgba(112,115,124,0.16);
    --color-fill-alt: rgba(112,115,124,0.12);
    --color-fill-strong: rgba(112,115,124,0.43);
    --color-icon: #f7f7f8;
    --color-icon-neutral: rgba(194,196,200,0.88);
    --color-surface-disabled: #2e2f33;
    --color-text-disabled: rgba(174,176,182,0.35);
    --color-surface-inactive: #333438;
    --color-text-inactive: #5a5c63;
    --color-border-inactive: #37383c;
    --color-border-disabled: #333438;
    --color-fill-inactive: rgba(112,115,124,0.22);
    --color-fill-disabled: rgba(112,115,124,0.12);
    --color-dimmer: rgba(23,23,25,0.74);
    --color-inverse-text: #171719;
    --color-inverse-surface: #f7f7f8;
    --color-inverse-fill: rgba(112,115,124,0.08);
    --color-inverse-icon: #171719;
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
배경: var(--color-primary-fill-neutral)

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
배경: var(--color-primary-fill-neutral)
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
배경: var(--color-primary-fill-neutral)

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
배경: var(--color-primary-fill-neutral)

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
배경: var(--color-primary-fill-neutral)
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

**앱 루트에 `AlertProvider` 필수 설정:**

```tsx
import { AlertProvider } from '@ktds-ui/context/AlertContext';

function App() {
  return (
    <AlertProvider>
      {/* 앱 콘텐츠 */}
    </AlertProvider>
  );
}
```

**컴포넌트에서 사용:**

```tsx
import { useAlert } from '@ktds-ui/context/AlertContext';

function MyComponent() {
  const { showAlert } = useAlert();

  // Alert — 닫기만 가능 (showCancel=false)
  const handleAlert = () => {
    showAlert('알림', '처리가 완료되었습니다.', () => {
      // 확인 후 콜백 (선택)
    });
  };

  // Confirm — 확인/취소 선택 (showCancel=true)
  const handleConfirm = () => {
    showAlert(
      '삭제 확인',
      '정말 삭제하시겠습니까?',
      () => {
        // 확인 클릭 시
        handleDelete();
      },
      true  // showCancel=true → 취소 버튼 표시
    );
  };
}
```

```
useAlert() 반환값:
  showAlert(title, message, onConfirm, showCancel=false)
  removeAlert()

showAlert 파라미터:
  title:       string   다이얼로그 제목
  message:     string   본문 메시지
  onConfirm:   func     확인 클릭 시 콜백
  showCancel:  bool     취소 버튼 표시 여부 (default: false)
```

| 구분 | showCancel | 설명 |
|------|-----------|------|
| Alert | false | 경고/안내 문구 + 확인 버튼 1개 (닫기만) |
| Confirm | true | 중요 이벤트 + 취소·확인 버튼 2개 (사용자 선택) |

- `#portal-root` DOM 포털에 렌더링 (z-index: 300)
- **`useAlert`는 `@ktds-ui/context/AlertContext`에서 import** (Toast와 동일한 패턴)
- `AlertProvider`가 없으면 hook 동작 안 함 — 앱 최상단에 반드시 래핑 필요

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

## Google Material Symbols Icon / IconButton

### Google Material Symbols Icon

Aide 생성 HTML/CSS 시안의 아이콘은 반드시 Google Material Symbols Rounded를 사용한다. DSCore SVG 아이콘, emoji, 외부 아이콘 세트, 임의 SVG path, 텍스트 약어로 대체하지 않는다.

생성 HTML에는 다음 리소스와 클래스를 사용한다.

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..700,0..1,0" rel="stylesheet">

<span class="material-symbols-rounded" aria-hidden="true">search</span>
<span class="material-symbols-rounded" aria-hidden="true">close</span>
<span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>
```

기본 CSS:

```css
.material-symbols-rounded {
  font-family: 'Material Symbols Rounded';
  font-weight: normal;
  font-style: normal;
  font-size: 20px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  font-feature-settings: 'liga';
  color: currentColor;
}
```

**주요 Material Symbol name 목록:**

| 카테고리 | name 목록 |
|----------|-----------|
| 방향 | chevron_left chevron_right keyboard_arrow_up keyboard_arrow_down arrow_back arrow_forward expand_more expand_less |
| 동작 | close add edit delete refresh share content_copy download upload more_vert more_horiz |
| 상태 | check check_circle info warning error cancel notifications notifications_active |
| UI | search calendar_month sort filter_list menu home settings person account_circle |
| 콘텐츠 | star favorite bookmark link folder visibility visibility_off image description receipt_long |
| 데이터 | analytics monitoring calculate query_stats bar_chart pie_chart table_chart |
| 커머스 | shopping_cart local_mall payments credit_card sell redeem |

- 아이콘 크기는 16px, 20px, 24px, 40px 중 하나를 사용한다.
- 아이콘 색상은 `currentColor`를 기본으로 하며 부모 텍스트/버튼 색상을 상속한다.
- 아이콘 ligature 텍스트가 보이면 렌더링 실패다. 예: `home`, `person`, `analytics`가 화면 텍스트처럼 보이면 안 된다.
- 아이콘만 클릭 가능한 경우 반드시 접근성 이름을 제공한다. 예: `aria-label="검색"`.
- Material Symbols는 아이콘 전용으로만 사용하고 일반 텍스트, 탭 레이블, 버튼 레이블을 대체하지 않는다.

---

### Material IconButton

특정 컨트롤 요소를 아이콘으로 표현할 때 사용. `children`은 접근성을 위해 필수.

```html
<button class="icon-button" type="button" aria-label="닫기">
  <span class="material-symbols-rounded" aria-hidden="true">close</span>
</button>

<button class="icon-button" type="button" aria-label="검색">
  <span class="material-symbols-rounded" aria-hidden="true">search</span>
</button>

<button class="icon-button" type="button" aria-label="더보기">
  <span class="material-symbols-rounded" aria-hidden="true">more_vert</span>
</button>
```

| prop | type | default | values |
|------|------|---------|--------|
| `name` | string | — | (required) Google Material Symbol name |
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
| `--dsx-color-primary-border-neutral` | `#66a3ff` |
| `--dsx-color-primary-fill-default` | `#1a75ff` |
| `--dsx-color-primary-fill-neutral` | `#F2F5F9` |
| `--dsx-color-primary-icon-default` | `#1a75ff` |
| `--dsx-color-primary-icon-neutral` | `#4891ff` |
| `--dsx-color-primary-text-default` | `#186ae8` |
| `--dsx-color-primary-text-neutral` | `#4891ff` |
| `--dsx-color-primary-surface-default` | `#ffffff` |
| `--dsx-color-primary-surface-neutral` | `#F2F5F9` |

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
| `--dsx-shadow-b2c-card` | `0px 5px 10px rgba(0,0,0,.05)` |
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

## CSS Implementation

```css
:root {
  /* === Brand Colors === */
  --color-primary: #1a75ff;
  --color-primary-text: #186ae8;
  --color-primary-text-neutral: #4891ff;
  --color-primary-fill: #1a75ff;
  --color-primary-fill-neutral: #F2F5F9;
  --color-primary-border: #1a75ff;
  --color-primary-border-neutral: #66a3ff;
  --color-primary-icon: #1a75ff;
  --color-primary-icon-neutral: #4891ff;
  --color-on-primary: #ffffff;

  /* === Surface === */
  --color-surface: #ffffff;
  --color-surface-alt: #f7f7f8;
  --color-surface-disabled: #f4f4f5;
  --color-surface-inactive: #eaebec;

  /* === Text (rgba semantic tokens) === */
  --color-text: #171719;
  --color-text-neutral: rgba(46,47,51,0.88);
  --color-text-alt: rgba(55,56,60,0.61);
  --color-text-assistive: rgba(55,56,60,0.28);
  --color-text-disabled: #caccce;
  --color-text-strong: #000000;

  /* === Border & Fill (rgba semantic tokens) === */
  --color-border: rgba(112,115,124,0.35);
  --color-border-alt: rgba(112,115,124,0.16);
  --color-fill: rgba(112,115,124,0.22);
  --color-fill-neutral: rgba(112,115,124,0.12);
  --color-fill-alt: rgba(112,115,124,0.08);

  /* === Icon === */
  --color-icon: #171719;
  --color-icon-neutral: #474a4f;

  /* === Status === */
  --color-positive: #00c244;
  --color-caution: #ff9200;
  --color-negative: #ff4242;
  --color-info: #0066ff;

  /* === Spacing === */
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

  /* === Rounded === */
  --rounded-none: 0px;
  --rounded-xs: 2px;
  --rounded-sm: 4px;
  --rounded-base: 6px;
  --rounded-md: 8px;
  --rounded-lg: 12px;
  --rounded-xl: 16px;
  --rounded-2xl: 20px;
  --rounded-full: 9999px;

  /* === DSX Shadows === */
  --dsx-shadow-1: 0px 1px 3px rgba(0,0,0,0.16);
  --dsx-shadow-b2c-card: 0px 5px 10px rgba(0,0,0,0.05);
  --dsx-shadow-2: 0px 3px 4px rgba(0,0,0,0.16);
  --dsx-shadow-3: 0px 8px 20px rgba(0,0,0,0.10);
  --dsx-shadow-4: 0px 18px 28px rgba(0,0,0,0.08);
  --dsx-shadow-5: 4px 16px 40px rgba(0,0,0,0.10);
  --dsx-shadow-6: 6px 32px 48px rgba(0,0,0,0.10);

  /* === DSX Transitions === */
  --dsx-transition-base: .2s ease-in-out;
  --dsx-transition-fade: .2s linear;
  --dsx-transition-collapse: .25s ease-out;
  --dsx-transition-popover: .16s cubic-bezier(.16, 1, .3, 1);
}
```
