@AGENTS.md

# Aide — AI UI 디자인 시안 생성 플랫폼

기획서(brief) → A/B/C 디자인 시안 3종 → 사용자 선택 → 멀티스크린 프로토타입 확장.
디자인 시스템(DESIGN.md) 기반으로 생성하며, 기본값은 `src/lib/design-systems/aide.md`.

## 파이프라인 (순서 고정)

```
brief → analyzeAndGenerateQuestions (ServiceAnalysis: coreObjects/keyDataPoints/IA/contentSeed/heroVisual)
      → buildDesignIntelligencePlan (아키타입 배정 + UIStructureIR — 결정론, LLM 아님)
      → generateUI ×3 병렬 (draft, 스트리밍) → 결정론 주입 → 이미지 해석
      → [사용자 선택] → expandToPrototype (홈 바이트 보존 + 공통 UI 주입, LLM은 서브화면 콘텐츠만)
```

## 핵심 파일

- `src/lib/gemini.ts` (~5,000줄) — LLM 파이프라인 전체. ⚠️ 외과적 수정만
- `src/components/StudioView.tsx` (~4,500줄) — 스튜디오 UI 전체. ⚠️ 외과적 수정만
- `src/lib/layout-archetypes.ts` — 아키타입 16종 + UIStructureIR 빌더 (구성 다양성의 원천)
- `src/lib/design-intelligence.ts` — generationPlan 조립 (규칙 기반)
- `src/lib/structure-lint.ts` — IR 계약 검증 + Material Symbols 자동 교정 + 위반 로그
- `src/app/globals.css` — `--aide-*` 토큰. 앱 자체 UI는 이 토큰만 사용 (aide.md와 동기)

## 품질 3층 모델 (핵심 철학 — 위반 금지)

1. **1층 결정론**: 셸/스크롤/로고/아이콘/프로토타입 조립은 코드가 주입. LLM에 맡기지 않는다
2. **2층 사전 계약**: 구조는 UIStructureIR, 콘텐츠는 contentSeed가 생성 전에 결정
3. **3층 안전망**: structure-lint — severe 위반만 핀포인트 수정 1회. 재생성 루프 금지

**같은 이슈가 반복 검출되면 3층에 두지 말고 1·2층으로 승격하고 lint에서 제거한다 (졸업 사이클).**
위반 데이터: `.aide-logs/violations.jsonl` (gitignored, 반복 패턴 분석용).

**디자인 보존 불변식**: 사용자가 고른 시안 HTML을 LLM이 다시 생성/수정하게 하지 말 것.
expandToPrototype의 결정론 조립(stripScreenHomeDiv/splitShellContent)을 우회하는 변경 금지.

## 검증 (작업 완료 조건)

```bash
npx tsc --noEmit        # .ts 수정 후 필수, 에러 0
npx eslint <변경 파일>   # 에러 0 (경고는 기존분 허용)
```

- 결정론 모듈(lint/조립/이미지 처리)을 만들면 스모크 테스트(`npx tsx -e`)로 실동작 확인
- BiRefNet 모델은 `.model-cache/`에 런타임 다운로드 (224MB, gitignored)

## 행동 수칙

1. **가정 금지** — 모호하면 해석을 제시하고 묻는다. 조용히 하나 골라 질주하지 않는다
2. **최소 변경** — 요청 밖 기능·추상화·"유연성" 추가 금지. 200줄이 50줄로 되면 다시 쓴다
3. **외과적 수정** — 변경한 모든 줄이 요청에 직결돼야 한다. 옆 코드·주석 "개선" 금지 (특히 gemini.ts, StudioView.tsx)
4. **검증 가능한 완료** — 시작 전 성공 기준 정의, tsc/eslint 통과까지가 완료

## 금지·주의

- `git push`는 명시 요청 시에만 (자동 push 금지)
- 생성 프롬프트에 CRITICAL/최우선 남발 금지 — 이미 과잉, 추가 시 기존 것 정리부터
- `#ff385c`는 생성 시안용 기본 브랜드 컬러 (앱 UI 색 아님 — aide 토큰으로 바꾸지 말 것)
- 정규식 키워드 매핑(KO_TO_EN_MAP 등)은 폴백 전용 — 신규 로직은 ServiceAnalysis(AI) 우선
