import { Badge } from '@/components/ui/badge'
import { BarChart } from '@/components/ui/bar-chart'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { FieldGroup } from '@/components/ui/field-group'
import { FileUploader } from '@/components/ui/file-uploader'
import { InlineMessage, Loader } from '@/components/ui/feedback'
import { AlertCircle, CheckCircle2, ChevronRight, FileText, RefreshCw, Search, SlidersHorizontal, Sparkles, TriangleAlert } from '@/components/ui/material-icon'
import { Pagination } from '@/components/ui/pagination'
import { Progress, Skeleton } from '@/components/ui/progress'
import { Radio, RadioGroup } from '@/components/ui/radio-group'
import { Result } from '@/components/ui/result'
import { ResponsiveGrid } from '@/components/ui/responsive-grid'
import { SearchField } from '@/components/ui/search-field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Stepper } from '@/components/ui/stepper'
import { Table, TableBody, TableCaption, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ListRow, ListRowText } from '@/components/ui/list-row'

type Contract = Record<string, unknown>

export const PATTERN_SPECIMEN_IDS = [
  'prompt-to-variants',
  'variant-comparison',
  'selection-to-prototype',
  'generation-recovery',
  'list-screen',
  'detail-screen',
  'form-screen',
  'dashboard',
  'workspace',
  'landing',
  'file-analysis',
  'requirement-traceability',
  'loading',
  'empty',
  'error-and-recovery',
] as const

export function supportsPatternSpecimen(pageId: string): pageId is typeof PATTERN_SPECIMEN_IDS[number] {
  return PATTERN_SPECIMEN_IDS.includes(pageId as typeof PATTERN_SPECIMEN_IDS[number])
}

function contractStates(content: Contract) {
  return Array.isArray(content.states) ? content.states.map(String) : []
}

function StateLegend({ content, active }: { content: Contract; active: string[] }) {
  const states = contractStates(content)
  return <div className="mb-[var(--aui-space-4)] flex flex-wrap gap-[var(--aui-space-2)]" aria-label="Pattern contract states">
    {states.map((state) => <Badge key={state} variant={active.includes(state) ? 'info' : 'neutral'}>{state}</Badge>)}
  </div>
}

function PromptToVariants({ content }: { content: Contract }) {
  return <div>
    <StateLegend content={content} active={['generating', 'partial']}/>
    <ResponsiveGrid minItemWidth="260px">
      <Card variant="bordered">
        <CardHeader><CardTitle>Generation context</CardTitle><CardDescription>동일한 요구사항과 contentSeed를 세 시안에 적용합니다.</CardDescription></CardHeader>
        <CardContent className="grid gap-[var(--aui-space-3)]">
          <ListRow leading={<FileText size={18}/>} contents={<ListRowText title="product-brief.pdf" description="18 requirements · analysis complete"/>} metadata={<Badge variant="success">Ready</Badge>}/>
          <ListRow leading={<Sparkles size={18}/>} contents={<ListRowText title="Aide Design System" description="70 registered components"/>} metadata={<Badge variant="info">Applied</Badge>}/>
        </CardContent>
      </Card>
      <Card variant="bordered" aria-label="Variant generation progress">
        <CardHeader><CardTitle>Generating three directions</CardTitle><CardDescription>완료된 결과를 유지하면서 남은 시안만 생성합니다.</CardDescription></CardHeader>
        <CardContent className="grid gap-[var(--aui-space-3)]">
          <Progress value={67} label="2 of 3 variants complete"/>
          <ListRow leading={<CheckCircle2 size={18} className="text-[var(--aui-positive)]"/>} contents={<ListRowText title="A · Focused workspace" description="Complete"/>}/>
          <ListRow leading={<CheckCircle2 size={18} className="text-[var(--aui-positive)]"/>} contents={<ListRowText title="B · Editorial clarity" description="Complete"/>}/>
          <ListRow leading={<Loader label="Generating" className="[&>span:last-child]:sr-only"/>} contents={<ListRowText title="C · Visual exploration" description="Generating hero and supporting sections"/>}/>
          <InlineMessage tone="warning" title="Partial result available">완료된 A와 B는 지금 비교할 수 있으며 C만 계속 생성됩니다.</InlineMessage>
        </CardContent>
      </Card>
    </ResponsiveGrid>
  </div>
}

