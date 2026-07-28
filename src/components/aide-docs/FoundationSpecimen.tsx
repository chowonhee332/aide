import { MaterialIcon } from '@/components/ui/material-icon'
import { AUI_TOKEN_GROUPS, AUI_TOKEN_VALUE, type TokenEntry } from '@/lib/aide-product-tokens'

type Contract = Record<string, unknown>

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function value(value: unknown): string {
  if (value && typeof value === 'object' && '$value' in value) return String((value as { $value: unknown }).$value)
  return String(value ?? '')
}

function tokenLabel(entry: TokenEntry) {
  return entry.key.split('.').map((part) => part.replaceAll('-', ' ')).join(' · ')
}

function TokenMeta({ entry }: { entry: TokenEntry }) {
  return <div className="docs-foundation-token-meta"><strong>{tokenLabel(entry)}</strong><code>{entry.cssVar}</code><span>{entry.description}</span></div>
}

function ColorSpecimen() {
  const entries = (AUI_TOKEN_GROUPS.color ?? []).filter((entry) => /^(#|rgb|hsl)/i.test(entry.value))
  return <div className="docs-color-grid">{entries.map((entry) => <article className="docs-color-swatch" key={entry.cssVar}>
    <div className="docs-color-sample" style={{ background: `var(${entry.cssVar})` }}><span>{entry.value}</span></div>
    <TokenMeta entry={entry}/>
  </article>)}</div>
}

function TypographySpecimen() {
  const grouped = new Map<string, Record<string, TokenEntry>>()
  for (const entry of AUI_TOKEN_GROUPS.typography ?? []) {
    const [name, property] = entry.key.split('.')
    grouped.set(name, { ...(grouped.get(name) ?? {}), [property]: entry })
  }
  return <div className="docs-type-list">{[...grouped].map(([name, face]) => <article className="docs-type-row" key={name}>
    <div className="docs-type-sample" style={{
      fontFamily: `var(${face.fontFamily?.cssVar})`, fontSize: `var(${face.fontSize?.cssVar})`,
      fontWeight: `var(${face.fontWeight?.cssVar})`, lineHeight: `var(${face.lineHeight?.cssVar})`,
      letterSpacing: `var(${face.letterSpacing?.cssVar})`,
    }}>빠르게 읽히는 명확한 인터페이스</div>
    <div className="docs-type-meta"><strong>{name}</strong><span>{face.fontSize?.value} / {face.lineHeight?.value} · {face.fontWeight?.value}</span></div>
  </article>)}</div>
}

function MeasureSpecimen({ group, kind }: { group: string; kind: 'space' | 'radius' }) {
  const entries = AUI_TOKEN_GROUPS[group] ?? []
  return <div className="docs-measure-list">{entries.map((entry) => <article className="docs-measure-row" key={entry.cssVar}>
    <div className={`docs-measure-sample docs-measure-${kind}`} style={kind === 'space' ? { width: `var(${entry.cssVar})` } : { borderRadius: `var(${entry.cssVar})` }}/>
    <TokenMeta entry={entry}/><output>{entry.value}</output>
  </article>)}</div>
}

function ElevationSpecimen() {
  return <div className="docs-elevation-grid">{(AUI_TOKEN_GROUPS.shadow ?? []).map((entry, index) => <article className="docs-elevation-card" style={{ boxShadow: `var(${entry.cssVar})`, transform: `translateY(${-index * 2}px)` }} key={entry.cssVar}><TokenMeta entry={entry}/></article>)}</div>
}

function MotionSpecimen() {
  return <div className="docs-motion-list">{(AUI_TOKEN_GROUPS.motion ?? []).map((entry) => <article className="docs-motion-row" key={entry.cssVar}>
    <button className="docs-motion-demo" style={{ transitionDuration: entry.key === 'easing' ? 'var(--aui-motion-base)' : `var(${entry.cssVar})`, transitionTimingFunction: 'var(--aui-motion-easing)' }} aria-label={`${entry.key} motion preview`}><span/></button>
    <TokenMeta entry={entry}/><output>{entry.value}</output>
  </article>)}</div>
}

const icons = ['search', 'add', 'edit', 'delete', 'check', 'close', 'arrow_back', 'arrow_forward', 'expand_more', 'settings', 'notifications', 'person', 'info', 'warning', 'error', 'check_circle']

function IconographySpecimen({ content }: { content: Contract }) {
  const defaults = content.defaults as Contract | undefined
  return <><div className="docs-icon-grid">{icons.map((name) => <article key={name}><MaterialIcon name={name} size={24}/><code>{name}</code></article>)}</div>
    {defaults ? <div className="docs-inline-contract">{Object.entries(defaults).map(([key, item]) => <span key={key}><strong>{key}</strong> {value(item)}</span>)}</div> : null}</>
}

function LayoutSpecimen({ content }: { content: Contract }) {
  const models = list(content.models)
  return <><div className="docs-layout-model-grid">{models.map((model) => <article key={model}><div className={`docs-layout-demo docs-layout-${model}`}><i/><i/><i/></div><strong>{model}</strong></article>)}</div>
    <div className="docs-responsive-specimen"><article><small>Compact · 0—767</small><div className="docs-responsive-frame compact"><i/><i/><i/></div><span>한 열 · 패널은 route 또는 sheet</span></article><article><small>Medium · 768—1199</small><div className="docs-responsive-frame medium"><i/><i/><i/></div><span>콘텐츠 + 보조 패널</span></article><article><small>Wide · 1200+</small><div className="docs-responsive-frame wide"><i/><i/><i/></div><span>캔버스 + 양측 패널</span></article></div></>
}

function StateSpecimen({ content }: { content: Contract }) {
  const interaction = list(content.interaction)
  const statuses = list(content.content)
  return <div className="docs-state-groups"><div><h3>Interaction states</h3><div className="docs-state-grid">{interaction.map((state) => <button key={state} className={`docs-state-demo is-${state}`} disabled={state === 'disabled'}><span>{state === 'loading' ? 'progress_activity' : state === 'focus-visible' ? 'keyboard' : 'touch_app'}</span>{state}</button>)}</div></div>
    <div><h3>Content states</h3><div className="docs-content-state-grid">{statuses.map((state) => <article key={state} className={`is-${state}`}><MaterialIcon name={state === 'success' ? 'check_circle' : state === 'error' ? 'error' : state === 'offline' ? 'cloud_off' : state === 'empty' ? 'inbox' : 'schedule'} size={22}/><strong>{state}</strong><span>상태 설명과 다음 행동을 함께 제공합니다.</span></article>)}</div></div></div>
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const rgb = hex.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16) / 255) ?? [0, 0, 0]
    const [r, g, b] = rgb.map((channel) => channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    return .2126 * r + .7152 * g + .0722 * b
  }
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (light + .05) / (dark + .05)
}

