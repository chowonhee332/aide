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

- Playground has exactly one design system: KTDS.
- `src/lib/ktds-playground-components.ts`를 렌더 가능한 컴포넌트 카탈로그의 단일 원본으로 사용한다.
- `src/lib/builder-components.ts`는 카탈로그 조회와 device defaults만 담당한다. 두 번째 레지스트리를 만들지 말라.
- Playground 컴포넌트는 KTDS Storybook stable inventory와 source metadata가 있는 항목을 우선한다.
- 사용자 문자열은 `dangerouslySetInnerHTML`에 도달하기 전에 반드시 HTML escape한다.
- 저장된 frame/item 데이터는 복원 전에 스키마와 컴포넌트 ID를 검증한다.
- AI가 만드는 결과는 자유 HTML이 아니라 검증 가능한 `CanvasFrame[]` / `CanvasItem[]` 구조여야 한다.

## Design rules

- Aide 서비스 UI는 `src/lib/design-systems/aide-product-ui.md`와 `src/app/globals.css`의 `--aui-*` 토큰을 사용한다.
- `src/lib/design-systems/aide.md`는 DESIGN.md를 선택하지 않았을 때 AI 생성 결과물에 적용되는 기본값이다. Aide 서비스 크롬에 적용하지 말라.
- 화면 컴포넌트에 새 hex 색을 추가하지 말고 `--aui-*` 또는 `AIDE_UI`를 사용한다.
- `#ff385c`는 생성 시안의 기본 브랜드 색이다. Aide 앱 UI 색으로 치환하지 말라.
- KTDS 생성물은 `src/lib/ktds-tokens.ts`와 `src/lib/design-systems/ktds.md`를 따른다.

## High-risk files

- `src/lib/gemini.ts`: LLM pipeline. Make surgical changes only.
- `src/components/StudioView.tsx`: Studio UI. Make surgical changes only.
- `src/components/BuilderView.tsx`: Playground UI 전체. 모든 HTML 주입은 `renderHTML`을 경유한다. 우회 경로를 새로 만들지 말라.
- `src/lib/layout-archetypes.ts`: archetypes and `UIStructureIR` builder.
- `src/lib/design-intelligence.ts`: deterministic generation plan.
- `src/lib/structure-lint.ts`: contract validation and correction.

## Docs

- `docs/archive/`: 과거 구현 계획·스펙. **현재 상태가 아니다.** 히스토리 참고용이며 현행 규칙과 충돌하면 이 파일이 우선한다.
- `src/lib/design-systems/*.md`: 생성에 쓰이는 런타임 데이터. `-test` 접미사 파일은 UI 선택지에서 자동 제외된다.

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
