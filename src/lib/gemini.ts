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
  if (!accessKey) return null
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
    height: "52px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
    shadow: "0 2px 12px rgba(0,0,0,0.07)"
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
  domain?: AppDomain;
  criticalReview?: boolean;
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

  const text = await generatePro(prompt, apiKey, 'gemini-3.1-pro-preview');

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
      options: DOMAIN_HOME_EMPHASIS_OPTIONS[parsed.domain ?? 'other'] ?? DOMAIN_HOME_EMPHASIS_OPTIONS['other'],
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
        result = result.split(full).join(`https://picsum.photos/seed/${keyword}/400/400`)
      }
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
      const url = urls[i] ?? `https://picsum.photos/seed/${keyword}/${w}/${h}`
      result = result.split(full).join(url)
    }
  }

  // 클라이언트 사이드 초고속 이미지 배경 제거 (Chroma Key) 스크립트 주입
  const chromakeyScript = `
<script>
(function() {
  function removeImageBg(img) {
    if (img.dataset.bgRemoved) return;
    img.dataset.bgRemoved = "true";
    if (!img.src || img.src.indexOf('data:image') !== 0) return;
    const tempImg = new Image();
    tempImg.onload = function() {
      const canvas = document.createElement("canvas");
      canvas.width = tempImg.naturalWidth;
      canvas.height = tempImg.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(tempImg, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const corners = [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]];
        let bgR = 0, bgG = 0, bgB = 0;
        corners.forEach(([x, y]) => {
          const idx = (y * canvas.width + x) * 4;
          bgR += data[idx]; bgG += data[idx+1]; bgB += data[idx+2];
        });
        bgR /= 4; bgG /= 4; bgB /= 4;
        if (bgR > 200 && bgG > 200 && bgB > 200) {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);
            if (dist < 35 || (r > 245 && g > 245 && b > 245)) {
              data[i+3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
          img.src = canvas.toDataURL("image/png");
        }
      } catch (e) {
        console.error("Canvas chroma key failed:", e);
      }
    };
    tempImg.src = img.src;
  }
  function processImages() {
    document.querySelectorAll("img").forEach(img => {
      if (img.complete) removeImageBg(img);
      else img.addEventListener("load", () => removeImageBg(img));
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processImages);
  } else {
    processImages();
  }
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mut => {
      mut.addedNodes.forEach(node => {
        if (node.tagName === "IMG") {
          node.addEventListener("load", () => removeImageBg(node));
          if (node.complete) removeImageBg(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll("img").forEach(img => {
            img.addEventListener("load", () => removeImageBg(img));
            if (img.complete) removeImageBg(img);
          });
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
</script>`;

  if (result.includes('</body>')) {
    result = result.replace('</body>', chromakeyScript + '\n</body>');
  } else {
    result += chromakeyScript;
  }

  return result;
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
  lines.push(`- Solid pure white background (flat white background, no gradient, no patterns, no grids, no checkerboard, absolute white #ffffff)`)
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
  lines.push(`Background: Solid pure white (#ffffff, flat white background).`)
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
  // 무거운 Node.js 로컬 AI 배경 제거 모델 라이브러리 대신,
  // 클라이언트 사이드 Canvas 크로마키(Chroma Key) 스크립트 주입 방식으로 최적화 전환되었습니다.
  // 이로 인해 서버리스 환경에서 크래시 및 타임아웃 위험이 없으며 속도가 500배 이상 단축됩니다.
  return base64;
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
- A1. 흰 배경 + 데이터 테이블/정렬 리스트가 중심을 이루는가?
- A2. KPI 숫자 4개 이상이 동일 크기로 가로 정렬된 영역이 있는가?
- A3. 컬러 영역이 전체의 20% 이하인가? (데이터 중심 레이아웃)
- A4. 차트가 있다면 라인/sparkline (컬러풀 막대 금지)?` : variantLabel?.includes('B') ? `
## 시안 B 전용 추가 기준
- B1. 히어로 카드가 흰 배경(var(--color-surface))인가? (컬러 배경 금지)
- B2. %%HERO_3D_IMAGE%% 플레이스홀더 또는 실제 3D 이미지 자리가 히어로에 있는가?
- B3. 히어로 내 56px 이상 헤드라인이 있는가?
- B4. 가격·핵심 강조가 var(--color-primary) 컬러로 표시되는가?` : variantLabel?.includes('C') ? `
## 시안 C 전용 추가 기준
- C1. 상단 220px 이상 풀-블리드 히어로(무드 이미지·그라데이션·실사 사진)가 있는가?
- C2. 히어로에 감성 카피 헤드라인(20~28px bold white)이 있는가?
- C3. 카드 border-radius 20~28px (부드러운 곡선)?
- C4. 이미지·일러스트가 화면에 2개 이상 배치되었는가?` : ''

  const prompt = `당신은 Awwwards SOTD 심사위원이자 Dribbble·Behance 큐레이터입니다.
