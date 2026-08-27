# Codex Worklog

Claude Code와 Codex가 동시에 작업할 때 충돌을 피하기 위한 공유 로그입니다. Codex는 패치 전후로 이 문서를 갱신합니다.

## Active work

- Owner: Codex
- Started: 2026-08-24 (Asia/Seoul)
- Objective: Studio 생성 경로를 HTML-first에서 Stitch식 UI IR → React Canvas → 결정론 HTML export로 전환
- Status: Complete

## File ownership during this task

Codex가 새로 추가하거나 주로 수정할 범위:

- `CODEX_WORKLOG.md`
- `src/lib/design-canvas-ir.ts` (new)
- `src/lib/design-direction.ts` (new)
- `src/lib/design-canvas-renderer.ts` (new)
- `src/lib/design-visual-review.ts` (new)
- `src/app/api/generate-directions/route.ts` (new)
- 필요한 경우만 `src/components/StudioView.tsx` 연결부를 최소 수정
- 필요한 경우만 `src/lib/gemini.ts` 연결부를 최소 수정

Claude Code가 동시에 위 파일을 수정 중이라면 이 로그에 메모를 남기고, 같은 파일을 패치하기 전에 서로의 최신 diff를 확인해야 합니다.

## Existing uncommitted changes observed at start

Codex는 아래 기존 변경을 되돌리지 않습니다.

- `src/app/api/generate-hero-image/route.ts`
- `src/app/api/generate/route.ts`
- `src/app/api/playground-compose/route.ts`
- `src/app/api/validate-key/route.ts`
- `src/app/page.tsx`
- `src/components/StudioView.tsx`
- `src/lib/gemini.ts`

## Implementation plan

1. 서비스 의도에서 6개의 자유로운 디자인 방향을 만든다.
2. 완성 HTML 대신 검증 가능한 Canvas IR로 화면을 표현한다.
3. Canvas IR을 결정론적 렌더러로 즉시 시각화한다.
4. 구조·미디어·밀도·CTA 거리가 먼 3개 안을 선정한다.
5. 사용자가 선택한 시안만 실제 React/HTML로 전환한다.
6. 스크린샷 기반 시각 검수는 전체 재생성이 아닌 부분 수정으로 제한한다.

## Progress

- 2026-08-27: A/B/C 홈 시안의 핵심 이미지 기본 라우팅을 `gemini-3-pro-image` 2K로 통일. 표시용 에셋은 Sharp로 최대 1600px, WebP quality 84로 결정론적 최적화하고 Pro 호출 실패 시만 Flash Image로 폴백하도록 설정.

- 2026-08-24: wireframe 수렴을 구조적으로 해결하기 위한 `UINodeGraph` v1 추가. root/stack/grid/surface/text/icon/media/action/metric/progress/navigation/spacer primitive와 layout·appearance·state 계약 정의.
- 2026-08-24: 기존 `UIScreenIR`을 계층형 node tree로 변환하는 `screenIrToNodeGraph` 호환 adapter 추가. 저장된 시안과 현재 Gemini JSONL 출력은 유지하면서 Graph Renderer로 점진 전환.
- 2026-08-24: depth·중복 ID·빈 text/action을 검사하는 graph validator 추가. invalid graph는 가짜 fallback으로 대체하지 않음.
- 2026-08-24: `UINodeGraphCanvas` React renderer 추가. DESIGN.md theme을 primitive CSS variables로 연결하고 composition/appearance/layout/state에 따라 조합 렌더링.
- 2026-08-24: Studio A/B/C의 생성 중 partial IR과 완료 IR 프리뷰를 고정 `UIScreenCanvas`에서 계층형 Graph Canvas로 전환. 기존 deterministic HTML/Figma serializer와 DOM QA 경로는 호환 유지.

- 2026-08-24: 사용자 결정으로 생성 UI 아이콘을 Google Material Symbols Rounded 단일 체계로 고정. 허용 아이콘 이름 목록을 IR 생성 계약에 명시하고 이모지·Font Awesome·Lucide·Heroicons·임의 SVG를 금지.
- 2026-08-24: React Canvas는 로컬 `MaterialIcon` canonical renderer를 사용하고, deterministic HTML/Figma export는 로컬 `material-symbols-rounded.woff2`와 ligature CSS를 주입. 허용 목록 밖 icon 값은 렌더링하지 않음.
- 2026-08-24: 아이콘 단일화 규칙을 `AGENTS.md` 제품 불변식에 추가해 Codex·Claude Code·향후 agent에 공통 적용.

- 2026-08-24: 실사용 결과가 구조적으로는 UI지만 평면 카드·텍스트 위주의 wireframe처럼 보이는 문제 확인. 원인은 Gemini가 아니라 Studio IR renderer의 시각 토큰/컴포넌트 표현 부족.
- 2026-08-24: Studio theme compiler에 on-primary, positive/caution/negative 상태색, DESIGN.md card shadow 추가.
- 2026-08-24: IR item에 허용 목록 기반 Material Symbols 렌더링, meta/state badge, icon container 추가. bottom navigation도 icon+label+active state 구조로 개선.
- 2026-08-24: hero gradient/layer/depth, elevated cards, 상태 border, chart/progress gradient, map marker shadow, media/profile/calendar/chat surface depth를 React Canvas와 HTML serializer 양쪽에 반영.
- 2026-08-24: 생성 계약에 화면당 최소 4 section·9 meaningful units, icon/meta/badge/value/state 활용, wireframe/skeleton/placeholder/빈 카드 금지를 추가.

