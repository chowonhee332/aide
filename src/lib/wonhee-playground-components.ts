import type { ComponentCategory, ComponentDefinition, PropSchema } from './builder-types'
import { AUI_COMPONENT_CATEGORIES, AUI_COMPONENTS, AUI_COMPONENT_RECIPES, AUI_COMPONENT_RECIPE_FAMILIES } from './aide-product-tokens'

const categoryMap: Record<string, ComponentCategory> = {
  actions: 'action', inputs: 'input', selection: 'selection', navigation: 'navigation',
  'data-display': 'data', feedback: 'feedback', overlays: 'overlay',
}

const labelSchema: PropSchema[] = [
  { key: 'label', label: '레이블', type: 'text', group: 'content' },
  { key: 'description', label: '설명', type: 'textarea', group: 'content' },
  { key: 'variant', label: '유형', type: 'select', options: ['primary', 'secondary', 'outline', 'ghost'], group: 'style' },
  { key: 'state', label: '상태', type: 'select', options: ['default', 'selected', 'success', 'warning', 'error', 'disabled'], group: 'state' },
]

const contentSchemas: Record<string, PropSchema[]> = {
  field: [{ key: 'placeholder', label: '플레이스홀더', type: 'text', group: 'content' }, { key: 'value', label: '입력값', type: 'text', group: 'content' }, { key: 'help', label: '도움말', type: 'text', group: 'content' }],
  textarea: [{ key: 'placeholder', label: '플레이스홀더', type: 'text', group: 'content' }, { key: 'value', label: '입력값', type: 'textarea', group: 'content' }],
  search: [{ key: 'placeholder', label: '검색 안내문', type: 'text', group: 'content' }],
  'field-group': [{ key: 'options', label: '필드 목록', type: 'textarea', group: 'content' }],
  select: [{ key: 'options', label: '선택 항목', type: 'textarea', group: 'content' }, { key: 'value', label: '선택값', type: 'text', group: 'content' }],
  'number-field': [{ key: 'value', label: '값', type: 'number', group: 'content' }, { key: 'min', label: '최솟값', type: 'number', group: 'content' }, { key: 'max', label: '최댓값', type: 'number', group: 'content' }],
  slider: [{ key: 'value', label: '값', type: 'number', group: 'content' }, { key: 'min', label: '최솟값', type: 'number', group: 'content' }, { key: 'max', label: '최댓값', type: 'number', group: 'content' }],
  checkbox: [{ key: 'options', label: '선택 항목', type: 'textarea', group: 'content' }],
  radio: [{ key: 'options', label: '선택 항목', type: 'textarea', group: 'content' }],
  agreement: [{ key: 'options', label: '약관 목록', type: 'textarea', group: 'content' }],
  tabs: [{ key: 'options', label: '탭 목록', type: 'textarea', group: 'content' }],
  'segmented-control': [{ key: 'options', label: '항목 목록', type: 'textarea', group: 'content' }],
  chip: [{ key: 'options', label: '칩 목록', type: 'textarea', group: 'content' }],
  stepper: [{ key: 'options', label: '단계 목록', type: 'textarea', group: 'content' }, { key: 'value', label: '현재 단계', type: 'number', group: 'state' }],
  navigation: [{ key: 'options', label: '메뉴 목록', type: 'textarea', group: 'content' }],
  breadcrumb: [{ key: 'options', label: '경로 목록', type: 'textarea', group: 'content' }],
  'list-section': [{ key: 'options', label: '목록 항목', type: 'textarea', group: 'content' }],
  table: [{ key: 'options', label: '열 제목', type: 'textarea', group: 'content' }, { key: 'description', label: '행 데이터 (행마다 | 구분)', type: 'textarea', group: 'content' }],
  metric: [{ key: 'value', label: '지표 값', type: 'text', group: 'content' }, { key: 'description', label: '변화량', type: 'text', group: 'content' }],
  'bar-chart': [{ key: 'options', label: '데이터 (이름:값)', type: 'textarea', group: 'content' }],
  'responsive-grid': [{ key: 'options', label: '그리드 항목', type: 'textarea', group: 'content' }],
  progress: [{ key: 'value', label: '진행률', type: 'number', group: 'content' }],
}

const mobileOnly = new Set(['bottom-app-bar', 'fixed-bottom-cta', 'sheet', 'keypad'])
const desktopOnly = new Set(['global-navigation', 'local-navigation', 'side-navigation', 'workspace-shell', 'table', 'side-panel'])