아래 UI HTML을 Dribbble 인기 샷, Behance 피처드 프로젝트, Awwwards SOTD 기준으로 냉정하게 평가하세요.
Pinterest 무드보드에 올릴 수 있는 비주얼 임팩트가 없으면 탈락입니다.${variantLabel ? `\n\n이 시안은 **${variantLabel}** 방향입니다.` : ''}

## 기획서 요약
${brief.slice(0, 800)}
${domainHint}

## 평가 대상 HTML
\`\`\`html
${safeHtml.slice(0, 18000)}
\`\`\`

## 공통 평가 기준 (각 항목 통과/실패 판정)
1. **히어로 임팩트**: 첫 화면 상단 35%+가 시각적 임팩트 영역인가? (그라데이션·실사이미지·3D 오브젝트·KPI 숫자 중 하나 — Awwwards SOTD 기준)
2. **타이포 계층**: 폰트 크기가 최소 4단계로 차이나는가? (Hero/Section/Card/Label — Dribbble 수준)
3. **컬러 풍부도**: Primary 컬러가 3곳 이상에 적극 사용되었는가? (단순 버튼 1곳만 X)
4. **카드 깊이**: 카드에 box-shadow가 적용되고 :hover 인터랙션이 정의되었는가?
5. **정보 밀도**: 빈 영역 없이 콘텐츠로 채워졌는가? (KPI 4요소·리스트 아이템 풍부도)
6. **시각 요소**: 이미지·아이콘·차트·뱃지가 충분히 활용되었는가? (Behance 피처드 수준)
7. **CTA 명확도**: 주요 CTA가 시각적으로 두드러지는가? (accent 컬러·크기·위치)
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

- 78점 미만 = needs_refinement (Dribbble/Awwwards 기준은 높습니다)
- topIssues와 improvements는 가장 임팩트 큰 3가지만
- 추상적 표현 금지 (예: "더 예쁘게" X → "히어로에 56px 이상 헤드라인 추가" O)
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

1. **시각적 완성도 — Dribbble·Behance·Awwwards·Pinterest 수준 (CRITICAL)**
   - **이 UI는 Dribbble 인기 샷, Behance 피처드 프로젝트, Awwwards SOTD, Pinterest 무드보드에 올라올 수 있는 수준이어야 합니다.** 평범하고 단조로운 결과물은 즉시 탈락입니다.
   - **타이포그래피**: 최소 4단계 크기 계층 (48+px Hero / 22px 섹션제목 / 16px 카드제목 / 13px 레이블). 모든 텍스트가 같은 크기인 UI 절대 금지.
   - **Hero 섹션 필수**: 첫 화면 상단 40~50%는 반드시 시각적 임팩트. 서비스 유형에 따라 선택:
     • 대시보드/분석/B2B → primary 그라데이션 배경 + KPI 숫자 56~72px bold + 카드 세트
     • B2C 소비자/커머스/푸드 → 대형 3D 캐릭터·마스코트·제품 이미지(뷰포트 40% 이상 차지) + 굵은 헤드라인 28~40px + 풀너비 accent CTA 버튼 — 흰 배경도 OK
     • 순백 배경에 14~16px 텍스트만 있는 히어로 절대 금지 (이미지도 없고 컬러도 없으면 실패)
   - **KPI 카드 세트**: 숫자(32~40px 800weight) + ↑↓ 증감 화살표 + 전기 대비 % + 서브레이블 4요소가 항상 한 세트.
   - **차트 스타일링**: Chart.js 기본 스타일(회색 배경, 기본 폰트) 절대 사용 금지. primary 컬러 그라데이션 fill, 투명 배경, 커스텀 툴팁 필수.
   - **리스트/피드**: 각 아이템은 아바타/썸네일 + 주제목 + 부제목 + 상태배지/점수 — 정보가 풍부한 리스트. 텍스트만 있는 단순 리스트 금지.
   - **호버/인터랙션**: 카드 호버 시 transform: translateY(-2px) + 그림자 증가, 버튼 호버 시 brightness 변화, transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1) 공통 적용.
   - **컬러 사용**: Primary 컬러를 용감하게 사용 (배경, 그라데이션, 강조 배지 등). CTA 버튼 하나에만 쓰는 소극적 사용 금지.

   **시각 계층 체크리스트:**
   - [ ] 첫 화면이 흰 배경에 작은 텍스트로 시작하지 않는가? (Hero 임팩트 확인)
   - [ ] 폰트 크기가 최소 4단계 계층으로 구분되는가?
   - [ ] KPI 숫자가 32px 이상 굵게 표시되는가?
   - [ ] 카드에 호버 효과가 있는가?

2. **디자인 시스템 토큰 100% 동적 상속 (MANDATORY)**
   - 임의의 px, hex, shadow 값을 프롬프트 수준에서 하드코딩하지 마십시오.
   - 모든 스타일은 오직 제공된 [디자인 시스템] (DESIGN.md)의 colors, typography, rounded, spacing 토큰을 참조한 CSS 변수만을 사용하여 구현되어야 합니다.
   - :root { --color-primary: <브랜드 주색>; } 등을 선언하고, 브랜드 액션 컬러는 반드시 var(--color-primary)를 사용하십시오.

3. **도메인 및 기획서 맞춤형 레이아웃 자율 구성**
   - 서비스 도메인과 기획서의 성격(예: 미니멀 브랜드 소개, 대시보드형 그리드, 리스트 피드, 폼 중심 페이지)에 부합하는 레이아웃 구조를 AI가 자율적으로 판단하여 짜야 합니다.
   - 획일화된 1열 리스트나 특정 히어로 템플릿의 강제 사용을 금지합니다.

4. **아이콘 사용 규칙**
   - 반드시 Google Material Symbols를 사용하십시오.
   - <head> 안에 반드시 포함: <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
   - 사용법: <span class="material-symbols-outlined" style="font-size:24px;">icon_name</span> (이모지 사용 금지, 공식 아이콘명 사용)

5. **이미지 및 비주얼 처리 규칙**
   - 화면에서 가장 눈에 띄는 대형 이미지(최대 3개)는 플레이스홀더 형식(%%IMG_1:영문 설명%%, %%IMG_2:영문 설명%%, %%IMG_3:영문 설명%%)을 사용하십시오. 영문 설명은 상세한 3D 캐릭터/일러스트 렌더링 스타일 등으로 작성하십시오.
   - 소형 프로필이나 반복 카드 내 썸네일 등은 %%THUMB:keyword:width:height%% 형식의 플레이스홀더를 사용하십시오. keyword는 이미지 내용을 설명하는 영문 단어(예: pizza, sushi, burger), width/height는 픽셀 정수입니다. 카드마다 keyword를 다르게 지정해 이미지가 겹치지 않게 하십시오. (예: %%THUMB:pizza:400:300%%, %%THUMB:sushi:400:300%%, %%THUMB:burger:400:300%%)
   ${heroImagePrompt ? `
   ⚠️ **3D 히어로 이미지 흰 배경 강제 규칙 (CRITICAL)**
   - %%HERO_3D_IMAGE%%는 이미 생성된 **흰 배경 컷아웃 PNG**(투명 아님, 순백 #ffffff 배경)입니다.
   - 따라서 히어로 카드의 배경은 **반드시 흰색** var(--color-surface)로 고정하십시오. 컬러 배경(primary 등) 위에 흰 배경 이미지를 올리면 카드보드 컷아웃처럼 어색해집니다.
   - 히어로 카드 구조(이대로 사용):
     <section style="background:var(--color-surface);border-radius:var(--rounded-2xl, 20px);padding:24px;box-shadow:0 16px 48px rgba(0,0,0,0.08);display:grid;grid-template-columns:1.1fr 1fr;gap:16px;align-items:center;overflow:hidden;">
       <div>
         <!-- 헤드라인·서브카피·CTA 텍스트 영역 -->
         <!-- 헤드라인: var(--color-text), 강조 일부만 var(--color-primary) -->
       </div>
       <img src="%%HERO_3D_IMAGE%%" alt="hero" style="width:100%;height:auto;max-height:280px;object-fit:contain;" />
     </section>
   - %%HERO_3D_IMAGE%% 플레이스홀더를 절대 수정하거나 다른 URL로 교체하지 마십시오.
   - 텍스트 색: 헤드라인·본문은 var(--color-text)(다크), 강조·가격·뱃지만 var(--color-primary). **흰 텍스트 사용 금지** (히어로 카드가 흰 배경이므로).
   - 컬러 임팩트는 가격(28~40px var(--color-primary) bold), CTA 버튼(var(--color-primary) 풀너비), accent 뱃지로 확보하십시오.
   - 모바일에서는 grid-template-columns: 1fr (이미지가 텍스트 아래 또는 위로 스택)으로 자동 대응하십시오.
   ` : ''}
   
6. **데이터 시각화 (Chart.js) — 프리미엄 스타일 필수**
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

7. **반응형 레이아웃 — CSS @media 쿼리 (MANDATORY)**
   **이 HTML은 반응형 뷰어(iframe)에서 렌더링됩니다. iframe 너비가 실시간으로 변하므로, CSS @media 쿼리 없이는 반응형이 절대 동작하지 않습니다.**

   **브레이크포인트**: [디자인 시스템]의 \`responsive.breakpoints\` 값을 따르십시오.
   해당 섹션이 없으면 서비스 성격(B2C/B2B, 대상 디바이스)에 맞는 업계 표준 브레이크포인트를 AI가 자율 판단하십시오.

   **공통 구조 (디자인 시스템 무관 — 반드시 적용):**
   - Mobile / Tablet / Desktop 3단계 레이아웃 전환
   - 내비게이션 3종(mobile용 / tablet용 / desktop용)을 HTML에 모두 작성하고, CSS @media로 전환
   - 그리드 열 수가 브레이크포인트에 따라 자동 증가

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
   - [ ] mobile/tablet/desktop 내비게이션 3종 모두 HTML에 구현했는가?
   - [ ] CSS @media 쿼리로 내비게이션이 브레이크포인트에 따라 전환되는가?
   - [ ] 그리드가 mobile → tablet → desktop 순서로 열 수가 증가하는가?
   - [ ] Desktop에서 side 내비게이션 너비만큼 main-content에 margin-left가 적용되는가?`;
}

