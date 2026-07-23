---
version: alpha
name: Aide Design System
description: "Aide default DESIGN.md. Based on Wanted Montage tokens, optimized for AI-generated HTML screens. Use Aide brand identity, Google Material Symbols, compact mobile-app rhythm, fixed top navigation, scrollable content, bottom navigation or bottom action area, content-dense sections, and stable variant archetype fidelity."

principles:
  - "App-native, not landing-page-first: build the usable product screen immediately."
  - "Compact and content-dense: every screen must feel like a real service with enough data, states, and actions."
  - "Fixed chrome, scrollable body: top navigation stays visible; content scrolls; bottom nav/action never covers content."
  - "Blue-led hierarchy: primary blue is for CTA, active state, KPI, and selection only."
  - "Archetype fidelity: final HTML must preserve the selected variant strategy, section rhythm, visual role, and CTA location."

brand:
  name: Aide
  logoSlot: '<span class="aide-logo-slot" aria-label="brand logo"></span>'
  forbiddenNames: ["Wanted", "Montage", "WDS", "원티드"]
  iconSystem: "Google Material Symbols only"
  iconExample: '<span class="material-symbols-rounded">home</span>'

tokens:
  colors:
    primary: "#0066FF"
    primary-strong: "#005EEB"
    primary-heavy: "#0054D1"
    primary-soft: "#EAF2FE"
    primary-tint: "rgba(0,102,255,0.08)"
    on-primary: "#FFFFFF"
    page: "#F7F7F8"
    surface: "#FFFFFF"
    surface-muted: "#F4F4F5"
    text: "#171719"
    text-strong: "#000000"
    text-neutral: "rgba(46,47,51,0.88)"
    text-muted: "rgba(55,56,60,0.61)"
    text-assistive: "rgba(55,56,60,0.28)"
    text-disabled: "rgba(55,56,60,0.16)"
    border: "rgba(112,115,124,0.16)"
    border-alt: "rgba(112,115,124,0.08)"
    fill: "rgba(112,115,124,0.08)"
    fill-strong: "rgba(112,115,124,0.16)"
    positive: "#00BF40"
    caution: "#FF9200"
    negative: "#FF4242"
  type:
    family: "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    display: "32px/44px 700, letter-spacing -0.8px"
    title: "24px/32px 700, letter-spacing -0.55px"
    heading: "22px/30px 700, letter-spacing -0.43px"
    headline: "18px/26px 700"
    body: "16px/24px 400"
    body-sm: "15px/22px 400"
    label: "14px/20px 600"
    button: "14px/20px 500"
    caption: "12px/16px 400"
  spacing:
    page-padding: 16px
    page-padding-web: 24px
    section-gap: 16px
    card-padding: 16px
    card-gap: 12px
    item-gap: 8px
  radius:
    control: 12px
    card: 16px
    sheet: 20px
    pill: 9999px
  shadow:
    card: "0px 2px 4px -2px rgba(23,23,23,0.06), 0px 4px 6px -1px rgba(23,23,23,0.06)"
    popover: "0px 1px 2px rgba(23,23,23,0.04), 0px 4px 8px -4px rgba(23,23,23,0.06), 0px 16px 24px -8px rgba(23,23,23,0.08)"
    modal: "0px 1px 2px rgba(23,23,23,0.04), 0px 8px 16px -4px rgba(23,23,23,0.06), 0px 24px 32px -8px rgba(23,23,23,0.08)"
    elevated: "0px 4px 6px -2px rgba(23,23,23,0.07), 0px 10px 15px -3px rgba(23,23,23,0.07)"
  motion:
    fast: "150ms"
    base: "200ms"
    slow: "300ms"
    easing: "cubic-bezier(0.175, 0.885, 0.32, 1.1)"
    note: "fast=hover·active·checked, base=드롭다운·팝오버, slow=오버레이·모달. prefers-reduced-motion 반드시 준수."
  chrome:
    header-height: 56px
    tabbar-height: 72px
    action-area-height: 84px
---

## Source

This DESIGN.md condenses Wanted Montage source code for Aide generation:

- web: `montage-web/packages/wds-theme/src/theme`
- android: `montage-android/library/src/main/res/values`
- iOS: `montage-ios/packages/montage-mcp/data`

The output must look like Aide, not Wanted/Montage. Use the Montage visual grammar only as the foundation.

## Must Follow

1. Use `Aide` as the design system name.
2. Put `aide-logo-slot` in the top app/header area.
3. Use Google Material Symbols. Do not invent Montage icon names.
4. Use a sticky/fixed top navigation on mobile.
5. Make the content body scrollable.
6. Add bottom padding when bottom nav or action area exists.
7. Preserve the selected variant layout strategy: order, spacing, large visual roles, CTA positions.
8. Add enough content: minimum 4 sections and 9 meaningful UI units per mobile screen.
9. Use real Korean product copy, metrics, states, recommendations, histories, alerts, or comparisons.
10. Include responsive CSS with mobile, tablet, and desktop behavior.

