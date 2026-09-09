# Gemini 단계별 디자인 방법론 — 1차 런타임 연결

## 변경 경계

이 문서는 구현된 범위와 아직 검증하지 않은 품질 실험을 구분한다.
Codex/Claude의 스킬 실행기를 Aide에 설치한 것이 아니다. 저장소의 짧은 MD 지침을
기존 Gemini 호출에 넣는 방식이며 새 의존성·모델 호출·도구 권한을 추가하지 않는다.

- 방법론 원본: `src/lib/generation-methods/*.md`
- 명시적 로더/검증: `src/lib/generation-methodology.ts`
- 디자인 원본: 기존 `aide.md` 또는 고객 DESIGN.md. 이 문서/방법론에 토큰을 복제하지 않는다.
- 엔진·모델 라우팅·셸 조립·컴포넌트 레지스트리·Studio UI는 유지한다.

## 실제 연결

| 단계 | 기존 호출 지점 | 입력/출력 | 실행과 실패 처리 |
|---|---|---|---|
| analysis | `analyzeAndGenerateQuestions` | 브리프/문서/계약 → 기존 Questionnaire JSON | 기존 모델·정규화·실패 처리 유지 |
| composition | `generateUI`의 `buildArtDirectionLayer` | 확정 구조/공유 콘텐츠/계약 → 기존 HTML 응답 | 기존 후처리와 structure-lint 유지 |
| image | `generateHeroImage` | 소재/배경 모드/참고 이미지 → Gemini IMAGE | 기존 모델 폴백·후처리·실패 시 null 유지 |
| review | `reviewDesignScreenshot` | 스크린샷/방향/DOM 클래스 → 기존 리뷰 JSON | 기존 CSS 제한·오류 시 패치 없음 유지 |
| expansion | `expandToPrototype` | 선택 HTML/화면 목적/계약 → 기존 확장 응답 | 메인 HTML 보존·이미지 토큰 복원·셸 조립 유지 |

구조 후보 작성은 현재 분석 단계의 `authoredStructures`에 포함된다.
별도 `design-direction.ts` 생성기를 새로 연결하거나 호출하지 않았다.
이미지 입력으로 텍스트를 만드는 `generateProWithImage`와 실제 이미지 생성은 다른 역할이다.

## 로딩·버전·예산

- 기존 webpack MD asset/source import를 이용한다. 배포 서버의 cwd나 로컬 스킬 설치에 의존하지 않는다.
- 호출마다 필요한 한 단계만 프롬프트에 포함한다. 서버 모듈이 MD 다섯 개를 보관하는 것과 모델에 모두 전송하는 것은 다르다.
- 헤더의 `aide-methodology: <stage>@<version>`이 프롬프트의 버전 마커로 전달된다.
- 의미 있는 방법론 변경 시 버전을 올리고 fixture 결과와 테스트 기대치를 함께 검토한다.
- ID/양의 정수 버전/Input/Method/Output/Guardrails/길이를 검증한다. 잘못된 파일은 조용히 생략하거나 잘라내지 않고 모듈 로딩에서 실패한다. 파일 누락은 빌드 오류다.
- 단계별 문자 상한: analysis 1800, composition 1700, image 1000, review 1100, expansion 900.
- 합산 문자 상한 5000은 focused test가 검사한다. 실제 Gemini 토큰 수·비용으로 환산한 값이 아니다.
- 기존 prompt-budget 검사도 외부 composition MD 크기를 포함한다.

## 교체한 중복·충돌

해소 완료:

- 분석의 카테고리/키워드만으로 자동 3D 생성시키는 지침 → 명시 요청·금지·과업을 기준으로 판단.
- 구성의 일반 품질 요약 블록(`## 🎨 시각적 완성도 기준`) → 같은 역할의 composition MD에 통합.
- 리뷰의 익숙한 카드 구도 자체를 결함으로 보는 기준 → 관찰 가능한 문제와 근거 중심.
- `buildQualityRules`의 무조건 3영역 강제 2줄 삭제 — composition MD의 "영역 수와 열 수는
  선택한 구조를 따른다"와 정면으로 모순됐고, 파라미터와 무관하게 매 호출에 실렸다.
  `verify_generation_methodology.mjs`가 재유입을 막는다.

**아직 남은 모순 (Brain 리뷰 확인, 후속 과제):** `gemini.ts`에 골격 차별화 지침이
남아 `variantStyle`이 설정되는 실제 3-병렬 생성마다 composition MD와 함께 전송된다.

- `variantStrategyRule` "세 방향" 분기 — "section order, card type, CTA 위치…서로 달라야 한다".
- `## 이 시안의 조형 차별화 의무` — "실제 레이아웃 골격이 달라야 합니다", "같은 순서 반복 금지".
- 웹 레이아웃 규칙의 "12컬럼 그리드 (gutter 24px)".

