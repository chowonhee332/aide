/**
 * Aide model routing policy.
 *
 * Keep expensive reasoning on the one step that directly determines visual
 * quality: the first A/B/C HTML composition. Everything that is structured,
 * corrective, or post-selection uses the economy model.
 */
// 3.7 Flash는 3.6과 같은 단가($0.75/$3.75, 2026-12-31까지)에 코딩·에이전트 벤치마크가
// 더 높다. 생성물이 HTML/CSS이므로 이 축이 바로 품질에 닿는다. 되돌릴 때는 이 상수만
// 'gemini-3.6-flash'로 바꾸면 된다.
export const GEMINI_DESIGN_MODEL = 'gemini-3.7-flash' as const
export const GEMINI_ECONOMY_MODEL = 'gemini-3.5-flash-lite' as const

// A안만 Pro로 돌려 flash 대비 품질 차이를 비교하기 위한 실험용 상수.
// Output 기준 3.7 Flash 대비 약 3.2배($3.75 → $12.00/1M) 비싸다 (ai.google.dev/gemini-api/docs/pricing 기준).
// 비교가 끝나면 StudioView.tsx의 참조를 지우고 이 상수도 함께 제거한다.
export const GEMINI_DESIGN_MODEL_PRO_EXPERIMENT = 'gemini-3.1-pro-preview' as const

// A/B/C 홈 시안의 핵심 비주얼은 동일한 Pro 조건으로 생성한다.
// 1K와 2K의 출력 단가가 같으므로 2K를 기본으로 보관하고,
// 화면에는 `gemini.ts`의 결정론적 WebP 후처리 결과를 사용한다.
export const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image' as const
export const GEMINI_IMAGE_SIZE = '2K' as const
export const GEMINI_IMAGE_FALLBACK_MODEL = 'gemini-3.1-flash-image' as const
export const GEMINI_UI_IMAGE_MAX_EDGE = 1600 as const
export const GEMINI_UI_IMAGE_WEBP_QUALITY = 84 as const
export const GEMINI_ECONOMY_IMAGE_MODEL = 'gemini-3.1-flash-lite-image' as const
