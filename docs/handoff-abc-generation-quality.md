# 인수인계: A/B/C 시안 생성 품질 개선

> 작성: Claude · 작성일: 2026-08-27 · 상태: **진행 중 (다음 단계 미착수)**
> 대상 독자: 이 스레드를 이어받는 새 세션 (Claude/Codex 무관)

이 문서는 "디자인 시안 A/B/C 생성 워크플로우 분석 → 품질 개선" 작업 스레드의 인수인계 문서다.
같은 세션 안에서 앞서 진행된 다른 작업(RFP 첨부 기능, 문서 사이트 마무리 등)은 이미 완료되어
사용자에게 보고 끝난 상태라 이 문서에서는 요약만 하고, **미결 항목과 진행 중인 작업**에 집중한다.

## ⚠️ 시작 전에 반드시 할 것

이 저장소는 Claude Code와 Codex가 동시에 작업할 수 있다 (AGENTS.md "Working rules" 6-7번).
아래 두 파일은 이번 스레드에서 다뤘지만 **원래 Codex가 만든 파일**이다 (`CODEX_WORKLOG.md`의
"아이콘 단일화"/"이미지 라우팅" progress 기록과 일치):

- `src/lib/gemini-model-policy.ts`
- `src/lib/material-symbols.ts`

작업 재개 전에:
1. `git status` / `git diff`로 최신 상태 확인
2. `CODEX_WORKLOG.md`를 열어 Codex가 이 두 파일을 건드리는 진행 중 작업이 있는지 확인
3. 겹치면 최신 diff를 보존한 최소 patch만 적용 (AGENTS.md 7번 규칙)

---

## 1. 이번 스레드에서 확정한 것

### 1-1. 사용자가 명시적으로 정한 것
- A안만 `gemini-3.1-pro-preview`(Pro)로, B/C안은 기존 `gemini-3.7-flash`로 생성해서 **품질을 직접 비교해보기로 함** — 아직 사용자가 실제 생성 결과를 비교하지 않음 (진행 중)
- 프롬프트 개선은 "규칙을 줄이는 것"이 아니라 **"같은 규칙이 여러 곳에서 반복되는 걸 찾아서 한 곳으로 합치는 것"**이라는 방향에 사용자가 동의함

### 1-2. 분석으로 확인한 사실 (재확인 없이 인용 가능)
- `.aide-logs/violations.jsonl` 실측(15건): structure-lint 위반은 13/15건이 0건으로 문제가 아니었음. 대신 **아이콘 교정이 15/15건(100%) 발생**, 총 70건 중 56%(39건)가 의미 없는 `circle`로 대체됨.
- 교정된 "무효" 아이콘 이름(`confirmation_number`, `monetization_on`, `local_florist` 등)은 fontTools로 실제 배포 폰트 글리프와 대조한 결과 **전부 진짜 존재하는 아이콘**이었음 — 모델의 환각이 아니라 Aide 자체 화이트리스트(`VALID_MATERIAL_SYMBOLS`, 약 260개 수작업 큐레이션)가 실제 폰트(6,540 글리프)보다 훨씬 좁았던 게 원인.
- `.aide-logs/gemini-usage.jsonl` 실측(31건): `generateUI` 1회 호출(design 모델, mainOnly 단일 화면)의 실제 평균은 **입력 약 47,000 토큰, 출력 약 12,500 토큰**. 이전에 대화 중 추정했던 "무거운 케이스 20K" 가정보다 실측이 2배 이상 큼 — 대화 중 이 추정치를 정정해서 사용자에게 다시 안내함.
- Gemini 가격(공식 확인, ai.google.dev/gemini-api/docs/pricing, 2026-12-31까지 특가):
  - `gemini-3.7-flash`: input $0.75 / output $3.75 (1M 토큰당)
  - `gemini-3.1-pro-preview`: input $2.00 / output $12.00 (≤200k 컨텍스트)
  - 실측 평균(47K in / 12.5K out) 기준 1회 호출: Flash ≈ $0.08, Pro ≈ $0.24
