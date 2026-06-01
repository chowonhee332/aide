# 시안 A/B/C 레이아웃 차별화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `variant-refs.ts`의 PHILOSOPHY_A/B/C 상수에 카드 크기·비율·금지 패턴 제약을 추가해 세 시안이 같은 디자인 시스템을 쓰면서도 레이아웃이 구조적으로 다르게 생성되도록 한다.

**Architecture:** `src/lib/variant-refs.ts`의 PHILOSOPHY_A, PHILOSOPHY_B, PHILOSOPHY_C 세 문자열 상수 끝에 각각 "크기·밀도 제약" 섹션을 append한다. 이 텍스트는 `getVariantStyles()`를 통해 Gemini 생성 프롬프트에 주입되어 AI의 레이아웃 결정을 강제한다. 다른 파일은 건드리지 않는다.

**Tech Stack:** TypeScript, 문자열 상수 편집

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|---|---|
| `src/lib/variant-refs.ts` | PHILOSOPHY_A, PHILOSOPHY_B, PHILOSOPHY_C 상수에 제약 섹션 추가 |

---

## Task 1: PHILOSOPHY_A에 크기·밀도 제약 추가

**Files:**
- Modify: `src/lib/variant-refs.ts` (line 93)

- [ ] **Step 1: PHILOSOPHY_A 끝 부분 확인**

`src/lib/variant-refs.ts` 72~93번째 줄을 읽어 PHILOSOPHY_A 상수 마지막 줄이 다음과 같은지 확인한다:
```
- [ ] 선택한 DESIGN.md의 카드/리스트/타입/색상 규칙이 화면 전체에 일관된다`;
```

- [ ] **Step 2: PHILOSOPHY_A 상수에 제약 섹션 추가**

`src/lib/variant-refs.ts`에서 PHILOSOPHY_A의 닫는 백틱(`` ` ``) 바로 앞에 아래 내용을 삽입한다.

현재:
```typescript
const PHILOSOPHY_A = `정밀 정보형 (시안 A)
...
- [ ] 선택한 DESIGN.md의 카드/리스트/타입/색상 규칙이 화면 전체에 일관된다`;
```

변경 후:
```typescript
const PHILOSOPHY_A = `정밀 정보형 (시안 A)
목표: 선택한 DESIGN.md의 스타일을 유지하면서 정보 탐색과 비교가 가장 쉬운 화면을 만든다.

필수 레이아웃 문법:
- 모바일: compact app bar → 검색/필터 → 2~3개 요약 지표 → 조밀한 리스트/카드 스택 → 보조 액션 순서로 구성
- 웹: 상단 GNB 또는 업무형 LNB → KPI/상태 요약 band → 필터/검색 row → 표/리스트/카드 그리드의 2컬럼 이상 구조
- 히어로를 크게 만들지 않는다. 첫 화면의 시각 중심은 "비교 가능한 실제 데이터 묶음"이어야 한다.
- 같은 성격의 카드/행은 동일한 높이, 동일한 메타 정보 순서, 동일한 CTA 위치를 갖는다.

방향:
- 핵심 데이터, 상태, 목록, 비교 정보가 먼저 보이는 구조
- 컬러는 선택한 디자인 시스템의 강조/상태 토큰 범위 안에서 절제해서 사용
- 카드, 테이블, 리스트, 필터, 검색 같은 업무형 패턴을 우선
- 여백과 밀도는 DESIGN.md의 spacing/card/list 규칙을 따른다
- 임의 shadow, 임의 border, 임의 radius, 임의 font-size를 추가하지 않는다
- 모바일 B2C 서비스라도 실제 메뉴/상품 카드가 여러 개 보여야 하며, 상단 요약 영역만 있고 콘텐츠가 빈 화면이면 실패

합격 조건:
- [ ] 서비스 핵심 지표 또는 핵심 목록이 첫 화면에서 바로 보인다
- [ ] 정렬, 필터, 상태, 메타 정보가 실제 서비스처럼 충분하다
- [ ] 같은 형식의 리스트/카드가 반복되어 사용자가 비교할 수 있다
- [ ] 선택한 DESIGN.md의 카드/리스트/타입/색상 규칙이 화면 전체에 일관된다

