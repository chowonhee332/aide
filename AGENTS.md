# Aide Engineering Rules

Aide는 기획서를 분석해 A/B/C 디자인 시안을 생성하고, 사용자가 고른 시안을 멀티스크린 프로토타입으로 확장하는 AI UI 플랫폼이다.

## Framework contract

- This is Next.js 16.2.4, not the Next.js implied by model memory.
- Before changing Next.js APIs, conventions, routing, rendering, or configuration, read the relevant guide in `node_modules/next/dist/docs/` and follow deprecation notices.
- Interactive browser-only features belong in a Client Component with the narrowest practical `'use client'` boundary.

## Product invariants

1. 사용자가 선택한 시안 HTML을 LLM으로 다시 생성하거나 전체 수정하지 말라.
2. 셸·스크롤·로고·아이콘·프로토타입 조립은 결정론적 코드가 담당한다.
3. 구조는 `UIStructureIR`, 콘텐츠는 `contentSeed`를 생성 전에 결정한다.
4. `structure-lint`는 severe 위반만 핀포인트 수정한다. 재생성 루프를 만들지 말라.
5. 같은 위반이 반복되면 lint를 늘리지 말고 결정론 또는 사전 계약으로 옮긴다.
6. 생성 중·비교·히스토리에 최종 산출물과 관계없는 가짜 UI를 노출하지 말라. 하드코딩된 데모 카드·임시 문구·임의 팔레트를 생성 결과처럼 보여주지 말고, 실제 모델 출력이나 동일한 구조화 소스만 렌더링한다.
7. 생성 UI의 아이콘은 Google Material Symbols Rounded만 사용한다. 이모지·외부 아이콘 라이브러리·임의 SVG를 생성 결과에 혼용하지 않는다.
8. Node Graph 생성 경로가 기존 HTML 기준 품질을 넘기 전까지 `/api/generate` 자유 HTML 경로를 삭제하거나 Node Graph로 강제 전환하지 말라. Studio의 생성 엔진 롤백 스위치는 운영 안전장치다.

## Generation pipeline

```text
brief
→ analyzeAndGenerateQuestions
→ buildDesignIntelligencePlan
→ generateUI ×3 parallel
→ deterministic injection and image interpretation
→ user selection
→ expandToPrototype
```

- `expandToPrototype`의 `stripScreenHomeDiv` / `splitShellContent` 조립을 우회하지 말라.
- 새 정규식 키워드 매핑은 추가하지 말라. 새 로직은 `ServiceAnalysis`를 우선한다.
- 프롬프트에 CRITICAL/최우선 표현을 추가하기 전 기존 규칙을 통합하라.

## Playground contract

- Playground의 기본 디자인 시스템은 `src/lib/design-systems/aide.md`이며 `/aide-ui`와 동일한 `component_registry`를 사용한다.
- `src/lib/aide-playground-components.ts`는 현재 선택된 계약을 Builder schema와 정적 export serializer로 연결한다. 컴포넌트 ID와 category를 별도로 재정의하지 말라.
- Playground의 팔레트·캔버스·drag overlay는 `/aide-ui`와 같은 `ComponentPreview` React renderer를 사용한다. 인터랙티브 preview를 `renderHTML` 또는 `dangerouslySetInnerHTML`로 되돌리지 말라.
- `src/lib/builder-components.ts`는 활성 카탈로그 조회와 device defaults만 담당한다. 두 번째 레지스트리를 만들지 말라.
- 향후 다른 DESIGN.md는 같은 `ComponentDefinition[]` adapter를 통해 교체하며 BuilderView에 디자인 시스템별 조건문을 추가하지 말라.
- `renderHTML`은 다운로드용 정적 HTML export에만 사용하며 사용자 문자열을 반드시 HTML escape한다.
- 저장된 frame/item 데이터는 복원 전에 스키마와 컴포넌트 ID를 검증한다.
- AI가 만드는 결과는 자유 HTML이 아니라 검증 가능한 `CanvasFrame[]` / `CanvasItem[]` 구조여야 한다.

## Design rules

