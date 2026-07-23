---
version: test-astryx-inspired-2026-07-08
name: KTDS Agent-Ready Test
description: "KTDS single-file design.md experiment. Goal: one uploaded/selected md file should make Aide generate consistent KTDS-style UI, support Playground components, and provide AI-dense rules without splitting into many source files. Inspired by Astryx's component docs, CLI dense context, templates, and agent-ready conventions, but kept as one Markdown file for Aide."

colors:
  primary: "#1a75ff"
  primary-text: "#186ae8"
  primary-fill-neutral: "#F2F5F9"
  surface: "#ffffff"
  surface-alt: "#f7f7f8"
  text: "#171719"
  text-neutral: "#474a4f"
  text-alternative: "#9a9ba0"
  border: "#c5c6c9"
  border-alt: "#dcdde0"
  fill-neutral: "#dfe0e2"
  fill-alt: "#e9eaeb"
  positive: "#00c244"
  caution: "#ff9200"
  negative: "#ff4242"
  info: "#0066ff"
  on-primary: "#ffffff"

colorRoles:
  brand: ["primary", "primary-text"]
  surface: ["primary-fill-neutral", "surface", "surface-alt", "fill-neutral", "fill-alt"]
  text: ["text", "text-neutral", "text-alternative"]
  border: ["border", "border-alt"]
  statusOnly: ["positive", "caution", "negative", "info"]
  rule: "Only brand colors may appear in style guide brand palette. statusOnly colors must be shown only under status/feedback examples and must never be labeled Secondary, Tertiary, or Accent."

typography:
  display-lg: { fontFamily: Pretendard, fontSize: 32px, fontWeight: "700", lineHeight: 1.25 }
  headline-lg: { fontFamily: Pretendard, fontSize: 24px, fontWeight: "700", lineHeight: 1.33 }
  title-lg: { fontFamily: Pretendard, fontSize: 20px, fontWeight: "600", lineHeight: 1.4 }
  title-md: { fontFamily: Pretendard, fontSize: 18px, fontWeight: "600", lineHeight: 1.44 }
  body-lg: { fontFamily: Pretendard, fontSize: 16px, fontWeight: "400", lineHeight: 1.5 }
  body-md: { fontFamily: Pretendard, fontSize: 14px, fontWeight: "400", lineHeight: 1.5 }
  label-lg: { fontFamily: Pretendard, fontSize: 14px, fontWeight: "600", lineHeight: 1.5 }
  button-md: { fontFamily: Pretendard, fontSize: 14px, fontWeight: "600", lineHeight: 1.5 }
  caption-lg: { fontFamily: Pretendard, fontSize: 12px, fontWeight: "400", lineHeight: 1.4 }
  caption-sm: { fontFamily: Pretendard, fontSize: 11px, fontWeight: "400", lineHeight: 1.36 }

rounded:
  none: 0px
  xs: 2px
  sm: 4px
  base: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 20px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  base: 16px
  md: 20px
  lg: 24px
  xl: 32px
  2xl: 40px
  3xl: 48px
  section: 64px

layout:
  page-padding: 16px
  page-padding-web: 24px
  desktop-padding: 40px
  section-gap: 24px
  card-padding: 20px
  card-gap: 16px
  item-gap: 8px
  header-height: 56px
  tabbar-height: 72px
  nav-side-width: 240px

designSemantics:
  productIntent: "What user job this screen solves"
  platform: "mobile | tablet | desktop | responsive"
  density: "compact | comfortable | spacious"
  hierarchy: "primary task > supporting info > secondary actions"
  interactionMode: "drag-compose | prompt-generate | iterative-refine"
  outputMode: "editable-html | component-tree | figma-ready"
  contentPolicy: "preserve uploaded PRD/IA/HTML text and change layout only"

