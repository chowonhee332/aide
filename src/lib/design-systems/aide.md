---
version: alpha
name: Aide Design System
description: Aide unified design-system contract for product UI, documentation, Playground, and default generated screens. Use Aide brand identity, Google Material Symbols, compact product rhythm, deterministic navigation and shell assembly, content-dense sections, and stable variant archetype fidelity.
principles:
  - "App-native, not landing-page-first: build the usable product screen immediately."
  - "Compact and content-dense: every screen must feel like a real service with enough data, states, and actions."
  - "Fixed chrome, scrollable body: top navigation stays visible; content scrolls; bottom nav/action never covers content."
  - "Blue-led hierarchy: primary blue is for CTA, active state, KPI, and selection only."
  - "Archetype fidelity: final HTML must preserve the selected variant strategy, section rhythm, visual role, and CTA location."
brand:
  name: Aide
  logoSlot: <span class="aide-logo-slot" aria-label="brand logo"></span>
  forbiddenNames:
    - WDS
  iconSystem: Google Material Symbols only
  iconExample: <span class="material-symbols-rounded">home</span>
schema_version: "3.2"
document_id: aide
document_type: unified-design-system-contract
scope: product-and-default-generated-ui
status: normative
machine_contract:
  location: first fenced yaml block
  root_key: contract
  normative: true
  token_source: contract.tokens and contract.component_tokens only
source_of_truth:
  product_ui: this file
  aide_ui_showcase: this file
  default_generated_ui: this file
  external_design_override: uploaded DESIGN.md for generated customer UI only
---

# Aide Design System

+aide.md is the single source of truth for Aide product UI, /aide-ui, and default generated customer UI. An uploaded DESIGN.md overrides generated customer screens only.

## Machine-readable contract

