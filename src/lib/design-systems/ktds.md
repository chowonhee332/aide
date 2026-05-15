---
name: KTDS Design System
version: "1.0.0"
md3Base: true
tokens:
  colors:
    # Brand
    primary:              "#1a75ff"
    primary-text:         "#155dd8"
    primary-fill-neutral: "#f2f5f9"
    primary-border:       "#1a75ff"
    # Neutral Surface / Text
    surface:              "#ffffff"
    surface-alt:          "#f7f7f8"
    text:                 "#16171a"
    text-neutral:         "rgba(46,47,51,0.88)"
    text-alternative:     "rgba(53,54,58,0.61)"
    text-assistive:       "rgba(53,54,58,0.28)"
    text-strong:          "#000000"
    # Neutral Border / Fill / Icon
    border:               "rgba(112,115,120,0.35)"
    border-neutral:       "rgba(112,115,120,0.28)"
    border-alt:           "rgba(112,115,120,0.16)"
    fill:                 "rgba(112,115,120,0.22)"
    fill-neutral:         "rgba(112,115,120,0.12)"
    fill-alt:             "rgba(112,115,120,0.08)"
    icon:                 "#16171a"
    # Status
    positive:             "#00c244"
    caution:              "#ff9200"
    negative:             "#ff4242"
    info:                 "#0066ff"
  typography:
    display:
      fontSize: "32px"
      fontWeight: 700
      lineHeight: 1.25
      letterSpacing: "-0.5px"
    headline:
      fontSize: "24px"
      fontWeight: 700
      lineHeight: 1.33
      letterSpacing: "-0.3px"
    title1:
      fontSize: "20px"
      fontWeight: 600
      lineHeight: 1.4
    title2:
      fontSize: "18px"
      fontWeight: 600
      lineHeight: 1.44
    body1:
      fontSize: "16px"
      fontWeight: 400
      lineHeight: 1.5
    body2:
      fontSize: "14px"
      fontWeight: 400
      lineHeight: 1.5
    caption1:
      fontSize: "12px"
      fontWeight: 400
      lineHeight: 1.4
    caption2:
      fontSize: "11px"
      fontWeight: 400
      lineHeight: 1.36
  rounded:
    none: "0px"
    xs:   "2px"
    sm:   "4px"
    md:   "8px"
    lg:   "12px"
    xl:   "16px"
    2xl:  "20px"
    full: "9999px"
  spacing:
    xxs: "4px"
    xs: "8px"
    sm: "12px"
    base: "16px"
    md: "20px"
    lg: "24px"
    lg-alt: "28px"
    xl: "32px"
    2xl: "40px"
    3xl: "48px"
    4xl: "56px"
    section: "64px"
    5xl: "72px"
    6xl: "80px"
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

## MD3 구조 지침

⚠️ 이 시스템은 **Material Design 3 컴포넌트 구조**를 기반으로 한다. HTML/CSS를 생성할 때 MD3 컴포넌트 패턴을 그대로 사용하고, 위의 `--md-sys-*` CSS 변수로 스타일을 오버라이드하라.

**MD3 컴포넌트 → KTDS 구현 매핑:**

| MD3 컴포넌트 | KTDS 스펙 |
|---|---|
| Filled Button | height 48px · `var(--rounded-md)` · bg `var(--color-primary)` · text white |
| Outlined Button | height 48px · `var(--rounded-md)` · border 1px `var(--color-primary)` · text `var(--color-primary-text)` |
| Text Button | height 48px · no border/bg · text `var(--color-primary-text)` |
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
Primary:   bg={colors.primary}  text=white  h=48px  px=24px  r={rounded.md}
Secondary: bg=transparent  border=1px {colors.primary-border}  text={colors.primary-text}  h=48px
Tertiary:  bg=transparent  text={colors.primary-text}  (no border)
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
