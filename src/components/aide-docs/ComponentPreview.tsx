'use client'

import { Bell, ChevronRight, Search } from '@/components/ui/material-icon'
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
  const numericValue = (key: string, fallback: number) => Number.isFinite(Number(props[key])) ? Number(props[key]) : fallback
  const chartData = options.map((option, index) => {
    const [chartLabel, rawValue] = option.split(':')
    return { label: chartLabel || `항목 ${index + 1}`, value: Number(rawValue) || (index + 1) * 12 }
  })
  switch (id) {
    case 'button':
      return <div className={previewClassName}><Button variant={buttonVariant} size={buttonSize} disabled={disabled} className={props.width === 'fill' ? 'w-full' : undefined}>{label}</Button></div>
    case 'icon-button':
      return <Button size="icon" variant={buttonVariant} disabled={disabled} aria-label={label}><Bell/></Button>
    case 'action-bar':
      return <ResponsiveActionBar className={props.layout === 'stack' ? 'w-full flex-col' : 'w-full'}><Button variant="ghost" size={buttonSize}>취소</Button><Button size={buttonSize} disabled={disabled}>{label}</Button></ResponsiveActionBar>
    case 'fixed-bottom-cta':
      return <ResponsiveActionBar className="w-full" fixed={false}>{props['action-count'] === '2'&&<Button variant="ghost">취소</Button>}<Button className={device === 'mobile' ? 'w-full' : undefined}>{label}</Button></ResponsiveActionBar>
    case 'field':
      return <div className="docs-preview-stack"><Field label={props.label || '프로젝트 이름'} help={props.help} error={props.state === 'error' ? description : undefined} required={booleanProp(props.required)}><Input value={props.value || ''} placeholder={props.placeholder || '내용을 입력하세요'} disabled={disabled} readOnly/></Field></div>
    case 'field-group':
      return <FieldGroup label={title} help={description}>{options.map((option)=><Input key={option} aria-label={option} placeholder={option} readOnly/>)}</FieldGroup>
    case 'textarea':
      return <div className="docs-preview-stack"><Field label={props.label || '서비스 설명'}><Textarea value={props.value || ''} placeholder={props.placeholder || description} disabled={disabled} readOnly/></Field></div>
    case 'select':
      return <div className="docs-preview-stack"><Field label={label}><Select value={props.value || options[0]} onChange={() => {}} disabled={disabled}>{options.map((option)=><option key={option} value={option}>{option}</option>)}</Select></Field></div>
    case 'search':
      return <div className="docs-preview-stack"><SearchField aria-label={label} placeholder={props.placeholder || label} disabled={disabled}/></div>
    case 'number-field':
      return <NumberField label={label} value={numericValue('value', 3)} min={numericValue('min', 1)} max={numericValue('max', 10)} disabled={disabled}/>
    case 'slider':
      return <Slider label={label} value={numericValue('value', 72)} min={numericValue('min', 0)} max={numericValue('max', 100)} disabled={disabled}/>
    case 'keypad':
      return <div className="max-w-xs"><Keypad type="number" label={label}/></div>
    case 'checkbox':
      return <div className="docs-preview-stack">{options.map((option, index)=><Checkbox key={option} defaultChecked={index === 0 || props.state === 'selected'} disabled={disabled}>{option}</Checkbox>)}</div>
    case 'radio':
      return <RadioGroup name={`preview-${id}`} label={label}>{options.map((option,index)=><Radio key={option} value={`option-${index}`} defaultChecked={index===0} disabled={disabled}>{option}</Radio>)}</RadioGroup>
    case 'switch':
      return <div className="docs-preview-stack"><Switch checked={props.state === 'selected'} onChange={() => {}} disabled={disabled}>{label}</Switch></div>
    case 'agreement':
      return <Agreement legend={title} items={options.map((option,index)=>({id:`agreement-${index}`,label:option,required:index===0}))}/>
    case 'tabs':
      return <Tabs defaultValue="tab-0"><TabsList>{options.map((option,index)=><TabsTrigger key={option} value={`tab-${index}`}>{option}</TabsTrigger>)}</TabsList></Tabs>
    case 'segmented-control':
      return <SegmentedControl label={label} defaultValue="option-0" options={options.map((option,index)=>({value:`option-${index}`,label:option}))}/>
    case 'chip':
      return <div className="docs-preview-row">{options.map((option,index)=><Chip key={option} selected={index===0}>{option}</Chip>)}</div>
    case 'stepper':
      return <Stepper current={Math.max(0, Math.min(options.length - 1, numericValue('value', 1)))} steps={options.map((option,index)=>({id:`step-${index}`,label:option}))}/>
    case 'navigation':
      return <Navigation variant={props.orientation === 'vertical' ? 'side' : 'top'} activeId="item-0" items={navigationItems}/>
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
      return <Breadcrumb items={options.map((option,index)=>({label:option, ...(index < options.length - 1 ? { href: '#' } : {})}))}/>
    case 'badge':
      return <Badge variant={props.state === 'success' ? 'success' : props.state === 'warning' ? 'warning' : 'neutral'}>{label}</Badge>
    case 'avatar':
      return <Avatar fallback={label.slice(0, 2).toUpperCase()}/>
    case 'card':
      return <Card className="w-full" variant={props.emphasis === 'raised' ? 'raised' : props.emphasis === 'bordered' ? 'bordered' : 'plain'}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="text-sm text-[var(--aui-text-muted)]">{description}</CardContent></Card>
    case 'panel':
      return <div className="docs-preview-panel"><b>{title}</b><p className="docs-preview-muted">{description}</p></div>
    case 'list-cell':
      return <div className="docs-preview-stack"><ListRow leading={<Avatar fallback={label.slice(0,2).toUpperCase()} size="sm"/>} contents={<ListRowText title={label} description={description}/>} trailing={<ChevronRight size={16}/>}/></div>
    case 'list-section':
      return <ListSection className="w-full"><ListSectionHeader title={title} description={description}/><ListSectionContent>{options.map((option)=><ListRow key={option} contents={<ListRowText title={option}/>} trailing={<ChevronRight size={16}/>}/>)}</ListSectionContent><ListSectionFooter>총 {options.length}개</ListSectionFooter></ListSection>
    case 'table':
      return <TableContainer><Table><TableCaption>{title}</TableCaption><TableHeader><TableRow>{options.map((option)=><TableHead key={option}>{option}</TableHead>)}</TableRow></TableHeader><TableBody>{optionLines(description, ['데이터 1']).map((row,rowIndex)=><TableRow key={`${row}-${rowIndex}`}>{row.split('|').map((cell,index)=><TableCell key={`${cell}-${index}`}>{cell.trim()}</TableCell>)}</TableRow>)}</TableBody></Table></TableContainer>
    case 'metric':
      return <div className="docs-preview-panel"><span className="docs-preview-muted">{label}</span><div className="docs-preview-metric">{props.value || '24'}</div><Badge variant="success">{description}</Badge></div>
    case 'bar-chart':
      return <BarChart label={title} data={chartData}/>
    case 'prose':
      return <Prose><h2>{title}</h2><p>{description} <TextHighlight>{label}</TextHighlight></p></Prose>
    case 'responsive-grid':
      return <ResponsiveGrid className="w-full" minItemWidth="120px">{options.map((item)=><Card key={item}><CardContent className="p-4 text-sm font-semibold">{item}</CardContent></Card>)}</ResponsiveGrid>
    case 'detail-header':
      return <DetailHeader className="w-full" headingLevel="h3" eyebrow={props.eyebrow || 'Detail'} title={title} description={description} metadata={props.metadata} actions={<Button size="sm">{label}</Button>}/>
    case 'page-header':
      return <PageHeader eyebrow="Workspace" title={title} description={description} actions={<Button>{label}</Button>}/>
    case 'section-header':
      return <SectionHeader level={props['heading-level'] === 'h3' ? 'h3' : 'h2'} title={title} description={description} trailing={<Button variant="ghost" size="sm">{label}</Button>}/>
    case 'side-panel':
      return <SidePanel title={title} side={props.side === 'left' ? 'left' : 'right'} width={props.width === 'compact' ? 'compact' : props.width === 'wide' ? 'wide' : 'default'}>{description}</SidePanel>
    case 'workspace-shell':
      return <WorkspaceShell header={<AppHeader brand={title} items={navigationItems}/>} navigation={props.navigation === 'none' ? undefined : <SideNavigation title="Workspace" items={navigationItems}/>} inspector={props.inspector === 'none' ? undefined : <SidePanel title="Inspector">{description}</SidePanel>}><Card><CardHeader><CardTitle>Primary canvas</CardTitle></CardHeader><CardContent>{description}</CardContent></Card></WorkspaceShell>
    case 'progress':
      return <div className="docs-preview-stack"><Progress value={Math.max(0, Math.min(100, numericValue('value', 68)))} label={label}/></div>
    case 'alert':
      return <div className="docs-preview-stack"><InlineMessage tone={props.state === 'error' ? 'error' : props.state === 'warning' ? 'warning' : props.state === 'success' ? 'success' : 'info'} title={label}>{description}</InlineMessage></div>
    case 'toast':
      return <Toast tone={props.state === 'error' ? 'error' : props.state === 'warning' ? 'warning' : 'success'} title={label} description={description}/>
    case 'loading':
      return <div className="docs-loading-preview"><Loader label={description || '컴포넌트를 불러오고 있어요.'}/><div className="docs-loading-skeleton"><Skeleton className="h-4 w-2/3"/><Skeleton className="h-3 w-full"/><Skeleton className="h-3 w-4/5"/></div></div>
    case 'empty-state':
      return <Result figure={<Search size={22}/>} title={title} description={description}/>
    case 'result':
      return <Result figure={<Search size={22}/>} title={title} description={description} action={<Button>{label}</Button>}/>
    case 'dialog':
      return <AlertDialog><AlertDialogTrigger render={<Button/>}>{label}</AlertDialogTrigger><AlertDialogContent><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel render={<Button/>}>확인</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>
    case 'sheet':
      return <Sheet><SheetTrigger asChild><Button variant="outline">{label}</Button></SheetTrigger><SheetContent><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetContent></Sheet>
    case 'popover':
      return <Popover><PopoverTrigger render={<Button variant="outline"/>}>{label}</PopoverTrigger><PopoverContent><PopoverTitle>{title}</PopoverTitle><PopoverDescription>{description}</PopoverDescription></PopoverContent></Popover>
    case 'tooltip':
      return <TooltipProvider><Tooltip><TooltipTrigger render={<Button variant="outline" size="icon" aria-label={label}/> }><Bell/></TooltipTrigger><TooltipContent>{description}</TooltipContent></Tooltip></TooltipProvider>
    case 'dropdown-menu':
      return <Menu><MenuTrigger render={<Button variant="outline"/>}>{label}</MenuTrigger><MenuContent>{options.map((option)=><MenuItem key={option}>{option}</MenuItem>)}</MenuContent></Menu>
    default:
      return <div className="docs-preview-stack"><div className="docs-preview-panel"><b>{id}</b><p className="docs-preview-muted">Wonhee component contract</p></div></div>
  }
}