- 2026-08-24: 실사용 생성에서 `generic-structure` 품질 기준이 실제 UI 결과 전체를 폐기해 A/B/C가 무한 loading처럼 남는 문제 확인.
- 2026-08-24: 서비스 전용 블록 수와 A/B/C 유사도는 생성 차단 조건이 아니라 quality warning으로 변경. 품질 검사는 실제 결과를 숨기지 않고 SSE quality metadata로 반환.
- 2026-08-24: DOM visual QA도 section 보정 1회 후 남은 문제를 metadata로 반환하도록 변경. 파싱 불가/불완전 IR만 실제 생성 실패로 유지.
- 2026-08-24: 실제 생성 실패 시 A/B/C를 빈 spinner로 남기지 않고 세 카드 모두 명시적 실패·재시도 상태로 전환.

- 2026-08-24: UI IR section type을 8개에서 24개로 확장. search/tabs/filters/form/chart/timeline/map/feed/table/media/chat/calendar/profile/alert/empty-state/commerce-grid를 React Canvas와 deterministic HTML serializer 양쪽에 추가.
- 2026-08-24: section별 `layout`, `columns`, `placeholder` 및 item의 `meta`, `state`, `mediaPrompt`, `imageUrl` 계약 추가. 모바일 column 상한, navigation item 상한, 빈 블록 제거를 결정론 normalize 단계로 처리.
- 2026-08-24: A/B/C 구조 fingerprint Jaccard 유사도, 전용 블록 최소 2개, 중복 ID, 빈 섹션, 모바일 navigation을 검사하는 구조 품질 하네스 추가. 가짜 fallback 없이 오류를 명시.
- 2026-08-24: Puppeteer 렌더 뒤 section별 horizontal overflow, 한 글자 세로 줄바꿈, clipping을 측정하는 DOM visual QA 추가. 실패 section에만 제한된 deterministic CSS를 1회 주입하고 재측정하며, 전체 UI 재생성은 하지 않음.
- 2026-08-24: media section의 `mediaPrompt`가 있을 때 Gemini 이미지 호출을 배치당 최대 1회만 수행하고 A/B/C가 공유하도록 연결. 임의 placeholder URL은 프롬프트와 parser 계약에서 금지.
- 2026-08-24: 선택된 IR 화면의 섹션 순서 이동·삭제 UI와 IR 전용 undo/redo 추가. 변경할 때마다 동일 IR에서 HTML을 다시 직렬화하므로 HTML/Figma export와 Canvas 구조가 일치.

- 2026-08-24: 첫 UI IR 실사용 화면에서 헤더 navigation item과 일반 card item이 같은 flex renderer를 공유해 한국어가 한 글자씩 줄바꿈되는 회귀 확인.
- 2026-08-24: app-header와 bottom-nav를 전용 compact renderer로 분리하고, grid card는 모바일 세로 정보 구조·list는 가로 정보 구조로 분리. `word-break: keep-all`, min-width, nowrap 경계를 React Canvas와 HTML serializer 양쪽에 동일 반영.
- 2026-08-24: A/B/C가 같은 파란 카드 템플릿처럼 보이지 않도록 `dashboard/editorial/immersive` 화면 composition 계약 추가. 과거 저장 IR에도 A/B/C별 기본 composition을 적용하고 새 생성은 세 값을 중복 없이 사용하도록 프롬프트 강화.

- 2026-08-24: Studio 전용 `UIScreenIR` v1 스키마 추가. 화면은 `screen`과 실제 의미가 있는 `section` 패치로만 구성하고, 임시 문구·skeleton·무관한 기본 UI는 생성 계약에서 금지.
- 2026-08-24: `/api/generate-ui-ir` 추가. 선정된 A/B/C 방향을 Gemini 3.6 Flash 단 1회 JSONL 스트림으로 생성하며, 완결된 UI 패치만 SSE로 전달. 파싱 실패 시 가짜 화면 fallback 없이 명시적으로 실패 처리.
- 2026-08-24: Studio A/B/C의 `/api/generate` HTML 3회 호출을 제거하고 구조화 UI 1회 호출로 교체. 생성 중 도착한 실제 section을 `UIScreenCanvas` React 컴포넌트로 즉시 누적 렌더링.
- 2026-08-24: 선택·저장·내보내기를 위해 동일 `UIScreenIR`을 `serializeUIScreenToHtml`로 결정론 직렬화. 모델이 별도의 HTML을 다시 만들지 않으므로 Canvas와 선택 결과의 정보 구조가 달라질 수 없음.
- 2026-08-24: DESIGN.md에서 primary/page/surface/text/border/radius/font 토큰을 읽는 Studio theme compiler 추가. Aide 제품 chrome 토큰과 생성 결과 토큰을 분리.
- 2026-08-24: 개별 B/C 재시도가 과거 HTML-first API로 돌아가던 우회 경로 삭제. 실패 시 전체 구조화 생성 경로만 재실행.
- 2026-08-24: board history에 `screenIr`를 함께 보존하고 복원 시 저장된 DESIGN.md 테마로 React Canvas를 재구성.

