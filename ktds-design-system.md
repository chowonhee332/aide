---
version: 1.0
name: KTDS Design System
description: KT DS(케이티 디에스) 공식 디자인 시스템. Material Design 3 기반의 시맨틱 토큰 아키텍처를 채택하며, Primary Blue(#1a75ff)를 브랜드 핵심 색상으로 사용한다. Light/Dark 모드를 완전 지원하며, 모든 색상은 Semantic 레이어를 통해 참조한다.

---

## Brand Identity
- Company: KT DS (케이티 디에스)
- Brand Color: #1a75ff (Primary/50)
- Design Philosophy: Clarity, Trust, Efficiency — 명확하고 신뢰감 있는 엔터프라이즈 UI
- Base: Material Design 3 semantic token architecture
- Modes: Light / Dark

---

## Color Palette (Primitive Tokens)

### Primary (Brand Blue)
  - Primary/5: #02060e
  - Primary/10: #0b316b
  - Primary/20: #0e408c
  - Primary/30: #1253b5
  - Primary/40: #186ae8
  - Primary/50: #1a75ff
  - Primary/60: #4891ff
  - Primary/70: #66a3ff
  - Primary/80: #96c0ff
  - Primary/90: #b8d4ff

### Neutral
  - Neutral/10 (darkest text): #171717
  - Neutral/30: #2a2a2a
  - Neutral/50: #767676
  - Neutral/80: #c8c8c8
  - Neutral/95: #f2f2f2
  - Neutral/99 (background): #f9f9f9

### Status Colors
  - Positive (Green): #00c471
  - Negative (Red): #f03030
  - Caution (Orange/Yellow): #ff8800
  - Info (Blue): #1a75ff

---

## Semantic Colors — Light Mode

### Primary (Brand Actions)
  - Primary/Text/default: `#186ae8`
  - Primary/Text/neutral: `#4891ff`
  - Primary/Fill/default: `#1a75ff`
  - Primary/Fill/neutral: `#f2f5f9`
  - Primary/Icon/default: `#1a75ff`
  - Primary/Icon/neutral: `#4891ff`
  - Primary/Border/default: `#1a75ff`
  - Primary/Border/neutral: `#66a3ff`

### Neutral (Text, Surface, Border, Icon)
  - Neutral/Text/default: `#171719`
  - Neutral/Text/neutral: `rgba(46, 47, 51, 0.88)`
  - Neutral/Text/alternative: `rgba(55, 56, 60, 0.61)`
  - Neutral/Text/assistive: `rgba(55, 56, 60, 0.28)`
  - Neutral/Text/strong: `#000000`
  - Neutral/Surface/default: `#ffffff`
  - Neutral/Surface/alternative: `#f7f7f8`
  - Neutral/Border/default: `rgba(112, 115, 124, 0.35)`
  - Neutral/Border/neutral: `rgba(112, 115, 124, 0.28)`
  - Neutral/Border/alternative: `rgba(112, 115, 124, 0.16)`
  - Neutral/Icon/default: `#171719`
  - Neutral/Icon/neutral: `rgba(46, 47, 51, 0.88)`
  - Neutral/Fill/default: `rgba(112, 115, 124, 0.22)`
  - Neutral/Fill/neutral: `rgba(112, 115, 124, 0.12)`
  - Neutral/Fill/alternative: `rgba(112, 115, 124, 0.08)`
  - Neutral/Fill/strong: `rgba(112, 115, 124, 0.35)`

### Interaction States
  - Interaction/Text/inactive: `#989ba2`
  - Interaction/Text/disabled: `rgba(55, 56, 60, 0.35)`
  - Interaction/Surface/inactive: `#eaebec`
  - Interaction/Surface/disabled: `#f4f4f5`
  - Interaction/Border/inactive: `#c2c4c8`
  - Interaction/Border/disabled: `#dbdcdf`
  - Interaction/Fill/inactive: `{Neutral.Fill.default}`
  - Interaction/Fill/disabled: `{Neutral.Fill.neutral}`
  - Interaction/Dimmer/dimmer: `rgba(23, 23, 25, 0.52)`

### Inverse (Dark-on-light surfaces)
  - Inverse/text-inverse: `#f7f7f8`
  - Inverse/background-inverse: `#1b1c1e`
  - Inverse/fill-inverse: `rgba(112, 115, 124, 0.22)`
  - Inverse/icon-inverse: `#f7f7f8`

### Status
  - Status/Normal/Text/default: `#5a5c63`
  - Status/Normal/Text/neutral: `#878a93`
  - Status/Normal/Fill/default: `#46474c`
  - Status/Normal/Fill/neutral: `#eaebec`
  - Status/Normal/Border/default: `#70737c`
  - Status/Normal/Border/neutral: `#989ba2`
  - Status/Normal/Icon/default: `#70737c`
  - Status/Normal/Icon/neutral: `#878a93`
  - Status/Positive/Text/default: `#009632`
  - Status/Positive/Text/neutral: `#1ed45a`
  - Status/Positive/Fill/default: `#00bf40`
  - Status/Positive/Fill/neutral: `#d9ffe6`
  - Status/Positive/Border/default: `#00bf40`
  - Status/Positive/Border/neutral: `#49e57d`
  - Status/Positive/Icon/default: `#00bf40`
  - Status/Positive/Icon/neutral: `#1ed45a`
  - Status/Info/Text/default: `#0054d1`
  - Status/Info/Text/neutral: `#3385ff`
  - Status/Info/Fill/default: `#0066ff`
  - Status/Info/Fill/neutral: `#eaf2fe`
  - Status/Info/Border/default: `#0066ff`
  - Status/Info/Border/neutral: `#69a5ff`
  - Status/Info/Icon/default: `#0066ff`
  - Status/Info/Icon/neutral: `#3385ff`
  - Status/Caution/Text/default: `#d47800`
  - Status/Caution/Text/neutral: `#ffa938`
  - Status/Caution/Fill/default: `#ff9200`
  - Status/Caution/Fill/neutral: `#fef4e6`
  - Status/Caution/Border/default: `#ff9200`
  - Status/Caution/Border/neutral: `#ffc06e`
  - Status/Caution/Icon/default: `#ff9200`
  - Status/Caution/Icon/neutral: `#ffa938`
  - Status/Negative/Text/default: `#e52222`
  - Status/Negative/Text/neutral: `#ff6363`
  - Status/Negative/Fill/default: `#ff4242`
  - Status/Negative/Fill/neutral: `#feecec`
  - Status/Negative/Border/default: `#ff4242`
  - Status/Negative/Border/neutral: `#ff8c8c`
  - Status/Negative/Icon/default: `#ff4242`
  - Status/Negative/Icon/neutral: `#ff6363`

---

## Semantic Colors — Dark Mode (Key Differences)
  - Primary/Text/default (dark): `#1a75ff`
  - Primary/Fill/default (dark): `#1253b5`
  - Neutral/Text/default (dark): `#f7f7f8`
  - Neutral/Surface/default (dark): `#1b1c1e`
  - Neutral/Surface/alternative (dark): `#0f0f10`
  - Neutral/Border/default (dark): `rgba(112, 115, 124, 0.52)`

---

## Spacing System (8px Grid)
  - None: 0px
  - Spacing 2: 2px
  - Spacing 4: 4px
  - Spacing 8: 8px
  - Spacing 12: 12px
  - Spacing 16: 16px
  - Spacing 20: 20px
  - Spacing 24: 24px
  - Spacing 28: 28px
  - Spacing 32: 32px
  - Spacing 40: 40px
  - Spacing 48: 48px
  - Spacing 56: 56px
  - Spacing 64: 64px
  - Spacing 72: 72px
  - Spacing 80: 80px

---

## Corner Radius
  - None: 0px
  - Radius 2: 2px
  - Radius 4: 4px
  - Radius 6: 6px
  - Radius 8: 8px
  - Radius 12: 12px
  - Radius 16: 16px
  - Radius 20: 20px
  - Radius 24: 24px
  - Radius 28: 28px
  - Radius 32: 32px
  - Circular: 9999px (circular/pill)

---

## Border Width
  - None: 0px
  - Border 1: 1px
  - Boder 2: 2px
  - Border 4: 4px
  - Border 6: 6px
  - Border 8: 8px
  - Border 10: 10px

---

## Typography
- Primary Font: Pretendard (한국어), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Scale:
  - Display: 32px / weight 700 / letter-spacing -0.5px
  - Headline: 24px / weight 700 / letter-spacing -0.3px
  - Title1: 20px / weight 600
  - Title2: 18px / weight 600
  - Body1: 16px / weight 400 / line-height 1.5
  - Body2: 14px / weight 400 / line-height 1.5
  - Caption1: 12px / weight 400 / line-height 1.4
  - Caption2: 11px / weight 400

---

## Component Patterns

### Buttons
- Primary: background Primary/Fill/default (#1a75ff), text #ffffff, border-radius 8px, height 48px, padding 0 24px
- Secondary: border 1px Primary/Border/default, text Primary/Text/default, background transparent
- Tertiary: text Primary/Text/default, no border, no background
- Disabled: background Interaction/Surface/disabled, text Interaction/Text/disabled
- Circular/icon: border-radius 9999px (Circular token)

### Input Fields
- Height: 52px
- Border: 1px solid Neutral/Border/default
- Border-radius: 8px (Radius 8)
- Focus: border-color Primary/Border/default
- Error: border-color Status/Negative
- Label: 14px / Neutral/Text/neutral
- Placeholder: Neutral/Text/assistive

### Cards
- Background: Neutral/Surface/default (#ffffff Light)
- Border: 1px solid Neutral/Border/alternative
- Border-radius: 16px (Radius 16)
- Box-shadow: 0 2px 8px rgba(0,0,0,0.06)
- Padding: 20px (Spacing 20)

### Navigation / Tab Bar
- Active icon/text: Primary/Fill/default (#1a75ff)
- Inactive: Neutral/Icon/neutral
- Background: Neutral/Surface/default
- Border-top: 1px solid Neutral/Border/alternative

### Status Indicators
- Positive (success/complete): #00c471 background, white text
- Negative (error/fail): #f03030 background, white text
- Caution (warning): #ff8800 background, white text
- Info: Primary blue
- Badge/chip border-radius: Circular (9999px)

### List Items
- Height: 56px min
- Padding: 0 16px (Spacing 16)
- Divider: 1px solid Neutral/Border/alternative
- Leading icon: 24px, Neutral/Icon/default
- Trailing chevron: 16px, Neutral/Icon/neutral

---

## Design Principles
1. **명확성**: 시맨틱 토큰 사용 → 색상 직접 참조 금지, 반드시 역할(Text/Fill/Border/Icon/Surface) 기반 토큰 사용
2. **신뢰감**: Primary Blue(#1a75ff)를 핵심 인터랙션에만 집중 사용 (남용 금지)
3. **일관성**: 8px 그리드 엄수, Radius 토큰만 사용
4. **접근성**: Neutral/Text/default vs Surface/default 대비율 4.5:1 이상 유지
5. **다크모드**: 모든 색상은 Semantic 레이어로 참조해 자동으로 Light/Dark 전환
