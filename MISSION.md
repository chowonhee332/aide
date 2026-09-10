# Aide Mission Board

> Brain 1개가 사용자와 대화하고, 병렬 서브에이전트(기획·디자인·개발 + 필요 시 아키·검증)에게 일을 시키는 **공동 목표와 상태 공유판**.
> 규칙은 `AGENTS.md`, 상태는 이 파일. 규칙을 여기 쓰지 말고, 상태를 거기 쓰지 말 것.
> **150줄을 넘기지 않는다.** 매 세션 컨텍스트에 자동 로드되므로 길어지면 전원이 비용을 낸다.
> 끝난 항목은 지우고, 큰 덩어리는 `docs/`로 빼고 여기엔 한 줄 링크만 남긴다.

## ⚠️ Brain + 병렬 서브에이전트 운영 — 반드시 읽을 것

`AIDE · BRAIN`(이 세션)이 `~/Documents/aide`(main)에서 사용자와 대화하고 통합을 판단한다. 실제 조사·구현은 Brain이 `Agent` 툴로 띄우는 **병렬 서브에이전트**가 맡는다. 사용자는 Brain하고만 대화한다.

- Brain만 목표 분해, 담당 배정, 변경 경계, 통합 순서, 최종 완료를 결정한다.
- 코드를 고치는 서브에이전트는 `isolation: worktree`로 격리해 띄운다(자동 정리). 조사·리뷰는 격리 없이.
- 한 사이클에서 서브에이전트끼리 파일 소유가 겹치지 않게 Brain이 3절 기준으로 범위를 쪼갠다.
- 서브에이전트는 커밋 SHA·검증 증거·잔여 위험을 Brain에 보고하고, Brain이 main에 통합·커밋한다. `git push`는 사용자 요청 시에만.
- 아키텍처·검증은 상시 역할이 아니라 필요할 때 `architect` / `code-reviewer` 서브에이전트로 띄운다.

---

## 1. 북극성 (고정 — 사이클마다 바뀌지 않음)

기획서를 넣으면 **A/B/C 디자인 시안 3개**가 나오고, 고른 안이 **멀티스크린 프로토타입**으로 확장된다.

