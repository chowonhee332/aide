---
# ==========================================
# 1. MACHINE-READABLE DESIGN TOKENS (W3C / Google Stitch Spec)
# ==========================================
theme:
  name: "Aide Default Premium Cinematic Dark"
  version: "1.2.0"

tokens:
  color:
    brand:
      primary: { value: "#PROMPT_INPUT_PRIMARY_COLOR_HERE_", description: "핵심 강조 및 CTA용 고객사 브랜드 컬러" }
      secondary: { value: "#PROMPT_INPUT_SECONDARY_COLOR_HERE_", description: "보조 액션 및 마우스 오버용 고객사 브랜드 컬러" }
    semantic:
      background: { value: "#0B0B0F", description: "전체 화면의 베이스가 되는 깊은 블랙/차콜 무드" }
      surface: { value: "#16161E", description: "컨테이너, 카드, 내비게이션 바 등 레이어용 분할 면" }
      border: { value: "#262633", description: "UI 요소 간의 최소한의 경계선" }
      text:
        primary: { value: "#F3F4F6", description: "높은 가시성을 가진 미색 화이트" }
        secondary: { value: "#9CA3AF", description: "설명 및 메타 정보용 그레이" }
  
  typography:
    fontFamily:
      sans: { value: ["Pretendard", "-apple-system", "sans-serif"] }
    fontSize:
      display: { value: "32px", description: "히어로 섹션, 핵심 타이틀" }
      heading: { value: "24px", description: "섹션 타이틀, 카드 헤더" }
      base: { value: "16px", description: "본문, 폼 입력창, 기본 텍스트" }
      caption: { value: "13px", description: "레이블, 배지, 헬퍼 텍스트" }
    fontWeight:
      regular: { value: "400" }
      medium: { value: "500" }
      semibold: { value: "600" }
      bold: { value: "700" }

  size:
    radius:
      md: { value: "8px", description: "일반 버튼, 인풋 폼 코너 라운딩" }
      lg: { value: "12px", description: "카드, 모달, 메인 컨테이너 코너 라운딩" }
    spacing:
      xs: { value: "4px" }
      sm: { value: "8px" }
      md: { value: "16px" }
      lg: { value: "24px" }
      xl: { value: "32px" }

  responsive:
    breakpoints:
      sm: { value: "640px", description: "Mobile" }
      md: { value: "768px", description: "Tablet" }
      lg: { value: "1024px", description: "Desktop Standard" }
    grid:
      desktop: { columns: 12, gap: "24px", margin: "40px" }
      tablet: { columns: 8, gap: "16px", margin: "24px" }
      mobile: { columns: 4, gap: "12px", margin: "16px" }
---

# 2. HUMAN & AGENT PROSE (Visual Identity & Layout Principles)

## Design Philosophy
본 디자인 시스템은 불필요한 장식적 선(Border)의 사용을 엄격히 제한하고, 명확한 면 분할(`surface`)과 깊이감 있는 어두운 톤을 조합하여 **미니멀하고 몰입감 있는 시네마틱 UI**를 구축하는 것을 원칙으로 합니다. 모든 생성된 화면은 빽빽한 배치 대신 여유 있는 공간감(Padding)을 확보하여 프리미엄 SaaS 도구의 정돈된 무드를 유지해야 합니다.

## Color Application Rules
- **Primary Color**: 유저의 시선을 즉시 끌어야 하는 핵심 액션(CTA 버튼, 활성화 탭, 진행 상태 바 등)에만 5% 미만의 비율로 제한적으로 사용하여 시각적 파급력을 극대화합니다.
- **Secondary Color**: 보조 액션, 서브 메뉴, 또는 마우스 오버(Hover) 시의 부드러운 상태 변화에 할당합니다.
- **Surface**: 배경(`background`)과 UI 요소를 격리하는 카드, 상단 GNB, 사이드바, 팝업 모달창의 배경으로 엄격히 적용되어 시각적 위계를 형성합니다.

---

# 3. COMPONENT SPECIFICATIONS & LAYOUT RECIPES

### 3.1 Buttons (Action Elements)
- **Structure**: `[Icon (Optional)] + [Label] + [Trailing Icon (Optional)]`
- **Sizing & Padding**:
  - `Large`: Height 48px | Padding Horizontal 24px | Font `base` (Bold)
  - `Medium (Default)`: Height 40px | Padding Horizontal 16px | Font `base` (Medium)
