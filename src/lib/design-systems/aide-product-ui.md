---
schema_version: "2.0"
name: "Aide Product UI"
description: "Aide 서비스의 Landing, Studio, Playground, 설정, 이력, overlay에 적용하는 제품 UI 계약"
scope: "product-interface-only"
status: "normative"
language: "ko-KR"
source_of_truth:
  tokens: "this file — contract.tokens below"
  token_compiler: "src/lib/aide-product-tokens.ts"
  token_injection: "src/app/layout.tsx (:root, after globals.css)"
  dynamic_token_bridge: "src/lib/aide-ui.ts"
  primitives: "src/components/ui/*"
  visualization: "src/app/aide-ui/page.tsx"
excluded_consumers:
  - "AI가 생성하는 사용자 시안"
  - "사용자가 선택하거나 업로드한 DESIGN.md"
  - "KTDS preview content"
precedence:
  - "security_and_product_invariants"
  - "this_machine_contract"
  - "component_contracts"
  - "composition_guidance"
  - "examples"
---

# Aide Product UI

이 문서는 Aide 서비스 자체 UI를 생성·수정·검수하는 AI와 개발자를 위한 규범적 계약이다. 사용자 결과물에 적용하는 `aide.md`와 혼합하지 않는다.

## AI execution protocol

AI는 작업 전에 다음 순서로 판단한다.

1. **SCOPE** — 변경 대상이 Aide 제품 크롬인지 확인한다. 생성 시안 내부라면 이 문서를 적용하지 않는다.
2. **REUSE** — `src/components/ui/*`와 기존 제품 primitive를 먼저 찾는다.
3. **TOKEN** — 모든 정적 시각값은 `--aui-*` 또는 `AIDE_UI`에 연결한다.
4. **COMPOSE** — 아래 layout recipe와 component contract로 화면을 조립한다.
5. **STATE** — default만 만들지 말고 필요한 hover, focus, selected, disabled, loading, empty, error 상태를 구현한다.
6. **VERIFY** — accessibility와 self-audit를 통과한 뒤 lint, production build, visual smoke test를 수행한다.

규범 키워드:

- **MUST**: 예외 없이 지킨다.
- **SHOULD**: 합리적인 제품 이유가 있을 때만 벗어나며 코드에 이유를 남긴다.
- **MAY**: 화면 목적에 맞게 선택한다.

## Machine-readable contract

아래 YAML이 토큰·컴포넌트·레이아웃 판단의 우선 원본이다. `contract.tokens`의 `$value`는 **실제 값**이며,
`src/lib/aide-product-tokens.ts`가 이를 `--aui-*` 커스텀 프로퍼티로 컴파일해 `layout.tsx`가 `:root`에 주입한다.
따라서 이 블록의 값을 고치면 Aide 제품 UI와 `/aide-ui`가 함께 바뀐다. 토큰 이름은 역할을 나타내며 시각값을 이름에 포함하지 않는다.

CSS 변수 이름 규칙:

| 그룹 | 변수 |
| --- | --- |
| `color`, `dimension` | `--aui-<key>` |
| `radius` | `--aui-radius-<key>` |
| `shadow` | `--aui-shadow-<key>` |
| `duration` | `--aui-motion-<key>` |
| `typography` | `--aui-type-<scale>-{size,leading,weight,tracking,family}` |

