import Link from 'next/link'
import { Check } from '@/components/ui/material-icon'
import { DocsShell } from './DocsShell'
import { ComponentPreview } from './ComponentPreview'
import { ComponentsCatalog } from './ComponentsCatalog'
import { FoundationSpecimen } from './FoundationSpecimen'
import {
  allComponents,
  componentCategory,
  componentContract,
  componentPreviewSize,
  documentationContent,
  humanizeId,
  sectionNavigation,
  type DocsTocItem,
} from '@/lib/aide-docs'
import { AUI_COMPONENT_CATEGORIES, AUI_DOCUMENTATION } from '@/lib/aide-product-tokens'
import { assertComponentCoverageIntegrity, componentCoverage, type CoverageCheck } from '@/lib/wonhee-component-coverage'

function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="docs-page-header"><span className="docs-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return <section className="docs-page-section" id={id}><h2>{title}</h2>{description ? <p className="docs-section-description">{description}</p> : null}{children}</section>
}

function ContractValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) return <span className="docs-contract-empty">Not defined</span>
  if (typeof value === 'boolean') return <code>{String(value)}</code>
  if (typeof value === 'string' || typeof value === 'number') return <span>{String(value)}</span>
  if (Array.isArray(value)) return <ul className="docs-contract-list">{value.map((item, index)=><li key={`${String(item)}-${index}`}><ContractValue value={item} depth={depth + 1}/></li>)}</ul>

  const object = value as Record<string, unknown>
  if ('$value' in object) {
    const tokenValue = object.$value
    const color = typeof tokenValue === 'string' && /^#[0-9a-f]{6,8}$/i.test(tokenValue) ? tokenValue : undefined
    return <div className="docs-token-value">{color ? <i style={{background:color}} aria-label={`색상 ${color}`}/> : null}<code>{typeof tokenValue === 'object' ? JSON.stringify(tokenValue) : String(tokenValue)}</code>{object.$description ? <p>{String(object.$description)}</p> : null}</div>
  }

  const entries = Object.entries(object)
  return <div className={depth > 0 ? 'docs-contract-nested' : 'docs-contract-root'}>{entries.map(([key, child]) => (
    <div className="docs-contract-entry" key={key}>
      <h3>{humanizeId(key)}</h3>
      <ContractValue value={child} depth={depth + 1}/>
    </div>
  ))}</div>
}

export function GetStartedPage() {
  const toc: DocsTocItem[] = [
    { id: 'overview', title: 'Overview' },
    { id: 'principles', title: 'Principles' },
    { id: 'adoption', title: 'Adoption' },
    { id: 'architecture', title: 'Architecture' },
  ]
  return <DocsShell sectionId="get-started" pageId="overview" toc={toc}>
    <PageHeader eyebrow="Wonhee Design System" title={AUI_DOCUMENTATION.title} description={AUI_DOCUMENTATION.description}/>
    <Section id="overview" title="Overview" description="디자인, 개발, AI가 동일한 토큰과 컴포넌트 계약을 사용하도록 연결한 범용 디자인 시스템입니다.">
      <div className="docs-callout">상단 GNB는 문서의 최상위 영역을 선택합니다. 좌측 메뉴에는 현재 선택한 영역의 문서만 표시되고, 우측 목차는 이 페이지의 문단만 표시됩니다.</div>
    </Section>
    <Section id="principles" title="Principles"><div className="docs-spec-list">{['Contract first','Token driven','Accessible by default','Responsive by transformation'].map((item)=><div className="docs-spec-row" key={item}><dt><Check size={16}/></dt><dd>{item}</dd></div>)}</div></Section>
    <Section id="adoption" title="Adoption" description="새 프로젝트는 portable core를 가져온 뒤 제품 토큰만 오버라이드합니다."><div className="docs-callout">wonhee-design.md → project product UI contract → shared primitives → patterns → screens</div></Section>
    <Section id="architecture" title="Architecture" description="문서와 화면이 서로 다른 목록을 갖지 않도록 동일한 MD 계약에서 생성합니다."><div className="docs-callout">MD contract → token compiler / component registry → product UI / docs / AI context</div></Section>
  </DocsShell>
}

export function ComponentsOverviewPage() {
  const components = allComponents()
  const toc = Object.keys(AUI_COMPONENT_CATEGORIES).map((id) => ({ id, title: humanizeId(id) }))
  return <DocsShell sectionId="components" pageId="overview" toc={toc}>
    <PageHeader eyebrow="Components" title="Components" description="Wonhee Design System의 모든 제품 컴포넌트를 한눈에 살펴보고 상세 계약으로 이동합니다."/>
    <ComponentsCatalog components={components.map(({id,title,category,previewSize})=>({id,title,category,previewSize}))} categories={Object.keys(AUI_COMPONENT_CATEGORIES)}/>
  </DocsShell>
}