- `gemini.ts`의 `generateUI` 프롬프트 조립 범위(약 1,700줄)에서 "반드시" 86회, "CRITICAL" 19회, "⛔" 21회 등장 — 경쟁하는 CRITICAL 지시가 많다는 가설을 실측으로 뒷받침. 단, 이 중 상당수는 `answers` 값에 따라 삼항연산자로 갈리는 **상호 배타적 조건부 문자열**이라 실제 1회 호출에 전부 동시 포함되진 않음 (과장하지 않도록 주의).
- WCAG 색상 대비 규칙, spacing 토큰(`--aide-section-gap` 등) 규칙은 **항상 함께 포함되는 무조건부 중복**이었음을 확인하고 정리함(아래 2-3 참고). 이 첫 정리분은 절감 효과가 작음(~535자, ~150토큰) — 정직하게 "체감 안 되는 수준"이라고 사용자에게 보고함.
- 더 큰 레버 발견: `gemini.ts:3241-3300`(히어로 배치 패턴 A~E)과 `gemini.ts:4141-4171`(C안 Bold Editorial Hero 스니펫)이 **완성된 HTML+인라인 CSS를 프롬프트에 통째로 박아두고 모델더러 그대로 베끼라고 지시**하는 구조. 이건 입력 토큰뿐 아니라 출력 토큰(Pro 기준 input의 6배, Flash 기준 5배 비쌈)까지 같이 먹는 구조라 문장 중복 제거보다 훨씬 큰 비용/품질 레버로 판단됨. **아직 손대지 않음 — 다음 단계 후보 1번.**

---

## 2. 만든 파일 / 수정한 파일 (이번 스레드)

### 2-1. 신규 생성
- **`scripts/generate-material-symbols.mjs`** — `VALID_MATERIAL_SYMBOLS`를 `node_modules/@material-symbols/font-400`의 공식 아이콘 이름 목록에서 재생성하는 스크립트. `FONT_ONLY_EXTRA_ICONS` 상수로, npm 목록엔 없지만 실제 배포 폰트엔 있는 21개 이름(예: `expand_less`, `monetization_on`)을 수동 검증 후 포함시켜놓음. 실행: `npm run icons:export`
- **`docs/handoff-abc-generation-quality.md`** — 이 문서

### 2-2. 기존 파일 수정 (Claude가 이번 스레드에서 편집)
- **`src/lib/material-symbols.ts`** (Codex 소유 파일, 위 경고 참고) — `VALID_MATERIAL_SYMBOLS`를 260개 → 3,914개로 전면 교체. 교체 전/후 전수 비교해서 회귀 0건 확인 완료(빠진 16개는 전부 원래도 폰트에 없던 죽은 항목이었음).
- **`src/lib/gemini-model-policy.ts`** (Codex 소유 파일, 위 경고 참고) — `GEMINI_DESIGN_MODEL_PRO_EXPERIMENT = 'gemini-3.1-pro-preview'` 상수 추가. **임시 실험용 — 비교 끝나면 이 상수와 아래 StudioView.tsx 참조를 함께 제거할 것.**
- **`src/components/StudioView.tsx`** — `handleGenerate`(legacy-html 경로, ~line 1843) 안에서 `idx === 0`(A안)일 때만 `GEMINI_DESIGN_MODEL_PRO_EXPERIMENT` 사용하도록 삼항연산자 추가. Node Graph 경로는 건드리지 않음.
- **`package.json`** — `"icons:export": "node scripts/generate-material-symbols.mjs"` 스크립트 추가. `prebuild`에는 연결하지 않음(의도적 — 매 빌드마다 자동 재생성하면 npm 패키지 업데이트 시 조용히 화이트리스트가 바뀔 수 있어서, 필요할 때 수동 실행하는 걸로 남겨둠).
- **`src/lib/gemini.ts`** — 중복 규칙 2곳 정리:
  - `~line 3307`: 히어로 섹션 WCAG 색상 대비 규칙(6줄, 예시 포함)을 앞서 나온 규칙을 가리키는 1줄로 축소
  - `~line 4623`: "Layout Rhythm Guard" 섹션에서 "Contract-Based Generation Rules"와 겹치던 section-gap/card-padding/card-gap 재설명 제거, 그 섹션만의 새 내용(버튼 높이, 페이지 여백, 반복 아이템 클래스 공유)만 남김