작동 방식 (2026-08-27 코드 확인):
- **HTML은 LLM이 통째로 생성한다.** `generateUI`가 대형 프롬프트를 조립 → `generatePro` 호출 → ```html 블록을 정규식으로 추출.
- **결정론 코드는 "생성"이 아니라 "생성 후 보정"을 맡는다.** 브랜딩·토큰·이미지 플레이스홀더·셸·아이콘 주입 후, `lintStructure`로 계약 대조.
- **선택된 시안은 재생성하지 않는다.** `expandToPrototype`은 홈 셸을 `stripScreenHomeDiv`/`splitShellContent`로 분해해 재사용하고, LLM은 추가 화면 본문만 만든다.

품질 모델 3층: **1층 결정론 주입 → 2층 사전 계약 → 3층 lint 안전망.**
같은 위반이 반복되면 lint를 늘리지 말고 1·2층으로 승격한다.

## 2. 이번 사이클 목표

**목표: A/B/C 품질을 "실측 가능한 상태"로 만든다.**
유료 비교 전에 프롬프트 계약·앱 UI·Playground가 흔들리면 어떤 개선도 원인 귀속이 안 된다.
이번 사이클은 품질 자체가 아니라 **품질을 측정할 수 있는 바닥**을 만든다.

| # | 성공 기준 (검증 가능해야 함) | 담당 | 상태 |
|---|---|---|---|
| C1 | 앱 UI가 Astryx 단일 계약 — 손수 만든 컨트롤 0, 컨트롤 크기는 밀도가 제어 | Brain | ✅ `f8d2d66`·`2afddf4`·`e7689ee`·`8d39fff` |
| C2 | Playground 콘솔 에러 0 + 파괴적 동작에 네이티브 `confirm` 0 | Brain | ✅ `9653afc`~`2698040` |
| C3 | 생성 프롬프트의 단계별 방법론이 버전·예산이 검증되는 단일 원본 | 개발 | ✅ `6879102` |
| C4 | 방법론 MD ↔ 대형 프롬프트 모순 0 | 개발 | 🟡 3영역 해소, 골격 차별화·12컬럼 잔존 |
| C5 | 기존 RED 테스트 2건을 별도 이슈로 분리 처리 | 검증 | ⬜ 미착수 |
| C6 | Aide 스타일이 이식 가능한 단일 원본 — Tailwind 제거의 선행 | Brain | 🟡 S1·S2 완료, S3 진행 중(16/51) |

**다음 사이클 (진입조건: C4·C5 종료)** — 유료 A/B 비교로 A/B/C 생성 품질 실측.
대표 브리프 6개·고정 변수·토큰/지연/보정 횟수 기록은 `docs/generation-methodology.md`,
이전 G1~G6 초안은 `docs/handoff-abc-generation-quality.md`.

**약한 기준 금지.** "품질 좋게"가 아니라 "무엇이 몇 건에서 몇 건으로 줄었는가"로 쓴다.

## 3. 역할 · 소유 파일 (충돌 방어선)

Brain이 목표를 아래 역할로 쪼개 서브에이전트에 배정한다. 한 사이클에서 서브에이전트끼리 소유 파일이 겹치지 않게 나눈다.

**상시 역할은 기획·디자인·개발 3개.** 아키텍처·검증은 필요할 때만 `architect` / `code-reviewer` 서브에이전트로 띄운다.

| 역할 | 책임 | 소유 파일 |
|---|---|---|
| **Brain** | 목표 분해, 우선순위, 작업 배정, 충돌 조정, 통합, 사용자 승인 + 아키·검증 겸임 | 공유 파일과 최종 통합; 직접 구현은 긴급·소규모 변경만 |
| **기획** | brief 해석, 질문, ServiceAnalysis, contentSeed, 방향 생성 | `src/lib/design-intelligence.ts`, `src/lib/design-direction.ts`, `src/lib/layout-archetypes.ts` |
| **디자인** | 디자인 계약, 토큰, 컴포넌트 registry, `/aide-ui` | `src/lib/design-systems/*.md`, `src/lib/aide-product-tokens.ts`, `src/lib/design-token-alias.mjs`, `scripts/design-system.mjs`, `src/app/aide-ui/**` |
| **아키텍처** | IR·API·데이터 경계, 결정론/LLM 책임 분리, 변경 설계 리뷰 | 기본 읽기 전용; 교차 모듈 변경은 Brain이 작업별 소유 파일을 지정 |
| **개발** | 생성 파이프라인, Studio/Playground UI, API | `src/lib/gemini.ts`, `src/components/StudioView.tsx`, `src/components/BuilderView.tsx`, `src/app/api/**` |
| **검증** | lint/build/test, 구조 계약, 실측 로그 분석 | `src/lib/structure-lint.ts`, `test/**`, `scripts/check-studio-contract.mjs`, `.aide-logs/` 분석 |

**공유 파일 (Brain 배정 없이 편집 금지):** `AGENTS.md`, `MISSION.md`, `package.json`, 공용 type/contract 파일

## 4. 상태 보드 — Brain이 갱신

서브에이전트 보고를 받아 Brain이 갱신한다. 형식: `상태 · 무엇을 · 다음 검증`

- **기획**: 🟡 대기 — 아직 이번 사이클 착수 안 함
- **디자인**: 🟢 진행 — `aide.md`의 AI interaction·P0 패턴·토큰/컴포넌트 계약을 `/aide-ui`와 연결. 2026-08-31에 platform baseline(768·1280), 버튼 radius, 생성용 색상 산문을 정합화하고 `generationAcceptance`를 A/B/C 프롬프트에 연결. Astryx는 수정 없는 upstream submodule(`vendor/astryx`)과 원본 `apps/docsite` 실행으로 검증하며, Aide 자체 beta 재구현은 두지 않는다. 다음: 실제 A/B/C 1회로 계약 준수 실측
- **아키텍처**: 🟢 감사 — 생성 파이프라인·IR·API·데이터 경계의 안전한 분할과 선행조건 조사
- **개발**: 🟢 진행 — `docs/design-contract-cleanup.md` 완료분(9커밋, 전부 정적 검증). 남음: 1b(_base/guardrails 신규 + aide.md 산문 통합)·2(aide.md 물리 분해)는 **다음 실 생성 1회와 묶어서**.
- **Brain 직접(2026-08-31)**: 🟢 platform-baseline·셸 강제·모델 라우팅·telco 수정·랜딩 아키타입·데스크 리서치 커밋 완료(`ad2178b`~`d76ed50`+). 6절 참고. 다음: 실제 FORMA/VIP 재생성으로 검증.
- **Brain 직접(2026-08-31) — /aide-ui 패턴 specimen**: 🟢 `040f904`. `/aide-ui/patterns/*` 15개 전부 실제 primitive 조합 specimen 렌더(기존 4개 → 15개). `component_registry` 70개는 `componentCoverage()` 실측 7축 모두 70/70 — 컴포넌트 쪽 갭 없음 확인. Codex의 미커밋 patternspecimen gate·llms.txt·test 동봉(사용자 승인).
- **검증**: 🔴 RED 2건 (§2 C5) — `npm test` 21개 중 19 통과. ① `verify_sales_input_history`: `page.tsx` 키보드 안내 계약 불일치. ② `verify_phase0_routes`: `router.push('/playground')` 소스 문자열 기대 vs 현행 Next Router 구현 불일치. 둘 다 오래된 기존 실패이며 **다른 작업과 섞어서 고치지 말 것** — 별도 이슈로 분리해 각각 "계약을 코드에 맞출지, 코드를 계약에 맞출지"부터 정한다. **마스킹 안 됨**: `scripts/run-all-tests.mjs`가 전부 실행하고 실패만 집계(`ac12bbd`). lint 0 errors(기존 `<img>` 경고 21) + build ✓.
- **Brain 직접(2026-09-01) — 감사 후속 수정**: 🟢 서브에이전트 감사(3건) → 격리 worktree 5개 → main 통합. `ac12bbd` 테스트 러너, `1508676` `detectServiceSubtype` hint 우선, `c5a78b1` `design-md-contract` fail-loud + `assertAideContractParse` + 신규 테스트, `dda6fda` aide.md 중복 breakpoint 스케일 제거·tablet gutter 20, `09440f7` gemini.ts KTDS 잔재 −103줄·loader warn. B1(마커 통합)·B2(프롬프트 HTML→결정론)·B4(component_tokens alias 층)은 다음 실 생성 1회와 묶음.
- **Brain 직접(2026-09-02) — Playground = Astryx 40 템플릿(전부 통째) + 프레임 스크롤**: 🟢 미커밋. Playground = Astryx 전용(92 컴포넌트). **slice A**: `CanvasItem.children` + 트리 헬퍼, 재귀 렌더러, 중첩 dnd, 컨테이너 prop 패널 — 팔레트로 조합할 때 유효(유지). **slice B(사용자 방향 수정)**: `@astryxdesign/cli`로 40개 ready page 템플릿 vendoring(`scripts/generate-astryx-templates.mjs`, verbatim). JSX→트리 컴파일러는 폐기(품질 미달) — `scripts/compile-astryx-templates.mjs`는 이제 manifest→`astryx-templates.index.ts`(id/name/description/category)만. **모든 템플릿이 단일 `astryx-frozen` 블록**으로 실제 Astryx 페이지(`mod.default`)를 프레임 폭에 맞춰 verbatim 렌더. Astryx 자체 컴포넌트가 반응형. **상단 Mobile/Desktop 토글 = 활성 프레임 in-place 리사이즈**(새 프레임 안 만듦, Astryx playground와 동일). `selectFrameDevice`가 폭 전환 + 템플릿 재유도(비템플릿은 content↔main region remap). 프레임 높이 고정(812/1080) + content/main `overflow:auto` → 긴 페이지 프레임 안 스크롤. 프리즈 블록은 `height:100%` 체인(SortableItem/StaticCanvasItem/AstryxTemplateFrozen) + `colorScheme:'light'`로 프레임을 꽉 채우고 CSS `light-dark()`를 라이트 팔레트로 고정(안 그러면 페이지가 다크로 렌더·하단 잘림). `restoreFrames`는 항상 templateId로 재유도. **왼쪽 패널 탭을 `레이어` 제거 → `템플릿 | 컴포넌트`로 교체**(기본 `템플릿`). 40개 템플릿이 카테고리별 1열 리스트로 패널에 들어옴(상단 `구조 템플릿` 드롭다운·`StructureTemplatePicker`·`templatePickerOpen`·`toggleItemVisibility`/`moveItemInRegion` 제거). 템플릿 적용 시 `컴포넌트` 탭으로 자동 전환. `AstryxTemplateFrozen`이 `@astryxdesign/core/astryx.css`+`theme-neutral/theme.css`를 직접 import(패널이 컴포넌트 팔레트를 안 띄워도 스타일 로드 — 안 하면 프리즈 페이지가 unstyled). 브라우저 검증(fresh tab, 콘솔 클린): 패널 `템플릿` 탭에 40개 그룹 리스트; Login Card 클릭 → 적용+`컴포넌트` 탭 전환, 실제 Astryx 페이지 스타일 정상; Basic Login이 프레임 꽉 채우고 카드 중앙(라이트 bg #F1F4F7); Mobile↔Desktop 토글 in-place; Dashboard scrollH 2844 in 808 스크롤. `lint` 0 errors, `build` ✓, `npm test` 18/19(기존 RED만). **커밋+푸시 완료 `2bb2e1c`** (MISSION 71행 디자인-role 편집은 다른 작업자 것이라 제외, working tree 잔존).
- **Brain 직접(2026-09-03) — 템플릿 썸네일 + 홈 모드 토글**: 🟢 미커밋. ① **폰트**: `Figtree`(Astryx 브랜드체, theme-neutral이 참조만 하고 패키지엔 없음) `public/fonts/figtree/`에 self-host + `globals.css` `@font-face`. `AstryxTemplateFrozen`/`AstryxComponentPreview` wrapper에 `data-astryx-theme="neutral"` 추가 → theme `@scope` 열려 `--font-family-*`·토큰 해석. ② **썸네일**: `/astryx-thumb/[id]` bare 렌더 라우트 + `scripts/capture-astryx-thumbs.mjs`(`npm run astryx:thumbs`, puppeteer, prebuild 아님) → `public/astryx-thumbs/<id>.webp`. 패널 `템플릿` 탭 텍스트 리스트 → `TemplateCard` 이미지 그리드(16:10 screenshot + name, `onError` 시 아이콘 fallback). ③ **StyleX 6개 제외**: `dashboard-executive-summary`·`dashboard-project-status`·`kanban-board`·`settings-dialog`·`table-filter`·`shell-top-nav`가 userland `stylex.create()` 호출 → babel 플러그인 없이 런타임 throw(placeholder만). `generate-astryx-templates.mjs`가 `@stylexjs/stylex` import하는 템플릿을 skip → 40→**34개**. (StyleX 컴파일러 빌드에 추가 시 복원 가능.) ④ `.skeleton.txt` 40개 생성 중단(폐기된 트리 컴파일러 잔재) + 삭제. ⑤ **index ENOENT 레이스 해소**: `generate-astryx-templates.mjs`가 `rmSync(OUT_DIR)` 대신 `.tsx`/`.skeleton.txt`만 지움 → `astryx-templates.index.ts`가 사라지는 창 없음, fresh tab 콘솔 클린 확인. ⑥ **홈 모드 토글**(`page.tsx`): `AI 시안 생성`(기존 A/B/C, 파랑) ↔ `템플릿 조합`(초록 `WaterHero` 팔레트). 조합 모드 submit → **신규 `/api/match-template`**(`GEMINI_ECONOMY_MODEL` 1패스, 34개 카탈로그, 정규식 매핑 없음) → `BuilderView`가 `initialTemplateId`/`initialDevice`로 해당 템플릿 프레임 1개만 열고 `컴포넌트` 탭 전환. 브라우저 검증: "로그인"→`login-card`, "대시보드"→`dashboard`, "결제 폼"→`payment-form`, "설정 사이드내비"→`settings-sidebar`, 프레임에 실제 Astryx 페이지 렌더(371×808). `lint` 0 err · `build` ✓.
- **Brain 직접(2026-09-04) — 앱 크롬 Astryx 전환 4단계 + 몰입형 셸**: 🟢 커밋 `a190bf8`·`8cbd8e7`·`e06c68f`(미푸시). 세션 앞부분(`4fa48c4`~`c3e98e1`): 크롬 토큰 브리지(`aide-chrome-theme.ts`, `--aui-*`→Astryx theme-neutral 라이트값, **프라이머리 블루** `#0064e0` 램프), 전역 화면 밀도 프리셋 4종(`aide-density.ts` 3계층, 기본 comfortable, `AideDensityProvider`가 `<html>`에 직접 주입 — `display:contents` 상속 회피), 홈 하이드레이션 수정. 이번 라운드: ① **LNB를 4개 탭 전부에**(`playground`·`aide-ui`를 `(workspace)` 그룹으로 이동, URL 불변). BuilderView 루트 `position:fixed`→`relative`+flex 자식. ② `DocsShell` `docs-gnb` 상단바 제거, 섹션 내비를 `docs-lnb` 상단 + 모바일 스트립으로. `docs.css` fixed 레이어 → flex 행. ③ **몰입형 셸**: `/playground`·`/aide-ui`에서 Astryx SideNav `collapsible`로 아이콘 레일만, 콘텐츠는 `--aui-radius-card` 라운드 카드로 띄우고 내부 스크롤(홈·프로젝트는 풀 LNB 유지). ④ 홈 첨부 탭바 → Astryx `SegmentedControl`. `lint` 0 err · `build` ✓(156p). **잔여**: page.tsx 소스첨부 패널 *내부*(파일 input·URL 캡처·As-is 분석·브랜드 픽커)는 아직 인라인 style — Phase 5. **기존 버그**(이번 세션 밖): `page.tsx` `useState(()=>readSettingsParam()...)` → `/?settings=api` 딥링크 시 하이드레이션 mismatch(`f4097e7` 유래). DotField 0-size canvas.
- **Brain 직접(2026-09-08) — 미사용 정리**: 🟢 커밋 `b97d79c`(미푸시). Astryx 전환 후 사표 의존성·죽은 코드 제거: `three`+`@types/three`(import 0), `@google/generative-ai`(→`@google/genai`로 대체됨), `CircularGallery.jsx/.css`·`ui/use-overlay-controller.ts`(참조 0), `next.config.ts`의 존재 안 하는 `vendor/astryx` 트레이싱 규칙, `page.tsx` 미사용 아이콘 import. `page.tsx` 딥링크 effect `setState`→`startTransition`(`f4097e7` 유래 lint error 해소). `(workspace)` 이동으로 깨진 테스트 3개 경로 갱신 → 16→18/20 통과. **남긴 것**(전환 미완이라 유지): `@/components/ui/*` 프리미티브·`/aide-ui` 쇼케이스·StudioView 프리뷰 그리드. **보류 플래그**: `src/lib/design-direction.ts`(런타임 미사용이나 테스트+G4 소유), `WaterHero.tsx`(import 0이나 병행 세션 편집 중), `jsrepo` devDep(reactbits 스캐폴딩 CLI). `lint` 0 err · `build` ✓.
- **Brain 직접(2026-09-08~09) — 앱 Astryx 정합성 완료(§2 C1)**: ✅ `acc767c`~`b57c672`·`b204088`(컴포넌트 전면 교체) · `7150edf`~`074ede2`(Gmail식 셸, 지면 `#f5f6fc`) · `02b57a4`~`2afddf4`·`e7689ee`(하드코딩 size 전량 제거 — 밀도가 제어) · `8d39fff`(홈 첨부/브랜드 패널 유리→솔리드). 손수 만든 버튼·입력·칩·카드·패널·배너는 Astryx로, 순수 레이아웃 div는 유지. **의도적 예외(그대로 둘 것)**: 프리뷰 그리드(AGENTS #6), 롤백 스위치(AGENTS #8), 로고/뒤로 내비, 드롭다운 메뉴 행, 색상 스와치, 아이콘 그리드 타일, "메인 구조" 질문 카드, 네이티브 `<input type=color>`, `EditField` 스크러버, `/aide-ui` 쇼케이스 specimen(사이즈 변형 시연), `generated/astryx-templates/*`(upstream). **미검증**: Studio Step3~4는 실 API 필요분만 클릭 확인 못 함. **잔여 칩**: `task_7abf68fd`(밀도 하이드레이션 mismatch).
- **Brain 직접(2026-09-09) — Playground 안정화(§2 C2)**: ✅ `9653afc`·`87ad6d2`·`2f0a931`·`74db3c9`·`2698040`(미푸시). ① 콘솔 크래시 2건: `DotField` 부모 0×0 마운트 시 offscreen 캔버스가 0-size라 `drawImage`가 매 프레임 throw → 가드+`ResizeObserver`; 전역 `LinkProvider`(next/link)가 href 없는 프리뷰 스펙(`TopNavItem`)을 받아 propType 크래시 → `AstryxComponentPreview`를 `LinkProvider component="a"`로 격리(`/aide-ui` 동일 경고도 해소). ② `match-template`가 모델 실패·키 없음·응답 불명확 시 토큰 겹침 결정론 fallback으로 200 반환(한글 브리프는 카탈로그가 영문뿐이라 0점 → `blank`). `playground-compose`에 frozen 템플릿 컨텍스트 전달. ③ 툴바: undo/redo 아이콘화, 콘텐츠 레이아웃 컨트롤 상단/우측 중복 제거, 그룹 구분선. ④ `window.confirm` 3곳 → Astryx `AlertDialog`(상시 마운트). fresh tab 콘솔 클린 확인. **1.1 판정**: 템플릿 내부 요소 편집은 `AstryxTemplateFrozen`이 생성 `.tsx`의 default export를 통째로 렌더하는 구조라 트리 변환기 없이는 불가(region 분해도 같은 기계 필요). 현행 verbatim 유지로 종료 — 필요해지면 고가치 템플릿 몇 개만 손수 `CanvasItem[]` 트리 작성이 현실적. frozen 블록 자체는 선택·삭제·초기화·순서변경·복제 모두 가능(기존 오해 정정).
- **개발 + Brain(2026-09-09) — 단계별 방법론 MD 런타임 연결(§2 C3)**: ✅ `6879102`(미푸시, Codex 구현 + Brain 리뷰 수정). `src/lib/generation-methods/*.md` 5개를 `generation-methodology.ts`가 정적 import로 로딩·검증하고 호출마다 한 단계만 주입. analysis→`analyzeAndGenerateQuestions`, composition→`buildArtDirectionLayer`, image→`generateHeroImage`, review→`reviewDesignScreenshot`, expansion→`expandToPrototype`. 새 호출·모델 교체·의존성 추가 없음. ID/버전/필수 섹션/문자 예산은 모듈 로드 시 검증(실패 시 빌드 깨짐), 방법론 텍스트는 `.next/server`에만(client 번들 없음). **Brain 리뷰 수정**: `buildQualityRules`의 무조건 3영역 강제 2줄이 composition MD와 모순이고 매 호출 전송되어 삭제 + 재유입 차단 assertion. **§2 C4 잔존 모순**: `variantStrategyRule` "세 방향" 분기, `## 이 시안의 조형 차별화 의무`, 웹 "12컬럼 그리드" — `variantStyle`이 설정되는 실제 3-병렬 생성마다 함께 전송됨. 유료 A/B 비교와 묶어 해소. **미실행**: 유료 Gemini 생성. 이번 검증 범위는 프롬프트 조립·출력 계약·빌드 회귀이며 시안 품질 개선은 아직 미검증.
- **Brain 직접(2026-09-10) — 조직 기억 그래프 PoC**: 🟢 미커밋. 영상의 `raw→conversation/output→wiki→장기 기억` 구조를 Aide `/memory`로 구현: 840개 결정론 샘플 노드·도메인 군집/활성화·검색·줌/팬·출처 상세·최대 12개 생성 기억 선택·Obsidian URI·Studio handoff. 실제 Vault 파서/동기화는 후속 어댑터. focused test·lint(0 errors, 기존 21 warnings)·build·브라우저 상호작용 통과; 전체 test 22/24, 기존 RED 2건만 잔존.



- **Brain 직접(2026-09-09) — Aide 테마화(§2 C6 S1)**: 🟡 `a048576`(미푸시). `src/theme/aide-theme.ts`가 `defineTheme`으로 저술한 정식 Astryx 테마. theme-neutral의 토큰표·components·icons를 **값으로 상속**하고 편차 7개만 선언(accent `#0064e0` 3종, 지면 `#f5f6fc`, `--radius-page` 1rem, `--font-family-body/heading` 한글 폴백). `npm run theme:build` → `src/theme/generated/aide.css|js`, `theme:check`가 stale 차단, `verify_aide_theme.mjs`가 편차 집합 고정(스프레드 제거 시 실패). `layout.tsx` `data-astryx-theme="aide"` + aide.css import, `AppChrome`이 `aideTheme` 제공, 브리지의 accent 패치 블록 제거(테마가 대체). **실측**: Astryx core 기본값 ≠ theme-neutral(11개 중 10개 상이, core는 푸른회색 #0a1317·px 반경) → core 상속은 전면 리스타일이라 금지. `color:{accent}` 설정은 중성색을 accent hue로 물들이고 accent를 대비 보정(#0064E0→#0058D2)하므로 미사용. 토큰 스프레드가 `typography`를 덮어 한글 폴백이 사라지는 함정 확인·회피. 브라우저(fresh tab, 콘솔 0): 홈·Playground·`/aide-ui` 정상, 크롬 토큰 현행과 동일, 프리즈 템플릿 내부는 neutral scope 유지(verbatim 보존). **남음**: S2 테마+CLI JSON → `aide.md` 토큰·레지스트리 생성기 · S3 `/aide-ui`를 Astryx로(→`ui/*` 50파일·Tailwind 158 제거) · S4 `aide-docs` specimen 204곳 · S5 StudioView 362 + `@import "tailwindcss"` 제거. **Tailwind 제거는 S3·S4 이후에만 물리적으로 가능.**

- **Brain 직접(2026-09-09) — C6 S2·S3(§2 C6, 이어서 할 일)**: 🟡 `a03e9c2`·`af21e3c`·`bc77359`·`5b0952c`·`adf7004`(미푸시). **S2**: `scripts/astryx-component-map.mjs`가 `component_registry` 70개를 MAPPED 51 / NO_COUNTERPART 19로 전부 분류. `verify_astryx_component_map.mjs`가 aide.md에서 id를 직접 파싱하고 Astryx 이름을 CLI 카탈로그(163개)로 대조 — 계약 변경·버전업이 이전이 아니라 테스트에서 실패한다. **S3 아키텍처(검증됨)**: `@/components/ui/*` **모듈 경계를 유지하고 내부 구현만 교체**하면 import 지점 107개를 안 건드린다. 어댑터가 기존 prop 형태를 Astryx 모델로 변환. **제약**: Astryx는 `className`을 안 받고 레이아웃 API가 `xstyle`(StyleX)인데 이 빌드엔 babel 플러그인이 없어 userland `stylex.create()`가 throw → props로 넘기고 바깥 여백만 래퍼가 갖는다. **완료 16/51**: progress·loading / anchor·carousel·avatar-group·select·number-field·textarea / accordion·slider·file-uploader·field-group / date-picker·time-picker·stepper·pagination·pagination-dots·responsive-grid·chip. **매핑 4건 교정**(구현하며 발견): `prose`→Markdown 불가(마크다운 *문자열* 렌더러 vs JSX children) → NO_COUNTERPART; `field-group`→InputGroup 아님(단일 입력 장식) → `FormLayout`+fieldset 조합; `chip`은 두 역할 → `Token`+`ToggleButton` 분기; `pagination-dots`는 `Pagination variant="dots"`로 커버 → MAPPED. **브라우저에서만 잡힌 회귀 1건**: Astryx `NumberInput`의 `hasNumberSteppers` 기본값 false라 −/+ 버튼 소실 → 명시적으로 켬. `ui/*` className **286 → 124**. **다음(호출부 수 순)**: navigation 7 · sheet 10 · tabs 11 · tooltip 12 · popover 13 · field 20 · segmented-control 24 · dialog 26 · list-row 44 · badge 47 · table 56 · card 161 · button 232, 그 다음 REBUILD 19개(사용자 결정: Astryx 프리미티브로 재구현), 마지막에 S4 aide-docs specimen 204곳 · S5 StudioView 362 + `@import "tailwindcss"` 제거. 배치마다 build→lint→test→브라우저(fresh tab, 콘솔 0) 후 커밋.

범례: 🟢 진행 중 · 🟡 대기 · 🔴 막힘 · ✅ 완료(다음 갱신 때 삭제)

## 5. 요청 · 차단 (경계를 넘는 일은 전부 여기로)

형식: `[요청자 → 소유자] 내용 (날짜)`

- [디자인 → 검증] 신규 P0 패턴 6개와 `ai.interaction_principles`가 `llms.txt` pattern index에 유지되는 focused contract test 추가 요청 (2026-08-28)
- ✅ [Brain → 디자인] `aide.md` ↔ `platform-baseline.ts` 불일치 — **해소**. ① breakpoints 768/1279/1280 정합(`38e0586`) + 미사용 `xs/sm/md/lg/xl` 5단 스케일 제거(`dda6fda`) ② `responsive.modes.medium.page-padding` 16→20 (platform-baseline tablet gutter 일치, `dda6fda`) ③ `component_tokens.button.radius` `10px` → `{radius.control}` alias(`38e0586`). `design:export`는 이 키들을 CSS로 방출 안 해서 generated diff 없음.

## 6. 공유 사실 — 재확인 없이 인용 가능

출처가 실측이고 날짜가 붙은 것만 올린다. 추정은 "추정"이라고 쓴다.

- (2026-08-27, `.aide-logs/violations.jsonl` 15건) structure-lint 위반은 13/15건이 0건. **아이콘 교정이 15/15건(100%)**, 70건 중 56%가 `circle`로 대체. 원인은 모델 환각이 아니라 화이트리스트가 좁았던 것 → 260개 → 3,914개로 교체 완료.
- (2026-08-27, `.aide-logs/gemini-usage.jsonl` 31건) `generateUI` 1회 = 입력 약 47,000 / 출력 약 12,500 토큰.
- (2026-08-27, ai.google.dev 공식) `gemini-3.7-flash` in $0.75 / out $3.75, `gemini-3.1-pro-preview` in $2.00 / out $12.00 (1M 토큰당). 실측 기준 1회 Flash ≈ $0.08, Pro ≈ $0.24.
- (2026-08-27, 코드 확인) `gemini.ts:3241-3300`(히어로 패턴 A~E)과 `gemini.ts:4141-4171`(C안 Editorial Hero)이 완성 HTML+인라인 CSS를 프롬프트에 박아두고 베끼게 한다. 입력·출력 토큰을 동시에 먹는 구조 → G3의 근거.
- (2026-08-28, `scratchpad/variantA.html` 실측 + `2174bf2` 수정) A/B/C 여백이 넓던 원인은 모델이 아니라 `buildDesignRhythmContract`. `pickSpacingToken` 폴백이 `dimension` 그룹 전체(control-* 48px, content-* 1440px 포함)를 풀에 섞어 page-padding=48px·section-gap=64px를 뽑고, `injectDesignContractStyle`이 `:root`에 주입해 모델의 16px를 덮어썼음. 수정 후(`e35b4a4` 포함) aide.md 기준 page-padding 16(모바일·태블릿)/24(PC ≥1200) · section-gap 24 · card-padding 16 · card-gap 12 · item-gap 8.
- (2026-08-28, `scratchpad/variantA.html` 실측) 타이포 스케일 미적용: aide.md `tokens.typography`(display-hero 56 … micro 11, 12단계)를 `parseFencedDesignContract`가 안 뽑고 주입도 안 함. 모델 출력 font-size 30곳 하드코딩, 11개 값(9·10·17·19·22px는 스케일 밖), 30개 중 11개가 10~11px. → P1, cleanup 2단계에서 tokens.yaml로 이관 시 주입.
- (2026-08-28, `scratchpad/variantA.html` 실측 + `243dca1`) 모델 `:root` 커스텀 프로퍼티 50개 중 45개가 주입값과 완전 중복(프롬프트 `gemini.ts:1585`가 재선언을 지시했음). 지시문을 "참조만" 으로 바꿈 → 출력 토큰 ~2KB 절감.
- (2026-08-31, 커밋 `ad2178b`~`d76ed50`+) **레이아웃 불변식은 `src/lib/platform-baseline.ts` 단일 원본.** 확정값: 좌우 거터 mobile 16 / tablet 20 / desktop 24, breakpoint 768·1280, 터치타깃 44, z-index 사다리, 칩·버튼·배지 줄바꿈 금지. `generateUI`/`expandToPrototype` 마지막 주입, DESIGN.md보다 우선. 회귀 방지 `test/verify_platform_baseline.mjs`.
- (2026-08-31) **모델 라우팅 전면 Flash.** A/B/C HTML·direction·refine·확장 = Flash 계열, 이미지 = `gemini-3.1-flash-image`(3D는 flash-lite-image). **예외: As-is 분석·문서 추출·DESIGN.md 분석만 `GEMINI_ANALYSIS_MODEL='gemini-3.1-pro-preview'`** (파이프라인 입력 품질, 1-shot 저볼륨). `GEMINI_DESIGN_MODEL_PRO_EXPERIMENT` 제거. `verify_model_routing.mjs`가 강제.
- (2026-08-31, `.aide-logs/violations.jsonl` 실측) 브리프에 "모바일"·"데이터"만 있어도 `detectServiceSubtype`가 telco로 오분류(현대백화점 VIP 브리프 → 요금제 UI). 정규식을 통신 특화어만 남기게 축소 → `membership-reward`로 정상. `verify_service_subtype.mjs`.
- (2026-08-31) 하단 앱바 제거는 브리프에 "하단 앱바/탭바 없음"이 있으면 As-is 분석과 무관하게 강제(`effectiveShellContract`), `injectShellContract` 제거기는 `<div>` 중첩까지 깊이 카운팅(`stripElementsByClass`). 3D 오브젝트 히어로는 `injectHeroObjectScale`이 중앙·크게 못박음.
- (2026-08-31) **랜딩 페이지 = `layout-archetypes.ts`의 `brand-landing`·`product-showcase` 아키타입.** `detectLandingIntent`(web + 키워드) true면 A/B/C가 랜딩 풀에서만 뽑히고 `sideNav`·`bottomNav` 강제 false. **자동 데스크 리서치**(`/api/desk-research`): LLM이 실제 레퍼런스 URL 지목 → 자체 puppeteer 캡처 → 세 시안 프롬프트에 참고 주입(스타일 복사 금지). 외부 API·ToS 의존 없음, 실패는 조용히 스킵.

## 7. 갱신 규칙

1. 세션 시작: 이 파일 → `git status` 순으로 읽는다.
2. 상태가 바뀌면 **4절 자기 줄**을 즉시 고친다. 끝나고 몰아서 쓰지 않는다.
3. 경계를 넘는 일은 직접 하지 말고 **5절**에 남긴다.
4. 새로 밝혀낸 실측은 **6절**에 날짜·출처와 함께 올린다. 검증 안 된 건 올리지 않는다.
5. 사이클이 끝나면 2절을 새로 쓰고, 6절에서 죽은 사실을 지운다.
