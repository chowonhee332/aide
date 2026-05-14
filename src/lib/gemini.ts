import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function generatePro(prompt: string): Promise<string> {
  console.log('[gemini] generatePro start, prompt length=', prompt.length)
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.1-pro-preview',
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

async function generateFlash(prompt: string): Promise<string> {
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      httpOptions: { timeout: 90_000 },
    },
  });
  return res.text ?? '';
}

async function generateProWithImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  console.log('[gemini] generateProWithImage start, prompt length=', prompt.length)
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.1-pro-preview',
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

async function generateFlashWithImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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

export async function analyzeUrlToDesignMd(screenshotBase64: string, url: string): Promise<string> {
  const prompt = `You are a design system expert. Analyze the provided screenshot of "${url}" and extract its design system as a DESIGN.md file.

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
- Use ONLY hex colors (no rgb/rgba). Approximate rgba to the nearest hex.
- Detect the dominant color palette from backgrounds, CTAs, and text.
- Infer font sizes from visual hierarchy (display > h1 > body > caption).
- Detect border-radius from buttons and cards.
- Be specific and accurate — this will be used to generate UI.`;

  return generateFlashWithImage(prompt, screenshotBase64, 'image/png');
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

export interface QuestionnaireResponse {
  questions: Question[];
  projectSummary: string;
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
): Promise<QuestionnaireResponse> {
  const platformLabel = platform === 'web' ? '웹 (데스크탑)' : '모바일 앱'
  const prompt = `
당신은 세계적인 UI/UX 디자인 컨설턴트입니다. 기획서를 분석해 더 정확한 UI 시안 생성을 위한 맞춤형 질문지를 만드세요.

## 디자인 시스템
${designMd || '(없음 — AI가 브랜드를 새로 설계)'}

## 기획서
${brief}

## 이미 결정된 조건 (질문 금지)
- 플랫폼: ${platformLabel} — 디바이스/플랫폼 관련 질문은 절대 생성하지 마세요.

## 질문지 생성 규칙
- 8~12개 질문 (기획서 맥락에 꼭 필요한 것만)
- 각 질문은 구체적이고 UI 결과물에 직접 영향을 주어야 함
- 옵션은 4~6개, 비전문가도 바로 이해할 수 있는 표현
- 한국어 작성

## 포함할 질문 유형 (맥락에 맞게 선택)
1. 디자인 무드 (미니멀, 볼드, 모던, 클래식 등)
2. 주요 컬러 방향 (디자인 시스템 없을 때)
3. 핵심 화면 구성 요소
4. 타겟 사용자 느낌
5. 네비게이션 패턴
6. 콘텐츠 밀도 (심플 vs 정보 밀집)
7. 인터랙션/애니메이션 수준

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{
  "projectSummary": "프로젝트 한 줄 요약",
  "questions": [
    {
      "id": "device",
      "question": "어떤 디바이스 기준인가요?",
      "description": "레이아웃과 인터랙션 패턴이 달라집니다",
      "type": "single",
      "options": ["iOS 모바일", "Android 모바일", "iPad/태블릿", "웹/데스크탑"],
      "hasDecideForMe": true
    }
  ]
}

type: "single"(1개), "multi"(복수), "text"(자유입력)
hasDecideForMe: true → "AI가 결정" 옵션 추가
hasExplore: true → "다양하게 보기" 옵션 추가
`;

  const text = await generateFlash(prompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse questionnaire JSON');

  return JSON.parse(jsonMatch[0]);
}

function extractDesignMdForPrompt(designMd: string): string {
  return designMd;
}

export async function generateUI(params: GenerateParams): Promise<string> {
  const { designMd, brief, answers, projectSummary, logoDataUrl, brandColors, mainOnly = false, variantStyle, referenceImageBase64, platform } = params;

  const safeAnswers = answers ?? {};
  const answersText = Object.entries(safeAnswers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const allAnswerStr = Object.values(safeAnswers)
    .map(v => (Array.isArray(v) ? v.join('') : v))
    .join('');

  const hasExplore = Object.values(safeAnswers).some(v =>
    Array.isArray(v) ? v.some(s => String(s).includes('다양하게 보기')) : String(v).includes('다양하게 보기')
  )

  const hasDesignSystem = !!designMd;

  const effectivePlatform: PlatformType = platform ?? 'mobile';
  const platformLabel = effectivePlatform === 'web' ? '웹/데스크탑' : '모바일 앱';
  const platformGuide = loadPlatformGuide(effectivePlatform);
  const designSystemWarning = hasDesignSystem
    ? `\n⚠️ 색상·폰트·컴포넌트 스타일은 위의 [디자인 시스템]을 반드시 따를 것. 플랫폼 가이드(${platformLabel})는 레이아웃 구조에만 적용.`
    : '';

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
- spacing: spacing 토큰 값만 사용. 임의 px 값 사용 금지.
- border-radius: rounded 토큰만 사용.
- 컴포넌트: components 토큰의 backgroundColor·textColor·rounded·padding·height 그대로 복제.${hasBrandColors ? ' (backgroundColor·textColor는 브랜드 컬러 우선)' : ''}
- 플랫폼(${platformLabel})은 레이아웃 구조·크롬(상태바·네비바·탭바)에만 영향.
` : effectivePlatform === 'web' ? 'Google, Stripe, Linear 수준의 완성도 높은 웹 UI를 만드세요.' : '네이티브 모바일 앱 수준의 UI를 만드세요 (Material Design 3 기반).'}

## 디자인 시스템${hasDesignSystem ? ' ← 이 섹션의 모든 토큰·규칙을 코드에 그대로 반영할 것' : ''}
${extractDesignMdForPrompt(designMd) || '없음 — 아래 플랫폼 가이드라인과 기획서를 기반으로 최적화된 디자인을 만드세요.'}
${hasDesignSystem ? `
> **체크리스트 — 코드 작성 전 반드시 확인**
> - [ ] ${hasBrandColors ? '⛔ colors 토큰 무시 → [브랜드 컬러] 섹션의 값으로 CSS 변수 선언했는가?' : 'colors 토큰을 CSS 변수로 선언했는가?'}
> - [ ] 모든 버튼이 components.button-* 토큰 값을 따르는가?
> - [ ] 폰트 크기·굵기가 typography 토큰과 일치하는가?
> - [ ] ${hasBrandColors ? '임의 색상 사용하지 않았는가? (브랜드 컬러 외 hex 금지)' : '⛔ CSS 속성에 #hex 직접 사용했는가? → 있으면 반드시 CSS 변수로 교체 (e.g., color: #333 → color: var(--color-text))'}
` : ''}
${logoDataUrl ? `\n## 회사 로고\n헤더/네비게이션 바에 아래 이미지를 <img> 태그로 삽입하세요 (src 값 그대로 사용, 절대 변경 금지):\n<img src="${logoDataUrl}" alt="logo" style="height:28px;object-fit:contain;" />` : ''}
${hasBrandColors ? `\n## 브랜드 컬러 ← 색상은 반드시 이 값만 사용 (디자인 시스템 colors 토큰 무시, 임의 hex 절대 금지)\n메인 프라이머리: ${brandColors![0]}\nCSS :root에 반드시 선언: --color-primary: ${brandColors![0]};${brandColors![1] ? `\n보조 컬러: ${brandColors![1]}; --color-secondary: ${brandColors![1]};` : ''}${brandColors!.length > 2 ? `\n추가 컬러: ${brandColors!.slice(2).join(', ')}` : ''}\n버튼·강조·액션·링크·아이콘은 이 색상만 사용.` : ''}
## 프로젝트 개요
${projectSummary}

## 기획서
${brief}

## 사용자 선택 옵션
${answersText || '(선택 없음 — AI가 최적의 방향으로 결정)'}

---

## 플랫폼별 구현 가이드
${platformGuide}

---

## 공통 필수 기준

### 더미 데이터 (실제처럼 풍부하게)
- 한국어 실감나는 이름, 금액, 날짜, 설명문
- 다양한 상태값 (완료/진행중/대기, 높음/중간/낮음 등)
- 숫자는 구체적으로 (1,234,567원, 87%, 3.4km 등)
- 최소 3~5개 리스트 아이템

### 아이콘
- 반드시 Google Material Symbols 사용
- <head> 안에 반드시 포함: <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
- 사용법: <span class="material-symbols-outlined" style="font-size:24px;">icon_name</span>
- 아이콘명은 Material Symbols 공식 이름 사용 (home, search, person, settings, favorite, star, arrow_back, notifications, add, close, menu, more_vert, chevron_right, check, edit, delete, share, camera, image, send 등)
- SVG 인라인 및 이모지 사용 금지

### 인터랙션
- hover/active CSS 상태 정의
- transition: all 0.2s ease 기본 적용
- 선택된 탭/메뉴는 명확한 active 스타일

### CSS 변수 (필수 — Aide 에디터 연동)
- :root { --color-primary: <브랜드 주색>; } 반드시 선언
- 버튼 배경, 강조 텍스트, 아이콘 등 브랜드 컬러는 반드시 var(--color-primary) 사용

${mainOnly ? `### 단일 메인 화면 (비교 선택용)
기획서의 핵심 메인 화면 1개만 구현하세요.
- 앱에서 가장 중요한 홈/대시보드 화면
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

**화면 예시 (앱 기준, 기획서에 맞게 구성):**
- screen-home: 홈/대시보드
- screen-list: 목록/피드/탐색
- screen-detail: 상세보기/주문/작성
- screen-profile: 프로필/마이페이지
- screen-settings: 설정 (필요시)
`}
${variantStyle ? `---

## 디자인 방향 (이 시안의 핵심 차별점 — 반드시 충실히 반영)
${variantStyle}
` : hasExplore ? `---

## 다양한 시안 탐색 모드 (필수)
사용자가 '다양하게 보기'를 선택했습니다. 이 시안은 독창적이고 차별화된 방향을 탐색해야 합니다:
- 일반적인 레이아웃 패턴을 피하고 독특한 구조를 시도하세요 (카드형/리스트형/그리드형/대시보드형 중 다른 것 선택)
- 컬러 팔레트와 무드를 다른 시안과 완전히 다르게 설정하세요 (미니멀/볼드/다크/어스톤 등)
- 컴포넌트 스타일을 적극적으로 실험하세요 (플랫/엘리베이티드/아웃라인/유리모피즘 등)
` : ''}---

반드시 완전한 단일 HTML 파일로 응답하세요.
- 모든 CSS를 <style> 태그 안에 작성
- 외부 이미지 URL 절대 사용 금지
- 응답은 반드시 \`\`\`html 코드블록으로 감싸기
- 설명 텍스트 없이 코드만 출력
`;

  const referenceSection = referenceImageBase64
    ? `\n## 리뉴얼 레퍼런스 (첨부 이미지)\n이 이미지는 리뉴얼할 현재 페이지입니다. 콘텐츠 구조와 정보 계층을 유지하면서, 위의 디자인 시스템을 적용해 리뉴얼하세요.\n`
    : ''

  const fullPrompt = prompt + referenceSection

  const text = referenceImageBase64
    ? await generateProWithImage(fullPrompt, referenceImageBase64, 'image/png')
    : await generatePro(fullPrompt)

  const htmlMatch = text.match(/```html\n?([\s\S]*?)```/);
  if (htmlMatch) return htmlMatch[1];

  const htmlTagMatch = text.match(/<!DOCTYPE[\s\S]*<\/html>/i);
  if (htmlTagMatch) return htmlTagMatch[0];

  return text;
}

export async function expandToPrototype(mainHtml: string, params: GenerateParams): Promise<string> {
  const { brief, answers, projectSummary, designMd, logoDataUrl: expandLogoUrl, brandColors: expandBrandColors } = params;
  const answersText = Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');

  const prompt = `당신은 세계 최고 UI 개발자입니다. 아래 메인 화면 HTML의 디자인 언어를 100% 유지하며 완전한 멀티스크린 프로토타입을 만드세요.

## 메인 화면 HTML (디자인 레퍼런스 — 색상·폰트·컴포넌트 스타일 그대로 따를 것)
\`\`\`html
${mainHtml.slice(0, 40000)}
\`\`\`
${designMd ? `\n## 디자인 시스템 ← 메인 화면 스타일과 함께 반드시 준수. 서브 화면에도 동일한 토큰 적용 (임의 색상·폰트 사용 절대 금지)\n${extractDesignMdForPrompt(designMd)}\n` : ''}${expandLogoUrl ? `\n## 회사 로고 — 모든 화면 헤더에 동일하게 삽입 (src 절대 변경 금지)\n<img src="${expandLogoUrl}" alt="logo" style="height:28px;object-fit:contain;" />\n` : ''}${expandBrandColors && expandBrandColors.length > 0 ? `\n## 브랜드 컬러 — 서브 화면에도 동일하게 적용 (임의 hex 절대 금지)\n--color-primary: ${expandBrandColors[0]};${expandBrandColors[1] ? ` --color-secondary: ${expandBrandColors[1]};` : ''}\n` : ''}
## 프로젝트 개요
${projectSummary}

## 기획서
${brief}

## 사용자 선택 옵션
${answersText || '없음'}

## 규칙
- 메인 화면의 :root CSS 변수, font-family, 버튼/카드/입력 스타일 등을 그대로 복제
- 기획서 분석해 3~4개 서브 화면 추가 (목록, 상세, 프로필/마이페이지 등)
- 메인 화면 HTML을 id="screen-home" aide-screen으로 래핑해 첫 번째 화면으로 포함
- aide-screen 구조 + 라우터 스크립트 필수

**화면 구조:**
- 각 화면: \`<div id="screen-xxx" class="aide-screen" data-label="화면명">\`
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

  const text = await generatePro(prompt);
  const htmlMatch = text.match(/```html\n?([\s\S]*?)```/);
  if (htmlMatch) return htmlMatch[1];
  const htmlTagMatch = text.match(/<!DOCTYPE[\s\S]*<\/html>/i);
  if (htmlTagMatch) return htmlTagMatch[0];
  return text;
}

export async function refineUI(html: string, message: string, brief: string, designMd?: string): Promise<string> {
  const hasMultiScreen = html.includes('aide-screen');

  const prompt = `당신은 기존 HTML UI를 수정하는 전문 UI 개발자입니다.

## 프로젝트 기획서
${brief}
${designMd ? `\n## 디자인 시스템 ← 수정 시에도 이 토큰·규칙을 반드시 유지할 것 (임의 색상·폰트 사용 절대 금지)\n${designMd}\n` : ''}
## 사용자 수정 요청
"${message}"

## 현재 HTML
${html.slice(0, 80000)}

## 필수 규칙
${hasMultiScreen ? `- 이 HTML은 멀티스크린 프로토타입입니다 — .aide-screen 화면 구조와 라우터 스크립트(aide:screens / aide:screen / aide:navigate postMessage 처리)를 절대 삭제하거나 변경하지 마세요
- 요청된 수정은 해당하는 화면에만 적용하고 나머지 화면은 그대로 유지하세요
` : ''}- 요청된 부분만 수정하고 나머지 스타일·스크립트·구조는 100% 보존
- --color-primary CSS 변수와 브랜드 컬러 유지
- 한국어 더미 데이터 유지 (영어로 변환 금지)
- 응답은 <!DOCTYPE html> 또는 <html로 시작하는 완전한 HTML 파일만 출력 (마크다운 블록·설명 금지)`;

  const text = (await generatePro(prompt)).trim();
  const mdMatch = text.match(/```(?:html)?\n?([\s\S]*?)```/);
  return mdMatch ? mdMatch[1].trim() : text;
}

export async function analyzeTweaks(html: string, brief: string): Promise<TweakSpec> {
  const trimmedHtml = html.slice(0, 20000);

  const prompt = `
당신은 UI 더미 데이터 분석 전문가입니다.
아래 HTML UI를 분석해서 실시간으로 변경 가능한 데이터 변수와 시나리오를 추출하세요.

## 기획서
${brief.slice(0, 500)}

## HTML (앞부분)
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
    const text = await generateFlash(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { variables: [], states: [] };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { variables: [], states: [] };
  }
}
