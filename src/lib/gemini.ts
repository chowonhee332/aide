import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { type AppDomain, DOMAIN_KEY_TO_LABEL, DOMAIN_HOME_EMPHASIS_OPTIONS } from './domain-constants';
import { getDomainGuidance } from './variant-refs';
export type { AppDomain } from './domain-constants';
export { DOMAIN_KEY_TO_LABEL, DOMAIN_LABEL_TO_KEY, DOMAIN_HOME_EMPHASIS_OPTIONS } from './domain-constants';

function getAi(apiKey?: string) {
  return new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! })
}

async function fetchUnsplashUrl(keyword: string, width: number, height: number): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(keyword)}`
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&client_id=${accessKey}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const base = data?.urls?.regular ?? data?.urls?.small
    if (!base) return null
    return `${base}&w=${width}&h=${height}&fit=crop&auto=format`
  } catch {
    return null
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
  domain?: AppDomain;
  criticalReview?: boolean;
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
): Promise<QuestionnaireResponse> {
  const designSystemContext = designMd?.trim()
    ? `\n## 선택된 디자인 시스템 요약\n아래 DESIGN.md는 최종 UI의 스타일 기준입니다. 질문은 색상·라운드·컴포넌트 스타일을 다시 묻지 말고, 서비스 내용과 화면 구성에 필요한 의사결정만 물어보세요.\n\`\`\`md\n${designMd.slice(0, 4000)}\n\`\`\`\n`
    : ''
  const prompt = `
당신은 제품 기획자입니다. 기획서를 분석해 아래 세 가지만 추출하세요.

## 기획서
${brief}
${designSystemContext}

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
- 모바일 주문/피드/탐색 앱처럼 실제 앱 홈 화면이 핵심인 경우
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
      options: DOMAIN_HOME_EMPHASIS_OPTIONS[parsed.domain ?? 'other'] ?? DOMAIN_HOME_EMPHASIS_OPTIONS['other'],
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

  const heroMatches = [...result.matchAll(/%%HERO_3D_IMAGE(?::([^%]+))?%%/g)]
  if (heroMatches.length > 0) {
    const background = heroMatches[0][1]?.trim() || '#ffffff'
    let heroImg = heroImageData ?? null
    if (!heroImg && heroImagePrompt) {
      heroImg = await generateHeroImage(heroImagePrompt, apiKey, background)
    }
    const heroSrc = heroImg
      ? `data:${heroImg.mimeType};base64,${heroImg.base64}`
      : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    for (const match of heroMatches) {
      result = result.split(match[0]).join(heroSrc)
    }
  }

  const imgMatches = [...result.matchAll(/%%IMG_\d+:([^%]+)%%/g)].slice(0, 3)
  if (imgMatches.length > 0) {
    const urls = await Promise.all(
      imgMatches.map(m => fetchUnsplashUrl(m[1].trim(), 900, 600))
    )
    for (let i = 0; i < imgMatches.length; i++) {
      const full = imgMatches[i][0]
      const desc = imgMatches[i][1].trim()
      const keyword = desc.split(/\s+/).find((w: string) => w.length > 3)?.toLowerCase() ?? 'product'
      result = result.split(full).join(urls[i] ?? `https://source.unsplash.com/900x600/?${encodeURIComponent(keyword)}`)
    }
  }

  // Unsplash 썸네일 플레이스홀더 처리: %%THUMB:keyword:width:height%%
  const thumbMatches = [...result.matchAll(/%%THUMB:([^:%]+):(\d+):(\d+)%%/g)]
  if (thumbMatches.length > 0) {
    const urls = await Promise.all(
      thumbMatches.map(m => fetchUnsplashUrl(m[1].trim(), parseInt(m[2]), parseInt(m[3])))
    )
    for (let i = 0; i < thumbMatches.length; i++) {
      const full = thumbMatches[i][0]
      const keyword = thumbMatches[i][1].trim()
      const w = thumbMatches[i][2]
      const h = thumbMatches[i][3]
      const url = urls[i] ?? `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(keyword)}`
      result = result.split(full).join(url)
    }
  }

  return result;
}