function VariantComparison({ content }: { content: Contract }) {
  const variants = [
    { id: 'a', title: 'A · Focused workspace', description: 'Dense hierarchy · task-first layout', selected: false },
    { id: 'b', title: 'B · Editorial clarity', description: 'Calm rhythm · content-led sections', selected: true },
    { id: 'c', title: 'C · Visual exploration', description: 'Unavailable while final media is generated', selected: false, disabled: true },
  ]
  return <div>
    <StateLegend content={content} active={['selected', 'unavailable-variant']}/>
    <RadioGroup name="pattern-variant" label="Select a direction" className="grid gap-[var(--aui-space-3)] md:grid-cols-3">
      {variants.map((variant) => <Card key={variant.id} variant="selectable" className={variant.disabled ? 'opacity-60' : undefined}>
        <CardHeader>
          <CardTitle>{variant.title}</CardTitle>
          <CardDescription>{variant.description}</CardDescription>
          <CardAction><Radio value={variant.id} defaultChecked={variant.selected} disabled={variant.disabled}><span className="sr-only">{variant.title} 선택</span></Radio></CardAction>
        </CardHeader>
        <CardContent><div className="h-28 rounded-[var(--aui-radius-control)] bg-[var(--aui-surface-muted)] p-[var(--aui-space-3)]"><div className="h-3 w-2/3 rounded bg-[var(--aui-fill-strong)]"/><div className="mt-[var(--aui-space-3)] h-12 rounded bg-[var(--aui-surface)]"/></div></CardContent>
      </Card>)}
    </RadioGroup>
    <InlineMessage className="mt-[var(--aui-space-4)]" tone="info" title="B selected">선택은 prototype 확장을 시작하기 전까지 되돌릴 수 있습니다.</InlineMessage>
  </div>
}

function SelectionToPrototype({ content }: { content: Contract }) {
  return <div>
    <StateLegend content={content} active={['generating', 'partial']}/>
    <Card variant="bordered">
      <CardHeader><CardTitle>B · Editorial clarity → prototype</CardTitle><CardDescription>선택한 홈 화면과 결정론적 셸을 유지하며 추가 화면을 확장합니다.</CardDescription><CardAction><Badge variant="info">3 / 5 screens</Badge></CardAction></CardHeader>
      <CardContent className="grid gap-[var(--aui-space-5)]">
        <Stepper current={2} steps={[{id:'plan',label:'Plan'},{id:'generate',label:'Generate'},{id:'validate',label:'Validate'},{id:'complete',label:'Complete'}]}/>
        <Progress value={60} label="Screen expansion"/>
        <div>
          <ListRow leading={<CheckCircle2 size={18} className="text-[var(--aui-positive)]"/>} contents={<ListRowText title="Home" description="Selected HTML preserved"/>} metadata={<Badge variant="success">Locked</Badge>}/>
          <ListRow leading={<CheckCircle2 size={18} className="text-[var(--aui-positive)]"/>} contents={<ListRowText title="Project detail" description="Generated and validated"/>} metadata={<Badge variant="success">Complete</Badge>}/>
          <ListRow leading={<Loader label="Generating" className="[&>span:last-child]:sr-only"/>} contents={<ListRowText title="Settings" description="Generating screen content"/>} metadata={<Badge variant="info">Active</Badge>}/>
        </div>
        <div className="flex justify-end"><Button variant="outline">Review completed screens</Button></div>
      </CardContent>
    </Card>
  </div>
}