export function ProgressBoardPage() {
  assertComponentCoverageIntegrity()
  const { rows, summary } = componentCoverage()
  const columns: Array<{ key: keyof Pick<(typeof rows)[number], 'definition' | 'registry' | 'preview' | 'source' | 'tokens' | 'recipe' | 'playground'>; label: string }> = [
    { key: 'definition', label: 'MD definition' }, { key: 'registry', label: 'Registry' },
    { key: 'preview', label: 'Preview case' }, { key: 'source', label: 'Renderer source' },
    { key: 'tokens', label: 'Token use' },
    { key: 'recipe', label: 'Recipe' },
    { key: 'playground', label: 'Playground' },
  ]
  const status = (check: CoverageCheck) => <span className={`docs-coverage-state docs-coverage-${check.state}`} title={check.detail}>{check.label}</span>
  const toc = [{ id: 'coverage', title: 'Implementation coverage' }]
  return <DocsShell sectionId="components" pageId="progress-board" toc={toc}>
    <PageHeader eyebrow="Components" title="Progress Board" description="MD와 실제 registry, preview, source, token 소비를 빌드 시점에 검사한 결과입니다."/>
    <Section id="coverage" title="Implementation coverage">
      <div className="docs-callout">완전 연결 {summary.complete}/{summary.components} · MD {summary.definitions}/{summary.components} · Registry {summary.registered}/{summary.components} · Preview {summary.previews}/{summary.components} · Source {summary.sources}/{summary.components} · Token {summary.tokenConsumers}/{summary.components} · Recipe {summary.recipes}/{summary.components} · Playground {summary.playground}/{summary.components}</div>
      <table className="docs-progress-table"><thead><tr><th>Component</th><th>Complete</th>{columns.map((column)=><th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row)=><tr key={row.id}><td><Link href={`/aide-ui/components/${row.id}`}>{humanizeId(row.id)}</Link></td><td>{status({ state: row.complete ? 'pass' : 'missing', label: row.complete ? 'Complete' : 'Incomplete', detail: row.complete ? '모든 필수 연결이 확인되었습니다.' : '하나 이상의 필수 연결이 누락되었습니다.' })}</td>{columns.map((column)=><td key={column.key}>{status(row[column.key])}</td>)}</tr>)}</tbody></table>
    </Section>
  </DocsShell>
}

export function ComponentDetailPage({ componentId }: { componentId: string }) {
  const contract = componentContract(componentId)
  const previewSize = componentPreviewSize(componentId)
  const coverage = componentCoverage().rows.find((row) => row.id === componentId)
  if (!contract) return null
  const title = humanizeId(componentId)
  const purpose = typeof contract.purpose === 'string' ? contract.purpose : `${title}의 구조, 상태와 사용 규칙을 정의합니다.`
  const visibleFields = Object.entries(contract).filter(([key]) => key !== 'purpose' && key !== 'rules' && key !== 'accessibility')
  const toc: DocsTocItem[] = [
    { id: 'preview', title: 'Preview' },
    ...visibleFields.map(([key]) => ({ id: key, title: humanizeId(key) })),
    ...(Array.isArray(contract.rules) ? [{ id: 'guidelines', title: 'Guidelines' }] : []),
    { id: 'accessibility', title: 'Accessibility' },
  ]
  return <DocsShell sectionId="components" pageId={componentId} toc={toc}>
    <PageHeader eyebrow={humanizeId(componentCategory(componentId))} title={title} description={purpose}/>
    {coverage ? <div className="docs-availability">
      <span data-state={coverage.definition.state}>MD · {coverage.definition.label}</span>
      <span data-state={coverage.preview.state}>Preview · {coverage.preview.label}</span>
      <span data-state={coverage.source.state}>Source · {coverage.source.label}</span>
      <span data-state={coverage.tokens.state}>Tokens · {coverage.tokens.label}</span>
      <span data-state={coverage.recipe.state}>Recipe · {coverage.recipe.label}</span>
      <span data-state={coverage.playground.state}>Playground · {coverage.playground.label}</span>
    </div> : null}
    <Section id="preview" title="Preview" description="제품에서 사용하는 공용 primitive를 직접 렌더링합니다."><div className={`docs-detail-preview docs-detail-preview-${previewSize}`}><ComponentPreview id={componentId}/></div></Section>
    {visibleFields.map(([key, value]) => <Section id={key} title={humanizeId(key)} key={key}><ContractValue value={value}/></Section>)}
    {Array.isArray(contract.rules) ? <Section id="guidelines" title="Guidelines"><ul className="docs-rule-list">{contract.rules.map((rule)=><li key={String(rule)}>{String(rule)}</li>)}</ul></Section> : null}
    <Section id="accessibility" title="Accessibility"><ContractValue value={contract.accessibility}/></Section>
  </DocsShell>
}

export function GenericSectionPage({ sectionId, pageId }: { sectionId: string; pageId: string }) {
  const page = AUI_DOCUMENTATION.pages[sectionId]
  const selected = sectionNavigation(sectionId).find((item) => item.id === pageId)
  const title = selected?.title ?? page.title
  const content = documentationContent(sectionId, pageId)
  const entries = Object.entries(content)
  const toc = entries.map(([id]) => ({ id, title: humanizeId(id) }))
  if (sectionId === 'foundations') {
    const purpose = typeof content.purpose === 'string' ? content.purpose : `${title}의 범용 디자인 계약과 제품 적용 기준입니다.`
    return <DocsShell sectionId={sectionId} pageId={pageId} toc={[{ id: 'specimen', title: 'Specimen' }, { id: 'contract', title: 'Contract' }]}>
      <PageHeader eyebrow={page.title} title={title} description={purpose}/>
      <Section id="specimen" title="Specimen" description="MD 토큰과 계약을 실제 UI 표현으로 확인합니다."><FoundationSpecimen pageId={pageId} content={content}/></Section>
      <Section id="contract" title="Contract" description="시각화의 원본인 portable 및 product 계약입니다."><ContractValue value={content}/></Section>
    </DocsShell>
  }
  return <DocsShell sectionId={sectionId} pageId={pageId} toc={toc}>
    <PageHeader eyebrow={page.title} title={title} description={`${title}의 범용 디자인 계약과 Aide 제품 적용 기준입니다.`}/>
    {entries.length ? entries.map(([id, value]) => <Section id={id} title={humanizeId(id)} key={id}><ContractValue value={value}/></Section>) : <Section id="overview" title="Overview"><div className="docs-callout">이 페이지에 연결된 구조화 계약이 없습니다. MD에 항목을 추가하면 자동으로 표시됩니다.</div></Section>}
  </DocsShell>
}