- 2026-08-24: Walky A/B/C 실제 테스트에서 DESIGN.md가 실질적으로 무시되는 문제 확인. 요청에는 designMd가 있었지만 Canvas가 ID 해시로 고른 임의 팔레트를 `절대 변경 금지`로 전달하고 있었음.
- 2026-08-24: `CANVAS_PALETTES` / `resolveCanvasVisualContract` 제거. Canvas IR은 좌표·비율·역할만 결정하고 색상·폰트·라운드·그림자는 선택된 DESIGN.md만 사용.
- 2026-08-24: 방향 발산 프롬프트에 A/B/C가 같은 디자인 토큰을 공유하도록 명시. paletteIntent는 새 색을 만드는 항목이 아니라 주조/보조/중립 면적 비중으로 제한.
- 2026-08-24: 프로토타입 확장에만 적용되던 `injectDesignContractStyle`을 메인 A/B/C `generateUI` 결과에도 적용. DESIGN.md 색상·간격·라운드·카드·버튼 계약이 모델 출력 후 결정론적 CSS로 주입됨.
- 2026-08-24: DESIGN.md 파서가 BOM, CRLF, 들여쓴 `tokens.colors` / `contract.tokens` 섹션을 읽도록 보강. `radius`/`rounded`, `type`/`typography`, `tokens.spacing` 내 layout key, `chrome` 치수 alias를 모두 지원.
- 2026-08-24: `Aide에는 절대 가짜 UI를 노출하지 않는다`를 `AGENTS.md` 제품 불변식으로 추가. 이 규칙은 Codex·Claude Code·향후 모든 agent에 공통 적용.
- 2026-08-24: Studio에 남아 있던 `LIVE_PREVIEW_META` / `buildLivePreviewDocument` 하드코딩 데모 UI를 완전 삭제.
- 2026-08-24: `renderDesignCanvasHtml` 결정론 임시 화면 렌더러를 삭제. Canvas IR은 A/B/C 실제 HTML의 내부 구조 계획으로만 사용.
- 2026-08-24: 과거 board history의 `isCanvasPreview` 항목은 복원 시 제외. 실제 HTML 시안이나 완성 prototype만 보드에 노출.
- 2026-08-24: Stitch식 라이브 생성 개선. 미완성 HTML 덬타를 iframe `document.write()`로 실행하던 경로를 제거하고, 실제 생성 HTML에서 완결된 태그까지만 정리한 snapshot을 A/B/C iframe `srcDoc`에 교체 반영하도록 변경.
- 2026-08-24: 라이브 snapshot에서 script, iframe, object, inline event handler를 제거하고 iframe의 `allow-scripts`를 해제. 생성 중에는 안전한 실제 UI 마크업만 렌더링.
- 2026-08-24: 라이브 snapshot은 태그가 완결된 시점에만 갱신되므로 미완성 CSS·태그로 인한 빈 화면과 DOM 파손을 방지. 임시 가짜 UI가 아닌 최종 HTML과 같은 모델 출력을 사용.
- 2026-08-24: 사용자 피드백에 따라 선택 전 Canvas 임시 미리보기를 폐기. `/api/generate-directions`도 preview HTML을 더 이상 렌더링하지 않고, 방향·구조 계획만 반환한다. A/B/C 비교 화면에는 `/api/generate` 결과인 실제 HTML 3개만 표시.
- 2026-08-24: A/B/C를 병렬 생성하고 각 시안의 스트리밍 HTML과 스크린샷을 보드에 바로 반영. 선택 후에는 해당 HTML을 재생성하지 않고 그대로 보존.
- 2026-08-24: 공식 모델 목록에 `gemini-3.6-flash-lite`는 없고, GA 저비용 모델은 `gemini-3.5-flash-lite`임을 재확인.
- 2026-08-24: 비용 절감 범위를 방향 발산 Lite 전환, draft Vision 재검수 제거, 중복 B scene 이미지 호출 제거로 한정. 선택 후 코드화는 3.6 Flash 유지.
- 2026-08-24: `/api/generate-directions`를 `gemini-3.5-flash-lite`로 전환.
- 2026-08-24: draft A/B/C의 스크린샷 Vision 재검수를 비활성화. 시각 검수는 non-draft 최종 품질 경로에만 남김.
- 2026-08-24: B 시안 완료 직후 별도 scene 이미지를 미리 생성하던 중복 API 호출 제거.
- 2026-08-24: 사용자 승인으로 `Canvas A/B/C → 선택 1개만 완성 HTML`로 전환 작업 시작.
- 2026-08-24: `/api/generate-directions`가 3개의 `selectedPreviews` HTML을 결정론적으로 렌더링하도록 연결.
- 2026-08-24: Canvas 미리보기에 방향별 팔레트, 타이포, 히어 아트, 카드·지표·내비게이션 스타일을 추가.
- 2026-08-24: Studio의 초기 A/B/C `generateUI ×3`를 제거하고 Canvas 미리보기 3개를 즉시 표시하도록 전환.
- 2026-08-24: `이 방향으로 완성` 선택 시에만 `/api/generate`를 출호. 선택 결과는 3.6 Flash, 최종 이미지 처리, non-draft Vision 검수 후 기존 prototype 확장 경로로 전달.
- 2026-08-24: Canvas 메타데이터를 board history에 보존해 재로드 후에도 선택 시 완성 코드 생성 경로가 유지되도록 처리.
- 2026-08-24: 실제 테스트에서 선택한 주황 Canvas가 최종 파란 의료 UI로 변하고 `pets`, `circle`, `notifications` ligature가 문자로 노출되는 문제 확인.
- 2026-08-24: Canvas 팔레트를 `visualContract`로 IR에 보존하고 선택 후 완성 프롬프트에 절대 색상 계약으로 전달.
- 2026-08-24: `injectMaterialSymbolsFont`가 class 이름을 CDN 로드로 오인하던 정규식 수정. 생성 HTML은 로컬 `/material-symbols-rounded.woff2`를 결정론적으로 주입.
- 2026-08-24: 선택한 메인 HTML을 즉시 `/api/expand`로 재생성하던 자동 확장 제거. 보드는 선택한 메인 시안 그 자체를 `완성 시안`으로 보존.