- **Style Variations**:
  - `Filled (Primary)`: Background `color.brand.primary` | Text `color.semantic.background`
  - `Outline (Secondary)`: Border 1px `color.semantic.border` | Text `color.semantic.text.primary` | Hover 시 `color.semantic.surface` 배경 적용
- **Constraint**: 모든 버튼의 둥근 모서리는 `size.radius.md`를 엄격히 따르며, 글자 수에 관계없이 최소 너비(min-width)는 80px를 유지할 것.

### 3.2 Input Fields (Forms)
- **Structure**: `[Label (Top)]` + `[Input Box (Container)]` + `[Helper/Error Text (Bottom)]`
- **Sizing**: Height 44px | Padding Left/Right 16px | Font `caption` (Regular)
- **Color State**:
  - `Default`: Background `color.semantic.surface` | Border `color.semantic.border`
  - `Focus`: Border 1.5px `color.brand.primary` 적용 (부드러운 테두리 전환 효과 포함)
- **Constraint**: 플레이스홀더(Placeholder) 텍스트는 반드시 `color.semantic.text.secondary`를 사용하여 입력 완료된 텍스트와 시각적 위계를 완벽히 분리할 것.

### 3.3 Cards & Containers (Surface Blocks)
- **Structure**: `[Header (Title + Action)]` -> `[Body Content]` -> `[Footer (Actions)]`
- **Styling**: Background `color.semantic.surface` | Radius `size.radius.lg`
- **Padding**: 내부 모든 콘텐츠는 상하좌우 `size.spacing.lg (24px)`의 패딩을 균일하게 가질 것.
- **Constraint**: 카드 내부에서 섹션을 나눌 때 물리적인 선(Border)을 긋지 말고, 16px 또는 24px의 `spacing` 여백만을 활용하여 레이아웃을 구획할 것.

---

# 4. RESPONSIVE & ADAPTIVE PROTOCOLS

AI 에이전트는 코드를 생성할 때 화면 크기(Breakpoint)의 변화에 유연하게 대응하는 **Mobile-First 반응형 UI** 코드를 출력해야 합니다.

- **Grid Auto-Scaling**:
  - 대시보드나 리스트 UI는 데스크톱(`lg`)에서 **3~4열(Column)** 구조를 유지하되, 태블릿(`md`)에서는 **2열**, 모바일(`sm`)에서는 무조건 **1열 세로 정렬(Flex-col)** 구조로 자동 스케일 다운되어야 합니다.
- **Component Fluidity**:
  - **GNB / Navigation**: 데스크톱의 가로형 메뉴 바는 모바일 화면 인터페이스 진입 시 우측 상단 '햄버거 버튼'과 슬라이드 방식의 '드로워(Drawer) 모달' 형태로 구조를 변형합니다.
  - **Action Buttons**: 카드 내부의 하단 액션 버튼 그룹은 모바일 뷰에서 가로 전체 폭을 차지하는 `width: 100%` 구조로 유연하게 늘어납니다.
- **Visual Scaling**:
  - 화면 해상도가 줄어듦에 따라 폰트 크기와 전체 패딩 스케일도 한 단계씩 하향 조정합니다. (예: 데스크톱 `Display(32px) / Padding(24px)` -> 모바일 `Heading(24px) / Padding(16px)`)

---

# 5. DEVELOPER / CODE MAPPING RULES (Tailwind CSS)

AI 에이전트는 위 디자인 토큰 체계를 프론트엔드 코드로 구현할 때, 반드시 아래의 Tailwind CSS 커스텀 설정 클래스로 1:1 매핑하여 컴포넌트를 빌드해야 합니다.

- `color.brand.primary` ➡️ `bg-primary` 또는 `text-primary`
- `color.brand.secondary` ➡️ `bg-secondary` 또는 `text-secondary`
- `color.semantic.background` ➡️ `bg-neutral-950`
- `color.semantic.surface` ➡️ `bg-neutral-900`
- `color.semantic.border` ➡️ `border-neutral-800`
- `color.semantic.text.primary` ➡️ `text-gray-100`
- `color.semantic.text.secondary` ➡️ `text-gray-400`
- `size.radius.md` ➡️ `rounded-lg` (8px)
- `size.radius.lg` ➡️ `rounded-xl` (12px)
- `size.spacing.md` ➡️ `p-4` / `m-4` / `gap-4` (16px)
- `size.spacing.lg` ➡️ `p-6` / `m-6` / `gap-6` (24px)