function AccessibilitySpecimen({ content }: { content: Contract }) {
  const pairs = [['text', 'surface'], ['text-neutral', 'surface'], ['primary', 'surface'], ['on-primary', 'primary']] as const
  return <><div className="docs-a11y-grid">{pairs.map(([fg, bg]) => {
    const foreground = AUI_TOKEN_VALUE[fg]; const background = AUI_TOKEN_VALUE[bg]
    const ratio = contrastRatio(foreground, background); const pass = ratio >= 4.5
    return <article key={`${fg}-${bg}`} style={{ color: `var(--aui-${fg})`, background: `var(--aui-${bg})` }}><strong>Aa</strong><span>{fg} / {bg}</span><output className={pass ? 'is-pass' : 'is-large-only'}>{ratio.toFixed(2)}:1 · {pass ? 'AA' : 'Large only'}</output></article>
  })}</div><RuleSpecimen content={content}/></>
}

function RuleSpecimen({ content }: { content: Contract }) {
  const rules = [...list(content.rules), ...list(content.requirements), ...list(content.dimensions)]
  return rules.length ? <ul className="docs-foundation-rules">{rules.map((rule) => <li key={rule}><MaterialIcon name="check" size={16}/><span>{rule}</span></li>)}</ul> : null
}

function TokenArchitecture() {
  return <div className="docs-token-architecture">{[['Primitive','원시 값'],['Semantic','역할과 의미'],['Component','컴포넌트 결정'],['State & mode','상태·환경 변형']].map(([title, text], index) => <article key={title}><span>{index + 1}</span><strong>{title}</strong><small>{text}</small></article>)}</div>
}

export function FoundationSpecimen({ pageId, content }: { pageId: string; content: Contract }) {
  if (pageId === 'design-token') return <><TokenArchitecture/><RuleSpecimen content={content}/></>
  if (pageId === 'color') return <ColorSpecimen/>
  if (pageId === 'typography') return <TypographySpecimen/>
  if (pageId === 'spacing') return <MeasureSpecimen group="space" kind="space"/>
  if (pageId === 'radius') return <MeasureSpecimen group="radius" kind="radius"/>
  if (pageId === 'elevation') return <ElevationSpecimen/>
  if (pageId === 'motion') return <MotionSpecimen/>
  if (pageId === 'iconography') return <IconographySpecimen content={content}/>
  if (pageId === 'layout') return <LayoutSpecimen content={content}/>
  if (pageId === 'state') return <StateSpecimen content={content}/>
  if (pageId === 'inclusive-design') return <AccessibilitySpecimen content={content}/>
  return <RuleSpecimen content={content}/>
}
