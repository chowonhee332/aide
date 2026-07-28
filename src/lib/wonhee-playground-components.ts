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

const defaults: Record<string, string> = {
  label: '레이블', description: '컴포넌트 설명을 입력하세요.', variant: 'primary', state: 'default',
  options: '첫 번째\n두 번째\n세 번째', value: '', title: '제목', placeholder: '내용을 입력하세요',
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
    case 'field': case 'search': case 'number-field': case 'select': body = field(p); break
    case 'textarea': body = field(p,true); break
    case 'field-group': body = `<fieldset style="${css.border};border-radius:var(--aui-radius-card);padding:var(--aui-space-4)"><legend>${escapeHtml(p.title)}</legend>${field(p)}</fieldset>`; break
    case 'slider': body = `<label>${escapeHtml(label)} <input type="range" value="60" style="width:100%;accent-color:var(--aui-primary);min-height:var(--aui-component-slider-target-height)"/></label>`; break
    case 'keypad': body = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--aui-component-keypad-gap);padding:var(--aui-component-keypad-inset)">${['1','2','3','4','5','6','7','8','9','⌫','0','확인'].map(v=>`<button style="${css.control};border:0;background:var(--aui-fill)">${v}</button>`).join('')}</div>`; break
    case 'checkbox': body = choices(p,'checkbox'); break
    case 'radio': body = choices(p,'radio'); break
    case 'chip': case 'segmented-control': body = choices(p,'chip'); break
    case 'switch': body = `<div style="min-height:${p.size==='touch'?'var(--aui-target-touch)':'var(--aui-control-default)'};display:flex;justify-content:space-between;align-items:center;gap:var(--aui-space-3)"><span>${escapeHtml(label)}</span><span style="box-sizing:border-box;width:var(--aui-component-selection-switch-width);height:var(--aui-component-selection-switch-height);padding:var(--aui-component-selection-switch-inset);border-radius:var(--aui-radius-pill);background:var(--aui-primary);display:flex;justify-content:flex-end"><i style="width:var(--aui-component-selection-switch-thumb-size);height:var(--aui-component-selection-switch-thumb-size);border-radius:50%;background:var(--aui-surface);box-shadow:var(--aui-shadow-subtle)"></i></span></div>`; break
    case 'agreement': body = `<div style="background:var(--aui-surface-muted);border-radius:var(--aui-radius-card);padding:var(--aui-component-agreement-padding)"><strong>전체 동의</strong><hr style="margin:var(--aui-space-3) 0;border:0;border-top:1px solid var(--aui-border-subtle)"/>${choices(p,'checkbox')}</div>`; break
    case 'tabs': body = `<div style="display:flex;gap:var(--aui-space-4);border-bottom:1px solid var(--aui-border-subtle)">${lines(p.options).map((v,i)=>`<span style="padding:var(--aui-space-3) var(--aui-component-tabs-trigger-padding-inline);color:${i===0?'var(--aui-primary)':'var(--aui-text-muted)'};border-bottom:${i===0?'var(--aui-component-tabs-indicator-height) solid var(--aui-primary)':'none'}">${escapeHtml(v)}</span>`).join('')}</div>`; break
    case 'stepper': body = `<ol style="display:flex;list-style:none;padding:0;gap:var(--aui-component-stepper-item-gap)">${lines(p.options).map((v,i)=>`<li style="display:flex;align-items:center;gap:var(--aui-space-2);color:${i===0?'var(--aui-primary)':'var(--aui-text-muted)'}"><b style="display:grid;place-items:center;width:var(--aui-component-stepper-indicator-size);height:var(--aui-component-stepper-indicator-size);border-radius:50%;background:${i===0?'var(--aui-primary)':'var(--aui-fill)'};color:${i===0?'var(--aui-on-primary)':'inherit'}">${i+1}</b>${escapeHtml(v)}</li>`).join('')}</ol>`; break
    case 'navigation': body = `<nav style="display:flex;flex-direction:${p.orientation==='vertical'?'column':'row'};gap:var(--aui-space-1);padding:var(--aui-space-2);background:var(--aui-surface)">${lines(p.options).map((v,i)=>`<span style="min-height:${p.density==='compact'?'var(--aui-component-navigation-compact-item-height)':'var(--aui-component-navigation-item-height)'};display:flex;align-items:center;padding:0 var(--aui-space-3);border-radius:var(--aui-radius-control);background:${i===0?'var(--aui-primary-soft)':'transparent'};color:${i===0?'var(--aui-primary-heavy)':'var(--aui-text-muted)'};font-size:var(--aui-type-label-size);font-weight:${i===0?'var(--aui-weight-semibold)':'var(--aui-weight-medium)'}">${escapeHtml(v)}</span>`).join('')}</nav>`; break
    case 'breadcrumb': body = `<nav>${lines(p.options).map(escapeHtml).join(' <span style="color:var(--aui-text-assistive)">›</span> ')}</nav>`; break
    case 'badge': body = `<span style="display:inline-flex;padding:var(--aui-space-1) var(--aui-space-2);border-radius:var(--aui-radius-pill);background:var(--aui-primary-soft);color:var(--aui-primary-heavy);font-size:var(--aui-type-meta-size);font-weight:var(--aui-weight-semibold)">${escapeHtml(label)}</span>`; break
    case 'avatar': body = `<span style="display:grid;place-items:center;width:var(--aui-component-avatar-default-size);height:var(--aui-component-avatar-default-size);border-radius:50%;background:var(--aui-primary-soft);color:var(--aui-primary-heavy);font-weight:var(--aui-weight-bold)">W</span>`; break
    case 'card': case 'panel': body = `<article style="${css.surface};${p.emphasis==='bordered'?css.border:''};${p.emphasis==='raised'?'box-shadow:var(--aui-shadow-card);':''}padding:var(--aui-component-card-padding)"><strong style="font-size:var(--aui-type-section-title-size);line-height:var(--aui-type-section-title-leading)">${escapeHtml(p.title)}</strong><p style="${css.muted};margin:var(--aui-component-card-header-gap) 0 0;line-height:var(--aui-leading-normal)">${escapeHtml(p.description)}</p></article>`; break
    case 'list-cell': body = `<div style="box-sizing:border-box;min-height:${p.density==='touch'?'var(--aui-component-data-display-row-touch-height)':'var(--aui-component-data-display-row-height)'};padding:var(--aui-component-data-display-row-padding-block) 0;display:flex;align-items:center;justify-content:space-between;gap:var(--aui-space-3);border-bottom:1px solid var(--aui-border-subtle)"><span style="font-weight:var(--aui-weight-semibold)">${escapeHtml(label)}</span><span style="${css.muted}">›</span></div>`; break
    case 'list-section': body = `<section style="${css.surface};${p.emphasis==='bordered'?css.border:''};border-radius:var(--aui-radius-card);overflow:hidden"><header style="padding:var(--aui-component-list-section-block-padding) var(--aui-component-list-section-inset);font-weight:var(--aui-weight-bold)">${escapeHtml(p.title)}</header>${lines(p.options).map(v=>`<div style="min-height:var(--aui-component-data-display-row-height);display:flex;align-items:center;padding:var(--aui-component-data-display-row-padding-block) var(--aui-component-list-section-inset);border-top:1px solid var(--aui-border-subtle)">${escapeHtml(v)}</div>`).join('')}</section>`; break
    case 'table': body = `<div style="overflow:auto"><table style="width:100%;min-width:var(--aui-component-table-min-width);border-collapse:collapse"><caption style="text-align:left;font-weight:var(--aui-weight-bold);padding:var(--aui-space-3)">${escapeHtml(p.title)}</caption><thead><tr>${lines(p.options).map(v=>`<th style="text-align:left;padding:var(--aui-space-3);background:var(--aui-fill)">${escapeHtml(v)}</th>`).join('')}</tr></thead><tbody><tr>${lines(p.options).map((_,i)=>`<td style="padding:var(--aui-space-3);border-bottom:1px solid var(--aui-border-subtle)">데이터 ${i+1}</td>`).join('')}</tr></tbody></table></div>`; break
    case 'metric': body = `<div style="display:grid;gap:var(--aui-space-1)"><span style="${css.muted};font-size:var(--aui-type-caption-size)">${escapeHtml(label)}</span><strong style="font-size:var(--aui-type-display-size);line-height:var(--aui-type-display-leading)">1,248</strong><small style="color:var(--aui-positive)">▲ 12.4%</small></div>`; break
    case 'bar-chart': body = `<figure style="margin:0;display:grid;gap:var(--aui-space-3)"><figcaption style="font-weight:var(--aui-weight-semibold)">${escapeHtml(p.title)}</figcaption><div style="height:var(--aui-component-bar-chart-plot-height);display:flex;align-items:flex-end;gap:var(--aui-component-bar-chart-bar-gap)">${[60,90,45,75].map((v,i)=>`<i aria-label="항목 ${i+1} ${v}" style="flex:1;height:${v}%;background:var(--aui-primary);border-radius:var(--aui-radius-sm) var(--aui-radius-sm) 0 0"></i>`).join('')}</div></figure>`; break
    case 'prose': body = `<article style="max-width:var(--aui-component-prose-readable-width)"><h3 style="margin:0;font-size:var(--aui-type-section-title-size);line-height:var(--aui-type-section-title-leading)">${escapeHtml(p.title)}</h3><p style="margin:var(--aui-space-2) 0 0;line-height:var(--aui-leading-relaxed);${css.muted}">${escapeHtml(p.description)}</p></article>`; break
    case 'responsive-grid': body = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,var(--aui-component-responsive-grid-min-item-width)),1fr));gap:var(--aui-component-responsive-grid-gap)">${lines(p.options).map(v=>`<div style="${css.surface};${css.border};padding:var(--aui-space-4)">${escapeHtml(v)}</div>`).join('')}</div>`; break
    case 'detail-header': body = `<header style="padding-bottom:var(--aui-component-detail-header-padding-bottom);border-bottom:1px solid var(--aui-border-subtle)"><small style="color:var(--aui-primary)">DETAIL</small><h2>${escapeHtml(p.title)}</h2><p style="${css.muted}">${escapeHtml(p.description)}</p></header>`; break
    case 'progress': body = `<div><div style="display:flex;justify-content:space-between"><span>${escapeHtml(label)}</span><span>60%</span></div><div style="height:var(--aui-component-feedback-progress-height);background:var(--aui-fill);border-radius:var(--aui-radius-pill);overflow:hidden"><i style="display:block;width:60%;height:100%;background:var(--aui-primary)"></i></div></div>`; break
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
function recipeSchema(id: string): { defaults: Record<string,string>; schema: PropSchema[]; deviceDefaults: ComponentDefinition['deviceDefaults'] } {
  const item = AUI_COMPONENT_RECIPES[id] ?? {}
  const family = typeof item.family === 'string' ? AUI_COMPONENT_RECIPE_FAMILIES[item.family] ?? {} : {}
  const properties = { ...dict(family.properties), ...dict(item.properties) }
  const recipeDefaults = Object.fromEntries(Object.entries(dict(item.default)).map(([key,value])=>[key,String(value)]))
  const propertySchema: PropSchema[] = Object.entries(properties).flatMap(([key,value]) => Array.isArray(value) ? [{ key, label: humanize(key), type: 'select' as const, options: value.map(String), group: key === 'state' ? 'state' as const : 'style' as const, display: value.length <= 4 ? 'segmented' as const : 'default' as const }] : [])
  const responsive = dict(family.responsive)
  const compact = Object.fromEntries(Object.entries(dict(responsive.compact)).filter(([key])=>key in properties).map(([key,value])=>[key,String(value)]))
  const wide = Object.fromEntries(Object.entries(dict(responsive.wide)).filter(([key])=>key in properties).map(([key,value])=>[key,String(value)]))
  return { defaults: recipeDefaults, schema: propertySchema, deviceDefaults: { mobile: compact, desktop: wide } }
}
export const WONHEE_PLAYGROUND_COMPONENTS: ComponentDefinition[] = registryIds.map((id) => {
  const categoryId = Object.entries(AUI_COMPONENT_CATEGORIES).find(([,ids])=>ids.includes(id))?.[0] ?? 'data-display'
  const contract = AUI_COMPONENTS[id] ?? {}
  const recipe = recipeSchema(id)
  const canvasBehavior: ComponentDefinition['canvasBehavior'] =
    ['bottom-app-bar', 'fixed-bottom-cta'].includes(id) ? 'fixed-bottom' :
    ['dialog', 'sheet'].includes(id) ? 'modal' :
    ['app-header', 'top-navigation', 'global-navigation', 'app-footer', 'workspace-shell'].includes(id) ? 'full-width' : 'stack'
  return {
    id,
    name: humanize(id),
    icon: icon(id),
    designSystem: 'wonhee',
    category: categoryMap[categoryId] ?? 'content',
    description: typeof contract.purpose === 'string' ? contract.purpose : `${humanize(id)} component from wonhee-product-ui.md`,
    canvasBehavior,
    source: { storybookTitle: `Components/${humanize(id)}`, packageName: '@wonhee/design-system', importCode: `import { ${humanize(id).replaceAll(' ','')} } from '@wonhee/design-system';`, variants: Array.isArray(contract.variants) ? contract.variants.map(String) : [] },
    defaultProps: { ...defaults, ...recipe.defaults, label: humanize(id), title: humanize(id) },
    deviceDefaults: recipe.deviceDefaults,
    propSchema: [...labelSchema.filter((field)=>!recipe.schema.some((property)=>property.key===field.key)), ...recipe.schema],
    renderHTML: (props) => render(id, props),
  }
})

export const WONHEE_PLAYGROUND_COMPONENT_IDS = registryIds

const duplicateIds = registryIds.filter((id, index) => registryIds.indexOf(id) !== index)
const missingDefinitions = registryIds.filter((id) => !AUI_COMPONENTS[id])
if (duplicateIds.length || missingDefinitions.length || WONHEE_PLAYGROUND_COMPONENTS.length !== registryIds.length) {
  throw new Error(`Wonhee Playground catalog parity failed: duplicate=${duplicateIds.join(',') || 'none'} missing=${missingDefinitions.join(',') || 'none'}`)
}
