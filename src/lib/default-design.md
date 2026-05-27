---
version: "alpha"
name: "Material Design 3"
description: "Google Material Design 3 (Material You) — 역할 기반 컬러 시스템, 토널 서피스, 표현력 있는 타이포그래피. 컬러는 도메인·브랜드에 맞게 AI가 직접 결정하는 적응형 시스템."
adaptive: true
md3: true
colors:
  primary: "[도메인·브랜드 컨텍스트 기반 AI 결정 — 서비스 정체성을 가장 잘 표현하는 컬러]"
  on-primary: "#ffffff"
  primary-container: "[primary를 10~15% 불투명도로 적용한 연한 배경색]"
  on-primary-container: "[primary-container 위 텍스트 — 대비율 4.5:1 이상]"
  secondary: "[primary와 조화로운 보조 컬러]"
  on-secondary: "#ffffff"
  secondary-container: "[secondary의 연한 배경색]"
  on-secondary-container: "[secondary-container 위 텍스트]"
  tertiary: "[선택적 3번째 강조 컬러 — 없으면 secondary 활용]"
  on-tertiary: "#ffffff"
  tertiary-container: "[tertiary의 연한 배경색]"
  on-tertiary-container: "[tertiary-container 위 텍스트]"
  error: "#B3261E"
  on-error: "#ffffff"
  error-container: "#F9DEDC"
  on-error-container: "#410E0B"
  background: "[surface보다 약간 어두운 페이지 배경]"
  on-background: "#1C1B1F"
  surface: "#fef7ff"
  on-surface: "#1d1b20"
  surface-container-low: "#f7f2fa"
  surface-container: "#f3edf7"
  surface-container-high: "#ece6f0"
  surface-container-highest: "#e6e0e9"
  surface-variant: "[surface보다 약간 어두운 구분용 배경]"
  on-surface-variant: "#49454F"
  outline: "#79747E"
  outline-variant: "#CAC4D0"
  inverse-surface: "#313033"
  inverse-on-surface: "#F4EFF4"
  inverse-primary: "[primary의 라이트-온-다크 버전]"
  surface-tint: "[primary — 토널 서피스 오버레이에 사용]"
  scrim: "#000000"

typography:
  display-large:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "57px"
    fontWeight: "400"
    lineHeight: "64px"
    letterSpacing: "-0.25px"
  display-medium:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "45px"
    fontWeight: "400"
    lineHeight: "52px"
    letterSpacing: "0px"
  display-small:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "36px"
    fontWeight: "400"
    lineHeight: "44px"
    letterSpacing: "0px"
  headline-large:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "32px"
    fontWeight: "400"
    lineHeight: "40px"
    letterSpacing: "0px"
  headline-medium:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "28px"
    fontWeight: "400"
    lineHeight: "36px"
    letterSpacing: "0px"
  headline-small:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "24px"
    fontWeight: "400"
    lineHeight: "32px"
    letterSpacing: "0px"
  title-large:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "22px"
    fontWeight: "400"
    lineHeight: "28px"
    letterSpacing: "0px"
  title-medium:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: "500"
    lineHeight: "24px"
    letterSpacing: "0.15px"
  title-small:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: "500"
    lineHeight: "20px"
    letterSpacing: "0.1px"
  body-large:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "24px"
    letterSpacing: "0.5px"
  body-medium:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "20px"
    letterSpacing: "0.25px"
  body-small:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: "400"
    lineHeight: "16px"
    letterSpacing: "0.4px"
  label-large:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: "500"
    lineHeight: "20px"
    letterSpacing: "0.1px"
  label-medium:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: "500"
    lineHeight: "16px"
    letterSpacing: "0.5px"
  label-small:
    fontFamily: "Roboto, Pretendard, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: "500"
    lineHeight: "16px"
    letterSpacing: "0.5px"

rounded:
  none: "0px"
  extra-small: "4px"
  small: "8px"
  medium: "12px"
  large: "16px"
  extra-large: "28px"
  full: "9999px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  gutter: "16px"

