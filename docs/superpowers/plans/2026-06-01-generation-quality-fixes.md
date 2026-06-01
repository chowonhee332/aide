# Generation Quality Fixes — 5가지 최적화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** UI 생성 품질의 5가지 핵심 문제를 수정한다 — (1) 프로토타입 서브화면 구조, (2) 모바일→데스크탑 반응형, (3) 로고 강제 주입, (4) 하단 탭바 강제, (5) 3D 도메인별 패턴.

**Architecture:** 모든 변경은 `src/lib/gemini.ts` 한 파일에 집중된다. 프롬프트 수정(Task 1/4/5)과 후처리 코드 수정(Task 2/3)으로 구분된다. 다른 파일은 건드리지 않는다. git 없음 — TypeScript 컴파일과 브라우저 확인으로 검증.

**Tech Stack:** TypeScript, Next.js 16 (App Router), Gemini API

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|---|---|
| `src/lib/gemini.ts` | 5개 Task 모두 이 파일만 수정 |

---

## Task 1: 프로토타입 서브화면 — 하단탭 기반 강제

**Problem:** `expandToPrototype`가 "3~4개 서브 화면"만 지시해서 AI가 유저 타입 화면(신규/일반/헤비 유저)을 서브화면으로 만듦. 올바른 구조는 하단탭 목적지(홈/레시피/냉장고/마이 등)가 서브화면이고, 유저 타입은 Tweaks States만.

**Files:**
- Modify: `src/lib/gemini.ts` (line ~3009)

- [ ] **Step 1: expandToPrototype 프롬프트에서 서브화면 기준 명시**

`src/lib/gemini.ts`에서 아래 문자열을 찾는다:

```typescript
**Step 2 — 서브 화면 구성 (3~4개):**
각 서브 화면은 반드시 이 구조를 따르세요:
```

이 문자열을 아래로 교체한다:

```typescript
**Step 2 — 서브 화면 구성 (3~4개):**
⚠️ 서브 화면 기준 (CRITICAL):
- 모바일 앱: 하단 탭바의 각 탭 목적지를 서브 화면으로 만드세요 (예: 레시피 탭 → screen-recipe, 냉장고 탭 → screen-fridge, 장보기 탭 → screen-cart, 마이 탭 → screen-profile)
- 웹 앱: GNB의 각 메뉴 목적지를 서브 화면으로 만드세요 (예: 검색, 카테고리, 마이페이지)
- 각 탭에 해당하는 실제 기능 화면을 만들어야 합니다. 콘텐츠가 풍부한 실제 서비스 화면이어야 합니다.
⛔ 절대 금지: "신규 유저", "일반 유저", "헤비 유저", "새 유저" 같은 유저 타입을 서브 화면으로 만들지 마세요.
  유저 타입 변형은 별도 Tweaks States로 처리되므로 서브 화면에서 다룰 필요 없습니다.

각 서브 화면은 반드시 이 구조를 따르세요:
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide" && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

Expected: 0 errors

- [ ] **Step 3: 변경 확인**

```bash
grep -n "하단 탭바의 각 탭 목적지" "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide/src/lib/gemini.ts"
```

Expected: 1 match (line ~3009)

---

## Task 2: 모바일 앱 → 데스크탑 뷰 폰 프레임 CSS 주입

**Problem:** 모바일 앱 HTML이 1440px 데스크탑에서 390px 카드가 중앙에 덩그러니 표시됨. 양옆 빈 공간이 매우 어색함.

**Solution:** `generateUI` 및 `expandToPrototype` 후처리에서 platform이 mobile일 때 데스크탑 뷰용 폰 프레임 CSS를 inject하는 함수를 추가한다.

**Files:**
- Modify: `src/lib/gemini.ts` (line ~1032 근처에 새 함수 추가, line ~2903 및 ~3064 근처에 호출)

- [ ] **Step 1: `injectMobilePhoneFrame` 함수 추가**

`src/lib/gemini.ts`에서 `function injectDesignContractStyle` 바로 위(line ~1032)에 아래 함수를 삽입한다:

```typescript
function injectMobilePhoneFrame(html: string, platform?: string): string {
  if (platform !== 'mobile') return html

  const frameCSS = `
<style data-aide-phone-frame="1">
@media (min-width: 768px) {
  html { background: #f0f2f5 !important; }
  body {
    display: flex !important;
    justify-content: center !important;
    align-items: flex-start !important;
    min-height: 100vh !important;
    padding: 40px 0 !important;
    box-sizing: border-box !important;
    background: #f0f2f5 !important;
  }
  body > div:first-child,
  body > .app-shell,
  body > .app-wrapper,
  body > .app-container,
  body > .screen-container,
  body > [class*="app-"],
  body > [class*="shell"],
  body > [class*="wrapper"] {
    max-width: 390px !important;
    width: 100% !important;
    border-radius: 40px !important;
    overflow: hidden !important;
    box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 0 0 8px #1a1a1a, 0 0 0 9px #333 !important;
    position: relative !important;
    flex-shrink: 0 !important;
  }
}
</style>`

  if (html.includes('</head>')) {
    return html.replace('</head>', frameCSS + '</head>')
  }
  if (html.includes('<body')) {
    return html.replace('<body', frameCSS + '<body')
  }
  return frameCSS + html
}
```

- [ ] **Step 2: generateUI 후처리에 호출 추가**

`src/lib/gemini.ts`에서 `generateUI` 함수 내 아래 부분을 찾는다 (line ~2903-2905):

```typescript
  html = sanitizeGeneratedBranding(html, brief, effectiveDesignMd, logoDataUrl)
  html = applyLogoDataUrlOnce(html, logoDataUrl)
