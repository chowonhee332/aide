---
schema_version: "2.0"
document_id: "wonhee-design"
document_type: "portable-design-system-contract"
name: "Wonhee Design System"
description: "PC, tablet, mobile 서비스를 일관되게 생성하기 위한 portable DESIGN.md. TDS의 명확한 component anatomy와 composition 방식을 참고하되 독립적인 반응형 제품 언어로 정의한다."
status: "normative"
language: "ko-KR"
platforms: [responsive-web, mobile-web, desktop-web]
portability: "copy-with-project-override"
machine_contract:
  location: "first fenced yaml block"
  root_key: "contract"
  normative: true
  prose_role: "rationale, examples, and adoption guidance"
compatibility:
  token_notation: "DTCG-inspired $type/$value/$description"
  alias_syntax: "{group.token}"
  export_targets: [DTCG, CSS-custom-properties, TypeScript, Tailwind]
reference_policy:
  structural_reference: "TDS-style anatomy, slots, variants, states, accessibility documentation"
  source_boundary: "TDS assets and UI Kit are licensed for Apps in Toss; this independent system MUST NOT reproduce protected visual assets or trade dress"
  allowed_reference: ["component taxonomy", "anatomy and slots", "state completeness", "responsive reasoning", "accessibility documentation quality"]
  never_copy: ["Toss brand", "Toss logo or graphics", "exact TDS token palette", "TDS component appearance", "mobile-only assumptions", "package APIs without verification"]
precedence:
  - "product_requirements_and_user_content"
  - "accessibility_and_platform_invariants"
  - "machine_contract"
  - "component_contracts"
  - "composition_recipes"
  - "examples"
---

# Wonhee Design System

이 파일은 특정 서비스의 화면을 복제하는 스타일 문서가 아니다. 어떤 프로젝트에서도 재사용할 수 있는 **반응형 UI 생성 계약**이다. 프로젝트를 시작할 때 이 파일을 기본 규칙으로 넣고, 브랜드 색·서체·제품 전용 패턴만 별도 프로젝트 문서에서 덮어쓴다.

이 문서에서 **첫 번째 fenced YAML 블록만 기계 판독 가능한 규범 원본**이다. Front matter는 문서 식별과 도구 호환성을 위한 metadata이며, 본문의 표와 예시는 설명용이다. 값이 충돌하면 `precedence`와 아래 merge 규칙을 적용하고 임의로 절충하지 않는다.

## AI execution protocol

AI는 화면을 만들기 전에 아래 순서로 결정한다.

1. **INTENT** — 화면의 핵심 사용자 작업과 primary action을 한 문장으로 정의한다.
2. **MODE** — compact, medium, wide 중 현재 viewport mode를 정한다.
3. **PATTERN** — list, detail, form, dashboard, workspace, landing 중 맞는 recipe를 고른다.
4. **REUSE** — 아래 registry의 primitive와 composite를 우선 조합한다.
5. **STATE** — default 화면뿐 아니라 loading, empty, error, disabled, success를 포함한다.
6. **ADAPT** — 각 mode에서 숨김이 아니라 재배치·drawer·sheet·route 전환을 결정한다.
7. **VERIFY** — keyboard, touch target, contrast, overflow, reduced motion을 검수한다.

AI는 계약에 없는 값을 추측해서 새 primitive로 추가하지 않는다. 프로젝트 문서에 명시된 override가 없으면 이 문서의 기본값을 사용하고, 구현 기술에 맞지 않는 값은 의미를 보존한 adapter로 변환한다.

규범 키워드:

- **MUST**: 예외 없이 지킨다.
- **SHOULD**: 제품상 이유가 있을 때만 벗어난다.
- **MAY**: 목적에 따라 선택한다.

## Machine-readable contract