components:
  button-primary:
    storybook: "Components/Button"
    category: action
    anatomy: ["label(required)", "leading icon(optional)", "trailing icon(optional)", "loading(optional)"]
    variants: ["primary","secondary","outline","ghost","negative","normal"]
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
    playgroundDefault: { label: "확인", variant: "primary", fullWidth: "true" }
  button-outline:
    storybook: "Components/Button"
    category: action
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    border: "1px solid {colors.border}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 24px
  input-default:
    storybook: "Components/Input"
    category: input
    anatomy: ["label(required)", "field(required)", "placeholder(optional)", "helper/error(optional)", "slot(optional)"]
    variants: ["outlined","filled","clearable","reveal","with slot","invalid","disabled"]
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 32px
    border: "1px solid {colors.border}"
    playgroundDefault: { label: "레이블", placeholder: "입력하세요", required: "false" }
  select-default:
    storybook: "Components/Select"
    category: input
    anatomy: ["label(required)", "trigger(required)", "option list(required)", "helper/error(optional)"]
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 32px
    border: "1px solid {colors.border}"
  card-default:
    storybook: "Components/Card"
    category: content
    anatomy: ["surface(required)", "title(optional)", "body(required)", "metadata(optional)", "action(optional)"]
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
    border: "none"
    shadow: "0px 5px 10px rgba(0,0,0,0.05)"
    playgroundDefault: { title: "카드 제목", body: "카드 내용을 입력하세요." }
  bottom-sheet-default:
    storybook: "Components/Bottom Sheet"
    category: overlay
    anatomy: ["dimmer(required)", "sheet surface(required)", "drag handle(required)", "title(required)", "close button(optional)", "content slot(required)", "actions(optional)"]
    variants: ["Default","With Controls"]
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: 16px 24px
    canvasBehavior: fixed-bottom-overlay
    playgroundDefault: { title: "Title", subtitle: "Sub-title_text", primaryLabel: "Primary", secondaryLabel: "Cancel" }
  nav-bottom-default:
    storybook: "Components/Navigation: Bottom"
    category: navigation
    anatomy: ["3-5 items(required)", "icon(required)", "label(required)", "badge(optional)", "active state(required)"]
    backgroundColor: "{colors.surface}"
    borderTop: "1px solid {colors.border-alt}"
    height: 72px
  nav-side-default:
    storybook: "Components/Navigation: Side"
    category: navigation
    anatomy: ["brand(optional)", "menu tree(required)", "active item(required)", "icon(optional)"]
    backgroundColor: "{colors.surface}"
    width: 240px
  tablist-default:
    storybook: "Components/TabList"
    category: navigation
    variants: ["Default","Box Variant","Small Box Variant","Text Variant","Small Text Variant"]
    height: 48px
    activeColor: "{colors.primary}"
  table-default:
    storybook: "Components/Table"
    category: data
    anatomy: ["header(required)", "rows(required)", "cell(required)", "selection(optional)", "scroll container(optional)"]
    headerBackground: "{colors.surface-alt}"
    rowBackground: "{colors.surface}"
    typography: "{typography.body-md}"
    rowHeight: 48px
  badge-default:
    storybook: "Components/Badge"
    category: status
    variants: ["filled","tint","outlined","ghost","round","with icon"]
    rounded: "{rounded.full}"
    typography: "{typography.caption-lg}"
  tag-default:
    storybook: "Components/Tag"
    category: status
    rounded: "{rounded.sm}"
    typography: "{typography.caption-lg}"
  toast-default:
    storybook: "Components/Toast"
    category: feedback
    variants: ["Default","Primary Variant","With Icon","Long Message"]
    position: "bottom center"
    duration: "3-5s"
  empty-default:
    storybook: "Components/Empty"
    category: feedback
    variants: ["Default","Empty Text","Empty Icon Text","Empty Data"]
    anatomy: ["icon(optional)", "title(required)", "description(optional)", "action(optional)"]
  chart-default:
    storybook: "Components/Chart"
    category: data
    supportedTypes: ["bar","line","doughnut","pie","mix"]
    requiresPackage: "chart.js"
  fileuploader-default:
    storybook: "Components/FileUploader"
    category: input
    variants: ["Default","Button File Uploader","Max Files And Size","With Error Message"]
  ex-list-page:
    description: "목록 페이지 — ContentTitle + filter row + Table/List/Card grid + Pagination"
    recommendedComponents: ["content-title","input-default","select-default","button-outline","table-default","pagination"]
  ex-form-page:
    description: "폼 페이지 — label + input/select/date/file uploader stack + primary CTA"
    recommendedComponents: ["input-default","select-default","fileuploader-default","button-primary","toast-default"]
  ex-dashboard:
    description: "대시보드 — NavSide + stat cards + chart + table"
    recommendedComponents: ["nav-side-default","card-default","chart-default","table-default"]
  ex-mobile-flow:
    description: "모바일 업무 플로우 — NavBottom + content stack + sticky CTA + optional BottomSheet"
    recommendedComponents: ["nav-bottom-default","card-default","button-primary","bottom-sheet-default"]