## 크기·밀도 제약 (B·C와 반드시 달라야 하는 핵심)
- 아이템 밀도: 모바일 기준 한 화면에 최소 5개 아이템이 동시에 보여야 한다. 카드/행 높이는 compact(56~80px)로 유지한다.
- 상단 요약 영역: viewport 높이의 25% 이하로 제한한다. KPI 수치 띠 하나 또는 요약 카드 한 줄이면 충분하다.
- 히어로 금지: 화면의 30% 이상을 차지하는 대형 히어로 패널, 풀블리드 배경 이미지 카드 불가.
- 이미지 비율: 카드 내 이미지는 카드 높이의 30% 이하(아이콘·썸네일 수준)로 제한한다.
- B·C와의 차이: 대형 히어로 없음 / 이미지 그리드 없음 / 가로 스크롤 카테고리 없음. 스캔 가능한 compact list·table이 화면 대부분을 차지해야 A처럼 보인다.`;
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide" && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

Expected: 0 error lines

---

## Task 2: PHILOSOPHY_B에 크기·집중 제약 추가

**Files:**
- Modify: `src/lib/variant-refs.ts` (line 116)

- [ ] **Step 1: PHILOSOPHY_B 끝 부분 확인**

72~116번째 줄을 읽어 PHILOSOPHY_B 상수 마지막 줄이 다음과 같은지 확인한다:
```
- [ ] A와 C와 달리 전환 플로우가 가장 강하게 느껴진다`;
```

- [ ] **Step 2: PHILOSOPHY_B 상수에 제약 섹션 추가**

PHILOSOPHY_B의 닫는 백틱 바로 앞에 아래 내용을 삽입한다.

변경 후 PHILOSOPHY_B 전체:
```typescript
const PHILOSOPHY_B = `전환 중심형 (시안 B)
목표: 선택한 DESIGN.md의 스타일을 유지하면서 사용자가 가장 중요한 행동을 빠르게 하도록 만든다.

필수 레이아웃 문법:
- 모바일: app bar → 강한 hero/action panel → primary CTA → 혜택/가격/상태 proof row → 추천 항목 3개 이상
- 웹: 상단 GNB → 좌우 비대칭 hero(메시지/CTA + 대표 비주얼) → trust/proof strip → 주요 상품/기능 카드
- 첫 화면의 focal point는 하나만 만든다. CTA와 대표 메시지가 분산되면 실패다.
- CTA는 hero 안 또는 hero 바로 아래에 배치하고, 보조 CTA는 시각적으로 한 단계 낮춘다.

방향:
- 상단에 서비스 핵심 가치와 대표 CTA를 명확히 배치
- 상품/신청/예약/주문/시작하기 등 전환 흐름을 가장 짧게 설계
- 대표 이미지나 3D 에셋이 있으면 히어로에 사용하되, 배경/카드/그림자는 DESIGN.md 규칙을 따른다
- 보조 카드와 요약 정보는 CTA를 돕는 역할로 제한
- 임의 그라데이션, 임의 shadow, 임의 pill 버튼을 만들지 않는다
- 히어로 아래에는 반드시 추천 콘텐츠/상품 리스트가 이어져야 한다. 큰 빈 카드 하나로 화면을 채우면 실패

합격 조건:
- [ ] 첫 화면에서 사용자가 해야 할 주요 행동이 명확하다
- [ ] CTA, 가격/혜택/상태 정보가 선택한 디자인 시스템 방식으로 강조된다
- [ ] CTA 바로 아래에 사용자가 선택할 실제 항목들이 보인다
- [ ] A와 C와 달리 전환 플로우가 가장 강하게 느껴진다

## 크기·집중 제약 (A·C와 반드시 달라야 하는 핵심)
- 히어로 패널 크기: 화면 최상단에 viewport 높이의 38~48%를 차지하는 대형 히어로 패널이 반드시 있어야 한다. 배경색(primary 계열) 또는 이미지 + 큰 제목 + CTA 버튼으로 구성한다.
- Focal point 하나: 첫 화면에서 시선이 가는 곳은 정확히 하나다. CTA 버튼이 히어로 안 또는 히어로 바로 아래에 위치하며, 경쟁하는 다른 강조 요소가 없어야 한다.
- 히어로 아래 아이템: 히어로 아래에 추천 아이템 3개 이상이 이어지되 카드 크기는 히어로보다 확연히 작아야 한다(시각 위계 유지).
- A·C와의 차이: A의 compact list 구조 없음 / C의 카테고리 가로 스크롤·이미지 그리드 없음. 하나의 강렬한 히어로 패널이 화면의 절반 가까이를 지배해야 B처럼 보인다.`;
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide" && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

Expected: 0 error lines

---

## Task 3: PHILOSOPHY_C에 크기·이미지 제약 추가

**Files:**
- Modify: `src/lib/variant-refs.ts` (line 139)

- [ ] **Step 1: PHILOSOPHY_C 끝 부분 확인**

118~139번째 줄을 읽어 PHILOSOPHY_C 상수 마지막 줄이 다음과 같은지 확인한다:
```
- [ ] 선택한 DESIGN.md의 스타일 정체성이 유지된다`;
```

- [ ] **Step 2: PHILOSOPHY_C 상수에 제약 섹션 추가**

PHILOSOPHY_C의 닫는 백틱 바로 앞에 아래 내용을 삽입한다.

변경 후 PHILOSOPHY_C 전체:
```typescript
const PHILOSOPHY_C = `브랜드 탐색형 (시안 C)
목표: 선택한 DESIGN.md의 스타일을 유지하면서 서비스의 분위기, 스토리, 탐색 경험을 가장 잘 보여준다.