```yaml
contract:
  schema:
    id: "wonhee-design-contract"
    version: "2.0"
    kind: "portable-core"
    normative_path: "contract"
    required_sections: [identity, foundations, tokens, responsive, component_schema, component_defaults, components, patterns, develop, ai, accessibility, prohibited]
    token_format:
      leaf_required: [$value]
      leaf_optional: [$type, $description]
      alias_syntax: "{group.token}"
      aliases_must_resolve: true
      literal_values_allowed_in: [tokens]
      implementation_output_rule: "visual literals from components or patterns must be promoted to project tokens before implementation"

  inheritance:
    strategy: "deep-merge-by-key"
    array_strategy: "replace unless the project document explicitly declares append"
    missing_project_value: "inherit core value"
    unknown_key: "validation error"
    conflict_resolution:
      - "accessibility and platform invariants cannot be weakened"
      - "project contract overrides portable visual defaults"
      - "component state overrides component base"
      - "responsive mode overrides component base only for that mode"

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
    character: [clear, calm, precise, contemporary, content-first]
    principles:
      - id: task-first
        rule: "장식보다 핵심 작업과 정보 계층을 먼저 보이게 한다"
      - id: one-primary-action
        rule: "한 화면 또는 한 local action group에는 primary action을 하나만 둔다"
      - id: adaptive-not-shrunk
        rule: "모바일은 데스크톱의 축소판이 아니라 같은 작업의 재구성이다"
      - id: composition-over-invention
        rule: "새 컴포넌트를 만들기 전에 기존 anatomy와 slot을 조합한다"
      - id: visible-state
        rule: "상태와 의미를 색상 하나로 전달하지 않는다"

  foundations:
    order: [design-token, color, typography, iconography, elevation, gradient, inclusive-design, international-design, layout, motion, radius, spacing, state, voice-and-tone, writing]
    design-token:
      purpose: "모든 시각 결정을 플랫폼과 컴포넌트가 공유하는 이름 있는 값으로 관리한다"
      layers: [semantic, component]
      layer_rule: "semantic tokens name a role; component tokens name a part of one component. this system has no primitive palette layer — a role token holds its literal value"
      rule: "implementation consumes semantic or component tokens; primitive values remain inside the token contract"
    color:
      purpose: "역할과 상태의 시각적 위계를 전달한다"
      roles: [brand, action, surface, content, boundary, feedback, inverse]
    typography:
      purpose: "콘텐츠 계층과 읽기 흐름을 일관되게 만든다"
      requirements: [font-family, font-size, font-weight, line-height, letter-spacing]
    iconography:
      purpose: "행동과 개념을 짧고 일관된 형태로 보조한다"
      source: "Google Material Symbols Rounded"
      implementation: "render through the shared MaterialIcon primitive; screen code never imports a second icon library"
      defaults: { fill: 0, weight: 400, grade: 0, optical-size: 24 }
      rules: ["decorative icons are hidden from assistive technology", "meaningful icons have an accessible name", "icons do not replace unfamiliar labels", "use canonical Material Symbols names", "filled state is reserved for selected or emphasized meaning"]
    elevation:
      purpose: "실제 stacking과 상호작용 관계만 표현한다"
      levels: [resting, raised, floating, modal]
    gradient:
      purpose: "브랜드 표현과 비조작 장식에 제한적으로 사용한다"
      prohibited: [body-text-background, control-state-only, contrast-reducing-overlay]
    inclusive-design:
      standard: "WCAG 2.2 AA"
      dimensions: [vision, hearing, motor, cognitive, situational]
    international-design:
      rules: ["allow text expansion", "avoid direction encoded only by position", "use locale-aware number, date, and currency formatting"]
    layout:
      models: [flow, stack, cluster, grid, split, sidebar, overlay]
      rule: "choose layout from information hierarchy and task, then adapt it by container width"
    motion:
      purposes: [feedback, continuity, orientation]
      rule: "motion never blocks completion and respects reduced motion"
    radius:
      roles: [small, control, card, overlay, pill]
    spacing:
      base: "4px"
      rule: "use the declared scale; arbitrary spacing is a validation error"
    state:
      interaction: [default, hover, pressed, focus-visible, disabled, loading]
      content: [loading, empty, error, success, stale, offline]
    voice-and-tone:
      character: [clear, calm, direct, respectful]
      rule: "tone changes with user context while the product voice remains stable"
    writing:
      rules: ["lead with the user outcome", "use verb-first action labels", "name the problem and recovery action", "avoid internal implementation terms"]

  tokens:
    dimension:
      $type: dimension
      space-1: { $value: "4px", $description: "Micro separation" }
      space-2: { $value: "8px", $description: "Tightly related content" }
      space-3: { $value: "12px", $description: "Compact component gap" }
      space-4: { $value: "16px", $description: "Default component inset" }
      space-5: { $value: "20px", $description: "Comfortable component inset" }
      space-6: { $value: "24px", $description: "Section inset" }
      space-8: { $value: "32px", $description: "Related section separation" }
      space-10: { $value: "40px", $description: "Major section rhythm" }
      space-12: { $value: "48px", $description: "Page-region separation" }
      space-16: { $value: "64px", $description: "Large page-region separation" }
      control-compact: { $value: "32px", $description: "Pointer-first dense control" }
      control-default: { $value: "40px", $description: "Default product control" }
      control-touch: { $value: "44px", $description: "Touch-first minimum product control" }
      control-prominent: { $value: "48px", $description: "Primary CTA and prominent input" }
      content-narrow: { $value: "680px", $description: "Form and focused reading measure" }
      content-default: { $value: "1120px", $description: "Default page content width" }
      content-wide: { $value: "1440px", $description: "Wide workspace content width" }
      side-panel: { $value: "280px", $description: "Default workspace side panel" }

    color:
      $type: color
      primary: { $value: "#2F6BFF", $description: "Primary action, selection, focus, and progress" }
      primary-strong: { $value: "#2458DB", $description: "Primary hover" }
      primary-pressed: { $value: "#1C46B4", $description: "Primary pressed" }
      primary-soft: { $value: "#EDF3FF", $description: "Selected and informative surface" }
      on-primary: { $value: "#FFFFFF", $description: "Content on primary" }
      page: { $value: "#F7F8FA", $description: "Application background" }
      surface: { $value: "#FFFFFF", $description: "Panel, card, field, and dialog" }
      surface-muted: { $value: "#F2F4F7", $description: "Secondary grouped region" }
      surface-raised: { $value: "#FFFFFF", $description: "Floating surface" }
      text: { $value: "#1B1D22", $description: "Primary text" }
      text-muted: { $value: "#505866", $description: "Description and metadata" }
      text-assistive: { $value: "#8992A1", $description: "Placeholder and assistive text" }
      text-disabled: { $value: "#B5BBC5", $description: "Disabled content" }
      border: { $value: "#D8DDE5", $description: "Control boundary" }
      border-subtle: { $value: "#E9ECF0", $description: "Quiet separation" }
      positive: { $value: "#158A4A", $description: "Success" }
      caution: { $value: "#C66A05", $description: "Warning" }
      negative: { $value: "#D9363E", $description: "Error and destructive action" }
      info: { $value: "{color.primary}", $description: "Informative state" }

    typography:
      $type: typography
      display: { $value: { fontFamily: "Pretendard, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontSize: "48px", fontWeight: 750, lineHeight: 1.15, letterSpacing: "-0.025em" }, $description: "Hero and high-emphasis display" }
      page-title: { $value: { fontFamily: "Pretendard, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontSize: "32px", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.02em" }, $description: "Page title" }
      section-title: { $value: { fontFamily: "Pretendard, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontSize: "24px", fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.015em" }, $description: "Section title" }
      heading: { $value: { fontFamily: "Pretendard, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontSize: "20px", fontWeight: 700, lineHeight: 1.4, letterSpacing: "-0.01em" }, $description: "Component heading" }
      body: { $value: { fontFamily: "Pretendard, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontSize: "16px", fontWeight: 400, lineHeight: 1.55, letterSpacing: "0em" }, $description: "Default body" }
      body-small: { $value: { fontFamily: "Pretendard, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.5, letterSpacing: "0em" }, $description: "Compact body" }
      label: { $value: { fontFamily: "Pretendard, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontSize: "14px", fontWeight: 600, lineHeight: 1.4, letterSpacing: "0em" }, $description: "Control label" }
      caption: { $value: { fontFamily: "Pretendard, Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontSize: "12px", fontWeight: 500, lineHeight: 1.4, letterSpacing: "0.01em" }, $description: "Caption and metadata" }

      space-1: { $value: "4px", $description: "Micro separation" }
      space-2: { $value: "8px", $description: "Tightly related content" }
      space-3: { $value: "12px", $description: "Compact component gap" }
      space-4: { $value: "16px", $description: "Default component inset" }
      space-5: { $value: "20px", $description: "Comfortable component inset" }
      space-6: { $value: "24px", $description: "Section inset" }
      space-8: { $value: "32px", $description: "Related section separation" }
      space-10: { $value: "40px", $description: "Major section rhythm" }
      space-12: { $value: "48px", $description: "Page-region separation" }
      space-16: { $value: "64px", $description: "Large page-region separation" }

    radius:
      $type: dimension
      sm: { $value: "8px", $description: "Compact control and nested surface" }
      control: { $value: "12px", $description: "Default interactive control" }
      card: { $value: "16px", $description: "Card and grouped surface" }
      overlay: { $value: "20px", $description: "Dialog and sheet" }
      pill: { $value: "9999px", $description: "Badge, chip, avatar, and status only" }

    shadow:
      $type: shadow
      resting: { $value: "0 1px 2px rgba(16,24,40,.05)", $description: "Subtle resting separation" }
      raised: { $value: "0 4px 12px rgba(16,24,40,.10)", $description: "Raised card" }
      floating: { $value: "0 12px 32px rgba(16,24,40,.14)", $description: "Menu and popover" }
      modal: { $value: "0 24px 64px rgba(16,24,40,.18)", $description: "Dialog and blocking overlay" }

    duration:
      $type: duration
      fast: { $value: "120ms", $description: "Hover, press, and small state feedback" }
      base: { $value: "200ms", $description: "Default component transition" }
      slow: { $value: "300ms", $description: "Overlay and region transition" }
      easing: { $value: "cubic-bezier(.2,0,0,1)", $type: cubicBezier, $description: "Shared productive easing" }

      control-compact: { $value: "32px", $description: "Pointer-first dense control" }
      control-default: { $value: "40px", $description: "Default product control" }
      control-touch: { $value: "44px", $description: "Touch-first minimum product control" }
      control-prominent: { $value: "48px", $description: "Primary CTA and prominent input" }
      content-narrow: { $value: "680px", $description: "Form and focused reading measure" }
      content-default: { $value: "1120px", $description: "Default page content width" }
      content-wide: { $value: "1440px", $description: "Wide workspace content width" }
      side-panel: { $value: "280px", $description: "Default workspace side panel" }

  responsive:
    modes:
      compact:
        range: "0..767px"
        input: "touch-first"
        density: "comfortable"
        columns: 1
        page-padding: "16px"
        control-min: "44px"
      medium:
        range: "768px..1199px"
        input: "touch-or-pointer"
        density: "comfortable"
        columns: "1..2"
        page-padding: "24px"
        control-min: "40px"
      wide:
        range: "1200px+"
        input: "pointer-and-keyboard"
        density: "compact-or-comfortable"
        columns: "2..12"
        page-padding: "32px"
        control-min: "32px dense, 40px general"
    rules:
      - "MUST design all three modes; desktop wrap alone is not responsive behavior"
      - "MUST preserve task, content, state, and action across modes"
      - "SHOULD replace persistent side regions with drawer, sheet, or dedicated route on compact"
      - "MUST NOT hide essential functionality solely because the viewport is compact"
      - "MUST use container queries for reusable components when parent width matters more than viewport"

  component_defaults:
    documentation: [purpose, anatomy, slots, variants, sizes, states, responsive, accessibility, prohibited]
    required_fields:
      all: [anatomy]
      interactive: [purpose, states]
      inherited: [responsive, accessibility]
    states: [default, hover, pressed, focus-visible, disabled, loading]
    slots_are_semantic: true
    uncontrolled_visual_state: false
    icon_only_requires: [accessible-name, square-target, tooltip-when-unfamiliar]
    custom_component_threshold: "Create only when composition cannot express a recurring behavior used in 2+ places"
    implementation_rules:
      - "components reference semantic or component tokens, never primitive literals"
      - "every interactive component declares keyboard behavior and accessible name source"
      - "every variant changes meaning or hierarchy, not decoration alone"
      - "every optional slot has an omission behavior"

  component_schema:
    rule: "a component entry is a portable behavior contract; a product document supplies final token bindings and renderer"
    entry_kinds: [component, family]
    component_entry:
      required: [purpose]
      expected: [anatomy, rules]
      optional: [variants, states, sizes, responsive, slots, inherits]
      extension: "a component MAY add contract-bearing keys of its own, such as min-height, radius, max-options, or fallback-order"
    family_entry:
      required: [members]
      optional: [rules, responsive]
      note: "an abstract grouping such as overlay or feedback; it has members instead of purpose and anatomy"
    style:
      key: kebab-case
      purpose: "lowercase verb phrase, no trailing period, one sentence"
      rules: "each entry begins with or contains a normative keyword"
    normative_keywords: [MUST, MUST NOT, SHOULD, SHOULD NOT, MAY]
    # The remaining component facts are intentionally not stored on the entry.
    # A product document keeps them where they can be validated against code.
    delegated_fields:
      category: contract.component_registry.categories
      props: contract.component_recipes.items
      defaults: contract.component_recipes.items
      preview_size: contract.component_registry.preview_sizes
      renderer: contract.component_registry.source_overrides
      token_bindings: contract.component_registry.token_bindings
    status_values: [planned, experimental, stable, deprecated]
    prop_schema:
      required: [type, required, description]
      optional: [default, values]

  components:
    button:
      purpose: "trigger one immediate action"
      anatomy: [root, optional-leading-icon, label, optional-trailing-icon, optional-spinner]
      variants: [primary, secondary, outline, ghost, destructive]
      sizes: [dense, default, touch, prominent]
      states: [default, hover, pressed, focus-visible, disabled, loading]
      responsive: { compact: "touch or prominent", medium: "default or touch", wide: "dense or default" }
      rules:
        - "MUST keep the label visible while loading when space permits"
        - "MUST NOT use pill radius for ordinary actions"
        - "MUST NOT place two primary buttons in one local group"

    icon-button:
      purpose: trigger one action with an icon alone
      anatomy: [root, icon, optional-badge]
      sizes: [dense, default, touch]
      rules: ["MUST have accessible name", "MUST be square", "SHOULD have tooltip for unfamiliar icons"]

    field:
      purpose: capture one value with a persistent label
      anatomy: [label, control, optional-prefix, input, optional-suffix, optional-clear, optional-help]
      variants: [box, line, search, display]
      states: [default, hover, focus-visible, filled, read-only, disabled, success, error]
      rules:
        - "MUST have a programmatic label; placeholder is never the only label in a form"
        - "error MUST expose message text and aria-invalid"
        - "MUST preserve the entered value after validation failure"

    selection-control:
      members: [checkbox, radio, switch]
      anatomy: [control, label, optional-description]
      rules:
        - "checkbox MUST be used for independent multi-selection"
        - "radio MUST be used for one choice in a group"
        - "switch MUST be used for an immediately effective setting"

    tabs:
      purpose: navigate peer content destinations
      anatomy: [tablist, tab, optional-badge, active-indicator, panel]
      variants: [line, contained, scrollable]
      rules:
        - "MUST use tab semantics and arrow-key navigation"
        - "compact with 4+ items SHOULD scroll rather than compress labels"

    segmented-control:
      purpose: "switch a local mode, never top-level navigation"
      max-options: 5
      responsive: { compact: "2..4 options", medium: "2..5 options", wide: "2..5 options" }

    chip:
      purpose: "filter, tag, or compact selection"
      variants: [filter, input, suggestion]
      radius: pill

    badge:
      purpose: "short metadata, count, or status"
      variants: [neutral, info, success, warning, error]
      rules: ["MUST include text or icon meaning beyond color"]

    asset:
      purpose: "normalize image, icon, video, lottie, avatar presentation"
      anatomy: [frame, content, optional-overlay, optional-accessory]
      frame-shapes: [square, rounded, card, circle, clean]
      fit: [cover, contain, fill]
      rules: ["MUST reserve layout space", "MUST define alt behavior", "MUST use responsive sources for meaningful images"]

    list-row:
      purpose: "scan and act on repeated information"
      slots: [leading, contents, metadata, trailing]
      contents: [one-line, two-line, three-line]
      trailing: [text, badge, icon-button, switch, chevron]
      min-height: { compact: "56px", medium: "52px", wide: "48px" }
      rules:
        - "MUST keep primary label and row action distinguishable"
        - "SHOULD use dividers before separate cards for repeated data"
        - "MUST NOT overload trailing with more than one primary interaction"

    card:
      purpose: group one related concept into a bounded surface
      anatomy: [optional-header, content, optional-media, optional-footer]
      variants: [plain, bordered, raised, selectable]
      rules: ["MUST group one concept", "MUST NOT wrap every section in a card", "MUST NOT nest decorative cards"]

    table:
      purpose: compare structured values across shared columns
      anatomy: [caption, header, row, cell, optional-selection, optional-row-action]
      responsive:
        compact: "convert to prioritized list rows or horizontal scroll only when comparison must remain tabular"
        medium: "hide low-priority columns through explicit priority rules"
        wide: "show full table with sticky header when useful"
      rules: ["MUST define column priority", "MUST label sortable state", "numeric columns SHOULD use tabular figures"]

    navigation:
      purpose: move among primary or secondary product destinations
      variants: [top-bar, side-navigation, bottom-navigation, breadcrumb]
      responsive:
        compact: "top bar plus bottom navigation or menu sheet"
        medium: "top bar plus collapsible rail"
        wide: "top bar or persistent side navigation chosen by information architecture"
      rules: ["active state MUST not rely on color alone", "navigation pattern SHOULD be chosen by IA, not viewport alone"]

    app-shell-navigation:
      members: [app-header, top-navigation, global-navigation, local-navigation, side-navigation, bottom-app-bar, app-footer]
      responsive:
        compact: "app header plus an IA-appropriate bottom app bar or menu sheet; footer stacks"
        medium: "app header plus collapsible local navigation; footer stacks or splits"
        wide: "app header with global navigation plus optional persistent local navigation; footer splits"
      rules:
        - "global navigation MUST contain top-level destinations only"
        - "local navigation MUST contain destinations from the selected global area only"
        - "bottom app bar MUST contain three to five destinations and respect safe area"
        - "collapsed navigation MUST preserve labels for assistive technology"

    responsive-workspace-shell:
      members: [workspace-shell, page-header, section-header, side-panel, fixed-bottom-cta]
      responsive:
        compact: "one primary route at a time; navigation and inspector become drawer, sheet, or route"
        medium: "one persistent side region and one overlay side region"
        wide: "persistent navigation, primary canvas, and optional resizable inspector"
      rules:
        - "main content MUST remain the primary landmark"
        - "persistent panels MUST define minimum and maximum widths"
        - "fixed bottom CTA MUST reserve safe-area and content clearance"

    feedback:
      members: [inline-message, banner, toast, progress, skeleton, result]
      rules:
        - "toast is transient and MUST NOT be the only place for critical errors"
        - "skeleton SHOULD mirror final structure"
        - "result MUST contain a title, a description, and one useful next action"

    overlay:
      members: [tooltip, popover, menu, dialog, sheet]
      responsive:
        compact: "dialog MAY become bottom or full-height sheet"
        medium: "dialog or anchored popover"
        wide: "dialog, popover, or menu according to task"
      rules: ["MUST dismiss predictably", "blocking overlays MUST manage and restore focus", "destructive confirmation MUST name consequence"]

    action-bar:
      purpose: "finish a page, form, or blocking task with a clear action hierarchy"
      anatomy: [container, optional-secondary-actions, primary-action, optional-safe-area]
      responsive: { compact: "stack actions at full width", medium: "align actions inline to the end", wide: "align actions inline to the end" }
      rules: ["MUST contain at most one primary action", "fixed bars MUST reserve content space"]

    field-group:
      purpose: "group controls that share one question or validation context"
      anatomy: [fieldset, legend, controls, optional-help, optional-error]
      rules: ["MUST preserve fieldset and legend semantics", "group validation MUST identify affected controls"]

    number-field:
      purpose: "enter an exact bounded number with optional step actions"
      anatomy: [label, optional-decrement, numeric-input, optional-increment]
      states: [default, focus-visible, disabled, minimum, maximum, error]
      rules: ["MUST expose bounds and step", "MUST allow direct keyboard entry when precision matters"]

    slider:
      purpose: "select an approximate value from a range"
      anatomy: [label, optional-output, track, thumb]
      states: [default, focus-visible, disabled]
      rules: ["MUST expose current value and bounds", "MUST pair with numeric entry when exact values are required"]

    agreement:
      purpose: "collect required and optional consent as a related set"
      anatomy: [legend, optional-select-all, agreement-items, optional-detail-actions]
      rules: ["required and optional status MUST be explicit text", "individual controls MUST remain programmatically available"]

    stepper:
      purpose: "orient the user inside a finite multi-step task"
      anatomy: [ordered-list, step-indicators, labels, optional-descriptions, connectors]
      states: [upcoming, current, complete, error]
      rules: ["current step MUST use aria-current", "labels MUST remain understandable without connector color"]

    list-section:
      purpose: "compose a titled group of list rows"
      anatomy: [optional-header, rows, optional-footer]
      rules: ["SHOULD use quiet row dividers", "MUST NOT nest decorative cards around each row"]

    bar-chart:
      purpose: "compare a concise set of categorical values"
      anatomy: [figure, caption, plot, bars, value-labels, category-labels]
      rules: ["MUST expose category-value pairs as text", "MUST NOT encode series by color alone"]

    prose:
      purpose: "present long-form guidance with semantic structure and readable measure"
      anatomy: [article, headings, paragraphs, optional-emphasis]
      rules: ["MUST preserve heading order", "SHOULD keep line length within 45..80 characters"]

    responsive-grid:
      purpose: "arrange peer items from available container width"
      anatomy: [grid, items]
      rules: ["MUST define a useful minimum item width", "MUST avoid empty columns created only to fill a desktop grid"]

    detail-header:
      purpose: "introduce detail-page identity, context, and actions"
      anatomy: [optional-eyebrow, title, optional-description, optional-metadata, optional-actions]
      responsive: { compact: "stack content and actions", medium: "align when space permits", wide: "share one row" }

  reference_catalog:
    policy: "Coverage map only. Names identify capabilities found in public TDS docs; implementation and appearance are independent Wonhee contracts."
    status_values: [core, composed, specialized, excluded]
    items:
      badge: { category: status, target: badge, status: core }
      board-row: { category: data-display, target: list-row, status: composed }
      border: { category: layout, target: divider, status: composed }
      bottom-info: { category: feedback, target: inline-message, status: composed }
      bottom-sheet: { category: overlay, target: sheet, status: core }
      bubble: { category: feedback, target: tooltip-or-callout, status: composed }
      button: { category: action, target: button, status: core }
      checkbox: { category: selection, target: selection-control.checkbox, status: core }
      grid-list: { category: data-display, target: responsive-grid, status: composed }
      highlight: { category: typography, target: text-highlight, status: composed }
      icon-button: { category: action, target: icon-button, status: core }
      list-footer: { category: data-display, target: list-section.footer, status: composed }
      list-header: { category: data-display, target: list-section.header, status: composed }
      loader: { category: feedback, target: feedback.loader, status: core }
      menu: { category: overlay, target: overlay.menu, status: core }
      modal: { category: overlay, target: overlay.dialog, status: core }
      numeric-spinner: { category: input, target: number-field, status: specialized }
      paragraph: { category: typography, target: prose.paragraph, status: composed }
      post: { category: content, target: prose.article, status: composed }
      progress-bar: { category: feedback, target: feedback.progress, status: core }
      progress-stepper: { category: feedback, target: progress-stepper, status: specialized }
      rating: { category: input, target: rating, status: specialized }
      result: { category: feedback, target: feedback.result, status: core }
      search-field: { category: input, target: field.search, status: core }
      segmented-control: { category: selection, target: segmented-control, status: core }
      skeleton: { category: feedback, target: feedback.skeleton, status: core }
      slider: { category: input, target: slider, status: specialized }
      stepper: { category: navigation, target: stepper, status: specialized }
      switch: { category: selection, target: selection-control.switch, status: core }
      tab: { category: navigation, target: tabs, status: core }
      table-row: { category: data-display, target: table.row, status: composed }
      text-button: { category: action, target: button.ghost, status: composed }
      toast: { category: feedback, target: feedback.toast, status: core }
      tooltip: { category: overlay, target: overlay.tooltip, status: core }
      top: { category: pattern, target: detail-header, status: composed }
      agreement-v3: { category: legal-form, target: agreement, status: excluded, reason: "deprecated source API" }
      agreement-v4: { category: legal-form, target: agreement, status: specialized }
      asset: { category: media, target: asset, status: core }
      bottom-cta-single: { category: action, target: responsive-action-bar.single, status: composed }
      bottom-cta-double: { category: action, target: responsive-action-bar.double, status: composed }
      fixed-bottom-cta: { category: action, target: responsive-action-bar.fixed, status: composed }
      bar-chart: { category: data-visualization, target: chart.bar, status: specialized }
      alert-dialog: { category: overlay, target: overlay.alert-dialog, status: composed }
      confirm-dialog: { category: overlay, target: overlay.confirm-dialog, status: composed }
      alphabet-keypad: { category: input, target: keypad.alphabet, status: specialized }
      full-secure-keypad: { category: input, target: keypad.secure, status: excluded, reason: "security-specific; requires audited implementation" }
      number-keypad: { category: input, target: keypad.number, status: specialized }
      list-row: { category: data-display, target: list-row, status: core }
      text-field: { category: input, target: field, status: core }
      split-text-field: { category: input, target: field.group, status: composed }
      text-area: { category: input, target: field.textarea, status: core }
      overlay-extension: { category: utility, target: overlay.controller, status: composed }

  patterns:
    list-screen:
      purpose: "scan, filter, and act on repeated entities"
      recipe: [navigation, optional-summary, search-or-filter, list-row-group, pagination-or-load-more]
      states: [loading, empty, error, populated]
    detail-screen:
      purpose: "understand one entity and complete contextual actions"
      recipe: [navigation, title-and-status, primary-content, related-sections, contextual-actions]
    form-screen:
      purpose: "collect and validate user input with recoverable progress"
      recipe: [title-and-guidance, grouped-fields, inline-validation, action-group]
      max-reading-width: "680px"
    dashboard:
      purpose: "monitor status, compare values, and investigate changes"
      recipe: [navigation, summary-metrics, primary-chart-or-table, supporting-sections]
    workspace:
      purpose: "perform an extended creation or editing task"
      wide: [app-header, optional-left-panel, primary-canvas, optional-right-panel]
      medium: [app-header, one-persistent-panel, primary-canvas, overlay-secondary-panel]
      compact: [app-header, primary-canvas-or-route, drawer-or-sheet-tools]
    landing:
      purpose: "explain value and lead to one primary conversion action"
      recipe: [global-header, hero, trust-or-proof, feature-sections, final-cta, footer]

  develop:
    source_order: [design-contract, generated-tokens, shared-primitives, product-compositions, screens]
    generated_targets: [dtcg-json, css-custom-properties, typescript-types, tailwind-theme]
    integration:
      css: "consume generated semantic and component custom properties"
      react: "compose shared accessible primitives; screen code does not recreate primitive behavior"
      other-platforms: "transform the same semantic token source through a platform adapter"
    versioning:
      strategy: semantic-versioning
      breaking: [token-removal, token-rename, component-prop-removal, behavior-change]
      migration_requires: [changelog, before-after-diff, replacement-or-codemod]
    verification: [contract-lint, type-check, accessibility-test, interaction-test, visual-regression]

  ai:
    context_order: [task, product-extension, portable-core, selected-pattern, selected-components, examples]
    retrieval_units: [foundation-page, component-page, pattern-page, develop-page]
    selection_rules:
      - "retrieve only the components and patterns needed for the current task"
      - "prefer stable components and explicit composition over new markup"
      - "cite token and component ids in the generated plan"
      - "do not imitate reference-brand trade dress"
    generation_output:
      required: [intent, viewport-mode, pattern-id, component-tree, token-usage, states, accessibility-checks]
      prohibited: [unregistered-component-without-reason, unresolved-token, visual-literal, inaccessible-name]
    delivery: [design-md, llms-txt, skill, docs-api, mcp]
    self_audit: [contract-valid, component-coverage, responsive-parity, state-completeness, accessibility-pass]

  accessibility:
    standard: "WCAG 2.2 AA"
    requirements:
      - "normal text contrast >= 4.5:1"
      - "large text and essential non-text contrast >= 3:1"
      - "keyboard focus is visible and not obscured"
      - "compact touch targets are at least 44px"
      - "role, name, value, and state are programmatically exposed"
      - "status and errors use text or semantics in addition to color"
      - "prefers-reduced-motion is respected"
      - "200% text zoom does not lose content or functionality"

  validation:
    errors:
      - "missing required contract section"
      - "unresolved token alias"
      - "literal visual value outside contract.tokens"
      - "component missing required anatomy or interactive state"
      - "interactive component without keyboard or accessible-name rule"
      - "normal text contrast below 4.5:1"
      - "duplicate component, pattern, or token id"
    warnings:
      - "declared token has no consumer"
      - "component has no compact, medium, or wide behavior where layout changes"
      - "new component overlaps an existing component composition"
      - "example uses a value not represented by a token"
    completion_gate: [schema-valid, aliases-resolved, accessibility-pass, consumer-coverage, visual-regression-pass]

  prohibited:
    - "desktop layout merely scaled down for mobile"
    - "essential action hidden on compact without an equivalent destination"
    - "placeholder-only form label"
    - "icon-only action without accessible name"
    - "ordinary controls using pill radius"
    - "multiple competing primary actions"
    - "nested card decoration"
    - "status communicated by color alone"
    - "new component created for a one-off visual variation"
```

