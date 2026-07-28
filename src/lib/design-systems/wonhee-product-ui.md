---
schema_version: "3.1"
document_id: "wonhee-product-ui"
document_type: "product-design-system-contract"
name: "Wonhee Product UI"
description: "Wonhee Design System을 Aide의 Landing, Studio, Playground, 설정, 이력, overlay에 적용하는 제품 토큰·확장 계약"
extends: "./wonhee-design.md"
reference_boundary: "Independent Wonhee visual system. Do not copy Toss assets, exact TDS tokens, or protected component appearance."
scope: "product-interface-only"
status: "normative"
language: "ko-KR"
target_product: "Aide"
machine_contract:
  location: "first fenced yaml block"
  root_key: "contract"
  normative: true
  prose_role: "rationale, implementation guidance, and audit procedure"
compatibility:
  token_notation: "DTCG-inspired $type/$value/$description"
  alias_syntax: "{group.token}"
  export_targets: [DTCG, CSS-custom-properties, TypeScript, Tailwind]
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

# Wonhee Product UI

이 문서는 `wonhee-design.md`의 구조·컴포넌트·반응형·접근성 계약을 Aide 서비스에 적용하는 제품 토큰·확장 계약이다. 사용자 결과물에 적용하는 `aide.md`와 혼합하지 않는다.

이 문서에서 **첫 번째 fenced YAML 블록만 Aide 제품 UI의 기계 판독 가능한 규범 원본**이다. Front matter는 문서와 빌드 도구를 위한 metadata이고, 본문은 사용 이유와 구현 지침이다. 시각값은 반드시 token leaf에서 시작하고 컴포넌트와 layout은 token을 참조한다.

## AI execution protocol

AI는 작업 전에 다음 순서로 판단한다.

1. **SCOPE** — 변경 대상이 Aide 제품 크롬인지 확인한다. 생성 시안 내부라면 이 문서를 적용하지 않는다.
2. **REUSE** — `src/components/ui/*`와 기존 제품 primitive를 먼저 찾는다.
3. **TOKEN** — 모든 정적 시각값은 `--aui-*` 또는 `AIDE_UI`에 연결한다.
4. **COMPOSE** — 아래 layout recipe와 component contract로 화면을 조립한다.
5. **STATE** — default만 만들지 말고 필요한 hover, focus, selected, disabled, loading, empty, error 상태를 구현한다.
6. **VERIFY** — accessibility와 self-audit를 통과한 뒤 lint, production build, visual smoke test를 수행한다.

AI는 먼저 `wonhee-design.md`를 읽고 이 문서를 deep merge한다. 이 문서가 명시적으로 바꾸지 않은 anatomy·state·responsive·accessibility 규칙은 상속하며, 접근성 기준은 낮출 수 없다.

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
| `gradient` | `--aui-gradient-<key>` |
| `blur` | `--aui-blur-<key>` |
| `typography` | `--aui-type-<scale>-{size,leading,weight,tracking,family}` |