```yaml
contract:
  identity:
    product: "Aide"
    character:
      - id: calm-workspace
        rule: "작업물이 가장 눈에 띄고 제품 chrome은 조용해야 한다"
      - id: purposeful-blue
        rule: "파랑은 primary action, selection, focus, progress에만 사용한다"
      - id: compact-precision
        rule: "desktop tool은 조밀하되 label과 target의 판독성을 유지한다"
      - id: one-language
        rule: "Landing, Studio, Playground는 같은 token과 primitive를 공유한다"
      - id: visible-status
        rule: "상태를 색만으로 전달하지 않는다"

  tokens:
    color:
      $type: color
      primary:
        $value: "#0066FF"
        $description: "Primary action, selected control, focus indicator"
      primary-strong:
        $value: "#005EEB"
        $description: "Primary hover and pressed emphasis"
      primary-heavy:
        $value: "#0054D1"
        $description: "High-emphasis text on primary-soft"
      primary-soft:
        $value: "#EAF2FE"
        $description: "Selected and informative tinted surface"
      primary-tint:
        $value: "rgba(0, 102, 255, 0.08)"
        $description: "Focus ring and subtle state layer"
      primary-disabled:
        $value: "#7AAEFF"
        $description: "Disabled primary control only"
      canvas:
        $value: "#FFFFFF"
        $description: "Landing and modal canvas"
      page:
        $value: "#F7F7F8"
        $description: "Workspace and application background"
      surface:
        $value: "#FFFFFF"
        $description: "Panel, card, control, dialog"
      surface-muted:
        $value: "#F4F4F5"
        $description: "Grouped region and secondary control"
      inverse-surface:
        $value: "#1A1A1A"
        $description: "Toast and inverse chrome"
      text:
        $value: "#171719"
        $description: "Primary text"
      text-strong:
        $value: "#000000"
        $description: "Maximum emphasis; use sparingly"
      text-neutral:
        $value: "rgba(46, 47, 51, 0.88)"
        $description: "Secondary emphasis"
      text-muted:
        $value: "rgba(55, 56, 60, 0.61)"
        $description: "Description and metadata"
      text-assistive:
        $value: "rgba(55, 56, 60, 0.28)"
        $description: "Placeholder and nonessential hint"
      text-disabled:
        $value: "rgba(55, 56, 60, 0.16)"
        $description: "Disabled content"
      border:
        $value: "rgba(112, 115, 124, 0.16)"
        $description: "Control and panel boundary"
      border-subtle:
        $value: "rgba(112, 115, 124, 0.08)"
        $description: "Divider and quiet boundary"
      fill:
        $value: "rgba(112, 115, 124, 0.08)"
        $description: "Secondary control fill"
      fill-strong:
        $value: "rgba(112, 115, 124, 0.16)"
        $description: "Pressed or stronger neutral fill"
      positive:
        $value: "#00BF40"
        $description: "Success icon and accent"
      caution:
        $value: "#FF9200"
        $description: "Warning icon and accent"
      negative:
        $value: "#FF4242"
        $description: "Error and destructive action"
      negative-soft:
        $value: "rgba(255, 66, 66, 0.08)"
        $description: "Error background"
      caution-soft:
        $value: "#FFF7ED"
        $description: "Warning background"
      scrim:
        $value: "rgba(0, 0, 0, 0.45)"
        $description: "Modal backdrop"
      scrim-soft:
        $value: "rgba(0, 0, 0, 0.25)"
        $description: "Light backdrop and hover veil"
      scrim-strong:
        $value: "rgba(0, 0, 0, 0.65)"
        $description: "Focused media or fullscreen backdrop"
      on-primary:
        $value: "#FFFFFF"
        $description: "Text and icon on primary action"
      on-dark:
        $value: "#FFFFFF"
        $description: "Text on inverse surface"
      on-dark-strong:
        $value: "rgba(255, 255, 255, 0.90)"
        $description: "High-emphasis text on inverse surface"
      on-dark-muted:
        $value: "rgba(255, 255, 255, 0.72)"
        $description: "Secondary text on inverse surface"
      on-dark-subtle:
        $value: "rgba(255, 255, 255, 0.30)"
        $description: "Divider on inverse surface"
      on-dark-faint:
        $value: "rgba(255, 255, 255, 0.15)"
        $description: "Quiet boundary on inverse surface"
      inverse-surface-raised:
        $value: "#2A2A2A"
        $description: "Raised layer on inverse chrome"
      primary-muted:
        $value: "#DCEAFF"
        $description: "Quiet primary fill and progress track"
      negative-border:
        $value: "rgba(255, 66, 66, 0.25)"
        $description: "Error field boundary"
      caution-border:
        $value: "#FED7AA"
        $description: "Warning container boundary"
      caution-text:
        $value: "#B45309"
        $description: "Readable warning text on caution-soft"

    dimension:
      $type: dimension
      space-1: { $value: "4px", $description: "4px micro gap" }
      space-2: { $value: "8px", $description: "8px related-item gap" }
      space-3: { $value: "12px", $description: "12px compact component gap" }
      space-4: { $value: "16px", $description: "16px default padding" }
      space-5: { $value: "20px", $description: "20px card or dialog padding" }
      space-6: { $value: "24px", $description: "24px section padding" }
      space-8: { $value: "32px", $description: "32px major separation" }
      space-10: { $value: "40px", $description: "40px page rhythm" }
      control-compact: { $value: "32px", $description: "Dense desktop tool control" }
      control-default: { $value: "40px", $description: "General product control" }
      control-prominent: { $value: "48px", $description: "Landing and major CTA" }
      target-touch: { $value: "44px", $description: "Touch-first minimum target" }
      toolbar-height: { $value: "56px", $description: "Studio and Playground toolbar" }
      panel-min: { $value: "280px", $description: "Workspace side panel minimum" }
      panel-max: { $value: "320px", $description: "Workspace side panel preferred maximum" }
      content-max: { $value: "1200px", $description: "Landing content maximum width" }
      icon-sm: { $value: "16px", $description: "Inline glyph icon — emoji and Material Symbols in body text" }
      icon-md: { $value: "20px", $description: "Standard glyph icon — toolbar and control affordance" }
      icon-lg: { $value: "22px", $description: "Prominent glyph icon — section and picker header" }

    radius:
      $type: dimension
      sm: { $value: "8px", $description: "Compact toolbar control" }
      control: { $value: "12px", $description: "Button, field, menu item" }
      card: { $value: "16px", $description: "Card and panel artifact" }
      overlay: { $value: "20px", $description: "Dialog and sheet" }
      pill: { $value: "9999px", $description: "Badge, chip, avatar, status only" }

    shadow:
      $type: shadow
      card: { $value: "0px 2px 4px -2px rgba(23, 23, 23, 0.06), 0px 4px 6px -1px rgba(23, 23, 23, 0.06)", $description: "Floating card only" }
      elevated: { $value: "0px 4px 6px -2px rgba(23, 23, 23, 0.07), 0px 10px 15px -3px rgba(23, 23, 23, 0.07)", $description: "Popover, menu, dialog" }
      focus: { $value: "0 0 0 2px var(--aui-primary-tint)", $description: "Visible keyboard focus ring" }
      # Elevation ramp — full shadow values, bucketed by blur radius.
      subtle: { $value: "0 1px 3px rgba(0, 0, 0, 0.25)", $description: "Resting chip and inline control" }
      raised: { $value: "0 4px 12px rgba(0, 0, 0, 0.15)", $description: "Card and hovering surface" }
      floating: { $value: "0 8px 40px rgba(0, 0, 0, 0.15)", $description: "Dropdown, popover, drag preview" }
      modal: { $value: "0 24px 64px rgba(0, 0, 0, 0.15)", $description: "Dialog and sheet" }
      ring: { $value: "0 0 0 1px rgba(112, 115, 124, 0.08)", $description: "Hairline outline instead of border" }
      glow: { $value: "0 0 8px #DCEAFF", $description: "Focus or active emphasis halo" }
      line: { $value: "rgba(0, 0, 0, 0.07)", $description: "Hairline shadow color" }
      soft: { $value: "rgba(0, 0, 0, 0.09)", $description: "Soft shadow color" }
      medium: { $value: "rgba(0, 0, 0, 0.15)", $description: "Medium shadow color" }

    duration:
      $type: duration
      fast: { $value: "150ms", $description: "Hover, pressed, checkbox" }
      base: { $value: "200ms", $description: "Dropdown, panel, popover" }
      slow: { $value: "300ms", $description: "Dialog and page transition" }
      easing: { $value: "cubic-bezier(0.2, 0, 0, 1)", $description: "Shared easing curve" }

    weight:
      $type: fontWeight
      # Standalone axis: size and weight are chosen independently at most call sites.
      regular: { $value: "400", $description: "Body and long-form text" }
      medium: { $value: "500", $description: "Quiet emphasis and dense hints" }
      semibold: { $value: "600", $description: "Labels, controls, list titles" }
      bold: { $value: "700", $description: "Headings and primary emphasis" }
      extrabold: { $value: "800", $description: "Hero display only" }

    tracking:
      $type: dimension
      # em-based so tracking scales with font size; px letter-spacing does not.
      tighter: { $value: "-0.03em", $description: "Hero display and large headings" }
      tight: { $value: "-0.01em", $description: "Default UI text and headings" }
      normal: { $value: "0em", $description: "Monospace and neutral text" }
      slight: { $value: "0.03em", $description: "Small caps-ish labels" }
      wide: { $value: "0.06em", $description: "Uppercase label and badge" }
      wider: { $value: "0.09em", $description: "Eyebrow and section kicker" }

    leading:
      $type: number
      # Unitless ratios, relative to the element's font size.
      none: { $value: "1", $description: "Single-line glyph, badge, icon label" }
      tight: { $value: "1.2", $description: "Display and heading" }
      snug: { $value: "1.35", $description: "Compact UI copy" }
      normal: { $value: "1.5", $description: "Body text" }
      relaxed: { $value: "1.6", $description: "Long-form description and help text" }

    typography:
      $type: typography
      # Each scale maps to --aui-type-<key>-{size,leading,weight,tracking} in globals.css.
      display:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "32px", fontWeight: "700", lineHeight: "44px", letterSpacing: "-0.8px" }
        $description: "Landing hero only — 32/44 700 -0.8px"
      page-title:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "24px", fontWeight: "700", lineHeight: "32px", letterSpacing: "-0.55px" }
        $description: "24/32 700 -0.55px"
      section-title:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "18px", fontWeight: "700", lineHeight: "26px", letterSpacing: "0px" }
        $description: "18/26 700"
      body:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "15px", fontWeight: "400", lineHeight: "22px", letterSpacing: "0px" }
        $description: "15/22 400"
      label:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "14px", fontWeight: "600", lineHeight: "20px", letterSpacing: "0px" }
        $description: "14/20 600"
      compact:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "13px", fontWeight: "600", lineHeight: "18px", letterSpacing: "0px" }
        $description: "13/18 600 — compact desktop control"
      caption:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "12px", fontWeight: "400", lineHeight: "16px", letterSpacing: "0px" }
        $description: "12/16 400"
      micro:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "11px", fontWeight: "500", lineHeight: "16px", letterSpacing: "0px" }
        $description: "11/16 500 — dense tool hint and item description. Playground/Studio panels only"
      meta:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "10px", fontWeight: "700", lineHeight: "14px", letterSpacing: "0.02em" }
        $description: "10/14 700 — dense metadata badge and source label"
      nano:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "8px", fontWeight: "600", lineHeight: "12px", letterSpacing: "0.03em" }
        $description: "8/12 600 — densest annotation on palette swatch and timeline. Studio inspector only; smallest permitted scale"

  component_defaults:
    states: [default, hover, pressed, focus-visible, disabled]
    static_style_source: "--aui-* or shared class"
    runtime_style_exceptions: [canvas-transform, drag-position, measured-geometry, state-derived-value]
    icon_only_requires: [accessible-name, square-target, tooltip-when-meaning-is-not-obvious]

  components:
    button:
      anatomy: [optional-leading-icon, label, optional-trailing-icon]
      variants: [primary, secondary, outline, ghost, destructive]
      sizes:
        compact: { height: "32px", horizontal-padding: "12px" }
        default: { height: "40px", horizontal-padding: "16px" }
        prominent: { height: "48px", horizontal-padding: "20px" }
      rules:
        - "MUST use radius.control; ordinary buttons MUST NOT use pill"
        - "MUST show readable disabled label"
        - "MUST use verb-first concise label"
        - "MUST NOT place two primary actions in one local action group"
    icon-button:
      anatomy: [icon]
      sizes: [32px, 40px, 44px]
      rules:
        - "MUST have aria-label"
        - "MUST be square"
        - "SHOULD show tooltip for unfamiliar action"
    field:
      anatomy: [label, control, optional-supporting-text, optional-status-icon]
      sizes: { compact: "32px", default: "40px" }
      states: [default, hover, focus-visible, filled, disabled, read-only, success, error]
      rules:
        - "MUST keep a programmatic label; placeholder MUST NOT be the only label"
        - "error MUST include message text and aria-invalid"
        - "focus MUST use primary border and visible ring"
    textarea:
      anatomy: [label, control, optional-counter, optional-supporting-text]
      min-height: "80px"
      inherits: field
    select:
      anatomy: [label, trigger, value-or-placeholder, chevron, menu, option]
      inherits: field
      rules:
        - "MUST expose selected value and keyboard navigation"
    search:
      anatomy: [search-icon, input, optional-clear-action]
      inherits: field
      rules:
        - "MUST show clear action when a non-empty query can be cleared"
    checkbox:
      anatomy: [control, label, optional-description]
      states: [unchecked, checked, indeterminate, focus-visible, disabled]
      purpose: "independent multi-selection"
    radio:
      anatomy: [control, label, optional-description]
      states: [unselected, selected, focus-visible, disabled]
      purpose: "one choice in a group"
    switch:
      anatomy: [track, thumb, label, optional-description]
      states: [off, on, focus-visible, disabled]
      purpose: "immediately effective setting"
    tabs:
      anatomy: [tablist, tab, active-indicator, panel]
      purpose: "navigate peer content destinations"
      rules:
        - "selected state MUST include indicator or fill in addition to color"
        - "MUST support arrow-key navigation"
    segmented-control:
      anatomy: [container, segment, selected-segment]
      purpose: "change a local view or mode"
      max-options: 5
    chip:
      anatomy: [optional-icon, label, optional-remove-action]
      purpose: "filter or compact selection"
      radius: pill
    badge:
      anatomy: [optional-status-icon, label]
      purpose: "compact metadata or status"
      radius: pill
    avatar:
      sizes: [24px, 32px, 40px]
      fallback-order: [image, initials, generic-user-icon]
    card:
      anatomy: [optional-header, content, optional-footer]
      rules:
        - "MUST group one related concept"
        - "MUST NOT wrap every section in a card"
        - "MUST NOT nest cards except for selectable preview artifacts"
    panel:
      purpose: "persistent workspace region"
      separation: "surface plus border; no card shadow"
    list-cell:
      anatomy: [optional-leading, primary-label, optional-metadata, optional-trailing]
      min-height: "48px"
      rules:
        - "repeated data SHOULD use rows and subtle dividers before separate cards"
    metric:
      anatomy: [label, value, optional-delta, optional-context]
      rules:
        - "delta MUST include direction and comparison context"
        - "numeric columns SHOULD use tabular figures"
    progress:
      anatomy: [optional-label, track, indicator, optional-value]
      states: [determinate, indeterminate, complete, error]
      rules:
        - "MUST expose accessible value or accompanying status text"
    alert:
      anatomy: [semantic-icon, title-or-message, optional-description, optional-action]
      variants: [info, success, warning, error]
      rules:
        - "MUST combine icon or explicit label with color"
    toast:
      anatomy: [status-icon, message, optional-action, optional-dismiss]
      rules:
        - "MUST be concise and temporary"
        - "critical errors MUST remain visible elsewhere until resolved"
    loading:
      variants: [spinner, progress, skeleton]
      rules:
        - "MUST describe the operation when waiting is not obvious"
        - "skeleton SHOULD mirror final content structure"
    empty-state:
      anatomy: [optional-visual, title, description, optional-primary-action]
      rules:
        - "SHOULD explain what is absent and provide one useful next action"
    dialog:
      anatomy: [title, optional-description, close-action, content, action-group]
      width: { default: "420px", max: "560px" }
      rules:
        - "MUST trap focus, close with Escape, restore focus, and label the dialog"
        - "destructive confirmation MUST name the target and recovery consequence"
    popover:
      anatomy: [trigger, floating-surface, content]
      rules:
        - "MUST dismiss on outside interaction and Escape"
    tooltip:
      purpose: "supplement an accessible name"
      rules:
        - "MUST NOT contain essential instructions or interactive actions"
    dropdown-menu:
      anatomy: [trigger, menu, menu-item, optional-separator]
      rules:
        - "MUST support keyboard navigation and visible focus"

  layouts:
    landing:
      recipe: [ProductHeader, Hero, PrimaryInput, SupportingContent]
      content-max: "1200px"
      primary-input-width: "760px..880px"
      rules:
        - "decorative effects MUST NOT reduce contrast or obscure controls"
        - "controls MUST use the same primitives as Studio"
    studio:
      recipe: [AppHeader, Workspace, SidePanel]
      rules:
        - "primary content MUST receive most viewport space"
        - "persistent regions use surfaces and borders, not nested cards"
        - "inspector repeats section-header, row, label, and input primitives"
    playground:
      recipe: [Toolbar, LibraryPanel, Canvas, InspectorPanel]
      toolbar-height: "56px"
      side-panel-width: "280px..320px"
      rules:
        - "canvas uses color.page; frames use color.surface and selection ring"
        - "KTDS may style preview content; surrounding chrome remains Aide Product UI"
    overlay:
      recipe: [Scrim, DialogOrSheet]
      rules:
        - "MUST provide title, close affordance, focus treatment, and action hierarchy"

  responsive:
    breakpoints:
      compact: "0..767px"
      medium: "768px..1199px"
      wide: "1200px+"
    behavior:
      compact:
        - "side panels become drawer, sheet, or dedicated route"
        - "general targets become at least 44px"
        - "dialog actions stack when labels do not fit"
      medium:
        - "one secondary panel may remain persistent"
      wide:
        - "workspace may show canvas and two side panels"

  accessibility:
    standard: "WCAG 2.2 AA"
    requirements:
      - "normal text contrast >= 4.5:1"
      - "large text and essential non-text contrast >= 3:1"
      - "keyboard focus is visible and not obscured"
      - "minimum pointer target follows 24px WCAG floor; product targets use 32px dense, 40px general, 44px touch"
      - "interactive role, name, value, and state are programmatically exposed"
      - "error is identified in text and recovery preserves user input"
      - "prefers-reduced-motion is respected"
      - "state and meaning never rely on color alone"

  prohibited:
    - "hard-coded hex or new black-alpha values inside screen components"
    - "purple or alternate primary accent for product chrome"
    - "pill-shaped ordinary buttons, fields, panels, or cards"
    - "card-inside-card decoration"
    - "imperative onMouseEnter/onMouseLeave style mutation"
    - "icon-only action without accessible name"
    - "placeholder-only field label"
    - "selected, error, or success state communicated by color alone"
    - "applying customer DESIGN.md to Aide product chrome"
```