function normalizeHeroBackground(background?: string): string {
  const bg = background?.trim()
  if (!bg) return '#ffffff'
  if (/^#[0-9a-fA-F]{3,8}$/.test(bg)) return bg
  const lower = bg.toLowerCase()
  if (lower.includes('primary') || lower.includes('blue')) return '#1A75FF'
  if (lower.includes('white') || lower.includes('surface')) return '#ffffff'
  return bg
}

function buildCreon3DPrompt(subject: string, backgroundColor = '#ffffff'): string {
  const bg = normalizeHeroBackground(backgroundColor)
  const lines: string[] = []
  lines.push(`🚨🚨🚨 CRITICAL STYLE REQUIREMENT 🚨🚨🚨`)
  lines.push(`You MUST generate this icon in the EXACT same visual style as the reference Creon 3D icon sheet.`)
  lines.push(`The style is NON-NEGOTIABLE and must be applied to ANY subject, regardless of what the subject is.`)
  lines.push(`STYLE CHARACTERISTICS (MANDATORY FOR ALL ICONS):`)
  lines.push(`- Smooth, glossy plastic material with high-gloss finish`)
  lines.push(`- Isometric 3D perspective (35deg tilt, 35deg pan, orthographic lens)`)
  lines.push(`- Soft, uniform lighting with no harsh shadows, plus a subtle grounding shadow`)
  lines.push(`- Color palette: Dominant blue (#2962FF), secondary blue (#4FC3F7), white (#FFFFFF), warm accent yellow (#FFD45A)`)
  lines.push(`- Pillowy, inflated, soft-volume forms with rounded edges (85% fillet)`)
  lines.push(`- Chibi/stylized proportions, simplified anatomy`)
  lines.push(`- Slightly floating or standing on an invisible white surface with a soft elliptical contact shadow`)
  lines.push(`- Subtle light gray contact shadow below the subject, blurred, low opacity, matching the object footprint`)
  lines.push(`- Solid flat background and invisible floor in exactly ${bg} (no gradient, no patterns, no grids, no checkerboard)`)
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
  lines.push(`Background: Solid flat ${bg}. The 3D image background MUST exactly match the hero section background color used in the UI.`)
  lines.push(`Color palette (MUST USE): dominant blue #2962FF, secondary blue #4FC3F7, neutral white #FFFFFF, warm accent #FFD45A used sparingly.`)
  lines.push(`⚠️ Apply these colors while maintaining the exact style. The color palette is part of the style identity.`)
  lines.push(`💎 MATERIALS (MANDATORY): primary material smooth high-gloss plastic, secondary material matte pastel plastic, accents translucent frosted plastic, surface detail no noise, no texture, no scratches.`)
  lines.push(`📦 FORM (MANDATORY): pillowy, inflated, soft-volume forms, rounded with 85% fillet zero sharp corners, chibi/stylized simplified anatomy, squash-and-stretch for friendliness, clean seamless.`)
  lines.push(`💡 LIGHTING (MANDATORY): soft global illumination, dual top-front softboxes with faint rim light, highlights broad glossy bloom no hard speculars, soft ambient occlusion plus a gentle ground/contact shadow visible on the ${bg} floor, no hard cast shadow, no dark shadow, exposure balanced no high contrast.`)
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

export async function generateHeroImage(
  subject: string,
  apiKey?: string,
  backgroundColor = '#ffffff',
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const ai = getAi(apiKey)
    const prompt = buildCreon3DPrompt(subject, backgroundColor)
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
        console.log('[gemini] 3D image generated with matched background:', normalizeHeroBackground(backgroundColor))
        return { base64: part.inlineData.data, mimeType: 'image/png' }
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
- 히어로 배경색과 3D 이미지 배경색이 달라 카드보드 컷아웃처럼 보이는 경우
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
   - 첫 화면에는 명확한 focal point를 하나 만든다. 사용자가 처음 보는 순간 무엇을 해야 하는지 보여야 한다.
   - 주요 CTA는 한 화면에서 가장 빠르게 발견되어야 한다.
   - 카드들은 같은 크기, 같은 간격, 같은 정렬 리듬을 가진다. 같은 성격의 카드가 제각각 흔들리면 실패다.
   - 화면을 3개 영역으로 나눈다: 핵심 요약, 주요 행동, 보조 탐색.
   - 정보가 많은 화면도 여백과 구분선을 이용해 스캔 가능하게 만든다.
   - 모든 섹션은 실제 서비스 데이터처럼 구체적인 텍스트와 수치를 가진다.
   - 빈 박스, 추상 카드, 의미 없는 아이콘 나열을 금지한다.
   - 첫 화면은 반드시 3개 이상의 의미 있는 영역으로 구성한다: 상단 내비/검색, 핵심 가치 또는 요약, 주요 콘텐츠 리스트/카드, 하단 액션/내비.
   - 한 화면의 절반 이상을 빈 공간, 빈 카드, 흰 배경으로 남기지 않는다. 여백은 의도적인 그룹핑에만 사용한다.
   - 모든 카드/리스트는 실제 서비스 데이터처럼 제목, 설명, 가격/상태/시간/평점 등 메타 정보, 액션을 포함한다.
   - 한글 문장은 절대 세로로 한 글자씩 쌓지 않는다. writing-mode, text-orientation, 과도하게 좁은 텍스트 column 사용 금지.
   - emoji를 아이콘이나 라벨로 사용하지 않는다. 아이콘은 DESIGN.md의 아이콘 규칙을 따른다. KTDS 디자인 시스템이면 KTDS Icon name(search, homeFill, chevron 등)과 KTDS icon color/size 토큰을 기준으로 표현한다.
   - "star", "home", "BEST"만 덩그러니 보이는 placeholder성 문구 금지. 필요한 경우 "별점", "홈", "추천"처럼 자연스러운 한국어 UI 라벨을 사용한다.
   - 음식/배달/커머스/여행 등 이미지가 중요한 도메인은 무관한 랜덤 이미지 금지. 반드시 브리프와 직접 관련된 placeholder 설명을 작성한다.
   - 하단 내비게이션, floating CTA, 장바구니 버튼은 콘텐츠를 가리지 않도록 main content padding-bottom을 충분히 확보한다.

5. **아이콘 사용 규칙**
   - DESIGN.md가 아이콘 시스템을 정의하면 그 규칙을 최우선으로 따르십시오. KTDS의 경우 "KTDS Icon"으로 표현하고, ktds.md의 주요 icon name 목록을 사용하십시오.
   - 독립 실행 HTML에서 실제 패키지 import가 불가능할 때는 KTDS Icon을 inline SVG 또는 CSS mask 형태로 구현하되, 색상은 var(--color-icon) / var(--color-primary-icon) 등 KTDS 토큰을 사용하십시오.
   - Material Symbols, emoji, 외부 아이콘 세트는 DESIGN.md가 명시하지 않은 경우 기본값으로 사용하지 마십시오.

6. **이미지 및 비주얼 처리 규칙**
   - 3D 이미지는 **메인 히어로 섹션에서 최대 1회만** 사용하십시오. 반복 카드, 추천 카드, 리스트 썸네일, 상세 이미지에는 3D 이미지 사용 금지.
   - 히어로 외 대형 이미지와 콘텐츠 썸네일은 Unsplash 기반 플레이스홀더를 사용합니다.
   - 화면에서 눈에 띄는 대형 실사 이미지는 플레이스홀더 형식(%%IMG_1:영문 설명%%, %%IMG_2:영문 설명%%, %%IMG_3:영문 설명%%)을 사용하십시오. 영문 설명은 실제 사진 검색에 적합한 구체적 상황/사물 키워드로 작성하십시오.
   - 소형 프로필이나 반복 카드 내 썸네일 등은 %%THUMB:keyword:width:height%% 형식의 플레이스홀더를 사용하십시오. keyword는 이미지 내용을 설명하는 영문 명사(예: pizza, sushi, burger), width/height는 픽셀 정수입니다. 카드마다 keyword를 다르게 지정해 이미지가 겹치지 않게 하십시오. (예: %%THUMB:pizza:400:300%%, %%THUMB:sushi:400:300%%, %%THUMB:burger:400:300%%)
   - keyword는 반드시 브리프와 직접 관련된 명사를 사용한다. 음식 배달이면 sandwich, salad, coffee, avocado처럼 음식 키워드만 사용하고 landscape, laptop, mountain, ocean 같은 무관한 키워드 금지.
   ${heroImagePrompt ? `
   ⚠️ **3D 히어로 이미지 배경 매칭 규칙 (CRITICAL)**
   - %%HERO_3D_IMAGE%%는 메인 히어로에서 **정확히 1회만** 사용하십시오.
   - 배경색을 반드시 플레이스홀더에 명시하십시오: 흰 배경이면 %%HERO_3D_IMAGE:#ffffff%%, primary blue 배경이면 %%HERO_3D_IMAGE:#1A75FF%%처럼 사용합니다.
   - 히어로 섹션 CSS의 background 값과 %%HERO_3D_IMAGE:[색상]%%의 색상 값은 반드시 동일해야 합니다. 파란 히어로면 3D 이미지도 같은 파란 배경으로 생성됩니다.
   - 3D 이미지는 투명 PNG가 아니며 배경 제거를 하지 않습니다. 따라서 이미지 배경과 히어로 배경을 맞추는 것이 필수입니다.
   - 3D 오브젝트 아래에는 자연스러운 접지감을 위한 부드러운 그림자가 포함되어 있습니다. CSS filter, mix-blend-mode, overflow hidden 등으로 그림자를 지우거나 잘라내지 마십시오.
   - 히어로 카드 구조(배경색은 이미지 플레이스홀더 색상과 동일하게 적용):
     <section class="hero-with-image">
       <div>
         <!-- 헤드라인·서브카피·CTA 텍스트 영역 -->
       </div>
       <img src="%%HERO_3D_IMAGE:#ffffff%%" alt="hero" style="width:100%;height:auto;max-height:280px;object-fit:contain;" />
     </section>
   - %%HERO_3D_IMAGE:[색상]%% 플레이스홀더를 절대 다른 URL이나 %%IMG%%로 교체하지 마십시오.
   - 텍스트 색은 히어로 배경 명도에 맞춰 DESIGN.md의 text/inverse 토큰을 사용하십시오.
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

8. **반응형 레이아웃 — CSS @media 쿼리 (MANDATORY)**
   **이 HTML은 반응형 뷰어(iframe)에서 렌더링됩니다. iframe 너비가 실시간으로 변하므로, CSS @media 쿼리 없이는 반응형이 절대 동작하지 않습니다.**

   **브레이크포인트**: [디자인 시스템]의 \`responsive.breakpoints\` 값을 따르십시오.
   해당 섹션이 없으면 서비스 성격(B2C/B2B, 대상 디바이스)에 맞는 업계 표준 브레이크포인트를 AI가 자율 판단하십시오.

   **공통 구조:**
   - DESIGN.md에 반응형/내비게이션 규칙이 있으면 그 규칙을 최우선으로 적용
   - 규칙이 없을 때만 Mobile / Tablet / Desktop 3단계 레이아웃 전환을 자율 구성
   - 그리드 열 수와 내비게이션 형태는 서비스 성격과 선택한 디자인 시스템에 맞게 결정

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

6. **Image Direction**
   - 이미지가 필요한 도메인은 이미지가 정보 구조의 일부가 되게 배치한다.
   - 3D는 히어로 1회만, 반복 썸네일은 실제 도메인에 맞는 Unsplash placeholder를 사용한다.
   - 이미지 없는 화면도 아이콘 나열 대신 데이터/카피/CTA로 중심을 만든다.

7. **Design-System Expressiveness**
   - 디자인 시스템은 제한이 아니라 재료다. 토큰을 바꾸지 말고, 섹션 비율·정렬·타입 계층·콘텐츠 밀도로 완성도를 만든다.
   - 예쁘게 보이려고 임의 컬러/그림자/라운드를 추가하지 말고, DESIGN.md 안에서 가장 표현력 있는 조합을 선택한다.

위 설계안은 출력하지 말고, 최종 HTML/CSS 결과에만 반영하세요.`;
}

export async function generateUI(params: GenerateParams, apiKey?: string): Promise<string> {
  const { designMd, brief, answers, projectSummary, logoDataUrl, brandColors, mainOnly = false, variantStyle, referenceImageBase64, referenceImageKind = 'reference', asIsAnalysis, platform, modelId = 'gemini-3.1-pro-preview', heroImagePrompt, heroSubject, domain } = params;
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

  const structuredAnswerRules = [serviceTypeRule, targetRule, homeEmphasisRule, moodRule].filter(Boolean).join('\n')

  const effectiveDesignMd = designMd || loadDefaultDesignMd();
  const hasDesignSystem = !!effectiveDesignMd;
  const isAdaptive = hasDesignSystem && /adaptive:\s*true/.test(effectiveDesignMd);
  const isMd3Base = hasDesignSystem && /md3Base:\s*true/.test(effectiveDesignMd);
  const isMd3 = hasDesignSystem && /(?:^|\n)md3:\s*true/.test(effectiveDesignMd) && !isMd3Base;

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
${isMd3Base ? `
╔══════════════════════════════════════════════════════════════╗
║  🏗️  MD3 구조 기반 — 컴포넌트 패턴 강제                         ║
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
- KTDS처럼 MD3 구조를 빌리되 자체 치수가 있는 시스템은 KTDS Storybook/ktds.md 값을 최종 기준으로 삼는다.
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
  input height/radius/border/padding/font-size는 DESIGN.md의 input/select component spec을 그대로 따른다.
  ::placeholder { color:var(--color-text-assistive); }
  :focus { border-color:var(--color-primary-border); outline:none; }
  .error { border-color:var(--color-negative); }
  [disabled] { background:var(--color-surface-disabled); color:var(--color-text-disabled); }

[Card]
  카드 radius/padding/background/border/shadow는 DESIGN.md의 card spec을 그대로 따른다. border와 shadow를 함께 쓰지 말라는 규칙이 있으면 반드시 지킨다.

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
${extractDesignMdForPrompt(effectiveDesignMd) || '없음 — 아래 플랫폼 가이드라인과 기획서를 기반으로 최적화된 디자인을 만드세요.'}
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
${isMd3Base ? `> - [ ] MD3 구조: 버튼·입력·카드·리스트·내비게이션이 MD3 컴포넌트 패턴을 따르는가?
> - [ ] Input 레이블이 필드 위(above)에 배치되었는가? (인라인 placeholder-only 금지)
> - [ ] --md-sys-color-* 변수가 :root에 선언되었는가?
> - [ ] ⛔ KTDS 치수 준수: 버튼/입력/카드/칩/내비게이션이 ktds.md의 최신 Storybook 기준과 일치하는가?
> - [ ] ⛔ Pretendard CDN이 <head>에 포함되었는가? body에 font-family: var(--font-sans) 선언했는가?` : isMd3 ? `> - [ ] ⚠️ 버튼: height:40px, border-radius:9999px (pill) 적용했는가?
> - [ ] ⚠️ 카드: border-radius:12px 적용했는가?
> - [ ] ⚠️ --color-surface-container-* 변수가 :root에 선언되었는가?
> - [ ] ${effectivePlatform === 'web' ? '웹 내비게이션이 서비스 성격에 맞는가? 포털/커머스/배달/예약형이면 상단 GNB, B2B/어드민/대시보드형이면 좌측 LNB를 사용했는가? 하단 탭바는 즉시 제거.' : 'Navigation Bar: height:80px, indicator pill(width:64px height:32px border-radius:9999px) 구현했는가?'}
> - [ ] Chip: height:32px, border-radius:9999px (pill) 적용했는가?
> - [ ] Input floating label 구현했는가? (placeholder 단독 사용 금지)
> - [ ] Google Fonts Roboto CDN이 <head>에 포함되었는가?` : ''}
` : ''}
${logoDataUrl ? `\n## 회사 로고\n헤더/네비게이션 바에 아래 이미지를 <img> 태그로 삽입하세요 (src 값 그대로 사용, 절대 변경 금지):\n<img src="__LOGO_DATA_URL__" alt="logo" style="height:28px;object-fit:contain;" />` : ''}
${hasBrandColors ? `\n## 브랜드 컬러 적용 규칙\n로고에서 추출한 브랜드 컬러는 사용자의 회사 정체성을 반영하기 위한 값입니다. DESIGN.md가 기본 UI 품질과 컴포넌트 구조를 보장하고, 브랜드 컬러는 primary/action/accent 계열만 치환합니다.\n\n메인 브랜드 컬러: ${brandColors![0]}${brandColors![1] ? `\n보조 브랜드 컬러: ${brandColors![1]}` : ''}${brandColors!.length > 2 ? `\n추가 브랜드 컬러: ${brandColors!.slice(2).join(', ')}` : ''}\n\nCSS 변수 선언 규칙:\n- --color-primary, --color-primary-text, --color-primary-fill, --color-primary-border, --color-primary-icon 등 primary/action/accent 계열은 브랜드 컬러 기반으로 선언\n- --color-secondary는 보조 브랜드 컬러가 있을 때만 선언\n- --color-surface, --color-surface-alt, --color-background, --color-text, --color-border, --color-fill, --color-disabled, --color-positive, --color-caution, --color-negative, --color-info 등 neutral/surface/background/border/status 계열은 DESIGN.md 값을 유지\n- spacing, rounded, typography, component height/padding/radius/card rules는 DESIGN.md 값을 유지\n- 브랜드 컬러와 DESIGN.md 토큰 외 임의 hex 사용 금지\n- CTA, 주요 액션, 활성 탭, 링크, primary icon에만 브랜드 컬러를 사용하고 카드 배경/페이지 배경/본문 텍스트를 브랜드 컬러로 덮지 않음` : ''}
${asIsAnalysis ? `\n## As-is URL 구조 분석 — 리디자인 대상 정보 구조 (스타일 금지)\n아래 데이터는 기존 서비스의 정보 구조, 섹션 순서, 주요 CTA, 내비게이션, 콘텐츠 재료를 파악하기 위한 것입니다.\n\n절대 규칙:\n- As-is URL의 색상, 폰트, 라운드, 카드 그림자, 아이콘 스타일, 시각 톤을 복사하지 마세요.\n- 최종 시각 스타일은 DESIGN.md와 브랜드 규칙만 따릅니다.\n- As-is는 \"무엇을 유지/개선할지\" 판단하는 입력입니다.\n- 기존 화면의 핵심 섹션/CTA/콘텐츠 의미는 유지하되, 정보 위계·스캔성·반응형 레이아웃·CTA 발견성을 개선하세요.\n\n분석 JSON:\n\`\`\`json\n${JSON.stringify(asIsAnalysis, null, 2).slice(0, 12000)}\n\`\`\`` : ''}
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
2. 선택한 DESIGN.md의 컴포넌트/내비게이션/레이아웃 규칙
3. 플랫폼 관례 (iOS/Android/Web)
사용자가 명시하지 않은 네비게이션 패턴, 버튼 스타일, 색상, 타이포그래피, 간격 등은 위 기준으로 최적값을 선택하세요.

---

${webNavigationRule}

## 플랫폼별 구현 가이드
${platformGuide}

${buildArtDirectionLayer(effectivePlatform)}

${buildQualityRules(effectiveHeroImagePrompt, domain)}

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
- stock photo·외부 이미지 URL을 직접 작성하지 말고, 이미지가 필요한 곳에는 위 규칙의 %%HERO_3D_IMAGE:[색상]%% / %%IMG_n:설명%% / %%THUMB:keyword:width:height%% 플레이스홀더만 사용
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

  if (params.criticalReview !== false) {
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

  return html
}

export async function expandToPrototype(mainHtml: string, params: GenerateParams, apiKey?: string): Promise<string> {
  const { brief, answers, projectSummary, designMd, logoDataUrl: expandLogoUrl, brandColors: expandBrandColors, asIsAnalysis, modelId = 'gemini-3.1-pro-preview', platform, domain } = params;
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

  const prompt = `당신은 선택한 디자인 시스템을 유지하면서 멀티스크린 프로토타입을 확장하는 시니어 프로덕트 디자이너이자 프론트엔드 개발자입니다.
아래 메인 화면의 디자인 시스템, 컴포넌트 스타일, 정보 밀도를 그대로 유지하면서 서브 화면을 확장하세요.

## 메인 화면 HTML
\`\`\`html
${safeMainHtml}
\`\`\`
${designMd ? `\n## 디자인 시스템 (서브 화면에도 동일하게 적용 — 임의 색상·폰트 사용 절대 금지)\n${extractDesignMdForPrompt(designMd)}\n` : ''}${expandBrandColors && expandBrandColors.length > 0 ? `\n## 브랜드 컬러 적용\n- primary/action/accent 계열만 브랜드 컬러로 유지: --color-primary: ${expandBrandColors[0]};${expandBrandColors[1] ? ` --color-secondary: ${expandBrandColors[1]};` : ''}\n- neutral/surface/background/border/status 색상, spacing, rounded, typography, component sizing은 DESIGN.md 값을 유지\n- 카드 배경, 페이지 배경, 본문 텍스트를 브랜드 컬러로 덮지 말 것\n` : ''}
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

${buildQualityRules(undefined, domain)}

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
${logoDataUrl ? '- HTML에 `__LOGO_DATA_URL__`이 포함된 img 태그가 있습니다 — 이 태그를 절대 삭제하거나 src 값을 변경하지 마세요\n' : ''}- 응답은 <!DOCTYPE html> 또는 <html로 시작하는 완전한 HTML 파일만 출력 (마크다운 블록·설명 금지)

## ★ 수정 시 품질 유지 기준
> 수정 요청 외의 기존 품질을 절대 낮추지 말 것. 아래는 기존 퀄리티를 지키기 위한 기준이다.
${buildQualityRules(undefined, domain)}`;

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
    const text = await generatePro(prompt, apiKey, 'gemini-3.1-pro-preview');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { variables: [], states: [] };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { variables: [], states: [] };
  }
}
