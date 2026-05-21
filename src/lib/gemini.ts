import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { type AppDomain, DOMAIN_KEY_TO_LABEL } from './domain-constants';
export type { AppDomain } from './domain-constants';
export { DOMAIN_KEY_TO_LABEL, DOMAIN_LABEL_TO_KEY } from './domain-constants';

function getAi(apiKey?: string) {
  return new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! })
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
}

export async function analyzeUrlToDesignMd(
  screenshotBase64: string,
  url: string,
  sourceData?: UrlSourceData,
  apiKey?: string,
  captureStatus?: 'full' | 'partial' | 'blocked',
): Promise<string> {
  const sourceSection = sourceData
    ? `\n\n## Extracted Source Code Data\n\nUse this raw source data as the PRIMARY source of truth for tokens — these are actual computed values from the browser, not visual estimates.\n\n### Computed Element Styles (MOST ACCURATE — use these for color/typography tokens)\n\`\`\`\n${sourceData.computedStyles || '(none found)'}\n\`\`\`\n\n### CSS Custom Properties (Design Tokens)\n\`\`\`\n${sourceData.cssVariables || '(none found)'}\n\`\`\`\n\n### Font Family Declarations\n\`\`\`\n${sourceData.fontFamilies || '(none found)'}\n\`\`\`\n\n### HTML Class Patterns (Tailwind / CSS modules)\n\`\`\`\n${sourceData.htmlClasses || '(none found)'}\n\`\`\`\n`
    : ''

  const accessNote = captureStatus === 'blocked'
    ? `\n\n⚠️ SECURITY BLOCK DETECTED: This site blocked automated access (Cloudflare / 403 / bot protection). The screenshot may show an error or security page, NOT the real site design. You CANNOT see the actual product UI.\n\nFallback strategy — apply ALL of the following:\n1. Extract any brand/logo colors visible in the screenshot (even from a partial logo or favicon). Use those as primary/secondary.\n2. Infer the industry from the URL domain name (e.g., ".bank" → finance; "shop" → commerce).\n3. Build a clean, professional generic design system appropriate for that industry.\n4. Use system fonts (Pretendard, Noto Sans KR, or Inter) as the typography fallback.\n5. In the DESIGN.md description field, explicitly note: "보안 차단으로 인해 실제 사이트 디자인을 확인할 수 없어 로고 색상 추출 + 범용 디자인시스템으로 생성됨".\n`
    : captureStatus === 'partial'
    ? `\n\n⚠️ LIMITED SOURCE ACCESS: CSS extraction was restricted (cross-origin or dynamic rendering). Rely primarily on the screenshot for visual color/font analysis.\n`
    : ''

  const prompt = `You are a design system expert. Analyze the provided screenshot of "${url}" AND the extracted source code data below to produce an accurate DESIGN.md file.${accessNote}${sourceSection}

Output ONLY the raw DESIGN.md content — no explanations, no code fences, no markdown wrappers. Start directly with the YAML frontmatter.

Follow the Google DESIGN.md specification exactly:

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
  fontFamily: "[detected font or closest match]"
  display: { fontSize: "Xpx", fontWeight: "700", lineHeight: "1.1" }
  h1: { fontSize: "Xpx", fontWeight: "700", lineHeight: "1.2" }
  h2: { fontSize: "Xpx", fontWeight: "600", lineHeight: "1.25" }
  h3: { fontSize: "Xpx", fontWeight: "600", lineHeight: "1.3" }
  body: { fontSize: "Xpx", fontWeight: "400", lineHeight: "1.5" }
  bodySmall: { fontSize: "Xpx", fontWeight: "400", lineHeight: "1.5" }
  label: { fontSize: "Xpx", fontWeight: "500", lineHeight: "1.4" }
  caption: { fontSize: "Xpx", fontWeight: "400", lineHeight: "1.4" }
rounded:
  none: "0px"
  sm: "Xpx"
  md: "Xpx"
  lg: "Xpx"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
  16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "Xpx Xpx"
    height: "Xpx"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "Xpx Xpx"
    height: "Xpx"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "Xpx Xpx"
    height: "Xpx"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.lg}"
    padding: "Xpx"
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
- If CSS custom properties are provided, extract exact hex/token values from them directly — do NOT estimate visually.
- If Tailwind classes are present (e.g. bg-blue-500, rounded-lg, text-sm), infer the design scale from them.
- Use ONLY hex colors (no rgb/rgba). Convert rgba to the nearest opaque hex.
- Detect the dominant color palette from backgrounds, CTAs, and text.
- Use CSS font-family declarations when available; fall back to visual inference.
- Infer font sizes from visual hierarchy (display > h1 > body > caption).
- Detect border-radius from buttons and cards.
- Be specific and accurate — this will be used to generate UI.`;

  return generateFlashWithImage(prompt, screenshotBase64, 'image/png', apiKey);
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

export interface QuestionnaireResponse {
  questions: Question[];
  projectSummary: string;
  heroImageDecision?: HeroImageDecision;
  domain?: AppDomain;
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
    const filePath = path.join(process.cwd(), 'src', 'lib', 'default-design.md');
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
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
  platform?: PlatformType;
  modelId?: string;
  heroImagePrompt?: string;
  heroSubject?: string;
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
  _designMd: string,
  brief: string,
  platform?: 'mobile' | 'web',
  apiKey?: string,
): Promise<QuestionnaireResponse> {
  const prompt = `
당신은 제품 기획자입니다. 기획서를 분석해 아래 세 가지만 추출하세요.

## 기획서
${brief}

## 3D 히어로 이미지 판단

히어로 섹션에 AI 생성 3D 이미지가 필요한지 판단하세요.

**generate: true 조건 (모두 해당할 때):**
- B2C 랜딩페이지 / 브랜드 소개 / 제품 쇼케이스
- 앱·서비스 소개 페이지 (SaaS, 스타트업, 앱 마케팅)
- 포트폴리오 / 에이전시 홈
- premium 분위기가 핵심인 브랜드

**generate: false 조건 (하나라도 해당하면):**
- 내부 대시보드 / 관리자 툴 / B2B 엔터프라이즈
- 모바일 앱 메인화면 (랜딩이 아닌 실제 앱)
- 플랫폼 = ${platform === 'web' ? 'web' : 'mobile'} (모바일 앱이면 무조건 false)
- 정보 조회·CRUD·폼 위주 서비스
- 커뮤니티·SNS·뉴스 피드 서비스

generate: true일 때:
- prompt는 **영어**로, 3D 제품/서비스 시각화에 적합한 프롬프트 작성:
  - 스타일: photorealistic 3D render, studio lighting, clean background
  - 예: "3D render of a sleek smartphone with glowing blue UI, floating above white surface, soft caustic lighting, product hero shot, 4K"
- heroSubject는 이 서비스를 상징하는 **단일 오브젝트**를 **영어 명사구** 2~5단어로 작성:
  - 예: "a sleek smartphone", "a credit card", "a running shoe", "a delivery box", "a laptop with UI"
  - 반드시 isometric 3D 아이콘으로 표현 가능한 구체적 사물이어야 함

generate: false일 때: heroSubject는 빈 문자열("")로 설정

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
  "heroImageDecision": {
    "generate": false,
    "reason": "판단 근거 한 줄",
    "prompt": "",
    "heroSubject": ""
  }
}
`;

  const text = await generateFlashNoThinking(prompt, apiKey);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse questionnaire JSON');

  const parsed = JSON.parse(jsonMatch[0]) as { projectSummary: string; domain: AppDomain; heroImageDecision?: HeroImageDecision };

  const inferredDomainLabel = parsed.domain ? (DOMAIN_KEY_TO_LABEL[parsed.domain] ?? '기타') : '기타'

  const fixedQuestions: Question[] = [
    {
      id: 'service_type',
      question: '서비스 성격이 어떻게 되나요?',
      description: '사용자 타입에 따라 UI 밀도와 정보 구조가 달라집니다',
      type: 'single',
      options: ['B2C — 일반 사용자 대상', 'B2B — 기업/업무용'],
    },
    {
      id: 'domain',
      question: '서비스 도메인(업종)은 무엇인가요?',
      description: `AI가 "${inferredDomainLabel}"로 추론했습니다. 다르다면 변경해 주세요`,
      type: 'single',
      options: Object.values(DOMAIN_KEY_TO_LABEL),
    },
    {
      id: 'target_audience',
      question: '주 사용자층은 누구인가요?',
      description: '타겟층에 맞게 폰트 크기, 네비게이션 복잡도, 시각적 톤을 조정합니다',
      type: 'single',
      options: ['10~20대 청소년·청년', '20~40대 일반 직장인', '40~60대 장년층', '전문가·파워유저'],
    },
    {
      id: 'home_emphasis',
      question: '홈 화면에서 가장 강조하고 싶은 것은?',
      description: '히어로 섹션 구성과 첫 화면 핵심 콘텐츠가 결정됩니다',
      type: 'single',
      options: ['핵심 지표·KPI (숫자·대시보드)', '콘텐츠 탐색·피드 (리스트·카드)', '빠른 실행·CTA (버튼·검색)', '최근 활동·히스토리'],
    },
    {
      id: 'mood',
      question: '서비스의 전체 분위기·무드는?',
      description: '색상 톤, 타이포그래피, 컴포넌트 스타일 방향이 결정됩니다',
      type: 'single',
      options: ['전문적·신뢰감 (블루·그레이 계열)', '친근하고 따뜻한 (오렌지·그린 계열)', '세련되고 고급스러운 (다크·미니멀)', '활기차고 젊은 (비비드 컬러)'],
    },
  ]

  return {
    projectSummary: parsed.projectSummary,
    domain: parsed.domain,
    heroImageDecision: parsed.heroImageDecision,
    questions: fixedQuestions,
  }
}

function extractDesignMdForPrompt(designMd: string): string {
  if (!designMd) return designMd;

  // Extract YAML frontmatter — all design tokens (spacing, colors, typography, rounded, components)
  const yamlMatch = designMd.match(/^---\n([\s\S]*?)\n---/);
  const yaml = yamlMatch ? `---\n${yamlMatch[1]}\n---` : '';

  // Extract CSS Implementation section — pre-built :root {} block with all CSS variables
  const cssMatch = designMd.match(/##\s*CSS Implementation\b[\s\S]*?(?=\n## |\s*$)/);
  const cssBlock = cssMatch ? cssMatch[0].trim() : '';

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

export async function resolveImagePlaceholders(
  html: string,
  options: {
    heroImagePrompt?: string;
    heroImageData?: { base64: string; mimeType: string } | null;
    apiKey?: string;
  } = {}
): Promise<string> {
  const { heroImagePrompt, heroImageData, apiKey } = options
  let result = html

  if (result.includes('%%HERO_3D_IMAGE%%')) {
    let heroImg = heroImageData ?? null
    if (!heroImg && heroImagePrompt) {
      heroImg = await generateHeroImage(heroImagePrompt, apiKey)
    }
    if (heroImg) {
      result = result.split('%%HERO_3D_IMAGE%%').join(`data:${heroImg.mimeType};base64,${heroImg.base64}`)
    } else {
      result = result.split('%%HERO_3D_IMAGE%%').join(
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      )
    }
  }

  const imgMatches = [...result.matchAll(/%%IMG_\d+:([^%]+)%%/g)].slice(0, 3)
  if (imgMatches.length > 0) {
    const generatedImgs = await Promise.all(
      imgMatches.map(m => generateHeroImage(m[1].trim(), apiKey))
    )
    for (let i = 0; i < imgMatches.length; i++) {
      const full = imgMatches[i][0]
      const desc = imgMatches[i][1].trim()
      const img = generatedImgs[i]
      if (img) {
        result = result.split(full).join(`data:${img.mimeType};base64,${img.base64}`)
      } else {
        const keyword = desc.split(/\s+/).find((w: string) => w.length > 3)?.toLowerCase() ?? 'product'
        result = result.split(full).join(`https://loremflickr.com/400/400/${keyword}`)
      }
    }
  }

  return result
}

function buildCreon3DPrompt(subject: string): string {
  const lines: string[] = []
  lines.push(`🚨🚨🚨 CRITICAL STYLE REQUIREMENT 🚨🚨🚨`)
  lines.push(`You MUST generate this icon in the EXACT same visual style as the reference Creon 3D icon sheet.`)
  lines.push(`The style is NON-NEGOTIABLE and must be applied to ANY subject, regardless of what the subject is.`)
  lines.push(`STYLE CHARACTERISTICS (MANDATORY FOR ALL ICONS):`)
  lines.push(`- Smooth, glossy plastic material with high-gloss finish`)
  lines.push(`- Isometric 3D perspective (35deg tilt, 35deg pan, orthographic lens)`)
  lines.push(`- Soft, uniform lighting with no harsh shadows`)
  lines.push(`- Color palette: Dominant blue (#2962FF), secondary blue (#4FC3F7), white (#FFFFFF), warm accent yellow (#FFD45A)`)
  lines.push(`- Pillowy, inflated, soft-volume forms with rounded edges (85% fillet)`)
  lines.push(`- Chibi/stylized proportions, simplified anatomy`)
  lines.push(`- Floating subject with no ground contact`)
  lines.push(`- TRANSPARENT background (no background, pure alpha channel PNG — no white fill, no color fill)`)
  lines.push(`- Single hero subject, minimal composition`)
  lines.push(`- No photographic realism, no textures, no noise, no grain`)
  lines.push(`- Consistent rendering quality matching the reference sheet exactly`)
  lines.push(``)
  lines.push(`SUBJECT: Generate an isometric 3D icon of ${subject || 'a friendly robot'}.`)
  lines.push(`📐 OUTPUT REQUIREMENT: Output must be exactly 1024x576 pixels (16:9 landscape). Never return a square or 1024x1024 image. Maintain landscape orientation with width greater than height.`)
  lines.push(``)
  lines.push(`🔒 STYLE CONSISTENCY ENFORCEMENT:`)
  lines.push(`- The visual style described above is ABSOLUTE and must be applied to this specific subject.`)
  lines.push(`- Do NOT adapt the style to the subject - adapt the subject to the style.`)
  lines.push(`- Every icon must look like it came from the same design system, regardless of what it represents.`)
  lines.push(`- Maintain the exact same material properties, lighting setup, color palette, and rendering quality.`)
  lines.push(`🎨 COLOR SPECIFICATION:`)
  lines.push(`Background: TRANSPARENT (alpha channel, no fill — output PNG must have no background).`)
  lines.push(`Color palette (MUST USE): dominant blue #2962FF, secondary blue #4FC3F7, neutral white #FFFFFF, warm accent #FFD45A used sparingly.`)
  lines.push(`⚠️ Apply these colors while maintaining the exact style. The color palette is part of the style identity.`)
  lines.push(`💎 MATERIALS (MANDATORY): primary material smooth high-gloss plastic, secondary material matte pastel plastic, accents translucent frosted plastic, surface detail no noise, no texture, no scratches.`)
  lines.push(`📦 FORM (MANDATORY): pillowy, inflated, soft-volume forms, rounded with 85% fillet zero sharp corners, chibi/stylized simplified anatomy, squash-and-stretch for friendliness, clean seamless.`)
  lines.push(`💡 LIGHTING (MANDATORY): soft global illumination, dual top-front softboxes with faint rim light, highlights broad glossy bloom no hard speculars, shadows internal occlusion only no ground shadow, exposure balanced no high contrast.`)
  return lines.join('\n')
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

async function removeImageBackground(base64: string): Promise<string> {
  try {
    console.log('[gemini] removeBackground: importing library...')
    const { removeBackground } = await import('@imgly/background-removal-node')
    console.log('[gemini] removeBackground: calling with data URI, base64 length=', base64.length)
    const dataUri = `data:image/png;base64,${base64}`
    const blob = await removeBackground(dataUri)
    console.log('[gemini] removeBackground: done, blob.size=', blob.size, 'blob.type=', blob.type)
    const arrayBuffer = await blob.arrayBuffer()
    const result = Buffer.from(arrayBuffer).toString('base64')
    console.log('[gemini] removeBackground: converted, result length=', result.length)
    return result
  } catch (err) {
    console.error('[gemini] removeImageBackground FAILED:', {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.constructor.name : typeof err,
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    })
    return base64
  }
}

export async function generateHeroImage(
  subject: string,
  apiKey?: string,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const ai = getAi(apiKey)
    const prompt = buildCreon3DPrompt(subject)
    const refImages = loadCreonRefImages()
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: prompt },
      ...refImages,
    ]
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: ['IMAGE'],
        temperature: 1,
        imageConfig: { aspectRatio: '16:9', imageSize: '2K' },
        httpOptions: { timeout: 120_000 },
      },
    })
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const rawBase64 = part.inlineData.data
        console.log('[gemini] 3D image generated, removing background...')
        const cleanBase64 = await removeImageBackground(rawBase64)
        return { base64: cleanBase64, mimeType: 'image/png' }
      }
    }
    return null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[gemini] generateHeroImage error:', message)
    return null
  }
}