```

이 두 줄 아래에 한 줄 추가:

```typescript
  html = sanitizeGeneratedBranding(html, brief, effectiveDesignMd, logoDataUrl)
  html = applyLogoDataUrlOnce(html, logoDataUrl)
  html = injectMobilePhoneFrame(html, effectivePlatform)
```

`effectivePlatform`은 이미 해당 함수 내에 선언된 변수다. 없으면 `platform`을 사용한다.

- [ ] **Step 3: expandToPrototype 후처리에도 호출 추가**

`src/lib/gemini.ts`에서 expand 후처리 부분을 찾는다 (line ~3064-3070):

```typescript
  html = sanitizeGeneratedBranding(html, brief, designMd, expandLogoUrl)
  html = applyLogoDataUrlOnce(html, expandLogoUrl)
  ...
  html = injectDesignContractStyle(html, designMd || '', ...)
```

`injectDesignContractStyle` 호출 다음 줄에 추가:

```typescript
  html = injectDesignContractStyle(html, designMd || '', !!(expandBrandColors && expandBrandColors.length > 0))
  html = injectMobilePhoneFrame(html, platform)
```

- [ ] **Step 4: TypeScript 컴파일 확인**

```bash
cd "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide" && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

Expected: 0 errors

---

## Task 3: 로고 — AI 미삽입 시 헤더 강제 주입

**Problem:** AI가 `__LOGO_DATA_URL__`을 HTML에 전혀 안 넣으면 `applyLogoDataUrlOnce`의 `!used` 분기에서 `firstIdx === -1`이 되어 로고가 완전히 사라진다.

**Files:**
- Modify: `src/lib/gemini.ts` (line 1170–1189, `applyLogoDataUrlOnce` 함수)

- [ ] **Step 1: `applyLogoDataUrlOnce` 함수 수정**

현재 코드 (line 1170-1189):

```typescript
function applyLogoDataUrlOnce(html: string, logoDataUrl?: string | null): string {
  if (!logoDataUrl) return html

  let normalized = html.split(logoDataUrl).join('__LOGO_DATA_URL__')
  let used = false
  normalized = normalized.replace(/<img\b[^>]*src=(["'])__LOGO_DATA_URL__\1[^>]*>/gi, (tag) => {
    if (used) return ''
    used = true
    return normalizeLogoImgTag(tag).replace('__LOGO_DATA_URL__', logoDataUrl)
  })

  if (!used) {
    const firstIdx = normalized.indexOf('__LOGO_DATA_URL__')
    if (firstIdx !== -1) {
      normalized = normalized.slice(0, firstIdx) + logoDataUrl + normalized.slice(firstIdx + '__LOGO_DATA_URL__'.length)
    }
  }

  return normalized.split('__LOGO_DATA_URL__').join('')
}
```