function GenerationRecovery({ content }: { content: Contract }) {
  return <div>
    <StateLegend content={content} active={['recoverable', 'retrying']}/>
    <Card variant="bordered">
      <CardHeader><CardTitle>Recover the failed step</CardTitle><CardDescription>완료된 결과와 입력은 보존하고 실패한 화면만 다시 시도합니다.</CardDescription></CardHeader>
      <CardContent className="grid gap-[var(--aui-space-4)]">
        <InlineMessage tone="error" title="Settings generation failed">이미지 분석 응답이 중단됐습니다. Settings 화면만 영향을 받았습니다.</InlineMessage>
        <div>
          <ListRow leading={<CheckCircle2 size={18} className="text-[var(--aui-positive)]"/>} contents={<ListRowText title="Preserved work" description="Brief, selected variant, Home and Project detail"/>} metadata={<Badge variant="success">Safe</Badge>}/>
          <ListRow leading={<TriangleAlert size={18} className="text-[var(--aui-caution)]"/>} contents={<ListRowText title="Affected step" description="Settings · media interpretation"/>} metadata={<Badge variant="warning">Retry</Badge>}/>
        </div>
        <div className="flex flex-wrap justify-end gap-[var(--aui-space-2)]"><Button variant="ghost">View diagnostics</Button><Button><RefreshCw/>Retry Settings only</Button></div>
      </CardContent>
    </Card>
  </div>
}

function ListScreen({ content }: { content: Contract }) {
  const rows = [
    { title: 'Onboarding revamp', description: 'Product · updated 2h ago', badge: 'In review', tone: 'info' as const },
    { title: 'Billing migration', description: 'Platform · updated yesterday', badge: 'Blocked', tone: 'warning' as const },
    { title: 'Search relevance', description: 'Growth · updated 3d ago', badge: 'Shipped', tone: 'success' as const },
  ]
  return <div>
    <StateLegend content={content} active={['populated']}/>
    <Card variant="bordered">
      <CardHeader><CardTitle>Projects</CardTitle><CardDescription>필터와 검색으로 반복 엔티티를 훑고 바로 조치합니다.</CardDescription></CardHeader>
      <CardContent className="grid gap-[var(--aui-space-4)]">
        <div className="flex flex-wrap items-center gap-[var(--aui-space-2)]">
          <SearchField className="min-w-0 flex-1" aria-label="Search projects" placeholder="Search projects"/>
          <Button variant="outline"><SlidersHorizontal/>Filter</Button>
        </div>
        <div>
          {rows.map((row) => <ListRow key={row.title} contents={<ListRowText title={row.title} description={row.description}/>} metadata={<Badge variant={row.tone}>{row.badge}</Badge>} trailing={<ChevronRight size={16}/>}/>)}
        </div>
        <div className="flex justify-center"><Pagination total={5} defaultPage={1}/></div>
      </CardContent>
    </Card>
  </div>
}

function DetailScreen() {
  return <Card variant="bordered">
    <CardHeader>
      <CardTitle>Onboarding revamp</CardTitle>
      <CardDescription>Product workspace · Owner Jamie Lee</CardDescription>
      <CardAction><Badge variant="info">In review</Badge></CardAction>
    </CardHeader>
    <CardContent className="grid gap-[var(--aui-space-5)]">
      <p className="m-0 text-sm leading-6 text-[var(--aui-text-muted)]">핵심 콘텐츠를 먼저 두고, 관련 섹션과 맥락 액션을 그 아래로 배치합니다.</p>
      <div>
        <ListRow leading={<FileText size={18}/>} contents={<ListRowText title="Requirements" description="18 items · 3 need review"/>} trailing={<ChevronRight size={16}/>}/>
        <ListRow leading={<Sparkles size={18}/>} contents={<ListRowText title="Generated screens" description="5 screens linked"/>} trailing={<ChevronRight size={16}/>}/>
      </div>
      <div className="flex flex-wrap justify-end gap-[var(--aui-space-2)]"><Button variant="ghost">Share</Button><Button>Open prototype</Button></div>
    </CardContent>
  </Card>
}

function FormScreen() {
  return <div className="mx-auto max-w-[680px]">
    <Card variant="bordered">
      <CardHeader><CardTitle>Create project</CardTitle><CardDescription>진행 상태를 복구할 수 있게 입력을 모으고 즉시 검증합니다.</CardDescription></CardHeader>
      <CardContent className="grid gap-[var(--aui-space-4)]">
        <FieldGroup label="Basics" help="필수 항목은 저장 전에 검증됩니다.">
          <Field label="Project name" required><Input defaultValue="Onboarding revamp" readOnly/></Field>
          <Field label="Delivery date" error="유효한 날짜를 입력하세요."><Input defaultValue="2026-13-02" readOnly aria-invalid="true"/></Field>
        </FieldGroup>
        <div className="flex justify-end gap-[var(--aui-space-2)]"><Button variant="ghost">Cancel</Button><Button>Save draft</Button></div>
      </CardContent>
    </Card>
  </div>
}

