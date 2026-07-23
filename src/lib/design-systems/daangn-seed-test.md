---
version: daangn-seed-agent-ready-2026-07-08
name: Daangn Seed Agent-Ready Test
description: "Single-file design.md experiment extracted from daangn/seed-design. It converts Seed's rootage YAML, qvism recipes, css tokens, and React component inventory into an AI-readable contract for Aide."

source:
  repository: "https://github.com/daangn/seed-design"
  branch: "dev"
  checkedAt: "2026-07-08"
  packages:
    tokens: "packages/rootage/*.yaml"
    componentSpecs: "packages/rootage/components/*.yaml"
    recipes: "packages/qvism-preset/src/recipes"
    css: "packages/css"
    react: "packages/react"
    reactHeadless: "packages/react-headless"

brand:
  name: "Daangn Seed"
  visualIntent: "warm local commerce, friendly utility, mobile-first trust"
  primaryToken: "$color.bg.brand-solid"
  primaryPalette: "$color.palette.carrot-600"
  primaryLight: "#ff6600"
  primaryPressed: "$color.bg.brand-solid-pressed"
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

colorRoles:
  brand:
    solid: "$color.bg.brand-solid"
    pressed: "$color.bg.brand-solid-pressed"
    weak: "$color.bg.brand-weak"
    foreground: "$color.fg.brand"
    stroke: "$color.stroke.brand-solid"
  surface:
    basement: "$color.bg.layer-basement"
    default: "$color.bg.layer-default"
    floating: "$color.bg.layer-floating"
    overlay: "$color.bg.overlay"
  foreground:
    neutral: "$color.fg.neutral"
    muted: "$color.fg.neutral-muted"
    subtle: "$color.fg.neutral-subtle"
    placeholder: "$color.fg.placeholder"
    inverted: "$color.fg.neutral-inverted"
  stroke:
    neutral: "$color.stroke.neutral-solid"
    muted: "$color.stroke.neutral-muted"
    weak: "$color.stroke.neutral-weak"
    focus: "$color.stroke.focus-ring"
  status:
    critical: "$color.bg.critical-solid"
    positive: "$color.bg.positive-solid"
    warning: "$color.bg.warning-solid"
    informative: "$color.bg.informative-solid"

spacing:
  system: "$dimension.x*"
  compact: "$dimension.x2"
  normal: "$dimension.x4"
  roomy: "$dimension.x6"
  section: "$dimension.x8"

radius:
  small: "$radius.r2"
  medium: "$radius.r3"
  full: "$radius.full"

typography:
  source: "packages/rootage/font-size.yaml + font-weight.yaml + line-height.yaml"
  rule: "Use Seed typography tokens. Keep mobile text compact, readable, and hierarchy-first."
  common:
    title: "$font-size.t7 / $line-height.t7 / $font-weight.bold"
    body: "$font-size.t4 / $line-height.t4 / $font-weight.regular"
    label: "$font-size.t4 / $line-height.t4 / $font-weight.bold"
    caption: "$font-size.t3 / $line-height.t3 / $font-weight.regular"

designSemantics:
  productIntent: "local marketplace, community utility, lightweight commerce, trusted neighborhood interaction"
  platform: "mobile-first responsive"
  density: "compact | comfortable"
  hierarchy: "primary local task > nearby context > trust signal > secondary action"
  interactionMode: "prompt-generate | drag-compose | iterative-refine"
  outputMode: "style-guide-preview | production-screen | component-tree"
  contentPolicy: "preserve uploaded source text and change layout/style only"