## Composition guidance

### Visual hierarchy

1. 한 영역에는 primary action을 하나만 둔다.
2. 작업물과 canvas가 chrome보다 높은 시각적 주목도를 가진다.
3. 인접한 영구 영역은 surface와 border로 구분하고 shadow를 사용하지 않는다.
4. Shadow는 실제로 떠 있는 card, menu, popover, dialog에만 사용한다.
5. Primary blue 면적을 줄이고 선택·진행·행동의 의미를 선명하게 유지한다.

### Content and status language

- 버튼은 `생성하기`, `저장하기`, `다시 시도`처럼 동사로 시작한다.
- 성공: `변경사항을 저장했어요.`
- 진행: `컴포넌트를 생성하고 있어요.`
- 오류: 발생 사실 + 원인 또는 영향 + 복구 행동 순서로 쓴다.
- 빈 상태: 없는 대상 + 이유 또는 맥락 + 다음 행동을 쓴다.
- `성공`, `오류`, `경고`처럼 색의 의미가 되는 상태는 아이콘이나 명시적 문장을 함께 제공한다.

## Implementation contract

1. Product code MUST reference `--aui-*` or shared Aide UI primitives.
2. `src/lib/aide-ui.ts` is the TypeScript bridge only for dynamic inline styles.
3. Static styling belongs in shared classes or primitives; inline style is reserved for runtime geometry, canvas transforms, drag position, and state-derived values.
4. A screen-local primitive used by a second surface MUST move to `src/components/ui/*`.
5. `globals.css` maps framework semantic variables to `--aui-*`; a second palette MUST NOT be maintained.
6. This file MUST NOT be passed to the user UI generation pipeline or exposed as a selectable customer DESIGN.md.