이들은 정당한 variant 차별화·웹 가이드와 얽혀 있어 문구 재작성이 생성 출력에 영향을 준다.
유료 A/B 비교와 묶어 `mainOnly` 분기의 해소된 문구로 통합해야 한다.

기존 프롬프트 전체를 정리한 것은 아니다. 분석의 최소 콘텐츠 수량,
`design-intelligence.ts`의 콘텐츠 패딩 및 시안별 미디어 정책은 그대로다.
따라서 이미지 금지·콘텐츠 정합성이 전체 흐름에서 완전히 보장됐다고 주장하지 않는다.

## 스킬과 도구의 경계

이 MD는 Aide의 기존 요구사항에 맞춰 작성한 방법론이다. 외부 SKILL.md 전문이나
스크립트를 복제하지 않았으며, 새로운 외부 실행 코드를 내려받지 않는다.
`design-system`에서 참고한 원칙은 디자인 계약 단일 원본과 방법론/토큰 분리다.
공식 frontend-design에서 검토했던 설계→브리프 대조→구현→관찰의 접근도 기존 흐름 안에서만 사용한다.

- MD: 판단 기준과 출력 책임.
- 코드: API 호출, 캡처, 출력 파싱, 셸 조립, 보존, CSS 제한.
- 스크린샷: 해당 화면의 시각적 근거. 키보드/전체 반응형/접근성 통과의 증거가 아니다.

## 검증

`node test/verify_generation_methodology.mjs`는 TypeScript와 MD를 메모리에서 로딩해
실제 다섯 호출 지점의 프롬프트를 검사한다. Google SDK 경계는 가짜 구현으로 대체하며
네트워크 호출·파일 쓰기·재시도 대기는 차단한다. 외부 모델 결과의 디자인 품질 검증은 아니다.

- 한 호출에 해당 단계만 포함되는지, 이미지 출력 모드가 유지되는지 확인.
- 잘못된 ID/버전/필수 섹션/예산 초과·알 수 없는 단계는 실패하는지 확인.
- 분석 응답 스키마와 선택 HTML 전달이 유지되는지 확인.
- 리뷰의 클래스 제한 지침과 패치 없는 결과의 HTML 보존을 확인.
- 전체 `npm test`, `npm run lint`, `npm run build` 결과는 작업 완료 보고에서 별도 기록.

2026-09-09 검증 결과: 신규 focused test 통과(5개 단계의 요청 조립, 이미지 scene/
scene-card-cover/transparent 및 참고 이미지 전달), 방법론 합계 3466자.
production build 통과, lint 0 errors/기존 21 warnings. 전체 테스트 19/21 통과:
`verify_sales_input_history` 키보드 안내와 `verify_phase0_routes` router 검사는
변경 전에도 실패한 동일 2건이다. 새 실패는 없다. 빌드의 임시 Astryx 파일이
lint에 잡히는 동시 실행 간섭을 피하기 위해 최종 lint는 빌드 완료 후 별도로 실행했다.

## 아직 실행하지 않은 것

- 유료 Gemini 생성과 시안 품질/실제 토큰·지연·비용 측정.
- Studio의 `draft`/`criticalReview: false` 기본값 변경. 기존 조건을 만족한 리뷰 호출에만 review MD가 적용된다.
- 새 자동 보정 루프, Node Graph 전환, 와이어프레임 렌더러 변경.
- 콘텐츠 패딩 제거, 생성 모델 응답의 전체 스키마 강화.

## 다음 품질 실험과 롤백

사전 승인 후 대표 브리프 6개(업무 대시보드, 모바일 커머스, 콘텐츠 탐색,
단계형 신청, 브랜드 랜딩, 이미지 없는 데이터 화면)의 기존/변경 결과를 비교한다.
브리프·콘텐츠·구조·모델·디자인 계약·뷰포트를 고정하고 실제 전송 프롬프트의
버전, 토큰 사용량, 소요 시간, 실패/보정 횟수를 기록한다. 입력 길이 제한은
이 기록을 대체하지 않는다. 처음에는 호출 수를 늘리지 않는다.

성공 기준 제안: 필수 콘텐츠/구조 위반 신규 발생 없음, 선택 HTML 보존,
블라인드 비교에서 가독성·브리프 적합성·시각 완성도 개선. 반복 횟수와
선호도 임계치·비용 상한은 유료 실행 전에 확정한다. 단일 출력만으로 우월성을 단정하지 않는다.

회귀 시 이 변경 묶음(MD/로더/호출 연결/테스트)을 함께 이전 버전으로 되돌린다.
일부 MD만 삭제하는 롤백은 금지한다. 이번에는 새 엔진이나 영속 데이터 형식을 추가하지 않아 데이터 마이그레이션은 없다.