const titleComponents = new Set([
  'field-group', 'agreement', 'app-header', 'local-navigation', 'top-navigation', 'side-navigation',
  'app-footer', 'card', 'panel', 'list-section', 'table', 'bar-chart', 'prose', 'detail-header',
  'page-header', 'section-header', 'side-panel', 'workspace-shell', 'empty-state', 'result',
  'dialog', 'sheet', 'popover',
])
const titleOnlyComponents = new Set([
  'field-group', 'agreement', 'app-header', 'local-navigation', 'top-navigation', 'side-navigation',
  'app-footer', 'card', 'panel', 'list-section', 'table', 'bar-chart', 'side-panel', 'workspace-shell',
  'empty-state',
])
const labelUnusedComponents = new Set([
  'checkbox', 'tabs', 'chip', 'stepper', 'navigation', 'global-navigation', 'bottom-app-bar',
  'breadcrumb', 'responsive-grid', 'loading',
])

const consumedRecipeKeys: Record<string, string[]> = {
  button: ['size', 'width'], 'icon-button': ['size'], 'action-bar': ['size', 'layout'], 'fixed-bottom-cta': ['action-count'],
  field: ['size', 'required'], textarea: ['size'], select: ['size'], 'number-field': ['size'], checkbox: ['size'], radio: ['size'], switch: ['size'],
  navigation: ['orientation', 'density'], 'app-header': ['position', 'show-actions'], 'global-navigation': ['alignment'],
  'local-navigation': ['width'], 'top-navigation': ['type', 'show-subtitle'], 'side-navigation': ['width'],
  'bottom-app-bar': ['item-count', 'position'], 'app-footer': ['layout', 'emphasis'], card: ['emphasis'],
  'list-cell': ['density'], 'list-section': ['emphasis'], 'section-header': ['heading-level'],
  'side-panel': ['side', 'width'], 'workspace-shell': ['navigation', 'inspector'],
}

function schemaFor(id: string, recipeSchema: PropSchema[]): PropSchema[] {
  const titleSchema: PropSchema[] = titleComponents.has(id)
    ? [{ key: 'title', label: '제목', type: 'text', group: 'content' }]
    : []
  const extra = contentSchemas[id] ?? []
  const keys = new Set([...recipeSchema, ...titleSchema, ...extra].map((field) => field.key))
  const common = labelSchema.filter((field) => {
    if (keys.has(field.key)) return false
    if (field.key === 'label' && (titleOnlyComponents.has(id) || labelUnusedComponents.has(id))) return false
    if (field.key === 'description' && ['button', 'icon-button', 'badge', 'avatar', 'switch', 'slider', 'progress'].includes(id)) return false
    if (field.key === 'variant' && !['button', 'icon-button', 'badge', 'alert', 'toast'].includes(id)) return false
    if (field.key === 'state' && ['breadcrumb', 'avatar', 'panel', 'prose', 'responsive-grid', 'detail-header', 'page-header', 'section-header'].includes(id)) return false
    return true
  })
  const consumed = new Set(consumedRecipeKeys[id] ?? [])
  const supportedRecipe = recipeSchema.filter((field) => consumed.has(field.key) && !extra.some((candidate) => candidate.key === field.key))
  return [...titleSchema, ...common, ...extra, ...supportedRecipe]
}

const defaults: Record<string, string> = {
  label: '레이블', description: '컴포넌트 설명을 입력하세요.', variant: 'primary', state: 'default',
  options: '첫 번째\n두 번째\n세 번째', value: '', title: '제목', placeholder: '내용을 입력하세요',
}