## Screen Shell

Use this app shell unless the brief explicitly asks for a web dashboard or landing page.

```html
<div class="app-shell">
  <header class="top-navigation">
    <span class="aide-logo-slot" aria-label="brand logo"></span>
    <div class="top-actions">
      <button class="icon-button"><span class="material-symbols-rounded">notifications</span></button>
    </div>
  </header>

  <main class="aide-page scroll-body">
    <section class="aide-section hero-section">...</section>
    <section class="aide-section">...</section>
    <section class="aide-section">...</section>
    <section class="aide-section">...</section>
  </main>

  <nav class="bottom-navigation">...</nav>
</div>
```

Core CSS contract:

```css
:root {
  --color-primary: #0066FF;
  --color-primary-soft: #EAF2FE;
  --color-page: #F7F7F8;
  --color-surface: #FFFFFF;
  --color-text: #171719;
  --color-muted: rgba(55,56,60,0.61);
  --color-border: rgba(112,115,124,0.16);
  --color-negative: #FF4242;
  --aide-page-padding: 16px;
  --aide-section-gap: 16px;
  --aide-card-padding: 16px;
  --aide-card-gap: 12px;
  --aide-card-radius: 16px;
  --aide-header-height: 56px;
  --aide-tabbar-height: 72px;
  --motion-fast: 150ms;
  --motion-base: 200ms;
  --motion-slow: 300ms;
  --motion-easing: cubic-bezier(0.175, 0.885, 0.32, 1.1);
  --aide-focus-ring: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-primary);
}
:focus-visible { outline: none; box-shadow: var(--aide-focus-ring); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }
.app-shell { background: var(--color-page); height: 100dvh; min-height: 100dvh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.top-navigation { position: sticky; top: 0; z-index: 20; height: var(--aide-header-height); background: rgba(255,255,255,.88); backdrop-filter: blur(32px); border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; padding: 0 var(--aide-page-padding); }
.scroll-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: var(--aide-section-gap) var(--aide-page-padding) calc(var(--aide-tabbar-height) + 16px); display: flex; flex-direction: column; gap: var(--aide-section-gap); }
.aide-section { display: flex; flex-direction: column; gap: var(--aide-card-gap); }
.aide-card { background: var(--color-surface); border: 1px solid rgba(112,115,124,.08); border-radius: var(--aide-card-radius); padding: var(--aide-card-padding); box-shadow: 0 2px 4px -2px rgba(23,23,23,.06), 0 4px 6px -1px rgba(23,23,23,.06); }
.bottom-navigation { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; height: var(--aide-tabbar-height); background: var(--color-surface); border-top: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-around; padding-bottom: env(safe-area-inset-bottom); }
```

## Component Rules

### TopNavigation

- Left: Aide logo slot or back button.
- Right: 1-3 icon buttons.
- Use Material Symbols: `notifications`, `search`, `settings`, `person`, `menu`.
- Must remain visible during scroll.

### Hero

- First section.
- Must include at least 4 of: badge, title, supporting copy, KPI, visual, CTA, status.
- If the variant strategy has a visual block, final design must keep a visual block in the same role and location.
- 3D image placement:

```html
<div class="aide-visual-stage">
  <img class="aide-hero-3d" src="..." alt="..." />
</div>
```

- No baked shadow in 3D image. Use only subtle container shadow if needed.
- CTA may overlay image only in a deliberate bottom/side zone. Never float ambiguously in the middle.

### Button

- Primary: blue solid, white text, 40-48px height, 12px radius.
- Secondary: assistive fill or outlined.
- Full-width primary CTA is preferred on mobile.
- CTA groups belong at the bottom of hero/card/section/action-area.

### Card

- White surface, 16px radius, 14-16px padding, subtle border/shadow.
- Do not nest cards inside cards.
- Card content order: label/status > title/KPI > detail > visual/list > action.

### ListCell

- 48-56px min height.
- Composition: leading icon/avatar + title/caption + trailing value/chevron.
- Use light separators, not heavy boxes.

### Chip / Tab / Segmented

- Chips are filters. Tabs are page/category navigation. Segmented controls are mode switches.
- Active state: primary text, primary tint, or underline.
- Pill radius allowed only here, badges, avatars, and tab indicators.

### TextField / Search

- 44px height, 12px radius, 14px horizontal padding.
- Search fields include `search` icon.
- Focus state uses primary border.

## Pattern Library