---

# KTDS Agent-Ready Test Design.md

이 파일은 `ktds.md` 원본을 대체하지 않는 실험 파일이다. 목표는 Aide가 이 단일 파일만 읽고도 KTDS 스타일을 일관되게 생성하고, Playground 컴포넌트 구성까지 예측 가능하게 만드는 것이다.

## 0. Agent Contract

이 섹션은 AI가 가장 먼저 따라야 하는 실행 계약이다.

1. 이 파일은 단일 source of truth다. 다른 디자인 시스템의 색상, radius, typography, component convention을 섞지 않는다.
2. KTDS는 명확성, 신뢰감, 효율성을 우선하는 엔터프라이즈 UI다.
3. 페이지 배경은 항상 `primary-fill-neutral(#F2F5F9)`이고, 카드/모달/시트/입력 표면은 `surface(#ffffff)`다.
4. Primary Blue `#1a75ff`는 CTA, 활성 상태, 링크, 포커스, 핵심 상태 강조에만 쓴다. 장식용 대면적 배경으로 쓰지 않는다.
5. 일반 Button, Input, Select, Card interaction radius는 8px 기반이다. Badge, Chip, Avatar, FAB만 full radius 예외다.
6. 일반 Button은 48px 높이를 유지한다. Input/Select는 default 32px, small 24px, large 40px이다.
7. 같은 컴포넌트 타입은 같은 padding, gap, radius, border/shadow 정책을 유지한다.
8. A/B/C 시안은 레이아웃과 정보 위계만 달라야 한다. 텍스트, 메뉴, 버튼명, 콘텐츠 의미는 업로드된 기획/화면설계 원문을 보존한다.
9. 디자인 시스템 제공자명 `KTDS`, `kt ds`를 서비스 브랜드명처럼 쓰지 않는다.
10. HTML/CSS 생성 시 색상은 `var(--color-*)`, spacing은 `var(--spacing-*)`, radius는 `var(--rounded-*)` 변수로 선언하고 재사용한다.
11. 출력 모드는 둘 중 하나다. `style-guide-preview`는 스타일 가이드 보드와 화면 예시를 함께 보여줄 수 있고, `production-screen`은 최종 사용자 화면만 보여준다.
12. Brand name, navigation label, page title, content copy는 입력 원문을 따른다. `Authority Portal`, `Admin Dashboard`, `Global Platform` 같은 임의 브랜드/서비스명을 만들지 않는다.
13. Typography는 Pretendard만 사용한다. Hanken Grotesk, Inter, serif display 같은 다른 폰트를 쓰지 않는다.
14. KTDS brand palette는 primary blue와 cool neutral 중심이다. `positive`, `caution`, `negative`, `info`는 statusOnly 색상이며 브랜드 Secondary/Tertiary/Accent 팔레트로 표시하지 않는다.

## 1. Source Of Truth

