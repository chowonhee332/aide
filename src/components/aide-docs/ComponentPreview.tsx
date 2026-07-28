'use client'

import { Bell, ChevronRight, Search, User } from '@/components/ui/material-icon'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Agreement } from '@/components/ui/agreement'
import { Avatar } from '@/components/ui/asset'
import { Badge } from '@/components/ui/badge'
import { BarChart } from '@/components/ui/bar-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox, Switch } from '@/components/ui/selection-control'
import { Chip } from '@/components/ui/chip'
import { DetailHeader } from '@/components/ui/detail-header'
import { Field, Input } from '@/components/ui/field'
import { FieldGroup } from '@/components/ui/field-group'
import { InlineMessage, Loader, Toast } from '@/components/ui/feedback'
import { Keypad } from '@/components/ui/keypad'
import { ListRow, ListRowText } from '@/components/ui/list-row'
import { ListSection, ListSectionContent, ListSectionFooter, ListSectionHeader } from '@/components/ui/list-section'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu'
import { Breadcrumb, Navigation } from '@/components/ui/navigation'
import { NumberField } from '@/components/ui/number-field'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Progress, Skeleton } from '@/components/ui/progress'
import { Prose, TextHighlight } from '@/components/ui/prose'
import { Radio, RadioGroup } from '@/components/ui/radio-group'
import { ResponsiveActionBar } from '@/components/ui/responsive-action-bar'
import { ResponsiveGrid } from '@/components/ui/responsive-grid'
import { Result } from '@/components/ui/result'
import { SearchField } from '@/components/ui/search-field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Stepper } from '@/components/ui/stepper'
import { Table, TableBody, TableCaption, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AppFooter, AppHeader, BottomAppBar, GlobalNavigation, LocalNavigation, PageHeader, SectionHeader, SideNavigation, SidePanel, TopNavigation, WorkspaceShell } from '@/components/ui/app-shell'

type ComponentPreviewProps = {
  id: string
  props?: Record<string, string>
  device?: 'mobile' | 'desktop'
  context?: 'docs' | 'playground'
}

function optionLines(value: string | undefined, fallback: string[]) {
  const values = value?.split('\n').map((item) => item.trim()).filter(Boolean)
  return values?.length ? values : fallback
}

function booleanProp(value: string | undefined) {
  return value === 'true' || value === 'selected' || value === 'disabled'
}

