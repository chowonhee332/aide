import type { ComponentDefinition, ComponentSource } from './builder-types';
import { KTDS_TOKENS as K } from './ktds-tokens';

const C = K.color;
const R = K.radius;
const S = K.spacing;
const FONT = K.typography.fontFamily;

function escapeHtml(value: string | undefined): string {
  return (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function lines(value: string | undefined): string[] {
  return (value ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function source(component: string, variants: string[] = []): ComponentSource {
  return {
    storybookTitle: `Components/${component}`,
    packageName: '@ktds-ui/components',
    importCode: `import { ${component} } from '@ktds-ui/components';`,
    variants,
  };
}

const fieldLabel = (label: string, required = false) => `
  <div style="font-size:12px;font-weight:600;line-height:1.4;color:${C.textNeutral};margin-bottom:6px;">
    ${escapeHtml(label)}${required ? `<span style="color:${C.negative};margin-left:2px;">*</span>` : ''}
  </div>`;

export const KTDS_COMMON_COMPONENTS: ComponentDefinition[] = [
  {
    id: 'ktds-button',
    name: 'Button',
    icon: 'B',
    designSystem: 'ktds',
    category: 'action',
    description: '주요 행동과 보조 행동을 표현하는 KTDS 버튼입니다.',
    source: source('Button', ['primary', 'secondary', 'outline', 'ghost', 'negative', 'normal']),
    defaultProps: {
      label: '확인',
      secondaryLabel: '취소',
      tertiaryLabel: '이전',
      count: '1',
      variant: 'primary',
      size: 'M',
      layout: 'horizontal',
      fullWidth: 'true',
      disabled: 'false',
    },
    deviceDefaults: {
      mobile: { size: 'L', fullWidth: 'true' },
      desktop: { size: 'M', fullWidth: 'false' },
    },
    propSchema: [
      { key: 'label', label: '주 버튼 레이블', type: 'text', group: 'content' },
      { key: 'secondaryLabel', label: '보조 버튼 레이블', type: 'text', group: 'content' },
      { key: 'tertiaryLabel', label: '세 번째 버튼 레이블', type: 'text', group: 'content' },
      { key: 'count', label: '버튼 개수', type: 'select', options: ['1', '2', '3'], group: 'style', display: 'segmented' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'variant', label: '주 버튼 유형', type: 'select', options: ['primary', 'secondary', 'outline', 'ghost', 'negative', 'normal'], group: 'style' },
      { key: 'layout', label: '배치', type: 'select', options: ['horizontal', 'vertical'], group: 'style', display: 'segmented' },
      { key: 'fullWidth', label: '전체 너비', type: 'select', options: ['true', 'false'], group: 'style', display: 'segmented' },
      { key: 'disabled', label: '비활성', type: 'select', options: ['false', 'true'], group: 'state', display: 'segmented' },
    ],
    renderHTML: (p) => {
      const height = p.size === 'S' ? 32 : p.size === 'L' ? 48 : 40;
      const variants: Record<string, { bg: string; color: string; border: string }> = {
        primary: { bg: C.primary, color: C.onPrimary, border: C.primary },
        secondary: { bg: C.primaryFillNeutral, color: C.primaryText, border: C.primaryFillNeutral },
        outline: { bg: C.surface, color: C.text, border: C.border },
        ghost: { bg: 'transparent', color: C.primaryText, border: 'transparent' },
        negative: { bg: C.negative, color: C.onPrimary, border: C.negative },
        normal: { bg: C.text, color: C.surface, border: C.text },
      };
      const variant = variants[p.variant] ?? variants.primary;
      const disabled = p.disabled === 'true';
      const count = Math.min(3, Math.max(1, Number(p.count || '1')));
      const labels = [p.tertiaryLabel, p.secondaryLabel, p.label].slice(3 - count);
      return `<div style="padding:${S.xs}px ${S.base}px;display:flex;flex-direction:${p.layout === 'vertical' ? 'column' : 'row'};gap:8px;${p.fullWidth === 'true' ? '' : 'justify-content:flex-end;'}font-family:${FONT};">
        ${labels.map((label, index) => {
          const isPrimary = index === labels.length - 1;
          const tone = isPrimary ? variant : variants.outline;
          return `<button ${disabled ? 'disabled' : ''} style="height:${height}px;${p.fullWidth === 'true' ? 'flex:1;min-width:0;' : 'min-width:96px;padding:0 24px;'}border:1px solid ${tone.border};border-radius:${R.md}px;background:${tone.bg};color:${tone.color};font:600 14px/1 ${FONT};opacity:${disabled ? 0.38 : 1};cursor:${disabled ? 'not-allowed' : 'pointer'};">${escapeHtml(label)}</button>`;
        }).join('')}
      </div>`;
    },
  },
  {
    id: 'ktds-textarea',
    name: 'Textarea',
    icon: 'T',
    designSystem: 'ktds',
    category: 'input',
    description: '여러 줄 텍스트를 입력하는 KTDS 필드입니다.',
    source: source('Textarea', ['Default', 'Invalid', 'Disabled']),
    defaultProps: { label: '내용', placeholder: '내용을 입력하세요', helper: '최대 500자까지 입력할 수 있습니다.', required: 'false', variant: 'outlined', size: 'M', state: 'default' },
    deviceDefaults: { mobile: { size: 'M' }, desktop: { size: 'S' } },
    propSchema: [
      { key: 'label', label: '레이블', type: 'text', group: 'content' },
      { key: 'placeholder', label: '플레이스홀더', type: 'text', group: 'content' },
      { key: 'helper', label: '도움말', type: 'text', group: 'content' },
      { key: 'variant', label: '유형', type: 'select', options: ['outlined', 'filled'], group: 'style', display: 'segmented' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'required', label: '필수', type: 'select', options: ['false', 'true'], group: 'state', display: 'segmented' },
      { key: 'state', label: '상태', type: 'select', options: ['default', 'focus', 'error', 'disabled'], group: 'state' },
    ],
    renderHTML: (p) => {
      const error = p.state === 'error';
      const disabled = p.state === 'disabled';
      const border = error ? C.negative : p.state === 'focus' ? C.primary : C.border;
      const minHeight = p.size === 'S' ? 72 : p.size === 'L' ? 128 : 96;
      const padding = p.size === 'S' ? 10 : p.size === 'L' ? 14 : 12;
      const filled = p.variant === 'filled';
      return `<div style="padding:${S.sm}px ${S.base}px;font-family:${FONT};">
        ${fieldLabel(p.label, p.required === 'true')}
        <div style="min-height:${minHeight}px;padding:${padding}px;border:1px solid ${filled && p.state === 'default' ? 'transparent' : border};border-radius:${R.md}px;background:${disabled || filled ? C.surfaceAlt : C.surface};color:${C.textAlternative};font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 16 : 14}px;line-height:1.5;opacity:${disabled ? 0.6 : 1};">${escapeHtml(p.placeholder)}</div>
        ${p.helper ? `<div style="margin-top:6px;font-size:11px;color:${error ? C.negative : C.textAlternative};">${escapeHtml(p.helper)}</div>` : ''}
      </div>`;
    },
  },
  {
    id: 'ktds-select',
    name: 'Select',
    icon: '⌄',
    designSystem: 'ktds',
    category: 'input',
    description: '정해진 옵션 중 하나를 고르는 KTDS 선택 필드입니다.',
    source: source('Select', ['Default', 'Invalid', 'Disabled']),
    defaultProps: { label: '구분', placeholder: '선택하세요', options: '옵션 1\n옵션 2\n옵션 3', selected: '', variant: 'outlined', size: 'M', state: 'default' },
    deviceDefaults: { mobile: { size: 'L' }, desktop: { size: 'M' } },
    propSchema: [
      { key: 'label', label: '레이블', type: 'text', group: 'content' },
      { key: 'placeholder', label: '플레이스홀더', type: 'text', group: 'content' },
      { key: 'options', label: '옵션 (줄바꿈)', type: 'textarea', group: 'content' },
      { key: 'selected', label: '선택값', type: 'text', group: 'content' },
      { key: 'variant', label: '유형', type: 'select', options: ['outlined', 'filled'], group: 'style', display: 'segmented' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'state', label: '상태', type: 'select', options: ['default', 'focus', 'error', 'disabled'], group: 'state' },
    ],
    renderHTML: (p) => {
      const error = p.state === 'error';
      const disabled = p.state === 'disabled';
      const selected = p.selected || p.placeholder;
      const height = p.size === 'S' ? 32 : p.size === 'L' ? 48 : 40;
      const filled = p.variant === 'filled';
      return `<div style="padding:${S.sm}px ${S.base}px;font-family:${FONT};">
        ${fieldLabel(p.label)}
        <div style="height:${height}px;padding:0 ${p.size === 'S' ? 10 : 12}px;display:flex;align-items:center;justify-content:space-between;border:1px solid ${filled && p.state === 'default' ? 'transparent' : error ? C.negative : p.state === 'focus' ? C.primary : C.border};border-radius:${R.md}px;background:${disabled || filled ? C.surfaceAlt : C.surface};color:${p.selected ? C.text : C.textAlternative};font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 16 : 14}px;opacity:${disabled ? 0.6 : 1};">
          <span>${escapeHtml(selected)}</span><span aria-hidden="true" style="font-size:16px;color:${C.textNeutral};">⌄</span>
        </div>
        <div style="display:none;">${lines(p.options).map((option) => `<span>${escapeHtml(option)}</span>`).join('')}</div>
      </div>`;
    },
  },
  {
    id: 'ktds-checkbox-group',
    name: 'Checkbox',
    icon: '☑',
    designSystem: 'ktds',
    category: 'selection',
    description: '복수 선택에 사용하는 KTDS 체크박스 그룹입니다.',
    source: {
      storybookTitle: 'Components/Checkbox',
      packageName: '@ktds-ui/components',
      importCode: "import { Checkbox, CheckboxGroup } from '@ktds-ui/components';",
      variants: ['Usage', 'Checked', 'Indeterminate', 'Disabled', 'Group'],
    },
    defaultProps: { label: '관심 항목', options: '이메일 알림\n문자 알림\n앱 푸시', checked: '1', direction: 'vertical', size: 'M', state: 'default' },
    deviceDefaults: { mobile: { size: 'L', direction: 'vertical' }, desktop: { size: 'M', direction: 'horizontal' } },
    propSchema: [
      { key: 'label', label: '그룹 레이블', type: 'text', group: 'content' },
      { key: 'options', label: '항목 (줄바꿈)', type: 'textarea', group: 'content' },
      { key: 'checked', label: '선택 번호 (쉼표)', type: 'text', group: 'content' },
      { key: 'direction', label: '배치', type: 'select', options: ['vertical', 'horizontal'], group: 'style', display: 'segmented' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'state', label: '상태', type: 'select', options: ['default', 'error', 'disabled'], group: 'state', display: 'segmented' },
    ],
    renderHTML: (p) => {
      const selected = new Set(p.checked.split(',').map((v) => Number(v.trim()) - 1));
      const controlSize = p.size === 'S' ? 16 : p.size === 'L' ? 24 : 20;
      const fontSize = p.size === 'S' ? 12 : p.size === 'L' ? 16 : 14;
      const stateColor = p.state === 'error' ? C.negative : C.text;
      return `<div style="padding:${S.sm}px ${S.base}px;font-family:${FONT};opacity:${p.state === 'disabled' ? 0.45 : 1};">
        <div style="color:${stateColor};">${fieldLabel(p.label)}</div>
        <div style="display:flex;flex-direction:${p.direction === 'horizontal' ? 'row' : 'column'};gap:12px;flex-wrap:wrap;">
          ${lines(p.options).map((option, index) => `<div style="display:flex;align-items:center;gap:8px;color:${stateColor};font-size:${fontSize}px;"><span style="width:${controlSize}px;height:${controlSize}px;border:1px solid ${p.state === 'error' ? C.negative : selected.has(index) ? C.primary : C.border};border-radius:${R.sm}px;background:${selected.has(index) ? C.primary : C.surface};display:flex;align-items:center;justify-content:center;color:${C.onPrimary};font-size:${Math.max(10, controlSize - 7)}px;font-weight:700;">${selected.has(index) ? '✓' : ''}</span><span>${escapeHtml(option)}</span></div>`).join('')}
        </div>
      </div>`;
    },
  },
  {
    id: 'ktds-radio-group',
    name: 'Radio',
    icon: '◉',
    designSystem: 'ktds',
    category: 'selection',
    description: '단일 선택에 사용하는 KTDS 라디오 그룹입니다.',
    source: {
      storybookTitle: 'Components/Radio',
      packageName: '@ktds-ui/components',
      importCode: "import { Radio, RadioGroup } from '@ktds-ui/components';",
      variants: ['Usage', 'Checked', 'Disabled', 'Group'],
    },
    defaultProps: { label: '신청 유형', options: '개인\n기업\n기관', selected: '1', direction: 'horizontal', size: 'M', state: 'default' },
    deviceDefaults: { mobile: { size: 'L', direction: 'vertical' }, desktop: { size: 'M', direction: 'horizontal' } },
    propSchema: [
      { key: 'label', label: '그룹 레이블', type: 'text', group: 'content' },
      { key: 'options', label: '항목 (줄바꿈)', type: 'textarea', group: 'content' },
      { key: 'selected', label: '선택 번호', type: 'text', group: 'content' },
      { key: 'direction', label: '배치', type: 'select', options: ['vertical', 'horizontal'], group: 'style', display: 'segmented' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'state', label: '상태', type: 'select', options: ['default', 'error', 'disabled'], group: 'state', display: 'segmented' },
    ],
    renderHTML: (p) => {
      const selected = Math.max(0, Number(p.selected || '1') - 1);
      const controlSize = p.size === 'S' ? 16 : p.size === 'L' ? 24 : 20;
      const dotSize = p.size === 'S' ? 8 : p.size === 'L' ? 12 : 10;
      const fontSize = p.size === 'S' ? 12 : p.size === 'L' ? 16 : 14;
      const stateColor = p.state === 'error' ? C.negative : C.text;
      return `<div style="padding:${S.sm}px ${S.base}px;font-family:${FONT};opacity:${p.state === 'disabled' ? 0.45 : 1};">
        <div style="color:${stateColor};">${fieldLabel(p.label)}</div>
        <div style="display:flex;flex-direction:${p.direction === 'vertical' ? 'column' : 'row'};gap:16px;flex-wrap:wrap;">
          ${lines(p.options).map((option, index) => `<div style="display:flex;align-items:center;gap:8px;color:${stateColor};font-size:${fontSize}px;"><span style="width:${controlSize}px;height:${controlSize}px;border:1.5px solid ${p.state === 'error' ? C.negative : index === selected ? C.primary : C.border};border-radius:50%;display:flex;align-items:center;justify-content:center;"><span style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${index === selected ? C.primary : 'transparent'};"></span></span><span>${escapeHtml(option)}</span></div>`).join('')}
        </div>
      </div>`;
    },
  },
  {
    id: 'ktds-switch',
    name: 'Switch',
    icon: '◐',
    designSystem: 'ktds',
    category: 'selection',
    description: '설정을 즉시 켜고 끄는 KTDS 스위치입니다.',
    source: source('Switch', ['Default', 'Checked', 'Disabled']),
    defaultProps: { label: '알림 받기', description: '새로운 소식을 푸시로 알려드립니다.', size: 'M', checked: 'true', disabled: 'false' },
    deviceDefaults: { mobile: { size: 'L' }, desktop: { size: 'M' } },
    propSchema: [
      { key: 'label', label: '레이블', type: 'text', group: 'content' },
      { key: 'description', label: '설명', type: 'text', group: 'content' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'checked', label: '켜짐', type: 'select', options: ['true', 'false'], group: 'state', display: 'segmented' },
      { key: 'disabled', label: '비활성', type: 'select', options: ['false', 'true'], group: 'state', display: 'segmented' },
    ],
    renderHTML: (p) => {
      const checked = p.checked === 'true';
      const disabled = p.disabled === 'true';
      const width = p.size === 'S' ? 36 : p.size === 'L' ? 52 : 44;
      const height = p.size === 'S' ? 20 : p.size === 'L' ? 28 : 24;
      const knob = height - 4;
      return `<div style="padding:${S.sm}px ${S.base}px;display:flex;align-items:center;gap:16px;font-family:${FONT};opacity:${disabled ? 0.45 : 1};">
        <div style="flex:1;min-width:0;"><div style="font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 16 : 14}px;font-weight:600;color:${C.text};">${escapeHtml(p.label)}</div>${p.description ? `<div style="margin-top:3px;font-size:${p.size === 'L' ? 13 : 12}px;color:${C.textAlternative};line-height:1.4;">${escapeHtml(p.description)}</div>` : ''}</div>
        <div style="width:${width}px;height:${height}px;padding:2px;border-radius:${R.full}px;background:${checked ? C.primary : C.fillNeutral};display:flex;justify-content:${checked ? 'flex-end' : 'flex-start'};"><span style="width:${knob}px;height:${knob}px;border-radius:50%;background:${C.surface};box-shadow:0 1px 3px rgba(0,0,0,.2);"></span></div>
      </div>`;
    },
  },
  {
    id: 'ktds-chip-group',
    name: 'Chip',
    icon: 'C',
    designSystem: 'ktds',
    category: 'selection',
    description: '필터나 빠른 선택에 사용하는 KTDS 칩 그룹입니다.',
    source: source('Chip', ['Filled', 'Outlined', 'Selected', 'Disabled']),
    defaultProps: { options: '전체\n진행 중\n완료\n보류', selected: '1', variant: 'outlined', size: 'M', disabled: 'false' },
    deviceDefaults: { mobile: { size: 'M' }, desktop: { size: 'S' } },
    propSchema: [
      { key: 'options', label: '항목 (줄바꿈)', type: 'textarea', group: 'content' },
      { key: 'selected', label: '선택 번호', type: 'text', group: 'content' },
      { key: 'variant', label: '유형', type: 'select', options: ['outlined', 'filled'], group: 'style', display: 'segmented' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'disabled', label: '비활성', type: 'select', options: ['false', 'true'], group: 'state', display: 'segmented' },
    ],
    renderHTML: (p) => {
      const selected = Number(p.selected || '1') - 1;
      const height = p.size === 'S' ? 28 : p.size === 'L' ? 40 : 32;
      return `<div style="padding:${S.sm}px ${S.base}px;display:flex;gap:8px;overflow:hidden;font-family:${FONT};opacity:${p.disabled === 'true' ? 0.45 : 1};">
        ${lines(p.options).map((option, index) => {
          const active = index === selected;
          return `<span style="height:${height}px;padding:0 ${p.size === 'S' ? 10 : p.size === 'L' ? 16 : 13}px;display:inline-flex;align-items:center;white-space:nowrap;border:1px solid ${active ? C.primary : p.variant === 'filled' ? 'transparent' : C.border};border-radius:${R.full}px;background:${active ? C.primaryFillNeutral : p.variant === 'filled' ? C.surfaceAlt : C.surface};color:${active ? C.primaryText : C.textNeutral};font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 14 : 13}px;font-weight:${active ? 600 : 400};">${escapeHtml(option)}</span>`;
        }).join('')}
      </div>`;
    },
  },
  {
    id: 'ktds-tab-list',
    name: 'TabList',
    icon: '▤',
    designSystem: 'ktds',
    category: 'navigation',
    description: '같은 화면의 콘텐츠 뷰를 전환하는 KTDS 탭 목록입니다.',
    source: {
      storybookTitle: 'Components/TabList',
      packageName: '@ktds-ui/components',
      importCode: "import { Tablist } from '@ktds-ui/components';",
      variants: ['Default', 'Box Variant', 'Small Box Variant', 'Text Variant'],
    },
    defaultProps: { tabs: '전체\n접수\n처리 중\n완료', active: '1', variant: 'text', size: 'M' },
    deviceDefaults: { mobile: { size: 'M' }, desktop: { size: 'S' } },
    propSchema: [
      { key: 'tabs', label: '탭 (줄바꿈)', type: 'textarea', group: 'content' },
      { key: 'active', label: '활성 번호', type: 'text', group: 'content' },
      { key: 'variant', label: '유형', type: 'select', options: ['text', 'box'], group: 'style', display: 'segmented' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
    ],
    renderHTML: (p) => {
      const active = Number(p.active || '1') - 1;
      const box = p.variant === 'box';
      const height = p.size === 'S' ? 36 : p.size === 'L' ? 56 : 48;
      return `<div style="padding:${S.xs}px ${S.base}px;font-family:${FONT};">
        <div style="height:${height}px;display:flex;align-items:stretch;gap:${box ? 4 : 0}px;${box ? `padding:4px;background:${C.surfaceAlt};border-radius:${R.md}px;` : `border-bottom:1px solid ${C.borderAlt};`}">
          ${lines(p.tabs).map((tab, index) => `<div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;border-radius:${box ? R.base : 0}px;background:${box && index === active ? C.surface : 'transparent'};color:${index === active ? C.primaryText : C.textNeutral};font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 16 : 14}px;font-weight:${index === active ? 600 : 400};${box && index === active ? `box-shadow:${K.shadow.card};` : ''}">${escapeHtml(tab)}${!box && index === active ? `<span style="position:absolute;left:0;right:0;bottom:-1px;height:2px;background:${C.primary};"></span>` : ''}</div>`).join('')}
        </div>
      </div>`;
    },
  },
  {
    id: 'ktds-table',
    name: 'Table',
    icon: '▦',
    designSystem: 'ktds',
    category: 'data',
    description: '정형 데이터를 비교하고 스캔하는 KTDS 테이블입니다.',
    source: source('Table', ['Default', 'Selection', 'Scrollable']),
    defaultProps: { columns: '이름\n상태\n등록일', rows: '디자인 요청|진행 중|2026.07.22\n화면 검토|완료|2026.07.21\n컴포넌트 정리|접수|2026.07.20', variant: 'line', density: 'comfortable' },
    deviceDefaults: { mobile: { density: 'comfortable' }, desktop: { density: 'compact' } },
    propSchema: [
      { key: 'columns', label: '열 제목 (줄바꿈)', type: 'textarea', group: 'content' },
      { key: 'rows', label: '행 (줄바꿈, | 구분)', type: 'textarea', group: 'content' },
      { key: 'variant', label: '유형', type: 'select', options: ['line', 'striped'], group: 'style', display: 'segmented' },
      { key: 'density', label: '밀도', type: 'select', options: ['compact', 'comfortable', 'spacious'], group: 'style', display: 'segmented' },
    ],
    renderHTML: (p) => {
      const columns = lines(p.columns);
      const rows = lines(p.rows).map((row) => row.split('|'));
      const height = p.density === 'compact' ? 40 : p.density === 'spacious' ? 56 : 48;
      return `<div style="padding:${S.sm}px ${S.base}px;font-family:${FONT};overflow:hidden;">
        <div style="border:1px solid ${C.borderAlt};border-radius:${R.md}px;overflow:hidden;">
          <div style="height:${height}px;display:grid;grid-template-columns:repeat(${Math.max(columns.length, 1)},minmax(0,1fr));background:${C.surfaceAlt};border-bottom:1px solid ${C.borderAlt};">${columns.map((column) => `<div style="padding:0 12px;display:flex;align-items:center;font-size:12px;font-weight:600;color:${C.textNeutral};">${escapeHtml(column)}</div>`).join('')}</div>
          ${rows.map((row, rowIndex) => `<div style="min-height:${height}px;display:grid;grid-template-columns:repeat(${Math.max(columns.length, 1)},minmax(0,1fr));background:${p.variant === 'striped' && rowIndex % 2 === 1 ? C.surfaceAlt : C.surface};border-bottom:1px solid ${C.borderAlt};">${columns.map((_, index) => `<div style="padding:10px 12px;display:flex;align-items:center;font-size:12px;line-height:1.4;color:${C.text};min-width:0;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(row[index] ?? '')}</div>`).join('')}</div>`).join('')}
        </div>
      </div>`;
    },
  },
  {
    id: 'ktds-pagination',
    name: 'Pagination',
    icon: '#',
    designSystem: 'ktds',
    category: 'data',
    description: '목록의 페이지 이동을 제공하는 KTDS 페이지네이션입니다.',
    source: source('Pagination', ['Default', 'Compact']),
    defaultProps: { current: '2', total: '5', size: 'M', compact: 'false' },
    deviceDefaults: { mobile: { size: 'M', compact: 'true' }, desktop: { size: 'S', compact: 'false' } },
    propSchema: [
      { key: 'current', label: '현재 페이지', type: 'text', group: 'content' },
      { key: 'total', label: '전체 페이지', type: 'text', group: 'content' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'compact', label: '간결형', type: 'select', options: ['false', 'true'], group: 'style', display: 'segmented' },
    ],
    renderHTML: (p) => {
      const total = Math.min(7, Math.max(1, Number(p.total || '1')));
      const current = Math.min(total, Math.max(1, Number(p.current || '1')));
      const size = p.size === 'S' ? 28 : p.size === 'L' ? 40 : 32;
      return `<div style="padding:${S.base}px;display:flex;align-items:center;justify-content:center;gap:6px;font-family:${FONT};">
        <span style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;color:${C.textAlternative};">‹</span>
        ${p.compact === 'true' ? `<span style="padding:0 10px;font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 14 : 13}px;color:${C.textNeutral};"><strong style="color:${C.primaryText};">${current}</strong> / ${total}</span>` : Array.from({ length: total }, (_, index) => index + 1).map((page) => `<span style="width:${size}px;height:${size}px;border-radius:${R.md}px;background:${page === current ? C.primary : 'transparent'};color:${page === current ? C.onPrimary : C.textNeutral};display:flex;align-items:center;justify-content:center;font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 14 : 13}px;font-weight:${page === current ? 600 : 400};">${page}</span>`).join('')}
        <span style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;color:${C.textNeutral};">›</span>
      </div>`;
    },
  },
  {
    id: 'ktds-admonition',
    name: 'Admonition',
    icon: 'i',
    designSystem: 'ktds',
    category: 'feedback',
    description: '맥락 안에서 정보·성공·주의·오류 메시지를 전달합니다.',
    source: source('Admonition', ['info', 'positive', 'caution', 'negative']),
    defaultProps: { title: '안내', message: '작업 전에 입력 내용을 다시 확인해주세요.', variant: 'info', appearance: 'filled', size: 'M' },
    deviceDefaults: { mobile: { size: 'M' }, desktop: { size: 'S' } },
    propSchema: [
      { key: 'title', label: '제목', type: 'text', group: 'content' },
      { key: 'message', label: '메시지', type: 'textarea', group: 'content' },
      { key: 'variant', label: '톤', type: 'select', options: ['info', 'positive', 'caution', 'negative'], group: 'style' },
      { key: 'appearance', label: '표현', type: 'select', options: ['filled', 'outlined'], group: 'style', display: 'segmented' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
    ],
    renderHTML: (p) => {
      const colors: Record<string, { accent: string; bg: string; icon: string }> = {
        info: { accent: C.info, bg: '#eef5ff', icon: 'i' },
        positive: { accent: C.positive, bg: '#edfbf2', icon: '✓' },
        caution: { accent: C.caution, bg: '#fff7e8', icon: '!' },
        negative: { accent: C.negative, bg: '#fff0f0', icon: '!' },
      };
      const tone = colors[p.variant] ?? colors.info;
      const padding = p.size === 'S' ? '10px 12px' : p.size === 'L' ? '18px 20px' : '14px 16px';
      const iconSize = p.size === 'S' ? 18 : p.size === 'L' ? 24 : 20;
      return `<div style="margin:${S.sm}px ${S.base}px;padding:${padding};border:${p.appearance === 'outlined' ? `1px solid ${tone.accent}` : '0'};border-left:${p.appearance === 'outlined' ? 1 : 3}px solid ${tone.accent};border-radius:${R.md}px;background:${p.appearance === 'outlined' ? C.surface : tone.bg};display:flex;gap:12px;font-family:${FONT};">
        <span style="width:${iconSize}px;height:${iconSize}px;border-radius:50%;background:${tone.accent};color:${C.onPrimary};display:flex;align-items:center;justify-content:center;font-size:${p.size === 'L' ? 14 : 12}px;font-weight:700;flex-shrink:0;">${tone.icon}</span>
        <div><div style="font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 16 : 14}px;font-weight:600;color:${C.text};">${escapeHtml(p.title)}</div><div style="margin-top:3px;font-size:${p.size === 'S' ? 11 : p.size === 'L' ? 14 : 12}px;line-height:1.5;color:${C.textNeutral};">${escapeHtml(p.message)}</div></div>
      </div>`;
    },
  },
  {
    id: 'ktds-toast',
    name: 'Toast',
    icon: '✓',
    designSystem: 'ktds',
    category: 'feedback',
    description: '작업 결과를 짧게 알려주는 KTDS 토스트입니다.',
    source: {
      storybookTitle: 'Components/Toast',
      packageName: '@ktds-ui/components',
      variants: ['Default', 'Primary Variant', 'With Icon', 'Long Message'],
    },
    defaultProps: { message: '변경사항이 저장되었습니다.', variant: 'normal', action: '', size: 'M', position: 'bottom' },
    deviceDefaults: { mobile: { size: 'M', position: 'bottom' }, desktop: { size: 'S', position: 'top' } },
    propSchema: [
      { key: 'message', label: '메시지', type: 'textarea', group: 'content' },
      { key: 'action', label: '액션 레이블', type: 'text', group: 'content' },
      { key: 'variant', label: '유형', type: 'select', options: ['normal', 'primary'], group: 'style', display: 'segmented' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'position', label: '위치', type: 'select', options: ['bottom', 'top'], group: 'style', display: 'segmented' },
    ],
    renderHTML: (p) => `<div style="padding:${p.position === 'top' ? `${S.xs}px ${S.base}px ${S.base}px` : `${S.base}px ${S.base}px ${S.xs}px`};font-family:${FONT};">
      <div style="min-height:${p.size === 'S' ? 40 : p.size === 'L' ? 56 : 48}px;padding:${p.size === 'S' ? '8px 12px' : p.size === 'L' ? '14px 16px' : '11px 14px'};border-radius:${R.md}px;background:${p.variant === 'primary' ? C.primary : C.text};color:${C.onPrimary};display:flex;align-items:center;gap:10px;box-shadow:0 6px 18px rgba(0,0,0,.16);font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 14 : 13}px;line-height:1.45;"><span style="font-weight:700;">✓</span><span style="flex:1;">${escapeHtml(p.message)}</span>${p.action ? `<span style="font-weight:600;text-decoration:underline;">${escapeHtml(p.action)}</span>` : ''}</div>
    </div>`,
  },
  {
    id: 'ktds-dialog',
    name: 'Dialog',
    icon: '□',
    designSystem: 'ktds',
    category: 'overlay',
    description: '확인이나 중요한 결정을 받는 KTDS 다이얼로그입니다.',
    source: source('Dialog', ['Default', 'With Controls']),
    canvasBehavior: 'modal',
    defaultProps: { title: '변경사항을 저장할까요?', body: '저장하지 않으면 입력한 내용이 사라집니다.', primaryLabel: '저장', secondaryLabel: '취소', size: 'M', buttonCount: '2', showClose: 'false' },
    deviceDefaults: { mobile: { size: 'M' }, desktop: { size: 'L' } },
    propSchema: [
      { key: 'title', label: '제목', type: 'text', group: 'content' },
      { key: 'body', label: '본문', type: 'textarea', group: 'content' },
      { key: 'primaryLabel', label: '주 버튼', type: 'text', group: 'content' },
      { key: 'secondaryLabel', label: '보조 버튼', type: 'text', group: 'content' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'buttonCount', label: '버튼 개수', type: 'select', options: ['1', '2'], group: 'style', display: 'segmented' },
      { key: 'showClose', label: '닫기 표시', type: 'select', options: ['false', 'true'], group: 'state', display: 'segmented' },
    ],
    renderHTML: (p) => `<div style="height:100%;padding:28px 24px;background:${C.dimmer};display:flex;align-items:center;justify-content:center;font-family:${FONT};">
      <div style="width:${p.size === 'S' ? '280px' : p.size === 'L' ? '420px' : '328px'};max-width:100%;padding:${p.size === 'S' ? 16 : p.size === 'L' ? 24 : 20}px;border-radius:${R.xl}px;background:${C.surface};box-shadow:0 12px 36px rgba(0,0,0,.2);position:relative;">
        ${p.showClose === 'true' ? `<span style="position:absolute;top:14px;right:16px;font-size:20px;color:${C.textNeutral};">×</span>` : ''}
        <div style="padding-right:${p.showClose === 'true' ? 24 : 0}px;font-size:${p.size === 'S' ? 16 : p.size === 'L' ? 20 : 18}px;font-weight:600;line-height:1.4;color:${C.text};">${escapeHtml(p.title)}</div>
        <div style="margin-top:8px;font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 16 : 14}px;line-height:1.55;color:${C.textNeutral};">${escapeHtml(p.body)}</div>
        <div style="margin-top:${p.size === 'S' ? 16 : 20}px;display:flex;gap:8px;">${p.buttonCount === '2' ? `<button style="flex:1;height:${p.size === 'S' ? 36 : p.size === 'L' ? 52 : 44}px;border:1px solid ${C.border};border-radius:${R.md}px;background:${C.surface};color:${C.text};font:600 14px ${FONT};">${escapeHtml(p.secondaryLabel)}</button>` : ''}<button style="flex:1;height:${p.size === 'S' ? 36 : p.size === 'L' ? 52 : 44}px;border:0;border-radius:${R.md}px;background:${C.primary};color:${C.onPrimary};font:600 14px ${FONT};">${escapeHtml(p.primaryLabel)}</button></div>
      </div>
    </div>`,
  },
  {
    id: 'ktds-bottom-sheet',
    name: 'Bottom Sheet',
    icon: '▔',
    designSystem: 'ktds',
    category: 'overlay',
    description: '화면 하단에서 추가 선택이나 작업을 제공하는 Drawer 기반 KTDS 바텀시트입니다.',
    source: {
      storybookTitle: 'Components/Bottom Sheet',
      packageName: '@ktds-ui/components',
      importCode: "import { Drawer } from '@ktds-ui/components';",
      variants: ['Default', 'With Controls'],
    },
    canvasBehavior: 'fixed-bottom',
    supportedDevices: ['mobile'],
    responsiveMapping: { desktop: 'ktds-dialog' },
    defaultProps: { title: '옵션 선택', subtitle: '원하는 항목을 선택해주세요.', content: '선택 항목 또는 커스텀 콘텐츠 영역', primaryLabel: '확인', secondaryLabel: '취소', size: 'M', buttonCount: '2', showClose: 'true' },
    propSchema: [
      { key: 'title', label: '제목', type: 'text', group: 'content' },
      { key: 'subtitle', label: '설명', type: 'text', group: 'content' },
      { key: 'content', label: '콘텐츠', type: 'textarea', group: 'content' },
      { key: 'primaryLabel', label: '주 버튼', type: 'text', group: 'content' },
      { key: 'secondaryLabel', label: '보조 버튼', type: 'text', group: 'content' },
      { key: 'size', label: '크기', type: 'select', options: ['S', 'M', 'L'], group: 'style', display: 'segmented' },
      { key: 'buttonCount', label: '버튼 개수', type: 'select', options: ['1', '2'], group: 'style', display: 'segmented' },
      { key: 'showClose', label: '닫기 표시', type: 'select', options: ['true', 'false'], group: 'state', display: 'segmented' },
    ],
    renderHTML: (p) => `<div style="height:100%;background:${C.dimmer};display:flex;align-items:flex-end;font-family:${FONT};">
      <div style="width:100%;padding:10px ${p.size === 'S' ? 16 : p.size === 'L' ? 24 : 20}px ${p.size === 'S' ? 16 : p.size === 'L' ? 24 : 20}px;border-radius:${R.xxl}px ${R.xxl}px 0 0;background:${C.surface};box-shadow:${K.shadow.overlay};">
        <div style="width:40px;height:4px;margin:0 auto 14px;border-radius:${R.full}px;background:${C.fillNeutral};"></div>
        <div style="display:flex;align-items:flex-start;gap:12px;"><div style="flex:1;"><div style="font-size:${p.size === 'S' ? 16 : p.size === 'L' ? 20 : 18}px;font-weight:600;color:${C.text};">${escapeHtml(p.title)}</div><div style="margin-top:4px;font-size:${p.size === 'L' ? 14 : 12}px;color:${C.textAlternative};">${escapeHtml(p.subtitle)}</div></div>${p.showClose === 'true' ? `<span style="font-size:20px;color:${C.textNeutral};">×</span>` : ''}</div>
        <div style="min-height:${p.size === 'S' ? 64 : p.size === 'L' ? 160 : 88}px;margin-top:16px;padding:16px;border-radius:${R.md}px;background:${C.primaryFillNeutral};display:flex;align-items:center;justify-content:center;text-align:center;font-size:${p.size === 'S' ? 12 : p.size === 'L' ? 14 : 13}px;line-height:1.5;color:${C.textNeutral};">${escapeHtml(p.content)}</div>
        <div style="margin-top:16px;display:flex;gap:8px;">${p.buttonCount === '2' ? `<button style="flex:1;height:${p.size === 'S' ? 40 : p.size === 'L' ? 56 : 48}px;border:1px solid ${C.border};border-radius:${R.md}px;background:${C.surface};color:${C.text};font:600 14px ${FONT};">${escapeHtml(p.secondaryLabel)}</button>` : ''}<button style="flex:1;height:${p.size === 'S' ? 40 : p.size === 'L' ? 56 : 48}px;border:0;border-radius:${R.md}px;background:${C.primary};color:${C.onPrimary};font:600 14px ${FONT};">${escapeHtml(p.primaryLabel)}</button></div>
      </div>
    </div>`,
  },
];
