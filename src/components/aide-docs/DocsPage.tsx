import { Check } from '@/components/ui/material-icon'
import { AnatomyDiagram } from './AnatomyDiagram'
import { ComponentHeroFrame } from './ComponentHeroFrame'
import { DocsShell } from './DocsShell'
import { ComponentPlayground } from './ComponentPlayground'
import { ComponentSizeSpecimen } from './ComponentSizeSpecimen'
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
import { previewCaseProps } from '@/lib/aide-component-coverage'

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

  // 스칼라 값은 표로, 중첩 값만 제목으로 나눈다. 전부 제목으로 펼치면
  // `Compact Height` 같은 토큰 이름까지 제목이 되어 한 페이지에 제목이 100개 넘게 생긴다.
  const isScalar = (child: unknown) =>
    child === null || ['string', 'number', 'boolean'].includes(typeof child)
  const flat = entries.filter(([, child]) => isScalar(child))
  const nested = entries.filter(([, child]) => !isScalar(child))

  const table = flat.length ? (
    <table className="docs-contract-table"><tbody>{flat.map(([key, child]) => (
      <tr key={key}>
        <th scope="row">{humanizeId(key)}</th>
        <td><ContractValue value={child} depth={depth + 1}/></td>
      </tr>
    ))}</tbody></table>
  ) : null

  if (!nested.length) return table

  const Heading = depth === 0 ? 'h3' : 'h4'
  return <>
    {table}
    <div className={depth > 0 ? 'docs-contract-nested' : 'docs-contract-root'}>{nested.map(([key, child]) => (
      <div className="docs-contract-entry" key={key}>
        <Heading>{humanizeId(key)}</Heading>
        <ContractValue value={child} depth={depth + 1}/>
      </div>
    ))}</div>
  </>
}

export function GetStartedPage() {
  const toc: DocsTocItem[] = [
    { id: 'overview', title: 'Overview' },
    { id: 'principles', title: 'Principles' },
    { id: 'adoption', title: 'Adoption' },
    { id: 'architecture', title: 'Architecture' },
  ]
  return <DocsShell sectionId="get-started" pageId="overview" toc={toc}>
    <PageHeader eyebrow="Aide Design System" title={AUI_DOCUMENTATION.title} description={AUI_DOCUMENTATION.description}/>
    <Section id="overview" title="Overview" description="디자인, 개발, AI가 동일한 토큰과 컴포넌트 계약을 사용하도록 연결한 범용 디자인 시스템입니다.">
      <div className="docs-callout">상단 GNB는 문서의 최상위 영역을 선택합니다. 좌측 메뉴에는 현재 선택한 영역의 문서만 표시되고, 우측 목차는 이 페이지의 문단만 표시됩니다.</div>
    </Section>
    <Section id="principles" title="Principles"><div className="docs-spec-list">{['Contract first','Token driven','Accessible by default','Responsive by transformation'].map((item)=><div className="docs-spec-row" key={item}><dt><Check size={16}/></dt><dd>{item}</dd></div>)}</div></Section>
    <Section id="adoption" title="Adoption" description="aide.md 하나에서 토큰·컴포넌트·패턴을 같이 관리합니다."><div className="docs-callout">aide.md → shared primitives → patterns → product and generated screens</div></Section>
    <Section id="architecture" title="Architecture" description="문서와 화면이 서로 다른 목록을 갖지 않도록 동일한 MD 계약에서 생성합니다."><div className="docs-callout">MD contract → token compiler / component registry → product UI / docs / AI context</div></Section>
  </DocsShell>
}

export function ComponentsOverviewPage() {
  const components = allComponents()
  const toc = Object.keys(AUI_COMPONENT_CATEGORIES).map((id) => ({ id, title: humanizeId(id) }))
  return <DocsShell sectionId="components" pageId="overview" toc={toc}>
    <div className="docs-components-overview">
      <PageHeader eyebrow="Components" title="Components" description="사용자 인터페이스를 구성하는 재사용 가능한 UI 단위입니다. 동일한 토큰과 상호작용 규칙을 공유해 제품 전반의 경험을 일관되게 만들며, 각 항목에서 실제 컴포넌트와 상세 계약을 확인할 수 있습니다."/>
      <ComponentsCatalog components={components.map(({id,title,category,previewSize})=>({id,title,category,previewSize}))} categories={Object.keys(AUI_COMPONENT_CATEGORIES)}/>
    </div>
  </DocsShell>
}