Choose one main pattern per variant. Do not make A/B/C share the same structure.

### Pattern A: Data Dashboard

Best for finance, telecom, health, productivity, admin.

Order:
1. TopNavigation with logo and alerts.
2. KPI hero card with primary metric and one CTA.
3. Quick action grid, 2x2.
4. Usage/status analysis card.
5. Recommendation list or comparison list.
6. Bottom navigation.

Required units: KPI, chart/progress, quick actions, list cells, CTA.

### Pattern B: Visual Assistant Hero

Best for AI, recommendation, concierge, simulator, character-led services.

Order:
1. TopNavigation.
2. Hero with 3D visual stage or image scene.
3. Primary CTA at hero bottom.
4. Simulator/action cards.
5. Top 3 recommendations.
6. Recent activity or guide section.
7. Bottom navigation or action area.

Required units: visual stage, CTA, 2-4 action cards, ranked list, helper copy.

### Pattern C: Brand Story / Photo Commerce

Best for lifestyle, travel, commerce, creator, community.

Order:
1. TopNavigation or search navigation.
2. Large image/photo hero.
3. Category chips.
4. Featured cards.
5. Story/review list.
6. Offer/event card.
7. Bottom navigation.

Required units: image hero, chips, card grid, list/review, CTA.

### Pattern D: Form / Onboarding

Best for signup, diagnosis, survey, reservation, request.

Order:
1. TopNavigation with back button.
2. Progress indicator.
3. Form card or question stack.
4. Help/summary card.
5. Fixed bottom action area.

Required units: progress, 3+ inputs/options, validation/help state, fixed CTA.

### Pattern E: Detail / Report

Best for report, analysis result, product detail, record detail.

Order:
1. TopNavigation.
2. Summary hero.
3. Tab or segmented control.
4. Detail metric cards.
5. Timeline/list.
6. Related recommendations.
7. Fixed CTA or bottom navigation.

Required units: summary, tabs, metrics, timeline, recommendations.

## Variant Strategy

- A: structured, data-forward, dense dashboard.
- B: visual hero, assistant/simulator, 3D or generated visual.
- C: story/photo-led, brand-emotional, image and cards.
- Each variant must use a different hero composition, section order, and primary interaction.
- Each variant preserves its own strategy, section rhythm, visual role, and primary interaction.

## Layout Contract

The selected variant archetype is the source of truth for structure.

- Preserve section order.
- Preserve meaningful section proportion.
- Preserve visual role and placement.
- Preserve CTA location.
- Preserve approximate section/card spacing.
- Add detail by enriching each section, not by drifting into an unrelated layout pattern.
- If the variant strategy requires a bottom tab, final screen has bottom tab.
- If the variant strategy requires a bottom action button, final screen has fixed action area.

## Content Density

Minimum for one mobile screen:

- 4+ sections.
- 9+ UI units total.
- 320+ Korean characters across visible and scrollable content.
- 2+ explicit numbers or metrics.
- 1+ list or ranked set.
- 1+ primary CTA.
- 1+ secondary action or navigation path.

Bad: hero + two cards + bottom tab.  
Good: hero + simulator + quick actions + ranked cards + recent history + bottom tab.

## Responsive Contract

- Mobile: 320-430px app shell, fixed/sticky top, scroll body, bottom nav/action.
- Tablet: keep same order; allow 2-column cards where useful.
- Desktop: max-width 1120-1280px; use top header or left rail; hide mobile bottom nav.
- Use media queries.
- Avoid fixed-only widths. Use `max-width`, `%`, `minmax`, `auto-fit`, and `clamp`.

## Audit Checklist

Before final answer, the generated HTML must pass:

- Aide logo slot exists and is visible in top navigation.
- No Wanted/Montage/WDS brand leak.
- Material Symbols are used for icons.
- Top navigation remains visible on scroll.
- Main content scrolls.
- Bottom nav/action does not cover content.
- Variant layout strategy is preserved.
- Hero image/3D appears when the strategy requires it.
- CTA is bottom-aligned within its section/card/action area.
- Minimum 4 sections and 9 UI units.
- Responsive CSS exists.

## Primary Color Hierarchy

`--color-primary: #0066FF` has four distinct roles — apply only the role that matches the context:

| 토큰 | 용도 | 사용 예 |
|---|---|---|
| `primary` (#0066FF) | CTA 버튼 배경, 아이콘 강조, 숫자 KPI | 주요 행동 버튼, 탭 활성 아이콘 |
| `primary-strong` (#005EEB) | CTA :hover / :active 상태 | 버튼 눌림 시 색 변화 |
| `primary-heavy` (#0054D1) | 선택된 항목의 텍스트·아이콘 | 활성 탭 레이블 |
| `primary-soft` (#EAF2FE) | 선택·활성 상태의 배경 | 칩 선택 배경, 탭 인디케이터 배경 |
| `primary-tint` (rgba 8%) | 경계 없이 tint 효과 | 토스트 배경, 인라인 강조 |

Rules:
- Primary blue는 **CTA, 활성 상태, KPI 숫자**에만 사용한다. 장식·배경·텍스트 기본색에 쓰지 않는다.
- 비활성 CTA는 `opacity: 0.38`로 처리. 색상 변형 금지.
- 보조 버튼(secondary)은 `fill`/`fill-strong` 배경 또는 `border` 테두리만 사용.

## Motion

세 단계 duration + 단일 easing으로 모든 전환을 표현한다:

| 토큰 | 값 | 적용 대상 |
|---|---|---|
| `--motion-fast` | 150ms | hover·active·checked·icon swap |
| `--motion-base` | 200ms | 드롭다운·팝오버 열기/닫기, 색상 전환 |
| `--motion-slow` | 300ms | 오버레이·모달·시트 진입/퇴장 |

Easing: `cubic-bezier(0.175, 0.885, 0.32, 1.1)` — 살짝 overshoot하는 스프링감.

```css
.btn-primary { transition: filter var(--motion-fast) var(--motion-easing); }
.dropdown    { transition: opacity var(--motion-base) var(--motion-easing),
                           transform var(--motion-base) var(--motion-easing); }
.modal-sheet { transition: transform var(--motion-slow) var(--motion-easing); }
```

`prefers-reduced-motion: reduce` 미디어 쿼리가 CSS contract에 포함돼 있다 — 별도 추가 불필요.

## Focus Style

키보드 탐색 사용자를 위해 모든 인터랙티브 요소는 `:focus-visible` 링을 반드시 표시한다:

```css
/* Core CSS contract에 포함 — 재선언 불필요 */
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-primary);
}
```

- 2px 흰색 gap + 2px primary 링 구조.
- 버튼·카드 등 개별 컴포넌트에서 `box-shadow` 재정의 시 이 값을 보존한다.
- `outline: none`은 반드시 `box-shadow` 대체가 있을 때만 사용한다.

## Voice & Copy (Korean)

Aide UI에서 사용하는 한국어 카피의 어조와 규칙.

### 기본 어조

- **간결·직접**: 주어 생략 가능, 동사 끝맺음 명확
- **존댓말 기본**: `-요` 체 (예: "확인해요", "설정하세요")
- **명사형 레이블**: 버튼·탭·칩은 명사 또는 동사 어간+기 (예: "저장하기", "분석 시작")

### CTA 버튼 카피

| 상황 | 권장 | 금지 |
|---|---|---|
| 주요 행동 | "지금 시작하기", "바로 확인하기" | "클릭", "OK", "Submit" |
| 완료·확정 | "저장하기", "신청하기" | "완료", "Done" |
| 취소·닫기 | "취소", "닫기" | "Cancel", "Close" |
| 삭제·위험 | "삭제하기", "탈퇴하기" | "삭제", "Delete" |

### 상태 메시지

- 오류: `[대상]을(를) [동사]하지 못했어요. [이유 또는 해결 방법].`
  - 예: "파일을 업로드하지 못했어요. 5MB 이하의 이미지를 사용해 주세요."
- 성공: `[대상]이(가) [동작]됐어요.`
  - 예: "프로필이 저장됐어요."
- 빈 상태: `아직 [대상]이 없어요.` + 행동 유도 문구
  - 예: "아직 기록이 없어요. 첫 번째 분석을 시작해 보세요."

### 숫자·단위

- 한국식 단위 우선: 만·억 (예: "1,200만원", "2.3억건")
- 퍼센트 공백 없음: "12%" (not "12 %")
- 날짜: "2025년 6월 26일" 또는 "6월 26일"

### 금지 표현

- 영어 혼용 레이블 (예: "My page", "Home") → "내 페이지", "홈"
- 지나친 감탄 (예: "와우!", "굉장해요!") — 제품 UI에 부적합
- 수동형 모호 표현 (예: "처리되어집니다") → "처리돼요"

## Do Not

- Do not use Montage icon names.
- Do not use logo text instead of `aide-logo-slot`.
- Do not create a landing page unless explicitly requested.
- Do not let content be clipped behind fixed bottom chrome.
- Do not center-float buttons in the middle of image/content blocks.
- Do not make all variants the same layout.
- Do not create empty, decorative, low-content screens.
- Do not apply primary blue (#0066FF) to decorative backgrounds, body text, or non-CTA elements.
- Do not omit `:focus-visible` ring on interactive elements.
- Do not use English copy for labels, CTAs, or status messages in Korean-language screens.