- 2026-08-24: Google Stitch, Claude Artifacts/Claude Code 제품 디자인 워크플로우와 현재 Aide 생성 구조 비교 완료.
- 2026-08-24: 새 파이프라인은 기존 HTML 경로를 바로 삭제하지 않고 병렬 도입하기로 결정.
- 2026-08-24: 작업 로그 생성.
- 2026-08-24: `DesignDirection`, `DesignCanvasIR`, `CanvasNode` 스키마를 `src/lib/design-canvas-ir.ts`에 추가.
- 2026-08-24: 약 5K 이하의 전용 프롬프트로 6개 방향을 발산하고, composition/media/navigation/density 거리로 3개를 선정하는 `design-direction.ts` 추가.
- 2026-08-24: `/api/generate-directions` 추가. Gemini 3.6 Flash 1회 호출, 파싱 실패 시 결정론 fallback 6안 사용.
- 2026-08-24: Studio 생성 앞단에 6안 발산 → 3안 선정을 연결하고, 선정된 방향을 `precomputedDesignIntentPlan`으로 각 시안에 주입.
- 2026-08-24: 선정된 미디어 방향이 illustration이 아닐 때 B 시안의 추가 scene 이미지를 생성하지 않도록 제한.
- 2026-08-24: 선정된 방향을 좌표·크기·역할을 가진 `DesignCanvasIR`로 변환하는 결정론 렌더러 추가. 각 Canvas IR은 HTML 생성 전 구조 계약으로 주입됨.
- 2026-08-24: 새 발산 경로에서는 기존 고정 A/B/C archetype·structure guide·direction selector를 중복 주입하지 않도록 충돌 제거.
- 2026-08-24: 시안 스크린샷을 Gemini 3.5 Flash-Lite Vision으로 1회 검수하는 `design-visual-review.ts` 추가.
- 2026-08-24: 비주얼 검수는 전체 HTML 재생성을 금지하고, 기존 class만 사용하는 추가 CSS 3.5KB로 제한. `@import`, `url()`, `@font-face`, script/style injection은 자동 폐기.
- 2026-08-24: 리뷰 점수가 82점 이상이거나 안전한 CSS가 없으면 원본을 그대로 보존. 교정 시 다시 스크린샷을 캡아 최종 프리뷰에 반영.

## Validation

- 2026-08-25: Node Graph 품질 실험을 안전하게 진행하기 위해 Studio에 `Node Graph / 기존 HTML` 생성 엔진 전환을 추가. 기존 HTML은 남아 있던 `/api/generate` 자유 HTML 엔진을 직접 사용하며 Node Graph 변환을 거치지 않음.
- 2026-08-25: 생성 엔진 선택은 `aide_generation_engine` localStorage에 보존하고, 생성 중 전환을 잠그며, Node Graph 실험 품질이 낮을 때 즉시 기존 HTML로 돌아갈 수 있는 수동 롤백 링크를 제공.
- Rollback engine `npm test`: passed.
- Rollback engine full `npm run lint`: 0 errors, 24 existing/image warnings.
- Rollback engine production `npm run build`: passed; both `/api/generate` and `/api/generate-ui-ir` present in the route manifest.
- Rollback engine local landing smoke: rendered without console errors. Engine control is intentionally available in Studio generation canvas after service analysis.
- Rollback engine `git diff --check`: passed.

- 2026-08-24: 실제 Gemini `ui_patch` 수신과 UINodeGraph 라이브 커서를 연결. 섹션이 캔버스에 추가된 직후에만 해당 노드로 커서가 이동하고 실제 타겟을 강조함. 독립 데모 타임라인이나 가짜 그리기 연출은 추가하지 않음.
- Live graph cursor focused ESLint: 0 errors; existing dynamic `<img>` warnings only.
- Live graph cursor `npm test`: passed.
- Live graph cursor production `npm run build`: passed.
- Live graph cursor full `npm run lint`: 0 errors, 24 existing/image warnings.
- Live graph cursor local browser smoke: landing and Studio entry rendered at `localhost:3000` with no console errors.
- Live graph cursor `git diff --check`: passed.

- UINodeGraph vertical slice focused ESLint: 0 errors; existing/dynamic media `no-img-element` warnings only.
- UINodeGraph vertical slice production `npm run build`: passed.
- UINodeGraph vertical slice `git diff --check`: passed.