```yaml
contract:
  schema:
    id: aide-design-system-contract
    version: "3.2"
    kind: unified-design-system
    normative_path: contract
    required_sections:
      - identity
      - foundations
      - tokens
      - responsive
      - component_schema
      - component_defaults
      - components
      - patterns
      - develop
      - ai
      - accessibility
      - prohibited
      - component_tokens
      - component_registry
      - layouts
      - documentation
      - visualization
    token_format:
      leaf_required:
        - $value
      leaf_optional:
        - $type
        - $description
      alias_syntax: "{group.token}"
      aliases_must_resolve: true
      literal_values_allowed_in:
        - tokens
        - component_tokens
      implementation_output_rule: components and layouts bind to semantic or component tokens before code generation
  inheritance:
    strategy: single-source
    source: aide.md
    override_boundary: An uploaded DESIGN.md overrides generated customer screens only; it never changes Aide product chrome.
  decision_order:
    - intent
    - viewport-mode
    - layout-pattern
    - existing-component
    - variant-and-size
    - state
    - semantic-token
    - accessibility-verification
  identity:
    character:
      - id: calm-workspace
        rule: 작업물이 가장 눈에 띄고 제품 chrome은 조용해야 한다
      - id: purposeful-blue
        rule: 파랑은 primary action, selection, focus, progress에만 사용한다
      - id: compact-precision
        rule: desktop tool은 조밀하되 label과 target의 판독성을 유지한다
      - id: one-language
        rule: Landing, Studio, Playground는 같은 token과 primitive를 공유한다
      - id: visible-status
        rule: 상태를 색만으로 전달하지 않는다
      - id: quiet-boundaries
        rule: 계층은 선보다 여백, surface 차이, 타이포그래피로 먼저 만든다
    principles:
      - id: task-first
        rule: 장식보다 핵심 작업과 정보 계층을 먼저 보이게 한다
      - id: one-primary-action
        rule: 한 화면 또는 한 local action group에는 primary action을 하나만 둔다
      - id: adaptive-not-shrunk
        rule: 모바일은 데스크톱의 축소판이 아니라 같은 작업의 재구성이다
      - id: composition-over-invention
        rule: 새 컴포넌트를 만들기 전에 기존 anatomy와 slot을 조합한다
      - id: visible-state
        rule: 상태와 의미를 색상 하나로 전달하지 않는다
    product: Aide
  foundations:
    order:
      - design-token
      - color
      - typography
      - iconography
      - elevation
      - gradient
      - inclusive-design
      - international-design
      - layout
      - motion
      - radius
      - spacing
      - state
      - voice-and-tone
      - writing
    design-token:
      purpose: 모든 시각 결정을 플랫폼과 컴포넌트가 공유하는 이름 있는 값으로 관리한다
      layers:
        - semantic
        - component
      layer_rule: semantic tokens name a role; component tokens name a part of one component. this system has no primitive palette layer — a role token holds its literal value
      rule: implementation consumes semantic or component tokens; primitive values remain inside the token contract
    color:
      purpose: 역할과 상태의 시각적 위계를 전달한다
      roles:
        - brand
        - action
        - surface
        - content
        - boundary
        - feedback
        - inverse
    typography:
      purpose: 콘텐츠 계층과 읽기 흐름을 일관되게 만든다
      requirements:
        - font-family
        - font-size
        - font-weight
        - line-height
        - letter-spacing
    iconography:
      purpose: 행동과 개념을 짧고 일관된 형태로 보조한다
      source: Google Material Symbols Rounded
      implementation: render through the shared MaterialIcon primitive; screen code never imports a second icon library
      defaults:
        fill: 0
        weight: 400
        grade: 0
        optical-size: 24
      rules:
        - decorative icons are hidden from assistive technology
        - meaningful icons have an accessible name
        - icons do not replace unfamiliar labels
        - use canonical Material Symbols names
        - filled state is reserved for selected or emphasized meaning
    elevation:
      purpose: 실제 stacking과 상호작용 관계만 표현한다
      levels:
        - resting
        - raised
        - floating
        - modal
    gradient:
      purpose: 브랜드 표현과 비조작 장식에 제한적으로 사용한다
      prohibited:
        - body-text-background
        - control-state-only
        - contrast-reducing-overlay
    inclusive-design:
      standard: WCAG 2.2 AA
      dimensions:
        - vision
        - hearing
        - motor
        - cognitive
        - situational
    international-design:
      rules:
        - allow text expansion
        - avoid direction encoded only by position
        - use locale-aware number, date, and currency formatting
    layout:
      models:
        - flow
        - stack
        - cluster
        - grid
        - split
        - sidebar
        - overlay
      rule: choose layout from information hierarchy and task, then adapt it by container width
    motion:
      purposes:
        - feedback
        - continuity
        - orientation
      rule: motion never blocks completion and respects reduced motion
    radius:
      roles:
        - small
        - control
        - card
        - overlay
        - pill
      rule: nested containers step the inner radius down to keep the curvature concentric with the outer surface (for example 8px outer with 4px inner)
    spacing:
      base: 4px
      rule: use the declared scale; arbitrary spacing is a validation error
    state:
      interaction:
        - default
        - hover
        - pressed
        - focus-visible
        - disabled
        - loading
      content:
        - loading
        - empty
        - error
        - success
        - stale
        - offline
    voice-and-tone:
      character:
        - clear
        - calm
        - direct
        - respectful
      rule: tone changes with user context while the product voice remains stable
    writing:
      rules:
        - lead with the user outcome
        - use verb-first action labels
        - name the problem and recovery action
        - avoid internal implementation terms
  tokens:
    dimension:
      $type: dimension
      space-1:
        $value: 4px
        $description: 4px micro gap
      space-2:
        $value: 8px
        $description: 8px related-item gap
      space-3:
        $value: 12px
        $description: 12px compact component gap
      space-4:
        $value: 16px
        $description: 16px default padding
      space-5:
        $value: 20px
        $description: 20px card or dialog padding
      space-6:
        $value: 24px
        $description: 24px section padding
      space-8:
        $value: 32px
        $description: 32px major separation
      space-10:
        $value: 40px
        $description: 40px page rhythm
      space-12:
        $value: 48px
        $description: Page-region separation
      space-16:
        $value: 64px
        $description: Large page-region separation
      control-compact:
        $value: 32px
        $description: Dense desktop tool control
      control-default:
        $value: 40px
        $description: General product control
      control-touch:
        $value: 44px
        $description: Touch-first minimum product control
      control-prominent:
        $value: 48px
        $description: Landing and major CTA
      content-narrow:
        $value: 700px
        $description: Primary form and focused reading width
      content-default:
        $value: 1120px
        $description: Default page content width
      content-wide:
        $value: 1440px
        $description: Wide workspace content width
      side-panel:
        $value: 280px
        $description: Default workspace side panel
      target-touch:
        $value: 44px
        $description: Touch-first minimum target
      toolbar-height:
        $value: 56px
        $description: Studio and Playground toolbar
      panel-min:
        $value: 280px
        $description: Workspace side panel minimum
      panel-max:
        $value: 320px
        $description: Workspace side panel preferred maximum
      content-max:
        $value: 1200px
        $description: Landing content maximum width
      hero-copy-max:
        $value: 560px
        $description: Landing hero supporting-copy measure
      hero-title-max:
        $value: 860px
        $description: Landing hero display measure
      header-height:
        $value: 64px
        $description: Marketing and showcase global navigation
      icon-sm:
        $value: 16px
        $description: Inline glyph icon — emoji and Material Symbols in body text
      icon-md:
        $value: 20px
        $description: Standard glyph icon — toolbar and control affordance
      icon-lg:
        $value: 22px
        $description: Prominent glyph icon — section and picker header
    color:
      $type: color
      primary:
        $value: "#1a75ff"
        $description: Primary Normal — primary action, selected control, focus indicator
      primary-strong:
        $value: "#186ae8"
        $description: Primary Strong — hover emphasis
      primary-pressed:
        $value: "#1560cc"
        $description: Primary Heavy — pressed emphasis
      primary-soft:
        $value: "#e8f1ff"
        $description: Selected and informative tinted surface
      on-primary:
        $value: "#ffffff"
        $description: Text and icon on primary action
      page:
        $value: "#f2f5f9"
        $description: Background Normal Alternative — workspace and application background
      surface:
        $value: "#ffffff"
        $description: Panel, card, control, dialog
      surface-muted:
        $value: rgba(112, 115, 124, 0.12)
        $description: Fill Normal — grouped region and secondary control
      surface-raised:
        $value: rgba(255, 255, 255, 0.96)
        $description: Floating toolbar and panel chrome
      text:
        $value: "#171719"
        $description: Label Normal — primary text
      text-muted:
        $value: rgba(55, 56, 60, 0.61)
        $description: Label Alternative — description and metadata
      text-assistive:
        $value: rgba(55, 56, 60, 0.28)
        $description: Label Assistive — placeholder and nonessential hint
      text-disabled:
        $value: rgba(55, 56, 60, 0.35)
        $description: Label Disable — disabled content
      border:
        $value: rgba(112, 115, 124, 0.35)
        $description: Line Normal Normal — control and panel boundary
      border-subtle:
        $value: rgba(112, 115, 124, 0.16)
        $description: Line Normal Alternative — divider and quiet boundary
      fill-subtle:
        $value: rgba(112, 115, 124, 0.08)
        $description: low-emphasis component fill
      positive:
        $value: "#00bf40"
        $description: Success icon and accent
      caution:
        $value: "#ff9200"
        $description: Warning icon and accent
      negative:
        $value: "#ff4242"
        $description: Error and destructive action
      info:
        $value: "#0066ff"
        $description: Informative state
      primary-heavy:
        $value: "#1560cc"
        $description: High-emphasis text on primary-soft
      primary-tint:
        $value: rgba(26, 117, 255, 0.28)
        $description: Focus ring and subtle state layer
      primary-outline:
        $value: rgba(26, 117, 255, 0.43)
        $description: selected outline emphasis
      primary-disabled:
        $value: "#f4f4f5"
        $description: Disabled primary control only
      hero-gradient-start:
        $value: "#95C7CD"
        $description: Existing Aide landing hero gradient start
      hero-gradient-middle:
        $value: "#0066FF"
        $description: Existing Aide landing hero gradient center
      hero-gradient-end:
        $value: "#B497CF"
        $description: Existing Aide landing hero gradient end
      canvas:
        $value: "#ffffff"
        $description: Landing and modal canvas
      surface-sunken:
        $value: "#f7f7f8"
        $description: Workspace canvas behind panels and artifacts
      glass-surface:
        $value: rgba(255, 255, 255, 0.72)
        $description: Brand-aware translucent chrome over expressive backgrounds
      glass-surface-strong:
        $value: rgba(255, 255, 255, 0.90)
        $description: Readable input and navigation surface over expressive backgrounds
      glass-border:
        $value: rgba(255, 255, 255, 0.34)
        $description: Boundary for translucent chrome
      inverse-surface:
        $value: "#1b1c1e"
        $description: Toast and inverse chrome
      text-strong:
        $value: "#000000"
        $description: Maximum emphasis; use sparingly
      text-neutral:
        $value: rgba(46, 47, 51, 0.88)
        $description: Secondary emphasis
      fill:
        $value: rgba(112, 115, 124, 0.12)
        $description: Secondary control fill
      fill-strong:
        $value: rgba(112, 115, 124, 0.22)
        $description: Pressed or stronger neutral fill
      negative-soft:
        $value: "#feecec"
        $description: Error background
      caution-soft:
        $value: "#fef4e6"
        $description: Warning background
      scrim:
        $value: rgba(23, 23, 25, 0.52)
        $description: Modal backdrop
      scrim-soft:
        $value: rgba(0, 0, 0, 0.25)
        $description: Light backdrop and hover veil
      scrim-strong:
        $value: rgba(0, 0, 0, 0.65)
        $description: Focused media or fullscreen backdrop
      on-dark:
        $value: "#ffffff"
        $description: Text on inverse surface
      on-dark-strong:
        $value: rgba(255, 255, 255, 0.90)
        $description: High-emphasis text on inverse surface
      on-dark-muted:
        $value: rgba(255, 255, 255, 0.72)
        $description: Secondary text on inverse surface
      on-dark-subtle:
        $value: rgba(255, 255, 255, 0.30)
        $description: Divider on inverse surface
      on-dark-faint:
        $value: rgba(255, 255, 255, 0.15)
        $description: Quiet boundary on inverse surface
      inverse-surface-raised:
        $value: "#292A2D"
        $description: Raised layer on inverse chrome
      primary-muted:
        $value: rgba(26, 117, 255, 0.08)
        $description: Quiet primary fill and progress track
      negative-border:
        $value: "#ff8c8c"
        $description: Error field boundary
      caution-border:
        $value: "#ffc06e"
        $description: Warning container boundary
      caution-text:
        $value: "#d47800"
        $description: Readable warning text on caution-soft
    typography:
      $type: typography
      display:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 36px
          fontWeight: "700"
          lineHeight: 47px
          letterSpacing: -0.0253em
        $description: Title 1 — product introduction and compact display
      page-title:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 28px
          fontWeight: "700"
          lineHeight: 36px
          letterSpacing: -0.023em
        $description: Title 3 — page title
      section-title:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 24px
          fontWeight: "700"
          lineHeight: 31px
          letterSpacing: -0.002em
        $description: Headline 1 — section title
      heading:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 20px
          fontWeight: "700"
          lineHeight: 26px
          letterSpacing: -0.012em
        $description: Heading 2 — component heading
      body:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 16px
          fontWeight: "400"
          lineHeight: 24px
          letterSpacing: 0.0096em
        $description: Body 2 Normal — default product body
      body-small:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 14px
          fontWeight: "400"
          lineHeight: 21px
          letterSpacing: 0.0145em
        $description: Label 1 Normal — compact body
      label:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 14px
          fontWeight: "600"
          lineHeight: 21px
          letterSpacing: 0.0145em
        $description: Label 1 Normal — control label
      caption:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 12px
          fontWeight: "400"
          lineHeight: 18px
          letterSpacing: 0.0252em
        $description: Caption 1 — metadata and supporting copy
      display-hero:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 56px
          fontWeight: "800"
          lineHeight: 73px
          letterSpacing: -0.0319em
        $description: Display 1 — landing hero maximum
      display-large:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 40px
          fontWeight: "700"
          lineHeight: 52px
          letterSpacing: -0.0282em
        $description: Display 2 — showcase and marketing hero
      compact:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 13px
          fontWeight: "600"
          lineHeight: 20px
          letterSpacing: 0.0194em
        $description: Label 2 — compact desktop control
      micro:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 11px
          fontWeight: "500"
          lineHeight: 16px
          letterSpacing: 0.0311em
        $description: Caption 2 — dense tool hint and item description
      meta:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 12px
          fontWeight: "700"
          lineHeight: 18px
          letterSpacing: 0.0311em
        $description: Caption 2 emphasized — metadata badge and source label
      nano:
        $value:
          fontFamily: var(--font-pretendard)
          fontSize: 11px
          fontWeight: "600"
          lineHeight: 16px
          letterSpacing: 0.0311em
        $description: Legacy alias of Caption 2; 11px is the minimum UI type size
    radius:
      $type: dimension
      # 4px 간격의 한 스케일. control이 8px 기준이고 위로 두 단계가 카드와 오버레이다.
      sm:
        $value: 4px
        $description: Compact toolbar control
      control:
        $value: 6px
        $description: default button and field radius
      card:
        $value: 8px
        $description: Card and grouped content surface
      overlay:
        $value: 8px
        $description: Dialog and sheet
      pill:
        $value: 1000px
        $description: Badge, chip, avatar, status only
    shadow:
      $type: shadow
      resting:
        $value: 0 1px 2px -1px rgba(23, 23, 23, 0.10)
        $description: Shadow Normal XSmall — subtle resting separation
      raised:
        $value: 0 2px 4px -2px rgba(23, 23, 23, 0.06), 0 4px 6px -1px rgba(23, 23, 23, 0.06)
        $description: Shadow Normal Small — card and hovering surface
      floating:
        $value: 0 4px 6px -2px rgba(23, 23, 23, 0.07), 0 10px 15px -3px rgba(23, 23, 23, 0.07)
        $description: Shadow Normal Medium — dropdown, popover, drag preview
      modal:
        $value: 0 10px 15px -5px rgba(23, 23, 23, 0.10), 0 24px 38px -10px rgba(23, 23, 23, 0.12)
        $description: Shadow Normal XLarge — dialog and sheet
      card:
        $value: 0 2px 4px -2px rgba(23, 23, 23, 0.06), 0 4px 6px -1px rgba(23, 23, 23, 0.06)
        $description: Raised card only; plain cards remain borderless
      elevated:
        $value: 0 6px 10px -4px rgba(23, 23, 23, 0.08), 0 16px 24px -6px rgba(23, 23, 23, 0.08)
        $description: Popover, menu, dialog
      focus:
        $value: 0 0 0 2px var(--aui-primary-tint)
        $description: Visible keyboard focus ring
      subtle:
        $value: 0 1px 2px -1px rgba(23, 23, 23, 0.10)
        $description: Resting chip and inline control
      ring:
        $value: 0 0 0 1px rgba(112, 115, 124, 0.08)
        $description: Hairline outline instead of border
      glow:
        $value: "0 0 8px #DCEAFF"
        $description: Focus or active emphasis halo
      line:
        $value: rgba(0, 0, 0, 0.07)
        $description: Hairline shadow color
      soft:
        $value: rgba(0, 0, 0, 0.09)
        $description: Soft shadow color
      medium:
        $value: rgba(0, 0, 0, 0.15)
        $description: Medium shadow color
    duration:
      $type: duration
      fast:
        $value: 160ms
        $description: Hover, pressed, checkbox
      base:
        $value: 200ms
        $description: Dropdown, panel, popover
      slow:
        $value: 250ms
        $description: Dialog and page transition
      loop:
        $value: 1000ms
        $description: Repeating skeleton shimmer and spinner cycle
      easing:
        $value: cubic-bezier(0.16, 1, 0.3, 1)
        $type: cubicBezier
        $description: Shared easing curve
    gradient:
      $type: string
      brand-hero:
        $value: "linear-gradient(180deg, #FFFFFF 0%, #F5F8FF 100%)"
        $description: Quiet product-first landing surface
      brand-hero-soft:
        $value: "linear-gradient(180deg, #FFFFFF 0%, #EDF3FF 100%)"
        $description: Low-intensity documentation and empty-state expression
      brand-accent:
        $value: "linear-gradient(90deg, #7AA2FF 0%, #2F6BFF 100%)"
        $description: Short blue decorative accent; not a control background
    blur:
      $type: dimension
      glass:
        $value: 16px
        $description: Navigation and lightweight translucent chrome
      glass-strong:
        $value: 24px
        $description: Readable glass card over expressive background
    weight:
      $type: fontWeight
      regular:
        $value: "400"
        $description: Body and long-form text
      medium:
        $value: "500"
        $description: Quiet emphasis and dense hints
      semibold:
        $value: "600"
        $description: Labels, controls, list titles
      bold:
        $value: "700"
        $description: Headings and primary emphasis
      extrabold:
        $value: "800"
        $description: Hero display only
    tracking:
      $type: dimension
      tighter:
        $value: -0.03em
        $description: Hero display and large headings
      tight:
        $value: -0.015em
        $description: Default UI text and headings
      normal:
        $value: -0.005em
        $description: Monospace and neutral text
      slight:
        $value: 0.03em
        $description: Small caps-ish labels
      wide:
        $value: 0.06em
        $description: Uppercase label and badge
      wider:
        $value: 0.09em
        $description: Eyebrow and section kicker
    leading:
      $type: number
      none:
        $value: "1"
        $description: Single-line glyph, badge, icon label
      tight:
        $value: "1.3"
        $description: Display and heading
      snug:
        $value: "1.35"
        $description: Compact UI copy
      normal:
        $value: "1.5"
        $description: Body text
      relaxed:
        $value: "1.6"
        $description: Long-form description and help text
  responsive:
    modes:
      compact:
        range: 0..767px
        input: touch-first
        density: comfortable
        columns: 2
        page-padding: 16px
        control-min: 44px
      medium:
        range: 768px..1279px
        input: touch-or-pointer
        density: comfortable
        columns: 3
        page-padding: 16px
        control-min: 40px
      wide:
        range: 1280px+
        input: pointer-and-keyboard
        density: compact-or-comfortable
        columns: 12
        page-padding: 24px
        control-min: 32px dense, 40px general
    rules:
      - MUST design all three modes; desktop wrap alone is not responsive behavior
      - MUST preserve task, content, state, and action across modes
      - SHOULD replace persistent side regions with drawer, sheet, or dedicated route on compact
      - MUST NOT hide essential functionality solely because the viewport is compact
      - MUST use container queries for reusable components when parent width matters more than viewport
    breakpoints:
      compact: 0..767px
      medium: 768px..1279px
      wide: 1280px+
      xs: 0..479px
      sm: 480px..767px
      md: 768px..1279px
      lg: 1280px..1439px
      xl: 1440px+
    grid:
      basis: 8px
      spacing-rule: 4px multiples; 2px optical correction is allowed
      gutter: 20px
      max-width:
        lg: 1100px including page padding
        xl: 1440px including page padding
    behavior:
      compact:
        - side panels become drawer, sheet, or dedicated route
        - general targets become at least 44px
        - dialog actions stack when labels do not fit
      medium:
        - one secondary panel may remain persistent
      wide:
        - workspace may show canvas and two side panels
  component_defaults:
    documentation:
      - purpose
      - anatomy
      - slots
      - variants
      - sizes
      - states
      - responsive
      - accessibility
      - prohibited
    required_fields:
      all:
        - anatomy
      interactive:
        - purpose
        - states
      inherited:
        - responsive
        - accessibility
      implementation:
        - token-bindings
    states:
      - default
      - hover
      - pressed
      - focus-visible
      - disabled
    slots_are_semantic: true
    uncontrolled_visual_state: false
    icon_only_requires:
      - accessible-name
      - square-target
      - tooltip-when-meaning-is-not-obvious
    custom_component_threshold: Create only when composition cannot express a recurring behavior used in 2+ places
    implementation_rules:
      - shared primitives consume --aui-* variables generated from this contract
      - screen components cannot introduce new static visual literals
      - optional slots define omission behavior without empty wrappers
      - variants express hierarchy, state, or task semantics rather than decoration
    static_style_source: --aui-* or shared class
    runtime_style_exceptions:
      - canvas-transform
      - drag-position
      - measured-geometry
      - state-derived-value
  component_schema:
    rule: a component entry is a portable behavior contract; a product document supplies final token bindings and renderer
    entry_kinds:
      - component
      - family
    component_entry:
      required:
        - purpose
      expected:
        - anatomy
        - rules
      optional:
        - usage
        - variants
        - states
        - sizes
        - responsive
        - slots
        - inherits
      extension: a component MAY add contract-bearing keys of its own, such as min-height, radius, max-options, or fallback-order
      usage_entry:
        rule: usage answers the selection question that purpose and rules do not — when this component is the right choice, and what to reach for instead when it is not
        keys:
          when: conditions where this component is the correct choice
          when_not: conditions where it is the wrong choice
          instead: component ids to use in those cases, each paired with the condition
        note: a component that is easily confused with a peer SHOULD declare usage, and the peer SHOULD point back through instead
    family_entry:
      required:
        - members
      optional:
        - rules
        - responsive
      note: an abstract grouping such as overlay or feedback; it has members instead of purpose and anatomy
    style:
      key: kebab-case
      purpose: lowercase verb phrase, no trailing period, one sentence
      rules: each entry begins with or contains a normative keyword
    normative_keywords:
      - MUST
      - MUST NOT
      - SHOULD
      - SHOULD NOT
      - MAY
    delegated_fields:
      category: contract.component_registry.categories
      props: contract.component_recipes.items
      defaults: contract.component_recipes.items
      preview_size: contract.component_registry.preview_sizes
      renderer: contract.component_registry.source_overrides
      token_bindings: contract.component_registry.token_bindings
    status_values:
      - planned
      - experimental
      - stable
      - deprecated
    prop_schema:
      required:
        - type
        - required
        - description
      optional:
        - default
        - values
  anatomy_glossary:
    rule: anatomy part names share one vocabulary; a part is described once here and every component that uses the name inherits the description
    optional_prefix: a part named optional-<part> is the same part, omitted when it does not apply
    parts:
      accessory: trailing element that adds context without changing the row action
      action: a control that performs one operation
      action-group: the set of confirm and cancel controls, ordered by hierarchy
      actions: controls available for the surrounding content
      active-indicator: the mark showing which item is currently selected
      active-item: the destination that matches the current view
      agreement-items: the individual consent choices, required and optional
      app-header: the bar carrying screen title, context, and screen-level actions
      article: one self-contained entry of content
      backspace: the key that removes the last entered character
      bars: the plotted value marks of the chart
      body: the main readable content of the surface
      brand: the product mark or wordmark
      caption: short secondary text that qualifies the main value
      category-labels: the axis labels naming each plotted group
      cells: the individual data positions of a row
      chevron: the affordance showing the control expands or navigates
      clear-action: the control that empties the current value
      close-action: the control that dismisses the surface
      collapse-action: the control that folds the region to its compact form
      connector: the line joining sequential steps
      container: the bounded surface that holds the component
      content: the primary content the component exists to present
      context: supporting text that locates the content in the product
      control: the interactive element the user operates
      controls: the grouped interactive elements of the component
      counter: the count of items or remaining characters
      current-page: the item representing the page the user is on, not a link
      decrement-action: the control that lowers the value by one step
      delta: the change compared with the previous period
      description: the sentence explaining what the surface is for
      detail-actions: controls that open the full text of an item
      dismiss: the control that removes the message
      error: the text identifying what is invalid and how to recover
      eyebrow: the short label above the title naming the group
      figure: the illustrative image or graphic
      floating-surface: the layer that renders above the page content
      footer: the closing region of the surface
      footer-landmark: the page-level closing region exposed as a landmark
      frame: the bounded shape that clips the visual
      global-navigation: the destination set spanning the whole product
      grid: the reflowing arrangement of peer items
      header: the opening region carrying title and context
      header-landmark: the page-level opening region exposed as a landmark
      headings: the section titles that structure the text
      help: the text that explains the expected input
      highlight: the emphasized passage within the content
      icon: the symbol that carries or supports the meaning
      icons: the symbols shown for each item
      increment-action: the control that raises the value by one step
      indicator: the mark showing progress or state
      input: the field the user types into
      items: the repeated entries of the collection
      key-grid: the arrangement of number keys
      keys: the individual number keys
      label: the text naming what the control is for
      labels: the texts naming each entry
      leading: the element at the start of the row
      leading-icon: the symbol before the label that supports its meaning
      left-action: the control at the start edge, usually back or close
      legal: the required legal or policy text
      legend: the name of the grouped fields, exposed programmatically
      link-navigation: the grouped links to related destinations
      list-content: the repeated rows of the list
      main-content: the primary region of the page, exposed as a landmark
      menu: the list of options revealed by the trigger
      menu-action: the control that opens the menu
      menu-item: one selectable option of the menu
      message: the sentence stating what happened or what is required
      metadata: the supporting facts such as time, author, or status
      navigation-landmark: the destination set exposed as a navigation landmark
      option: one choice available for selection
      ordered-items: the entries whose sequence carries meaning
      ordered-list: the sequence container that preserves order
      overlay: the layer that sits above the page
      panel: a bounded region of the workspace
      paragraphs: the body text blocks
      plot: the drawing area of the chart
      primary-action: the single action the surface exists to complete
      primary-label: the main text identifying the entry
      remove-action: the control that deletes the entry
      right-actions: the controls at the end edge of the bar
      rows: the repeated records of the table
      safe-area: the inset that keeps content clear of system chrome
      scrim: the dimmed layer that separates the surface from the page
      search-icon: the symbol marking the field as a search
      secondary-action: the alternative action offered beside the primary one
      secondary-actions: the supporting controls beside the primary action
      segment: one option of the segmented set
      select-all: the control that toggles every item at once
      selected-segment: the segment representing the active mode
      semantic-icon: the symbol carrying the status meaning
      separator: the divider between grouped content
      separators: the dividers between repeated entries
      side-navigation: the destination set placed along the side edge
      side-panel: the supporting region beside the main content
      status-icon: the symbol showing success, warning, or error
      step-indicator: the mark showing which step is current or complete
      subtitle: the secondary line under the title
      supporting-text: the text that explains or qualifies the control
      surface: the raised plane the content sits on
      tab: one destination of the tab set
      tablist: the container that groups the tabs
      thumb: the draggable handle of the track
      title: the name of the surface or section
      title-or-message: the single line stating the subject or the outcome
      track: the rail the value moves along
      trailing: the element at the end of the row
      trailing-icon: the symbol after the label that reinforces the action
      trigger: the control that opens the surface
      utility-actions: the secondary controls such as search or settings
      value: the current value the component holds
      value-labels: the texts naming each plotted value
      value-or-placeholder: the chosen value, or the prompt shown when empty
      value-output: the readable text of the current value
      visual: the image, initials, or icon that represents the entity

  components:
    button:
      purpose: trigger one immediate action
      anatomy:
        - optional-leading-icon
        - label
        - optional-trailing-icon
      variants:
        - primary
        - secondary
        - outline
        - ghost
        - destructive
        - link
      sizes:
        compact:
          height: 32px
          horizontal-padding: 12px
        default:
          height: 40px
          horizontal-padding: 16px
        prominent:
          height: 48px
          horizontal-padding: 20px
      hierarchy:
        rule: one screen has exactly one level-4 action; lower levels support it
        levels:
          level-4: primary — the single main action the screen exists for
          level-3: secondary — an alternative path such as preview or save draft
          level-2: outline — supports a toggled or selected state
          level-1: ghost or link — close, cancel, back, and other recovery actions
        variant_map:
          primary: level-4
          destructive: level-4
          secondary: level-3
          outline: level-2
          ghost: level-1
          link: level-1
      usage:
        when:
          - a user triggers an action
          - the label carries the meaning of the action
        when_not:
          - the control only moves to another destination
          - the icon alone is unambiguous and space is tight
        instead:
          - icon-button when the icon alone is unambiguous and space is tight
      states:
        - default
        - hover
        - pressed
        - focus-visible
        - disabled
        - loading
      behavior:
        loading:
          - preserve the button width and readable label context
          - set aria-busy and prevent duplicate activation
          - announce completion or failure outside the button when the result is not otherwise visible
        destructive:
          - use destructive only for actions that remove, revoke, or irreversibly discard
          - require confirmation when the effect is difficult to undo or affects shared work
        toggle:
          - use aria-pressed and a stable label when one button switches a persistent state
          - use switch instead when the control represents an immediate on-or-off setting
        action-group:
          - order recovery or cancel before the primary action in left-to-right layouts
          - keep destructive and primary actions visually distinct when both are required
      responsive:
        compact: touch or prominent
        medium: default or touch
        wide: dense or default
      rules:
        - MUST use radius.control; ordinary buttons MUST NOT use pill
        - MUST show readable disabled label
        - MUST use verb-first concise label
        - MUST NOT place two primary actions in one local action group
        - MUST NOT present more than one primary action in a view
        - loading MUST preserve enough label context to identify the action
        - destructive MUST NOT be used merely to make an action visually prominent
        - toggle buttons MUST expose pressed state programmatically
    icon-button:
      purpose: trigger one action with an icon alone
      anatomy:
        - icon
      sizes:
        - 32px
        - 40px
        - 44px
      usage:
        when:
          - the icon alone is unambiguous
          - a dense toolbar has no room for a label
        when_not:
          - the action needs written words to be understood
        instead:
          - button when the label carries the meaning
      states:
        - default
        - hover
        - pressed
        - focus-visible
        - disabled
      rules:
        - MUST have aria-label
        - MUST be square
        - SHOULD show tooltip for unfamiliar action
    field:
      purpose: capture one value with a persistent label
      anatomy:
        - label
        - control
        - optional-supporting-text
        - optional-status-icon
      variants:
        - box
        - line
        - search
        - display
      usage:
        when:
          - one value is captured with a persistent label
        when_not:
          - the input filters or finds content
          - the value is numeric with bounds and a step
        instead:
          - search when the input narrows content
          - number-field when the value is bounded and numeric
      states:
        - default
        - hover
        - focus-visible
        - filled
        - disabled
        - read-only
        - success
        - error
      rules:
        - MUST keep a programmatic label; placeholder MUST NOT be the only label
        - error MUST include message text and aria-invalid
        - focus MUST use primary border and visible ring
        - MUST NOT hide the label once the field has focus or a value
      sizes:
        compact: 32px
        default: 40px
    selection-control:
      members:
        - checkbox
        - radio
        - switch
      anatomy:
        - control
        - label
        - optional-description
      rules:
        - checkbox MUST be used for independent multi-selection
        - radio MUST be used for one choice in a group
        - switch MUST be used for an immediately effective setting
    tabs:
      purpose: navigate peer content destinations
      anatomy:
        - tablist
        - tab
        - active-indicator
        - panel
      variants:
        - line
        - contained
        - scrollable
      usage:
        when:
          - content destinations are peers at the same level
          - the user switches between them repeatedly
        when_not:
          - the sections must be read in order
          - there is only one destination
        instead:
          - segmented-control when switching a local view rather than navigating
          - stepper when the sections are sequential
      states:
        - default
        - hover
        - selected
        - focus-visible
        - disabled
      rules:
        - selected state MUST include indicator or fill in addition to color
        - MUST support arrow-key navigation
        - MUST NOT hide overflowing tabs without a scroll affordance
    segmented-control:
      purpose: change a local view or mode
      max-options: 5
      responsive:
        compact: 2..4 options
        medium: 2..5 options
        wide: 2..5 options
      anatomy:
        - container
        - segment
        - selected-segment
      usage:
        when:
          - the choice switches a local view or mode immediately
          - options are two to four short labels
        when_not:
          - the choice is a form value to submit
          - options are content destinations
        instead:
          - radio when the value is submitted with a form
          - tabs when the options are peer content destinations
      states:
        - default
        - hover
        - selected
        - focus-visible
        - disabled
    chip:
      purpose: filter or compact selection
      variants:
        - solid
        - outlined
      radius: 6px
      anatomy:
        - optional-icon
        - label
        - optional-remove-action
      usage:
        when:
          - filters are applied and removed repeatedly
          - selection is compact and multiple
        when_not:
          - the control navigates to another view
          - only one option may ever be active
        instead:
          - tabs when the control navigates between destinations
          - segmented-control when exactly one mode is active
      states:
        - default
        - hover
        - selected
        - focus-visible
        - disabled
      rules:
        - MUST NOT overflow a single line without wrapping or a scroll affordance
    badge:
      purpose: show compact metadata or status
      variants:
        - neutral
        - info
        - success
        - warning
        - error
      usage:
        when:
          - a short status or count qualifies nearby content
        when_not:
          - the user selects or removes it
        instead:
          - chip when the user selects or removes it
      rules:
        - MUST include text or icon meaning beyond color
        - MUST NOT be the only carrier of a status meaning
      anatomy:
        - optional-status-icon
        - label
      radius: pill
    asset:
      purpose: normalize image, icon, video, lottie, avatar presentation
      anatomy:
        - frame
        - content
        - optional-overlay
        - optional-accessory
      frame-shapes:
        - square
        - rounded
        - card
        - circle
        - clean
      fit:
        - cover
        - contain
        - fill
      rules:
        - MUST reserve layout space
        - MUST define alt behavior
        - MUST use responsive sources for meaningful images
    list-row:
      purpose: scan and act on repeated information
      slots:
        - leading
        - contents
        - metadata
        - trailing
      contents:
        - one-line
        - two-line
        - three-line
      trailing:
        - text
        - badge
        - icon-button
        - switch
        - chevron
      min-height:
        compact: 56px
        medium: 52px
        wide: 48px
      usage:
        when:
          - information repeats and is scanned or acted on
          - each item has the same shape
        when_not:
          - values must be compared across shared columns
        instead:
          - table when comparing values across columns
          - card when each item is a distinct concept
      rules:
        - MUST keep primary label and row action distinguishable
        - SHOULD use dividers before separate cards for repeated data
        - MUST NOT overload trailing with more than one primary interaction
    card:
      purpose: group one related concept into a bounded surface
      anatomy:
        - optional-header
        - content
        - optional-footer
      variants:
        - plain
        - raised
        - bordered
        - selectable
      usage:
        when:
          - one related concept is grouped into a bounded surface
        when_not:
          - every section is being wrapped for decoration
          - the region is a persistent part of the workspace
        instead:
          - panel when the region is a persistent workspace area
          - list-row when the content repeats and is scanned
      states:
        - default
        - selected
        - disabled
      rules:
        - MUST group one related concept
        - MUST NOT wrap every section in a card
        - MUST NOT nest cards except for selectable preview artifacts
        - plain SHOULD be the default on page backgrounds; border is opt-in when the boundary has functional meaning
        - raised uses one subtle elevation and MUST NOT add a border at the same time
    table:
      purpose: compare structured values across shared columns
      anatomy:
        - caption
        - header
        - body
        - rows
        - cells
        - optional-actions
      responsive:
        compact: prioritized list conversion or explicit horizontal scroll
        medium: hide only columns with declared priority
        wide: full comparison table
      usage:
        when:
          - values are compared across shared columns
          - the data is structured and dense
        when_not:
          - each item is scanned rather than compared
          - the viewport is compact and columns cannot fit
        instead:
          - list-row when items are scanned rather than compared
      states:
        - loading
        - empty
        - error
        - populated
      behavior:
        sorting:
          - sortable headers MUST be buttons and expose ascending, descending, or none
          - sorting MUST preserve filters and row selection unless the data itself changes
        filtering:
          - active filters MUST remain visible, removable, and reflected in the result count
          - no-result after filtering MUST preserve the filters and provide a clear-all action
        selection:
          - select-all MUST state whether it applies to the page or the full result set
          - bulk actions MUST appear only when at least one row is selected
          - selection MUST survive sorting and pagination only when rows have stable identifiers
        scrolling:
          - sticky headers MUST preserve column alignment and accessible header relationships
          - virtualization MUST retain keyboard reachability and announce the represented row count
      alignment:
        text: start
        numeric: end with tabular figures
        status: start unless comparison requires a centered matrix
        actions: end
      density:
        compact: operational data with frequent scanning
        default: general product data
        comfortable: descriptive or touch-first rows
      rules:
        - MUST provide a caption
        - numeric values SHOULD use tabular figures
        - sortable headers MUST expose direction
        - MUST NOT drop columns on compact viewports without an alternative view
        - row selection MUST have an accessible name independent of row position
        - bulk actions MUST state the selected item count
        - sticky or virtualized tables MUST preserve header-to-cell relationships
    navigation:
      purpose: move among primary or secondary product destinations
      variants:
        - top
        - side
        - bottom
      responsive:
        compact: bottom navigation or menu sheet
        medium: top navigation or collapsible rail
        wide: top or persistent side navigation
      usage:
        when:
          - a screen presents a persistent set of destinations
        when_not:
          - the control switches content inside one screen
        instead:
          - tabs when switching content within one screen
      states:
        - default
        - hover
        - active
        - focus-visible
        - disabled
      rules:
        - active state MUST include more than color
        - landmark MUST have an accessible label
      anatomy:
        - navigation-landmark
        - items
        - active-item
        - optional-menu-action
    app-shell-navigation:
      members:
        - app-header
        - top-navigation
        - global-navigation
        - local-navigation
        - side-navigation
        - bottom-app-bar
        - app-footer
      responsive:
        compact: app header plus an IA-appropriate bottom app bar or menu sheet; footer stacks
        medium: app header plus collapsible local navigation; footer stacks or splits
        wide: app header with global navigation plus optional persistent local navigation; footer splits
      rules:
        - global navigation MUST contain top-level destinations only
        - local navigation MUST contain destinations from the selected global area only
        - bottom app bar MUST contain three to five destinations and respect safe area
        - collapsed navigation MUST preserve labels for assistive technology
    responsive-workspace-shell:
      members:
        - workspace-shell
        - page-header
        - section-header
        - side-panel
        - fixed-bottom-cta
      responsive:
        compact: one primary route at a time; navigation and inspector become drawer, sheet, or route
        medium: one persistent side region and one overlay side region
        wide: persistent navigation, primary canvas, and optional resizable inspector
      rules:
        - main content MUST remain the primary landmark
        - persistent panels MUST define minimum and maximum widths
        - fixed bottom CTA MUST reserve safe-area and content clearance
    feedback:
      members:
        - inline-message
        - banner
        - toast
        - progress
        - skeleton
        - result
      rules:
        - toast is transient and MUST NOT be the only place for critical errors
        - skeleton SHOULD mirror final structure
        - result MUST contain a title, a description, and one useful next action
    overlay:
      members:
        - tooltip
        - popover
        - menu
        - dialog
        - sheet
      responsive:
        compact: dialog MAY become bottom or full-height sheet
        medium: dialog or anchored popover
        wide: dialog, popover, or menu according to task
      rules:
        - MUST dismiss predictably
        - blocking overlays MUST manage and restore focus
        - destructive confirmation MUST name consequence
    action-bar:
      purpose: present the final actions for a page, form, or blocking task
      anatomy:
        - container
        - secondary-actions
        - primary-action
        - optional-safe-area
      responsive:
        compact: stack full-width actions with primary last in DOM and visually first
        medium: inline actions aligned to the end
        wide: inline actions aligned to the end
      usage:
        when:
          - several actions apply to the current view or selection
        when_not:
          - one primary action completes the task on a compact viewport
        instead:
          - fixed-bottom-cta when a single primary action completes the task
      rules:
        - MUST keep one primary action
        - fixed mode MUST not obscure page content or keyboard focus
    field-group:
      purpose: group multiple related fields under one programmatic legend
      anatomy:
        - legend
        - controls
        - optional-help
        - optional-error
      rules:
        - MUST use fieldset and legend semantics
        - group error MUST identify the affected controls
      usage:
        when:
          - related fields are validated and submitted together
        when_not:
          - a single value is captured
        instead:
          - field when capturing one value
      states:
        - default
        - disabled
        - error
    number-field:
      purpose: enter or increment a bounded numeric value
      anatomy:
        - label
        - decrement-action
        - value
        - increment-action
      usage:
        when:
          - an exact number matters
          - the value has known bounds and a step
        when_not:
          - the range is wide and the exact value does not matter
          - the value is continuous and approximate
        instead:
          - slider when an approximate value from a wide range is enough
      states:
        - default
        - focus-visible
        - disabled
        - min
        - max
      rules:
        - MUST expose the current value and bounds
        - increment controls MUST have accessible names
    slider:
      purpose: select an approximate value from a continuous or stepped range
      anatomy:
        - label
        - value-output
        - track
        - thumb
      usage:
        when:
          - an approximate value is enough
          - the user benefits from seeing the value relative to its range
        when_not:
          - the exact value must be typed or verified
          - the range is unbounded
        instead:
          - number-field when precise entry is essential
      states:
        - default
        - focus-visible
        - disabled
      rules:
        - MUST expose min, max, step, and current value
        - number-field SHOULD be used instead when precise entry is essential
    agreement:
      purpose: collect grouped required and optional consent choices
      anatomy:
        - legend
        - select-all
        - agreement-items
        - optional-detail-actions
      rules:
        - required and optional items MUST be labeled in text
        - select-all MUST keep individual values programmatically exposed
      usage:
        when:
          - consent must be collected and recorded
          - required and optional items must be distinguished
        when_not:
          - the choice is an ordinary preference
        instead:
          - checkbox when the choice is a plain multi-select
      states:
        - unchecked
        - mixed
        - checked
        - focus-visible
    stepper:
      purpose: show progress and current position in a multi-step task
      anatomy:
        - ordered-list
        - step-indicator
        - label
        - optional-description
        - connector
      usage:
        when:
          - a task is sequential and progress must stay visible
        when_not:
          - the sections are peers the user moves between freely
        instead:
          - tabs when the sections are peer destinations
      states:
        - upcoming
        - current
        - complete
        - error
      rules:
        - current step MUST use aria-current
        - step labels SHOULD remain visible on compact screens
        - MUST NOT allow skipping a step that later steps depend on
        - SHOULD use three to seven visible steps; longer flows SHOULD group milestones
        - labels SHOULD be concise noun or verb phrases and MUST NOT wrap beyond two lines
        - completed steps MAY be clickable only when returning does not invalidate dependent work
        - compact layouts SHOULD show current step, total step count, and the next label when all labels do not fit
      variants:
        - horizontal
        - vertical
        - compact
      interaction:
        clickable-step: completed and revisitable only
        current-step: not clickable
        upcoming-step: not clickable unless the flow explicitly allows non-linear navigation
    list-section:
      purpose: group a titled set of related list rows
      anatomy:
        - optional-header
        - list-content
        - optional-footer
      usage:
        when:
          - rows are grouped under a heading
        when_not:
          - a single row is described
        instead:
          - list-row for the row itself
      states:
        - loading
        - empty
        - populated
      rules:
        - one outer boundary SHOULD be used only when grouping needs emphasis
        - row separation SHOULD use quiet dividers
    bar-chart:
      purpose: compare a small set of categorical numeric values
      anatomy:
        - figure
        - caption
        - plot
        - bars
        - value-labels
        - category-labels
      usage:
        when:
          - a small number of categorical values are compared visually
        when_not:
          - exact values must be read precisely
        instead:
          - table when exact values must be read
          - metric when one number is the point
      states:
        - loading
        - empty
        - error
        - populated
      rules:
        - MUST expose each category and value as text
        - color alone MUST NOT identify a series
        - MUST NOT distinguish series by color alone
    prose:
      purpose: render long-form product guidance with controlled reading width
      anatomy:
        - article
        - headings
        - paragraphs
        - optional-highlight
      usage:
        when:
          - the content is long-form reading
        when_not:
          - the content is structured data
        instead:
          - list-row when the content repeats
          - table when values are compared
      rules:
        - MUST preserve semantic heading order
        - line length SHOULD remain within the readable measure
    responsive-grid:
      purpose: arrange peer items by available container width
      anatomy:
        - grid
        - items
      usage:
        when:
          - peer items reflow across viewports
        when_not:
          - values are compared across shared columns
        instead:
          - table when comparing across columns
      states:
        - loading
        - empty
        - populated
      rules:
        - MUST define a useful minimum item width
        - MUST avoid empty columns created only to fill a desktop grid
      responsive:
        compact: one column
        medium: auto-fit from minimum item width
        wide: auto-fit without stretching content beyond its useful measure
    detail-header:
      purpose: introduce a detail page and its primary contextual actions
      anatomy:
        - optional-eyebrow
        - title
        - optional-description
        - optional-metadata
        - optional-actions
      responsive:
        compact: stack actions below content
        medium: align actions to the end when space permits
        wide: content and actions share one header row
      usage:
        when:
          - one record identity and its actions head a detail view
        when_not:
          - the page is a list or overview
        instead:
          - page-header when the page is an overview
    textarea:
      purpose: capture multi-line text with optional length feedback
      anatomy:
        - label
        - control
        - optional-counter
        - optional-supporting-text
      min-height: 80px
      inherits: field
      usage:
        when:
          - the input is multi-line prose
        when_not:
          - the value is a single short line
        instead:
          - field when the value fits one line
      states:
        - default
        - hover
        - focus-visible
        - filled
        - disabled
        - read-only
        - error
    select:
      purpose: choose one option from a predefined list
      anatomy:
        - label
        - trigger
        - value-or-placeholder
        - chevron
        - menu
        - option
      inherits: field
      usage:
        when:
          - options exceed what fits as visible controls
          - the list is predefined and one choice is allowed
        when_not:
          - there are only two or three options that fit inline
          - the user must compare options side by side
        instead:
          - radio when few options should stay visible
          - segmented-control when the choice switches a local view
      states:
        - default
        - hover
        - focus-visible
        - open
        - filled
        - disabled
        - error
      rules:
        - MUST expose selected value and keyboard navigation
        - MUST NOT reorder options between renders
    search:
      purpose: find or filter content with a clearable query
      anatomy:
        - search-icon
        - input
        - optional-clear-action
      inherits: field
      usage:
        when:
          - the user finds or narrows content by typing
          - results update from the query
        when_not:
          - the input captures a value to submit
        instead:
          - field when the input captures a form value
      states:
        - default
        - hover
        - focus-visible
        - filled
        - loading
        - disabled
        - no-results
        - error
      lifecycle:
        idle: show scope, recent queries, or suggestions only when they are useful
        typing: preserve the query and distinguish local filtering from submitted search
        loading: retain previous results when they remain valid and mark the region busy
        results: announce the result count and keep active filters visible
        no-results: repeat the query, preserve filters, and offer correction or clear-filter actions
        error: preserve query and filters and offer a retry
      coordination:
        - query and filters MUST share one visible result count
        - clearing the query MUST NOT silently clear filters
        - recent queries MUST be user-relevant, removable, and omitted for sensitive input
      rules:
        - MUST show clear action when a non-empty query can be cleared
        - MUST NOT clear the query on result updates
        - result changes SHOULD use a polite live region without moving focus
        - no-results MUST distinguish an unmatched query from an empty data set
    checkbox:
      anatomy:
        - control
        - label
        - optional-description
      usage:
        when:
          - multiple options may be selected
          - the value is submitted with a form
        when_not:
          - the change takes effect immediately as a setting
          - exactly one option must be chosen
        instead:
          - switch when the change applies immediately
          - radio when exactly one option is allowed
      states:
        - unchecked
        - checked
        - indeterminate
        - focus-visible
        - disabled
      purpose: select any number of independent options
    radio:
      anatomy:
        - control
        - label
        - optional-description
      usage:
        when:
          - options are few and should all stay visible
          - the choice is a form value
        when_not:
          - options are many or dynamic
          - more than one option may be chosen
        instead:
          - select when the list is long
          - checkbox when multiple choices are allowed
      states:
        - unselected
        - selected
        - focus-visible
        - disabled
      purpose: select exactly one option in a group
    switch:
      anatomy:
        - track
        - thumb
        - label
        - optional-description
      usage:
        when:
          - the change applies immediately
          - the setting is a single on or off state
        when_not:
          - the value is submitted later with a form
          - more than two states exist
        instead:
          - checkbox when the value is submitted with a form
      states:
        - off
        - on
        - focus-visible
        - disabled
      purpose: toggle a setting that applies immediately
    avatar:
      purpose: represent a person or entity with an image, initials, or fallback icon
      anatomy:
        - frame
        - visual
        - optional-status-icon
      sizes:
        - 24px
        - 32px
        - 40px
      fallback-order:
        - image
        - initials
        - generic-user-icon
      states:
        - image
        - initials
        - fallback
      usage:
        when:
          - a person or entity is represented
        when_not:
          - a status or count is represented
        instead:
          - badge when showing status or count
      rules:
        - MUST NOT act as a control without an accessible name
    panel:
      purpose: define a persistent workspace region
      anatomy:
        - optional-header
        - content
        - optional-footer
      separation: surface contrast first; use one shared divider only when adjacent regions would otherwise merge
      states:
        - default
        - collapsed
      usage:
        when:
          - the region persists as part of the workspace
        when_not:
          - the content is one self-contained concept in a feed or grid
        instead:
          - card when grouping one related concept
    list-cell:
      purpose: present one row of repeated data
      anatomy:
        - optional-leading
        - primary-label
        - optional-metadata
        - optional-trailing
      min-height: 48px
      usage:
        when:
          - one content slot inside a list row is described
        when_not:
          - the whole repeated row is described
        instead:
          - list-row for the repeated row
      states:
        - default
        - selected
      rules:
        - repeated data SHOULD use rows and subtle dividers before separate cards
    metric:
      purpose: present one key number with optional change and context
      anatomy:
        - label
        - value
        - optional-delta
        - optional-context
      usage:
        when:
          - a single number is the point of the block
        when_not:
          - the trend across values matters more than the number
        instead:
          - bar-chart when the comparison matters more
      states:
        - loading
        - populated
        - stale
      rules:
        - delta MUST include direction and comparison context
        - numeric columns SHOULD use tabular figures
        - MUST NOT show a number without its label or unit
    progress:
      purpose: communicate how much of a task is complete
      anatomy:
        - optional-label
        - track
        - indicator
        - optional-value
      usage:
        when:
          - the completed share of an operation is known
        when_not:
          - the duration is unknown
        instead:
          - loading when the duration is unknown
      states:
        - determinate
        - indeterminate
        - complete
        - error
      rules:
        - MUST expose accessible value or accompanying status text
        - MUST NOT move backward once advanced
    alert:
      purpose: communicate a status message inline and persistently
      anatomy:
        - semantic-icon
        - title-or-message
        - optional-description
        - optional-action
      variants:
        - info
        - success
        - warning
        - error
      placements:
        page-banner: service-wide or page-wide condition affecting most content
        section-message: persistent condition affecting one nearby region
        field-message: validation tied to one input; use field error instead of alert
      usage:
        when:
          - the status must stay visible in place
          - the message explains a condition affecting nearby content
        when_not:
          - the message is a transient confirmation
          - the message interrupts the whole flow
        instead:
          - toast when confirming a completed action
          - dialog when the flow must stop
      rules:
        - MUST combine icon or explicit label with color
        - MUST NOT auto-dismiss
        - page banners MUST appear before the affected page content in reading order
        - urgent errors requiring immediate attention MUST use role alert; ordinary updates SHOULD use role status
    toast:
      purpose: confirm a completed action with a brief temporary message
      anatomy:
        - status-icon
        - message
        - optional-action
        - optional-dismiss
      usage:
        when:
          - an action completed and the result is not critical
          - the message needs no response
        when_not:
          - the user must act on the message
          - the message must remain visible
        instead:
          - alert when the message must persist inline
          - dialog when the user must respond before continuing
      rules:
        - MUST be concise and temporary
        - critical errors MUST remain visible elsewhere until resolved
        - MUST NOT stack more than three messages at once
        - MUST NOT carry the only control for a required action
        - SHOULD use a polite live region and MUST NOT move focus on arrival
        - repeated confirmations SHOULD update or coalesce instead of flooding the stack
      selection:
        toast: brief confirmation that needs no response
        alert: persistent status tied to visible content
        dialog: blocking decision or required response
    loading:
      purpose: hold attention while an operation is in flight
      anatomy:
        - indicator
        - optional-description
      variants:
        - spinner
        - progress
        - skeleton
      skeleton:
        shapes:
          text: match the expected line count and approximate line lengths
          image: match the final media aspect ratio and radius
          list-or-table: repeat the final row rhythm without implying real values
          card: mirror only stable structural regions
        motion:
          default: subtle pulse or shimmer with no layout movement
          reduced-motion: static tonal placeholder with no shimmer
        avoid_when:
          - content is already visible and usable
          - the final structure is unknown or likely to shift substantially
          - the wait is an explicit background operation better described by status text
          - an error or empty state is known
      usage:
        when:
          - the duration is unknown and content is not ready
        when_not:
          - the completed share is known
        instead:
          - progress when the completed share is known
      rules:
        - MUST describe the operation when waiting is not obvious
        - skeleton SHOULD mirror final content structure
        - MUST NOT replace content that is already visible and usable
        - loading regions MUST expose aria-busy and a readable status when the wait is meaningful
        - animated indicators MUST honor reduced-motion preferences
        - skeleton MUST NOT include convincing fake data or interactive controls
    empty-state:
      purpose: explain an absent result and offer one next action
      anatomy:
        - optional-visual
        - title
        - description
        - optional-primary-action
      variants:
        first-use:
          message: explain the value and the first meaningful action
          action: one creation or setup action
        no-results:
          message: repeat the search intent and suggest a correction
          action: clear or revise the query
        filtered-empty:
          message: explain that active filters exclude all items
          action: clear all filters or remove a named filter
        permission-empty:
          message: explain the missing access without implying that no data exists
          action: request access or contact the responsible role when available
      usage:
        when:
          - a container has no content yet
          - the user needs a first action
        when_not:
          - content failed to load
        instead:
          - alert when a load failed
      rules:
        - SHOULD explain what is absent and provide one useful next action
        - MUST NOT be shown while data is still loading
        - MUST distinguish absent data from failed loading, hidden data, and filtered results
        - optional visual MUST support the message and MUST NOT dominate the next action
    dialog:
      purpose: interrupt the flow for a focused decision or task
      anatomy:
        - title
        - optional-description
        - close-action
        - content
        - action-group
      width:
        default: 420px
        max: 560px
      usage:
        when:
          - the flow must stop for a decision
          - the task is short and focused
        when_not:
          - the message only confirms a completed action
          - the content is contextual to a trigger
        instead:
          - toast when confirming a completed action
          - popover when the content is anchored to a trigger
          - sheet when the content is long or reached from a screen edge
      states:
        - closed
        - open
      rules:
        - MUST trap focus, close with Escape, restore focus, and label the dialog
        - destructive confirmation MUST name the target and recovery consequence
        - MUST NOT open another dialog on top of an open dialog
    popover:
      purpose: reveal contextual content anchored to a trigger
      anatomy:
        - trigger
        - floating-surface
        - content
      usage:
        when:
          - content belongs to a specific trigger
          - the content is short and dismissible
        when_not:
          - the content requires a decision before continuing
          - the content is long or scrollable
        instead:
          - dialog when the flow must stop for a decision
          - sheet when the content needs its own surface
      states:
        - closed
        - open
      rules:
        - MUST dismiss on outside interaction and Escape
    tooltip:
      purpose: supplement an accessible name
      anatomy:
        - trigger
        - surface
        - content
      usage:
        when:
          - a brief label clarifies a control
        when_not:
          - the content is interactive
          - the content is long
        instead:
          - popover when the content is interactive or long
      rules:
        - MUST NOT contain essential instructions or interactive actions
    dropdown-menu:
      purpose: present a list of actions anchored to a trigger
      anatomy:
        - trigger
        - menu
        - menu-item
        - optional-separator
      usage:
        when:
          - a trigger reveals a list of actions
        when_not:
          - the user chooses a value to submit
        instead:
          - select when choosing a form value
      states:
        - closed
        - open
        - focus-visible
        - disabled
      rules:
        - MUST support keyboard navigation and visible focus
    keypad:
      purpose: provide an explicit touch-first alphabetic or numeric input surface
      anatomy:
        - label
        - key-grid
        - keys
        - optional-backspace
      variants:
        - alphabet
        - number
      usage:
        when:
          - numeric entry is the primary task on a touch screen
          - the value is a PIN or an amount
        when_not:
          - the number is one field among many in a form
        instead:
          - number-field when the number is one field in a form
      states:
        - default
        - pressed
        - disabled
      rules:
        - MUST preserve native keyboard access
        - MUST NOT replace a physical keyboard without user need
    top-navigation:
      purpose: identify the current screen and expose navigation and contextual actions
      anatomy:
        - optional-left-action
        - title
        - optional-subtitle
        - right-actions
      variants:
        - root
        - standard
      responsive:
        compact: sticky app bar
        medium: sticky app bar or part of app header
        wide: use for screen context, not as a substitute for global navigation
      usage:
        when:
          - the product has few top-level destinations
          - the surface is a site or portal
        when_not:
          - destinations are many or hierarchical
        instead:
          - side-navigation when destinations are many or hierarchical
          - bottom-app-bar on compact viewports
      states:
        - default
        - scrolled
        - item-active
        - focus-visible
      rules:
        - root variant MUST be used for first-depth screens
        - standard variant MUST distinguish back from close
        - right actions SHOULD remain at three or fewer
    side-navigation:
      purpose: provide persistent or collapsible navigation for medium and wide workspaces
      anatomy:
        - optional-title
        - items
        - active-item
        - optional-collapse-action
      responsive:
        compact: replace with drawer or sheet
        medium: collapsible rail
        wide: persistent labeled navigation
      usage:
        when:
          - destinations are many or hierarchical
          - the surface is an admin or workspace
        when_not:
          - the viewport is compact
          - there are only a few destinations
        instead:
          - bottom-app-bar on compact viewports
          - top-navigation when there are few destinations
      states:
        - expanded
        - collapsed
        - item-active
        - focus-visible
      rules:
        - collapsed items MUST retain accessible names
        - active state MUST expose aria-current
    app-header:
      purpose: provide persistent product identity, global navigation, and utility actions
      anatomy:
        - header-landmark
        - brand
        - optional-menu-action
        - global-navigation
        - utility-actions
      responsive:
        compact: brand plus menu and essential actions
        medium: brand plus reduced global navigation
        wide: brand, full global navigation, and actions
      usage:
        when:
          - a screen needs its title, context, and screen-level actions
        when_not:
          - the bar carries the product-wide destination set
        instead:
          - global-navigation when the bar spans the whole product
      rules:
        - MUST preserve access to all destinations when navigation collapses
        - sticky headers MUST not obscure focused content
    global-navigation:
      purpose: move between top-level product destinations
      anatomy:
        - navigation-landmark
        - items
        - active-item
      usage:
        when:
          - destinations span the whole product
        when_not:
          - destinations belong to one section only
        instead:
          - local-navigation when destinations belong to one section
      states:
        - default
        - item-active
        - focus-visible
      rules:
        - MUST be used only for top-level destinations
        - active state MUST expose aria-current
    local-navigation:
      purpose: move within the currently selected product area
      anatomy:
        - optional-title
        - navigation-landmark
        - items
        - active-item
      responsive:
        compact: drawer or sheet
        medium: collapsible rail
        wide: persistent side navigation
      usage:
        when:
          - destinations belong within one section
        when_not:
          - destinations span the whole product
        instead:
          - global-navigation when destinations span the product
      states:
        - default
        - item-active
        - focus-visible
      rules:
        - MUST contain only destinations in the current global area
        - collapse MUST preserve accessible labels
    bottom-app-bar:
      purpose: provide thumb-reachable access to three to five primary mobile destinations
      anatomy:
        - navigation-landmark
        - items
        - icons
        - labels
        - active-item
        - safe-area
      responsive:
        compact: visible when selected by IA
        medium: replace with top or side navigation
        wide: not used
      usage:
        when:
          - the viewport is compact
          - there are three to five top-level destinations
        when_not:
          - the surface is a desktop workspace
          - destinations exceed five
        instead:
          - side-navigation for many destinations
          - top-navigation on wide viewports
      rules:
        - MUST contain three to five destinations
        - MUST respect safe-area inset
        - labels MUST remain visible
    app-footer:
      purpose: close a page with product identity, supporting links, and legal information
      anatomy:
        - footer-landmark
        - brand
        - optional-description
        - link-navigation
        - optional-legal
      responsive:
        compact: stack content and links
        medium: stack or split
        wide: split brand and link groups
      usage:
        when:
          - secondary, legal, or site-wide links belong at the end of a page
        when_not:
          - the links are the primary destination set
        instead:
          - global-navigation for primary destinations
      rules:
        - MUST not duplicate primary navigation without a clear reason
        - link groups MUST use descriptive navigation labels
    breadcrumb:
      purpose: show hierarchy and provide navigation to ancestor levels
      anatomy:
        - navigation-landmark
        - ordered-items
        - separators
        - current-page
      usage:
        when:
          - the user is deep in a hierarchy and needs the path back
        when_not:
          - the structure is flat
        instead:
          - local-navigation when the section is flat
      rules:
        - current page MUST use aria-current
        - separators MUST be hidden from assistive technology
        - MUST NOT link the current page to itself
    page-header:
      purpose: introduce a route or workspace page and expose its primary contextual actions
      anatomy:
        - optional-eyebrow
        - title
        - optional-description
        - optional-actions
      responsive:
        compact: stack actions after copy
        medium: inline when space permits
        wide: copy and actions share one row
      usage:
        when:
          - a page needs its title, description, and primary action
        when_not:
          - the header describes one record
        instead:
          - detail-header when heading a single record
          - section-header when heading a section inside a page
    section-header:
      purpose: introduce a content section and optionally expose one trailing action
      anatomy:
        - title
        - optional-description
        - optional-trailing
      usage:
        when:
          - a section inside a page needs a title and optional action
        when_not:
          - it is the title of the page itself
        instead:
          - page-header for the page title
      rules:
        - heading level MUST follow document hierarchy
        - trailing action SHOULD remain secondary to the section title
    side-panel:
      purpose: show contextual tools, properties, or supporting information beside a workspace
      anatomy:
        - header
        - content
        - optional-footer
      responsive:
        compact: sheet or route
        medium: overlay panel
        wide: persistent or resizable panel
      usage:
        when:
          - supporting content stays beside the main content
        when_not:
          - the content must block the flow
          - the viewport is compact
        instead:
          - sheet on compact viewports
          - dialog when the content must block
      states:
        - open
        - collapsed
      rules:
        - panel state MUST not remove access to primary content
        - resizable implementations MUST define min and max width
    workspace-shell:
      purpose: compose header, navigation, primary canvas, and optional inspector into a responsive tool workspace
      anatomy:
        - app-header
        - optional-side-navigation
        - main-content
        - optional-side-panel
      responsive:
        compact: header plus one active route or sheet
        medium: one persistent panel and one overlay panel
        wide: persistent navigation, canvas, and optional inspector
      usage:
        when:
          - the product is a persistent multi-region workspace
        when_not:
          - the surface is single-column content
        instead:
          - responsive-workspace-shell when regions must adapt across viewports
      rules:
        - main content MUST remain the primary landmark
        - keyboard focus order MUST follow visual reading order
    fixed-bottom-cta:
      purpose: keep one or two task-completion actions reachable at the bottom edge
      anatomy:
        - optional-secondary-action
        - primary-action
        - safe-area
      responsive:
        compact: fixed and safe-area aware
        medium: fixed only for task flows
        wide: prefer inline action area unless persistence is required
      usage:
        when:
          - one primary action completes the task
          - the viewport is compact and the action must stay reachable
        when_not:
          - several peer actions apply at once
        instead:
          - action-bar when multiple actions apply to the view
      rules:
        - MUST not be used as primary navigation
        - content MUST reserve enough bottom space to remain visible
    result:
      purpose: explain an empty, success, or terminal state and offer a useful next action
      anatomy:
        - optional-figure
        - title
        - optional-description
        - optional-action
      variants:
        - empty
        - success
        - error
      usage:
        when:
          - a flow ends with a full-screen outcome
        when_not:
          - the outcome is a brief confirmation
        instead:
          - toast when a brief confirmation is enough
      rules:
        - title MUST state the outcome
        - action SHOULD provide a relevant recovery or continuation
    sheet:
      purpose: show contextual or blocking content from a screen edge
      anatomy:
        - scrim
        - surface
        - title
        - optional-description
        - content
        - close-action
      variants:
        - bottom
        - right
      responsive:
        compact: bottom or full-height sheet
        medium: bottom or right sheet
        wide: right sheet for inspectors and bottom sheet for short tasks
      usage:
        when:
          - content is long enough to need its own surface
          - the surface is reached from a screen edge on compact viewports
        when_not:
          - the decision is short and blocking
          - the content belongs next to its trigger
        instead:
          - dialog when a short blocking decision is required
          - popover when the content is anchored to a trigger
      states:
        - closed
        - open
        - dragging
      rules:
        - MUST trap and restore focus
        - MUST close with Escape
        - bottom sheet MUST respect safe area
        - MUST NOT cover the entire viewport on wide screens
    accordion:
      purpose: expand and collapse a section of related content in place
      anatomy:
        - trigger
        - indicator
        - content
      usage:
        when:
          - secondary detail is optional and would otherwise crowd the page
          - several peer sections are scanned before one is opened
        when_not:
          - the content must be read to complete the task
          - only one short passage is hidden
        instead:
          - dialog when the content must interrupt the flow
          - prose when the content should always be readable
      states:
        - collapsed
        - expanded
        - focus-visible
        - disabled
      rules:
        - trigger MUST expose expanded state
        - MUST remain operable by keyboard
        - MUST NOT hide content required to finish the task
    date-picker:
      purpose: choose a calendar date from a constrained range
      anatomy:
        - label
        - trigger
        - calendar
        - day-grid
        - selected-day
      usage:
        when:
          - the value is a calendar date
          - valid dates are bounded or need visual context
        when_not:
          - the value is a free numeric entry
          - only a time of day is needed
        instead:
          - time-picker when only a time of day is chosen
          - field when a typed date is faster than picking one
      states:
        - default
        - open
        - selected
        - focus-visible
        - disabled
        - error
      rules:
        - MUST expose the selected date as text
        - MUST support keyboard navigation across days
        - MUST state the allowed range when dates are restricted
    time-picker:
      purpose: choose a time of day from a constrained range
      anatomy:
        - label
        - trigger
        - time-list
        - selected-time
      usage:
        when:
          - the value is a time of day
        when_not:
          - the value is a calendar date
        instead:
          - date-picker when the value is a calendar date
      states:
        - default
        - open
        - selected
        - focus-visible
        - disabled
        - error
      rules:
        - MUST expose the selected time as text
        - MUST state the minute interval when it is restricted
    pagination:
      purpose: move between pages of a long result set
      anatomy:
        - previous-action
        - page-items
        - current-page
        - next-action
      usage:
        when:
          - results are split into numbered pages
          - the user needs to reach a specific page directly
        when_not:
          - results continue in one uninterrupted scroll
          - the set is short enough to show at once
        instead:
          - pagination-dots when the set is short and visual
      states:
        - default
        - hover
        - focus-visible
        - disabled
      rules:
        - current page MUST be exposed and MUST NOT be a link
        - MUST keep previous and next reachable by keyboard
    pagination-dots:
      purpose: show position within a short set of peer views
      anatomy:
        - dots
        - active-dot
      usage:
        when:
          - a short carousel or onboarding sequence needs a position hint
        when_not:
          - the user must jump to a specific page
        instead:
          - pagination when a specific page must be reachable
      states:
        - default
        - active
      rules:
        - MUST expose the current position to assistive technology
        - MUST NOT be the only way to move between views
    carousel:
      purpose: browse peer items horizontally within limited width
      anatomy:
        - viewport
        - items
        - optional-controls
        - optional-indicator
      usage:
        when:
          - peer items are browsed casually and order is not critical
        when_not:
          - every item must be seen or compared
        instead:
          - responsive-grid when every item must be visible
          - table when items are compared across columns
      states:
        - default
        - dragging
        - focus-visible
      rules:
        - MUST remain operable by keyboard
        - MUST NOT hide essential content behind a swipe only
    avatar-group:
      purpose: show several related people or entities in one compact cluster
      anatomy:
        - avatars
        - overflow-counter
      usage:
        when:
          - several participants are represented in one row
        when_not:
          - one entity is represented
        instead:
          - avatar when a single entity is represented
      states:
        - default
        - truncated
      rules:
        - overflow count MUST be readable as text
        - MUST cap the visible avatars and summarise the rest
    rating:
      purpose: show or collect a score on a fixed scale
      anatomy:
        - label
        - symbols
        - value-output
      usage:
        when:
          - a score on a fixed scale is shown or collected
        when_not:
          - the value is an arbitrary number
        instead:
          - slider when the value is continuous
          - metric when only displaying one number
      states:
        - default
        - hover
        - selected
        - read-only
        - focus-visible
        - disabled
      rules:
        - MUST expose the numeric value as text
        - interactive rating MUST be operable by keyboard
    file-uploader:
      purpose: attach one or more files to a task
      anatomy:
        - label
        - drop-area
        - browse-action
        - file-list
        - optional-progress
      usage:
        when:
          - the task requires attaching files
        when_not:
          - the value is typed text
        instead:
          - field when the value is typed
      states:
        - default
        - dragging
        - uploading
        - complete
        - error
        - disabled
        - analyzing
        - partial
      analysis:
        accepted-input:
          - show supported file types, per-file size, total size, and file-count limits before selection
          - identify encrypted, corrupted, duplicate, or unsupported files separately
        privacy:
          - state how sensitive files are processed before upload
          - warn before sending files that may contain personal or confidential information when policy requires it
        per-file-lifecycle:
          - queued
          - uploading
          - analyzing
          - needs-review
          - complete
          - error
        recovery:
          - preserve successful files when another file fails
          - allow retry or replacement for the affected file only
          - explain whether reupload replaces or adds to existing analysis
          - partial completion MUST summarize accepted, failed, and review-required files
      rules:
        - MUST state accepted types and size limits
        - MUST expose upload progress and failures as text
        - MUST allow removing an attached file
        - drag and drop MUST have an equivalent browse action operable by keyboard
        - analysis status MUST be exposed per file and announced without stealing focus
        - removing or replacing a file MUST explain any downstream analysis that will be invalidated
    anchor:
      purpose: navigate to another document or location
      anatomy:
        - label
        - optional-external-icon
      usage:
        when:
          - the control moves to another page or location
        when_not:
          - the control performs an action on this page
        instead:
          - button when the control performs an action
      states:
        - default
        - hover
        - visited
        - focus-visible
      rules:
        - MUST be a real link with an href
        - MUST NOT be styled as an ordinary button
        - link opening a new context MUST say so
    floating-action-button:
      purpose: keep one primary mobile action reachable above the content
      anatomy:
        - icon
        - optional-label
      usage:
        when:
          - one creation action is the point of a mobile screen
        when_not:
          - the viewport is a desktop workspace
          - several peer actions apply
        instead:
          - fixed-bottom-cta when the action completes a task
          - action-bar when several actions apply
      states:
        - default
        - pressed
        - focus-visible
        - disabled
      rules:
        - MUST have an accessible name
        - MUST NOT cover content the user still needs
        - MUST NOT appear more than once on a screen
    editor:
      purpose: compose and format long-form rich text
      anatomy:
        - toolbar
        - content
        - optional-status
      usage:
        when:
          - the user writes formatted long-form content
        when_not:
          - the input is a short plain value
        instead:
          - textarea when plain multi-line text is enough
      states:
        - default
        - focus-visible
        - read-only
        - disabled
      rules:
        - MUST expose formatting controls to keyboard and screen readers
        - MUST preserve user content on recoverable errors
  reference_catalog:
    policy: Coverage map only. Names identify capabilities found in public TDS docs; implementation and appearance follow the independent Aide contract.
    status_values:
      - core
      - composed
      - specialized
      - excluded
    items:
      badge:
        category: status
        target: badge
        status: core
      board-row:
        category: data-display
        target: list-row
        status: composed
      border:
        category: layout
        target: divider
        status: composed
      bottom-info:
        category: feedback
        target: inline-message
        status: composed
      bottom-sheet:
        category: overlay
        target: sheet
        status: core
      bubble:
        category: feedback
        target: tooltip-or-callout
        status: composed
      button:
        category: action
        target: button
        status: core
      checkbox:
        category: selection
        target: selection-control.checkbox
        status: core
      grid-list:
        category: data-display
        target: responsive-grid
        status: composed
      highlight:
        category: typography
        target: text-highlight
        status: composed
      icon-button:
        category: action
        target: icon-button
        status: core
      list-footer:
        category: data-display
        target: list-section.footer
        status: composed
      list-header:
        category: data-display
        target: list-section.header
        status: composed
      loader:
        category: feedback
        target: feedback.loader
        status: core
      menu:
        category: overlay
        target: overlay.menu
        status: core
      modal:
        category: overlay
        target: overlay.dialog
        status: core
      numeric-spinner:
        category: input
        target: number-field
        status: specialized
      paragraph:
        category: typography
        target: prose.paragraph
        status: composed
      post:
        category: content
        target: prose.article
        status: composed
      progress-bar:
        category: feedback
        target: feedback.progress
        status: core
      progress-stepper:
        category: feedback
        target: progress-stepper
        status: specialized
      rating:
        category: input
        target: rating
        status: specialized
      result:
        category: feedback
        target: feedback.result
        status: core
      search-field:
        category: input
        target: field.search
        status: core
      segmented-control:
        category: selection
        target: segmented-control
        status: core
      skeleton:
        category: feedback
        target: feedback.skeleton
        status: core
      slider:
        category: input
        target: slider
        status: specialized
      stepper:
        category: navigation
        target: stepper
        status: specialized
      switch:
        category: selection
        target: selection-control.switch
        status: core
      tab:
        category: navigation
        target: tabs
        status: core
      table-row:
        category: data-display
        target: table.row
        status: composed
      text-button:
        category: action
        target: button.ghost
        status: composed
      toast:
        category: feedback
        target: feedback.toast
        status: core
      tooltip:
        category: overlay
        target: overlay.tooltip
        status: core
      top:
        category: pattern
        target: detail-header
        status: composed
      agreement-v3:
        category: legal-form
        target: agreement
        status: excluded
        reason: deprecated source API
      agreement-v4:
        category: legal-form
        target: agreement
        status: specialized
      asset:
        category: media
        target: asset
        status: core
      bottom-cta-single:
        category: action
        target: responsive-action-bar.single
        status: composed
      bottom-cta-double:
        category: action
        target: responsive-action-bar.double
        status: composed
      fixed-bottom-cta:
        category: action
        target: responsive-action-bar.fixed
        status: composed
      bar-chart:
        category: data-visualization
        target: chart.bar
        status: specialized
      alert-dialog:
        category: overlay
        target: overlay.alert-dialog
        status: composed
      confirm-dialog:
        category: overlay
        target: overlay.confirm-dialog
        status: composed
      alphabet-keypad:
        category: input
        target: keypad.alphabet
        status: specialized
      full-secure-keypad:
        category: input
        target: keypad.secure
        status: excluded
        reason: security-specific; requires audited implementation
      number-keypad:
        category: input
        target: keypad.number
        status: specialized
      list-row:
        category: data-display
        target: list-row
        status: core
      text-field:
        category: input
        target: field
        status: core
      split-text-field:
        category: input
        target: field.group
        status: composed
      text-area:
        category: input
        target: field.textarea
        status: core
      overlay-extension:
        category: utility
        target: overlay.controller
        status: composed
  patterns:
    list-screen:
      purpose: scan, filter, and act on repeated entities
      recipe:
        - navigation
        - optional-summary
        - search-or-filter
        - list-row-group
        - pagination-or-load-more
      states:
        - loading
        - empty
        - error
        - populated
    detail-screen:
      purpose: understand one entity and complete contextual actions
      recipe:
        - navigation
        - title-and-status
        - primary-content
        - related-sections
        - contextual-actions
    form-screen:
      purpose: collect and validate user input with recoverable progress
      recipe:
        - title-and-guidance
        - grouped-fields
        - inline-validation
        - action-group
      max-reading-width: 680px
    dashboard:
      purpose: monitor status, compare values, and investigate changes
      recipe:
        - navigation
        - summary-metrics
        - primary-chart-or-table
        - supporting-sections
    workspace:
      purpose: perform an extended creation or editing task
      wide:
        - app-header
        - optional-left-panel
        - primary-canvas
        - optional-right-panel
      medium:
        - app-header
        - one-persistent-panel
        - primary-canvas
        - overlay-secondary-panel
      compact:
        - app-header
        - primary-canvas-or-route
        - drawer-or-sheet-tools
    landing:
      purpose: explain value and lead to one primary conversion action
      recipe:
        - global-header
        - hero
        - trust-or-proof
        - feature-sections
        - final-cta
        - footer
    prompt-to-variants:
      purpose: turn one grounded brief into comparable design directions without changing the shared content basis
      recipe:
        - context-summary
        - prompt-composer
        - generation-process
        - variant-set
        - comparison-entry
      states:
        - ready
        - generating
        - partial
        - complete
        - error
      composition:
        prompt-composer:
          - field-or-textarea
          - optional-file-uploader
          - contextual-actions
          - submit-action
        generation-process:
          - loading-or-progress
          - current-step-label
          - optional-cancel-action
      rules:
        - MUST disclose which brief, files, and design system are in context
        - variants MUST share the same contentSeed and requirement basis
        - partial success MUST preserve completed variants and identify unfinished variants
        - MUST NOT present placeholder cards or invented palettes as generated results
      accessibility:
        - generation updates MUST use a polite live region
        - errors MUST identify the failed step and a recoverable next action
    variant-comparison:
      purpose: compare generated directions on equivalent content and select one direction for expansion
      recipe:
        - comparison-header
        - equivalent-variant-previews
        - difference-summary
        - selection-control
        - primary-selection-action
      states:
        - ready
        - selected
        - unavailable-variant
      rules:
        - MUST preserve equal viewport, content scope, and shell treatment across compared variants
        - differences SHOULD explain hierarchy, density, layout, and visual direction rather than model identity
        - selection MUST remain reversible until prototype expansion starts
        - MUST NOT rank a variant using fabricated evidence
      accessibility:
        - preview labels MUST have accessible names independent of color
        - selection MUST expose the selected variant programmatically
    selection-to-prototype:
      purpose: expand the selected direction into additional screens while preserving its home screen and deterministic shell
      recipe:
        - selected-variant-summary
        - screen-plan
        - expansion-process
        - generated-screen-set
        - validation-summary
      states:
        - planning
        - generating
        - partial
        - validating
        - complete
        - error
      rules:
        - selected home HTML MUST remain unchanged
        - shell assembly MUST use deterministic code
        - failed screens MUST be retryable without regenerating completed screens
        - validation findings MUST link to the affected screen or requirement
      accessibility:
        - progress and validation changes MUST be announced without stealing focus
        - focus MUST move to the first actionable error only after an explicit review action
    file-analysis:
      purpose: inspect uploaded project material and expose what was accepted, excluded, or needs review before generation
      recipe:
        - file-uploader
        - file-list
        - analysis-process
        - extraction-summary
        - review-required-items
      states:
        - empty
        - uploading
        - analyzing
        - partial
        - complete
        - error
      rules:
        - MUST state accepted formats and size limits before upload
        - MUST preserve successfully analyzed files when another file fails
        - extracted requirements MUST retain source labels
        - sensitive or unsupported content MUST show a concrete next action
      accessibility:
        - per-file status MUST be available as text
        - upload and analysis progress MUST not be communicated by animation alone
    requirement-traceability:
      purpose: connect source requirements to screens, backlog items, acceptance criteria, and validation evidence
      recipe:
        - requirement-summary
        - filter-and-search
        - trace-table-or-list
        - coverage-status
        - unresolved-items
      states:
        - loading
        - complete
        - partial
        - uncovered
        - error
      rules:
        - every derived item MUST retain a source requirement identifier
        - coverage status MUST distinguish covered, partial, unresolved, and out-of-scope
        - compact layouts MUST provide a prioritized list alternative to a wide table
        - MUST NOT infer final acceptance for an unresolved requirement
      accessibility:
        - status MUST use text in addition to color
        - sortable trace columns MUST expose direction
    generation-recovery:
      purpose: recover from a failed or interrupted generation step without losing valid input or completed output
      recipe:
        - failure-summary
        - preserved-work-summary
        - affected-step
        - recovery-actions
        - optional-diagnostic-details
      states:
        - recoverable
        - retrying
        - blocked
        - recovered
      rules:
        - MUST preserve original input and completed outputs
        - retry MUST target only the failed or invalidated step
        - blocked state MUST explain what user or external action is required
        - diagnostic details MUST be secondary to a clear recovery action
      accessibility:
        - failure MUST use an assertive announcement only when immediate action is required
        - retry status MUST use a polite live region
    loading:
      purpose: explain active work and preview the structure that will replace it
      recipe:
        - progress-indicator-or-skeleton
        - current-step-label
        - optional-cancel-action
      states:
        - indeterminate
        - determinate
        - delayed
      rules:
        - MUST describe the work in progress when the wait is not immediate
        - skeletons MUST preserve the expected content hierarchy
        - MUST NOT imply completion before usable output exists
      accessibility:
        - status updates MUST use a polite live region
        - motion MUST respect reduced-motion preferences
    empty:
      purpose: explain why useful content is absent and offer the most relevant next action
      recipe:
        - optional-figure
        - concise-explanation
        - primary-next-action
        - optional-secondary-guidance
      states:
        - first-use
        - no-results
        - cleared
      rules:
        - MUST distinguish first-use emptiness from filtered no-results
        - MUST offer an action only when the user can resolve the empty state
        - MUST NOT present decorative placeholder content as real output
      accessibility:
        - the explanation and next action MUST be available as text
    error-and-recovery:
      purpose: explain a problem, preserve valid work, and provide a concrete recovery action
      recipe:
        - error-summary
        - affected-content-or-step
        - preserved-work-summary
        - recovery-action
      states:
        - inline
        - section
        - blocking
        - recovering
      rules:
        - MUST preserve valid input and completed output whenever recovery permits
        - MUST identify the affected field, screen, file, or generation step
        - retry MUST target only the failed or invalidated work
      accessibility:
        - blocking failures MUST receive an assertive announcement
        - focus MUST move only when immediate user action is required
  develop:
    source_order:
      - design-contract
      - generated-tokens
      - shared-primitives
      - product-compositions
      - screens
    generated_targets:
      - dtcg-json
      - css-custom-properties
      - typescript-types
      - tailwind-theme
    integration:
      css: consume generated semantic and component custom properties
      react: compose shared accessible primitives; screen code does not recreate primitive behavior
      other-platforms: transform the same semantic token source through a platform adapter
    versioning:
      strategy: semantic-versioning
      breaking:
        - token-removal
        - token-rename
        - component-prop-removal
        - behavior-change
      migration_requires:
        - changelog
        - before-after-diff
        - replacement-or-codemod
    verification:
      - contract-lint
      - type-check
      - accessibility-test
      - interaction-test
      - visual-regression
    package_name: "@aide/design-system"
    status: local-source
    source:
      contracts:
        - src/lib/design-systems/aide.md
        - src/lib/design-systems/aide.md
      token_compiler: src/lib/aide-product-tokens.ts
      primitives: src/components/ui/*
      showcase: src/app/aide-ui
      playground_catalog: src/lib/aide-playground-components.ts
    commands:
      validate: npm run design:lint
      export: npm run design:export
      diff: npm run design:diff -- <before.md> <after.md>
      verify:
        - npm run lint
        - npm run build
    generated:
      css: src/lib/design-systems/generated/aide.css
      dtcg-json: src/lib/design-systems/generated/aide.tokens.json
    react:
      import_policy: use src/components/ui exports instead of screen-local primitives
      styling_policy: consume --aui-* variables; runtime geometry is the only inline-style exception
    compatibility:
      browsers: modern evergreen browsers
      responsive_modes:
        - compact
        - medium
        - wide
      accessibility: WCAG 2.2 AA
  ai:
    context_order:
      - task
      - product-extension
      - portable-core
      - selected-pattern
      - selected-components
      - examples
    retrieval_units:
      - foundation-page
      - component-page
      - pattern-page
      - develop-page
    selection_rules:
      - retrieve only the components and patterns needed for the current task
      - prefer stable components and explicit composition over new markup
      - cite token and component ids in the generated plan
      - do not imitate reference-brand trade dress
    interaction_principles:
      - show which requirements, files, design system, and selected screens are in context
      - state the current and completed generation steps without implying work that has not happened
      - distinguish model-generated content from deterministic shell assembly
      - expose uncertainty at the screen or requirement that needs human review
      - preserve a selected variant instead of regenerating or rewriting it
      - preserve valid input and completed output when retrying a failed step
    generation_output:
      required:
        - intent
        - viewport-mode
        - pattern-id
        - component-tree
        - token-usage
        - states
        - accessibility-checks
      prohibited:
        - unregistered-component-without-reason
        - unresolved-token
        - visual-literal
        - inaccessible-name
    delivery:
      - design-md
      - llms-txt
      - skill
      - docs-api
      - mcp
    self_audit:
      - contract-valid
      - component-coverage
      - responsive-parity
      - state-completeness
      - accessibility-pass
    system_id: aide
    context_files:
      - aide.md
    scope_detection:
      product-chrome: apply aide.md
      generated-customer-ui: apply aide.md by default; use an uploaded DESIGN.md when the customer explicitly supplies one
      playground-canvas: apply the design system selected by the canvas, not the surrounding Aide chrome
    skill:
      id: aide-design-system
      purpose: retrieve foundations, select registered components and patterns, generate contract-valid UI, and self-audit
      workflow:
        - detect-scope
        - load-contract
        - select-pattern
        - select-components
        - bind-tokens
        - generate-states
        - validate
    llms_txt:
      route: /aide-ui/llms.txt
      contents:
        - overview
        - contract-links
        - foundation-index
        - component-index
        - pattern-index
        - develop-commands
    future_integrations:
      - docs-api
      - docs-mcp
      - figma-variables
      - code-connect
  accessibility:
    standard: WCAG 2.2 AA
    requirements:
      - normal text contrast >= 4.5:1
      - large text and essential non-text contrast >= 3:1
      - keyboard focus is visible and not obscured
      - minimum pointer target follows 24px WCAG floor; product targets use 32px dense, 40px general, 44px touch
      - interactive role, name, value, and state are programmatically exposed
      - error is identified in text and recovery preserves user input
      - prefers-reduced-motion is respected
      - state and meaning never rely on color alone
  validation:
    errors:
      - missing required contract section
      - unresolved token alias
      - literal visual value outside contract.tokens
      - component missing required anatomy or interactive state
      - interactive component without keyboard or accessible-name rule
      - normal text contrast below 4.5:1
      - duplicate component, pattern, or token id
    warnings:
      - declared token has no consumer
      - component has no compact, medium, or wide behavior where layout changes
      - new component overlaps an existing component composition
      - example uses a value not represented by a token
    completion_gate:
      automated:
        - schema-valid
        - aliases-resolved
        - token-consumer-coverage
        - showcase-renderer-parity
        - playground-catalog-parity
        - contrast-pass
      manual:
        - component-state-coverage
        - accessibility-pass
        - responsive-visual-regression-pass
    enforced:
      errors:
        - rule: missing required section or required component field
          by: design:lint
        - rule: unsupported token group
          by: aide-product-tokens.ts
        - rule: unresolved or circular token alias
          by: design-token-alias.mjs
        - rule: duplicate token, component, or visualization id
          by: design:lint, aide-product-tokens.ts
        - rule: visualization section without renderer
          by: aide-ui/page.tsx
        - rule: renderer without visualization manifest entry
          by: aide-ui/page.tsx
        - rule: component visual literal that bypasses --aui-*
          by: design:lint
        - rule: normal text contrast below 4.5:1
          by: design:lint
        - rule: token group renamed or dropped from the base contract
          by: design:lint
        - rule: playground catalog parity
          by: aide-playground-components.ts
      warnings:
        - rule: token has no product or showcase consumer
          by: design:lint
        - exempt: typography sub-properties other than size
          reason: standalone weight, leading, and tracking ramps carry those decisions
        - rule: component without anatomy or slots
          by: design:lint
        - rule: rule without a normative keyword
          by: design:lint
    planned:
      - interactive state without visible focus or accessible name
      - component contract has no rendered state example
      - responsive behavior is inherited but not visually verified
      - component token duplicates a semantic token without component-specific reason
  prohibited:
    - hard-coded hex or new black-alpha values inside screen components
    - purple or alternate primary accent for product chrome
    - pill-shaped ordinary buttons, fields, panels, or cards
    - card-inside-card decoration
    - imperative onMouseEnter/onMouseLeave style mutation
    - icon-only action without accessible name
    - placeholder-only field label
    - selected, error, or success state communicated by color alone
    - applying customer DESIGN.md to Aide product chrome
  consumers:
    canonical:
      - aide-product-token-compiler
      - shared-ui-primitives
      - aide-ui-showcase
      - aide-product-chrome
      - generated-customer-ui-default
    external_override:
      - uploaded-design-md
    parity_rule: Aide chrome, /aide-ui, and customer UI without an uploaded DESIGN.md consume aide.md.
  component_tokens:
    button:
      compact-height:
        $value: "{dimension.control-compact}"
        $description: Compact desktop action height
      default-height:
        $value: "{dimension.control-default}"
        $description: Default action height
      touch-height:
        $value: "{dimension.target-touch}"
        $description: Touch-first action height
      prominent-height:
        $value: "{dimension.control-prominent}"
        $description: Prominent action height
      compact-padding-x:
        $value: "{dimension.space-3}"
        $description: Compact horizontal padding
      default-padding-x:
        $value: "{dimension.space-5}"
        $description: default button horizontal padding
      prominent-padding-x:
        $value: "{dimension.space-5}"
        $description: Prominent horizontal padding
      radius:
        $value: "{radius.control}"
        $description: Button radius — must match the portable button rule
      gap:
        $value: 5px
        $description: Button icon-to-label gap
    field:
      compact-height:
        $value: "{dimension.control-compact}"
        $description: Dense desktop field height
      default-height:
        $value: "{dimension.control-prominent}"
        $description: Text Field default height
      touch-height:
        $value: "{dimension.control-prominent}"
        $description: Text Field touch height
      label-gap:
        $value: "{dimension.space-2}"
        $description: Field label to control spacing
      message-gap:
        $value: "{dimension.space-1}"
        $description: Control to supporting message spacing
      padding-inline:
        $value: "{dimension.space-3}"
        $description: Field control horizontal inset
      radius:
        $value: 12px
        $description: Text Field radius
      control-gap:
        $value: "{dimension.space-2}"
        $description: Text Field internal gap
      textarea-min-height:
        $value: 96px
        $description: Default multiline field minimum height
      textarea-touch-min-height:
        $value: 112px
        $description: Touch-first multiline field minimum height
    navigation:
      item-height:
        $value: "{dimension.target-touch}"
        $description: Navigation item target height
      compact-item-height:
        $value: "{dimension.control-default}"
        $description: Pointer-first navigation item height
    card:
      padding:
        $value: "{dimension.space-4}"
        $description: Default card content padding
      compact-padding:
        $value: "{dimension.space-3}"
        $description: Compact card content padding
      gap:
        $value: "{dimension.space-4}"
        $description: Default card slot gap
      compact-gap:
        $value: "{dimension.space-3}"
        $description: Compact card slot gap
      header-gap:
        $value: "{dimension.space-1}"
        $description: Card title to description gap
      radius:
        $value: 20px
        $description: Card radius
    chip:
      height:
        $value: 24px
        $description: Chip default height
      padding-inline:
        $value: 7px
        $description: Chip horizontal padding
      gap:
        $value: 2px
        $description: Chip content gap
      radius:
        $value: 6px
        $description: Chip radius
      outlined-active-border:
        $value: "{color.primary-outline}"
        $description: Chip outlined active inset border
      solid-active-content:
        $value: "{color.page}"
        $description: Chip solid active foreground
    overlay:
      dialog-width:
        $value: 420px
        $description: Default dialog width
      dialog-max-width:
        $value: 560px
        $description: Maximum dialog width
    action-bar:
      padding:
        $value: "{dimension.space-4}"
        $description: Action bar inset
    control:
      compact-height:
        $value: "{dimension.control-compact}"
        $description: Dense pointer-first control height
      default-height:
        $value: "{dimension.control-default}"
        $description: Default control height
      touch-height:
        $value: "{dimension.target-touch}"
        $description: Touch-first control height
      inline-padding:
        $value: "{dimension.space-3}"
        $description: Default control horizontal inset
      gap:
        $value: "{dimension.space-2}"
        $description: Control content gap
      icon-size:
        $value: "{dimension.icon-md}"
        $description: Default control icon size
    selection:
      indicator-size:
        $value: 24px
        $description: Checkbox and Radio default indicator size
      compact-indicator-size:
        $value: 20px
        $description: compact Checkbox indicator size
      checkbox-radius:
        $value: 5px
        $description: Checkbox radius
      switch-width:
        $value: 40px
        $description: Switch track width
      switch-height:
        $value: 24px
        $description: Switch track height
      switch-inset:
        $value: 2px
        $description: Switch thumb inset
      switch-thumb-size:
        $value: 20px
        $description: Switch thumb diameter
      segment-padding:
        $value: "{dimension.space-1}"
        $description: Segmented control inset
    feedback:
      inset:
        $value: "{dimension.space-3}"
        $description: Inline feedback inset
      radius:
        $value: "{radius.control}"
        $description: Feedback surface radius
      progress-height:
        $value: 8px
        $description: Progress track height
    data-display:
      row-height:
        $value: "{dimension.control-prominent}"
        $description: Dense data row minimum height
      row-touch-height:
        $value: 56px
        $description: Touch-first row minimum height
      section-inset:
        $value: "{dimension.space-4}"
        $description: List and table section inset
      row-padding-block:
        $value: "{dimension.space-2}"
        $description: List row vertical inset
      row-content-gap:
        $value: "{dimension.space-1}"
        $description: List row title to description gap
    table:
      min-width:
        $value: 560px
        $description: Minimum comparison-table canvas before horizontal scrolling
      header-height:
        $value: "{dimension.control-default}"
        $description: Table header row height
      row-height:
        $value: "{dimension.control-prominent}"
        $description: Default data row height
      cell-padding-inline:
        $value: "{dimension.space-4}"
        $description: Table cell horizontal inset
    list-section:
      header-height:
        $value: 56px
        $description: List section header minimum height
      inset:
        $value: "{dimension.space-4}"
        $description: List section horizontal inset
      block-padding:
        $value: "{dimension.space-3}"
        $description: List section header and footer block inset
      header-gap:
        $value: "{dimension.space-4}"
        $description: Gap between header copy and action
    keypad:
      inset:
        $value: "{dimension.space-2}"
        $description: Keypad surface inset
      gap:
        $value: "{dimension.space-2}"
        $description: Gap between keypad keys
      key-height:
        $value: "{dimension.target-touch}"
        $description: Touch-safe keypad key height
      key-min-width:
        $value: "{dimension.control-compact}"
        $description: Minimum keypad key width
    slider:
      gap:
        $value: "{dimension.space-2}"
        $description: Gap between slider label and track
      target-height:
        $value: "{dimension.target-touch}"
        $description: Touch-first slider interaction target
      compact-target-height:
        $value: "{dimension.control-default}"
        $description: Pointer-first slider interaction target
    menu:
      min-width:
        $value: 192px
        $description: Minimum popup menu width
      inset:
        $value: "{dimension.space-2}"
        $description: Menu popup inner inset
      item-height:
        $value: "{dimension.control-default}"
        $description: Menu item minimum height
      item-gap:
        $value: "{dimension.space-2}"
        $description: Menu item content gap
      item-padding-inline:
        $value: "{dimension.space-3}"
        $description: Menu item horizontal inset
      inset-item-padding-left:
        $value: "{dimension.space-8}"
        $description: Indented menu item leading inset
    sheet:
      bottom-max-height:
        $value: 90dvh
        $description: Maximum bottom-sheet viewport height
      side-width:
        $value: 420px
        $description: Preferred inspector sheet width
      side-max-viewport-width:
        $value: 90vw
        $description: Side sheet maximum viewport width
      compact-padding:
        $value: "{dimension.space-5}"
        $description: Bottom sheet content inset
      wide-padding:
        $value: "{dimension.space-6}"
        $description: Side sheet content inset
      close-size:
        $value: "{dimension.control-default}"
        $description: Sheet close action target
      handle-width:
        $value: "{dimension.space-10}"
        $description: Bottom sheet drag handle width
      handle-height:
        $value: "{dimension.space-1}"
        $description: Bottom sheet drag handle height
    stepper:
      indicator-size:
        $value: "{dimension.control-compact}"
        $description: Stepper marker diameter
      item-gap:
        $value: "{dimension.space-3}"
        $description: Vertical step marker-to-content gap
      item-padding-block:
        $value: "{dimension.space-6}"
        $description: Vertical step separation
      label-padding-inline:
        $value: "{dimension.space-2}"
        $description: Horizontal step label inset
    breadcrumb:
      gap:
        $value: "{dimension.space-1}"
        $description: Breadcrumb item and separator gap
      item-height:
        $value: "{dimension.control-compact}"
        $description: Breadcrumb link minimum height
      item-padding-inline:
        $value: "{dimension.space-1}"
        $description: Breadcrumb item horizontal inset
    tabs:
      trigger-padding-inline:
        $value: 0px
        $description: hug Tab has no internal horizontal inset
      list-height:
        $value: 52px
        $description: Tab default height
      list-gap:
        $value: "{dimension.space-5}"
        $description: hug Tab item gap
      indicator-height:
        $value: 2px
        $description: Selected tab indicator thickness
      content-padding-block:
        $value: "{dimension.space-4}"
        $description: Tab panel block inset
    avatar:
      compact-size:
        $value: "{dimension.control-compact}"
        $description: Compact avatar size
      default-size:
        $value: "{dimension.control-default}"
        $description: Default avatar size
      prominent-size:
        $value: "{dimension.control-prominent}"
        $description: Prominent avatar size
    bar-chart:
      plot-height:
        $value: 160px
        $description: Default compact categorical chart height
      bar-gap:
        $value: "{dimension.space-3}"
        $description: Gap between categorical bars
    prose:
      readable-width:
        $value: "{dimension.content-narrow}"
        $description: Maximum long-form reading measure
    dialog:
      viewport-inset:
        $value: "{dimension.space-4}"
        $description: Minimum dialog distance from the viewport edge
      content-gap:
        $value: "{dimension.space-4}"
        $description: Gap between dialog content regions
      compact-padding:
        $value: "{dimension.space-5}"
        $description: Compact dialog content inset
      wide-padding:
        $value: "{dimension.space-6}"
        $description: Wide dialog content inset
      close-inset:
        $value: "{dimension.space-4}"
        $description: Close action distance from dialog edges
      close-size:
        $value: "{dimension.control-default}"
        $description: Touch-first dialog close target
      close-compact-size:
        $value: "{dimension.control-compact}"
        $description: Pointer-first dialog close target
      header-gap:
        $value: "{dimension.space-2}"
        $description: Dialog heading content gap
      header-action-reserve:
        $value: "{dimension.space-10}"
        $description: Space reserved for the close action
      footer-gap:
        $value: "{dimension.space-2}"
        $description: Gap between dialog actions
      footer-padding-top:
        $value: "{dimension.space-2}"
        $description: Space above dialog actions
    popover:
      width:
        $value: 288px
        $description: Default informational popover width
      padding:
        $value: "{dimension.space-4}"
        $description: Popover content inset
      close-inset:
        $value: "{dimension.space-2}"
        $description: Close action distance from popover edges
      close-size:
        $value: "{dimension.control-default}"
        $description: Popover close target
      description-gap:
        $value: "{dimension.space-1}"
        $description: Title-to-description spacing
    agreement:
      padding:
        $value: "{dimension.space-4}"
        $description: Agreement group inset
      section-gap:
        $value: "{dimension.space-2}"
        $description: Separation around select-all and agreement items
      detail-action-size:
        $value: "{dimension.target-touch}"
        $description: Agreement detail link touch target
    detail-header:
      content-gap:
        $value: "{dimension.space-4}"
        $description: Gap between header content and actions
      padding-bottom:
        $value: "{dimension.space-5}"
        $description: Detail header bottom inset
      eyebrow-gap:
        $value: "{dimension.space-1}"
        $description: Eyebrow-to-title spacing
      description-gap:
        $value: "{dimension.space-2}"
        $description: Title-to-description spacing
      metadata-gap:
        $value: "{dimension.space-3}"
        $description: Description-to-metadata spacing
      action-gap:
        $value: "{dimension.space-2}"
        $description: Gap between contextual actions
    result:
      padding-inline:
        $value: "{dimension.space-5}"
        $description: Result content horizontal inset
      padding-block:
        $value: "{dimension.space-10}"
        $description: Result content vertical inset
      figure-gap:
        $value: "{dimension.space-4}"
        $description: Figure-to-title spacing
      description-gap:
        $value: "{dimension.space-2}"
        $description: Title-to-description spacing
      action-gap:
        $value: "{dimension.space-5}"
        $description: Description-to-action spacing
    responsive-grid:
      min-item-width:
        $value: 240px
        $description: Default minimum width of a responsive grid item
      gap:
        $value: "{dimension.space-4}"
        $description: Default responsive grid gutter
  component_recipes:
    schema: family defaults + component properties + slot/state token bindings + viewport overrides
    viewport_modes:
      compact:
        range: 0..767px
        density: touch
        control-height: "{dimension.target-touch}"
        content-padding-inline: "{dimension.space-5}"
        section-gap: "{dimension.space-6}"
        action-layout: stack
      medium:
        range: 768..1199px
        density: comfortable
        control-height: "{dimension.control-default}"
        content-padding-inline: "{dimension.space-6}"
        section-gap: "{dimension.space-6}"
        action-layout: adaptive
      wide:
        range: 1200px+
        density: comfortable-or-compact
        control-height: "{dimension.control-default}"
        compact-control-height: "{dimension.control-compact}"
        content-padding-inline: "{dimension.space-8}"
        section-gap: "{dimension.space-8}"
        action-layout: inline
    families:
      action:
        slots:
          - root
          - label
          - optional-leading-icon
          - optional-trailing-icon
          - optional-progress
        properties:
          size:
            - compact
            - default
            - touch
            - prominent
          width:
            - hug
            - fill
          state:
            - enabled
            - hover
            - pressed
            - focus-visible
            - loading
            - disabled
        specification:
          root:
            gap: "{dimension.space-2}"
            radius: "{radius.control}"
            transition: "{duration.fast}"
          label:
            typography: "{typography.label}"
          icon:
            size: "{dimension.icon-md}"
        responsive:
          compact:
            size: touch
            width: fill
          medium:
            size: default
          wide:
            size: default
            width: hug
      field:
        slots:
          - root
          - label
          - control
          - value
          - optional-leading
          - optional-trailing
          - optional-supporting-text
        properties:
          size:
            - compact
            - default
            - touch
          state:
            - empty
            - filled
            - hover
            - focus-visible
            - read-only
            - disabled
            - success
            - error
        specification:
          root:
            gap: "{dimension.space-2}"
          control:
            padding-inline: "{dimension.space-3}"
            gap: "{dimension.space-2}"
            radius: "{radius.control}"
            border: "{color.border}"
          label:
            typography: "{typography.caption}"
            color: "{color.text}"
          supporting-text:
            typography: "{typography.meta}"
            color: "{color.text-muted}"
        responsive:
          compact:
            size: touch
          medium:
            size: default
          wide:
            size: default
            dense-size: compact
      selection:
        slots:
          - root
          - indicator-or-track
          - label
          - optional-description
        properties:
          size:
            - default
            - touch
          state:
            - unselected
            - selected
            - mixed
            - focus-visible
            - disabled
            - error
        specification:
          root:
            min-target: "{dimension.target-touch}"
            gap: "{dimension.space-2}"
          label:
            typography: "{typography.body}"
        responsive:
          compact:
            size: touch
          medium:
            size: default
          wide:
            size: default
      navigation:
        slots:
          - root
          - items
          - item
          - active-indicator
          - optional-icon
          - label
        properties:
          orientation:
            - horizontal
            - vertical
          density:
            - compact
            - comfortable
            - touch
          state:
            - default
            - hover
            - active
            - focus-visible
            - disabled
        specification:
          root:
            gap: "{dimension.space-1}"
          item:
            gap: "{dimension.space-2}"
            radius: "{radius.control}"
        responsive:
          compact:
            orientation: horizontal
            density: touch
          medium:
            orientation: horizontal
            density: comfortable
          wide:
            orientation: horizontal-or-vertical
            density: comfortable
      data-display:
        slots:
          - root
          - optional-header
          - content
          - optional-metadata
          - optional-footer
        properties:
          density:
            - compact
            - comfortable
            - touch
          emphasis:
            - plain
            - raised
            - bordered
            - selected
        specification:
          root:
            gap: "{dimension.space-3}"
          header:
            gap: "{dimension.space-2}"
          content:
            typography: "{typography.body}"
        responsive:
          compact:
            density: touch
          medium:
            density: comfortable
          wide:
            density: comfortable
            optional-density: compact
      feedback:
        slots:
          - root
          - semantic-icon-or-progress
          - title-or-status
          - optional-description
          - optional-action
        properties:
          tone:
            - neutral
            - info
            - success
            - warning
            - error
          state:
            - idle
            - loading
            - complete
            - error
        specification:
          root:
            gap: "{dimension.space-3}"
            padding: "{dimension.space-3}"
            radius: "{radius.control}"
          icon:
            size: "{dimension.icon-md}"
        responsive:
          compact:
            action-layout: stack
          medium:
            action-layout: inline
          wide:
            action-layout: inline
      overlay:
        slots:
          - scrim-or-positioner
          - surface
          - header
          - content
          - optional-footer
          - close-action
        properties:
          size:
            - compact
            - default
            - wide
          state:
            - closed
            - opening
            - open
            - closing
        specification:
          surface:
            gap: "{dimension.space-4}"
            padding: "{dimension.space-5}"
            radius: "{radius.overlay}"
            shadow: "{shadow.modal}"
          close-action:
            target: "{dimension.target-touch}"
        responsive:
          compact:
            presentation: bottom-sheet-or-fullscreen
          medium:
            presentation: dialog-or-sheet
          wide:
            presentation: dialog-popover-or-side-sheet
    items:
      accordion:
        family: data-display
      date-picker:
        family: field
      time-picker:
        family: field
      file-uploader:
        family: field
      editor:
        family: field
      rating:
        family: selection
      pagination:
        family: navigation
      pagination-dots:
        family: navigation
      carousel:
        family: data-display
      avatar-group:
        family: data-display
      anchor:
        family: action
      floating-action-button:
        family: action
      asset:
        family: data-display
      list-row:
        family: data-display
      button:
        family: action
        default:
          size: default
          variant: primary
          width: hug
        properties:
          variant:
            - primary
            - secondary
            - outline
            - ghost
            - destructive
            - link
      icon-button:
        family: action
        default:
          size: default
          variant: outline
          width: hug
        properties:
          layout:
            - icon-only
      action-bar:
        family: action
        default:
          size: default
          layout: inline
        properties:
          layout:
            - stack
            - inline
            - fixed
        slots:
          - root
          - secondary-actions
          - primary-action
          - optional-safe-area
      fixed-bottom-cta:
        family: action
        default:
          size: touch
          layout: fixed
        properties:
          action-count:
            - 1
            - 2
          hide-on-scroll:
            - false
            - true
        slots:
          - root
          - optional-secondary-action
          - primary-action
          - safe-area
      field:
        family: field
        default:
          size: default
          state: empty
      field-group:
        family: field
        default:
          size: default
        slots:
          - fieldset
          - legend
          - controls
          - optional-help
          - optional-error
      textarea:
        family: field
        default:
          size: default
          state: empty
        properties:
          resize:
            - none
            - vertical
      number-field:
        family: field
        default:
          size: default
        slots:
          - label
          - decrement-action
          - value
          - increment-action
      select:
        family: field
        default:
          size: default
          state: empty
        slots:
          - label
          - trigger
          - value
          - chevron
          - menu
          - option
      search:
        family: field
        default:
          size: default
          state: empty
        slots:
          - search-icon
          - input
          - optional-clear-action
      slider:
        family: field
        default:
          size: touch
        slots:
          - label
          - value-output
          - track
          - thumb
      keypad:
        family: field
        default:
          size: touch
        slots:
          - label
          - key-grid
          - keys
          - optional-backspace
      checkbox:
        family: selection
        default:
          size: default
          state: unselected
      radio:
        family: selection
        default:
          size: default
          state: unselected
      switch:
        family: selection
        default:
          size: default
          state: unselected
        slots:
          - track
          - thumb
          - label
          - optional-description
      agreement:
        family: selection
        default:
          size: touch
          state: unselected
        slots:
          - legend
          - select-all
          - items
          - optional-detail-actions
      tabs:
        family: navigation
        default:
          orientation: horizontal
          density: comfortable
        properties:
          overflow:
            - scroll
            - distribute
      segmented-control:
        family: navigation
        default:
          orientation: horizontal
          density: comfortable
      chip:
        family: selection
        default:
          variant: solid
          size: default
          state: unselected
        properties:
          variant:
            - solid
            - outlined
          removable:
            - false
            - true
      stepper:
        family: navigation
        default:
          orientation: horizontal
          density: comfortable
        properties:
          orientation:
            - horizontal
            - vertical
      navigation:
        family: navigation
        default:
          orientation: horizontal
          density: comfortable
        properties:
          type:
            - top
            - side
            - bottom
      app-header:
        family: navigation
        default:
          density: comfortable
          state: default
        properties:
          position:
            - static
            - sticky
          show-actions:
            - true
            - false
        slots:
          - brand
          - optional-menu-action
          - global-navigation
          - actions
      global-navigation:
        family: navigation
        default:
          orientation: horizontal
          density: comfortable
        properties:
          alignment:
            - start
            - center
            - end
        slots:
          - navigation-landmark
          - items
          - active-item
      local-navigation:
        family: navigation
        default:
          orientation: vertical
          density: comfortable
        properties:
          width:
            - compact
            - default
            - wide
          collapsible:
            - true
            - false
        slots:
          - optional-title
          - navigation-landmark
          - items
          - active-item
      bottom-app-bar:
        family: navigation
        default:
          orientation: horizontal
          density: touch
        properties:
          item-count:
            - 3
            - 4
            - 5
          position:
            - static
            - fixed
        slots:
          - navigation-landmark
          - items
          - active-item
          - safe-area
      app-footer:
        family: navigation
        default:
          orientation: horizontal
          density: comfortable
        properties:
          layout:
            - stack
            - split
          emphasis:
            - plain
            - muted
        slots:
          - brand
          - optional-description
          - link-navigation
          - optional-legal
      top-navigation:
        family: navigation
        default:
          density: touch
          state: default
        properties:
          type:
            - root
            - standard
          tone:
            - layer
            - transparent
          show-subtitle:
            - false
            - true
        slots:
          - optional-left-action
          - title
          - optional-subtitle
          - right-actions
      side-navigation:
        family: navigation
        default:
          orientation: vertical
          density: comfortable
        properties:
          width:
            - compact
            - default
            - wide
          collapsible:
            - true
            - false
        slots:
          - optional-title
          - items
          - active-item
      breadcrumb:
        family: navigation
        default:
          orientation: horizontal
          density: compact
      badge:
        family: data-display
        default:
          density: compact
          emphasis: plain
      avatar:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        properties:
          size:
            - compact
            - default
            - prominent
      card:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        properties:
          emphasis:
            - plain
            - raised
            - bordered
            - selected
      panel:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
      list-cell:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        slots:
          - root
          - optional-leading
          - labels
          - optional-metadata
          - optional-trailing
      list-section:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        slots:
          - optional-header
          - list-content
          - optional-footer
      table:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        properties:
          responsive:
            - scroll
            - prioritized-list
      metric:
        family: data-display
        default:
          density: compact
          emphasis: plain
        slots:
          - label
          - value
          - optional-delta
          - optional-context
      bar-chart:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        slots:
          - figure
          - caption
          - plot
          - bars
          - labels
      prose:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        properties:
          measure:
            - narrow
            - readable
            - wide
      responsive-grid:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        properties:
          columns:
            - auto
            - one
            - two
            - three
            - four
      detail-header:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        slots:
          - optional-eyebrow
          - title
          - optional-description
          - optional-metadata
          - optional-actions
      page-header:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        properties:
          action-layout:
            - inline
            - stack
        slots:
          - optional-eyebrow
          - title
          - optional-description
          - optional-actions
      section-header:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        properties:
          heading-level:
            - h2
            - h3
        slots:
          - title
          - optional-description
          - optional-trailing
      side-panel:
        family: data-display
        default:
          density: comfortable
          emphasis: raised
        properties:
          side:
            - left
            - right
          width:
            - compact
            - default
            - wide
        slots:
          - header
          - content
          - optional-footer
      workspace-shell:
        family: data-display
        default:
          density: comfortable
          emphasis: plain
        properties:
          navigation:
            - none
            - side
          inspector:
            - none
            - right
          panel-mode:
            - persistent
            - overlay
        slots:
          - app-header
          - optional-side-navigation
          - main-content
          - optional-side-panel
      progress:
        family: feedback
        default:
          tone: info
          state: loading
        properties:
          mode:
            - determinate
            - indeterminate
      alert:
        family: feedback
        default:
          tone: info
          state: idle
      toast:
        family: feedback
        default:
          tone: neutral
          state: idle
      loading:
        family: feedback
        default:
          tone: neutral
          state: loading
        properties:
          type:
            - spinner
            - progress
            - skeleton
      empty-state:
        family: feedback
        default:
          tone: neutral
          state: idle
      result:
        family: feedback
        default:
          tone: neutral
          state: complete
        properties:
          outcome:
            - empty
            - success
            - error
      dialog:
        family: overlay
        default:
          size: default
          state: open
        properties:
          role:
            - dialog
            - alertdialog
      sheet:
        family: overlay
        default:
          size: default
          state: open
        properties:
          edge:
            - bottom
            - right
      popover:
        family: overlay
        default:
          size: compact
          state: open
      tooltip:
        family: overlay
        default:
          size: compact
          state: open
      dropdown-menu:
        family: overlay
        default:
          size: compact
          state: open
        properties:
          selection:
            - none
            - single
            - multiple
  component_registry:
    categories:
      actions:
        - button
        - icon-button
        - action-bar
        - fixed-bottom-cta
        - chip
        - anchor
        - floating-action-button
      inputs:
        - field
        - field-group
        - textarea
        - number-field
        - select
        - search
        - slider
        - keypad
        - date-picker
        - time-picker
        - file-uploader
        - editor
      selection:
        - checkbox
        - radio
        - switch
        - agreement
        - segmented-control
        - rating
      navigation:
        - tabs
        - stepper
        - navigation
        - app-header
        - global-navigation
        - local-navigation
        - top-navigation
        - side-navigation
        - bottom-app-bar
        - app-footer
        - breadcrumb
        - pagination
        - pagination-dots
      layout:
        - panel
        - side-panel
        - workspace-shell
        - responsive-grid
      data-display:
        - badge
        - avatar
        - card
        - list-cell
        - list-section
        - table
        - metric
        - bar-chart
        - prose
        - detail-header
        - page-header
        - section-header
        - accordion
        - avatar-group
        - carousel
        - asset
        - list-row
      feedback:
        - progress
        - alert
        - toast
        - loading
        - empty-state
        - result
      overlays:
        - dialog
        - sheet
        - popover
        - tooltip
        - dropdown-menu
    defaults:
      status: stable
      renderer: src/components/ui/<component>.tsx
      documentation: documentation.pages.components
      preview-size: control
    preview_sizes:
      compact:
        - icon-button
        - badge
        - avatar
        - dialog
        - sheet
        - popover
        - tooltip
        - dropdown-menu
      control:
        - button
        - field
        - field-group
        - textarea
        - number-field
        - select
        - search
        - slider
        - checkbox
        - radio
        - switch
        - tabs
        - segmented-control
        - chip
        - stepper
        - metric
        - progress
      wide:
        - action-bar
        - fixed-bottom-cta
        - agreement
        - keypad
        - navigation
        - app-header
        - global-navigation
        - local-navigation
        - top-navigation
        - side-navigation
        - bottom-app-bar
        - app-footer
        - breadcrumb
        - card
        - panel
        - list-cell
        - list-section
        - table
        - bar-chart
        - prose
        - responsive-grid
        - detail-header
        - page-header
        - section-header
        - side-panel
        - workspace-shell
        - alert
        - toast
        - loading
        - empty-state
        - result
    source_overrides:
      pagination-dots: src/components/ui/pagination.tsx#PaginationDots
      time-picker: src/components/ui/date-picker.tsx#TimePicker
      icon-button: src/components/ui/button.tsx#Button
      action-bar: src/components/ui/responsive-action-bar.tsx#ResponsiveActionBar
      fixed-bottom-cta: src/components/ui/responsive-action-bar.tsx#ResponsiveActionBar
      search: src/components/ui/search-field.tsx#SearchField
      checkbox: src/components/ui/selection-control.tsx#Checkbox
      radio: src/components/ui/radio-group.tsx#Radio
      switch: src/components/ui/selection-control.tsx#Switch
      navigation: src/components/ui/navigation.tsx#Navigation
      app-header: src/components/ui/app-shell.tsx#AppHeader
      global-navigation: src/components/ui/app-shell.tsx#GlobalNavigation
      local-navigation: src/components/ui/app-shell.tsx#LocalNavigation
      bottom-app-bar: src/components/ui/app-shell.tsx#BottomAppBar
      app-footer: src/components/ui/app-shell.tsx#AppFooter
      top-navigation: src/components/ui/app-shell.tsx#TopNavigation
      side-navigation: src/components/ui/app-shell.tsx#SideNavigation
      breadcrumb: src/components/ui/navigation.tsx#Breadcrumb
      page-header: src/components/ui/app-shell.tsx#PageHeader
      section-header: src/components/ui/app-shell.tsx#SectionHeader
      side-panel: src/components/ui/app-shell.tsx#SidePanel
      workspace-shell: src/components/ui/app-shell.tsx#WorkspaceShell
      avatar: src/components/ui/asset.tsx#Avatar
      panel: composition:surface-region
      list-cell: src/components/ui/list-row.tsx#ListRow
      metric: composition:label-value-delta
      alert: src/components/ui/feedback.tsx#InlineMessage
      toast: src/components/ui/feedback.tsx#Toast
      loading: src/components/ui/feedback.tsx#Loader
      empty-state: src/components/ui/result.tsx#Result
      dropdown-menu: src/components/ui/menu.tsx#Menu
    token_bindings:
      button:
        height:
          compact: "{component_tokens.button.compact-height}"
          default: "{component_tokens.button.default-height}"
          touch: "{component_tokens.button.touch-height}"
          prominent: "{component_tokens.button.prominent-height}"
        padding-inline:
          compact: "{component_tokens.button.compact-padding-x}"
          default: "{component_tokens.button.default-padding-x}"
          prominent: "{component_tokens.button.prominent-padding-x}"
        radius: "{radius.control}"
        primary-background: "{color.primary}"
        primary-content: "{color.on-primary}"
        secondary-background: "{color.fill}"
        secondary-content: "{color.text}"
        outline-background: "{color.surface}"
        outline-border: "{color.border}"
        outline-content: "{color.text}"
        ghost-background: transparent
        ghost-content: "{color.text}"
        destructive-background: "{color.negative}"
        destructive-content: "{color.on-primary}"
        link-background: transparent
        link-content: "{color.primary}"
      field:
        height:
          compact: "{component_tokens.field.compact-height}"
          default: "{component_tokens.field.default-height}"
          touch: "{component_tokens.field.touch-height}"
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
      recipe:
        - ProductHeader
        - Hero
        - PrimaryInput
        - SupportingContent
      content-max: 1200px
      primary-input-width: 760px..880px
      rules:
        - decorative effects MUST NOT reduce contrast or obscure controls
        - controls MUST use the same primitives as Studio
    studio:
      recipe:
        - AppHeader
        - Workspace
        - SidePanel
      rules:
        - primary content MUST receive most viewport space
        - persistent regions use surface contrast first and at most one shared divider; never nested card outlines
        - inspector repeats section-header, row, label, and input primitives
    playground:
      recipe:
        - Toolbar
        - LibraryPanel
        - Canvas
        - InspectorPanel
      toolbar-height: 56px
      side-panel-width: 280px..320px
      rules:
        - canvas uses color.page; frames use color.surface and selection ring
        - KTDS may style preview content; surrounding chrome remains Aide Design System
    overlay:
      recipe:
        - Scrim
        - DialogOrSheet
      rules:
        - MUST provide title, close affordance, focus treatment, and action hierarchy
  documentation:
    route: /aide-ui
    title: Aide Design System
    description: 디자인, 개발, AI가 같은 계약으로 Aide와 다른 제품의 일관된 UI를 만드는 공식 가이드
    source_rule: navigation, page metadata, token tables, component metadata, patterns, develop commands, and AI guidance come from this contract
    navigation:
      - get-started
      - foundations
      - components
      - patterns
      - develop
      - ai-and-tools
    layout:
      wide:
        structure:
          - left-navigation
          - document-content
          - on-this-page
        left-navigation-width: 240px
        on-this-page-width: 220px
        content-max-width: 1040px
        behavior: both navigation panels remain sticky while document content scrolls
      medium:
        structure:
          - left-navigation
          - document-content
        behavior: hide on-this-page; keep section navigation available
      compact:
        structure:
          - document-content
        behavior: replace both side panels with horizontally scrollable top navigation; essential destinations remain available
      left-navigation:
        source: documentation.pages and component_registry.categories
        scope: current-global-navigation-group-only
        behavior: selecting a global navigation item replaces the entire left navigation; never concatenate sibling global groups
        contents:
          - current-group-overview
          - current-group-pages
          - current-group-entries
      on-this-page:
        source: headings rendered by the current route only
        scope: current-page-only
        contents:
          - current-page-section-headings
          - current-page-subsections
        prohibited:
          - global-navigation-items
          - left-navigation-items
          - headings-from-other-routes
    pages:
      get-started:
        title: Get Started
        items:
          - overview
          - principles
          - adoption
          - architecture
      foundations:
        title: Foundations
        items:
          - design-token
          - color
          - typography
          - iconography
          - elevation
          - gradient
          - inclusive-design
          - international-design
          - layout
          - motion
          - radius
          - spacing
          - state
          - voice-and-tone
          - writing
      components:
        title: Components
        categories:
          - actions
          - inputs
          - selection
          - navigation
          - data-display
          - feedback
          - overlays
        items:
          - overview
          - component-registry
        overview: render every registered component as a preview card grouped by category; each card links to its component detail route
        route_pattern: /aide-ui/components/<component-id>
        page_template:
          - overview
          - preview
          - usage
          - anatomy
          - props
          - variants
          - sizes
          - states
          - responsive
          - accessibility
          - token-bindings
          - prohibited
          - related
      patterns:
        title: Patterns
        items:
          - landing
          - list-screen
          - detail-screen
          - form-screen
          - dashboard
          - workspace
          - loading
          - empty
          - error-and-recovery
          - prompt-to-variants
          - variant-comparison
          - selection-to-prototype
          - file-analysis
          - requirement-traceability
          - generation-recovery
        page_template:
          - purpose
          - composition
          - responsive
          - states
          - accessibility
          - examples
          - prohibited
      develop:
        title: Develop
        items:
          - installation
          - react
          - css-variables
          - token-api
          - component-api
          - responsive-api
          - validation
          - migration
          - changelog
      ai-and-tools:
        title: AI & Tools
        items:
          - design-md
          - llms-txt
          - skill
          - prompt-guide
          - validation
          - export
          - mcp
    page_states:
      - ready
      - planned
      - deprecated
    rendering:
      mode: contract-driven
      missing_page: fail validation
      missing_component_example: show planned state and fail coverage gate before stable release
  visualization:
    route: /aide-ui
    mode: strict
    lifecycle: legacy single-page renderer manifest; migrate into documentation.pages without duplicating content
    rule: Every section below is rendered from this manifest; unknown or missing renderer ids fail the build
    sections:
      - id: brand
        navigation: Brand
        eyebrow: Identity
        title: Brand expression
        description: Aide의 브랜드 표현은 주목을 만드는 영역에만 사용하고, 실제 제작 workspace는 중립 surface를 유지합니다.
      - id: foundations
        navigation: Colors
        eyebrow: Foundations
        title: Color tokens
        description: Aide 제품 UI의 시맨틱 색상입니다. 화면 컴포넌트는 직접 색상값을 만들지 않고 이 토큰을 사용합니다.
      - id: typography
        navigation: Typography
        eyebrow: Foundations
        title: Typography
        description: MD에 정의된 제품 UI 타입 스케일을 실제 토큰으로 표시합니다.
      - id: tokens
        navigation: Tokens
        eyebrow: Foundations
        title: Spacing, radius, elevation, motion
        description: MD에 정의된 간격, radius, elevation, motion 토큰을 실제 값으로 표시합니다.
      - id: actions
        navigation: Actions
        eyebrow: Components
        title: Actions
        description: 행동의 우선순위, 위험도, 크기와 상태를 공용 primitive로 표현합니다.
      - id: inputs
        navigation: Inputs
        eyebrow: Components
        title: Inputs and forms
        description: 입력, 검증, 비활성 상태와 선택형 입력을 공용 primitive로 표시합니다.
      - id: selection
        navigation: Selection
        eyebrow: Components
        title: Selection and navigation
        description: Tabs, segmented control, chip과 상태 표현을 실제 컴포넌트로 표시합니다.
      - id: data
        navigation: Data
        eyebrow: Components
        title: Cards, lists and data display
        description: 카드, 목록, 표와 데이터 표시 패턴을 실제 컴포넌트로 표시합니다.
      - id: feedback
        navigation: Feedback
        eyebrow: Components
        title: Feedback and system status
        description: 저장, 생성, 오류, 빈 상태와 로딩을 실제 컴포넌트로 표시합니다.
      - id: overlays
        navigation: Overlays
        eyebrow: Components
        title: Overlays
        description: Dialog, alert dialog, popover, tooltip, menu와 sheet를 실제 동작으로 표시합니다.
      - id: compositions
        navigation: Compositions
        eyebrow: Composed patterns
        title: Reusable compositions
        description: 공용 컴포넌트를 실제 서비스 화면 단위로 조합합니다.
      - id: specialized
        navigation: Specialized
        eyebrow: Specialized components
        title: Feature-specific controls
        description: 선택적으로 사용하는 기능 컴포넌트와 명시적으로 제외한 보안 컴포넌트를 구분합니다.
      - id: layouts
        navigation: Navigation
        eyebrow: Patterns
        title: Navigation and action bars
        description: 실제 탐색과 CTA 패턴을 공용 primitive로 비교합니다.
      - id: accessibility
        navigation: Accessibility
        eyebrow: Quality
        title: Interaction and accessibility
        description: MD의 접근성 요구사항을 누락 없이 표시합니다.
```