const contentDefaults: Record<string, Record<string, string>> = {
  button: { label: '계속하기' },
  'icon-button': { label: '알림' },
  'action-bar': { label: '저장하기' },
  'fixed-bottom-cta': { label: '다음으로', 'action-count': '1' },
  field: { label: '프로젝트 이름', placeholder: '이름을 입력하세요', help: '업무에서 사용하는 이름을 입력하세요.' },
  'field-group': { title: '기본 정보', description: '필수 정보를 입력해주세요.', options: '이름\n이메일\n연락처' },
  textarea: { label: '상세 설명', placeholder: '내용을 입력해주세요.' },
  select: { label: '카테고리', options: '기획\n디자인\n개발', value: '기획' },
  search: { label: '검색', placeholder: '검색어를 입력하세요' },
  'number-field': { label: '수량', value: '3', min: '1', max: '10' },
  slider: { label: '완료율', value: '72', min: '0', max: '100' },
  checkbox: { label: '관심 분야', options: '서비스 기획\nUI 디자인\n프론트엔드' },
  radio: { label: '알림 수신', options: '모두 받기\n중요 알림만\n받지 않기' },
  switch: { label: '푸시 알림 받기' },
  agreement: { title: '약관 동의', options: '[필수] 서비스 이용약관\n[필수] 개인정보 처리방침\n[선택] 마케팅 정보 수신' },
  tabs: { label: '콘텐츠 탭', options: '개요\n진행 현황\n활동 기록' },
  'segmented-control': { label: '보기 방식', options: '일간\n주간\n월간' },
  chip: { label: '필터', options: '전체\n진행 중\n완료' },
  stepper: { label: '진행 단계', options: '정보 입력\n내용 확인\n신청 완료', value: '1' },
  navigation: { label: '주요 메뉴', options: '홈\n프로젝트\n리포트' },
  'app-header': { title: 'Workspace', options: '홈\n프로젝트\n리포트' },
  'global-navigation': { title: 'Workspace', options: '대시보드\n업무\n리포트' },
  'local-navigation': { title: '프로젝트', options: '개요\n일정\n구성원' },
  'top-navigation': { title: '프로젝트 상세', description: '현재 프로젝트의 상세 정보' },
  'side-navigation': { title: 'Workspace', options: '대시보드\n프로젝트\n설정' },
  'bottom-app-bar': { options: '홈\n검색\n내 정보', 'item-count': '3' },
  'app-footer': { title: 'Aide', description: '더 나은 제품 경험을 만듭니다.', options: '서비스 소개\n이용약관\n문의하기' },
  breadcrumb: { options: '홈\n프로젝트\n상세' },
  badge: { label: '진행 중' },
  avatar: { label: '김테크' },
  card: { title: '프로젝트 현황', description: '주요 일정과 진행 상태를 한눈에 확인하세요.' },
  panel: { title: '요약 정보', description: '선택한 항목의 상세 정보가 표시됩니다.' },
  'list-cell': { label: '프로젝트 이름', description: '최근 수정 10분 전' },
  'list-section': { title: '최근 프로젝트', description: '최근에 작업한 항목입니다.', options: '모바일 앱 개편\n관리자 대시보드\n디자인 시스템' },
  table: { title: '프로젝트 목록', options: '프로젝트\n담당자\n상태', description: '모바일 앱 개편 | 김테크 | 진행 중\n관리자 대시보드 | 이원희 | 검토 중' },
  metric: { label: '완료한 프로젝트', value: '24', description: '지난달보다 3개 증가' },
  'bar-chart': { title: '월별 완료 건수', options: '1월:18\n2월:24\n3월:32' },
  prose: { title: '서비스 소개', label: '핵심 가치', description: '사용자와 팀이 더 빠르게 결과를 만들 수 있도록 돕습니다.' },
  'responsive-grid': { label: '주요 기능', options: '프로젝트 관리\n진행 현황\n팀 협업\n리포트' },
  'detail-header': { title: '프로젝트 상세', label: '편집', description: '프로젝트 정보와 진행 상황을 확인하세요.' },
  'page-header': { title: '프로젝트', label: '새 프로젝트', description: '팀의 모든 프로젝트를 관리합니다.' },
  'section-header': { title: '최근 활동', label: '더보기', description: '프로젝트의 최신 변경 사항입니다.' },
  'side-panel': { title: '상세 정보', description: '선택한 항목의 속성을 확인하고 편집합니다.' },
  'workspace-shell': { title: '업무 관리', description: '오늘 처리할 업무를 확인하세요.', options: '대시보드\n요청\n리포트' },
  progress: { label: '프로젝트 완료율', value: '68' },
  alert: { label: '확인이 필요합니다', description: '입력하지 않은 필수 정보가 있습니다.' },
  toast: { label: '저장되었습니다', description: '변경 사항을 성공적으로 저장했습니다.' },
  loading: { description: '콘텐츠를 불러오고 있습니다.' },
  'empty-state': { title: '아직 프로젝트가 없습니다', description: '새 프로젝트를 만들어 작업을 시작해보세요.' },
  result: { title: '신청이 완료되었습니다', label: '확인', description: '입력한 이메일로 결과를 안내해드릴게요.' },
  dialog: { title: '변경 사항을 저장할까요?', label: '저장하기', description: '저장하지 않은 변경 사항이 있습니다.' },
  sheet: { title: '필터', label: '필터 열기', description: '원하는 조건을 선택해주세요.' },
  popover: { title: '빠른 도움말', label: '도움말', description: '이 항목에 대한 간단한 설명입니다.' },
  tooltip: { title: '도움말', label: '도움말 보기', description: '추가 정보를 확인할 수 있습니다.' },
  'dropdown-menu': { title: '더보기', label: '메뉴 열기', options: '이름 변경\n복제\n삭제' },
}