- 기준 시스템: DSCore Storybook
- 기준 URL: `https://dscore-ui.ktds.co.kr/`
- 테스트 확인일: 2026-07-08
- 사용 가능한 컴포넌트는 Storybook `stable` 문서와 `components:` registry를 우선한다.
- 컴포넌트명만 참고하지 않는다. Storybook의 실제 import code, story args, props, `docs.source.originalSource`를 canonical source로 삼는다.
- Storybook `index.json`의 `componentPath`, `importPath`, story id, tags를 컴포넌트 레지스트리의 1차 metadata로 사용한다.
- Storybook bundle에 포함된 `originalSource`가 있으면 AI 생성/Playground preset은 그 코드 구조를 먼저 따른다.
- Storybook에 없는 `Combobox`, `Popover`, `Progress`는 기본 Playground 팔레트에 넣지 않는다. 기존 시안 호환 fallback으로만 쓴다.

## 2. Why This Structure

최신 agent-ready 디자인시스템은 사람이 읽는 산문만으로는 부족하다. 한 파일 안에서도 다음 계층이 분리되어야 한다.

- `frontmatter tokens`: Aide가 파싱해 contract로 컴파일하는 핵심 값
- `component registry`: 컴포넌트명, 카테고리, variants, anatomy, props, defaults
- `agent contract`: AI가 반드시 따르는 규칙
- `dense component specs`: 컴포넌트별 짧고 반복 가능한 구조
- `templates`: 빈 화면에서 시작하지 않도록 하는 화면 조립 패턴
- `validation checklist`: 생성 후 자체 검수 기준

이 구조는 Astryx의 component docs, dense docs, CLI/JSON API, templates 철학을 단일 `design.md` 파일에 맞춘 것이다.

## 2A. External Source Synthesis

이 테스트 구조는 아래 공개 자료 흐름을 Aide의 단일 `design.md` 포맷에 맞춘 것이다.

### Google Stitch / DESIGN.md 방향

공개 보도 기준 Stitch는 자연어/이미지 입력으로 UI와 프론트엔드 코드를 만들고, 테마·색상·UX 요구사항을 명시하며, 여러 variant를 생성하고, Figma 또는 코드로 이어지는 흐름을 제공한다. 2026년 업데이트 보도에서는 `DESIGN.md`가 프로젝트 간 디자인시스템을 옮기는 장치로 설명된다.

이 파일에 반영한 원칙:

- `designSemantics`: prompt가 애매해도 제품 의도, 플랫폼, 밀도, 위계, 출력 방식을 명확히 한다.
- `Page Templates`: 빈 화면에서 바로 생성하지 않고 템플릿을 먼저 선택한다.
- `AI Generation Rules`: 자연어/이미지/HTML 입력이 들어와도 원문 콘텐츠는 보존하고 레이아웃만 바꾼다.
- `Validation Checklist`: 생성 결과를 사용자가 다시 critique/refine 할 수 있도록 검수 기준을 명시한다.

### Meta Astryx 방향

Astryx는 컴포넌트별 `.doc.mjs`에 `usage`, `bestPractices`, `anatomy`, `props`, `playground.defaults`, `theming`, `docsDense`를 둔다. CLI는 component, docs, tokens, template, manifest, JSON API를 제공해 사람과 AI가 같은 reference를 조회하게 한다.

이 파일에 반영한 원칙:

- `components:` registry에 `storybook`, `category`, `anatomy`, `variants`, `playgroundDefault`를 넣는다.
- 본문에는 `Dense Component Specs`를 둬 AI가 토큰을 적게 쓰고도 컴포넌트를 이해하게 한다.
- `Playground Mapping`은 실제 드래그앤드롭 팔레트와 AI 생성 결과가 같은 component id를 쓰게 한다.
- `Page Templates`는 Astryx식 template-first 생성을 단일 파일 안에 압축한 것이다.

### Claude / Artifacts 방향

Claude Artifacts 계열 UI 생성은 대화 중 바로 렌더링·수정·공유 가능한 인터랙티브 산출물을 강점으로 한다. 동시에 최근 비평에서는 Claude류 기본 미감이 warm editorial accent, large serif, ticker bars, 과한 rounded outline 등으로 반복되는 문제가 지적된다.

이 파일에 반영한 원칙:

- 산출물은 즉시 preview 가능한 HTML/CSS여야 하며, 편집 가능한 component-tree로 돌아올 수 있어야 한다.
- `Do Not`에는 AI 기본 미감으로 흐르는 장식적 warm editorial accent, serif, ticker, neon 패턴을 금지한다.
- KTDS의 파란색·쿨 뉴트럴·Pretendard·업무형 정보 밀도를 강제해 generic AI design look을 피한다.

### UI generation research 방향

최근 UI 생성 연구는 단순 prompt보다 구조화된 중간 표현이 의도 정렬, 품질, 제어 가능성을 높인다고 본다. SpecifyUI의 SPEC은 계층적·파라미터화된 UI 표현을 제안하고, semantic guidance 연구는 디자인 의미가 계층적이고 상호의존적이라고 설명한다.

이 파일에 반영한 원칙:

- `designSemantics`와 `Component Registry Rules`가 중간 표현 역할을 한다.
- AI는 화면을 바로 그리기 전에 `intent → template → component tree → CSS token layer → validation` 순서로 생각해야 한다.
- 사용자는 prompt를 다시 쓰지 않아도 특정 영역, 컴포넌트, 밀도, 위계를 목표로 refine 할 수 있어야 한다.

## 3. Token Semantics

토큰은 단순 값 목록이 아니라 의미 이름이다. 값보다 역할을 우선한다.

| Token | Role | Use |
|---|---|---|
| `primary` | 핵심 액션 색 | CTA, active, focus, link |
| `primary-fill-neutral` | 페이지 배경 | body, app background |
| `surface` | 상위 표면 | card, modal, sheet, input |
| `text` | 주 텍스트 | title, body primary |
| `text-neutral` | 보조 텍스트 | descriptions, metadata |
| `border-alt` | 약한 구분선 | dividers, table row borders |
| `positive/caution/negative/info` | 상태 의미 | success/warning/error/info only |

## 4. Component Registry Rules

모든 컴포넌트는 아래 스키마를 따른다고 가정한다.

```ts
type ComponentContract = {
  id: string;
  storybook: string;
  package: '@ktds-ui/components';
  importCode: string;
  storyIds: string[];
  canonicalSource?: string;
  category: 'action' | 'input' | 'content' | 'navigation' | 'overlay' | 'feedback' | 'data' | 'status';
  anatomy: string[];
  variants?: string[];
  props?: string[];
  playgroundDefault?: Record<string, string>;
  rules: string[];
}
```

AI는 컴포넌트를 임의로 새로 만들기보다 registry에 있는 컴포넌트를 조합한다. 없는 컴포넌트가 필요하면 가장 가까운 official component를 선택하고, 추가 스타일은 토큰 범위 안에서만 만든다.

### Storybook Code Source Contract

KTDS Playground에 심는 컴포넌트는 아래 우선순위를 따른다.

1. Storybook docs import snippet: 예 `import { Button } from '@ktds-ui/components';`
2. Storybook story `args`: default props, variant, size, open state 등
3. Storybook `docs.source.originalSource`: 실제 예제 JSX 구조
4. Storybook MDX usage/anatomy 설명
5. 이 파일의 token/style 규칙

즉, Aide가 만드는 KTDS 컴포넌트는 “비슷하게 생긴 HTML”이 아니라 “Storybook 예제 코드와 같은 props/조합을 쓰는 component preset”이어야 한다.

확인된 Storybook code source 예시:

```tsx
import { Button } from '@ktds-ui/components';
```

```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="negative">Negative</Button>
```

```tsx
<Button variant="primary" prefixIcon="empty">Primary</Button>
<Button variant="primary" suffixIcon="empty">Primary</Button>
<Button variant="primary" prefixIcon="empty" suffixIcon="empty">Primary</Button>
<Button variant="primary" iconOnly="empty">Primary</Button>
```

```tsx
<ButtonArea align="full">
  <Button variant="secondary" size="large">Secondary</Button>
  <Button variant="primary" size="large">Primary</Button>
</ButtonArea>
```

```tsx
import { Drawer } from '@ktds-ui/components';
```