- Aide 서비스 UI의 canonical source는 `src/lib/design-systems/aide.md`의 첫 번째 `yaml` fenced block이다. 제품 token은 `contract.tokens`와 `contract.component_tokens`, 구조·컴포넌트·반응형·접근성은 같은 contract의 해당 section을 따른다.
- `src/lib/aide-product-tokens.ts`가 `contract.tokens`와 `contract.component_tokens`를 `--aui-*`로 컴파일하고 `src/app/layout.tsx`가 전역 `:root`에 주입한다. 제품 토큰과 공용 컴포넌트 크기·간격 값을 바꿀 때 `globals.css`나 JSX class만 수정하지 말라.
- `src/app/globals.css`의 `--aui-*` 선언은 fallback과 framework semantic mapping이다. MD 계약과 같은 이름의 값은 런타임 주입값이 우선한다.
- 새 token group이나 naming rule을 추가하면 `GROUP_PREFIX`, showcase grouping, `/aide-ui` 노출, 실제 consumer를 함께 확인한다. 알 수 없는 group을 조용히 무시하는 상태로 두지 말라.
- `{group.token}` alias 해석은 `src/lib/design-token-alias.mjs` 하나뿐이다. runtime compiler(`aide-product-tokens.ts`)와 build script(`scripts/design-system.mjs`)가 같은 모듈을 import하므로 alias 로직을 어느 한쪽에 다시 구현하지 말라.
- `contract.components`의 모든 항목은 `purpose`를 가진다. 새 컴포넌트를 추가하면 `purpose`를 함께 쓴다. `/aide-ui`와 `llms.txt`가 이 값을 그대로 노출한다.
- `/aide-ui`의 token 값과 section navigation/title/description/order는 `aide.md`의 `contract.visualization.sections`에서 파생한다. 새 section id에는 실제 shared primitive를 보여주는 renderer가 필요하며, MD manifest와 renderer가 다르면 production build를 실패시켜 불일치를 허용하지 않는다.
- `src/lib/design-systems/aide.md`는 Aide 제품 chrome, `/aide-ui`, Playground, DESIGN.md를 선택하지 않은 기본 생성 결과의 단일 원본이다. 업로드된 DESIGN.md는 고객 생성 화면에만 적용한다.
- 화면 컴포넌트에 새 hex 색을 추가하지 말고 `--aui-*` 또는 `AIDE_UI`를 사용한다.
- `AIDE_UI`는 runtime inline style용 TypeScript bridge다. 정적 스타일과 새 canonical token을 `src/lib/aide-ui.ts`에만 추가하지 말라.
- `#ff385c`는 생성 시안의 기본 브랜드 색이다. Aide 앱 UI 색으로 치환하지 말라.
- KTDS 생성물은 `src/lib/ktds-tokens.ts`와 `src/lib/design-systems/ktds.md`를 따른다.
- 디자인 시스템·브리프와 무관한 레이아웃 불변식은 `src/lib/design-systems/aide.md`가 아니라 `src/lib/platform-baseline.ts`에 둔다(확정값: 좌우 거터 mobile 16 / tablet 20 / desktop 24, breakpoint 768·1280, box-sizing 리셋, 터치타깃 44, 폰트 하한, z-index 사다리, 칩·버튼·배지 줄바꿈 금지, 한국어 word-break, focus-visible·reduced-motion). `generateUI`/`expandToPrototype`가 마지막에 주입하며 DESIGN.md보다 우선한다. 값 회귀는 `test/verify_platform_baseline.mjs`가 막는다.
- 랜딩 페이지는 `contract.visualization`이 아니라 `layout-archetypes.ts`의 `brand-landing`·`product-showcase` 아키타입이 담당한다. `detectLandingIntent`(web + 키워드)가 true면 A/B/C가 랜딩 풀에서만 뽑히고 `sideNav`·`bottomNav`가 강제 false다.

## High-risk files