## AI self-audit

Before declaring a product UI change complete, answer every item with `PASS` or fix it.

```yaml
self_audit:
  scope:
    - "Product chrome and generated preview styles remain separated"
  tokens:
    - "No new hard-coded static color, radius, shadow, or spacing value exists in a screen component"
    - "Every used token exists in globals.css or the machine contract"
  components:
    - "Existing primitive was reused or a justified reusable primitive was created"
    - "Required component states are present"
    - "Primary action hierarchy is unambiguous"
  layout:
    - "The surface follows the matching layout recipe"
    - "Workspace chrome does not compete with content"
    - "Compact, medium, and wide behavior is defined where relevant"
  accessibility:
    - "Keyboard focus, accessible names, labels, contrast, and status text pass"
    - "Touch-first controls meet the 44px product target"
    - "Reduced motion is supported"
  verification:
    - "npm run lint passes without new errors"
    - "npm run build succeeds"
    - "Affected routes pass visual smoke verification"
```

## Reference rationale

- Token objects use DTCG-style `$type`, `$value`, and `$description` so tools and AI can distinguish values from metadata.
- Token names are semantic and platform-independent; CSS variables remain the runtime implementation.
- Components describe anatomy, variants, sizes, states, behavior, and prohibitions separately to reduce ambiguous generation.
- Accessibility requirements are explicit constraints rather than optional prose.
