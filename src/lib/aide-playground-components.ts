import type { ComponentCategory, ComponentDefinition, PropSchema } from './builder-types'
import { AUI_COMPONENT_CATEGORIES, AUI_COMPONENTS, AUI_COMPONENT_RECIPES, AUI_COMPONENT_RECIPE_FAMILIES } from './aide-product-tokens'

const categoryMap: Record<string, ComponentCategory> = {
  actions: 'action', inputs: 'input', selection: 'selection', navigation: 'navigation',
  layout: 'layout', 'data-display': 'data', feedback: 'feedback', overlays: 'overlay',
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
  chip: [{ key: 'options', label: '칩 목록', type: 'textarea', group: 'content' }, { key: 'variant', label: '유형', type: 'select', options: ['solid', 'outlined'], group: 'style' }],
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
  label: 'Label', description: 'Add a short component description.', variant: 'primary', state: 'default',
  options: 'First\nSecond\nThird', value: '', title: 'Title', placeholder: 'Enter content',
}

const contentDefaults: Record<string, Record<string, string>> = {
  button: { label: 'Continue' },
  'icon-button': { label: 'Notifications' },
  'action-bar': { label: 'Save changes' },
  'fixed-bottom-cta': { label: 'Continue', 'action-count': '1' },
  field: { label: 'Project name', placeholder: 'Enter a project name', help: 'Use a name your team will recognize.' },
  'field-group': { title: 'Basic information', description: 'Complete the required fields.', options: 'Name\nEmail\nPhone' },
  textarea: { label: 'Description', placeholder: 'Enter a description' },
  select: { label: 'Category', options: 'Planning\nDesign\nDevelopment', value: 'Planning' },
  search: { label: 'Search', placeholder: 'Search projects' },
  'number-field': { label: 'Quantity', value: '3', min: '1', max: '10' },
  slider: { label: 'Completion', value: '72', min: '0', max: '100' },
  checkbox: { label: 'Interests', options: 'Product strategy\nUI design\nFrontend' },
  radio: { label: 'Notifications', options: 'All notifications\nImportant only\nNone' },
  switch: { label: 'Enable notifications' },
  agreement: { title: 'Terms and conditions', options: '[Required] Terms of service\n[Required] Privacy policy\n[Optional] Marketing updates' },
  tabs: { label: 'Content tabs', options: 'Overview\nProgress\nActivity' },
  'segmented-control': { label: 'View', options: 'Day\nWeek\nMonth' },
  chip: { label: 'Filter', options: 'All\nActive\nCompleted', variant: 'solid' },
  stepper: { label: 'Progress', options: 'Information\nReview\nComplete', value: '1' },
  navigation: { label: 'Main navigation', options: 'Home\nProjects\nReports' },
  'app-header': { title: 'Workspace', options: 'Home\nProjects\nReports' },
  'global-navigation': { title: 'Workspace', options: 'Dashboard\nTasks\nReports' },
  'local-navigation': { title: 'Projects', options: 'Overview\nSchedule\nMembers' },
  'top-navigation': { title: 'Project details', description: 'Review current project information.' },
  'side-navigation': { title: 'Workspace', options: 'Dashboard\nProjects\nSettings' },
  'bottom-app-bar': { options: 'Home\nSearch\nProfile', 'item-count': '3' },
  'app-footer': { title: 'Aide', description: 'Build better product experiences.', options: 'About\nTerms\nContact' },
  breadcrumb: { options: 'Home\nProjects\nDetails' },
  badge: { label: 'In progress' },
  avatar: { label: 'Alex Kim' },
  card: { title: 'Project status', description: 'Review key milestones and current progress.' },
  panel: { title: 'Summary', description: 'Details for the selected item appear here.' },
  'list-cell': { label: 'Project name', description: 'Updated 10 minutes ago' },
  'list-section': { title: 'Recent projects', description: 'Your recently edited projects.', options: 'Mobile app refresh\nAdmin portal\nDesign system' },
  table: { title: 'Project list', options: 'Project\nOwner\nStatus', description: 'Mobile app refresh | Alex Kim | In progress\nAdmin portal | Jamie Lee | In review' },
  metric: { label: 'Completed projects', value: '24', description: '3 more than last month' },
  'bar-chart': { title: 'Monthly completions', options: 'Jan:18\nFeb:24\nMar:32' },
  prose: { title: 'About the service', label: 'Core value', description: 'Help teams move from ideas to outcomes faster.' },
  'responsive-grid': { label: 'Key features', options: 'Project management\nProgress tracking\nTeam collaboration\nReports' },
  'detail-header': { title: 'Project details', label: 'Edit', description: 'Review project information and progress.' },
  'page-header': { title: 'Projects', label: 'New project', description: 'Manage all projects across your team.' },
  'section-header': { title: 'Recent activity', label: 'View all', description: 'The latest changes across your projects.' },
  'side-panel': { title: 'Details', description: 'Review and edit the selected item.' },
  'workspace-shell': { title: 'Task management', description: 'Review the work planned for today.', options: 'Dashboard\nRequests\nReports' },
  progress: { label: 'Project completion', value: '68' },
  alert: { label: 'Action required', description: 'Complete the missing required information.' },
  toast: { label: 'Changes saved', description: 'Your changes were saved successfully.' },
  loading: { description: 'Loading content...' },
  'empty-state': { title: 'No projects yet', description: 'Create a project to get started.' },
  result: { title: 'Request complete', label: 'Done', description: 'We sent the result to your email.' },
  dialog: { title: 'Save your changes?', label: 'Save changes', description: 'You have unsaved changes.' },
  sheet: { title: 'Filters', label: 'Open filters', description: 'Choose the filters you want to apply.' },
  popover: { title: 'Quick tip', label: 'Help', description: 'Find more information about this item.' },
  tooltip: { title: 'Help', label: 'View help', description: 'More information' },
  'dropdown-menu': { title: 'More actions', label: 'Open menu', options: 'Rename\nDuplicate\nDelete' },
}

