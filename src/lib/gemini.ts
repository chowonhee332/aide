import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { type AppDomain, DOMAIN_KEY_TO_LABEL, DOMAIN_HOME_EMPHASIS_OPTIONS } from './domain-constants';
import { getDomainGuidance } from './variant-refs';
export type { AppDomain } from './domain-constants';
export { DOMAIN_KEY_TO_LABEL, DOMAIN_LABEL_TO_KEY, DOMAIN_HOME_EMPHASIS_OPTIONS } from './domain-constants';

function getAi(apiKey?: string) {
  return new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! })
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

async function generatePro(prompt: string, apiKey?: string, model = 'gemini-3.5-flash'): Promise<string> {
  const ai = getAi(apiKey)
  console.log('[gemini] generatePro start, model=', model, 'prompt length=', prompt.length)
  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        temperature: 1,
        maxOutputTokens: 32768,
        httpOptions: { timeout: 300_000 },
      },
    });
    let text = '';
    let chunkCount = 0;
    for await (const chunk of stream) {
      text += chunk.text ?? '';
      chunkCount++;
    }
    console.log('[gemini] generatePro done, chunks=', chunkCount, 'output length=', text.length)
    return text;
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown'
    const message = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error ? (err as NodeJS.ErrnoException).cause : undefined
    console.error('[gemini] generatePro error:', { name, message, cause })
    throw err
  }
}

async function generateFlashNoThinking(prompt: string, apiKey?: string): Promise<string> {
  const ai = getAi(apiKey)
  const res = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      temperature: 0.5,
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 0 },
      httpOptions: { timeout: 30_000 },
    },
  });
  return res.text ?? '';
}

async function generateProWithImage(prompt: string, imageBase64: string, mimeType: string, apiKey?: string, model = 'gemini-3.5-flash'): Promise<string> {
  const ai = getAi(apiKey)
  console.log('[gemini] generateProWithImage start, model=', model, 'prompt length=', prompt.length)
  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
      config: {
        temperature: 1,
        maxOutputTokens: 32768,
        httpOptions: { timeout: 300_000 },
      },
    })
    let text = ''
    let chunkCount = 0
    for await (const chunk of stream) {
      text += chunk.text ?? ''
      chunkCount++
    }
    console.log('[gemini] generateProWithImage done, chunks=', chunkCount, 'output length=', text.length)
    return text
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown'
    const message = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error ? (err as NodeJS.ErrnoException).cause : undefined
    console.error('[gemini] generateProWithImage error:', { name, message, cause })
    throw err
  }
}

async function generateProWithMultipleImages(prompt: string, images: Array<{ data: string; mimeType: string }>, apiKey?: string, model = 'gemini-3.5-flash'): Promise<string> {
  const ai = getAi(apiKey)
  const imageParts = images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
  const stream = await ai.models.generateContentStream({
    model,
    contents: [{ role: 'user', parts: [...imageParts, { text: prompt }] }],
    config: { temperature: 1, maxOutputTokens: 32768, httpOptions: { timeout: 300_000 } },
  })
  let text = ''
  for await (const chunk of stream) text += chunk.text ?? ''
  return text
}

async function generateFlashWithImage(prompt: string, imageBase64: string, mimeType: string, apiKey?: string): Promise<string> {
  const ai = getAi(apiKey)
  const res = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: {
      temperature: 0.5,
      maxOutputTokens: 8192,
      httpOptions: { timeout: 90_000 },
    },
  });
  return res.text ?? '';
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

  return generateProWithImage(prompt, screenshotBase64, 'image/png', apiKey, 'gemini-3.1-pro-preview');
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

export interface QuestionnaireResponse {
  questions: Question[];
  projectSummary: string;
  heroImageDecision?: HeroImageDecision;
  domain?: AppDomain;
  recommendedPlatform?: PlatformRecommendation;
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
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'design-systems', 'ktds.md');
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    try {
      const fallbackPath = path.join(process.cwd(), 'src', 'lib', 'default-design.md');
      return fs.readFileSync(fallbackPath, 'utf-8');
    } catch {
      return '';
    }
  }
}

export interface VariantDescription {
  strategy: string;
  intent: string;
  layoutThesis: string;
}

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
  generationPlan?: AideGenerationPlan;
  domain?: AppDomain;
  criticalReview?: boolean;
  onStep?: (label: string) => void;
  prdDoc?: string;
  iaImageBase64?: string;
  iaText?: string;
  uiGenerationMode?: 'html' | 'react-tailwind';
}

export interface AideGenerationPlan {
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
  }>;
}

export interface GenerateUIResult {
  html: string;
  variantDescription?: VariantDescription;
  screenBlueprint?: string;
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

export interface TweakSpec {
  variables: TweakVariable[];
  states: TweakState[];
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
- 브리프가 통신사 멤버십/포인트/쿠폰/제휴 혜택/QR 결제 앱이다. 이 경우 단일 오브젝트가 아니라 배경 포함 3D hero scene을 우선한다.
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
- prompt는 **영어**로 작성한다.
- 통신사 멤버십/포인트/쿠폰/리워드 앱이면 단일 오브젝트가 아니라 아래 같은 앱 히어로 씬 프롬프트를 작성:
  - "full mobile app hero scene for a telecom membership service, friendly premium 3D character in an immersive reward world, membership coins, coupon tickets, gift box, partner benefit props, bright app-friendly lighting, clean upper-left safe space for HTML greeting and points, large naturally cropped character from lower center/right, no text, no logo, no UI elements inside the image"
- 그 외 단일 캐릭터/오브젝트가 맞는 경우만 Creon 3D Studio 스타일의 mascot/object prompt 작성:
  - 스타일: cute isometric 3D mascot/icon, glossy plastic, soft studio lighting, clean shape
  - 예: "a cute sandwich mascot holding a coupon", "a delivery box mascot", "a friendly credit card character"
- heroSubject는 이 서비스를 상징하는 **단일 오브젝트**를 **영어 명사구** 2~5단어로 작성:
  - 단, 통신사 멤버십/리워드 씬이면 "telecom membership reward hero scene"처럼 scene 명사구를 작성
  - 예: "a sleek smartphone", "a credit card", "a running shoe", "a delivery box", "a laptop with UI"
  - 일반 오브젝트형일 때만 isometric 3D 아이콘으로 표현 가능한 구체적 사물을 선택

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
  }
}
`;

  const text = await generatePro(prompt, apiKey, 'gemini-3.1-pro-preview');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse questionnaire JSON');

  const parsed = JSON.parse(jsonMatch[0]) as { projectSummary: string; domain: AppDomain; heroImageDecision?: HeroImageDecision; recommendedPlatform?: PlatformRecommendation };

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
      id: 'primary_journey',
      question: '핵심 사용 흐름',
      description: '사용자가 첫 화면에서 무엇을 끝내야 하는지 결정합니다.',
      type: 'single',
      options: ['목표 달성/보상 수령', '탐색/선택', '신청/구매 전환', '데이터 확인', '커뮤니티 참여', 'AI가 결정'],
    },
    {
      id: 'first_screen_focus',
      question: '첫 화면 주인공',
      description: '첫 viewport에서 가장 크게 보일 요소를 정합니다.',
      type: 'single',
      options: ['핵심 지표', '대표 CTA', '콘텐츠 카드', '브랜드 히어로', '검색/필터', 'AI가 결정'],
    },
    {
      id: 'visual_density',
      question: '정보 밀도',
      description: '여백과 카드 개수, 텍스트 양의 균형을 정합니다.',
      type: 'single',
      options: ['균형형', '프리미엄 여백형', '정보 밀도 높게'],
    },
    {
      id: 'variant_strategy',
      question: '시안 방향',
      description: 'A/B/C가 서로 얼마나 다른 방향으로 나올지 결정합니다.',
      type: 'single',
      options: ['세 방향 모두 다르게', '균형형', '정보형 강화', '전환형 강화', '탐색형 강화'],
    },
    {
      id: 'hero3d',
      question: '3D 이미지',
      description: parsed.heroImageDecision?.reason ?? '메인 히어로에서 3D 비주얼을 쓸지 결정합니다.',
      type: 'single',
      options: ['AI 판단', '사용', '사용 안 함'],
    },
  ]

  return {
    projectSummary: parsed.projectSummary,
    domain: parsed.domain,
    recommendedPlatform: parsed.recommendedPlatform,
    heroImageDecision: parsed.heroImageDecision,
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
    sectionGap: string
    cardPadding: string
    cardGap: string
    cardRadius: string
    buttonHeight: string
    inputHeight: string
    cardBorder: string
    cardShadow: string
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
    const value = match[2].trim().replace(/^["']|["']$/g, '')
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
    if (!value || value.startsWith('{') || value.startsWith('[')) continue
    result[current][key] = value
  }
  return result
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
  const typography = parseSimpleTokenMap(yaml, 'typography')
  const components = parseComponentContract(yaml)

  const cardPadding = pickComponentValue(components, ['card'], ['padding', 'paddingX', 'paddingY'])
    ?? pickSpacingToken(spacing, ['lg', 'md', 'base'], 0.58)
  const cardGap = pickComponentValue(components, ['card'], ['gap', 'rowGap', 'columnGap'])
    ?? pickSpacingToken(spacing, ['md', 'base', 'sm'], 0.42)
  const sectionGap = pickSpacingToken(spacing, ['lg', 'xl', 'section'], 0.65)
  const pagePadding = pickSpacingToken(spacing, ['lg', 'md', 'gutter', 'base'], 0.58)
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

  return {
    systemName: name,
    hasBrandColors,
    colors,
    spacing,
    rounded,
    typographyKeys: Object.keys(typography).slice(0, 16),
    components,
    layoutRhythm: {
      pagePadding,
      sectionGap,
      cardPadding,
      cardGap,
      cardRadius,
      buttonHeight,
      inputHeight,
      cardBorder,
      cardShadow,
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
  const componentLines = Object.entries(components).slice(0, 16).map(([key, value]) => {
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
    "sectionGap": ${JSON.stringify(layoutRhythm.sectionGap)},
    "cardPadding": ${JSON.stringify(layoutRhythm.cardPadding)},
    "cardGap": ${JSON.stringify(layoutRhythm.cardGap)},
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
- Do not hardcode arbitrary hex/px/radius/shadow values. If a value is needed, choose the closest token from this contract and expose it as a CSS variable.
- If the contract says a value must be derived from prose, derive it once at :root level and reuse the same variable everywhere. Do not derive different values per card/section.
- Same component type = same padding/gap/radius/action placement. Cards in the same list/grid must not have random internal spacing.
- Brand color override is ${hasBrandColors ? 'enabled, but only for primary/action/accent roles. Neutral, surface, background, border, disabled, status, spacing, radius, and typography remain from DESIGN.md.' : 'disabled. Use the selected DESIGN.md color system exactly.'}
- The final HTML should define semantic variables such as --aide-page-padding, --aide-section-gap, --aide-card-padding, --aide-card-gap, --aide-card-radius from this contract, then use them consistently.`
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
${cssVarDeclaration('--aide-card-radius', layoutRhythm.cardRadius)}
${cssVarDeclaration('--aide-button-height', layoutRhythm.buttonHeight)}
${cssVarDeclaration('--aide-input-height', layoutRhythm.inputHeight)}
${cssVarDeclaration('--aide-card-border', layoutRhythm.cardBorder)}
${cssVarDeclaration('--aide-card-shadow', layoutRhythm.cardShadow)}
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

  return `\`\`\`html
<!-- ✅ Button Primary — copy this exact pattern -->
<button class="btn-primary">레이블</button>
<style>
.btn-primary {
  height: ${btnH};
  padding: ${btnPad};
  background: var(--color-primary, ${btnBg});
  color: var(--color-on-primary, ${btnColor});
  border: none;
  border-radius: var(--rounded-md, ${btnRadius});
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>

<!-- ✅ Input Field — copy this exact pattern -->
<input class="input-default" type="text" placeholder="입력하세요" />
<style>
.input-default {
  height: ${inpH};
  padding: 0 12px;
  background: var(--color-surface, ${inpBg});
  border: ${inpBorder};
  border-radius: var(--rounded-md, ${inpRadius});
  color: var(--color-text, ${textColor});
  width: 100%;
  box-sizing: border-box;
}
</style>

<!-- ✅ Card — copy this exact pattern -->
<div class="aide-card">
  <p style="margin:0;color:var(--color-text-neutral,${textNeutral});font-size:14px;">카드 내용</p>
</div>
<style>
.aide-card {
  background: var(--color-surface, ${surfaceColor});
  padding: var(--aide-card-padding, ${cardPad});
  border-radius: var(--aide-card-radius, ${cardRadius});
  border: ${cardBorder};
  box-shadow: ${cardShadow};
  display: flex;
  flex-direction: column;
  gap: var(--aide-card-gap, ${cardGap});
}
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
  const deviceShellPatterns = [
    /\b(?:class|id)=["'][^"']*(?:phone|iphone|device|mockup|bezel|notch|home-indicator|status-bar|dynamic-island|hardware)[^"']*["']/i,
    /(?:phone|iphone|device|mockup|bezel|notch|home-indicator|status-bar|dynamic-island|hardware)[\w-]*\s*\{/i,
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
  ]
  const missingVars = requiredVars.filter(name => !css.includes(name))
  if (missingVars.length > 0) {
    issues.push(`Missing semantic rhythm variables: ${missingVars.join(', ')}.`)
  }

  const arbitraryMatches = [...css.matchAll(/(^|[;\n]\s*)(padding|margin|gap|row-gap|column-gap|border-radius|box-shadow|height|min-height|max-height)\s*:\s*([^;{}]+);/g)]
  const arbitraryValues = arbitraryMatches
    .map(match => ({ prop: match[2], value: match[3].trim() }))
    .filter(({ value }) =>
      !value.includes('var(--aide-') &&
      !value.includes('var(--spacing-') &&
      !value.includes('var(--rounded-') &&
      !/^(0|0px|auto|100%|none|inherit|unset|fit-content|initial)$/.test(value) &&
      /(px|rem|rgba?\(|#[0-9a-fA-F]{3,8})/.test(value)
    )

  if (arbitraryValues.length > 8) {
    const samples = arbitraryValues
      .slice(0, 8)
      .map(item => `${item.prop}: ${item.value}`)
      .join('; ')
    issues.push(`Too many hardcoded rhythm values instead of contract variables (${arbitraryValues.length}). Samples: ${samples}.`)
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
    issue.includes('Responsive layout contract')
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
const AIDE_LOGO_STYLE = 'height:40px;max-height:40px;max-width:140px;width:auto;object-fit:contain;display:block;flex-shrink:0;'

function buildLogoGuardStyle(): string {
  return `<style data-aide-logo-guard="1">