```yaml
contract:
  schema:
    id: "wonhee-product-ui-contract"
    version: "3.1"
    kind: "product-extension"
    extends: "wonhee-design-contract@2"
    normative_path: "contract"
    required_sections: [identity, tokens, component_tokens, components, component_registry, layouts, responsive, develop, ai, documentation, accessibility, visualization, prohibited]
    token_format:
      leaf_required: [$value]
      leaf_optional: [$type, $description]
      alias_syntax: "{group.token}"
      aliases_must_resolve: true
      literal_values_allowed_in: [tokens, component_tokens]
      implementation_output_rule: "components and layouts bind to semantic or component tokens before code generation"

  inheritance:
    strategy: "deep-merge-by-key"
    base: "./wonhee-design.md"
    array_strategy: "replace unless $merge is append"
    protected_from_override: [accessibility.minimum_contrast, accessibility.semantic_requirements]
    precedence:
      - runtime-safety
      - accessibility
      - product-contract
      - portable-core
      - prose-example

  consumers:
    canonical: [aide-product-token-compiler, shared-ui-primitives, aide-ui-showcase, aide-product-chrome]
    excluded: [generated-customer-ui, uploaded-design-md, ktds-preview-content]
    parity_rule: "showcase and product chrome must consume the same compiled tokens and shared primitives"

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
      - id: quiet-boundaries
        rule: "계층은 선보다 여백, surface 차이, 타이포그래피로 먼저 만든다"

  tokens:
    color:
      $type: color
      primary:
        $value: "#3182F6"
        $description: "Primary action, selected control, focus indicator"
      primary-strong:
        $value: "#1B64DA"
        $description: "Primary hover and pressed emphasis"
      primary-heavy:
        $value: "#174EA6"
        $description: "High-emphasis text on primary-soft"
      primary-soft:
        $value: "#E8F3FF"
        $description: "Selected and informative tinted surface"
      primary-tint:
        $value: "rgba(49, 130, 246, 0.16)"
        $description: "Focus ring and subtle state layer"
      primary-disabled:
        $value: "#AECBFA"
        $description: "Disabled primary control only"
      hero-gradient-start:
        $value: "#95C7CD"
        $description: "Existing Aide landing hero gradient start"
      hero-gradient-middle:
        $value: "#0066FF"
        $description: "Existing Aide landing hero gradient center"
      hero-gradient-end:
        $value: "#B497CF"
        $description: "Existing Aide landing hero gradient end"
      canvas:
        $value: "#FFFFFF"
        $description: "Landing and modal canvas"
      page:
        $value: "#F9FAFB"
        $description: "Workspace and application background"
      surface:
        $value: "#FFFFFF"
        $description: "Panel, card, control, dialog"
      surface-muted:
        $value: "#F2F4F6"
        $description: "Grouped region and secondary control"
      surface-sunken:
        $value: "#F9FAFB"
        $description: "Workspace canvas behind panels and artifacts"
      surface-raised:
        $value: "rgba(255, 255, 255, 0.96)"
        $description: "Floating toolbar and panel chrome"
      glass-surface:
        $value: "rgba(255, 255, 255, 0.72)"
        $description: "Brand-aware translucent chrome over expressive backgrounds"
      glass-surface-strong:
        $value: "rgba(255, 255, 255, 0.90)"
        $description: "Readable input and navigation surface over expressive backgrounds"
      glass-border:
        $value: "rgba(255, 255, 255, 0.34)"
        $description: "Boundary for translucent chrome"
      inverse-surface:
        $value: "#333D4B"
        $description: "Toast and inverse chrome"
      text:
        $value: "#191F28"
        $description: "Primary text"
      text-strong:
        $value: "#000000"
        $description: "Maximum emphasis; use sparingly"
      text-neutral:
        $value: "#4E5968"
        $description: "Secondary emphasis"
      text-muted:
        $value: "#6B7684"
        $description: "Description and metadata"
      text-assistive:
        $value: "#8B95A1"
        $description: "Placeholder and nonessential hint"
      text-disabled:
        $value: "#B0B8C1"
        $description: "Disabled content"
      border:
        $value: "#D1D6DB"
        $description: "Control and panel boundary"
      border-subtle:
        $value: "#E5E8EB"
        $description: "Divider and quiet boundary"
      fill:
        $value: "#F2F4F6"
        $description: "Secondary control fill"
      fill-strong:
        $value: "#E5E8EB"
        $description: "Pressed or stronger neutral fill"
      positive:
        $value: "#20C997"
        $description: "Success icon and accent"
      caution:
        $value: "#C66A05"
        $description: "Warning icon and accent"
      negative:
        $value: "#F04452"
        $description: "Error and destructive action"
      negative-soft:
        $value: "#FFEEEE"
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
        $value: "#505866"
        $description: "Raised layer on inverse chrome"
      primary-muted:
        $value: "#D6E9FF"
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
      content-narrow: { $value: "700px", $description: "Primary form and focused reading width" }
      hero-copy-max: { $value: "560px", $description: "Landing hero supporting-copy measure" }
      hero-title-max: { $value: "860px", $description: "Landing hero display measure" }
      header-height: { $value: "64px", $description: "Marketing and showcase global navigation" }
      icon-sm: { $value: "16px", $description: "Inline glyph icon — emoji and Material Symbols in body text" }
      icon-md: { $value: "20px", $description: "Standard glyph icon — toolbar and control affordance" }
      icon-lg: { $value: "22px", $description: "Prominent glyph icon — section and picker header" }

    radius:
      $type: dimension
      sm: { $value: "8px", $description: "Compact toolbar control" }
      control: { $value: "12px", $description: "Button, field, menu item" }
      card: { $value: "20px", $description: "Toss-inspired card and grouped content surface" }
      overlay: { $value: "24px", $description: "Dialog and sheet" }
      pill: { $value: "9999px", $description: "Badge, chip, avatar, status only" }

    shadow:
      $type: shadow
      card: { $value: "0 4px 16px rgba(25, 31, 40, 0.06)", $description: "Raised card only; plain cards remain borderless" }
      elevated: { $value: "0 8px 32px rgba(25, 31, 40, 0.12)", $description: "Popover, menu, dialog" }
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

    gradient:
      $type: string
      brand-hero: { $value: "linear-gradient(180deg, #FFFFFF 0%, #F5F8FF 100%)", $description: "Quiet product-first landing surface" }
      brand-hero-soft: { $value: "linear-gradient(180deg, #FFFFFF 0%, #EDF3FF 100%)", $description: "Low-intensity documentation and empty-state expression" }
      brand-accent: { $value: "linear-gradient(90deg, #7AA2FF 0%, #2F6BFF 100%)", $description: "Short blue decorative accent; not a control background" }

    blur:
      $type: dimension
      glass: { $value: "16px", $description: "Navigation and lightweight translucent chrome" }
      glass-strong: { $value: "24px", $description: "Readable glass card over expressive background" }

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
      display-hero:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "72px", fontWeight: "800", lineHeight: "1.2", letterSpacing: "-0.03em" }
        $description: "Landing hero maximum — responsive clamp must not exceed this scale"
      display-large:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "48px", fontWeight: "700", lineHeight: "1.2", letterSpacing: "-0.025em" }
        $description: "Showcase and marketing section hero"
      display:
        $value: { fontFamily: "var(--font-pretendard)", fontSize: "32px", fontWeight: "700", lineHeight: "44px", letterSpacing: "-0.8px" }
        $description: "Display-medium for product introductions — 32/44 700"
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
    required_fields:
      all: [anatomy]
      interactive: [purpose, states]
      inherited: [responsive, accessibility]
      implementation: [token-bindings]
    static_style_source: "--aui-* or shared class"
    runtime_style_exceptions: [canvas-transform, drag-position, measured-geometry, state-derived-value]
    icon_only_requires: [accessible-name, square-target, tooltip-when-meaning-is-not-obvious]
    implementation_rules:
      - "shared primitives consume --aui-* variables generated from this contract"
      - "screen components cannot introduce new static visual literals"
      - "optional slots define omission behavior without empty wrappers"
      - "variants express hierarchy, state, or task semantics rather than decoration"

  component_tokens:
    button:
      compact-height: { $value: "{dimension.control-compact}", $description: "Compact desktop action height" }
      default-height: { $value: "{dimension.control-default}", $description: "Default action height" }
      touch-height: { $value: "{dimension.target-touch}", $description: "Touch-first action height" }
      prominent-height: { $value: "{dimension.control-prominent}", $description: "Prominent action height" }
      compact-padding-x: { $value: "{dimension.space-3}", $description: "Compact horizontal padding" }
      default-padding-x: { $value: "{dimension.space-4}", $description: "Default horizontal padding" }
      prominent-padding-x: { $value: "{dimension.space-5}", $description: "Prominent horizontal padding" }
    field:
      compact-height: { $value: "{dimension.control-compact}", $description: "Dense desktop field height" }
      default-height: { $value: "{dimension.control-default}", $description: "Default field height" }
      touch-height: { $value: "{dimension.target-touch}", $description: "Touch-first field height" }
      label-gap: { $value: "{dimension.space-2}", $description: "Field label to control spacing" }
      message-gap: { $value: "{dimension.space-1}", $description: "Control to supporting message spacing" }
      padding-inline: { $value: "{dimension.space-3}", $description: "Field control horizontal inset" }
      textarea-min-height: { $value: "96px", $description: "Default multiline field minimum height" }
      textarea-touch-min-height: { $value: "112px", $description: "Touch-first multiline field minimum height" }
    navigation:
      item-height: { $value: "{dimension.target-touch}", $description: "Navigation item target height" }
      compact-item-height: { $value: "{dimension.control-default}", $description: "Pointer-first navigation item height" }
    card:
      padding: { $value: "{dimension.space-4}", $description: "Default card content padding" }
      compact-padding: { $value: "{dimension.space-3}", $description: "Compact card content padding" }
      gap: { $value: "{dimension.space-4}", $description: "Default card slot gap" }
      compact-gap: { $value: "{dimension.space-3}", $description: "Compact card slot gap" }
      header-gap: { $value: "{dimension.space-1}", $description: "Card title to description gap" }
    overlay:
      dialog-width: { $value: "420px", $description: "Default dialog width" }
      dialog-max-width: { $value: "560px", $description: "Maximum dialog width" }
    action-bar:
      padding: { $value: "{dimension.space-4}", $description: "Action bar inset" }
    control:
      compact-height: { $value: "{dimension.control-compact}", $description: "Dense pointer-first control height" }
      default-height: { $value: "{dimension.control-default}", $description: "Default control height" }
      touch-height: { $value: "{dimension.target-touch}", $description: "Touch-first control height" }
      inline-padding: { $value: "{dimension.space-3}", $description: "Default control horizontal inset" }
      gap: { $value: "{dimension.space-2}", $description: "Control content gap" }
      icon-size: { $value: "{dimension.icon-md}", $description: "Default control icon size" }
    selection:
      indicator-size: { $value: "20px", $description: "Checkbox and radio indicator size" }
      switch-width: { $value: "40px", $description: "Switch track width" }
      switch-height: { $value: "24px", $description: "Switch track height" }
      switch-inset: { $value: "2px", $description: "Switch thumb inset" }
      switch-thumb-size: { $value: "20px", $description: "Switch thumb diameter" }
      segment-padding: { $value: "{dimension.space-1}", $description: "Segmented control inset" }
    feedback:
      inset: { $value: "{dimension.space-3}", $description: "Inline feedback inset" }
      radius: { $value: "{radius.control}", $description: "Feedback surface radius" }
      progress-height: { $value: "8px", $description: "Progress track height" }
    data-display:
      row-height: { $value: "{dimension.control-prominent}", $description: "Dense data row minimum height" }
      row-touch-height: { $value: "56px", $description: "Touch-first row minimum height" }
      section-inset: { $value: "{dimension.space-4}", $description: "List and table section inset" }
      row-padding-block: { $value: "{dimension.space-2}", $description: "List row vertical inset" }
      row-content-gap: { $value: "{dimension.space-1}", $description: "List row title to description gap" }
    table:
      min-width: { $value: "560px", $description: "Minimum comparison-table canvas before horizontal scrolling" }
      header-height: { $value: "{dimension.control-default}", $description: "Table header row height" }
      row-height: { $value: "{dimension.control-prominent}", $description: "Default data row height" }
      cell-padding-inline: { $value: "{dimension.space-4}", $description: "Table cell horizontal inset" }
    list-section:
      header-height: { $value: "56px", $description: "List section header minimum height" }
      inset: { $value: "{dimension.space-4}", $description: "List section horizontal inset" }
      block-padding: { $value: "{dimension.space-3}", $description: "List section header and footer block inset" }
      header-gap: { $value: "{dimension.space-4}", $description: "Gap between header copy and action" }
    keypad:
      inset: { $value: "{dimension.space-2}", $description: "Keypad surface inset" }
      gap: { $value: "{dimension.space-2}", $description: "Gap between keypad keys" }
      key-height: { $value: "{dimension.target-touch}", $description: "Touch-safe keypad key height" }
      key-min-width: { $value: "{dimension.control-compact}", $description: "Minimum keypad key width" }
    slider:
      gap: { $value: "{dimension.space-2}", $description: "Gap between slider label and track" }
      target-height: { $value: "{dimension.target-touch}", $description: "Touch-first slider interaction target" }
      compact-target-height: { $value: "{dimension.control-default}", $description: "Pointer-first slider interaction target" }
    menu:
      min-width: { $value: "192px", $description: "Minimum popup menu width" }
      inset: { $value: "{dimension.space-2}", $description: "Menu popup inner inset" }
      item-height: { $value: "{dimension.control-default}", $description: "Menu item minimum height" }
      item-gap: { $value: "{dimension.space-2}", $description: "Menu item content gap" }
      item-padding-inline: { $value: "{dimension.space-3}", $description: "Menu item horizontal inset" }
      inset-item-padding-left: { $value: "{dimension.space-8}", $description: "Indented menu item leading inset" }
    sheet:
      bottom-max-height: { $value: "90dvh", $description: "Maximum bottom-sheet viewport height" }
      side-width: { $value: "420px", $description: "Preferred inspector sheet width" }
      side-max-viewport-width: { $value: "90vw", $description: "Side sheet maximum viewport width" }
      compact-padding: { $value: "{dimension.space-5}", $description: "Bottom sheet content inset" }
      wide-padding: { $value: "{dimension.space-6}", $description: "Side sheet content inset" }
      close-size: { $value: "{dimension.control-default}", $description: "Sheet close action target" }
      handle-width: { $value: "{dimension.space-10}", $description: "Bottom sheet drag handle width" }
      handle-height: { $value: "{dimension.space-1}", $description: "Bottom sheet drag handle height" }
    stepper:
      indicator-size: { $value: "{dimension.control-compact}", $description: "Stepper marker diameter" }
      item-gap: { $value: "{dimension.space-3}", $description: "Vertical step marker-to-content gap" }
      item-padding-block: { $value: "{dimension.space-6}", $description: "Vertical step separation" }
      label-padding-inline: { $value: "{dimension.space-2}", $description: "Horizontal step label inset" }
    breadcrumb:
      gap: { $value: "{dimension.space-1}", $description: "Breadcrumb item and separator gap" }
      item-height: { $value: "{dimension.control-compact}", $description: "Breadcrumb link minimum height" }
      item-padding-inline: { $value: "{dimension.space-1}", $description: "Breadcrumb item horizontal inset" }
    tabs:
      trigger-padding-inline: { $value: "{dimension.space-1}", $description: "Tab trigger horizontal inset" }
      indicator-height: { $value: "2px", $description: "Selected tab indicator thickness" }
      content-padding-block: { $value: "{dimension.space-4}", $description: "Tab panel block inset" }
    avatar:
      compact-size: { $value: "{dimension.control-compact}", $description: "Compact avatar size" }
      default-size: { $value: "{dimension.control-default}", $description: "Default avatar size" }
      prominent-size: { $value: "{dimension.control-prominent}", $description: "Prominent avatar size" }
    bar-chart:
      plot-height: { $value: "160px", $description: "Default compact categorical chart height" }
      bar-gap: { $value: "{dimension.space-3}", $description: "Gap between categorical bars" }
    prose:
      readable-width: { $value: "{dimension.content-narrow}", $description: "Maximum long-form reading measure" }
    dialog:
      viewport-inset: { $value: "{dimension.space-4}", $description: "Minimum dialog distance from the viewport edge" }
      content-gap: { $value: "{dimension.space-4}", $description: "Gap between dialog content regions" }
      compact-padding: { $value: "{dimension.space-5}", $description: "Compact dialog content inset" }
      wide-padding: { $value: "{dimension.space-6}", $description: "Wide dialog content inset" }
      close-inset: { $value: "{dimension.space-4}", $description: "Close action distance from dialog edges" }
      close-size: { $value: "{dimension.control-default}", $description: "Touch-first dialog close target" }
      close-compact-size: { $value: "{dimension.control-compact}", $description: "Pointer-first dialog close target" }
      header-gap: { $value: "{dimension.space-2}", $description: "Dialog heading content gap" }
      header-action-reserve: { $value: "{dimension.space-10}", $description: "Space reserved for the close action" }
      footer-gap: { $value: "{dimension.space-2}", $description: "Gap between dialog actions" }
      footer-padding-top: { $value: "{dimension.space-2}", $description: "Space above dialog actions" }
    popover:
      width: { $value: "288px", $description: "Default informational popover width" }
      padding: { $value: "{dimension.space-4}", $description: "Popover content inset" }
      close-inset: { $value: "{dimension.space-2}", $description: "Close action distance from popover edges" }
      close-size: { $value: "{dimension.control-default}", $description: "Popover close target" }
      description-gap: { $value: "{dimension.space-1}", $description: "Title-to-description spacing" }
    agreement:
      padding: { $value: "{dimension.space-4}", $description: "Agreement group inset" }
      section-gap: { $value: "{dimension.space-2}", $description: "Separation around select-all and agreement items" }
      detail-action-size: { $value: "{dimension.target-touch}", $description: "Agreement detail link touch target" }
    detail-header:
      content-gap: { $value: "{dimension.space-4}", $description: "Gap between header content and actions" }
      padding-bottom: { $value: "{dimension.space-5}", $description: "Detail header bottom inset" }
      eyebrow-gap: { $value: "{dimension.space-1}", $description: "Eyebrow-to-title spacing" }
      description-gap: { $value: "{dimension.space-2}", $description: "Title-to-description spacing" }
      metadata-gap: { $value: "{dimension.space-3}", $description: "Description-to-metadata spacing" }
      action-gap: { $value: "{dimension.space-2}", $description: "Gap between contextual actions" }
    result:
      padding-inline: { $value: "{dimension.space-5}", $description: "Result content horizontal inset" }
      padding-block: { $value: "{dimension.space-10}", $description: "Result content vertical inset" }
      figure-gap: { $value: "{dimension.space-4}", $description: "Figure-to-title spacing" }
      description-gap: { $value: "{dimension.space-2}", $description: "Title-to-description spacing" }
      action-gap: { $value: "{dimension.space-5}", $description: "Description-to-action spacing" }
    responsive-grid:
      min-item-width: { $value: "240px", $description: "Default minimum width of a responsive grid item" }
      gap: { $value: "{dimension.space-4}", $description: "Default responsive grid gutter" }

  component_recipes:
    schema: "family defaults + component properties + slot/state token bindings + viewport overrides"
    viewport_modes:
      compact:
        range: "0..767px"
        density: touch
        control-height: "{dimension.target-touch}"
        content-padding-inline: "{dimension.space-5}"
        section-gap: "{dimension.space-6}"
        action-layout: stack
      medium:
        range: "768..1199px"
        density: comfortable
        control-height: "{dimension.control-default}"
        content-padding-inline: "{dimension.space-6}"
        section-gap: "{dimension.space-6}"
        action-layout: adaptive
      wide:
        range: "1200px+"
        density: comfortable-or-compact
        control-height: "{dimension.control-default}"
        compact-control-height: "{dimension.control-compact}"
        content-padding-inline: "{dimension.space-8}"
        section-gap: "{dimension.space-8}"
        action-layout: inline
    families:
      action:
        slots: [root, label, optional-leading-icon, optional-trailing-icon, optional-progress]
        properties: { size: [compact, default, touch, prominent], width: [hug, fill], state: [enabled, hover, pressed, focus-visible, loading, disabled] }
        specification:
          root: { gap: "{dimension.space-2}", radius: "{radius.control}", transition: "{duration.fast}" }
          label: { typography: "{typography.label}" }
          icon: { size: "{dimension.icon-md}" }
        responsive: { compact: { size: touch, width: fill }, medium: { size: default }, wide: { size: default, width: hug } }
      field:
        slots: [root, label, control, value, optional-leading, optional-trailing, optional-supporting-text]
        properties: { size: [compact, default, touch], state: [empty, filled, hover, focus-visible, read-only, disabled, success, error] }
        specification:
          root: { gap: "{dimension.space-2}" }
          control: { padding-inline: "{dimension.space-3}", gap: "{dimension.space-2}", radius: "{radius.control}", border: "{color.border}" }
          label: { typography: "{typography.caption}", color: "{color.text}" }
          supporting-text: { typography: "{typography.meta}", color: "{color.text-muted}" }
        responsive: { compact: { size: touch }, medium: { size: default }, wide: { size: default, dense-size: compact } }
      selection:
        slots: [root, indicator-or-track, label, optional-description]
        properties: { size: [default, touch], state: [unselected, selected, mixed, focus-visible, disabled, error] }
        specification: { root: { min-target: "{dimension.target-touch}", gap: "{dimension.space-2}" }, label: { typography: "{typography.body}" } }
        responsive: { compact: { size: touch }, medium: { size: default }, wide: { size: default } }
      navigation:
        slots: [root, items, item, active-indicator, optional-icon, label]
        properties: { orientation: [horizontal, vertical], density: [compact, comfortable, touch], state: [default, hover, active, focus-visible, disabled] }
        specification: { root: { gap: "{dimension.space-1}" }, item: { gap: "{dimension.space-2}", radius: "{radius.control}" } }
        responsive: { compact: { orientation: horizontal, density: touch }, medium: { orientation: horizontal, density: comfortable }, wide: { orientation: horizontal-or-vertical, density: comfortable } }
      data-display:
        slots: [root, optional-header, content, optional-metadata, optional-footer]
        properties: { density: [compact, comfortable, touch], emphasis: [plain, raised, bordered, selected] }
        specification: { root: { gap: "{dimension.space-3}" }, header: { gap: "{dimension.space-2}" }, content: { typography: "{typography.body}" } }
        responsive: { compact: { density: touch }, medium: { density: comfortable }, wide: { density: comfortable, optional-density: compact } }
      feedback:
        slots: [root, semantic-icon-or-progress, title-or-status, optional-description, optional-action]
        properties: { tone: [neutral, info, success, warning, error], state: [idle, loading, complete, error] }
        specification: { root: { gap: "{dimension.space-3}", padding: "{dimension.space-3}", radius: "{radius.control}" }, icon: { size: "{dimension.icon-md}" } }
        responsive: { compact: { action-layout: stack }, medium: { action-layout: inline }, wide: { action-layout: inline } }
      overlay:
        slots: [scrim-or-positioner, surface, header, content, optional-footer, close-action]
        properties: { size: [compact, default, wide], state: [closed, opening, open, closing] }
        specification: { surface: { gap: "{dimension.space-4}", padding: "{dimension.space-5}", radius: "{radius.overlay}", shadow: "{shadow.modal}" }, close-action: { target: "{dimension.target-touch}" } }
        responsive: { compact: { presentation: bottom-sheet-or-fullscreen }, medium: { presentation: dialog-or-sheet }, wide: { presentation: dialog-popover-or-side-sheet } }
    items:
      button: { family: action, default: { size: default, variant: primary, width: hug }, properties: { variant: [primary, secondary, outline, ghost, destructive] } }
      icon-button: { family: action, default: { size: default, variant: outline, width: hug }, properties: { layout: [icon-only] } }
      action-bar: { family: action, default: { size: default, layout: inline }, properties: { layout: [stack, inline, fixed] }, slots: [root, secondary-actions, primary-action, optional-safe-area] }
      fixed-bottom-cta: { family: action, default: { size: touch, layout: fixed }, properties: { action-count: [1, 2], hide-on-scroll: [false, true] }, slots: [root, optional-secondary-action, primary-action, safe-area] }
      field: { family: field, default: { size: default, state: empty } }
      field-group: { family: field, default: { size: default }, slots: [fieldset, legend, controls, optional-help, optional-error] }
      textarea: { family: field, default: { size: default, state: empty }, properties: { resize: [none, vertical] } }
      number-field: { family: field, default: { size: default }, slots: [label, decrement-action, value, increment-action] }
      select: { family: field, default: { size: default, state: empty }, slots: [label, trigger, value, chevron, menu, option] }
      search: { family: field, default: { size: default, state: empty }, slots: [search-icon, input, optional-clear-action] }
      slider: { family: field, default: { size: touch }, slots: [label, value-output, track, thumb] }
      keypad: { family: field, default: { size: touch }, slots: [label, key-grid, keys, optional-backspace] }
      checkbox: { family: selection, default: { size: default, state: unselected } }
      radio: { family: selection, default: { size: default, state: unselected } }
      switch: { family: selection, default: { size: default, state: unselected }, slots: [track, thumb, label, optional-description] }
      agreement: { family: selection, default: { size: touch, state: unselected }, slots: [legend, select-all, items, optional-detail-actions] }
      tabs: { family: navigation, default: { orientation: horizontal, density: comfortable }, properties: { overflow: [scroll, distribute] } }
      segmented-control: { family: navigation, default: { orientation: horizontal, density: comfortable } }
      chip: { family: selection, default: { size: default, state: unselected }, properties: { removable: [false, true] } }
      stepper: { family: navigation, default: { orientation: horizontal, density: comfortable }, properties: { orientation: [horizontal, vertical] } }
      navigation: { family: navigation, default: { orientation: horizontal, density: comfortable }, properties: { type: [top, side, bottom] } }
      app-header: { family: navigation, default: { density: comfortable, state: default }, properties: { position: [static, sticky], show-actions: [true, false] }, slots: [brand, optional-menu-action, global-navigation, actions] }
      global-navigation: { family: navigation, default: { orientation: horizontal, density: comfortable }, properties: { alignment: [start, center, end] }, slots: [navigation-landmark, items, active-item] }
      local-navigation: { family: navigation, default: { orientation: vertical, density: comfortable }, properties: { width: [compact, default, wide], collapsible: [true, false] }, slots: [optional-title, navigation-landmark, items, active-item] }
      bottom-app-bar: { family: navigation, default: { orientation: horizontal, density: touch }, properties: { item-count: [3, 4, 5], position: [static, fixed] }, slots: [navigation-landmark, items, active-item, safe-area] }
      app-footer: { family: navigation, default: { orientation: horizontal, density: comfortable }, properties: { layout: [stack, split], emphasis: [plain, muted] }, slots: [brand, optional-description, link-navigation, optional-legal] }
      top-navigation: { family: navigation, default: { density: touch, state: default }, properties: { type: [root, standard], tone: [layer, transparent], show-subtitle: [false, true] }, slots: [optional-left-action, title, optional-subtitle, right-actions] }
      side-navigation: { family: navigation, default: { orientation: vertical, density: comfortable }, properties: { width: [compact, default, wide], collapsible: [true, false] }, slots: [optional-title, items, active-item] }
      breadcrumb: { family: navigation, default: { orientation: horizontal, density: compact } }
      badge: { family: data-display, default: { density: compact, emphasis: plain } }
      avatar: { family: data-display, default: { density: comfortable, emphasis: plain }, properties: { size: [compact, default, prominent] } }
      card: { family: data-display, default: { density: comfortable, emphasis: plain }, properties: { emphasis: [plain, raised, bordered, selected] } }
      panel: { family: data-display, default: { density: comfortable, emphasis: plain } }
      list-cell: { family: data-display, default: { density: comfortable, emphasis: plain }, slots: [root, optional-leading, labels, optional-metadata, optional-trailing] }
      list-section: { family: data-display, default: { density: comfortable, emphasis: plain }, slots: [optional-header, list-content, optional-footer] }
      table: { family: data-display, default: { density: comfortable, emphasis: plain }, properties: { responsive: [scroll, prioritized-list] } }
      metric: { family: data-display, default: { density: compact, emphasis: plain }, slots: [label, value, optional-delta, optional-context] }
      bar-chart: { family: data-display, default: { density: comfortable, emphasis: plain }, slots: [figure, caption, plot, bars, labels] }
      prose: { family: data-display, default: { density: comfortable, emphasis: plain }, properties: { measure: [narrow, readable, wide] } }
      responsive-grid: { family: data-display, default: { density: comfortable, emphasis: plain }, properties: { columns: [auto, one, two, three, four] } }
      detail-header: { family: data-display, default: { density: comfortable, emphasis: plain }, slots: [optional-eyebrow, title, optional-description, optional-metadata, optional-actions] }
      page-header: { family: data-display, default: { density: comfortable, emphasis: plain }, properties: { action-layout: [inline, stack] }, slots: [optional-eyebrow, title, optional-description, optional-actions] }
      section-header: { family: data-display, default: { density: comfortable, emphasis: plain }, properties: { heading-level: [h2, h3] }, slots: [title, optional-description, optional-trailing] }
      side-panel: { family: data-display, default: { density: comfortable, emphasis: raised }, properties: { side: [left, right], width: [compact, default, wide] }, slots: [header, content, optional-footer] }
      workspace-shell: { family: data-display, default: { density: comfortable, emphasis: plain }, properties: { navigation: [none, side], inspector: [none, right], panel-mode: [persistent, overlay] }, slots: [app-header, optional-side-navigation, main-content, optional-side-panel] }
      progress: { family: feedback, default: { tone: info, state: loading }, properties: { mode: [determinate, indeterminate] } }
      alert: { family: feedback, default: { tone: info, state: idle } }
      toast: { family: feedback, default: { tone: neutral, state: idle } }
      loading: { family: feedback, default: { tone: neutral, state: loading }, properties: { type: [spinner, progress, skeleton] } }
      empty-state: { family: feedback, default: { tone: neutral, state: idle } }
      result: { family: feedback, default: { tone: neutral, state: complete }, properties: { outcome: [empty, success, error] } }
      dialog: { family: overlay, default: { size: default, state: open }, properties: { role: [dialog, alertdialog] } }
      sheet: { family: overlay, default: { size: default, state: open }, properties: { edge: [bottom, right] } }
      popover: { family: overlay, default: { size: compact, state: open } }
      tooltip: { family: overlay, default: { size: compact, state: open } }
      dropdown-menu: { family: overlay, default: { size: compact, state: open }, properties: { selection: [none, single, multiple] } }

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
      purpose: capture multi-line text with optional length feedback
      anatomy: [label, control, optional-counter, optional-supporting-text]
      min-height: "80px"
      inherits: field
    select:
      purpose: choose one option from a predefined list
      anatomy: [label, trigger, value-or-placeholder, chevron, menu, option]
      inherits: field
      rules:
        - "MUST expose selected value and keyboard navigation"
    search:
      purpose: find or filter content with a clearable query
      anatomy: [search-icon, input, optional-clear-action]
      inherits: field
      rules:
        - "MUST show clear action when a non-empty query can be cleared"
    checkbox:
      anatomy: [control, label, optional-description]
      states: [unchecked, checked, indeterminate, focus-visible, disabled]
      purpose: "select any number of independent options"
    radio:
      anatomy: [control, label, optional-description]
      states: [unselected, selected, focus-visible, disabled]
      purpose: "select exactly one option in a group"
    switch:
      anatomy: [track, thumb, label, optional-description]
      states: [off, on, focus-visible, disabled]
      purpose: "toggle a setting that applies immediately"
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
      purpose: "show compact metadata or status"
      radius: pill
    avatar:
      purpose: represent a person or entity with an image, initials, or fallback icon
      sizes: [24px, 32px, 40px]
      fallback-order: [image, initials, generic-user-icon]
    card:
      anatomy: [optional-header, content, optional-footer]
      variants: [plain, raised, bordered, selectable]
      rules:
        - "MUST group one related concept"
        - "MUST NOT wrap every section in a card"
        - "MUST NOT nest cards except for selectable preview artifacts"
        - "plain SHOULD be the default on page backgrounds; border is opt-in when the boundary has functional meaning"
        - "raised uses one subtle elevation and MUST NOT add a border at the same time"
    panel:
      purpose: "define a persistent workspace region"
      separation: "surface contrast first; use one shared divider only when adjacent regions would otherwise merge"
    list-cell:
      purpose: present one row of repeated data
      anatomy: [optional-leading, primary-label, optional-metadata, optional-trailing]
      min-height: "48px"
      rules:
        - "repeated data SHOULD use rows and subtle dividers before separate cards"
    metric:
      purpose: present one key number with optional change and context
      anatomy: [label, value, optional-delta, optional-context]
      rules:
        - "delta MUST include direction and comparison context"
        - "numeric columns SHOULD use tabular figures"
    progress:
      purpose: communicate how much of a task is complete
      anatomy: [optional-label, track, indicator, optional-value]
      states: [determinate, indeterminate, complete, error]
      rules:
        - "MUST expose accessible value or accompanying status text"
    alert:
      purpose: communicate a status message inline and persistently
      anatomy: [semantic-icon, title-or-message, optional-description, optional-action]
      variants: [info, success, warning, error]
      rules:
        - "MUST combine icon or explicit label with color"
    toast:
      purpose: confirm a completed action with a brief temporary message
      anatomy: [status-icon, message, optional-action, optional-dismiss]
      rules:
        - "MUST be concise and temporary"
        - "critical errors MUST remain visible elsewhere until resolved"
    loading:
      purpose: hold attention while an operation is in flight
      variants: [spinner, progress, skeleton]
      rules:
        - "MUST describe the operation when waiting is not obvious"
        - "skeleton SHOULD mirror final content structure"
    empty-state:
      purpose: explain an absent result and offer one next action
      anatomy: [optional-visual, title, description, optional-primary-action]
      rules:
        - "SHOULD explain what is absent and provide one useful next action"
    dialog:
      purpose: interrupt the flow for a focused decision or task
      anatomy: [title, optional-description, close-action, content, action-group]
      width: { default: "420px", max: "560px" }
      rules:
        - "MUST trap focus, close with Escape, restore focus, and label the dialog"
        - "destructive confirmation MUST name the target and recovery consequence"
    popover:
      purpose: reveal contextual content anchored to a trigger
      anatomy: [trigger, floating-surface, content]
      rules:
        - "MUST dismiss on outside interaction and Escape"
    tooltip:
      purpose: "supplement an accessible name"
      rules:
        - "MUST NOT contain essential instructions or interactive actions"
    dropdown-menu:
      purpose: present a list of actions anchored to a trigger
      anatomy: [trigger, menu, menu-item, optional-separator]
      rules:
        - "MUST support keyboard navigation and visible focus"
    action-bar:
      purpose: "present the final actions for a page, form, or blocking task"
      anatomy: [container, secondary-actions, primary-action, optional-safe-area]
      responsive: { compact: "stack full-width actions with primary last in DOM and visually first", medium: "inline actions aligned to the end", wide: "inline actions aligned to the end" }
      rules: ["MUST keep one primary action", "fixed mode MUST not obscure page content or keyboard focus"]
    field-group:
      purpose: "group multiple related fields under one programmatic legend"
      anatomy: [legend, controls, optional-help, optional-error]
      states: [default, disabled, error]
      rules: ["MUST use fieldset and legend semantics", "group error MUST identify the affected controls"]
    number-field:
      purpose: "enter or increment a bounded numeric value"
      anatomy: [label, decrement-action, value, increment-action]
      states: [default, focus-visible, disabled, min, max]
      rules: ["MUST expose the current value and bounds", "increment controls MUST have accessible names"]
    slider:
      purpose: "select an approximate value from a continuous or stepped range"
      anatomy: [label, value-output, track, thumb]
      states: [default, focus-visible, disabled]
      rules: ["MUST expose min, max, step, and current value", "number-field SHOULD be used instead when precise entry is essential"]
    keypad:
      purpose: "provide an explicit touch-first alphabetic or numeric input surface"
      anatomy: [label, key-grid, keys, optional-backspace]
      variants: [alphabet, number]
      rules: ["MUST preserve native keyboard access", "MUST NOT replace a physical keyboard without user need"]
    agreement:
      purpose: "collect grouped required and optional consent choices"
      anatomy: [legend, select-all, agreement-items, optional-detail-actions]
      states: [unchecked, mixed, checked, focus-visible]
      rules: ["required and optional items MUST be labeled in text", "select-all MUST keep individual values programmatically exposed"]
    stepper:
      purpose: "show progress and current position in a multi-step task"
      anatomy: [ordered-list, step-indicator, label, optional-description, connector]
      variants: [horizontal, vertical]
      states: [upcoming, current, complete, error]
      rules: ["current step MUST use aria-current", "step labels SHOULD remain visible on compact screens"]
    navigation:
      purpose: "move among primary or secondary product destinations"
      anatomy: [navigation-landmark, items, active-item, optional-menu-action]
      variants: [top, side, bottom]
      responsive: { compact: "bottom navigation or menu sheet", medium: "top navigation or collapsible rail", wide: "top or persistent side navigation" }
      rules: ["active state MUST include more than color", "landmark MUST have an accessible label"]
    top-navigation:
      purpose: "identify the current screen and expose navigation and contextual actions"
      anatomy: [optional-left-action, title, optional-subtitle, right-actions]
      variants: [root, standard]
      responsive: { compact: "sticky app bar", medium: "sticky app bar or part of app header", wide: "use for screen context, not as a substitute for global navigation" }
      rules: ["root variant MUST be used for first-depth screens", "standard variant MUST distinguish back from close", "right actions SHOULD remain at three or fewer"]
    side-navigation:
      purpose: "provide persistent or collapsible navigation for medium and wide workspaces"
      anatomy: [optional-title, items, active-item, optional-collapse-action]
      responsive: { compact: "replace with drawer or sheet", medium: "collapsible rail", wide: "persistent labeled navigation" }
      rules: ["collapsed items MUST retain accessible names", "active state MUST expose aria-current"]
    app-header:
      purpose: "provide persistent product identity, global navigation, and utility actions"
      anatomy: [header-landmark, brand, optional-menu-action, global-navigation, utility-actions]
      responsive: { compact: "brand plus menu and essential actions", medium: "brand plus reduced global navigation", wide: "brand, full global navigation, and actions" }
      rules: ["MUST preserve access to all destinations when navigation collapses", "sticky headers MUST not obscure focused content"]
    global-navigation:
      purpose: "move between top-level product destinations"
      anatomy: [navigation-landmark, items, active-item]
      rules: ["MUST be used only for top-level destinations", "active state MUST expose aria-current"]
    local-navigation:
      purpose: "move within the currently selected product area"
      anatomy: [optional-title, navigation-landmark, items, active-item]
      responsive: { compact: "drawer or sheet", medium: "collapsible rail", wide: "persistent side navigation" }
      rules: ["MUST contain only destinations in the current global area", "collapse MUST preserve accessible labels"]
    bottom-app-bar:
      purpose: "provide thumb-reachable access to three to five primary mobile destinations"
      anatomy: [navigation-landmark, items, icons, labels, active-item, safe-area]
      responsive: { compact: "visible when selected by IA", medium: "replace with top or side navigation", wide: "not used" }
      rules: ["MUST contain three to five destinations", "MUST respect safe-area inset", "labels MUST remain visible"]
    app-footer:
      purpose: "close a page with product identity, supporting links, and legal information"
      anatomy: [footer-landmark, brand, optional-description, link-navigation, optional-legal]
      responsive: { compact: "stack content and links", medium: "stack or split", wide: "split brand and link groups" }
      rules: ["MUST not duplicate primary navigation without a clear reason", "link groups MUST use descriptive navigation labels"]
    breadcrumb:
      purpose: "show hierarchy and provide navigation to ancestor levels"
      anatomy: [navigation-landmark, ordered-items, separators, current-page]
      rules: ["current page MUST use aria-current", "separators MUST be hidden from assistive technology"]
    list-section:
      purpose: "group a titled set of related list rows"
      anatomy: [optional-header, list-content, optional-footer]
      rules: ["one outer boundary SHOULD be used only when grouping needs emphasis", "row separation SHOULD use quiet dividers"]
    table:
      purpose: "compare structured values across shared columns"
      anatomy: [caption, header, body, rows, cells, optional-actions]
      responsive: { compact: "prioritized list conversion or explicit horizontal scroll", medium: "hide only columns with declared priority", wide: "full comparison table" }
      rules: ["MUST provide a caption", "numeric values SHOULD use tabular figures", "sortable headers MUST expose direction"]
    bar-chart:
      purpose: "compare a small set of categorical numeric values"
      anatomy: [figure, caption, plot, bars, value-labels, category-labels]
      rules: ["MUST expose each category and value as text", "color alone MUST NOT identify a series"]
    prose:
      purpose: "render long-form product guidance with controlled reading width"
      anatomy: [article, headings, paragraphs, optional-highlight]
      rules: ["MUST preserve semantic heading order", "line length SHOULD remain within the readable measure"]
    responsive-grid:
      purpose: "arrange peer items by available container width"
      anatomy: [grid, items]
      responsive: { compact: "one column", medium: "auto-fit from minimum item width", wide: "auto-fit without stretching content beyond its useful measure" }
    detail-header:
      purpose: "introduce a detail page and its primary contextual actions"
      anatomy: [optional-eyebrow, title, optional-description, optional-metadata, optional-actions]
      responsive: { compact: "stack actions below content", medium: "align actions to the end when space permits", wide: "content and actions share one header row" }
    page-header:
      purpose: "introduce a route or workspace page and expose its primary contextual actions"
      anatomy: [optional-eyebrow, title, optional-description, optional-actions]
      responsive: { compact: "stack actions after copy", medium: "inline when space permits", wide: "copy and actions share one row" }
    section-header:
      purpose: "introduce a content section and optionally expose one trailing action"
      anatomy: [title, optional-description, optional-trailing]
      rules: ["heading level MUST follow document hierarchy", "trailing action SHOULD remain secondary to the section title"]
    side-panel:
      purpose: "show contextual tools, properties, or supporting information beside a workspace"
      anatomy: [header, content, optional-footer]
      responsive: { compact: "sheet or route", medium: "overlay panel", wide: "persistent or resizable panel" }
      rules: ["panel state MUST not remove access to primary content", "resizable implementations MUST define min and max width"]
    workspace-shell:
      purpose: "compose header, navigation, primary canvas, and optional inspector into a responsive tool workspace"
      anatomy: [app-header, optional-side-navigation, main-content, optional-side-panel]
      responsive: { compact: "header plus one active route or sheet", medium: "one persistent panel and one overlay panel", wide: "persistent navigation, canvas, and optional inspector" }
      rules: ["main content MUST remain the primary landmark", "keyboard focus order MUST follow visual reading order"]
    fixed-bottom-cta:
      purpose: "keep one or two task-completion actions reachable at the bottom edge"
      anatomy: [optional-secondary-action, primary-action, safe-area]
      responsive: { compact: "fixed and safe-area aware", medium: "fixed only for task flows", wide: "prefer inline action area unless persistence is required" }
      rules: ["MUST not be used as primary navigation", "content MUST reserve enough bottom space to remain visible"]
    result:
      purpose: "explain an empty, success, or terminal state and offer a useful next action"
      anatomy: [optional-figure, title, optional-description, optional-action]
      variants: [empty, success, error]
      rules: ["title MUST state the outcome", "action SHOULD provide a relevant recovery or continuation"]
    sheet:
      purpose: "show contextual or blocking content from a screen edge"
      anatomy: [scrim, surface, title, optional-description, content, close-action]
      variants: [bottom, right]
      responsive: { compact: "bottom or full-height sheet", medium: "bottom or right sheet", wide: "right sheet for inspectors and bottom sheet for short tasks" }
      rules: ["MUST trap and restore focus", "MUST close with Escape", "bottom sheet MUST respect safe area"]

  component_registry:
    categories:
      actions: [button, icon-button, action-bar, fixed-bottom-cta]
      inputs: [field, field-group, textarea, number-field, select, search, slider, keypad]
      selection: [checkbox, radio, switch, agreement, tabs, segmented-control, chip, stepper]
      navigation: [navigation, app-header, global-navigation, local-navigation, top-navigation, side-navigation, bottom-app-bar, app-footer, breadcrumb]
      data-display: [badge, avatar, card, panel, list-cell, list-section, table, metric, bar-chart, prose, responsive-grid, detail-header, page-header, section-header, side-panel, workspace-shell]
      feedback: [progress, alert, toast, loading, empty-state, result]
      overlays: [dialog, sheet, popover, tooltip, dropdown-menu]
    defaults:
      status: stable
      renderer: "src/components/ui/<component>.tsx"
      documentation: "documentation.pages.components"
      preview-size: control
    preview_sizes:
      compact: [icon-button, badge, avatar, metric, progress, alert, toast, loading, dialog, sheet, popover, tooltip, dropdown-menu]
      control: [button, field, field-group, textarea, number-field, select, search, slider, keypad, checkbox, radio, switch, tabs, segmented-control, chip, stepper, empty-state, result]
      wide: [action-bar, agreement, navigation, app-header, global-navigation, local-navigation, bottom-app-bar, app-footer, breadcrumb, card, panel, list-cell, list-section, table, bar-chart, prose, responsive-grid, detail-header]
    source_overrides:
      icon-button: "src/components/ui/button.tsx#Button"
      action-bar: "src/components/ui/responsive-action-bar.tsx#ResponsiveActionBar"
      fixed-bottom-cta: "src/components/ui/responsive-action-bar.tsx#ResponsiveActionBar"
      search: "src/components/ui/search-field.tsx#SearchField"
      checkbox: "src/components/ui/selection-control.tsx#Checkbox"
      radio: "src/components/ui/radio-group.tsx#Radio"
      switch: "src/components/ui/selection-control.tsx#Switch"
      navigation: "src/components/ui/navigation.tsx#Navigation"
      app-header: "src/components/ui/app-shell.tsx#AppHeader"
      global-navigation: "src/components/ui/app-shell.tsx#GlobalNavigation"
      local-navigation: "src/components/ui/app-shell.tsx#LocalNavigation"
      bottom-app-bar: "src/components/ui/app-shell.tsx#BottomAppBar"
      app-footer: "src/components/ui/app-shell.tsx#AppFooter"
      top-navigation: "src/components/ui/app-shell.tsx#TopNavigation"
      side-navigation: "src/components/ui/app-shell.tsx#SideNavigation"
      breadcrumb: "src/components/ui/navigation.tsx#Breadcrumb"
      page-header: "src/components/ui/app-shell.tsx#PageHeader"
      section-header: "src/components/ui/app-shell.tsx#SectionHeader"
      side-panel: "src/components/ui/app-shell.tsx#SidePanel"
      workspace-shell: "src/components/ui/app-shell.tsx#WorkspaceShell"
      avatar: "src/components/ui/asset.tsx#Avatar"
      panel: "composition:surface-region"
      list-cell: "src/components/ui/list-row.tsx#ListRow"
      metric: "composition:label-value-delta"
      alert: "src/components/ui/feedback.tsx#InlineMessage"
      toast: "src/components/ui/feedback.tsx#Toast"
      loading: "src/components/ui/feedback.tsx#Loader"
      empty-state: "src/components/ui/result.tsx#Result"
      dropdown-menu: "src/components/ui/menu.tsx#Menu"
    token_bindings:
      button:
        height: { compact: "{component_tokens.button.compact-height}", default: "{component_tokens.button.default-height}", touch: "{component_tokens.button.touch-height}", prominent: "{component_tokens.button.prominent-height}" }
        padding-inline: { compact: "{component_tokens.button.compact-padding-x}", default: "{component_tokens.button.default-padding-x}", prominent: "{component_tokens.button.prominent-padding-x}" }
        radius: "{radius.control}"
        primary-background: "{color.primary}"
        primary-content: "{color.on-primary}"
      field:
        height: { compact: "{component_tokens.field.compact-height}", default: "{component_tokens.field.default-height}", touch: "{component_tokens.field.touch-height}" }
        radius: "{radius.control}"
        background: "{color.surface}"
        border: "{color.border}"
        focus-border: "{color.primary}"
      navigation:
        item-height: "{component_tokens.navigation.item-height}"
        compact-item-height: "{component_tokens.navigation.compact-item-height}"
        selected-content: "{color.primary-heavy}"
        selected-background: "{color.primary-soft}"
      card:
        padding: "{component_tokens.card.padding}"
        compact-padding: "{component_tokens.card.compact-padding}"
        radius: "{radius.card}"
        background: "{color.surface}"
      overlay:
        width: "{component_tokens.overlay.dialog-width}"
        max-width: "{component_tokens.overlay.dialog-max-width}"
        radius: "{radius.overlay}"
        shadow: "{shadow.modal}"
        scrim: "{color.scrim}"
      action-bar:
        padding: "{component_tokens.action-bar.padding}"
        background: "{color.surface-raised}"

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
        - "persistent regions use surface contrast first and at most one shared divider; never nested card outlines"
        - "inspector repeats section-header, row, label, and input primitives"
    playground:
      recipe: [Toolbar, LibraryPanel, Canvas, InspectorPanel]
      toolbar-height: "56px"
      side-panel-width: "280px..320px"
      rules:
        - "canvas uses color.page; frames use color.surface and selection ring"
        - "KTDS may style preview content; surrounding chrome remains Wonhee Product UI"
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

  develop:
    package_name: "@wonhee/design-system"
    status: "local-source"
    source:
      contracts: ["src/lib/design-systems/wonhee-design.md", "src/lib/design-systems/wonhee-product-ui.md"]
      token_compiler: "src/lib/aide-product-tokens.ts"
      primitives: "src/components/ui/*"
      showcase: "src/app/aide-ui"
      playground_catalog: "src/lib/wonhee-playground-components.ts"
    commands:
      validate: "npm run design:lint"
      export: "npm run design:export"
      diff: "npm run design:diff -- <before.md> <after.md>"
      verify: ["npm run lint", "npm run build"]
    generated:
      css: "src/lib/design-systems/generated/wonhee-product-ui.css"
      dtcg-json: "src/lib/design-systems/generated/wonhee-product-ui.tokens.json"
    react:
      import_policy: "use src/components/ui exports instead of screen-local primitives"
      styling_policy: "consume --aui-* variables; runtime geometry is the only inline-style exception"
    compatibility:
      browsers: "modern evergreen browsers"
      responsive_modes: [compact, medium, wide]
      accessibility: "WCAG 2.2 AA"

  ai:
    system_id: "wonhee"
    context_files: [wonhee-design.md, wonhee-product-ui.md]
    scope_detection:
      product-chrome: "apply both documents"
      generated-customer-ui: "do not apply wonhee-product-ui.md; use the selected customer design system"
      playground-canvas: "apply the design system selected by the canvas, not the surrounding Aide chrome"
    skill:
      id: "wonhee-design-system"
      purpose: "retrieve foundations, select registered components and patterns, generate contract-valid UI, and self-audit"
      workflow: [detect-scope, load-contract, select-pattern, select-components, bind-tokens, generate-states, validate]
    llms_txt:
      route: "/aide-ui/llms.txt"
      contents: [overview, contract-links, foundation-index, component-index, pattern-index, develop-commands]
    future_integrations: [docs-api, docs-mcp, figma-variables, code-connect]

  documentation:
    route: "/aide-ui"
    title: "Wonhee Design System"
    description: "디자인, 개발, AI가 같은 계약으로 Aide와 다른 제품의 일관된 UI를 만드는 공식 가이드"
    source_rule: "navigation, page metadata, token tables, component metadata, patterns, develop commands, and AI guidance come from this contract"
    navigation: [get-started, foundations, components, patterns, develop, ai-and-tools]
    layout:
      wide:
        structure: [left-navigation, document-content, on-this-page]
        left-navigation-width: "240px"
        on-this-page-width: "220px"
        content-max-width: "1040px"
        behavior: "both navigation panels remain sticky while document content scrolls"
      medium:
        structure: [left-navigation, document-content]
        behavior: "hide on-this-page; keep section navigation available"
      compact:
        structure: [document-content]
        behavior: "replace both side panels with horizontally scrollable top navigation; essential destinations remain available"
      left-navigation:
        source: "documentation.pages and component_registry.categories"
        scope: "current-global-navigation-group-only"
        behavior: "selecting a global navigation item replaces the entire left navigation; never concatenate sibling global groups"
        contents: [current-group-overview, current-group-pages, current-group-entries]
      on-this-page:
        source: "headings rendered by the current route only"
        scope: "current-page-only"
        contents: [current-page-section-headings, current-page-subsections]
        prohibited: [global-navigation-items, left-navigation-items, headings-from-other-routes]
    pages:
      get-started:
        title: "Get Started"
        items: [overview, principles, adoption, architecture]
      foundations:
        title: "Foundations"
        items: [design-token, color, typography, iconography, elevation, gradient, inclusive-design, international-design, layout, motion, radius, spacing, state, voice-and-tone, writing]
      components:
        title: "Components"
        categories: [actions, inputs, selection, navigation, data-display, feedback, overlays]
        items: [overview, progress-board, component-registry]
        overview: "render every registered component as a preview card grouped by category; each card links to its component detail route"
        route_pattern: "/aide-ui/components/<component-id>"
        page_template: [overview, preview, usage, anatomy, props, variants, sizes, states, responsive, accessibility, token-bindings, examples, prohibited, related]
      patterns:
        title: "Patterns"
        items: [landing, list-screen, detail-screen, form-screen, dashboard, workspace, loading, empty, error-and-recovery]
        page_template: [purpose, composition, responsive, states, accessibility, examples, prohibited]
      develop:
        title: "Develop"
        items: [installation, react, css-variables, token-api, component-api, responsive-api, validation, migration, changelog]
      ai-and-tools:
        title: "AI & Tools"
        items: [design-md, llms-txt, skill, prompt-guide, validation, export, mcp]
    page_states: [ready, planned, deprecated]
    rendering:
      mode: "contract-driven"
      missing_page: "fail validation"
      missing_component_example: "show planned state and fail coverage gate before stable release"

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

  validation:
    errors:
      - "missing required section or required component field"
      - "unsupported token group"
      - "unresolved token alias"
      - "duplicate token, component, layout, or visualization id"
      - "visualization section without renderer"
      - "renderer without visualization manifest entry"
      - "component visual literal that bypasses --aui-*"
      - "normal text contrast below 4.5:1"
      - "interactive state without visible focus or accessible name"
    warnings:
      - "token has no product or showcase consumer"
      - "component contract has no rendered state example"
      - "responsive behavior is inherited but not visually verified"
      - "component token duplicates a semantic token without component-specific reason"
    completion_gate:
      - schema-valid
      - aliases-resolved
      - token-consumer-coverage
      - component-state-coverage
      - showcase-renderer-parity
      - playground-catalog-parity
      - accessibility-pass
      - responsive-visual-regression-pass

  visualization:
    route: "/aide-ui"
    mode: "strict"
    lifecycle: "legacy single-page renderer manifest; migrate into documentation.pages without duplicating content"
    rule: "Every section below is rendered from this manifest; unknown or missing renderer ids fail the build"
    sections:
      - { id: brand, navigation: "Brand", eyebrow: "Identity", title: "Brand expression", description: "Aide의 브랜드 표현은 주목을 만드는 영역에만 사용하고, 실제 제작 workspace는 중립 surface를 유지합니다." }
      - { id: foundations, navigation: "Colors", eyebrow: "Foundations", title: "Color tokens", description: "Aide 제품 UI의 시맨틱 색상입니다. 화면 컴포넌트는 직접 색상값을 만들지 않고 이 토큰을 사용합니다." }
      - { id: typography, navigation: "Typography", eyebrow: "Foundations", title: "Typography", description: "MD에 정의된 제품 UI 타입 스케일을 실제 토큰으로 표시합니다." }
      - { id: tokens, navigation: "Tokens", eyebrow: "Foundations", title: "Spacing, radius, elevation, motion", description: "MD에 정의된 간격, radius, elevation, motion 토큰을 실제 값으로 표시합니다." }
      - { id: actions, navigation: "Actions", eyebrow: "Components", title: "Actions", description: "행동의 우선순위, 위험도, 크기와 상태를 공용 primitive로 표현합니다." }
      - { id: inputs, navigation: "Inputs", eyebrow: "Components", title: "Inputs and forms", description: "입력, 검증, 비활성 상태와 선택형 입력을 공용 primitive로 표시합니다." }
      - { id: selection, navigation: "Selection", eyebrow: "Components", title: "Selection and navigation", description: "Tabs, segmented control, chip과 상태 표현을 실제 컴포넌트로 표시합니다." }
      - { id: data, navigation: "Data", eyebrow: "Components", title: "Cards, lists and data display", description: "카드, 목록, 표와 데이터 표시 패턴을 실제 컴포넌트로 표시합니다." }
      - { id: feedback, navigation: "Feedback", eyebrow: "Components", title: "Feedback and system status", description: "저장, 생성, 오류, 빈 상태와 로딩을 실제 컴포넌트로 표시합니다." }
      - { id: overlays, navigation: "Overlays", eyebrow: "Components", title: "Overlays", description: "Dialog, alert dialog, popover, tooltip, menu와 sheet를 실제 동작으로 표시합니다." }
      - { id: compositions, navigation: "Compositions", eyebrow: "Composed patterns", title: "Reusable compositions", description: "공용 컴포넌트를 실제 서비스 화면 단위로 조합합니다." }
      - { id: specialized, navigation: "Specialized", eyebrow: "Specialized components", title: "Feature-specific controls", description: "선택적으로 사용하는 기능 컴포넌트와 명시적으로 제외한 보안 컴포넌트를 구분합니다." }
      - { id: layouts, navigation: "Navigation", eyebrow: "Patterns", title: "Navigation and action bars", description: "실제 탐색과 CTA 패턴을 공용 primitive로 비교합니다." }
      - { id: accessibility, navigation: "Accessibility", eyebrow: "Quality", title: "Interaction and accessibility", description: "MD의 접근성 요구사항을 누락 없이 표시합니다." }

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
3. 계층은 여백, surface 차이, 타이포그래피 순서로 만든다. Border는 기능적 경계가 필요한 마지막 수단이다.
4. 인접한 영구 영역에는 두 겹의 선을 만들지 않는다. 필요하면 공유 divider 하나만 사용한다.
5. Shadow는 실제로 떠 있는 raised card, menu, popover, dialog에만 사용하며 border와 중복하지 않는다.
6. Input, table row, tab indicator처럼 조작·비교에 필요한 선은 유지한다.
7. Primary blue 면적을 줄이고 선택·진행·행동의 의미를 선명하게 유지한다.

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