/** Canonical React renderer shared by /aide-ui and Playground. */
export function ComponentPreview({ id, props = {}, device = 'desktop', context = 'docs' }: ComponentPreviewProps) {
  const label = props.label || props.title || '계속하기'
  const title = props.title || label
  const description = props.description || '컴포넌트 설명을 입력하세요.'
  const options = optionLines(props.options, ['첫 번째', '두 번째', '세 번째'])
  const disabled = props.state === 'disabled' || booleanProp(props.disabled)
  const buttonVariant = props.variant === 'secondary' ? 'secondary' : props.variant === 'outline' ? 'outline' : props.variant === 'ghost' ? 'ghost' : 'default'
  const buttonSize = props.size === 'compact' ? 'sm' : props.size === 'prominent' ? 'prominent' : props.size === 'touch' || device === 'mobile' ? 'touch' : 'default'
  const previewClassName = context === 'playground' ? 'w-full' : undefined
  const navigationItems = options.slice(0, 5).map((option, index) => ({ id: `item-${index}`, label: option }))
  switch (id) {
    case 'button':
      return <div className={previewClassName}><Button variant={buttonVariant} size={buttonSize} disabled={disabled} className={props.width === 'fill' ? 'w-full' : undefined}>{label}</Button></div>
    case 'icon-button':
      return <div className="docs-preview-row"><Button size="icon" aria-label="알림"><Bell/></Button><Button size="icon" variant="outline" aria-label="사용자"><User/></Button></div>
    case 'action-bar':
      return <ResponsiveActionBar className="w-full"><Button variant="ghost">취소</Button><Button>변경사항 저장</Button></ResponsiveActionBar>
    case 'fixed-bottom-cta':
      return <ResponsiveActionBar className="w-full" fixed={false}>{props['action-count'] === '2'&&<Button variant="ghost">취소</Button>}<Button className={device === 'mobile' ? 'w-full' : undefined}>{label}</Button></ResponsiveActionBar>
    case 'field':
      return <div className="docs-preview-stack"><Field label={props.label || '프로젝트 이름'} help={props.help} error={props.state === 'error' ? description : undefined} required={booleanProp(props.required)}><Input value={props.value || ''} placeholder={props.placeholder || '내용을 입력하세요'} disabled={disabled} readOnly/></Field></div>
    case 'field-group':
      return <FieldGroup label="기간" help="시작일과 종료일을 입력하세요."><Input aria-label="시작일" defaultValue="2026-07-01" readOnly/><Input aria-label="종료일" defaultValue="2026-07-31" readOnly/></FieldGroup>
    case 'textarea':
      return <div className="docs-preview-stack"><Field label={props.label || '서비스 설명'}><Textarea value={props.value || ''} placeholder={props.placeholder || description} disabled={disabled} readOnly/></Field></div>
    case 'select':
      return <div className="docs-preview-stack"><Field label="디자인 시스템"><Select defaultValue="wonhee"><option value="wonhee">Wonhee Design</option></Select></Field></div>
    case 'search':
      return <div className="docs-preview-stack"><SearchField aria-label="컴포넌트 검색" placeholder="컴포넌트 검색"/></div>
    case 'number-field':
      return <NumberField label="참여 인원" defaultValue={3} min={1} max={10}/>
    case 'slider':
      return <Slider label="투명도" defaultValue={72} min={0} max={100}/>
    case 'keypad':
      return <div className="max-w-xs"><Keypad type="number" label="보안 번호 입력"/></div>
    case 'checkbox':
      return <div className="docs-preview-stack">{options.map((option, index)=><Checkbox key={option} defaultChecked={index === 0 || props.state === 'selected'} disabled={disabled}>{option}</Checkbox>)}</div>
    case 'radio':
      return <RadioGroup name={`preview-${id}`} label="공개 범위"><Radio value="team" defaultChecked>팀 공개</Radio><Radio value="private">비공개</Radio></RadioGroup>
    case 'switch':
      return <div className="docs-preview-stack"><Switch defaultChecked={props.state !== 'default'} disabled={disabled}>{label}</Switch></div>
    case 'agreement':
      return <Agreement items={[{id:'service',label:'서비스 이용약관',required:true,href:'#'},{id:'marketing',label:'마케팅 정보 수신',required:false}]}/>
    case 'tabs':
      return <Tabs defaultValue="tab-0"><TabsList>{options.map((option,index)=><TabsTrigger key={option} value={`tab-${index}`}>{option}</TabsTrigger>)}</TabsList></Tabs>
    case 'segmented-control':
      return <SegmentedControl label="기기" defaultValue="desktop" options={[{value:'desktop',label:'Desktop'},{value:'mobile',label:'Mobile'}]}/>
    case 'chip':
      return <div className="docs-preview-row">{options.map((option,index)=><Chip key={option} selected={index===0}>{option}</Chip>)}</div>
    case 'stepper':
      return <Stepper current={1} steps={[{id:'brief',label:'기획 입력'},{id:'generate',label:'시안 생성'},{id:'select',label:'시안 선택'}]}/>
    case 'navigation':
      return <Navigation variant="top" activeId="components" items={[{id:'foundations',label:'Foundations'},{id:'components',label:'Components'},{id:'patterns',label:'Patterns'}]}/>
    case 'app-header':
      return <AppHeader brand={title} items={navigationItems} activeId="item-0" position={props.position === 'sticky' ? 'sticky' : 'static'} showActions={props['show-actions'] !== 'false'}/>
    case 'global-navigation':
      return <GlobalNavigation items={navigationItems} activeId="item-0" alignment={props.alignment === 'center' ? 'center' : props.alignment === 'end' ? 'end' : 'start'}/>
    case 'local-navigation':
      return <LocalNavigation title={title} items={navigationItems} activeId="item-0" width={props.width === 'compact' ? 'compact' : props.width === 'wide' ? 'wide' : 'default'}/>
    case 'top-navigation':
      return <TopNavigation type={props.type === 'standard' ? 'standard' : 'root'} title={title} subtitle={props['show-subtitle'] === 'true' ? description : undefined}/>
    case 'side-navigation':
      return <SideNavigation title={title} items={navigationItems} activeId="item-0" width={props.width === 'compact' ? 'compact' : props.width === 'wide' ? 'wide' : 'default'}/>
    case 'bottom-app-bar':
      return <BottomAppBar items={navigationItems} activeId="item-0" itemCount={Number(props['item-count']) || 3} position={props.position === 'fixed' ? 'fixed' : 'static'}/>
    case 'app-footer':
      return <AppFooter brand={title} description={description} links={options} layout={props.layout === 'stack' ? 'stack' : 'split'} emphasis={props.emphasis === 'plain' ? 'plain' : 'muted'}/>
    case 'breadcrumb':
      return <Breadcrumb items={[{label:'Aide',href:'#'},{label:'Components',href:'#'},{label:'Table'}]}/>
    case 'badge':
      return <div className="docs-preview-row"><Badge variant="success">완료</Badge><Badge variant="warning">진행 중</Badge><Badge variant="neutral">Draft</Badge></div>
    case 'avatar':
      return <div className="docs-preview-row"><Avatar fallback="WH"/><Avatar fallback="AI" size="sm"/></div>
    case 'card':
      return <Card className="w-full" variant={props.emphasis === 'raised' ? 'raised' : props.emphasis === 'bordered' ? 'bordered' : 'plain'}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="text-sm text-[var(--aui-text-muted)]">{description}</CardContent></Card>
    case 'panel':
      return <div className="docs-preview-panel"><b>Inspector</b><p className="docs-preview-muted">Properties and states</p></div>
    case 'list-cell':
      return <div className="docs-preview-stack"><ListRow leading={<Avatar fallback="UI" size="sm"/>} contents={<ListRowText title="Action Button" description="Stable component"/>} trailing={<ChevronRight size={16}/>}/></div>
    case 'list-section':
      return <ListSection className="w-full"><ListSectionHeader title="최근 프로젝트" description="오늘 수정한 항목"/><ListSectionContent><ListRow contents={<ListRowText title="Aide Design System" description="방금 전 수정"/>} trailing={<ChevronRight size={16}/>}/><ListRow contents={<ListRowText title="Playground" description="어제 수정"/>} trailing={<ChevronRight size={16}/>}/></ListSectionContent><ListSectionFooter>총 2개 프로젝트</ListSectionFooter></ListSection>
    case 'table':
      return <TableContainer><Table><TableCaption>컴포넌트 구현 현황</TableCaption><TableHeader><TableRow><TableHead>컴포넌트</TableHead><TableHead>상태</TableHead><TableHead numeric>사용처</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Button</TableCell><TableCell>Stable</TableCell><TableCell numeric>12</TableCell></TableRow><TableRow><TableCell>Dialog</TableCell><TableCell>Stable</TableCell><TableCell numeric>4</TableCell></TableRow></TableBody></Table></TableContainer>
    case 'metric':
      return <div className="docs-preview-panel"><span className="docs-preview-muted">Implemented</span><div className="docs-preview-metric">24</div><Badge variant="success">+3 this week</Badge></div>
    case 'bar-chart':
      return <BarChart label="주간 생성 시안" data={[{label:'월',value:12},{label:'화',value:19},{label:'수',value:15},{label:'목',value:24}]}/>
    case 'prose':
      return <Prose><h2>명확한 인터페이스</h2><p>사용자가 해야 할 일을 먼저 보여주고 <TextHighlight>하나의 주요 행동</TextHighlight>에 집중합니다.</p></Prose>
    case 'responsive-grid':
      return <ResponsiveGrid className="w-full" minItemWidth="120px">{['Foundation','Components','Patterns'].map((item)=><Card key={item}><CardContent className="p-4 text-sm font-semibold">{item}</CardContent></Card>)}</ResponsiveGrid>
    case 'detail-header':
      return <DetailHeader className="w-full" headingLevel="h3" eyebrow="Components" title="프로젝트 상세" description="프로젝트 상태와 주요 작업을 확인합니다." metadata="마지막 수정: 오늘" actions={<Button size="sm">편집</Button>}/>
    case 'page-header':
      return <PageHeader eyebrow="Workspace" title={title} description={description} actions={<Button>{label}</Button>}/>
    case 'section-header':
      return <SectionHeader level={props['heading-level'] === 'h3' ? 'h3' : 'h2'} title={title} description={description} trailing={<Button variant="ghost" size="sm">더보기</Button>}/>
    case 'side-panel':
      return <SidePanel title={title} side={props.side === 'left' ? 'left' : 'right'} width={props.width === 'compact' ? 'compact' : props.width === 'wide' ? 'wide' : 'default'}>{description}</SidePanel>
    case 'workspace-shell':
      return <WorkspaceShell header={<AppHeader brand={title} items={navigationItems}/>} navigation={props.navigation === 'none' ? undefined : <SideNavigation title="Workspace" items={navigationItems}/>} inspector={props.inspector === 'none' ? undefined : <SidePanel title="Inspector">{description}</SidePanel>}><Card><CardHeader><CardTitle>Primary canvas</CardTitle></CardHeader><CardContent>{description}</CardContent></Card></WorkspaceShell>
    case 'progress':
      return <div className="docs-preview-stack"><Progress value={68} label="구현 진행률"/></div>
    case 'alert':
      return <div className="docs-preview-stack"><InlineMessage tone={props.state === 'error' ? 'error' : props.state === 'warning' ? 'warning' : props.state === 'success' ? 'success' : 'info'} title={label}>{description}</InlineMessage></div>
    case 'toast':
      return <Toast tone="success" title="변경사항을 저장했어요."/>
    case 'loading':
      return <div className="docs-loading-preview"><Loader label={description || '컴포넌트를 불러오고 있어요.'}/><div className="docs-loading-skeleton"><Skeleton className="h-4 w-2/3"/><Skeleton className="h-3 w-full"/><Skeleton className="h-3 w-4/5"/></div></div>
    case 'empty-state':
      return <Result figure={<Search size={22}/>} title="검색 결과가 없어요" description="다른 검색어를 입력해 보세요."/>
    case 'result':
      return <Result figure={<Search size={22}/>} title="아직 프로젝트가 없어요" description="첫 프로젝트를 만들고 디자인 시스템을 적용해 보세요." action={<Button>프로젝트 만들기</Button>}/>
    case 'dialog':
      return <AlertDialog><AlertDialogTrigger render={<Button/>}>Dialog 열기</AlertDialogTrigger><AlertDialogContent><AlertDialogTitle>변경사항을 저장할까요?</AlertDialogTitle><AlertDialogDescription>저장한 내용은 모든 화면에 적용됩니다.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel render={<Button/>}>확인</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>
    case 'sheet':
      return <Sheet><SheetTrigger asChild><Button variant="outline">Sheet 열기</Button></SheetTrigger><SheetContent><SheetTitle>컴포넌트 설정</SheetTitle><SheetDescription>선택한 컴포넌트의 속성과 상태를 조정합니다.</SheetDescription></SheetContent></Sheet>
    case 'popover':
      return <Popover><PopoverTrigger render={<Button variant="outline"/>}>프로젝트 정보</PopoverTrigger><PopoverContent><PopoverTitle>프로젝트 정보</PopoverTitle><PopoverDescription>현재 문서의 상태와 수정 정보입니다.</PopoverDescription></PopoverContent></Popover>
    case 'tooltip':
      return <TooltipProvider><Tooltip><TooltipTrigger render={<Button variant="outline" size="icon" aria-label="알림 설명"/>}><Bell/></TooltipTrigger><TooltipContent>새 알림</TooltipContent></Tooltip></TooltipProvider>
    case 'dropdown-menu':
      return <Menu><MenuTrigger render={<Button variant="outline"/>}>메뉴 열기</MenuTrigger><MenuContent><MenuItem>이름 변경</MenuItem><MenuItem>복제</MenuItem></MenuContent></Menu>
    default:
      return <div className="docs-preview-stack"><div className="docs-preview-panel"><b>{id}</b><p className="docs-preview-muted">Wonhee component contract</p></div></div>
  }
}
