---
version: alpha
name: Aide Design System
description: "Aide default DESIGN.md. Based on Wanted Montage tokens, optimized for AI-generated HTML screens. Use Aide brand identity, Google Material Symbols, compact mobile-app rhythm, fixed top navigation, scrollable content, bottom navigation or bottom action area, content-dense sections, and strict skeleton-to-design layout fidelity."

principles:
  - "App-native, not landing-page-first: build the usable product screen immediately."
  - "Compact and content-dense: every screen must feel like a real service with enough data, states, and actions."
  - "Fixed chrome, scrollable body: top navigation stays visible; content scrolls; bottom nav/action never covers content."
  - "Blue-led hierarchy: primary blue is for CTA, active state, KPI, and selection only."
  - "Skeleton fidelity: final HTML must preserve skeleton order, block size, spacing rhythm, and CTA location."

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
    elevated: "0px 4px 6px -2px rgba(23,23,23,0.07), 0px 10px 15px -3px rgba(23,23,23,0.07)"
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
7. Preserve the skeleton layout exactly: order, spacing, large visual blocks, CTA positions.
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
  --color-page: #F7F7F8;
  --color-surface: #FFFFFF;
  --color-text: #171719;
  --color-muted: rgba(55,56,60,0.61);
  --color-border: rgba(112,115,124,0.16);
  --aide-page-padding: 16px;
  --aide-section-gap: 16px;
  --aide-card-padding: 16px;
  --aide-card-gap: 12px;
  --aide-card-radius: 16px;
  --aide-header-height: 56px;
  --aide-tabbar-height: 72px;
}
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
- If skeleton has a visual block, final design must keep a visual block in the same location.
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
- If a layout scaffold is provided, each variant still preserves its own scaffold exactly.

## Skeleton Contract

The layout scaffold is not a suggestion. It is the source of truth for structure.

- Preserve section order.
- Preserve large block sizes.
- Preserve visual block location.
- Preserve CTA location.
- Preserve approximate section/card spacing.
- Add detail by filling blocks, not by rearranging them.
- If the scaffold has a bottom tab, final screen has bottom tab.
- If the scaffold has a bottom action button, final screen has fixed action area.

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
- Skeleton structure is preserved.
- Hero image/3D appears when scaffold or strategy requires it.
- CTA is bottom-aligned within its section/card/action area.
- Minimum 4 sections and 9 UI units.
- Responsive CSS exists.

## Do Not

- Do not use Montage icon names.
- Do not use logo text instead of `aide-logo-slot`.
- Do not create a landing page unless explicitly requested.
- Do not let content be clipped behind fixed bottom chrome.
- Do not center-float buttons in the middle of image/content blocks.
- Do not make all variants the same skeleton or same layout.
- Do not create empty, decorative, low-content screens.
