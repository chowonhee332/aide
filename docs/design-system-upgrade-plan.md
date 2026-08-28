# Aide 디자인 시스템 완성 계획

> 기준일: 2026-08-28
> 상태: 조사 및 갭 분석 진행 중
> 단일 원본: `src/lib/design-systems/aide.md`

## 1. 목표

외부 디자인시스템 조사에서 확인한 업무·AI 상호작용 체계와 컴포넌트 문서화 원칙을 검토해 Aide 디자인 시스템의 실제 결손을 채운다.

두 시스템의 스타일이나 브랜드를 복제하지 않는다. 공개 문서에서 확인한 구조적 원칙을 Aide의 생성·비교·프로토타입 확장 흐름에 맞는 계약으로 다시 설계한다.

## 2. 성공 기준

1. 제품 UI, `/aide-ui`, Playground, 기본 생성 UI가 계속 `aide.md` 하나를 원본으로 사용한다.
2. 추가한 모든 token·component·pattern은 목적, anatomy, 상태, 반응형, 접근성, 금지 규칙을 갖는다.
3. 선언한 component와 visualization renderer, Playground registry, `llms.txt` 사이에 불일치가 없다.
4. AI 생성 UI에 새 계약이 필요한 범위만 retrieval되어 자유 HTML 의존을 줄인다.
5. `npm run design:lint`, `npm test`, `npm run lint`, `npm run build`를 통과한다.
6. `/aide-ui`, Playground, Studio에서 모바일·태블릿·데스크톱과 키보드 상태를 실제 브라우저로 검증한다.

## 3. 현재 기준선

2026-08-28 `aide.md` machine-readable contract 실측:

- token groups: 11
- component token groups: 29
- components: 75
- screen patterns: 6
- visualization sections: 14
- documentation navigation: Get Started, Foundations, Components, Patterns
- AI retrieval index: overview, contract links, foundations, components, patterns, development commands

현재 구조는 primitive 값 → semantic 역할 → component token으로 이어지는 3계층 기반을 이미 갖췄다. 이번 작업은 토큰 체계를 다시 만드는 프로젝트가 아니라, 얕은 계약과 누락된 제품 패턴을 보강하는 프로젝트다.

## 4. 레퍼런스에서 확인한 범위

### KT Seamless Flow

공개 문서 구조:

- Foundations: Color, Typography, Elevation, Breakpoint, Radius, Iconography, Graphics, Photography, Motion, Accessibility, Design Token
- Components: 기본 입력·선택·탐색뿐 아니라 Data Visual, Data Table, Notification, Loading 등 업무형 요소
- Patterns: 입력 폼, 약관 동의, 빈 화면, 유의사항, 온보딩, 검색, 시스템 상태
- AI Agent: Principles, Prompt Text Field, Prompt Input, Prompt Output, Process Indicator, Navigation Bar, Context Panel, AI Visual
- AI use cases: 이미지 생성, 온보딩, 대화형 질의응답, 파일 분석, 음성 입력, 검색, 설정
- UX Writing: 정의, 기준과 원칙, 상황별 가이드, 표기 규칙

### 컴포넌트 시스템 조사

공개 문서 구조:

- Foundations: semantic color, elevation, grid, icons, typography
- Components: Action, Contents, Feedback, Loading, Navigation, Presentation, Selection and Input로 목적별 분류
- 각 상세 문서: purpose, anatomy, variants, states, size, usage, application, hierarchy, layout, How to use
- Utilities: FocusScope, DismissableLayer, Portal, Popper, ScrollArea, Form, Label 등 복합 컴포넌트의 동작 기반

대표 상세 문서에서 확인한 유효 원칙:

- Button: action hierarchy와 배치 우선순위를 명시하고 loading을 별도 상태로 설명
- Table: desktop 우선, sticky header, virtualization, sorting, filtering, selection, 숫자 우측 정렬을 명시
- Progress tracker: 단계 수와 label 길이에 상한을 두고 horizontal·vertical 선택 조건을 설명
- Skeleton: 최종 콘텐츠 형태를 예고하고 정적 콘텐츠에는 적용하지 않으며 motion 정책을 명시