function escapeHtml(value: string | undefined) {
  return (value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}
function lines(value: string | undefined) { return (value ?? '').split('\n').map((item) => item.trim()).filter(Boolean) }
function humanize(id: string) { return id.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ') }
function icon(id: string) { return ({ button: 'B', field: 'T', navigation: 'N', card: 'C', dialog: 'D', table: '▦', loading: '◌' } as Record<string,string>)[id] ?? humanize(id)[0] ?? 'W' }

const css = {
  wrap: 'box-sizing:border-box;font-family:var(--aui-type-body-family);font-size:var(--aui-type-body-size);line-height:var(--aui-type-body-leading);color:var(--aui-text);padding:var(--aui-space-4)',
  surface: 'background:var(--aui-surface);border-radius:var(--aui-radius-card)',
  border: 'border:1px solid var(--aui-border-subtle)',
  control: 'box-sizing:border-box;min-height:var(--aui-control-default);border-radius:var(--aui-radius-control);font:var(--aui-weight-semibold) var(--aui-type-label-size)/var(--aui-type-label-leading) var(--aui-type-body-family)',
  muted: 'color:var(--aui-text-muted)',
}

function button(label: string, variant = 'primary', size = 'default', width = 'hug') {
  const primary = variant === 'primary'
  const height = size === 'compact' ? 'var(--aui-component-button-compact-height)' : size === 'touch' ? 'var(--aui-component-button-touch-height)' : size === 'prominent' ? 'var(--aui-component-button-prominent-height)' : 'var(--aui-component-button-default-height)'
  const padding = size === 'compact' ? 'var(--aui-component-button-compact-padding-x)' : size === 'prominent' ? 'var(--aui-component-button-prominent-padding-x)' : 'var(--aui-component-button-default-padding-x)'
  return `<button style="${css.control};height:${height};${width==='fill'?'width:100%;':''}padding:0 ${padding};border:1px solid ${primary ? 'var(--aui-primary)' : 'var(--aui-border)'};background:${primary ? 'var(--aui-primary)' : 'var(--aui-surface)'};color:${primary ? 'var(--aui-on-primary)' : 'var(--aui-text)'}">${escapeHtml(label)}</button>`
}
function field(p: Record<string,string>, textarea = false) {
  const tag = textarea ? 'div' : 'div'
  const height = p.size === 'compact' ? 'var(--aui-component-field-compact-height)' : p.size === 'touch' ? 'var(--aui-component-field-touch-height)' : 'var(--aui-component-field-default-height)'
  return `<label style="display:grid;gap:var(--aui-component-field-label-gap)"><span style="font-size:var(--aui-type-caption-size);line-height:var(--aui-type-caption-leading);font-weight:var(--aui-weight-semibold)">${escapeHtml(p.label)}</span><${tag} style="${css.control};${css.border};display:flex;align-items:${textarea ? 'flex-start' : 'center'};min-height:${textarea ? (p.size==='touch'?'var(--aui-component-field-textarea-touch-min-height)':'var(--aui-component-field-textarea-min-height)') : height};padding:${textarea ? 'var(--aui-space-3)' : '0 var(--aui-component-field-padding-inline)'};background:var(--aui-surface);${css.muted}">${escapeHtml(p.value || p.placeholder)}</${tag}></label>`
}
function choices(p: Record<string,string>, kind: 'checkbox'|'radio'|'chip') {
  const target = p.size === 'touch' ? 'var(--aui-target-touch)' : 'var(--aui-control-default)'
  return `<div style="display:flex;gap:var(--aui-space-2);flex-wrap:wrap">${lines(p.options).map((option,index)=>kind === 'chip'
    ? `<span style="box-sizing:border-box;min-height:${target};display:inline-flex;align-items:center;padding:0 var(--aui-space-3);border-radius:var(--aui-radius-pill);background:${index===0?'var(--aui-primary-soft)':'var(--aui-fill)'};color:${index===0?'var(--aui-primary-heavy)':'var(--aui-text)'};font-size:var(--aui-type-label-size);font-weight:var(--aui-weight-semibold)">${escapeHtml(option)}</span>`
    : `<label style="min-height:${target};display:flex;align-items:center;gap:var(--aui-space-2)"><span style="box-sizing:border-box;width:var(--aui-component-selection-indicator-size);height:var(--aui-component-selection-indicator-size);border-radius:${kind==='radio'?'50%':'var(--aui-radius-sm)'};border:1px solid ${index===0?'var(--aui-primary)':'var(--aui-border)'};background:${index===0?'var(--aui-primary)':'var(--aui-surface)'};box-shadow:${index===0?'inset 0 0 0 var(--aui-space-1) var(--aui-surface)':'none'}"></span>${escapeHtml(option)}</label>`).join('')}</div>`
}
function render(id: string, p: Record<string,string>): string {
  const label = p.label || p.title || humanize(id)
  let body = ''
  switch (id) {
    case 'button': body = button(label, p.variant, p.size, p.width); break
    case 'icon-button': body = `<button aria-label="${escapeHtml(label)}" style="${css.control};width:${p.size==='touch'?'var(--aui-component-button-touch-height)':'var(--aui-component-button-default-height)'};border:0;background:${p.variant==='primary'?'var(--aui-primary)':'var(--aui-fill)'};color:${p.variant==='primary'?'var(--aui-on-primary)':'var(--aui-text)'};font-size:var(--aui-icon-md)">＋</button>`; break
    case 'action-bar': body = `<div style="display:flex;flex-direction:${p.layout==='stack'?'column-reverse':'row'};justify-content:flex-end;gap:var(--aui-space-2);padding:var(--aui-component-action-bar-padding);background:var(--aui-surface-raised)">${button('취소','outline',p.size,p.layout==='stack'?'fill':'hug')}${button(label,'primary',p.size,p.layout==='stack'?'fill':'hug')}</div>`; break
    case 'field': case 'search': body = field(p); break
    case 'number-field': body = `<label style="display:grid;gap:var(--aui-space-2)"><span>${escapeHtml(label)}</span><input type="number" value="${escapeHtml(p.value || '3')}" min="${escapeHtml(p.min || '1')}" max="${escapeHtml(p.max || '10')}" readonly style="${css.control};${css.border};padding:0 var(--aui-space-3);background:var(--aui-surface)"/></label>`; break
    case 'select': body = `<label style="display:grid;gap:var(--aui-space-2)"><span>${escapeHtml(label)}</span><select style="${css.control};${css.border};padding:0 var(--aui-space-3);background:var(--aui-surface)">${lines(p.options).map((option)=>`<option${option===(p.value||lines(p.options)[0])?' selected':''}>${escapeHtml(option)}</option>`).join('')}</select></label>`; break
    case 'textarea': body = field(p,true); break
    case 'field-group': body = `<fieldset style="${css.border};border-radius:var(--aui-radius-card);padding:var(--aui-space-4)"><legend>${escapeHtml(p.title)}</legend>${field(p)}</fieldset>`; break
    case 'slider': body = `<label>${escapeHtml(label)} <input type="range" min="${escapeHtml(p.min || '0')}" max="${escapeHtml(p.max || '100')}" value="${escapeHtml(p.value || '72')}" style="width:100%;accent-color:var(--aui-primary);min-height:var(--aui-component-slider-target-height)"/></label>`; break
    case 'keypad': body = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--aui-component-keypad-gap);padding:var(--aui-component-keypad-inset)">${['1','2','3','4','5','6','7','8','9','⌫','0','확인'].map(v=>`<button style="${css.control};border:0;background:var(--aui-fill)">${v}</button>`).join('')}</div>`; break
    case 'checkbox': body = choices(p,'checkbox'); break
    case 'radio': body = choices(p,'radio'); break
    case 'chip': case 'segmented-control': body = choices(p,'chip'); break
    case 'switch': body = `<div style="min-height:${p.size==='touch'?'var(--aui-target-touch)':'var(--aui-control-default)'};display:flex;justify-content:space-between;align-items:center;gap:var(--aui-space-3)"><span>${escapeHtml(label)}</span><span style="box-sizing:border-box;width:var(--aui-component-selection-switch-width);height:var(--aui-component-selection-switch-height);padding:var(--aui-component-selection-switch-inset);border-radius:var(--aui-radius-pill);background:var(--aui-primary);display:flex;justify-content:flex-end"><i style="width:var(--aui-component-selection-switch-thumb-size);height:var(--aui-component-selection-switch-thumb-size);border-radius:50%;background:var(--aui-surface);box-shadow:var(--aui-shadow-subtle)"></i></span></div>`; break
    case 'agreement': body = `<div style="background:var(--aui-surface-muted);border-radius:var(--aui-radius-card);padding:var(--aui-component-agreement-padding)"><strong>전체 동의</strong><hr style="margin:var(--aui-space-3) 0;border:0;border-top:1px solid var(--aui-border-subtle)"/>${choices(p,'checkbox')}</div>`; break
    case 'tabs': body = `<div style="display:flex;gap:var(--aui-space-4);border-bottom:1px solid var(--aui-border-subtle)">${lines(p.options).map((v,i)=>`<span style="padding:var(--aui-space-3) var(--aui-component-tabs-trigger-padding-inline);color:${i===0?'var(--aui-primary)':'var(--aui-text-muted)'};border-bottom:${i===0?'var(--aui-component-tabs-indicator-height) solid var(--aui-primary)':'none'}">${escapeHtml(v)}</span>`).join('')}</div>`; break
    case 'stepper': { const current = Math.max(0, Number(p.value) || 0); body = `<ol style="display:flex;list-style:none;padding:0;gap:var(--aui-component-stepper-item-gap)">${lines(p.options).map((v,i)=>`<li style="display:flex;align-items:center;gap:var(--aui-space-2);color:${i<=current?'var(--aui-primary)':'var(--aui-text-muted)'}"><b style="display:grid;place-items:center;width:var(--aui-component-stepper-indicator-size);height:var(--aui-component-stepper-indicator-size);border-radius:50%;background:${i<=current?'var(--aui-primary)':'var(--aui-fill)'};color:${i<=current?'var(--aui-on-primary)':'inherit'}">${i+1}</b>${escapeHtml(v)}</li>`).join('')}</ol>`; break }
    case 'navigation': body = `<nav style="display:flex;flex-direction:${p.orientation==='vertical'?'column':'row'};gap:var(--aui-space-1);padding:var(--aui-space-2);background:var(--aui-surface)">${lines(p.options).map((v,i)=>`<span style="min-height:${p.density==='compact'?'var(--aui-component-navigation-compact-item-height)':'var(--aui-component-navigation-item-height)'};display:flex;align-items:center;padding:0 var(--aui-space-3);border-radius:var(--aui-radius-control);background:${i===0?'var(--aui-primary-soft)':'transparent'};color:${i===0?'var(--aui-primary-heavy)':'var(--aui-text-muted)'};font-size:var(--aui-type-label-size);font-weight:${i===0?'var(--aui-weight-semibold)':'var(--aui-weight-medium)'}">${escapeHtml(v)}</span>`).join('')}</nav>`; break
    case 'breadcrumb': body = `<nav>${lines(p.options).map(escapeHtml).join(' <span style="color:var(--aui-text-assistive)">›</span> ')}</nav>`; break
    case 'badge': { const tone = p.state === 'success' ? 'var(--aui-positive)' : p.state === 'warning' ? 'var(--aui-caution)' : 'var(--aui-text-muted)'; body = `<span style="display:inline-flex;padding:var(--aui-space-1) var(--aui-space-2);border-radius:var(--aui-radius-pill);background:var(--aui-fill);color:${tone};font-size:var(--aui-type-meta-size);font-weight:var(--aui-weight-semibold)">${escapeHtml(label)}</span>`; break }
    case 'avatar': body = `<span style="display:grid;place-items:center;width:var(--aui-component-avatar-default-size);height:var(--aui-component-avatar-default-size);border-radius:50%;background:var(--aui-primary-soft);color:var(--aui-primary-heavy);font-weight:var(--aui-weight-bold)">${escapeHtml(label.slice(0,2).toUpperCase())}</span>`; break
    case 'card': case 'panel': body = `<article style="${css.surface};${p.emphasis==='bordered'?css.border:''};${p.emphasis==='raised'?'box-shadow:var(--aui-shadow-card);':''}padding:var(--aui-component-card-padding)"><strong style="font-size:var(--aui-type-section-title-size);line-height:var(--aui-type-section-title-leading)">${escapeHtml(p.title)}</strong><p style="${css.muted};margin:var(--aui-component-card-header-gap) 0 0;line-height:var(--aui-leading-normal)">${escapeHtml(p.description)}</p></article>`; break
    case 'list-cell': body = `<div style="box-sizing:border-box;min-height:${p.density==='touch'?'var(--aui-component-data-display-row-touch-height)':'var(--aui-component-data-display-row-height)'};padding:var(--aui-component-data-display-row-padding-block) 0;display:flex;align-items:center;justify-content:space-between;gap:var(--aui-space-3);border-bottom:1px solid var(--aui-border-subtle)"><span style="font-weight:var(--aui-weight-semibold)">${escapeHtml(label)}</span><span style="${css.muted}">›</span></div>`; break
    case 'list-section': body = `<section style="${css.surface};${p.emphasis==='bordered'?css.border:''};border-radius:var(--aui-radius-card);overflow:hidden"><header style="padding:var(--aui-component-list-section-block-padding) var(--aui-component-list-section-inset);font-weight:var(--aui-weight-bold)">${escapeHtml(p.title)}</header>${lines(p.options).map(v=>`<div style="min-height:var(--aui-component-data-display-row-height);display:flex;align-items:center;padding:var(--aui-component-data-display-row-padding-block) var(--aui-component-list-section-inset);border-top:1px solid var(--aui-border-subtle)">${escapeHtml(v)}</div>`).join('')}</section>`; break
    case 'table': body = `<div style="overflow:auto"><table style="width:100%;min-width:var(--aui-component-table-min-width);border-collapse:collapse"><caption style="text-align:left;font-weight:var(--aui-weight-bold);padding:var(--aui-space-3)">${escapeHtml(p.title)}</caption><thead><tr>${lines(p.options).map(v=>`<th style="text-align:left;padding:var(--aui-space-3);background:var(--aui-fill)">${escapeHtml(v)}</th>`).join('')}</tr></thead><tbody>${lines(p.description).map(row=>`<tr>${row.split('|').map(cell=>`<td style="padding:var(--aui-space-3);border-bottom:1px solid var(--aui-border-subtle)">${escapeHtml(cell.trim())}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; break
    case 'metric': body = `<div style="display:grid;gap:var(--aui-space-1)"><span style="${css.muted};font-size:var(--aui-type-caption-size)">${escapeHtml(label)}</span><strong style="font-size:var(--aui-type-display-size);line-height:var(--aui-type-display-leading)">${escapeHtml(p.value || '1,248')}</strong><small style="color:var(--aui-positive)">${escapeHtml(p.description)}</small></div>`; break
    case 'bar-chart': { const data = lines(p.options).map((item,index)=>{ const [name,raw] = item.split(':'); return { name: name || `항목 ${index+1}`, value: Math.max(0,Number(raw)||0) } }); const max = Math.max(1,...data.map(item=>item.value)); body = `<figure style="margin:0;display:grid;gap:var(--aui-space-3)"><figcaption style="font-weight:var(--aui-weight-semibold)">${escapeHtml(p.title)}</figcaption><div style="height:var(--aui-component-bar-chart-plot-height);display:flex;align-items:flex-end;gap:var(--aui-component-bar-chart-bar-gap)">${data.map(item=>`<i aria-label="${escapeHtml(item.name)} ${item.value}" style="flex:1;height:${item.value/max*100}%;background:var(--aui-primary);border-radius:var(--aui-radius-sm) var(--aui-radius-sm) 0 0"></i>`).join('')}</div></figure>`; break }
    case 'prose': body = `<article style="max-width:var(--aui-component-prose-readable-width)"><h3 style="margin:0;font-size:var(--aui-type-section-title-size);line-height:var(--aui-type-section-title-leading)">${escapeHtml(p.title)}</h3><p style="margin:var(--aui-space-2) 0 0;line-height:var(--aui-leading-relaxed);${css.muted}">${escapeHtml(p.description)}</p></article>`; break
    case 'responsive-grid': body = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,var(--aui-component-responsive-grid-min-item-width)),1fr));gap:var(--aui-component-responsive-grid-gap)">${lines(p.options).map(v=>`<div style="${css.surface};${css.border};padding:var(--aui-space-4)">${escapeHtml(v)}</div>`).join('')}</div>`; break
    case 'detail-header': body = `<header style="padding-bottom:var(--aui-component-detail-header-padding-bottom);border-bottom:1px solid var(--aui-border-subtle)"><small style="color:var(--aui-primary)">DETAIL</small><h2>${escapeHtml(p.title)}</h2><p style="${css.muted}">${escapeHtml(p.description)}</p></header>`; break
    case 'progress': { const value = Math.max(0, Math.min(100, Number(p.value) || 0)); body = `<div><div style="display:flex;justify-content:space-between"><span>${escapeHtml(label)}</span><span>${value}%</span></div><div style="height:var(--aui-component-feedback-progress-height);background:var(--aui-fill);border-radius:var(--aui-radius-pill);overflow:hidden"><i style="display:block;width:${value}%;height:100%;background:var(--aui-primary)"></i></div></div>`; break }
    case 'alert': case 'toast': body = `<div role="status" style="padding:var(--aui-component-feedback-inset);border-radius:var(--aui-component-feedback-radius);background:var(--aui-primary-soft);color:var(--aui-primary-heavy)"><strong>${escapeHtml(label)}</strong> ${escapeHtml(p.description)}</div>`; break
    case 'loading': body = `<div role="status" style="display:flex;align-items:center;gap:var(--aui-space-3)"><i style="width:var(--aui-icon-lg);height:var(--aui-icon-lg);border:2px solid var(--aui-fill-strong);border-top-color:var(--aui-primary);border-radius:50%"></i><span>${escapeHtml(p.description || '불러오고 있어요.')}</span></div>`; break
    case 'empty-state': case 'result': body = `<section style="text-align:center;padding:var(--aui-component-result-padding-block) var(--aui-component-result-padding-inline)"><strong>${escapeHtml(p.title)}</strong><p style="${css.muted}">${escapeHtml(p.description)}</p>${button(label)}</section>`; break
    case 'dialog': case 'sheet': case 'popover': case 'tooltip': case 'dropdown-menu': body = `<div style="${css.surface};${css.border};padding:${id==='popover'?'var(--aui-component-popover-padding)':'var(--aui-component-dialog-compact-padding)'};box-shadow:var(--aui-shadow-elevated);max-width:${id==='dialog'?'var(--aui-component-overlay-dialog-width)':'100%'}"><strong>${escapeHtml(p.title || humanize(id))}</strong><p style="${css.muted}">${escapeHtml(p.description)}</p>${id==='tooltip'?'':button(label)}</div>`; break
    default: body = `<div style="${css.surface};${css.border};padding:var(--aui-space-4)"><strong>${escapeHtml(label)}</strong><p style="${css.muted}">${escapeHtml(p.description)}</p></div>`
  }
  return `<div data-wonhee-component="${id}" style="${css.wrap}">${body}</div>`
}

const registryIds = Object.values(AUI_COMPONENT_CATEGORIES).flat()
function dict(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
const propertyLabels: Record<string, string> = {
  size: '크기', width: '너비', height: '높이', emphasis: '표현', state: '상태', variant: '유형',
  layout: '배치', orientation: '방향', density: '밀도', position: '위치', alignment: '정렬',
  required: '필수 입력', side: '방향', navigation: '내비게이션', inspector: '상세 패널',
  'show-actions': '액션 표시', 'show-subtitle': '보조 설명 표시', 'item-count': '항목 수',
  'action-count': '버튼 수', 'heading-level': '제목 단계',
}
function recipeSchema(id: string): { defaults: Record<string,string>; schema: PropSchema[]; deviceDefaults: ComponentDefinition['deviceDefaults'] } {
  const item = AUI_COMPONENT_RECIPES[id] ?? {}
  const family = typeof item.family === 'string' ? AUI_COMPONENT_RECIPE_FAMILIES[item.family] ?? {} : {}
  const properties = { ...dict(family.properties), ...dict(item.properties) }
  const recipeDefaults = Object.fromEntries(Object.entries(dict(item.default)).map(([key,value])=>[key,String(value)]))
  const propertySchema: PropSchema[] = Object.entries(properties).flatMap(([key,value]) => Array.isArray(value) ? [{ key, label: propertyLabels[key] ?? humanize(key), type: 'select' as const, options: value.map(String), group: key === 'state' ? 'state' as const : 'style' as const, display: value.length <= 4 ? 'segmented' as const : 'default' as const }] : [])
  const responsive = dict(family.responsive)
  const compact = Object.fromEntries(Object.entries(dict(responsive.compact)).filter(([key])=>key in properties).map(([key,value])=>[key,String(value)]))
  const wide = Object.fromEntries(Object.entries(dict(responsive.wide)).filter(([key])=>key in properties).map(([key,value])=>[key,String(value)]))
  return { defaults: recipeDefaults, schema: propertySchema, deviceDefaults: { mobile: compact, desktop: wide } }
}
export const WONHEE_PLAYGROUND_COMPONENTS: ComponentDefinition[] = registryIds.map((id) => {
  const categoryId = Object.entries(AUI_COMPONENT_CATEGORIES).find(([,ids])=>ids.includes(id))?.[0] ?? 'data-display'
  const contract = AUI_COMPONENTS[id] ?? {}
  const contractPurpose = typeof contract.purpose === 'string' ? contract.purpose : ''
  const recipe = recipeSchema(id)
  const canvasBehavior: ComponentDefinition['canvasBehavior'] =
    ['bottom-app-bar', 'fixed-bottom-cta'].includes(id) ? 'fixed-bottom' :
    ['app-header', 'top-navigation', 'global-navigation', 'app-footer', 'workspace-shell'].includes(id) ? 'full-width' : 'stack'
  return {
    id,
    name: humanize(id),
    icon: icon(id),
    designSystem: 'wonhee',
    category: categoryMap[categoryId] ?? 'content',
    description: /[가-힣]/.test(contractPurpose) ? contractPurpose : `${humanize(id)} 컴포넌트의 콘텐츠와 표시 방식을 편집합니다.`,
    canvasBehavior,
    source: { storybookTitle: `Components/${humanize(id)}`, packageName: '@wonhee/design-system', importCode: `import { ${humanize(id).replaceAll(' ','')} } from '@wonhee/design-system';`, variants: Array.isArray(contract.variants) ? contract.variants.map(String) : [] },
    defaultProps: { ...defaults, ...recipe.defaults, label: humanize(id), title: humanize(id), ...contentDefaults[id] },
    supportedDevices: mobileOnly.has(id) ? ['mobile'] : desktopOnly.has(id) ? ['desktop'] : ['mobile', 'desktop'],
    deviceDefaults: recipe.deviceDefaults,
    propSchema: schemaFor(id, recipe.schema),
    renderHTML: (props) => render(id, props),
  }
})

export const WONHEE_PLAYGROUND_COMPONENT_IDS = registryIds

const duplicateIds = registryIds.filter((id, index) => registryIds.indexOf(id) !== index)
const missingDefinitions = registryIds.filter((id) => !AUI_COMPONENTS[id])
if (duplicateIds.length || missingDefinitions.length || WONHEE_PLAYGROUND_COMPONENTS.length !== registryIds.length) {
  throw new Error(`Wonhee Playground catalog parity failed: duplicate=${duplicateIds.join(',') || 'none'} missing=${missingDefinitions.join(',') || 'none'}`)
}