function buildQualityRules(heroImagePrompt?: string): string {
  return `---

## 공통 필수 기준

### 디자인 품질 원칙 (세계 최고 수준 — Linear·Notion·Stripe 벤치마크)

**① 시각적 계층 — 숫자로 강제**
- 한 화면에 반드시 1개의 Hero 요소: 폰트 크기 48~72px / weight 800 / 한 눈에 읽힘
- Supporting 요소: 18~24px / weight 600
- Detail 요소: 13~14px / weight 400
- ❌ 금지: 가장 큰 글자가 24px 이하인 화면 (아무것도 안 튀어나오는 평면 레이아웃)
- ❌ 금지: KPI 카드 4~5개가 동일한 크기·비중으로 나열 — 반드시 1개는 2배 이상 크게

**② KPI·데이터 카드 — 드라마 필수**
- 히어로 KPI: 숫자 56~72px bold + 작은 단위 레이블(12px) + 전월/목표 대비 변화량 표시(↑↓ 화살표 + 퍼센트, 초록/빨강)
- 서브 KPI 카드: 숫자 36~48px + 아이콘(24px, 컬러) + 한 줄 설명(12px 회색)
- 상태 카드(장애/경고): 카드 좌측에 4px 컬러 보더 액센트(border-left: 4px solid var(--color-negative)) 또는 카드 상단 아이콘 영역에 상태색 배경(opacity 0.1) 적용
- 트렌드 스파크라인: KPI 카드 하단에 최소한 7개 포인트 소형 SVG 라인 또는 Chart.js 인라인 차트 삽입 가능

**③ 카드 Elevation & 레이어**
- 히어로 카드: box-shadow: 0 4px 20px rgba(0,0,0,0.10) — 배경에서 떠있는 느낌
- 일반 카드: box-shadow: 0 1px 6px rgba(0,0,0,0.06) + border: 1px solid (DS border-alt 토큰)
- ❌ 금지: 그림자도 없고 테두리만 있는 카드 (종이에 그린 느낌)
- 카드 hover: box-shadow 한 단계 업 + 미세 translateY(-1px) 로 인터랙션 명시

**④ Chart.js 커스터마이징 — 기본값 절대 금지**
- 라인 차트: borderColor=var(--color-primary), backgroundColor=gradient(primary 15%→transparent), borderWidth:2.5, pointRadius:0(기본), pointHoverRadius:5
- 그라데이언트 fill 필수:
  \`\`\`js
  const grad = ctx.createLinearGradient(0,0,0,height);
  grad.addColorStop(0, 'rgba(26,117,255,0.18)');
  grad.addColorStop(1, 'rgba(26,117,255,0)');
  \`\`\`
- 그리드 라인: color='rgba(0,0,0,0.05)', 틱 폰트: family=Pretendard 또는 sans-serif, size:11, color:'#9ca3af'
- 툴팁: backgroundColor='#1a1b1d', titleColor='#f7f7f8', bodyColor='#aeb0b6', padding:10, cornerRadius:8
- ❌ 금지: Chart.js 기본 파란색(rgb(54,162,235)), 기본 툴팁 스타일, 기본 그리드 색

**⑤ 리스트 아이템 — 정보 밀도 + 시각 세련도**
- 아이템마다 반드시: 아이콘(24px, 컬러코딩) + 주 텍스트(14px/600) + 보조 텍스트(12px/회색) + 우측 메타(배지 or 시간 or 숫자)
- 상태별 아이콘 컬러: 장애=var(--color-negative), 경고=var(--color-caution), 정상=var(--color-positive), 정보=var(--color-info)
- hover 시 배경 var(--color-fill-alt) 변화 + 커서 pointer
- 구분선은 var(--color-border-alt) — 너무 진하면 산만해짐

**⑥ 배지 & 상태 표시**
- 배지: 4~6px 수직 패딩 + 10~12px 수평 패딩, font-size:11~12px, font-weight:600, border-radius:9999px
- 단순 컬러 배지 외에 아이콘+텍스트 조합 배지도 활용 (예: ● 정상, ▲ 경고, ✕ 장애)
- 중요 상태는 배지뿐 아니라 카드 전체에 subtle tint 적용 (예: background: color-mix(in srgb, var(--color-negative) 5%, var(--color-surface)))

**⑦ 헤더·네비게이션**
- 페이지 헤더: 제목(20px/700) + 부제(13px/회색) + 우측 액션 버튼 — 높이 낭비 없이 compact
- 네비게이션 활성 아이템: 배경 var(--color-primary-fill-neutral), 텍스트·아이콘 var(--color-primary), font-weight:600
- 비활성 아이템: var(--color-text-alternative), font-weight:400

**⑧ 마이크로 디테일 — 실제 제품처럼**
- 모든 interactive 요소: transition: all 0.15s ease
- 버튼 hover: opacity 0.88 or brightness(0.92)
- 숫자에 변화량 표시: "+2.3% 전월 대비" (초록색 ↑) or "-0.8%" (빨간색 ↓)
- 타임스탬프: "14:28" 또는 "3분 전" 형식으로 실감나게
- 빈 데이터 절대 금지 — 모든 카드·리스트는 실제 서비스처럼 꽉 채울 것

**⑨ 금지 패턴 (엄격 적용)**
- ❌ KPI 카드가 모두 같은 크기·같은 스타일
- ❌ Chart.js 기본 색상·기본 툴팁
- ❌ 아이콘 없는 리스트 아이템
- ❌ 배지 없는 상태 정보
- ❌ 트렌드/변화량 없는 숫자 KPI
- ❌ 그림자 없는 카드 (border-only)
- ❌ hover 없는 인터랙티브 요소
- ❌ 화면의 30% 이상이 흰 공백 (스크롤 없는 빈 하단 여백 포함)
- ❌ 섹션 1~2개만 있는 화면 (반드시 3개 이상)
- ❌ 카드·아이템 2개 이하로 끝나는 리스트
- ❌ 제목만 있고 본문·수치·메타 정보 없는 카드

**⑩ 콘텐츠 밀도 강제 체크리스트 (화면 생성 전 반드시 확인)**
- [ ] 모바일 화면: 최소 4개 섹션 (헤더/KPI 카드영역/리스트/탭바 등), 스크롤 시 8~10개 아이템 노출
- [ ] 웹 대시보드: 최소 5개 섹션, 뷰포트 내 KPI 3개 이상 + 차트 1개 이상 + 리스트 1개 이상
- [ ] 모든 화면에서 뷰포트 내 콘텐츠 채움률 70% 이상 (빈 공간 < 30%)
- [ ] 리스트·피드 아이템: 반드시 5개 이상 (더미 데이터로 채움)
- [ ] 각 카드에 주 정보 + 부가 설명 + 메타 정보(날짜·상태·수치) 3가지 이상 포함
- [ ] 상단 히어로 영역 + 중간 본문 + 하단 네비/액션 구조 명확히 존재

**⑪ 모바일 앱 히어로 필수 체크리스트**
- [ ] 홈 화면에 height 240~280px 히어로 배너 존재하는가?
- [ ] 히어로 배경이 gradient (흰색 단색 금지)인가?
- [ ] %%IMG_1%% 캐릭터 일러스트가 히어로 우측에 position:absolute right:0 bottom:0 으로 배치됐는가?
- [ ] 부유 아이콘 배지 3개 이상이 캐릭터 주변에 산재되어 있는가?
- [ ] Floating 데이터 카드가 히어로 bottom 음수값으로 삐져나오는가?
- [ ] Floating 카드에 핵심 수치(크게) + 상태 뱃지(아이콘+텍스트)가 있는가?
- [ ] 히어로 하단에 도트 페이지네이터가 있는가?
- [ ] 히어로 다음 섹션이 2열 카드 그리드로 시작하는가?
- [ ] 전체 배경색이 #f0f4ff~#f5f7fa 계열 (흰색 단독 금지)인가?

### 더미 데이터 (실제처럼 풍부하게)
- 한국어 실감나는 이름, 금액, 날짜, 설명문
- 다양한 상태값 (완료/진행중/대기, 높음/중간/낮음 등)
- 숫자는 구체적으로 (1,234,567원, 87%, 3.4km 등)
- 최소 5~8개 리스트 아이템 (3개 이하 절대 금지)
- 각 아이템의 설명문·부제목은 20자 이상으로 실제 앱처럼 작성

### 아이콘
- 반드시 Google Material Symbols 사용
- <head> 안에 반드시 포함: <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
- 사용법: <span class="material-symbols-outlined" style="font-size:24px;">icon_name</span>
- 아이콘명은 Material Symbols 공식 이름 사용 (home, search, person, settings, favorite, star, arrow_back, notifications, add, close, menu, more_vert, chevron_right, check, edit, delete, share, camera, image, send 등)
- 이모지 사용 금지

### 이미지·비주얼 처리 규칙

**사진·썸네일** (실제 이미지가 들어갈 자리):

**[AI 생성 이미지 — 최대 3개]** 화면에서 가장 눈에 띄는 대형 이미지:
- 플레이스홀더 형식: %%IMG_1:영문 설명%%, %%IMG_2:영문 설명%%, %%IMG_3:영문 설명%%
- 영문 설명은 Google Stitch 스타일로 상세하게 작성: 피사체, 조명, 구도, 분위기 포함 (1~2문장, 따옴표 사용 금지)
- **모바일 홈 히어로용 %%IMG_1%% — 반드시 앱 도메인에 맞는 3D 일러스트 캐릭터로 작성:**
  - 헬스/의료 → %%IMG_1:A cheerful 3D illustrated elderly woman in a light blue sweater holding a tablet, standing on a bright garden path with soft sunlight. Cartoon-style 3D render, pastel colors, transparent-friendly white background, mobile app hero illustration style.%%
  - 피트니스/운동 → %%IMG_1:A 3D illustrated athletic person in sportswear doing a stretching pose with a bright smile. Vibrant pastel colors, clean light background, cartoon-style 3D mobile app hero character.%%
  - 금융/자산 → %%IMG_1:A confident 3D illustrated business person in a suit with floating coins and upward trend arrows around them. Clean pastel blue background, cartoon 3D style, mobile app hero illustration.%%
  - 쇼핑/커머스 → %%IMG_1:A 3D illustrated cheerful person holding shopping bags with colorful items floating around. Soft pastel background, cartoon 3D render, vibrant mobile app illustration style.%%
  - 음식/배달 → %%IMG_1:A 3D illustrated delivery person on a scooter with a large food bag, warm sunset background with floating food icons. Cartoon-style 3D render, pastel colors, mobile app hero illustration.%%
  - 일반(기본) → %%IMG_1:A friendly 3D illustrated character relevant to the app's purpose, standing confidently with relevant props floating around. Soft pastel background, clean cartoon 3D render, vibrant mobile app hero style.%%
- img 태그 src에 플레이스홀더를 그대로 삽입 (절대 수정 금지): <img src="%%IMG_1:설명...%%" style="width:100%;height:100%;object-fit:contain;" />
- 3개 초과 이미지는 아래 LoremFlickr 방식 사용

**[LoremFlickr — 소형 썸네일]** 프로필 사진, 리스트 소형 이미지 등 반복 아이템:
- URL 형식: https://loremflickr.com/{width}/{height}/{keyword}
- 예시: https://loremflickr.com/80/80/portrait, https://loremflickr.com/200/150/food
- 카드·리스트 아이템마다 서로 다른 키워드로 다양하게 사용 (모두 같은 URL 금지)

**히어로 카드·배너 — 레이어드 합성 패턴 (모바일 홈 화면 필수)**

모바일 홈 히어로 섹션은 반드시 아래 레이어링 구조로 구현한다. 단순 배경+텍스트 배너 절대 금지:

\`\`\`html
<!-- ✅ 올바른 히어로 합성 패턴 -->
<div class="hero-banner" style="position:relative; height:260px; background:linear-gradient(160deg,#dbeafe 0%,#eff6ff 60%,#ffffff 100%); overflow:visible;">

  <!-- 레이어 1: 부유 아이콘 배지 (앱 도메인 관련 소형 아이콘, position:absolute로 산재) -->
  <div style="position:absolute;top:24px;right:90px;width:36px;height:36px;background:#fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;">
    <span class="material-symbols-outlined" style="font-size:18px;color:var(--color-primary);">favorite</span>
  </div>
  <div style="position:absolute;top:60px;right:48px;width:36px;height:36px;background:#fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;">
    <span class="material-symbols-outlined" style="font-size:18px;color:#10b981;">monitor_heart</span>
  </div>

  <!-- 레이어 2: 3D 일러스트 캐릭터 (우측 배치, 히어로 하단에 닿도록) -->
  <img src="%%IMG_1:앱 도메인 맞는 3D 캐릭터 설명...%%" style="position:absolute;right:0;bottom:0;height:220px;object-fit:contain;" />

  <!-- 레이어 3: Floating 데이터 카드 (히어로 아래로 삐져나와 다음 섹션과 겹침 — z-index 필수) -->
  <div style="position:absolute;bottom:-52px;left:16px;right:130px;background:#fff;border-radius:16px;padding:16px;box-shadow:0 8px 28px rgba(0,0,0,0.13);z-index:10;">
    <p style="font-size:12px;color:#64748b;margin:0 0 4px;">주요 지표 레이블</p>
    <p style="font-size:32px;font-weight:800;color:#0f172a;margin:0;line-height:1.1;">핵심 수치</p>
    <p style="font-size:11px;color:#94a3b8;margin:4px 0 8px;">단위 또는 설명</p>
    <!-- 상태 뱃지 -->
    <span style="display:inline-flex;align-items:center;gap:4px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;padding:4px 10px;border-radius:9999px;">
      <span class="material-symbols-outlined" style="font-size:14px;">warning</span> 상태: 주의
    </span>
  </div>

  <!-- 도트 페이지네이터 -->
  <div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;">
    <span style="width:20px;height:6px;border-radius:3px;background:var(--color-primary);"></span>
    <span style="width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,0.2);"></span>
    <span style="width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,0.2);"></span>
  </div>
</div>
<!-- 히어로와 다음 섹션 사이: floating 카드 높이만큼 margin-top 확보 -->
<div style="margin-top:68px; padding:0 16px;">
  <!-- 이후 2열 그리드 카드 섹션 등 -->
</div>
\`\`\`

**히어로 합성 핵심 원칙:**
- 일러스트 캐릭터는 **반드시** position:absolute right:0 bottom:0 으로 배치 — 히어로 우측에 꽉 차게
- Floating 데이터 카드는 **반드시** bottom 음수값으로 히어로 아래로 삐져나오게 — 층감 핵심
- 부유 아이콘 배지는 캐릭터 주변에 3~4개 산재 — 앱 도메인 관련 아이콘으로
- 히어로 배경은 top→bottom 밝은 그라데이션 (white 기반 금지 — 아이보리/연파랑/연초록 계열)
- ❌ 금지: 히어로에 텍스트만 있는 구성
- ❌ 금지: 이미지 없이 그라데이션 배경만 있는 구성
- ❌ 금지: 데이터 카드가 히어로 안에 갇혀 있는 구성 (반드시 아래로 삐져나와야 함)
${heroImagePrompt ? `
**3D 히어로 이미지 (이미 생성됨 — 반드시 사용):**
- 히어로 섹션 최상단 전체 영역에 아래 플레이스홀더를 <img> 태그 src로 정확히 삽입:
  <img src="%%HERO_3D_IMAGE%%" alt="hero" style="width:100%;height:100%;object-fit:contain;" />
- %%HERO_3D_IMAGE%% 플레이스홀더를 절대 수정하거나 다른 URL로 교체하지 마세요
- 이 섹션에 Unsplash 이미지 사용 금지 (3D 이미지가 대체함)
- 이미지 위에 텍스트 오버레이 또는 반투명 그라데이션 레이어 추가 가능
- %%HERO_3D_IMAGE%% 이미지를 감싸는 컨테이너: box-shadow 금지, 별도 background 속성 절대 추가 금지 (카드 배경이 자연스럽게 보임)
` : ''}
**데이터 시각화 (Chart.js):**
- 대시보드·통계 화면에서 차트가 반드시 필요한 경우에만 사용
- CDN: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
- 차트 색상: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() 로 CSS 변수 참조

### 인터랙션
- hover/active CSS 상태 정의
- transition: all 0.2s ease 기본 적용
- 선택된 탭/메뉴는 명확한 active 스타일

### CSS 변수 (필수 — Aide 에디터 연동)
- :root { --color-primary: <브랜드 주색>; } 반드시 선언
- 버튼 배경, 강조 텍스트, 아이콘 등 브랜드 컬러는 반드시 var(--color-primary) 사용`;
}

