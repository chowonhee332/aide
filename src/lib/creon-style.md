---
name: Creon 3D Style
version: "1.0"
description: "Aide 히어로 이미지 생성용 3D 아이콘 스타일 가이드. subject·shadows 필드는 런타임에 자동 설정되므로 여기서 수정하지 않는다."
---

# Creon 3D Style Guide

아래 JSON이 히어로 이미지 생성 프롬프트의 기본값이다.
수정하고 싶은 섹션만 바꾸면 된다.

- `subject` — AI가 브리프를 분석해 자동으로 채운다. 여기서 바꿔도 런타임에 덮어쓰인다.
- `lighting.shadows` — transparent 모드일 때 자동으로 "no shadow"로 덮어쓰인다.

```json
{
  "task": "generate isometric 3D icon",
  "style_lock": true,
  "subject": "귀여운 캐릭터",
  "guidance": {
    "aspect_ratio": "16:9",
    "instruction_strength": "strict",
    "priority_order": [
      "subject",
      "style_consistency",
      "color_palette",
      "material_spec"
    ],
    "consistency_reference": "Match Creon 3D icon sheet: smooth glossy plastic, floating subject, uniform lighting."
  },
  "output": {
    "format": "png",
    "size": "1920x1080",
    "width": 1920,
    "height": 1080,
    "background": "#FFFFFF",
    "alpha": true,
    "safety_settings": {
      "allowed_content": [
        "stylized_character"
      ],
      "disallowed_content": [
        "photographic_realism",
        "text"
      ]
    }
  },
  "render": {
    "engine": "flash-3d",
    "quality": "ultra-high",
    "resolution": 1920,
    "width": 1920,
    "height": 1080,
    "sampling": "deterministic",
    "postprocess": "clean",
    "separation": "by color/lighting/depth only"
  },
  "camera": {
    "type": "isometric",
    "lens": "orthographic",
    "tilt": "35deg",
    "pan": "35deg",
    "distance": "medium shot",
    "focus": "global sharp",
    "motion": "static"
  },
  "lighting": {
    "mode": "soft global illumination",
    "source": "dual top-front softboxes with faint rim light",
    "highlights": "broad glossy bloom, no hard speculars",
    "shadows": "soft ground shadow beneath the object",
    "exposure": "balanced, no high contrast"
  },
  "materials": {
    "primary": "smooth high-gloss plastic",
    "secondary": "matte pastel plastic",
    "accents": "translucent frosted plastic",
    "surface_detail": "no noise, no texture, no scratches"
  },
  "colors": {
    "palette_name": "Creon Blue System",
    "dominant_blue": "#2962ff",
    "secondary_blue": "#4FC3F7",
    "neutral_white": "#FFFFFF",
    "warm_accent": "#FFD45A",
    "inherent_colors": "Only if essential for the subject (low saturation pastel skin/hair). No new hues."
  },
  "form": {
    "shapes": "pillowy, inflated, soft-volume forms",
    "edges": "rounded with 85% fillet, zero sharp corners",
    "proportions": "chibi/stylized, simplified anatomy",
    "deformation": "squash-and-stretch for friendliness",
    "surface_finish": "clean, seamless"
  },
  "composition": {
    "elements": "single hero subject floating; only props essential to subject",
    "density": "minimal, generous negative space",
    "framing": "ZOOMED OUT. Subject must be small relative to canvas. 30% wide empty padding on all sides.",
    "depth": "3-layer depth stack with gentle parallax"
  },
  "background": {
    "type": "solid",
    "color": "#ffffff",
    "environment": "studio cyclorama",
    "ground_contact": "none (floating)"
  },
  "brand_tone": "vibrant, modern, friendly, premium, tech-forward",
  "system": {
    "scalable": true,
    "interchangeable": true,
    "documentation": "Follow Gemini 2.5 Flash prompt best practices; short explicit fields, clear priority."
  },
  "negative_prompt": "photographic realism, fabric texture, gritty, noise, grain, metallic reflections, subsurface scattering, wood grain, glass refraction, text, watermark, drop shadow, vignette, cinematic lighting, background gradients, extra props, multiple subjects, poorly defined limbs, messy geometry, 1024x1024 output, square aspect ratio, outline, harsh contrast, oversaturated colors",
  "safety": {
    "violence": "none",
    "adult": "none",
    "medical": "none",
    "political": "none"
  }
}
```
