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

> ✏️ **사용자 확인 필요** — 아래는 `docs/handoff-abc-generation-quality.md`에서 옮긴 초안이다. 확정되면 이 줄을 지운다.

**목표: A/B/C 시안 생성 품질을 실측 기반으로 끌어올린다.**

| # | 성공 기준 (검증 가능해야 함) | 담당 | 상태 |
|---|---|---|---|
| G1 | `npm run lint` + `npm run build` 통과 | 검증 | ⬜ 미실행 |
| G2 | A(Pro)/B·C(Flash) 실제 생성 비교 후 판단, 임시 실험 코드 회수 | 개발 | ⬜ 미실행 |
| G3 | 히어로 패턴 HTML을 프롬프트 → 결정론 후처리로 이관 | 개발 | ⬜ 착수 전 (선행: G2 실측) |
| G4 | direction 생성 품질 개선 (`design-direction.ts`) | 기획 | ⬜ 실측 데이터 없음 |
| G5 | contentSeed가 하드코딩 패딩에 의존하지 않게 | 기획 | ⬜ 미착수 |
| G6 | 토큰 3계층화 + 컴포넌트 registry 완전성 | 디자인 | ⏸ 보류 (`docs/design-system-upgrade-plan.md`, 선행조건 확인 필요) |

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
- **디자인**: 🟢 진행 — `docs/design-system-upgrade-plan.md`을 외부 시스템 조사 기반 갭맵으로 갱신하고 `aide.md`에 AI interaction 원칙 + P0 패턴 6개 추가. `design:lint` 0 errors, unified contract test 통과. 다음: pattern retrieval·문서 renderer 확인
- **아키텍처**: 🟢 감사 — 생성 파이프라인·IR·API·데이터 경계의 안전한 분할과 선행조건 조사
- **개발**: 🟢 진행 — `docs/design-contract-cleanup.md` 완료분(9커밋, 전부 정적 검증). 남음: 1b(_base/guardrails 신규 + aide.md 산문 통합)·2(aide.md 물리 분해)는 **다음 실 생성 1회와 묶어서**.
- **Brain 직접(2026-08-31)**: 🟢 platform-baseline·셸 강제·모델 라우팅·telco 수정·랜딩 아키타입·데스크 리서치 커밋 완료(`ad2178b`~`d76ed50`+). 6절 참고. 다음: 실제 FORMA/VIP 재생성으로 검증.
- **검증**: 🔴 RED — `verify_sales_input_history` 키보드 안내 계약 불일치(`page.tsx` 미변경, 이번 세션 밖). 그 외 신규 test 8종 + lint/build 통과.

범례: 🟢 진행 중 · 🟡 대기 · 🔴 막힘 · ✅ 완료(다음 갱신 때 삭제)

## 5. 요청 · 차단 (경계를 넘는 일은 전부 여기로)

형식: `[요청자 → 소유자] 내용 (날짜)`

- [디자인 → 검증] 신규 P0 패턴 6개와 `ai.interaction_principles`가 `llms.txt` pattern index에 유지되는 focused contract test 추가 요청 (2026-08-28)

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