components:
  action-button:
    package: "@seed-design/react"
    importCode: "import { ActionButton } from '@seed-design/react';"
    rootage: "packages/rootage/components/action-button.yaml"
    recipe: "@seed-design/css/recipes/action-button"
    category: action
    variants:
      variant: ["brandSolid", "neutralSolid", "neutralWeak", "criticalSolid", "neutralOutline", "brandOutline", "ghost"]
      size: ["xsmall", "small", "medium", "large"]
      layout: ["withText", "iconOnly"]
    anatomy: ["root", "label", "icon", "prefixIcon", "suffixIcon", "progressCircle"]
    rules:
      - "Use brandSolid only for the main local/transaction action. Prefer one brandSolid per screen."
      - "Use neutralSolid for general CTA, neutralWeak for secondary actions."
      - "Use criticalSolid only for irreversible/destructive actions."
      - "iconOnly requires aria-label or aria-labelledby."
    playgroundDefault: { label: "채팅하기", variant: "brandSolid", size: "large", layout: "withText" }
  text-field:
    package: "@seed-design/react"
    importCode: "import { TextField, Field } from '@seed-design/react';"
    rootage: "packages/rootage/components/text-input.yaml"
    category: input
    anatomy: ["Field.Root", "Field.Label", "TextField.Root", "TextField.Input", "prefixIcon", "suffixIcon", "helper/error"]
    rules:
      - "A TextFieldInput outside Field must have aria-label or aria-labelledby."
      - "Placeholder never replaces a visible label in form workflows."
      - "Use compact width and clear affordances for mobile-first search and transaction forms."
    playgroundDefault: { label: "검색어", placeholder: "동네, 물품, 가게를 검색해보세요" }
  bottom-sheet:
    package: "@seed-design/react"
    importCode: "import { BottomSheet } from '@seed-design/react';"
    category: overlay
    anatomy: ["overlay", "sheet", "header", "title", "content", "actions"]
    rules:
      - "Use for mobile choices, filters, quick forms, and contextual actions."
      - "Use layer-floating surface and overlay dimming."
      - "Do not use as desktop page layout."
    playgroundDefault: { title: "필터", primaryLabel: "적용하기", secondaryLabel: "초기화" }
  action-sheet:
    package: "@seed-design/react"
    importCode: "import { ActionSheet } from '@seed-design/react';"
    category: overlay
    anatomy: ["trigger", "sheet", "item", "closeButton"]
    rules:
      - "Use for short mobile action menus."
      - "Items should be action-oriented and concise."
  chip:
    package: "@seed-design/react"
    importCode: "import { Chip, ActionChip, ControlChip } from '@seed-design/react';"
    category: selection
    anatomy: ["root", "label", "icon(optional)", "state"]
    rules:
      - "Use ActionChip for action-like quick filters."
      - "Use ControlChip for selected/unselected controls."
      - "Keep labels short."
  tabs:
    package: "@seed-design/react"
    importCode: "import { Tabs, ChipTabs, SegmentedControl } from '@seed-design/react';"
    category: navigation
    anatomy: ["list", "trigger", "content", "selected state"]
    rules:
      - "Use Tabs for content sections."
      - "Use ChipTabs or SegmentedControl for compact mobile filtering."
  list:
    package: "@seed-design/react"
    importCode: "import { List } from '@seed-design/react';"
    category: content
    anatomy: ["item", "title", "description", "metadata", "thumbnail(optional)", "action(optional)"]
    rules:
      - "Prefer list/card-list for local marketplace feeds."
      - "Each item should include trust/context signal such as distance, time, count, or neighborhood."
  badge-tag:
    package: "@seed-design/react"
    importCode: "import { Badge, TagGroup, NotificationBadge, Count } from '@seed-design/react';"
    category: status
    anatomy: ["label", "status color", "count(optional)"]
    rules:
      - "Use status tokens semantically. Do not turn status colors into brand palette."
  layout-primitives:
    package: "@seed-design/react"
    importCode: "import { Box, Flex, Stack, Inline, Grid, Columns, Layout } from '@seed-design/react';"
    category: layout
    anatomy: ["container", "gap", "alignment", "responsive behavior"]
    rules:
      - "Compose screens from layout primitives before decorating."
      - "Use compact gaps for mobile, roomy gaps for desktop."
  feedback:
    package: "@seed-design/react"
    importCode: "import { Snackbar, InlineBanner, Callout, Dialog, LoadingIndicator, Skeleton } from '@seed-design/react';"
    category: feedback
    anatomy: ["message", "status", "action(optional)", "dismiss(optional)"]
    rules:
      - "Use Snackbar for transient feedback."
      - "Use Dialog for blocking confirmation."
      - "Use Skeleton for loading lists/cards."
  navigation:
    package: "@seed-design/react"
    importCode: "import { TopNavigation, SideNavigation, NavigationMenu, MenuSheet } from '@seed-design/react';"
    category: navigation
    anatomy: ["brand/title", "items", "active state", "actions"]
    rules:
      - "Mobile screens should favor top navigation plus bottom/contextual actions."
      - "Desktop/admin screens may use SideNavigation."