```tsx
<Button variant="primary" onClick={handleOpen}>Open Bottom Sheet</Button>
<Drawer
  {...args}
  title="Drawer title"
  isOpen={isOpen}
  placement="bottom"
  onClose={handleClose}
  afterOpenChange={() => console.log('Drawer opened')}
>
  This is the drawer content.
</Drawer>
```

Bottom Sheet는 Storybook에서 `Drawer` 컴포넌트의 `placement="bottom"` 조합으로 표현된다. 따라서 Aide의 `bottom-sheet-default` preset도 내부 canonical component를 `Drawer`로 둔다.

## 4A. Generation Pipeline

AI는 이 파일을 읽고 아래 순서로 UI를 생성한다.

```text
1. Read source brief / PRD / IA / wireframe / HTML
2. Extract designSemantics:
   productIntent, platform, density, hierarchy, interactionMode, outputMode
3. Select one Page Template
4. Build component tree from components registry
5. Resolve each component to Storybook canonical code source
6. Apply token layer and component specs
7. Preserve source content exactly where provided
8. Render editable HTML/CSS or React component preset
9. Run Validation Checklist
```

이 순서를 어기면 일관성이 깨진다. 특히 `template`과 `component tree` 없이 바로 visual decoration부터 만들면 실패로 본다.

## 5. Dense Component Specs

### Button

- Use for actions, not pure navigation.
- Props: `variant`, `size`, `prefixIcon`, `suffixIcon`, `iconOnly`, `disabled`.
- Variants: `primary`, `secondary`, `outline`, `ghost`, `negative`, `normal`.
- Anatomy: label required, icon optional, loading optional.
- Best practices:
  - 한 화면의 primary button은 1개를 기본으로 한다.
  - 삭제/탈퇴/초기화는 `negative`와 confirm pattern을 쓴다.
  - "확인"보다 "저장", "신청하기", "삭제하기"처럼 행동을 명확히 쓴다.
- Avoid:
  - pill button for normal actions.
  - two-line button label.
  - vague labels such as "OK".

### Input / Select / Textarea

- Labels are required. Placeholder never replaces label.
- Default Input/Select height is 32px. Large is 40px, small is 24px.
- Use invalid state with clear helper text, not color alone.
- Password input may use reveal. Search input may use clear.
- Date input should use Date Picker, not free text.

### Card

- Use as a surface grouping real information.
- Aide KTDS profile uses shadow-only card by default.
- Do not nest cards inside cards.
- Each card needs at least one real content signal: title, metric, status, list item, image, action, or timestamp.
- Avoid empty decorative cards and oversized blank space.

### Bottom Sheet

- Mobile overlay component for filters, choices, secondary forms, or additional information.
- Required anatomy: dimmer, sheet surface, drag handle, title, content slot.
- Optional anatomy: close button, subtitle, action buttons.
- Canvas behavior: fixed bottom overlay.
- Do not use as desktop modal. On desktop use Dialog/Drawer.
- When CTA exists, place primary action last/right and secondary action first/left.

### Navigation

- Mobile: `Navigation: Bottom`, 3-5 items.
- Tablet: `Navigation: Top`.
- Desktop workflow tools: `Navigation: Side` 240px.
- Desktop marketing/content service: Header/Top navigation.
- Active item must use primary color and visible state.

### Table

- Use for structured data comparison and management screens.
- Header background uses `surface-alt`.
- Row height minimum 48px.
- Mobile may use horizontal scroll or card-list transformation.
- Selection variants: checkbox/radio only when bulk action or single choice is meaningful.

### Empty / Loading / Toast / Alert Dialog

- Empty state uses title + explanation + optional action.
- Loading state must include text if it blocks the whole page.
- Toast is non-blocking result feedback. 3-5 seconds. Max 2 lines.
- Alert Dialog is for destructive or irreversible confirmation.

## 6. Playground Mapping

Playground components are not separate design rules. They are visual/editable projections of the same registry.

