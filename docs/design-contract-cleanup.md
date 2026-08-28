# 디자인 계약 정리 계획

> 작성: Claude · 2026-08-28 · 상태: **착수 (0단계 진행 중)**
> 대상 독자: 이 작업을 이어받는 세션 (Claude/Codex 무관)
> 목적: 흩어지고 서로 덮어쓰는 디자인 계약을 **강제 계층별로 4분할**하고, 그 전에
> 여백/간격을 실제로 망치는 회귀 버그부터 잡는다.

관련 문서:
- `docs/handoff-abc-generation-quality.md` — A/B/C 생성 품질 스레드 상태. 유지하되,
  "여백/간격" 항목은 이 문서가 대체한다.
- `docs/design-system-upgrade-plan.md` — 토큰 3계층 + 컴포넌트 registry. Phase 1(토큰 3계층)은
  이 문서 **2단계**로 흡수, Phase 2/3는 그대로 남는다.
- `MISSION.md` G6 = 이 문서의 1~3단계 실행.

---

## 1. 지금 뭐가 꼬여 있나

1. **규칙이 성격별로 안 나뉘어 있다.** `aide.md` 한 파일에 (a) 컴파일되는 토큰,
   (b) 파싱되는 컴포넌트 계약, (c) LLM용 산문, (d) "하지 말 것" 목록이 5,559줄로 섞여 있다.
   각각 다른 코드가 읽어야 하는데 한 문자열로 뭉쳐 있어 `extractDesignMdForPrompt`가
   24,000자에서 자르고, `structure-lint`는 아무것도 안 읽는다.
2. **주입기가 잘못된 값을 계산해서 모델의 옳은 값을 덮어쓴다.** (아래 2절 — 확정 진단)
3. **레이아웃 규율에 결정론적 강제가 없다.** 계약에 그리드 규칙(Wanted Montage 기반:
   컬럼 2/3/12, gutter 20px, page-padding 20px)이 있지만 절반만 프롬프트로 가고,
   `structure-lint`에 그리드·간격 체크가 0개다.
4. **계획 문서가 3개로 겹친다.** 이 문서로 상태를 단일화한다.

---

## 2. 확정 진단 — 여백/간격이 망가지는 실제 경로

캡처본(`scratchpad/variantA.html`, 375px 모바일) 실측:

| 변수 | 모델이 쓴 값 | Aide 주입기가 덮어쓴 값 | 최종 실효 |
|---|---|---|---|
| `--aide-page-padding` | `16px` ✅ | `var(--spacing-control-prominent)` | **48px** |
| `--aide-section-gap` | `16px` ✅ | `var(--spacing-space-16)` | **64px** |

→ `.aide-page { padding: 64px 48px … }` → 좌우 합계 **96px**, 375px 화면에서 콘텐츠 폭 279px.
섹션 간격 64px. = 사용자가 본 "좌우 여백 엄청 넓다 / 간격 엉망".

`<style data-aide-contract="1">`(= `injectDesignContractStyle` 출력)이 모델 `<style>`보다
문서 뒤에 오고 같은 `:root` 특정도라서 **모델이 맞게 쓴 16px를 이긴다.**

### 원인: `buildDesignRhythmContract` (gemini.ts ~1436)

```
const pagePadding = layout['page-padding']        // undefined — aide.md는 page-padding을
    ?? spacing['page-padding']                    //   responsive.modes.*에 둠, 평면 layout:/spacing:에 없음
    ?? pickSpacingToken(spacing, ['lg','md','gutter','base'], 0.58)   // ← 여기로 떨어짐
```

`pickSpacingToken` (gemini.ts:1362):
- preferred 키 `lg/md/gutter/base` — aide.md 토큰명은 `space-N`, `control-*` → **하나도 안 맞음**
- 위치 폴백: **모든 px 토큰을 한 풀에 섞음** — `control-compact/default/touch/prominent`
  (32/40/44/48px, 터치 타깃), `content-*`(700/1120/1440px)까지 포함 — px순 정렬 후
  비율 0.58 → `control-prominent`(48px) 선택
- `sectionGap`도 동일: preferred `lg/xl/section` 전멸 → 비율 0.65 → `space-16`(64px) 선택

계약엔 정답이 있다 — `responsive.modes.*.page-padding` (2026-08-28 기준 compact/medium 16px,
wide 24px). 파생 로직이 안 읽을 뿐.

**0단계 완료(`2174bf2` + 후속):** 파생이 `responsive.modes`를 읽고, `buildAideContractStyle`이
`@media (min-width:1200px)`에서 `--aide-page-padding-web`(24px)로 좌우 여백을 올린다.
모바일·태블릿 16px, PC 24px.

---

## 3. 결정 — "강제 계층"으로 4분할 (must/must-not 축 아님)

타사 4곳 확인 결론: 아무도 must/must-not으로 안 나눈다.
- **W3C DTCG**: 주제별 파일 분리 안 함. primitive → semantic → component **3계층**.
- **Shopify Polaris**: `polaris-tokens`(데이터) + `stylelint-polaris`(린트) + 컴포넌트 = 별도 패키지.
  "하지 말 것"은 **기계 검증되는 린트 아티팩트**로만 분리.
- **v0 / Lovable**(유출 프롬프트): MUST/MUST-NOT을 주제별로 인라인. 전역 don'ts 문서 없음.
- **Google Stitch**(Gemini 기반 경쟁작): 디자인 시스템을 "적용"함 — 물어보지 않고 강제.