componentInventory:
  reactExports:
    - Accordion
    - ActionButton
    - ActionChip
    - ActionSheet
    - Article
    - AspectRatio
    - Avatar
    - Badge
    - BottomSheet
    - Box
    - Callout
    - Checkbox
    - Chip
    - ChipTabs
    - Columns
    - ContentPlaceholder
    - ContextualFloatingButton
    - ControlChip
    - Count
    - Dialog
    - Divider
    - ExtendedActionSheet
    - ExtendedFab
    - Fab
    - Field
    - FieldButton
    - Fieldset
    - AttachmentDisplay
    - AttachmentInput
    - Flex
    - Float
    - FloatingActionButton
    - Footer
    - Grid
    - GridItem
    - HelpBubble
    - Icon
    - IdentityPlaceholder
    - ImageFrame
    - Inline
    - InlineBanner
    - LinkContent
    - List
    - LoadingIndicator
    - MannerTemp
    - MannerTempBadge
    - MenuSheet
    - NotificationBadge
    - PageBanner
    - Portal
    - ProgressCircle
    - PullToRefresh
    - RadioGroup
    - RadioGroupField
    - ReactionButton
    - ResponsivePair
    - ScrollFog
    - SegmentedControl
    - SelectBox
    - Skeleton
    - Slider
    - Snackbar
    - Stack
    - Switch
    - Tabs
    - TagGroup
    - Text
    - TextField
    - ToggleButton
    - VisuallyHidden
---

# Daangn Seed Agent-Ready Design.md

This file is a Seed Design experiment for Aide. It should make generated UI feel like a Daangn/Seed product: warm, local, mobile-first, useful, and component-driven.

## 0. Agent Contract

1. Use Seed semantic tokens first. Do not invent arbitrary hex values.
2. Treat `rootage` YAML as the design source of truth, `qvism-preset` as style recipe source, `css` as generated output, and `react` as the component implementation.
3. Use carrot brand color only for brand identity and the most important action.
4. Prefer neutral surfaces and compact mobile layouts. Do not flood entire screens with carrot orange.
5. Preserve source copy, information architecture, menus, labels, and data when redesigning uploaded PRD/wireframe/HTML.
6. Generate the requested product screen by default. Only include a style guide board when the user requests a Stitch-like preview.
7. Every major region should map to a Seed component, layout primitive, or template slot.
8. Use status colors only for status. Critical, positive, warning, and informative are not brand accents.
9. Icon-only controls must have accessible labels.
10. Keep interaction mobile-first: pressed/active states matter more than hover-only styling.

## 1. Source Of Truth

- Repository: `daangn/seed-design`
- Source branch observed: `dev`
- Primary source package: `packages/rootage`
- Component schema source: `packages/rootage/components/*.yaml`
- Style recipe source: `packages/qvism-preset/src/recipes`
- Runtime component source: `packages/react/src/components`
- Token pipeline: `Figma -> rootage YAML -> qvism-preset -> css -> react`

When this file conflicts with Seed source names, Seed source names win.

## 2. Seed System Model

Seed is not just a visual style. It is a generated design system pipeline:

```text
Figma variables
  -> rootage YAML tokens and component specs
  -> qvism-preset recipes
  -> @seed-design/css vars/recipes
  -> @seed-design/react styled components
```

Aide should not hand-roll visual approximations when a Seed component exists. It should select a component, choose its official variants, then compose layout.

## 3. Color Semantics

Use semantic roles, not raw palette colors.