function escapeHtml(value: string | undefined) {
  return (value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}
function lines(value: string | undefined) { return (value ?? '').split('\n').map((item) => item.trim()).filter(Boolean) }
function humanize(id: string) { return id.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ') }
function icon(id: string) { return ({ button: 'B', field: 'T', navigation: 'N', card: 'C', dialog: 'D', table: '▦', loading: '◌' } as Record<string,string>)[id] ?? humanize(id)[0] ?? 'W' }

const css = {
  wrap: 'box-sizing:border-box;font-family:var(--aui-type-body-family);font-size:var(--aui-type-body-size);line-height:var(--aui-type-body-leading);color:var(--aui-text);padding:var(--aui-space-4)',
  surface: 'background:var(--aui-surface);border-radius:var(--aui-component-card-radius)',
  border: 'border:1px solid var(--aui-border-subtle)',
  control: 'box-sizing:border-box;min-height:var(--aui-control-default);border-radius:var(--aui-component-button-radius);font:var(--aui-weight-medium) var(--aui-type-body-size)/var(--aui-type-body-leading) var(--aui-type-body-family);letter-spacing:var(--aui-type-body-tracking)',
  muted: 'color:var(--aui-text-muted)',
}

function button(label: string, variant = 'primary', size = 'default', width = 'hug') {
  const height = size === 'compact' ? 'var(--aui-component-button-compact-height)' : size === 'touch' ? 'var(--aui-component-button-touch-height)' : size === 'prominent' ? 'var(--aui-component-button-prominent-height)' : 'var(--aui-component-button-default-height)'
  const padding = size === 'compact' ? 'var(--aui-component-button-compact-padding-x)' : size === 'prominent' ? 'var(--aui-component-button-prominent-padding-x)' : 'var(--aui-component-button-default-padding-x)'
  const styles: Record<string, string> = {
    primary: 'border:1px solid transparent;background:var(--aui-primary);color:var(--aui-on-primary)',
    secondary: 'border:1px solid transparent;background:var(--aui-fill);color:var(--aui-text)',
    outline: 'border:1px solid var(--aui-border);background:var(--aui-surface);color:var(--aui-text)',
    ghost: 'border:1px solid transparent;background:transparent;color:var(--aui-text)',
    destructive: 'border:1px solid transparent;background:var(--aui-negative);color:var(--aui-on-primary)',
    link: 'border:1px solid transparent;background:transparent;color:var(--aui-primary);text-decoration:underline;text-underline-offset:4px',
  }
  return `<button style="${css.control};height:${height};${width==='fill'?'width:100%;':''}padding:0 ${padding};${styles[variant] ?? styles.primary}">${escapeHtml(label)}</button>`
}
function field(p: Record<string,string>, textarea = false) {
  const tag = textarea ? 'div' : 'div'
  const height = p.size === 'compact' ? 'var(--aui-component-field-compact-height)' : p.size === 'touch' ? 'var(--aui-component-field-touch-height)' : 'var(--aui-component-field-default-height)'
  return `<label style="display:grid;gap:var(--aui-component-field-label-gap)"><span style="font-size:var(--aui-type-caption-size);line-height:var(--aui-type-caption-leading);font-weight:var(--aui-weight-semibold)">${escapeHtml(p.label)}</span><${tag} style="${css.control};border:0;box-shadow:inset 0 0 0 1px var(--aui-border);border-radius:var(--aui-component-field-radius);display:flex;align-items:${textarea ? 'flex-start' : 'center'};min-height:${textarea ? (p.size==='touch'?'var(--aui-component-field-textarea-touch-min-height)':'var(--aui-component-field-textarea-min-height)') : height};padding:${textarea ? 'var(--aui-space-3)' : '0 var(--aui-component-field-padding-inline)'};background:var(--aui-surface);${css.muted}">${escapeHtml(p.value || p.placeholder)}</${tag}></label>`
}
function choices(p: Record<string,string>, kind: 'checkbox'|'radio'|'chip') {
  const target = p.size === 'touch' ? 'var(--aui-target-touch)' : 'var(--aui-control-default)'
  return `<div style="display:flex;gap:var(--aui-space-2);flex-wrap:wrap">${lines(p.options).map((option,index)=>kind === 'chip'
    ? `<span style="box-sizing:border-box;height:var(--aui-component-chip-height);display:inline-flex;align-items:center;gap:var(--aui-component-chip-gap);padding:4px var(--aui-component-chip-padding-inline);border-radius:var(--aui-component-chip-radius);background:${index===0?(p.variant==='outlined'?'color-mix(in srgb,var(--aui-primary) 5%,transparent)':'var(--aui-inverse-surface)'):(p.variant==='outlined'?'transparent':'var(--aui-fill-subtle)')};color:${index===0?(p.variant==='outlined'?'var(--aui-primary)':'var(--aui-component-chip-solid-active-content)'):'var(--aui-text)'};box-shadow:${p.variant==='outlined'?(index===0?'inset 0 0 0 1px var(--aui-component-chip-outlined-active-border)':'inset 0 0 0 1px var(--aui-border)'):'none'};font-size:var(--aui-type-body-size);line-height:1;font-weight:var(--aui-weight-medium)">${escapeHtml(option)}</span>`
    : `<label style="min-height:${target};display:flex;align-items:center;gap:var(--aui-component-control-gap)"><span style="box-sizing:border-box;width:var(--aui-component-selection-indicator-size);height:var(--aui-component-selection-indicator-size);border-radius:${kind==='radio'?'50%':'var(--aui-component-selection-checkbox-radius)'};border:0;background:${index===0?'var(--aui-primary)':'var(--aui-surface)'};box-shadow:${index===0?(kind==='radio'?'inset 0 0 0 6px var(--aui-primary)':'none'):'inset 0 0 0 1.5px var(--aui-border)'}"></span>${escapeHtml(option)}</label>`).join('')}</div>`
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
    case 'tabs': body = `<div style="min-height:var(--aui-component-tabs-list-height);display:flex;align-items:stretch;gap:var(--aui-component-tabs-list-gap);border-bottom:1px solid var(--aui-border-subtle)">${lines(p.options).map((v,i)=>`<span style="display:flex;align-items:center;padding:0 var(--aui-component-tabs-trigger-padding-inline);color:${i===0?'var(--aui-text)':'var(--aui-text-muted)'};border-bottom:${i===0?'var(--aui-component-tabs-indicator-height) solid var(--aui-primary)':'var(--aui-component-tabs-indicator-height) solid transparent'};font-size:17px;line-height:24px;font-weight:var(--aui-weight-semibold)">${escapeHtml(v)}</span>`).join('')}</div>`; break
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
  return `<div data-aide-component="${id}" style="${css.wrap}">${body}</div>`
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
export const AIDE_PLAYGROUND_COMPONENTS: ComponentDefinition[] = registryIds.map((id) => {
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
    designSystem: 'aide',
    category: categoryMap[categoryId] ?? 'content',
    description: /[가-힣]/.test(contractPurpose) ? contractPurpose : `${humanize(id)} 컴포넌트의 콘텐츠와 표시 방식을 편집합니다.`,
    canvasBehavior,
    source: { storybookTitle: `Components/${humanize(id)}`, packageName: '@aide/design-system', importCode: `import { ${humanize(id).replaceAll(' ','')} } from '@aide/design-system';`, variants: Array.isArray(contract.variants) ? contract.variants.map(String) : [] },
    defaultProps: { ...defaults, ...recipe.defaults, label: humanize(id), title: humanize(id), ...contentDefaults[id] },
    supportedDevices: mobileOnly.has(id) ? ['mobile'] : desktopOnly.has(id) ? ['desktop'] : ['mobile', 'desktop'],
    deviceDefaults: recipe.deviceDefaults,
    propSchema: schemaFor(id, recipe.schema),
    renderHTML: (props) => render(id, props),
  }
})

export const AIDE_PLAYGROUND_COMPONENT_IDS = registryIds

const duplicateIds = registryIds.filter((id, index) => registryIds.indexOf(id) !== index)
const missingDefinitions = registryIds.filter((id) => !AUI_COMPONENTS[id])
if (duplicateIds.length || missingDefinitions.length || AIDE_PLAYGROUND_COMPONENTS.length !== registryIds.length) {
  throw new Error(`Aide Playground catalog parity failed: duplicate=${duplicateIds.join(',') || 'none'} missing=${missingDefinitions.join(',') || 'none'}`)
}
