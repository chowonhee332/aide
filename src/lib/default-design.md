---
version: "alpha"
name: "Clean Modern Design System"
description: "A clean, airy design system with soft blue tones and generous whitespace. Versatile across product types."
colors:
  primary: "#2563EB"
  on-primary: "#ffffff"
  primary-container: "#DBEAFE"
  on-primary-container: "#1e3a8a"
  inverse-primary: "#93C5FD"
  secondary: "#0891B2"
  on-secondary: "#ffffff"
  secondary-container: "#CFFAFE"
  on-secondary-container: "#0e7490"
  tertiary: "#7C3AED"
  on-tertiary: "#ffffff"
  tertiary-container: "#EDE9FE"
  on-tertiary-container: "#5b21b6"
  error: "#DC2626"
  on-error: "#ffffff"
  error-container: "#FEE2E2"
  on-error-container: "#991b1b"
  background: "#F0F4FF"
  on-background: "#0f172a"
  surface: "#ffffff"
  surface-dim: "#E2E8F0"
  surface-bright: "#ffffff"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#F8FAFF"
  surface-container: "#EFF6FF"
  surface-container-high: "#DBEAFE"
  surface-container-highest: "#BFDBFE"
  on-surface: "#0f172a"
  on-surface-variant: "#475569"
  inverse-surface: "#1e293b"
  inverse-on-surface: "#F1F5F9"
  outline: "#94A3B8"
  outline-variant: "#CBD5E1"
typography:
  display:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "44px"
    fontWeight: "800"
    lineHeight: "1.18"
    letterSpacing: "-0.02em"
  h1:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "32px"
    fontWeight: "700"
    lineHeight: "1.25"
    letterSpacing: "-0.01em"
  h2:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "24px"
    fontWeight: "700"
    lineHeight: "1.33"
  h3:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "20px"
    fontWeight: "600"
    lineHeight: "1.4"
  body:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "1.5"
  bodySmall:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "1.5"
  label:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "14px"
    fontWeight: "600"
    lineHeight: "1.43"
    letterSpacing: "0.01em"
  caption:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "12px"
    fontWeight: "500"
    lineHeight: "1.33"
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "12px"
  base: "16px"
  md: "24px"
  lg: "40px"
  xl: "64px"
  gutter: "16px"
  margin: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 {spacing.md}"
    height: "48px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    borderColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 {spacing.md}"
    height: "48px"
  input:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 {spacing.base}"
    height: "52px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  listItem:
    backgroundColor: "transparent"
    padding: "{spacing.sm}"
    rounded: "{rounded.md}"
  badge:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
---

# Clean Modern Design System

## Overview
A versatile, clean design system with soft sky-blue tones. The airy blue palette feels trustworthy and modern, suitable for healthcare, lifestyle, finance, and productivity apps.

## Colors
Soft blue primary (#2563EB) paired with a cyan secondary for accent. Light blue-tinted backgrounds (#F0F4FF) create gentle separation from white surface cards, producing the floating card effect without heavy shadows.

## Typography
Plus Jakarta Sans provides friendly rounded terminals with excellent legibility. Bold weights create clear hierarchy; generous line heights maintain a premium, spacious feel.

## Layout
8px grid rhythm. Generous whitespace philosophy — use lg and xl spacing between sections. Hero banners 220–300px tall with gradient backgrounds. Content cards float on top of the background.

## Elevation & Depth
White cards on a light blue-gray background create natural depth. Hero sections use soft gradients (light blue→white). Cards lift with box-shadow: 0 4px 20px rgba(37,99,235,0.08) on hover.

## Shapes
Rounded language throughout: buttons use 12px radius, cards 16px, badges fully rounded. Inputs use 8px for a modern, grounded look.

## Components
Buttons: rounded-lg (12px), 48px height, strong label weights. Cards: white on blue-tinted background. Inputs: 52px height with label above field. Badges: fully rounded, small scale with blue container.

## Do's and Don'ts
- DO: Use soft gradient backgrounds for hero sections (light blue, not white)
- DO: Float white cards over gradient hero banners for depth
- DO: Use the blue primary sparingly on key CTAs only
- DO: Place illustrated characters or %%IMG_1%% in hero areas for warmth
- DON'T: Use pure #ffffff as the page background — use #F0F4FF to separate cards from BG
- DON'T: Use more than 2 brand colors in a single component
- DON'T: Crowd elements — maintain breathing room at all times
