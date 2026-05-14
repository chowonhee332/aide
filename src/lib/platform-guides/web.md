# Material Design 3 — Web (Expanded) Platform Guide

> Source: Material Design 3 official specification (m3.material.io)
> Window size class: Expanded — width ≥ 840dp

---

## 1. Canonical Viewport

| Property | Value |
|----------|-------|
| Canvas width | 1440px (standard desktop) |
| Canvas height | 900px |
| Content max-width | 1200px (centered) |
| Minimum supported width | 840px |

---

## 2. Layout Grid

| Property | Value |
|----------|-------|
| Columns | 12 |
| Margin (horizontal) | 24dp |
| Gutter | 24dp |
| Column width | ~72dp (fluid within max-width) |

**Rule**: 12-column grid. Use column spans to define component widths (e.g., sidebar = 3col, main content = 9col). Never use full-width layouts without max-width constraint.

---

## 3. Navigation: Navigation Rail

Navigation Rail is the **primary navigation pattern** for expanded screens.

| Property | Value |
|----------|-------|
| Position | Fixed, left side of screen |
| Width | 80dp (collapsed/icon-only) |
| Extended width | 256dp (with labels) |
| Height | Full viewport height |
| Destinations | 3–7 |
| Icon size | 24dp |
| Active indicator | Pill shape, 56×32dp, filled with secondaryContainer |
| Label | Below icon (collapsed) or right of icon (extended) |
| Background | surfaceContainer |

**Do**: Use Navigation Rail for 3–7 primary destinations on expanded screens.
**Do**: Allow rail to extend on user action or hover to show labels.
**Don't**: Use Bottom Navigation Bar on expanded screens.
**Don't**: Use more than 7 destinations.

---

## 4. Navigation: Navigation Drawer (Alternative)

Use Navigation Drawer when more than 7 destinations or hierarchical navigation is needed.

| Variant | Width | Behavior |
|---------|-------|----------|
| Standard | 256dp | Always visible, shifts content |
| Modal | 360dp | Overlays content, dismissible |

| Property | Value |
|----------|-------|
| Border-radius (modal) | 0 16dp 16dp 0 (right side) |
| Header height | 72dp (logo/title area) |
| Section divider | 1dp, outlineVariant color |
| Item height | 56dp |
| Item border-radius | 28dp (full pill for active) |
| Horizontal padding | 12dp |

---

## 5. Top App Bar (Web)

Top App Bar is **optional** on expanded screens. Often replaced by Navigation Rail header.
When used:

| Property | Value |
|----------|-------|
| Height | 64dp |
| Position | Fixed top |
| Left section | Logo (32dp) + App name (titleLarge, 22sp) |
| Right section | Search, avatar, action icons |
| Background | surface or surfaceContainer |
| Divider on scroll | 1dp bottom border, outlineVariant |

---

## 6. Mouse & Pointer Targets

| Element | Minimum target | Visual size |
|---------|---------------|-------------|
| Buttons | 40px height | 40px |
| Icon buttons | 40×40px | 40×40px |
| Menu items | 48px height | 48px |
| List items | 52px height | 52px |
| Navigation items | 56px height | 56px |
| Checkboxes/Radio | 20×20px visual + 8px padding | 36×36px touch |

**Note**: Web targets are smaller than mobile (40px vs 48dp) because mouse precision is higher.

---

## 7. Hover & Focus States (Required for Web)

Every interactive element **must** have visible hover and focus states:

| State | Treatment |
|-------|-----------|
| Hover | 8% primary/on-surface overlay (stateLayer) |
| Focus | 12% primary overlay + 3dp focus ring (outlineVariant) |
| Pressed | 12% primary/on-surface overlay |
| Dragged | 16% overlay + elevation increase |

**Implementation**:
```css
.interactive:hover { background: rgba(var(--color-primary-rgb), 0.08); }
.interactive:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
```

---

## 8. Component Specifications

### Buttons
| Type | Height | Border-radius | Horizontal padding |
|------|--------|---------------|-------------------|
| Filled | 40dp | 20dp (full pill) | 24dp |
| Outlined | 40dp | 20dp | 24dp |
| Text | 40dp | 20dp | 12dp |
| Elevated | 40dp | 20dp | 24dp |
| Tonal | 40dp | 20dp | 24dp |
| FAB (standard) | 56dp | 16dp | — |
| Extended FAB | 56dp | 16dp | 20dp left, 24dp right |