## Responsive transformation matrix

| Capability | Compact | Medium | Wide |
| --- | --- | --- | --- |
| Primary navigation | top + bottom/menu sheet | top + collapsible rail | top or persistent side nav |
| Secondary panel | sheet/drawer/route | one overlay or persistent | persistent when useful |
| Data table | prioritized rows | reduced columns | full table |
| Dialog | bottom/full sheet when needed | centered dialog | centered dialog/popover |
| Action group | full-width or stacked | inline when labels fit | inline and compact |
| Filters | chips + sheet | popover/drawer | inline toolbar/panel |
| Workspace | one active surface | canvas + one panel | canvas + two panels |

## Composition rules

1. 화면을 card 모음으로 시작하지 않는다. 먼저 page regions와 reading order를 정한다.
2. 같은 데이터가 반복되면 `list-row`, 비교가 핵심이면 `table`, 개별 탐색이 핵심이면 `card`를 선택한다.
3. 모바일에서 side panel을 아래로 길게 붙이지 않는다. drawer, sheet, route 중 하나로 전환한다.
4. variant는 시각 장식이 아니라 역할 차이를 표현한다.
5. slot은 위치가 아니라 의미로 이름 붙인다: `leading`, `contents`, `metadata`, `trailing`.
6. 브레이크포인트 사이에서도 자연스럽게 동작하도록 fluid width와 container query를 우선한다.
7. 빈 상태, 오류, 로딩은 정상 화면과 같은 정보 구조를 사용한다.

