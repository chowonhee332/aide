# Material Design 3 — Mobile (Compact) Platform Guide

> Source: Material Design 3 official specification (m3.material.io)
> Window size class: Compact — width < 600dp

---

## 1. Canonical Viewport

| Property | Value |
|----------|-------|
| Canvas width | 390px (iPhone 14 standard) |
| Canvas height | 844px |
| Content max-width | 100% |

---

## 2. Layout Grid

| Property | Value |
|----------|-------|
| Columns | 4 |
| Margin (horizontal) | 16dp |
| Gutter | 16dp |
| Column width | ~82dp (fluid) |

**Rule**: Use 4-column grid. Cards/content span 2–4 columns. Never use fixed desktop-width containers.

---

## 3. Navigation: Navigation Bar (Bottom)

Bottom Navigation Bar is the **primary navigation pattern** for compact screens.

| Property | Value |
|----------|-------|
| Position | Fixed, bottom of screen |
| Height | 80dp (including icon + label + indicator) |
| Destinations | 3–5 (required) |
| Icon size | 24dp |
| Active indicator | Pill shape, 64×32dp, filled with secondaryContainer color |
| Label | Always visible below icon, 12sp |
| Background | surfaceContainer, elevation tonal |

**Safe area**: Add `padding-bottom: env(safe-area-inset-bottom)` below nav bar for iOS home indicator.

**Do**: Use for primary destinations. Show label always.
**Don't**: Use more than 5 destinations. Do not hide on scroll for primary nav.

---

## 4. Top App Bar

| Variant | Height | Use case |
|---------|--------|----------|
| Small | 64dp | Default — title left or center, 1–2 action icons |
| Medium | 112dp | Section headers, collapsible |
| Large | 152dp | Page titles, hero sections |

| Property | Value |
|----------|-------|
| Leading icon (back/menu) | 24dp, 48dp touch target |
| Title typography | titleLarge (22sp, Regular) for Small bar |
| Trailing icons (actions) | Up to 3, 24dp icon, 48dp touch target |
| Scroll behavior | Compress Medium/Large → Small on scroll |
| Background | surface, tonal elevation on scroll |

---

## 5. Touch Targets

| Element | Minimum touch target |
|---------|---------------------|
| All interactive elements | **48×48dp** |
| Icon buttons | 48×48dp container |
| List items | 56dp height minimum |
| Navigation icons | 48×48dp |
| FAB | 56×56dp |

**Critical**: Every tappable element must be ≥48×48dp. Use padding to expand hit area without changing visual size.

---

## 6. Component Specifications

### Buttons
| Type | Height | Border-radius | Horizontal padding |
|------|--------|---------------|-------------------|
| Filled | 40dp | 20dp (full pill) | 24dp |
| Outlined | 40dp | 20dp | 24dp |
| Text | 40dp | 20dp | 12dp |
| Elevated | 40dp | 20dp | 24dp |
| FAB (standard) | 56dp | 16dp | — |
| FAB (large) | 96dp | 28dp | — |

### Cards
| Property | Value |
|----------|-------|
| Border-radius | 12dp |
| Elevation (elevated) | 1dp |
| Padding | 16dp |
| Margin between cards | 8–16dp |

### List Items
| Lines | Height |
|-------|--------|
| 1-line | 56dp |
| 2-line | 72dp |
| 3-line | 88dp |

Leading/trailing content aligned to 16dp horizontal margin.

### Dialogs & Bottom Sheets
| Component | Value |
|-----------|-------|
| Dialog min-width | 280dp |
| Dialog max-width | 560dp |
| Dialog border-radius | 28dp |
| Bottom sheet border-radius | 28dp 28dp 0 0 |
| Bottom sheet handle | 4×32dp, centered, 8dp from top |

### Text Fields
| Variant | Height | Border-radius |
|---------|--------|---------------|
| Filled | 56dp | 4dp top, 0 bottom |
| Outlined | 56dp | 4dp all |

### Chips
| Property | Value |
|----------|-------|
| Height | 32dp |
| Border-radius | 8dp |
| Horizontal padding | 16dp |
| Icon size | 18dp |

---

## 7. Spacing Scale

| Token | Value | Common use |
|-------|-------|-----------|
| extraSmall | 4dp | Icon-label gap |
| small | 8dp | Component internal gap |
| medium | 16dp | Section padding, card gap |
| large | 24dp | Section gap |
| extraLarge | 32dp | Hero section padding |

---

## 8. Typography Scale (MD3)

| Role | Size | Weight | Line height |
|------|------|--------|-------------|
| displayLarge | 57sp | Regular (400) | 64dp |
| displayMedium | 45sp | Regular | 52dp |
| headlineLarge | 32sp | Regular | 40dp |
| headlineMedium | 28sp | Regular | 36dp |
| headlineSmall | 24sp | Regular | 32dp |
| titleLarge | 22sp | Regular | 28dp |
| titleMedium | 16sp | Medium (500) | 24dp |
| titleSmall | 14sp | Medium | 20dp |
| bodyLarge | 16sp | Regular | 24dp |
| bodyMedium | 14sp | Regular | 20dp |
| bodySmall | 12sp | Regular | 16dp |
| labelLarge | 14sp | Medium | 20dp |
| labelMedium | 12sp | Medium | 16dp |
| labelSmall | 11sp | Medium | 16dp |

---

## 9. Elevation & Shadow

| Level | dp | CSS equivalent |
|-------|----|---------------|
| 0 | 0 | none |
| 1 | 1 | 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15) |
| 2 | 3 | 0 1px 2px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.15) |
| 3 | 6 | 0 4px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15) |
| 4 | 8 | 0 6px 10px rgba(0,0,0,0.3), 0 2px 3px rgba(0,0,0,0.15) |
| 5 | 12 | 0 8px 12px rgba(0,0,0,0.3), 0 4px 4px rgba(0,0,0,0.15) |

MD3 prefers **tonal elevation** (surface + primary color overlay) over shadow elevation.

---

## 10. Canonical Layout Patterns (Compact)

### Single-panel (default)
Full-width content. User navigates linearly between screens.

### List → Detail
- List screen (full width) → Detail screen (full width, pushed)
- Use shared element transition

### Feed
- Vertical scroll, full-width cards or 2-column grid
- Infinite scroll or pagination

### Supporting Panel
- Bottom sheet for supplementary content
- Never split screen on compact

---

## 11. Motion & Animation

| Property | Duration | Easing |
|----------|----------|--------|
| Short (icon change) | 100ms | Emphasized decelerate |
| Medium (card expand) | 300ms | Emphasized |
| Long (screen transition) | 450ms | Emphasized |
| Extra long (complex) | 700ms | Emphasized |

Screen transitions: slide from right (forward), slide to right (back).

---

## 12. Implementation Checklist

- [ ] Canvas: 390px wide
- [ ] Grid: 4 columns, 16px margins
- [ ] Navigation Bar: fixed bottom, 80px height
- [ ] Top App Bar: 64px height
- [ ] All touch targets ≥ 48×48px
- [ ] Buttons: 40px height, 20px border-radius
- [ ] Cards: 12px border-radius
- [ ] No hover-only interactions (touch-first)
- [ ] Scroll areas use `-webkit-overflow-scrolling: touch`
- [ ] Safe area insets applied (env(safe-area-inset-*))
