# UI Generation Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve generated UI quality so A/B/C variants have distinct design strategies, better 3D/image integration, and fewer unusable layouts.

**Architecture:** Keep the existing Gemini pipeline, but strengthen the art-direction and quality-rule prompt layers in `src/lib/gemini.ts`. Avoid adding a slow QA loop; use stronger upfront planning and static instruction constraints.

**Tech Stack:** Next.js, TypeScript, Gemini API, Unsplash placeholders.

---

### Task 1: Design Direction Selector

**Files:**
- Modify: `src/lib/gemini.ts`

- [ ] Add a reusable design direction selector prompt layer.
- [ ] Make A/B/C choose from a flexible strategy pool instead of fixed templates.
- [ ] Require layout skeleton, hero strategy, CTA placement, and visual media role to differ across variants.

### Task 2: 3D/Image Integration Guardrails

**Files:**
- Modify: `src/lib/gemini.ts`

- [ ] Strengthen 3D placement rules so generated images cannot overlap CTA, tabs, cards, or core text.
- [ ] Add explicit safe-area, container, and min-height rules for immersive hero scenes.
- [ ] Clarify Gemini vs Unsplash roles in prompt instructions.

### Task 3: Tweak Scenario Semantics

**Files:**
- Modify: `src/lib/gemini.ts`

- [ ] Improve tweak analysis instructions so scenario changes affect empty/progress/complete states, not only text values.
- [ ] Require scenario specs to include visual state, CTA state, mission state, and reward state.

### Task 4: Verification

**Files:**
- Verify: `src/lib/gemini.ts`

- [ ] Run `npx tsc --noEmit`.
- [ ] Keep existing server open on port 3001.