## Source

This contract is maintained as Aide's own canonical design-system source. Product code, documentation, Playground, and default generation must use the declared Aide tokens, components, patterns, and deterministic assembly rules without depending on another brand's identity or undocumented conventions.

## Must Follow

1. Use `Aide` as the design system name.
2. Put `aide-logo-slot` in the top app/header area.
3. Use Google Material Symbols. Do not invent icon names.
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
  --color-primary: #1a75ff;
  --color-primary-soft: #e8f1ff;
  --color-page: #f2f5f9;
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

## Primary Color Hierarchy

`--color-primary: #1a75ff` has four distinct roles — apply only the role that matches the context:

| 토큰 | 용도 | 사용 예 |
|---|---|---|
| `primary` (#1a75ff) | CTA 버튼 배경, 아이콘 강조, 숫자 KPI | 주요 행동 버튼, 탭 활성 아이콘 |
| `primary-strong` (#186ae8) | CTA :hover / :active 상태 | 버튼 눌림 시 색 변화 |
| `primary-heavy` (#1560cc) | 선택된 항목의 텍스트·아이콘 | 활성 탭 레이블 |
| `primary-soft` (#e8f1ff) | 선택·활성 상태의 배경 | 칩 선택 배경, 탭 인디케이터 배경 |
| `primary-tint` (rgba(26,117,255,.28)) | 경계 없이 tint 효과 | 토스트 배경, 인라인 강조 |

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

- Do not use icon names.
- Do not use logo text instead of `aide-logo-slot`.
- Do not create a landing page unless explicitly requested.
- Do not let content be clipped behind fixed bottom chrome.
- Do not center-float buttons in the middle of image/content blocks.
- Do not make all variants the same layout.
- Do not create empty, decorative, low-content screens.
- Do not apply primary blue (#1a75ff) to decorative backgrounds, body text, or non-CTA elements.
- Do not omit `:focus-visible` ring on interactive elements.
- Do not use English copy for labels, CTAs, or status messages in Korean-language screens.