## 5. 갭맵

### P0 — Aide 핵심 경험에 직접 필요한 결손

| 영역 | 현재 상태 | 보강 내용 |
|---|---|---|
| AI 입력 | `field`, `textarea`, `file-uploader`가 분리됨 | prompt composer 계약: text, attachment, submit, cancel, limits, disabled, uploading |
| AI 출력 | 일반 `result`, `prose`, `card` 중심 | generation output: streaming, partial, complete, error, retry, provenance, copy/export |
| 생성 진행 | `loading`과 `progress`는 일반 작업 기준 | process indicator: 단계명, 현재 활동, 경과 상태, 취소 가능성, 실패 후 복구 |
| 컨텍스트 | `side-panel`은 범용 | context panel: 요구사항·파일·디자인 시스템·선택 항목의 포함 여부와 출처 |
| 시안 비교 | 화면 pattern 없음 | A/B/C 비교, 동일 contentSeed 보존, 차이 설명, 선택 상태 |
| 선택 후 확장 | 화면 pattern 없음 | 선택 시안 고정, 추가 화면 생성, shell 보존, 진행·실패·재시도 |
| 추적 가능성 | 계약 없음 | 요구사항 → 화면 → backlog → acceptance criteria 연결 패턴 |
| 시스템 상태 | 컴포넌트별 상태는 있음 | loading, empty, partial, stale, offline, permission, error를 화면 수준에서 조합하는 패턴 |

### P1 — 기존 컴포넌트의 깊이 보강

| 컴포넌트 | 현재 계약 | 필요한 보강 |
|---|---|---|
| `table` | caption, responsive, loading/empty/error | sorting, filtering, row selection, bulk actions, sticky header, virtualization, alignment |
| `loading` | spinner, progress, skeleton | skeleton shape·motion·reduced-motion·사용 금지 조건 |
| `stepper` | horizontal, vertical, 4 states | 권장 단계 수, label 길이, clickable step 조건, compact fallback |
| `search` | query 입력 상태 | query lifecycle, recent query, no result, result count, filter coordination |
| `empty-state` | 한 개의 일반 계약 | first-use, no-result, filtered-empty, permission-empty 구분 |
| `alert`/`toast` | 기본 feedback | page banner, section message, snackbar와의 선택 기준 |
| `file-uploader` | 파일 상태 중심 | AI 분석 단계, 지원 형식, 개인정보 경고, 재업로드·부분 실패 |
| `button` | hierarchy와 상태 존재 | loading, destructive, toggle, action-group priority 규칙 명료화 |

### P2 — 제품 범위가 확인될 때 추가

- autocomplete / combobox
- line, area, pie, donut chart
- timeline / activity log
- tree / hierarchy browser
- command palette
- resizable split view
- data density mode
- dark theme

P2는 레퍼런스에 존재한다는 이유만으로 추가하지 않는다. 실제 Aide 화면이나 생성 로그에서 반복 수요가 확인될 때 승격한다.

## 6. Aide 전용 계약 방향

### AI interaction principles

1. 시스템이 무엇을 사용 중인지 보여준다: 요구사항, 파일, 디자인 시스템, 선택 화면.
2. 진행 상태는 사실만 말한다: 현재 단계와 완료된 단계, 취소·재시도 가능 여부.
3. 생성 결과와 결정론적으로 조립된 shell을 구분한다.
4. 불확실성은 숨기지 않고 검토가 필요한 위치에 연결한다.
5. 사용자가 선택한 시안은 재생성하거나 전체 수정하지 않는다.
6. 실패 시 입력과 완료 결과를 보존하고 실패한 단계만 재시도한다.

### AI component candidates

- `prompt-composer`
- `generation-output`
- `process-indicator`
- `context-panel`
- `provenance-list`
- `requirement-trace`
- `variant-comparison`

이 이름들은 구현 전 기존 75개 component의 조합으로 해결 가능한지 다시 검사한다. 독립적인 anatomy·state·접근성 계약이 필요한 경우에만 신규 component로 승격한다.

### AI pattern candidates

