# Studio UI 고도화 — KTDS 디자인 시스템 정렬

**날짜:** 2026-05-31  
**범위:** `/studio` 페이지 전체 (Step 1~4), GNB  
**제외:** `/` 랜딩 페이지 (현행 유지)  
**접근:** Option B — 컴포넌트 단위 리디자인 (레이아웃·기능 불변, 스타일만 교체)

---

## 1. 목표

`/studio/page.tsx`의 색상 토큰, 폰트, 컴포넌트 형태를 `ktds.md` 기준으로 정렬하여 실제 상용 SaaS 서비스 수준의 UI 완성도를 달성한다. 기존 4단계 플로우, 설문 로직, iframe 프리뷰, 인스펙터, 채팅, Figma 내보내기 등 **모든 기능과 레이아웃 구조는 변경하지 않는다.**

---

## 2. 디자인 토큰

### 2.1 컬러

| 토큰 | 값 | 용도 |
|---|---|---|
| `canvas` | `#F2F5F9` | 페이지 배경 |
| `surface` | `#ffffff` | 카드, 패널, 모달 배경 |
| `primary` | `#1a75ff` | CTA 버튼, 선택 상태, 탭 언더라인 |
| `primaryActive` | `#186ae8` | primary 호버/액티브 |
| `ink` | `#171719` | 본문 텍스트 |
| `inkNeutral` | `#474a4f` | 보조 텍스트 |
| `inkAlternative` | `#9a9ba0` | 플레이스홀더, 비활성 텍스트 |
| `border` | `#c5c6c9` | 기본 보더 |
| `borderAlt` | `#dcdde0` | 구분선, 약한 보더 |
| `positive` | `#00c244` | 성공/유효 상태 |
| `negative` | `#ff4242` | 오류/경고 상태 |
| `surfaceDisabled` | `#f4f4f5` | 비활성 배경 |
| `inkDisabled` | `#caccce` | 비활성 텍스트 |

> 현재 코드의 `F` 객체를 위 토큰으로 전면 교체한다.

### 2.2 타이포그래피

**폰트:** Pretendard — `next/font/google`로 로드하여 CSS 변수 `--font-pretendard` 등록

| 토큰 | size | weight | lineHeight |
|---|---|---|---|
| `display` | 32px | 700 | 1.25 |
| `headingLg` | 24px | 700 | 1.33 |
| `headingMd` | 20px | 600 | 1.4 |
| `headingSm` | 18px | 600 | 1.44 |
| `body1` | 16px | 400 | 1.5 |
| `body2` | 14px | 400 | 1.5 |
| `caption` | 12px | 400 | 1.33 |

### 2.3 형태

| 토큰 | 값 | 용도 |
|---|---|---|
| `radiusSm` | 4px | 태그, 배지 |
| `radiusMd` | 8px | **버튼, 인풋** (pill 절대 금지) |
| `radiusLg` | 12px | 카드, 모달, 패널 |
| `radiusXl` | 16px | 큰 카드 |

| 컴포넌트 | height |
|---|---|
| 버튼 (기본) | 40px |
| 버튼 (large) | 48px |
| 인풋 (기본) | 40px |
| GNB | 56px |

---

## 3. 컴포넌트 스펙

### 3.1 버튼

- **Primary (filled):** `background #1a75ff`, `color #ffffff`, `radius 8px`, `height 40px`, hover → `#186ae8`
- **Secondary (outline):** `border 1px #c5c6c9`, `background transparent`, `color #171719`, `radius 8px`
- **Ghost:** `border none`, `background transparent`, `color #1a75ff`
- **Disabled:** `background #f4f4f5`, `color #caccce`, `cursor not-allowed`

### 3.2 인풋 / 텍스트에리아

- `border 1px #c5c6c9`, `radius 8px`, `background #ffffff`
- focus: `border-color #1a75ff`, `outline none`
- error: `border-color #ff4242`
- placeholder: `color #9a9ba0`

### 3.3 카드 / 패널

- `background #ffffff`, `border-radius 12px`
- shadow: `0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px #dcdde0`

### 3.4 탭 (Step 4 우측 패널)

- 기본: `color #9a9ba0`, `border-bottom 2px transparent`
- 선택: `color #1a75ff`, `border-bottom 2px #1a75ff`
- 배경: `#ffffff`

### 3.5 선택 칩 (설문 옵션 / 디자인 프리셋)

- 미선택: `border 1px #c5c6c9`, `background #ffffff`, `color #171719`, `radius 8px`
- 선택됨: `border 1px #1a75ff`, `background #EBF3FF`, `color #1a75ff`, `radius 8px`

### 3.6 GNB

- `background #ffffff`, `border-bottom 1px #dcdde0`, `height 56px`
- 좌: Aide 워드마크 + 브리프 텍스트 (body2, inkAlternative)
- 우: 히스토리 드롭다운, 공유, 줌, 내보내기 — 모두 Ghost 또는 Outline 버튼

---

## 4. Step별 적용

### Step 1 — 브리프 입력

- 페이지 배경: `canvas (#F2F5F9)`
- 중앙 카드: `surface` 배경, `radius 12px`, 카드 shadow
- 텍스트에리아: ktds 인풋 스펙 적용
- 디자인 프리셋 칩: 선택 칩 스펙 적용 (현재 pill → 8px radius)
- 생성하기 버튼: Primary filled, `height 48px` (large)

### Step 2 — 설문지

- 페이지 배경: `canvas`
- 질문 카드: `surface`, `radius 12px`
- 진행 표시: primary 블루 도트/바
- 선택지: 선택 칩 스펙 (single/multi 모두)
- 다음 버튼: Primary filled

### Step 3 — 시안 선택 캔버스

- 캔버스 배경: 기존 `#1c2840` 어둠 유지 (시안이 잘 보이는 환경)
- GNB: ktds 스펙 적용
- 시안 카드 하단 "이 시안 선택" 버튼: white background, `border 1px #ffffff`, `radius 8px` (dark canvas 위 outline)
- 로딩 오버레이: `background rgba(242,245,249,0.93)` + primary spinner

### Step 4 — 에디터

- GNB: ktds 스펙 (히스토리 탭 포함)
- 우측 패널: `background #ffffff`, `border-left 1px #dcdde0`, `width 320px`
- 패널 탭: ktds 탭 스펙
- Inspector 폼 요소: ktds 인풋/셀렉트
- Chat 인풋: ktds 인풋, 전송 버튼 Primary
- Variant A/B 탭: ktds 탭 스펙
- 공유/줌/내보내기 드롭다운: `surface` 배경, `radius 12px`, 카드 shadow

---

## 5. 구현 범위 (변경 없는 항목)

다음은 **스타일 교체 대상이 아님** — 로직, 구조, 기능 모두 현행 유지:

- API 호출 로직 (`/api/analyze`, `/api/generate`, `/api/refine` 등)
- iframe bridge/inspector 스크립트
- 캔버스 줌/패닝 이벤트 핸들러
- Undo/Redo 히스토리
- Figma 내보내기 플로우
- 설문 답변 → 생성 파라미터 매핑 로직
- 히스토리 저장/로드

---

## 6. 파일 변경 대상

| 파일 | 변경 내용 |
|---|---|
| `src/app/layout.tsx` | Pretendard 폰트 추가 로드 |
| `src/app/studio/page.tsx` | `F` 객체 토큰 교체, 컴포넌트 스타일 일괄 수정 |
| `src/app/globals.css` | Pretendard CSS 변수 등록, 기본 body 폰트 교체 (studio에만 적용) |