### Cards
| Property | Value |
|----------|-------|
| Border-radius | 12dp |
| Elevation (elevated) | 1dp |
| Padding | 16dp |
| Hover elevation | 2dp |

### Data Tables
| Property | Value |
|----------|-------|
| Header row height | 56dp |
| Row height | 52dp |
| Horizontal cell padding | 16dp |
| Column divider | 1dp, outlineVariant (optional) |
| Checkbox column width | 72dp |
| Sorted column indicator | Arrow icon 18dp |

### Menus & Dropdowns
| Property | Value |
|----------|-------|
| Border-radius | 4dp |
| Min-width | 112dp |
| Max-width | 280dp |
| Item height | 48dp |
| Horizontal padding | 12dp |
| Elevation | 3dp |

### Dialogs
| Property | Value |
|----------|-------|
| Min-width | 280dp |
| Max-width | 560dp |
| Border-radius | 28dp |
| Padding | 24dp |
| Title (headlineSmall) | 24sp |
| Scrim opacity | 32% black |

### Text Fields
| Variant | Height | Border-radius |
|---------|--------|---------------|
| Filled | 56dp | 4dp top, 0 bottom |
| Outlined | 56dp | 4dp all |

Dense variant (web-only): 48dp height.

### Chips
| Property | Value |
|----------|-------|
| Height | 32dp |
| Border-radius | 8dp |
| Horizontal padding | 16dp |
| Icon size | 18dp |

---

## 9. Spacing Scale

| Token | Value | Common use |
|-------|-------|-----------|
| extraSmall | 4dp | Icon-label gap |
| small | 8dp | Component internal gap |
| medium | 16dp | Card padding |
| large | 24dp | Section padding, grid gutter |
| extraLarge | 32dp | Section gap |
| extraExtraLarge | 48dp | Page-level section gap |

---

## 10. Typography Scale (MD3)

| Role | Size | Weight | Line height |
|------|------|--------|-------------|
| displayLarge | 57sp | Regular (400) | 64dp |
| displayMedium | 45sp | Regular | 52dp |
| displaySmall | 36sp | Regular | 44dp |
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

Web note: 1dp ≈ 1px at 1x display density.

---

## 11. Elevation & Shadow

| Level | dp | CSS |
|-------|----|-----|
| 0 | 0 | none |
| 1 | 1 | 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15) |
| 2 | 3 | 0 1px 2px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.15) |
| 3 | 6 | 0 4px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15) |
| 4 | 8 | 0 6px 10px rgba(0,0,0,0.3), 0 2px 3px rgba(0,0,0,0.15) |
| 5 | 12 | 0 8px 12px rgba(0,0,0,0.3), 0 4px 4px rgba(0,0,0,0.15) |

---

## 12. Canonical Layout Patterns (Expanded)

### List-Detail (Two-panel)
```
[Nav Rail 80px] | [List 360px] | [Detail — remaining width]
```
- List panel: min 240dp, max 400dp
- Detail panel: fills remaining space
- No modal navigation for detail — always in-place

### Feed + Supporting Panel
```
[Nav Rail 80px] | [Feed — flex 1] | [Supporting panel 320–400px]
```
- Supporting panel: filters, related content, ads
- Can collapse to icon-only on medium

### Single-panel (Centered)
```
[Nav Rail 80px] | [Content max-width 800px centered]
```
- Forms, article reading, settings

### Dashboard (Multi-panel)
```
[Nav Rail 80px] | [12-column grid with cards]
```
- Cards: 4-col (stats), 8-col (charts), 12-col (tables)
- Consistent 24px gutters

---

## 13. Responsive Behavior

| Breakpoint | Width | Layout change |
|------------|-------|---------------|
| Compact | < 600px | Bottom Nav, 4-col grid |
| Medium | 600–839px | Nav Rail (collapsed), 8-col grid |
| Expanded | ≥ 840px | Nav Rail/Drawer, 12-col grid |

For this guide (Expanded), assume ≥840px. Target 1440px.

---

## 14. Implementation Checklist

- [ ] Canvas: 1440px wide, content max-width 1200px centered
- [ ] Grid: 12 columns, 24px margins and gutters
- [ ] Navigation Rail: fixed left, 80px wide
- [ ] Top bar: optional, 64px if used
- [ ] Hover states on all interactive elements
- [ ] Focus-visible outlines for keyboard navigation
- [ ] Mouse targets ≥ 40×40px
- [ ] No bottom navigation bar
- [ ] Multi-panel layout where appropriate
- [ ] Dense information density (more content per viewport)
- [ ] Keyboard shortcut support optional but valued
