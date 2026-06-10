import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { type AppDomain, DOMAIN_KEY_TO_LABEL, DOMAIN_HOME_EMPHASIS_OPTIONS, DOMAIN_PRIMARY_JOURNEY_OPTIONS, DOMAIN_FIRST_SCREEN_FOCUS_OPTIONS } from './domain-constants';
import { getDomainGuidance } from './variant-refs';
export type { AppDomain } from './domain-constants';
export { DOMAIN_KEY_TO_LABEL, DOMAIN_LABEL_TO_KEY, DOMAIN_HOME_EMPHASIS_OPTIONS, DOMAIN_PRIMARY_JOURNEY_OPTIONS, DOMAIN_FIRST_SCREEN_FOCUS_OPTIONS } from './domain-constants';

function getAi(apiKey?: string) {
  return new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! })
}

// 전역 동시성 세마포어 — Gemini API 동시 호출 상한 3
class Semaphore {
  private queue: Array<() => void> = []
  private running = 0
  constructor(private max: number) {}
  acquire(): Promise<void> {
    if (this.running < this.max) { this.running++; return Promise.resolve() }
    return new Promise(resolve => this.queue.push(resolve))
  }
  release(): void {
    this.running--
    const next = this.queue.shift()
    if (next) { this.running++; next() }
  }
}
const geminiSemaphore = new Semaphore(3)

async function withRetry<T>(fn: () => Promise<T>, label = 'gemini', maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const retryable = /429|RESOURCE_EXHAUSTED|503|overloaded|quota/i.test(msg)
      if (!retryable || attempt === maxRetries) throw err
      const wait = Math.min(1500 * 2 ** attempt + Math.random() * 800, 25000)
      console.warn(`[gemini] ${label} retry ${attempt + 1}/${maxRetries} in ${Math.round(wait)}ms — ${msg.slice(0, 80)}`)
      await new Promise(r => setTimeout(r, wait))
    }
  }
  throw new Error('max retries exceeded')
}

// Korean stopwords + generic adjectives to skip — picks the most meaningful content noun
const KEYWORD_STOPWORDS = new Set([
  '음식', '사진', '이미지', '그림', '배경', '스타일', '모습', '장면',
  'photo', 'image', 'picture', 'background', 'style', 'view', 'scene',
  'classic', 'fresh', 'delicious', 'tasty', 'beautiful', 'modern', 'simple',
])

function extractImageKeyword(desc: string): string {
  const words = desc.split(/[\s,]+/).filter(w => w.length > 1)
  // prefer Korean nouns (contains Hangul) longer than 1 char
  const korean = words.find(w => /[가-힣]/.test(w) && !KEYWORD_STOPWORDS.has(w))
  if (korean) return korean.toLowerCase()
  // fallback: longest English word not in stopwords
  const english = words
    .filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 3 && !KEYWORD_STOPWORDS.has(w.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0]
  return (english ?? words[0] ?? 'product').toLowerCase()
}

const CURATED_UNSPLASH_PHOTOS: Array<{ keys: string[]; id: string }> = [
  { keys: ['sandwich', 'toast', 'club', '샌드위치', '토스트'], id: 'photo-1528735602780-2552fd46c7af' },
  { keys: ['salad', 'greens', 'healthy', '샐러드', '건강식'], id: 'photo-1512621776951-a57141f2eefd' },
  { keys: ['coffee', 'cafe', 'latte', '커피', '카페'], id: 'photo-1509042239860-f550ce710b93' },
  { keys: ['burger', 'hamburger', '버거', '햄버거'], id: 'photo-1568901346375-23c9450c58cd' },
  { keys: ['pizza', '피자'], id: 'photo-1513104890138-7c749659a591' },
  { keys: ['sushi', '초밥', '스시'], id: 'photo-1579871494447-9811cf80d66c' },
  { keys: ['pet', 'dog', 'cat', 'animal', 'vet', 'veterinary', '동물', '강아지', '고양이', '동물병원'], id: 'photo-1583511655826-05700442b31b' },
  { keys: ['hospital', 'clinic', 'doctor', 'health', 'medical', '병원', '진료', '건강', '의료'], id: 'photo-1505751172876-fa1923c5c528' },
  { keys: ['finance', 'bank', 'stock', 'chart', '금융', '투자', '증권'], id: 'photo-1554224155-6726b3ff858f' },
  { keys: ['dashboard', 'office', 'business', 'saas', '업무', '대시보드', '오피스'], id: 'photo-1497366754035-f200968a6e72' },
  { keys: ['travel', 'hotel', 'trip', '여행', '숙박', '호텔'], id: 'photo-1507525428034-b723cf961d3e' },
  { keys: ['education', 'study', 'class', 'school', '교육', '학습', '학교'], id: 'photo-1503676260728-1c00da094a0b' },
]

const UNSPLASH_KEYWORD_ALIASES: Array<{ keys: string[]; query: string }> = [
  { keys: ['동물병원', '반려동물', '강아지', '고양이', '펫', 'pet', 'vet'], query: 'veterinary clinic pet care' },
  { keys: ['병원', '의료', '건강', '진료', 'clinic', 'doctor', 'medical'], query: 'modern health clinic' },
  { keys: ['샌드위치', '토스트', '샐러드', '점심', '배달', '음식', 'sandwich', 'salad', 'delivery'], query: 'fresh sandwich lunch' },
  { keys: ['버거', '햄버거', 'burger'], query: 'gourmet burger' },
  { keys: ['커피', '카페', 'coffee', 'cafe'], query: 'coffee cafe table' },
  { keys: ['피자', 'pizza'], query: 'fresh pizza' },
  { keys: ['금융', '투자', '증권', 'finance', 'bank'], query: 'finance dashboard office' },
  { keys: ['대시보드', '업무', '관리자', 'saas', 'dashboard'], query: 'business dashboard office' },
  { keys: ['여행', '숙박', '호텔', 'travel', 'hotel'], query: 'hotel travel destination' },
  { keys: ['교육', '학습', '학교', 'education', 'study'], query: 'online learning study' },
]

function normalizeUnsplashKeyword(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/-]/gu, ' ')
    .replace(/\b(오늘|추천|인기|베스트|best|new|hot|card|thumbnail|image|photo|service|screen|app|ui)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const alias = UNSPLASH_KEYWORD_ALIASES.find(item =>
    item.keys.some(key => normalized.includes(key.toLowerCase()))
  )
  if (alias) return alias.query

  const keyword = extractImageKeyword(normalized || input)
  if (/^[가-힣]+$/.test(keyword)) return 'lifestyle product'
  return keyword || 'lifestyle product'
}

function buildCuratedUnsplashUrl(keyword: string, width: number, height: number): string {
  const normalized = normalizeUnsplashKeyword(keyword)
  const match = CURATED_UNSPLASH_PHOTOS.find(photo =>
    photo.keys.some(key => normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized))
  )
  const id = match?.id ?? 'photo-1546069901-ba9599a7e63c'
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=82`
}

async function fetchUnsplashUrl(keyword: string, width: number, height: number, accessKeyOverride?: string): Promise<string | null> {
  const accessKey = accessKeyOverride || process.env.UNSPLASH_ACCESS_KEY
  const searchKeyword = normalizeUnsplashKeyword(keyword)
  const fallbackUrl = buildCuratedUnsplashUrl(searchKeyword, width, height)
  if (!accessKey) return fallbackUrl
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(searchKeyword)}&orientation=landscape&client_id=${accessKey}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return fallbackUrl
    const data = await res.json()
    const base = data?.urls?.regular ?? data?.urls?.small
    if (!base) return fallbackUrl
    return `${base}&w=${width}&h=${height}&fit=crop&auto=format`
  } catch {
    return fallbackUrl
  }
}

async function generatePro(prompt: string, apiKey?: string, model = 'gemini-3.5-flash', onChunk?: (accumulated: string) => void): Promise<string> {
  const ai = getAi(apiKey)
  console.log('[gemini] generatePro start, model=', model, 'prompt length=', prompt.length)
  await geminiSemaphore.acquire()
  try {
    return await withRetry(async () => {
      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: { temperature: 1, maxOutputTokens: 32768, httpOptions: { timeout: 300_000 } },
      })
      let text = ''; let chunkCount = 0
      for await (const chunk of stream) {
        text += chunk.text ?? ''
        chunkCount++
        if (onChunk && chunkCount % 8 === 0) onChunk(text)
      }
      if (onChunk) onChunk(text)
      console.log('[gemini] generatePro done, chunks=', chunkCount, 'output length=', text.length)
      return text
    }, `generatePro/${model}`)
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown'
    const message = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error ? (err as NodeJS.ErrnoException).cause : undefined
    console.error('[gemini] generatePro error:', { name, message, cause })
    throw err
  } finally {
    geminiSemaphore.release()
  }
}

async function generateProWithImage(prompt: string, imageBase64: string, mimeType: string, apiKey?: string, model = 'gemini-3.5-flash', onChunk?: (accumulated: string) => void): Promise<string> {
  const ai = getAi(apiKey)
  console.log('[gemini] generateProWithImage start, model=', model, 'prompt length=', prompt.length)
  await geminiSemaphore.acquire()
  try {
    return await withRetry(async () => {
      const stream = await ai.models.generateContentStream({
        model,
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }] }],
        config: { temperature: 1, maxOutputTokens: 32768, httpOptions: { timeout: 300_000 } },
      })
      let text = ''; let chunkCount = 0
      for await (const chunk of stream) {
        text += chunk.text ?? ''
        chunkCount++
        if (onChunk && chunkCount % 8 === 0) onChunk(text)
      }
      if (onChunk) onChunk(text)
      console.log('[gemini] generateProWithImage done, chunks=', chunkCount, 'output length=', text.length)
      return text
    }, `generateProWithImage/${model}`)
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown'
    const message = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error ? (err as NodeJS.ErrnoException).cause : undefined
    console.error('[gemini] generateProWithImage error:', { name, message, cause })
    throw err
  } finally {
    geminiSemaphore.release()
  }
}

async function generateProWithMultipleImages(prompt: string, images: Array<{ data: string; mimeType: string }>, apiKey?: string, model = 'gemini-3.5-flash', onChunk?: (accumulated: string) => void): Promise<string> {
  const ai = getAi(apiKey)
  const imageParts = images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
  await geminiSemaphore.acquire()
  try {
    return await withRetry(async () => {
      const stream = await ai.models.generateContentStream({
        model,
        contents: [{ role: 'user', parts: [...imageParts, { text: prompt }] }],
        config: { temperature: 1, maxOutputTokens: 32768, httpOptions: { timeout: 300_000 } },
      })
      let text = ''; let chunkCount = 0
      for await (const chunk of stream) {
        text += chunk.text ?? ''
        chunkCount++
        if (onChunk && chunkCount % 8 === 0) onChunk(text)
      }
      if (onChunk) onChunk(text)
      return text
    }, `generateProWithMultipleImages/${model}`)
  } finally {
    geminiSemaphore.release()
  }
}

export interface UrlSourceData {
  cssVariables: string
  fontFamilies: string
  htmlClasses: string
  computedStyles: string
  componentStructure?: string
}

export async function analyzeUrlToDesignMd(
  screenshotBase64: string,
  url: string,
  sourceData?: UrlSourceData,
  apiKey?: string,
  captureStatus?: 'full' | 'partial' | 'blocked',
): Promise<string> {
  const sourceSection = sourceData
    ? `\n\n## Extracted Source Code Data\n\nUse this raw source data as the PRIMARY source of truth for tokens — these are actual computed values from the browser, not visual estimates.\n\n### Computed Element Styles (MOST ACCURATE — use these for color/typography tokens)\n\`\`\`\n${sourceData.computedStyles || '(none found)'}\n\`\`\`\n\n### Component Structure Samples (MOST USEFUL — use these for component rules)\n\`\`\`\n${sourceData.componentStructure || '(none found)'}\n\`\`\`\n\n### CSS Custom Properties (Design Tokens)\n\`\`\`\n${sourceData.cssVariables || '(none found)'}\n\`\`\`\n\n### Font Family Declarations\n\`\`\`\n${sourceData.fontFamilies || '(none found)'}\n\`\`\`\n\n### HTML Class Patterns (Tailwind / CSS modules)\n\`\`\`\n${sourceData.htmlClasses || '(none found)'}\n\`\`\`\n`
    : ''

  const accessNote = captureStatus === 'blocked'
    ? `\n\n⚠️ SECURITY BLOCK DETECTED: This site blocked automated access (Cloudflare / 403 / bot protection). The screenshot may show an error or security page, NOT the real site design. You CANNOT see the actual product UI.\n\nFallback strategy — apply ALL of the following:\n1. Extract any brand/logo colors visible in the screenshot (even from a partial logo or favicon). Use those as primary/secondary.\n2. Infer the industry from the URL domain name (e.g., ".bank" → finance; "shop" → commerce).\n3. Build a clean, professional generic design system appropriate for that industry.\n4. Use system fonts (Pretendard, Noto Sans KR, or Inter) as the typography fallback.\n5. In the DESIGN.md description field, explicitly note: "보안 차단으로 인해 실제 사이트 디자인을 확인할 수 없어 로고 색상 추출 + 범용 디자인시스템으로 생성됨".\n`
    : captureStatus === 'partial'
    ? `\n\n⚠️ LIMITED SOURCE ACCESS: CSS extraction was restricted (cross-origin or dynamic rendering). Rely primarily on the screenshot for visual color/font analysis.\n`
    : ''

  const prompt = `You are a senior design system auditor. Analyze the provided screenshot of "${url}" AND the extracted source code data below to produce an accurate, portable DESIGN.md file that can be used to regenerate UI in the same visual language.${accessNote}${sourceSection}

Output ONLY the raw DESIGN.md content — no explanations, no code fences, no markdown wrappers. Start directly with the YAML frontmatter.

Follow this DESIGN.md schema exactly. This is a neutral Aide DESIGN.md format, not a Google/Material spec:

---
version: "alpha"
name: "[Site Name] Design System"
description: "[Brief description based on the visual style]"
colors:
  primary: "#hex"
  onPrimary: "#hex"
  secondary: "#hex"
  onSecondary: "#hex"
  background: "#hex"
  surface: "#hex"
  onBackground: "#hex"
  onSurface: "#hex"
  error: "#hex"
  onError: "#hex"
  [additional semantic colors as needed]
typography:
  headline-xl: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "800", lineHeight: "1.1", letterSpacing: "-0.02em" }
  headline-lg: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "700", lineHeight: "1.2", letterSpacing: "-0.01em" }
  headline-md: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "700", lineHeight: "1.25" }
  headline-sm: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "600", lineHeight: "1.3" }
  body-lg: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "400", lineHeight: "1.6" }
  body-md: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "400", lineHeight: "1.5" }
  body-sm: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "400", lineHeight: "1.5" }
  label-lg: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "600", lineHeight: "1.43" }
  label-md: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "600", lineHeight: "1.43" }
  caption-sm: { fontFamily: "[detected font]", fontSize: "Xpx", fontWeight: "500", lineHeight: "1.33" }
rounded:
  none: "0px"
  sm: "Xpx"
  md: "Xpx"
  lg: "Xpx"
  xl: "Xpx"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "12px"
  base: "16px"
  md: "24px"
  lg: "40px"
  xl: "64px"
  gutter: "Xpx"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: "0 {spacing.md}"
    height: "48px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    borderColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: "0 {spacing.md}"
    height: "48px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.outline}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "0 {spacing.base}"
    height: "[detected height token or observed px]"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
    border: "[detected border if used]"
    shadow: "[detected shadow if used]"
---

# [Site Name] Design System

## Overview
[2-3 sentences describing the visual identity and design philosophy you observed]

## Colors
[Describe the color palette usage — primary actions, backgrounds, text hierarchy]

## Typography
[Describe font choices and text hierarchy you observed]

## Layout
[Describe grid, spacing patterns, and layout structure]

## Elevation & Depth
[Describe shadows, overlays, card elevations]

## Shapes
[Describe border radius patterns — pill buttons? rounded cards? sharp edges?]

## Components
[Describe key UI components visible: buttons, cards, inputs, navigation]

## Do's and Don'ts
- DO: [key design principle from what you observed]
- DO: [another principle]
- DON'T: [something to avoid]
- DON'T: [another thing to avoid]

Rules for analysis:
- Source data beats screenshot estimation. If CSS custom properties or computed styles are provided, extract exact token values from them first.
- If screenshot and CSS disagree, prefer computed styles for colors, typography, border radius, shadow, and component dimensions.
- Use ONLY hex colors in the YAML colors section. Convert rgb/rgba to the nearest opaque hex for base colors; preserve opacity/shadow values as strings only inside shadows/components.
- Detect and document the real navigation pattern: top GNB, side LNB, bottom nav, tabs, breadcrumbs, filters, or mixed layout.
- Detect real component anatomy: button height/radius/fill/border, input height/radius/border, card border/shadow/radius/padding, chips/tabs/badges.
- Do NOT invent Material Design, MD3, Carbon, iOS, Tailwind, or any named system unless the source explicitly uses it.
- Do NOT add md3:true, md3Base:true, --md-sys-* tokens, Roboto, or Material component rules unless they are explicitly visible in the source.
- If an icon system is visible, name it generically from the source (e.g. "site icon set", "inline SVG icons"). Do not default to Material Symbols.
- If Tailwind classes are present (e.g. bg-blue-500, rounded-lg, text-sm), infer the design scale from them but output semantic DESIGN.md tokens.
- Capture uncertainty in the prose sections, not by inserting vague token values. Avoid placeholders like "[detected]" in final output; choose the best observed value.
- Be specific and implementation-ready — this DESIGN.md will be used directly to generate UI.`;

  return generateProWithImage(prompt, screenshotBase64, 'image/png', apiKey, 'gemini-3.5-flash');
}


export interface Question {
  id: string;
  question: string;
  description?: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  hasOther?: boolean;
  hasDecideForMe?: boolean;
  hasExplore?: boolean;
}

export interface HeroImageDecision {
  generate: boolean;
  reason: string;
  prompt: string;
  heroSubject?: string;
}

export interface PlatformRecommendation {
  platform: PlatformType;
  reason: string;
}

export interface ServiceSubScreen {
  id: string;
  label: string;
  purpose: string;
}

export interface ServiceAnalysis {
  /** 서비스의 핵심 도메인 객체 (예: 계좌, 거래, 포트폴리오) */
  coreObjects: string[];
  /** 첫 화면에 실제로 보여야 할 데이터 항목 (예: 총 자산, 수익률, 거래내역) */
  keyDataPoints: string[];
  /** 탭/메뉴 기반 정보 구조 — 각 화면의 id/label/목적 */
  informationArchitecture: ServiceSubScreen[];
  /** AI가 추론한 핵심 사용 흐름 (상태 → 행동 → 결과) */
  primaryJourney: string;
  /** 정규식 서브타입 매칭 실패 시 사용할 서비스 성격 힌트 (kebab-case 권장) */
  serviceSubtypeHint: string;
  /** 히어로 비주얼 소재 — AI가 서비스를 보고 정한 영어 명사구 (정규식 매핑 대신 사용) */
  heroVisualSubject: string;
  /** 이 서비스에 어울리는 히어로 비주얼 종류: '3d-object'|'photo'|'data' */
  heroVisualType: '3d-object' | 'photo' | 'data';
  /** 이 서비스에 맞는 실제 콘텐츠 시드 — AI 생성 (정규식 더미 템플릿 대신 사용) */
  contentSeed?: {
    kpis: Array<{ label: string; value: string; meta: string }>;
    quickActions: string[];
    listItems: Array<{ title: string; meta: string; value: string; badge?: string }>;
    activityItems: Array<{ title: string; meta: string; value: string }>;
  };
}

export interface QuestionnaireResponse {
  questions: Question[];
  projectSummary: string;
  heroImageDecision?: HeroImageDecision;
  domain?: AppDomain;
  recommendedPlatform?: PlatformRecommendation;
  serviceAnalysis?: ServiceAnalysis;
}

export type PlatformType = 'mobile' | 'web';

function loadPlatformGuide(platform: PlatformType): string {
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'platform-guides', `${platform}.md`);
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function loadDefaultDesignMd(): string {
  const candidates = [
    path.join(process.cwd(), 'src', 'lib', 'design-systems', 'aide.md'),
    path.join(process.cwd(), 'src', 'lib', 'default-design.md'),
  ]
  for (const filePath of candidates) {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch { /* try next */ }
  }
  return ''
}

export interface VariantDescription {
  strategy: string;
  intent: string;
  layoutThesis: string;
}

export type VariantVisualPolicy = 'no-image' | 'scene-3d' | 'creon-object-3d' | 'real-photo' | 'scene-3d-card-cover';

export interface GenerateParams {
  designMd: string;
  brief: string;
  answers: Record<string, string | string[]>;
  projectSummary: string;
  logoDataUrl?: string;
  brandColors?: string[];
  mainOnly?: boolean;
  variantStyle?: string;
  referenceImageBase64?: string;
  referenceImageKind?: 'wireframe' | 'reference';
  asIsAnalysis?: AsIsPageAnalysis;
  platform?: PlatformType;
  modelId?: string;
  heroImagePrompt?: string;
  heroSubject?: string;
  sharedVisualMode?: '3d' | 'photo' | 'none';
  sharedVisualSubject?: string;
  visualPolicy?: VariantVisualPolicy;
  generationPlan?: AideGenerationPlan;
  layoutBlueprint?: LayoutBlueprint;
  domain?: AppDomain;
  criticalReview?: boolean;
  qualityMode?: 'draft' | 'full';
  precomputedDesignIntentPlan?: string;
  onStep?: (label: string) => void;
  onHtmlChunk?: (partialHtml: string) => void;
  prdDoc?: string;
  iaImageBase64?: string;
  iaText?: string;
}

export interface AideGenerationPlan {
  referenceSearchKeyword?: string;
  designIntelligence?: {
    serviceSubtype: string;
    selectedPatterns: string[];
    avoidPatterns: string[];
    dataPointTarget: {
      mobileFirstViewport: string;
      minimum: number;
      ideal: number;
      examples: string[];
    };
    contentMediaPolicy: {
      heroPhotoVariant: 'C' | 'none';
      thumbnailImagesAllowed: Array<'A' | 'B' | 'C'>;
      notes: string[];
    };
  };
  variantBriefs?: Record<'A' | 'B' | 'C', {
    strategy: string;
    screenPattern: string;
    heroPolicy: VariantVisualPolicy;
    mustShow: string[];
    shouldAvoid: string[];
    layoutRhythm: string[];
  }>;
  productBrief: {
    serviceIntent: string;
    targetUser: string;
    primaryScenario: string;
    screenPurpose: string;
    coreObjects: string[];
    keyActions: string[];
    successCriteria: string[];
    assumptions: string[];
  };
  contentInventory?: {
    kpis: Array<{ label: string; value: string; meta: string }>;
    quickActions: string[];
    listItems: Array<{ title: string; meta: string; value: string; badge?: string }>;
    activityItems: Array<{ title: string; meta: string; value: string }>;
    sectionIdeas: string[];
    requiredAboveFoldUnits: string[];
  };
  visualStrategy: {
    mode: '3d' | 'photo' | 'data' | 'none';
    sharedAsset: boolean;
    subject: string;
    reason: string;
    usageByVariant: Record<string, string>;
  };
  variantDirector: Record<string, {
    strategy: string;
    layoutRole: string;
    firstViewport: string[];
    mustDifferBy: string[];
    componentSpec?: string;
    forbidden?: string[];
  }>;
  expectedSubScreens?: Array<{
    id: string;
    label: string;
    purpose: string;
  }>;
  recommendedStrategy?: Record<'A' | 'B' | 'C', string>;
}

export interface LayoutBlueprintSection {
  id: string;
  label: string;
  role: 'nav' | 'hero' | 'kpi' | 'actions' | 'content' | 'list' | 'media' | 'form' | 'tabbar'
      | 'collection' | 'chart' | 'banner' | 'cta-block';
  y: number;
  height: number;
  columns?: number;
  density: 'sparse' | 'balanced' | 'dense';
  children: string[];
  notes?: string;
  imageStrategy?: {
    position: 'top' | 'left' | 'background' | 'right';
    aspectRatio: '16:9' | '1:1' | '3:4' | '4:3';
    style: 'photo' | '3d' | 'illustration' | 'icon';
  };
}

export interface LayoutBlueprint {
  variant: 'A' | 'B' | 'C';
  strategy: string;
  viewport: { width: number; height: number };
  navType: 'gnb' | 'lnb' | 'bottom-tab' | 'none';
  heroType: 'none' | 'image-hero' | '3d-hero' | 'stat-dashboard' | 'search-bar' | 'action-cta';
  firstViewport: string[];
  rhythm: {
    pagePadding: number;
    sectionGap: number;
    cardGap: number;
    cardPadding: number;
    headerHeight: number;
    tabbarHeight: number;
    buttonHeight: number;
    inputHeight: number;
  };
  sections: LayoutBlueprintSection[];
  auditChecklist: string[];
}

export interface GenerateUIResult {
  html: string;
  variantDescription?: VariantDescription;
}

export interface AsIsPageAnalysis {
  sourceUrl: string;
  pageTitle: string;
  metaDescription?: string;
  pagePurpose: string;
  layoutType: string;
  globalNavigation: Array<{ tag: string; text: string; href?: string | null }>;
  primaryCtas: Array<{ tag: string; text: string; href?: string | null }>;
  forms: Array<{ label: string; fields: string[]; submitText: string }>;
  sections: Array<{
    index: number;
    role: string;
    heading: string;
    textSamples: string[];
    ctaSamples: string[];
    repeatedItemCount: number;
  }>;
  repeatedPatterns: string[];
  contentInventory: {
    headings: string[];
    buttons: string[];
    links: string[];
  };
  redesignFocus: string[];
}

export interface TweakVariable {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  currentValue: number;
  currentDisplayStrings: string[];
}

export interface TweakState {
  id: string;
  label: string;
  replacements: Array<{ from: string; to: string }>;
}

export interface TweakEvent {
  id: string;
  label: string;
  script: string;
}

export interface TweakSpec {
  variables: TweakVariable[];
  states: TweakState[];
  events: TweakEvent[];
}

export async function analyzeAndGenerateQuestions(
  designMd: string,
  brief: string,
  platform?: 'mobile' | 'web',
  apiKey?: string,
  prdDoc?: string,
): Promise<QuestionnaireResponse> {
  const designSystemContext = designMd?.trim()
    ? `\n## 선택된 디자인 시스템 요약\n아래 DESIGN.md는 최종 UI의 스타일 기준입니다. 질문은 색상·라운드·컴포넌트 스타일을 다시 묻지 말고, 서비스 내용과 화면 구성에 필요한 의사결정만 물어보세요.\n\`\`\`md\n${designMd.slice(0, 4000)}\n\`\`\`\n`
    : ''
  const prdContext = prdDoc?.trim()
    ? `\n## PRD / IA 문서 (기획 문서 원문)\n아래는 사용자가 첨부한 PRD·IA·메뉴 구조 문서입니다. 이 문서를 기반으로 도메인, 핵심 기능, 화면 구조, 유저 플로우를 정확히 파악하여 질문과 분석에 반영하세요.\n\`\`\`\n${prdDoc.slice(0, 8000)}\n\`\`\`\n`
    : ''
  const prompt = `
당신은 제품 기획자입니다. 기획서를 분석해 아래 세 가지만 추출하세요.

## 기획서
${brief}
${prdContext}${designSystemContext}

## 3D 히어로 이미지 판단

히어로 섹션에 AI 생성 3D 이미지가 필요한지 판단하세요.

**⚠️ 절대 최우선 조건 — 아래 해당하면 다른 조건 무시하고 generate: true:**
- 브리프에 캐릭터·마스코트·펫·동물 캐릭터가 등장한다 (예: "단디", "귀여운 강아지", "마스코트", "캐릭터", "펫", "동료", "companion")
- 브리프에 "3D", "3D 캐릭터", "3D 히어로", "캐릭터 생성"처럼 3D 비주얼을 명시적으로 요청했다
- 브리프가 게임형·리워드형·성장형 앱이다 (예: "리워드", "코인", "레벨업", "캐릭터 성장", "뽑기")
- 위 조건에 해당하면 모바일 앱 홈 화면이라도 generate: true. 아래 false 조건을 읽지 마라.

**generate: true 조건 (위 절대 조건 외):**
- B2C 랜딩페이지 / 브랜드 소개 / 제품 쇼케이스
- 앱·서비스 소개 페이지 (SaaS, 스타트업, 앱 마케팅)
- 포트폴리오 / 에이전시 홈
- premium 분위기가 핵심인 브랜드

**generate: false 조건 (절대 최우선 조건에 해당하지 않고, 하나라도 해당하면):**
- 내부 대시보드 / 관리자 툴 / B2B 엔터프라이즈
- 캐릭터·마스코트가 없는 일반 모바일 앱 메인화면
- 캐릭터·마스코트가 없는 모바일 주문/피드/탐색 앱 홈 화면
- 정보 조회·CRUD·폼 위주 서비스
- 커뮤니티·SNS·뉴스 피드 서비스

generate: true일 때:
- **최우선 규칙**: 사용자가 브리프에서 3D 오브젝트를 명시한 경우 반드시 그것을 사용하세요.
  - 감지 패턴: "3D는 X로", "X 캐릭터로", "X로 만들어줘", "히어로 이미지는 X", "3D 이미지는 X", "X 마스코트", "X 캐릭터 써줘"
  - 예: "3D는 토끼 캐릭터로 해줘" → heroSubject: "a cute rabbit character"
  - 예: "강아지 마스코트로 만들어줘" → heroSubject: "a friendly dog mascot"
  - 명시된 경우 AI가 임의로 다른 오브젝트로 바꾸지 말 것
- 명시가 없을 때: 서비스를 상징하는 단일 오브젝트 자동 선정
- prompt는 **영어**로, Creon 3D Studio 스타일에 적합한 단일 오브젝트/캐릭터 프롬프트 작성:
  - 스타일: cute isometric 3D mascot/icon, glossy plastic, soft studio lighting, clean shape
  - 예: "a cute sandwich mascot holding a coupon", "a delivery box mascot", "a friendly credit card character"
- heroSubject는 이 서비스를 상징하는 **단일 오브젝트**를 **영어 명사구** 2~5단어로 작성:
  - 예: "a sleek smartphone", "a credit card", "a running shoe", "a delivery box", "a laptop with UI"
  - 반드시 isometric 3D 아이콘으로 표현 가능한 구체적 사물이어야 함

generate: false일 때: heroSubject는 빈 문자열("")로 설정

## 플랫폼 추천

기획서를 읽고 생성 기준 플랫폼을 추천하세요. 결과물은 항상 반응형으로 만들지만, 첫 시안 프리뷰와 정보 구조의 기준이 되는 primary platform을 정합니다.

- mobile: 음식/배달, 쇼핑 앱, SNS, 커뮤니티, 헬스, 엔터테인먼트, 데이팅, 온디맨드 서비스처럼 모바일 사용 맥락이 우선인 경우
- web: 포털, B2B SaaS, 어드민, 대시보드, CRM/ERP, 분석툴, 교육/문서/검색 중심 서비스, 랜딩/브랜드 사이트처럼 데스크탑 정보 구조가 우선인 경우
- 사용자가 브리프에 "웹", "포털", "대시보드", "관리자", "랜딩"을 명시하면 web을 우선합니다.
- 사용자가 브리프에 "앱", "모바일", "배달", "피드", "주문", "예약 앱"을 명시하면 mobile을 우선합니다.
${platform ? `- 참고: URL 파라미터로 전달된 기존 플랫폼 힌트는 ${platform}이지만, 브리프와 서비스 성격이 더 우선입니다.` : ''}

## 도메인 분류

기획서를 읽고 서비스 도메인을 하나만 선택하세요:
- finance: 금융, 투자, 은행, 결제, 보험, 자산관리
- commerce: 쇼핑, 이커머스, 마켓플레이스, 중고거래
- health: 헬스케어, 운동, 다이어트, 의료, 웰니스
- food: 음식 배달, 레스토랑, 레시피, 식음료
- productivity: 업무, 협업, 일정, 노트, 프로젝트 관리
- social: SNS, 커뮤니티, 채팅, 데이팅
- travel: 여행, 숙박, 항공, 지도
- education: 교육, 학습, 강의, 자격증
- entertainment: 엔터테인먼트, 게임, 음악, 영상, 취미
- business: B2B SaaS, 대시보드, 관리자 툴, 분석
- other: 위 분류에 해당 없음

## 서비스 구조 분석 (CRITICAL — 이후 화면 생성의 핵심 입력)

기획서를 깊이 읽고, 실제 화면을 만들 수 있는 수준으로 서비스 구조를 분석하세요. 추상적 표현 금지, 이 서비스에만 맞는 구체적 내용으로 작성하세요.

1. **coreObjects** — 이 서비스가 다루는 핵심 도메인 객체 3~6개 (명사). 예: 금융앱이면 ["계좌", "거래", "포트폴리오", "예산"], 배달앱이면 ["가게", "메뉴", "주문", "쿠폰"]
2. **keyDataPoints** — 첫 화면에 실제로 보여야 할 구체적 데이터 항목 6~12개. 예: ["총 자산 금액", "오늘 수익률 %", "최근 거래 3건", "이번 달 지출", "저축 목표 달성률"]. "정보", "데이터" 같은 추상어 금지.
3. **informationArchitecture** — 이 서비스의 하단 탭/메뉴 구조 3~5개. 각 화면은 실제 기능 목적지여야 함. 유저 타입(신규/헤비 유저)이나 설정 하위메뉴를 탭으로 만들지 말 것.
   - 각 항목: { "id": "screen-xxx" (영문 kebab), "label": "탭 한글명 (2~5자)", "purpose": "이 화면에서 보여줄 콘텐츠와 기능을 구체적으로" }
4. **primaryJourney** — 사용자가 이 앱에서 반복하는 핵심 흐름을 "상태 확인 → 행동 → 결과" 형태 한 문장으로. 예: "자산 현황 확인 → 포트폴리오 조정 → 수익률 추적"
5. **serviceSubtypeHint** — 이 서비스의 성격을 2~4단어 kebab-case로. 예: "stock-trading-app", "grocery-delivery", "habit-tracker"
6. **heroVisualType** — 이 서비스 첫 화면 히어로에 가장 어울리는 비주얼 종류를 하나만 고르세요:
   - "3d-object": 캐릭터·마스코트·상징 오브젝트가 어울리는 B2C 감성 서비스 (펫·게임·리워드·음식·헬스 등)
   - "photo": 실사 사진이 설득력 있는 라이프스타일·여행·커머스·음식 탐색 서비스
   - "data": 사진/3D보다 KPI·수치·차트가 핵심인 금융·통신요금제·B2B·대시보드·관리툴 (억지 이미지 금지)
7. **heroVisualSubject** — 히어로 비주얼 소재를 **영어 명사구**로 직접 지정하세요. 정규식이 아니라 당신이 서비스를 보고 정합니다.
   - 3d-object면: "a glossy 3D smartphone with signal waves", "a cute dog mascot holding a leash" 처럼 단일 오브젝트
   - photo면: "modern travel destination", "fresh healthy food bowl" 처럼 Unsplash 검색용 명사구
   - data면: 빈 문자열("") — 이미지를 쓰지 않음
8. **contentSeed** — 이 서비스 첫 화면에 들어갈 **실제 콘텐츠**를 구체적으로 생성하세요. 일반 더미("항목 1", "상품 A")나 다른 서비스 값 복붙 금지. 이 브리프에만 맞는 한국어 텍스트·수치·상태로 작성:
   - kpis: 핵심 지표 3~4개. 각 { label, value(실제 수치/상태), meta(보조 설명) }. 예: { "label": "이번 주 모은 용돈", "value": "12,400원", "meta": "목표 20,000원의 62%" }
   - quickActions: 첫 화면 빠른 액션 4~6개 (이 서비스의 실제 행동)
   - listItems: 추천/리스트 항목 3개 이상. 각 { title, meta, value, badge(선택) }
   - activityItems: 최근 활동/상태 2~3개. 각 { title, meta, value }

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{
  "projectSummary": "프로젝트 한 줄 요약",
  "domain": "finance",
  "recommendedPlatform": {
    "platform": "mobile",
    "reason": "추천 근거 한 줄"
  },
  "heroImageDecision": {
    "generate": false,
    "reason": "판단 근거 한 줄",
    "prompt": "",
    "heroSubject": ""
  },
  "serviceAnalysis": {
    "coreObjects": ["...", "...", "..."],
    "keyDataPoints": ["...", "...", "...", "...", "...", "..."],
    "informationArchitecture": [
      { "id": "screen-home", "label": "홈", "purpose": "..." },
      { "id": "screen-xxx", "label": "...", "purpose": "..." }
    ],
    "primaryJourney": "...",
    "serviceSubtypeHint": "...",
    "heroVisualType": "3d-object | photo | data",
    "heroVisualSubject": "...",
    "contentSeed": {
      "kpis": [{ "label": "...", "value": "...", "meta": "..." }],
      "quickActions": ["...", "..."],
      "listItems": [{ "title": "...", "meta": "...", "value": "...", "badge": "..." }],
      "activityItems": [{ "title": "...", "meta": "...", "value": "..." }]
    }
  }
}
`;

  const text = await generatePro(prompt, apiKey, 'gemini-3.5-flash');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse questionnaire JSON');

  const parsed = JSON.parse(jsonMatch[0]) as { projectSummary: string; domain: AppDomain; heroImageDecision?: HeroImageDecision; recommendedPlatform?: PlatformRecommendation; serviceAnalysis?: ServiceAnalysis };

  // serviceAnalysis 정규화 — 모델이 일부 필드를 누락해도 안전하게 동작하도록 보정
  const rawAnalysis = parsed.serviceAnalysis
  const serviceAnalysis: ServiceAnalysis | undefined = rawAnalysis ? {
    coreObjects: Array.isArray(rawAnalysis.coreObjects) ? rawAnalysis.coreObjects.filter(s => typeof s === 'string' && s.trim()).slice(0, 8) : [],
    keyDataPoints: Array.isArray(rawAnalysis.keyDataPoints) ? rawAnalysis.keyDataPoints.filter(s => typeof s === 'string' && s.trim()).slice(0, 14) : [],
    informationArchitecture: Array.isArray(rawAnalysis.informationArchitecture)
      ? rawAnalysis.informationArchitecture
          .filter(s => s && typeof s.label === 'string' && s.label.trim())
          .map((s, i) => ({
            id: typeof s.id === 'string' && /^screen-[a-z0-9-]+$/.test(s.id) ? s.id : `screen-${i === 0 ? 'home' : i}`,
            label: s.label.trim().slice(0, 12),
            purpose: typeof s.purpose === 'string' ? s.purpose.trim() : '',
          }))
          .slice(0, 5)
      : [],
    primaryJourney: typeof rawAnalysis.primaryJourney === 'string' ? rawAnalysis.primaryJourney.trim() : '',
    serviceSubtypeHint: typeof rawAnalysis.serviceSubtypeHint === 'string' ? rawAnalysis.serviceSubtypeHint.trim() : '',
    heroVisualSubject: typeof rawAnalysis.heroVisualSubject === 'string' ? rawAnalysis.heroVisualSubject.trim() : '',
    heroVisualType: (rawAnalysis.heroVisualType === '3d-object' || rawAnalysis.heroVisualType === 'photo' || rawAnalysis.heroVisualType === 'data')
      ? rawAnalysis.heroVisualType
      : 'data',
    contentSeed: (() => {
      const cs = rawAnalysis.contentSeed
      if (!cs || typeof cs !== 'object') return undefined
      const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
      const kpis = Array.isArray(cs.kpis)
        ? cs.kpis.filter(k => k && str(k.label)).map(k => ({ label: str(k.label), value: str(k.value), meta: str(k.meta) })).slice(0, 5)
        : []
      const quickActions = Array.isArray(cs.quickActions) ? cs.quickActions.filter((s: unknown) => typeof s === 'string' && s.trim()).map((s: string) => s.trim()).slice(0, 8) : []
      const listItems = Array.isArray(cs.listItems)
        ? cs.listItems.filter(l => l && str(l.title)).map(l => ({ title: str(l.title), meta: str(l.meta), value: str(l.value), ...(str(l.badge) ? { badge: str(l.badge) } : {}) })).slice(0, 6)
        : []
      const activityItems = Array.isArray(cs.activityItems)
        ? cs.activityItems.filter(a => a && str(a.title)).map(a => ({ title: str(a.title), meta: str(a.meta), value: str(a.value) })).slice(0, 4)
        : []
      // 최소한 kpis 또는 listItems가 있어야 유효한 시드로 인정
      if (kpis.length === 0 && listItems.length === 0) return undefined
      return { kpis, quickActions, listItems, activityItems }
    })(),
  } : undefined

  const inferredDomainLabel = parsed.domain ? (DOMAIN_KEY_TO_LABEL[parsed.domain] ?? '기타') : '기타'

  const fixedQuestions: Question[] = [
    {
      id: 'platform_intent',
      question: '기준 화면',
      description: parsed.recommendedPlatform?.reason ?? '첫 시안 프리뷰와 정보 구조의 기준 화면입니다.',
      type: 'single',
      options: ['모바일 앱', '웹 서비스', '랜딩/브랜드', '대시보드/관리자', '포털/커머스'],
    },
    {
      id: 'hero_3d',
      question: '3D 히어로 이미지',
      description: 'Creon 3D 스타일 오브젝트/캐릭터를 히어로 영역에 생성합니다. "직접 입력"을 선택하면 원하는 키워드를 지정할 수 있어요.',
      type: 'single',
      options: ['3D 생성 안 함', 'AI가 자동 결정', '직접 입력'],
    },
    {
      id: 'service_type',
      question: '서비스 성격',
      description: '디자인 톤·레이아웃·시각 방향이 크게 달라집니다. 잘못 설정되면 B2B 대시보드처럼 딱딱하게 나올 수 있어요.',
      type: 'single',
      options: [
        'B2C — 소비자용 (Toss·카카오·네이버 스타일, 직관적·감성적)',
        'B2B — 업무/기업용 (대시보드·관리자·SaaS 스타일, 정보 밀도 중심)',
      ],
    },
    {
      id: 'domain',
      question: '서비스 도메인',
      description: `AI가 "${inferredDomainLabel}"로 추론했습니다. 다르다면 변경해 주세요`,
      type: 'single',
      options: Object.values(DOMAIN_KEY_TO_LABEL),
    },
    {
      id: 'home_emphasis',
      question: '홈에서 강조할 것',
      description: '첫 화면의 focal point와 섹션 순서를 결정합니다.',
      type: 'single',
      options: DOMAIN_HOME_EMPHASIS_OPTIONS[parsed.domain ?? 'other'] ?? DOMAIN_HOME_EMPHASIS_OPTIONS['other'],
    },
    {
      id: 'target_audience',
      question: '주요 타겟',
      description: '타겟에 따라 톤, 용어, 정보 구조가 달라집니다.',
      type: 'single',
      options: ['20-30대 일반 소비자', '30-40대 직장인', '10-20대 MZ세대', '전문가/파워유저', '시니어 (50대+)', 'AI가 결정'],
    },
    {
      id: 'visual_direction',
      question: '비주얼 방향',
      description: '서비스 전반의 시각적 분위기를 설정합니다.',
      type: 'single',
      options: ['밝고 친근한 (카카오·토스 스타일)', '세련되고 프리미엄한 (Apple·Airbnb 스타일)', '활기차고 강렬한 (게임·리워드 스타일)', '신뢰감 있는 전문적 (금융·의료 스타일)', 'AI가 결정'],
    },
    {
      id: 'visual_density',
      question: '정보 밀도',
      description: '화면 안에 얼마나 많은 정보를 담을지 결정합니다. 여백형은 고급감, 밀도형은 효율성을 강조합니다.',
      type: 'single',
      options: ['프리미엄 여백형 (Apple·Airbnb — 여백 중심, 핵심만)', '균형형 (Toss·카카오 — 핵심과 보조를 고루)', '정보 밀도 높게 (금융·B2B — 데이터 최대)', 'AI가 결정'],
    },
    {
      id: 'primary_journey',
      question: '핵심 사용 흐름',
      description: serviceAnalysis?.primaryJourney
        ? `AI가 "${serviceAnalysis.primaryJourney}"로 분석했습니다. 첫 화면의 상태 → 행동 → 결과 흐름을 결정합니다.`
        : '첫 화면 안에서 사용자의 상태 확인 → 행동 → 결과를 연결하는 핵심 흐름입니다. 레이아웃 우선순위 결정에 사용됩니다.',
      type: 'single',
      // AI 추론 흐름이 있으면 맨 앞 옵션으로 노출, 이어서 도메인 표준 흐름
      options: [
        ...(serviceAnalysis?.primaryJourney ? [serviceAnalysis.primaryJourney] : []),
        ...(DOMAIN_PRIMARY_JOURNEY_OPTIONS[parsed.domain ?? 'other'] ?? DOMAIN_PRIMARY_JOURNEY_OPTIONS['other']),
      ].filter((v, i, arr) => arr.indexOf(v) === i),
    },
    {
      id: 'first_screen_focus',
      question: '첫 화면 주인공',
      description: '첫 viewport에서 가장 강한 시각 계층을 차지할 요소입니다. 나머지 요소는 이것을 보조합니다.',
      type: 'single',
      options: DOMAIN_FIRST_SCREEN_FOCUS_OPTIONS[parsed.domain ?? 'other'] ?? DOMAIN_FIRST_SCREEN_FOCUS_OPTIONS['other'],
    },
    {
      id: 'variant_strategy',
      question: 'A/B/C 시안 구성 방향',
      description: '세 시안이 어떤 방향을 특히 강화할지 결정합니다. 기본은 A=정보형, B=전환형, C=탐색형입니다.',
      type: 'single',
      options: ['세 방향 균형 (A=정보형, B=전환형, C=탐색형으로 균등하게)', '정보형 강화 (A안 데이터 밀도 특히 강화)', '전환형 강화 (B안 CTA와 히어로 특히 강화)', '탐색형 강화 (C안 이미지 큐레이션 특히 강화)', 'AI가 결정'],
    },
  ]

  return {
    projectSummary: parsed.projectSummary,
    domain: parsed.domain,
    recommendedPlatform: parsed.recommendedPlatform,
    heroImageDecision: parsed.heroImageDecision,
    serviceAnalysis,
    questions: fixedQuestions,
  }
}

function buildCssRootFromYaml(yamlContent: string): string {
  const lines: string[] = [];

  const parseSection = (sectionName: string, prefix: string) => {
    const re = new RegExp(`^${sectionName}:\\s*\\n((?:[ \\t]+\\S[^\\n]*\\n?)*)`, 'm');
    const m = yamlContent.match(re);
    if (!m) return;
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^[ \t]+([^:#\n][^:\n]*):\s*["']?([^"'\n]+?)["']?\s*$/);
      if (kv) lines.push(`  --${prefix}-${kv[1].trim()}: ${kv[2].trim()};`);
    }
  };

  parseSection('colors', 'color');
  parseSection('spacing', 'spacing');
  parseSection('rounded', 'rounded');

  if (lines.length === 0) return '';
  return `## CSS Implementation\n:root {\n${lines.join('\n')}\n}`;
}

function extractDesignMdForPrompt(designMd: string): string {
  if (!designMd) return designMd;

  // Extract YAML frontmatter — all design tokens (spacing, colors, typography, rounded, components)
  const yamlMatch = designMd.match(/^---\n([\s\S]*?)\n---/);
  const yaml = yamlMatch ? `---\n${yamlMatch[1]}\n---` : '';

  // Extract CSS Implementation section — pre-built :root {} block with all CSS variables
  const cssMatch = designMd.match(/##\s*CSS Implementation\b[\s\S]*?(?=\n## |\s*$)/);
  // If no CSS Implementation section exists, auto-generate one from YAML tokens
  const cssBlock = cssMatch
    ? cssMatch[0].trim()
    : (yamlMatch ? buildCssRootFromYaml(yamlMatch[1]) : '');

  // Priority order: YAML tokens first → CSS vars block → remaining prose
  const parts: string[] = [];
  if (yaml) parts.push(yaml);
  if (cssBlock) parts.push(cssBlock);

  const prose = designMd
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/##\s*CSS Implementation\b[\s\S]*?(?=\n## |\s*$)/, '')
    .trim();
  if (prose) parts.push(prose);

  return parts.length > 0 ? parts.join('\n\n') : designMd;
}

type DesignTokenMap = Record<string, string>
type ComponentContract = Record<string, Record<string, string>>
type DesignRhythmContract = {
  systemName: string
  hasBrandColors: boolean
  colors: DesignTokenMap
  spacing: DesignTokenMap
  rounded: DesignTokenMap
  typographyKeys: string[]
  components: ComponentContract
  layoutRhythm: {
    pagePadding: string
    pagePaddingWeb: string
    sectionGap: string
    cardPadding: string
    cardGap: string
    itemGap: string
    cardRadius: string
    buttonHeight: string
    inputHeight: string
    cardBorder: string
    cardShadow: string
    headerHeight: string
    tabbarHeight: string
  }
}

function extractYamlFrontmatter(designMd: string): string {
  return designMd.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
}

function extractYamlTopLevelSection(yaml: string, section: string): string {
  const match = yaml.match(new RegExp(`(?:^|\\n)${section}:\\s*\\n([\\s\\S]*?)(?=\\n[a-zA-Z0-9_-]+:\\s*(?:\\n|["'{\\[]|[^\\n]*)|\\s*$)`))
  return match?.[1] ?? ''
}

function parseSimpleTokenMap(yaml: string, section: string): DesignTokenMap {
  const block = extractYamlTopLevelSection(yaml, section)
  const result: DesignTokenMap = {}
  for (const line of block.split('\n')) {
    const match = line.match(/^[ \t]{2}([^:#\n][^:\n]*):\s*(.+?)\s*$/)
    if (!match) continue
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '').replace(/\s+#[^{].*$/, '')
    if (!value || value.startsWith('{') || value.startsWith('[')) continue
    result[key] = value
  }
  return result
}

function parseComponentContract(yaml: string): ComponentContract {
  const block = extractYamlTopLevelSection(yaml, 'components')
  const result: ComponentContract = {}
  let current = ''
  for (const line of block.split('\n')) {
    const component = line.match(/^[ \t]{2}([^:#\n][^:\n]*):\s*$/)
    if (component) {
      current = component[1].trim()
      result[current] = result[current] ?? {}
      continue
    }
    if (!current) continue
    const prop = line.match(/^[ \t]{4}([^:#\n][^:\n]*):\s*(.+?)\s*$/)
    if (!prop) continue
    const key = prop[1].trim()
    const value = prop[2].trim().replace(/^["']|["']$/g, '')
    if (!value || value.startsWith('[')) continue
    if (value.startsWith('{') && !/^\{[a-zA-Z0-9_-]+\.[^}]+\}$/.test(value)) continue
    result[current][key] = value
  }
  return result
}

function parseNestedSectionKeys(yaml: string, section: string): string[] {
  const block = extractYamlTopLevelSection(yaml, section)
  const keys: string[] = []
  for (const line of block.split('\n')) {
    const match = line.match(/^[ \t]{2}([^:#\n][^:\n]*):\s*$/)
    if (match) keys.push(match[1].trim())
  }
  return keys
}

function parseNumericPx(value?: string): number | null {
  if (!value) return null
  const px = value.match(/(-?\d+(?:\.\d+)?)px/)
  if (px) return Number(px[1])
  const rem = value.match(/(-?\d+(?:\.\d+)?)rem/)
  if (rem) return Math.round(Number(rem[1]) * 16)
  const raw = value.match(/^(-?\d+(?:\.\d+)?)$/)
  if (raw) return Number(raw[1])
  return null
}

function pickSpacingToken(spacing: DesignTokenMap, preferred: string[], fallbackIndexRatio: number): string {
  for (const key of preferred) {
    if (spacing[key]) return `var(--spacing-${key})`
  }
  const entries = Object.entries(spacing)
    .map(([key, value]) => ({ key, value, px: parseNumericPx(value) }))
    .filter((item): item is { key: string; value: string; px: number } => item.px !== null)
    .sort((a, b) => a.px - b.px)
  if (entries.length === 0) return '[derive from DESIGN.md spacing]'
  const index = Math.min(entries.length - 1, Math.max(0, Math.round((entries.length - 1) * fallbackIndexRatio)))
  return `var(--spacing-${entries[index].key})`
}

function pickRoundedToken(rounded: DesignTokenMap, preferred: string[], fallbackIndexRatio: number): string {
  for (const key of preferred) {
    if (rounded[key]) return `var(--rounded-${key})`
  }
  const entries = Object.entries(rounded)
    .map(([key, value]) => ({ key, value, px: parseNumericPx(value) }))
    .filter((item): item is { key: string; value: string; px: number } => item.px !== null)
    .sort((a, b) => a.px - b.px)
  if (entries.length === 0) return '[derive from DESIGN.md rounded/radius]'
  const index = Math.min(entries.length - 1, Math.max(0, Math.round((entries.length - 1) * fallbackIndexRatio)))
  return `var(--rounded-${entries[index].key})`
}

function pickComponentValue(components: ComponentContract, names: string[], props: string[]): string | null {
  const component = Object.entries(components).find(([name]) =>
    names.some(candidate => name.toLowerCase().includes(candidate))
  )?.[1]
  if (!component) return null
  for (const prop of props) {
    if (component[prop]) return component[prop]
  }
  return null
}

function extractDesignSystemName(designMd: string): string {
  const yaml = extractYamlFrontmatter(designMd)
  const name = yaml.match(/(?:^|\n)name:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim()
  if (name) return name
  return designMd.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? 'Selected Design System'
}

function buildDesignRhythmContract(designMd: string, hasBrandColors = false): DesignRhythmContract | null {
  const yaml = extractYamlFrontmatter(designMd)
  if (!designMd.trim()) return null

  const name = extractDesignSystemName(designMd)
  const colors = parseSimpleTokenMap(yaml, 'colors')
  const spacing = parseSimpleTokenMap(yaml, 'spacing')
  const rounded = parseSimpleTokenMap(yaml, 'rounded')
  const typographyKeys = parseNestedSectionKeys(yaml, 'typography')
  const components = parseComponentContract(yaml)

  const layout = parseSimpleTokenMap(yaml, 'layout')

  const cardPadding = layout['card-padding']
    ?? pickComponentValue(components, ['card'], ['padding', 'paddingX', 'paddingY'])
    ?? pickSpacingToken(spacing, ['lg', 'md', 'base'], 0.58)
  const cardGap = layout['card-gap']
    ?? pickComponentValue(components, ['card'], ['gap', 'rowGap', 'columnGap'])
    ?? pickSpacingToken(spacing, ['md', 'base', 'sm'], 0.42)
  const sectionGap = layout['section-gap']
    ?? pickSpacingToken(spacing, ['lg', 'xl', 'section'], 0.65)
  const pagePadding = layout['page-padding']
    ?? pickSpacingToken(spacing, ['lg', 'md', 'gutter', 'base'], 0.58)
  const cardRadius = pickComponentValue(components, ['card'], ['radius', 'rounded', 'borderRadius'])
    ?? pickRoundedToken(rounded, ['md', 'lg', 'card'], 0.58)
  const buttonHeight = pickComponentValue(components, ['button-primary', 'button'], ['height', 'minHeight'])
    ?? '[derive from button component in DESIGN.md]'
  const inputHeight = pickComponentValue(components, ['input', 'textfield', 'text-field'], ['height', 'minHeight'])
    ?? '[derive from input component in DESIGN.md]'
  const cardBorder = pickComponentValue(components, ['card'], ['border', 'borderColor'])
    ?? '[derive from card component in DESIGN.md]'
  const cardShadow = pickComponentValue(components, ['card'], ['shadow', 'boxShadow'])
    ?? '[derive from card/elevation rules in DESIGN.md]'
  const pagePaddingWeb = layout['page-padding-web'] ?? pagePadding
  const itemGap = layout['item-gap']
    ?? pickSpacingToken(spacing, ['xs', 'xxs', 'sm'], 0.25)
  const headerHeight = layout['header-height'] ?? layout['nav-height'] ?? layout['appbar-height'] ?? '56px'
  const tabbarHeight = layout['tabbar-height'] ?? layout['tab-bar-height'] ?? layout['bottom-nav-height'] ?? '72px'

  return {
    systemName: name,
    hasBrandColors,
    colors,
    spacing,
    rounded,
    typographyKeys: typographyKeys.slice(0, 16),
    components,
    layoutRhythm: {
      pagePadding,
      pagePaddingWeb,
      sectionGap,
      cardPadding,
      cardGap,
      itemGap,
      cardRadius,
      buttonHeight,
      inputHeight,
      cardBorder,
      cardShadow,
      headerHeight,
      tabbarHeight,
    },
  }
}

function buildDesignSystemContract(designMd: string, hasBrandColors = false): string {
  if (!designMd.trim()) return 'No external DESIGN.md was provided. Use the default Aide design system contract.'

  const contract = buildDesignRhythmContract(designMd, hasBrandColors)
  if (!contract) return 'No external DESIGN.md was provided. Use the default Aide design system contract.'

  const { systemName: name, colors, spacing, rounded, typographyKeys: typeKeys, components, layoutRhythm } = contract
  const colorLines = Object.entries(colors).slice(0, 24).map(([key, value]) => `    "${key}": "${value}"`)
  const spacingLines = Object.entries(spacing).slice(0, 18).map(([key, value]) => `    "${key}": "${value}"`)
  const roundedLines = Object.entries(rounded).slice(0, 14).map(([key, value]) => `    "${key}": "${value}"`)
  // Priority: layout-critical components always appear first
  const COMPONENT_PRIORITY = [
    'button-primary', 'button-secondary', 'button-outline', 'button-ghost', 'button-disabled',
    'card-default', 'card-b2b', 'card-b2c',
    'input-default', 'input-large', 'input-small', 'input-focused', 'input-error',
    'nav-bottom-default', 'nav-bottom-item-active', 'nav-bottom-item-inactive',
    'nav-side-default', 'nav-top-default',
    'list-item-default', 'list-item-selected',
    'badge-filled-primary', 'badge-tint-primary', 'chip-default', 'chip-selected',
    'modal-default', 'bottom-sheet-default', 'section-header-default',
  ]
  const prioritized = COMPONENT_PRIORITY.filter(k => components[k]).map(k => [k, components[k]] as [string, Record<string, string>])
  const rest = Object.entries(components).filter(([k]) => !COMPONENT_PRIORITY.includes(k))
  const componentLines = [...prioritized, ...rest].slice(0, 28).map(([key, value]) => {
    const summary = Object.entries(value).slice(0, 8).map(([prop, val]) => `${prop}: ${val}`).join('; ')
    return `    "${key}": "${summary || 'defined in prose'}"`
  })

  return `## Design System Contract — generated from the selected DESIGN.md

This contract is the source of truth for this generation. It was compiled from **${name}**.
It is intentionally generic: do not assume KTDS values unless this selected DESIGN.md is KTDS.

\`\`\`json
{
  "systemName": ${JSON.stringify(name)},
  "brandColorOverride": ${hasBrandColors ? '"enabled: only primary/action/accent tokens may be replaced by applied brand colors"' : '"disabled: use DESIGN.md colors exactly"'},
  "tokens": {
    "colors": {
${colorLines.length ? colorLines.join(',\n') : '    "note": "No explicit color tokens found; infer only from DESIGN.md prose and never invent unrelated colors."'}
    },
    "spacing": {
${spacingLines.length ? spacingLines.join(',\n') : '    "note": "No explicit spacing tokens found; derive a compact scale from component specs/prose and reuse consistently."'}
    },
    "rounded": {
${roundedLines.length ? roundedLines.join(',\n') : '    "note": "No explicit radius tokens found; derive from component specs/prose and reuse consistently."'}
    },
    "typographyKeys": ${JSON.stringify(typeKeys)}
  },
  "componentContract": {
${componentLines.length ? componentLines.join(',\n') : '    "note": "No explicit component YAML found; follow prose component rules strictly."'}
  },
  "layoutRhythm": {
    "pagePadding": ${JSON.stringify(layoutRhythm.pagePadding)},
    "pagePaddingWeb": ${JSON.stringify(layoutRhythm.pagePaddingWeb)},
    "sectionGap": ${JSON.stringify(layoutRhythm.sectionGap)},
    "cardPadding": ${JSON.stringify(layoutRhythm.cardPadding)},
    "cardGap": ${JSON.stringify(layoutRhythm.cardGap)},
    "itemGap": ${JSON.stringify(layoutRhythm.itemGap)},
    "cardRadius": ${JSON.stringify(layoutRhythm.cardRadius)},
    "buttonHeight": ${JSON.stringify(layoutRhythm.buttonHeight)},
    "inputHeight": ${JSON.stringify(layoutRhythm.inputHeight)},
    "cardBorder": ${JSON.stringify(layoutRhythm.cardBorder)},
    "cardShadow": ${JSON.stringify(layoutRhythm.cardShadow)}
  }
}
\`\`\`

### Contract Rules (CRITICAL)
- Use this selected DESIGN.md contract for every screen and every A/B/C variant.
- A/B/C may differ in layout intent, section order, density, and visual strategy, but **spacing rhythm, component sizing, radius, border/shadow policy, typography scale, and color tokens must stay consistent**.
- Do not hardcode arbitrary px values in padding/gap/margin. Choose the closest token and expose as a CSS variable.
- Same component type = same padding/gap/radius. Cards in the same list/grid must not have random internal spacing.
- Brand color override is ${hasBrandColors ? 'enabled, but only for primary/action/accent roles. Neutral, surface, background, border, disabled, status, spacing, radius, and typography remain from DESIGN.md.' : 'disabled. Use the selected DESIGN.md color system exactly.'}
- ⛔ The final HTML MUST declare ALL layout rhythm variables in :root and use them exclusively:
  --aide-page-padding = ${layoutRhythm.pagePadding} (모바일 좌우 여백)
  --aide-page-padding-web = ${layoutRhythm.pagePaddingWeb} (웹 좌우 여백)
  --aide-section-gap = ${layoutRhythm.sectionGap} (섹션 간 간격)
  --aide-card-padding = ${layoutRhythm.cardPadding} (카드 내부 패딩)
  --aide-card-gap = ${layoutRhythm.cardGap} (카드 내부 아이템 간격)
  --aide-item-gap = ${layoutRhythm.itemGap} (인라인 요소 간격)
  --aide-card-radius = ${layoutRhythm.cardRadius} (카드 모서리)
  ⛔ NEVER write: padding: 16px / gap: 12px / margin-top: 24px → ALWAYS write: var(--aide-card-padding) / var(--aide-card-gap) / var(--aide-section-gap)`
}

function cssVarDeclaration(key: string, value: string): string {
  const safeValue = value.includes('[derive')
    ? 'initial'
    : value.replace(/\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\}/g, 'var(--$1-$2)')
  return `  ${key}: ${safeValue};`
}

function buildAideContractStyle(contract: DesignRhythmContract | null): string {
  if (!contract) return ''
  const { layoutRhythm, colors, spacing, rounded, hasBrandColors } = contract

  // When brand colors are active, skip primary/action/accent tokens to preserve model-generated brand vars
  const colorEntries = Object.entries(colors).filter(([k]) =>
    hasBrandColors ? !/(^primary|^action|^accent)/i.test(k) : true
  )
  const colorVars = colorEntries.map(([k, v]) => `  --color-${k}: ${v};`).join('\n')
  const spacingVars = Object.entries(spacing).map(([k, v]) => `  --spacing-${k}: ${v};`).join('\n')
  const roundedVars = Object.entries(rounded).map(([k, v]) => `  --rounded-${k}: ${v};`).join('\n')

  return `<style data-aide-contract="1">
:root {
${cssVarDeclaration('--aide-page-padding', layoutRhythm.pagePadding)}
${cssVarDeclaration('--aide-section-gap', layoutRhythm.sectionGap)}
${cssVarDeclaration('--aide-card-padding', layoutRhythm.cardPadding)}
${cssVarDeclaration('--aide-card-gap', layoutRhythm.cardGap)}
${cssVarDeclaration('--aide-item-gap', layoutRhythm.itemGap)}
${cssVarDeclaration('--aide-card-radius', layoutRhythm.cardRadius)}
${cssVarDeclaration('--aide-button-height', layoutRhythm.buttonHeight)}
${cssVarDeclaration('--aide-input-height', layoutRhythm.inputHeight)}
${cssVarDeclaration('--aide-card-border', layoutRhythm.cardBorder)}
${cssVarDeclaration('--aide-card-shadow', layoutRhythm.cardShadow)}
${cssVarDeclaration('--aide-page-padding-web', layoutRhythm.pagePaddingWeb)}
  --aide-tabbar-height: 72px;
  --aide-header-height: 56px;
  --aide-section-label-gap: 8px;
${colorVars ? `\n  /* Design token overrides from selected DESIGN.md */\n${colorVars}` : ''}
${spacingVars ? `${spacingVars}` : ''}
${roundedVars ? `${roundedVars}` : ''}
}
/* Page container: flex column so direct child sections get uniform gap */
.aide-page,
main.aide-page,
div.aide-page {
  padding: var(--aide-section-gap) var(--aide-page-padding) calc(var(--aide-tabbar-height) + env(safe-area-inset-bottom) + var(--aide-section-gap));
  display: flex;
  flex-direction: column;
  gap: var(--aide-section-gap);
  min-width: 0;
}
/* Reset section-level margins so flex gap is the single source of truth */
.aide-page > section,
.aide-page > div.aide-section,
.aide-page > .aide-section {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
/* Fallback: sibling selector for when aide-page flex gap isn't in play */
.aide-section + .aide-section { margin-top: var(--aide-section-gap); }
/* Card-level rhythm */
.aide-section { display: flex; flex-direction: column; gap: var(--aide-card-gap); }
.aide-card {
  padding: var(--aide-card-padding);
  border-radius: var(--aide-card-radius);
  border: var(--aide-card-border);
  box-shadow: var(--aide-card-shadow);
}
/* Universal safety net: normalize section stacking when aide-page is used */
.aide-page > section > * { margin-top: 0; margin-bottom: 0; }
.aide-page > section > * + * { margin-top: var(--aide-card-gap); }
/* Section label/title sits close to its content — override flex gap with negative margin trick */
.aide-section > .section-header:first-child,
.aide-section > .section-label:first-child,
.aide-section > .section-title:first-child,
.aide-section > h2:first-child,
.aide-section > h3:first-child,
.aide-section > h4:first-child,
.aide-section > [class*="section-header"]:first-child,
.aide-section > [class*="section-label"]:first-child,
.aide-section > [class*="section-title"]:first-child,
.aide-page > section > .section-header:first-child,
.aide-page > section > .section-label:first-child,
.aide-page > section > .section-title:first-child,
.aide-page > section > h2:first-child,
.aide-page > section > h3:first-child,
.aide-page > section > h4:first-child {
  margin-bottom: calc(var(--aide-section-label-gap) - var(--aide-card-gap));
}
.aide-brand-logo {
  height: 40px !important;
  max-height: 40px !important;
  max-width: 140px !important;
  width: auto !important;
  object-fit: contain !important;
  display: block !important;
  flex-shrink: 0 !important;
}
.aide-page img:not(.aide-brand-logo),
.aide-screen img:not(.aide-brand-logo) {
  max-width: 100%;
}
.mobile-tabbar,
.mobile-tab-bar,
.bottom-tabbar,
.bottom-nav,
.tabbar,
.tab-bar,
[class*="tabbar"],
[class*="tab-bar"],
[class*="bottom-nav"] {
  min-height: var(--aide-tabbar-height);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 50;
}
.mobile-tabbar *,
.mobile-tab-bar *,
.bottom-tabbar *,
.bottom-nav *,
.tabbar *,
.tab-bar * {
  min-width: 0;
}
@media (min-width: 768px) {
  .aide-page,
  main.aide-page,
  div.aide-page {
    padding-bottom: var(--aide-section-gap);
  }
  .mobile-tabbar,
  .mobile-tab-bar,
  .mobile-nav,
  .bottom-tabbar,
  .bottom-nav,
  [class*="mobile-tabbar"],
  [class*="mobile-tab-bar"],
  [class*="mobile-nav"],
  [class*="bottom-nav"] {
    display: none !important;
  }
}
</style>`
}


// ── Design personality & component snippets ─────────────────────────────────

function extractDesignDescription(yaml: string): string {
  // Handles: description: "quoted" or description: unquoted value
  const quoted = yaml.match(/(?:^|\n)description:\s*["']([\s\S]*?)["']\s*(?=\n[a-zA-Z]|$)/)
  if (quoted) return quoted[1].trim()
  const unquoted = yaml.match(/(?:^|\n)description:\s*([^\n"'{|>][^\n]*)\s*(?=\n|$)/)
  if (unquoted) return unquoted[1].trim()
  return ''
}

function resolveTokenRef(value: string, contract: DesignRhythmContract): string {
  return value.replace(/\{(\w[\w-]*)\.([^}]+)\}/g, (_, section, key) => {
    switch (section) {
      case 'colors': return contract.colors[key] ?? `var(--color-${key})`
      case 'spacing': return contract.spacing[key] ?? `var(--spacing-${key})`
      case 'rounded': return contract.rounded[key] ?? `var(--rounded-${key})`
      default: return `var(--${section}-${key})`
    }
  })
}

function buildComponentReferenceSnippets(contract: DesignRhythmContract): string {
  const { colors, rounded, components, layoutRhythm } = contract
  const r = (v: string) => resolveTokenRef(v, contract)

  const btn = components['button-primary'] ?? {}
  const btnBg = r(btn.backgroundColor ?? colors.primary ?? '#000')
  const btnColor = r(btn.textColor ?? colors['on-primary'] ?? '#fff')
  const btnRadius = r(btn.rounded ?? rounded.md ?? '8px')
  const btnH = btn.height ?? layoutRhythm.buttonHeight ?? '48px'
  const btnPad = btn.padding ?? '0 24px'

  const inp = components['input-default'] ?? {}
  const inpBg = r(inp.backgroundColor ?? colors.surface ?? '#fff')
  const inpRadius = r(inp.rounded ?? rounded.md ?? '8px')
  const inpH = (() => {
    const raw = inp.height ?? layoutRhythm.inputHeight ?? '40px'
    // "L=40px / M=32px / S=24px" → pick first value
    const first = raw.match(/\d+px/)
    return first ? first[0] : raw
  })()
  const inpBorder = (() => {
    const raw = r(inp.border ?? `1px solid ${colors.border ?? '#ccc'}`)
    return raw.includes('[derive') ? `1px solid ${colors.border ?? '#ccc'}` : raw
  })()

  const surfaceColor = colors.surface ?? '#fff'
  const textColor = colors.text ?? '#1a1a1a'
  const textNeutral = colors['text-neutral'] ?? colors['text-secondary'] ?? '#666'
  const borderColor = colors.border ?? '#ddd'
  const cardPad = layoutRhythm.cardPadding.includes('[derive') ? '16px' : layoutRhythm.cardPadding
  const cardRadius = layoutRhythm.cardRadius.includes('[derive') ? rounded.md ?? '8px' : layoutRhythm.cardRadius
  const cardBorder = layoutRhythm.cardBorder.includes('[derive') ? `1px solid ${borderColor}` : layoutRhythm.cardBorder
  const cardShadow = layoutRhythm.cardShadow.includes('[derive') ? 'none' : layoutRhythm.cardShadow
  const cardGap = layoutRhythm.cardGap.includes('[derive') ? '12px' : layoutRhythm.cardGap

  const primaryColor = colors.primary ?? '#1a75ff'
  const fillNeutral = colors['fill-neutral'] ?? colors['surface-alt'] ?? '#f4f4f5'
  const itemGap = layoutRhythm.itemGap.includes('[derive') ? '8px' : layoutRhythm.itemGap

  return `\`\`\`html
<!-- ✅ Button Primary -->
<button class="btn-primary">레이블</button>
<style>
.btn-primary { height:${btnH}; padding:${btnPad}; background:var(--color-primary,${btnBg}); color:var(--color-on-primary,${btnColor}); border:none; border-radius:var(--rounded-md,${btnRadius}); font-size:14px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
.btn-primary:hover { filter: brightness(0.92); }
</style>

<!-- ✅ Button Secondary -->
<button class="btn-secondary">레이블</button>
<style>
.btn-secondary { height:${btnH}; padding:${btnPad}; background:var(--color-fill-neutral,${fillNeutral}); color:var(--color-text,${textColor}); border:none; border-radius:var(--rounded-md,${btnRadius}); font-size:14px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
</style>

<!-- ✅ Input Field -->
<input class="input-default" type="text" placeholder="입력하세요" />
<style>
.input-default { height:${inpH}; padding:0 12px; background:var(--color-surface,${inpBg}); border:${inpBorder}; border-radius:var(--rounded-md,${inpRadius}); color:var(--color-text,${textColor}); width:100%; box-sizing:border-box; font-size:14px; }
.input-default:focus { outline:none; border-color:var(--color-primary,${primaryColor}); }
</style>

<!-- ✅ Card (B2C: shadow / B2B: border) -->
<div class="aide-card">
  <div style="font-size:14px;font-weight:600;color:var(--color-text,${textColor});margin:0;">제목</div>
  <p style="font-size:14px;color:var(--color-text-neutral,${textNeutral});margin:0;">내용</p>
</div>
<style>
.aide-card { background:var(--color-surface,${surfaceColor}); padding:var(--aide-card-padding,${cardPad}); border-radius:var(--aide-card-radius,${cardRadius}); border:${cardBorder}; box-shadow:${cardShadow}; display:flex; flex-direction:column; gap:var(--aide-card-gap,${cardGap}); }
</style>

<!-- ✅ List Item -->
<div class="list-item">
  <span class="material-symbols-rounded" style="color:var(--color-primary,${primaryColor});font-size:20px;">home</span>
  <span style="flex:1;font-size:14px;color:var(--color-text,${textColor});">항목 텍스트</span>
  <span style="font-size:12px;color:var(--color-text-alternative,#9a9ba0);">보조</span>
</div>
<style>
.list-item { display:flex; align-items:center; gap:var(--aide-item-gap,${itemGap}); padding:12px var(--aide-page-padding,${cardPad}); border-bottom:1px solid var(--color-border-alt,${borderColor}); min-height:56px; }
</style>

<!-- ✅ Badge -->
<span class="badge-primary">신규</span>
<span class="badge-neutral">일반</span>
<style>
.badge-primary { display:inline-flex; align-items:center; background:var(--color-primary,${primaryColor}); color:#fff; border-radius:9999px; padding:2px 8px; font-size:12px; font-weight:600; }
.badge-neutral { display:inline-flex; align-items:center; background:var(--color-fill-neutral,${fillNeutral}); color:var(--color-text-neutral,${textNeutral}); border-radius:9999px; padding:2px 8px; font-size:12px; font-weight:600; }
</style>

<!-- ✅ Bottom Navigation (모바일) -->
<nav class="nav-bottom">
  <a class="nav-item active" data-screen="screen-home">
    <span class="material-symbols-rounded">home</span>
    <span>홈</span>
  </a>
  <a class="nav-item" data-screen="screen-search">
    <span class="material-symbols-rounded">search</span>
    <span>탐색</span>
  </a>
</nav>
<style>
.nav-bottom { position:fixed; bottom:0; left:0; right:0; height:var(--aide-tabbar-height,72px); background:var(--color-surface,#fff); border-top:1px solid var(--color-border-alt,${borderColor}); display:flex; align-items:center; justify-content:space-around; z-index:100; padding-bottom:env(safe-area-inset-bottom); }
.nav-item { display:flex; flex-direction:column; align-items:center; gap:2px; font-size:10px; color:var(--color-text-alternative,#9a9ba0); text-decoration:none; padding:8px 12px; }
.nav-item.active { color:var(--color-primary,${primaryColor}); }
.nav-item .material-symbols-rounded { font-size:22px; }
@media (min-width:768px) { .nav-bottom { display:none; } }
</style>
\`\`\``
}

function injectDesignContractStyle(html: string, designMd: string, hasBrandColors = false): string {
  const contract = buildDesignRhythmContract(designMd, hasBrandColors)
  const style = buildAideContractStyle(contract)
  if (!style || html.includes('data-aide-contract="1"')) return html
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${style}\n</head>`)
  if (/<body/i.test(html)) return html.replace(/<body/i, `${style}\n<body`)
  return `${style}\n${html}`
}

function extractStyleText(html: string): string {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map(match => match[1])
    .join('\n')
}

function collectStaticDesignContractIssues(html: string): string[] {
  const css = extractStyleText(html)
  if (!css.trim()) return ['CSS <style> block is missing.']

  const issues: string[] = []
  // frame/bezel/notch 같은 단어를 서비스 UI 클래스명으로 쓸 수도 있으므로
  // 실제 디바이스 껍데기 구조(배경 #000 + 대형 border-radius 조합)만 감지
  const deviceShellPatterns = [
    /\b(?:class|id)=["'][^"']*(?:phone-frame|iphone-frame|device-frame|device-mockup|phone-mockup|bezel-frame)[^"']*["']/i,
    /(?:phone-frame|iphone-frame|device-frame|device-mockup|phone-mockup|bezel-frame)[\w-]*\s*\{/i,
    /border-radius\s*:\s*(?:3[6-9]|[4-9]\d)px[^}]{0,180}(?:background|border)\s*:\s*(?:#000|#111|#1c1c1c|black)/i,
  ]
  if (deviceShellPatterns.some(pattern => pattern.test(html))) {
    issues.push('Device mockup shell detected. Generated HTML must be the app/web screen itself, without phone frames, bezels, notches, status bars, home indicators, or hardware wrappers.')
  }

  const mediaMinWidthCount = (css.match(/@media\s*[^{]*min-width/gi) ?? []).length
  const hasDesktopBreakpoint = /@media\s*[^{]*min-width\s*:\s*(?:768|900|960|1024|1200|1280)px/i.test(css)
  const hasMobileOnlyNav = /\.(?:mobile-(?:nav|tabbar|tab-bar)|bottom-(?:nav|tabbar)|tabbar|tab-bar)\b|class\*=["'](?:bottom-nav|tabbar|tab-bar)/i.test(css)
  const hidesMobileNavOnWideViewport = /@media\s*[^{]*min-width[\s\S]{0,1800}(?:mobile-(?:nav|tabbar|tab-bar)|bottom-(?:nav|tabbar)|tabbar|tab-bar)[\s\S]{0,420}display\s*:\s*none/i.test(css)
  const narrowRootShell = /(?:\.|#)?(?:app|page|shell|wrapper|container|screen|root)[^{]{0,80}\{[^}]{0,500}(?:width|max-width)\s*:\s*(?:3[2-9]\d|4\d\d|5[0-2]\d)px/i.test(css)
  const hasWideViewportExpansion = /@media\s*[^{]*min-width[\s\S]{0,1800}(?:grid-template-columns|display\s*:\s*grid|\.desktop-|desktop-nav|margin-left|aside|sidebar|max-width\s*:\s*(?:none|100%|12\d\dpx|14\d\dpx)|width\s*:\s*100%)/i.test(css)

  if (mediaMinWidthCount < 2 || !hasDesktopBreakpoint || (hasMobileOnlyNav && !hidesMobileNavOnWideViewport) || (narrowRootShell && !hasWideViewportExpansion)) {
    const details = [
      mediaMinWidthCount < 2 ? `only ${mediaMinWidthCount} min-width @media rule(s)` : null,
      !hasDesktopBreakpoint ? 'no tablet/desktop breakpoint at 768px+ detected' : null,
      hasMobileOnlyNav && !hidesMobileNavOnWideViewport ? 'mobile/bottom tab navigation is not hidden or replaced on wide viewport' : null,
      narrowRootShell && !hasWideViewportExpansion ? 'root shell appears fixed to mobile width without desktop expansion' : null,
    ].filter(Boolean).join('; ')
    issues.push(`Responsive layout contract failed: ${details}. HTML must visibly switch between mobile, tablet, and desktop layouts in the iframe.`)
  }

  const requiredVars = [
    '--aide-page-padding',
    '--aide-section-gap',
    '--aide-card-padding',
    '--aide-card-gap',
    '--aide-card-radius',
    '--aide-item-gap',
  ]
  const missingVars = requiredVars.filter(name => !css.includes(name))
  if (missingVars.length > 0) {
    issues.push(`Missing semantic rhythm variables in :root: ${missingVars.join(', ')}. These must be declared and used throughout all padding/gap/border-radius properties.`)
  }

  // Detect hardcoded spacing values that should use contract variables
  // calc()/clamp()/min()/max() 내부의 px는 의도된 수식이므로 제외
  const cssWithoutFunctions = css.replace(/(?:calc|clamp|min|max)\([^)]+\)/g, '__fn__')
  const arbitraryMatches = [...cssWithoutFunctions.matchAll(/(^|[;\n]\s*)(padding|margin|gap|row-gap|column-gap)\s*:\s*([^;{}]+);/g)]
  const arbitraryValues = arbitraryMatches
    .map(match => ({ prop: match[2], value: match[3].trim() }))
    .filter(({ value }) =>
      !value.includes('var(--aide-') &&
      !value.includes('var(--spacing-') &&
      !value.includes('var(--rounded-') &&
      !/^(0|0px|auto|100%|none|inherit|unset|fit-content|initial)$/.test(value) &&
      /\d+px/.test(value)
    )

  if (arbitraryValues.length > 5) {
    const samples = arbitraryValues
      .slice(0, 6)
      .map(item => `${item.prop}: ${item.value}`)
      .join('; ')
    issues.push(`Too many hardcoded px values in padding/margin/gap instead of contract variables (${arbitraryValues.length}). Use var(--aide-card-padding), var(--aide-section-gap), var(--aide-item-gap) etc. Samples: ${samples}.`)
  }

  const cardRadiusValues = [...css.matchAll(/(?:\.|-)card[^{]*\{[^}]*border-radius\s*:\s*([^;{}]+);/gi)]
    .map(match => match[1].trim())
    .filter(Boolean)
  const uniqueCardRadius = new Set(cardRadiusValues)
  if (uniqueCardRadius.size > 2) {
    issues.push(`Card radius is inconsistent across card-like selectors: ${[...uniqueCardRadius].slice(0, 5).join(', ')}.`)
  }

  // Detect overuse of large spacing tokens in margin/padding (section-level spacing should use parent flex gap)
  const largeSpacingTokens = ['var(--spacing-3xl)', 'var(--spacing-4xl)', 'var(--spacing-5xl)', 'var(--spacing-6xl)', 'var(--spacing-section)']
  const largeSpacingMatches = [...css.matchAll(/(^|[;\n]\s*)(margin|padding)(-top|-bottom|-left|-right)?\s*:\s*([^;{}]+);/gi)]
    .filter(m => largeSpacingTokens.some(tok => m[4]?.includes(tok)))
    .map(m => `${m[2]}${m[3] ?? ''}: ${m[4]?.trim()}`)
  if (largeSpacingMatches.length > 0) {
    issues.push(`Large spacing tokens used directly in margin/padding instead of parent flex gap (${largeSpacingMatches.length} instance${largeSpacingMatches.length > 1 ? 's' : ''}). Use .aide-page flex gap instead. Examples: ${largeSpacingMatches.slice(0, 3).join('; ')}.`)
  }

  // Detect sections/aide-section with direct margin-top/bottom that override parent flex gap
  const sectionMarginMatches = [...css.matchAll(/(?:section|\.aide-section)[^{]*\{([^}]*)\}/gi)]
    .flatMap(m => {
      const body = m[1]
      return [...body.matchAll(/(margin-top|margin-bottom|padding-top|padding-bottom)\s*:\s*([^;]+);/gi)]
        .filter(p => !/^(0|0px|auto|inherit|unset|initial)$/.test(p[2].trim()))
        .map(p => `${p[1]}: ${p[2].trim()}`)
    })
  if (sectionMarginMatches.length > 0) {
    issues.push(`Section elements have direct margin/padding-top/bottom values that fight parent flex gap. Remove them and rely on aide-page gap only. Found: ${sectionMarginMatches.slice(0, 3).join('; ')}.`)
  }

  // HERO_3D 이미지가 object-fit:cover로 생성되면 투명 배경이 배경색으로 채워짐
  if (html.includes('%%HERO_3D:') || html.includes('HERO_3D')) {
    const heroImgBlocks = [...html.matchAll(/<img[^>]*%%HERO_3D[^>]*>/gi)]
    const hasWrongFit = heroImgBlocks.some(m => /object-fit\s*:\s*cover/i.test(m[0]))
    if (hasWrongFit) {
      issues.push('HERO_3D image has object-fit:cover which clips the transparent background object. Use object-fit:contain instead.')
    }
  }

  return issues
}

async function enforceStaticDesignContract(
  html: string,
  params: {
    brief: string
    designMd: string
    apiKey?: string
    logoDataUrl?: string | null
    domain?: AppDomain
    hasBrandColors?: boolean
  },
): Promise<{ html: string; refined: boolean; issues: string[] }> {
  let nextHtml = injectDesignContractStyle(html, params.designMd, params.hasBrandColors)
  const issues = collectStaticDesignContractIssues(nextHtml)
  const shouldRefine = issues.length > 0 && issues.some(issue =>
    issue.includes('Too many hardcoded') ||
    issue.includes('Card radius') ||
    issue.includes('Missing semantic') ||
    issue.includes('Device mockup shell') ||
    issue.includes('Responsive layout contract') ||
    issue.includes('Section elements have direct margin')
  )

  if (!shouldRefine) return { html: nextHtml, refined: false, issues }

  const message = `생성된 HTML/CSS가 선택된 DESIGN.md의 rhythm contract에서 벗어났습니다. 아래 정적 검사 이슈를 고치세요:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

수정 기준:
- :root의 --aide-page-padding / --aide-section-gap / --aide-card-padding / --aide-card-gap / --aide-card-radius / --aide-button-height / --aide-input-height 변수를 유지하고 실제 섹션·카드·버튼·인풋에 재사용하세요.
- 동일 컴포넌트 타입은 같은 padding, gap, radius, border/shadow 정책을 사용하세요.
- DESIGN.md에 없는 새로운 spacing scale, radius scale, shadow, hex color를 만들지 마세요.
- 폰/태블릿 목업, 베젤, 노치, 상태바, 홈 인디케이터, 하드웨어 wrapper를 전부 제거하세요. HTML은 기기 안에 들어가는 화면이 아니라 화면 그 자체여야 합니다.
- 모바일/태블릿/데스크탑 반응형을 실제 CSS로 구현하세요. 최소 2개 이상의 min-width @media를 작성하고, 768px 이상에서는 모바일 하단 탭바를 숨기거나 상단/좌측 내비로 대체하며, 1024px 이상에서는 2~4컬럼 또는 사이드바/넓은 콘텐츠 영역으로 확장하세요.
- 최상위 shell/container를 390~520px 폭으로만 고정하지 마세요. 모바일에서는 100%, 태블릿/데스크탑에서는 grid/flex/minmax/clamp로 확장해야 합니다.
- 이미지 src, 3D placeholder, Unsplash placeholder, 데이터 URL, 텍스트 콘텐츠, 화면 구조는 유지하세요.
- 시각 완성도는 유지하되 간격/정렬/카드 리듬만 계약에 맞게 정리하세요.`

  try {
    nextHtml = await refineUI(nextHtml, message, params.brief, params.designMd, params.apiKey, params.logoDataUrl, params.domain)
    nextHtml = injectDesignContractStyle(nextHtml, params.designMd, params.hasBrandColors)
    return { html: nextHtml, refined: true, issues }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.warn('[gemini] static design contract refine skipped:', msg)
    return { html: nextHtml, refined: false, issues }
  }
}

function buildReverseTokenMap(tokens: DesignTokenMap, prefix: string): Map<string, string> {
  const result = new Map<string, string>()
  const seen = new Map<string, string>()
  for (const [key, val] of Object.entries(tokens)) {
    if (!val || !/^\d+(\.\d+)?px$/.test(val)) continue
    if (seen.has(val)) {
      result.delete(val)
    } else {
      seen.set(val, key)
      result.set(val, `var(--${prefix}-${key})`)
    }
  }
  return result
}

function patchCssTokens(
  css: string,
  spacingMap: Map<string, string>,
  roundedMap: Map<string, string>
): string {
  const spacingEntries = [...spacingMap.entries()].sort((a, b) => b[0].length - a[0].length)
  const roundedEntries = [...roundedMap.entries()].sort((a, b) => b[0].length - a[0].length)
  const lines = css.split('\n')
  let inRoot = false
  return lines.map(line => {
    const trimmed = line.trim()
    if (!inRoot && /:root\s*\{/.test(trimmed)) { inRoot = true; return line }
    if (inRoot) { if (trimmed === '}') inRoot = false; return line }
    if (spacingMap.size > 0 && /\b(padding|margin|gap|top|right|bottom|left|inset|row-gap|column-gap)\s*:/i.test(trimmed)) {
      for (const [px, varRef] of spacingEntries) {
        line = line.replace(new RegExp(`\\b${px.replace('.', '\\.')}\\b`, 'g'), varRef)
      }
    }
    if (roundedMap.size > 0 && /border-radius\s*:/i.test(trimmed)) {
      for (const [px, varRef] of roundedEntries) {
        line = line.replace(new RegExp(`\\b${px.replace('.', '\\.')}\\b`, 'g'), varRef)
      }
    }
    return line
  }).join('\n')
}

function auditSpacingTokens(html: string, contract: DesignRhythmContract | null): string {
  if (!contract) return html
  const spacingMap = buildReverseTokenMap(contract.spacing, 'spacing')
  const roundedMap = buildReverseTokenMap(contract.rounded, 'rounded')
  if (spacingMap.size === 0 && roundedMap.size === 0) return html
  return html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, css, close) =>
    open + patchCssTokens(css, spacingMap, roundedMap) + close
  )
}

const AIDE_LOGO_SLOT_HTML = '<span class="aide-logo-slot" aria-label="brand logo"></span>'
const AIDE_LOGO_STYLE = 'height:22px;max-height:22px;max-width:88px;width:auto;object-fit:contain;display:block;flex-shrink:0;'

function buildLogoGuardStyle(): string {
  return `<style data-aide-logo-guard="1">
.aide-brand-logo {
  height: 22px !important;
  max-height: 22px !important;
  max-width: 88px !important;
  min-width: 28px !important;
  width: auto !important;
  object-fit: contain !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  flex: 0 0 auto !important;
  position: relative !important;
  z-index: 1000 !important;
}
header .aide-brand-logo,
nav .aide-brand-logo,
.app-bar .aide-brand-logo,
.appbar .aide-brand-logo,
.gnb .aide-brand-logo,
.header .aide-brand-logo,
.top-bar .aide-brand-logo,
.top-nav .aide-brand-logo,
.nav-bar .aide-brand-logo,
.toolbar .aide-brand-logo,
.app-header .aide-brand-logo,
.page-header .aide-brand-logo,
.mobile-header .aide-brand-logo,
.screen-header .aide-brand-logo {
  margin-right: 10px !important;
}
.aide-logo-slot,
.brand-slot {
  display: flex !important;
  align-items: center !important;
  min-width: 54px !important;
  min-height: 28px !important;
  flex: 0 0 auto !important;
}
</style>`
}

function injectLogoGuardStyle(html: string): string {
  const cleaned = html.replace(/<style\b[^>]*data-aide-logo-guard=["'][^"']*["'][^>]*>[\s\S]*?<\/style>/gi, '')
  const guard = buildLogoGuardStyle()
  if (/<\/head>/i.test(cleaned)) return cleaned.replace(/<\/head>/i, `${guard}</head>`)
  return guard + cleaned
}

function buildLogoImg(logoDataUrl: string): string {
  return `<img src="${logoDataUrl}" alt="logo" class="aide-brand-logo" style="${AIDE_LOGO_STYLE}" />`
}

function normalizeLogoImgTag(tag: string): string {
  let next = tag
    .replace(/\s(?:width|height)=["'][^"']*["']/gi, '')
    .replace(/\sstyle=["'][^"']*["']/gi, '')
  if (/\sclass=["'][^"']*["']/i.test(next)) {
    next = next.replace(/\sclass=(["'])([^"']*)\1/i, (_m, q, classes) => {
      const merged = Array.from(new Set(`${classes} aide-brand-logo`.split(/\s+/).filter(Boolean))).join(' ')
      return ` class=${q}${merged}${q}`
    })
  } else {
    next = next.replace(/<img\b/i, '<img class="aide-brand-logo"')
  }
  return next.replace(/\s*\/?>$/, match => ` style="${AIDE_LOGO_STYLE}"${match.trim().startsWith('/') ? ' />' : '>'}`)
}

function injectLogoIntoChrome(html: string, logoDataUrl: string): string {
  const logoImg = buildLogoImg(logoDataUrl)
  const brandSlotPattern = /<div\b(?=[^>]*class=(["'])[^"']*\bbrand-slot\b[^"']*\1)[^>]*>\s*<\/div>/i
  if (brandSlotPattern.test(html)) {
    return html.replace(brandSlotPattern, `<div class="brand-slot">${logoImg}</div>`)
  }
  const brandTextPattern = /(<(?:strong|b|span|h1|h2|p)\b(?=[^>]*(?:class=(["'])[^"']*(?:brand|logo|title|name)[^"']*\2|aria-label=(["'])brand\3))[^>]*>)/i
  if (brandTextPattern.test(html)) return html.replace(brandTextPattern, (match) => match + logoImg)
  const headerPattern = /(<(?:header|nav)\b[^>]*>|<div\b[^>]*class=(["'])[^"']*(?:global-nav|app-bar|appbar|gnb|header|top-bar|top-nav|nav-bar|toolbar|app-header|page-header|mobile-header|screen-header)[^"']*\2[^>]*>)/i
  if (headerPattern.test(html)) return html.replace(headerPattern, (match) => match + logoImg)
  if (/<body\b[^>]*>/i.test(html)) return html.replace(/(<body\b[^>]*>)/i, (match) => match + logoImg)
  return logoImg + html
}

function replaceLogoSlots(html: string, logoDataUrl: string): { html: string; used: boolean } {
  const logoImg = buildLogoImg(logoDataUrl)
  let used = false
  // Replace ALL logo slots across all screens (not just the first one)
  let next = html.replace(/<(div|span)\b(?=[^>]*class=(["'])[^"']*\baide-logo-slot\b[^"']*\2)[^>]*>[\s\S]*?<\/\1>/gi, () => {
    used = true
    return logoImg
  })
  next = next.replace(/<(div|span)\b(?=[^>]*class=(["'])[^"']*\baide-logo-slot\b[^"']*\2)[^>]*\/>/gi, () => {
    used = true
    return logoImg
  })
  next = next.replace(/<img\b(?=[^>]*class=(["'])[^"']*\baide-logo-slot\b[^"']*\1)[^>]*>/gi, () => {
    used = true
    return logoImg
  })
  return { html: next, used }
}

const MATERIAL_SYMBOLS_CSS = `<style id="aide-material-symbols">
@font-face {
  font-family: 'Material Symbols Rounded';
  font-style: normal;
  font-weight: 100 700;
  font-display: block;
  src: url('/material-symbols-rounded.woff2') format('woff2');
}
.material-symbols-rounded {
  font-family: 'Material Symbols Rounded';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>`

function injectMaterialSymbolsFont(html: string): string {
  if (html.includes('id="aide-material-symbols"')) return html
  if (/material.symbols.rounded/i.test(html)) return html  // CDN 링크 이미 있으면 스킵
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${MATERIAL_SYMBOLS_CSS}\n</head>`)
  if (/<body/i.test(html)) return html.replace(/<body/i, `${MATERIAL_SYMBOLS_CSS}\n<body`)
  return MATERIAL_SYMBOLS_CSS + '\n' + html
}

function injectLayoutEssentialsGuard(html: string, blueprint?: LayoutBlueprint): string {
  // aide.md 셸 클래스를 쓰면 blueprint가 없어도 셸 강제를 적용한다 (draft 포함).
  // 랜딩/문서형처럼 셸이 없는 HTML은 body 스크롤을 방해하지 않도록 강제를 건너뛴다.
  const usesAppShell = /class=["'][^"']*\b(?:app-shell|scroll-body|aide-page|mobile-shell|page-shell|home-screen)\b/.test(html)
  if (!blueprint && !usesAppShell) return html
  // blueprint가 없을 땐 aide.md 기본 모바일 셸(상단 고정 + 하단 탭)을 가정한다.
  const hasTopNav = blueprint ? (blueprint.navType === 'gnb' || blueprint.sections.some(section => section.role === 'nav')) : true
  const hasBottomTab = blueprint ? (blueprint.navType === 'bottom-tab' || blueprint.sections.some(section => section.role === 'tabbar')) : true
  const hasLnb = blueprint ? blueprint.navType === 'lnb' : false
  const css = `<style data-aide-layout-essentials="1">
html, body { min-height:100%; }
body { overflow:hidden !important; }
.app-shell,[data-layout-variant],.app,.screen,.phone-screen,.mobile-shell,.page-shell,.home-screen { min-height:100dvh; height:100dvh; display:flex; flex-direction:column; overflow:hidden; }
.content-scroll,.page-scroll,.aide-page,.scroll-body,main[data-blueprint-scroll="content"],main,.main-content,.content,.scroll-content {
  flex:1 1 auto;
  min-height:0;
  overflow-y:auto !important;
  overflow-x:hidden !important;
  -webkit-overflow-scrolling:touch;
}
.top-navigation { position:sticky !important; top:0 !important; z-index:80 !important; flex:0 0 auto !important; }
.bottom-navigation { position:fixed !important; left:0 !important; right:0 !important; bottom:0 !important; z-index:80 !important; }
.aide-hero-3d,.aide-3d-asset {
  filter:none !important;
  mix-blend-mode:normal !important;
}
.aide-visual-stage,.hero-visual,.scene-visual,.mascot-stage,.reward-stage {
  isolation:isolate;
}
${hasTopNav && !hasLnb ? `
.app-header,.global-nav[data-blueprint-role="nav"],header[data-blueprint-role="nav"],[data-blueprint-section][data-blueprint-role="nav"] {
  position:sticky !important;
  top:0 !important;
  z-index:80 !important;
  flex:0 0 auto !important;
}` : ''}
${hasLnb ? `
.app-lnb,.global-nav[data-blueprint-role="nav"],aside[data-blueprint-role="nav"] {
  position:fixed !important;
  left:0 !important;
  top:0 !important;
  bottom:0 !important;
  z-index:80 !important;
}
.app-shell,[data-layout-variant] { padding-left:240px; }` : ''}
${hasBottomTab ? `
.mobile-tabbar,[data-blueprint-role="tabbar"] {
  position:fixed !important;
  left:0 !important;
  right:0 !important;
  bottom:0 !important;
  z-index:80 !important;
}
.content-scroll,.page-scroll,.aide-page,main[data-blueprint-scroll="content"],main,.main-content,.content,.scroll-content {
  padding-bottom:calc(var(--aide-tabbar-height,72px) + env(safe-area-inset-bottom) + var(--aide-section-gap,20px)) !important;
}` : ''}
</style>`
  const cleaned = html.replace(/<style\b[^>]*data-aide-layout-essentials=["'][^"']*["'][^>]*>[\s\S]*?<\/style>/gi, '')
  if (/<\/head>/i.test(cleaned)) return cleaned.replace(/<\/head>/i, `${css}\n</head>`)
  return css + cleaned
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ensureRequiredVariantVisuals(html: string, options: {
  variantStyle?: string
  sharedVisualSubject?: string
  heroImagePrompt?: string
  layoutBlueprint?: LayoutBlueprint
  visualPolicy?: VariantVisualPolicy
}): string {
  const variant = getVariantLabel(options.variantStyle)
  const policy = options.visualPolicy ?? (variant === 'B' ? 'creon-object-3d' : undefined)
  if (policy !== 'scene-3d' && policy !== 'creon-object-3d') return html

  const subject = (options.sharedVisualSubject || options.heroImagePrompt || 'service 3D visual').replace(/[%"]/g, '').trim()
  const cleanSubject = subject || 'service 3D visual'
  const requiredPlaceholder = policy === 'scene-3d'
    ? `%%SCENE_3D:${cleanSubject}%%`
    : `%%HERO_3D:${cleanSubject}%%`
  const requiredRegex = policy === 'scene-3d'
    ? /%%(?:SCENE_3D|SHARED_HERO_3D_SCENE|HERO_SCENE_3D)(?::[^%]+)?%%/
    : /%%(?:HERO_3D|SHARED_HERO_3D|MASCOT_3D|REWARD_OBJECT_3D|HERO_3D_IMAGE)(?::[^%]+)?%%/

  if (requiredRegex.test(html)) {
    return policy === 'creon-object-3d'
      ? html.replace(/\baide-hero-scene-img\b/g, '').replace(/object-fit\s*:\s*cover/gi, 'object-fit:contain')
      : html
  }

  const any3dRegex = /%%(?:SCENE_3D|HERO_3D|SHARED_HERO_3D_SCENE|SHARED_HERO_3D|HERO_SCENE_3D|MASCOT_3D|REWARD_OBJECT_3D|HERO_3D_IMAGE)(?::[^%]+)?%%/g
  if (any3dRegex.test(html)) {
    const normalized = html.replace(any3dRegex, requiredPlaceholder)
    return policy === 'creon-object-3d'
      ? normalized.replace(/\baide-hero-scene-img\b/g, '').replace(/object-fit\s*:\s*cover/gi, 'object-fit:contain')
      : normalized
  }

  const visualHtml = policy === 'scene-3d'
    ? `<div class="aide-visual-stage aide-generated-3d-stage hero-scene" data-aide-required-visual="scene-3d" style="position:relative;height:clamp(300px,45vw,380px);overflow:hidden;border-radius:var(--aide-card-radius,12px);">
  <img class="aide-hero-3d aide-hero-scene-img" src="${requiredPlaceholder}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;" />
  <div class="hero-overlay" style="position:absolute;bottom:0;left:0;right:0;padding:20px 16px;background:linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 100%);color:#fff;"></div>
</div>`
    : `<div class="aide-visual-stage aide-generated-3d-stage" data-aide-required-visual="creon-object-3d" style="position:relative;overflow:hidden;min-height:200px;">
  <img class="aide-hero-3d aide-3d-asset" src="${requiredPlaceholder}" alt="" style="position:absolute;right:-6%;bottom:-10%;width:clamp(200px,56%,320px);height:130%;object-fit:contain;display:block;" />
</div>`

  const heroSectionId = options.layoutBlueprint?.sections.find(section => section.role === 'hero')?.id
  if (heroSectionId) {
    const heroSectionPattern = new RegExp(`(<section\\b(?=[^>]*data-blueprint-section=(["'])${escapeRegexLiteral(heroSectionId)}\\2)[^>]*>)`, 'i')
    if (heroSectionPattern.test(html)) {
      return html.replace(heroSectionPattern, `$1\n${visualHtml}`)
    }
  }

  const heroClassPattern = /(<(?:section|div)\b(?=[^>]*class=(["'])[^"']*(?:hero|visual|main-card|top-card)[^"']*\2)[^>]*>)/i
  if (heroClassPattern.test(html)) return html.replace(heroClassPattern, `$1\n${visualHtml}`)
  if (/<main\b[^>]*>/i.test(html)) return html.replace(/(<main\b[^>]*>)/i, `$1\n${visualHtml}`)
  if (/<body\b[^>]*>/i.test(html)) return html.replace(/(<body\b[^>]*>)/i, `$1\n${visualHtml}`)
  return visualHtml + html
}

function applyLogoDataUrlOnce(html: string, logoDataUrl?: string | null): string {
  if (!logoDataUrl) return html

  let normalized = html.split(logoDataUrl).join('__LOGO_DATA_URL__')
  const slotResult = replaceLogoSlots(normalized, logoDataUrl)
  normalized = slotResult.html
  let used = slotResult.used
  // Replace ALL logo img instances (not just first) — multi-screen HTML has one logo per screen
  normalized = normalized.replace(/<img\b[^>]*src=(["'])__LOGO_DATA_URL__\1[^>]*>/gi, (tag) => {
    used = true
    return normalizeLogoImgTag(tag).replace('__LOGO_DATA_URL__', logoDataUrl)
  })

  if (!used) {
    const firstIdx = normalized.indexOf('__LOGO_DATA_URL__')
    if (firstIdx !== -1) {
      // Placeholder exists outside an img src. Remove it and inject a real visible logo into chrome.
      normalized = normalized.split('__LOGO_DATA_URL__').join('')
      normalized = injectLogoIntoChrome(normalized, logoDataUrl)
    } else {
      // AI didn't place the logo at all → inject into first header/nav/app-bar element
      normalized = injectLogoIntoChrome(normalized, logoDataUrl)
    }
  }

  return injectLogoGuardStyle(normalized.split('__LOGO_DATA_URL__').join(''))
}

function extractServiceNameFromBrief(brief: string): string | null {
  const clean = brief
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')

  const normalize = (value: string | undefined): string | null => {
    const candidate = value
      ?.replace(/^[\s\d.)-]+/g, '')
      .replace(/[.。,:;，、]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!candidate || candidate.length < 2 || candidate.length > 30) return null
    if (/^(앱|서비스|플랫폼|웹앱|모바일|홈|메인|대시보드)$/i.test(candidate)) return null
    return candidate
  }

  const patterns = [
    /앱\s*이름은\s*[“"']([^”"']{2,30})[”"']/,
    /서비스\s*이름은\s*[“"']([^”"']{2,30})[”"']/,
    /이름은\s*[“"']([^”"']{2,30})[”"']/,
    /앱명은\s*[“"']([^”"']{2,30})[”"']/,
    /(?:^|[\n])\s*(?:\d+[.)]\s*)?([가-힣A-Za-z0-9][가-힣A-Za-z0-9\s&()+._-]{1,30}?)\s*(?:앱|서비스|플랫폼|웹앱)\b/,
  ]
  for (const pattern of patterns) {
    const match = clean.match(pattern)
    const serviceName = normalize(match?.[1])
    if (serviceName) return serviceName
  }
  return null
}

function sanitizeGeneratedBranding(html: string, brief: string, designMd?: string, logoDataUrl?: string | null): string {
  const explicitServiceName = extractServiceNameFromBrief(brief)
  const inferredServiceName = html.match(/>\s*([가-힣A-Za-z0-9]{2,14})\s*<(?:\/(?:span|strong|b|em|p|h1|h2|h3))?/i)?.[1]?.trim()
  const serviceName = explicitServiceName ?? (inferredServiceName && !/\bkt\s*ds\b|완료|생성|홈|마이|스토어|루틴|다이어리/i.test(inferredServiceName) ? inferredServiceName : 'Aide')
  let next = html

  // If no logo was uploaded, remove broken pseudo-logo images such as <img src="FreshFit" alt="FreshFit">.
  if (!logoDataUrl && serviceName) {
    const escaped = serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const brokenBrandImg = new RegExp(`<img\\b(?=[^>]*(?:src=(["'])${escaped}\\1|alt=(["'])${escaped}\\2))[^>]*>`, 'gi')
    next = next.replace(brokenBrandImg, `<span class="aide-text-brand">${serviceName}</span>`)
  }

  // KTDS is a design system preset here, not the generated service brand.
  const briefMentionsKtds = /\bkt\s*ds\b|ktds/i.test(brief)
  const designIsKtds = /\bkt\s*ds\b|ktds/i.test(designMd ?? '')
  if (serviceName && designIsKtds && !briefMentionsKtds) {
    const replacementBrand = logoDataUrl ? AIDE_LOGO_SLOT_HTML : `<span class="aide-text-brand">${serviceName}</span>`
    next = next.replace(/>([^<]*)(?:\bkt\s*ds\b|ktds)([^<]*)</gi, (_match, before, after) => {
      const compactBefore = String(before ?? '').replace(/\s+$/g, '')
      const compactAfter = String(after ?? '').replace(/^\s+/g, '')
      return `>${compactBefore}${serviceName}${compactAfter}<`
    })
    next = next.replace(/(aria-label|alt|title)=(["'])[^"']*(?:\bkt\s*ds\b|ktds)[^"']*\2/gi, `$1=$2${serviceName}$2`)
    next = next.replace(/<img\b(?=[^>]*(?:\bkt\s*ds\b|ktds|kt-ds))[^>]*>/gi, replacementBrand)
    next = next.replace(/<svg\b(?=[^>]*(?:\bkt\s*ds\b|ktds|kt-ds))[\s\S]*?<\/svg>/gi, replacementBrand)
  }

  return next
}

const KO_TO_EN_MAP: Array<[RegExp, string]> = [
  // 동물 캐릭터
  [/강아지|강아지\s*캐릭터|강아지\s*마스코트/i, 'cute dog mascot'],
  [/고양이|고양이\s*캐릭터/i, 'cute cat mascot'],
  [/토끼|토끼\s*캐릭터/i, 'cute rabbit character'],
  [/곰|곰\s*캐릭터|곰돌이/i, 'cute bear mascot'],
  [/펭귄/i, 'cute penguin character'],
  [/공룡|공룡\s*캐릭터/i, 'cute dinosaur mascot'],
  [/로봇/i, 'friendly robot mascot'],
  [/우주인|우주\s*캐릭터/i, 'cute astronaut character'],
  [/여우/i, 'cute fox character'],
  [/너구리/i, 'cute raccoon character'],
  [/고슴도치/i, 'cute hedgehog character'],
  [/오리/i, 'cute duck character'],
  // 식물 도메인
  [/반려\s*식물|원예|꽃\s*화분/i, 'cute potted flower plant'],
  [/식물|화분|선인장|몬스테라|다육/i, 'cute potted plant'],
  // 음식/배달 도메인
  [/피자/i, 'glossy 3D pizza'],
  [/햄버거|버거/i, 'glossy 3D burger'],
  [/음식\s*배달|배달/i, 'cute delivery scooter'],
  [/커피|카페/i, 'glossy 3D coffee cup'],
  [/도시락|밥|식사/i, 'cute lunch box'],
  // 통신/요금제 도메인
  [/요금제|통신|5G|LTE/i, 'glossy 3D smartphone with signal'],
  [/인터넷|와이파이|wifi/i, 'glossy 3D wifi router'],
  // 멤버십/리워드 도메인
  [/포인트|리워드|마일리지/i, 'glossy 3D reward coin'],
  [/쿠폰|할인|혜택/i, 'glossy 3D coupon card'],
  [/스탬프|도장/i, 'cute stamp card with stars'],
  // 물류/배송 도메인
  [/배송|택배|물류/i, 'cute 3D delivery box'],
  [/트럭|배차/i, 'cute 3D delivery truck'],
  // 건강/피트니스 도메인
  [/운동|헬스|피트니스/i, 'glossy 3D dumbbell'],
  [/다이어트|칼로리/i, 'cute 3D healthy meal bowl'],
  // 금융 도메인
  [/금융|저축|적금/i, 'glossy 3D piggy bank'],
  [/카드|신용카드/i, 'glossy 3D credit card'],
  // 일반 캐릭터
  [/캐릭터/i, 'friendly mascot character'],
  [/마스코트/i, 'friendly mascot'],
]

function translateKoreanSubjectToEnglish(subject: string): string {
  if (!subject) return subject
  // Already English (no Korean characters)
  if (!/[가-힣]/.test(subject)) return subject
  // Try each mapping
  for (const [pattern, english] of KO_TO_EN_MAP) {
    if (pattern.test(subject)) {
      // Preserve any non-Korean suffix (e.g. "강아지 with wings" → "cute dog mascot with wings")
      const suffix = subject.replace(pattern, '').trim()
      return suffix ? `${english} ${suffix}` : english
    }
  }
  // No match: keep as-is, Gemini handles Korean
  return subject
}

export async function resolveImagePlaceholders(
  html: string,
  options: {
    heroImagePrompt?: string;
    heroImageData?: { base64: string; mimeType: string } | null;
    apiKey?: string;
    unsplashKey?: string;
    imageWarnings?: string[];
    paletteHint?: string;
    sceneImageModel?: string;
    heroImageModel?: string;
    sceneCardCover?: boolean;
    onImageEvent?: (label: string) => void;
  } = {}
): Promise<string> {
  const { heroImagePrompt, heroImageData, apiKey, unsplashKey, imageWarnings, paletteHint, sceneImageModel, heroImageModel, sceneCardCover, onImageEvent } = options
  let result = html
  const fallbackVisual = (label: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#eef4ff"/><stop offset="1" stop-color="#dbe8ff"/></linearGradient></defs><rect width="900" height="600" rx="48" fill="url(#g)"/><circle cx="690" cy="150" r="92" fill="#ffffff" opacity=".55"/><circle cx="240" cy="390" r="124" fill="#ffffff" opacity=".38"/><rect x="210" y="260" width="480" height="46" rx="23" fill="#ffffff" opacity=".72"/><rect x="285" y="330" width="330" height="28" rx="14" fill="#ffffff" opacity=".55"/><text x="450" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#6b7da8">${label}</text></svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  // Scene aliases — full background scene (background preserved)
  const sceneMatches = [...result.matchAll(/%%(?:SCENE_3D|SHARED_HERO_3D_SCENE|HERO_SCENE_3D)(?::([^%]+))?%%/g)]
  if (sceneMatches.length > 0) {
    const detail = sceneMatches[0][1]?.trim()
    // heroImagePrompt(서비스 키워드)가 있으면 그것만 사용.
    // detail은 LLM이 HTML placeholder에 넣은 generic 맥락으로, 서비스 키워드와 합치면
    // "피자 주문 colorful stacked balls" 같은 무관한 프롬프트가 생성된다.
    const baseSceneKeyword = extractVisualKeyword(heroImagePrompt || '')
    const sceneKeyword = baseSceneKeyword || detail || 'a helpful digital service companion'
    const subject = buildHeroSubjectForScene(sceneKeyword)
    onImageEvent?.('3D 씬 이미지 생성 요청 중...')
    const sceneMode: HeroImageMode = sceneCardCover ? 'scene-card-cover' : 'scene'
    const generated = await getSharedHeroImage(subject, apiKey, paletteHint, sceneMode, sceneImageModel)
    const src = generated ? `data:${generated.mimeType};base64,${generated.base64}` : fallbackVisual('3D scene')
    if (generated) onImageEvent?.('3D 씬 이미지 생성 완료')
    if (!generated) {
      onImageEvent?.('3D 씬 이미지 생성 실패, fallback visual 적용')
      imageWarnings?.push('3D scene 이미지 생성 실패: fallback visual로 대체됨')
    }
    for (const match of sceneMatches) result = result.split(match[0]).join(src)
  }

  // Transparent object aliases — transparent background hero object/character
  const heroMatches = [...result.matchAll(/%%(?:HERO_3D|SHARED_HERO_3D|MASCOT_3D|REWARD_OBJECT_3D|HERO_3D_IMAGE)(?::([^%]+))?%%/g)]
  if (heroMatches.length > 0) {
    const detail = heroMatches[0][1]?.trim()
    // heroImagePrompt(서비스 키워드)가 있으면 그것만 사용.
    // detail과 합치면 "피자 마스코트 floating bubbles" 같은 무관한 이미지가 생성된다.
    const baseHeroKeyword = extractVisualKeyword(heroImagePrompt || '')
    const rawHeroKeyword = baseHeroKeyword || detail || 'a friendly companion mascot'
    const cleanHeroKeyword = translateKoreanSubjectToEnglish(rawHeroKeyword)
    const heroSubjectPrompt = buildHeroSubjectForHero(cleanHeroKeyword)
    let heroImg = heroImageData ?? null
    if (!heroImg) {
      onImageEvent?.('3D 히어로 이미지 생성 요청 중...')
      heroImg = await getSharedHeroImage(heroSubjectPrompt, apiKey, paletteHint, 'transparent', heroImageModel)
    }
    const heroSrc = heroImg ? `data:${heroImg.mimeType};base64,${heroImg.base64}` : fallbackVisual('3D hero')
    if (heroImg) onImageEvent?.('3D 히어로 이미지 생성 완료')
    if (!heroImg) {
      onImageEvent?.('3D 히어로 이미지 생성 실패, fallback visual 적용')
      imageWarnings?.push('3D hero 이미지 생성 실패: fallback visual로 대체됨')
    }
    for (const match of heroMatches) result = result.split(match[0]).join(heroSrc)
  }

  const imgMatches = [...result.matchAll(/%%IMG_\d+:([^%]+)%%/g)].slice(0, 3)
  if (imgMatches.length > 0) {
    const urls = await Promise.all(
      imgMatches.map(m => fetchUnsplashUrl(m[1].trim(), 900, 600, unsplashKey))
    )
    for (let i = 0; i < imgMatches.length; i++) {
      const full = imgMatches[i][0]
      const desc = imgMatches[i][1].trim()
      const keyword = extractImageKeyword(desc)
      result = result.split(full).join(urls[i] ?? buildCuratedUnsplashUrl(keyword, 900, 600))
    }
  }

  const bareImgMatches = [...result.matchAll(/%%IMG_\d+%%/g)].slice(0, 3)
  if (bareImgMatches.length > 0) {
    const keyword = extractImageKeyword(heroImagePrompt || 'service hero visual')
    const url = await fetchUnsplashUrl(keyword, 900, 600, unsplashKey) ?? buildCuratedUnsplashUrl(keyword, 900, 600)
    for (const match of bareImgMatches) result = result.split(match[0]).join(url)
  }

  const sharedImgMatches = [...result.matchAll(/%%SHARED_IMG:([^:%]+):(\d+):(\d+)%%/g)]
  if (sharedImgMatches.length > 0) {
    const desc = sharedImgMatches[0][1].trim()
    const w = parseInt(sharedImgMatches[0][2])
    const h = parseInt(sharedImgMatches[0][3])
    const url = buildCuratedUnsplashUrl(desc, w, h)
    for (const match of sharedImgMatches) {
      result = result.split(match[0]).join(url)
    }
  }

  // Unsplash 썸네일 플레이스홀더 처리: %%THUMB:keyword:width:height%%
  const thumbMatches = [...result.matchAll(/%%THUMB:([^:%]+):(\d+):(\d+)%%/g)]
  if (thumbMatches.length > 0) {
    const urls = await Promise.all(
      thumbMatches.map(m => fetchUnsplashUrl(m[1].trim(), parseInt(m[2]), parseInt(m[3]), unsplashKey))
    )
    for (let i = 0; i < thumbMatches.length; i++) {
      const full = thumbMatches[i][0]
      const keyword = thumbMatches[i][1].trim()
      const w = thumbMatches[i][2]
      const h = thumbMatches[i][3]
      const url = urls[i] ?? buildCuratedUnsplashUrl(keyword, parseInt(w), parseInt(h))
      result = result.split(full).join(url)
    }
  }

  return result;
}

type HeroImageMode = 'scene' | 'scene-card-cover' | 'transparent'

function extractVisualKeyword(subject: string): string {
  // If subject is already short (user explicitly set it), use as-is
  if (subject.trim().length <= 60 && !subject.includes('\n')) return subject.trim()

  // Look for explicit visual/character hints first (e.g. "3D 캐릭터", "마스코트", "로봇")
  const visualHintMatch = subject.match(/([가-힣a-zA-Z\s]{2,30}(?:캐릭터|마스코트|로봇|character|mascot|robot|scene|씬|배경)[가-힣a-zA-Z\s]{0,20})/i)
  if (visualHintMatch) return visualHintMatch[1].trim().slice(0, 60)

  // Fall back to first clause, stripped of UI/feature text
  return subject
    .split(/[.\n。！!？?]/)[0]
    .replace(/\d[\d,]*\s*(원|%|GB|MB|TB|Mbps|달러|USD)/gi, '')
    .replace(/(핵심 기능|주요 기능|번호이동|위약금|청구서|요금 비교|통신비|절약|할인)[^\n,.]*/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, 60)
}

function buildHeroSubjectForScene(baseSubject?: string, detail?: string): string {
  const raw = [baseSubject, detail].filter(Boolean).join(' ')
  const subject = extractVisualKeyword(raw)
  return `ABSOLUTE RULE — no exceptions:
Generate a PURE VISUAL image. ZERO text, letters, numbers, prices, UI labels, or readable characters of any kind. Any text in the output is an immediate failure.

Subject (one visual concept):
${subject || 'a premium character-led mobile app hero scene'}

Role: immersive 3D hero scene.
Create a complete app hero visual where the character, background, props, lighting, and mood are designed together. The image must include a stylized environment/background. Leave visual safe space for UI text and CTA. Do not make a tiny isolated icon. Do not follow the Creon icon-sheet style; this is a freeform branded scene, not a centered object icon.`
}

function buildHeroSubjectForHero(baseSubject?: string, detail?: string): string {
  const subject = [baseSubject, detail].filter(Boolean).join('\n')
  return `${subject || 'a friendly companion mascot'}

Role: standalone 3D hero object asset.
Create one expressive object/character for use inside an existing UI layout. Keep it visually complete and readable at small size.
ABSOLUTE SHADOW BAN: no baked-in ground shadow, no cast shadow, no contact shadow, no drop shadow, no soft oval under feet, no floor reflection, no gray base, no ambient occlusion blob, no vignette.
The subject must float on a perfectly clean white studio background with no ground plane. The UI layer will add any needed grounding separately.`
}

// 투명 배경 3D 객체의 빈 여백을 잘라내 객체가 bounding box를 꽉 채우게 만든다.
// 모델이 객체를 다소 작게 그려도 trim 후 CSS 사이징이 정확히 먹어, 카드 안에서
// 작은 스티커처럼 떠 보이는 문제(빈 히어로)를 근본적으로 제거한다.
async function trimTransparentPadding(
  base64: string,
  mimeType = 'image/png',
): Promise<{ base64: string; mimeType: string }> {
  try {
    const input = Buffer.from(base64, 'base64')
    // 완전 투명(alpha=0) 가장자리를 잘라낸다.
    const trimmed = await sharp(input)
      .ensureAlpha()
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
      .toBuffer()
    const meta = await sharp(trimmed).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    if (!w || !h) return { base64, mimeType }
    // 객체가 카드 가장자리에 닿지 않도록 소량의 균일 여백(~6%)만 다시 더한다.
    const pad = Math.round(Math.max(w, h) * 0.06)
    const padded = await sharp(trimmed)
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    return { base64: padded.toString('base64'), mimeType: 'image/png' }
  } catch (err) {
    console.warn('[gemini] trimTransparentPadding failed, using original:', err instanceof Error ? err.message : String(err))
    return { base64, mimeType }
  }
}

async function removeHeroImageBackground(
  base64: string,
  mimeType = 'image/png',
): Promise<{ base64: string; mimeType: string }> {
  const original = { base64, mimeType }

  // Guard: empty or suspiciously small base64 → skip removal
  if (!base64 || base64.length < 500) {
    console.warn('[gemini] removeHeroImageBackground: base64 too short, skipping removal')
    return original
  }

  // Guard: validate image dimensions before passing to canvas-based library
  try {
    const imgInfo = await sharp(Buffer.from(base64, 'base64')).metadata()
    if (!imgInfo.width || !imgInfo.height || imgInfo.width === 0 || imgInfo.height === 0) {
      console.warn('[gemini] removeHeroImageBackground: image has zero dimensions, skipping removal')
      return original
    }
  } catch {
    console.warn('[gemini] removeHeroImageBackground: could not read image metadata, skipping removal')
    return original
  }

  const { removeBackground } = await import('@imgly/background-removal')
  const source = Buffer.from(base64, 'base64')
  const blob = new Blob([source], { type: mimeType })
  try {
    const resultBlob = await removeBackground(blob, {
      publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
      model: 'isnet_fp16',
      proxyToWorker: false,
      output: { format: 'image/png', quality: 0.9 },
    })
    const arrayBuffer = await resultBlob.arrayBuffer()
    return {
      base64: Buffer.from(arrayBuffer).toString('base64'),
      mimeType: resultBlob.type || 'image/png',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[gemini] imgly background removal failed, using studio-white fallback:', message)
    return removeWhiteStudioBackground(original.base64)
  }
}

async function removeWhiteStudioBackground(
  base64: string,
): Promise<{ base64: string; mimeType: string }> {
  const input = Buffer.from(base64, 'base64')
  const image = sharp(input).ensureAlpha()
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0

  const isStudioWhite = (idx: number) => {
    const offset = idx * channels
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    const min = Math.min(r, g, b)
    const max = Math.max(r, g, b)
    const chroma = max - min
    const avg = (r + g + b) / 3
    // Remove connected white/near-white studio floor and soft shadow pixels.
    return (min >= 220 && chroma <= 34) || (avg >= 198 && chroma <= 22)
  }

  const push = (idx: number) => {
    if (idx < 0 || idx >= visited.length || visited[idx] || !isStudioWhite(idx)) return
    visited[idx] = 1
    queue[tail++] = idx
  }

  for (let x = 0; x < width; x++) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    push(y * width)
    push(y * width + width - 1)
  }

  while (head < tail) {
    const idx = queue[head++]
    const x = idx % width
    const y = Math.floor(idx / width)
    if (x > 0) push(idx - 1)
    if (x < width - 1) push(idx + 1)
    if (y > 0) push(idx - width)
    if (y < height - 1) push(idx + width)
  }

  for (let idx = 0; idx < visited.length; idx++) {
    if (!visited[idx]) continue
    const offset = idx * channels
    data[offset + 3] = 0
  }

  const output = await sharp(data, { raw: { width, height, channels } }).png().toBuffer()
  return {
    base64: output.toString('base64'),
    mimeType: 'image/png',
  }
}

function extractPaletteHint(contract: Pick<DesignRhythmContract, 'colors'>): string {
  const { colors } = contract
  const pairs: string[] = []
  const picks: [string, string[]][] = [
    ['primary', ['primary', 'action', 'accent']],
    ['surface', ['surface', 'card']],
    ['background', ['background', 'bg', 'page-bg', 'fill', 'primary-fill-neutral']],
    ['text', ['text', 'on-surface', 'foreground', 'body']],
  ]
  for (const [label, keys] of picks) {
    const found = keys.map(k => colors[k]).find(Boolean)
    if (found) pairs.push(`${label}: ${found}`)
  }
  return pairs.join(', ')
}

export function extractDesignPaletteHint(designMd?: string): string {
  if (!designMd) return ''
  const yaml = extractYamlFrontmatter(designMd)
  return extractPaletteHint({ colors: parseSimpleTokenMap(yaml, 'colors') })
}

const sharedHeroImageCache = new Map<string, Promise<{ base64: string; mimeType: string } | null>>()

function getSharedHeroImage(
  subject: string,
  apiKey?: string,
  paletteHint?: string,
  mode: HeroImageMode = 'transparent',
  modelOverride?: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const key = `${mode}::${modelOverride ?? 'auto'}::${subject.trim().toLowerCase()}::${paletteHint ?? ''}`.slice(0, 500)
  const cached = sharedHeroImageCache.get(key)
  if (cached) return cached
  const promise = generateHeroImage(subject, apiKey, mode, paletteHint, modelOverride)
  sharedHeroImageCache.set(key, promise)
  return promise
}

function loadCreonStyleBase(): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'creon-style.md'), 'utf-8')
    const match = raw.match(/```json\n([\s\S]*?)```/)
    if (!match) return {}
    return JSON.parse(match[1]) as Record<string, unknown>
  } catch {
    return {}
  }
}

const CREON_STYLE_FALLBACK: Record<string, unknown> = {
  style: "cute isometric 3D icon, glossy plastic, soft studio lighting, clean rounded geometry, Creon-quality premium app icon",
  camera: "isometric 30-degree bird's-eye view, subject centered, ZOOMED IN so the subject fills 80-88% of the frame with tight even padding (~8%)",
  background: "pure white #ffffff studio background, no floor plane, no environment",
  composition: "single standalone object as the dominant hero, no text, no labels, no UI elements, no scene environment",
  output: "1:1 square composition, transparent background preferred, high quality premium render",
}

function buildCreon3DPrompt(subject: string, paletteHint?: string): string {
  const fileBase = loadCreonStyleBase()
  // creon-style.md 없거나 비어 있으면 CREON_STYLE_FALLBACK으로 스타일 보장
  const base = Object.keys(fileBase).length > 0 ? fileBase : CREON_STYLE_FALLBACK

  const prompt = {
    ...base,
    subject: subject || 'a friendly robot',
    // 피사체가 프레임을 꽉 채우도록 ZOOM IN을 명시 강제 (base의 framing을 덮어씀).
    // 작게 그린 뒤 CSS로 키우는 방식은 여백째 커져서 실패했었음 → 생성 단계에서 크게 그리고,
    // 추가로 trimTransparentPadding()이 투명 여백을 잘라 객체가 카드 visual zone을 채우게 한다.
    composition: {
      ...((base.composition as Record<string, unknown>) ?? {}),
      framing: "ZOOM IN. The subject fills 80-88% of the frame, centered, tight even padding (~8%). Never render the subject as a small element in a large empty canvas.",
      density: "subject-dominant, balanced negative space",
    },
    lighting: {
      ...(base.lighting as Record<string, unknown> ?? {}),
      shadows: "no ground shadow, no cast shadow, no contact shadow, no drop shadow, no soft oval under feet, no floor reflection, no ambient occlusion blob",
    },
    background_rules: "ABSOLUTE: white studio background only. The object must float with zero ground plane. No shadow baked into the image.",
    colors: {
      ...(base.colors as Record<string, unknown> ?? {}),
      ...(paletteHint ? { brand_palette_hint: `Harmonize with app palette: ${paletteHint}` } : {}),
    },
  }
  return JSON.stringify(prompt, null, 2)
}

function buildFreeformScene3DPrompt(subject: string, paletteHint?: string, mode: 'ambient' | 'card-cover' = 'ambient'): string {
  const cleanSubject = extractVisualKeyword(subject)
  if (mode === 'card-cover') {
    return `ABSOLUTE RULE — no exceptions:
Generate a PURE VISUAL image with ZERO text, letters, numbers, prices, UI labels, buttons, icons with labels, or any readable characters. Any text in the output is an immediate failure.

Create a premium full-bleed 3D scene for a mobile app hero card cover background.

Visual subject and scene context:
${cleanSubject || 'a friendly digital service companion in a vibrant environment'}

Art direction:
- Render as a modern glossy 3D scene with soft clay/plastic forms, polished app-brand quality, and contemporary mobile product art direction.
- Creon-adjacent quality: clean, premium, cute/friendly when appropriate, with refined rounded geometry and studio lighting. Rich scene with character, environment, props, and atmospheric depth.
- This image IS the full-bleed background of a mobile card. Fill the entire frame with a rich, well-composed scene.
- CRITICAL COMPOSITION: The main subject (character, mascot, object) should be positioned in the upper-center or left-center area occupying roughly 40-65% of the frame height. Keep the upper 65% visually rich and lit.
- CRITICAL BOTTOM ZONE: The lower 35% of the image must transition naturally to darker tones — use environmental depth, shadows, ground/grass/soil, or atmospheric darkening. This zone will have white text overlaid on top of it. Do NOT use hard vignette; use natural scene depth.
- The scene should convey product state, emotion, growth, reward, or companion context — not a generic wallpaper.
- Use rich environmental storytelling: sky, clouds, ground, props, ambient particles, magical elements — whatever fits the subject.
- Lighting: bright and readable in the upper area, naturally dimming toward the bottom. Soft volumetric atmosphere.
- Avoid: sparse compositions, tiny subjects, gray plastic, stiff characters, low-poly, muddy lighting, old game render, generic stock 3D.
${paletteHint ? `- Harmonize with this app palette: ${paletteHint}` : ''}

Output: PNG image, square or 4:3 portrait composition preferred (fills a tall mobile card), high quality, premium 3D render. NO TEXT anywhere in the image.`
  }

  return `ABSOLUTE RULE — no exceptions:
Generate a PURE VISUAL image with ZERO text, letters, numbers, prices, UI labels, buttons, icons with labels, or any readable characters. Any text in the output is an immediate failure.

Create a polished 16:9 3D scene layer for a digital product UI.

Visual subject and scene context:
${cleanSubject || 'a helpful digital service companion'}

Art direction:
- Render as a modern glossy 3D scene with soft clay/plastic forms, polished app-brand quality, and contemporary mobile product art direction.
- Creon-adjacent quality but not a single-object icon: clean, premium, cute/friendly when appropriate, with refined rounded geometry and soft studio lighting.
- This is not a full-bleed background wallpaper. It is a large integrated 3D visual layer that can live inside a UI canvas, hero section, or split workspace.
- Use the whole composition thoughtfully: a main 3D subject, light environmental cues, props, weather/motion/status elements, and calm negative space.
- The scene may be anchored to the right, bottom, or center with generous whitespace around it. It does not need to fill every pixel.
- The scene should explain product state, space, workflow, reward, growth, or context, not decorate the screen.
- Use a modern friendly 3D style, but do not copy the Creon single-object icon-sheet composition.
- Leave broad clean safe space where HTML/CSS copy, KPI cards, chips, and CTA can sit around the visual.
- Avoid tiny sticker composition; the scene should fill the canvas naturally.
- Avoid over-detailed cinematic backgrounds, heavy scenery, or busy full-frame illustration.
- Negative constraints: no low-poly, no old game render, no generic 3D stock render, no cheap toy render, no dated mobile game asset, no muddy lighting, no gray plastic, no stiff mannequin characters.
${paletteHint ? `- Harmonize loosely with this app palette: ${paletteHint}` : ''}

Output: PNG image, 16:9 composition, high quality, bright readable lighting, UI-friendly negative space. NO TEXT anywhere in the image.`
}

function loadCreonRefImages(): Array<{ inlineData: { data: string; mimeType: string } }> {
  const refsDir = path.join(process.cwd(), 'src', 'lib', 'creon-refs')
  const files = ['reference_1.png', 'reference_2.png', 'reference_3.png']
  const parts: Array<{ inlineData: { data: string; mimeType: string } }> = []
  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(refsDir, file))
      parts.push({ inlineData: { data: data.toString('base64'), mimeType: 'image/png' } })
    } catch {
      console.warn(`[gemini] Creon ref image missing: ${file} — 3D style consistency may be reduced`)
    }
  }
  if (parts.length === 0) {
    console.warn('[gemini] No Creon ref images loaded — generating without style reference')
  }
  return parts
}

export async function generateHeroImage(
  subject: string,
  apiKey?: string,
  mode: HeroImageMode = 'transparent',
  paletteHint?: string,
  modelOverride?: string,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const ai = getAi(apiKey)
    const prompt = mode === 'scene'
      ? buildFreeformScene3DPrompt(subject, paletteHint, 'ambient')
      : mode === 'scene-card-cover'
        ? buildFreeformScene3DPrompt(subject, paletteHint, 'card-cover')
        : buildCreon3DPrompt(subject, paletteHint)
    const refImages = mode === 'transparent' ? loadCreonRefImages() : []
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: prompt },
      ...refImages,
    ]
    const imageModels = modelOverride ? [modelOverride, 'gemini-2.5-flash-image'] : ['gemini-2.5-flash-image', 'gemini-2.5-pro-image']
    let res: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null
    for (const model of imageModels) {
      try {
        res = await ai.models.generateContent({
          model,
          contents: { parts },
          config: {
            responseModalities: ['IMAGE'],
            httpOptions: { timeout: 120_000 },
          },
        })
        console.log('[gemini] generateHeroImage model used:', model)
        break
      } catch (modelErr) {
        const modelMessage = modelErr instanceof Error ? modelErr.message : String(modelErr)
        console.error('[gemini] generateHeroImage model failed:', model, modelMessage)
      }
    }
    if (!res) return null
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        if (mode === 'scene' || mode === 'scene-card-cover') {
          console.log('[gemini] 3D hero scene generated, preserving background', mode === 'scene-card-cover' ? '(card-cover mode)' : '')
          return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' }
        }
        try {
          const transparent = await removeHeroImageBackground(
            part.inlineData.data,
            part.inlineData.mimeType || 'image/png',
          )
          // 투명 여백을 잘라 객체가 카드 visual zone을 꽉 채우게 한다 (빈 히어로 방지)
          const tightened = await trimTransparentPadding(transparent.base64, transparent.mimeType)
          console.log('[gemini] 3D hero object generated with transparent background (trimmed)')
          return tightened
        } catch (removeErr) {
          const message = removeErr instanceof Error ? removeErr.message : String(removeErr)
          console.error('[gemini] background removal failed, using original:', message)
          return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' }
        }
      }
    }
    return null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[gemini] generateHeroImage error:', message)
    return null
  }
}

export async function critiqueUI(
  html: string,
  brief: string,
  domain?: AppDomain,
  apiKey?: string,
  variantStyle?: string
): Promise<string> {
  const TINY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  const safeHtml = html.replace(/data:[^;]+;base64,[A-Za-z0-9+/]+=*/g, TINY_GIF)
  const domainHint = domain
    ? `\n도메인 벤치마크: ${getDomainGuidance(domain).split('\n')[0]}`
    : ''

  const variantLabel = variantStyle?.includes('시안 A') ? 'A (정밀 정보형)'
    : variantStyle?.includes('시안 B') ? 'B (임팩트 히어로형)'
    : variantStyle?.includes('시안 C') ? 'C (감성 브랜드형)'
    : null

  const variantCriteria = variantLabel?.includes('A') ? `
## 시안 A 전용 추가 기준
- A1. 데이터, 목록, 상태, 비교 정보가 중심을 이루는가?
- A2. 정보가 정렬/필터/그룹핑되어 빠르게 스캔되는가?
- A3. 스타일 장식보다 업무적 명료성이 우선되는가?
- A4. 차트가 있다면 디자인 시스템 토큰으로 정돈되어 있는가?` : variantLabel?.includes('B') ? `
## 시안 B 전용 추가 기준
- B1. 대표 메시지와 주요 CTA가 첫 화면에서 가장 명확한가?
- B2. 전환에 필요한 가격/혜택/상태/다음 행동이 빠짐없이 보이는가?
- B3. 3D/이미지를 쓰는 경우 DESIGN.md의 카드/서피스 규칙 안에서 배치했는가?
- B4. A/C와 달리 행동 유도가 가장 강한 구조인가?` : variantLabel?.includes('C') ? `
## 시안 C 전용 추가 기준
- C1. 추천, 카테고리, 이미지, 스토리 등 탐색 요소가 풍부한가?
- C2. 서비스의 분위기와 맥락이 텍스트와 콘텐츠 구성으로 드러나는가?
- C3. 카드/이미지/섹션 스타일이 DESIGN.md 규칙을 유지하는가?
- C4. A/B와 달리 브랜드 탐색 경험이 가장 강한 구조인가?` : ''

  const prompt = `당신은 디자인 시스템 준수 여부를 검수하는 시니어 프로덕트 디자이너입니다.
아래 UI HTML이 선택된 디자인 시스템의 토큰과 컴포넌트 규칙을 일관되게 쓰는지, 그리고 서비스 화면으로 충분히 완성되어 있는지 평가하세요.${variantLabel ? `\n\n이 시안은 **${variantLabel}** 방향입니다.` : ''}

## 기획서 요약
${brief.slice(0, 800)}
${domainHint}

## 평가 대상 HTML
\`\`\`html
${safeHtml.slice(0, 18000)}
\`\`\`

## 공통 평가 기준 (각 항목 통과/실패 판정)
1. **디자인 시스템 준수**: 색상, 타이포그래피, spacing, radius, shadow, border가 CSS 변수와 DESIGN.md 토큰 중심으로 적용되었는가?
2. **컴포넌트 일관성**: 버튼, 카드, 입력, 리스트, 내비게이션이 같은 디자인 시스템의 컴포넌트처럼 보이는가?
3. **서비스 완성도**: 실제 서비스 화면처럼 핵심 정보, 메타 정보, 상태, CTA가 충분히 들어갔는가?
4. **시안 차별성**: 이 시안의 방향(A 정보형 / B 전환형 / C 탐색형)이 레이아웃과 정보 구조로 드러나는가?
5. **반응형 안정성**: 모바일/웹 플랫폼에 맞는 내비게이션과 레이아웃이 적용되었는가?
6. **금지 사항**: 디자인 시스템에 없는 임의 hex, 임의 shadow, 임의 radius, 과한 그라데이션이 스타일을 덮어쓰지 않았는가?
7. **CTA 명확도**: 주요 CTA가 디자인 시스템의 action 스타일로 명확히 보이는가?
8. **아트 디렉션**: 첫 화면에 하나의 focal point가 있고, 핵심 요약/주요 행동/보조 탐색의 3영역이 명확한가?
9. **시각 리듬**: 같은 성격의 카드/행/섹션이 같은 크기·간격·정렬·정보 순서를 유지하는가?
10. **콘텐츠 구체성**: 모든 섹션이 실제 서비스 데이터처럼 구체적 텍스트, 수치, 상태, 가격/시간/평점/담당자/진행률 등을 담고 있는가?

## 즉시 실패 처리할 레이아웃 결함
- 첫 화면에 focal point가 없고 비슷한 카드/칩만 나열된 경우
- 핵심 요약, 주요 행동, 보조 탐색 중 2개 이상이 빠진 경우
- A/B/C 시안이 같은 레이아웃 순서를 반복하고 차이가 색상/문구 수준에 그친 경우
- 한글이 세로로 한 글자씩 떨어져 보이거나 writing-mode/좁은 column 때문에 문장이 깨진 경우
- 첫 화면의 절반 이상이 빈 흰 영역 또는 빈 카드로 남아 있는 경우
- 음식/배달/커머스 화면인데 메뉴 이미지 대신 산, 바다, 노트북 같은 무관한 이미지가 들어간 경우
- 3D 히어로 이미지가 메인 히어로 외 카드/리스트/썸네일 영역에 반복 사용된 경우
- 3D 히어로 이미지를 투명 PNG가 아닌 배경 있는 이미지처럼 다루어 카드보드 컷아웃처럼 보이는 경우
- 3D 이미지 배경을 CSS filter, mix-blend-mode, canvas chroma key 등으로 제거하려는 코드가 포함된 경우
- "star", "home" 같은 영어 placeholder 텍스트가 사용자에게 그대로 노출된 경우
- emoji로 아이콘을 대신하거나, 같은 아이콘/이미지가 의미 없이 반복되는 경우
- 하단 내비게이션이나 CTA가 콘텐츠를 가리거나 화면 밖으로 밀린 경우

위 결함 중 하나라도 있으면 score는 최대 60점, verdict는 반드시 "needs_refinement"로 판정한다.
${variantCriteria}

## 출력 형식 (반드시 JSON)
\`\`\`json
{
  "score": 0~100,
  "verdict": "pass" | "needs_refinement",
  "topIssues": [
    "구체적 문제 1 (어떤 부분이 어떻게 부족한지)",
    "구체적 문제 2",
    "구체적 문제 3"
  ],
  "improvements": [
    "구체적 개선 지시 1 (어떤 요소를 어떻게 바꿔야 하는지, CSS 값 포함)",
    "구체적 개선 지시 2",
    "구체적 개선 지시 3"
  ]
}
\`\`\`

- 78점 미만 = needs_refinement
- topIssues와 improvements는 가장 임팩트 큰 3가지만
- 추상적 표현 금지 (예: "더 예쁘게" X → "DESIGN.md의 headline 토큰으로 핵심 메시지 계층을 강화" O)
- 응답은 JSON 코드블록만, 다른 설명 없이.`

  const text = await generatePro(prompt, apiKey, 'gemini-3.5-flash')
  return text.trim()
}

function buildQualityRules(heroImagePrompt?: string, domain?: AppDomain): string {
  const domainBlock = domain
    ? `\n## 🎯 도메인 패턴 (이 도메인에 반드시 적용)\n${getDomainGuidance(domain)}\n`
    : '';
  return `---
${domainBlock}
## 공통 품질 및 시각 계층 원칙

1. **선택한 DESIGN.md가 스타일의 최상위 기준 (CRITICAL)**
   - 색상, 타이포그래피, 간격, 라운드, 카드, 입력, 버튼, 그림자, 내비게이션은 반드시 [디자인 시스템]에 정의된 토큰과 규칙을 따른다.
   - DESIGN.md에 없는 임의의 hex, px, shadow, radius를 새로 만들지 않는다. 필요한 경우 가장 가까운 토큰을 선택한다.
   - 시각적 완성도는 높이되, 선택한 디자인 시스템의 정체성을 바꾸는 장식(과한 그라데이션, 임의 shadow, 임의 pill, 임의 컬러)을 추가하지 않는다.
   - 동일한 기획서라도 ktds.md를 선택하면 KTDS처럼, notion.md를 선택하면 Notion처럼, shopify.md를 선택하면 Shopify처럼 보여야 한다.

   **시각 계층 체크리스트:**
   - [ ] 선택한 DESIGN.md의 색상/타입/간격/컴포넌트 규칙이 화면 전체에 일관되게 적용되는가?
   - [ ] 핵심 정보와 주요 CTA가 명확히 보이는가?
   - [ ] 리스트, 카드, 폼, 내비게이션이 서비스 목적에 맞게 충분한 정보를 담고 있는가?
   - [ ] 반응형에서 정보 구조가 유지되는가?

2. **디자인 시스템 토큰 100% 동적 상속 (MANDATORY)**
   - 임의의 px, hex, shadow 값을 프롬프트 수준에서 하드코딩하지 마십시오.
   - 모든 스타일은 오직 제공된 [디자인 시스템] (DESIGN.md)의 colors, typography, rounded, spacing 토큰을 참조한 CSS 변수만을 사용하여 구현되어야 합니다.
   - :root { --color-primary: <브랜드 주색>; } 등을 선언하고, 브랜드 액션 컬러는 반드시 var(--color-primary)를 사용하십시오.

3. **도메인 및 기획서 맞춤형 레이아웃 자율 구성**
   - 서비스 도메인과 기획서의 성격(예: 미니멀 브랜드 소개, 대시보드형 그리드, 리스트 피드, 폼 중심 페이지)에 부합하는 레이아웃 구조를 AI가 자율적으로 판단하여 짜야 합니다.
   - 획일화된 1열 리스트나 특정 히어로 템플릿의 강제 사용을 금지합니다.

4. **Composition Quality Layer — 허접한 시안 방지 (CRITICAL)**
   - 디자인 시스템은 절대 변경하지 말고, 그 안에서 화면의 완성도를 높인다.
   - UI를 만들기 전에 확정된 productBrief, firstViewportContract, layoutSkeleton을 반드시 구현한다. 이 계약을 무시하고 예쁜 카드 몇 개만 만들면 실패다.
   - 첫 화면에는 명확한 focal point를 하나 만든다. 사용자가 처음 보는 순간 무엇을 해야 하는지 보여야 한다.
   - 주요 CTA는 한 화면에서 가장 빠르게 발견되어야 한다.
   - 카드들은 같은 크기, 같은 간격, 같은 정렬 리듬을 가진다. 같은 성격의 카드가 제각각 흔들리면 실패다.
   - 화면을 3개 영역으로 나눈다: 핵심 요약, 주요 행동, 보조 탐색.
   - 정보가 많은 화면도 여백과 구분선을 이용해 스캔 가능하게 만든다.
   - 모든 섹션은 실제 서비스 데이터처럼 구체적인 텍스트와 수치를 가진다.
   - 빈 박스, 추상 카드, 의미 없는 아이콘 나열을 금지한다.
   - 와이어프레임처럼 보이는 회색 박스, placeholder title/card, 의미 없는 skeleton block, 추상 도형 장식은 실패다.
   - 실제 서비스처럼 보이도록 각 카드에는 제목, 설명, 상태/시간/가격/진행률/수치/메타 중 최소 2개 이상을 포함한다.
   - 헤더+큰 빈 히어로+버튼 하나로 첫 화면을 끝내지 않는다. 서비스의 반복 콘텐츠나 업무/탐색 단위가 반드시 보이게 한다.
   - 첫 화면은 반드시 3개 이상의 의미 있는 영역으로 구성한다: 상단 내비/검색, 핵심 가치 또는 요약, 주요 콘텐츠 리스트/카드, 하단 액션/내비.
   - 한 화면의 절반 이상을 빈 공간, 빈 카드, 흰 배경으로 남기지 않는다. 여백은 의도적인 그룹핑에만 사용한다.
   - 모든 카드/리스트는 실제 서비스 데이터처럼 제목, 설명, 가격/상태/시간/평점 등 메타 정보, 액션을 포함한다.
   - 한글 문장은 절대 세로로 한 글자씩 쌓지 않는다. writing-mode, text-orientation, 과도하게 좁은 텍스트 column 사용 금지.
   - 짧은 한글 UI 라벨은 절대 어색하게 줄바꿈하지 않는다. 예: "건강식"이 "건강/식"으로, "오늘 이 메뉴 만들기"가 글자 단위로 벌어지거나 여러 줄로 깨지면 실패다.
   - 버튼, CTA, 칩, 배지, 탭, 카테고리, 메타 라벨, 가격/시간/칼로리/평점은 기본적으로 한 줄이어야 한다.
   - 짧은 UI 라벨에는 CSS로 white-space: nowrap; word-break: keep-all; overflow-wrap: normal; min-width: max-content; flex: 0 0 auto;를 적용한다.
   - CTA/button 텍스트는 justify-content:center; text-align:center; letter-spacing:0;으로 중앙 정렬한다. space-between, grid column, 과한 letter-spacing으로 글자를 벌리지 않는다.
   - 메타 정보 row는 display:flex; align-items:center; gap: var(--spacing-*); flex-wrap: wrap;으로 구성하고, 각 meta item은 inline-flex + white-space:nowrap으로 만든다.
   - emoji를 아이콘이나 라벨로 사용하지 않는다. 아이콘은 반드시 Google Material Symbols Rounded를 사용한다.
   - "star", "home", "BEST"만 덩그러니 보이는 placeholder성 문구 금지. 필요한 경우 "별점", "홈", "추천"처럼 자연스러운 한국어 UI 라벨을 사용한다.
   - 음식/배달/커머스/여행 등 이미지가 중요한 도메인은 무관한 랜덤 이미지 금지. 반드시 브리프와 직접 관련된 placeholder 설명을 작성한다.
   - 하단 내비게이션, floating CTA, 장바구니 버튼은 콘텐츠를 가리지 않도록 main content padding-bottom을 충분히 확보한다.

   **⛔ 리스트/피드 아이템 패딩 일관성 (CRITICAL)**
   - 같은 화면 안의 모든 리스트·피드 아이템은 **상하좌우 패딩이 동일해야 한다**.
   - 퀘스트 카드 아이템, 식물 상태 아이템, 할 일 아이템처럼 **같은 성격의 리스트 행**은 반드시 동일한 padding 값을 사용하라.
   - 리스트 아이템 기본 구조: padding은 var(--aide-card-padding) var(--aide-page-padding) 또는 섹션 카드 안에 있을 경우 var(--aide-card-padding) 사용.
   - ❌ 실패: 같은 화면에서 퀘스트 아이템은 상하 padding이 있는데 식물 상태 아이템은 상하 padding이 0이거나 없는 경우.
   - ❌ 실패: 카드(card) 안 아이템은 패딩이 있는데, 섹션 하위 리스트 아이템은 패딩이 0이거나 좌우만 있고 상하가 없는 경우.
   - 모든 리스트 아이템의 min-height는 44px 이상(모바일 터치 타겟)이어야 한다.

5. **[WCAG AA] 색상 대비 규칙 (CRITICAL — 절대 위반 금지)**
   - **Primary/Accent 배경(진한 색) 위 텍스트는 반드시 흰색(#ffffff)**: 배경이 파란색·보라색·검정·짙은 그라데이션인 경우
     * 올바른 예: style="background:#1A75FF; color:#ffffff;" ✅
     * 금지 예: style="background:#1A75FF; color:#000000;" ❌  style="background:#1A75FF; color:#333333;" ❌
   - **btn-primary 텍스트는 반드시 color:#ffffff**: .btn-primary 클래스 또는 인라인 style에서 background가 var(--color-primary)인 경우 color:#000000/#111111/#333333 절대 금지
     * 올바른 예: button style="background:var(--color-primary); color:#ffffff;" ✅
     * 금지 예: button class="btn-primary" style="color:#000" ❌
   - **배경이 밝은 색(white, light gray, surface)이면 텍스트는 어두운 색(#111111/#222222)**: 흰 배경에 흰 텍스트 금지
   - 인라인 style로 color를 강제 지정할 때 배경과 대비가 4.5:1 이상인지 항상 확인

6. **아이콘 사용 규칙**
   - **아이콘은 무조건 Google Material Symbols Rounded**를 사용하십시오. DESIGN.md에 다른 아이콘 예시가 있어도 Aide 생성 HTML에서는 Material Symbols가 최종 기준입니다.
   - DSCore SVG icon, inline SVG path, CSS mask icon, emoji, 외부 아이콘 세트로 대체하지 마십시오.
   - 사용법: \`<span class="material-symbols-rounded" aria-hidden="true">icon_name</span>\`
     * 예시: \`<span class="material-symbols-rounded" aria-hidden="true">home</span>\`, \`<span class="material-symbols-rounded" aria-hidden="true">search</span>\`, \`<span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span>\`
     * icon_name은 snake_case Material Symbols 이름 사용 (home, search, menu, person, settings, notifications, arrow_forward, arrow_back, check, star, favorite, close, add, edit, delete, shopping_cart, payment, account_circle, calendar_today, location_on, phone, mail, chat, send, more_vert 등)
     * 폰트는 자동으로 주입되므로 @font-face나 별도 link 태그를 추가하지 마십시오.
   - 아이콘 ligature 텍스트(home, person, analytics 등)가 일반 텍스트처럼 보이면 실패입니다.

6. **이미지 및 비주얼 처리 규칙**
   - 3D 이미지는 **메인 히어로 섹션에서 최대 1회만** 사용하십시오. 반복 카드, 추천 카드, 리스트 썸네일, 상세 이미지에는 3D 이미지 사용 금지.
   - 3D 이미지는 절대 빈 영역에 떠 있는 장식으로 두지 마십시오. 반드시 카드/히어로 surface 안에서 텍스트, KPI, CTA, 진행률, 보상 등과 관계를 맺어야 합니다.
   - transparent 3D는 이미지 컨테이너, CSS 기반 grounding(::after/stage background) 또는 anchored alignment가 있어야 합니다. 이미지 파일 자체의 baked-in shadow는 금지입니다. 좌우 빈 공간에 작은 스티커처럼 놓이면 실패입니다.
   - 히어로 섹션에서 Unsplash 실사 이미지를 쓰는 기본 시안은 C안입니다.
   - A/B안의 하위 콘텐츠 카드, 리스트, 혜택, 제휴처, 상품/장소 썸네일에는 서비스 분석 결과에 따라 %%THUMB:keyword:width:height%% 또는 %%IMG_n:keyword%%를 사용할 수 있습니다.
   - 화면에서 눈에 띄는 대형 실사 이미지는 플레이스홀더 형식(%%IMG_1:영문 설명%%, %%IMG_2:영문 설명%%, %%IMG_3:영문 설명%%)을 사용하십시오. 영문 설명은 실제 사진 검색에 적합한 범용 상황/사물 키워드로 작성하십시오.
   - 소형 프로필이나 반복 카드 내 썸네일 등은 %%THUMB:keyword:width:height%% 형식의 플레이스홀더를 사용하십시오. keyword는 이미지 내용을 설명하는 범용 영문 명사구(예: fresh sandwich, veterinary clinic, pet care, finance dashboard), width/height는 픽셀 정수입니다. 카드마다 keyword를 다르게 지정해 이미지가 겹치지 않게 하십시오.
   - keyword에는 브랜드명, 서비스명, 지점명, 캐릭터명, 주소, UI 문구를 넣지 마십시오. 예: "스마일동물병원" X → "veterinary clinic pet care" O, "샌디 시그니처 클럽" X → "fresh sandwich lunch" O.
   - keyword는 반드시 브리프와 직접 관련된 명사를 사용한다. 음식 배달이면 sandwich, salad, coffee, avocado처럼 음식 키워드만 사용하고 landscape, laptop, mountain, ocean 같은 무관한 키워드 금지.
   - A/B/C의 하위 콘텐츠 이미지는 AI가 서비스 성격에 맞게 판단합니다. 통신/멤버십 앱이면 제휴처, 혜택, 매장, 라이프스타일 카드에 실사 썸네일을 쓸 수 있고, 데이터/비교 화면이면 이미지 없이 정보 컴포넌트로 충분히 구성해도 됩니다.
   - 단, "모든 시안에 실사 이미지" 또는 "C안의 모든 이미지 영역을 실사로 채우기"처럼 기계적으로 강제하지 마십시오. 브리프, 도메인, 사용자가 요청한 캐릭터 중요도에 따라 자연스럽게 선택하십시오.
   - ⛔ **[CRITICAL] 플레이스홀더는 반드시 img src 속성값에만 사용** — %%SCENE_3D%%·%%HERO_3D%%·%%SHARED_IMG:keyword:width:height%%·%%IMG_1%%·%%THUMB%%·%%THUMB:...%% 등 모든 플레이스홀더 문자열은 반드시 <img src="%%...%%"> 형태로만 사용하십시오. 텍스트 노드(<p>, <span>, <div> 등의 내용), alt, href, 주석, 또는 다른 어떤 위치에도 절대 삽입 금지.
   ${heroImagePrompt ? `
   ⚠️ **3D 히어로 이미지 규칙 (CRITICAL)**
   - 3D 플레이스홀더는 딱 2가지만 사용합니다. 한 화면에서 3D는 **메인 히어로 1회만** 사용합니다.
     * %%SCENE_3D%%: 서비스 상태·공간·상황을 설명하는 통합 3D scene layer. 꼭 화면을 꽉 채우는 배경이 아니라, UI 캔버스 안의 큰 visual participant로 배치합니다.
     * %%HERO_3D%%: 투명 배경 오브젝트/캐릭터. 배경 제거된 PNG. 카드 옆, KPI 옆, 히어로 섹션 오브젝트로 배치합니다.
   - 플레이스홀더는 반드시 <img src="%%SCENE_3D%%"> 또는 <img src="%%HERO_3D%%"> 형태로만 사용하십시오.
   - 히어로 섹션 배경은 DESIGN.md 토큰으로 구성하되, %%SCENE_3D%%는 과한 wallpaper가 아니라 UI 정보와 같은 캔버스에서 공간감/상황을 만드는 큰 scene layer로 배치하십시오.
   - %%HERO_3D%% 이미지 자체에는 그림자가 없습니다. 접지감이 필요하면 HTML/CSS의 ::after, radial-gradient로만 처리하십시오.
   - 캐릭터/오브젝트가 브리프에 포함된 경우 3D 이미지는 장식 아이콘이 아니라 히어로의 핵심 비주얼입니다. 단, 무조건 같은 크기로 키우지 말고 아래 role을 먼저 고른 뒤 role별 배율을 적용하십시오.
   - 이미지 컨테이너에는 overflow:hidden을 사용해 가로 스크롤을 절대 만들지 마십시오.
   - **%%HERO_3D 역할별 배치 판단:**
     1. Banner Character — 마스코트/펫/리워드/멤버십/소비미션처럼 감정적 캐릭터가 배너 주인공인 경우. 3D는 배너 너비의 40~60%, 배너 높이의 90~130%; right/bottom anchor와 일부 crop 허용.
     2. Product Object — 카드/쿠폰/기기/요금제/상품처럼 정보 보조 오브젝트인 경우. 3D는 배너 너비의 42~58%, 배너 높이의 80~115%; 전체 실루엣을 되도록 보존하되 visual zone은 명확해야 합니다.
     3. Companion Accent — 대시보드/업무/폼 중심에서 보조 companion인 경우에도 B안에서는 3D가 히어로의 focal point입니다. 3D는 배너 너비의 34~46%; KPI나 CTA 근처의 독립 visual zone에 배치.
     4. Scene Substitute — 성장/게임/온보딩처럼 3D가 상태를 설명하는 경우. 3D는 stage 중앙 또는 하단에 55~75% 폭으로 크게 배치하고, 아래/옆에 진행률·미션·액션 카드를 연결.
   - 먼저 위 4개 중 하나를 내부적으로 선택하고, CSS class나 주석 없이 실제 배율/anchor/crop에 반영하십시오.
   - B안 HERO_3D는 작은 floating sticker가 아니라 히어로 카드의 명확한 visual zone입니다.
   - HERO_3D 이미지는 피사체가 캔버스의 65~75%를 차지하도록 생성됩니다. CSS width는 반드시 clamp(320px,82vw,480px) 이상으로 설정하세요. 피사체가 200px 이상으로 선명하게 보여야 합니다.
   - 실패 조건: 모든 %%HERO_3D%%를 120~160px 작은 아이콘처럼 넣기, 오른쪽 위 작은 스티커로 띄우기, 버튼 위 빈 공간에 애매하게 놓기, 텍스트/CTA와 의미 연결 없이 빈 공간에 놓기.
   - **히어로 이미지 배치 패턴:**

     패턴 A. **Product Object / 전체 보임 (contain)** — 상품형 오브젝트 전체를 안정적으로 보여줄 때
     <section class="hero-with-image" style="display:grid;grid-template-columns:minmax(0,0.56fr) minmax(160px,0.44fr);align-items:center;overflow:hidden;">
       <div><!-- 헤드라인·서브카피·CTA --></div>
       <div class="hero-visual-zone" style="position:relative;min-height:190px;display:grid;place-items:center;overflow:visible;">
         <img src="%%HERO_3D%%" alt="hero" style="width:clamp(320px,82vw,480px);height:auto;max-height:480px;object-fit:contain;" />
       </div>
     </section>

     패턴 B. **Integrated Scene Layer** — 3D가 화면의 공간감/상황을 만들지만 UI를 덮지 않을 때
     <section class="hero-scene-card" style="position:relative;overflow:hidden;">
       <div class="hero-copy" style="position:relative;z-index:2;"><!-- 날짜·핵심 수치·상태 칩·CTA --></div>
       <div class="aide-visual-stage" style="position:relative;overflow:hidden;min-height:260px;border-radius:var(--rounded-xl);">
         <img class="aide-hero-3d aide-hero-scene-img" src="%%SCENE_3D%%" alt="hero" style="position:absolute;right:0;bottom:0;width:min(72%,520px);height:auto;max-height:100%;object-fit:contain;" />
       </div>
       <div class="hero-action-panel"><!-- 헤드라인·핵심 숫자·CTA --></div>
     </section>

     패턴 B-2. **Split Workspace Scene** — 데이터/업무 UI와 큰 3D scene이 좌우로 같은 캔버스를 나눌 때
     <section class="workspace-scene" style="display:grid;grid-template-columns:minmax(0,0.48fr) minmax(0,0.52fr);align-items:center;overflow:hidden;">
       <div><!-- KPI·차트·리스트·CTA --></div>
       <div class="aide-visual-stage" style="position:relative;min-height:360px;overflow:visible;">
         <img class="aide-hero-3d aide-hero-scene-img" src="%%SCENE_3D%%" alt="hero" style="width:100%;height:auto;object-fit:contain;" />
       </div>
     </section>

     패턴 C. **Banner Character / 큰 anchored crop** — 캐릭터가 배너 한쪽을 크게 차지할 때
     <section class="hero-banner" style="position:relative;overflow:hidden;">
       <div style="position:relative;z-index:2;width:58%;"><!-- 헤드라인·핵심 수치·CTA --></div>
       <img src="%%HERO_3D%%" alt="hero" style="position:absolute;right:-12%;bottom:-16%;width:62%;height:135%;object-fit:contain;" />
     </section>

     패턴 D. **Companion Accent / 보조 companion** — 정보/CTA가 주인공이고 3D는 보조일 때
     <section class="hero-with-image" style="position:relative;overflow:hidden;">
       <div><!-- KPI·헤드라인·CTA --></div>
       <img src="%%HERO_3D%%" alt="hero" style="position:absolute;right:-6%;bottom:-8%;width:clamp(170px,42%,280px);height:auto;object-fit:contain;" />
     </section>

     패턴 E. **Hero Card Cover / %%SCENE_3D%% full-bleed** — (B안 scene-3d-card-cover 전용) 씬이 카드 배경을 꽉 채우고 하단 오버레이에 콘텐츠를 올릴 때
     <section class="hero-card-cover aide-visual-stage" style="position:relative;overflow:hidden;border-radius:var(--aide-card-radius,16px);min-height:320px;background:#111;">
       <img class="aide-hero-3d aide-hero-scene-img" src="%%SCENE_3D%%" alt="hero scene" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;display:block;" />
       <div aria-hidden="true" style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.42) 48%,transparent 100%);pointer-events:none;"></div>
       <div style="position:relative;z-index:2;padding:var(--aide-card-padding,20px);display:flex;flex-direction:column;justify-content:flex-end;min-height:320px;gap:var(--aide-item-gap,8px);">
         <!-- 상단 배지 (선택) -->
         <span style="align-self:flex-start;background:rgba(255,255,255,0.18);backdrop-filter:blur(6px);color:#fff;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;border:1px solid rgba(255,255,255,0.25);">배지 텍스트</span>
         <!-- 헤드라인: 반드시 white -->
         <h2 style="color:#ffffff;font-size:clamp(20px,5.5vw,26px);font-weight:800;line-height:1.25;letter-spacing:-0.5px;margin:0;">서비스 헤드라인</h2>
         <!-- 상태/메타 정보 -->
         <p style="color:rgba(255,255,255,0.82);font-size:13px;margin:0;line-height:1.5;">상태 정보 텍스트</p>
         <!-- CTA 버튼 -->
         <button style="align-self:flex-end;background:var(--color-primary);color:#fff;border:none;border-radius:var(--rounded-lg,12px);padding:12px 20px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;">CTA 텍스트</button>
       </div>
     </section>
     ⚠️ 패턴 E 사용 시 필수 체크:
     - img에 반드시 .aide-hero-3d .aide-hero-scene-img 클래스 부여
     - section에 .aide-visual-stage 클래스 포함
     - 텍스트는 모두 color:#ffffff 또는 rgba(255,255,255,...)
     - 그라데이션 오버레이는 aria-hidden="true" div로 분리
     - CTA 버튼 색상 대비: background:var(--color-primary); color:#fff

   - 3D 플레이스홀더를 절대 다른 URL이나 %%IMG%%로 교체하지 마십시오.
   - %%SCENE_3D%%를 사용할 때는 같은 히어로 안에 실사 이미지나 다른 3D를 겹치지 마십시오.
   - %%SCENE_3D%% 이미지 자체에는 텍스트/버튼/로고가 없어야 합니다. HTML/CSS 정보는 scene 주변 여백, 좌측/상단 정보 영역, 또는 별도 action panel에 배치하십시오.
   - %%SCENE_3D%%를 무조건 object-fit:cover로 꽉 채우지 마십시오. Ambient Canvas, Split Workspace, Anchored Scene, Hero Cover 중 화면 목적에 맞게 contain/cover/anchor를 선택하세요.
   - scene 위에 overlay를 써야 한다면 작은 badge/label 1개만 허용합니다.
   - **[WCAG AA 필수]** 히어로 섹션의 텍스트 색상 규칙:
     * 배경색이 Primary(blue, #1A75FF 등 짙은 색), 다크 계열이면 반드시 color:#ffffff (white) 사용
     * 배경색이 White/Light surface이면 color:#111111 사용
     * 절대 어두운 배경 위에 color:#000000/#111111 같은 어두운 텍스트를 쓰지 마십시오 → WCAG 대비 미달
     * 올바른 예시: style="background:#1A75FF; color:#ffffff;" ✅
     * 금지 예시: style="background:#1A75FF; color:#000000;" ❌
   - 모바일에서는 grid-template-columns: 1fr (이미지가 텍스트 아래 또는 위로 스택)으로 자동 대응하십시오.
   ` : ''}
   
7. **데이터 시각화 (Chart.js) — 프리미엄 스타일 필수**
   - 대시보드·통계 화면에서 차트가 반드시 필요한 경우에만 사용하십시오.
   - CDN: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
   - **차트 스타일링 (기본값 절대 금지):**
     \`\`\`javascript
     const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
     // Bar/Line 공통 옵션
     const chartDefaults = {
       plugins: {
         legend: { display: false },
         tooltip: {
           backgroundColor: '#1a1a2e',
           titleColor: '#ffffff',
           bodyColor: 'rgba(255,255,255,0.8)',
           padding: 12,
           cornerRadius: 8,
           displayColors: false
         }
       },
       scales: {
         x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 12 } } },
         y: { grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 12 } } }
       }
     };
     // Bar 차트: 그라데이션 fill
     const gradient = ctx.createLinearGradient(0, 0, 0, 200);
     gradient.addColorStop(0, primaryColor);
     gradient.addColorStop(1, primaryColor + '40');
     backgroundColor: gradient, borderRadius: 6, borderSkipped: false
     // Line 차트: 아래 영역 투명 그라데이션
     const areaGradient = ctx.createLinearGradient(0, 0, 0, 200);
     areaGradient.addColorStop(0, primaryColor + '30');
     areaGradient.addColorStop(1, primaryColor + '00');
     fill: true, backgroundColor: areaGradient, borderColor: primaryColor, tension: 0.4, pointRadius: 0, pointHoverRadius: 6
     \`\`\`

7.5. **하단 탭바 position:fixed 필수 (모바일 앱 전용)**
   하단 탭바가 있는 모든 모바일 화면에서 반드시 지킬 규칙:
   - 하단 탭바 CSS: \`position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;\`
   - 메인 콘텐츠(스크롤 영역)에 반드시 \`padding-bottom: 72px;\` 이상을 추가해 탭바에 콘텐츠가 가려지지 않게 할 것
   - ❌ 실패 조건: 탭바가 static/relative/absolute이거나, 스크롤 시 탭바가 사라지거나, 마지막 카드가 탭바에 가려지는 경우

8. **반응형 레이아웃 — CSS @media 쿼리 (MANDATORY)**
   **이 HTML은 반응형 뷰어(iframe)에서 렌더링됩니다. iframe 너비가 실시간으로 변하므로, CSS @media 쿼리 없이는 반응형이 절대 동작하지 않습니다.**

   **브레이크포인트**: [디자인 시스템]의 \`responsive.breakpoints\` 값을 따르십시오.
   해당 섹션이 없으면 서비스 성격(B2C/B2B, 대상 디바이스)에 맞는 업계 표준 브레이크포인트를 AI가 자율 판단하십시오.

   **공통 구조:**
   - DESIGN.md에 반응형/내비게이션 규칙이 있으면 그 규칙을 최우선으로 적용
   - 규칙이 없을 때만 Mobile / Tablet / Desktop 3단계 레이아웃 전환을 자율 구성
   - 그리드 열 수와 내비게이션 형태는 서비스 성격과 선택한 디자인 시스템에 맞게 결정
   - \`@media\` 규칙이 하나도 없는 HTML은 실패입니다. 최소 2개 이상의 breakpoint를 작성하십시오.
   - \`.app\`, \`.phone\`, \`.container\`, \`.page\`, \`.shell\` 같은 최상위 wrapper에 \`width:390px\` 또는 \`width:1440px\`만 고정하고 끝내지 마십시오. \`width:100%; max-width:...; margin:auto;\` 조합으로 유연하게 구성하십시오.
   - **모바일 앱 플랫폼이더라도** 데스크탑 브라우저에서 열었을 때 콘텐츠가 중앙에 오도록 반드시 처리하십시오. 모바일 전용 앱은 \`max-width:480px; margin:0 auto;\` 를 root에 적용하고, 태블릿/데스크탑에서는 양옆에 빈 여백이 보이는 폰 목업 형태로 표현하십시오. 절대로 모바일 레이아웃이 데스크탑에서 좌측으로 치우쳐 보이면 안 됩니다.

   **내비게이션 3종 세트 패턴 — [디자인 시스템].responsive의 breakpoint 값으로 대입:**
   \`\`\`css
   /* Mobile 기본: 하단 내비만 표시 */
   .mobile-nav  { display: flex; position: fixed; bottom: 0; left: 0; right: 0; }
   .tablet-nav  { display: none; }
   .desktop-nav { display: none; }
   .main-content { padding-bottom: 64px; padding-left: [mobile-padding]; padding-right: [mobile-padding]; }

   /* Tablet (@media min-width: [tablet-breakpoint]) */
   @media (min-width: [tablet-breakpoint]) {
     .mobile-nav  { display: none; }
     .tablet-nav  { display: flex; position: fixed; top: 0; left: 0; right: 0; }
     .main-content { padding-top: [tablet-nav-height]; padding-left: [tablet-padding]; padding-right: [tablet-padding]; }
   }

   /* Desktop (@media min-width: [desktop-breakpoint]) */
   @media (min-width: [desktop-breakpoint]) {
     .tablet-nav  { display: none; }
     .desktop-nav { display: flex; position: fixed; left: 0; top: 0; height: 100vh; flex-direction: column; }
     .main-content { margin-left: [desktop-nav-width]; padding: [desktop-padding]; }
   }
   \`\`\`

   **그리드 반응형 패턴:**
   \`\`\`css
   .card-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
   @media (min-width: [mobile-large-breakpoint]) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
   @media (min-width: [tablet-breakpoint])       { .card-grid { grid-template-columns: repeat(3, 1fr); } }
   @media (min-width: [desktop-breakpoint])      { .card-grid { grid-template-columns: repeat(4, 1fr); } }
   \`\`\`

   체크리스트 (반드시 확인):
   - [ ] CSS @media 쿼리로 주요 레이아웃이 브레이크포인트에 따라 전환되는가?
   - [ ] 모바일에서 가로 스크롤이나 잘림이 없는가?
   - [ ] 데스크탑에서 콘텐츠 폭과 내비게이션이 안정적으로 배치되는가?
   - [ ] DESIGN.md가 정의한 카드 gap, container padding, navigation 패턴을 우선했는가?

## 🚀 출시 수준 Product UI 기준 (CRITICAL — 앱스토어 심사 통과 가능한 퀄리티)

이 UI는 Figma 목업이나 데모가 아닌, **실제 서비스로 출시 가능한 Product UI**여야 합니다.

### 8px 그리드 시스템
- 모든 간격(margin, padding, gap)은 **8의 배수**여야 합니다: 8, 16, 24, 32, 40, 48, 64px
- DESIGN.md spacing 토큰이 8의 배수가 아닌 경우에도 레이아웃 간격만큼은 8의 배수에 가장 가까운 값을 사용
- 예외: 보더, 아이콘 stroke, 텍스트 자간은 제외
- 체크: 인접한 요소 간 gap이 5px, 7px, 11px 같은 임의 값이면 실패

### 인터랙션 상태 (Interactive States)
모든 인터랙티브 요소는 반드시 상태별 스타일을 가져야 합니다:
\`\`\`css
/* 버튼 상태 */
.btn-primary { background: var(--color-primary); transition: all 0.15s ease; }
.btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
.btn-primary:active { opacity: 0.75; transform: translateY(0); }
.btn-primary:disabled { opacity: 0.38; cursor: not-allowed; pointer-events: none; }

/* 카드/리스트 항목 */
.card, .list-item { transition: box-shadow 0.15s ease, transform 0.15s ease; }
.card:hover { box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1)); transform: translateY(-2px); }

/* 입력 필드 */
.input:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
\`\`\`
- hover/active/disabled/focus 상태가 없는 버튼·카드·입력은 실패
- transition 없이 상태가 갑자기 바뀌는 것도 실패

### 로딩·빈 상태·에러 상태 (Empty/Loading/Error States)
- 데이터 목록이 있는 화면은 반드시 **스켈레톤 로딩** 또는 **로딩 스피너** 처리 영역을 포함
- 빈 상태(empty state): 데이터가 없을 때 보여줄 일러스트 + 안내 텍스트 + CTA
- 에러 상태: 네트워크 오류 시 재시도 버튼 포함
\`\`\`html
<!-- 스켈레톤 예시 -->
<div class="skeleton-card" style="background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:var(--rounded-md);height:80px;"></div>
<style>@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>
\`\`\`

### 접근성 (Accessibility — WCAG AA)
- 모든 이미지에 의미 있는 \`alt\` 속성 (장식 이미지는 \`alt=""\`)
- 모든 버튼·아이콘에 \`aria-label\` 또는 시각적 텍스트
- 폼 입력에 \`<label>\` 연결 (\`for\`/\`id\` 쌍)
- 키보드 포커스 시 \`focus-visible\` 스타일 보장:
  \`\`\`css
  :focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
  \`\`\`
- 색상만으로 정보를 전달하지 않음 (빨간=에러면 아이콘·텍스트도 함께)
- 터치 타겟 최소 44×44px (모바일)

### 실제 서비스 데이터 품질
- 숫자: 실제처럼 구체적으로 (✅ "₩24,500" ❌ "금액")
- 날짜: 상대적 표현 (✅ "3일 전", "오늘 14:30" ❌ "YYYY-MM-DD")
- 상태 뱃지: 의미 있는 색상+아이콘+텍스트 조합
- 사용자명/프로필: 실제 이름처럼 (✅ "김민준" ❌ "User Name")
- 리스트 항목은 최소 3~5개로 실제 서비스 느낌 (1~2개만 있으면 빈 화면처럼 보임)`;
}

function buildArtDirectionLayer(effectivePlatform: PlatformType): string {
  return `## 화면 설계 선행 단계 — 내부적으로 먼저 결정하고 코드에 반영 (출력에는 설명 금지)

HTML을 쓰기 전에 아래 7가지를 내부 설계안으로 먼저 확정한 뒤, 그 결정이 실제 레이아웃과 콘텐츠에 보이게 구현하세요.

1. **Focal Point**
   - 첫 화면에서 사용자가 0.5초 안에 보는 하나의 중심을 정한다.
   - focal point 후보: 핵심 KPI, 대표 상품/혜택, 검색창, 주문 CTA, 주요 이미지, 업무 상태 요약.
   - focal point가 2개 이상 경쟁하면 실패다.

2. **Primary Action Path**
   - 사용자가 가장 먼저 해야 할 행동 1개와 그 다음 행동 1개를 정한다.
   - primary CTA는 첫 화면에서 가장 빨리 발견되어야 한다.
   - secondary CTA는 같은 스타일 강도로 경쟁하지 않는다.

3. **Three-Zone Composition**
   - 화면을 반드시 3개 영역으로 설계한다:
     A. 핵심 요약 또는 히어로
     B. 주요 행동 또는 주요 콘텐츠
     C. 보조 탐색 또는 신뢰/상태 정보
   - 세 영역은 여백, 구분선, 표면색, 카드 리듬 중 DESIGN.md가 허용하는 방식으로 구분한다.

4. **Real Content Density**
   - 모든 카드/리스트/섹션에는 실제 서비스처럼 구체적 텍스트와 수치를 넣는다.
   - 예: 가격, 평점, 시간, 상태, 날짜, 담당자, 진행률, 카테고리, 혜택, 주문/신청 가능 여부.
   - 빈 박스, lorem ipsum, 추상 문구, 같은 문구 반복은 실패다.

5. **Visual Rhythm**
   - 같은 성격의 카드와 리스트는 같은 높이, 같은 gap, 같은 정보 순서, 같은 액션 위치를 가진다.
   - 카드 안의 이미지/텍스트/메타/CTA 비율을 안정적으로 맞춘다.
   - ${effectivePlatform === 'web' ? '웹은 한 화면에 12컬럼 기반의 가로 밀도와 명확한 섹션 폭을 만든다.' : '모바일은 390px 폭에서 텍스트 줄바꿈이 자연스럽고, 하단 내비/CTA가 콘텐츠를 가리지 않게 한다.'}

6. **Responsive Strategy**
   - 기준 플랫폼은 첫 preview의 시작점일 뿐입니다. 최종 HTML은 반드시 모바일/태블릿/데스크탑 폭에서 모두 깨지지 않게 동작해야 합니다.
   - px 고정 폭만으로 화면을 만들지 말고, width:100%, max-width, clamp(), minmax(), grid auto-fit/auto-fill, @media 쿼리를 함께 사용합니다.
   - 모바일 앱형 화면도 넓은 viewport에서는 중앙 정렬 컨테이너 또는 보조 정보 패널로 자연스럽게 확장하고, 웹형 화면도 390px에서는 1컬럼으로 접습니다.
   - 3D/실사 히어로 이미지는 컨테이너 비율에 맞춰 clamp()로 크기를 제어하고, 너무 작은 장식/과한 크롭/CTA 가림이 발생하지 않게 합니다.

7. **Image Direction**
   - 이미지가 필요한 도메인은 이미지가 정보 구조의 일부가 되게 배치한다.
   - 3D는 히어로 1회만, 반복 썸네일은 실제 도메인에 맞는 Unsplash placeholder를 사용한다.
   - 이미지 없는 화면도 아이콘 나열 대신 데이터/카피/CTA로 중심을 만든다.

8. **Design-System Expressiveness**
   - 디자인 시스템은 제한이 아니라 재료다. 토큰을 바꾸지 말고, 섹션 비율·정렬·타입 계층·콘텐츠 밀도로 완성도를 만든다.
   - 예쁘게 보이려고 임의 컬러/그림자/라운드를 추가하지 말고, DESIGN.md 안에서 가장 표현력 있는 조합을 선택한다.

위 설계안은 출력하지 말고, 최종 HTML/CSS 결과에만 반영하세요.`;
}

function buildDesignDirectionSelectorLayer(_heroImagePrompt?: string, variantStyle?: string, domain?: AppDomain, visualPolicy?: VariantVisualPolicy): string {
  const variant = getVariantLabel(variantStyle)
  const domainHint = domain ? `\n도메인 힌트: ${domain}` : ''
  const visualPolicyRules = visualPolicy === 'scene-3d'
    ? `- **시안 A**: 이번에는 3D가 필요한 서비스로 판단되었습니다. A안 히어로는 %%SCENE_3D%%를 화면 전체에 통합되는 3D scene layer로 사용합니다. 과한 full-bleed wallpaper가 아니라 서비스 상태·공간·상황을 설명하는 큰 visual participant여야 합니다. 히어로에서 %%HERO_3D%% 단일 오브젝트와 실사 이미지는 금지. 단, 하위 콘텐츠 썸네일은 서비스 분석 결과에 따라 실사 사용 가능.`
    : visualPolicy === 'scene-3d-card-cover'
      ? `- **시안 B**: 이번 브리프는 배경까지 포함된 몰입형 씬이 적합합니다. B안 히어로는 %%SCENE_3D%%를 **Hero Card Cover** 패턴으로 사용합니다. 카드를 꽉 채우는 배경 씬 위에 하단 그라데이션 오버레이를 깔고, 배지·헤드라인·상태 정보·CTA를 white 텍스트로 올리세요. 히어로에서 %%HERO_3D%% 단일 오브젝트와 실사 이미지는 금지. 단, 하위 콘텐츠 카드/리스트에는 서비스 분석 결과에 따라 실사 썸네일 사용 가능.`
      : visualPolicy === 'creon-object-3d'
        ? `- **시안 B**: 히어로는 3D 필요 여부와 무관하게 반드시 %%HERO_3D%% 단일 오브젝트를 사용합니다. Creon식 배경 없는 3D 아이콘/오브젝트만 허용. 히어로에서 %%SCENE_3D%%와 실사 이미지는 금지. 단, 하위 콘텐츠 카드/리스트에는 서비스 분석 결과에 따라 실사 썸네일 사용 가능.`
        : visualPolicy === 'real-photo'
        ? `- **시안 C**: 히어로 섹션은 실사 이미지(Unsplash) 사용. 히어로에 반드시 %%IMG_1:관련 키워드%%를 사용합니다. 히어로에서 3D 플레이스홀더 금지. C안은 가능한 경우 Bold Editorial Hero를 백단 기본 패턴으로 우선 고려하세요. 사용자가 프롬프트에 과감한 히어로를 명시하지 않아도 Aide가 서비스 성격을 판단해 자동 적용합니다. C안이라고 해서 모든 이미지 영역을 실사로 채우지 마세요.`
        : `- **시안 A**: 히어로 이미지 없음. 데이터·수치·차트·카드가 첫 화면을 채운다. %%HERO_3D%%, %%SCENE_3D%%, %%IMG_1%% 등 어떤 이미지 플레이스홀더도 히어로 섹션에 사용 금지. 단, 하위 콘텐츠 썸네일은 서비스 분석 결과에 따라 실사 사용 가능.`

  return `## Design Direction Selector — 템플릿 고정 금지, 전략 다양성 강제 (CRITICAL)

HTML을 작성하기 전에 이 시안의 디자인 전략을 아래 후보군에서 1개 이상 선택해 화면 구조에 반영하세요. 선택 결과를 텍스트로 출력하지 말고, 최종 레이아웃과 CSS에만 반영합니다.${domainHint}

### 전략 후보군
- Practical Dashboard: 숫자, 진행률, 상태, 미션을 가장 읽기 쉽게 만든 실사용 대시보드.
- Mascot Companion: 캐릭터가 KPI, 미션, 리워드와 대화하듯 연결되는 companion 앱.
- Immersive Hero Scene: 배경까지 포함한 큰 비주얼 씬과 하단 action panel로 브랜드 감정을 만드는 화면.
- Reward Store First: 쿠폰, 포인트, 교환 가능 혜택, 상품 카드가 중심인 리워드 커머스 화면.
- Challenge Social: 친구 랭킹, 주간 챌린지, streak, 뱃지가 중심인 소셜/게임형 화면.
- Minimal Premium: Apple Fitness/Toss처럼 절제된 정보 계층과 넓은 여백으로 고급감을 만드는 화면.
- Gamified Quest: 레벨, 퀘스트, 보상 박스, 잠금 해제 흐름을 강조하는 게임형 화면.
- Editorial Story: 큰 카피, 감성 이미지, 짧은 카드 흐름으로 브랜드 스토리를 먼저 전달하는 화면.

	### ⚠️ 이번 시안의 히어로 비주얼 타입 — STRICT RULE, 절대 바꾸지 말 것
	${visualPolicyRules}

### 이번 시안의 차별화 의무
- 현재 시안: ${variant}
- A/B/C는 서로 다른 전략이어야 합니다. 같은 header + hero + CTA + 2 card + mission list 골격을 반복하면 실패입니다.
- hero 구조, CTA 위치, 카드 밀도, bottom navigation 위 콘텐츠 흐름은 달라야 합니다.
- 시안 A는 정보 구조/실사용성을 강하게, 시안 B는 3D 비주얼 임팩트와 전환을 강하게, 시안 C는 실사 히어로를 통한 신뢰/혜택/탐색 경험을 강하게 만든다.
- C안은 B2C, 멤버십, 커머스, 라이프스타일, 교육, 헬스, 여행, 푸드처럼 감정·혜택·탐색이 중요한 서비스에서 큰 실사/scene hero card를 우선 고려한다.
- B2B/관리자/업무형 서비스라면 Bold Editorial Hero를 과하게 쓰지 말고 신뢰형 visual panel로 톤다운하세요.

### 시각 품질 기준
- 시안 A: 이미지 없이도 완성도 있어야 함. 데이터 계층, 차트, 진행률, KPI 카드로 화면을 채운다.
- 시안 B: 3D 오브젝트/씬이 작은 스티커처럼 보이면 실패. 히어로 비주얼이 화면의 핵심이어야 한다.
- 시안 C: 실사 이미지가 브랜드 분위기를 만들고 그 위 or 아래에 핵심 CTA가 명확히 읽혀야 한다.
- 어떤 시안이든 실제 서비스 홈 화면이어야 한다. 포스터처럼 예쁜 상단만 만들고 아래가 비면 실패.`
}

function buildMediaLayoutSafetyLayer(heroImagePrompt?: string): string {
  return `## Media Layout Safety Contract — 이미지/3D와 UI 겹침 방지 (CRITICAL)

이미지, 3D, CTA, 카드, 하단 탭이 겹치면 전체 결과는 실패입니다. 아래 규칙을 CSS에 반드시 반영하세요.

1. **히어로 안전 영역**
   - 히어로 안에서 텍스트/CTA와 이미지가 함께 있을 때는 반드시 CSS grid 또는 flex로 영역을 분리합니다.
   - CTA를 이미지 위에 absolute로 올릴 수는 있지만, 반드시 이미지/hero의 하단 safe area에 붙입니다. 중앙에 애매하게 떠 있거나 핵심 피사체를 가리면 실패입니다.
   - 이미지가 absolute라면 텍스트 컨테이너에는 z-index와 readable scrim을 두고, 이미지의 safe area를 침범하지 않습니다.
   - hero 내부 텍스트/CTA 컨테이너에는 반드시 padding: var(--aide-card-padding) var(--aide-page-padding) 를 적용합니다. 모바일·웹 모두 해당. 텍스트가 좌측/우측 끝에 붙어 있으면 즉시 실패입니다.
   - full-bleed 배너(음수 마진으로 content-scroll padding을 탈출한 경우)의 내부 콘텐츠 div에는 반드시 클래스명 hero-inner 또는 hero-content 를 사용하고, padding-left:var(--aide-page-padding) 을 명시하세요.

2. **3D 전용 컨테이너**
   - 3D img에는 반드시 전용 wrapper를 둡니다: .aide-visual-stage, .hero-visual, .mascot-stage, .scene-visual, .reward-stage 같은 의미 있는 컨테이너.
   - wrapper는 position:relative; overflow:hidden; display:flex 또는 grid; align-items:center를 갖습니다.
   - 3D img 자체에는 반드시 .aide-hero-3d 또는 .aide-3d-asset 클래스를 붙입니다.
   - SCENE_3D는 큰 integrated scene layer입니다. 반드시 stage를 꽉 채우는 cover 배경일 필요는 없으며, Ambient Canvas/Split Workspace/Anchored Scene/Hero Cover 중 목적에 맞게 배치합니다. 작은 썸네일처럼 축소되면 실패입니다.
   - 투명 3D(%%SHARED_HERO_3D%% / %%MASCOT_3D%% / %%REWARD_OBJECT_3D%%)는 단독 img로 배치하지 말고, 항상 토큰 기반 surface 안에서 anchor/CSS grounding을 갖게 합니다. 이미지 자체 shadow는 금지입니다.
   - 권장 구조:
     \`\`\`html
     <div class="aide-visual-stage mascot-stage">
       <img class="aide-hero-3d" src="%%MASCOT_3D%%" alt="" />
     </div>
     \`\`\`
   - 권장 CSS:
     \`\`\`css
     .aide-visual-stage {
       position: relative;
       display: grid;
       place-items: end center;
       overflow: hidden;
       border-radius: var(--aide-card-radius);
       background: var(--color-surface);
       isolation: isolate;
     }
     .aide-visual-stage::after {
       content: "";
       position: absolute;
       left: 50%;
       bottom: 8%;
       width: 52%;
       height: 14%;
       transform: translateX(-50%);
       border-radius: 999px;
       background: rgba(0,0,0,.14);
       filter: blur(18px);
       opacity: .7;
       z-index: 0;
     }
     .aide-hero-3d {
       position: relative;
       z-index: 1;
       width: clamp(280px, 72vw, 400px);
       height: auto;
       object-fit: contain;
       display: block;
     }
     .aide-hero-scene-img {
       position: absolute;
       right: 0;
       bottom: 0;
       width: min(72%, 520px);
       height: auto;
       max-height: 100%;
       object-fit: contain;
     }
     \`\`\`
   - 큰 히어로/추천 카드에서 투명 마스코트형은 width:clamp(280px, 72vw, 400px); max-height:340px; object-fit:contain을 기준으로 합니다.
   - 작은 companion이 필요한 KPI 카드에서만 .compact-3d 클래스를 붙이고 width:clamp(96px, 30vw, 160px)까지 줄일 수 있습니다. 큰 빈 stage 안의 작은 중앙 3D는 금지입니다.
   - Hero Cover Scene이 정말 필요할 때만 img를 width:100%; height:100%; object-fit:cover로 씁니다. 기본은 contain/anchored/split 배치를 우선하고, UI 정보와 CTA가 겹치지 않게 주변 여백 또는 별도 패널을 사용합니다.

3. **CTA/탭바 충돌 방지**
   - fixed bottom navigation이 있으면 main/aide-page padding-bottom을 nav 높이 + 최소 24px 이상 확보합니다.
   - CTA 주변에는 이미지와 최소 16px 이상 시각적 간격을 둡니다.
   - 어떤 img도 CTA 버튼의 bounding area 위로 들어오면 안 됩니다.

4. **텍스트/카드 안정성**
   - 숫자 KPI는 nowrap이 필요할 때 white-space:nowrap을 쓰고, 작은 라벨은 줄바꿈을 허용합니다.
   - 카드 grid는 minmax(0,1fr)를 사용해 텍스트 overflow를 막습니다.
   - 긴 한글 문구가 한 글자씩 세로로 떨어지지 않게 min-width:0, line-height, word-break:keep-all 또는 overflow-wrap:anywhere를 상황에 맞게 씁니다.

5. **Gemini와 Unsplash 역할 분리**
   - Gemini 3D placeholder(%%SHARED_HERO_3D%%, %%SHARED_HERO_3D_SCENE%%, %%HERO_SCENE_3D%%, %%MASCOT_3D%%, %%REWARD_OBJECT_3D%%)는 새로 생성되는 비주얼입니다.
   - Unsplash placeholder(%%SHARED_IMG:keyword:width:height%%, %%IMG_n:keyword%%, %%THUMB:keyword:width:height%%)는 기존 실사 이미지를 검색해 가져오는 용도입니다.
   - 3D 캐릭터/브랜드 월드는 Gemini, 실사 라이프스타일/장소/음식/제품 사진은 Unsplash를 선택합니다.

${heroImagePrompt ? `이번 3D 의도: ${heroImagePrompt}\n- 이 의도가 캐릭터/리워드/게임/성장에 가깝다면 작은 아이콘 배치를 피하고, 캐릭터가 화면 경험의 일부로 보이게 합니다.` : ''}
`
}

function buildBrandAndChromeLayer(effectivePlatform: PlatformType, hasLogo: boolean): string {
  return `## Brand Identity + App Chrome Contract (CRITICAL)

### 브랜드/로고 규칙
${hasLogo ? `- 사용자가 업로드한 로고가 있으면 로고는 앱바/헤더의 작은 브랜드 마크로만 사용합니다.
- 로고 이미지를 직접 만들거나 src를 작성하지 마세요. 헤더/앱바의 브랜드 위치에는 반드시 \`${AIDE_LOGO_SLOT_HTML}\` 슬롯을 1회만 배치합니다.
- Aide가 생성 후 마지막 단계에서 이 슬롯을 실제 업로드 로고 이미지로 치환합니다.
- 슬롯은 헤더/앱바/GNB 안의 왼쪽 브랜드 영역에만 배치합니다.
- 로고를 hero, 카드, 배경, 큰 브랜딩 그래픽으로 확대하지 않습니다.
- 로고 때문에 헤더 높이가 커지거나 콘텐츠가 밀리면 실패입니다.` : `- 사용자가 업로드한 로고가 없으면 브랜드는 텍스트 앱 이름으로 표현합니다. 깨진 img, 빈 img, alt만 보이는 img를 만들지 마십시오.
- 선택된 디자인 시스템 이름이나 예시 로고를 제품 로고처럼 그리지 마십시오. 특히 KTDS 디자인 시스템을 선택해도 \`kt ds\`, \`KTDS\`, KTDS 로고 이미지를 최종 서비스 브랜드로 표시하면 실패입니다.
- 디자인 시스템은 스타일 언어이지, 최종 서비스의 브랜드 로고가 아닙니다.`}
- 앱 이름/서비스명은 브리프의 이름을 우선합니다. 예: "1. KT 멤버십 앱..."이면 서비스명은 "KT 멤버십"입니다.
- 디자인 시스템 제공자 이름을 서비스명처럼 쓰지 마십시오.

${effectivePlatform === 'mobile' ? `### 모바일 상단 앱바 기준
- 상단 앱바는 반드시 아래 구조를 사용합니다:
  \`\`\`css
  .app-bar, header, .top-bar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    box-sizing: border-box;
    z-index: 50;
    height: var(--aide-header-height, 56px);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border-alt);
    display: flex;
    align-items: center;
    padding: 0 var(--aide-page-padding);
    gap: var(--spacing-sm);
  }
  \`\`\`
- 상단 앱바가 **position: fixed**인 경우, 반드시 \`.aide-page\`에 \`padding-top: calc(var(--aide-header-height) + var(--aide-section-gap))\`를 추가해 콘텐츠가 앱바에 가려지지 않게 하십시오.
- 상단 앱바가 **position: sticky**이거나 **일반 흐름(normal flow)**인 경우, \`.aide-page\`의 기본 \`padding-top: var(--aide-section-gap)\`으로 첫 카드와 헤더 사이 여백이 자동으로 확보됩니다.
- ❌ 헤더 바로 아래 첫 카드/섹션이 헤더에 붙어 있으면(간격 없음) 실패입니다. 항상 최소 var(--aide-section-gap) 이상의 간격이 있어야 합니다.

### 모바일 하단 앱바 기준
- 하단 앱바는 5개 이하 탭을 기준으로 합니다. 홈, 주요 기능 3개, 마이/프로필 정도로 제한합니다.
- 권장 구조:
  \`\`\`css
  :root { --aide-tabbar-height: 72px; }
  .aide-page { padding-bottom: calc(var(--aide-tabbar-height) + env(safe-area-inset-bottom) + var(--spacing-base)); }
  .mobile-tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: calc(var(--aide-tabbar-height) + env(safe-area-inset-bottom));
    padding: 0 var(--spacing-sm) env(safe-area-inset-bottom);
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-items: center;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border-alt);
    z-index: 50;
  }
  .mobile-tabbar .tab-item { min-width:0; height:56px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; }
  .mobile-tabbar .tab-icon { width:24px; height:24px; }
  .mobile-tabbar .tab-label { font-size:11px; line-height:1.2; white-space:nowrap; }
  .mobile-tabbar .tab-item.active { color:var(--color-primary); font-weight:600; }
  .mobile-tabbar .tab-item.inactive { color:var(--color-text-assistive, var(--color-icon)); }
  \`\`\`
- 앱바는 카드나 이미지 위에 덮이면 안 됩니다. 마지막 카드/리스트가 앱바 아래로 잘리면 실패입니다.
- 앱바 자체를 카드처럼 크게 띄우거나 전체 화면의 중요한 CTA처럼 만들지 마십시오. 앱바는 안정적인 내비게이션이어야 합니다.
- 모바일 화면에서 상태바/노치/홈 인디케이터 같은 하드웨어 목업은 만들지 않습니다.` : `### 웹 앱바 기준
- 웹에서는 모바일 하단 앱바를 만들지 않습니다. GNB, LNB, 필터 사이드바 중 서비스 성격에 맞게 선택합니다.`}
`
}

function buildHeroVisualIntegrationLayer(heroImagePrompt?: string, variantStyle?: string, domain?: AppDomain, visualPolicy?: VariantVisualPolicy): string {
  if (!heroImagePrompt) return ''

  const variantHint = visualPolicy === 'scene-3d'
    ? '시안 A는 이번 브리프에서 3D가 필요하므로 %%SCENE_3D%%를 사용한다. 이는 화면을 과하게 덮는 배경이 아니라, 서비스 상태·공간·상황을 설명하며 UI와 같은 캔버스에 통합되는 큰 3D scene layer다.'
    : visualPolicy === 'scene-3d-card-cover'
    ? '시안 B는 Hero Card Cover 방식이다. %%SCENE_3D%%를 카드 배경으로 꽉 채우고(object-fit:cover), 하단 그라데이션 오버레이 위에 배지·헤드라인·상태·CTA를 white 텍스트로 올린다. %%HERO_3D%% 단일 오브젝트와 실사 이미지는 히어로에서 금지.'
    : variantStyle?.includes('시안 A')
    ? '시안 A는 정보 구조와 사용성을 우선하며, 이번 정책이 no-image라면 히어로에는 3D/실사 이미지를 쓰지 않는다. 하위 콘텐츠 썸네일은 서비스 분석에 따라 허용된다.'
    : variantStyle?.includes('시안 B')
      ? '시안 B 히어로는 무조건 Creon식 배경 없는 단일 %%HERO_3D%% 오브젝트를 사용한다. 히어로에 %%SCENE_3D%% 배경 씬과 실사 이미지는 쓰지 않는다. 하위 콘텐츠 썸네일은 서비스 분석에 따라 허용된다.'
      : variantStyle?.includes('시안 C')
        ? '시안 C 히어로는 실사 이미지로 신뢰/혜택/생활 맥락을 만든다. 가능한 경우 Bold Editorial Hero를 백단 기본 패턴으로 우선 고려한다. 단, C안 전체를 실사 이미지로 도배하지 않고 필요한 콘텐츠에만 사용한다.'
        : '시안의 목적에 맞춰 3D 씬, 투명 마스코트, 실사 히어로 중 하나를 선택한다.'

  const domainPatternHint = (() => {
    const variant = variantStyle?.includes('시안 A') ? 'A'
      : variantStyle?.includes('시안 B') ? 'B'
      : variantStyle?.includes('시안 C') ? 'C'
      : 'single'

    if (visualPolicy === 'scene-3d') {
      return '시안 A + scene-3d: %%SCENE_3D%%를 Ambient Canvas Scene, Split Workspace Scene, Anchored Scene Layer, Hero Cover Scene 중 하나로 판단해 배치하세요. 무조건 cover로 꽉 채우지 말고, UI 정보와 같은 캔버스에서 공간감/상황을 만드는 큰 visual participant로 써야 합니다.'
    }

    if (variant === 'A') {
      return '시안 A는 데이터/정보 중심입니다. 3D를 쓴다면 Companion Accent 또는 Scene Substitute 중 서비스 맥락에 맞는 역할만 선택하고, KPI·상태·CTA를 방해하면 실패입니다.'
    }

    const foodOrReward = ['food', 'commerce', 'health'].includes(domain ?? '')
    const characterOrGame = ['entertainment', 'social'].includes(domain ?? '')

    if (variant === 'B') {
      if (visualPolicy === 'scene-3d-card-cover') {
        return '시안 B + scene-3d-card-cover: %%SCENE_3D%%를 **패턴 E Hero Card Cover**로 배치하세요. section에 position:relative; overflow:hidden; border-radius:var(--aide-card-radius); min-height:320px를 주고, img를 position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center 30%로 배경 전체를 채우세요. 그 위에 linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 45%, transparent 100%) 오버레이를 올리고, z-index:2 레이어에 배지·헤드라인(white)·상태 정보·CTA를 하단 정렬로 배치하세요. %%HERO_3D%%와 실사 이미지는 히어로에서 금지.'
      }
      if (foodOrReward || characterOrGame) {
        return '시안 B: 도메인과 무관하게 %%HERO_3D%% 단일 오브젝트만 사용합니다. 먼저 Banner Character, Product Object, Companion Accent, Scene Substitute 중 역할을 고르고, 그 역할에 맞는 배율·anchor·crop을 적용하세요. 배경 포함 scene처럼 cover 처리하지 마세요.'
      }
      return '시안 B: %%HERO_3D%% 단일 오브젝트가 주인공입니다. %%SCENE_3D%% 배경 씬은 금지하되, HERO_3D의 UI 배치는 Banner Character/Product Object/Companion Accent/Scene Substitute 역할별로 다르게 판단하세요.'
    }

    if (variant === 'C') {
      return '시안 C는 이미지 주도 레이아웃입니다. 3D를 쓴다면 product/detail/editorial card 안에서 충분한 visual area를 차지해야 하며, 작고 떠 있는 장식으로 쓰면 실패입니다.'
    }

    return ''
  })()

  return `## 3D 이미지-UI 통합 설계 (CRITICAL)

이번 3D 생성 의도:
${heroImagePrompt}

HTML을 작성하기 전에 내부적으로 아래 결정을 먼저 내리고, 그 결과가 실제 CSS/레이아웃에 반영되어야 합니다.

1. **3D의 역할 선택**
   - 캐릭터/게임/성장/리워드/감성 앱이거나, 화면 전체의 공간/상태/업무 맥락을 3D가 설명해야 하면 \`%%SCENE_3D%%\`를 사용합니다.
   - 데이터/KPI/예약/주문이 주인공이고 오브젝트/캐릭터는 보조라면 \`%%HERO_3D%%\`를 사용합니다.
   - 히어로에서 실사 이미지를 선택하는 기본 시안은 C안입니다. A/B 히어로는 각 시안의 visualPolicy를 따르고, A/B의 하위 콘텐츠 썸네일은 서비스 분석 결과에 따라 실사 사용 가능합니다.

2. **씬과 UI를 한 몸처럼 배치**
   - \`%%SCENE_3D%%\`는 이미지 위에 카드/텍스트를 그냥 얹는 것이 아니라, UI와 같은 캔버스에서 공간감/상황을 만드는 scene layer여야 합니다.
   - 텍스트 영역은 장면 주변의 넓은 여백, 좌측/상단 정보 영역, 또는 별도 카드 패널을 사용하고, 주요 오브젝트를 가리지 않습니다.
   - \`%%HERO_3D%%\`는 카드 오른쪽 아래에 붙이는 작은 스티커가 아니라, progress ring, reward card, growth stage, CTA 주변과 의미적으로 연결되게 배치합니다.

3. **%%HERO_3D 역할별 배율 판단**
   - 모든 3D를 같은 크기로 강제하지 마십시오. 먼저 아래 role 중 하나를 선택하고, 그 role에 맞는 배율·anchor·crop을 적용하십시오.
   - Banner Character: 마스코트/펫/리워드/멤버십/소비미션처럼 감정적 캐릭터가 주인공이면, 배너 너비 40~60%, 높이 90~130%, right/bottom anchor, 일부 crop 허용.
   - Product Object: 카드/쿠폰/기기/요금제/상품처럼 정보 보조 오브젝트이면, 배너 너비 32~48%, 높이 70~100%, 실루엣 보존.
   - Companion Accent: 대시보드/업무/폼 중심에서 보조 companion이면, 배너 너비 18~32%, KPI/CTA 주변에 배치.
   - Scene Substitute: 성장/게임/온보딩처럼 3D가 상태를 설명하면, stage 중앙/하단 55~75% 폭, 진행률·미션·액션 카드와 연결.
   - 실패: 3D가 120px 안팎의 작은 장식 스티커처럼 보이거나, 텍스트/CTA/수치와 의미적으로 연결되지 않는 경우.

4. **크기와 크롭**
   - 캐릭터 중심 앱에서 마스코트가 80px 이하의 작은 아이콘처럼 보이면 실패입니다.
   - SCENE_3D는 무조건 stage를 덮는 cover 배경이 아닙니다. 먼저 scene role을 고르십시오:
     * Ambient Canvas Scene: 날씨/상태/감성 앱처럼 3D가 하단·중앙 큰 공간을 차지하고 상단/주변에 정보가 놓임. object-fit:contain 또는 anchored absolute.
     * Split Workspace Scene: 물류/업무/데이터 앱처럼 좌측 정보 + 우측 대형 3D scene. grid/flex split layout.
     * Anchored Scene Layer: 카드/히어로 한쪽에 큰 3D scene을 anchor하고 일부 여백을 살림.
     * Hero Cover Scene: 정말 몰입형 배경이 필요한 경우에만 object-fit:cover 사용.
   - 히어로 씬은 화면의 큰 visual participant여야 하지만, UI 정보보다 과하게 강하거나 전체를 도배하면 실패입니다.
   - 전신이 중요한 성장/꾸미기 화면은 contain, 임팩트가 중요한 온보딩/혜택 화면은 일부 crop을 허용합니다.

5. **시안 차별화**
   - ${variantHint}
   - A/B/C가 모두 같은 "흰 카드 + 오른쪽 작은 3D" 구조로 나오면 실패입니다.
   - 3D를 쓰는 시안과 실사/데이터 중심 시안의 역할이 서로 달라야 합니다.
${domainPatternHint ? `
6. **도메인 + 시안별 필수 패턴**
   - ${domainPatternHint}` : ''}

이 섹션은 출력하지 말고 최종 HTML/CSS에만 반영하세요.`
}

function stripCodeFence(text: string): string {
  return text
    .replace(/^```(?:json|html|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function getVariantLabel(variantStyle?: string): string {
  if (variantStyle?.includes('시안 A')) return 'A'
  if (variantStyle?.includes('시안 B')) return 'B'
  if (variantStyle?.includes('시안 C')) return 'C'
  return 'single'
}

function buildFallbackDesignIntentPlan(args: {
  variantStyle?: string;
  platform: PlatformType;
  heroImagePrompt?: string;
  domain?: AppDomain;
  visualPolicy?: VariantVisualPolicy;
}): string {
  const variant = getVariantLabel(args.variantStyle)
  const visualRole = args.visualPolicy === 'scene-3d'
    ? '%%SCENE_3D%%'
    : args.visualPolicy === 'creon-object-3d'
      ? '%%HERO_3D%%'
      : args.visualPolicy === 'real-photo'
        ? `%%IMG_1:${args.heroImagePrompt ? args.heroImagePrompt.split('\n')[0].trim() : 'service lifestyle photo'}%%`
        : variant === 'A'
    ? 'none'
    : variant === 'B'
      ? '%%HERO_3D%%'
      : `%%IMG_1:${args.heroImagePrompt ? args.heroImagePrompt.split('\n')[0].trim() : 'service lifestyle photo'}%%`
  const fallbackStrategy = variant === 'A'
    ? 'Practical Dashboard'
    : variant === 'B'
      ? 'Immersive 3D Hero'
      : 'Lifestyle Real Photo'
  return JSON.stringify({
    variant,
    productBrief: {
      serviceType: args.domain ? DOMAIN_KEY_TO_LABEL[args.domain] ?? '기타 서비스' : '기타 서비스',
      targetUser: '브리프에서 추론한 핵심 사용자',
      coreProblem: '사용자가 첫 화면에서 해결하려는 가장 중요한 문제',
      primaryJourney: '상태 확인 -> 주요 행동 -> 결과/다음 탐색',
      mustShowData: ['핵심 상태', '주요 CTA', '보조 탐색', '실제 서비스 콘텐츠'],
      assumptions: ['입력이 부족한 부분은 실사용 가능한 제품 맥락으로 보정한다'],
    },
    selectedDesignStrategy: fallbackStrategy,
    designIntent: variant === 'A'
      ? '정보 구조와 핵심 지표를 가장 안정적으로 읽히게 만드는 실사용형 화면'
      : variant === 'B'
        ? '첫 화면의 감정적 임팩트와 전환 CTA를 가장 강하게 만드는 히어로형 화면'
        : '탐색과 브랜드 감성을 균형 있게 보여주는 큐레이션형 화면',
    layoutThesis: args.platform === 'web'
      ? '웹 폭에서는 상단 GNB와 넓은 콘텐츠 그리드로 확장하고, 모바일 폭에서는 1컬럼으로 접는다.'
      : '모바일 첫 화면 안에서 핵심 요약, 주요 행동, 보조 탐색이 순서대로 보이게 한다.',
    focalPoint: variant === 'B' ? 'hero visual + primary CTA' : 'primary metric or main content summary',
    primaryAction: '서비스 목적에 맞는 가장 빠른 CTA 1개',
    firstViewportContract: {
      visibleAboveFold: ['브랜드/현재 맥락', '핵심 요약', 'primary CTA', '다음 섹션 힌트'],
      hierarchy: '1 dominant focal area + 2 supporting content groups; never a sparse poster',
      rhythm: 'outer padding, section gap, card padding, and item gap must come from Design System Contract variables',
      density: args.platform === 'web' ? '1440px에서 서비스 목적에 맞는 그리드/컬럼으로 화면을 채운다' : '390px 첫 화면에서 서비스 판단에 필요한 정보와 행동이 충분히 보인다',
    },
    heroVisualPlan: {
      selectedRole: visualRole,
      use3d: Boolean(args.heroImagePrompt),
      semanticPurpose: args.heroImagePrompt ? '3D visual explains the service state/action, not decorative whitespace filling' : 'real image supports service context',
      containerType: visualRole === '%%SCENE_3D%%' ? 'integrated-scene-layer' : visualRole === 'none' ? 'data-only' : 'contained-visual-stage',
      requiredHtmlStructure: visualRole === 'none' ? 'no image container' : visualRole.startsWith('%%IMG') ? 'semantic img tag' : '.aide-visual-stage > img.aide-hero-3d',
      composition: visualRole === '%%SCENE_3D%%'
        ? 'large integrated 3D scene layer sharing the UI canvas with information; choose ambient, split, anchored, or cover only when appropriate'
        : visualRole === 'none'
          ? 'data and metrics dominate; no hero image; rich information density'
          : 'visual object or photo in a dedicated container connected to KPI or CTA',
      scale: visualRole === '%%SCENE_3D%%' ? 'substantial visual participant, often 45-75% of the hero/canvas but not necessarily full bleed' : visualRole === 'none' ? 'n/a' : '160-260px on mobile',
      crop: visualRole === '%%SCENE_3D%%' ? 'contain, anchored, split, or cover only for true immersive scenes' : 'contain unless impact crop is needed',
      safeArea: 'CTA, tab bar, and core numbers never overlap image bounds; use grid/flex separation and bottom padding',
      avoid: 'tiny sticker placement, duplicated 3D assets, unrelated stock images, visual competing with CTA, image overlapping button',
    },
    compositionQualityGates: [
      'No wireframe feel: every card/list/chart needs realistic Korean copy, numbers, states, and metadata',
      'No floating asset: image/3D must sit inside a designed surface with CSS grounding/anchor/alignment or intentional crop',
      'No random rhythm: same component type uses same padding/gap/radius',
      'No empty first viewport: above the fold must include service value, action, and content density',
    ],
    designSystemUse: 'Do not change tokens. Improve quality through layout, hierarchy, density, alignment, and rhythm.',
  }, null, 2)
}

export async function generateDesignIntentAndHeroVisualPlan(args: {
  brief: string;
  answersText: string;
  designMd?: string;
  generationPlan?: AideGenerationPlan;
  variantStyle?: string;
  platform: PlatformType;
  domain?: AppDomain;
  heroImagePrompt?: string;
  structuredAnswerRules?: string;
  apiKey?: string;
}): Promise<string> {
  const variant = getVariantLabel(args.variantStyle)
  const designContext = args.designMd ? extractDesignMdForPrompt(args.designMd).slice(0, 5000) : ''
  const domainContext = args.domain ? getDomainGuidance(args.domain).slice(0, 1800) : ''
  const variantKey = (['A', 'B', 'C'] as const).find(k => args.variantStyle?.toUpperCase().includes(k)) ?? 'A'
  const recommendedStrategyHint = args.generationPlan?.recommendedStrategy?.[variantKey]
    ? `\n## 이 시안(${variantKey})의 권장 디자인 전략 (서비스 서브타입 분석 기반)\n\`${args.generationPlan.recommendedStrategy[variantKey]}\` 전략을 이 시안의 기본 방향으로 우선 고려하세요. 전략 선택 근거와 다른 전략을 선택할 경우 그 이유를 assumptions에 명시하세요.\n`
    : ''
  const prompt = `당신은 AI UI 생성 전 단계의 프로덕트 디자이너 겸 아트 디렉터입니다.
HTML을 만들지 말고, 아래 입력을 바탕으로 시안 ${variant}의 Product Brief + Design Intent + Layout Composition Plan만 짧은 JSON으로 작성하세요.

목표:
- 사용자가 애매하게 적은 요청을 실제 제품 화면으로 번역한다.
- 부족한 정보는 멈춰서 묻지 말고, 합리적인 제품 가정으로 보정하되 assumptions에 명시한다.
- 이후 HTML 생성 모델이 이미지를 장식으로 끼우지 않고, UI와 자연스럽게 녹이도록 구체적인 설계 기준을 준다.
- 이후 HTML 생성 모델이 와이어프레임이 아니라 실제 서비스처럼 보이는 데이터, 상태, CTA, 탐색 구조를 넣도록 지시한다.
- QA 단계가 아니므로 검사/평가를 하지 않는다.
- 디자인 시스템 토큰을 바꾸지 않는다.
- A/B/C가 서로 다른 레이아웃 골격과 비주얼 전략을 갖게 한다.

반드시 결정할 것:
1. 사용자가 만들려는 서비스의 productBrief
2. 첫 화면에서 반드시 보여야 할 정보와 행동
3. 이 시안의 핵심 의도
4. 첫 화면 focal point
5. 3개 영역 구조: 핵심 요약 / 주요 행동 / 보조 탐색
6. 히어로 비주얼 전략
7. 3D 사용 여부와 사용할 경우 정확한 placeholder:
   - %%SCENE_3D%%: 통합 3D scene layer. 화면을 과하게 덮는 배경이 아니라 UI 캔버스 안에서 공간/상태/상황을 설명하는 큰 visual participant
   - %%MASCOT_3D%%: 배경 제거된 투명 마스코트
   - %%REWARD_OBJECT_3D%%: 배경 제거된 보상/아이템/상품 오브젝트
   - 3D가 어울리지 않으면 %%IMG_n:english keyword%% 실사 이미지 사용
8. 이미지 크롭/스케일/위치/safe area
9. Unsplash 키워드가 필요하면 브랜드명 말고 범용 영문 명사구
10. 간격/여백/정보밀도 품질 기준
11. 절대 하면 안 되는 것

디자인 전략 후보군:
- Practical Dashboard
- Mascot Companion
- Immersive Hero Scene
- Reward Store First
- Challenge Social
- Minimal Premium
- Gamified Quest
- Editorial Story

전략 선택 규칙:
- 시안별 전략은 고정 템플릿이 아니라 브리프에 맞는 선택입니다.
- A/B/C가 같은 골격이 되지 않도록 selectedDesignStrategy, layoutThesis, heroVisualPlan이 서로 명확히 달라야 합니다.
- 3D 요청이 있어도 모든 시안을 3D로 만들지 말고, 가장 설득력 있는 시안에 강하게 쓰거나 보조 마스코트로 제한합니다.
- Immersive Hero Scene을 선택하면 CTA는 이미지 하단 safe area 또는 별도 action panel에 배치해야 합니다. 이미지 중앙에 애매하게 떠 있으면 실패입니다.

응답 형식:
\`\`\`json
{
  "variant": "${variant}",
  "productBrief": {
    "serviceType": "...",
    "targetUser": "...",
    "coreProblem": "...",
    "primaryJourney": "...",
    "screenPurpose": "...",
    "mustShowData": ["...", "...", "..."],
    "assumptions": ["...", "..."]
  },
  "selectedDesignStrategy": "Practical Dashboard | Mascot Companion | Immersive Hero Scene | Reward Store First | Challenge Social | Minimal Premium | Gamified Quest | Editorial Story",
  "designIntent": "...",
  "layoutThesis": "...",
  "focalPoint": "...",
  "primaryAction": "...",
  "firstViewportContract": {
    "visibleAboveFold": ["...", "...", "..."],
    "hierarchy": "...",
    "rhythm": "...",
    "density": "...",
    "emptyStateAvoidance": "..."
  },
  "zones": {
    "summary": "...",
    "mainAction": "...",
    "supportingNavigation": "..."
  },
  "heroVisualPlan": {
    "selectedRole": "%%SCENE_3D%% | %%HERO_3D%% | %%IMG_1:keyword%% | none",
    "semanticPurpose": "...",
    "containerType": "contained-visual-stage | anchored-mascot-stage | reward-object-stage | cropped-immersive-scene-stage | content-image-container | none",
    "requiredHtmlStructure": ".aide-visual-stage > img.aide-hero-3d | semantic image container | none",
    "reason": "...",
    "composition": "...",
    "scale": "...",
    "crop": "...",
    "safeArea": "...",
    "placement": "...",
    "fallbackRealImageKeywords": ["..."]
  },
  "visualDifferentiation": "...",
  "designSystemApplication": "...",
  "compositionQualityGates": [
    "No wireframe feel: ...",
    "No floating asset: ...",
    "No random rhythm: ...",
    "No empty first viewport: ..."
  ],
  "avoid": ["...", "...", "..."]
}
\`\`\`

## 기획서
${args.brief}

## 사용자 답변
${args.answersText || '(없음)'}

## 구조화 규칙
${args.structuredAnswerRules || '(없음)'}

## 공통 생성 계획 — 모든 시안이 반드시 공유해야 하는 상위 계약
${args.generationPlan ? `\`\`\`json\n${JSON.stringify(args.generationPlan, null, 2)}\n\`\`\`` : '(없음)'}

## 시안 방향
${args.variantStyle || '(단일 시안)'}
${recommendedStrategyHint}
## 기준 플랫폼
${args.platform}

## 3D 생성 의도
${args.heroImagePrompt || '(3D 없음 또는 AI 판단)'}

${domainContext ? `## 도메인 패턴\n${domainContext}\n` : ''}
${designContext ? `## 디자인 시스템 요약\n${designContext}\n` : ''}
JSON 코드블록만 출력하세요.`

  try {
    const raw = await generatePro(prompt, args.apiKey, 'gemini-3.5-flash')
    const plan = stripCodeFence(raw)
    return plan.length > 200
      ? plan.slice(0, 6000)
      : buildFallbackDesignIntentPlan(args)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[gemini] design intent plan failed, using fallback:', message)
    return buildFallbackDesignIntentPlan(args)
  }
}

async function generateLayoutSkeleton(args: {
  brief: string
  designContract: DesignRhythmContract | null
  platform: string
  apiKey?: string
}): Promise<string> {
  if (!args.designContract) return ''
  const { colors, spacing, rounded } = args.designContract
  const rootLines = [
    ':root {',
    ...Object.entries(colors).map(([k, v]) => `  --color-${k}: ${v};`),
    ...Object.entries(spacing).map(([k, v]) => `  --spacing-${k}: ${v};`),
    ...Object.entries(rounded).map(([k, v]) => `  --rounded-${k}: ${v};`),
    '}',
  ]
  const rootBlock = rootLines.join('\n')
  const prompt = `당신은 시니어 프로덕트 디자이너입니다. 아래 기획서를 보고 레이아웃 뼈대를 결정하세요.

## 기준 플랫폼: ${args.platform}
## 기획서 요약: ${args.brief.slice(0, 800)}

아래 형식을 \`\`\`skeleton 코드블록으로 출력하세요.
SECTIONS 순서, NAV_TYPE/HERO_TYPE, 첫 화면 구성, 미디어 통합 방식을 결정하고, :root 블록은 수정 없이 그대로 포함하세요.

\`\`\`skeleton
SECTIONS: nav-header, hero, [섹션명], [섹션명], ..., [bottom-nav|없음]
NAV_TYPE: gnb | lnb | bottom-tab | none
HERO_TYPE: image-hero | stat-dashboard | action-cta | search-bar | none
FIRST_VIEWPORT: [첫 화면에서 서비스 목적 판단에 반드시 필요한 콘텐츠와 행동]
CONTENT_DENSITY: sparse-premium | balanced | dense-dashboard
MEDIA_INTEGRATION: no-media | contained-object | anchored-mascot | cropped-hero-scene | content-thumbnail-grid
CARD_RHYTHM: outer padding, section gap, card padding, item gap은 :root의 aide/design token 변수만 사용
${rootBlock}
\`\`\`

형식 그대로만 출력하세요.`
  try {
    const raw = await generatePro(prompt, args.apiKey, 'gemini-3.5-flash')
    const match = raw.match(/```skeleton\n?([\s\S]*?)```/)
    if (match) return match[1].trim()
    const rootMatch = raw.match(/:root\s*\{[\s\S]*?\}/)
    return rootMatch ? `SECTIONS: (auto)\nNAV_TYPE: auto\nHERO_TYPE: auto\n${rootMatch[0]}` : ''
  } catch {
    return ''
  }
}

const BLUEPRINT_VARIANTS = ['A', 'B', 'C'] as const

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function normalizeLayoutBlueprint(raw: Partial<LayoutBlueprint>, variant: LayoutBlueprint['variant'], platform: PlatformType): LayoutBlueprint {
  const isWeb = platform === 'web'
  const viewport = { width: isWeb ? 1440 : 390, height: isWeb ? 900 : 844 }
  const fallbackSections: LayoutBlueprintSection[] = [
    { id: 'nav', label: isWeb ? '상단 내비게이션' : '앱 헤더', role: 'nav', y: 0, height: isWeb ? 72 : 56, density: 'balanced', children: ['brand', 'primary action'] },
    { id: 'hero', label: variant === 'A' ? '핵심 요약' : variant === 'B' ? '3D 히어로' : '실사 히어로', role: 'hero', y: isWeb ? 96 : 72, height: variant === 'A' ? 156 : 196, density: 'balanced', children: ['headline', 'summary', 'cta'] },
    { id: 'quick-actions', label: '빠른 실행', role: 'actions', y: isWeb ? 276 : 292, height: 88, columns: 4, density: 'dense', children: ['action 1', 'action 2', 'action 3', 'action 4'] },
    { id: 'content-list', label: '주요 콘텐츠', role: 'list', y: isWeb ? 388 : 404, height: 260, density: 'balanced', children: ['item title', 'metadata', 'secondary action'] },
  ]
  const sections = Array.isArray(raw.sections) && raw.sections.length
    ? raw.sections.slice(0, 8).map((section, index) => {
      const fallback = fallbackSections[index] ?? fallbackSections[fallbackSections.length - 1]
      const role = ['nav', 'hero', 'kpi', 'actions', 'content', 'list', 'media', 'form', 'tabbar',
        'collection', 'chart', 'banner', 'cta-block'].includes(String(section.role))
        ? section.role as LayoutBlueprintSection['role']
        : fallback.role
      const density = ['sparse', 'balanced', 'dense'].includes(String(section.density))
        ? section.density as LayoutBlueprintSection['density']
        : fallback.density
      return {
        id: String(section.id || fallback.id || `section-${index + 1}`).replace(/\s+/g, '-').toLowerCase(),
        label: String(section.label || fallback.label || `섹션 ${index + 1}`),
        role,
        y: clampNumber(section.y, 0, viewport.height + 400, fallback.y),
        height: clampNumber(section.height, 40, isWeb ? 520 : 360, fallback.height),
        columns: section.columns ? clampNumber(section.columns, 1, 6, fallback.columns ?? 1) : fallback.columns,
        density,
        children: Array.isArray(section.children) && section.children.length
          ? section.children.slice(0, 8).map(child => String(child))
          : fallback.children,
        notes: section.notes ? String(section.notes).slice(0, 160) : undefined,
        imageStrategy: section.imageStrategy && typeof section.imageStrategy === 'object' ? {
          position: (['top', 'left', 'background', 'right'] as const).includes((section.imageStrategy as LayoutBlueprintSection['imageStrategy'])?.position as never)
            ? (section.imageStrategy as LayoutBlueprintSection['imageStrategy'])!.position : 'top',
          aspectRatio: (['16:9', '1:1', '3:4', '4:3'] as const).includes((section.imageStrategy as LayoutBlueprintSection['imageStrategy'])?.aspectRatio as never)
            ? (section.imageStrategy as LayoutBlueprintSection['imageStrategy'])!.aspectRatio : '16:9',
          style: (['photo', '3d', 'illustration', 'icon'] as const).includes((section.imageStrategy as LayoutBlueprintSection['imageStrategy'])?.style as never)
            ? (section.imageStrategy as LayoutBlueprintSection['imageStrategy'])!.style : 'photo',
        } : undefined,
      }
    })
    : fallbackSections
  const rhythm = {
    pagePadding: clampNumber(raw.rhythm?.pagePadding, 12, 64, isWeb ? 40 : 16),
    sectionGap: clampNumber(raw.rhythm?.sectionGap, 12, 48, 20),
    cardGap: clampNumber(raw.rhythm?.cardGap, 8, 32, 12),
    cardPadding: clampNumber(raw.rhythm?.cardPadding, 12, 32, 20),
    // These are populated from design.md in generateLayoutBlueprints — defaults until then
    headerHeight: (raw.rhythm as LayoutBlueprint['rhythm'])?.headerHeight ?? 56,
    tabbarHeight: (raw.rhythm as LayoutBlueprint['rhythm'])?.tabbarHeight ?? 72,
    buttonHeight: (raw.rhythm as LayoutBlueprint['rhythm'])?.buttonHeight ?? 48,
    inputHeight: (raw.rhythm as LayoutBlueprint['rhythm'])?.inputHeight ?? 52,
  }
  let cursorY = 0
  const compactSections = [...sections].sort((a, b) => a.y - b.y).map((section, index) => {
    const maxGap = isWeb ? 56 : 28
    const minGap = index === 0 ? 0 : Math.min(rhythm.sectionGap, isWeb ? 32 : 20)
    const proposedGap = Math.max(0, section.y - cursorY)
    const y = index === 0
      ? Math.max(0, Math.min(section.y, rhythm.pagePadding))
      : cursorY + Math.max(minGap, Math.min(maxGap, proposedGap || minGap))
    const maxHeight = section.role === 'hero' || section.role === 'media'
      ? (isWeb ? 360 : 240)
      : (isWeb ? 260 : 180)
    const height = clampNumber(section.height, 44, maxHeight, section.height)
    cursorY = y + height
    return { ...section, y, height }
  })

  return {
    variant,
    strategy: String(raw.strategy || (variant === 'A' ? '정보 밀도형' : variant === 'B' ? '3D 전환형' : '실사 탐색형')),
    viewport, // always use platform-derived viewport, never trust AI's value
    navType: ['gnb', 'lnb', 'bottom-tab', 'none'].includes(String(raw.navType))
      ? raw.navType as LayoutBlueprint['navType']
      : isWeb ? 'gnb' : 'bottom-tab',
    heroType: ['none', 'image-hero', '3d-hero', 'stat-dashboard', 'search-bar', 'action-cta'].includes(String(raw.heroType))
      ? raw.heroType as LayoutBlueprint['heroType']
      : variant === 'A' ? 'stat-dashboard' : variant === 'B' ? '3d-hero' : 'image-hero',
    firstViewport: Array.isArray(raw.firstViewport) && raw.firstViewport.length
      ? raw.firstViewport.slice(0, 8).map(item => String(item))
      : ['브랜드/현재 상태', '핵심 요약', 'primary CTA', '빠른 실행', '주요 콘텐츠 힌트'],
    rhythm,
    sections: compactSections,
    auditChecklist: Array.isArray(raw.auditChecklist) && raw.auditChecklist.length
      ? raw.auditChecklist.slice(0, 8).map(item => String(item))
      : ['모바일 첫 화면 정보량 충분', '짧은 UI 라벨 한 줄 유지', '내비가 콘텐츠를 가리지 않음', '선택한 디자인 시스템 spacing rhythm 유지'],
  }
}

export async function generateLayoutBlueprints(args: {
  designMd: string
  brief: string
  answers: Record<string, string | string[]>
  projectSummary: string
  platform?: PlatformType
  domain?: AppDomain
  generationPlan?: AideGenerationPlan
  apiKey?: string
}): Promise<LayoutBlueprint[]> {
  const platform = args.platform ?? 'mobile'
  const isWeb = platform === 'web'
  const designContract = buildDesignSystemContract(args.designMd, false).slice(0, 5000)
  const answerLines = Object.entries(args.answers ?? {})
    .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join('\n')
  // Explicitly extract B2C/B2B to control blueprint style
  const serviceTypeAnswer = String(args.answers?.['service_type'] ?? '')
  const isB2C = serviceTypeAnswer.includes('B2C') || (!serviceTypeAnswer.includes('B2B') && args.domain !== 'business' && args.domain !== 'productivity')
  const isB2B = !isB2C

  // Extract actual design token values BEFORE building the prompt so the LLM
  // can use them directly when calculating section y/height.
  const rhythmContract = buildDesignRhythmContract(args.designMd, false)
  const designRhythm = rhythmContract ? {
    pagePadding: parseNumericPx(rhythmContract.layoutRhythm.pagePadding) ?? 16,
    sectionGap: parseNumericPx(rhythmContract.layoutRhythm.sectionGap) ?? 20,
    cardGap: parseNumericPx(rhythmContract.layoutRhythm.cardGap) ?? 12,
    cardPadding: parseNumericPx(rhythmContract.layoutRhythm.cardPadding) ?? 20,
    headerHeight: parseNumericPx(rhythmContract.layoutRhythm.headerHeight) ?? 56,
    tabbarHeight: parseNumericPx(rhythmContract.layoutRhythm.tabbarHeight) ?? 72,
    buttonHeight: parseNumericPx(rhythmContract.layoutRhythm.buttonHeight) ?? 48,
    inputHeight: parseNumericPx(rhythmContract.layoutRhythm.inputHeight) ?? 52,
  } : { pagePadding: 16, sectionGap: 20, cardGap: 12, cardPadding: 20, headerHeight: 56, tabbarHeight: 72, buttonHeight: 48, inputHeight: 52 }

  const { pagePadding, sectionGap, cardGap, cardPadding, headerHeight, tabbarHeight, buttonHeight, inputHeight } = designRhythm

  const prompt = `당신은 제품 UX 설계자입니다. 최종 HTML을 만들기 전에, 사람이 확인할 수 있는 A/B/C Layout Blueprint JSON을 작성하세요.

목표:
- 실제 디자인/색상/이미지는 만들지 말고, 회색 와이어프레임으로 렌더링 가능한 화면 청사진만 만든다.
- 섹션 순서, 높이, 첫 viewport 정보량, 여백 리듬을 안정적으로 정한다.
- 이 blueprint는 이후 최종 HTML 생성에서 강제 계약으로 쓰인다.

## 프로젝트
${args.projectSummary}

## 브리프
${args.brief.slice(0, 1200)}

## 답변
${answerLines || '(없음)'}

## 플랫폼
${platform}

## 도메인
${args.domain ?? 'other'}

## 생성 계획
\`\`\`json
${args.generationPlan ? JSON.stringify(args.generationPlan, null, 2).slice(0, 5000) : '{}'}
\`\`\`

## 콘텐츠 인벤토리 적용 규칙
생성 계획의 contentInventory가 있으면 blueprint children에 해당 콘텐츠를 구체적으로 넣어라.
- contentInventory를 그대로 나열하지 말고, 사용자가 첫 화면에서 판단해야 하는 핵심 정보와 행동을 선택한다.
- 비교 서비스는 비교/추천/절약액, 루틴 서비스는 상태/미션/진행률, 커머스는 검색/카테고리/상품, 대시보드는 KPI/필터/작업 큐를 우선 검토한다.
- 멤버십/통신 요금제 서비스는 요금제 비교, 예상 절약액, 위약금/약정 상태, 추천 요금제, 멤버십 혜택, 전환 CTA를 서비스 맥락에 맞게 선택한다.
- A/B/C 모두 충분한 정보량을 가져야 하지만, 같은 콘텐츠 덩어리 세트나 같은 section order를 반복하지 않는다.
- 특히 B안은 hero만 있는 포스터로 끝나면 실패다. 전환에 필요한 계산 결과, 혜택, 추천, 신뢰 근거 중 해당 서비스에 맞는 정보를 연결한다.

## 디자인 시스템 계약 요약
\`\`\`
${designContract}
\`\`\`

## 실제 디자인 토큰 — section y/height 계산에 반드시 이 값을 사용하라
- pagePadding: ${pagePadding}px  (좌우 여백, y/height 계산 무관)
- sectionGap: ${sectionGap}px   ← 섹션 간 y 간격은 정확히 이 값
- cardPadding: ${cardPadding}px (카드 상하 내부 패딩)
- cardGap: ${cardGap}px         (카드 내 요소 간 간격)
- headerHeight: ${headerHeight}px ← nav 섹션 height는 정확히 이 값
- tabbarHeight: ${tabbarHeight}px ← tabbar 섹션 height는 정확히 이 값
- buttonHeight: ${buttonHeight}px
- inputHeight: ${inputHeight}px

## 섹션 role 종류 (확장됨)
기존: nav, hero, kpi, actions, content, list, media, form, tabbar
신규:
- banner: 프로모션/이벤트 배너 (이미지+텍스트 오버레이, 단일 CTA)
- collection: 가로 스크롤 카드 캐러셀 (탐색 중심)
- chart: 데이터 시각화 (라인/바/파이 차트 + 범례)
- cta-block: CTA 전용 섹션 (큰 버튼 + 짧은 카피, 배경 강조)

## 섹션 height 계산 공식 — children 콘텐츠 기반으로 계산하라
각 섹션의 height = 내부 요소들의 실제 높이 합산 + 여백. 임의로 줄이거나 늘리지 말 것.

| 섹션 role | height 계산 방법 |
|-----------|----------------|
| nav | headerHeight (${headerHeight}px) 고정 |
| tabbar | tabbarHeight (${tabbarHeight}px) 고정 |
| hero (image-hero/3d-hero) | 이미지 영역(viewport 높이의 28~35%) + 텍스트(28+22px) + CTA(buttonHeight) + cardPadding×2 |
| hero (stat-dashboard) | cardPadding + KPI 2행(80×2px) + sectionGap + buttonHeight + cardPadding |
| hero (search-bar) | cardPadding + 타이틀(28px) + 검색창(inputHeight) + 빠른실행(48px) + cardPadding |
| hero (action-cta) | cardPadding + 타이틀(36px) + 부제목(22px) + buttonHeight + cardPadding |
| kpi | cardPadding + 행수 × 80px + (행수-1) × cardGap + cardPadding |
| actions | cardPadding + 72px + cardPadding = ${cardPadding + 72 + cardPadding}px |
| list (sparse) | 2 × (cardPadding×2 + 이미지높이 + 텍스트) + cardGap |
| list (balanced) | 3 × (cardPadding×2 + 이미지높이 + 텍스트) + cardGap×2 |
| list (dense) | 5 × (cardPadding + 텍스트22px + cardPadding) + cardGap×4 |
| banner | 이미지높이(viewport 높이의 18~22%) + 텍스트(28+16px) + cardPadding×2 |
| collection | cardPadding + 카드높이(썸네일100px + 텍스트36px) + cardPadding |
| chart | cardPadding + 차트영역(160px) + 범례(24px) + cardPadding |
| cta-block | cardPadding×2 + 타이틀(28px) + 부제목(20px) + buttonHeight + cardPadding×2 |
| content | 실제 줄수 × 22px + 제목 28px + cardPadding×2 |
| form | n × inputHeight + (n-1) × cardGap + cardPadding×2 |
| media (sparse) | 행수=1, 이미지높이=160px: cardPadding×2 + 160 + cardGap |
| media (balanced) | 행수=2, cols×2: cardPadding×2 + 2×(80px + cardGap) |
| media (dense) | 행수=3, cols×3: cardPadding×2 + 3×(60px + cardGap) |

## imageStrategy 필드 — 이미지/미디어 섹션에 반드시 포함
이미지를 사용하는 role(hero/banner/collection/media/list)에는 imageStrategy를 명시:
\`\`\`json
"imageStrategy": {
  "position": "top",         // top | left | background | right
  "aspectRatio": "16:9",     // 16:9 | 1:1 | 3:4 | 4:3
  "style": "photo"           // photo | 3d | illustration | icon
}
\`\`\`

## density 필드 — 반드시 실제 콘텐츠 양에 맞게 설정
- sparse: 아이템 1~2개, 여백 강조, 큰 이미지/텍스트
- balanced: 아이템 3~4개, 표준 간격
- dense: 아이템 5~6개, 압축 간격, 정보 중심

## y 좌표 계산 규칙
- y[0] = 0 (첫 섹션은 항상 y=0)
- y[n] = y[n-1] + height[n-1] + sectionGap (${sectionGap}px)
- tabbar는 화면 하단 고정: y = viewport.height - tabbarHeight
- 섹션이 겹치면 안 된다. 빈 공간이 생기면 안 된다.

## 서비스 성격에 따른 디자인 방향
${isB2C ? `### 이 서비스는 B2C 소비자용입니다
- heroType A는 "action-cta" 또는 "image-hero"를 사용하라. "stat-dashboard"(B2B 대시보드)는 절대 금지.
- heroType B는 "3d-hero" 또는 "image-hero"로 비주얼을 강조하라.
- heroType C는 "image-hero"로 라이프스타일·감성 이미지를 사용하라.
- navType: 모바일은 "bottom-tab", 웹은 "gnb". "lnb"(사이드바)는 B2B 전용이므로 절대 사용 금지.
- 정보보다 감성·행동·탐색을 우선하라. Toss·카카오·네이버 수준의 직관적 소비자 앱 톤.
- "banner", "collection", "cta-block" role을 적극 활용하라.` : `### 이 서비스는 B2B 업무/기업용입니다
- heroType A는 "stat-dashboard"로 핵심 지표를 우선 노출하라.
- 웹 플랫폼이면 navType: "lnb" 사용 (A 시안). lnb 시 sections에 nav 제외.
- 정보 밀도를 높이고 "kpi", "chart", "list" role을 중심으로 구성하라.`}

반드시 JSON만 출력하세요. 마크다운 금지.
스키마 (각 섹션에 imageStrategy 포함 예시):
{
  "blueprints": [
    {
      "variant": "A",
      "strategy": "${isB2C ? '탐색·행동 중심형' : '정보 밀도형'}",
      "viewport": { "width": ${isWeb ? 1440 : 390}, "height": ${isWeb ? 900 : 844} },
      "navType": "${isB2B && isWeb ? 'lnb' : isWeb ? 'gnb' : 'bottom-tab'}",
      "heroType": "${isB2C ? 'action-cta' : 'stat-dashboard'}",
      "firstViewport": ["히어로/요약", "핵심 KPI", "primary CTA", "빠른 실행", "콘텐츠 리스트", "최근 활동/인사이트"],
      "rhythm": { "pagePadding": ${pagePadding}, "sectionGap": ${sectionGap}, "cardGap": ${cardGap}, "cardPadding": ${cardPadding} },
      "sections": [
        { "id": "header", "label": "앱 헤더", "role": "nav", "y": 0, "height": ${headerHeight}, "density": "balanced", "children": ["brand", "notification"] },
        { "id": "hero", "label": "핵심 요약", "role": "hero", "y": ${headerHeight + sectionGap}, "height": ${cardPadding * 2 + 160 + sectionGap + buttonHeight}, "density": "dense", "children": ["headline", "kpi", "cta"], "imageStrategy": { "position": "top", "aspectRatio": "16:9", "style": "photo" } },
        { "id": "banner", "label": "프로모 배너", "role": "banner", "y": ${headerHeight + sectionGap + cardPadding * 2 + 160 + sectionGap + buttonHeight + sectionGap}, "height": ${cardPadding * 2 + 120 + 44}, "density": "sparse", "children": ["event-title", "cta"], "imageStrategy": { "position": "background", "aspectRatio": "16:9", "style": "photo" } }
      ],
      "auditChecklist": ["모바일 첫 viewport에 서비스 판단 정보 충분"]
    }
  ]
}

규칙:
- A는 이미지 없는 데이터/정보형 (웹이면 lnb), B는 3D/비주얼 히어로형, C는 실사 이미지/탐색형.
- 모바일 viewport는 390x844, 웹 viewport는 1440x900을 기본으로 한다.
- hero가 첫 화면의 35%를 넘지 않게 한다.
- 각 blueprint는 서비스 목적에 맞는 충분한 section을 가진다. 모바일 A/B/C 모두 첫 viewport에 실제 판단 정보와 다음 행동이 보여야 한다.
- children은 실제 HTML에 들어갈 UI 단위 이름이어야 한다.
- rhythm 값은 위 실제 디자인 토큰 값으로 고정한다. 임의로 바꾸지 말 것.
- 이미지 사용 섹션에는 반드시 imageStrategy를 포함하라.`

  const raw = await generatePro(prompt, args.apiKey, 'gemini-3.5-flash')
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Layout blueprint JSON을 파싱하지 못했습니다')
  const parsed = JSON.parse(jsonMatch[0]) as { blueprints?: Partial<LayoutBlueprint>[] }

  return BLUEPRINT_VARIANTS.map(variant => {
    const rawBlueprint = parsed.blueprints?.find(bp => bp.variant === variant) ?? parsed.blueprints?.[BLUEPRINT_VARIANTS.indexOf(variant)] ?? {}
    const blueprint = normalizeLayoutBlueprint(rawBlueprint, variant, platform)
    // Always enforce actual design.md rhythm values regardless of what LLM generated
    blueprint.rhythm = {
      pagePadding, sectionGap, cardGap, cardPadding,
      headerHeight: designRhythm.headerHeight,
      tabbarHeight: designRhythm.tabbarHeight,
      buttonHeight: designRhythm.buttonHeight,
      inputHeight: designRhythm.inputHeight,
    }
    return blueprint
  })
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildSectionScaffold(section: LayoutBlueprintSection): string {
  const id = escapeHtmlAttr(section.id)
  const label = escapeHtmlAttr(section.label)
  const role = escapeHtmlAttr(section.role)
  const density = escapeHtmlAttr(section.density)
  const columns = section.columns ?? 1
  const children = section.children.length
    ? section.children
    : section.role === 'hero'
      ? ['headline', 'supporting-copy', 'visual', 'primary-cta']
      : ['content']
  const zoneLines = children.map(child => {
    const zone = escapeHtmlAttr(child.replace(/\s+/g, '-').toLowerCase())
    return `        <div class="scaffold-zone scaffold-zone-${zone}" data-blueprint-zone="${zone}"></div>`
  }).join('\n')
  const imageStrategy = section.imageStrategy
    ? ` data-image-position="${escapeHtmlAttr(section.imageStrategy.position)}" data-image-style="${escapeHtmlAttr(section.imageStrategy.style)}"`
    : ''

  return `      <section class="aide-section scaffold-section scaffold-role-${role} scaffold-density-${density}" data-blueprint-section="${id}" data-blueprint-role="${role}" data-blueprint-label="${label}" data-blueprint-height="${section.height}" data-blueprint-columns="${columns}"${imageStrategy}>
        <div class="section-header">
          <h2>${label}</h2>
          ${section.role === 'hero' ? '<span class="section-meta">hero</span>' : '<button class="section-link" type="button">전체보기</button>'}
        </div>
${zoneLines}
      </section>`
}

function buildLayoutScaffoldContract(blueprint: LayoutBlueprint, platform: PlatformType): string {
  const isWeb = platform === 'web'
  const navSections = blueprint.sections.filter(s => s.role === 'nav')
  const tabbarSections = blueprint.sections.filter(s => s.role === 'tabbar')
  const contentSections = blueprint.sections.filter(s => s.role !== 'nav' && s.role !== 'tabbar')
  const headerSection = navSections[0]
  const tabbarSection = tabbarSections[0]
  const hasLnb = blueprint.navType === 'lnb'
  const hasTopHeader = blueprint.navType === 'gnb' || (!hasLnb && !!headerSection)
  const hasBottomTabbar = blueprint.navType === 'bottom-tab' || !!tabbarSection
  const sectionIds = blueprint.sections.map(s => s.id).join(' → ')
  const rhythm = blueprint.rhythm
  const contentHtml = contentSections.map(section => buildSectionScaffold(section)).join('\n')
  const headerHtml = headerSection
    ? hasLnb
      ? `  <aside class="app-lnb global-nav" data-blueprint-section="${escapeHtmlAttr(headerSection.id)}" data-blueprint-role="nav">
    <div class="brand-slot"></div>
    <nav class="lnb-items"></nav>
  </aside>`
      : `  <header class="app-header global-nav" data-blueprint-section="${escapeHtmlAttr(headerSection.id)}" data-blueprint-role="nav">
    <div class="brand-slot"></div>
    <nav class="gnb-items"></nav>
    <div class="header-actions"></div>
  </header>`
    : ''
  const tabbarHtml = tabbarSection
    ? `  <nav class="mobile-tabbar global-nav" data-blueprint-section="${escapeHtmlAttr(tabbarSection.id)}" data-blueprint-role="tabbar"></nav>`
    : ''

  return `## Layout Scaffold Contract (MANDATORY — 이 골조를 최종 HTML의 구조로 사용)
아래 scaffold는 사용자가 확인한 Layout Blueprint를 실제 HTML 구조로 바꾼 것입니다. 최종 HTML은 이 scaffold의 구조를 삭제/병합/순서변경하지 말고, 내부 zone에 실제 콘텐츠와 디자인 시스템 스타일을 채우세요.

### Scaffold Invariants
- section 순서: ${sectionIds}
- 모든 \`data-blueprint-section\` 값은 최종 HTML에 정확히 1회씩 존재해야 합니다.
- \`data-blueprint-section\`이 있는 section/header/nav/aside를 삭제, 병합, 이름 변경하지 마세요.
- \`data-blueprint-zone\`은 zone 의미에 맞는 실제 콘텐츠로 채우되, zone 자체를 무의미한 빈 div로 남기지 마세요.
- global navigation(header/GNB/LNB/tabbar)은 scroll content 밖에 둡니다.
- 본문은 \`.content-scroll\`에서만 세로 스크롤됩니다.
- CTA는 \`.action-zone\`, \`data-blueprint-zone*="cta"\`, 또는 hero 하단 safe action zone에 배치하세요.

### Scaffold HTML
\`\`\`html
<div class="app-shell scaffold-${blueprint.variant}" data-layout-variant="${blueprint.variant}" data-nav-type="${blueprint.navType}" data-hero-type="${blueprint.heroType}">
${headerHtml}
  <main class="content-scroll" data-blueprint-scroll="content">
${contentHtml}
  </main>
${tabbarHtml}
</div>
\`\`\`

### Required Scaffold CSS Baseline
\`\`\`css
:root {
  --aide-page-padding: ${rhythm.pagePadding}px;
  --aide-section-gap: ${rhythm.sectionGap}px;
  --aide-card-gap: ${rhythm.cardGap}px;
  --aide-card-padding: ${rhythm.cardPadding}px;
  --aide-header-height: ${rhythm.headerHeight}px;
  --aide-tabbar-height: ${rhythm.tabbarHeight}px;
  --aide-button-height: ${rhythm.buttonHeight}px;
  --aide-input-height: ${rhythm.inputHeight}px;
}
html, body { margin:0; width:100%; min-height:100%; }
body { overflow:hidden; }
.app-shell {
  min-height:100dvh;
  height:100dvh;
  display:flex;
  flex-direction:column;
  background:var(--color-primary-fill-neutral, var(--color-background, #f2f5f9));
}
.global-nav { flex:0 0 auto; z-index:50; }
.app-header {
  position:sticky;
  top:0;
  min-height:var(--aide-header-height);
  display:flex;
  align-items:center;
}
.app-lnb {
  position:fixed;
  left:0;
  top:0;
  bottom:0;
  width:240px;
}
.content-scroll {
  flex:1 1 auto;
  min-height:0;
  overflow-y:auto;
  -webkit-overflow-scrolling:touch;
  padding:var(--aide-section-gap) var(--aide-page-padding);
  display:flex;
  flex-direction:column;
  gap:var(--aide-section-gap);
}
.mobile-tabbar {
  position:fixed;
  left:0;
  right:0;
  bottom:0;
  min-height:calc(var(--aide-tabbar-height) + env(safe-area-inset-bottom));
  z-index:50;
}
.scaffold-section {
  flex:0 0 auto;
  min-height:var(--section-min-height, auto);
}
.scaffold-section > .section-header:first-child {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:var(--aide-card-gap);
  margin:0 0 8px;
}
/* Full-bleed hero/banner 섹션: content-scroll padding을 음수 마진으로 탈출했더라도 내부 콘텐츠에 좌우 패딩 강제 적용 */
.hero-section > .hero-content,
.hero-section > .hero-inner,
.hero-section > .hero-body,
.hero-section > .hero-text,
.hero-section > .hero-info,
.hero-section > .hero-description,
.hero-section > .hero-copy,
.hero-section > .hero-wrap,
.hero-section > .hero-caption,
.hero-banner > .hero-body,
.hero-banner > .hero-inner,
.hero-banner > .hero-text,
.hero-banner > .hero-info,
.hero-banner > .hero-wrap,
.hero-banner > .hero-content,
[data-blueprint-section] > .hero-body,
[data-blueprint-section] > .hero-inner,
[data-blueprint-section] > .hero-content,
[data-blueprint-section] > .hero-text,
[data-blueprint-section] > .hero-info,
[data-blueprint-section] > .hero-description,
[data-blueprint-section] > .hero-copy,
[data-blueprint-section] > .hero-wrap,
[data-blueprint-section] > .hero-caption {
  padding-left:var(--aide-page-padding);
  padding-right:var(--aide-page-padding);
}
${hasBottomTabbar ? '.content-scroll { padding-bottom:calc(var(--aide-tabbar-height) + env(safe-area-inset-bottom) + var(--aide-section-gap)); }' : ''}
${hasLnb ? '.app-shell { padding-left:240px; } .content-scroll { height:100dvh; }' : ''}
${hasTopHeader && !hasLnb ? '.content-scroll { min-height:0; }' : ''}
${isWeb ? '@media (min-width:1024px) { .content-scroll { padding:var(--aide-section-gap) var(--aide-page-padding); } }' : ''}
\`\`\`

### Scaffold Fill Rules
- \`scaffold-zone-headline/title/copy\`: 실제 한국어 헤드라인, 설명, 상태값을 채우세요.
- \`scaffold-zone-visual/image/media\`: 필요한 경우 \`%%HERO_3D%%\`, \`%%SCENE_3D%%\`, \`%%IMG_n:keyword%%\`, \`%%THUMB:keyword:width:height%%\` 중 하나를 img src에 넣으세요.
- 빈 visual placeholder, 빈 회색 박스, blur skeleton, border만 있는 이미지 영역은 최종 HTML에 남기지 마세요.
- 이미지 없는 데이터형 시안(A)에서 hero visual 영역이 생기면 이미지 박스 대신 KPI, 차트, 사용량 그래프, 추천 요금 카드 등 실제 데이터 UI로 채우세요.
- 이미지형 시안(B/C)에서 hero/media 영역이 있으면 반드시 \`<img src="%%...%%">\` 형태의 이미지 placeholder를 포함하세요.
- \`scaffold-zone-cta/action/button\`: 버튼은 해당 section의 하단 action row 또는 visual safe area 하단에 배치하세요.
- 리스트/컬렉션/차트 section은 실제 아이템 3개 이상 또는 실제 데이터 수치를 채우세요.
`
}

function auditLayoutBlueprintHtml(html: string, blueprint?: LayoutBlueprint): string[] {
  if (!blueprint) return []
  const issues: string[] = []
  const found = [...html.matchAll(/data-blueprint-section=(["'])(.*?)\1/g)].map(match => match[2])
  const expected = blueprint.sections.map(section => section.id)
  const missing = expected.filter(id => !found.includes(id))
  const duplicate = found.filter((id, index) => found.indexOf(id) !== index)
  if (missing.length) issues.push(`missing blueprint sections: ${missing.join(', ')}`)
  if (duplicate.length) issues.push(`duplicate blueprint sections: ${Array.from(new Set(duplicate)).join(', ')}`)
  const orderedFound = found.filter(id => expected.includes(id))
  const expectedOrder = expected.filter(id => orderedFound.includes(id))
  if (orderedFound.join('>') !== expectedOrder.join('>')) {
    issues.push(`blueprint section order changed: expected ${expectedOrder.join(' > ')}, got ${orderedFound.join(' > ')}`)
  }
  if (!/class=(["'])[^"']*(?:content-scroll|page-scroll)[^"']*\1/i.test(html) && !/<main\b[^>]*overflow-y\s*:/i.test(html)) {
    issues.push('missing content scroll container')
  }
  if ((blueprint.navType === 'gnb' || blueprint.sections.some(section => section.role === 'nav')) && !/(position\s*:\s*(?:sticky|fixed)[^;}]*;[^}]*top\s*:\s*0|top\s*:\s*0[^;}]*;[^}]*position\s*:\s*(?:sticky|fixed))/i.test(html)) {
    issues.push('global header/nav is not sticky or fixed')
  }
  if ((blueprint.navType === 'bottom-tab' || blueprint.sections.some(section => section.role === 'tabbar')) && !/(position\s*:\s*fixed[^}]*bottom\s*:\s*0|bottom\s*:\s*0[^}]*position\s*:\s*fixed)/i.test(html)) {
    issues.push('bottom tabbar is not fixed to bottom')
  }
  return issues
}

export async function generateUI(params: GenerateParams, apiKey?: string): Promise<GenerateUIResult> {
  const { designMd, brief, answers, projectSummary, logoDataUrl, brandColors, mainOnly = false, variantStyle, referenceImageBase64, referenceImageKind = 'reference', asIsAnalysis, platform, modelId = 'gemini-3.1-pro-preview', heroImagePrompt, heroSubject, sharedVisualMode, sharedVisualSubject, visualPolicy, generationPlan, layoutBlueprint, domain, onStep, prdDoc, iaImageBase64, iaText } = params;
  const effectiveHeroImagePrompt = heroSubject || heroImagePrompt
  const effectiveVisualPolicy = visualPolicy ?? (() => {
    if (getVariantLabel(variantStyle) !== 'B') return undefined
    const hasSceneSignal = /마스코트|캐릭터|반려|성장|게임|퀘스트|리워드|자연|식물|숲|동물|날씨|감성|mascot|character|pet|growth|game|quest|reward|nature|plant|forest|animal|weather/.test(
      (brief ?? '') + ' ' + (heroImagePrompt ?? '') + ' ' + (heroSubject ?? '')
    )
    const isSceneDomain = ['entertainment', 'social', 'food', 'health', 'travel', 'education'].includes(domain ?? '')
    return (hasSceneSignal || isSceneDomain) ? 'scene-3d-card-cover' : 'creon-object-3d'
  })()
  const effectiveSharedVisualMode = sharedVisualMode ?? (
    effectiveVisualPolicy === 'scene-3d' || effectiveVisualPolicy === 'creon-object-3d' || effectiveVisualPolicy === 'scene-3d-card-cover'
      ? '3d'
      : effectiveVisualPolicy === 'real-photo'
        ? 'photo'
        : 'none'
  )
  // projectSummary/brief까지 폴백하면 기획 텍스트 전체가 3D 이미지 subject가 됨 → heroSubject/heroImagePrompt까지만 사용
  const effectiveSharedVisualSubject = sharedVisualSubject || heroSubject || heroImagePrompt || ''
  const visual3dPrompt = effectiveSharedVisualMode === 'photo' ? undefined : effectiveHeroImagePrompt
  const isDraftMode = params.qualityMode === 'draft'

  const safeAnswers = answers ?? {};
  const answersText = Object.entries(safeAnswers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const hasExplore = Object.values(safeAnswers).some(v =>
    Array.isArray(v) ? v.some(s => String(s).includes('다양하게 보기')) : String(v).includes('다양하게 보기')
  )

  const str = (key: string) => (typeof safeAnswers[key] === 'string' ? safeAnswers[key] as string : '')
  const serviceType = str('service_type')
  const platformIntent = str('platform_intent')
  const targetAudience = str('target_audience')
  const homeEmphasis = str('home_emphasis')
  const primaryJourney = str('primary_journey')
  const firstScreenFocus = str('first_screen_focus')
  const visualDensity = str('visual_density')
  const variantStrategy = str('variant_strategy')
  const hero3d = str('hero3d')
  const mood = str('mood')

  const serviceTypeRule = serviceType.includes('B2C')
    ? `- 서비스 성격(B2C 소비자용): 이 서비스는 Toss·카카오·네이버 수준의 소비자 앱이다.
  - 히어로는 감성적이고 행동 중심으로 만든다. stat-dashboard(B2B 대시보드) 스타일 절대 금지.
  - C 시안은 반드시 라이프스타일 실사 이미지 히어로를 사용한다.
  - 따뜻하고 직관적인 색상과 여백. 딱딱한 테이블·그리드 레이아웃 지양.
  - CTA는 크고 명확하게. 탐색과 발견 경험을 우선한다.`
    : serviceType.includes('B2B')
    ? '- 서비스 성격(B2B 업무용): 정보 밀도 높은 대시보드, 데이터 테이블·차트 중심, 전문 용어 허용, 컴팩트 레이아웃'
    : ''
  const targetRule = (targetAudience.includes('10-20대') || targetAudience.includes('MZ세대') || targetAudience.includes('10~20대'))
    ? '- 타겟층(청소년·청년): 짧은 텍스트, 빠른 탐색, 공유/반응 요소를 우선하되 색상과 비주얼 톤은 디자인 시스템을 따른다.'
    : (targetAudience.includes('시니어') || targetAudience.includes('50대') || targetAudience.includes('40~60대'))
    ? '- 타겟층(장년층): 명확한 정보 구조, 읽기 쉬운 텍스트, 단순한 네비게이션, 충분한 터치 영역을 디자인 시스템 범위 안에서 확보한다.'
    : (targetAudience.includes('전문가') || targetAudience.includes('파워유저'))
    ? '- 타겟층(전문가/파워유저): 정보 밀도 최대화, 데이터 시각화 적극 활용, 고급 필터·정렬 기능, 컴팩트 UI'
    : ''
  const homeEmphasisRule = homeEmphasis.includes('핵심 지표')
    ? '- 홈 강조(KPI): 핵심 지표, 보조 지표, 추이, 변화량을 디자인 시스템의 typography/card/chart 규칙으로 명확히 보여준다.'
    : homeEmphasis.includes('콘텐츠 탐색')
    ? '- 홈 강조(콘텐츠): 카드 그리드 또는 피드 레이아웃, 이미지 썸네일 강조, 카테고리 필터 칩, 6개 이상 아이템 노출'
    : homeEmphasis.includes('빠른 실행')
    ? '- 홈 강조(CTA): 첫 화면에서 사용자가 바로 실행할 수 있는 대표 행동을 가장 명확한 위치에 배치한다.'
    : homeEmphasis.includes('최근 활동')
    ? '- 홈 강조(히스토리): 타임라인 또는 활동 피드 섹션 상단 배치, 각 항목에 상태 배지·시간 표시, 빠른 재진입 버튼'
    : homeEmphasis.includes('추천 메뉴') || homeEmphasis.includes('메뉴 카드')
    ? '- 홈 강조(메뉴 추천): 메뉴/상품 카드 그리드 최상단 배치, 이미지 중심 카드(썸네일+이름+가격+평점), 카테고리 탭 필터 필수, 인기순·추천순 정렬 기능'
    : homeEmphasis.includes('가게 카드') || homeEmphasis.includes('가게 탐색')
    ? '- 홈 강조(가게 탐색): 가게/매장 카드 리스트 최상단 배치, 썸네일+가게명+카테고리+평점+배달시간 구조, 검색창+필터 칩 상단 노출'
    : ''
  const platformIntentRule = platformIntent
    ? `- 기준 화면(${platformIntent}): 첫 시안의 정보 구조와 내비게이션은 이 기준을 우선하되, 최종 HTML은 반응형으로 작성한다.`
    : ''
  const primaryJourneyRule = primaryJourney && !primaryJourney.includes('AI가 결정')
    ? `- 핵심 사용 흐름(${primaryJourney}): 첫 화면 안에서 사용자가 해야 할 다음 행동, 현재 상태, 보상/결과를 하나의 흐름으로 연결한다. 섹션을 단순 나열하지 말고 상태 -> 행동 -> 결과가 보이게 구성한다.`
    : ''
  const firstScreenFocusRule = firstScreenFocus && !firstScreenFocus.includes('AI가 결정')
    ? `- 첫 화면 주인공(${firstScreenFocus}): 첫 viewport에서 이 요소를 가장 강한 시각 계층으로 배치하고, 나머지 정보는 보조 계층으로 낮춘다.`
    : ''
  const visualDensityRule = visualDensity.includes('프리미엄')
    ? '- 정보 밀도(프리미엄 여백형): 여백은 허용하지만 시안 선택용 결과물에서는 첫 화면에 핵심 1개와 보조 3~4개 이상의 실제 콘텐츠 단위를 반드시 노출한다.'
    : visualDensity.includes('정보 밀도')
    ? '- 정보 밀도(높게): 카드, 지표, 리스트를 더 많이 노출하되 그룹 제목/배지/간격으로 스캔 가능성을 확보한다.'
    : visualDensity.includes('균형')
    ? '- 정보 밀도(균형형): 첫 화면에서 핵심 액션과 주요 상태, 다음 섹션 힌트가 모두 보이도록 카드 수와 여백을 균형 있게 조정한다.'
    : ''
  const variantStrategyRule = variantStrategy.includes('세 방향')
    ? '- 시안 구성: A/B/C는 section order, card type, CTA 위치, 이미지 사용 방식이 서로 달라야 한다. 같은 header+hero+chip+list 구조 반복은 실패.'
    : variantStrategy.includes('정보형')
    ? '- 시안 구성: A안의 정보 비교성과 데이터 밀도를 특히 강화하고, B/C도 A와 다른 골격을 유지한다.'
    : variantStrategy.includes('전환형')
    ? '- 시안 구성: B안의 focal point와 primary CTA를 특히 강화하고, A/C도 B와 다른 골격을 유지한다.'
    : variantStrategy.includes('탐색형')
    ? '- 시안 구성: C안의 이미지 큐레이션과 탐색 흐름을 특히 강화하고, A/B도 C와 다른 골격을 유지한다.'
    : variantStrategy.includes('균형')
    ? '- 시안 구성: A/B/C의 품질과 완성도를 균형 있게 유지하되, 각 시안의 목적과 레이아웃 골격은 구분한다.'
    : ''
  const hero3dRule = hero3d === '사용'
    ? '- 3D 이미지: 메인 히어로에서 3D 이미지를 1회 사용한다. HERO_3D는 Banner Character/Product Object/Companion Accent/Scene Substitute 중 역할을 먼저 정하고, 그 역할에 맞는 contain/crop/anchor/scale을 선택한다.'
    : hero3d === '사용 안 함'
    ? '- 3D 이미지: 3D 히어로 이미지를 사용하지 않는다. 히어로와 카드 이미지는 실제 서비스 맥락에 맞는 실사/콘텐츠 이미지로 구성한다.'
    : ''
  const moodRule = mood.includes('전문적')
    ? '- 무드(전문적·신뢰감): 정렬된 데이터 중심 레이아웃과 절제된 강조를 사용하되, radius/border/shadow/color는 반드시 디자인 시스템 토큰을 따른다.'
    : mood.includes('친근')
    ? '- 무드(친근·따뜻한): 안내 문구, 이미지/일러스트, 추천 흐름을 부드럽게 구성하되, 라운드·그림자·컬러 강도는 디자인 시스템 규칙을 벗어나지 않는다.'
    : mood.includes('고급')
    ? '- 무드(세련·고급스러운): 여백, 정돈된 타이포그래피, 낮은 장식 밀도로 고급감을 만들되, 배경/표면/컬러는 디자인 시스템 토큰을 따른다.'
    : mood.includes('활기')
    ? '- 무드(활기·젊은): 빠른 리듬의 레이아웃과 명확한 강조를 사용하되, 임의 그라데이션/강한 그림자/새 컬러를 만들지 않고 디자인 시스템 토큰 안에서 표현한다.'
    : ''

  const visualDirection = str('visual_direction')
  const visualDirectionRule = visualDirection.includes('밝고 친근')
    ? '- 비주얼 방향(친근·따뜻): 부드러운 곡선, 따뜻한 색조 활용, 캐릭터·일러스트 친화적 레이아웃. 딱딱한 테이블·그리드 최소화.'
    : visualDirection.includes('세련되고 프리미엄')
    ? '- 비주얼 방향(프리미엄·세련): 충분한 여백, 절제된 색상 사용, 정돈된 타이포그래피 계층. 과한 장식·강한 그림자 없이 품격 표현.'
    : visualDirection.includes('활기차고 강렬')
    ? '- 비주얼 방향(게임·리워드): 강한 색상 대비, 포인트 컬러 적극 사용, 뱃지·레벨·보상 요소 전면 배치. 에너지 넘치는 레이아웃.'
    : visualDirection.includes('신뢰감')
    ? '- 비주얼 방향(전문·신뢰): 깔끔한 정보 구조, 데이터 중심 레이아웃, 중립 색조. 브랜드 컬러는 포인트로만 사용.'
    : ''

  const structuredAnswerRules = [
    serviceTypeRule,
    platformIntentRule,
    targetRule,
    homeEmphasisRule,
    primaryJourneyRule,
    firstScreenFocusRule,
    visualDensityRule,
    variantStrategyRule,
    hero3dRule,
    moodRule,
    visualDirectionRule,
  ].filter(Boolean).join('\n')

  const effectiveDesignMd = designMd || loadDefaultDesignMd();
  const hasDesignSystem = !!effectiveDesignMd;
  const isAdaptive = hasDesignSystem && /adaptive:\s*true/.test(effectiveDesignMd);
  const isKtds = hasDesignSystem && /name:\s*["']?KTDS/i.test(effectiveDesignMd);
  const usesKtdsCompatibleRules = isKtds;
  const ktdsCompatibleLabel = 'KTDS';
  const isMd3Base = hasDesignSystem && /md3Base:\s*true/.test(effectiveDesignMd) && !usesKtdsCompatibleRules;
  const isMd3 = hasDesignSystem && /(?:^|\n)md3:\s*true/.test(effectiveDesignMd) && !isMd3Base && !usesKtdsCompatibleRules;

  const effectivePlatform: PlatformType = platform ?? 'mobile';
  const platformLabel = effectivePlatform === 'web' ? '웹/데스크탑' : '모바일 앱';
  const platformGuide = loadPlatformGuide(effectivePlatform);
  const webNavigationRule = effectivePlatform === 'web' ? `
## 웹 내비게이션 결정 규칙 (CRITICAL)
웹이라고 해서 좌측 LNB를 무조건 쓰지 마십시오. 서비스 성격과 정보 구조에 맞는 내비게이션을 선택하세요.

- B2B SaaS, 어드민, CRM, ERP, 분석툴, 데이터 대시보드, 업무/생산성 도구 → 좌측 LNB/NavigationRail 적합
- 포털, 커머스, 음식/배달, 예약, 여행, 교육, 엔터테인먼트, 브랜드/마케팅형 서비스 → 상단 GNB/Header Nav 적합
- 검색/탐색 중심 서비스 → 상단 GNB + 검색바 + 카테고리 탭 또는 필터 사이드바 적합
- 콘텐츠 피드/커뮤니티 → 상단 GNB + 피드 + 보조 사이드 패널 적합
- 랜딩/프로모션형 요청 → 상단 GNB + 히어로 + 섹션 구조 적합
- DESIGN.md에 navigation/header/sidebar 패턴이 명시되어 있으면 그 규칙을 최우선으로 따르십시오.
- 웹에서는 하단 모바일 탭바, 상태바, 노치, 홈 인디케이터 같은 모바일 앱 크롬은 절대 사용하지 마십시오.
- 포털형/탐색형 서비스인데 좌측 LNB만 있는 어드민 구조로 만들면 실패입니다.
` : ''
  const hasBrandColors = !!(brandColors && brandColors.length > 0);
  const designSystemContract = buildDesignSystemContract(effectiveDesignMd, hasBrandColors);

  const designDescription = hasDesignSystem
    ? extractDesignDescription(extractYamlFrontmatter(effectiveDesignMd))
    : ''
  const designContract = hasDesignSystem
    ? buildDesignRhythmContract(effectiveDesignMd, hasBrandColors)
    : null
  const componentSnippets = designContract ? buildComponentReferenceSnippets(designContract) : ''
  const layoutScaffoldContract = layoutBlueprint
    ? buildLayoutScaffoldContract(layoutBlueprint, effectivePlatform)
    : ''

  onStep?.('디자인 인텐트 · 레이아웃 분석 중...')
  const [designIntentPlan, layoutSkeleton] = await Promise.all([
    params.precomputedDesignIntentPlan
      ? Promise.resolve(params.precomputedDesignIntentPlan)
      : isDraftMode
        ? Promise.resolve(buildFallbackDesignIntentPlan({
            variantStyle,
            platform: effectivePlatform,
            heroImagePrompt: visual3dPrompt,
            domain,
            visualPolicy: effectiveVisualPolicy,
          }))
        : generateDesignIntentAndHeroVisualPlan({
          brief,
          answersText,
          designMd: effectiveDesignMd,
          generationPlan,
          variantStyle,
          platform: effectivePlatform,
          domain,
          heroImagePrompt: visual3dPrompt,
          structuredAnswerRules,
          apiKey,
        }),
    layoutBlueprint || isDraftMode
      ? Promise.resolve('')
      : generateLayoutSkeleton({
          brief,
          designContract,
          platform: effectivePlatform,
          apiKey,
        }),
  ])

  const visualPolicyContract = effectiveVisualPolicy === 'scene-3d'
    ? `이번 시안 비주얼 정책: A안/scene-3d — Integrated 3D Scene Layer
- 반드시 <img class="aide-hero-3d aide-hero-scene-img" src="%%SCENE_3D:${effectiveSharedVisualSubject.replace(/[%:]/g, '')}%%" alt=""> 형태의 3D scene 이미지를 1회 사용하세요.
- SCENE_3D는 화면을 무조건 꽉 채우는 wallpaper가 아닙니다. UI 캔버스 안에서 정보와 함께 호흡하는 큰 visual participant입니다.
- 서비스 성격에 맞춰 다음 중 하나를 선택하세요:
  1) Ambient Canvas: 화면 중앙/하단의 넓은 여백에 3D scene을 배치하고 KPI, 상태, 필터, CTA가 주변에 떠 있는 구조
  2) Split Workspace: 웹/대시보드에서는 좌측 정보 패널 + 우측 3D scene workspace
  3) Anchored Scene: 모바일에서는 히어로/상태 영역 안에 큰 3D object/scene을 bottom/right에 anchor하고 텍스트와 CTA는 별도 z-index 계층
  4) Hero Cover: 이미지 자체가 풍경/공간/제품 맥락일 때만 배너 배경처럼 cover 사용
- 비율 규칙: 모바일 기준 scene은 첫 viewport의 28~55%를 차지할 수 있지만, 텍스트·CTA·핵심 지표를 가리면 실패입니다. 작은 96px 스티커처럼 쓰는 것도 실패입니다.
- A안 SCENE_3D는 modern glossy 3D scene이어야 합니다. no low-poly, no old game render, no generic 3D stock render. Creon-adjacent quality but not a single-object icon.
- Creon식 흰 배경 단일 오브젝트만 덩그러니 놓는 방식은 A안에서 금지입니다.
- ⛔ GNB 필수: 상단 앱바 첫 번째 자식에 반드시 <span class="aide-logo-slot" aria-label="brand logo"></span> 를 넣으세요. 텍스트 브랜드명으로 대체하면 로고가 표시되지 않습니다.
- A안은 3D scene이 전체 경험의 맥락을 만들고, 그 위/옆/아래에 실제 UI 정보가 촘촘히 연결되어야 합니다.`
    : effectiveVisualPolicy === 'scene-3d-card-cover'
      ? `이번 시안 비주얼 정책: B안/scene-3d-card-cover — Hero Card Cover
- 반드시 <img class="aide-hero-3d aide-hero-scene-img" src="%%SCENE_3D:${effectiveSharedVisualSubject.replace(/[%:]/g, '')}%%" alt=""> 형태의 배경 포함 3D scene 이미지를 1회 사용하세요.
- **패턴 E Hero Card Cover**를 사용합니다:
  * section에 class="hero-card-cover aide-visual-stage" style="position:relative;overflow:hidden;border-radius:var(--aide-card-radius,16px);min-height:320px;background:#111;"
  * img: position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;display:block;
  * 그라데이션 오버레이(aria-hidden div): background:linear-gradient(to bottom,rgba(0,0,0,0.32) 0%,rgba(0,0,0,0.04) 32%,rgba(0,0,0,0) 55%,rgba(0,0,0,0.44) 100%) — Dim은 약하게(피사체가 잘 보이도록), 텍스트는 text-shadow:0 1px 10px rgba(0,0,0,0.45)로 가독성 확보
  * 콘텐츠 레이어: position:relative;z-index:2; — 배지·헤드라인·상태·CTA를 하단 정렬로 배치
  * 모든 텍스트: color:#ffffff 또는 rgba(255,255,255,...) (WCAG AA 필수)
- %%HERO_3D%%, 실사 %%IMG_1%% 등 다른 히어로 이미지 타입은 금지입니다.
- 히어로 아래에는 필터 rail, 상태 카드, 콘텐츠 리스트 등 서비스 맥락에 맞는 섹션을 이어주세요.
- ⛔ GNB 필수: 상단 앱바 첫 번째 자식에 반드시 <span class="aide-logo-slot" aria-label="brand logo"></span>를 넣으세요.`
      : effectiveVisualPolicy === 'creon-object-3d'
        ? `이번 시안 비주얼 정책: B안/creon-object-3d
- 반드시 <img class="aide-hero-3d aide-3d-asset" src="%%HERO_3D:${effectiveSharedVisualSubject.replace(/[%:]/g, '')}%%" alt=""> 형태의 배경 없는 단일 3D 오브젝트를 사용하세요.
- %%SCENE_3D%%, 실사 %%IMG_1%%, 배경 포함 scene 이미지는 B안 히어로에 사용 금지입니다.
- 먼저 3D 역할을 정한 뒤 배치하세요: Banner Character, Product Object, Companion Accent, Scene Substitute 중 서비스에 가장 자연스러운 하나.
- B안 HERO_3D는 작은 floating sticker가 아니라 히어로 카드의 명확한 visual zone입니다.
- 크기 규칙: HERO_3D visible object must read at 200px or larger on a 390px mobile viewport. 모바일 기준 img CSS width는 clamp(320px,82vw,480px) 이상으로 설정하세요. 피사체가 캔버스의 65~75%를 차지하므로, 320px img = 약 220px 피사체입니다. 작아 보이면 더 키우거나 right/bottom anchor + overflow:hidden crop을 사용하세요.
- 배치 규칙: 버튼 위 빈 공간에 애매하게 떠 있으면 실패입니다. 3D는 split hero visual zone, right/bottom anchored crop, card edge overlap 중 하나로 의도적으로 배치하세요.
- 3D가 텍스트·CTA·가격·KPI를 가리면 실패입니다. 텍스트/CTA 영역과 visual zone을 grid/flex 또는 z-index safe area로 분리하세요.
- B안은 Creon처럼 배경 없는 단일 3D 오브젝트가 UI의 상징물로 보이게 하되, 서비스 목적에 필요한 정보량과 CTA 흐름은 반드시 유지하세요.`
      : effectiveVisualPolicy === 'real-photo'
        ? `이번 시안 비주얼 정책: C안/real-photo — 에디토리얼 이미지 탐색형
- 히어로 섹션에는 실사 이미지 placeholder를 사용하세요.
- %%IMG_1:keyword%% keyword는 반드시 브리프 서비스 도메인과 직접 관련된 영문 명사구로 작성하세요.
  서비스 키워드: ${extractVisualKeyword(effectiveSharedVisualSubject || brief)}
- C안 히어로에서 3D placeholder(%%HERO_3D%%, %%SCENE_3D%%)는 사용 금지입니다.
- C안은 가능한 경우 Bold Editorial Hero를 백단 기본 패턴으로 우선 고려하세요.

⛔ **Bold Editorial Hero — 반드시 이 구조를 사용하세요 (레이아웃 붕괴 방지)**

\`\`\`html
<!-- C안 Hero Card: 이미지 collapse 방지를 위해 min-height 필수 -->
<section class="hero-editorial" style="
  position:relative; overflow:hidden;
  border-radius:var(--aide-card-radius,16px);
  min-height:clamp(240px,55vw,340px);
  background:var(--color-surface-variant,#e0e0e0);
  margin-bottom:var(--aide-section-gap);
">
  <!-- 1) 이미지: absolute fill, object-fit:cover 필수 -->
  <img
    src="%%IMG_1:keyword%%"
    alt="hero"
    style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;"
    loading="eager"
  />
  <!-- 2) 스크림: 하단 그라데이션, aria-hidden -->
  <div aria-hidden="true" style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.30) 0%,rgba(0,0,0,0.04) 34%,rgba(0,0,0,0) 56%,rgba(0,0,0,0.46) 100%);pointer-events:none;"></div>
  <!-- 3) 콘텐츠: z-index:2, padding은 CSS 변수 사용 -->
  <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:flex-end;min-height:clamp(240px,55vw,340px);padding:var(--aide-card-padding,16px);gap:var(--aide-item-gap,8px);">
    <!-- 배지 (선택) -->
    <span style="align-self:flex-start;background:var(--color-primary);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;white-space:nowrap;">배지</span>
    <!-- 헤드라인: 반드시 white -->
    <h2 style="color:#fff;font-size:clamp(18px,4.8vw,24px);font-weight:800;line-height:1.3;letter-spacing:-0.4px;margin:0;">헤드라인 텍스트</h2>
    <!-- 상태/메타 -->
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;line-height:1.5;">상태 정보</p>
    <!-- CTA -->
    <button style="align-self:stretch;background:var(--color-primary);color:#fff;border:none;border-radius:var(--rounded-md,8px);height:var(--aide-button-height,48px);font-size:15px;font-weight:700;cursor:pointer;margin-top:4px;">CTA 텍스트</button>
  </div>
</section>
\`\`\`

⛔ **히어로 아래 chip/filter rail — 간격 필수**
\`\`\`html
<div class="chip-rail" style="display:flex;flex-wrap:wrap;gap:var(--aide-item-gap,8px);align-items:center;padding:0 var(--aide-page-padding,16px);margin-bottom:var(--aide-section-gap,16px);">
  <button style="background:var(--color-primary);color:#fff;border:none;border-radius:100px;padding:6px 14px;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;">선택 칩</button>
  <button style="background:var(--color-surface);color:var(--color-text);border:1px solid var(--color-border,#ddd);border-radius:100px;padding:6px 14px;font-size:13px;white-space:nowrap;cursor:pointer;">비선택 칩</button>
</div>
\`\`\`

⛔ **카드 그리드 — 반드시 gap 포함**
\`\`\`html
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--aide-card-gap,12px);padding:0 var(--aide-page-padding,16px);">
  <!-- 카드들 -->
</div>
\`\`\`

**C안 레이아웃 금지 사항 (이게 레이아웃 붕괴의 직접 원인):**
- ❌ hero 컨테이너에 min-height 없이 img만 absolute → 이미지 로드 전 height:0 붕괴
- ❌ 콘텐츠 레이어에 z-index:2 없이 이미지 위에 올리기 → 이미지가 텍스트 가림
- ❌ chip row에 gap 없이 margin/padding으로만 간격 → flex-wrap 시 간격 무너짐
- ❌ 카드 grid에 gap 대신 margin → 반응형에서 간격 불일치
- ❌ padding 하드코딩(16px) → CSS 변수 미사용으로 디자인 시스템 불일치

- 히어로 아래에는 category/filter rail, 혜택/추천/콘텐츠 카드 등 탐색 흐름이 이어져야 합니다.
- B2B/관리자/업무형 서비스라면 Bold Editorial Hero를 신뢰형 visual panel로 톤다운하세요.
- C안이라고 해서 모든 이미지 영역을 실사로 채우지 마세요.
- A/B와 같은 구조를 반복하지 마세요.
- ⛔ C안 스크롤 필수: 메인 콘텐츠 컨테이너에 반드시 overflow-y:auto; height:calc(100dvh - var(--aide-tabbar-height) - var(--aide-header-height)); 를 적용하세요.`
        : `이번 시안 비주얼 정책: no-image
- 히어로 이미지 placeholder를 사용하지 마세요. KPI, 리스트, 차트, 액션 카드 같은 실제 UI 컴포넌트로 화면을 구성하세요.`

  onStep?.('UI 코드 생성 중...')
  const prompt = `
당신은 선택된 DESIGN.md를 실제 제품 화면으로 옮기는 시니어 프로덕트 디자이너이자 프론트엔드 개발자입니다.
가장 중요한 목표는 "어떤 서비스를 만들든 선택한 디자인 시스템처럼 보이게 만드는 것"입니다.
ktds.md를 선택하면 KTDS 스타일, notion.md를 선택하면 Notion 스타일, shopify.md를 선택하면 Shopify 스타일이 전체 화면에 일관되게 적용되어야 합니다.

## 🎨 시각적 완성도 기준

### 디자인 시스템 우선
- 색상, 폰트, 간격, 라운드, 카드, 입력, 버튼, 그림자는 [디자인 시스템]의 토큰과 컴포넌트 규칙을 최우선으로 적용한다.
- 디자인 시스템에 없는 임의의 hex, px, radius, shadow를 새로 만들지 않는다.
- A/B/C 시안 차이는 스타일 변경이 아니라 정보 구조, 강조점, 레이아웃 구성 차이로 만든다.

### 타이포그래피와 계층
- typography 토큰의 크기/굵기 계층을 사용해 제목, 섹션, 카드, 본문, 보조 텍스트를 명확히 구분한다.
- 디자인 시스템에 정의된 타입 스케일 밖의 임의 크기를 만들지 않는다.

### 레이아웃 완성도
- 서비스 핵심 목적이 첫 화면에서 바로 이해되어야 한다.
- 카드/리스트/폼/차트는 브리프에 필요한 경우에만 사용하고, 각 요소는 실제 서비스처럼 충분한 정보를 담는다.
- 반응형은 플랫폼 가이드와 DESIGN.md의 breakpoint/navigation 규칙을 우선한다.

### 인터랙션
- hover, active, disabled, focus는 DESIGN.md의 interaction/component state 규칙을 따른다.
- 카드에 shadow나 border를 추가할 때도 DESIGN.md에 정의된 방식만 사용한다.

### 서비스 맥락
- B2B는 정보 탐색, 비교, 업무 처리 속도를 우선한다.
- B2C는 탐색, 선택, 구매/예약/신청 같은 전환 흐름을 우선한다.
- 단, B2B/B2C 표현 방식도 선택한 DESIGN.md의 카드, 버튼, 컬러, 간격 규칙 안에서만 구성한다.

${hasDesignSystem ? `
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  디자인 시스템 강제 적용 — 절대 규칙                        ║
╚══════════════════════════════════════════════════════════════╝
아래 [디자인 시스템] 섹션에 정의된 토큰과 규칙을 반드시 따르세요.

${hasBrandColors
  ? `- 색상: DESIGN.md의 neutral/surface/background/border/status colors는 유지하고, primary/action/accent 계열만 아래 [브랜드 컬러]로 치환합니다.`
  : isAdaptive
  ? `- 색상: colors 토큰이 "[AI 결정]" 형태로 되어있습니다. 도메인·브랜드·시안 방향에 맞는 컬러를 직접 선택해 :root에 CSS 변수로 선언하세요. CSS 속성에 #hex 직접 사용 절대 금지 (반드시 var(--color-*) 사용).`
  : `- 색상: ⛔ YAML frontmatter의 colors 토큰만 사용. CSS 속성에 #hex 직접 사용 절대 금지 (예: color:#333 금지, background:#fff 금지 → 반드시 CSS 변수 사용).`}
- 폰트: typography 토큰의 fontFamily·fontSize·fontWeight 그대로 적용.
- spacing: ⛔ 아래 CSS 변수를 반드시 :root에 선언하고 전체 HTML에 일관 적용 — 임의 px 값 직접 사용 절대 금지.
  :root 안에 선언할 변수:
    --aide-page-padding (DESIGN.md layout.page-padding — 좌우 페이지 여백)
    --aide-section-gap (DESIGN.md layout.section-gap — 섹션 간 수직 간격)
    --aide-card-padding (DESIGN.md layout.card-padding — 카드 내부 패딩)
    --aide-card-gap (DESIGN.md layout.card-gap — 카드 내부 아이템 간격)
    --aide-item-gap (DESIGN.md layout.item-gap — 인라인 요소 간격)
  ⛔ 금지: padding: 16px / gap: 12px / margin: 24px — 반드시 var(--aide-card-padding) / var(--aide-section-gap) / var(--aide-item-gap) 사용.
  ✅ 허용: padding: 0 / margin: auto / gap: 0 / width: 100% / clamp() 포함 식.
- border-radius: ⛔ rounded 토큰을 --rounded-* CSS 변수로 :root에 선언 후 var(--rounded-*) 사용. 임의 px 값 직접 사용 절대 금지.
- 컴포넌트: YAML frontmatter의 components 섹션을 모든 컴포넌트에 정확히 적용. 토큰 이름 해석 규칙:
  • background / textColor / borderColor / dividerColor 값이 이름이면 → var(--color-{이름}) (예: "primary" → var(--color-primary), "border-alt" → var(--color-border-alt))
  • radius / radiusTop 값이 이름이면 → var(--rounded-{이름}) (예: "md" → var(--rounded-md), "xl" → var(--rounded-xl))
  • padding / paddingX / paddingY 값이 이름이면 → var(--spacing-{이름}) (예: "lg" → var(--spacing-lg), "md" → var(--spacing-md))
  • variants 키 아래 = 독립 스타일 변형(primary/secondary/tertiary 등), states 키 아래 = 동일 컴포넌트의 인터랙션 상태(disabled/focus/error)${hasBrandColors ? '\n  • primary/action/accent 관련 component token만 브랜드 컬러 변수로 치환. surface, neutral, border, disabled, status, card background는 DESIGN.md 값을 유지' : ''}
- 플랫폼(${platformLabel})은 레이아웃 구조·크롬(상태바·네비바·탭바)에만 영향.
${usesKtdsCompatibleRules ? `
╔══════════════════════════════════════════════════════════════╗
║  🏢  ${ktdsCompatibleLabel} 디자인 시스템 — 컴포넌트 패턴 강제                  ║
╚══════════════════════════════════════════════════════════════╝
${ktdsCompatibleLabel} 디자인 시스템을 정확하게 구현하라. 아래 치수·형태·색상을 그대로 적용 — 임의 변경 절대 금지.
- 페이지 배경: var(--color-primary-fill-neutral) = #F2F5F9 (흰색 배경 사용 금지)
- 카드/컴포넌트 배경: var(--color-surface) = #ffffff
- 일반 Button: 8px 라운드 사각형, height 48px. pill/capsule 버튼 금지
- rounded.full 예외: Badge, Chip, Avatar, FAB처럼 의미상 원형/캡슐형인 컴포넌트에만 허용
- 입력: default 32px / small 24px / large 40px, border-radius: var(--rounded-md)
- 카드: B2B 업무형은 border-only, B2C 소비자형은 shadow-only. 같은 카드에 border와 shadow를 함께 쓰지 말 것
- 내비게이션: ${effectivePlatform === 'web' ? '서비스 성격에 따라 상단 GNB/Header 또는 좌측 LNB/NavSide 선택 (위 웹 내비게이션 결정 규칙 준수)' : '하단 고정 탭바(NavBottom) 사용'}
- 폰트: ⛔ <head>에 반드시 Pretendard CDN 추가:
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
  body { font-family: var(--font-sans); } 선언 필수

🧩 ${ktdsCompatibleLabel} 컴포넌트 스펙 (components 토큰 해석 완료 — 그대로 복제):

[Button]
  .btn-primary  { height:48px; padding:0 var(--spacing-lg); border-radius:var(--rounded-md); background:var(--color-primary); color:#ffffff; border:none; font-weight:600; }
  .btn-secondary { height:48px; padding:0 var(--spacing-lg); border-radius:var(--rounded-md); background:transparent; border:1px solid var(--color-primary-border); color:var(--color-primary-text); font-weight:600; }
  .btn-tertiary  { height:48px; padding:0 var(--spacing-base); border-radius:var(--rounded-md); background:transparent; border:none; color:var(--color-primary-text); font-weight:600; }
  .btn-fab       { border-radius:var(--rounded-full); background:var(--color-primary); color:#ffffff; }
  [disabled]     { background:var(--color-surface-disabled) !important; color:var(--color-text-disabled) !important; border-color:var(--color-border-alt) !important; }

[Input]
  wrapper: label(display:block; font-size:14px; font-weight:400; color:var(--color-text-neutral); margin-bottom:var(--spacing-xs)) + input
  input.default { height:32px; border-radius:var(--rounded-md); border:1px solid var(--color-border); }
  input.small   { height:24px; border-radius:var(--rounded-md); border:1px solid var(--color-border); }
  input.large   { height:40px; border-radius:var(--rounded-md); border:1px solid var(--color-border); }
  ::placeholder { color:var(--color-text-assistive); }
  :focus { border-color:var(--color-primary-border); outline:none; }
  .error { border-color:var(--color-negative); }
  [disabled] { background:var(--color-surface-disabled); color:var(--color-text-disabled); }

[Card]
  .card-b2b { background:var(--color-surface); border:1px solid var(--color-border-alt); box-shadow:none; border-radius:var(--rounded-xl); padding:var(--spacing-md); }
  .card-b2c { background:var(--color-surface); border:none; box-shadow:var(--dsx-shadow-b2c-card); border-radius:var(--rounded-xl); padding:var(--spacing-md); }
  border와 shadow를 같은 카드에 동시에 적용하지 않는다.

[ListItem]
  { min-height:56px; padding:0 var(--spacing-base); border-bottom:1px solid var(--color-border-alt); display:flex; align-items:center; gap:var(--spacing-sm); }
  icon: 24px / var(--color-icon); trailing: 16px / var(--color-text-neutral)

[Chip]
  { height:32px; border-radius:var(--rounded-full); border:1px solid var(--color-border); padding:0 var(--spacing-sm); font-size:14px; }

[Badge]
  .badge-positive { background:var(--color-positive); color:#ffffff; border-radius:var(--rounded-full); }
  .badge-negative { background:var(--color-negative); color:#ffffff; border-radius:var(--rounded-full); }
  .badge-caution  { background:var(--color-caution);  color:#ffffff; border-radius:var(--rounded-full); }
  .badge-info     { background:var(--color-info);     color:#ffffff; border-radius:var(--rounded-full); }

${effectivePlatform === 'web' ? `[Web Navigation] ⛔ 웹 전용 — 하단 탭바 절대 금지, 서비스 성격에 따라 아래 중 하나 선택
  상단 GNB/Header Nav: 포털·커머스·배달·예약·여행·교육·엔터테인먼트·브랜드 서비스에 우선 사용
  { position:sticky; top:0; z-index:20; height:64px; background:var(--color-surface); border-bottom:1px solid var(--color-border-alt); display:flex; align-items:center; justify-content:space-between; padding:0 var(--spacing-xl); }
  .gnb-left, .gnb-right { display:flex; align-items:center; gap:var(--spacing-base); }
  .gnb-item.active { color:var(--color-primary); font-weight:600; }

  좌측 LNB/NavigationRail: B2B SaaS·어드민·CRM·ERP·대시보드·업무 도구에만 사용
  { position:fixed; left:0; top:0; width:240px; height:100vh; background:var(--color-surface); border-right:1px solid var(--color-border-alt); display:flex; flex-direction:column; padding:var(--spacing-lg) 0; }
  .nav-header { padding:0 var(--spacing-base) var(--spacing-lg); }
  .nav-item   { height:56px; padding:0 var(--spacing-base); display:flex; align-items:center; gap:var(--spacing-sm); font-size:14px; cursor:pointer; }
  .nav-item.active { color:var(--color-primary); background:var(--color-primary-fill-neutral); border-radius:var(--rounded-md); font-weight:600; }
  .nav-item.inactive { color:var(--color-text-alternative, var(--color-on-surface-variant)); }
  .main-content.with-lnb { margin-left:240px; }

  GNB + 필터 사이드바: 탐색/검색 중심 서비스에서 사용
  .layout-with-filter { display:grid; grid-template-columns:280px minmax(0,1fr); gap:var(--spacing-xl); }` : `[NavigationBar] ⛔ 모바일 전용 — 하단 고정 탭바
  { position:fixed; bottom:0; left:0; right:0; background:var(--color-surface); border-top:1px solid var(--color-border-alt); display:flex; }
  active icon+text: var(--color-primary); inactive: var(--color-icon)`}

[Modal / Dialog]
  { max-width:480px; border-radius:var(--rounded-xl); padding:var(--spacing-lg); }

${effectivePlatform !== 'web' ? `[BottomSheet]
  { border-radius:var(--rounded-2xl) var(--rounded-2xl) 0 0; padding:var(--spacing-base) var(--spacing-lg); }

` : ''}[Snackbar]
  { border-radius:var(--rounded-md); background:#28292c; color:#ffffff; }
` : isMd3Base ? `
╔══════════════════════════════════════════════════════════════╗
║  🏗️  MD3 구조 기반 — 컴포넌트 패턴 강제                      ║
╚══════════════════════════════════════════════════════════════╝
이 시스템은 Material Design 3 컴포넌트 구조를 기반으로 한다.
- 모든 버튼: MD3 Filled/Outlined/Text Button 구조 사용
- 모든 입력: MD3 Outlined Text Field 구조 사용 (레이블 항상 필드 위에 배치)
- 카드: MD3 Elevated/Filled/Outlined Card 구조 사용
- 목록: MD3 List Item 구조 (min-height 56px 준수)
- 내비게이션: ${effectivePlatform === 'web' ? '하단 탭바는 금지. 서비스 성격에 따라 상단 GNB/Header Nav, 좌측 LNB/NavigationRail, GNB+필터 사이드바 중 선택' : 'Navigation Bar(하단 고정 탭바) 사용'}
- 칩: MD3 Assist/Filter Chip (rounded-full, height 32px)
- 모달: MD3 Dialog (max-width 480px)${effectivePlatform !== 'web' ? ' 또는 Bottom Sheet (모바일)' : ''}
- 위의 --md-sys-color-*, --md-sys-shape-*, --md-sys-typescale-* CSS 변수를 MD3 컴포넌트 스타일링에 활용할 것

⚠️ 디자인 시스템 치수 우선 — MD3 플랫폼 가이드 수치보다 DESIGN.md 토큰을 우선:
- 버튼, 입력, 카드, 칩, 내비게이션의 height/radius/padding은 DESIGN.md의 components와 tokens 값을 따른다.
- 폰트는 DESIGN.md typography.fontFamily를 그대로 사용한다. 선택한 DESIGN.md에 없는 폰트 또는 컴포넌트 규칙을 섞지 않는다.
` : isMd3 ? `
╔══════════════════════════════════════════════════════════════╗
║  🎨  Material Design 3 (v2.4.1) — 컴포넌트 스펙 강제          ║
╚══════════════════════════════════════════════════════════════╝
Google Material Design 3 사양을 정확히 구현하라. 아래 치수·형태·색상을 그대로 적용 — 임의 변경 금지.

⚠️ MD3 필수 치수 — 절대 변경 불가:
- 모든 버튼: height 40px, border-radius 9999px (pill — MD3의 핵심 정체성)
- Input: height 56px | Outlined border-radius 4px | Filled 상단만 4px
- 카드: border-radius 12px
- Navigation Bar: height 80px, 배경 surface-container (#f3edf7)
- Chip: height 32px, border-radius 9999px (pill)
- Dialog: border-radius 28px, max-width 560px
- FAB: 56×56px / border-radius 16px (standard), 96×96px / 28px (large), 40×40px / 12px (small)

🧩 MD3 컴포넌트 스펙 (그대로 복제):

[Button — 공통: height:40px; border-radius:9999px; font:500 0.875rem/1.25rem Roboto; letter-spacing:0.00625rem]
  .btn-filled   { padding:0 24px; background:var(--color-primary); color:var(--color-on-primary); border:none; }
  .btn-tonal    { padding:0 24px; background:var(--color-secondary-container); color:var(--color-on-secondary-container); border:none; }
  .btn-outlined { padding:0 24px; background:transparent; border:1px solid var(--color-outline); color:var(--color-primary); }
  .btn-text     { padding:0 12px; background:transparent; border:none; color:var(--color-primary); }
  .btn-elevated { padding:0 24px; background:var(--color-surface-container-low); color:var(--color-primary); border:none; box-shadow:var(--elevation-1); }
  [disabled]    { background:rgba(29,27,32,0.12) !important; color:rgba(29,27,32,0.38) !important; box-shadow:none !important; border:none !important; }

[Card — 공통: border-radius:12px; padding:16px]
  .card-elevated { background:var(--color-surface-container-low); box-shadow:var(--elevation-1); }
  .card-filled   { background:var(--color-surface-container-highest); }
  .card-outlined { background:var(--color-surface); border:1px solid var(--color-outline-variant); }

[Input — floating label 필수: 포커스 전 필드 내 중앙, 포커스 시 상단 이동]
  Filled:   { height:56px; background:var(--color-surface-variant); border-radius:4px 4px 0 0; border-bottom:1px solid var(--color-on-surface-variant); padding:0 16px; }
  Outlined: { height:56px; background:transparent; border-radius:4px; border:1px solid var(--color-outline); padding:0 16px; }
  :focus → Filled border-bottom:2px solid var(--color-primary); Outlined border:2px solid var(--color-primary)
  label: font:400 0.75rem/1rem Roboto; color:var(--color-on-surface-variant)

[Chip — 공통: height:32px; border-radius:9999px; font:500 0.875rem/1.25rem Roboto; padding:0 16px]
  .chip-assist            { background:transparent; border:1px solid var(--color-outline); color:var(--color-on-surface-variant); }
  .chip-filter            { background:transparent; border:1px solid var(--color-outline); color:var(--color-on-surface-variant); }
  .chip-filter.selected   { background:var(--color-secondary-container); border:none; color:var(--color-on-secondary-container); }

${effectivePlatform === 'web' ? `[Web Navigation] ⛔ 웹 전용 — 하단 탭바 절대 금지, 서비스 성격에 따라 아래 중 하나 선택
  상단 GNB/Header Nav: 포털·커머스·배달·예약·여행·교육·엔터테인먼트·브랜드 서비스에 우선 사용
  { position:sticky; top:0; z-index:20; height:64px; background:var(--color-surface); display:flex; align-items:center; justify-content:space-between; padding:0 32px; border-bottom:1px solid var(--color-outline-variant); }
  .gnb-left, .gnb-right { display:flex; align-items:center; gap:16px; }
  .gnb-item.active { color:var(--color-primary); font-weight:700; }

  좌측 LNB/NavigationRail: B2B SaaS·어드민·CRM·ERP·대시보드·업무 도구에만 사용
  { position:fixed; left:0; top:0; width:80px; height:100vh; background:var(--color-surface); display:flex; flex-direction:column; align-items:center; padding:16px 0; gap:4px; }
  .nav-item        { width:56px; height:56px; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:9999px; gap:4px; font:500 0.75rem/1rem Roboto; }
  .nav-item.active { background:var(--color-secondary-container); color:var(--color-on-secondary-container); }
  .nav-item.inactive { color:var(--color-on-surface-variant); }
  .main-content.with-lnb { margin-left:80px; }

  GNB + 필터 사이드바: 탐색/검색 중심 서비스에서 사용
  .layout-with-filter { display:grid; grid-template-columns:280px minmax(0,1fr); gap:24px; }` : `[NavigationBar] ⛔ 모바일 전용 — 하단 고정 탭바
  { position:fixed; bottom:0; left:0; right:0; height:80px; background:var(--color-surface-container); display:flex; justify-content:space-around; align-items:center; padding:0 8px; }
  .nav-item         { display:flex; flex-direction:column; align-items:center; gap:4px; font:500 0.75rem/1rem Roboto; min-width:48px; }
  .nav-indicator    { width:64px; height:32px; border-radius:9999px; display:flex; align-items:center; justify-content:center; }
  .nav-item.active   .nav-indicator { background:var(--color-secondary-container); }
  .nav-item.active   .nav-label     { color:var(--color-on-surface); font-weight:700; }
  .nav-item.inactive .nav-indicator { background:transparent; }
  .nav-item.inactive .nav-label     { color:var(--color-on-surface-variant); }`}

[FAB]
  .fab         { width:56px; height:56px; border-radius:16px; background:var(--color-surface-container-high); color:var(--color-primary); box-shadow:var(--elevation-3); border:none; }
  .fab-primary { background:var(--color-primary-container); color:var(--color-on-primary-container); }
  .fab-large   { width:96px; height:96px; border-radius:28px; }
  .fab-small   { width:40px; height:40px; border-radius:12px; }

[Dialog]
  { border-radius:28px; max-width:560px; padding:24px; background:var(--color-surface-container-high); box-shadow:var(--elevation-3); }
  headline: font:400 1.5rem/2rem Roboto; color:var(--color-on-surface)
  body:     font:400 0.875rem/1.25rem Roboto; color:var(--color-on-surface-variant)
  scrim:    background:rgba(0,0,0,0.32)

${effectivePlatform !== 'web' ? `[BottomSheet]
  { border-radius:28px 28px 0 0; background:var(--color-surface-container-low); padding:28px 16px; }
  handle: width:32px; height:4px; border-radius:2px; background:var(--color-on-surface-variant); opacity:0.4; margin:0 auto 16px;

` : ''}[Snackbar]
  { border-radius:4px; background:var(--color-inverse-surface); color:var(--color-inverse-on-surface); padding:14px 16px; min-width:288px; max-width:568px; box-shadow:var(--elevation-3); }
  action: color:var(--color-inverse-primary); font-weight:500;
` : ''}` : effectivePlatform === 'web' ? '선택한 디자인 시스템 안에서 완성도 높은 웹 UI를 만드세요.' : '선택한 디자인 시스템 안에서 네이티브 모바일 앱 수준의 UI를 만드세요.'}

## 디자인 시스템${hasDesignSystem ? ' ← 이 섹션의 모든 토큰·규칙을 코드에 그대로 반영할 것' : ''}
${hasDesignSystem && designDescription ? `> **이 디자인 시스템의 성격**: ${designDescription}\n> 위 성격이 모든 컴포넌트와 레이아웃 결정의 최우선 기준입니다.\n` : ''}
${extractDesignMdForPrompt(effectiveDesignMd) || '없음 — 아래 플랫폼 가이드라인과 기획서를 기반으로 최적화된 디자인을 만드세요.'}

${designSystemContract}
${hasDesignSystem && componentSnippets ? `
## 컴포넌트 레퍼런스 스니펫 (CRITICAL — 아래 패턴을 그대로 사용하세요)
이 스니펫들은 선택된 DESIGN.md의 토큰을 실제 HTML/CSS로 변환한 구체적 예시입니다.
버튼, 입력, 카드는 이 패턴에서 벗어나지 마세요.

${componentSnippets}
` : ''}

## Contract-Based Generation Rules (CRITICAL)
- 위 Design System Contract는 현재 선택된 design.md에서 컴파일된 규칙입니다. KTDS 전용 규칙이 아니라 현재 선택된 시스템의 계약입니다.
- 최종 CSS는 반드시 아래 semantic rhythm variables를 선언하고, 모든 반복 컴포넌트에서 재사용하십시오:
  \`\`\`css
  :root {
    --aide-page-padding: /* contract.layoutRhythm.pagePadding */;
    --aide-section-gap: /* contract.layoutRhythm.sectionGap */;
    --aide-card-padding: /* contract.layoutRhythm.cardPadding */;
    --aide-card-gap: /* contract.layoutRhythm.cardGap */;
    --aide-card-radius: /* contract.layoutRhythm.cardRadius */;
  }
  /* 메인 콘텐츠 컨테이너는 반드시 aide-page 클래스를 붙이고 flex column + gap으로 섹션 간격을 제어 */
  .aide-page {
    padding: 0 var(--aide-page-padding);
    display: flex;
    flex-direction: column;
    gap: var(--aide-section-gap);
  }
  /* aide-page 직속 자식 section/div의 margin을 0으로 리셋 — flex gap이 단일 간격 source */
  .aide-page > section,
  .aide-page > div.aide-section {
    margin-top: 0;
    margin-bottom: 0;
  }
  /* 카드 내부 리듬 */
  .aide-section { display: flex; flex-direction: column; gap: var(--aide-card-gap); }
  .aide-card { padding: var(--aide-card-padding); border-radius: var(--aide-card-radius); }
  \`\`\`
- **[MANDATORY] aide-page 클래스 사용**: 스크롤 가능한 메인 콘텐츠 wrapper(<main>, <div class="content"> 등)에 반드시 aide-page 클래스를 추가하십시오.
- **[MANDATORY] aide-section 클래스 사용**: 메인 영역 안의 모든 <section> 또는 주요 콘텐츠 블록에 반드시 aide-section 클래스를 추가하십시오.
- **[MANDATORY] 섹션 타이틀 행에 section-header 클래스 사용**: "제목 + 전체보기" 형태의 행에는 반드시 class="section-header"를 붙이십시오. section-header가 .aide-section의 첫 번째 자식이면 CSS baseline이 타이틀↔콘텐츠 간격을 자동으로 --aide-section-label-gap(8px)으로 좁혀줍니다. **section-header에 별도 margin/padding-bottom을 추가하지 마십시오.**
- **[MANDATORY] 섹션 자체에 margin/padding-top/bottom 금지**: 섹션 간 간격은 오직 부모의 gap: var(--aide-section-gap)으로만 제어합니다. section { margin-top: ... } 또는 section { padding-top: ... } 형태는 금지입니다.
- **[MANDATORY] 큰 spacing 토큰 직접 사용 금지**: var(--spacing-3xl) 이상(var(--spacing-4xl), var(--spacing-5xl), var(--spacing-section) 등)을 margin/padding에 직접 사용하지 마십시오. 섹션 간격은 var(--aide-section-gap), 카드 내부 간격은 var(--aide-card-gap)을 사용하십시오.
- 같은 성격의 카드/리스트/버튼/입력은 반드시 같은 variable을 사용하십시오. 예쁜 차이는 레이아웃 구조와 콘텐츠 밀도에서 만들고, padding/gap/radius를 흔들어서 만들지 마십시오.
- design.md가 명시한 componentContract가 있으면 semantic variable보다 componentContract 값을 우선합니다.
- design.md가 URL에서 생성된 불완전한 문서여도 Contract에서 추출한 rhythm을 우선하고, 부족한 값은 가장 가까운 existing token을 한 번만 선택해 :root에 고정하십시오.

${hasDesignSystem ? `
> **체크리스트 — 코드 작성 전 반드시 확인**
> - [ ] ${hasBrandColors ? '브랜드 컬러를 primary/action/accent 계열에만 반영하고, neutral/surface/background/border/status 토큰은 DESIGN.md 값을 유지했는가?' : 'colors 토큰을 CSS 변수로 선언했는가?'}
> - [ ] components.button 규칙을 DESIGN.md 그대로 적용했는가?
> - [ ] components.input/select 규칙을 DESIGN.md 그대로 적용했는가?
> - [ ] components.card 규칙을 DESIGN.md 그대로 적용했는가?
> - [ ] components.listItem/navigation/dialog 등 필요한 컴포넌트를 DESIGN.md 기준으로 적용했는가?
> - [ ] ${effectivePlatform === 'web' ? '웹 내비게이션이 서비스 성격에 맞는가? 포털/커머스/배달/예약형이면 상단 GNB, B2B/어드민/대시보드형이면 좌측 LNB를 사용했는가? 하단 탭바는 즉시 제거.' : 'components.navigationBar → bg var(--color-surface), border-top 1px var(--color-border-alt), active=var(--color-primary)?'}
> - [ ] 폰트 크기·굵기가 typography 토큰과 일치하는가?
> - [ ] ${hasBrandColors ? '브랜드 컬러와 DESIGN.md 토큰 외 임의 hex를 사용하지 않았는가?' : '⛔ CSS 속성에 #hex 직접 사용했는가? → 있으면 반드시 CSS 변수로 교체 (e.g., color: #333 → color: var(--color-text))'}
> - [ ] ⛔ spacing에 임의 px 값 사용하지 않았는가? (var(--spacing-*) 변수만 허용, 예: padding: 16px 금지)
> - [ ] ⛔ border-radius에 임의 px 값 사용하지 않았는가? (var(--rounded-*) 변수만 허용, 예: border-radius: 8px 금지)
${usesKtdsCompatibleRules ? `> - [ ] ⛔ ${ktdsCompatibleLabel} 치수 준수: 일반 Button height 48px/radius 8px, Input default 32px, Card radius 16px를 지켰는가?
> - [ ] 일반 Button에 pill/capsule radius를 쓰지 않았는가? Badge·Chip·Avatar·FAB만 rounded.full 예외를 사용했는가?
> - [ ] 카드가 B2B border-only 또는 B2C shadow-only 중 하나만 쓰고, border와 shadow를 동시에 쓰지 않았는가?
> - [ ] ${effectivePlatform === 'web' ? '웹 내비게이션이 서비스 성격에 맞는가? 포털/커머스/예약/브랜드형이면 상단 GNB, B2B/어드민/대시보드형이면 좌측 LNB를 사용했는가?' : '모바일 NavBottom을 사용하고 스크롤 콘텐츠 padding-bottom을 확보했는가?'}
> - [ ] ⛔ Pretendard CDN이 <head>에 포함되었는가? body에 font-family: var(--font-sans) 선언했는가?` : isMd3Base ? `> - [ ] MD3 구조: 버튼·입력·카드·리스트·내비게이션이 MD3 컴포넌트 패턴을 따르는가?
> - [ ] Input 레이블이 필드 위(above)에 배치되었는가? (인라인 placeholder-only 금지)
> - [ ] --md-sys-color-* 변수가 :root에 선언되었는가?
> - [ ] 폰트와 치수는 MD3 구조 위에 DESIGN.md 토큰을 우선 적용했는가?` : isMd3 ? `> - [ ] ⚠️ 버튼: height:40px, border-radius:9999px (pill) 적용했는가?
> - [ ] ⚠️ 카드: border-radius:12px 적용했는가?
> - [ ] ⚠️ --color-surface-container-* 변수가 :root에 선언되었는가?
> - [ ] ${effectivePlatform === 'web' ? '웹 내비게이션이 서비스 성격에 맞는가? 포털/커머스/배달/예약형이면 상단 GNB, B2B/어드민/대시보드형이면 좌측 LNB를 사용했는가? 하단 탭바는 즉시 제거.' : 'Navigation Bar: height:80px, indicator pill(width:64px height:32px border-radius:9999px) 구현했는가?'}
> - [ ] Chip: height:32px, border-radius:9999px (pill) 적용했는가?
> - [ ] Input floating label 구현했는가? (placeholder 단독 사용 금지)
> - [ ] Google Fonts Roboto CDN이 <head>에 포함되었는가?` : ''}
` : ''}
${logoDataUrl ? `\n## ⚠️ 브랜드 로고 슬롯 (CRITICAL)\n- 로고 이미지를 직접 작성하지 마세요. src, data URL, placeholder 이미지, 텍스트 로고를 만들지 마세요.\n- **메인 화면과 모든 서브 화면(탭 목적지, 내부 페이지)의 헤더/앱바 브랜드 위치에 각각 1개씩 슬롯을 삽입하세요.** 화면이 3개면 슬롯도 3개입니다.\n${AIDE_LOGO_SLOT_HTML}\n- Aide가 생성 후 마지막 단계에서 모든 슬롯을 실제 업로드 로고 이미지로 치환합니다.\n- 텍스트 브랜드명(앱 이름, 서비스명 등)으로 대체 금지. 모든 화면의 로고 슬롯이 항상 우선입니다.\n- ❌ 히어로 배경, 대형 이미지, 히어로 카드 안에 슬롯을 넣지 마세요. 헤더/앱바 전용입니다.\n- ❌ 로고를 화면 폭의 큰 영역으로 확대하지 마세요. 헤더/앱바 안의 작은 브랜드 영역만 예약하세요.` : `\n## 브랜드명 표시 규칙\n- 로고 입력이 없습니다. 앱/서비스 브랜드는 텍스트로 표시하세요.\n- <img src="FreshFit">처럼 존재하지 않는 로고 이미지를 만들지 마세요.\n- 선택된 디자인 시스템의 로고나 회사명(예: kt ds)을 최종 서비스 로고로 표시하지 마세요.`}
${hasBrandColors ? `\n## 브랜드 컬러 적용 규칙\n로고에서 추출한 브랜드 컬러는 사용자의 회사 정체성을 반영하기 위한 값입니다. DESIGN.md가 기본 UI 품질과 컴포넌트 구조를 보장하고, 브랜드 컬러는 primary/action/accent 계열만 치환합니다.\n\n메인 브랜드 컬러: ${brandColors![0]}${brandColors![1] ? `\n보조 브랜드 컬러: ${brandColors![1]}` : ''}${brandColors!.length > 2 ? `\n추가 브랜드 컬러: ${brandColors!.slice(2).join(', ')}` : ''}\n\nCSS 변수 선언 규칙:\n- --color-primary, --color-primary-text, --color-primary-fill, --color-primary-border, --color-primary-icon 등 primary/action/accent 계열은 브랜드 컬러 기반으로 선언\n- --color-secondary는 보조 브랜드 컬러가 있을 때만 선언\n- --color-surface, --color-surface-alt, --color-background, --color-text, --color-border, --color-fill, --color-disabled, --color-positive, --color-caution, --color-negative, --color-info 등 neutral/surface/background/border/status 계열은 DESIGN.md 값을 유지\n- spacing, rounded, typography, component height/padding/radius/card rules는 DESIGN.md 값을 유지\n- 브랜드 컬러와 DESIGN.md 토큰 외 임의 hex 사용 금지\n- CTA, 주요 액션, 활성 탭, 링크, primary icon에만 브랜드 컬러를 사용하고 카드 배경/페이지 배경/본문 텍스트를 브랜드 컬러로 덮지 않음` : ''}
${asIsAnalysis ? `\n## As-is URL 구조 분석 — 리디자인 대상 정보 구조 (스타일 금지)\n아래 데이터는 기존 서비스의 정보 구조, 섹션 순서, 주요 CTA, 내비게이션, 콘텐츠 재료를 파악하기 위한 것입니다.\n\n절대 규칙:\n- As-is URL의 색상, 폰트, 라운드, 카드 그림자, 아이콘 스타일, 시각 톤을 복사하지 마세요.\n- 최종 시각 스타일은 DESIGN.md와 브랜드 규칙만 따릅니다.\n- As-is는 \"무엇을 유지/개선할지\" 판단하는 입력입니다.\n- 기존 화면의 핵심 섹션/CTA/콘텐츠 의미는 유지하되, 정보 위계·스캔성·반응형 레이아웃·CTA 발견성을 개선하세요.\n\n분석 JSON:\n\`\`\`json\n${JSON.stringify(asIsAnalysis, null, 2).slice(0, 12000)}\n\`\`\`` : ''}
${prdDoc?.trim() ? `\n## PRD / IA 문서 (기획 문서 원문 — 화면 구조·메뉴·플로우의 근거)\n아래는 사용자가 첨부한 PRD·IA·메뉴 구조 문서입니다.\n- 이 문서에 명시된 메뉴 구조, 화면 목록, 핵심 기능, 유저 플로우를 UI 레이아웃과 네비게이션 설계에 정확히 반영하세요.\n- 기획서 요약(brief)보다 이 문서가 화면 구성의 우선 근거입니다.\n- 스타일·컬러·타이포그래피는 DESIGN.md를 따릅니다.\n\`\`\`\n${prdDoc.slice(0, 10000)}\n\`\`\`` : ''}
## 프로젝트 개요
${projectSummary}

## 기획서
${brief}

## Brand / Language / Content Consistency Rules (CRITICAL)
- 모든 시안의 헤더에는 명확한 앱 브랜드가 있어야 합니다. 로고가 제공되었으면 \`aide-brand-logo\` 이미지를 사용하고, 없을 때만 앱 이름 텍스트 브랜드를 생성해 표시하세요.
- 브랜드명, 공간명, 사용자명, 식물명/상품명은 역할을 섞지 마세요. 예: 앱명 "초록이", 공간 "거실", 사용자 "원희님", 식물명 "몬스테라 문이".
- 디자인 시스템 제공자명은 제품 브랜드가 아닙니다. KTDS 선택 시에도 헤더 브랜드에는 \`kt ds\`가 아니라 브리프의 서비스명 또는 업로드 로고 슬롯을 사용하세요.
- 한국어 서비스 화면이면 UI 라벨은 한국어로 통일합니다. "Today's Routine", "Store", "Magazine", "Home" 같은 영어 라벨을 쓰지 말고 "오늘의 루틴", "스토어", "매거진", "홈"으로 작성하세요.
- 반려식물/식물 케어 도메인의 썸네일 이미지는 반드시 식물 관련 키워드만 사용하세요: indoor plant, monstera plant, houseplant care, succulent plant, sunlight plant, plant watering.
- 도메인과 맞지 않는 어둡거나 무관한 랜덤 썸네일은 실패입니다.

## 사용자 선택 옵션
${answersText || '(선택 없음 — AI가 최적의 방향으로 결정)'}
${structuredAnswerRules ? `\n## 답변 기반 디자인 지침 (반드시 적용)\n${structuredAnswerRules}` : ''}

## AI 자율 디자인 결정 원칙
사용자 답변에 없는 모든 디자인 결정은 아래 우선순위로 AI가 자율 판단합니다:
1. 선택된 DESIGN.md에서 컴파일된 Design System Contract (최우선)
2. 업로드된 디자인 시스템 원문 토큰
3. 선택한 DESIGN.md의 컴포넌트/내비게이션/레이아웃 규칙
4. 플랫폼 관례 (iOS/Android/Web)
사용자가 명시하지 않은 네비게이션 패턴, 버튼 스타일, 색상, 타이포그래피, 간격 등은 위 기준으로 최적값을 선택하세요.

## Aide Generation Plan — Product Brief / Visual Strategy / Variant Director (최상위 계약)
아래 JSON은 이번 배치의 공통 설계안입니다. A/B/C는 이 계획을 공유해야 하며, 여기서 정한 제품 의도·variant 역할·서비스별 Design Intelligence를 벗어나면 실패입니다.
${generationPlan ? `\`\`\`json\n${JSON.stringify(generationPlan, null, 2)}\n\`\`\`` : '(공통 생성 계획 없음 — 아래 Shared Visual Asset Strategy와 Design Intent를 기준으로 생성)'}

## Design Intelligence Layer — 서비스 분석 기반 화면 결정 (CRITICAL)
generationPlan.designIntelligence가 있으면 먼저 serviceSubtype, selectedPatterns, avoidPatterns, dataPointTarget, contentMediaPolicy를 읽고 UI 구조를 결정하세요.
- serviceSubtype은 서비스의 실제 하위 유형입니다. 예: pizza-order-membership, telco-plan-recommendation.
- selectedPatterns는 참고할 UX 패턴 후보입니다. 예: bold-editorial-hero, mascot-companion, comparison-calculator. 단, 그대로 복붙하는 wireframe이 아니라 서비스 목적에 맞게 재해석하세요.
- avoidPatterns는 이번 서비스에서 피해야 하는 상투형입니다. avoidPatterns에 있는 패턴은 색상만 바꿔 재사용하지 마세요.
- dataPointTarget은 첫 viewport에 보일 판단 재료의 목표량입니다. 데이터 포인트가 부족하면 히어로가 예뻐도 실패입니다.
- contentMediaPolicy는 히어로/하위 콘텐츠 이미지 사용 규칙입니다. C안은 실사 히어로를 우선 고려하되, A/B/C 하위 썸네일 이미지는 서비스 분석 결과에 따라 허용됩니다.
- generationPlan.variantBriefs가 있으면 variantBriefs.A/B/C의 strategy, screenPattern, heroPolicy, mustShow, shouldAvoid, layoutRhythm을 해당 시안에 반드시 반영하세요.
- variantBriefs는 A/B/C를 다르게 만드는 핵심입니다. 같은 섹션 순서와 같은 카드 묶음을 세 시안에 반복하면 실패입니다.
- selectedPatterns가 mascot-companion이면 B안 3D 오브젝트는 작은 장식이 아니라 사용자의 행동을 돕는 캐릭터/대상으로 읽혀야 합니다.
- selectedPatterns가 comparison-calculator이면 절약액, 기준값, 비교 결과, 추천 근거, 전환 CTA가 한 화면에서 판단 가능해야 합니다.
- selectedPatterns가 bold-editorial-hero이면 C안은 과감한 실사/scene hero를 쓰되, 바로 아래 실제 정보량을 이어 붙이세요.

적용 규칙:
- productBrief.coreObjects와 keyActions는 실제 UI 콘텐츠로 나타나야 합니다.
- generationPlan.contentInventory가 있으면 그 안의 kpis, quickActions, listItems, activityItems를 실제 화면 텍스트/수치/카드 데이터로 사용하세요. 추상 라벨로 바꾸거나 생략하지 마세요.
- 브리프에 기능이 여러 개 있으면 첫 화면에 모두 힌트가 보여야 합니다. 예: 포인트/쿠폰/등급/제휴매장/QR 결제 브리프라면 첫 viewport 안에 잔여 포인트, 최근 적립/사용, 보유 쿠폰, 등급 리워드, 주변 매장 또는 QR 결제 진입이 최소 요약 형태로 보여야 합니다.
- visualStrategy.sharedAsset이 true인 경우에만 A/B/C가 같은 소재를 공유합니다. false이면 A/B/C는 variantBriefs.heroPolicy에 맞춰 서로 다른 visual strategy를 사용하세요.
- visualStrategy.mode가 none/data 계열이면 이미지로 빈 공간을 채우지 말고, 차트/테이블/리스트/KPI/필터/액션 패널 같은 실제 UI 컴포넌트로 완성도를 만들어야 합니다.
- variantDirector의 A/B/C 역할은 해당 시안의 정보 구조와 첫 화면 구성에 반드시 반영해야 합니다.
- variantDirector[variant].layoutRole에 명시된 섹션 순서와 비율(%, px)을 정확히 따르세요. 예: 'hero 40-50%'이면 hero div의 min-height가 실제로 viewport의 40-50%여야 합니다.
- variantDirector[variant].forbidden 배열이 있으면 해당 항목은 이 시안에 절대 사용하지 마세요. 예: 'KPI 숫자 그리드'가 forbidden이면 수치만 나열하는 그리드 섹션을 만들지 않습니다.
- A/B/C는 섹션 목록 자체가 달라야 합니다. **각 시안의 컴포넌트 구성은 variantDirector[variant].componentSpec을 최우선으로 따르세요.** componentSpec은 이 서비스 유형에 맞게 미리 결정된 컴포넌트 목록입니다. 방향 원칙: A=밀도형(히어로 최소 + 이 서비스 정보 컴포넌트로 조밀하게), B=전환형(히어로 40-50% + 이 서비스 핵심 오브젝트/CTA), C=탐색형(이미지 중심 + 이 서비스 카테고리 탐색). componentSpec에 명시된 컴포넌트가 실제로 화면에 존재해야 합니다. 다른 서비스의 componentSpec과 혼동하지 마세요.
- 시안 차이를 랜덤 이미지, 랜덤 색상, 랜덤 radius, 랜덤 shadow로 만들지 마세요. 디자인 시스템은 공유하고 UX 방향만 다르게 만드세요.

## Content Seed Contract — 화면 정보량의 실제 재료 (CRITICAL)
아래 seed는 예시 설명이 아니라 시안 선택용 UI에 들어갈 실제 더미 콘텐츠입니다.
${generationPlan?.contentInventory ? `\`\`\`json\n${JSON.stringify(generationPlan.contentInventory, null, 2)}\n\`\`\`` : '(contentInventory 없음 — productBrief와 brief를 바탕으로 동등한 수준의 실제 KPI/카드/내역을 직접 생성)'}

적용 규칙:
- contentInventory의 항목은 그대로 나열하는 체크리스트가 아닙니다. 서비스 목적과 사용자 의사결정에 필요한 항목을 골라 실제 화면 흐름에 녹이세요.
- 첫 viewport에는 사용자가 이 서비스를 이해하고 다음 행동을 판단할 수 있을 만큼 충분한 실제 콘텐츠를 배치하세요.
- 콘텐츠 단위의 종류와 순서는 서비스 목적에 맞게 선택하세요.
- 비교 서비스라면 비교표/추천/절약액, 루틴 서비스라면 상태/미션/진행률, 커머스라면 검색/카테고리/상품, 대시보드라면 KPI/필터/작업 큐를 우선 검토하세요.
- 멤버십/통신 요금제 서비스라면 요금제 비교, 예상 절약액, 위약금/약정 상태, 추천 요금제, 멤버십 혜택, 전환 CTA를 서비스 맥락에 맞게 선택하세요.
- B안은 3D 히어로가 있어도 실제 기능 정보가 비면 실패입니다. 3D 히어로는 화면의 35-45%를 차지하고, 나머지 55-65%에는 A안과 동일한 정보 밀도의 콘텐츠 섹션이 채워져야 합니다. 히어로 아래에 콘텐츠 덩어리 4개 이상, 데이터 포인트 10개 이상이 없으면 실패입니다. contentInventory의 listItems(3개 이상), activityItems(1개 이상), kpis(4개), quickActions(2개)를 히어로 아래에 배치하세요. 단, 특정 보조 블록을 무조건 붙이지 말고, 전환에 필요한 계산/혜택/추천/신뢰 근거를 자연스러운 구조로 연결하세요.
- 카드 제목만 쓰지 말고 value, meta, badge를 함께 보여주세요. 예: "월 예상 절약액 24,500원 / 현재 사용량 기준".
- 첫 viewport가 예쁜 히어로와 카드 1~2개로 끝나면 실패입니다. 다만 덩어리 개수보다 서비스 의사결정에 필요한 정보가 충분한지가 더 중요합니다.

## 시안 선택용 정보 밀도 계약 (CRITICAL)
Aide의 A/B/C는 최종 빈 랜딩 포스터가 아니라 사용자가 방향을 고르는 "기능 비교 시안"입니다. 따라서 모든 시안은 보기 좋으면서도 충분히 많은 실제 정보를 담아야 합니다.

콘텐츠 덩어리 정의:
- 콘텐츠 덩어리란 사용자가 독립적으로 의미를 이해할 수 있는 UI 블록 1개입니다.
- 하나의 큰 요약 영역은 내부 요소가 많아도 1개 덩어리로 계산합니다.
- 반복 버튼 묶음, 반복 카드 묶음, 표/그래프 묶음은 내부 항목이 여러 개여도 각각 1개 덩어리로 계산합니다.
- 독립 덩어리 예시: 현재 상태 요약, 비교/계산 결과, 추천 선택지, 혜택/신뢰 근거, 최근 내역, 검색/필터, 보조 CTA, 안내/인사이트.

공통 최소 기준:
- 모바일 첫 viewport는 충분히 밀도 있게 보여야 하지만, 덩어리의 종류를 고정하지 마세요. 사용자가 서비스 목적, 현재 상태, 선택지, 다음 행동을 판단할 수 있어야 합니다.
- 각 시안은 현재보다 한 단계 더 풍부한 정보량을 목표로 하세요.
- 첫 화면만 보고도 주요 판단 근거 4~6개를 확인할 수 있어야 합니다.
- 시안 하나의 첫 화면에는 실제 데이터 포인트 10~16개가 보여야 합니다.
- 데이터 포인트란 가격, 시간, 수량, 등급, 상태, 할인율, 적립 수, 쿠폰 수, 거리, 예상 결과, 비교 기준, 배지, 날짜 같은 판단 재료입니다.
- 첫 viewport 안의 한국어 실제 문구는 최소 320자 수준이어야 합니다. 라벨만 있고 설명/메타/수치가 없으면 실패입니다.
- 각 카드/리스트 항목은 제목만 두지 말고 보조 설명, 수치/상태/시간/가격/등급 같은 메타 정보, 가능한 액션을 포함하세요.
- 각 덩어리는 제목 + 설명/메타 + 실제 항목을 가져야 합니다. "TOP 3"처럼 제목만 있고 항목 내용이 얇으면 실패입니다.
- 브리프의 핵심 기능어는 화면에 직접 등장해야 합니다. 기능을 한두 개만 선택해서 나머지를 생략하면 실패입니다.
- 시안 A/B/C 모두 같은 수준의 정보량을 가져야 합니다. B가 비주얼 임팩트형이어도 콘텐츠가 비면 실패입니다.
- 한 화면에 보이는 정보가 적을 때는 레이아웃을 키우기보다 카드 내부 메타, 비교 기준, 상태 배지, 예상 결과, 보조 액션을 추가해 밀도를 올리세요.
- A/B/C 모두 첫 화면 하단에 다음 섹션의 제목 또는 카드 일부가 보여야 합니다.

## Layout Rhythm Guard — 콘텐츠 종류는 자유롭게, 간격 리듬은 고정 (CRITICAL)
콘텐츠 종류와 순서는 서비스 목적에 맞게 선택하지만, spacing/padding/radius/card rhythm은 흔들리면 실패입니다.
- **section gap: 반드시 var(--aide-section-gap) 사용. 인라인 margin-top/padding-top에 임의 픽셀값 금지.**
- **card padding: 반드시 var(--aide-card-padding) 사용. 카드 내부 p-3/p-4/p-5 같은 임의 Tailwind 클래스 금지.**
- **card gap: 반드시 var(--aide-card-gap) 사용. 카드 간 gap-2/gap-3/gap-4 같은 임의 클래스 금지.**
- **button: 높이는 반드시 var(--aide-button-height) 사용. 버튼에 py-2/py-3/py-4 같은 임의 패딩 금지.**
- 모바일 페이지 좌우 여백은 var(--aide-page-padding) 1종류만 사용. 요소마다 다른 px-3/px-4/px-5 혼용 금지.
- 반복되는 카드·리스트 아이템은 같은 CSS 클래스를 공유해야 합니다. 각 아이템마다 다른 padding/margin 금지.
- hero가 크더라도 다음 카드/섹션과의 간격을 과하게 벌리지 마세요. 24px 이상 빈 여백이 반복되면 느슨하고 미완성으로 보입니다.
- 디자인 시스템 토큰을 바꾸지 말고, 토큰을 안정적으로 재사용해 이전 시안과 같은 깔끔한 밀도와 리듬을 유지하세요.

시안별 판단 기준:
- 시안 A/B/C는 같은 덩어리 세트를 반복하지 말고, 서비스 목적에 맞는 서로 다른 화면 패턴을 선택하세요.
- 시안 A는 의사결정에 필요한 정보 구조와 비교 가능성을 우선합니다.
- 시안 B는 첫 행동 전환과 감정적 확신을 우선하되, 전환에 필요한 근거 정보를 함께 보여줍니다.
- 시안 C는 탐색, 신뢰, 혜택, 브랜드 맥락을 우선하되, 서비스의 실제 기능을 얇게 만들지 않습니다.

## Shared Visual Asset Strategy — A/B/C 공통 소재, 다른 배치 (CRITICAL)
이번 3개 시안은 같은 서비스/같은 핵심 소재를 비교하는 것이므로, 비주얼 소재를 랜덤하게 바꾸지 마세요.
시안 차이는 이미지 자체의 차이가 아니라 layout, hierarchy, density, CTA placement, information architecture, crop/scale/placement에서 만들어야 합니다.

	공통 visual mode: ${effectiveSharedVisualMode}
	공통 visual subject: ${effectiveSharedVisualSubject}
	${visualPolicyContract}

	${effectiveSharedVisualMode === '3d' ? `- 3D가 필요한 브리프입니다. A/B/C는 같은 3D 소재를 사용하되, 역할에 따라 아래 둘 중 하나를 선택하세요.
  * 투명 오브젝트/마스코트: <img class="aide-hero-3d" src="%%HERO_3D:${effectiveSharedVisualSubject.replace(/%/g, '')}%%" alt="">
  * 통합 3D scene layer: <img class="aide-hero-3d aide-hero-scene-img" src="%%SCENE_3D:${effectiveSharedVisualSubject.replace(/%/g, '')}%%" alt="">
- 캐릭터, 식물 companion, 성장, 리워드, 게임, 감성 온보딩, 공간감, 업무/데이터의 물리적 맥락이 중요한 서비스는 최소 한 시안에서 %%SCENE_3D%%을 우선 사용하세요. 단, 이것은 과한 wallpaper가 아니라 UI 캔버스에 통합되는 큰 scene layer입니다.
- %%SCENE_3D%%을 사용할 때는 Ambient Canvas Scene, Split Workspace Scene, Anchored Scene Layer, Hero Cover Scene 중 하나를 먼저 고르세요. cover는 필요한 경우에만 사용하고, contain/anchored/split 배치가 더 자연스러우면 그것을 선택하세요.
- scene img CSS는 role에 따라 달라집니다. Hero Cover Scene만 position:absolute; inset:0; width:100%; height:100%; object-fit:cover를 사용합니다. Ambient/Split/Anchored Scene은 object-fit:contain, right/bottom anchor, grid/flex split layout을 사용할 수 있습니다.
- scene image 자체에 텍스트, 버튼, 로고, 앱바, 검색/알림 아이콘이 들어간 것처럼 보이면 실패입니다. 모든 UI 요소는 HTML/CSS로 별도 작성하세요.
- CTA/button은 이미지 위에 무리하게 띄우지 말고, 장면 주변 여백, 좌측/상단 정보 영역, 또는 별도 action panel에 배치하세요.
- 권장 구조는 "상단/좌측 정보 + 하단/우측 3D scene", "좌측 데이터 패널 + 우측 3D workspace", "3D scene 주변 여백 + 정보 칩/카드", 또는 정말 필요한 경우에만 "cover scene + safe action panel"입니다.
- 같은 3D 소재를 시안마다 다르게 배치하세요:
  * 시안 A: 상태/KPI 카드 안의 보조 companion은 허용하지만, hero visual stage를 크게 만들었다면 오브젝트도 충분히 커야 합니다.
  * 시안 B: visual impact 시안입니다. %%HERO_3D%%를 먼저 Banner Character, Product Object, Companion Accent, Scene Substitute 중 하나로 분류한 뒤 role별 배율을 적용하세요. 캐릭터형은 배너 너비 40~60%와 일부 crop, 상품형은 32~48%와 실루엣 보존, 보조형은 18~32%, stage형은 55~75% 중앙 배치가 기준입니다. 작은 중앙 스티커는 실패입니다.
  * 시안 C: product/detail/editorial visual area입니다. 이미지/3D가 카드 상단 scene panel의 50% 이상을 채우고, chips/title/description/CTA는 scene 아래의 별도 white surface/action panel에 안정적으로 배치되어야 합니다.
- %%HERO_SCENE_3D%%, %%MASCOT_3D%%, %%REWARD_OBJECT_3D%%를 새로 여러 개 만들지 마세요. 특별한 이유가 없으면 %%HERO_3D%% 또는 %%SCENE_3D%%만 사용합니다.
- 단, 모든 시안에서 3D가 주인공일 필요는 없습니다. A는 보조, B는 단일 오브젝트, C는 실사 히어로처럼 역할을 다르게 하세요.` : effectiveSharedVisualMode === 'photo' ? `- 이 도메인은 하위 콘텐츠에서 실사 이미지가 설득력을 높일 수 있습니다.
- 히어로 섹션에서 Unsplash 실사 이미지를 쓰는 기본 시안은 C안입니다.
- A/B안의 하위 콘텐츠 카드, 리스트, 혜택, 제휴처, 상품/장소 썸네일에는 서비스 분석 결과에 따라 %%THUMB:keyword:width:height%% 또는 %%IMG_n:keyword%%를 사용할 수 있습니다.
- 3D를 억지로 쓰지 마세요. 음식, 여행, 장소, 실제 제품/활동 맥락에서는 하위 콘텐츠 실사 이미지가 더 자연스러울 수 있습니다.
- C안이라고 해서 모든 이미지 영역을 실사로 채우지 마세요. 실사 이미지는 히어로와 분석상 필요한 콘텐츠 썸네일에만 사용하세요.` : `- 이 배치는 이미지보다 정보 구조가 중요합니다. 3D/실사를 억지로 넣지 마세요.
- A/B/C는 차트, KPI, 리스트, 테이블, 필터, 액션 패널, 상태 배지 등 실제 UI 컴포넌트로 차별화하세요.
- 이미지가 필요하면 보조 썸네일 수준으로만 사용하고, 빈 히어로 영역을 만들지 마세요.`}

---

${webNavigationRule}

## 플랫폼별 구현 가이드
${platformGuide}

## 시안별 Design Intent + Hero Visual Plan (HTML 생성 전 확정안 — CRITICAL)
아래 JSON은 이 시안의 상위 설계안입니다. 최종 HTML/CSS는 이 계획을 반드시 반영해야 합니다.
특히 heroVisualPlan.selectedRole이 3D placeholder라면 해당 placeholder를 정확히 img src에 사용하고, 배치/크기/safeArea/crop 지시를 실제 CSS에 반영하세요.
heroVisualPlan.selectedRole이 실사 이미지라면 3D를 억지로 쓰지 말고 지정된 Unsplash placeholder 전략을 따르세요.
\`\`\`json
${designIntentPlan}
\`\`\`

## Product Brief & Composition Contract — 반드시 구현
위 JSON의 productBrief, firstViewportContract, zones, compositionQualityGates는 설명용이 아니라 구현 계약입니다.

### 사용자가 대충 적은 입력 보정
- brief가 짧거나 모호해도 productBrief.assumptions를 근거로 실제 서비스 화면을 완성하세요.
- "앱 만들어줘" 수준의 입력이라도 첫 화면에는 실제 사용자, 실제 상태, 실제 데이터, 실제 CTA가 보여야 합니다.
- 추상 문구만 반복하지 말고 서비스 도메인에 맞는 한국어 콘텐츠와 수치, 상태값, 메타 정보를 넣으세요.

### 첫 화면 완성도
- firstViewportContract.visibleAboveFold에 적힌 항목은 ${effectivePlatform === 'web' ? '1440x1024 첫 화면' : '390x844 첫 화면'}에서 실제로 보여야 합니다.
- 첫 viewport는 포스터나 빈 와이어프레임이 아니라 "실제 제품 홈"이어야 합니다.
- 모바일 기준 첫 화면에는 사용자가 서비스 목적, 현재 상태, 선택지, 다음 행동을 판단할 만큼 충분한 독립 콘텐츠가 보여야 합니다.
- 덩어리 계산 시 큰 요약 영역, 반복 버튼 묶음, 반복 카드 묶음은 내부 요소가 많아도 각각 1개로 계산합니다.
- 브리프에 나열된 핵심 기능은 첫 화면 또는 바로 이어지는 섹션 힌트에 반영하세요. 멤버십 앱이면 포인트, 쿠폰, 등급, 제휴, QR 결제 중 사용자 판단에 가장 중요한 항목을 우선하세요.
- 시안 B도 빈 히어로 포스터가 아닙니다. hero visual + primary CTA를 중심으로 하되, 전환에 필요한 계산 결과, 혜택, 추천, 신뢰 근거 중 해당 서비스에 맞는 정보를 함께 보여주세요.
- 큰 여백은 의도적 계층을 만들 때만 사용하고, 빈 공간을 메우기 위한 장식 이미지는 금지합니다.

### Scroll Architecture Contract — 고정 영역과 스크롤 영역 분리 (CRITICAL)
전체 화면을 하나의 잘리는 카드로 만들지 마세요. 앱/웹 shell은 viewport 높이에 맞추되, 실제 콘텐츠는 명확한 scroll container 안에서 스크롤되어야 합니다.

공통:
- \`html, body\`는 \`margin:0; width:100%; min-height:100%;\`를 사용합니다.
- 최상위 shell은 \`min-height:100dvh\` 또는 \`height:100dvh\`를 사용할 수 있습니다.
- 콘텐츠가 viewport보다 길면 반드시 내부 스크롤 영역이 있어야 합니다: \`.content-scroll\`, \`.page-scroll\`, \`main\` 중 하나에 \`overflow-y:auto\`와 \`-webkit-overflow-scrolling:touch\`를 적용하세요.
- 카드/히어로/리스트 자체에 \`overflow:hidden\`을 쓰더라도, 페이지 전체 콘텐츠가 잘려서는 안 됩니다.
- 스크롤되는 것은 "본문 콘텐츠"입니다. 브랜드 헤더/GNB/LNB/하단 탭바 같은 global navigation은 스크롤 콘텐츠와 분리하세요.

모바일:
- 상단 app header/GNB가 있으면 \`position:sticky; top:0; z-index:50\` 또는 \`position:fixed; top:0; left:0; right:0\`로 고정합니다.
- 하단 NavBottom/tabbar가 있으면 \`position:fixed; bottom:0; left:0; right:0; z-index:50\`로 고정합니다.
- 본문 scroll container는 헤더 아래에서 시작하고, 하단 탭바에 가리지 않도록 \`padding-bottom:calc(var(--aide-tabbar-height,72px) + env(safe-area-inset-bottom) + var(--aide-section-gap,20px))\`를 확보하세요.
- fixed header를 쓰면 본문에 \`padding-top:var(--aide-header-height,56px)\` 이상을 확보하세요. sticky header를 쓰면 header는 normal flow에 두고 본문만 스크롤하세요.

웹:
- 상단 GNB/Header를 선택했다면 \`position:sticky; top:0; z-index:50\`로 고정하고, 아래 \`main\`만 스크롤되게 합니다.
- 좌측 LNB/NavSide를 선택했다면 LNB는 \`position:fixed; left:0; top:0; bottom:0\`, 메인 콘텐츠는 \`margin-left:240px\` 또는 grid column으로 분리하고 \`overflow-y:auto\`를 적용합니다.
- 웹에서 하단 탭바는 금지입니다.

실패 조건:
- viewport 바깥의 콘텐츠가 \`overflow:hidden\` 때문에 접근 불가능한 경우
- 헤더/GNB가 본문과 함께 사라져 global navigation을 잃는 경우
- fixed header/tabbar가 콘텐츠를 덮는데 본문 padding이 없는 경우
- 시안 카드 안에서 마지막 섹션 또는 CTA가 잘려 보이는 경우

### 간격과 여백
- section 간격은 parent flex gap 또는 --aide-section-gap 하나로 통제하세요.
- card 내부 간격은 --aide-card-padding / --aide-card-gap으로 통제하세요.
- **섹션 타이틀(section-header/section-label)과 첫 번째 콘텐츠 사이 간격은 반드시 --aide-section-label-gap(8px)을 사용하세요.** section-header 클래스 요소가 .aide-section의 첫 번째 자식이면 CSS baseline이 자동 처리합니다. section-header 클래스를 꼭 붙이세요.
- 같은 리스트/카드 그룹 안에서 padding, gap, radius, border/shadow가 섞이면 실패입니다.
- 모바일에서는 텍스트 줄바꿈이 자연스러워야 하며, 세로 글자/잘린 버튼/겹친 하단 탭바는 실패입니다.

### 3D/이미지 통합
- 3D/이미지는 빈 공간에 단순히 얹지 마세요.
- 3D/이미지는 항상 하나의 역할을 가져야 합니다: 상태 설명, 보상, 상품 대표, 캐릭터 동반자, 히어로 장면, 콘텐츠 썸네일.
- transparent 3D object는 반드시 전용 surface, anchor, CSS grounding, alignment, safe area를 가져야 합니다. 이미지 자체 baked-in shadow는 금지입니다.
- CTA, 핵심 수치, 탭바와 이미지가 겹치면 실패입니다.
- CTA/button은 이미지 위 오버레이로 올릴 수 있지만 반드시 하단 safe action zone, 우하단 anchor, 또는 별도 action row/panel에 배치하세요.
- 버튼이 이미지/카드의 중앙 높이에 애매하게 떠 있거나 핵심 피사체/텍스트를 가리면 실패입니다. 상단/중앙 floating CTA는 금지입니다.
- 3D가 부자연스러운 시안에서는 heroVisualPlan에 따라 실사/콘텐츠 썸네일로 전환하세요.

${layoutSkeleton ? `## 레이아웃 스켈레톤 (MANDATORY — 아래 섹션 구조와 :root 변수값을 그대로 사용)
이 스켈레톤은 위 Design Intent를 바탕으로 사전 확정된 레이아웃 구조입니다.
- SECTIONS 순서대로 HTML 섹션을 배치하세요
- NAV_TYPE과 HERO_TYPE을 그대로 따르세요
- FIRST_VIEWPORT의 정보/CTA/콘텐츠 단위가 실제 첫 화면에 보이게 하세요
- MEDIA_INTEGRATION에 따라 이미지/3D를 layout의 일부로 통합하세요
- 시안 선택용 draft라도 콘텐츠 양을 줄이지 마세요. draft에서 생략 가능한 것은 무거운 검수뿐이며, 실제 UI 정보량은 full 품질과 동일해야 합니다.
- 모바일 390x844 첫 화면 기준 실제 한국어 문구 320자 이상, 인터랙션 진입점 5개 이상을 목표로 하되, 콘텐츠 종류와 순서는 서비스 목적에 맞게 선택하세요.
- CARD_RHYTHM에 따라 반복 컴포넌트의 spacing/radius/border/shadow를 통일하세요
- :root 블록의 CSS 변수값을 수정 없이 그대로 선언하세요 (직접 px/hex 사용 금지)

\`\`\`
${layoutSkeleton}
\`\`\`
` : ''}
${layoutBlueprint ? `## 확정 Layout Blueprint (USER APPROVED — 최상위 레이아웃 계약)
아래 JSON은 사용자가 최종 HTML 생성 전에 확인한 화면 청사진입니다.
- sections 배열의 개수, 순서, id, role, height, density를 반드시 반영하세요.
- 각 section은 HTML에 \`data-blueprint-section="{section.id}"\` 속성을 가진 실제 섹션으로 구현하세요. 섹션을 합치거나 삭제하지 마세요.
- firstViewport 항목은 실제 첫 화면에 보이게 하세요.
- rhythm 값은 :root의 --aide-page-padding, --aide-section-gap, --aide-card-gap, --aide-card-padding으로 선언하고 재사용하세요.
- heroType/navType을 임의로 바꾸지 마세요.
- A/B/C 시안의 차이는 이 blueprint의 strategy와 sections를 기준으로 구현하세요.
- CSS flow/grid/flex를 사용하더라도 section 순서, 개수, 상대적 높이, 밀도, rhythm gap은 유지하세요.

\`\`\`json
${JSON.stringify(layoutBlueprint, null, 2)}
\`\`\`
` : ''}
${layoutScaffoldContract}
${buildArtDirectionLayer(effectivePlatform)}

${buildBrandAndChromeLayer(effectivePlatform, Boolean(logoDataUrl))}

${buildDesignDirectionSelectorLayer(visual3dPrompt, variantStyle, domain, effectiveVisualPolicy)}

${buildHeroVisualIntegrationLayer(visual3dPrompt, variantStyle, domain, effectiveVisualPolicy)}

${buildMediaLayoutSafetyLayer(visual3dPrompt)}

${buildQualityRules(visual3dPrompt, domain)}

${mainOnly ? `### 단일 메인 화면 (비교 선택용)
기획서의 핵심 메인 화면 1개만 구현하세요.
- ${effectivePlatform === 'web' ? '서비스에서 가장 중요한 홈/대시보드 화면 (웹 레이아웃 — 1440px 기준)' : '앱에서 가장 중요한 홈/대시보드 화면'}
- aide-screen 클래스, 라우터 스크립트 불필요
- viewport shell 안에 실제 본문 scroll container를 둔 단일 화면 레이아웃. 콘텐츠를 \`overflow:hidden\`으로 잘라내지 마세요.
- global navigation(상단 GNB/앱바, 좌측 LNB, 하단 탭바)은 고정 또는 sticky 영역으로 분리하고, 본문 콘텐츠만 스크롤되게 하세요.
- 첫 화면 안에 실제 서비스 콘텐츠가 충분히 보여야 한다. 상단 영역만 만들고 아래를 비워두면 실패.
- ${effectivePlatform === 'mobile' ? '모바일 앱은 390px 내외 폭에서도 텍스트가 가로로 자연스럽게 읽혀야 한다. 세로 글자, 잘린 카드, 하단 내비와 겹친 콘텐츠는 실패.' : '웹 화면은 1440px 기준에서 좌우 컬럼, 카드 그리드, 리스트가 균형 있게 채워져야 한다.'}
- 배달/커머스류 홈이면 최소한 검색/주소, 카테고리, 추천 메뉴 또는 가게 카드 여러 개, 가격/평점/시간, 장바구니/주문 액션이 첫 화면에 보여야 한다.
- 단일 메인 화면은 "상단만 예쁜 포스터"가 아니라 실제 서비스 홈이어야 한다. 모바일 첫 viewport 안에 서비스 목적에 맞는 충분한 정보, 선택지, 다음 행동이 보여야 한다.
- 시안 A/B/C는 서로 다른 레이아웃 골격을 가져야 한다. 같은 header + hero + chip + card list 구조를 이름만 바꿔 반복하면 실패다.
` : `### 멀티스크린 프로토타입 (필수)
기획서를 분석해 **3~5개의 핵심 화면**을 하나의 HTML에 생성하세요.

**화면 구조 규칙:**
- 각 화면: \`<div id="screen-xxx" class="aide-screen" data-label="화면명">\`
- 첫 번째 화면만 \`active\` 클래스 추가
- 탭바·버튼·카드 등 화면 이동 요소에 \`data-screen="screen-xxx"\` 속성 추가
- \`<style>\`에 반드시 포함: \`.aide-screen{display:none;width:100%;height:100%;position:absolute;top:0;left:0;overflow:hidden auto} .aide-screen.active{display:block}\`
- body: \`position:relative; overflow:hidden;\`

**각 화면의 탭바:** 현재 화면의 탭 아이콘·텍스트에 active 스타일 적용 (다른 화면 탭에는 data-screen 속성으로 이동)

**라우터 스크립트 (</body> 바로 앞에 그대로 삽입):**
\`\`\`
<script>
(function(){
  function nav(id){document.querySelectorAll('.aide-screen').forEach(function(s){s.classList.remove('active');});var t=document.getElementById(id);if(t){t.classList.add('active');}window.parent&&window.parent.postMessage({type:'aide:screen',id:id},'*');}
  document.addEventListener('click',function(e){var el=e.target.closest('[data-screen]');if(el){e.preventDefault();nav(el.dataset.screen);}});
  window.addEventListener('message',function(e){if(e.data&&e.data.type==='aide:navigate'){nav(e.data.id);}});
  var sc=[];document.querySelectorAll('.aide-screen').forEach(function(s){sc.push({id:s.id,label:s.dataset.label||s.id});});
  window.parent&&window.parent.postMessage({type:'aide:screens',screens:sc},'*');
})();
</script>
\`\`\`

**화면 예시 (${effectivePlatform === 'web' ? '웹 기준' : '앱 기준'}, 기획서에 맞게 구성):**
- screen-home: 홈/대시보드
- screen-list: 목록/피드/탐색
- screen-detail: 상세보기/주문/작성
- screen-profile: 프로필/마이페이지
- screen-settings: 설정 (필요시)

**각 화면 콘텐츠 밀도 (필수):**
- 홈/대시보드: KPI 카드 3개 이상 + 차트 또는 활동 피드 + 바로가기 액션
- 목록/피드: 최소 6개 아이템, 각 아이템에 이미지·제목·부제목·메타 정보 포함
- 상세/주문: 섹션 3개 이상 (상품정보·리뷰/관련정보·액션), 실제 텍스트 내용 500자 이상 수준
- 프로필: 통계 수치 3개 이상 + 활동 내역 리스트 5개 이상
- ❌ 한 화면이 1~2개 요소만 있는 빈 화면 절대 금지
`}
${variantStyle ? `---

## 디자인 방향 (이 시안의 핵심 차별점 — 반드시 충실히 반영)
${variantStyle}

## 이 시안의 조형 차별화 의무
- 위 방향을 단순 문구로만 반영하지 말고, 실제 레이아웃 골격이 달라야 합니다.
- A/B/C 모두 같은 컴포넌트를 같은 순서로 반복하는 것을 금지합니다.
- 정보형은 밀도와 비교성, 전환형은 focal point와 CTA, 탐색형은 이미지/큐레이션 흐름이 화면 구조 자체에서 드러나야 합니다.
- 비주얼 전략도 시안별로 판단해 다르게 구성합니다. 3D 히어로가 어울리는 시안은 캐릭터/브랜드 감성 중심으로, 실사 이미지가 더 설득력 있는 시안은 Unsplash 히어로/콘텐츠 이미지 중심으로 구성하십시오.
- 세 시안이 같은 비주얼 장치나 같은 카드 구조로 반복되면 실패입니다. 단, 억지로 할당하지 말고 서비스 목적에 맞는 가장 자연스러운 조합을 선택하십시오.
- 단, 색상·폰트·카드·버튼·간격·라운드는 반드시 DESIGN.md를 유지합니다.
${effectivePlatform === 'web' ? `
웹 플랫폼 레이아웃 규칙 (위 시안 방향보다 우선):
- 캔버스: 1440px 너비, body에 max-width 제한 없이 풀 와이드 레이아웃
- 내비게이션: 하단 탭바는 절대 사용 금지. 서비스 성격에 따라 상단 GNB, 좌측 LNB, GNB+필터 사이드바 중 선택
- 포털·커머스·배달·예약·여행·교육·엔터테인먼트·브랜드형 웹은 상단 GNB를 우선 사용
- B2B SaaS·어드민·CRM·ERP·분석 대시보드·업무 도구는 좌측 LNB를 우선 사용
- 검색/탐색 중심 웹은 상단 GNB + 카테고리/필터 사이드바 조합 사용 가능
- 모바일 앱 크롬 금지: 상태바, 홈 인디케이터, 스와이프 영역 등 모바일 전용 UI 요소 사용 금지
- 12컬럼 그리드 (gutter 24px), 필요할 때만 우측 패널·사이드바·멀티 컬럼 레이아웃 활용` : ''}
` : hasExplore ? `---

## 다양한 시안 탐색 모드 (필수)
사용자가 '다양하게 보기'를 선택했습니다. 이 시안은 독창적이고 차별화된 방향을 탐색해야 합니다:
- 일반적인 레이아웃 패턴을 피하고 독특한 구조를 시도하세요 (카드형/리스트형/그리드형/대시보드형 중 다른 것 선택)
- 컬러 팔레트와 무드를 다른 시안과 완전히 다르게 설정하세요 (미니멀/볼드/다크/어스톤 등)
- 컴포넌트 스타일을 적극적으로 실험하세요 (플랫/엘리베이티드/아웃라인/유리모피즘 등)
` : ''}---

반드시 완전한 단일 HTML 파일로 응답하세요.
- 모든 CSS를 <style> 태그 안에 작성
- stock photo·외부 이미지 URL을 직접 작성하지 말고, 이미지가 필요한 곳에는 위 규칙의 %%HERO_3D%% / %%SCENE_3D%% / %%SHARED_IMG:keyword:width:height%% / %%IMG_n:설명%% / %%THUMB:keyword:width:height%% 플레이스홀더만 사용
- Chart.js CDN은 허용
- 응답은 반드시 \`\`\`html 코드블록으로 감싸기
- 설명 텍스트 없이 코드만 출력
- ⛔ 디바이스 목업·폰 프레임·기기 테두리 절대 금지: body 바깥에 폰/태블릿 실루엣을 감싸는 wrapper, 상단 노치·홈 인디케이터·전원 버튼 등 하드웨어 UI 요소 사용 금지. HTML은 그 자체가 앱 화면이어야 함
`;

  const referenceSection = referenceImageBase64
    ? referenceImageKind === 'wireframe'
      ? `\n## 와이어프레임 이미지 — 레이아웃 구조 기준 (CRITICAL)
첨부 이미지는 사용자가 의도한 정보 배치와 화면 골격입니다. 단, 시각 스타일은 DESIGN.md를 최종 기준으로 유지하세요:

**반드시 반영**
- 주요 영역의 순서: 헤더/히어로/콘텐츠/리스트/CTA/탭바 등 화면 구조를 최대한 유지
- 카드·목록·폼·CTA가 놓인 위치와 비율을 해석해서 실제 서비스 데이터로 채우기
- 와이어프레임의 빈 박스는 의미 있는 실제 콘텐츠 영역으로 변환
- 모바일/웹 반응형 전환 시에도 와이어프레임의 핵심 흐름을 유지

**절대 금지**
- 와이어프레임의 회색 박스, 임시 선, 저충실도 스타일을 그대로 복사하지 말 것
- 와이어프레임을 따라 하느라 DESIGN.md의 컬러·폰트·카드·간격 규칙을 덮어쓰지 말 것

✅ 통과 기준: 사용자의 배치 의도를 유지하면서 선택한 디자인 시스템으로 완성된 화면
`
      : `\n## 🎨 레퍼런스 이미지 — 분위기·패턴 참고 (CRITICAL)
첨부 이미지는 레이아웃과 콘텐츠 밀도 참고 자료입니다. 단, 색상·폰트·라운드·카드·그림자 규칙은 DESIGN.md를 최종 기준으로 유지하세요:

**1. 시각적 톤·무드 추출**
- 첨부 이미지의 전체 분위기(미니멀/임팩트/감성/플레이풀 중 어떤 것)를 파악하고 동일하게 재현
- 사용된 일러스트·이미지의 스타일(3D 클레이/플랫 아이콘/실사 사진/그래픽 등) 그대로 차용
- 캐릭터·마스코트가 보이면 비슷한 스타일의 일러스트 자리(%%IMG_1:캐릭터 설명%%) 마련

**2. 여백·타이포 계층 참고**
- 카드/섹션 사이의 정보 밀도와 레이아웃 리듬을 참고
- 폰트 굵기와 크기 단계는 DESIGN.md typography 토큰 안에서만 재현
- 첨부 이미지의 컬러를 DESIGN.md colors보다 우선하지 말 것

**3. 레이아웃 구조 모방**
- 헤더·히어로·콘텐츠·CTA·푸터 영역의 비율을 동일하게 잡기
- 카드/리스트의 아이템 정렬 방식(원형 칩 가로 배열, 그리드, 스택 등) 그대로 재현
- 하단 고정 CTA·말풍선·번호 배지 등 특징적 패턴이 있으면 반드시 포함

⚠️ 절대 금지: 첨부 이미지를 따라 하느라 DESIGN.md 스타일을 덮어쓰기
✅ 통과 기준: 선택한 디자인 시스템 안에서 레퍼런스의 정보 구조와 완성도를 흡수한 화면
`
    : ''

  const iaImageSection = iaImageBase64
    ? `\n## IA 메뉴구조도 / 화면설계서 이미지 (CRITICAL — 화면 구조의 최우선 근거)\n첨부 이미지는 기획자가 작성한 IA 메뉴 구조도 또는 화면 설계서입니다.\n- 이 이미지에 표시된 메뉴 계층, 화면 목록, 플로우를 네비게이션과 UI 레이아웃에 정확히 반영하세요.\n- brief보다 이 IA 구조가 화면 구성의 최우선 근거입니다.\n- 시각 스타일(색상·폰트·카드)은 DESIGN.md를 따릅니다.\n`
    : ''

  const iaTextSection = iaText
    ? `\n## IA 메뉴구조도 / 화면설계서 (엑셀 데이터, CRITICAL — 화면 구조의 최우선 근거)\n아래는 기획자가 작성한 IA 메뉴 구조도 또는 화면 설계 데이터입니다 (엑셀에서 변환):\n\n${iaText}\n\n- 위 데이터에 표시된 메뉴 계층, 화면 목록, 플로우를 네비게이션과 UI 레이아웃에 정확히 반영하세요.\n- brief보다 이 IA 구조가 화면 구성의 최우선 근거입니다.\n- 시각 스타일(색상·폰트·카드)은 DESIGN.md를 따릅니다.\n`
    : ''

  const iaSection = iaImageSection + iaTextSection

  const fullPrompt = prompt + referenceSection + iaSection

  const images = [
    ...(iaImageBase64 ? [{ data: iaImageBase64, mimeType: 'image/png' }] : []),
    ...(referenceImageBase64 ? [{ data: referenceImageBase64, mimeType: 'image/png' }] : []),
  ]

  const { onHtmlChunk } = params
  const streamChunkHandler = onHtmlChunk
    ? (accumulated: string) => {
        const htmlStart = accumulated.indexOf('<!DOCTYPE') !== -1
          ? accumulated.indexOf('<!DOCTYPE')
          : accumulated.indexOf('<html')
        if (htmlStart !== -1 && accumulated.length - htmlStart > 800) {
          onHtmlChunk(accumulated.slice(htmlStart))
        }
      }
    : undefined

  const text = images.length > 1
    ? await generateProWithMultipleImages(fullPrompt, images, apiKey, modelId, streamChunkHandler)
    : images.length === 1
      ? await generateProWithImage(fullPrompt, images[0].data, images[0].mimeType, apiKey, modelId, streamChunkHandler)
      : await generatePro(fullPrompt, apiKey, modelId, streamChunkHandler)

  let html: string
  const htmlMatch = text.match(/```html\n?([\s\S]*?)```/);
  if (htmlMatch) {
    html = htmlMatch[1]
  } else {
    const htmlTagMatch = text.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    html = htmlTagMatch ? htmlTagMatch[0] : text
  }

  html = sanitizeGeneratedBranding(html, brief, effectiveDesignMd, logoDataUrl)
  html = ensureRequiredVariantVisuals(html, { variantStyle, sharedVisualSubject: effectiveSharedVisualSubject, heroImagePrompt: visual3dPrompt, layoutBlueprint, visualPolicy: effectiveVisualPolicy })
  html = applyLogoDataUrlOnce(html, logoDataUrl)
  html = injectMaterialSymbolsFont(html)
  html = injectLayoutEssentialsGuard(html, layoutBlueprint)

  if (!isDraftMode) {
    const blueprintIssues = auditLayoutBlueprintHtml(html, layoutBlueprint)
    if (blueprintIssues.length > 0 && layoutBlueprint) {
      onStep?.('레이아웃 스캐폴드 보정 중...')
      const repairMessage = `생성된 HTML이 사용자가 확정한 Layout Scaffold 계약을 지키지 못했습니다.

발견된 문제:
${blueprintIssues.map((issue, idx) => `${idx + 1}. ${issue}`).join('\n')}

수정 지침:
- 아래 Layout Blueprint의 모든 sections를 정확히 1회씩 구현하세요.
- 각 section/header/nav/aside에는 반드시 data-blueprint-section 값을 유지하세요.
- section 순서, role, navType, heroType을 바꾸지 마세요.
- global navigation은 scroll container 밖에 두고 sticky/fixed로 유지하세요.
- 본문 콘텐츠는 .content-scroll 또는 .page-scroll 안에서 overflow-y:auto로 스크롤되게 하세요.
- 콘텐츠/카피/스타일은 유지하되, 빠진 scaffold section과 scroll 구조만 고치세요.

Layout Blueprint:
${JSON.stringify(layoutBlueprint, null, 2)}`
      html = await refineUI(html, repairMessage, brief, effectiveDesignMd, apiKey, logoDataUrl, domain)
      html = sanitizeGeneratedBranding(html, brief, effectiveDesignMd, logoDataUrl)
      html = ensureRequiredVariantVisuals(html, { variantStyle, sharedVisualSubject: effectiveSharedVisualSubject, heroImagePrompt: visual3dPrompt, layoutBlueprint, visualPolicy: effectiveVisualPolicy })
      html = applyLogoDataUrlOnce(html, logoDataUrl)
      html = injectMaterialSymbolsFont(html)
      html = injectLayoutEssentialsGuard(html, layoutBlueprint)
    }
  }

  let staticContractResult: { html: string; refined: boolean }
  if (isDraftMode) {
    staticContractResult = { html, refined: false }
  } else {
    onStep?.('디자인 계약 검수 중...')
    staticContractResult = await enforceStaticDesignContract(html, {
      brief,
      designMd: effectiveDesignMd,
      apiKey,
      logoDataUrl,
      domain,
      hasBrandColors,
    })
  }
  html = staticContractResult.html
  html = ensureRequiredVariantVisuals(html, { variantStyle, sharedVisualSubject: effectiveSharedVisualSubject, heroImagePrompt: visual3dPrompt, layoutBlueprint, visualPolicy: effectiveVisualPolicy })
  html = auditSpacingTokens(html, designContract)
  html = applyLogoDataUrlOnce(html, logoDataUrl)
  html = injectLayoutEssentialsGuard(html, layoutBlueprint)

  if (params.criticalReview !== false && !staticContractResult.refined) {
    try {
      const critiqueRaw = await critiqueUI(html, brief, domain, apiKey, variantStyle)
      const jsonMatch = critiqueRaw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const critique = JSON.parse(jsonMatch[0]) as {
          score?: number
          verdict?: string
          topIssues?: string[]
          improvements?: string[]
        }
        const needsRefine = critique.verdict === 'needs_refinement' || (typeof critique.score === 'number' && critique.score < 70)
        if (needsRefine && Array.isArray(critique.improvements) && critique.improvements.length > 0) {
          onStep?.('UI 품질 개선 중...')
          const refineMessage = `디자인 시스템 검수자가 지적한 개선 사항을 적용하세요 (점수: ${critique.score ?? '?'}/100):

지적된 문제:
${(critique.topIssues || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

반영할 개선:
${critique.improvements.map((s, i) => `${i + 1}. ${s}`).join('\n')}

위 개선 사항을 모두 반영하되, 기존 디자인 시스템 토큰·구조는 유지하세요.`
          html = await refineUI(html, refineMessage, brief, designMd, apiKey, logoDataUrl, domain)
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('[gemini] critiqueUI skipped:', msg)
    }
  }

  let variantDescription: VariantDescription | undefined
  try {
    const jsonMatch = designIntentPlan.match(/```json\n?([\s\S]*?)```/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]) as { selectedDesignStrategy?: string; designIntent?: string; layoutThesis?: string }
      variantDescription = {
        strategy: parsed.selectedDesignStrategy ?? '',
        intent: parsed.designIntent ?? '',
        layoutThesis: parsed.layoutThesis ?? '',
      }
    }
  } catch { /* intentionally ignored */ }

  return { html, variantDescription }
}

export async function expandToPrototype(mainHtml: string, params: GenerateParams, apiKey?: string): Promise<string> {
  const { brief, answers, projectSummary, designMd, logoDataUrl: expandLogoUrl, brandColors: expandBrandColors, asIsAnalysis, modelId = 'gemini-3.1-pro-preview', platform, domain, heroImagePrompt, heroSubject } = params;
  const answersText = Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const isWeb = platform === 'web'
  const designSystemContract = designMd
    ? buildDesignSystemContract(designMd, !!(expandBrandColors && expandBrandColors.length > 0))
    : ''
  // Replace logo first, then strip remaining base64 URIs — order matters:
  // if we strip first, the logo's base64 is already gone when we try to replace it.
  const preservedDataUrls: string[] = []
  const logoSwapped = expandLogoUrl ? mainHtml.split(expandLogoUrl).join('__LOGO_DATA_URL__') : mainHtml
  const safeMainHtml = logoSwapped.replace(/data:[^;]+;base64,[A-Za-z0-9+/]+=*/g, (src) => {
    const token = `__PRESERVED_IMAGE_${preservedDataUrls.length}__`
    preservedDataUrls.push(src)
    return token
  })
  const preservedImageGuide = preservedDataUrls.length > 0
    ? `\n## 보존 이미지 토큰 (CRITICAL)\n메인 화면 안의 기존 이미지 data URL은 프롬프트 길이를 줄이기 위해 토큰으로 치환되어 있습니다.\n- ${preservedDataUrls.map((_, i) => `__PRESERVED_IMAGE_${i}__`).join(', ')}\n- 이 토큰들은 실제 이미지 src 자리입니다. 삭제하거나 다른 URL/placeholder/빈 이미지로 바꾸지 마세요.\n- 특히 3D 히어로 이미지가 있으면 선택한 시안의 핵심 비주얼이므로 screen-home에서 반드시 그대로 유지하세요.\n`
    : ''

  // 메인 HTML에서 CSS 변수(:root 블록) 추출 — 서브 화면 일관성 강화
  const extractedCssVars = (() => {
    const styleText = extractStyleText(safeMainHtml)
    const rootMatches = [...styleText.matchAll(/:root\s*\{([^}]+)\}/g)]
    if (rootMatches.length === 0) return ''
    const combined = rootMatches.map(m => m[1].trim()).join('\n')
    return `:root {\n${combined}\n}`
  })()
  const cssVarsGuide = extractedCssVars
    ? `\n## 🔒 CSS 변수 잠금 — 서브 화면도 이 변수만 사용 (CRITICAL)\n메인 화면에서 추출한 CSS 변수입니다. 서브 화면의 \`<style>\` 최상단에 이 블록을 **그대로 복사**하고, 모든 색상·간격·폰트는 반드시 이 변수를 참조하세요.\n임의 hex(#xxx), px 하드코딩 금지 — 변수를 벗어나는 순간 스타일이 깨집니다.\n\`\`\`css\n${extractedCssVars}\n\`\`\`\n`
    : ''

  const expectedSubScreensGuide = params.generationPlan?.expectedSubScreens && params.generationPlan.expectedSubScreens.length > 0
    ? `\n## ★ 서비스 핵심 화면 목록 (CRITICAL — 이 목록 기준으로 서브 화면 구성)\n아래는 이 서비스의 실제 핵심 화면 정의입니다. 탭바 탭 이름만 보고 임의로 화면을 만들지 말고, 반드시 아래 id/label/purpose를 기준으로 서브 화면을 구성하세요.\n${params.generationPlan.expectedSubScreens.map(s => `- id: \`${s.id}\`, 탭 레이블: "${s.label}", 콘텐츠 목적: ${s.purpose}`).join('\n')}\n`
    : ''

  // 서브 화면이 빈 와이어프레임이 되지 않도록 실제 콘텐츠 재료(데이터 항목) 주입 (Phase 3-B)
  const contentInventoryGuide = (() => {
    const inv = params.generationPlan?.contentInventory
    if (!inv) return ''
    const parts: string[] = []
    if (inv.requiredAboveFoldUnits?.length) parts.push(`- 핵심 데이터 항목: ${inv.requiredAboveFoldUnits.join(', ')}`)
    if (inv.kpis?.length) parts.push(`- KPI 예시: ${inv.kpis.slice(0, 6).map(k => `${k.label} ${k.value}`).join(' / ')}`)
    if (inv.listItems?.length) parts.push(`- 리스트 항목 예시: ${inv.listItems.slice(0, 5).map(l => `${l.title}(${l.value})`).join(', ')}`)
    if (inv.quickActions?.length) parts.push(`- 빠른 액션: ${inv.quickActions.slice(0, 6).join(', ')}`)
    if (parts.length === 0) return ''
    return `\n## ★ 서브 화면 콘텐츠 재료 (와이어프레임 방지 — 실제 데이터로 채우기)\n각 서브 화면은 아래 재료를 활용해 실제 서비스처럼 구체적인 한글 텍스트·수치·상태로 채우세요. "항목 1", "제목", "내용" 같은 placeholder 금지.\n${parts.join('\n')}\n`
  })()

  const navExtractionGuide = isWeb
    ? `- 상단 GNB/nav 전체 (<nav>, <header> 또는 최상단 고정 영역)
- 사이드바 (<aside>, .sidebar, .side-nav 등 — 있는 경우만)`
    : `- 상단 앱바/헤더 (position: fixed/sticky 또는 body 최상단 첫 번째 div)
- 하단 탭바/네비게이션 바 (position: fixed/sticky 또는 body 최하단 마지막 div)`

  const contentAreaGuide = isWeb
    ? `GNB와 사이드바 사이의 <main> 또는 메인 콘텐츠 영역`
    : `앱바와 하단 탭바 사이의 스크롤 가능한 콘텐츠 영역`

  const prompt = `당신은 선택한 디자인 시스템을 유지하면서 멀티스크린 프로토타입을 확장하는 시니어 프로덕트 디자이너이자 프론트엔드 개발자입니다.
아래 메인 화면의 디자인 시스템, 컴포넌트 스타일, 정보 밀도를 그대로 유지하면서 서브 화면을 확장하세요.

## 메인 화면 HTML
\`\`\`html
${safeMainHtml}
\`\`\`
${preservedImageGuide}${cssVarsGuide}
${designMd ? `\n## 디자인 시스템 (서브 화면에도 동일하게 적용 — 임의 색상·폰트 사용 절대 금지)\n${extractDesignMdForPrompt(designMd)}\n` : ''}${expandBrandColors && expandBrandColors.length > 0 ? `\n## 브랜드 컬러 적용\n- primary/action/accent 계열만 브랜드 컬러로 유지: --color-primary: ${expandBrandColors[0]};${expandBrandColors[1] ? ` --color-secondary: ${expandBrandColors[1]};` : ''}\n- neutral/surface/background/border/status 색상, spacing, rounded, typography, component sizing은 DESIGN.md 값을 유지\n- 카드 배경, 페이지 배경, 본문 텍스트를 브랜드 컬러로 덮지 말 것\n` : ''}
${designSystemContract ? `\n${designSystemContract}\n\n## Contract 유지 규칙\n- 서브 화면도 메인 화면과 동일한 Design System Contract와 rhythm variables를 사용하세요.\n- 새로 만드는 카드/리스트/폼/버튼은 메인 화면의 padding/gap/radius/border/shadow 정책을 복제하세요.\n- A/B/C 선택 이후 전체 페이지 확장 단계에서 새로운 spacing scale이나 임의 radius를 만들면 실패입니다.\n\n## ⛔ 카드·섹션 Spacing 하드코딩 절대 금지\n- 서브 화면의 모든 카드 내부 padding은 반드시 \`padding: var(--aide-card-padding)\`을 사용하세요.\n- \`padding: 12px\`, \`padding: 16px\`, \`padding: 16px 20px\` 등 하드코딩 값 사용 금지.\n- 카드 간 gap은 \`gap: var(--aide-card-gap)\`, 섹션 간격은 \`margin-top: var(--aide-section-gap)\`을 사용하세요.\n- 좌우 페이지 여백은 \`padding-left: var(--aide-page-padding); padding-right: var(--aide-page-padding)\`을 사용하세요.\n` : ''}
${asIsAnalysis ? `\n## As-is URL 구조 분석 — 서브 화면 확장 참고\n아래 데이터는 기존 서비스의 정보 구조와 콘텐츠 재료입니다. 색상·폰트·라운드·그림자는 복사하지 말고, DESIGN.md 스타일을 유지하세요.\n\`\`\`json\n${JSON.stringify(asIsAnalysis, null, 2).slice(0, 9000)}\n\`\`\`\n` : ''}
## 프로젝트 개요
${projectSummary}

## 기획서
${brief}

## 사용자 선택 옵션
${answersText || '없음'}

## ★ 가장 중요한 규칙: 공통 UI 고정

**Step 1 — 공통 UI 식별:**
메인 화면 HTML에서 다음 요소의 HTML을 정확히 파악하세요:
${navExtractionGuide}

${expectedSubScreensGuide}${contentInventoryGuide}
**Step 2 — 서브 화면 구성 (3~4개):**
⚠️ 서브 화면 기준 (CRITICAL):
- 모바일 앱: 하단 탭바의 각 탭 목적지를 서브 화면으로 만드세요 (예: 레시피 탭 → screen-recipe, 냉장고 탭 → screen-fridge, 장보기 탭 → screen-cart, 마이 탭 → screen-profile)
- 웹 앱: GNB의 각 메뉴 목적지를 서브 화면으로 만드세요 (예: 검색, 카테고리, 마이페이지)
- 각 탭에 해당하는 실제 기능 화면을 만들어야 합니다. 콘텐츠가 풍부한 실제 서비스 화면이어야 합니다.
⛔ 절대 금지: "신규 유저", "일반 유저", "헤비 유저", "새 유저" 같은 유저 타입을 서브 화면으로 만들지 마세요.
  유저 타입 변형은 별도 Tweaks States로 처리되므로 서브 화면에서 다룰 필요 없습니다.

각 서브 화면은 반드시 이 구조를 따르세요:
1. Step 1에서 파악한 공통 UI HTML → **한 글자도 수정하지 말고 그대로 복사**
2. ${contentAreaGuide} → **이 부분만** 해당 화면에 맞게 새로 작성
3. (해당하는 경우) 하단 공통 UI → 그대로 복사

**절대 금지:**
- 공통 UI(앱바/GNB/탭바/사이드바)의 색상, 폰트, 아이콘, 텍스트, 클래스명 변경
- 메인 화면에 없던 새로운 컴포넌트 스타일 도입
- 임의의 색상 hex 값 사용 (반드시 메인 화면의 CSS 변수 또는 동일 hex만)

## ★ 서브 화면 품질 기준 (콘텐츠 영역에만 적용)
> 아래 규칙은 새로 작성하는 콘텐츠 영역에만 적용됩니다.
> 공통 UI(앱바/탭바/GNB/사이드바)의 HTML·CSS·색상·아이콘은 절대 수정 금지.

${buildQualityRules(heroSubject || heroImagePrompt, domain)}

## 반응형 확장 필수 규칙
- 최종 HTML은 선택한 기준 플랫폼으로 보이되, iframe 폭이 바뀌면 CSS @media 쿼리로 모바일/태블릿/데스크탑 레이아웃이 실제로 전환되어야 합니다.
- 고정 폭 390px/430px/1440px 컨테이너만 사용해 화면을 중앙에 박아두지 마십시오. width:100%, max-width, clamp(), minmax(), auto-fit/auto-fill을 함께 사용하십시오.
- 모바일 기준 앱 UI도 넓은 화면에서는 콘텐츠가 깨지지 않도록 중앙 컨테이너 또는 2컬럼 보조 패널로 확장하고, 웹 기준 UI도 390px에서는 1컬럼으로 접혀야 합니다.
- 히어로 3D/실사 이미지는 컨테이너 크기에 따라 clamp()로 자연스럽게 커지고 작아져야 하며, 텍스트/CTA를 가리거나 과도하게 작은 장식으로 축소되면 실패입니다.

## 화면 구조
- 메인 화면 HTML을 \`id="screen-home"\` aide-screen으로 래핑 (내용 수정 금지)
- 각 서브 화면: \`<div id="screen-xxx" class="aide-screen" data-label="화면명">\`
- 첫 번째 화면만 \`active\` 클래스
- \`<style>\`에 반드시: \`.aide-screen{display:none;width:100%;height:100%;position:absolute;top:0;left:0;overflow:hidden auto} .aide-screen.active{display:block}\`
- body: \`position:relative; overflow:hidden;\`

**라우터 스크립트 (</body> 바로 앞):**
\`\`\`
<script>
(function(){
  function nav(id){document.querySelectorAll('.aide-screen').forEach(function(s){s.classList.remove('active');});var t=document.getElementById(id);if(t){t.classList.add('active');}window.parent&&window.parent.postMessage({type:'aide:screen',id:id},'*');}
  document.addEventListener('click',function(e){var el=e.target.closest('[data-screen]');if(el){e.preventDefault();nav(el.dataset.screen);}});
  window.addEventListener('message',function(e){if(e.data&&e.data.type==='aide:navigate'){nav(e.data.id);}});
  var sc=[];document.querySelectorAll('.aide-screen').forEach(function(s){sc.push({id:s.id,label:s.dataset.label||s.id});});
  window.parent&&window.parent.postMessage({type:'aide:screens',screens:sc},'*');
})();
</script>
\`\`\`

완전한 단일 HTML 파일로 응답 (모든 CSS를 <style> 안에). 응답은 반드시 \`\`\`html 코드블록으로 감싸기. 설명 없이 코드만 출력.`;

  const text = await generatePro(prompt, apiKey, modelId);
  let html: string
  const htmlMatch = text.match(/```html\n?([\s\S]*?)```/);
  if (htmlMatch) {
    html = htmlMatch[1]
  } else {
    const htmlTagMatch = text.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    html = htmlTagMatch ? htmlTagMatch[0] : text
  }

  html = sanitizeGeneratedBranding(html, brief, designMd, expandLogoUrl)
  html = applyLogoDataUrlOnce(html, expandLogoUrl)
  html = injectMaterialSymbolsFont(html)
  preservedDataUrls.forEach((src, i) => {
    html = html.split(`__PRESERVED_IMAGE_${i}__`).join(src)
  })

  html = injectDesignContractStyle(html, designMd || '', !!(expandBrandColors && expandBrandColors.length > 0))

  return html
}

export async function refineUI(html: string, message: string, brief: string, designMd?: string, apiKey?: string, logoDataUrl?: string | null, domain?: AppDomain): Promise<string> {
  const TINY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  const logoSwapped = logoDataUrl ? html.split(logoDataUrl).join('__LOGO_DATA_URL__') : html
  const safeHtml = logoSwapped.replace(/data:[^;]+;base64,[A-Za-z0-9+/]+=*/g, TINY_GIF)
  const hasMultiScreen = safeHtml.includes('aide-screen');

  const prompt = `당신은 선택한 디자인 시스템을 유지·개선하는 시니어 프로덕트 디자이너입니다.
요청된 수정 사항을 적용하되, 기존 디자인 시스템의 토큰·컴포넌트·정보 구조를 절대 낮추지 마세요.

## 프로젝트 기획서
${brief}
${designMd ? `\n## 디자인 시스템 ← 수정 시에도 이 토큰·규칙을 반드시 유지할 것 (임의 색상·폰트 사용 절대 금지)\n${designMd}\n` : ''}
## 사용자 수정 요청
"${message}"

## 현재 HTML
${safeHtml}

## 필수 규칙
${hasMultiScreen ? `- 이 HTML은 멀티스크린 프로토타입입니다 — .aide-screen 화면 구조와 라우터 스크립트(aide:screens / aide:screen / aide:navigate postMessage 처리)를 절대 삭제하거나 변경하지 마세요
- 요청된 수정은 해당하는 화면에만 적용하고 나머지 화면은 그대로 유지하세요
` : ''}- 요청된 부분만 수정하고 나머지 스타일·스크립트·구조는 100% 보존
- --color-primary CSS 변수와 브랜드 컬러 유지
- 한국어 더미 데이터 유지 (영어로 변환 금지)
- ⛔ 모든 img src 값 절대 변경 금지 — images.unsplash.com URL, picsum.photos URL, loremflickr.com URL, data:image/* URL 등 기존 src를 그대로 유지 (새 URL 생성 금지, %%THUMB:...%% 등 플레이스홀더로 되돌리기도 금지)
${logoDataUrl ? '- HTML에 `aide-logo-slot`, `aide-brand-logo`, 또는 `__LOGO_DATA_URL__` 로고 토큰이 있으면 절대 삭제하지 마세요. 로고 src를 새로 만들거나 텍스트 브랜드명으로 대체하지 마세요\n' : ''}- 응답은 <!DOCTYPE html> 또는 <html로 시작하는 완전한 HTML 파일만 출력 (마크다운 블록·설명 금지)

## ★ 수정 시 품질 유지 기준
> 수정 요청 외의 기존 품질을 절대 낮추지 말 것. 아래는 기존 퀄리티를 지키기 위한 기준이다.
${buildQualityRules(undefined, domain)}`;

  const text = (await generatePro(prompt, apiKey)).trim();
  const mdMatch = text.match(/```(?:html)?\n?([\s\S]*?)```/);
  let result = mdMatch ? mdMatch[1].trim() : text;
  result = sanitizeGeneratedBranding(result, brief, designMd, logoDataUrl)
  result = applyLogoDataUrlOnce(result, logoDataUrl)
  result = injectMaterialSymbolsFont(result)
  return result;
}

export async function analyzeTweaks(html: string, brief: string, apiKey?: string): Promise<TweakSpec> {
  // Extract text-heavy body content to help AI find display strings
  // CSS styles can be large; prefer body content where actual values appear
  const bodyMatch = html.match(/<body[\s\S]*<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[0] : html;
  // Send full body (up to 60K chars) so AI can find display values throughout the HTML
  const trimmedHtml = bodyContent.slice(0, 60000);

  const prompt = `
당신은 UI 더미 데이터 분석 전문가입니다.
아래 HTML UI를 분석해서 실시간으로 변경 가능한 데이터 변수와 시나리오를 추출하세요.

## 기획서
${brief.slice(0, 500)}

## HTML (body 내용)
${trimmedHtml}

## 규칙

### variables (숫자 변수, 0~3개)
슬라이더로 조절하면 UI에 바로 반영되는 핵심 숫자만 선택:
- 포인트/금액/점수/진행률(%)/스탬프 개수/아이템 수 등
- currentDisplayStrings: HTML에 실제 표시된 문자열 목록 (포맷 변형 포함)
  예) currentValue=1240, unit="P" → ["1,240P", "1240P"] 모두 포함
- currentDisplayStrings는 반드시 HTML body 안에서 실제로 보이는 텍스트를 그대로 복사하세요. CSS 클래스명, 변수명, aria-label만 보고 만들지 마세요.
- 슬라이더로 조절할 의미 있는 변수가 없으면 빈 배열 []

### states (3개 고정, 순서 그대로)
- id "new_user" (label "새 유저"): 활동 없는 신규 사용자
- id "typical" (label "일반 유저"): 현재 HTML 상태 → replacements 반드시 []
- id "power_user" (label "헤비 유저"): 오래된 충성 고객, 최대치에 가까운 상태
- replacements: 상태 전환 시 변경할 텍스트 쌍 (variables의 currentDisplayStrings에 있는 값은 제외)
- replacements.from은 HTML body 안에 실제로 표시된 문구를 정확히 복사하세요. 없는 문구를 만들지 마세요.
- 같은 의미의 핵심 상태는 2~6개 문구를 함께 바꾸세요. 예: 걸음 수 앱이면 "2,430보", "76%", "오늘 리워드 받기", "남은 1,570보"처럼 화면에서 체감되는 문구를 함께 교체합니다.
- 숫자 변수로 이미 잡은 값은 states replacements에서 중복 교체하지 마세요.
- 새 유저는 0에 가까운 상태, 헤비 유저는 목표 달성/상위 등급/큰 누적 보상 상태가 되어야 합니다.
- 단순 숫자 치환만 하면 실패입니다. 상태 전환은 반드시 화면의 의미가 바뀌어야 합니다.
- 가능한 경우 replacements에는 아래 4종을 섞으세요:
  1. headline/status message: 예) "가볍게 산책 완료!" → "첫 걸음을 시작해볼까요?"
  2. CTA label: 예) "오늘 리워드 받기" → "첫 미션 시작하기" 또는 "VIP 보상 받기"
  3. mission/reward state: 예) "진행중" → "시작 전" 또는 "완료"
  4. badge/tier/empty state: 예) "4일 연속" → "연속 기록 없음" 또는 "VIP 배지"
- 신규 유저 상태는 빈 상태(empty state)가 자연스럽게 느껴져야 합니다: 0보, 0%, 첫 미션 시작, 아직 받은 보상 없음, 잠금/시작 전 문구.
- 헤비 유저 상태는 완료 상태가 자연스럽게 느껴져야 합니다: 목표 달성, 100%, 보상 수령 가능, VIP/연속 기록/완료 배지 문구.
- HTML에 없는 문구를 from으로 만들지 말고, 현재 보이는 문구 중 상태 의미를 가장 잘 드러내는 텍스트를 골라 to를 바꾸세요.

### events (0~4개)
이 앱에서 사용자가 "와!" 하는 결정적 순간을 버튼 하나로 재현하세요.
예: 스탬프 10개 완성, 포인트 적립 애니메이션, 레벨업, 쿠폰 발급, 목표 달성, 출석 체크

각 이벤트:
- id: camelCase 식별자 (예: "stampComplete", "levelUp")
- label: 버튼에 표시할 짧은 한국어 (예: "스탬프 완성", "레벨업")
- script: iframe document 내부에서 실행되는 순수 JavaScript (외부 라이브러리 금지)

script 작성 규칙:
1. document.querySelector/querySelectorAll로 실제 DOM 요소를 조작
2. 모든 querySelector 결과에 반드시 null 체크: if (!el) return;
3. CSS 인라인 스타일로 트랜지션/애니메이션 직접 적용 (transition, transform, opacity, background 등)
4. 단계적 연출은 setTimeout으로 순차 실행 (100ms~500ms 간격)
5. 완성/달성 팝업은 position:fixed 오버레이를 동적으로 생성해서 2~3초 후 자동 제거
6. confetti 파티클은 canvas API로 직접 구현하거나 간단한 div 애니메이션으로 대체
7. 스탬프/진행률 같은 요소는 클래스 추가/CSS 변경으로 채워지는 효과
8. 숫자 카운터 올라가는 효과: setInterval로 숫자를 단계적으로 올리고 clearInterval

실제 HTML에 있는 클래스명/ID/텍스트를 그대로 사용하세요. 없는 선택자를 만들지 마세요.
이 앱에 적합한 이벤트가 없으면 빈 배열 []을 반환하세요.

반드시 아래 JSON 형식으로만 응답 (마크다운 없이):
{
  "variables": [
    {
      "id": "points",
      "label": "포인트 잔액",
      "unit": "P",
      "min": 0,
      "max": 5000,
      "step": 50,
      "currentValue": 1240,
      "currentDisplayStrings": ["1,240P", "1240P"]
    }
  ],
  "states": [
    {
      "id": "new_user",
      "label": "새 유저",
      "replacements": [
        { "from": "3 / 5 완료", "to": "0 / 5 완료" },
        { "from": "87%", "to": "0%" }
      ]
    },
    { "id": "typical", "label": "일반 유저", "replacements": [] },
    {
      "id": "power_user",
      "label": "헤비 유저",
      "replacements": [
        { "from": "3 / 5 완료", "to": "5 / 5 완료" },
        { "from": "Silver", "to": "VIP" }
      ]
    }
  ],
  "events": [
    {
      "id": "stampComplete",
      "label": "스탬프 완성",
      "script": "(function() { var stamps = document.querySelectorAll('.stamp-empty'); if (!stamps.length) return; var i = 0; var fill = setInterval(function() { if (i >= stamps.length) { clearInterval(fill); var overlay = document.createElement('div'); overlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:9999;'; overlay.innerHTML = '<div style=\"background:#fff;border-radius:20px;padding:32px 40px;text-align:center;font-family:sans-serif;\"><div style=\"font-size:48px;\">☕</div><div style=\"font-size:20px;font-weight:700;margin-top:12px;\">무료 음료 획득!</div><div style=\"color:#666;margin-top:8px;\">스탬프 10개를 모았어요</div></div>'; document.body.appendChild(overlay); setTimeout(function() { overlay.remove(); }, 2500); return; } stamps[i].style.cssText = 'transition:transform 0.2s,opacity 0.2s;transform:scale(1.3);opacity:0.5;'; setTimeout(function(j) { return function() { stamps[j].style.cssText = 'transition:transform 0.3s,background 0.3s;transform:scale(1);background:#6f4e37;border-radius:50%;'; }; }(i), 200); i++; }, 150); })();"
    }
  ]
}
`;

  try {
    const text = await generatePro(prompt, apiKey, 'gemini-3.1-flash-lite');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { variables: [], states: [], events: [] };
    const parsed = JSON.parse(jsonMatch[0]);
    return { variables: [], states: [], events: [], ...parsed };
  } catch {
    return { variables: [], states: [], events: [] };
  }
}