- Product-fidelity renderer focused ESLint: 0 errors; dynamic media `no-img-element` warning 1개.
- Product-fidelity renderer production `npm run build`: passed.
- Product-fidelity renderer `git diff --check`: passed.

- Non-blocking quality gate focused ESLint: 0 errors; existing image warnings only.
- Non-blocking quality gate production `npm run build`: passed. Initial `.next/server` ENOTEMPTY was a transient dev-server/cache collision; immediate rerun passed without deleting cache.
- Non-blocking quality gate `git diff --check`: passed.

- Expanded UI IR + quality harness focused ESLint: 0 errors; existing `no-img-element` warnings only.
- Expanded UI IR + quality harness production `npm run build`: passed after strict TypeScript fixes.
- Expanded UI IR final full `npm run lint`: 0 errors, 23 warnings (existing image/plugin warnings; new Canvas media renderer adds one `no-img-element` warning by design for dynamic data URLs).
- Expanded UI IR final `npm test`: passed (`Prompt contracts look service-driven instead of layout-locked`).
- Expanded UI IR final `git diff --check`: passed.

- Stitch-style UI IR vertical slice focused ESLint: 0 errors; existing image warnings only.
- Stitch-style UI IR vertical slice full `npm run lint`: 0 errors; 23 warnings (22 pre-existing + obsolete helper warning, removed afterward).
- Stitch-style UI IR vertical slice `npm run build`: passed. `/api/generate-ui-ir` included in route manifest.
- Stitch-style UI IR vertical slice `git diff --check`: passed.

- DESIGN.md precedence fix `git diff --check`: passed.
- DESIGN.md precedence fix focused ESLint: 0 errors, existing `no-img-element` warnings only.
- DESIGN.md precedence fix `npm run lint`: 0 errors, 22 pre-existing warnings.
- DESIGN.md precedence fix `npm run build`: passed.
- No-fake-UI invariant `git diff --check`: passed.
- No-fake-UI invariant `npm run lint`: 0 errors, 22 pre-existing warnings.
- No-fake-UI invariant `npm run build`: passed.
- Live HTML snapshot pipeline `git diff --check`: passed.
- Live HTML snapshot pipeline `npm run lint`: 0 errors, 22 pre-existing warnings.
- Live HTML snapshot pipeline `npm run build`: passed.
- Direct HTML A/B/C pipeline `git diff --check`: passed.
- Direct HTML A/B/C pipeline `npm run lint`: 0 errors, 22 pre-existing warnings.
- Direct HTML A/B/C pipeline `npm run build`: passed.
- Cost optimization final `git diff --check`: passed.
- Cost optimization final `npm run lint`: 0 errors, 22 pre-existing warnings.
- Cost optimization final `npm run build`: passed.
- Canvas selection pipeline final `npm run lint`: 0 errors, 22 pre-existing warnings.
- Canvas selection pipeline final `npm run build`: passed.
- Visual consistency/icon fix final `git diff --check`: passed.
- Visual consistency/icon fix final `npm run lint`: 0 errors, 22 pre-existing warnings.
- Visual consistency/icon fix final `npm run build`: passed.

- Focused ESLint: 0 errors, existing `no-img-element` warnings only.
- `git diff --check`: passed.
- Full `npm run lint`: 0 errors, 22 pre-existing warnings.
- Production `npm run build`: passed. `/api/generate-directions` included in route manifest.
- API fallback smoke test: passed. Local `.env.local` key is invalid, so Gemini call returned `API_KEY_INVALID`; the API correctly returned six deterministic fallback directions and three Canvas IRs. Browser-stored user key is not read or logged by Codex and will be exercised by the next user generation.
- `design-direction` focused smoke: passed (6 fallback directions, 3 composition-distinct selections).
- `design-visual-review` focused smoke: passed (safe CSS injection marker verified).
- Final full `npm run lint`: 0 errors, 22 existing warnings.
- Final production `npm run build`: passed.

## Handoff notes

## 2026-08-25 — 히스토리 복귀·시안 진행 연속성

- A/B/C 보드 히스토리에 `questionnaire`, 사용자 답변, 선택한 생성 엔진, 원본 `design.md`, 로고, 브랜드 컬러, B 시안 이미지와 입력 자료(PRD/IA/AS-IS/참고 이미지)를 함께 저장하도록 확장.
- 히스토리 복귀 시 위 생성 문맥을 복원하고, 과거 형식의 히스토리에 분석 문맥이 없으면 `시안 진행` 시 `/api/analyze`로 문맥을 1회 복구하도록 호환 처리.
- `시안 진행`을 `/api/expand`와 다시 연결하되 선택한 메인 HTML은 홈 화면으로 그대로 보존. 확장 실패 시 메인 시안은 유지하고 서브 화면 실패만 안내하는 비파괴 폴백 적용.
- 확장 API가 생성된 `.aide-screen` 목록을 화면 매니페스트로 반환하여 복귀 후 화면 탭과 멀티스크린 목업을 재구성할 수 있게 함.
- 서비스 분석의 실제 IA를 정적 서브타입 템플릿보다 우선하고, 분석된 핵심 여정을 숨은 기본 답변에도 반영.
- HTML A/B/C 병렬 생성은 `Promise.allSettled`로 변경해 한 시안 실패가 다른 완성 시안을 폐기하지 않도록 처리.
- 참고 이미지를 최초 생성과 선택 후 확장 양쪽에 전달하도록 누락된 배선을 연결.
- 브라우저 저장공간 초과 시 생성 엔진 선택 이벤트가 중단되던 `QuotaExceededError`를 비차단 처리.
- 검증: `npm run lint -- --quiet` 통과, `npm run build` 통과, `git diff --check` 통과. 로컬 첫 화면과 히스토리 패널 렌더링 확인. 실제 과거 히스토리가 없는 별도 브라우저 세션이라 API 호출을 포함한 실데이터 복귀 클릭은 사용자 세션에서 최종 확인 필요.