| Playground Group | Components |
|---|---|
| 화면/여백 | Basic Screen, Content, ContentTitle, SplitLayout |
| 메뉴/탭 | NavBottom, NavSide, NavTop, Breadcrumb, TabList, MenuTab |
| 콘텐츠 | Card, List, Accordion, Avatar, Carousel |
| 입력 | Input, Select, Textarea, Checkbox, Radio, Switch, DatePicker, FileUploader |
| 버튼 | Button, FAB, ButtonArea |
| 안내/상태 | Badge, Tag, Chip, Toast, Empty, Loading, Admonition, AlertDialog |
| 데이터 | Table, Chart, Pagination, Stepper |

Playground item requirements:

- Each item has thumbnail, default props, editable prop schema, and composition rules.
- Generated AI UI should be convertible back into these components.
- Drag/drop manual UI and AI-generated UI should share the same component ids.

## 7. Page Templates

AI should start from a template before composing from scratch.

### Template: Mobile Application Flow

Use for reservation, application, upload, simple task completion.

Required structure:

1. App bar or status/header
2. Progress/status summary
3. Form/content card stack
4. Sticky primary CTA
5. Optional Bottom Sheet for selections
6. NavBottom only if screen belongs to tabbed app

### Template: Enterprise List Page

Use for admin, search, approval, management.

Required structure:

1. ContentTitle with page purpose
2. Filter row: search, select, date, button
3. Table or dense card list
4. Pagination
5. Empty/loading/error states

### Template: Dashboard

Use for metrics, reports, operations monitoring.

Required structure:

1. NavSide on desktop
2. Title and time/filter controls
3. Stat card row
4. Chart card
5. Table/list for recent items

### Template: Detail Page

Use for item detail, customer detail, request detail.

Required structure:

1. Breadcrumb
2. Header card with title, status, metadata, primary action
3. Main content section
4. Side panel or accordion/tab details

## 8. AI Generation Rules

- Preserve all source text/content from uploaded PRD, IA, wireframe, or HTML source.
- If the user requests a Stitch-like or style-guide preview, it may include a style guide board plus product screen. If the user requests production UI, generate the requested product screen only.
- In a style guide board, separate Brand, Surface, Text, Border, and Status colors. Do not show status colors as Secondary, Tertiary, or Accent brand colors.
- If the source is a redesign of an existing service, preserve the real brand/service identity from the source. Do not rename it to a generic portal brand.
- Use Pretendard as the only font family in generated UI.
- Do not invent unrelated hero images or decorative objects.
- Do not create marketing hero if the request is for a work tool.
- Use concrete data rows, labels, timestamps, status values, and realistic empty/error states.
- Keep first viewport useful: header/navigation, core task, primary CTA, and next-section hint.
- Use one dominant primary CTA.
- Use Material Symbols or locally declared icon placeholders consistently.
- Do not expose raw icon ligature text as visible copy.
- Avoid generic AI design defaults: warm editorial canvas, oversized serif display type, ticker bars, neon card glow, arbitrary pastel clusters, and repeated nested rounded outlines.
- Before visual styling, decide and preserve a semantic hierarchy: primary task, supporting information, secondary action, system feedback.
- Generated output should be both previewable and structurally editable: each major region should map back to a known component or template slot.

## 8A. Output Failure Examples

The output is considered invalid if it shows any of the following:

- A separate style guide board in `production-screen` mode.
- Status colors displayed as brand Secondary, Tertiary, or Accent palette entries.
- Color swatches, typography cards, component sample tiles, or token specimen panels inside the final product screen area.
- Fonts other than Pretendard, especially Hanken Grotesk, serif display fonts, or generic AI portfolio typography.
- Invented service names such as `Authority Portal` when the source brand is different.
- Warm status colors used as decorative rails, buttons, or brand accents.
- A page that looks like a design-system presentation instead of the requested web/app screen.

## 9. CSS Contract

Generated HTML must declare this token layer.

