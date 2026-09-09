---
name: aide-gate
description: Run Aide's completion gate and report the result honestly. Use before claiming any TypeScript/UI change is done, before committing, and whenever asked to "verify", "check", "게이트", "완료 확인", or "빌드 돌려봐". Encodes the build-then-lint ordering, the pre-existing failures that must not be reported as new, and the generated-file check.
---

# Aide 완료 게이트

`AGENTS.md`의 Completion gate를 실제로 통과시키는 절차. 순서와 예외를 지키지 않으면
매번 같은 오탐을 보고하게 된다.

## 실행 순서 (이 순서를 지킬 것)

```bash
npm run build
```
```bash
npm run lint
```
```bash
npm test
```
```bash
git diff --check
```
```bash
git status --porcelain
```

**build와 lint를 한 명령으로 묶지 말 것.** `prebuild`가 Astryx 템플릿을 재생성하는 동안
임시 파일(`.astryx-templates-tmp` 등)이 생기고, 동시 실행하면 lint가 그걸 잡아 없는 에러를
만든다. build가 **끝난 뒤** lint를 따로 돌린다.

빌드 결과는 `✓ Compiled successfully` 줄로 확인한다. 출력이 길면:

```bash
npm run build 2>&1 | grep -E "Compiled successfully|Failed to compile|error TS|Type error" | head
```

## 기존 실패 — 새 실패로 보고하지 말 것

이 둘은 **오래된 기존 RED**다. 현재 `npm test`는 21개 중 19 통과가 정상 상태다.

| 테스트 | 원인 |
|---|---|
| `verify_sales_input_history` | `page.tsx` 키보드 안내 계약 불일치 |
| `verify_phase0_routes` | `router.push('/playground')` 소스 문자열 기대 vs 현행 Next Router 구현 |

- 이 둘이 실패하면 **그대로 두고 "기존 실패"로 분류해 보고**한다.
- 지금 하는 작업과 **섞어서 고치지 않는다** (MISSION §2 C5, 별도 이슈).
- 다른 테스트가 실패하면 그건 새 실패다. 즉시 원인을 찾는다.

`npm run lint`의 `<img>` 경고 21건도 기존이다. **0 errors**만 확인하고, 경고 개수가
늘지 않았는지만 본다. 경고를 새 문제로 보고하지 않는다.

## generated 파일 확인

`prebuild`가 `src/lib/design-systems/generated/*`를 매번 재생성한다. 게이트 후:

```bash
git status --porcelain | grep "generated/" || echo "generated clean"
```

여기에 diff가 뜨면 **직접 수정하지 말고** 왜 산출물이 달라졌는지부터 본다
(`AGENTS.md`: generated는 `npm run design:export` 산출물, 직접 수정 금지).

## 커밋 전

- `git status`로 **이번 작업과 무관한 변경이 섞이지 않았는지** 확인한다.
  다른 작업자·병행 세션의 미커밋 변경이 트리에 있을 수 있다.
- `git add`는 **경로를 명시**한다. `git add -A`로 남의 변경을 쓸어담지 않는다.
- `git push`는 **명시적 요청이 있을 때만**.

## 보고 형식

검증 결과는 사실만, 통과/실패를 섞지 않고 쓴다.

- `build` / `lint` / `test` 각각의 실제 결과 (숫자 포함)
- 기존 실패와 새 실패를 **분리해서** 명시
- 실행하지 않은 검증이 있으면 "실행 못 함"이라고 쓴다 (예: 유료 API가 필요한 경로)
- 브라우저로 확인한 것과 코드로만 확인한 것을 구분한다

검증하지 않은 것을 "완료"라고 말하지 않는다.