## 2026-08-25 — Gemini 사용량 시각화

- 기존 모델별 총액 목록에 최근 14일 일별 집계를 추가하고, 전체 입력·출력 토큰 합계를 API 응답에 포함.
- 사용량 모달을 비용·호출·전체 토큰 KPI, 14일 비용 면적/선 그래프, 모델별 비용 비중 막대, 입출력 토큰 요약 구조로 확장.
- 외부 차트 패키지 없이 반응형 SVG와 기존 Aide 디자인 토큰만 사용하여 추가 네트워크 비용과 번들 의존성을 만들지 않음.
- 검증: `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 실데이터(6회 호출, 3개 모델)로 그래프·비중·토큰 렌더링 확인.

- 사용자가 선택한 기존 시안 HTML 보존 불변식은 유지한다.
- 기존 `generateUI ×3`는 새 Canvas IR 경로가 안정화될 때까지 fallback으로 남긴다.
- Phase 1 vertical slice complete: direction divergence, diverse selection, Canvas IR, HTML builder handoff.
- Generated screenshot visual review and section-level CSS correction are connected. There is no full HTML regeneration loop.
- Codex file ownership for this phase is released. Claude Code may continue from this log after reviewing the latest diff.

## 2026-08-25 — 전체 생성 파이프라인 정리 및 디자인 품질 보강

- A/B/C 디자인 방향을 단순 다양성 순으로 고르던 흐름을 `data / 3d / photo` 시안 역할과 함께 평가하도록 변경. 각 시안의 이미지 정책과 아트 디렉션이 충돌하는 문제를 방지했다.
- `DesignDirection`이 존재하면 `UIStructureIR`을 건너뛰던 조건을 제거. 아트 디렉션은 시각 방향을, 구조 IR은 기기 셸·내비게이션·섹션·스크롤 계약을 각각 담당하도록 역할을 분리했다.
- 사용되지 않는 Canvas IR 결과가 A/B/C 완성을 막던 의존성을 제거. Canvas/Node Graph 자료형과 과거 히스토리 호환 데이터는 남기되, 현재 HTML 시안 생성 성공 조건에서는 제외했다.
- `design.md` 전체 원문을 매 시안 프롬프트에 반복 삽입하던 비용·품질 문제를 정리. 전체 문서는 먼저 결정론적 디자인 계약으로 컴파일하고, 모델에는 YAML·CSS·핵심 디자인 섹션을 우선한 최대 24,000자만 전달한다.
- `generateUI` 후처리에서 이미지 보강·로고·레이아웃 주입이 중복 실행되던 코드를 단일 순서로 통합했다.
- 선택한 시안의 프로토타입 확장 이후에만 Gemini Flash-Lite Vision 검수를 1회 실행하도록 연결. 기존 클래스만 사용하는 안전한 CSS 보정만 허용하며 HTML 구조와 선택한 홈 화면은 재생성하지 않는다.
- Vision 보정 CSS는 URL, 스크립트, `@` 규칙, `!important`, ID/태그 선택자, 존재하지 않는 클래스를 거부하도록 검증을 강화했다.
- 현재 소스 구조에 맞지 않아 사실상 실행되지 않던 Studio 계약 검사 경로와 단언을 갱신했다. 시안 역할 선택 테스트를 추가하고 기본 테스트 명령에 포함했다.
- 실제 미사용 키보드 핸들러를 제거했다. 공개 Figma 플러그인 산출물 및 동적 이미지의 기존 경고는 동작 변경 위험 때문에 이번 정리 범위에서 유지했다.
- 비용 정책: A/B/C 초안에는 Vision 검수를 추가하지 않았다. 긴 `design.md` 입력은 줄고, 추가 모델 호출은 사용자가 시안을 고른 뒤 최종 확장 시 저가 모델 1회뿐이다.
- 최종 검증: `npm test`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 개발 서버를 재시작한 뒤 `http://localhost:3000` 초기 화면의 주요 입력·히스토리·사용량 UI 렌더링과 브라우저 오류 0건을 확인했다.

## 2026-08-25 — Gemini 최소비용 모델 라우팅

- 모델 ID를 `gemini-model-policy.ts` 한 곳에서 관리하도록 정리했다.
- `gemini-3.6-flash`는 디자인 품질을 직접 결정하는 A/B/C 최초 HTML 조합에만 기본 사용한다.
- 서비스 분석, 디자인 방향, 자동 구조 복구, 선택 후 서브 화면 확장, 기존 시안 대화 수정, Vision 검수, Playground 조합, API 키 검증은 `gemini-3.5-flash-lite`로 고정했다.
- 선택한 홈 HTML은 확장 시 그대로 보존되므로 Lite 전환이 최초 시안 외형을 다시 그리지 않는다.
- 이미지 모델은 별도 정책을 유지한다. 3D 초안은 Flash Lite Image, 품질이 필요한 장면 이미지는 Flash Image를 사용한다.
- 모델 라우팅이 다시 비싼 모델 쪽으로 섞이지 않도록 정적 회귀 테스트를 추가했다.