이 함수 전체를 아래로 교체한다:

```typescript
function applyLogoDataUrlOnce(html: string, logoDataUrl?: string | null): string {
  if (!logoDataUrl) return html

  let normalized = html.split(logoDataUrl).join('__LOGO_DATA_URL__')
  let used = false
  normalized = normalized.replace(/<img\b[^>]*src=(["'])__LOGO_DATA_URL__\1[^>]*>/gi, (tag) => {
    if (used) return ''
    used = true
    return normalizeLogoImgTag(tag).replace('__LOGO_DATA_URL__', logoDataUrl)
  })

  if (!used) {
    const firstIdx = normalized.indexOf('__LOGO_DATA_URL__')
    if (firstIdx !== -1) {
      // __LOGO_DATA_URL__ 텍스트로만 존재하는 경우 (img 태그 밖) → 첫 번째만 교체
      normalized = normalized.slice(0, firstIdx) + logoDataUrl + normalized.slice(firstIdx + '__LOGO_DATA_URL__'.length)
    } else {
      // AI가 로고를 아예 안 넣음 → 첫 번째 헤더/앱바 요소 직후에 강제 삽입
      const logoImg = `<img src="${logoDataUrl}" alt="logo" style="height:28px;max-width:120px;object-fit:contain;flex-shrink:0;display:block;" />`
      const headerPattern = /(<(?:header|nav)\b[^>]*>|<div\b[^>]*class="[^"]*(?:app-bar|gnb|header|top-bar|appbar|toolbar)[^"]*"[^>]*>)/i
      if (headerPattern.test(normalized)) {
        normalized = normalized.replace(headerPattern, (match) => match + logoImg)
      }
      // 헤더도 못 찾으면 그냥 반환 (강제 삽입 실패해도 기능 유지)
    }
  }

  return normalized.split('__LOGO_DATA_URL__').join('')
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide" && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

Expected: 0 errors

- [ ] **Step 3: 함수 변경 확인**

```bash
grep -n "AI가 로고를 아예 안 넣음" "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide/src/lib/gemini.ts"
```

Expected: 1 match

---

## Task 4: 하단 탭바 — position:fixed 프롬프트 강화

**Problem:** 프롬프트에 CSS 템플릿이 있지만 AI가 다른 클래스명을 쓰거나 position을 override해서 탭바가 스크롤에 따라 사라짐.

**Files:**
- Modify: `src/lib/gemini.ts` (platform-specific 지시 섹션, line ~1695 근처)

- [ ] **Step 1: 모바일 탭바 position:fixed 지시 강화**

`src/lib/gemini.ts`에서 아래 문자열을 찾는다:

```typescript
8. **반응형 레이아웃 — CSS @media 쿼리 (MANDATORY)**
```

이 섹션 **바로 위**에 아래 블록을 삽입한다 (모바일 플랫폼 전용 지시이므로 `effectivePlatform !== 'web'` 조건이 있는 곳 근처에 넣되, 문자열 삽입이므로 generateUI 내의 프롬프트 문자열 안에 직접 추가):

```typescript
7.5. **하단 탭바 position:fixed 필수 (모바일 앱 전용)**
   하단 탭바가 있는 모든 모바일 화면에서 반드시 지킬 규칙:
   - 하단 탭바 CSS: \`position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;\`
   - 하단 탭바를 감싸는 부모 요소에도 \`position: fixed\`를 올바르게 설정할 것
   - 메인 콘텐츠(스크롤 영역)에 반드시 \`padding-bottom: 72px;\` 이상을 추가해 탭바에 콘텐츠가 가려지지 않게 할 것
   - ❌ 실패 조건: 탭바가 static/relative/absolute이거나, 스크롤 시 탭바가 사라지거나, 마지막 카드가 탭바에 가려지는 경우

```

정확한 삽입 위치를 grep으로 찾는다:

```bash
grep -n "반응형 레이아웃.*CSS.*media.*MANDATORY\|8\..*반응형 레이아웃" "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide/src/lib/gemini.ts"
```

해당 줄 직전에 위 텍스트를 삽입한다.

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide" && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

Expected: 0 errors

---

## Task 5: 3D 이미지 — 도메인 + 시안별 배치 패턴 강제