function Dashboard() {
  const metrics = [
    { label: 'Active projects', value: '24', delta: '+3 this week', tone: 'success' as const },
    { label: 'Avg. time to prototype', value: '38m', delta: '-6m', tone: 'success' as const },
    { label: 'Open validations', value: '7', delta: '+2', tone: 'warning' as const },
  ]
  return <div>
    <ResponsiveGrid minItemWidth="180px" className="mb-[var(--aui-space-4)]">
      {metrics.map((metric) => <Card key={metric.label} variant="bordered">
        <CardContent className="grid gap-[var(--aui-space-2)]">
          <span className="text-xs text-[var(--aui-text-muted)]">{metric.label}</span>
          <span className="text-2xl font-bold text-[var(--aui-text)]">{metric.value}</span>
          <Badge variant={metric.tone}>{metric.delta}</Badge>
        </CardContent>
      </Card>)}
    </ResponsiveGrid>
    <Card variant="bordered">
      <CardHeader><CardTitle>Prototypes shipped</CardTitle><CardDescription>최근 6주</CardDescription></CardHeader>
      <CardContent><BarChart label="Prototypes shipped by week" data={[{label:'W1',value:8},{label:'W2',value:12},{label:'W3',value:9},{label:'W4',value:16},{label:'W5',value:14},{label:'W6',value:21}]}/></CardContent>
    </Card>
  </div>
}

function Workspace() {
  const panel = 'rounded-[var(--aui-radius-control)] bg-[var(--aui-surface-muted)] p-[var(--aui-space-3)] text-xs font-semibold text-[var(--aui-text-muted)]'
  return <Card variant="bordered">
    <CardHeader><CardTitle>Wide layout</CardTitle><CardDescription>app-header · 좌측 패널 · 주 캔버스 · 우측 패널. 좁은 폭에서는 패널이 drawer로 접힙니다.</CardDescription></CardHeader>
    <CardContent className="grid gap-[var(--aui-space-3)]">
      <div className={panel}>app-header</div>
      <div className="grid gap-[var(--aui-space-3)] md:grid-cols-[150px_1fr_190px]">
        <div className={panel}>left panel</div>
        <div className="grid min-h-[140px] place-items-center rounded-[var(--aui-radius-control)] bg-[var(--aui-surface)] text-xs font-semibold text-[var(--aui-text-muted)] ring-1 ring-inset ring-[var(--aui-border-subtle)]">primary canvas</div>
        <div className={panel}>right panel</div>
      </div>
    </CardContent>
  </Card>
}

function Landing() {
  const band = 'rounded-[var(--aui-radius-control)] bg-[var(--aui-surface-muted)] px-[var(--aui-space-4)] py-[var(--aui-space-3)] text-xs font-semibold text-[var(--aui-text-muted)]'
  return <Card variant="bordered">
    <CardContent className="grid gap-[var(--aui-space-3)]">
      <div className={band}>global-header</div>
      <div className="grid gap-[var(--aui-space-3)] rounded-[var(--aui-radius-control)] bg-[var(--aui-surface)] p-[var(--aui-space-5)] ring-1 ring-inset ring-[var(--aui-border-subtle)]">
        <div className="h-3 w-1/2 rounded bg-[var(--aui-fill-strong)]"/>
        <div className="h-2 w-2/3 rounded bg-[var(--aui-fill)]"/>
        <Button className="w-fit">Start free</Button>
      </div>
      <div className="flex gap-[var(--aui-space-2)]">{['Acme', 'Globex', 'Initech', 'Umbrella'].map((name) => <span key={name} className="flex-1 rounded bg-[var(--aui-fill)] px-[var(--aui-space-2)] py-[var(--aui-space-1)] text-center text-[10px] font-semibold text-[var(--aui-text-muted)]">{name}</span>)}</div>
      <ResponsiveGrid minItemWidth="120px">{['Compose', 'Compare', 'Expand'].map((feature) => <div key={feature} className={band}>{feature}</div>)}</ResponsiveGrid>
      <div className="rounded-[var(--aui-radius-control)] bg-[var(--aui-primary-soft)] px-[var(--aui-space-4)] py-[var(--aui-space-3)] text-xs font-semibold text-[var(--aui-primary-heavy)]">final-cta</div>
      <div className={band}>footer</div>
    </CardContent>
  </Card>
}

