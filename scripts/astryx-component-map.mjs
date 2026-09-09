/**
 * `aide.md` `component_registry` id → `@astryxdesign/core` component.
 *
 * Migration data, not runtime code. `/aide-ui` and the DESIGN.md specimens
 * currently render `src/components/ui/*`, which is Aide's own implementation of
 * this registry; replacing them with Astryx needs a decision per id, and about a
 * fifth of the registry has no Astryx counterpart at all.
 *
 * `test/verify_astryx_component_map.mjs` holds this honest: every registry id must
 * appear exactly once, and every Astryx name must exist in the installed catalog.
 *
 * Names verified against `astryx component --list --json` (@astryxdesign/cli 0.5.2,
 * 163 components) on 2026-09-09.
 */

/** Aide id → Astryx component(s) that cover it. Multiple names = composed from those parts. */
export const MAPPED = {
  // actions
  button: ['Button'],
  'icon-button': ['IconButton'],
  chip: ['Token', 'ToggleButton'],
  anchor: ['Link'],

  // inputs
  field: ['Field', 'FieldLabel', 'FieldStatus'],
  'field-group': ['FormLayout'],
  textarea: ['TextArea'],
  'number-field': ['NumberInput'],
  select: ['Selector', 'SelectorOption'],
  search: ['PowerSearch'],
  slider: ['Slider'],
  'date-picker': ['DateInput', 'Calendar'],
  'time-picker': ['TimeInput'],
  'file-uploader': ['FileInput'],

  // selection
  checkbox: ['CheckboxInput', 'CheckboxList'],
  radio: ['RadioList', 'RadioListItem'],
  switch: ['Switch'],
  'segmented-control': ['SegmentedControl', 'SegmentedControlItem'],

  // navigation
  tabs: ['TabList', 'Tab'],
  stepper: ['Stepper', 'Step'],
  navigation: ['SideNav', 'TopNav'],
  'app-header': ['TopNav', 'TopNavHeading'],
  'top-navigation': ['TopNav', 'TopNavItem'],
  'side-navigation': ['SideNav', 'SideNavItem', 'SideNavSection'],
  'bottom-app-bar': ['MobileNav'],
  breadcrumb: ['Breadcrumbs', 'BreadcrumbItem'],
  pagination: ['Pagination'],
  'pagination-dots': ['Pagination'],

  // layout
  panel: ['LayoutPanel'],
  'side-panel': ['LayoutPanel'],
  'workspace-shell': ['AppShell', 'Layout', 'LayoutContent', 'LayoutHeader'],
  'responsive-grid': ['Grid', 'GridSpan'],

  // data-display
  badge: ['Badge'],
  avatar: ['Avatar'],
  'avatar-group': ['AvatarGroup', 'AvatarGroupOverflow'],
  card: ['Card', 'ClickableCard', 'SelectableCard'],
  'list-cell': ['Item'],
  'list-row': ['ListItem'],
  table: ['Table', 'TableRow', 'TableCell', 'TableHeader'],
  accordion: ['Collapsible', 'CollapsibleGroup'],
  carousel: ['Carousel'],

  // feedback
  progress: ['ProgressBar'],
  alert: ['Banner'],
  toast: ['Toast'],
  loading: ['Spinner', 'Skeleton'],
  'empty-state': ['EmptyState'],

  // overlays
  dialog: ['Dialog', 'AlertDialog', 'DialogHeader'],
  sheet: ['BottomSheet'],
  popover: ['Popover'],
  tooltip: ['Tooltip'],
  'dropdown-menu': ['DropdownMenu', 'DropdownMenuItem'],
}

/**
 * Registry ids with no Astryx counterpart. Each needs a product decision before
 * `/aide-ui` can drop `src/components/ui/*`: drop the id from the contract, keep an
 * Aide-authored component beside Astryx, or compose it from Astryx primitives.
 *
 * The mobile/Korean-market patterns here (약관 동의, 키패드, 하단 고정 CTA) are the
 * reason this is a decision and not a rename — Astryx is a desktop-leaning web kit.
 */
export const NO_COUNTERPART = {
  'action-bar': '액션 바 — Toolbar 로 근사 가능하나 의미가 다름',
  'fixed-bottom-cta': '하단 고정 CTA — 모바일 패턴, Astryx 없음',
  'floating-action-button': 'FAB — Astryx 없음',
  keypad: '숫자 키패드 — Astryx 검색 결과 0건',
  editor: '리치 텍스트 에디터 — Astryx는 Markdown 렌더러만 있음',
  agreement: '약관 동의 — Astryx 없음',
  rating: '별점 — Astryx 없음',
  'global-navigation': 'GNB — Aide 고유 분류, TopNav 와 경계가 다름',
  'local-navigation': 'LNB — Aide 고유 분류, SideNav 와 경계가 다름',
  'app-footer': '앱 푸터 — LayoutFooter 는 셸 슬롯이지 컴포넌트가 아님',
  'list-section': '리스트 섹션 헤더 — Astryx 없음',
  metric: '지표 카드 — Astryx 없음',
  'bar-chart': '막대 차트 — Astryx에 차트 없음',
  'detail-header': '상세 헤더 — Astryx 없음',
  'page-header': '페이지 헤더 — Astryx 없음',
  'section-header': '섹션 헤더 — Astryx 없음',
  asset: '이미지/에셋 — Thumbnail 은 용도가 좁음',
  prose:
    '리치 텍스트 래퍼 — Astryx `Markdown` 은 마크다운 *문자열* 렌더러라 임의 JSX children 을 받지 못한다',
  result: '결과 화면 — EmptyState 는 빈 상태 전용',
}