elevation:
  level0: "none"
  level1: "0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)"
  level2: "0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)"
  level3: "0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px rgba(0,0,0,0.3)"
  level4: "0px 6px 10px 4px rgba(0,0,0,0.15), 0px 2px 3px rgba(0,0,0,0.3)"
  level5: "0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px rgba(0,0,0,0.3)"

components:
  button-filled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    height: "40px"
    padding: "0 24px"
  button-filled-tonal:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    height: "40px"
    padding: "0 24px"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    borderColor: "{colors.outline}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    height: "40px"
    padding: "0 24px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-large}"
    height: "40px"
    padding: "0 12px"
  button-elevated:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.primary}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    height: "40px"
    shadow: "{elevation.level1}"
  fab:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.large}"
    size: "56px"
  fab-small:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.medium}"
    size: "40px"
  card-filled:
    backgroundColor: "{colors.surface-container-highest}"
    rounded: "{rounded.medium}"
    padding: "{spacing.md}"
  card-outlined:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.outline-variant}"
    rounded: "{rounded.medium}"
    padding: "{spacing.md}"
  card-elevated:
    backgroundColor: "{colors.surface-container-low}"
    rounded: "{rounded.medium}"
    padding: "{spacing.md}"
    shadow: "{elevation.level1}"
  input-filled:
    backgroundColor: "{colors.surface-variant}"
    textColor: "{colors.on-surface}"
    borderBottomColor: "{colors.on-surface-variant}"
    typography: "{typography.body-large}"
    borderRadius: "4px 4px 0 0"
    height: "56px"
    padding: "0 16px"
  input-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.outline}"
    typography: "{typography.body-large}"
    rounded: "{rounded.extra-small}"
    height: "56px"
    padding: "0 16px"
  chip-assist:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-variant}"
    borderColor: "{colors.outline}"
    rounded: "{rounded.full}"
    height: "32px"
    padding: "0 16px"
  chip-filter-selected:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.full}"
    height: "32px"
    padding: "0 16px"
  navigation-bar:
    backgroundColor: "{colors.surface-container}"
    indicatorColor: "{colors.secondary-container}"
    height: "80px"
  navigation-rail:
    backgroundColor: "{colors.surface}"
    indicatorColor: "{colors.secondary-container}"
    width: "80px"
  navigation-drawer:
    backgroundColor: "{colors.surface-variant}"
    activeColor: "{colors.secondary-container}"
    width: "360px"
  list-item:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-large}"
    height: "56px"
    padding: "0 16px"
  divider:
    backgroundColor: "{colors.outline-variant}"
    height: "1px"
  badge:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.label-small}"
    rounded: "{rounded.full}"
  dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.extra-large}"
    padding: "24px"
    maxWidth: "560px"
    shadow: "{elevation.level3}"
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.extra-large}"
    padding: "28px 16px"
  snackbar:
    backgroundColor: "{colors.inverse-surface}"
    textColor: "{colors.inverse-on-surface}"
    rounded: "{rounded.extra-small}"
    padding: "14px 16px"
    minWidth: "288px"
    maxWidth: "568px"
---

# Material Design 3

## Overview

Google Material Design 3 (Material You) — 사용자 중심 표현 시스템. 역할 기반 컬러, 토널 서피스, 확장된 모션 시스템을 특징으로 한다. 컬러는 도메인·브랜드 컨텍스트에 맞게 AI가 직접 결정한다.

- **컬러 시스템**: Primary / Secondary / Tertiary 3가지 역할 컬러 + 각 역할의 Container 변형
- **토널 서피스**: surface → surface-variant → surface-tint 순으로 명도 계층
- **라운딩**: Extra-small(4px) → Small(8px) → Medium(12px) → Large(16px) → Extra-large(28px) → Full

## Colors

도메인별 권장 Primary 컬러 기준:

- **금융/결제**: 신뢰감 있는 네이비·블루 (예: #1A56DB, #0040C4)
- **쇼핑/커머스**: 에너지 있는 오렌지·레드 (예: #FF6B00, #E03131)
- **헬스/의료**: 생동감 있는 그린·민트 (예: #0CA678, #2F9E44)
- **음식/배달**: 식욕 자극하는 오렌지·레드 (예: #F76707, #E64919)
- **업무/생산성**: 집중력 높이는 인디고·퍼플 (예: #4C6EF5, #7048E8)
- **SNS/커뮤니티**: 활기찬 바이올렛·핑크 (예: #7950F2, #E64980)
- **여행/숙박**: 설레는 시안·터쿼이즈 (예: #0C8599, #15AABF)
- **교육/학습**: 신뢰·지성의 딥블루·그린 (예: #1971C2, #2F9E44)
- **엔터테인먼트**: 강렬한 비비드 (예: #AE3EC9, #E03131)
- **비즈니스/SaaS**: 전문성의 슬레이트·블루 (예: #364FC7, #1864AB)

primary는 CTA·active 요소에만 사용하고, 나머지는 on-surface-variant 등 무채색으로 절제한다. on-primary는 대비율 4.5:1(WCAG AA) 이상을 확보한다.

## Typography

Google Fonts에서 Roboto 사용 또는 Pretendard로 대체:
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
```

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| display-large | 57px | 400 | 64px |
| display-medium | 45px | 400 | 52px |
| headline-large | 32px | 400 | 40px |
| headline-medium | 28px | 400 | 36px |
| headline-small | 24px | 400 | 32px |
| title-large | 22px | 400 | 28px |
| title-medium | 16px | 500 | 24px |
| body-large | 16px | 400 | 24px |
| body-medium | 14px | 400 | 20px |
| label-large | 14px | 500 | 20px |
| label-medium | 12px | 500 | 16px |

## Layout & Elevation

### Elevation (토널 오버레이)
MD3의 Elevation은 shadow + surface-tint 컬러 오버레이 조합으로 표현한다:

| Level | Shadow | Surface Tint Opacity |
|-------|--------|---------------------|
| 0 | none | 0% |
| 1 | 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15) | 5% |
| 2 | 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15) | 8% |
| 3 | 0 4px 8px 3px rgba(0,0,0,.15), 0 1px 3px rgba(0,0,0,.3) | 11% |
| 4 | 0 6px 10px 4px rgba(0,0,0,.15), 0 2px 3px rgba(0,0,0,.3) | 12% |
| 5 | 0 8px 12px 6px rgba(0,0,0,.15), 0 4px 4px rgba(0,0,0,.3) | 14% |

## Components

### Button
- **Filled**: solid primary — 가장 강조되는 CTA
- **Filled Tonal**: secondary-container — 중간 강조
- **Outlined**: border outline — 보조 액션
- **Text**: primary 텍스트만 — 덜 강조되는 액션
- **Elevated**: surface + elevation 1 — 플로팅 액션

모든 버튼: `border-radius: 9999px` (full pill), height 40px, label-large typography

### Card
- **Elevated**: surface + elevation 1 shadow
- **Filled**: surface-variant 배경 (shadow 없음)
- **Outlined**: surface 배경 + outline-variant border

모든 카드: `border-radius: 12px`, padding 16px

### Input
- **Filled**: surface-variant 배경, 하단 border만 표시, 상단 라운드 4px
- **Outlined**: border 전체, border-radius: 4px

Label은 필드 위에 배치 (floating label — 포커스 시 상단으로 이동). 포커스 시 border-color → primary.

### Navigation
- **Navigation Bar** (Mobile, ≤600px): 하단 고정, 높이 80px, 아이콘 + 레이블 + indicator pill
- **Navigation Rail** (Tablet, 600–1240px): 좌측 80px 레일, 아이콘 + indicator
- **Navigation Drawer** (Desktop, ≥1240px): 좌측 360px, surface-variant 배경, full labels

### FAB (Floating Action Button)
- **Regular FAB**: 56×56px, border-radius: 16px (large), primary-container
- **Small FAB**: 40×40px, border-radius: 12px (medium)
- **Extended FAB**: 56px 높이, border-radius: full, 아이콘 + 텍스트

### Dialog
- border-radius: 28px (extra-large), max-width 560px
- 헤더(headline-small) + 본문(body-medium) + 버튼 행 (text 또는 filled)
- overlay: rgba(0,0,0,0.32) scrim

### Snackbar
- inverse-surface 배경 (#313033), inverse-on-surface 텍스트
- 하단 고정 center, border-radius: 4px
- 최소 288px, 최대 568px

## Do's and Don'ts

- DO: primary는 CTA·active 요소 하나로 집중
- DO: container 색상(primary-container, secondary-container)으로 강조 없는 영역 처리
- DO: surface-tint로 토널 서피스 레이어링 표현
- DO: 버튼은 반드시 pill(full) 형태 — MD3의 가장 강력한 정체성
- DON'T: shadow만으로 elevation 표현 — tonal overlay 병행 필수
- DON'T: CSS 속성에 #hex 직접 사용 — 반드시 var(--color-*) CSS 변수로 선언 후 참조
- DON'T: 동일 역할에 여러 컬러 혼용 — primary/secondary/tertiary 역할 구분 엄수

## CSS Implementation

```css
:root {
  /* === Primary (AI가 도메인에 맞게 결정) === */
  --color-primary: #6750A4;              /* Material Baseline Purple — AI가 도메인에 맞게 교체 */
  --color-on-primary: #ffffff;
  --color-primary-container: #EADDFF;
  --color-on-primary-container: #21005D;

  /* === Secondary === */
  --color-secondary: #625B71;
  --color-on-secondary: #ffffff;
  --color-secondary-container: #E8DEF8;
  --color-on-secondary-container: #1D192B;

  /* === Tertiary === */
  --color-tertiary: #7D5260;
  --color-on-tertiary: #ffffff;
  --color-tertiary-container: #FFD8E4;
  --color-on-tertiary-container: #31111D;

  /* === Error === */
  --color-error: #B3261E;
  --color-on-error: #ffffff;
  --color-error-container: #F9DEDC;
  --color-on-error-container: #410E0B;

  /* === Surface === */
  --color-background: #fef7ff;
  --color-on-background: #1d1b20;
  --color-surface: #fef7ff;
  --color-on-surface: #1d1b20;
  --color-surface-container-low: #f7f2fa;
  --color-surface-container: #f3edf7;
  --color-surface-container-high: #ece6f0;
  --color-surface-container-highest: #e6e0e9;
  --color-surface-variant: #E7E0EC;
  --color-on-surface-variant: #49454F;
  --color-surface-tint: #6750A4;        /* primary와 동일 */

  /* === Outline === */
  --color-outline: #79747E;
  --color-outline-variant: #CAC4D0;

  /* === Inverse === */
  --color-inverse-surface: #313033;
  --color-inverse-on-surface: #F4EFF4;
  --color-inverse-primary: #D0BCFF;

  /* === Scrim === */
  --color-scrim: #000000;

  /* === Elevation (Shadow) === */
  --elevation-1: 0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15);
  --elevation-2: 0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15);
  --elevation-3: 0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px rgba(0,0,0,0.3);
  --elevation-4: 0px 6px 10px 4px rgba(0,0,0,0.15), 0px 2px 3px rgba(0,0,0,0.3);
  --elevation-5: 0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px rgba(0,0,0,0.3);

  /* === Rounded (Shape) === */
  --rounded-none: 0px;
  --rounded-extra-small: 4px;
  --rounded-small: 8px;
  --rounded-medium: 12px;
  --rounded-large: 16px;
  --rounded-extra-large: 28px;
  --rounded-full: 9999px;

  /* === Spacing === */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
}

/* ===== MD3 Component Baseline (v2.4.1) ===== */

/* Button — 공통: height 40px, pill shape */
.md3-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 40px; border-radius: 9999px; border: none; cursor: pointer;
  font: 500 0.875rem/1.25rem 'Roboto', sans-serif; letter-spacing: 0.00625rem;
}
.md3-btn-filled   { padding: 0 24px; background: var(--color-primary); color: var(--color-on-primary); }
.md3-btn-tonal    { padding: 0 24px; background: var(--color-secondary-container); color: var(--color-on-secondary-container); }
.md3-btn-outlined { padding: 0 24px; background: transparent; border: 1px solid var(--color-outline); color: var(--color-primary); }
.md3-btn-text     { padding: 0 12px; background: transparent; color: var(--color-primary); }
.md3-btn-elevated { padding: 0 24px; background: var(--color-surface-container-low); color: var(--color-primary); box-shadow: var(--elevation-1); }
.md3-btn:disabled { background: rgba(29,27,32,0.12) !important; color: rgba(29,27,32,0.38) !important; box-shadow: none !important; border: none !important; }

/* Card — 공통: border-radius 12px */
.md3-card          { border-radius: 12px; padding: 16px; }
.md3-card-elevated { background: var(--color-surface-container-low); box-shadow: var(--elevation-1); }
.md3-card-filled   { background: var(--color-surface-container-highest); }
.md3-card-outlined { background: var(--color-surface); border: 1px solid var(--color-outline-variant); }

/* Chip — 공통: height 32px, pill shape */
.md3-chip { height: 32px; border-radius: 9999px; padding: 0 16px; font: 500 0.875rem/1.25rem 'Roboto', sans-serif; display: inline-flex; align-items: center; cursor: pointer; }
.md3-chip-assist   { background: transparent; border: 1px solid var(--color-outline); color: var(--color-on-surface-variant); }
.md3-chip-filter   { background: transparent; border: 1px solid var(--color-outline); color: var(--color-on-surface-variant); }
.md3-chip-filter.selected { background: var(--color-secondary-container); border: none; color: var(--color-on-secondary-container); }

/* Navigation Bar (Mobile) — height 80px, pill indicator 64×32px */
.md3-nav-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 80px; background: var(--color-surface-container); display: flex; justify-content: space-around; align-items: center; padding: 0 8px; }
.md3-nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; font: 500 0.75rem/1rem 'Roboto', sans-serif; min-width: 48px; }
.md3-nav-indicator { width: 64px; height: 32px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; }
.md3-nav-item.active .md3-nav-indicator { background: var(--color-secondary-container); }
.md3-nav-item.active   .md3-nav-label   { color: var(--color-on-surface); font-weight: 700; }
.md3-nav-item.inactive .md3-nav-indicator { background: transparent; }
.md3-nav-item.inactive .md3-nav-label   { color: var(--color-on-surface-variant); }

/* Navigation Rail (Web) — width 80px */
.md3-nav-rail { position: fixed; left: 0; top: 0; width: 80px; height: 100vh; background: var(--color-surface); display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 4px; }
.md3-nav-rail .md3-nav-item { width: 56px; height: 56px; justify-content: center; border-radius: 9999px; }
.md3-nav-rail .md3-nav-item.active   { background: var(--color-secondary-container); color: var(--color-on-secondary-container); }
.md3-nav-rail .md3-nav-item.inactive { color: var(--color-on-surface-variant); }

/* FAB */
.md3-fab         { width: 56px; height: 56px; border-radius: 16px; background: var(--color-surface-container-high); color: var(--color-primary); box-shadow: var(--elevation-3); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.md3-fab-primary { background: var(--color-primary-container); color: var(--color-on-primary-container); }
.md3-fab-large   { width: 96px; height: 96px; border-radius: 28px; }
.md3-fab-small   { width: 40px; height: 40px; border-radius: 12px; }

/* Dialog — border-radius 28px */
.md3-dialog          { border-radius: 28px; max-width: 560px; width: 100%; padding: 24px; background: var(--color-surface-container-high); box-shadow: var(--elevation-3); }
.md3-dialog-headline { font: 400 1.5rem/2rem 'Roboto', sans-serif; color: var(--color-on-surface); margin-bottom: 16px; }
.md3-dialog-body     { font: 400 0.875rem/1.25rem 'Roboto', sans-serif; color: var(--color-on-surface-variant); margin-bottom: 24px; }
.md3-scrim           { position: fixed; inset: 0; background: rgba(0,0,0,0.32); }

/* Snackbar */
.md3-snackbar        { border-radius: 4px; background: var(--color-inverse-surface); color: var(--color-inverse-on-surface); padding: 14px 16px; min-width: 288px; max-width: 568px; box-shadow: var(--elevation-3); font: 400 0.875rem/1.25rem 'Roboto', sans-serif; }
.md3-snackbar-action { color: var(--color-inverse-primary); font-weight: 500; background: none; border: none; cursor: pointer; }
```