function FileAnalysis({ content }: { content: Contract }) {
  return <div>
    <StateLegend content={content} active={['analyzing', 'partial']}/>
    <Card variant="bordered">
      <CardHeader><CardTitle>Analyze uploads</CardTitle><CardDescription>수용·제외·검토 필요 항목을 생성 전에 드러냅니다.</CardDescription></CardHeader>
      <CardContent className="grid gap-[var(--aui-space-4)]">
        <FileUploader label="Project material" accept="PDF, DOCX, PNG · 최대 10MB" files={[]}/>
        <div>
          <ListRow leading={<CheckCircle2 size={18} className="text-[var(--aui-positive)]"/>} contents={<ListRowText title="product-brief.pdf" description="18 requirements extracted"/>} metadata={<Badge variant="success">Complete</Badge>}/>
          <ListRow leading={<Loader label="Analyzing" className="[&>span:last-child]:sr-only"/>} contents={<ListRowText title="flows.docx" description="Reading structure"/>} metadata={<Badge variant="info">Analyzing</Badge>}/>
          <ListRow leading={<AlertCircle size={18} className="text-[var(--aui-negative)]"/>} contents={<ListRowText title="research.zip" description="Unsupported archive format"/>} metadata={<Badge variant="error">Excluded</Badge>}/>
        </div>
        <InlineMessage tone="warning" title="3 items need review">추출된 요구사항 중 3건은 소스 라벨이 모호합니다. 생성 전에 확인하세요.</InlineMessage>
      </CardContent>
    </Card>
  </div>
}

function RequirementTraceability({ content }: { content: Contract }) {
  const rows: Array<{ id: string; name: string; screen: string; status: string; tone: 'success' | 'warning' | 'error' }> = [
    { id: 'REQ-004', name: 'Onboarding checklist', screen: 'Home, Setup', status: 'Covered', tone: 'success' },
    { id: 'REQ-011', name: 'Team invitations', screen: 'Members', status: 'Partial', tone: 'warning' },
    { id: 'REQ-019', name: 'Audit export', screen: '—', status: 'Unresolved', tone: 'error' },
  ]
  return <div>
    <StateLegend content={content} active={['partial', 'uncovered']}/>
    <Card variant="bordered">
      <CardHeader><CardTitle>Requirement coverage</CardTitle><CardDescription>소스 요구사항을 화면·백로그·검증 근거에 연결합니다.</CardDescription></CardHeader>
      <CardContent className="grid gap-[var(--aui-space-4)]">
        <div className="flex flex-wrap gap-[var(--aui-space-2)]"><Badge variant="success">Covered 12</Badge><Badge variant="warning">Partial 3</Badge><Badge variant="error">Unresolved 2</Badge><Badge variant="neutral">Out of scope 1</Badge></div>
        <div className="flex flex-wrap items-center gap-[var(--aui-space-2)]">
          <SearchField className="min-w-0 flex-1" aria-label="Search requirements" placeholder="Search requirements"/>
          <SegmentedControl label="Coverage filter" defaultValue="all" options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }]}/>
        </div>
        <TableContainer>
          <Table>
            <TableCaption>Requirement traceability</TableCaption>
            <TableHeader><TableRow><TableHead>Requirement</TableHead><TableHead>Screen</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => <TableRow key={row.id}><TableCell><span className="font-semibold text-[var(--aui-text)]">{row.id}</span> {row.name}</TableCell><TableCell>{row.screen}</TableCell><TableCell><Badge variant={row.tone}>{row.status}</Badge></TableCell></TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
        <InlineMessage tone="error" title="2 requirements unresolved">REQ-019와 REQ-022는 아직 화면에 연결되지 않았습니다.</InlineMessage>
      </CardContent>
    </Card>
  </div>
}

