# Studio UI KTDS 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/studio/page.tsx`의 색상·폰트·컴포넌트 형태를 ktds.md 기준으로 교체하여 상용 SaaS 수준의 UI 완성도 달성 (레이아웃·기능·로직 불변)

**Architecture:** `src/app/studio/page.tsx` 상단의 `F` 토큰 객체를 ktds 토큰으로 교체하고, 인라인 스타일 중 F 객체를 사용하지 않고 하드코딩된 hex/radius 값을 grep → 수정하는 방식으로 진행한다. 모든 API 로직, 이벤트 핸들러, iframe 스크립트는 건드리지 않는다.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Inline CSS (React style prop), Pretendard 웹폰트 (CDN)

**Design spec:** `docs/superpowers/specs/2026-05-31-studio-ktds-redesign.md`

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|---|---|
| `src/app/layout.tsx` | Pretendard CDN `<link>` 추가, body 기본 폰트 변수 설정 |
| `src/app/globals.css` | `--font-pretendard` CSS 변수 등록, `.studio-font` 클래스 추가 |
| `src/app/studio/page.tsx` | `F` 토큰 객체 교체 + Step 1~4 인라인 스타일 일괄 수정 |

---

## Task 1: Pretendard 폰트 로드

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: layout.tsx에 Pretendard CDN link 추가**

`src/app/layout.tsx`를 열어 `<html>` 태그 앞에 다음을 추가한다:

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aide — AI UI Generator",
  description: "기획서를 입력하면 AI가 맞춤형 UI 시안을 생성해드립니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: globals.css에 Pretendard 변수 등록**

`src/app/globals.css`를 열어 파일 최상단(기존 내용 위)에 다음을 추가한다:

```css
:root {
  --font-pretendard: "Pretendard Variable", Pretendard, -apple-system,
    BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI",
    "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji",
    "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
}
```

- [ ] **Step 3: 브라우저에서 폰트 확인**

`http://localhost:3000/studio` 열고 DevTools → Elements → `<body>` 선택 → Computed 탭에서 `font-family`가 Pretendard를 포함하는지 확인 (아직 studio에 적용 전이므로 network 탭에서 pretendardvariable.min.css 로딩되는지만 확인)

---

## Task 2: F 토큰 객체 교체 (스튜디오 핵심 토큰 레이어)

**Files:**
- Modify: `src/app/studio/page.tsx` (lines 17-23)

- [ ] **Step 1: 기존 F 객체 찾기**

`src/app/studio/page.tsx` 파일의 17~23번째 줄에 위치한 기존 `F` 객체:

```typescript
// 현재 (삭제 대상)
const F = {
  canvas: '#ffffff', surface1: '#f7f7f7', surface2: '#f2f2f2',
  ink: '#222222', inkMuted: '#6a6a6a', inkSubtle: '#b0b0b0',
  primary: '#ff385c', primaryActive: '#e00b41',
  hairline: '#dddddd', hairlineSoft: '#ebebeb',
}
```

- [ ] **Step 2: ktds 토큰으로 교체**

위 `F` 객체를 아래로 통째로 교체한다 (기존 키 이름 유지 + 신규 토큰 추가):

```typescript
// KTDS 디자인 토큰
const F = {
  // ─ 서피스 ─
  canvas:          '#F2F5F9',   // 페이지 배경 (primary-fill-neutral)
  surface:         '#ffffff',   // 카드/패널 배경
  surface1:        '#ffffff',   // 하위 호환
  surface2:        '#f4f4f5',   // 비활성 배경 (surface-disabled)
  // ─ 텍스트 ─
  ink:             '#171719',
  inkNeutral:      '#474a4f',
  inkMuted:        '#474a4f',   // 하위 호환
  inkAlternative:  '#9a9ba0',
  inkSubtle:       '#9a9ba0',   // 하위 호환
  inkDisabled:     '#caccce',
  // ─ Primary ─
  primary:         '#1a75ff',
  primaryActive:   '#186ae8',
  // ─ 보더 ─
  hairline:        '#c5c6c9',
  hairlineSoft:    '#dcdde0',
  // ─ 상태 ─
  positive:        '#00c244',
  negative:        '#ff4242',
  surfaceDisabled: '#f4f4f5',
}
```

- [ ] **Step 3: fontFamily 문자열 교체**

