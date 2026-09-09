---
name: aide-handoff-review
description: Review another agent's uncommitted work in the Aide tree (Codex handoff, subagent report, parallel session) before integrating it. Use when asked to "이어서 진행", "Codex 작업 검토", "리뷰하고 이어가", or when git status shows someone else's uncommitted implementation. Encodes the read order, the verify-the-claims discipline, and the minimal-fix boundary.
---

# 인계 작업 리뷰 (Codex · 서브에이전트 · 병행 세션)

같은 트리에서 다른 작업자가 만든 미커밋 구현을 검토하고 통합할 때. 핵심 원칙:
**이미 만들어진 걸 다시 만들거나 덮어쓰지 않는다. 현재 working tree를 기준으로 검토한 뒤 이어간다.**

## 1. 읽는 순서

1. `AGENTS.md` — 규칙. 특히 Product invariants, High-risk files, Completion gate
2. `MISSION.md` — 상태판. §2 이번 사이클 목표, §3 역할·소유 파일, §4 상태 보드
3. `git status` + `git diff` + `git ls-files --others --exclude-standard` (untracked 구현이 핵심일 때가 많다)
4. 인계자가 남긴 `docs/*.md`
5. 구현 파일과 테스트

## 2. 주장 검증 — 이게 리뷰의 본체다

인계 문서와 태스크 설명이 **"했다"고 적은 것을 그대로 믿지 않는다.** 각 주장을 코드로 확인한다.

- "충돌 제거함" → 실제로 `grep`해서 남아 있는지 본다. 표현이 바뀐 채 남아 있는 경우가 흔하다.
- "테스트가 막는다" → 그 테스트의 assertion이 **실제 문자열**을 잡는지 본다.
  이미 없어진 문구만 검사하고 진짜 잔존물은 놓치는 assertion이 자주 나온다.
- "한 번만 주입된다" → 조립된 결과물을 직접 만들어 세어본다.

프롬프트·런타임 조립처럼 정적 grep으로 부족하면 **오프라인 harness로 실제 조립 결과를 덤프**한다.
`test/verify_generation_methodology.mjs`가 그 패턴(TypeScript를 메모리에서 transpile,
`@google/genai` 경계를 가짜로 대체, 네트워크·파일쓰기 차단)의 참고 구현이다. 유료 호출 금지.

## 3. 결함을 찾았을 때

1. **파일과 라인 근거를 먼저 제시**한다 (`file.ts:123`)
2. **요청 범위 안에서 최소 수정.** 인접 코드를 "개선"하지 않는다
3. 관련 **focused test 추가** — 같은 결함이 다시 들어오면 실패하도록
4. `aide-gate` 스킬로 게이트 실행
5. `git status`로 다른 작업자 변경이 섞이지 않았는지 재확인

**고치지 말고 보고만 할 것:**
- 다른 role 소유 파일 (MISSION §3) — Brain 배정 없이 편집 금지
- 문구 재작성이 LLM 출력 품질에 영향을 주는 프롬프트 블록 — 유료 A/B 비교 전에는 판단 불가
- 기존 RED 테스트 — 이번 변경과 섞지 않는다
- 무관한 죽은 코드 — 말만 하고 지우지 않는다

## 4. 통합 커밋

- 인계자 구현 + 내 리뷰 수정을 **하나의 커밋**으로 통합하되, 커밋 메시지에
  **누가 무엇을 했는지 분리해서** 쓴다 (`Codex 구현 + Brain 리뷰 수정`)
- 인계자가 트리에 남긴 `MISSION.md` 상태줄이 있으면 확인한다.
  무심코 다른 커밋에 딸려 들어가기 쉽다
- 커밋·push는 **사용자 승인 후에만**

## 5. 보고 형식

1. 인계 구현에서 확인한 문제와 수정 내용 (file:line 근거)
2. 실제 런타임 연결 상태 — 무엇이 어디에 붙었는지 검증된 사실만
3. 실행한 검증과 정확한 결과 (숫자)
4. 기존 실패와 새 실패 구분
5. 남은 위험 — 특히 **아직 측정하지 않은 것**
6. 다음 단계 추천

품질이 좋아졌다고 단정하지 않는다. 정적 검증의 범위는
"프롬프트 조립·출력 계약·빌드 회귀"까지이며 실제 산출물 품질이 아니다.