```css
:root {
  --color-primary: #1a75ff;
  --color-primary-text: #186ae8;
  --color-primary-fill-neutral: #F2F5F9;
  --color-surface: #ffffff;
  --color-surface-alt: #f7f7f8;
  --color-text: #171719;
  --color-text-neutral: rgba(46,47,51,0.88);
  --color-text-alt: rgba(55,56,60,0.61);
  --color-border: rgba(112,115,124,0.35);
  --color-border-alt: rgba(112,115,124,0.16);
  --color-fill-neutral: rgba(112,115,124,0.12);
  --color-fill-alt: rgba(112,115,124,0.08);
  --color-positive: #00c244;
  --color-caution: #ff9200;
  --color-negative: #ff4242;
  --color-info: #0066ff;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-base: 16px;
  --spacing-md: 20px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --rounded-sm: 4px;
  --rounded-md: 8px;
  --rounded-lg: 12px;
  --rounded-xl: 16px;
  --rounded-full: 9999px;
  --shadow-card: 0px 5px 10px rgba(0,0,0,0.05);
}
```

## 10. Validation Checklist

Before final answer, verify:

- [ ] Page background uses `--color-primary-fill-neutral`.
- [ ] Cards/sheets/modals use `--color-surface`.
- [ ] Primary blue is only action/active/focus/link.
- [ ] Output mode is clear: `style-guide-preview` may include a guide board; `production-screen` may not.
- [ ] Style guide brand palette contains primary blue and cool neutrals only.
- [ ] Status colors are shown only under status/feedback examples.
- [ ] Typography uses Pretendard only.
- [ ] Brand/service names and major copy are preserved from the source.
- [ ] Status colors are not used as decorative accent or secondary/tertiary brand color.
- [ ] Button height is 48px unless explicitly small/large component variant.
- [ ] Input/Select has visible label.
- [ ] Same component type has consistent radius/gap/padding.
- [ ] No card inside card.
- [ ] Mobile fixed bottom UI has enough `padding-bottom`.
- [ ] Source text/content from PRD/IA/HTML is preserved.
- [ ] Component names match official registry as much as possible.
- [ ] A page template was selected before composing individual components.
- [ ] The screen has explicit semantic hierarchy, not just attractive cards.
- [ ] The result avoids generic Claude/AI visual defaults unless specifically requested.
- [ ] Major regions can be mapped back to Playground components or template slots.

## 11. Do Not

- Do not use arbitrary hex colors in CSS properties.
- Do not mix another design system's visual language.
- Do not use giant gradient/orb backgrounds.
- Do not make one-note blue screens.
- Do not use warm editorial accent + oversized serif as a default AI aesthetic.
- Do not use Hanken Grotesk, Inter, serif display, or any non-Pretendard font.
- Do not render style guide boards, token palettes, typography specimens, or component sample panels in `production-screen` mode.
- Do not invent generic portal names when source brand/content is provided.
- Do not promote status colors to Secondary, Tertiary, or Accent brand palette entries.
- Do not use status colors as decorative rails, card borders, or CTA colors.
- Do not add ticker bars, neon glows, or decorative nested rounded outlines without product reason.
- Do not use decorative 3D for enterprise data tools unless the brief asks for it.
- Do not use KTDS as final service brand.
- Do not invent unavailable components when official components can compose the same result.

## 12. Source Notes For This Test File

This file intentionally keeps citations as notes because it must still work as a compact design.md contract.

- KTDS source: DSCore Storybook stable docs and existing `ktds.md`.
- Astryx source model: component `.doc.mjs` files with usage, best practices, anatomy, props, playground defaults, theming, and dense docs; CLI exposes docs/components/templates/tokens/manifest/JSON surfaces.
- Google Stitch public reporting: natural language/image UI generation, theme and UX customization, multiple variants, Figma/code export, 2026 DESIGN.md mention for carrying design systems across projects.
- Claude public reporting and critique: Artifacts enable live interactive previews; repeated AI aesthetics should be actively constrained.
- Design Tokens Community Group: tokens should be meaningful named values with type/description/reference semantics.
- UI generation research: structured semantic or SPEC-like intermediate representations improve controllability, alignment, and iterative refinement.