| Role | Token | Use |
|---|---|---|
| Brand action | `$color.bg.brand-solid` | Primary local/transaction CTA |
| Brand foreground | `$color.fg.brand` | Brand text/icon emphasis |
| Base background | `$color.bg.layer-basement` | App/page base |
| Default surface | `$color.bg.layer-default` | Content surface, lists, fields |
| Floating surface | `$color.bg.layer-floating` | Dialogs, sheets, floating menus |
| Text | `$color.fg.neutral` | Primary copy |
| Muted text | `$color.fg.neutral-muted` | Metadata, secondary copy |
| Weak neutral bg | `$color.bg.neutral-weak` | Secondary buttons, chips, subtle cards |
| Critical | `$color.bg.critical-solid` | Destructive action only |
| Positive | `$color.bg.positive-solid` | Success only |
| Warning | `$color.bg.warning-solid` | Warning only |
| Informative | `$color.bg.informative-solid` | Informational state only |

Carrot is the brand color. It should appear as a crisp signal, not a blanket background.

## 4. Component Registry Rules

Seed components should be represented with this contract:

```ts
type SeedComponentContract = {
  id: string;
  package: '@seed-design/react';
  importCode: string;
  rootage?: string;
  recipe?: string;
  category: 'layout' | 'action' | 'input' | 'selection' | 'navigation' | 'overlay' | 'content' | 'feedback' | 'status';
  anatomy: string[];
  variants?: Record<string, string[]>;
  rules: string[];
  playgroundDefault?: Record<string, string>;
}
```

Rootage component specs provide slots, variants, and definitions. React components provide implementation and accessibility behavior.

## 5. Dense Component Specs

### ActionButton

- Official variants: `brandSolid`, `neutralSolid`, `neutralWeak`, `criticalSolid`, `neutralOutline`, `brandOutline`, `ghost`.
- Official sizes: `xsmall`, `small`, `medium`, `large`.
- Official layouts: `withText`, `iconOnly`.
- `brandSolid` is for the most important brand/local transaction action. Prefer one per screen.
- `neutralSolid` is a general CTA when brand emphasis is too strong.
- `neutralWeak` is the default secondary action.
- `criticalSolid` is only for destructive or irreversible actions.
- `iconOnly` requires accessible labeling.

### TextField / Field

- Use `Field` for label, description, and validation context.
- TextField input outside Field must have `aria-label` or `aria-labelledby`.
- Placeholder does not replace a label in form workflows.
- Use prefix/suffix slots for search, clear, unit, or affordance.

### BottomSheet / ActionSheet

- Use BottomSheet for mobile filters, quick forms, contextual selections, and local transaction flows.
- Use ActionSheet for short action menus.
- Use `layer-floating` and overlay dimming.
- Primary action belongs at the end of the decision path.

### Chips / Tabs / SegmentedControl

- Use ChipTabs or SegmentedControl for compact category/filter switching.
- Use ControlChip for selected/unselected controls.
- Labels should be short and concrete.

### List / Card-Like Content

- Prefer list-based compositions for local marketplace feeds.
- Include neighborhood context, time, count, price, status, or trust signal.
- Do not create empty decorative cards.

### Feedback

- Snackbar: transient non-blocking feedback.
- Dialog: blocking confirmation or irreversible decision.
- InlineBanner/Callout: persistent contextual notice.
- Skeleton/ContentPlaceholder: loading.

## 6. Playground Mapping

| Playground Group | Seed Components |
|---|---|
| Layout | Box, Flex, Stack, Inline, Grid, Columns, Layout, ResponsivePair |
| Actions | ActionButton, FieldButton, ReactionButton, Fab, ExtendedFab, FloatingActionButton |
| Input | Field, Fieldset, TextField, SelectBox, Checkbox, RadioGroup, Switch, Slider, AttachmentInput |
| Selection | Chip, ActionChip, ControlChip, ChipTabs, SegmentedControl, ToggleButton |
| Navigation | Tabs, TopNavigation, SideNavigation, NavigationMenu, MenuSheet |
| Overlay | BottomSheet, ActionSheet, ExtendedActionSheet, Dialog, SidePanel, ResponsiveSidePanel, Portal |
| Content | List, Article, Avatar, ImageFrame, LinkContent, Divider, Footer |
| Feedback | Snackbar, InlineBanner, Callout, LoadingIndicator, Skeleton, ProgressCircle |
| Status | Badge, NotificationBadge, Count, TagGroup, MannerTemp, MannerTempBadge |

## 7. Page Templates

### Local Marketplace Feed

Use for home, category, search, neighborhood listings.

Required structure:

1. Top navigation with location/search context
2. Search or category controls
3. Feed list with thumbnail, title, price/status, neighborhood, time
4. Optional floating action button
5. Snackbar/empty/loading states

### Transaction Detail

Use for product, listing, request, reservation, chat handoff.

Required structure:

1. Image or summary header
2. Title, price/status, seller/trust signal
3. Description/content sections
4. Sticky or bottom primary action
5. BottomSheet for contact, options, report, or reservation

### Local Service Form

Use for writing, posting, booking, application.

Required structure:

1. Top navigation
2. Fieldset/Form stack
3. TextField/SelectBox/AttachmentInput
4. Validation and helper text
5. Large primary ActionButton

### Community Utility Dashboard

Use for desktop/admin/community tools, not consumer marketplace feed.

Required structure:

1. SideNavigation or top navigation
2. Summary metrics with neutral surfaces
3. Lists/tables using Seed-like compact surfaces
4. Status badges and filters
5. Dialog/Snackbar feedback

## 8. AI Generation Rules

- Preserve source content exactly unless the user asks for copywriting.
- Choose a page template before drawing components.
- Use Seed components and variants by name.
- Keep carrot orange as a purposeful action/brand signal.
- Use neutral layer surfaces for most structure.
- Do not turn warning/critical/positive/informative colors into decorative accents.
- For mobile, prioritize one clear task per viewport.
- Use real local-commerce signals where applicable: neighborhood, time, price, count, manner/trust.
- If outputting HTML/CSS rather than React, still name regions with `data-seed-component` attributes.

## 9. CSS Contract For HTML Output

If generating standalone HTML/CSS, declare Seed-like semantic variables rather than arbitrary color names:

```css
:root {
  --seed-color-bg-brand-solid: #ff6600;
  --seed-color-bg-brand-weak: #fff2ec;
  --seed-color-bg-layer-basement: #f3f4f5;
  --seed-color-bg-layer-default: #ffffff;
  --seed-color-bg-layer-floating: #ffffff;
  --seed-color-fg-neutral: #1a1c20;
  --seed-color-fg-neutral-muted: #555d6d;
  --seed-color-fg-placeholder: #b0b3ba;
  --seed-color-stroke-neutral-muted: rgba(0, 0, 0, 0.10);
  --seed-radius-r2: 8px;
  --seed-radius-r3: 12px;
  --seed-radius-full: 9999px;
  --seed-space-x2: 8px;
  --seed-space-x4: 16px;
  --seed-space-x6: 24px;
  --seed-space-x8: 32px;
}
```

These CSS variables are a practical HTML bridge. For React output, prefer official `@seed-design/css/vars` and recipes.

## 10. Validation Checklist

- [ ] Source content and service identity are preserved.
- [ ] A page template was selected.
- [ ] Major regions map to Seed components or layout primitives.
- [ ] Brand color is used for one primary action or brand signal, not as decorative fill everywhere.
- [ ] Status colors are semantic only.
- [ ] TextField has Field label or accessible label.
- [ ] Icon-only actions have accessible labels.
- [ ] Mobile layout has enough bottom safe area for sticky actions.
- [ ] Lists include local/trust context where relevant.
- [ ] Generated HTML uses `--seed-*` semantic variables or React output uses official Seed imports.

## 11. Do Not

- Do not invent non-Seed variants like `primary`, `secondary`, `tertiary` for ActionButton. Use Seed variants.
- Do not use arbitrary orange shades instead of brand tokens.
- Do not use status colors as brand accents.
- Do not create large marketing hero layouts for utility/product screens.
- Do not use card-heavy empty dashboards for marketplace/mobile flows.
- Do not omit labels for fields or accessible names for icon-only controls.
- Do not mix Material, KTDS, Shadcn, or Bootstrap naming into Seed component contracts.

## 12. Source Notes

- `README.md`: package map for definitions, base libraries, React libraries, integrations, ecosystem, and docs.
- `TECH.md`: architecture and generation pipeline.
- `packages/rootage/color.yaml`: palette and semantic color token source.
- `packages/rootage/components/action-button.yaml`: component spec example with slots, variants, states, and definitions.
- `packages/react/src/components/index.ts`: React component export inventory.