export async function generateUI(params: GenerateParams, apiKey?: string): Promise<string> {
  const { designMd, brief, answers, projectSummary, logoDataUrl, brandColors, mainOnly = false, variantStyle, referenceImageBase64, platform, modelId = 'gemini-3.1-pro-preview', heroImagePrompt, heroSubject, domain } = params;
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
    ? '- 서비스 성격(B2C): 히어로에 대형 캐릭터·3D 오브젝트·제품 이미지 필수(뷰포트 40%+), 하단 고정 풀너비 CTA(position:fixed;bottom:0;width:100%;height:56px;background:accent), 제품 카드는 이미지+이름+가격 3요소 필수, 선택 UI는 원형 이미지 칩+체크마크 패턴, 감성 카피 헤드라인 28~36px bold'
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
    ? '- 무드(전문적·신뢰감): 디자인 시스템의 primary 컬러를 절제하여 사용(CTA·active 상태에만), 작은 border-radius(8~12px), 정렬된 데이터 중심 레이아웃, 얇은 border 라인, 클린 타이포그래피. ⚠️ 컬러 계열을 새로 지정하지 말 것 — 반드시 디자인 시스템 토큰 따르기.'
    : mood.includes('친근')
    ? '- 무드(친근·따뜻한): 디자인 시스템 primary 컬러를 따뜻하고 활기있게 활용(배경·CTA·뱃지 등 다양한 곳에), border-radius 20~28px(CTA pill 포함), 3D 캐릭터·귀여운 마스코트를 히어로에 배치, 말풍선 UI 활용, 부드러운 그림자, 카드 배경은 primary 컬러 5~10% 투명도 tint 활용 가능. ⚠️ 컬러 계열을 새로 지정하지 말 것 — 반드시 디자인 시스템 primary 토큰 따르기.'
    : mood.includes('고급')
    ? '- 무드(세련·고급스러운): 디자인 시스템 primary 컬러를 미니멀하게 활용, 다크 배경(var(--color-text-on-dark)) 또는 미니멀 화이트 베이스 선택, 섬세한 그라데이션, 여백 극대화, 얇고 세련된 타이포그래피. ⚠️ 컬러 계열을 새로 지정하지 말 것 — 반드시 디자인 시스템 토큰 따르기.'
    : mood.includes('활기')
    ? '- 무드(활기·젊은): 디자인 시스템 primary 컬러를 high-saturation·풀강도로 적극 사용(히어로 전체·배경·그라데이션), 굵고 큰 타이포그래피, 동적인 레이아웃, 강한 그림자. ⚠️ 컬러 계열을 새로 지정하지 말 것 — 반드시 디자인 시스템 primary 토큰 따르기.'
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
  const hasBrandColors = !!(brandColors && brandColors.length > 0);

  const prompt = `
당신은 Figma, Linear, Notion, Stripe, Vercel 수준의 UI를 만드는 세계 최고 수준의 시니어 프로덕트 디자이너이자 프론트엔드 개발자입니다.
당신이 만드는 UI는 **Dribbble 인기 샷**, **Behance 피처드 프로젝트**, **Awwwards SOTD**, **Pinterest 무드보드**에 올라올 수 있는 수준이어야 합니다.
이 네 플랫폼에서 볼 수 있는 임팩트 있는 비주얼, 세련된 타이포그래피, 풍부한 컬러 사용, 정교한 레이아웃을 구현하세요. 평범하고 단조로운 UI는 실패입니다.

## 🎨 시각적 완성도 기준 (모든 시안에 반드시 적용)

### 타이포그래피 계층
- **Hero/대형 숫자**: 48~72px, font-weight: 800, letter-spacing: -0.03em — 숨막히는 임팩트
- **섹션 제목**: 20~28px, font-weight: 700, letter-spacing: -0.02em
- **카드 제목**: 16~18px, font-weight: 600
- **본문/레이블**: 13~14px, font-weight: 400, color: var(--color-text-alternative, var(--color-on-surface-variant))
- **단조로운 폰트 크기(모두 14~16px) 절대 금지** — 최소 4단계 계층 필수

### 색상 & 깊이
- **Primary accent**: 배경, CTA, 강조 요소에 용감하게 사용 (버튼 하나에만 쓰는 소극적 사용 금지)
- **히어로 임팩트**: 첫 화면의 히어로 영역은 반드시 시각적 임팩트 필수 — 시안 방향에 따라 그라데이션·실사 사진·3D 오브젝트·KPI 대형 숫자 중 하나 이상. 순백 배경에 작은 텍스트만 있는 히어로 절대 금지 (Awwwards 기준 즉시 탈락)
- **카드 깊이**: box-shadow 2단계 — 기본(0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)), 호버(0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06))
- **Accent 배지/태그**: 적어도 화면당 3~5개의 컬러 배지, 상태 태그, 강조 칩 사용

### 레이아웃 세련도
- **정보 밀도**: 여백이 목적 없이 비어있는 구간 금지. 스크롤 없이 보이는 영역의 80%가 콘텐츠
- **KPI 카드**: 숫자 + 증감 화살표(↑↓) + 전월비 %(초록/빨강) + 서브레이블 — 4요소 세트 필수
- **리스트 아이템**: 아바타/썸네일 + 주제목 + 부제목 + 메타정보(날짜·상태·점수) — 각 아이템이 정보 풍부
- **차트**: 배경 투명, primary 컬러 그라데이션 fill, 깔끔한 그리드라인 (Chart.js 기본 스타일 절대 금지)

### 인터랙션 세련도
- 모든 카드/버튼: transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1)
- 카드 호버: transform: translateY(-2px) + 그림자 강화
- 버튼 호버: opacity 또는 brightness 변화
- active 상태: 명확한 컬러 강조 (텍스트 색만 바꾸는 단순 active 금지)

### 🛒 B2C 소비자/커머스 앱 전용 패턴 (소비자 대상 앱에 반드시 적용)
- **히어로 레이아웃**: 이미지/캐릭터 영역(height:45~55vw) + 브랜드 헤드라인(font-size:28~36px;font-weight:800) + 서브카피 + 풀너비 CTA 버튼(border-radius:16px;height:52px) 수직 스택
- **선택/Picker UI**: 원형(border-radius:50%) 또는 정사각(border-radius:12px) 이미지 칩 가로 배열, 선택됨=border:2px solid var(--color-primary) + 우상단 ✓ 체크마크 오버레이
- **단계별 진행**: "1. 스텝 제목 [필수]" — 넘버 배지(accent circle) + 스텝 제목 + 선택여부 배지 헤더로 각 스텝 명확히 구분
- **하단 고정 CTA**: position:fixed;bottom:0;left:0;right:0;padding:12px 16px 28px;background:var(--color-surface);border-top:1px solid var(--color-border-alt) — 다음단계/주문하기 버튼 항상 가시
- **말풍선 UI**: border-radius:16px + ::before 삼각형으로 캐릭터 말풍선 구현, 컨텍스트 가이드나 확인 메시지에 활용
- **제품 가격 표시**: font-size:18~22px;font-weight:700;color:var(--color-primary) — accent 컬러로 가격 강조

${hasDesignSystem ? `
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  디자인 시스템 강제 적용 — 절대 규칙                        ║
╚══════════════════════════════════════════════════════════════╝
아래 [디자인 시스템] 섹션에 정의된 토큰과 규칙을 반드시 따르세요.

${hasBrandColors
  ? `- 색상: ⛔ 디자인 시스템의 colors 토큰은 무시. 아래 [브랜드 컬러] 섹션의 색상만 사용할 것.`
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
  .nav-item.inactive { color:var(--color-text-alternative, var(--color-on-surface-variant)); }
  .main-content { margin-left:240px; }` : `[NavigationBar] ⛔ 모바일 전용 — 하단 고정 탭바
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

${effectivePlatform === 'web' ? `[NavigationRail] ⛔ 웹 전용 — 하단 탭바 절대 금지
  { position:fixed; left:0; top:0; width:80px; height:100vh; background:var(--color-surface); display:flex; flex-direction:column; align-items:center; padding:16px 0; gap:4px; }
  .nav-item        { width:56px; height:56px; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:9999px; gap:4px; font:500 0.75rem/1rem Roboto; }
  .nav-item.active { background:var(--color-secondary-container); color:var(--color-on-secondary-container); }
  .nav-item.inactive { color:var(--color-on-surface-variant); }
  .main-content    { margin-left:80px; }` : `[NavigationBar] ⛔ 모바일 전용 — 하단 고정 탭바
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
> - [ ] ⛔ Pretendard CDN이 <head>에 포함되었는가? body에 font-family: var(--font-sans) 선언했는가?` : isMd3 ? `> - [ ] ⚠️ 버튼: height:40px, border-radius:9999px (pill) 적용했는가?
> - [ ] ⚠️ 카드: border-radius:12px 적용했는가?
> - [ ] ⚠️ --color-surface-container-* 변수가 :root에 선언되었는가?
> - [ ] ${effectivePlatform === 'web' ? '⛔ 하단 탭바 사용했는가? → 있으면 즉시 제거. NavigationRail(좌측 80px 고정)로 교체 필수' : 'Navigation Bar: height:80px, indicator pill(width:64px height:32px border-radius:9999px) 구현했는가?'}
> - [ ] Chip: height:32px, border-radius:9999px (pill) 적용했는가?
> - [ ] Input floating label 구현했는가? (placeholder 단독 사용 금지)
> - [ ] Google Fonts Roboto CDN이 <head>에 포함되었는가?` : ''}
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

${buildQualityRules(effectiveHeroImagePrompt, domain)}

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
- ⛔ 디바이스 목업·폰 프레임·기기 테두리 절대 금지: body 바깥에 폰/태블릿 실루엣을 감싸는 wrapper, 상단 노치·홈 인디케이터·전원 버튼 등 하드웨어 UI 요소 사용 금지. HTML은 그 자체가 앱 화면이어야 함
`;

  const referenceSection = referenceImageBase64
    ? `\n## 🎨 레퍼런스 이미지 — 스타일 강제 모방 (CRITICAL)
첨부 이미지는 도달해야 할 디자인 어워드 품질의 벤치마크입니다. 다음 요소를 정밀하게 추출해 반영하세요:

**1. 시각적 톤·무드 추출**
- 첨부 이미지의 전체 분위기(미니멀/임팩트/감성/플레이풀 중 어떤 것)를 파악하고 동일하게 재현
- 사용된 일러스트·이미지의 스타일(3D 클레이/플랫 아이콘/실사 사진/그래픽 등) 그대로 차용
- 캐릭터·마스코트가 보이면 비슷한 스타일의 일러스트 자리(%%IMG_1:캐릭터 설명%%) 마련

**2. 색상·여백·타이포 추출**
- 주요 컬러(특히 accent)의 채도·명도를 분석해 :root 변수에 반영
- 카드/섹션 사이 여백·padding 비율을 그대로 따라잡기
- 폰트 굵기 대비(예: 헤드라인 800w vs 본문 400w)와 크기 단계 모방

**3. 레이아웃 구조 모방**
- 헤더·히어로·콘텐츠·CTA·푸터 영역의 비율을 동일하게 잡기
- 카드/리스트의 아이템 정렬 방식(원형 칩 가로 배열, 그리드, 스택 등) 그대로 재현
- 하단 고정 CTA·말풍선·번호 배지 등 특징적 패턴이 있으면 반드시 포함

⚠️ 절대 금지: 평범한 디폴트 카드 그리드로 회귀, 첨부 이미지에 있는 임팩트 요소(캐릭터·그라데이션 히어로·풀-블리드 이미지 등) 누락
✅ 통과 기준: 생성된 UI를 첨부 이미지 옆에 나란히 놓았을 때 같은 디자이너가 만든 시리즈로 보일 것
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
          const refineMessage = `디자인 어워드 심사위원이 지적한 개선 사항을 적용하세요 (점수: ${critique.score ?? '?'}/100):

지적된 문제:
${(critique.topIssues || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

반영할 개선:
${critique.improvements.map((s, i) => `${i + 1}. ${s}`).join('\n')}

위 개선 사항을 모두 반영해 어워드 수준으로 끌어올리되, 기존 디자인 시스템 토큰·구조는 유지하세요.`
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
  const { brief, answers, projectSummary, designMd, logoDataUrl: expandLogoUrl, brandColors: expandBrandColors, modelId = 'gemini-3.1-pro-preview', platform, domain } = params;
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

  const prompt = `당신은 Figma, Linear, Notion, Stripe 수준의 UI를 만드는 시니어 프로덕트 디자이너이자 프론트엔드 개발자입니다.
아래 메인 화면의 디자인 퀄리티를 그대로 유지하면서 멀티스크린 프로토타입을 확장하세요. 서브 화면도 메인 화면과 동일한 디자인 어워드 포트폴리오 수준이어야 합니다.

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

  const prompt = `당신은 Figma, Linear, Stripe 수준의 UI를 유지·개선하는 시니어 프로덕트 디자이너입니다.
요청된 수정 사항을 적용하되, 기존 디자인의 시각적 완성도를 절대 낮추지 마세요. 수정 후에도 디자인 어워드 포트폴리오 수준이어야 합니다.

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
