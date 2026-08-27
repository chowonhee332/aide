# 디자인 시스템 고도화 계획 (Codex md 병합 후 적용)

> 작성: Claude · 상태: **대기 중 (Codex의 md 병합 완료 전까지 실행 금지)**
> 대상: 병합될 단일 Aide 제품 UI 계약 (`wonhee-design.md` + `wonhee-product-ui.md` → 1개)
> 목적: 컴포넌트 계약을 **AI가 시안 UI를 정확히 조립·생성할 수 있는 수준**으로 구조화·완전화한다.

---

## 0. 전제 / 선행조건

1. **Codex가 두 md를 하나로 병합**하고 커밋/반영한다.
2. 병합 완료 후, 이 계획을 실행하기 **전에** 최신 파일을 다시 읽고 아래 가정을 재검증한다.
   - 병합 결과의 실제 섹션 구조(토큰 그룹명·컴포넌트 registry 키)를 확인하고, 이 문서의 갭 목록을 실측치로 갱신한다.
3. `gemini.ts`, `StudioView.tsx`, Node Graph, usage 추적 등 **병행 작업이 활발**하므로, md 외 파일은 건드리지 않는다.

## 1. 목표 & 성공 기준

| 목표 | 성공 기준 (검증 가능) |
|---|---|
| 토큰 재테마·다크모드 대비 | semantic 별칭 계층 추가 후 `design:lint` 통과 + 모든 컴포넌트가 primitive를 직접 참조하지 않음 |
| 컴포넌트 완전성 | registry 모든 항목이 필수 필드(anatomy·states·token-bindings…) 충족, 미구현 항목 0 또는 `planned` 명시 |
| AI 생성 품질 | 병합 md로 시안 생성 시, 누락 컴포넌트로 인한 fallback/자유 HTML 발생 감소 (before/after 스모크) |
| 문서 깊이 | `documentation.pages`의 `page_template` 항목이 실제 렌더러/예시로 채워짐, `/aide-ui` 빌드 통과 |

**약한 기준("컴포넌트 완벽하게")을 강한 기준으로 치환**: "registry의 각 컴포넌트가 anatomy·variants·sizes·모든 state·slots·token-bindings·responsive·a11y·prohibited·example을 갖추고, `design:lint`와 production build를 통과한다."

## 2. 원칙 (안전 경계)

- ✅ **값(`$value`)은 자유**: 색·간격·타이포 값 변경 가능.
- ⚠️ **토큰 group·key 이름은 보수적으로**: enforced lint *"token group renamed or dropped from the base contract"* 가 있으므로, 그룹/키 삭제·개명은 base 어휘와 함께 처리. (병합 후엔 base가 사라지므로 이 lint의 기준도 재정의 필요 — Codex 병합 방식 확인 후 결정)
- ✅ **추가는 alias 우선**: 새 semantic 토큰은 `{group.token}` alias로, 하드코딩 리터럴 지양.
- 🚫 **추측성 컴포넌트 금지**: 실제 시안에서 쓰이지 않을 컴포넌트를 "혹시 몰라" 넣지 않는다. 갭은 **실사용 빈도순**으로만 채운다.
- **게이트**: 각 Phase 끝에 `npm run design:lint` → `npm run lint` → `npm run build`. 시안 생성 스모크는 Phase 2·3 후.

---

## 3. Phase 1 — 토큰 3계층화 (semantic layer)

**문제**: 현재 `color.primary` 같은 semantic-이름 primitive를 컴포넌트가 직접 참조. 중간 의미 계층이 얕아 재테마·다크모드가 어렵다. (Material 3 / Adobe Spectrum는 primitive → **semantic** → component 3계층)

**작업**:
1. `contract.tokens`를 **primitive 팔레트**(순수 값, 예: `blue-500`)와 **semantic alias**(`action.background.primary` → `{palette.blue-500}`)로 분리 검토.
2. `component_tokens`·`token_bindings`가 semantic만 참조하도록 정리.
3. 다크모드가 로드맵이면 semantic 계층에 mode 축 설계 여지만 확보(구현은 별도).

**검증**: `design-token-alias.mjs`로 alias 전부 resolve, `design:lint` 통과, `--aui-*` 출력 diff가 의도한 것만 바뀌는지 `design:diff`로 확인.

**주의**: 이건 구조 변경이라 리스크가 가장 큼. **Phase 2보다 먼저 하되, 값은 그대로 두고 이름/참조만 재배선**해 시각 변화 0을 목표로 한다. (순수 리팩터링 → before/after 스크린샷 동일)

---

## 4. Phase 2 — 컴포넌트 완전성 (핵심)

### 4-1. 갭 채우기 (실사용 빈도순)

현재 registry ≈ 56개. 표준 DS(Ant/Polaris/Carbon/Material) 대조 시 **실제 제품 시안에서 자주 필요한데 없는** 후보:

| 우선 | 컴포넌트 | 근거 (시안에서의 쓰임) |
|---|---|---|
| 高 | **pagination** | 목록/테이블 화면 필수 |
| 高 | **accordion / disclosure** | FAQ·설정·섹션 접기, 매우 흔함 |
| 高 | **combobox / autocomplete** | 검색형 입력, 폼에서 빈번 (현 `search`와 다름) |
| 高 | **upload / file-input** | 업로드 UI 다수 |
| 高 | **line/area/pie/donut chart** | 현재 `bar-chart`만 → 대시보드 시안 커버 부족 |
| 中 | **calendar / date-picker** | 예약·폼 (복잡도 높아 slot만 먼저) |
| 中 | **banner** | 페이지 레벨 공지 (현 `alert`는 inline) |
| 中 | **divider / separator** | 명시적 구분선 primitive |
| 中 | **timeline** | 이력·진행 시각화 |
| 中 | **rating** | 리뷰·평점 |
| 低 | **tree** | 계층 탐색 (업무형) |

> 이 표는 registry 재확인 후 실측으로 확정한다. 이미 다른 컴포넌트가 커버하면 추가하지 않는다 (예: `loading`이 skeleton/spinner 포함, `sheet`가 drawer 포함, `stepper`가 steps 포함).

### 4-2. 각 컴포넌트 완전 스펙 (구조 통일)

registry의 **모든** 컴포넌트가 아래 필드를 빠짐없이 갖도록 감사·보강:

```
anatomy · slots · variants · sizes · states(default/hover/pressed/focus-visible/disabled + 해당 시 loading/empty/error/selected)
· token-bindings · responsive · accessibility · prohibited · example(렌더 가능)
```

- 미구현(`source_override`가 composition-only이거나 렌더러 없는 것)은 **구현하거나 `planned` 상태로 정직하게 표기** (validation의 enforced/planned 원칙 유지).
- **AI 관점 필수**: 각 컴포넌트에 `purpose`(언제 이걸 고르는가)를 명확히 — AI가 시안에서 컴포넌트를 **선택**하는 기준이 됨. (AGENTS.md: `contract.components`의 모든 항목은 `purpose`를 가진다)

### 4-3. 검증

- `design:lint`: 필수 필드 누락·anatomy 없음 warning 0.
- `wonhee-playground-components.ts` catalog parity 통과 (Playground에서 실제 조립 가능).
- `/aide-ui` showcase renderer parity 통과 (선언=렌더 일치, 빌드 실패 없음).
- **시안 생성 스모크**: 대표 brief 1~2개로 생성 → 새로 채운 컴포넌트가 실제 출력에 쓰이는지 확인.

---

## 5. Phase 3 — 문서 / AI 소비 최적화

**목표**: AI(생성 파이프라인·llms.txt)가 계약을 **정확하고 조밀하게** 읽어 시안 품질을 높인다.

1. `documentation.pages`의 `page_template`(overview·usage·anatomy·props·variants·states·token-bindings·examples·prohibited·related) 실제 채움.
2. `/aide-ui/llms.txt`가 계약에서 전부 파생되는지 확인(손으로 쓰지 않음). 컴포넌트 index·pattern index가 4-1/4-2 결과를 반영하는지.
3. `patterns`(landing·list·detail·form·dashboard·workspace·empty·error) 각 패턴이 어떤 컴포넌트를 조합하는지 명시 → AI가 **화면 단위**로 조립할 근거 제공.

**검증**: `/aide-ui` 및 `/aide-ui/llms.txt` 빌드/렌더 통과, llms.txt에 신규 컴포넌트 자동 반영 확인.

---

## 6. 실행 순서 요약

```
[대기] Codex md 병합 완료 + 컨펌
  → 최신 파일 재검증, 이 계획의 가정/갭 실측 갱신
  → Phase 1 (토큰 3계층, 시각 변화 0)         → design:lint · design:diff · build
  → Phase 2 (컴포넌트 갭 + 완전 스펙)          → design:lint · playground parity · 시안 스모크
  → Phase 3 (문서/llms.txt/patterns)          → /aide-ui · llms.txt build
```

각 Phase는 **독립 커밋**. 병행 작업(Codex)과 겹치면 최신 diff 보존한 최소 patch만.

## 7. 리스크 & 병행 주의

- **가장 큰 리스크**: Phase 1 토큰 재배선이 예상외로 시각을 바꾸는 것 → "값 고정, 이름만" 원칙 + `design:diff`로 방어.
- **병합 방식 의존**: base(`wonhee-design.md`)가 사라지므로 *"dropped from base contract"* lint 기준이 바뀐다. Codex의 병합 결과를 보고 이 lint를 어떻게 유지/재정의할지 먼저 정한다.
- **md 외 파일 금지**: 지금 `gemini.ts`·`StudioView.tsx` 등 병행 수정 중 → 이 계획은 md(및 필요한 렌더러/lint)로 범위를 한정.

## 8. 다음 액션

Codex 병합 완료 신호를 받으면 → 병합 파일 재검증 → **8번을 실측 갱신**한 뒤 Phase 1부터 착수.