function LoadingPattern({ content }: { content: Contract }) {
  return <div>
    <StateLegend content={content} active={['determinate', 'delayed']}/>
    <ResponsiveGrid minItemWidth="240px">
      <Card variant="bordered">
        <CardHeader><CardTitle>Indeterminate</CardTitle><CardDescription>남은 시간을 알 수 없을 때</CardDescription></CardHeader>
        <CardContent className="grid gap-[var(--aui-space-3)]">
          <Loader label="Analyzing brief"/>
          <div className="flex justify-end"><Button variant="ghost">Cancel</Button></div>
        </CardContent>
      </Card>
      <Card variant="bordered">
        <CardHeader><CardTitle>Determinate</CardTitle><CardDescription>구조를 미리 보여주는 스켈레톤</CardDescription></CardHeader>
        <CardContent className="grid gap-[var(--aui-space-3)]">
          <Progress value={45} label="Generating screen 2 of 4"/>
          <div className="grid gap-[var(--aui-space-2)]"><Skeleton className="h-4 w-2/3"/><Skeleton className="h-3 w-full"/><Skeleton className="h-3 w-4/5"/></div>
        </CardContent>
      </Card>
    </ResponsiveGrid>
  </div>
}

function EmptyPattern({ content }: { content: Contract }) {
  return <div>
    <StateLegend content={content} active={['first-use', 'no-results']}/>
    <ResponsiveGrid minItemWidth="260px">
      <Card variant="bordered"><CardContent><Result figure={<Sparkles size={22}/>} title="No projects yet" description="첫 기획서를 올리면 A/B/C 시안이 생성됩니다." action={<Button>New project</Button>}/></CardContent></Card>
      <Card variant="bordered"><CardContent><Result figure={<Search size={22}/>} title="No matches" description="검색어와 필터를 조정해 보세요." action={<Button variant="outline">Clear filters</Button>}/></CardContent></Card>
    </ResponsiveGrid>
  </div>
}

function ErrorAndRecovery({ content }: { content: Contract }) {
  return <div>
    <StateLegend content={content} active={['section', 'recovering']}/>
    <Card variant="bordered">
      <CardHeader><CardTitle>Escalation levels</CardTitle><CardDescription>문제를 설명하고 유효한 작업을 보존하며 복구 경로를 제시합니다.</CardDescription></CardHeader>
      <CardContent className="grid gap-[var(--aui-space-4)]">
        <Field label="Delivery date" error="유효한 날짜를 입력하세요."><Input defaultValue="2026-13-02" readOnly aria-invalid="true"/></Field>
        <InlineMessage tone="error" title="Settings screen failed">이미지 분석 응답이 중단됐습니다. 다른 화면은 영향을 받지 않았습니다.</InlineMessage>
        <div className="flex flex-wrap items-center justify-between gap-[var(--aui-space-2)] rounded-[var(--aui-radius-control)] bg-[var(--aui-negative-soft)] p-[var(--aui-space-3)]">
          <span className="text-sm font-semibold text-[var(--aui-negative)]">Generation service unavailable</span>
          <Button variant="outline"><RefreshCw/>Retry</Button>
        </div>
        <Progress value={30} label="Retrying Settings screen"/>
      </CardContent>
    </Card>
  </div>
}

export function PatternSpecimen({ pageId, content }: { pageId: string; content: Contract }) {
  if (pageId === 'prompt-to-variants') return <PromptToVariants content={content}/>
  if (pageId === 'variant-comparison') return <VariantComparison content={content}/>
  if (pageId === 'selection-to-prototype') return <SelectionToPrototype content={content}/>
  if (pageId === 'generation-recovery') return <GenerationRecovery content={content}/>
  if (pageId === 'list-screen') return <ListScreen content={content}/>
  if (pageId === 'detail-screen') return <DetailScreen/>
  if (pageId === 'form-screen') return <FormScreen/>
  if (pageId === 'dashboard') return <Dashboard/>
  if (pageId === 'workspace') return <Workspace/>
  if (pageId === 'landing') return <Landing/>
  if (pageId === 'file-analysis') return <FileAnalysis content={content}/>
  if (pageId === 'requirement-traceability') return <RequirementTraceability content={content}/>
  if (pageId === 'loading') return <LoadingPattern content={content}/>
  if (pageId === 'empty') return <EmptyPattern content={content}/>
  if (pageId === 'error-and-recovery') return <ErrorAndRecovery content={content}/>
  return null
}