- `src/lib/gemini.ts`: LLM pipeline. Make surgical changes only.
- `src/components/StudioView.tsx`: Studio UI. Make surgical changes only.
- `src/components/BuilderView.tsx`: Playground UI 전체. 화면 preview는 canonical React renderer를 사용하고, `renderHTML`은 정적 HTML export에서만 호출한다.
- `src/lib/layout-archetypes.ts`: archetypes and `UIStructureIR` builder.
- `src/lib/design-intelligence.ts`: deterministic generation plan.
- `src/lib/structure-lint.ts`: contract validation and correction.

## Docs

- `AGENTS.md`가 Claude와 Codex를 포함한 프로젝트 agent 공통 규칙의 canonical source다. `CLAUDE.md`는 `@AGENTS.md`를 참조만 하며 별도 규칙을 중복해서 유지하지 않는다.
- `MISSION.md`는 Brain 1개가 사용자와 대화하고 병렬 서브에이전트에게 일을 시키는 공동 목표·상태 공유판이다. **규칙은 이 파일, 상태는 `MISSION.md`** 로 나눈다. 사용자는 Brain하고만 대화하고, Brain이 목표를 분해해 서브에이전트에 배정·통합한다. 역할별 파일 소유권과 진행 상태는 거기서 확인한다.
- `docs/archive/`: 과거 구현 계획·스펙. **현재 상태가 아니다.** 히스토리 참고용이며 현행 규칙과 충돌하면 이 파일이 우선한다.
- `src/lib/design-systems/*.md`: 런타임 디자인 계약이다. `aide.md`는 Aide 단일 원본이며, 나머지 생성용 문서 중 `-test` 접미사 파일은 UI 선택지에서 자동 제외된다.
- `/aide-ui/llms.txt`는 AI retrieval 진입점이며 `src/app/aide-ui/llms.txt/route.ts`가 계약에서 전부 파생해 생성한다. 컴포넌트 목록이나 설명을 이 파일에 손으로 쓰지 말라. 섹션 구성은 `contract.ai.llms_txt.contents`가 정하고, 선언과 renderer가 다르면 빌드를 실패시킨다.
- `src/lib/design-systems/generated/*`는 `npm run design:export` 산출물이다. `prebuild`가 매 빌드마다 재생성하므로 직접 수정하지 말라.

## Local artifacts

두 디렉토리 모두 gitignored이며 런타임에 생성된다. 커밋하지 말라.

- `.aide-logs/violations.jsonl`: `structure-lint`가 남기는 위반 기록. 반복 패턴을 찾아 lint에서 결정론·사전 계약으로 옮길 때 쓴다.
- `.model-cache/`: BiRefNet ONNX 모델을 최초 1회 내려받아 보관(약 210MB). `BIREFNET_MODEL_URL` / `BIREFNET_MODEL_PATH`로 대체할 수 있다.

## Working rules

1. 시작 전에 성공 기준과 변경 경계를 정한다.
2. 요청과 직접 관련된 최소 변경으로 해결한다.
3. 모호한 선택이 결과를 크게 바꾸면 해석과 추천안을 제시하고 확인한다.
4. 기존 사용자 변경을 보존하고 무관한 코드를 정리하지 말라.
5. `git push`는 명시적인 요청이 있을 때만 실행한다.
6. Brain·서브에이전트·Codex·사용자가 같은 트리에서 동시에 작업할 수 있다. 코드를 고치는 서브에이전트는 `isolation: worktree`로 격리해 띄운다. 시작 시와 patch 직전에 `git status`/관련 diff를 다시 확인하고, 읽은 뒤 바뀐 파일은 최신 내용을 재확인한 후 수정한다.
7. 다른 작업자의 변경을 되돌리거나 함께 commit하지 말라. 같은 파일의 변경이 겹치면 최신 diff를 보존한 최소 patch만 적용한다.

## Completion gate

Run checks proportional to the change. For TypeScript/UI work, completion requires:

```bash
npm run lint
npm run build
```

- New deterministic modules also require a focused smoke test.
- Report existing warnings separately; do not present them as new failures.
- Production build is the authoritative TypeScript check when stale `.next/dev` declarations make raw `tsc --noEmit` unreliable.
- Do not claim completion while relevant errors remain.