같은 파일에서 `fontFamily` 인라인 스타일 문자열을 Pretendard로 교체한다.

파일 최상단 `export default function StudioPage()` 내부 return문 가장 바깥 div의 style에서:

```typescript
// 찾기 (grep: "var(--font-inter)")
fontFamily: "var(--font-inter), Circular, ..."

// 교체
fontFamily: "var(--font-pretendard)",
```

studio/page.tsx 전체에서 `"var(--font-inter)"` 또는 `Inter` 폰트 참조를 grep으로 찾아 모두 `"var(--font-pretendard)"`로 교체한다.

- [ ] **Step 4: 브라우저에서 토큰 교체 확인**

`http://localhost:3000/studio` 열어 다음 확인:
- 배경색이 `#F2F5F9` (연한 파란 회색)으로 바뀌었는가
- Primary 색상이 파란색(#1a75ff)으로 표시되는가
- 에러 없이 렌더링되는가 (콘솔 확인)

---

## Task 3: GNB (상단 네비게이션) 스타일 교체

**Files:**
- Modify: `src/app/studio/page.tsx` (GNB JSX 섹션)

- [ ] **Step 1: GNB 섹션 찾기**

studio/page.tsx에서 `{/* GNB */}` 또는 `{/* ── GNB */}` 주석 또는 `position: 'fixed'`, `top: 0`이 함께 있는 div를 grep으로 찾는다.

```bash
grep -n "position.*fixed.*top.*0\|GNB\|nav.*height\|56px\|48px" \
  "src/app/studio/page.tsx" | head -30
```

- [ ] **Step 2: GNB 컨테이너 스타일 교체**

GNB 최상위 div의 스타일을:

```typescript
// 교체 대상 패턴 (현재 - 색상이 다를 수 있음)
backgroundColor: '#ffffff' (또는 F.surface1 등)
borderBottom: `1px solid ${F.hairlineSoft}`
height: '48px' 또는 '52px'

// 목표
backgroundColor: '#ffffff',
borderBottom: `1px solid ${F.hairlineSoft}`,  // #dcdde0 자동 반영
height: '56px',
padding: '0 24px',
```

- [ ] **Step 3: GNB 버튼들 스타일 교체**

GNB 내부 버튼(히스토리, 공유, 줌, 내보내기 등)의 스타일 패턴을 찾아 교체:

```typescript
// 히스토리/아이콘 버튼 (ghost 스타일)
{
  height: '36px',
  padding: '0 12px',
  borderRadius: '8px',        // 기존 pill/둥근 값 → 8px
  border: 'none',
  backgroundColor: 'transparent',
  color: F.ink,
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: '6px',
}

// hover 처리: onMouseEnter/Leave로 backgroundColor: F.surface2 토글
```

- [ ] **Step 4: 브라우저에서 GNB 확인**

`http://localhost:3000/studio?brief=test` 열고:
- GNB 높이 56px 확인
- 하단 구분선 `#dcdde0` 확인
- 버튼들 8px radius 확인

---

## Task 4: Step 1 — 브리프 입력 UI

**Files:**
- Modify: `src/app/studio/page.tsx` (Step 1 렌더 섹션)

- [ ] **Step 1: Step 1 렌더 블록 찾기**

```bash
grep -n "step === 1\|step==1\|Step 1\|브리프\|brief.*input\|텍스트에리어" \
  "src/app/studio/page.tsx" | head -20
```

step === 1 조건부 렌더 블록 전체를 확인한다.

- [ ] **Step 2: 페이지 배경 및 중앙 카드 스타일 교체**

Step 1 최상위 wrapper div:

```typescript
// 목표 스타일
{
  minHeight: '100vh',
  backgroundColor: F.canvas,   // #F2F5F9
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 24px',
  fontFamily: 'var(--font-pretendard)',
}
```

중앙 카드 div:

```typescript
{
  width: '100%',
  maxWidth: '640px',
  backgroundColor: F.surface,    // #ffffff
  borderRadius: '12px',
  border: `1px solid ${F.hairlineSoft}`,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(220,221,224,0.6)',
  padding: '40px',
}
```

- [ ] **Step 3: 텍스트에리어 스타일 교체**

```typescript
// 텍스트에리어
{
  width: '100%',
  minHeight: '120px',
  padding: '12px 16px',
  borderRadius: '8px',
  border: `1px solid ${F.hairline}`,   // #c5c6c9
  backgroundColor: F.surface,
  color: F.ink,
  fontSize: '16px',
  lineHeight: 1.5,
  fontFamily: 'var(--font-pretendard)',
  resize: 'none',
  outline: 'none',
  // focus는 onFocus/onBlur로 border-color: F.primary 토글
}
```

- [ ] **Step 4: 디자인 프리셋 칩 스타일 교체**

선택/비선택 칩:

```typescript
// 비선택 칩
{
  padding: '8px 14px',
  borderRadius: '8px',           // pill → 8px
  border: `1px solid ${F.hairline}`,
  backgroundColor: F.surface,
  color: F.ink,
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
}

// 선택된 칩
{
  padding: '8px 14px',
  borderRadius: '8px',
  border: `1px solid ${F.primary}`,
  backgroundColor: '#EBF3FF',    // primary 10% tint
  color: F.primary,
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
}
```

- [ ] **Step 5: 생성하기 버튼 스타일 교체**

```typescript
// Primary filled 버튼 (large)
{
  width: '100%',
  height: '48px',
  borderRadius: '8px',           // 기존 둥근 radius → 8px
  border: 'none',
  backgroundColor: canSubmit ? F.primary : F.surfaceDisabled,
  color: canSubmit ? '#ffffff' : F.inkDisabled,
  fontSize: '16px',
  fontWeight: 600,
  cursor: canSubmit ? 'pointer' : 'not-allowed',
  fontFamily: 'var(--font-pretendard)',
  transition: 'background-color 0.15s',
}
```

- [ ] **Step 6: 브라우저 Step 1 확인**

`http://localhost:3000/studio` 열어:
- 배경 #F2F5F9 확인
- 카드 흰색, 12px radius, 그림자 확인
- 텍스트에리어 8px radius, #c5c6c9 보더 확인
- 프리셋 칩 8px radius (pill 제거) 확인
- 생성하기 버튼 #1a75ff, 48px, 8px radius 확인

---

## Task 5: Step 2 — 설문지 UI

**Files:**
- Modify: `src/app/studio/page.tsx` (Step 2 렌더 섹션)

- [ ] **Step 1: Step 2 렌더 블록 찾기**

```bash
grep -n "step === 2\|questionnaire\|질문\|설문\|question" \
  "src/app/studio/page.tsx" | head -20
```

- [ ] **Step 2: 설문 카드 스타일 교체**

```typescript
// 질문 카드
{
  backgroundColor: F.surface,
  borderRadius: '12px',
  border: `1px solid ${F.hairlineSoft}`,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  padding: '32px',
  width: '100%',
  maxWidth: '600px',
}
```

- [ ] **Step 3: 진행 표시 스타일 교체**

진행 도트/바를 primary 블루로:

```typescript
// 활성 도트
{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: F.primary }
// 비활성 도트
{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: F.hairline }
```

- [ ] **Step 4: 선택지 옵션 칩 스타일 교체**

Task 4 Step 4와 동일한 칩 스타일 적용 (선택/비선택):

```typescript
// 비선택
{
  padding: '10px 16px',
  borderRadius: '8px',
  border: `1px solid ${F.hairline}`,
  backgroundColor: F.surface,
  color: F.ink,
  fontSize: '15px',
  fontWeight: 400,
  cursor: 'pointer',
  textAlign: 'left' as const,
}

// 선택됨
{
  padding: '10px 16px',
  borderRadius: '8px',
  border: `1px solid ${F.primary}`,
  backgroundColor: '#EBF3FF',
  color: F.primary,
  fontSize: '15px',
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left' as const,
}
```

- [ ] **Step 5: 다음/생성 버튼 스타일 교체**

```typescript
{
  height: '44px',
  padding: '0 24px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: F.primary,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-pretendard)',
}
```

- [ ] **Step 6: 브라우저에서 Step 2 확인**

brief 입력 후 생성 → Step 2 진입하여:
- 카드 흰색 12px radius 확인
- 진행 도트 파란색 확인
- 선택지 칩 8px radius 확인
- 선택 시 #1a75ff border + #EBF3FF 배경 확인

---

## Task 6: Step 3 — 시안 선택 캔버스

**Files:**
- Modify: `src/app/studio/page.tsx` (Step 3 렌더 섹션)

- [ ] **Step 1: Step 3 렌더 블록 찾기**

```bash
grep -n "step === 3\|mainVariants\|시안\|canvas.*area\|canvasArea" \
  "src/app/studio/page.tsx" | head -20
```

- [ ] **Step 2: 캔버스 배경 유지, 툴바 교체**

캔버스 배경 (`#1c2840` 또는 어두운 색)은 **그대로 유지**.

상단 툴바/컨트롤 바 스타일:

```typescript
// 캔버스 위 툴바 (있는 경우)
{
  backgroundColor: '#ffffff',
  borderBottom: `1px solid ${F.hairlineSoft}`,
  padding: '0 24px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}
```

- [ ] **Step 3: 시안 카드 하단 버튼 스타일 교체**

각 시안 카드 아래 "이 시안 선택" 버튼:

```typescript
// dark canvas 위 outline 버튼
{
  padding: '10px 20px',
  borderRadius: '8px',
  border: '1.5px solid rgba(255,255,255,0.8)',
  backgroundColor: 'rgba(255,255,255,0.1)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
  transition: 'all 0.15s',
}
```

- [ ] **Step 4: 로딩 오버레이 스피너 색상 교체**

시안 생성 중 로딩 스피너:

```typescript
// 스피너 border-top 색상
borderTopColor: F.primary,   // #1a75ff
```

- [ ] **Step 5: 브라우저에서 Step 3 확인**

설문 완료 후 Step 3 진입:
- 캔버스 어두운 배경 유지 확인
- "이 시안 선택" 버튼 8px radius, white outline 확인
- 로딩 스피너 파란색 확인

---

## Task 7: Step 4 — 에디터 우측 패널

**Files:**
- Modify: `src/app/studio/page.tsx` (Step 4 렌더 섹션)

- [ ] **Step 1: Step 4 렌더 블록 찾기**

```bash
grep -n "step === 4\|tweaksOpen\|editMode\|사이드\|right.*panel\|inspector" \
  "src/app/studio/page.tsx" | head -30
```

- [ ] **Step 2: 우측 패널 컨테이너 스타일 교체**

```typescript
// 우측 패널 wrapper
{
  width: '320px',
  flexShrink: 0,
  backgroundColor: F.surface,     // #ffffff
  borderLeft: `1px solid ${F.hairlineSoft}`,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
}
```

- [ ] **Step 3: 패널 탭 스타일 교체**

Inspector / Tweak / Chat / Figma 탭:

```typescript
// 탭 컨테이너
{
  display: 'flex',
  borderBottom: `1px solid ${F.hairlineSoft}`,
  backgroundColor: F.surface,
  padding: '0 16px',
}

// 개별 탭 (비활성)
{
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: 500,
  color: F.inkAlternative,
  borderBottom: '2px solid transparent',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
}

// 개별 탭 (활성)
{
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: 600,
  color: F.primary,
  borderBottom: `2px solid ${F.primary}`,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  borderBottomColor: F.primary,
}
```

- [ ] **Step 4: Inspector 폼 요소 스타일 교체**

inspector 내 select/input들:

```typescript
// select 박스
{
  height: '36px',
  padding: '0 10px',
  borderRadius: '8px',
  border: `1px solid ${F.hairline}`,
  backgroundColor: F.surface,
  color: F.ink,
  fontSize: '13px',
  fontFamily: 'var(--font-pretendard)',
}
```

- [ ] **Step 5: Chat 패널 스타일 교체**

채팅 인풋 영역:

```typescript
// 채팅 인풋
{
  flex: 1,
  padding: '10px 14px',
  borderRadius: '8px',
  border: `1px solid ${F.hairline}`,
  backgroundColor: F.surface,
  color: F.ink,
  fontSize: '14px',
  fontFamily: 'var(--font-pretendard)',
  resize: 'none',
  outline: 'none',
}

// 전송 버튼
{
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: F.primary,
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}
```

- [ ] **Step 6: Variant A/B 탭 스타일 교체**

하단 A/B variant 탭을 ktds 탭 스타일로 교체 (Step 3과 동일한 탭 스타일 패턴 적용)

- [ ] **Step 7: 브라우저에서 Step 4 확인**

시안 선택 후 Step 4 진입:
- 우측 패널 흰색, 좌측 구분선 #dcdde0 확인
- Inspector/Tweak/Chat 탭 파란 underline 확인
- 채팅 인풋 8px radius 확인
- 전송 버튼 #1a75ff 확인

---

## Task 8: 모달 및 오버레이 스타일 교체

**Files:**
- Modify: `src/app/studio/page.tsx` (모달 섹션들)

- [ ] **Step 1: 모달 목록 파악**

```bash
grep -n "modal\|Modal\|overlay\|Overlay\|fixed.*inset\|position.*fixed" \
  "src/app/studio/page.tsx" | grep -v "script\|BRIDGE\|INSPECTOR" | head -30
```

모달 종류: API Key 모달, 히스토리 모달, Figma Export 모달, 줌 드롭다운, 공유 드롭다운

- [ ] **Step 2: 모달 컨테이너 공통 스타일 교체**

모든 모달의 내부 카드(backdrop 뒤 흰 박스):

```typescript
// 모달 카드 공통
{
  backgroundColor: F.surface,    // #ffffff
  borderRadius: '16px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
  border: `1px solid ${F.hairlineSoft}`,
  overflow: 'hidden',
}
```

모달 헤더 구분선:

```typescript
borderBottom: `1px solid ${F.hairlineSoft}`,  // #dcdde0
```

- [ ] **Step 3: 모달 내 버튼 스타일 교체**

모달 내 주요 CTA (저장, 확인 등):

```typescript
{
  height: '40px',
  padding: '0 20px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: F.primary,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}
```

닫기 버튼(X):

```typescript
{
  width: '32px',
  height: '32px',
  borderRadius: '8px',    // 기존 50%(원형) → 8px
  border: 'none',
  backgroundColor: F.surface2,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
```

- [ ] **Step 4: API Key 탭 스타일 교체**

API Key 모달 내 Gemini/Unsplash/Figma 탭을 ktds 탭 스타일로 교체 (Task 7 Step 3과 동일)

- [ ] **Step 5: 줌/공유 드롭다운 스타일 교체**

```typescript
// 드롭다운 패널
{
  backgroundColor: F.surface,
  borderRadius: '12px',
  border: `1px solid ${F.hairlineSoft}`,
  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  padding: '8px',
  minWidth: '180px',
}

// 드롭다운 아이템
{
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '14px',
  color: F.ink,
  cursor: 'pointer',
  // hover: backgroundColor: F.canvas (#F2F5F9)
}
```

- [ ] **Step 6: 전체 스튜디오 최종 확인**

`http://localhost:3000/studio` 에서 전체 플로우 테스트:

1. Step 1: 브리프 입력 → 배경·카드·버튼 ktds 스타일 확인
2. Step 2: 설문 → 진행도표·옵션칩·다음 버튼 확인
3. Step 3: 시안 생성 → 로딩 스피너·캔버스·선택 버튼 확인
4. Step 4: 에디터 → GNB·우측패널·탭·채팅 확인
5. API Key 모달 열기 → 탭·인풋·버튼 확인
6. 히스토리 모달 → 스타일 확인
7. 줌/공유 드롭다운 → 스타일 확인

콘솔 에러 없음 확인. 모든 기존 기능(시안 생성, 편집, 채팅 수정, Figma 내보내기) 정상 동작 확인.

---

## Self-Review

### Spec 커버리지 확인

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| F 토큰 교체 (컬러) | Task 2 |
| Pretendard 폰트 | Task 1 |
| 버튼 radius 8px | Task 4~8 전반 |
| GNB 56px | Task 3 |
| Step 1 카드 UI | Task 4 |
| Step 2 설문 UI | Task 5 |
| Step 3 캔버스 (어두운 배경 유지) | Task 6 |
| Step 4 우측 패널 탭 | Task 7 |
| 모달 스타일 | Task 8 |
| 랜딩 페이지 변경 없음 | 해당 없음 (건드리지 않음) |
| 기능/로직 변경 없음 | 해당 없음 (스타일만 교체) |

### 타입 일관성

- 모든 task에서 `F.primary`, `F.canvas`, `F.surface` 등 동일한 키 이름 사용 ✅
- `F.hairlineSoft` = `#dcdde0` 일관성 ✅
- `#EBF3FF` (primary 10% tint) Task 4, 5에서 동일하게 사용 ✅

### Placeholder 없음 확인 ✅