- `prompt-to-variants`
- `variant-comparison`
- `selection-to-prototype`
- `file-analysis`
- `requirement-traceability`
- `generation-recovery`

## 7. 구현 프로세스

### Phase 0 — 기준선과 소유권

- `git status`와 관련 diff 재확인
- 다른 세션의 `WaterHero.tsx`, MISSION, 생성 파이프라인 변경 보존
- `aide.md` parser 결과를 기준 스냅샷으로 기록
- 오래된 다중 원본 전제를 현행 문서에서 제거

### Phase 1 — P0 계약

1. 기존 component 조합으로 해결 가능한 항목과 신규 component를 분리한다.
2. `aide.md`에 purpose, anatomy, variants, states, responsive, accessibility, rules를 추가한다.
3. 새 component token은 semantic token을 참조한다.
4. 새 정규식 키워드 매핑이나 생성 프롬프트 전체 재작성은 하지 않는다.

### Phase 2 — 실제 renderer

1. shared primitive 또는 composition renderer를 구현한다.
2. `/aide-ui` visualization section과 문서를 추가한다.
3. Playground는 동일한 canonical React renderer를 사용한다.
4. 정적 export 외에는 `renderHTML`과 `dangerouslySetInnerHTML`을 사용하지 않는다.

### Phase 3 — AI retrieval과 생성 연결

1. component와 pattern index가 `llms.txt`에 자동 반영되는지 확인한다.
2. Aide 전용 pattern을 필요한 생성 단계에만 retrieval한다.
3. 선택 시안 HTML과 deterministic shell 조립 경계를 유지한다.
4. before/after 생성 로그로 자유 HTML fallback과 반복 위반 변화를 측정한다.

### Phase 4 — P1 깊이 보강

- table, loading, stepper, search, empty-state, feedback, file-uploader, button 순으로 보강
- 각 항목을 한 묶음씩 계약 → renderer → 문서 → 검증 완료 후 다음으로 이동

진행 상태 (2026-08-28):

- 계약 완료: `table`, `loading`, `stepper`, `search`, `empty-state`, `alert`, `toast`, `file-uploader`, `button`
- 문서 반영 완료: 위 계약은 `/aide-ui/components/{id}`와 `llms.txt`에 자동 노출
- 남은 작업: 필요한 항목만 실제 shared renderer interaction으로 승격하고 Playground 생성 결과에서 상태 조합 검증

## 8. 검증 게이트

각 구현 묶음:

```bash
npm run design:lint
npm run design:export
npm test
npm run lint
npm run build
```

브라우저 QA:

- `/aide-ui` section navigation과 모든 신규 renderer
- Playground palette, canvas, drag overlay
- Studio의 생성·비교·히스토리 실제 상태
- compact, medium, wide viewport
- keyboard tab order와 focus-visible
- loading, empty, partial, error, disabled, long Korean copy
- `prefers-reduced-motion`
- console error와 hydration warning

## 9. 변경 경계

- `aide.md`가 계속 단일 원본이다.
- 외부 브랜드의 색상, 서체, 아이콘, 시각 자산을 복제하지 않는다.
- 생성 UI 아이콘은 Material Symbols Rounded만 사용한다.
- Node Graph가 품질 기준을 넘기 전까지 자유 HTML 경로와 rollback switch를 유지한다.
- `gemini.ts`, `StudioView.tsx`, `BuilderView.tsx`는 필요한 단계에서만 최소 변경한다.
- 기존 사용자·다른 세션 변경을 되돌리거나 함께 정리하지 않는다.

## 10. 다음 실행 묶음

1. P0 후보 7개의 기존 component 조합 가능성 감사
2. 신규 component와 pattern의 machine-readable 스키마 초안
3. `aide.md`에 첫 P0 계약 추가
4. focused contract test 추가
5. `/aide-ui` renderer 연결
6. 전체 검증 게이트 실행

## 11. 조사 출처

- KT Seamless Flow: https://uxdesign.kt.com/
조사 결과는 공개 문서의 분류와 사용 원칙만 참고했다. Aide 계약의 구체적인 명칭, 구조, 값은 저장소의 현재 제품 요구와 실제 consumer를 기준으로 결정한다.