export async function generateUI(params: GenerateParams, apiKey?: string): Promise<string> {
  const { designMd, brief, answers, projectSummary, logoDataUrl, brandColors, mainOnly = false, variantStyle, referenceImageBase64, platform, modelId, heroImagePrompt, heroSubject } = params;
  const isBVariantUI = typeof variantStyle === 'string' && variantStyle.includes('시안 B')
  const effectiveHeroImagePrompt = isBVariantUI ? (heroSubject || heroImagePrompt || 'product hero') : heroImagePrompt

  const safeAnswers = answers ?? {};
  const answersText = Object.entries(safeAnswers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const hasExplore = Object.values(safeAnswers).some(v =>
    Array.isArray(v) ? v.some(s => String(s).includes('다양하게 보기')) : String(v).includes('다양하게 보기')
  )

  const str = (key: string) => (typeof safeAnswers[key] === 'string' ? safeAnswers[key] as string : '')
  const serviceType = str('service_type')
  const targetAudience = str('target_audience')
  const homeEmphasis = str('home_emphasis')
  const mood = str('mood')

  const serviceTypeRule = serviceType.includes('B2C')
    ? '- 서비스 성격(B2C): 비주얼 임팩트 강조, 감성적 히어로 섹션, 직관적 원터치 UX, 친근한 언어와 일러스트 활용'
    : serviceType.includes('B2B')
    ? '- 서비스 성격(B2B): 정보 밀도 높은 대시보드, 데이터 테이블·차트 중심, 전문 용어 허용, 컴팩트 레이아웃'
    : ''
  const targetRule = targetAudience.includes('10~20대')
    ? '- 타겟층(청소년·청년): 비비드 컬러, 큰 이미지·비주얼, 짧은 텍스트, 소셜 공유 요소 배치'
    : targetAudience.includes('40~60대')
    ? '- 타겟층(장년층): body 폰트 최소 16px, 단순한 네비게이션, 높은 명도 대비, 대형 버튼(min-height 56px), 큰 아이콘'
    : targetAudience.includes('전문가')
    ? '- 타겟층(전문가): 정보 밀도 최대화, 데이터 시각화 적극 활용, 고급 필터·정렬 기능, 컴팩트 UI'
    : ''
  const homeEmphasisRule = homeEmphasis.includes('핵심 지표')
    ? '- 홈 강조(KPI): 히어로에 KPI 숫자 56~72px bold 배치, 서브 KPI 카드 3개 이상, 트렌드 차트 필수, 전월 대비 변화량 표시'
    : homeEmphasis.includes('콘텐츠 탐색')
    ? '- 홈 강조(콘텐츠): 카드 그리드 또는 피드 레이아웃, 이미지 썸네일 강조, 카테고리 필터 칩, 6개 이상 아이템 노출'
    : homeEmphasis.includes('빠른 실행')
    ? '- 홈 강조(CTA): 히어로에 대형 CTA 버튼 또는 검색창 최상단 배치, 바로가기 퀵 액션 그리드(2×3 또는 2×4), 최소 텍스트'
    : homeEmphasis.includes('최근 활동')
    ? '- 홈 강조(히스토리): 타임라인 또는 활동 피드 섹션 상단 배치, 각 항목에 상태 배지·시간 표시, 빠른 재진입 버튼'
    : ''
  const moodRule = mood.includes('전문적')
    ? '- 무드(전문적·신뢰감): 블루·네이비·그레이 계열 색상, 클린 라인, 작은 border-radius, 데이터 중심 레이아웃'
    : mood.includes('친근')
    ? '- 무드(친근·따뜻한): 오렌지·그린·피치 계열 색상, 큰 border-radius(16~24px), 친절한 일러스트·아이콘, 부드러운 그림자'
    : mood.includes('고급')
    ? '- 무드(세련·고급스러운): 다크 배경 또는 미니멀 화이트, 섬세한 그라데이션, 여백 극대화, 얇고 세련된 타이포그래피'
    : mood.includes('활기')
    ? '- 무드(활기·젊은): 비비드 프라이머리 컬러, 굵고 큰 타이포그래피, 그라데이션 히어로, 동적인 레이아웃'
    : ''

  const structuredAnswerRules = [serviceTypeRule, targetRule, homeEmphasisRule, moodRule].filter(Boolean).join('\n')

  const effectiveDesignMd = designMd || loadDefaultDesignMd();
  const hasDesignSystem = !!effectiveDesignMd;
  const isMd3Base = hasDesignSystem && /md3Base:\s*true/.test(effectiveDesignMd);

  const effectivePlatform: PlatformType = platform ?? 'mobile';
  const platformLabel = effectivePlatform === 'web' ? '웹/데스크탑' : '모바일 앱';
  const platformGuide = loadPlatformGuide(effectivePlatform);
  const hasBrandColors = !!(brandColors && brandColors.length > 0);

  const prompt = `
당신은 세계 최고 수준의 UI 디자이너이자 프론트엔드 개발자입니다.
${hasDesignSystem ? `
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  디자인 시스템 강제 적용 — 절대 규칙                        ║
╚══════════════════════════════════════════════════════════════╝
아래 [디자인 시스템] 섹션에 정의된 토큰과 규칙을 반드시 따르세요.

${hasBrandColors
  ? `- 색상: ⛔ 디자인 시스템의 colors 토큰은 무시. 아래 [브랜드 컬러] 섹션의 색상만 사용할 것.`
  : `- 색상: ⛔ YAML frontmatter의 colors 토큰만 사용. CSS 속성에 #hex 직접 사용 절대 금지 (예: color:#333 금지, background:#fff 금지 → 반드시 CSS 변수 사용).`}
- 폰트: typography 토큰의 fontFamily·fontSize·fontWeight 그대로 적용.
- spacing: ⛔ spacing 토큰을 CSS 변수로 :root에 선언 후 var(--spacing-*) 사용. 임의 px 값 직접 사용 절대 금지 (예: padding: 16px 금지 → padding: var(--spacing-base) 사용).
- border-radius: ⛔ rounded 토큰을 --rounded-* CSS 변수로 :root에 선언 후 var(--rounded-*) 사용. 임의 px 값 직접 사용 절대 금지.
- 컴포넌트: YAML frontmatter의 components 섹션을 모든 컴포넌트에 정확히 적용. 토큰 이름 해석 규칙:
  • background / textColor / borderColor / dividerColor 값이 이름이면 → var(--color-{이름}) (예: "primary" → var(--color-primary), "border-alt" → var(--color-border-alt))
  • radius / radiusTop 값이 이름이면 → var(--rounded-{이름}) (예: "md" → var(--rounded-md), "xl" → var(--rounded-xl))
  • padding / paddingX / paddingY 값이 이름이면 → var(--spacing-{이름}) (예: "lg" → var(--spacing-lg), "md" → var(--spacing-md))
  • variants 키 아래 = 독립 스타일 변형(primary/secondary/tertiary 등), states 키 아래 = 동일 컴포넌트의 인터랙션 상태(disabled/focus/error)${hasBrandColors ? '\n  • background·textColor는 브랜드 컬러 우선 (components 토큰 값 대신 브랜드 컬러 변수 사용)' : ''}
- 플랫폼(${platformLabel})은 레이아웃 구조·크롬(상태바·네비바·탭바)에만 영향.
${isMd3Base ? `
╔══════════════════════════════════════════════════════════════╗
║  🏗️  MD3 구조 기반 — 컴포넌트 패턴 강제                         ║
╚══════════════════════════════════════════════════════════════╝
이 시스템은 Material Design 3 컴포넌트 구조를 기반으로 한다.
- 모든 버튼: MD3 Filled/Outlined/Text Button 구조 사용
- 모든 입력: MD3 Outlined Text Field 구조 사용 (레이블 항상 필드 위에 배치)
- 카드: MD3 Elevated/Filled/Outlined Card 구조 사용
- 목록: MD3 List Item 구조 (min-height 56px 준수)
- 내비게이션: ${effectivePlatform === 'web' ? '⛔ 하단 탭바 절대 금지 — Navigation Rail(좌측 고정, 240px 너비) 사용 필수' : 'Navigation Bar(하단 고정 탭바) 사용'}
- 칩: MD3 Assist/Filter Chip (rounded-full, height 32px)
- 모달: MD3 Dialog (max-width 480px)${effectivePlatform !== 'web' ? ' 또는 Bottom Sheet (모바일)' : ''}
- 위의 --md-sys-color-*, --md-sys-shape-*, --md-sys-typescale-* CSS 변수를 MD3 컴포넌트 스타일링에 활용할 것

⚠️ KTDS 치수 우선 — MD3 플랫폼 가이드 수치 완전 무시:
- 버튼 height: ⛔ 48px 고정 (MD3 플랫폼 가이드의 40dp 절대 사용 금지)
- 버튼 radius: ⛔ var(--rounded-md) 8px 고정 (MD3의 pill·20dp shape 절대 사용 금지)
- Input height: ⛔ 52px 고정 (MD3의 56dp 절대 사용 금지)
- 카드 radius: ⛔ var(--rounded-xl) 16px 고정 (MD3의 12dp 절대 사용 금지)
- 폰트: ⛔ <head>에 반드시 Pretendard CDN 추가 (Material Symbols CDN과 별개로 필수):
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
  input  { height:52px; border-radius:var(--rounded-md); border:1px solid var(--color-border); padding:0 var(--spacing-base); font-size:16px; background:var(--color-surface); }
  ::placeholder { color:var(--color-text-assistive); }
  :focus { border-color:var(--color-primary-border); outline:none; }
  .error { border-color:var(--color-negative); }
  [disabled] { background:var(--color-surface-disabled); color:var(--color-text-disabled); }

[Card]
  { border-radius:var(--rounded-xl); padding:var(--spacing-md); background:var(--color-surface); border:1px solid var(--color-border-alt); box-shadow:0 2px 8px rgba(0,0,0,0.06); }

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

${effectivePlatform === 'web' ? `[NavigationRail] ⛔ 웹 전용 — 하단 탭바 절대 금지
  { position:fixed; left:0; top:0; width:240px; height:100vh; background:var(--color-surface); border-right:1px solid var(--color-border-alt); display:flex; flex-direction:column; padding:var(--spacing-lg) 0; }
  .nav-header { padding:0 var(--spacing-base) var(--spacing-lg); }
  .nav-item   { height:56px; padding:0 var(--spacing-base); display:flex; align-items:center; gap:var(--spacing-sm); font-size:14px; cursor:pointer; }
  .nav-item.active { color:var(--color-primary); background:var(--color-primary-fill-neutral); border-radius:var(--rounded-md); font-weight:600; }
  .nav-item.inactive { color:var(--color-text-alternative); }
  .main-content { margin-left:240px; }` : `[NavigationBar] ⛔ 모바일 전용 — 하단 고정 탭바
  { position:fixed; bottom:0; left:0; right:0; background:var(--color-surface); border-top:1px solid var(--color-border-alt); display:flex; }
  active icon+text: var(--color-primary); inactive: var(--color-icon)`}

[Modal / Dialog]
  { max-width:480px; border-radius:var(--rounded-xl); padding:var(--spacing-lg); }

${effectivePlatform !== 'web' ? `[BottomSheet]
  { border-radius:var(--rounded-2xl) var(--rounded-2xl) 0 0; padding:var(--spacing-base) var(--spacing-lg); }

` : ''}[Snackbar]
  { border-radius:var(--rounded-md); background:#28292c; color:#ffffff; }
` : ''}` : effectivePlatform === 'web' ? 'Google, Stripe, Linear 수준의 완성도 높은 웹 UI를 만드세요.' : '네이티브 모바일 앱 수준의 UI를 만드세요 (Material Design 3 기반).'}

## 디자인 시스템${hasDesignSystem ? ' ← 이 섹션의 모든 토큰·규칙을 코드에 그대로 반영할 것' : ''}
${extractDesignMdForPrompt(effectiveDesignMd) || '없음 — 아래 플랫폼 가이드라인과 기획서를 기반으로 최적화된 디자인을 만드세요.'}
${hasDesignSystem ? `
> **체크리스트 — 코드 작성 전 반드시 확인**
> - [ ] ${hasBrandColors ? '⛔ colors 토큰 무시 → [브랜드 컬러] 섹션의 값으로 CSS 변수 선언했는가?' : 'colors 토큰을 CSS 변수로 선언했는가?'}
> - [ ] components.button.variants.primary → height 48px, padding var(--spacing-lg), radius var(--rounded-md), bg var(--color-primary)?
> - [ ] components.button.variants.secondary → height 48px, border 1px var(--color-primary-border), text var(--color-primary-text)?
> - [ ] components.button.states.disabled → bg var(--color-surface-disabled), text var(--color-text-disabled)?
> - [ ] components.input → height 52px, radius var(--rounded-md), label above(body2/var(--color-text-neutral)), focus=var(--color-primary-border), error=var(--color-negative)?
> - [ ] components.card → radius var(--rounded-xl), padding var(--spacing-md), bg var(--color-surface), border 1px var(--color-border-alt), shadow?
> - [ ] components.listItem → min-height 56px, paddingX var(--spacing-base), divider 1px var(--color-border-alt)?
> - [ ] ${effectivePlatform === 'web' ? '⛔ 하단 탭바 사용했는가? → 있으면 즉시 제거. NavigationRail(좌측 240px 고정)로 교체 필수' : 'components.navigationBar → bg var(--color-surface), border-top 1px var(--color-border-alt), active=var(--color-primary)?'}
> - [ ] 폰트 크기·굵기가 typography 토큰과 일치하는가?
> - [ ] ${hasBrandColors ? '임의 색상 사용하지 않았는가? (브랜드 컬러 외 hex 금지)' : '⛔ CSS 속성에 #hex 직접 사용했는가? → 있으면 반드시 CSS 변수로 교체 (e.g., color: #333 → color: var(--color-text))'}
> - [ ] ⛔ spacing에 임의 px 값 사용하지 않았는가? (var(--spacing-*) 변수만 허용, 예: padding: 16px 금지)
> - [ ] ⛔ border-radius에 임의 px 값 사용하지 않았는가? (var(--rounded-*) 변수만 허용, 예: border-radius: 8px 금지)
${isMd3Base ? `> - [ ] MD3 구조: 버튼·입력·카드·리스트·내비게이션이 MD3 컴포넌트 패턴을 따르는가?
> - [ ] Input 레이블이 필드 위(above)에 배치되었는가? (인라인 placeholder-only 금지)
> - [ ] --md-sys-color-* 변수가 :root에 선언되었는가?
> - [ ] ⛔ KTDS 치수 준수: 버튼 48px·radius var(--rounded-md), Input 52px, 카드 var(--rounded-xl) 16px?
> - [ ] ⛔ Pretendard CDN이 <head>에 포함되었는가? body에 font-family: var(--font-sans) 선언했는가?` : ''}
` : ''}
${logoDataUrl ? `\n## 회사 로고\n헤더/네비게이션 바에 아래 이미지를 <img> 태그로 삽입하세요 (src 값 그대로 사용, 절대 변경 금지):\n<img src="__LOGO_DATA_URL__" alt="logo" style="height:28px;object-fit:contain;" />` : ''}
${hasBrandColors ? `\n## 브랜드 컬러 ← 색상은 반드시 이 값만 사용 (디자인 시스템 colors 토큰 무시, 임의 hex 절대 금지)\n메인 프라이머리: ${brandColors![0]}\nCSS :root에 반드시 선언: --color-primary: ${brandColors![0]};${brandColors![1] ? `\n보조 컬러: ${brandColors![1]}; --color-secondary: ${brandColors![1]};` : ''}${brandColors!.length > 2 ? `\n추가 컬러: ${brandColors!.slice(2).join(', ')}` : ''}\n버튼·강조·액션·링크·아이콘은 이 색상만 사용.` : ''}
## 프로젝트 개요
${projectSummary}

## 기획서
${brief}

## 사용자 선택 옵션
${answersText || '(선택 없음 — AI가 최적의 방향으로 결정)'}
${structuredAnswerRules ? `\n## 답변 기반 디자인 지침 (반드시 적용)\n${structuredAnswerRules}` : ''}

## AI 자율 디자인 결정 원칙
사용자 답변에 없는 모든 디자인 결정은 아래 우선순위로 AI가 자율 판단합니다:
1. 업로드된 디자인 시스템 토큰 (최우선)
2. Material Design 3 가이드라인 (네비게이션 패턴, 컴포넌트 구조, 간격 등)
3. 플랫폼 관례 (iOS/Android/Web)
사용자가 명시하지 않은 네비게이션 패턴, 버튼 스타일, 색상, 타이포그래피, 간격 등은 위 기준으로 최적값을 선택하세요.

---

## 플랫폼별 구현 가이드
${platformGuide}

${buildQualityRules(effectiveHeroImagePrompt)}

${mainOnly ? `### 단일 메인 화면 (비교 선택용)
기획서의 핵심 메인 화면 1개만 구현하세요.
- ${effectivePlatform === 'web' ? '서비스에서 가장 중요한 홈/대시보드 화면 (웹 레이아웃 — 1440px 기준)' : '앱에서 가장 중요한 홈/대시보드 화면'}
- aide-screen 클래스, 라우터 스크립트 불필요
- 한 화면에 담기는 레이아웃 (overflow: hidden)
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
${effectivePlatform === 'web' ? `
⛔ 웹 플랫폼 강제 오버라이드 (위 시안 방향보다 우선):
- 캔버스: 1440px 너비, body에 max-width 제한 없이 풀 와이드 레이아웃
- 내비게이션: 위 시안에 '하단 탭바' 명시되어 있어도 ⛔ 절대 사용 금지 → NavigationRail(좌측 240px 고정) 반드시 사용
- 모바일 앱 크롬 금지: 상태바, 홈 인디케이터, 스와이프 영역 등 모바일 전용 UI 요소 사용 금지
- 12컬럼 그리드 (gutter 24px), 우측 패널·사이드바·멀티 컬럼 레이아웃 적극 활용` : ''}
` : hasExplore ? `---

## 다양한 시안 탐색 모드 (필수)
사용자가 '다양하게 보기'를 선택했습니다. 이 시안은 독창적이고 차별화된 방향을 탐색해야 합니다:
- 일반적인 레이아웃 패턴을 피하고 독특한 구조를 시도하세요 (카드형/리스트형/그리드형/대시보드형 중 다른 것 선택)
- 컬러 팔레트와 무드를 다른 시안과 완전히 다르게 설정하세요 (미니멀/볼드/다크/어스톤 등)
- 컴포넌트 스타일을 적극적으로 실험하세요 (플랫/엘리베이티드/아웃라인/유리모피즘 등)
` : ''}---

반드시 완전한 단일 HTML 파일로 응답하세요.
- 모든 CSS를 <style> 태그 안에 작성
- stock photo·외부 이미지 URL 사용 금지 (unsplash, pexels 등)
- Chart.js CDN은 허용
- 응답은 반드시 \`\`\`html 코드블록으로 감싸기
- 설명 텍스트 없이 코드만 출력
`;

  const referenceSection = referenceImageBase64
    ? `\n## 리뉴얼 레퍼런스 (첨부 이미지)\n이 이미지는 리뉴얼할 현재 페이지입니다. 콘텐츠 구조와 정보 계층을 유지하면서, 위의 디자인 시스템을 적용해 리뉴얼하세요.\n`
    : ''

  const fullPrompt = prompt + referenceSection

  const text = referenceImageBase64
    ? await generateProWithImage(fullPrompt, referenceImageBase64, 'image/png', apiKey, modelId)
    : await generatePro(fullPrompt, apiKey, modelId)

  let html: string
  const htmlMatch = text.match(/```html\n?([\s\S]*?)```/);
  if (htmlMatch) {
    html = htmlMatch[1]
  } else {
    const htmlTagMatch = text.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    html = htmlTagMatch ? htmlTagMatch[0] : text
  }

  if (logoDataUrl) {
    html = html.split('__LOGO_DATA_URL__').join(logoDataUrl)
  }

  return html
}

export async function expandToPrototype(mainHtml: string, params: GenerateParams, apiKey?: string): Promise<string> {
  const { brief, answers, projectSummary, designMd, logoDataUrl: expandLogoUrl, brandColors: expandBrandColors, modelId, platform } = params;
  const answersText = Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const isWeb = platform === 'web'
  // Replace logo first, then strip remaining base64 URIs — order matters:
  // if we strip first, the logo's base64 is already gone when we try to replace it.
  const TINY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  const logoSwapped = expandLogoUrl ? mainHtml.split(expandLogoUrl).join('__LOGO_DATA_URL__') : mainHtml
  const safeMainHtml = logoSwapped.replace(/data:[^;]+;base64,[A-Za-z0-9+/]+=*/g, TINY_GIF)

  const navExtractionGuide = isWeb
    ? `- 상단 GNB/nav 전체 (<nav>, <header> 또는 최상단 고정 영역)
- 사이드바 (<aside>, .sidebar, .side-nav 등 — 있는 경우만)`
    : `- 상단 앱바/헤더 (position: fixed/sticky 또는 body 최상단 첫 번째 div)
- 하단 탭바/네비게이션 바 (position: fixed/sticky 또는 body 최하단 마지막 div)`

  const contentAreaGuide = isWeb
    ? `GNB와 사이드바 사이의 <main> 또는 메인 콘텐츠 영역`
    : `앱바와 하단 탭바 사이의 스크롤 가능한 콘텐츠 영역`

  const prompt = `당신은 세계 최고 UI 개발자입니다. 아래 메인 화면을 기반으로 멀티스크린 프로토타입을 만드세요.

## 메인 화면 HTML
\`\`\`html
${safeMainHtml}
\`\`\`
${designMd ? `\n## 디자인 시스템 (서브 화면에도 동일하게 적용 — 임의 색상·폰트 사용 절대 금지)\n${extractDesignMdForPrompt(designMd)}\n` : ''}${expandBrandColors && expandBrandColors.length > 0 ? `\n## 브랜드 컬러\n--color-primary: ${expandBrandColors[0]};${expandBrandColors[1] ? ` --color-secondary: ${expandBrandColors[1]};` : ''}\n` : ''}
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

${buildQualityRules()}

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

  if (expandLogoUrl) {
    html = html.split('__LOGO_DATA_URL__').join(expandLogoUrl)
  }

  return html
}

export async function refineUI(html: string, message: string, brief: string, designMd?: string, apiKey?: string, logoDataUrl?: string | null): Promise<string> {
  const TINY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  const logoSwapped = logoDataUrl ? html.split(logoDataUrl).join('__LOGO_DATA_URL__') : html
  const safeHtml = logoSwapped.replace(/data:[^;]+;base64,[A-Za-z0-9+/]+=*/g, TINY_GIF)
  const hasMultiScreen = safeHtml.includes('aide-screen');

  const prompt = `당신은 기존 HTML UI를 수정하는 전문 UI 개발자입니다.

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
${logoDataUrl ? '- HTML에 `__LOGO_DATA_URL__`이 포함된 img 태그가 있습니다 — 이 태그를 절대 삭제하거나 src 값을 변경하지 마세요\n' : ''}- 응답은 <!DOCTYPE html> 또는 <html로 시작하는 완전한 HTML 파일만 출력 (마크다운 블록·설명 금지)

## ★ 수정 시 품질 유지 기준
> 수정 요청 외의 기존 품질을 절대 낮추지 말 것. 아래는 기존 퀄리티를 지키기 위한 기준이다.
${buildQualityRules()}`;

  const text = (await generatePro(prompt, apiKey)).trim();
  const mdMatch = text.match(/```(?:html)?\n?([\s\S]*?)```/);
  let result = mdMatch ? mdMatch[1].trim() : text;
  if (logoDataUrl) {
    result = result.split('__LOGO_DATA_URL__').join(logoDataUrl)
  }
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
- 슬라이더로 조절할 의미 있는 변수가 없으면 빈 배열 []

### states (3개 고정, 순서 그대로)
- id "new_user" (label "새 유저"): 활동 없는 신규 사용자
- id "typical" (label "일반 유저"): 현재 HTML 상태 → replacements 반드시 []
- id "power_user" (label "헤비 유저"): 오래된 충성 고객, 최대치에 가까운 상태
- replacements: 상태 전환 시 변경할 텍스트 쌍 (variables의 currentDisplayStrings에 있는 값은 제외)

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
    const text = await generateFlashNoThinking(prompt, apiKey);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { variables: [], states: [] };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { variables: [], states: [] };
  }
}