export function ComponentDetailPage({ componentId }: { componentId: string }) {
  const contract = componentContract(componentId)
  const previewSize = componentPreviewSize(componentId)
  if (!contract) return null
  const title = humanizeId(componentId)
  const purpose = typeof contract.purpose === 'string' ? contract.purpose : `${title}의 구조, 상태와 사용 규칙을 정의합니다.`
  // 56개 컴포넌트에서 값이 완전히 같은 섹션은 컴포넌트 페이지에 있을 이유가 없다.
  // `status`는 전부 stable, `implementation-rules`와 `accessibility`는 시스템 전역
  // 규칙이라 Foundations의 Inclusive design과 Develop의 Validation이 이미 설명한다.
  // `category`는 페이지 머리말의 eyebrow와 중복이고, `renderer`는 아래 메타 줄에서 보여준다.
  // 계약의 props(recipe properties)를 조작 패널 입력으로 바꾼다. 값이 두 개 이상인
  // 항목만 고를 의미가 있다.
  // 패널은 "설정해서 고르는 축"만 담는다.
  // - size/width: 치수. Sizes 섹션의 토큰 표가 값과 용도까지 이미 설명한다.
  // - state: hover/pressed/focus-visible은 prop이 아니라 실제 상호작용으로 만들어진다.
  //   스테이지의 컴포넌트는 진짜 primitive라 직접 올려 보면 그대로 나타난다.
  //   라디오로 두면 대부분이 눌러도 반응하지 않아 고장처럼 보인다. 목록은 States 섹션에 있다.
  const NON_CONFIGURABLE_PROPS = new Set(['size', 'width', 'state'])
  // 이 컴포넌트의 프리뷰 case 가 실제로 읽는 prop 만 패널에 올린다.
  // 전역 목록으로 거르면 family 가 선언했을 뿐 이 컴포넌트에는 해당하지 않는 옵션이 남는다.
  const CONSUMED = previewCaseProps().get(componentId) ?? new Set<string>()
  // 크기는 선택 가능한 size 값마다 실물을 나란히 보여 준다. 옆에 붙는 치수는
  // 파생된 sizes 표(component_tokens)의 값에서 이름이 맞는 항목을 찾아 쓴다.
  const sizeValues = ((contract.props as Record<string, unknown> | undefined)?.size ?? []) as unknown[]
  const sizeTable = (contract.sizes ?? {}) as Record<string, unknown>
  const sizeSpecimen = sizeValues.map(String).map((value) => {
    const matchKey = Object.keys(sizeTable).find((key) => key.startsWith(`${value}-`) || key === value)
    const raw = matchKey ? String(sizeTable[matchKey]) : ''
    return { value, measure: raw.match(/^\d+(?:\.\d+)?(?:px|rem)/)?.[0] }
  })
  const playgroundProps = Object.entries((contract.props ?? {}) as Record<string, unknown>)
    .filter(([name, values]) => CONSUMED.has(name) && !NON_CONFIGURABLE_PROPS.has(name) && Array.isArray(values) && values.length > 1)
    .map(([name, values]) => ({ name, values: (values as unknown[]).map(String) }))
  const GLOBAL_OR_META = new Set(['purpose', 'rules', 'accessibility', 'implementation-rules', 'status', 'category', 'renderer'])
  const visibleFields = Object.entries(contract).filter(([key]) => !GLOBAL_OR_META.has(key))
  const toc: DocsTocItem[] = [
    { id: 'preview', title: 'Preview' },
    ...visibleFields.map(([key]) => ({ id: key, title: humanizeId(key) })),
    ...(Array.isArray(contract.rules) ? [{ id: 'guidelines', title: 'Guidelines' }] : []),
  ]
  return <DocsShell sectionId="components" pageId={componentId} toc={toc}>
    <PageHeader eyebrow={humanizeId(componentCategory(componentId))} title={title} description={purpose}/>
    {/* 머리말 바로 아래 대표 예시. Overview 썸네일과 동일한 프레임(ComponentHeroFrame)을 그대로 쓴다. */}
    <ComponentHeroFrame componentId={componentId}/>
    <Section id="preview" title="Preview" description="계약의 옵션을 바꾸면 실제 제품 컴포넌트가 그대로 다시 그려집니다.">
      <ComponentPlayground id={componentId} previewSize={previewSize} props={playgroundProps}/>
    </Section>
    {visibleFields.map(([key, value]) => <Section id={key} title={humanizeId(key)} key={key}>
      {key === 'anatomy' && Array.isArray(value) && value.every((part) => part && typeof part === 'object' && 'name' in part)
        ? <AnatomyDiagram componentId={componentId} parts={value as Array<{ name: string; description: string; optional: boolean }>}/>
        : key === 'sizes' && sizeSpecimen.length
          ? <><ComponentSizeSpecimen id={componentId} items={sizeSpecimen}/><ContractValue value={value}/></>
          : <ContractValue value={value}/>}
    </Section>)}
    {Array.isArray(contract.rules) ? <Section id="guidelines" title="Guidelines"><ul className="docs-rule-list">{contract.rules.map((rule)=><li key={String(rule)}>{String(rule)}</li>)}</ul></Section> : null}
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