## 2026-08-25 — 영업대표용 단일 프롬프트 및 히스토리 연속성

- 랜딩의 `서비스 설명 / 핵심 기능` 필수 입력 2개를 `어떤 화면이 필요한가요?` 자연어 입력 1개로 단순화했다.
- 주요 사용자, 핵심 기능·필수 정보, 강조·제외 조건은 접힌 `상세 입력(선택사항)`으로 이동했다.
- 모델에 전달할 때는 짧은 자연어도 `사용자 요청 / 주요 사용자 / 핵심 기능 또는 필수 정보 / 추가 요청`으로 의미를 보존해 조립한다.
- Enter는 자연스러운 줄바꿈으로 변경하고 Cmd/Ctrl+Enter와 생성 버튼만 전송하도록 수정했다.
- 히스토리 보드에 `variants-ready / prototype-ready` 단계를 명시적으로 저장해 A/B/C 생성 후 홈을 거쳐 복귀하면 비교 보드와 `이 시안으로 진행` 단계가 복원되도록 했다.
- A/B/C 원본 PNG를 그대로 IndexedDB에 저장하지 않고 각 미리보기를 압축해 저장공간 초과로 히스토리가 조용히 끊기는 위험을 낮췄다.
- 신규 입력 및 복귀 계약을 확인하는 회귀 테스트를 추가했다.
- 검증: `npm test`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과. 로컬 브라우저에서 단일 입력, 상세 입력 펼침, 세부 필드 접근성 이름, 키보드 안내를 확인했고 콘솔 오류는 0건이었다. 실제 Gemini 재생성은 추가 비용을 피하기 위해 자동 실행하지 않았다.

## 2026-08-25 — aide.md 단일 디자인 시스템 원본 통합

- `aide.md`, `wonhee-design.md`, `wonhee-product-ui.md` 세 문서의 machine contract를 `src/lib/design-systems/aide.md` 하나로 통합했다.
- Aide 제품 토큰, `/aide-ui` 문서·쇼케이스, Playground 카탈로그, 고객이 `DESIGN.md`를 첨부하지 않은 기본 생성 UI가 모두 `aide.md`를 읽도록 배선했다.
- 고객이 직접 첨부한 `DESIGN.md`는 고객 생성 화면에만 override되고 Aide 제품 chrome은 바꾸지 않는 경계를 계약과 회귀 테스트에 명시했다.
- Node Graph 테마 컴파일러도 단순 frontmatter보다 `aide.md` machine contract를 우선하고, DTCG `$value` 타이포·간격 토큰을 직접 해석하도록 보강했다.
- 기존 두 문서와 생성 산출물은 `docs/archive/design-system-legacy/`로 이동해 실행 경로에서 제외했다. 새 export 산출물은 `aide.css`, `aide.tokens.json`이다.
- `design:lint` 와 `design:export`도 단일 `aide.md`만 검증·출력하도록 변경했고, 단일 원본 배선을 확인하는 회귀 테스트를 추가했다.
- 통합 후 추상 portable family가 제품 component board에 노출되던 경계를 발견해, 단일 계약을 유지하면서 `component_registry` 등록 항목만 제품 문서·Playground에 노출하도록 필터링했다.
- 최종 검증: `npm test`, `npm run design:lint`, `npm run design:export`, `npm run lint`, `npm run build`, `git diff --check` 통과. lint는 기존 `<img>` 및 공개 Figma plugin 경고 22건만 유지했다.

## 2026-08-25 — Button 계약·구현·문서 통일

- Button variant 이름을 `primary / secondary / outline / ghost / destructive / link`로 통일했다. 코드의 기존 `default`는 `primary`로 교체했고 `<Button>`의 기본 표현은 그대로 primary를 사용한다.
- `aide.md` component definition, recipe, token binding에 6개 variant를 모두 연결했다.
- React 공용 Button, 문서 preview, Playground HTML renderer가 동일한 variant 의미와 이름을 사용하도록 정리했다.
- `/aide-ui/components/button`에서 전체 variant, compact/default/touch/prominent 크기, disabled/loading/icon 상태를 한 눈에 비교하는 specimen을 추가했다.
- 활성 Playground·Docs의 표시 이름, package metadata, 기본 AppHeader/Footer 브랜드를 Wonhee에서 Aide로 변경하고 예전 localStorage key는 복구 호환용으로만 남겼다.
- 검증: `design:lint`, `design:export`, `npm test`, `npm run lint -- --quiet`, `npm run build`, `git diff --check` 통과.

## 2026-08-26 — Montage 기준 Aide 파운데이션 정규화