### 2-3. 검증 상태
- 위 변경 전체에 대해 `npx tsc --noEmit`, `npm run lint` 통과 확인함(신규 에러 없음, 기존 warning 22개만 남음)
- `npm run build`(production build)는 **아직 실행 안 함** — AGENTS.md Completion gate상 필수. 다음 세션에서 먼저 실행 권장.
- 실제 Gemini API를 호출하는 end-to-end 생성 테스트는 **이번 스레드에서 한 번도 안 함** — 사용자가 직접 GEMINI_API_KEY로 테스트하겠다고 이전에 밝힘.

---

## 3. 다음에 할 일

### 3-1. 지금 당장 할 수 있는 것 (막힘 없음)
1. **`npm run build` 실행해서 production build 통과 확인** (AGENTS.md completion gate, 아직 미실행)
2. **A(Pro)/B,C(Flash) 비교를 실제로 몇 번 생성해서 눈으로 확인** — 사용자가 요청했지만 아직 안 함. 비교 끝나면 2-2의 임시 상수/삼항연산자 되돌리기.

### 3-2. 다음 개선 후보 (우선순위 순, 아직 미착수)
1. **히어로 패턴 HTML을 결정론적 후처리로 이관** (1번 항목, 가장 큰 레버로 판단됨)
   - 현재: `gemini.ts`의 패턴 A~E가 완성된 HTML+인라인 CSS를 프롬프트에 박아넣고 모델이 그대로 베끼게 함
   - 제안: `%%HERO_3D%%`/`%%SCENE_3D%%` 플레이스홀더 치환과 같은 방식으로, 모델은 "패턴 E, role=Product Object"처럼 짧은 선택만 하고 실제 HTML 뼈대는 `resolveImagePlaceholders`류 후처리 코드가 조립
   - 리스크: 새 마커 문법 설계, 신규 injection 함수, 기존 5개 패턴 전부 회귀 검증 필요 — `gemini.ts`(high-risk 파일)에 제법 큰 변경. **착수 전 실제 생성 결과로 히어로 패턴이 얼마나 자주/정확히 쓰이는지부터 확인 권장.**
2. **direction 생성 개선** (`src/lib/design-direction.ts`) — economy 모델(`gemini-3.5-flash-lite`) 단일 호출, brief 3,000자 컷, fallback 6개가 완전 범용 문구. RFP처럼 긴 입력에서 특히 손실 클 것으로 추정되나 실측 데이터는 아직 없음.
3. **contentSeed 강화** — `design-intelligence.ts`의 서브타입별 하드코딩 콘텐츠(피자/통신요금제 등 ~15종)가 `serviceAnalysis.contentSeed`(LLM 추출)가 부실할 때 패딩으로 섞여 들어가는 구조. RFP 기반처럼 서브타입 매칭이 안 되는 서비스에서 영향 클 것.

### 3-3. 이전(사전-compaction) 스레드에서 넘어온 보류 항목 — 참고용, 이번 스레드와 직접 관련 없음
- **Keypad 컴포넌트 제거 범위 미결정** — 사용자가 AskUserQuestion을 dismiss한 뒤 재논의 안 됨. 다시 언급하면 이어갈 것.
- **sourceStatus(출처 상태) 구현** — 제안만 하고 미착수.
- **완성 템플릿 라이브러리 / 컴포넌트 코드화** — "실제로 돌려보고 편차 실측 후 결정"하기로 보류.
- RFP 첨부 기능(PDF/이미지 업로드, As-is 캡처 분석, design.md 캡처 생성)은 **이미 완료되어 사용자에게 보고 끝남** — 재작업 불필요, 사용자가 실사용 테스트 예정이라고만 밝힘.

---

## 4. 빠른 참고

- 비용 재계산 공식: `(input_tokens × input_price + output_tokens × output_price) / 1,000,000`
- 실측 로그 위치: `.aide-logs/violations.jsonl`(구조/아이콘 위반), `.aide-logs/gemini-usage.jsonl`(토큰/비용) — 둘 다 gitignored, 로컬에서 계속 누적됨
- Material Symbols 화이트리스트 재생성: `npm run icons:export`
- 이 문서 자체는 archive가 아니라 **진행 중인 작업의 상태 문서**다. 다음 단계가 끝나면 갱신하거나, 완전히 끝나면 `docs/archive/`로 옮길 것.