필수 레이아웃 문법:
- 모바일: app bar → 이미지/큐레이션 hero → 카테고리 rail → editorial/recommendation card → 개인화 추천 리스트
- 웹: 상단 GNB → full-width editorial band 또는 magazine-style grid → 카테고리/스토리 섹션 → 추천 컬렉션
- 이미지가 단순 썸네일이 아니라 섹션의 의미를 만든다. 단, 이미지 스타일은 DESIGN.md의 카드/서피스 규칙을 따른다.
- C는 A보다 정보 밀도가 낮고, B보다 탐색과 분위기가 풍부해야 한다.

방향:
- 이미지, 카테고리, 추천, 스토리, 큐레이션을 중심으로 구성
- 수치보다 맥락, 설명, 탐색 흐름, 감성 카피를 우선
- 여백과 카드 배열은 DESIGN.md spacing/layout 규칙을 따른다
- 실사/3D/썸네일 플레이스홀더는 서비스 이해를 돕는 곳에만 사용
- 임의 오버레이, 임의 그라데이션, 임의 라운드 값을 만들지 않는다
- 모든 텍스트는 가로 읽기 기준으로 배치한다. 세로 제목, 한 글자씩 줄바꿈, 장식용 긴 세로 문장은 실패

합격 조건:
- [ ] 서비스의 분위기와 브랜드 경험이 A/B보다 풍부하게 드러난다
- [ ] 이미지/추천/카테고리/스토리 요소가 실제 탐색 흐름을 만든다
- [ ] 이미지가 브리프 도메인과 직접 관련되어 있다
- [ ] 선택한 DESIGN.md의 스타일 정체성이 유지된다

## 크기·이미지 제약 (A·B와 반드시 달라야 하는 핵심)
- 이미지 비율: 카드 면적의 50% 이상이 이미지(또는 비주얼) 영역이어야 한다. 텍스트 영역이 이미지보다 크면 실패.
- 탐색 구조 필수: 다음 중 하나 이상이 반드시 포함되어야 한다 — (1) 가로 스크롤 카테고리 rail, (2) 2열 이미지 그리드, (3) editorial 풀블리드 카드 + 아래 2열 그리드.
- 여백 확보: 카드 간격이 A보다 넓어야 한다. 숨 쉬는 레이아웃. 정보를 빽빽하게 채우면 C가 아니라 A처럼 보인다.
- A·B와의 차이: A의 compact stats·list 위주 구조 없음 / B의 단일 large CTA 집중 없음. 이미지와 카테고리가 탐색 경험을 이끌어야 C처럼 보인다.`;
```

- [ ] **Step 3: 최종 TypeScript 컴파일 확인**

```bash
cd "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide" && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

Expected: 0 error lines

- [ ] **Step 4: 문자열이 올바르게 주입되는지 확인**

```bash
grep -c "크기·밀도 제약\|크기·집중 제약\|크기·이미지 제약" "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide/src/lib/variant-refs.ts"
```

Expected: `3` (세 섹션 모두 존재)

```bash
grep -c "B·C와의 차이\|A·C와의 차이\|A·B와의 차이" "/Users/chowonhee/Library/Mobile Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide/src/lib/variant-refs.ts"
```

Expected: `3` (각 시안의 교차 금지 패턴 모두 존재)

- [ ] **Step 5: getVariantStyles 반환값 확인**

```bash
node -e "
const fs = require('fs');
const content = fs.readFileSync('/Users/chowonhee/Library/Mobile\ Documents/com~apple~CloudDocs/회사/바이브코딩/Aide/aide/src/lib/variant-refs.ts', 'utf8');
const hasA = content.includes('크기·밀도 제약');
const hasB = content.includes('크기·집중 제약');
const hasC = content.includes('크기·이미지 제약');
console.log('A constraint:', hasA, '| B constraint:', hasB, '| C constraint:', hasC);
"
```

Expected: `A constraint: true | B constraint: true | C constraint: true`

---

## Self-Review

### Spec 커버리지

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| A: 한 화면 5개+ 아이템, 히어로 viewport 25% 이하 | Task 1 |
| A: 대형 히어로·이미지 그리드·카테고리 rail 금지 | Task 1 |
| B: 히어로 패널 viewport 38~48% | Task 2 |
| B: CTA focal point 하나 | Task 2 |
| B: compact list·이미지 그리드 금지 | Task 2 |
| C: 카드 면적 50%+ 이미지 | Task 3 |
| C: 가로 스크롤·2열 그리드 필수 | Task 3 |
| C: compact stats·단일 CTA 집중 금지 | Task 3 |
| 변경 파일 1개만 (variant-refs.ts) | Tasks 1-3 모두 |

### Placeholder 없음 ✅
### 타입 일관성 ✅ (문자열 상수 편집, 타입 변경 없음)