.aide-brand-logo {
  height: 40px !important;
  max-height: 40px !important;
  max-width: 140px !important;
  min-width: 32px !important;
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
  const headerPattern = /(<(?:header|nav)\b[^>]*>|<div\b[^>]*class=(["'])[^"']*(?:app-bar|appbar|gnb|header|top-bar|top-nav|nav-bar|toolbar|app-header|page-header|mobile-header|screen-header)[^"']*\2[^>]*>)/i
  if (headerPattern.test(html)) return html.replace(headerPattern, (match) => match + logoImg)
  if (/<body\b[^>]*>/i.test(html)) return html.replace(/(<body\b[^>]*>)/i, (match) => match + logoImg)
  return logoImg + html
}

function replaceLogoSlots(html: string, logoDataUrl: string): { html: string; used: boolean } {
  const logoImg = buildLogoImg(logoDataUrl)
  let used = false
  let next = html.replace(/<(div|span)\b(?=[^>]*class=(["'])[^"']*\baide-logo-slot\b[^"']*\2)[^>]*>[\s\S]*?<\/\1>/gi, () => {
    if (used) return ''
    used = true
    return logoImg
  })
  next = next.replace(/<(div|span)\b(?=[^>]*class=(["'])[^"']*\baide-logo-slot\b[^"']*\2)[^>]*\/>/gi, () => {
    if (used) return ''
    used = true
    return logoImg
  })
  next = next.replace(/<img\b(?=[^>]*class=(["'])[^"']*\baide-logo-slot\b[^"']*\1)[^>]*>/gi, () => {
    if (used) return ''
    used = true
    return logoImg
  })
  return { html: next, used }
}

function applyLogoDataUrlOnce(html: string, logoDataUrl?: string | null): string {
  if (!logoDataUrl) return html

  let normalized = html.split(logoDataUrl).join('__LOGO_DATA_URL__')
  const slotResult = replaceLogoSlots(normalized, logoDataUrl)
  normalized = slotResult.html
  let used = false
  if (slotResult.used) used = true
  normalized = normalized.replace(/<img\b[^>]*src=(["'])__LOGO_DATA_URL__\1[^>]*>/gi, (tag) => {
    if (used) return ''
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

function stripHeaderTextBrandWhenLogoExists(html: string, brief: string, logoDataUrl?: string | null): string {
  if (!logoDataUrl || !/aide-brand-logo/.test(html)) return html
  const serviceName = extractServiceNameFromBrief(brief)
  const candidates = Array.from(new Set([
    serviceName,
    'Aide',
    'KT 멤버십',
    '케이티 멤버십',
  ].filter((value): value is string => Boolean(value && value.trim()))))
  if (candidates.length === 0) return html

  const escaped = candidates
    .map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'))
    .join('|')
  const textBrandTag = new RegExp(
    `<(span|strong|b|em|p|h1|h2|h3|div)\\b(?=[^>]*(?:class=(["'])[^"']*(?:brand|app-name|service-name|title|logo-text|text-brand)[^"']*\\2|style=(["'])[^"']*(?:font-weight|font-size)[^"']*\\3))[^>]*>\\s*(?:${escaped})\\s*<\\/\\1>`,
    'gi'
  )
  const looseHeaderBrandTag = new RegExp(
    `<(span|strong|b|em|p|h1|h2|h3)\\b[^>]*>\\s*(?:${escaped})\\s*<\\/\\1>`,
    'gi'
  )

  return html.replace(
    /(<(?:header|nav)\b[^>]*>|<div\b[^>]*class=(["'])[^"']*(?:app-bar|appbar|gnb|header|top-bar|top-nav|nav-bar|toolbar|app-header|page-header|mobile-header|screen-header)[^"']*\2[^>]*>)([\s\S]*?)(<\/(?:header|nav|div)>)/gi,
    (match, open, _q, inner, close) => {
      if (!/aide-brand-logo/.test(inner)) return match
      let nextInner = inner.replace(textBrandTag, '')
      const logoIdx = nextInner.search(/<img\b[^>]*\baide-brand-logo\b[^>]*>/i)
      if (logoIdx !== -1) {
        const beforeLogo = nextInner.slice(0, logoIdx)
        const fromLogo = nextInner.slice(logoIdx)
        nextInner = beforeLogo + fromLogo.replace(looseHeaderBrandTag, '')
      }
      nextInner = nextInner
        .replace(/(<img\b[^>]*\baide-brand-logo\b[^>]*>)\s*(?:[|·•-]\s*)?(?:KT\s*멤버십|케이티\s*멤버십|Aide)(?=\s*<)/i, '$1')
        .replace(/\s{2,}/g, ' ')
      return `${open}${nextInner}${close}`
    }
  )
}

function ensureVisibleLogoInHeader(html: string, logoDataUrl?: string | null): string {
  if (!logoDataUrl) return html
  if (/<(?:header|nav)\b[\s\S]{0,1600}<img\b[^>]*\baide-brand-logo\b/i.test(html)) return html
  const logoImg = buildLogoImg(logoDataUrl)
  const brandWrapPattern = /(<div\b[^>]*class=(["'])[^"']*\bbrand-wrap\b[^"']*\2[^>]*>)([\s\S]*?)(<\/div>)/i
  if (brandWrapPattern.test(html)) {
    return html.replace(brandWrapPattern, (_match, open, _q, inner, close) => `${open}${logoImg}${close}`)
  }
  const headerPattern = /(<header\b[^>]*class=(["'])[^"']*\bapp-header\b[^"']*\2[^>]*>)/i
  if (headerPattern.test(html)) return html.replace(headerPattern, `$1<div class="brand-wrap">${logoImg}</div>`)
  return injectLogoIntoChrome(html, logoDataUrl)
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

export async function resolveImagePlaceholders(
  html: string,
  options: {
    heroImagePrompt?: string;
    heroImageData?: { base64: string; mimeType: string } | null;
    apiKey?: string;
    unsplashKey?: string;
    imageWarnings?: string[];
    paletteHint?: string;
  } = {}
): Promise<string> {
  const { heroImagePrompt, heroImageData, apiKey, unsplashKey, imageWarnings, paletteHint } = options
  let result = html
  const transparentGif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

  const sharedHeroMatches = [...result.matchAll(/%%(SHARED_HERO_3D_SCENE|SHARED_HERO_3D)(?::([^%]+))?%%/g)]
  if (sharedHeroMatches.length > 0) {
    const role = sharedHeroMatches[0][1]
    const detail = sharedHeroMatches[0][2]?.trim()
    const sharedSubject = [heroImagePrompt, detail].filter(Boolean).join('\n') || 'a premium app hero object'
    const mode: HeroImageMode = role === 'SHARED_HERO_3D_SCENE' ? 'scene' : inferSharedHeroMode(sharedSubject)
    const generated = await getSharedHeroImage(sharedSubject, apiKey, paletteHint, mode)
    const sharedSrc = generated ? `data:${generated.mimeType};base64,${generated.base64}` : transparentGif
    if (!generated) imageWarnings?.push(`${role} 이미지 생성 실패: 투명 이미지로 대체됨`)
    for (const match of sharedHeroMatches) {
      result = result.split(match[0]).join(sharedSrc)
    }
  }

  const roleMatches = [...result.matchAll(/%%(HERO_SCENE_3D|MASCOT_3D|REWARD_OBJECT_3D)(?::([^%]+))?%%/g)]
  if (roleMatches.length > 0) {
    const generatedByRole = new Map<string, string>()
    for (const match of roleMatches) {
      const full = match[0]
      if (generatedByRole.has(full)) continue
      const role = match[1] as HeroImageRole
      const detail = match[2]?.trim()
      const roleSubject = buildHeroRoleSubject(role, heroImagePrompt, detail)
      const mode = role === 'HERO_SCENE_3D' ? 'scene' : 'transparent'
      const generated = heroImagePrompt || detail
        ? await generateHeroImage(roleSubject, apiKey, '#ffffff', mode, paletteHint)
        : null
      generatedByRole.set(
        full,
        generated ? `data:${generated.mimeType};base64,${generated.base64}` : transparentGif,
      )
      if (!generated) {
        imageWarnings?.push(`${role} 이미지 생성 실패: 투명 이미지로 대체됨`)
      }
    }
    for (const [placeholder, src] of generatedByRole) {
      result = result.split(placeholder).join(src)
    }
  }

  const heroMatches = [...result.matchAll(/%%HERO_3D_IMAGE(?::([^%]+))?%%/g)]
  if (heroMatches.length > 0) {
    const background = heroMatches[0][1]?.trim() || '#ffffff'
    let heroImg = heroImageData ?? null
    if (!heroImg && heroImagePrompt) {
      heroImg = await generateHeroImage(heroImagePrompt, apiKey, background, 'auto', paletteHint)
    }
    const heroSrc = heroImg
      ? `data:${heroImg.mimeType};base64,${heroImg.base64}`
      : transparentGif
    if (!heroImg) {
      imageWarnings?.push('HERO_3D_IMAGE 생성 실패: 투명 이미지로 대체됨')
    }
    for (const match of heroMatches) {
      result = result.split(match[0]).join(heroSrc)
    }
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

type HeroImageRole = 'HERO_SCENE_3D' | 'MASCOT_3D' | 'REWARD_OBJECT_3D'
type HeroImageMode = 'auto' | 'scene' | 'transparent'

function buildHeroRoleSubject(
  role: HeroImageRole,
  baseSubject?: string,
  detail?: string,
): string {
  const subject = [baseSubject, detail].filter(Boolean).join('\n')
  if (role === 'HERO_SCENE_3D') {
    return `${subject || 'a premium character-led mobile app hero scene'}

Role: immersive 3D hero scene.
Create a complete app hero visual where the character, background, props, lighting, and mood are designed together. The image may include a stylized environment/background and should be usable as a hero card or onboarding panel background. Leave visual safe space for UI text and CTA. Do not make a tiny isolated icon.`
  }
  if (role === 'MASCOT_3D') {
    return `${subject || 'a friendly companion mascot'}

Role: standalone 3D mascot asset.
Create one expressive mascot/character for use inside an existing UI layout. Keep the character visually complete and readable at small size. Do not include any baked-in ground shadow, cast shadow, drop shadow, floor reflection, or gray base. Use a clean white studio background suitable for transparent-background extraction; the UI layer will add any needed grounding separately.`
  }
  return `${subject || 'a reward item'}

Role: standalone 3D reward/object asset.
Create one premium reward object, item, badge, coin, gem, product, or prop that supports the service moment. Keep it simple, readable, and suitable for transparent-background extraction. Do not include any baked-in ground shadow, cast shadow, drop shadow, floor reflection, or gray base; the UI layer will add any needed grounding separately.`
}

async function removeHeroImageBackground(
  base64: string,
  mimeType = 'image/png',
): Promise<{ base64: string; mimeType: string }> {
  const original = { base64, mimeType }
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
    return removeWhiteStudioBackground(original.base64, original.mimeType)
  }
}

async function removeWhiteStudioBackground(
  base64: string,
  _mimeType = 'image/png',
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
    return min >= 220 && max - min <= 34
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

function shouldPreserveHeroScene(subject: string): boolean {
  return /scene|world|landscape|environment|background|full[-\s]?bleed|immersive|membership|benefit|coupon|point|vip|telecom|nintendo|duolingo|pokemon|pokémon|finch|game|reward|growth|companion|mascot|character|캐릭터|마스코트|성장|리워드|게임|꾸미기|아이템|만보기|펫|동료|멤버십|포인트|쿠폰|혜택|제휴|통신/i.test(subject)
}

function isMembershipRewardExperience(brief: string, domain?: AppDomain): boolean {
  const normalized = brief.toLowerCase()
  const hasMembership = /멤버십|membership|포인트|point|쿠폰|coupon|리워드|reward|혜택|benefit|vip|등급|제휴|partner|qr|바코드|barcode/.test(normalized)
  const hasTelecom = /통신|telecom|kt|통신사|모바일 요금|회선/.test(normalized)
  const isB2B = /b2b|기업 고객|회선 현황|청구서|권한 관리|관리 포털|대시보드/.test(normalized)
  return hasMembership && !isB2B && (hasTelecom || domain === 'commerce' || domain === 'entertainment' || domain === 'other')
}

function buildMembershipHeroSceneSubject(brief: string): string {
  const brandHint = /kt/i.test(brief) || /통신/.test(brief) ? 'telecom membership' : 'membership rewards'
  return `full mobile app hero scene for a ${brandHint} service: friendly premium 3D character in an immersive reward world with membership coins, coupon tickets, gift box, partner benefit props, bright app-friendly lighting, clean upper-left safe space for HTML greeting and points, large naturally cropped character from lower center/right, curved white content sheet can overlap the lower scene edge, no text, no logo, no UI elements inside the image`
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
): Promise<{ base64: string; mimeType: string } | null> {
  const key = `${mode}::${subject.trim().toLowerCase()}::${paletteHint ?? ''}`.slice(0, 500)
  const cached = sharedHeroImageCache.get(key)
  if (cached) return cached
  const promise = generateHeroImage(subject, apiKey, '#ffffff', mode, paletteHint)
  sharedHeroImageCache.set(key, promise)
  return promise
}

function inferSharedHeroMode(subject: string): HeroImageMode {
  return shouldPreserveHeroScene(subject) ? 'scene' : 'transparent'
}

function buildCreon3DPrompt(subject: string, mode: HeroImageMode = 'auto', paletteHint?: string): string {
  const isTransparentAsset = mode === 'transparent'
  const isMembershipScene = /membership|telecom|reward|coupon|point|vip|benefit|멤버십|통신|포인트|쿠폰|리워드|혜택|제휴/i.test(subject) && !isTransparentAsset
  const prompt = {
    task: "generate a premium 3D mobile app hero visual designed to integrate into a real UI card",
    subject: subject || 'a friendly robot',
    style_lock: false,
    output: { format: "png", size: "1536x672" },
    negative_prompt: isTransparentAsset
      ? "text, letters, numbers, watermark, logo, UI screenshot, app interface, fake app card, UI button, blue button, search icon, notification icon, navigation bar, typography, label, baked-in shadow, ground shadow, cast shadow, drop shadow, contact shadow, floor reflection, gray base, pedestal shadow, harsh outlines, gritty realism, horror, uncanny face, distorted limbs, low-res, aliasing, muddy colors, noisy texture, cluttered composition, cropped face, broken anatomy"
      : "text, letters, numbers, watermark, logo, UI screenshot, app interface, fake app card, UI button, blue button, search icon, notification icon, navigation bar, typography, label, harsh outlines, gritty realism, horror, uncanny face, distorted limbs, low-res, aliasing, muddy colors, noisy texture, cluttered composition, cropped face, broken anatomy",
    brand_tone: "cute, playful, premium, emotionally engaging, polished consumer app",
    creative_direction: {
      priority: "Make the visual feel like a high-end app hero/card component asset, not a generic icon or floating sticker.",
      references: "Nintendo charm, Duolingo friendliness, Pokemon Sleep softness, Finch companion-app warmth, Apple Design Award polish.",
      freedom: "Adapt colors, character species, outfit, props, pose, scene depth, background, lighting, and mood to the service brief. Do not force the default blue/white Creon palette unless it fits the concept."
    },
    background: {
      type: isTransparentAsset ? "clean studio white for later transparent extraction" : "adaptive",
      alpha: isTransparentAsset ? "not required; background will be removed after generation" : "optional",
      note: isTransparentAsset
        ? "The final asset must be easy to isolate from the background: one clear subject, no background props touching the canvas edges, clean white/near-white studio background. Do not include baked-in ground shadow, cast shadow, drop shadow, floor reflection, gray base, or contact shadow. Design it as a clean cutout that will sit on a rounded UI card surface beside text, KPI, and CTA; the HTML/CSS layer will add any needed grounding separately."
        : "If the brief benefits from an immersive hero scene, include a soft 3D environment/background and keep it beautiful. Do not draw any UI, text, buttons, logos, app bars, search icons, notification icons, labels, or screenshot-like interface inside the image. Leave natural clean negative space only; the HTML layer will add all text and CTA separately."
    },
    render: {
      quality: "ultra-high",
      resolution: 1536,
      separation: "by color, lighting, atmospheric depth, and layered composition"
    },
    colors: {
      palette: paletteHint
        ? `Harmonize with the app's design palette (${paletteHint}). Use this as a mood guide — adapt character, props, and background to feel native to this color world. Pastel gradients, warm sunlight, fresh greens, soft purples, aqua blues are allowed when they align with the palette.`
        : "choose a joyful, app-ready palette from the brief. Pastel gradients, warm sunlight, fresh greens, soft purples, aqua blues, peach, cream, and reward gold are allowed when appropriate.",
      constraints: "avoid muddy colors. Preserve natural colors for animals, health, reward items, plants, food, coins, gems, and outfits."
    },
    materials: {
      character: "soft plush-like 3D, clay-toy finish, rounded forms, expressive face, premium toy-render quality",
      props: "soft plastic, fabric-like simplified clothing, coins/gems/items with gentle specular highlights",
      environment: "stylized miniature 3D world if useful: grass, path, clouds, trees, reward podium, cozy room, sleep/wellness scenery"
    },
    lighting: {
      mode: "soft cinematic studio or gentle outdoor app-hero lighting",
      source: "top-front, golden hour, or soft gradient lighting chosen to match the brief",
      highlights: "clean premium highlights on eyes, cheeks, rounded body, coins, gems, and props",
      shadows: isTransparentAsset
        ? "ambient occlusion on the object only; no ground shadow, cast shadow, contact shadow, drop shadow, or floor reflection"
        : "natural soft scene shadows and ambient occlusion; subtle glow is allowed when it improves delight"
    },
    form: {
      shapes: "rounded, soft, huggable, playful, cute companion proportions",
      edges: "smooth, no black outlines, no hard beveled UI-icon look",
      expression: "emotionally clear: happy, encouraging, proud, sleepy, excited, or supportive depending on the service moment"
    },
    composition: {
      elements: isMembershipScene
        ? "one large friendly membership character as the star, plus meaningful telecom membership props such as coins, coupon tickets, gift box, VIP reward bundle, partner benefit objects, and a soft lifestyle environment. Do not draw any text, logos, UI, QR codes, barcodes, buttons, app bars, or labels."
        : "one hero mascot/character as the star, plus only meaningful props from the service such as steps, coins, gems, reward chest, outfit item, path, badge, goal ring, or growth stage.",
      depth: "clear foreground character, midground props, soft background depth if using a scene",
      density: "hero-worthy but not cluttered; leave natural clean negative space for HTML overlay if needed, but never draw UI copy, labels, CTA buttons, or app chrome inside the image",
      framing: isMembershipScene
        ? "Create a strong mobile app top-hero crop. Leave clean safe space in the upper-left for HTML greeting and points. Place the character large from the lower center/right, naturally cropped by the lower edge so a white content sheet can overlap later. Never make a tiny centered sticker."
        : "Create a strong app hero crop. Full body is allowed when growth/companion identity matters; partial crop is allowed when it creates stronger impact. Never crop the face awkwardly.",
      scale: isMembershipScene
        ? "The character and reward props must fill the hero scene with real presence, like a flagship membership app home hero, not like a small icon in a pale rectangle."
        : "The character/object should feel large enough to carry the hero, not like a tiny icon.",
      ui_integration: isTransparentAsset
        ? "The asset should have a natural bottom anchor and readable silhouette, but no baked-in shadow. Avoid centered empty whitespace around the object. Do not include fake UI elements inside the rendered image."
        : isMembershipScene
          ? "The scene is intended to sit behind HTML UI in the top 45-55% of a mobile screen. Upper-left must remain clean enough for text overlay; lower edge should support a curved white content sheet overlap. Do not include fake UI elements inside the rendered image."
          : "The scene should have a natural visual anchor, readable silhouette, and integrated lighting so it can sit inside a rounded UI visual stage. Do not include fake UI elements inside the rendered image."
    },
    camera: {
      type: "adaptive 3D camera",
      options: "front 3/4, slight low angle, isometric, or cozy diorama view depending on the scene",
      avoid: "flat icon-only camera unless the brief explicitly asks for an icon"
    },
    canvas: {
      ratio: "16:7",
      safe_margins: true,
      hero_usage: "Designed to sit inside a mobile app hero card or full-bleed onboarding panel."
    }
  }
  return JSON.stringify(prompt, null, 2)
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
      // skip missing ref
    }
  }
  return parts
}

export async function generateHeroImage(
  subject: string,
  apiKey?: string,
  _backgroundColor = '#ffffff',
  mode: HeroImageMode = 'auto',
  paletteHint?: string,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const ai = getAi(apiKey)
    const prompt = buildCreon3DPrompt(subject, mode, paletteHint)
    const refImages = loadCreonRefImages()
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: prompt },
      ...refImages,
    ]
    const imageModels = ['gemini-2.5-flash-image', 'gemini-3-pro-image', 'gemini-3.1-pro-image', 'gemini-3.1-flash-image']
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
        if (mode === 'scene' || (mode === 'auto' && shouldPreserveHeroScene(subject))) {
          console.log('[gemini] 3D hero scene generated, preserving background for stronger hero impact')
          return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' }
        }
        try {
          const transparent = await removeHeroImageBackground(
            part.inlineData.data,
            part.inlineData.mimeType || 'image/png',
          )
          console.log('[gemini] 3D image generated with no-baked-shadow prompt and transparent background')
          return transparent
        } catch (removeErr) {
          const message = removeErr instanceof Error ? removeErr.message : String(removeErr)
          console.error('[gemini] background removal failed, using original 3D image:', message)
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

  const text = await generatePro(prompt, apiKey, 'gemini-3.1-pro-preview')
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
   - 동일한 기획서라도 ktds.md를 선택하면 KTDS처럼, notion.md를 선택하면 Notion처럼, uber.md를 선택하면 Uber처럼 보여야 한다.

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
   - emoji를 아이콘이나 라벨로 사용하지 않는다. 아이콘은 DESIGN.md의 아이콘 규칙을 따른다. KTDS 디자인 시스템이면 KTDS Icon name(search, homeFill, chevron 등)과 KTDS icon color/size 토큰을 기준으로 표현한다.
   - "star", "home", "BEST"만 덩그러니 보이는 placeholder성 문구 금지. 필요한 경우 "별점", "홈", "추천"처럼 자연스러운 한국어 UI 라벨을 사용한다.
   - 음식/배달/커머스/여행 등 이미지가 중요한 도메인은 무관한 랜덤 이미지 금지. 반드시 브리프와 직접 관련된 placeholder 설명을 작성한다.
   - 하단 내비게이션, floating CTA, 장바구니 버튼은 콘텐츠를 가리지 않도록 main content padding-bottom을 충분히 확보한다.

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
   - DESIGN.md가 아이콘 시스템을 정의하면 그 규칙을 최우선으로 따르십시오. KTDS의 경우 "KTDS Icon"으로 표현하고, ktds.md의 주요 icon name 목록을 사용하십시오.
   - 독립 실행 HTML에서 실제 패키지 import가 불가능할 때는 KTDS Icon을 inline SVG 또는 CSS mask 형태로 구현하되, 색상은 var(--color-icon) / var(--color-primary-icon) 등 KTDS 토큰을 사용하십시오.
   - Material Symbols, emoji, 외부 아이콘 세트는 DESIGN.md가 명시하지 않은 경우 기본값으로 사용하지 마십시오.

6. **이미지 및 비주얼 처리 규칙**
   - 3D 이미지는 **메인 히어로 섹션에서 최대 1회만** 사용하십시오. 반복 카드, 추천 카드, 리스트 썸네일, 상세 이미지에는 3D 이미지 사용 금지.
   - 3D 이미지는 절대 빈 영역에 떠 있는 장식으로 두지 마십시오. 반드시 카드/히어로 surface 안에서 텍스트, KPI, CTA, 진행률, 보상 등과 관계를 맺어야 합니다.
   - transparent 3D는 독립 이미지 박스가 아니라 같은 reward/point/hero card 안에서 KPI·CTA·badge와 함께 배치하십시오. 이미지 위아래가 비어 있고 텍스트가 아래 별도 카드로 분리되면 실패입니다.
   - transparent 3D는 이미지 컨테이너, CSS 기반 grounding(::after/stage background) 또는 anchored alignment가 있어야 합니다. 이미지 파일 자체의 baked-in shadow는 금지입니다. 좌우 빈 공간에 작은 스티커처럼 놓이면 실패입니다.
   - 멤버십/포인트/쿠폰/리워드 서비스의 3D는 "혜택 오브젝트가 포인트 카드와 연결된 상태"여야 합니다. 예: 포인트 숫자 옆에 일부 크롭된 리워드 박스, 쿠폰 카드 뒤에서 올라오는 코인, CTA 주변의 reward bundle. 별도의 pale image rectangle에 중앙 정렬된 오브젝트는 실패입니다.
   - 히어로 외 대형 이미지와 콘텐츠 썸네일은 Unsplash 기반 플레이스홀더를 사용합니다.
   - 화면에서 눈에 띄는 대형 실사 이미지는 플레이스홀더 형식(%%IMG_1:영문 설명%%, %%IMG_2:영문 설명%%, %%IMG_3:영문 설명%%)을 사용하십시오. 영문 설명은 실제 사진 검색에 적합한 범용 상황/사물 키워드로 작성하십시오.
   - 소형 프로필이나 반복 카드 내 썸네일 등은 %%THUMB:keyword:width:height%% 형식의 플레이스홀더를 사용하십시오. keyword는 이미지 내용을 설명하는 범용 영문 명사구(예: fresh sandwich, veterinary clinic, pet care, finance dashboard), width/height는 픽셀 정수입니다. 카드마다 keyword를 다르게 지정해 이미지가 겹치지 않게 하십시오.
   - keyword에는 브랜드명, 서비스명, 지점명, 캐릭터명, 주소, UI 문구를 넣지 마십시오. 예: "스마일동물병원" X → "veterinary clinic pet care" O, "샌디 시그니처 클럽" X → "fresh sandwich lunch" O.
   - keyword는 반드시 브리프와 직접 관련된 명사를 사용한다. 음식 배달이면 sandwich, salad, coffee, avocado처럼 음식 키워드만 사용하고 landscape, laptop, mountain, ocean 같은 무관한 키워드 금지.
   - 시안 A/B/C의 비주얼 전략은 AI가 서비스 성격에 맞게 자유롭게 판단하되, 세 시안이 모두 같은 3D 히어로 구조로 반복되면 안 됩니다. 3D가 가장 설득력 있는 시안에는 3D를 쓰고, 현실감/신뢰감/식욕/장소성이 더 중요한 시안에는 Unsplash 실사 히어로를 적극 검토하십시오.
   - 단, "최소 1개는 반드시 실사"처럼 기계적으로 강제하지 마십시오. 브리프, 도메인, 사용자가 요청한 캐릭터 중요도에 따라 자연스럽게 선택하십시오.
   - ⛔ **[CRITICAL] 플레이스홀더는 반드시 img src 속성값에만 사용** — %%SHARED_HERO_3D%%·%%SHARED_HERO_3D_SCENE%%·%%SHARED_IMG:keyword:width:height%%·%%HERO_SCENE_3D%%·%%MASCOT_3D%%·%%REWARD_OBJECT_3D%%·%%HERO_3D_IMAGE%%·%%IMG_1%%·%%THUMB%%·%%THUMB:...%% 등 모든 플레이스홀더 문자열은 반드시 <img src="%%...%%"> 형태로만 사용하십시오. 텍스트 노드(<p>, <span>, <div> 등의 내용), alt, href, 주석, 또는 다른 어떤 위치에도 절대 삽입 금지. 이미지가 없는 영역에 "이미지 URL"이나 플레이스홀더 문자열이 보이는 것은 심각한 오류입니다.
   ${heroImagePrompt ? `
   ⚠️ **3D 히어로 이미지 규칙 (CRITICAL)**
   - 3D 플레이스홀더는 아래 3가지 역할 중 하나를 선택하십시오. 한 화면에서 3D는 **메인 히어로 1회만** 사용합니다.
     * %%HERO_SCENE_3D%%: 캐릭터·게임·성장·리워드·감성 앱처럼 3D 배경/월드/캐릭터가 함께 녹아야 할 때 사용. 배경을 보존하므로 히어로 카드/온보딩 패널의 visual background로 크게 배치합니다.
     * %%MASCOT_3D%%: UI 위에 얹는 투명 마스코트/캐릭터가 필요할 때 사용. 배경 제거된 PNG로 치환되므로 카드 오른쪽, KPI 옆, 성장 스테이지 위에 자연스럽게 배치합니다.
     * %%REWARD_OBJECT_3D%%: 코인, 보상 상자, 상품, 아이템처럼 작은 오브젝트가 필요할 때 사용. 배경 제거된 PNG로 치환됩니다.
   - 기존 %%HERO_3D_IMAGE%%도 동작하지만, 새 시안에서는 역할이 명확한 %%HERO_SCENE_3D%% / %%MASCOT_3D%% / %%REWARD_OBJECT_3D%%를 우선 사용하십시오.
   - 플레이스홀더는 반드시 <img src="%%HERO_SCENE_3D%%"> 또는 <img src="%%MASCOT_3D%%"> 또는 <img src="%%REWARD_OBJECT_3D%%"> 형태로 사용하십시오.
   - 3D 이미지는 Creon의 고품질 3D 렌더 스타일을 기반으로 하되, 더 이상 단순 아이콘/단일 오브젝트에 고정하지 않습니다. 브리프가 캐릭터·게임·성장·리워드·감성 앱이면 히어로 씬/마스코트 월드처럼 풍부하게 생성될 수 있습니다.
   - 히어로 섹션 배경은 DESIGN.md 토큰으로 구성하되, %%HERO_SCENE_3D%%처럼 이미지가 이미 배경을 포함한 hero scene이면 흰/파란 카드 위 작은 장식처럼 얹지 말고 이미지 자체가 히어로의 주인공이 되게 배치하십시오.
   - 투명 3D 오브젝트 이미지 자체에는 ground shadow/drop shadow/contact shadow가 포함되면 안 됩니다. 접지감이 필요하면 HTML/CSS stage의 ::after, radial-gradient, surface background로만 처리하십시오.
   - 캐릭터/마스코트/제품이 브리프에 포함된 경우 3D 이미지는 장식 아이콘이 아니라 히어로의 핵심 비주얼입니다. 모바일 390px 기준 시각 너비가 최소 160px 이상, 권장 220~340px 수준이 되게 배치하십시오.
   - 3D 이미지의 크기와 크롭 방식은 AI가 히어로의 목적에 맞게 판단하되, 작은 플로팅 아이콘처럼 보이면 실패입니다. 캐릭터 요청이 있으면 감성 온보딩/게임 대시보드처럼 큰 비주얼 중심 패턴을 우선 사용하십시오.
   - 단, 어떤 방식이든 CTA와 핵심 문구를 가리면 실패입니다. 이미지 컨테이너에는 overflow:hidden을 사용해 가로 스크롤을 절대 만들지 마십시오.
   - **히어로 이미지 배치 패턴 — 도메인과 시안 방향에 맞게 하나를 선택하십시오:**

     패턴 A. **전체 보임 (contain)** — B2B, 대시보드, 앱/서비스 소개, 아이콘 쇼케이스처럼 오브젝트 전체를 안정적으로 보여줘야 할 때
     <section class="hero-with-image">
       <div><!-- 헤드라인·서브카피·CTA --></div>
       <img src="%%MASCOT_3D%%" alt="hero" style="width:clamp(160px,46%,260px);height:auto;max-height:320px;object-fit:contain;" />
     </section>

     패턴 B. **크게 확대/일부 크롭 (oversized crop)** — 음식/배달/커머스/라이프스타일처럼 오브젝트가 식욕, 제품감, 감성 임팩트를 만들어야 할 때. 투명 PNG를 크게 키우고 컨테이너에서 자연스럽게 잘라냅니다.
     <section class="hero-with-image" style="overflow:hidden;position:relative;">
       <div><!-- 헤드라인·서브카피·CTA --></div>
       <img src="%%REWARD_OBJECT_3D%%" alt="hero" style="width:120%;height:auto;max-height:360px;object-fit:contain;transform:translateX(6%) scale(1.18);transform-origin:center bottom;" />
     </section>

     패턴 C. **몰입형 캐릭터 씬 (immersive character scene)** — 게임/리워드/성장/헬스케어 companion 앱처럼 캐릭터와 배경이 앱의 감정을 이끌 때. 이미지를 카드 또는 온보딩 패널의 visual background처럼 크게 사용합니다.
     <section class="hero-scene-card">
       <div class="aide-visual-stage hero-scene-visual" style="position:relative;overflow:hidden;min-height:260px;border-radius:var(--rounded-xl);">
         <img class="aide-hero-3d aide-hero-scene-img" src="%%HERO_SCENE_3D%%" alt="hero" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />
       </div>
       <div class="hero-action-panel"><!-- 헤드라인·핵심 숫자·CTA. 이미지 위에 큰 텍스트/버튼을 올리지 않는다. --></div>
     </section>

     패턴 D. **anchored companion object (small but integrated)** — 정보가 많거나 CTA/검색/쿠폰이 주인공이어야 할 때. 3D는 독립 장식이 아니라 같은 카드 surface 안에서 KPI/CTA/badge와 겹치지 않게 연결된 보조 오브젝트로 배치합니다.
     <section class="hero-with-image" style="position:relative;overflow:hidden;">
       <div><!-- 헤드라인·서브카피·CTA --></div>
       <img src="%%MASCOT_3D%%" alt="hero" style="position:absolute;right:var(--spacing-base);bottom:var(--spacing-base);width:38%;min-width:128px;max-width:210px;height:auto;object-fit:contain;" />
     </section>

   - 선택 기준: A=신뢰/정돈, B=제품/오브젝트 임팩트, C=캐릭터/게임/성장/감성 몰입, D=정보/CTA 우선. 이 A/B/C/D는 이미지 배치 패턴 이름이며 시안 A/B/C와 다릅니다. 캐릭터/마스코트가 핵심인 브리프는 패턴 C 또는 큰 패턴 A를 우선 검토하고, 작은 D 패턴은 정보가 명확히 주인공일 때만 선택하십시오.
   - Pattern D를 쓰더라도 image-only wrapper 금지. 텍스트/KPI/CTA가 같은 section/card 내부에 있어야 하고, 3D stage 면적의 대부분이 빈 배경이면 실패입니다.
   - 3D 플레이스홀더를 절대 다른 URL이나 %%IMG%%로 교체하지 마십시오.
   - %%HERO_SCENE_3D%%를 사용할 때는 같은 히어로 안에 실사 이미지나 다른 3D 이미지를 겹쳐 넣지 마십시오. 배경-캐릭터-UI가 하나의 장면처럼 보이게 해야 합니다.
   - %%HERO_SCENE_3D%% 이미지 자체에는 텍스트/버튼/로고/앱바가 없어야 합니다. HTML에서 별도의 action panel을 이미지 아래 또는 옆에 배치하세요.
   - %%HERO_SCENE_3D%%를 사용할 때 CTA 버튼은 캐릭터나 주요 오브젝트 위에 올리지 말고, scene 바로 아래 action panel에 둡니다. 모바일에서는 이미지 위에 큰 헤드라인을 겹치지 마세요.
   - scene 위에 overlay를 써야 한다면 작은 badge/label 1개만 허용하고, 어두운 gradient/scrim으로 카드 절반 이상을 덮지 마세요. 텍스트가 잘리거나 카드 밖으로 넘어가면 실패입니다.
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
   - [ ] DESIGN.md가 정의한 카드 gap, container padding, navigation 패턴을 우선했는가?`;
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

function buildDesignDirectionSelectorLayer(heroImagePrompt?: string, variantStyle?: string, domain?: AppDomain): string {
  const variant = getVariantLabel(variantStyle)
  const has3dIntent = Boolean(heroImagePrompt)
  const domainHint = domain ? `\n도메인 힌트: ${domain}` : ''

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

### 이번 시안의 차별화 의무
- 현재 시안: ${variant}
- A/B/C는 서로 다른 전략이어야 합니다. 같은 header + hero + CTA + 2 card + mission list 골격을 반복하면 실패입니다.
- 같은 시각 재료를 쓰더라도 hero 구조, CTA 위치, 카드 밀도, 이미지 역할, bottom navigation 위 콘텐츠 흐름은 달라야 합니다.
- 시안 A는 보통 정보 구조/실사용성을 강하게, 시안 B는 전환/비주얼 임팩트를 강하게, 시안 C는 탐색/브랜드/보상 경험을 강하게 가져가되, 이것을 고정 템플릿처럼 반복하지 마십시오.
- 브리프가 3D, 캐릭터, 마스코트, 게임, 리워드를 강하게 요구하면 세 시안 중 적어도 하나는 Immersive Hero Scene 또는 Mascot Companion을 자연스럽게 고려합니다. 단, 모든 시안을 3D로 도배하지 않습니다.
- 3D가 어울리지 않는 전략에서는 Unsplash 실사 이미지 또는 데이터 중심 HTML/CSS 조형을 선택합니다.

### ${has3dIntent ? '3D 요청이 있는 브리프에서의' : '이미지/비주얼이 필요한 브리프에서의'} 선택 기준
- 3D 캐릭터가 작고 얹힌 스티커처럼 보이면 실패입니다.
- 실사 이미지가 더 설득력 있는 도메인(음식, 여행, 공간, 제품, 사람 활동)은 %%IMG_n:keyword%% 또는 %%THUMB:keyword:width:height%%를 사용합니다.
- UI 자체가 핵심인 도메인(대시보드, 생산성, 핀테크)은 이미지를 줄이고 정보 계층, 차트, 상태 카드, CTA 흐름으로 완성도를 만듭니다.
- 어떤 전략을 선택하든 실제 서비스 홈 화면이어야 합니다. 포스터처럼 예쁜 상단만 만들고 아래가 비면 실패입니다.`
}

function buildMediaLayoutSafetyLayer(heroImagePrompt?: string): string {
  return `## Media Layout Safety Contract — 이미지/3D와 UI 겹침 방지 (CRITICAL)

이미지, 3D, CTA, 카드, 하단 탭이 겹치면 전체 결과는 실패입니다. 아래 규칙을 CSS에 반드시 반영하세요.

1. **히어로 안전 영역**
   - 히어로 안에서 텍스트/CTA와 이미지가 함께 있을 때는 반드시 CSS grid 또는 flex로 영역을 분리합니다.
   - CTA는 이미지 위에 absolute로 올리지 않습니다. CTA는 텍스트 컨테이너 내부 또는 hero 아래 action panel에 둡니다.
   - 이미지가 absolute라면 텍스트 컨테이너에는 z-index와 readable scrim을 두고, 이미지의 safe area를 침범하지 않습니다.
   - 모바일 390px 기준 hero 내부 좌우 padding은 디자인 시스템 토큰 기준으로 충분히 확보합니다.

2. **3D 전용 컨테이너**
   - 3D img에는 반드시 전용 wrapper를 둡니다: .aide-visual-stage, .hero-visual, .mascot-stage, .scene-visual, .reward-stage 같은 의미 있는 컨테이너.
   - wrapper는 position:relative; overflow:hidden; display:flex 또는 grid; align-items:center를 갖습니다.
   - 3D img 자체에는 반드시 .aide-hero-3d 또는 .aide-3d-asset 클래스를 붙입니다.
   - 배경 포함 3D scene(%%SHARED_HERO_3D_SCENE%% / %%HERO_SCENE_3D%%)은 큰 hero image처럼 stage를 채워야 합니다. 작은 중앙 오브젝트처럼 contain으로 축소하면 실패입니다.
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
       width: clamp(190px, 58vw, 340px);
       height: auto;
       object-fit: contain;
       display: block;
     }
     .aide-hero-scene-img {
       position: absolute;
       inset: 0;
       width: 100%;
       height: 100%;
       object-fit: cover;
     }
     \`\`\`
   - 큰 히어로/추천 카드에서 투명 마스코트형은 width:clamp(190px, 58vw, 340px); max-height:340px; object-fit:contain을 기준으로 합니다.
   - 작은 companion이 필요한 KPI 카드에서만 .compact-3d 클래스를 붙이고 width:clamp(96px, 30vw, 160px)까지 줄일 수 있습니다. 큰 빈 stage 안의 작은 중앙 3D는 금지입니다.
   - 몰입형 씬은 min-height:320px 이상, img는 width:100%; height:100%; object-fit:cover;로 쓰되, overlay content와 CTA가 겹치지 않게 하단/측면 패널을 분리합니다.

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

function buildHeroVisualIntegrationLayer(heroImagePrompt?: string, variantStyle?: string, domain?: AppDomain): string {
  if (!heroImagePrompt) return ''

  const variantHint = variantStyle?.includes('시안 A')
    ? '시안 A는 정보 구조와 사용성을 우선하되, 3D가 필요하면 KPI/요약 카드 안의 보조 마스코트 정도로 절제한다.'
    : variantStyle?.includes('시안 B')
      ? '시안 B는 가장 강한 히어로 임팩트를 만들 수 있으므로, 캐릭터/성장/리워드형 브리프라면 몰입형 3D 씬을 우선 검토한다.'
      : variantStyle?.includes('시안 C')
        ? '시안 C는 감성/브랜드/탐색 흐름을 우선하며, 3D 씬 또는 실사 히어로 중 서비스 감정에 더 맞는 쪽을 선택한다.'
        : '시안의 목적에 맞춰 3D 씬, 투명 마스코트, 실사 히어로 중 하나를 선택한다.'

  const domainPatternHint = (() => {
    const variant = variantStyle?.includes('시안 A') ? 'A'
      : variantStyle?.includes('시안 B') ? 'B'
      : variantStyle?.includes('시안 C') ? 'C'
      : 'single'

    if (variant === 'A') {
      return '시안 A는 데이터/정보 중심입니다. 3D를 쓴다면 반드시 Pattern D(작은 플로팅 악센트)만 허용. KPI 카드 귀퉁이에 작게 배치하고 데이터를 방해하면 실패입니다.'
    }

    const foodOrReward = ['food', 'commerce', 'health'].includes(domain ?? '')
    const characterOrGame = ['entertainment', 'social'].includes(domain ?? '')

    if (variant === 'B') {
      if (foodOrReward) {
        return '시안 B + 음식/커머스/헬스 도메인: Pattern B(크게 확대/크롭) 또는 Pattern C(몰입형 씬) 우선. 3D 이미지가 히어로 패널의 40~60%를 차지해야 임팩트가 생깁니다. Pattern D(작은 플로팅)는 절대 선택하지 마세요.'
      }
      if (characterOrGame) {
        return '시안 B + 캐릭터/게임 도메인: Pattern C(몰입형 캐릭터 씬) 우선. 캐릭터가 히어로 배경을 가득 채우고 그 위에 CTA가 오버레이되어야 합니다.'
      }
      return '시안 B: Pattern B 또는 C를 사용해 히어로 패널에서 3D가 주인공이 되게 하세요. Pattern D는 B시안의 임팩트 목적과 맞지 않습니다.'
    }

    if (variant === 'C') {
      return '시안 C는 이미지 주도 레이아웃입니다. 3D가 카드 면적의 50% 이상을 차지해야 합니다. Pattern B(크롭) 또는 Pattern C(씬)로 카드 상단을 채우세요. Pattern D(플로팅)는 시안 C의 에디토리얼 무드와 맞지 않습니다.'
    }

    return ''
  })()

  return `## 3D 이미지-UI 통합 설계 (CRITICAL)

이번 3D 생성 의도:
${heroImagePrompt}

HTML을 작성하기 전에 내부적으로 아래 결정을 먼저 내리고, 그 결과가 실제 CSS/레이아웃에 반영되어야 합니다.

1. **3D의 역할 선택**
   - 캐릭터/게임/성장/리워드/감성 앱이고 히어로가 브랜드 감정을 이끌어야 하면 \`%%HERO_SCENE_3D%%\`를 사용합니다.
   - 데이터/KPI/예약/주문이 주인공이고 캐릭터는 보조라면 \`%%MASCOT_3D%%\`를 사용합니다.
   - 보상, 쿠폰, 아이템, 상품 오브젝트가 주인공이면 \`%%REWARD_OBJECT_3D%%\`를 사용합니다.
   - 3D보다 현실 이미지가 서비스 신뢰/식욕/공간감을 더 잘 만든다면 3D를 쓰지 않고 \`%%IMG_n:...%%\` 실사 히어로를 선택해도 됩니다.

2. **씬과 UI를 한 몸처럼 배치**
   - \`%%HERO_SCENE_3D%%\`는 이미지 위에 카드/텍스트를 그냥 얹는 것이 아니라, 장면의 빈 공간(safe area)에 카피와 CTA가 들어가야 합니다.
   - 텍스트 영역에는 readable overlay/scrim을 토큰 색상으로 만들고, 캐릭터 얼굴·주요 오브젝트 위를 가리지 않습니다.
   - \`%%MASCOT_3D%%\` / \`%%REWARD_OBJECT_3D%%\`는 카드 오른쪽 아래에 붙이는 작은 스티커가 아니라, progress ring, reward card, growth stage, CTA 주변과 의미적으로 연결되게 배치합니다.
   - 멤버십/리워드/포인트 도메인의 \`%%REWARD_OBJECT_3D%%\`는 포인트 카드 내부의 보상 묶음처럼 배치하세요. 같은 카드 안에 "78,500P", 등급 badge, 소멸 예정 포인트, QR/쿠폰 CTA가 함께 있어야 합니다. 3D만 있는 별도 이미지 박스는 실패입니다.
   - 3D 전용 stage를 크게 만들었다면 stage 안에 작은 badge/KPI/action chip을 함께 넣거나, stage를 point/reward card와 겹치게 구성하세요. 단 이미지 파일 자체에는 텍스트가 없어야 하며 모든 텍스트는 HTML이어야 합니다.

3. **크기와 크롭**
   - 캐릭터 중심 앱에서 마스코트가 80px 이하의 작은 아이콘처럼 보이면 실패입니다.
   - 히어로 씬은 패널 높이의 45~70% 이상을 비주얼이 차지해도 됩니다. 단, CTA와 핵심 수치는 항상 읽혀야 합니다.
   - 전신이 중요한 성장/꾸미기 화면은 contain, 임팩트가 중요한 온보딩/혜택 화면은 일부 crop을 허용합니다.

4. **시안 차별화**
   - ${variantHint}
   - A/B/C가 모두 같은 "흰 카드 + 오른쪽 작은 3D" 구조로 나오면 실패입니다.
   - 3D를 쓰는 시안과 실사/데이터 중심 시안의 역할이 서로 달라야 합니다.
${domainPatternHint ? `
5. **도메인 + 시안별 필수 패턴**
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
}): string {
  const variant = getVariantLabel(args.variantStyle)
  const visualRole = variant === 'B' && args.heroImagePrompt
    ? '%%HERO_SCENE_3D%%'
    : args.heroImagePrompt
      ? '%%MASCOT_3D%%'
      : '%%IMG_1:service hero image%%'
  const fallbackStrategy = variant === 'A'
    ? 'Practical Dashboard'
    : variant === 'B'
      ? args.heroImagePrompt ? 'Immersive Hero Scene' : 'Reward Store First'
      : 'Challenge Social or Minimal Premium'
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
      density: args.platform === 'web' ? '1440px에서 그리드/컬럼으로 화면을 채운다' : '390px 첫 화면에서 핵심 행동과 최소 4개 콘텐츠 단위가 보인다',
    },
    heroVisualPlan: {
      selectedRole: visualRole,
      use3d: Boolean(args.heroImagePrompt),
      semanticPurpose: args.heroImagePrompt ? '3D visual explains the service state/action, not decorative whitespace filling' : 'real image supports service context',
      containerType: visualRole === '%%HERO_SCENE_3D%%' ? 'cropped-immersive-scene-stage' : args.heroImagePrompt ? 'contained-visual-stage' : 'content-image-container',
      requiredHtmlStructure: args.heroImagePrompt ? '.aide-visual-stage > img.aide-hero-3d' : 'semantic image container',
      composition: visualRole === '%%HERO_SCENE_3D%%'
        ? 'large 3D scene with separated action panel; copy and CTA stay in readable safe area'
        : 'transparent mascot/object in a dedicated visual container connected to KPI, progress, reward, or CTA',
      scale: visualRole === '%%HERO_SCENE_3D%%' ? 'hero panel 45-70%' : '160-260px on mobile',
      crop: visualRole === '%%HERO_SCENE_3D%%' ? 'cover with safe-area overlay' : 'contain unless impact crop is needed',
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

async function generateDesignIntentAndHeroVisualPlan(args: {
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
  const membershipSceneDirector = isMembershipRewardExperience(args.brief, args.domain) && variant === 'B'
    ? `## Backend Visual Director Override
이 브리프는 멤버십/포인트/쿠폰/리워드 경험입니다. 사용자가 자세히 말하지 않아도 백단 디렉터가 아래 전략을 자동 적용합니다.
- selectedDesignStrategy는 Immersive Hero Scene 또는 Reward Store First를 우선 고려합니다.
- heroVisualPlan.selectedRole은 %%HERO_SCENE_3D%% 또는 shared scene 사용을 우선합니다.
- scene은 상단 45~55% hero background로 쓰고, HTML greeting/points/chips를 safe area에 overlay합니다.
- 하단 white content sheet/card가 scene 하단을 겹쳐야 합니다.
- 작은 중앙 3D 오브젝트 박스, pale rectangle, 텍스트 아래 분리된 이미지 영역은 실패입니다.
`
    : isMembershipRewardExperience(args.brief, args.domain) && variant === 'C'
      ? `## Backend Visual Director Override
이 브리프는 멤버십/포인트/쿠폰/리워드 경험이지만 현재는 시안 C입니다.
- 시안 C는 3D scene이 아니라 실사 이미지/에디토리얼 탐색형입니다.
- 제휴 매장, 쇼핑 혜택, 라이프스타일, 쿠폰 사용 장면을 실사 이미지 카드/그리드로 구성하세요.
- 3D hero scene placeholder를 사용하지 말고, %%SHARED_IMG%% 또는 %%THUMB%% 계열을 사용하세요.
`
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
   - %%HERO_SCENE_3D%%: 배경 포함 캐릭터 월드/온보딩/게임/감성 히어로
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
- Immersive Hero Scene을 선택하면 CTA는 이미지 위에 겹치지 않고 별도 safe area 또는 action panel에 배치해야 합니다.

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
    "selectedRole": "%%HERO_SCENE_3D%% | %%MASCOT_3D%% | %%REWARD_OBJECT_3D%% | %%IMG_1:keyword%% | none",
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

## 기준 플랫폼
${args.platform}

${membershipSceneDirector}

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
  designIntentPlan: string
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
  let intent: {
    selectedDesignStrategy?: string
    heroVisualPlan?: { selectedRole?: string; containerType?: string }
    firstViewportContract?: { visibleAboveFold?: string[]; density?: string }
  } = {}
  try {
    intent = JSON.parse(stripCodeFence(args.designIntentPlan))
  } catch {
    intent = {}
  }

  const isWeb = args.platform === 'web'
  const brief = args.brief
  const isB2B = briefHasAny(brief, ['B2B', '기업', '관리자', '대시보드', '포털', '회선', '청구서', '권한', '사용량'])
  const isMembership = briefHasAny(brief, ['멤버십', '포인트', '쿠폰', '리워드', '제휴', 'QR', '바코드'])
  const isCommerce = briefHasAny(brief, ['상품', '장바구니', '주문', '결제', '혜택', '쿠폰'])
  const isFood = briefHasAny(brief, ['음식', '레시피', '메뉴', '식단', '재료'])
  const isPlant = briefHasAny(brief, ['식물', '화분', '몬스테라', '물주기', '햇빛', '성장일지'])
  const selectedRole = intent.heroVisualPlan?.selectedRole ?? ''
  const strategy = intent.selectedDesignStrategy ?? ''

  const navType = isWeb
    ? isB2B ? 'lnb' : 'gnb'
    : 'bottom-tab'
  const heroType = /HERO_SCENE_3D|SHARED_HERO_3D_SCENE|IMG_/.test(selectedRole)
    ? 'image-hero'
    : isB2B
      ? 'stat-dashboard'
      : strategy.includes('Reward') || isMembership
        ? 'action-cta'
        : 'stat-dashboard'
  const mediaIntegration = /HERO_SCENE_3D|SHARED_HERO_3D_SCENE/.test(selectedRole)
    ? 'cropped-hero-scene'
    : /MASCOT_3D|REWARD_OBJECT_3D|SHARED_HERO_3D/.test(selectedRole)
      ? 'contained-object'
      : isCommerce || isFood
        ? 'content-thumbnail-grid'
        : 'no-media'
  const density = isWeb || isB2B
    ? 'dense-dashboard'
    : strategy.includes('Minimal')
      ? 'balanced'
      : 'balanced'

  const sections = isB2B
    ? ['nav-header', 'kpi-overview', 'usage-chart', 'billing-table', 'alerts-permissions', isWeb ? 'detail-panel' : 'bottom-nav']
    : isMembership
      ? ['nav-header', 'points-reward-summary', 'qr-coupon-actions', 'recent-activity', 'nearby-partners', isWeb ? 'benefits-grid' : 'bottom-nav']
      : isFood
        ? ['nav-header', 'recommendation-hero', 'nutrition-meta', 'ingredients-or-menu-list', 'recipe-or-order-cta', isWeb ? 'related-grid' : 'bottom-nav']
        : isPlant
          ? ['nav-header', 'health-summary', 'care-routine', 'environment-kpis', 'growth-log', isWeb ? 'insight-panel' : 'bottom-nav']
          : isCommerce
            ? ['nav-header', 'hero-offer', 'category-chips', 'product-or-benefit-grid', 'recent-or-cart-action', isWeb ? 'side-panel' : 'bottom-nav']
            : ['nav-header', 'summary-hero', 'quick-actions', 'content-list', 'insight-section', isWeb ? 'secondary-panel' : 'bottom-nav']

  const firstViewport = intent.firstViewportContract?.visibleAboveFold?.length
    ? intent.firstViewportContract.visibleAboveFold
    : isB2B
      ? ['전체 KPI', '차트 또는 표', '업무 알림', 'primary CTA', '필터/탐색']
      : isMembership
        ? ['포인트/등급', '쿠폰/리워드', 'QR 결제 CTA', '최근 내역', '제휴 혜택']
        : ['브랜드/현재 맥락', '핵심 요약', 'primary CTA', '퀵 액션', '콘텐츠 카드']

  return [
    `SECTIONS: ${sections.join(', ')}`,
    `NAV_TYPE: ${navType}`,
    `HERO_TYPE: ${heroType}`,
    `FIRST_VIEWPORT: ${firstViewport.join(' / ')}`,
    `CONTENT_DENSITY: ${density}`,
    `MEDIA_INTEGRATION: ${mediaIntegration}`,
    'CARD_RHYTHM: outer padding, section gap, card padding, item gap은 :root의 aide/design token 변수만 사용',
    rootBlock,
  ].join('\n')
}

function compactList(items: string[]): string[] {
  return Array.from(new Set(items.map(item => item.trim()).filter(Boolean)))
}

function briefHasAny(brief: string, keywords: string[]): boolean {
  const normalized = brief.toLowerCase()
  return keywords.some(keyword => normalized.includes(keyword.toLowerCase()))
}

function getVariantBlueprintRole(variantStyle?: string): {
  label: string;
  role: string;
  requiredShape: string[];
} {
  const variant = getVariantLabel(variantStyle)
  if (variant === 'A') {
    return {
      label: 'A',
      role: '운영/정보형. 사용자가 현재 상태와 다음 행동을 가장 빠르게 판단하는 시안',
      requiredShape: ['KPI 3개 이상', '최근 항목 2개 이상', '퀵 액션 3개 이상', '상태/알림/진행률 중 1개 이상'],
    }
  }
  if (variant === 'B') {
    return {
      label: 'B',
      role: '전환/히어로형. 대표 CTA와 visual impact가 있지만 정보가 비지 않는 시안',
      requiredShape: ['hero는 첫 viewport 38% 이하', 'KPI 2개 이상', '퀵 액션 3개 이상', '목록/카드 힌트 1개 이상', 'primary CTA 1개'],
    }
  }
  if (variant === 'C') {
    return {
      label: 'C',
      role: '탐색/상세형. 카테고리, 추천, 상세 맥락을 풍부하게 보여주는 시안',
      requiredShape: ['카테고리/필터 칩 4개 이상', '추천/혜택 카드 2개 이상', '상세 설명/메타 정보', '보조 CTA 1개 이상'],
    }
  }
  return {
    label: 'single',
    role: '실제 제품 홈. 핵심 상태, 주요 행동, 보조 탐색이 모두 보이는 화면',
    requiredShape: ['KPI/요약', 'primary CTA', '퀵 액션', '리스트/카드', '다음 섹션 힌트'],
  }
}

function buildScreenBlueprint(args: {
  brief: string;
  domain?: AppDomain;
  platform: PlatformType;
  variantStyle?: string;
  generationPlan?: AideGenerationPlan;
  sharedVisualMode?: '3d' | 'photo' | 'none';
  sharedVisualSubject?: string;
}): string {
  const { brief, domain, platform, variantStyle, generationPlan, sharedVisualMode, sharedVisualSubject } = args
  const variantRole = getVariantBlueprintRole(variantStyle)
  const isTelecomMembership = briefHasAny(brief, ['멤버십', '포인트', '쿠폰', '리워드', '제휴', 'QR', '바코드'])
  const isTelecomB2B = briefHasAny(brief, ['기업 고객', '회선', '요금제', '청구서', '권한', 'B2B', '대시보드', '사용량'])
  const isDashboard = domain === 'business' || platform === 'web' && briefHasAny(brief, ['대시보드', '관리', '포털', '어드민', '청구', '권한'])
  const isCommerce = domain === 'commerce' || briefHasAny(brief, ['상품', '주문', '장바구니', '결제', '쿠폰', '혜택'])
  const isFood = domain === 'food' || briefHasAny(brief, ['음식', '레시피', '메뉴', '배달', '식단'])
  const isPlantCare = briefHasAny(brief, ['식물', '화분', '몬스테라', '물주기', '햇빛', '성장일지'])

  let archetype = domain ? (DOMAIN_KEY_TO_LABEL[domain] ?? '범용 서비스') : '범용 서비스'
  let requiredContentSlots = ['현재 상태 요약', '핵심 KPI', '주요 CTA', '퀵 액션', '최근/추천 콘텐츠', '다음 섹션 힌트']
  let firstViewportSlots = ['브랜드/현재 맥락', '핵심 요약 카드', 'primary CTA', '퀵 액션 3~5개', '목록/카드 2개 이상']
  let dataExamples = ['상태값', '수치', '시간/기간', '보조 설명', '상태 배지']
  let primaryCtas = ['바로 시작하기', '상세 보기']
  let navigation = platform === 'web' ? '웹은 GNB/LNB 중 서비스 성격에 맞게 선택하고 모바일 하단 탭바를 쓰지 않는다.' : '모바일은 홈/탐색/내역/마이 등 4~5개 하단 탭을 사용한다.'
  let visualRole = sharedVisualMode === '3d'
    ? `3D는 ${sharedVisualSubject || '서비스 핵심 오브젝트'}를 상징하되, 데이터/CTA와 연결된 visual stage 안에 배치한다.`
    : sharedVisualMode === 'photo'
      ? `실사 이미지는 ${sharedVisualSubject || '서비스 맥락'}을 설명하는 콘텐츠 이미지로 사용한다.`
      : '이미지는 보조이며, 정보 구조와 실제 UI 컴포넌트가 화면 완성도를 만든다.'

  if (isTelecomMembership) {
    archetype = '통신사 멤버십/혜택 모바일 서비스'
    requiredContentSlots = ['잔여 포인트', '등급/리워드', '소멸 예정 포인트', '보유 쿠폰', '최근 적립/사용 내역', '주변 제휴 매장', 'QR/바코드 결제 진입']
    firstViewportSlots = ['포인트 잔액 + 등급', '이번 달 소멸 예정 포인트', '쿠폰/리워드 요약', 'QR 결제 CTA', '최근 내역 2개', '주변 제휴 매장 또는 추천 혜택']
    dataExamples = ['78,500P', 'VIP', '소멸 예정 1,200P', '보유 쿠폰 3장', 'GS25 강남점 -1,500P', '반경 500m 제휴 매장 4곳']
    primaryCtas = ['QR 결제 열기', '쿠폰 바로 사용', '주변 혜택 찾기']
    visualRole = sharedVisualMode === '3d'
      ? '3D는 배경 포함 멤버십 hero scene 또는 포인트/쿠폰/리워드 패키지로 사용한다. B/C처럼 감성 홈이면 scene을 상단 45~55%에 크게 깔고 HTML 인사말·등급·포인트 chip을 overlay한 뒤 하단 white sheet를 겹친다. A처럼 정보형이면 잔여 포인트 카드·VIP 리워드 CTA·QR 결제 액션과 같은 surface 안에 통합한다. 별도의 빈 이미지 박스/중앙 정렬 장식/카드 밖 플로팅 오브젝트 금지.'
      : '혜택/매장/쿠폰 이미지는 작은 콘텐츠 카드나 히어로 보조 이미지로 사용한다.'
  }

  if (isTelecomB2B) {
    archetype = '기업 고객 통신 관리 B2B 대시보드'
    requiredContentSlots = ['전체 회선 수', '활성/정지 회선', '요금제별 사용량', '이번 달 청구액', '부서별 비용', '최근 청구서', '권한 승인 대기', '이상 사용 알림']
    firstViewportSlots = ['전체 회선 KPI', '이번 달 예상 청구액', '요금제별 사용량 차트', '부서별 비용/사용량 표', '이상 사용 알림', '권한 승인 대기']
    dataExamples = ['전체 1,248회선', '활성 1,194 / 정지 54', '예상 청구액 48,920,000원', '데이터 72% 사용', '승인 대기 7건', '이상 사용 3건']
    primaryCtas = ['청구서 조회', '권한 승인 처리', '회선 상세 보기']
    navigation = 'B2B 웹은 좌측 LNB 또는 상단 GNB+업무 필터를 사용하고, 첫 화면은 넓은 대시보드 그리드로 확장한다.'
    visualRole = '3D를 억지로 쓰지 않는다. 필요하면 네트워크/데이터 흐름을 설명하는 작은 보조 visual만 사용하고, 차트와 테이블이 주인공이어야 한다.'
  } else if (isDashboard) {
    archetype = '정보 밀도 높은 업무/관리 대시보드'
    requiredContentSlots = compactList([...requiredContentSlots, 'KPI 카드 4개', '차트', '테이블/리스트', '알림', '필터'])
    firstViewportSlots = compactList([...firstViewportSlots, '차트 또는 표', '업무 알림'])
    primaryCtas = compactList([...primaryCtas, '상세 분석 보기', '필터 적용'])
  }

  if (isCommerce && !isTelecomMembership) {
    requiredContentSlots = compactList([...requiredContentSlots, '카테고리', '추천 상품/혜택', '가격/할인', '장바구니/결제 CTA'])
    firstViewportSlots = compactList([...firstViewportSlots, '카테고리 칩', '상품/혜택 카드 2개'])
    dataExamples = compactList([...dataExamples, '할인율', '가격', '평점', '배송/소요 시간'])
  }

  if (isFood) {
    requiredContentSlots = compactList([...requiredContentSlots, '추천 메뉴', '재료/영양 정보', '소요 시간', '부족한 재료', '주문/레시피 CTA'])
    dataExamples = compactList([...dataExamples, '18분', '520 kcal', '매칭률 82%', '부족 재료 3개'])
  }

  if (isPlantCare) {
    requiredContentSlots = compactList([...requiredContentSlots, '식물 건강도', '물주기', '햇빛/온도/습도', '오늘의 케어 루틴', '성장일지'])
    dataExamples = compactList([...dataExamples, '건강도 92점', '수분 38%', '마지막 급수 5일 전', '온도 24도'])
  }

  const generationPlanHints = generationPlan
    ? {
        coreObjects: generationPlan.productBrief?.coreObjects ?? [],
        keyActions: generationPlan.productBrief?.keyActions ?? [],
        successCriteria: generationPlan.productBrief?.successCriteria ?? [],
      }
    : null

  return JSON.stringify({
    intent: '이 블루프린트는 픽셀 와이어프레임이 아니라 필수 정보/기능 계약입니다. 섹션 형태는 창의적으로 재해석하되 아래 슬롯은 빠뜨리지 마세요.',
    archetype,
    platform,
    variant: variantRole,
    requiredContentSlots: compactList(requiredContentSlots),
    firstViewportSlots: compactList(firstViewportSlots),
    dataExamples: compactList(dataExamples),
    primaryCtas: compactList(primaryCtas),
    navigation,
    visualRole,
    generationPlanHints,
    qualityBar: [
      '첫 viewport는 실제 서비스 홈/대시보드처럼 충분한 데이터와 액션을 가진다.',
      '카드는 제목만 두지 말고 보조 설명, 수치, 상태, 액션을 포함한다.',
      'A/B/C는 같은 기능 슬롯을 공유하되 레이아웃 골격과 강조점만 다르게 한다.',
      '큰 여백은 의도적 계층에만 사용하고 빈 포스터/와이어프레임 느낌을 만들지 않는다.',
      '디자인 시스템 토큰과 컴포넌트 규칙을 우선하고 임의 스타일을 만들지 않는다.',
    ],
    antiSkeletonRules: [
      '블루프린트 순서를 그대로 박스화하지 말 것',
      '회색 placeholder, lorem ipsum, 빈 카드 금지',
      '한두 개 섹션만 크게 만들고 나머지 기능을 생략 금지',
      '3D/이미지를 기능 없이 장식으로 배치 금지',
    ],
  }, null, 2)
}

function buildReactTailwindExperimentLayer(enabled: boolean, effectivePlatform: PlatformType, isKtds: boolean): string {
  if (!enabled) return ''
  return `## React + Tailwind + shadcn/ui Inspired Generation Mode (EXPERIMENTAL)
이번 브랜치에서는 v0식 UI 안정성을 테스트합니다. 실제 React/Tailwind/shadcn 패키지를 import하지 말고, 아래 컴포넌트 사고방식과 구조 계약을 단일 HTML/CSS로 구현하세요.

핵심 원칙:
- 임의 HTML 덩어리를 만들지 말고 React 컴포넌트를 조립하듯 화면을 구성합니다.
- Tailwind처럼 layout primitive를 일관되게 사용합니다: flex, grid, minmax(0,1fr), min-width:0, gap, clamp, responsive breakpoint.
- shadcn/ui처럼 검증된 컴포넌트 패턴을 따릅니다: Button, Card, Badge, Tabs, Table, List, Sheet/Dialog, Navigation, DataCard.
- 단, shadcn 기본 스타일을 복사하지 마세요. 최종 스타일은 반드시 선택된 DESIGN.md 토큰과 컴포넌트 규칙을 따릅니다.

Aide UI Kit Contract — 반드시 아래 의미 클래스 중 필요한 것을 사용:
- .aide-page: 전체 스크롤/반응형 page wrapper
- .app-shell: 앱/웹 전체 레이아웃 shell
- .app-header 또는 .top-nav: 브랜드/검색/알림/사용자 액션
- .aide-section: 한 가지 목적을 가진 섹션
- .section-header: 섹션 제목 + 보조 액션
- .aide-card: 카드 공통 wrapper
- .kpi-grid: KPI 카드 묶음
- .kpi-card: 단일 수치/상태 카드
- .quick-actions: 빠른 실행 버튼 그리드
- .content-list: 반복 리스트/피드
- .list-item: 반복 항목
- .filter-tabs 또는 .category-chips: 탭/칩 필터
- .data-table 또는 .usage-chart: 웹/B2B 데이터 표현
- .aide-visual-stage: 3D/이미지 전용 visual container
- .primary-cta: 화면의 가장 중요한 CTA

Component rules:
- Button: .primary-cta 또는 .btn-primary를 사용하고 높이/라운드/색상은 DESIGN.md Button 규칙을 따른다.
- Card: 같은 화면의 반복 카드들은 padding, radius, border/shadow 방식이 같아야 한다.
- KPI: label, value, delta/status, short helper text를 가진다. value만 단독 배치 금지.
- List item: title, description/meta, status/action을 가진다. 제목만 있는 리스트 금지.
- Tabs/Chips: 한 줄에서 자연스럽게 스크롤/랩되고, 짧은 라벨은 nowrap.
- Table: ${effectivePlatform === 'web' ? '웹/B2B에서는 table/grid를 적극 사용하되 390px에서는 카드형 리스트로 접는다.' : '모바일에서는 표 대신 카드형 리스트 또는 compact row로 표현한다.'}

Design.md adapter:
- DESIGN.md 토큰을 :root CSS 변수로 선언하고, 모든 컴포넌트가 var(--color-*), var(--spacing-*), var(--rounded-*)를 사용한다.
- ${isKtds ? 'KTDS 선택 시 Button 48px/radius 8px, Card radius 16px, B2B border-only/B2C shadow-only 규칙을 shadcn 기본값보다 우선합니다.' : '선택된 디자인 시스템의 Button/Card/Input/Navigation 규칙을 shadcn 기본값보다 우선합니다.'}
- 임의의 glassmorphism, 과한 gradient, shadcn 기본 gray palette를 만들지 않는다.

Quality bar:
- 화면은 컴포넌트 조립품처럼 안정적이어야 하지만, 와이어프레임처럼 딱딱하면 실패입니다.
- 각 컴포넌트는 실제 서비스 데이터와 상태를 담아야 합니다.
- 컴포넌트 간 간격은 부모 gap으로 관리하고, 개별 margin 남발 금지.
- A/B/C 차이는 component order, density, visual stage, navigation emphasis로 만듭니다. 색/라운드 랜덤 변경 금지.
`
}

type AideScreenTemplateContext = {
  brief: string
  projectSummary?: string
  platform: PlatformType
  domain?: AppDomain
  variant: string
  designContract: DesignRhythmContract | null
  hasBrandColors: boolean
  hasLogo: boolean
  sharedVisualMode: '3d' | 'photo' | 'none'
  sharedVisualSubject: string
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function placeholderSafe(value: string): string {
  return value.replace(/[%:]/g, ' ').replace(/\s+/g, ' ').trim() || 'modern service visual'
}

function inferDisplayServiceName(brief: string, projectSummary?: string): string {
  const explicit = extractServiceNameFromBrief(brief)
  if (explicit) return explicit
  if (/kt|통신|멤버십|포인트|쿠폰|리워드/i.test(brief)) return 'KT 멤버십'
  if (/식물|화분|몬스테라/i.test(brief)) return '초록이'
  if (/음식|레시피|메뉴|식단|냉장고/i.test(brief)) return 'FreshFit'
  if (/기업|회선|청구서|권한|b2b|대시보드/i.test(brief)) return '통신 관리 포털'
  return projectSummary?.replace(/[.。]+$/g, '').slice(0, 14) || 'Aide'
}

function getTemplateContent(brief: string, domain?: AppDomain) {
  const membership = isMembershipRewardExperience(brief, domain)
  const b2b = briefHasAny(brief, ['B2B', '기업', '회선', '요금제', '청구서', '권한', '사용량'])
  const food = domain === 'food' || briefHasAny(brief, ['음식', '레시피', '메뉴', '냉장고', '식단'])
  const plant = briefHasAny(brief, ['식물', '화분', '몬스테라', '물주기', '햇빛'])

  if (membership) {
    return {
      greeting: '김케이님',
      headline: 'VIP 혜택과 포인트를 한눈에',
      subtitle: '이번 달 소멸 예정 포인트와 보유 쿠폰을 확인하고 바로 결제하세요.',
      primaryMetric: '78,500P',
      secondaryMetric: 'VIP 등급',
      alert: '이번 달 말 1,200P 소멸 예정',
      cta: '바코드 결제 열기',
      proof: ['보유 쿠폰 3장', '주변 혜택 4곳', '최근 이용 2건'],
      quickActions: ['보유 쿠폰', '주변 혜택', '이용 내역', '등급 혜택'],
      listTitle: '최근 이용 내역',
      list: [
        ['GS25 강남점', '-1,500P', '오늘 12:30 · 바코드 결제'],
        ['스타벅스 역삼점', '-2,000P', '어제 18:15 · VIP 할인 적용'],
        ['CGV 강남', '+500P', '6월 2일 · 제휴 적립'],
      ],
      photoKeyword: 'membership rewards shopping benefits',
    }
  }

  if (b2b) {
    return {
      greeting: '관리자님',
      headline: '전사 통신 현황을 한 화면에서 관리',
      subtitle: '회선, 요금제, 청구서, 권한 승인 상태를 실시간으로 확인하세요.',
      primaryMetric: '1,248회선',
      secondaryMetric: '48,920,000원',
      alert: '권한 승인 대기 7건',
      cta: '청구서 조회',
      proof: ['활성 1,194', '정지 54', '이상 사용 3건'],
      quickActions: ['회선 현황', '요금제 사용량', '청구서', '권한 관리'],
      listTitle: '이상 사용 알림',
      list: [
        ['마케팅팀 데이터 급증', '72% 사용', '어제 대비 18% 증가'],
        ['영업 2팀 정지 예정', '12회선', '납부 확인 필요'],
        ['권한 승인 요청', '7건', '담당자 변경 요청'],
      ],
      photoKeyword: 'business dashboard office',
    }
  }

  if (food) {
    return {
      greeting: '원희님',
      headline: '냉장고 재료로 오늘 메뉴 추천',
      subtitle: '남은 재료와 영양 균형을 분석해 바로 만들 수 있는 식단을 제안합니다.',
      primaryMetric: '82%',
      secondaryMetric: '18분 소요',
      alert: '부족 재료 3개만 추가하면 완성',
      cta: '오늘 메뉴 만들기',
      proof: ['520 kcal', '재료 7개 매칭', '장보기 8,500원'],
      quickActions: ['레시피', '냉장고', '장보기', '식단 기록'],
      listTitle: '추천 메뉴',
      list: [
        ['연어 아보카도 라이스볼', '82% 매칭', '18분 · 520 kcal'],
        ['토마토 달걀 볶음', '76% 매칭', '12분 · 부족 재료 1개'],
        ['그릭요거트 샐러드', '69% 매칭', '8분 · 가벼운 저녁'],
      ],
      photoKeyword: 'fresh healthy food lifestyle',
    }
  }

  if (plant) {
    return {
      greeting: '원희님',
      headline: '몬스테라의 오늘 컨디션',
      subtitle: '수분과 햇빛 상태를 확인하고 필요한 케어 루틴을 바로 기록하세요.',
      primaryMetric: '92점',
      secondaryMetric: '수분 38%',
      alert: '마지막 급수 5일 전 · 물주기 필요',
      cta: '오늘 케어 완료하기',
      proof: ['햇빛 적절', '온도 24°C', '습도 32%'],
      quickActions: ['물주기', '햇빛', '성장일지', '진단'],
      listTitle: '오늘의 케어 루틴',
      list: [
        ['수분 공급', '200ml 권장', '오전 10시 전 기록'],
        ['햇빛 쬐어주기', '3시간', '창가로 이동'],
        ['잎 상태 체크', '양호', '새잎 1개 성장 중'],
      ],
      photoKeyword: 'indoor plant care lifestyle',
    }
  }

  return {
    greeting: '사용자님',
    headline: '핵심 상태와 다음 행동을 한눈에',
    subtitle: '중요한 데이터, 추천 항목, 바로 실행할 액션을 첫 화면에서 제공합니다.',
    primaryMetric: '84%',
    secondaryMetric: '진행 중',
    alert: '오늘 처리할 항목 4개',
    cta: '주요 액션 시작',
    proof: ['추천 3개', '최근 활동 8건', '완료율 84%'],
    quickActions: ['홈', '탐색', '내역', '마이'],
    listTitle: '추천 항목',
    list: [
      ['핵심 추천 카드', '우선순위 높음', '방금 업데이트됨'],
      ['최근 활동 요약', '8건', '이번 주 기준'],
      ['다음 단계 안내', '진행 가능', 'CTA 연결됨'],
    ],
    photoKeyword: 'modern lifestyle product',
  }
}

function buildAideTemplateBaseStyle(ctx: AideScreenTemplateContext): string {
  const contractStyle = buildAideContractStyle(ctx.designContract)
  return `${contractStyle}
<style data-aide-template="1">
:root {
  --template-primary: var(--color-primary, #1a75ff);
  --template-bg: var(--color-background, #f3f6fa);
  --template-surface: var(--color-surface, #ffffff);
  --template-text: var(--color-text, #111111);
  --template-muted: var(--color-text-neutral, #707780);
  --template-border: var(--color-border-alt, rgba(0,0,0,.08));
}
* { box-sizing: border-box; }
html, body { margin:0; min-height:100%; background:var(--template-bg); color:var(--template-text); font-family:var(--font-sans, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif); letter-spacing:0; word-break:keep-all; }
body { overflow:hidden; }
.app-shell { width:100%; min-height:100vh; background:var(--template-bg); display:flex; flex-direction:column; }
.app-header { height:var(--aide-header-height,56px); flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:var(--spacing-sm,12px); padding:0 var(--aide-page-padding,20px); background:var(--template-surface); border-bottom:1px solid var(--template-border); }
.brand-wrap { display:flex; align-items:center; min-width:0; }
.aide-text-brand { font-weight:800; font-size:18px; white-space:nowrap; }
.header-actions { display:flex; align-items:center; gap:12px; color:var(--template-text); }
.icon-btn { width:32px; height:32px; border:0; background:transparent; display:grid; place-items:center; border-radius:var(--rounded-md,8px); color:currentColor; }
.aide-page { flex:1 1 auto; overflow:auto; }
.section-header { display:flex; align-items:center; justify-content:space-between; gap:12px; font-weight:800; }
.section-header a { color:var(--template-primary); font-size:13px; text-decoration:none; white-space:nowrap; }
.aide-card { background:var(--template-surface); min-width:0; }
.kpi-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--aide-card-gap,12px); }
.kpi-card { display:flex; flex-direction:column; gap:8px; }
.label { color:var(--template-muted); font-size:12px; font-weight:700; }
.value { font-size:34px; line-height:1.05; font-weight:900; letter-spacing:-.01em; }
.muted { color:var(--template-muted); font-size:13px; line-height:1.45; }
.badge, .chip { display:inline-flex; align-items:center; justify-content:center; height:28px; padding:0 10px; border-radius:999px; font-size:12px; font-weight:800; white-space:nowrap; flex:0 0 auto; }
.badge { color:#fff; background:var(--template-primary); }
.chip { color:var(--template-text); background:rgba(17,24,39,.06); border:1px solid var(--template-border); }
.primary-cta { min-height:var(--aide-button-height,48px); border:0; border-radius:var(--rounded-md,8px); background:var(--template-primary); color:#fff; font-weight:900; font-size:16px; display:flex; align-items:center; justify-content:center; gap:10px; text-decoration:none; width:100%; white-space:nowrap; }
.quick-actions { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
.quick-action { min-width:0; min-height:64px; background:var(--template-surface); border:1px solid var(--template-border); border-radius:var(--rounded-lg,12px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color:var(--template-muted); font-size:12px; font-weight:700; text-align:center; }
.quick-action svg { color:var(--template-primary); }
.content-list { display:flex; flex-direction:column; overflow:hidden; }
.list-item { min-height:58px; display:grid; grid-template-columns:1fr auto; gap:10px; align-items:center; padding:12px 0; border-bottom:1px solid var(--template-border); }
.list-item:last-child { border-bottom:0; }
.list-title { font-weight:800; font-size:14px; }
.list-meta { color:var(--template-muted); font-size:12px; margin-top:3px; }
.list-value { font-weight:900; color:var(--template-primary); white-space:nowrap; }
.bottom-nav { position:fixed; left:0; right:0; bottom:0; height:var(--aide-tabbar-height,72px); background:var(--template-surface); border-top:1px solid var(--template-border); display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); padding:6px 8px env(safe-area-inset-bottom); z-index:20; box-shadow:0 -6px 18px rgba(15,23,42,.04); }
.bottom-nav a { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; color:var(--template-muted); text-decoration:none; font-size:11px; line-height:1; font-weight:800; min-width:0; white-space:nowrap; overflow:hidden; }
.bottom-nav svg { width:22px; height:22px; flex:0 0 auto; stroke-width:2.2; }
.bottom-nav span { display:block; max-width:100%; overflow:hidden; text-overflow:ellipsis; }
.bottom-nav a.active { color:var(--template-primary); }
.hero-scene { position:relative; min-height:420px; overflow:hidden; background:linear-gradient(180deg, color-mix(in srgb, var(--template-primary) 18%, #fff), #eef5ff); border-radius:0 0 34px 34px; }
.hero-scene .aide-hero-scene-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.hero-overlay { position:relative; z-index:2; padding:28px var(--aide-page-padding,20px); display:flex; flex-direction:column; gap:14px; max-width:72%; }
.hero-overlay h1 { margin:0; font-size:30px; line-height:1.12; font-weight:950; }
.hero-overlay p { margin:0; font-size:15px; line-height:1.45; color:color-mix(in srgb, var(--template-text) 76%, #fff); }
.content-sheet { position:relative; z-index:3; margin-top:-42px; background:var(--template-bg); border-radius:32px 32px 0 0; padding-top:var(--aide-section-gap,16px); }
.photo-hero { overflow:hidden; padding:0; }
.photo-hero img { width:100%; height:210px; object-fit:cover; display:block; }
.photo-hero-body { padding:var(--aide-card-padding,16px); display:flex; flex-direction:column; gap:10px; }
.category-chips { display:flex; gap:8px; overflow:auto; padding-bottom:2px; }
.image-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--aide-card-gap,12px); }
.image-card { overflow:hidden; padding:0; }
.image-card img { width:100%; height:104px; object-fit:cover; display:block; }
.image-card div { padding:12px; font-size:13px; font-weight:800; }
@media (min-width: 768px) {
  body { overflow:auto; }
  .app-shell { min-height:100vh; }
  .aide-page { max-width:1120px; width:100%; margin:0 auto; padding-bottom:var(--aide-section-gap,16px); }
  .bottom-nav { display:none; }
  .app-header { padding:0 32px; }
  .hero-scene { min-height:520px; border-radius:0 0 42px 42px; }
  .hero-overlay { max-width:520px; padding-left:calc((100vw - min(1120px, 100vw)) / 2 + 32px); }
  .hero-overlay h1 { font-size:46px; }
  .content-sheet { margin-top:-56px; }
  .kpi-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
  .quick-actions { grid-template-columns:repeat(4,minmax(0,1fr)); }
  .photo-hero img { height:320px; }
}
</style>`
}

function renderHeader(ctx: AideScreenTemplateContext, serviceName: string): string {
  const brand = ctx.hasLogo ? AIDE_LOGO_SLOT_HTML : `<span class="aide-text-brand">${htmlEscape(serviceName)}</span>`
  return `<header class="app-header">
  <div class="brand-wrap">${brand}</div>
  <div class="header-actions" aria-label="header actions">
    <button class="icon-btn" aria-label="검색"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></button>
    <button class="icon-btn" aria-label="메뉴"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
  </div>
</header>`
}

function renderBottomNav(items: string[]): string {
  const icons = [
    '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    '<path d="M20 13V7a2 2 0 0 0-2-2h-2l-2-2H8L6 5H4a2 2 0 0 0-2 2v6"/><path d="M4 13h16v8H4z"/>',
    '<path d="M4 5h16M4 12h16M4 19h16"/>',
    '<circle cx="12" cy="8" r="4"/><path d="M4 21c2-4 14-4 16 0"/>',
  ]
  return `<nav class="bottom-nav">${items.slice(0, 4).map((item, index) => `<a class="${index === 0 ? 'active' : ''}" href="#"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[index] ?? icons[0]}</svg><span>${htmlEscape(item)}</span></a>`).join('')}</nav>`
}

function renderTemplateVariantA(ctx: AideScreenTemplateContext, content: ReturnType<typeof getTemplateContent>, serviceName: string): string {
  return `<!DOCTYPE html><html lang="ko" data-aide-template-renderer="1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${buildAideTemplateBaseStyle(ctx)}</head><body>
<div class="app-shell">${renderHeader(ctx, serviceName)}
<main class="aide-page">
  <section class="aide-section">
    <div class="aide-card" style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:var(--aide-card-gap);">
      <div>
        <div class="label">${htmlEscape(content.greeting)}</div>
        <div class="value" style="margin-top:10px">${htmlEscape(content.primaryMetric)}</div>
        <p class="muted" style="margin:8px 0 0">${htmlEscape(content.subtitle)}</p>
      </div>
      <span class="badge">${htmlEscape(content.secondaryMetric)}</span>
    </div>
  </section>
  <section class="aide-section">
    <a class="primary-cta" href="#"><span>${htmlEscape(content.cta)}</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16 13h4v4h-4zM13 18h3v2h-3z"/></svg></a>
  </section>
  <section class="quick-actions">${content.quickActions.map(action => `<div class="quick-action"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg><span>${htmlEscape(action)}</span></div>`).join('')}</section>
  <section class="aide-section">
    <div class="section-header"><span>${htmlEscape(content.listTitle)}</span><a href="#">전체보기</a></div>
    <div class="aide-card content-list">${content.list.map(([title, value, meta]) => `<div class="list-item"><div><div class="list-title">${htmlEscape(title)}</div><div class="list-meta">${htmlEscape(meta)}</div></div><div class="list-value">${htmlEscape(value)}</div></div>`).join('')}</div>
  </section>
  <section class="kpi-grid">${content.proof.map(item => `<div class="aide-card kpi-card"><span class="label">요약</span><strong>${htmlEscape(item)}</strong></div>`).join('')}</section>
</main>
${renderBottomNav(['홈', '혜택', '결제', '마이'])}</div></body></html>`
}

function renderTemplateVariantB(ctx: AideScreenTemplateContext, content: ReturnType<typeof getTemplateContent>, serviceName: string): string {
  const subject = placeholderSafe(ctx.sharedVisualSubject)
  const img = ctx.sharedVisualMode === '3d'
    ? `%%SHARED_HERO_3D_SCENE:${subject}%%`
    : `%%SHARED_IMG:${placeholderSafe(content.photoKeyword)}:900:600%%`
  return `<!DOCTYPE html><html lang="ko" data-aide-template-renderer="1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${buildAideTemplateBaseStyle(ctx)}</head><body>
<div class="app-shell">${renderHeader(ctx, serviceName)}
<section class="hero-scene">
  <img class="aide-hero-3d aide-hero-scene-img" src="${img}" alt="">
  <div class="hero-overlay">
    <span class="chip">${htmlEscape(content.secondaryMetric)}</span>
    <h1>${htmlEscape(content.headline)}</h1>
    <p>${htmlEscape(content.subtitle)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${content.proof.map(item => `<span class="chip">${htmlEscape(item)}</span>`).join('')}</div>
  </div>
</section>
<main class="aide-page content-sheet">
  <section class="aide-section">
    <div class="aide-card" style="display:flex;flex-direction:column;gap:14px;text-align:center;">
      <div><div class="label">${htmlEscape(content.greeting)}</div><div class="value">${htmlEscape(content.primaryMetric)}</div><p class="muted">${htmlEscape(content.alert)}</p></div>
      <a class="primary-cta" href="#">${htmlEscape(content.cta)}</a>
    </div>
  </section>
  <section class="quick-actions">${content.quickActions.map(action => `<div class="quick-action"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg><span>${htmlEscape(action)}</span></div>`).join('')}</section>
  <section class="aide-section">
    <div class="section-header"><span>${htmlEscape(content.listTitle)}</span><a href="#">더보기</a></div>
    <div class="aide-card content-list">${content.list.slice(0, 2).map(([title, value, meta]) => `<div class="list-item"><div><div class="list-title">${htmlEscape(title)}</div><div class="list-meta">${htmlEscape(meta)}</div></div><div class="list-value">${htmlEscape(value)}</div></div>`).join('')}</div>
  </section>
</main>${renderBottomNav(['홈', '혜택', '결제', '마이'])}</div></body></html>`
}

function renderTemplateVariantC(ctx: AideScreenTemplateContext, content: ReturnType<typeof getTemplateContent>, serviceName: string): string {
  const keyword = placeholderSafe(ctx.sharedVisualSubject || content.photoKeyword)
  return `<!DOCTYPE html><html lang="ko" data-aide-template-renderer="1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${buildAideTemplateBaseStyle(ctx)}</head><body>
<div class="app-shell">${renderHeader(ctx, serviceName)}
<main class="aide-page">
  <section class="aide-section">
    <article class="aide-card photo-hero">
      <img src="%%SHARED_IMG:${keyword}:900:600%%" alt="">
      <div class="photo-hero-body">
        <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge">${htmlEscape(content.secondaryMetric)}</span><span class="chip">${htmlEscape(content.primaryMetric)}</span></div>
        <h1 style="margin:0;font-size:26px;line-height:1.2">${htmlEscape(content.headline)}</h1>
        <p class="muted" style="margin:0">${htmlEscape(content.subtitle)}</p>
        <a class="primary-cta" href="#">${htmlEscape(content.cta)}</a>
      </div>
    </article>
  </section>
  <section class="category-chips">${content.quickActions.map(action => `<span class="chip">${htmlEscape(action)}</span>`).join('')}</section>
  <section class="aide-section">
    <div class="section-header"><span>추천 탐색</span><a href="#">전체보기</a></div>
    <div class="image-grid">${content.list.slice(0, 2).map(([title, value], index) => `<article class="aide-card image-card"><img src="%%THUMB:${keyword} ${index + 1}:420:320%%" alt=""><div>${htmlEscape(title)}<br><span class="muted">${htmlEscape(value)}</span></div></article>`).join('')}</div>
  </section>
  <section class="aide-section">
    <div class="section-header"><span>${htmlEscape(content.listTitle)}</span><a href="#">더보기</a></div>
    <div class="aide-card content-list">${content.list.map(([title, value, meta]) => `<div class="list-item"><div><div class="list-title">${htmlEscape(title)}</div><div class="list-meta">${htmlEscape(meta)}</div></div><div class="list-value">${htmlEscape(value)}</div></div>`).join('')}</div>
  </section>
</main>${renderBottomNav(['홈', '탐색', '혜택', '마이'])}</div></body></html>`
}

function renderAideScreenTemplate(ctx: AideScreenTemplateContext): string {
  const serviceName = inferDisplayServiceName(ctx.brief, ctx.projectSummary)
  const content = getTemplateContent(ctx.brief, ctx.domain)
  if (ctx.variant === 'B') return renderTemplateVariantB(ctx, content, serviceName)
  if (ctx.variant === 'C') return renderTemplateVariantC(ctx, content, serviceName)
  return renderTemplateVariantA(ctx, content, serviceName)
}

export async function generateUI(params: GenerateParams, apiKey?: string): Promise<GenerateUIResult> {
  const { designMd, brief, answers, projectSummary, logoDataUrl, brandColors, mainOnly = false, variantStyle, referenceImageBase64, referenceImageKind = 'reference', asIsAnalysis, platform, modelId = 'gemini-3.1-pro-preview', heroImagePrompt, heroSubject, sharedVisualMode, sharedVisualSubject, generationPlan, domain, onStep, prdDoc, iaImageBase64, iaText, uiGenerationMode } = params;
  const membershipSceneSubject = isMembershipRewardExperience(brief, domain) ? buildMembershipHeroSceneSubject(brief) : ''
  const effectiveHeroImagePrompt = membershipSceneSubject || heroSubject || heroImagePrompt
  let effectiveSharedVisualMode = sharedVisualMode ?? 'none'
  let effectiveSharedVisualSubject = sharedVisualSubject || heroSubject || heroImagePrompt || projectSummary || brief
  const userDisabled3d = typeof answers?.hero3d === 'string' && answers.hero3d === '사용 안 함'
  if (membershipSceneSubject && !userDisabled3d && !sharedVisualMode) {
    effectiveSharedVisualMode = '3d'
    effectiveSharedVisualSubject = membershipSceneSubject
  }
  const visual3dPrompt = effectiveSharedVisualMode === '3d' ? effectiveHeroImagePrompt : undefined

  const safeAnswers = answers ?? {};
  const answersText = Object.entries(safeAnswers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const hasExplore = Object.values(safeAnswers).some(v =>
    Array.isArray(v) ? v.some(s => String(s).includes('다양하게 보기')) : String(v).includes('다양하게 보기')
  )
  const useMembershipScene = Boolean(membershipSceneSubject && !userDisabled3d)
  const currentVariantLabel = getVariantLabel(variantStyle)
  const isVariantA = currentVariantLabel === 'A'
  const isVariantB = currentVariantLabel === 'B'
  const isVariantC = currentVariantLabel === 'C'

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
    ? '- 서비스 성격(B2C): 탐색, 선택, 구매/예약/신청 흐름을 선명하게 구성한다. CTA, 제품/콘텐츠 카드, 선택 UI는 디자인 시스템의 컴포넌트와 토큰 규칙을 따른다.'
    : serviceType.includes('B2B')
    ? '- 서비스 성격(B2B): 정보 밀도 높은 대시보드, 데이터 테이블·차트 중심, 전문 용어 허용, 컴팩트 레이아웃'
    : ''
  const targetRule = targetAudience.includes('10~20대')
    ? '- 타겟층(청소년·청년): 짧은 텍스트, 빠른 탐색, 공유/반응 요소를 우선하되 색상과 비주얼 톤은 디자인 시스템을 따른다.'
    : targetAudience.includes('40~60대')
    ? '- 타겟층(장년층): 명확한 정보 구조, 읽기 쉬운 텍스트, 단순한 네비게이션, 충분한 터치 영역을 디자인 시스템 범위 안에서 확보한다.'
    : targetAudience.includes('전문가')
    ? '- 타겟층(전문가): 정보 밀도 최대화, 데이터 시각화 적극 활용, 고급 필터·정렬 기능, 컴팩트 UI'
    : ''
  const homeEmphasisRule = homeEmphasis.includes('핵심 지표')
    ? '- 홈 강조(KPI): 핵심 지표, 보조 지표, 추이, 변화량을 디자인 시스템의 typography/card/chart 규칙으로 명확히 보여준다.'
    : homeEmphasis.includes('콘텐츠 탐색')
    ? '- 홈 강조(콘텐츠): 카드 그리드 또는 피드 레이아웃, 이미지 썸네일 강조, 카테고리 필터 칩, 6개 이상 아이템 노출'
    : homeEmphasis.includes('빠른 실행')
    ? '- 홈 강조(CTA): 히어로에 대형 CTA 버튼 또는 검색창 최상단 배치, 바로가기 퀵 액션 그리드(2×3 또는 2×4), 최소 텍스트'
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
    ? '- 3D 이미지: 메인 히어로에서 3D 이미지를 1회 사용한다. contain/oversized crop/small floating 중 화면 목적에 맞게 선택한다.'
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
  ].filter(Boolean).join('\n')

  const effectiveDesignMd = designMd || loadDefaultDesignMd();
  const hasDesignSystem = !!effectiveDesignMd;
  const isAdaptive = hasDesignSystem && /adaptive:\s*true/.test(effectiveDesignMd);
  const isKtds = hasDesignSystem && /name:\s*["']?KTDS/i.test(effectiveDesignMd);
  const isMd3Base = hasDesignSystem && /md3Base:\s*true/.test(effectiveDesignMd) && !isKtds;
  const isMd3 = hasDesignSystem && /(?:^|\n)md3:\s*true/.test(effectiveDesignMd) && !isMd3Base && !isKtds;
  const useReactTailwindExperiment = uiGenerationMode === 'react-tailwind'

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
  const screenBlueprint = buildScreenBlueprint({
    brief,
    domain,
    platform: effectivePlatform,
    variantStyle,
    generationPlan,
    sharedVisualMode: effectiveSharedVisualMode,
    sharedVisualSubject: effectiveSharedVisualSubject,
  })
  const reactTailwindExperimentLayer = buildReactTailwindExperimentLayer(useReactTailwindExperiment, effectivePlatform, isKtds)

  if (useReactTailwindExperiment) onStep?.('UI Kit 실험 모드 적용 중...')

  onStep?.('디자인 인텐트 분석 중...')
  const designIntentPlan = await generateDesignIntentAndHeroVisualPlan({
    brief: `${brief}\n\n[Screen Blueprint]\n${screenBlueprint}`,
    answersText,
    designMd: effectiveDesignMd,
    generationPlan,
    variantStyle,
    platform: effectivePlatform,
    domain,
    heroImagePrompt: visual3dPrompt,
    structuredAnswerRules,
    apiKey,
  })

  const paletteHint = designContract ? extractPaletteHint(designContract) : ''

  onStep?.('레이아웃 구조 설계 중...')
  const [layoutSkeleton] = await Promise.all([
    generateLayoutSkeleton({
      brief: `${brief}\n\nScreen Blueprint:\n${screenBlueprint}`,
      designIntentPlan,
      designContract,
      platform: effectivePlatform,
      apiKey,
    }),
  ])

  if (mainOnly) {
    onStep?.('컴포넌트 템플릿 렌더링 중...')
    let html = renderAideScreenTemplate({
      brief,
      projectSummary,
      platform: effectivePlatform,
      domain,
      variant: currentVariantLabel || 'A',
      designContract,
      hasBrandColors,
      hasLogo: Boolean(logoDataUrl),
      sharedVisualMode: effectiveSharedVisualMode,
      sharedVisualSubject: effectiveSharedVisualSubject,
    })
    html = sanitizeGeneratedBranding(html, brief, effectiveDesignMd, logoDataUrl)
    html = applyLogoDataUrlOnce(html, logoDataUrl)
    html = stripHeaderTextBrandWhenLogoExists(html, brief, logoDataUrl)
    html = ensureVisibleLogoInHeader(html, logoDataUrl)
    html = ensureResponsiveViewportMeta(html)

    let variantDescription: VariantDescription | undefined
    try {
      const jsonMatch = designIntentPlan.match(/```json\n?([\s\S]*?)```/)
      const parsed = jsonMatch
        ? JSON.parse(jsonMatch[1]) as { selectedDesignStrategy?: string; designIntent?: string; layoutThesis?: string }
        : JSON.parse(stripCodeFence(designIntentPlan)) as { selectedDesignStrategy?: string; designIntent?: string; layoutThesis?: string }
      variantDescription = {
        strategy: parsed.selectedDesignStrategy ?? '',
        intent: parsed.designIntent ?? '',
        layoutThesis: parsed.layoutThesis ?? '',
      }
    } catch {
      variantDescription = {
        strategy: currentVariantLabel === 'B' ? 'Immersive Hero' : currentVariantLabel === 'C' ? 'Real Photo Editorial' : 'Card Utility',
        intent: 'Aide component template renderer',
        layoutThesis: currentVariantLabel === 'B'
          ? '전체 배경 히어로와 하단 액션 시트로 전환 흐름을 강화'
          : currentVariantLabel === 'C'
            ? '실사 이미지와 탐색 카드로 에디토리얼 경험을 강화'
            : '카드, KPI, 리스트 중심의 안정적인 실사용 홈',
      }
    }
    return { html, variantDescription, screenBlueprint }
  }

  onStep?.('UI 코드 생성 중...')
  const prompt = `
당신은 선택된 DESIGN.md를 실제 제품 화면으로 옮기는 시니어 프로덕트 디자이너이자 프론트엔드 개발자입니다.
가장 중요한 목표는 "어떤 서비스를 만들든 선택한 디자인 시스템처럼 보이게 만드는 것"입니다.
ktds.md를 선택하면 KTDS 스타일, notion.md를 선택하면 Notion 스타일, uber.md를 선택하면 Uber 스타일이 전체 화면에 일관되게 적용되어야 합니다.

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
- spacing: ⛔ spacing 토큰을 CSS 변수로 :root에 선언 후 var(--spacing-*) 사용. 임의 px 값 직접 사용 절대 금지 (예: padding: 16px 금지 → padding: var(--spacing-base) 사용).
- border-radius: ⛔ rounded 토큰을 --rounded-* CSS 변수로 :root에 선언 후 var(--rounded-*) 사용. 임의 px 값 직접 사용 절대 금지.
- 컴포넌트: YAML frontmatter의 components 섹션을 모든 컴포넌트에 정확히 적용. 토큰 이름 해석 규칙:
  • background / textColor / borderColor / dividerColor 값이 이름이면 → var(--color-{이름}) (예: "primary" → var(--color-primary), "border-alt" → var(--color-border-alt))
  • radius / radiusTop 값이 이름이면 → var(--rounded-{이름}) (예: "md" → var(--rounded-md), "xl" → var(--rounded-xl))
  • padding / paddingX / paddingY 값이 이름이면 → var(--spacing-{이름}) (예: "lg" → var(--spacing-lg), "md" → var(--spacing-md))
  • variants 키 아래 = 독립 스타일 변형(primary/secondary/tertiary 등), states 키 아래 = 동일 컴포넌트의 인터랙션 상태(disabled/focus/error)${hasBrandColors ? '\n  • primary/action/accent 관련 component token만 브랜드 컬러 변수로 치환. surface, neutral, border, disabled, status, card background는 DESIGN.md 값을 유지' : ''}
- 플랫폼(${platformLabel})은 레이아웃 구조·크롬(상태바·네비바·탭바)에만 영향.
${isKtds ? `
╔══════════════════════════════════════════════════════════════╗
║  🏢  KTDS 디자인 시스템 — 컴포넌트 패턴 강제                  ║
╚══════════════════════════════════════════════════════════════╝
KTDS 디자인 시스템(KT DS)을 정확하게 구현하라. 아래 치수·형태·색상을 그대로 적용 — 임의 변경 절대 금지.
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

🧩 KTDS 컴포넌트 스펙 (components 토큰 해석 완료 — 그대로 복제):

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
- 폰트는 DESIGN.md typography.fontFamily를 그대로 사용한다. KTDS가 아닌 시스템에 Pretendard 또는 KTDS 컴포넌트 규칙을 섞지 않는다.
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
${isKtds ? `> - [ ] ⛔ KTDS 치수 준수: 일반 Button height 48px/radius 8px, Input default 32px, Card radius 16px를 지켰는가?
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
${logoDataUrl ? `\n## ⚠️ 브랜드 로고 슬롯 (CRITICAL)\n- 로고 이미지를 직접 작성하지 마세요. src, data URL, placeholder 이미지, 텍스트 로고를 만들지 마세요.\n- 모든 화면의 GNB/헤더/앱바 브랜드 위치에 반드시 아래 슬롯을 1회만 삽입하세요.\n${AIDE_LOGO_SLOT_HTML}\n- Aide가 생성 후 마지막 단계에서 이 슬롯을 실제 업로드 로고 이미지로 치환합니다.\n- 텍스트 브랜드명(앱 이름, 서비스명 등)으로 대체 금지. 로고 슬롯이 항상 우선입니다.\n- 로고가 있으면 같은 헤더/앱바 안에 앱 이름 텍스트 브랜드를 함께 쓰지 마세요. 예: 로고 + "KT 멤버십" 나란히 배치 금지. 서비스명은 본문 hero/headline/context에서만 사용하세요.\n- ❌ 히어로 배경, 대형 이미지, 히어로 카드 안에 슬롯을 넣지 마세요. 헤더/앱바 전용입니다.\n- ❌ 로고를 화면 폭의 큰 영역으로 확대하지 마세요. 헤더/앱바 안의 작은 브랜드 영역만 예약하세요.` : `\n## 브랜드명 표시 규칙\n- 로고 입력이 없습니다. 앱/서비스 브랜드는 텍스트로 표시하세요.\n- <img src="FreshFit">처럼 존재하지 않는 로고 이미지를 만들지 마세요.\n- 선택된 디자인 시스템의 로고나 회사명(예: kt ds)을 최종 서비스 로고로 표시하지 마세요.`}
${hasBrandColors ? `\n## 브랜드 컬러 적용 규칙\n로고에서 추출한 브랜드 컬러는 사용자의 회사 정체성을 반영하기 위한 값입니다. DESIGN.md가 기본 UI 품질과 컴포넌트 구조를 보장하고, 브랜드 컬러는 primary/action/accent 계열만 치환합니다.\n\n메인 브랜드 컬러: ${brandColors![0]}${brandColors![1] ? `\n보조 브랜드 컬러: ${brandColors![1]}` : ''}${brandColors!.length > 2 ? `\n추가 브랜드 컬러: ${brandColors!.slice(2).join(', ')}` : ''}\n\nCSS 변수 선언 규칙:\n- --color-primary, --color-primary-text, --color-primary-fill, --color-primary-border, --color-primary-icon 등 primary/action/accent 계열은 브랜드 컬러 기반으로 선언\n- --color-secondary는 보조 브랜드 컬러가 있을 때만 선언\n- --color-surface, --color-surface-alt, --color-background, --color-text, --color-border, --color-fill, --color-disabled, --color-positive, --color-caution, --color-negative, --color-info 등 neutral/surface/background/border/status 계열은 DESIGN.md 값을 유지\n- spacing, rounded, typography, component height/padding/radius/card rules는 DESIGN.md 값을 유지\n- 브랜드 컬러와 DESIGN.md 토큰 외 임의 hex 사용 금지\n- CTA, 주요 액션, 활성 탭, 링크, primary icon에만 브랜드 컬러를 사용하고 카드 배경/페이지 배경/본문 텍스트를 브랜드 컬러로 덮지 않음` : ''}
${asIsAnalysis ? `\n## As-is URL 구조 분석 — 리디자인 대상 정보 구조 (스타일 금지)\n아래 데이터는 기존 서비스의 정보 구조, 섹션 순서, 주요 CTA, 내비게이션, 콘텐츠 재료를 파악하기 위한 것입니다.\n\n절대 규칙:\n- As-is URL의 색상, 폰트, 라운드, 카드 그림자, 아이콘 스타일, 시각 톤을 복사하지 마세요.\n- 최종 시각 스타일은 DESIGN.md와 브랜드 규칙만 따릅니다.\n- As-is는 \"무엇을 유지/개선할지\" 판단하는 입력입니다.\n- 기존 화면의 핵심 섹션/CTA/콘텐츠 의미는 유지하되, 정보 위계·스캔성·반응형 레이아웃·CTA 발견성을 개선하세요.\n\n분석 JSON:\n\`\`\`json\n${JSON.stringify(asIsAnalysis, null, 2).slice(0, 12000)}\n\`\`\`` : ''}
${prdDoc?.trim() ? `\n## PRD / IA 문서 (기획 문서 원문 — 화면 구조·메뉴·플로우의 근거)\n아래는 사용자가 첨부한 PRD·IA·메뉴 구조 문서입니다.\n- 이 문서에 명시된 메뉴 구조, 화면 목록, 핵심 기능, 유저 플로우를 UI 레이아웃과 네비게이션 설계에 정확히 반영하세요.\n- 기획서 요약(brief)보다 이 문서가 화면 구성의 우선 근거입니다.\n- 스타일·컬러·타이포그래피는 DESIGN.md를 따릅니다.\n\`\`\`\n${prdDoc.slice(0, 10000)}\n\`\`\`` : ''}
## 프로젝트 개요
${projectSummary}

## 기획서
${brief}

## Brand / Language / Content Consistency Rules (CRITICAL)
- 모든 시안의 헤더에는 명확한 앱 브랜드가 있어야 합니다. 로고가 제공되었으면 \`aide-brand-logo\` 이미지만 사용하고, 같은 헤더 안에 앱 이름 텍스트 브랜드를 함께 표시하지 마세요. 로고가 없을 때만 앱 이름 텍스트 브랜드를 생성해 표시하세요.
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
아래 JSON은 이번 배치의 공통 설계안입니다. A/B/C는 이 계획을 공유해야 하며, 여기서 정한 제품 의도·공통 visual asset·variant 역할을 벗어나면 실패입니다.
${generationPlan ? `\`\`\`json\n${JSON.stringify(generationPlan, null, 2)}\n\`\`\`` : '(공통 생성 계획 없음 — 아래 Shared Visual Asset Strategy와 Design Intent를 기준으로 생성)'}

적용 규칙:
- productBrief.coreObjects와 keyActions는 실제 UI 콘텐츠로 나타나야 합니다.
- 브리프에 기능이 여러 개 있으면 첫 화면에 모두 힌트가 보여야 합니다. 예: 포인트/쿠폰/등급/제휴매장/QR 결제 브리프라면 첫 viewport 안에 잔여 포인트, 최근 적립/사용, 보유 쿠폰, 등급 리워드, 주변 매장 또는 QR 결제 진입이 최소 요약 형태로 보여야 합니다.
- visualStrategy.sharedAsset이 true면 A/B/C는 같은 소재를 쓰고, 배치/crop/scale만 달라야 합니다.
- visualStrategy.mode가 none/data 계열이면 이미지로 빈 공간을 채우지 말고, 차트/테이블/리스트/KPI/필터/액션 패널 같은 실제 UI 컴포넌트로 완성도를 만들어야 합니다.
- variantDirector의 A/B/C 역할은 해당 시안의 정보 구조와 첫 화면 구성에 반드시 반영해야 합니다.
- 시안 차이를 랜덤 이미지, 랜덤 색상, 랜덤 radius, 랜덤 shadow로 만들지 마세요. 디자인 시스템은 공유하고 UX 방향만 다르게 만드세요.

## Screen Blueprint — 필수 정보/기능 계약 (CRITICAL, 와이어프레임 아님)
아래 JSON은 픽셀 스켈레톤이 아니라 "무엇이 반드시 보여야 하는가"에 대한 계약입니다.
섹션 순서와 카드 형태를 그대로 박스화하지 말고, 선택한 DESIGN.md 안에서 완성도 높은 UI로 재해석하세요.

\`\`\`json
${screenBlueprint}
\`\`\`

적용 규칙:
- requiredContentSlots의 항목은 최종 UI에 직접 드러나야 합니다.
- firstViewportSlots는 ${effectivePlatform === 'web' ? '1440x1024 첫 화면' : '390x844 첫 화면'}에서 판단 가능해야 합니다.
- dataExamples 수준의 구체적인 수치/상태/메타 정보를 카드와 리스트에 넣으세요.
- primaryCtas 중 하나 이상은 실제 버튼/링크로 구현하세요.
- antiSkeletonRules를 반드시 지키세요. 블루프린트를 회색 박스/와이어프레임처럼 복사하면 실패입니다.

${reactTailwindExperimentLayer}

## 시안 선택용 정보 밀도 계약 (CRITICAL)
Aide의 A/B/C는 최종 빈 랜딩 포스터가 아니라 사용자가 방향을 고르는 "기능 비교 시안"입니다. 따라서 모든 시안은 보기 좋으면서도 충분히 많은 실제 정보를 담아야 합니다.

공통 최소 기준:
- 첫 viewport에 최소 5개 이상의 콘텐츠 단위가 보여야 합니다: 브랜드/현재 상태, 핵심 KPI, primary CTA, 퀵 액션 3~5개, 목록/카드 2개 이상, 섹션 힌트 중 최소 5개.
- 첫 viewport 안의 한국어 실제 문구는 최소 180자 수준이어야 합니다. 라벨만 있고 설명/메타/수치가 없으면 실패입니다.
- 각 카드/리스트 항목은 제목만 두지 말고 보조 설명, 수치/상태/시간/가격/등급 같은 메타 정보, 가능한 액션을 포함하세요.
- 브리프의 핵심 기능어는 화면에 직접 등장해야 합니다. 기능을 한두 개만 선택해서 나머지를 생략하면 실패입니다.
- 시안 A/B/C 모두 같은 수준의 정보량을 가져야 합니다. B가 비주얼 임팩트형이어도 콘텐츠가 비면 실패입니다.

시안별 밀도 기준:
- 시안 A: 대시보드/정보형. KPI 3개 이상, 최근 항목 2개 이상, 퀵 액션 3개 이상.
- 시안 B: 전체 배경 히어로형. hero/scene은 첫 viewport의 45~55%까지 허용하되, HTML CTA + proof/KPI row 2개 이상 + 다음 콘텐츠 카드 1개 이상이 첫 화면 안에 이어져야 합니다.
- 시안 C: 실사 이미지/에디토리얼형. 카테고리 칩 4개 이상, 실사 이미지 카드/추천 카드 2개 이상, CTA와 보조 메타를 포함하세요.

## Variant Visual Strategy — 현재 시안의 고정 비교 축 (CRITICAL)
Aide의 A/B/C는 같은 이미지를 돌려 쓰는 변주가 아니라, 서로 다른 비주얼 문법을 비교하는 시안입니다.
현재 생성 중인 시안: ${currentVariantLabel || 'unknown'}
현재 visual mode: ${effectiveSharedVisualMode}
현재 visual subject: ${effectiveSharedVisualSubject}

시안별 고정 원칙:
- 시안 A: 기본 카드/정보형. 대형 히어로, 풀블리드 배경, 큰 3D scene, 큰 실사 이미지를 만들지 마세요. KPI, 리스트, 퀵 액션, 상태 카드가 주인공입니다.
- 시안 B: 전체 배경 히어로형. 서비스 성격에 맞는 3D scene 또는 강한 hero visual이 상단을 지배하고, HTML headline/CTA/proof row가 그 위나 바로 아래 action panel에 결합됩니다.
- 시안 C: 실사 이미지/에디토리얼형. Unsplash/실사 이미지, 카테고리 rail, 이미지 카드/그리드, 추천/탐색 흐름이 주인공입니다. 3D를 주인공으로 쓰지 마세요.

${isVariantA ? `- 현재는 시안 A입니다. 이미지가 필요해도 작은 썸네일/아이콘 수준만 허용합니다. 3D placeholder와 큰 hero image placeholder를 사용하지 마세요.` : ''}
${isVariantB ? `- 현재는 시안 B입니다. 전체 배경 히어로형으로 생성하세요. 가능한 경우 아래 배경 포함 3D scene placeholder를 사용하고, scene 위에는 HTML 텍스트/칩/CTA만 올리세요. 작은 중앙 오브젝트 박스는 실패입니다.` : ''}
${isVariantC ? `- 현재는 시안 C입니다. 실사 이미지/에디토리얼형으로 생성하세요. 메인 비주얼은 %%SHARED_IMG:keyword:900:600%% 또는 도메인에 맞는 %%THUMB:keyword:width:height%%를 사용하고, 3D scene을 주인공으로 쓰지 마세요.` : ''}

${effectiveSharedVisualMode === '3d' ? `- 이 시안은 3D hero visual을 사용합니다. 역할에 따라 아래 둘 중 하나를 선택하세요.
  * 투명 오브젝트/마스코트: <img class="aide-hero-3d" src="%%SHARED_HERO_3D:${effectiveSharedVisualSubject.replace(/%/g, '')}%%" alt="">
  * 배경 포함 히어로 씬: <img class="aide-hero-3d aide-hero-scene-img" src="%%SHARED_HERO_3D_SCENE:${effectiveSharedVisualSubject.replace(/%/g, '')}%%" alt="">
${useMembershipScene ? `- 이 브리프는 멤버십/포인트/쿠폰/리워드 경험입니다. 기본 전략은 독립 3D 오브젝트가 아니라 "상단 immersive 3D scene + HTML overlay + 하단 white content sheet"입니다.
- 현재 시안이 B라면 가능하면 %%SHARED_HERO_3D_SCENE%%을 사용하세요. 투명 오브젝트만 쓰면 KT 멤버십 앱처럼 녹아든 장면이 아니라 빈 박스에 얹힌 이미지가 되므로 실패입니다.
- scene 상단/좌측 safe area에는 HTML로 브랜드, 인사말, 등급, 포인트, 쿠폰 chip을 배치하고, scene 이미지 자체에는 텍스트/로고/UI를 절대 넣지 마세요.
- scene 하단은 곡선 white sheet/card가 겹치게 구성하세요: .content-sheet { position:relative; z-index:3; margin-top:-48px; border-radius:36px 36px 0 0; }
- 캐릭터/리워드 오브젝트는 화면 하단 중앙/우측에서 크게 크롭되어야 하며, 작은 중앙 스티커처럼 보이면 실패입니다.` : ''}
- 캐릭터, 식물 companion, 성장, 리워드, 게임, 감성 온보딩, 공간감이 중요한 서비스는 %%SHARED_HERO_3D_SCENE%%을 우선 사용하세요. 배경까지 포함한 3D scene이 더 자연스럽습니다.
- %%SHARED_HERO_3D_SCENE%%을 사용할 때는 반드시 "상단/배경 visual stage + 별도 action/content panel" 구조로 구현하세요. scene 이미지 위에 큰 헤드라인/CTA를 올리거나, 작은 배너 이미지처럼 삽입하면 실패입니다.
- scene img CSS는 .aide-hero-scene-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; } 여야 합니다. width:auto, height:auto, object-fit:contain, 작은 inset thumbnail은 실패입니다.
- scene image 자체에 텍스트, 버튼, 로고, 앱바, 검색/알림 아이콘이 들어간 것처럼 보이면 실패입니다. 모든 UI 요소는 HTML/CSS로 별도 작성하세요.
- 현재 시안 B라면 큰 hero card 안에서 3D가 stage 폭의 55~85% 또는 scene area 전체를 차지해야 합니다. 작은 중앙 스티커는 실패입니다.
- 멤버십/포인트/쿠폰/리워드 화면에서 투명 3D를 쓰면 반드시 포인트 숫자, VIP badge, 쿠폰/QR CTA와 같은 card surface 안에 결합하세요. 3D만 들어 있는 light-blue/white 이미지 박스를 만들고 텍스트를 아래에 분리하면 실패입니다.
- 투명 3D stage에는 CSS background layer, radial-gradient, subtle pattern, token surface, clipped/cropped edge 중 최소 2개를 사용해 UI surface에 녹이세요. 단 이미지 파일 자체 shadow는 금지입니다.
- %%HERO_SCENE_3D%%, %%MASCOT_3D%%, %%REWARD_OBJECT_3D%%를 새로 여러 개 만들지 마세요. 특별한 이유가 없으면 shared placeholder만 사용합니다.` : effectiveSharedVisualMode === 'photo' ? `- 현재 시안은 실사 이미지/에디토리얼 visual을 사용합니다. 메인 이미지 placeholder: <img src="%%SHARED_IMG:${effectiveSharedVisualSubject.replace(/[%:]/g, '')}:900:600%%" alt="">
- 3D를 억지로 쓰지 마세요. 음식, 여행, 장소, 실제 제품/활동, 멤버십 혜택 탐색 맥락에서는 실사 이미지가 더 자연스럽습니다.
- 현재 시안 C라면 큰 photo crop, category rail, image cards/grid를 사용하세요.
- 현재 시안 B가 3D 비활성화로 photo mode가 된 경우 photo를 전체 배경 hero처럼 크게 사용하세요.
- 필요하면 반복 리스트에는 %%THUMB:keyword:width:height%%를 추가로 쓰세요.` : `- 현재 시안은 이미지보다 정보 구조가 중요합니다. 3D/실사를 억지로 넣지 마세요.
- 차트, KPI, 리스트, 테이블, 필터, 액션 패널, 상태 배지 등 실제 UI 컴포넌트로 완성도를 만드세요.
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
- 최소 5개 이상의 콘텐츠 단위가 보여야 합니다: 예) 상태 요약, CTA, 추천/목록 카드, 진행률/차트, 퀵 액션, 알림/피드.
- 브리프에 나열된 핵심 기능은 첫 화면 또는 바로 이어지는 섹션 힌트에 모두 반영하세요. 멤버십 앱이면 포인트, 적립/사용 내역, 쿠폰, 등급 리워드, 제휴 매장, QR 결제 중 4개 이상이 첫 viewport에 보여야 합니다.
- 시안 B도 빈 히어로 포스터가 아닙니다. hero visual + primary CTA를 중심으로 하되, 같은 첫 화면 안에 보조 KPI/퀵 액션/리스트 힌트를 반드시 넣으세요.
- 큰 여백은 의도적 계층을 만들 때만 사용하고, 빈 공간을 메우기 위한 장식 이미지는 금지합니다.

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
- 3D가 부자연스러운 시안에서는 heroVisualPlan에 따라 실사/콘텐츠 썸네일로 전환하세요.

${layoutSkeleton ? `## 레이아웃 스켈레톤 (MANDATORY — 아래 섹션 구조와 :root 변수값을 그대로 사용)
이 스켈레톤은 위 Design Intent를 바탕으로 사전 확정된 레이아웃 구조입니다.
- SECTIONS 순서대로 HTML 섹션을 배치하세요
- NAV_TYPE과 HERO_TYPE을 그대로 따르세요
- FIRST_VIEWPORT의 정보/CTA/콘텐츠 단위가 실제 첫 화면에 보이게 하세요
- MEDIA_INTEGRATION에 따라 이미지/3D를 layout의 일부로 통합하세요
- CARD_RHYTHM에 따라 반복 컴포넌트의 spacing/radius/border/shadow를 통일하세요
- :root 블록의 CSS 변수값을 수정 없이 그대로 선언하세요 (직접 px/hex 사용 금지)

\`\`\`
${layoutSkeleton}
\`\`\`
` : ''}
${buildArtDirectionLayer(effectivePlatform)}

${buildBrandAndChromeLayer(effectivePlatform, Boolean(logoDataUrl))}

${buildDesignDirectionSelectorLayer(visual3dPrompt, variantStyle, domain)}

${buildHeroVisualIntegrationLayer(visual3dPrompt, variantStyle, domain)}

${buildMediaLayoutSafetyLayer(visual3dPrompt)}

${buildQualityRules(visual3dPrompt, domain)}

${mainOnly ? `### 단일 메인 화면 (비교 선택용)
기획서의 핵심 메인 화면 1개만 구현하세요.
- ${effectivePlatform === 'web' ? '서비스에서 가장 중요한 홈/대시보드 화면 (웹 레이아웃 — 1440px 기준)' : '앱에서 가장 중요한 홈/대시보드 화면'}
- aide-screen 클래스, 라우터 스크립트 불필요
- 한 화면에 담기는 레이아웃 (overflow: hidden)
- 첫 화면 안에 실제 서비스 콘텐츠가 충분히 보여야 한다. 상단 영역만 만들고 아래를 비워두면 실패.
- ${effectivePlatform === 'mobile' ? '모바일 앱은 390px 내외 폭에서도 텍스트가 가로로 자연스럽게 읽혀야 한다. 세로 글자, 잘린 카드, 하단 내비와 겹친 콘텐츠는 실패.' : '웹 화면은 1440px 기준에서 좌우 컬럼, 카드 그리드, 리스트가 균형 있게 채워져야 한다.'}
- 배달/커머스류 홈이면 최소한 검색/주소, 카테고리, 추천 메뉴 또는 가게 카드 여러 개, 가격/평점/시간, 장바구니/주문 액션이 첫 화면에 보여야 한다.
- 단일 메인 화면은 "상단만 예쁜 포스터"가 아니라 실제 서비스 홈이어야 한다. 첫 viewport 안에 최소 4개 콘텐츠 단위(요약/CTA/탐색/리스트 또는 카드)가 보여야 한다.
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
- 세 시안 모두 3D 오브젝트만 반복하거나, 세 시안 모두 같은 실사 카드 구조만 반복하지 마십시오. 단, 억지로 할당하지 말고 서비스 목적에 맞는 가장 자연스러운 조합을 선택하십시오.
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
- stock photo·외부 이미지 URL을 직접 작성하지 말고, 이미지가 필요한 곳에는 위 규칙의 %%SHARED_HERO_3D%% / %%SHARED_HERO_3D_SCENE%% / %%SHARED_IMG:keyword:width:height%% / %%HERO_SCENE_3D%% / %%MASCOT_3D%% / %%REWARD_OBJECT_3D%% / %%HERO_3D_IMAGE%% / %%IMG_n:설명%% / %%THUMB:keyword:width:height%% 플레이스홀더만 사용
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

  const text = images.length > 1
    ? await generateProWithMultipleImages(fullPrompt, images, apiKey, modelId)
    : images.length === 1
      ? await generateProWithImage(fullPrompt, images[0].data, images[0].mimeType, apiKey, modelId)
      : await generatePro(fullPrompt, apiKey, modelId)

  let html: string
  const htmlMatch = text.match(/```html\n?([\s\S]*?)```/);
  if (htmlMatch) {
    html = htmlMatch[1]
  } else {
    const htmlTagMatch = text.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    html = htmlTagMatch ? htmlTagMatch[0] : text
  }

  html = sanitizeGeneratedBranding(html, brief, effectiveDesignMd, logoDataUrl)
  html = applyLogoDataUrlOnce(html, logoDataUrl)
  html = stripHeaderTextBrandWhenLogoExists(html, brief, logoDataUrl)
  html = ensureVisibleLogoInHeader(html, logoDataUrl)

  onStep?.('디자인 계약 검수 중...')
  const staticContractResult = await enforceStaticDesignContract(html, {
    brief,
    designMd: effectiveDesignMd,
    apiKey,
    logoDataUrl,
    domain,
    hasBrandColors,
  })
  html = staticContractResult.html
  html = auditSpacingTokens(html, designContract)

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

  return { html, variantDescription, screenBlueprint }
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
${preservedImageGuide}
${designMd ? `\n## 디자인 시스템 (서브 화면에도 동일하게 적용 — 임의 색상·폰트 사용 절대 금지)\n${extractDesignMdForPrompt(designMd)}\n` : ''}${expandBrandColors && expandBrandColors.length > 0 ? `\n## 브랜드 컬러 적용\n- primary/action/accent 계열만 브랜드 컬러로 유지: --color-primary: ${expandBrandColors[0]};${expandBrandColors[1] ? ` --color-secondary: ${expandBrandColors[1]};` : ''}\n- neutral/surface/background/border/status 색상, spacing, rounded, typography, component sizing은 DESIGN.md 값을 유지\n- 카드 배경, 페이지 배경, 본문 텍스트를 브랜드 컬러로 덮지 말 것\n` : ''}
${designSystemContract ? `\n${designSystemContract}\n\n## Contract 유지 규칙\n- 서브 화면도 메인 화면과 동일한 Design System Contract와 rhythm variables를 사용하세요.\n- 새로 만드는 카드/리스트/폼/버튼은 메인 화면의 padding/gap/radius/border/shadow 정책을 복제하세요.\n- A/B/C 선택 이후 전체 페이지 확장 단계에서 새로운 spacing scale이나 임의 radius를 만들면 실패입니다.\n` : ''}
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
  html = stripHeaderTextBrandWhenLogoExists(html, brief, expandLogoUrl)
  html = ensureVisibleLogoInHeader(html, expandLogoUrl)
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
  result = stripHeaderTextBrandWhenLogoExists(result, brief, logoDataUrl)
  result = ensureVisibleLogoInHeader(result, logoDataUrl)
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
  ]
}
`;

  try {
    const text = await generatePro(prompt, apiKey, 'gemini-3.1-pro-preview');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { variables: [], states: [] };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { variables: [], states: [] };
  }
}
