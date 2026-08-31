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

// 파이프라인 입력을 만드는 멀티모달 이해·추출(As-is 화면 분석, RFP/기획서 문서 추출,
// 스크린샷→DESIGN.md)만 Pro로 둔다. 여기 결과가 틀리면 생성 3안이 전부 어긋난다.
// 1-shot 저볼륨이라 Pro여도 회당 비용 영향은 작다. 생성(A/B/C HTML)은 Flash 유지.
export const GEMINI_ANALYSIS_MODEL = 'gemini-3.1-pro-preview' as const

// 이미지 생성은 전 경로 Flash 계열만 쓴다 (pro-image 미사용). 되돌릴 때는 이 상수만
// 'gemini-3-pro-image'로 바꾸면 된다. 1K·2K 출력 단가가 같아 2K를 기본 보관하고,
// 화면에는 `gemini.ts`의 결정론적 WebP 후처리 결과를 사용한다.
export const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image' as const
export const GEMINI_IMAGE_SIZE = '2K' as const
export const GEMINI_IMAGE_FALLBACK_MODEL = 'gemini-3.1-flash-image' as const
export const GEMINI_UI_IMAGE_MAX_EDGE = 1600 as const
export const GEMINI_UI_IMAGE_WEBP_QUALITY = 84 as const
export const GEMINI_ECONOMY_IMAGE_MODEL = 'gemini-3.1-flash-lite-image' as const