→ 나누는 축은 **"누가 어떻게 강제하는가"**. aide 코드가 이미 암묵적으로 하는 분할.

```
src/lib/design-systems/
  _base/
    guardrails.yaml   # 전 생성 공통. {id, rule, severity, lint} 플랫 리스트.
                      #  그리드 규율(4px 스텝, 컬럼 2/3/12, gutter 20px), 스크롤 아키텍처,
                      #  "가짜 UI 금지", 아이콘 규칙. → 프롬프트 어셈블러 + structure-lint 둘 다 읽음.
    layout.md         # 전 생성 공통 레이아웃 산문 (현재 buildQualityRules에 하드코딩된 것)
  aide/
    tokens.yaml       # aide 고유 값만: 팔레트, 타이포 스케일, radius, 컴포넌트 스타일.
                      #  DTCG 3계층. grid를 semantic 토큰으로 → --aide-grid-*로 주입 (서술 아님)
    contract.yaml     # 컴포넌트 anatomy/variants/states/responsive/archetypes (현 yaml에서 토큰만 뺀 것)
    guidance.md       # LLM 산문. 레이아웃 선택·위계·밀도·voice·Pattern Library. don't은 주제별 co-locate.
  ktds.md / notion.md / shopify.md / ibm.md   # 안 건드림. _base 규율은 자동 상속.
```

**범위 결정:** `aide.md`만 레퍼런스로 먼저 분해. 로더가 두 형태(단일 파일 / 디렉토리)를
지원하고, 나머지 4개는 같은 경로로 계속 동작(guardrails만 없음). 5개 동시 마이그레이션 금지.

---

## 4. 실행 순서 (단계 → 검증)

| # | 변경 | 상태 |
|---|---|---|
| **0** | 여백 파생 버그 — `buildDesignRhythmContract`가 `responsive.modes.*.page-padding`을 읽고, `pickSpacingToken` 폴백 풀에서 `control-*`/`content-*`/`icon-*`/`*-height` 제외 + 유계 상한 | ✅ `2174bf2` |
| **0b** | 좌우 마진 규칙 — 모바일·태블릿 16px / PC(≥1200) 24px. `buildAideContractStyle`에 `@media(min-width:1200px)` | ✅ `e35b4a4` |
| **P2** | 모델 `:root` 재선언 중단 — `gemini.ts:1585` 지시문을 "참조만"으로 | ✅ `243dca1` |
| **P1** | 타이포 스케일 주입 — `parseFencedDesignContract`가 `typography` 추출, `--aide-text-{role}-*` 주입 + baseline 규칙 + 프롬프트 가드 | ✅ `e37f1fe` |
| **4** | 결정론 정규화 — `patchCssTokens`에 off-grid gap→4px 스냅 + off-scale font-size→스케일 스냅, `stripButtonInlineOverrides` | ✅ `4e01a30` |
| **P3** | shadow 스케일 주입 — `--shadow-{role}` + `cardShadow` 폴백 + 프롬프트 가드 | ✅ `c9eef04` |
| **P4** | 콘텐츠 그룹을 `.aide-card`/`.aide-section`으로 — 주입 리듬 커버리지 12%→대부분, 정규화 부담 축소 | ✅ `e3e8a1c` |
| **1a** | `buildQualityRules` §1·§2 dedup — 토큰/:root 규칙을 Contract Rules로 일원화, P2와 모순되던 `:root{--color-primary}` 지시 삭제. 17362→16891자 | ✅ `7618c71` |
| **3** | `structure-lint` off-grid telemetry (`off-grid-rhythm`, minor) — `.aide-logs`에 기록만, 재생성 트리거 안 함 | ✅ `685a9a9` |
| 1b | `_base/guardrails.yaml` + `_base/layout.md` 신규 — aide.md 산문(`Do Not`/`Must Follow`/`Layout Contract`) 무손실 통합 + 로더 배선 | ⬜ 남음 (실 생성 게이트) |
| 2 | `aide/` 디렉토리로 aide.md 물리 분해 (tokens 3계층). grid를 semantic + `--aide-grid-*` 주입 | ⬜ 남음 (실 생성 게이트) |

**완료분(0·0b·P1·P2·P3·4·P4·1a·3)은 전부 정적 검증** — lint + build + `npm test` + 캡처본 대조.

**남은 1b·2만 미완.** 둘 다 무손실 이관 + aide.md(디자인 롤) 편집이고, 재직렬화/규칙누락이
정적 검증에 안 잡히므로 **다음 실 생성 1회와 묶어서** 한다. 그 실 생성이 (a) 8커밋 튜닝값
검증 + (b) 1b·2 착수 게이트를 동시에 처리.

---

## 5. 소유 / 병행 (MISSION.md §3)

| 파일 | 소유 롤 | 이 계획에서 |
|---|---|---|
| `src/lib/gemini.ts` (로더·주입·파생) | 개발 (= 현재 이 세션) | 0·1·2·4단계 직접 |
| `src/lib/design-systems/**` | 디자인 | 1·2단계 — 파일별 커밋, 사후 리뷰 |
| `src/lib/structure-lint.ts`, `test/**` | 검증 | 3단계 |

병행 세션이 `page.tsx`/`WaterHero.tsx`를 활발히 수정 중 (2026-08-28 확인). 내 대상 파일과
겹치지 않음. patch 직전 `git status` 재확인.

---

## 6. 다음 액션

0단계부터. `buildDesignRhythmContract` + `pickSpacingToken` 외과 수정 → 게이트 → 커밋.