**Problem:** `buildHeroVisualIntegrationLayer`가 variantStyle만 받고 domain은 안 받음. 음식/리워드 앱에서도 Pattern D(작은 플로팅)가 선택되어 3D가 스티커처럼 보임.

**Solution:** 함수에 `domain` 파라미터를 추가하고, 도메인별로 권장 패턴을 지시한다.

**Files:**
- Modify: `src/lib/gemini.ts` (line 2066, `buildHeroVisualIntegrationLayer` 함수 + 호출부)

- [ ] **Step 1: 함수 시그니처에 domain 파라미터 추가**

현재 (line 2066):
```typescript
function buildHeroVisualIntegrationLayer(heroImagePrompt?: string, variantStyle?: string): string {
```

변경 후:
```typescript
function buildHeroVisualIntegrationLayer(heroImagePrompt?: string, variantStyle?: string, domain?: AppDomain): string {
```

- [ ] **Step 2: 함수 내부에 도메인 패턴 힌트 추가**

`buildHeroVisualIntegrationLayer` 함수 내에서 `const variantHint = ...` 블록 아래, `return \`## 3D 이미지-UI 통합 설계 ...` 앞에 아래 코드를 삽입한다:

```typescript
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
```

- [ ] **Step 3: 반환 문자열에 domainPatternHint 추가**

`buildHeroVisualIntegrationLayer`의 `return \`## 3D 이미지-UI 통합 설계 (CRITICAL)` 문자열에서 `4. **시안 차별화**` 섹션 뒤에 아래를 추가한다:

현재:
```typescript
4. **시안 차별화**
   - ${variantHint}
   - A/B/C가 모두 같은 "흰 카드 + 오른쪽 작은 3D" 구조로 나오면 실패입니다.
   - 3D를 쓰는 시안과 실사/데이터 중심 시안의 역할이 서로 달라야 합니다.

이 섹션은 출력하지 말고 최종 HTML/CSS에만 반영하세요.`
```

변경 후:
```typescript
4. **시안 차별화**
   - ${variantHint}
   - A/B/C가 모두 같은 "흰 카드 + 오른쪽 작은 3D" 구조로 나오면 실패입니다.
   - 3D를 쓰는 시안과 실사/데이터 중심 시안의 역할이 서로 달라야 합니다.

5. **도메인 + 시안별 필수 패턴**
   - ${domainPatternHint}

이 섹션은 출력하지 말고 최종 HTML/CSS에만 반영하세요.`
```

- [ ] **Step 4: 함수 호출부에 domain 파라미터 전달**

`src/lib/gemini.ts`에서 `buildHeroVisualIntegrationLayer` 호출 위치를 찾는다:

```bash
grep -n "buildHeroVisualIntegrationLayer(" "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide/src/lib/gemini.ts"
```

찾은 각 호출에 `domain` 파라미터를 추가한다. 예:

```typescript
// 기존
${buildHeroVisualIntegrationLayer(effectiveHeroImagePrompt, variantStyle)}

// 변경
${buildHeroVisualIntegrationLayer(effectiveHeroImagePrompt, variantStyle, domain)}
```

- [ ] **Step 5: TypeScript 컴파일 확인**

```bash
cd "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide" && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

Expected: 0 errors

- [ ] **Step 6: 최종 전체 검증**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: `200`

---

## Self-Review

### Spec 커버리지

| 이슈 | Task | 방법 |
|---|---|---|
| 프로토타입 서브화면 구조 오류 | Task 1 | expand 프롬프트에 하단탭 기반 지시 추가 |
| 모바일→데스크탑 반응형 | Task 2 | `injectMobilePhoneFrame` 함수 추가 + 호출 |
| 로고 누락 | Task 3 | `applyLogoDataUrlOnce` — AI 미삽입 시 헤더 강제 주입 |
| 하단 탭바 누락 | Task 4 | 프롬프트에 position:fixed 명시적 필수 조건 추가 |
| 3D 부자연스러움 | Task 5 | `buildHeroVisualIntegrationLayer`에 domain 파라미터 + 패턴 강제 |

### Placeholder 없음 ✅
### 타입 일관성: `AppDomain` 타입은 기존 gemini.ts에 정의된 타입 사용 ✅
### 변경 파일: `src/lib/gemini.ts` 1개만 ✅