- Wanted Montage 공식 문서의 light semantic color, typography, grid, elevation과 실제 Button 계산 스타일을 브라우저에서 확인했다.
- `aide.md`의 기존 token 이름과 consumer 연결은 유지하면서 Primary `#0066FF`, Background Alternative `#F7F7F8`, Label Normal `#171719`, Montage label/fill/line/status 계열로 semantic color 값을 정렬했다.
- 타이포그래피를 Montage 역할과 수치에 맞춰 56/72 Display 1부터 11/14 Caption 2까지 정리하고, 8px·10px처럼 지나치게 작은 제품 텍스트는 11px 최소 크기로 올렸다. 모든 typography token의 font family/value 표현 형식도 통일했다.
- 기본 control radius를 실제 Montage Button의 10px로 조정하고, resting/raised/floating/modal shadow를 Montage Normal XSmall~XLarge 합성값으로 교체했다.
- responsive mode는 기존 compact/medium/wide 호환성을 보존하면서 Montage의 2/3/12 column, 20px gutter, xs/sm/md/lg/xl breakpoint 참조를 추가했다.
- `globals.css`의 공용 한글 font stack에 Pretendard JP fallback을 추가했다. 생성 CSS/JSON은 `design:export`로 갱신했다.
- 검증: `npm run design:lint` 0 errors(기존 미사용 token warning 11건), `npm run lint` 0 errors(기존 warning 22건), `npm run build`, `git diff --check` 통과. `/aide-ui` 런타임에서 primary/page/text/radius/type token 반영을 확인했다.
- 다음 단계는 Button, Field, SelectionControl, Card의 anatomy·padding·state를 Montage 실제 규격에 맞추는 component pass다.

## 2026-08-26 — Montage 기준 핵심 컴포넌트 치수 정규화

- Wanted Montage 공식 컴포넌트 화면의 계산 스타일을 기준으로 Button, Field, Chip, Checkbox, Switch, Tabs, Card의 높이·패딩·간격·radius·타이포그래피를 `aide.md` component token에 반영했다.
- React 공용 primitive와 Playground HTML renderer가 같은 component token을 사용하도록 정리해 문서 미리보기, Aide 제품 UI, 기본 고객 시안 사이의 세부 치수 차이를 줄였다.
- Button은 40px/20px/10px/15px, Field는 48px/12px/12px, Chip은 24px/7px/6px, Checkbox는 24px/5px, Tabs는 52px/20px, Card는 20px radius를 기본 규격으로 사용한다.
- Button variant는 계약의 표준 이름인 `primary`만 사용하고, 실제 사용처가 없는 예전 `default` 별칭은 회귀 방지를 위해 추가하지 않았다.
- 검증: `design:lint` 0 errors, `design:export`, `npm run lint` 0 errors, `npm run build` 통과. `/aide-ui/components/*` 브라우저 계산 스타일에서 위 치수와 Pretendard 15px 본문 스타일을 확인했다.

## 2026-08-26 — 영문 예시·Montage Chip·Overview 여백 정리

- `/aide-ui`와 Playground의 컴포넌트 예시 콘텐츠를 영문으로 통일했다. 문서 설명과 편집기 레이블은 한국어를 유지해 예시 데이터와 제품 UI 언어를 분리했다.
- Chip 계약을 Montage의 `solid / outlined` variant로 교체하고 24px 높이, 4px 7px 패딩, 6px radius, 2px gap, 15px medium 타이포그래피와 선택 상태 색상을 실제 계산값에 맞췄다.
- Components Overview 썸네일은 프레임과 클릭 영역을 유지한 채 내부 컴포넌트만 80%로 중앙 축소했다.
- React preview와 Playground HTML renderer가 같은 Chip variant와 토큰을 사용하도록 연결했다.

## 2026-08-27 — A/B/C 콘텐츠 동일성 및 디자인 토큰 미리보기 정정

- `contentInventory` 전체를 A/B/C 공통 콘텐츠 계약으로 고정했다. 세 시안은 같은 KPI·액션·목록·활동의 제목과 값·메타·배지를 모두 유지하고, 섹션 순서·그룹·위계·컴포넌트 표현만 다르게 생성한다.
- variant별 `mustShow`가 서로 다른 일부 항목만 요구하던 구조를 제거하고 세 시안이 동일한 전체 콘텐츠 집합을 받도록 변경했다.
- 세 시안이 같은 DESIGN.md 팔레트·타이포그래피·radius·spacing을 사용하고 시안별 임의 색상으로 차이를 만들지 못하도록 HTML 생성 계약을 강화했다.
- Studio 디자인 보드는 실제 런타임 컴포넌트로 오인되지 않도록 `Token Reference / Preview only`로 명시하고, 4px 수준의 격자 간격을 1px hairline으로 축소했다.
- 공통 콘텐츠와 토큰 미리보기 계약이 되돌아가지 않도록 정적 회귀 검사를 추가했다.
- 토큰 보드의 바깥 열뿐 아니라 각 열 내부 행 간격도 1px hairline으로 통일했다.
- 기능별 모델 라우팅이 정책 파일에 고정되어 있으므로 랜딩의 수동 모델 선택기를 제거하고, 과거 저장값이 Studio 모델 선택을 덮어쓰지 못하게 했다.
- 기존 화면 캡처 분석에 `shellContract`를 추가해 상단 앱바 제목·좌우 액션과 하단 내비게이션·로고의 존재/부재를 생성 계약으로 보존한다.
- Aide 제품 chrome의 기본 로고가 고객 시안 생성 API로 전달되지 않도록 분리했다.