## Project adoption

새 프로젝트에서 이 문서를 사용할 때는 다음 순서로 적용한다.

```text
wonhee-design.md
→ project-design.md에서 brand/token override
→ shared primitives 구현
→ composite와 pattern 조립
→ compact/medium/wide 동시 검수
```

프로젝트 전용 문서는 다음만 덮어쓴다.

- 브랜드 색과 서체
- 제품 특화 density
- 제품 전용 component/pattern
- 콘텐츠와 voice
- 기술 스택과 구현 경로

공통 anatomy, state, responsive, accessibility 규칙을 프로젝트 문서에 복제하지 않는다.

## AI self-audit

```yaml
self_audit:
  intent:
    - "핵심 사용자 작업과 primary action이 명확하다"
  reuse:
    - "registry의 primitive/composite를 먼저 사용했다"
    - "새 컴포넌트는 반복되는 behavior를 해결한다"
  responsive:
    - "compact, medium, wide의 정보와 행동이 동등하다"
    - "panel, table, dialog, navigation이 적절한 pattern으로 전환된다"
    - "모바일이 desktop 축소판이 아니다"
  states:
    - "loading, empty, error, disabled, success 중 필요한 상태가 있다"
  accessibility:
    - "keyboard, focus, label, contrast, touch target, zoom, reduced motion을 통과한다"
  consistency:
    - "값은 token에서 오고 variant/state 이름이 registry와 일치한다"
```

## Reference rationale

- TDS에서 참고한 것은 컴포넌트 수가 아니라 anatomy, compound composition, 명시적 interface, 접근성 계약 방식이다.
- TDS Mobile의 패키지 API와 시각값은 이 문서의 런타임 의존성이 아니다.
- Apps in Toss TDS UI Kit의 제한적 사용 허가를 존중하며, 공개 문서도 외형 복제나 자산 재사용의 근거로 사용하지 않는다.
- PC workspace에 필요한 table, side navigation, resizable region, multi-panel transformation은 별도 반응형 계약으로 보완한다.
- 이 문서는 서비스마다 복사해 시작할 수 있으며 프로젝트 고유 스타일은 별도 override 문서가 담당한다.
