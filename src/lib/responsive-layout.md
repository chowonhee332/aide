# 반응형 레이아웃 공통 원칙

어떤 디자인 시스템이든 공통으로 지켜야 하는 반응형 레이아웃 원칙.

## 핵심 원칙

- **CSS @media 쿼리 필수**: 이 HTML은 너비가 실시간으로 변하는 iframe에서 렌더링됩니다. `@media` 없이는 반응형이 동작하지 않습니다.
- **3단계 구조**: Mobile / Tablet / Desktop 3단계 레이아웃 전환
- **내비게이션 3종 세트**: Mobile용 / Tablet용 / Desktop용 내비게이션을 HTML에 모두 포함하고 `@media`로 전환
- **그리드 반응형**: 열 수가 브레이크포인트에 따라 자동 전환

## 브레이크포인트 및 시스템별 설정

브레이크포인트 숫자, 내비게이션 패턴, 패딩, 그리드 열 수는 각 디자인 시스템의 `responsive` 섹션을 따른다.

`responsive` 섹션이 없으면 AI가 서비스 성격(B2C/B2B, 대상 디바이스)에 맞는 업계 표준 값을 자율 판단한다.

## 디자인 시스템별 오버라이드

각 디자인 시스템 파일(`design-systems/*.md`)의 `responsive:` YAML 키 또는 `## responsive` 섹션에서 다음을 정의한다:

```yaml
responsive:
  breakpoints:
    mobile: "< [숫자]px"
    tablet: "[숫자]–[숫자]px"
    desktop: "≥ [숫자]px"
  navigation:
    mobile: "[mobile 내비게이션 패턴]"
    tablet: "[tablet 내비게이션 패턴]"
    desktop: "[desktop 내비게이션 패턴]"
  padding:
    mobile: "[숫자]px"
    tablet: "[숫자]px"
    desktop: "[숫자]px"
  grid:
    mobile: "[n]열"
    tablet: "[n]열"
    desktop: "[n]열, max-width:[숫자]px"
```
