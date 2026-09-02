'use client'

// Canonical interactive renderer for the Astryx (@astryxdesign/core) Playground
// catalog — parallel to ComponentPreview. Importing this module pulls the
// precompiled Astryx stylesheet + neutral theme; BuilderView only mounts it
// when the Astryx design system is active, so Aide-mode Playground never loads it.
import '@astryxdesign/core/astryx.css'
import '@astryxdesign/theme-neutral/theme.css'

import { Component, createElement, type ComponentType, type ReactNode } from 'react'
import { ASTRYX_CATALOG_BY_ID } from '@/lib/astryx-playground-components'

import { Button } from '@astryxdesign/core/Button'
import { IconButton } from '@astryxdesign/core/IconButton'
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton'
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup'
import { Link } from '@astryxdesign/core/Link'
import { Text, Heading } from '@astryxdesign/core/Text'
import { Blockquote } from '@astryxdesign/core/Blockquote'
import { Avatar } from '@astryxdesign/core/Avatar'
import { AvatarGroup } from '@astryxdesign/core/AvatarGroup'
import { Kbd } from '@astryxdesign/core/Kbd'
import { Thumbnail } from '@astryxdesign/core/Thumbnail'
import { Timestamp } from '@astryxdesign/core/Timestamp'
import { Citation } from '@astryxdesign/core/Citation'
import { Icon } from '@astryxdesign/core/Icon'
import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Toast } from '@astryxdesign/core/Toast'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { TextInput } from '@astryxdesign/core/TextInput'
import { TextArea } from '@astryxdesign/core/TextArea'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { Slider } from '@astryxdesign/core/Slider'
import { Switch } from '@astryxdesign/core/Switch'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList'
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'
import { Field } from '@astryxdesign/core/Field'
import { Card } from '@astryxdesign/core/Card'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { Divider } from '@astryxdesign/core/Divider'
import { Stack } from '@astryxdesign/core/Stack'
import { Grid } from '@astryxdesign/core/Grid'
import { Section } from '@astryxdesign/core/Section'
import { Center } from '@astryxdesign/core/Center'
import { AspectRatio } from '@astryxdesign/core/AspectRatio'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs'
import { Pagination } from '@astryxdesign/core/Pagination'
import { TabList, Tab } from '@astryxdesign/core/TabList'
import { Stepper, Step } from '@astryxdesign/core/Stepper'
import { Table } from '@astryxdesign/core/Table'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Tooltip } from '@astryxdesign/core/Tooltip'
import { Popover } from '@astryxdesign/core/Popover'
import { Dialog } from '@astryxdesign/core/Dialog'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { ContextMenu } from '@astryxdesign/core/ContextMenu'
import { HoverCard } from '@astryxdesign/core/HoverCard'
import { MoreMenu } from '@astryxdesign/core/MoreMenu'
import { Lightbox } from '@astryxdesign/core/Lightbox'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { CommandPalette } from '@astryxdesign/core/CommandPalette'
import { AppShell } from '@astryxdesign/core/AppShell'
import { SideNav, SideNavItem } from '@astryxdesign/core/SideNav'
import { TopNav, TopNavItem } from '@astryxdesign/core/TopNav'
import { MobileNav } from '@astryxdesign/core/MobileNav'
import { TreeList } from '@astryxdesign/core/TreeList'
import { Outline } from '@astryxdesign/core/Outline'
import { OverflowList } from '@astryxdesign/core/OverflowList'
import { TabMenu } from '@astryxdesign/core/TabList'
import { Selector } from '@astryxdesign/core/Selector'
import { MultiSelector } from '@astryxdesign/core/MultiSelector'
import { Typeahead, createStaticSource } from '@astryxdesign/core/Typeahead'
import { Tokenizer } from '@astryxdesign/core/Tokenizer'
import { DateInput } from '@astryxdesign/core/DateInput'
import { TimeInput } from '@astryxdesign/core/TimeInput'
import { DateRangeInput } from '@astryxdesign/core/DateRangeInput'
import { DateTimeInput } from '@astryxdesign/core/DateTimeInput'
import { FileInput } from '@astryxdesign/core/FileInput'
import { InputGroup } from '@astryxdesign/core/InputGroup'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { SelectableCard } from '@astryxdesign/core/SelectableCard'
import { PowerSearch } from '@astryxdesign/core/PowerSearch'
import { Calendar } from '@astryxdesign/core/Calendar'
import { Carousel } from '@astryxdesign/core/Carousel'
import { Markdown } from '@astryxdesign/core/Markdown'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Toolbar } from '@astryxdesign/core/Toolbar'
import { CollapsibleGroup } from '@astryxdesign/core/Collapsible'
import { AvatarStatusDot } from '@astryxdesign/core/Avatar'
import { ChatComposer, ChatMessageBubble } from '@astryxdesign/core/Chat'

type Props = Record<string, string>
type AstryxComponentPreviewProps = { id: string; props?: Props; device?: 'mobile' | 'desktop'; slot?: ReactNode }

const noop = () => {}

/* eslint-disable @typescript-eslint/no-explicit-any */

// Non-composite components: rendered generically with coerced props.
const SIMPLE: Record<string, ComponentType<any>> = {
  'astryx-button': Button,
  'astryx-toggle-button': ToggleButton,
  'astryx-link': Link,
  'astryx-text': Text,
  'astryx-heading': Heading,
  'astryx-blockquote': Blockquote,
  'astryx-avatar': Avatar,
  'astryx-thumbnail': Thumbnail,
  'astryx-timestamp': Timestamp,
  'astryx-badge': Badge,
  'astryx-banner': Banner,
  'astryx-spinner': Spinner,
  'astryx-skeleton': Skeleton,
  'astryx-progress-bar': ProgressBar,
  'astryx-status-dot': StatusDot,
  'astryx-toast': Toast,
  'astryx-text-input': TextInput,
  'astryx-text-area': TextArea,
  'astryx-number-input': NumberInput,
  'astryx-slider': Slider,
  'astryx-switch': Switch,
  'astryx-divider': Divider,
}

const CONTROLLED = new Set([
  'astryx-text-input', 'astryx-text-area', 'astryx-number-input', 'astryx-slider', 'astryx-switch',
])
const NUMERIC_VALUE = new Set(['astryx-slider', 'astryx-number-input'])
const BOOL_VALUE = new Set(['astryx-switch'])

/** String panel props → typed component props, driven by the generated propSchema. */
function coerce(id: string, props: Props): { attrs: Record<string, unknown>; children: ReactNode } {
  const entry = ASTRYX_CATALOG_BY_ID[id]
  const attrs: Record<string, unknown> = {}
  let children: ReactNode = null
  for (const schema of entry?.propSchema ?? []) {
    const raw = props[schema.key]
    if (raw === undefined || raw === '') continue
    let value: unknown = raw
    if (schema.type === 'number') value = Number(raw)
    else if (schema.type === 'select' && schema.options?.length === 2 && schema.options.includes('true') && schema.options.includes('false')) {
      value = raw === 'true'
    }
    if (schema.key === 'children') children = raw
    else attrs[schema.key] = value
  }
  if (BOOL_VALUE.has(id)) attrs.value = props.value !== 'false'
  else if (NUMERIC_VALUE.has(id)) attrs.value = Number(props.value ?? entry?.defaultProps.value ?? 0)
  if (CONTROLLED.has(id)) attrs.onChange = noop
  return { attrs, children }
}

const box = (label: string) => (
  <Card padding={3} variant="muted">
    <Text type="supporting">{label}</Text>
  </Card>
)

// A static stand-in for an overlay surface — avoids portaling a real backdrop
// over the Playground while still showing what the component contains.
const overlaySurface = (title: string, body: string, action: string) => (
  <Card padding={4} elevation="high">
    <Heading level={4}>{title}</Heading>
    <Text type="body">{body}</Text>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
      <Button label="Cancel" variant="ghost" onClick={noop} />
      <Button label={action} variant="primary" onClick={noop} />
    </div>
  </Card>
)

const MENU_ITEMS = [
  { id: 'edit', label: 'Edit' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'delete', label: 'Delete' },
]
const TREE_ITEMS = [
  { id: 'src', label: 'src', children: [{ id: 'app', label: 'app' }, { id: 'lib', label: 'lib' }] },
  { id: 'public', label: 'public', children: [{ id: 'img', label: 'images' }] },
  { id: 'pkg', label: 'package.json' },
]
let itemSource: unknown
try {
  itemSource = (createStaticSource as any)(
    ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Grape', 'Mango', 'Orange'].map((label, i) => ({ id: String(i), label })),
  )
} catch {
  itemSource = undefined
}
const ITEM_SOURCE = itemSource

function renderComposite(id: string, p: Props, slot?: ReactNode): ReactNode {
  const label = p.label || ''
  switch (id) {
    case 'astryx-card':
      return (
        <Card padding={Number(p.padding ?? 4) as any} variant={(p.variant as any) ?? 'default'} elevation={(p.elevation as any) ?? 'none'}>
          {p.title ? <Heading level={4}>{p.title}</Heading> : null}
          {slot ?? <Text type="body">{p.children || 'Card surface'}</Text>}
        </Card>
      )
    case 'astryx-clickable-card':
      return (
        <ClickableCard label={label || 'Open'} onClick={noop} variant={(p.variant as any) ?? 'default'}>
          {slot ?? <Text type="body">{p.children || 'Clickable card'}</Text>}
        </ClickableCard>
      )
    case 'astryx-button-group':
      return (
        <ButtonGroup label={label || 'Actions'}>
          <Button label="One" variant="secondary" onClick={noop} />
          <Button label="Two" variant="secondary" onClick={noop} />
          <Button label="Three" variant="secondary" onClick={noop} />
        </ButtonGroup>
      )
    case 'astryx-avatar-group':
      return (
        <AvatarGroup shape={(p.shape as any) ?? 'circle'}>
          <Avatar name="Alex Kim" />
          <Avatar name="Jamie Lee" />
          <Avatar name="Taylor Park" />
          <Avatar name="Morgan Cho" />
        </AvatarGroup>
      )
    case 'astryx-segmented-control':
      return (
        <SegmentedControl label={label || 'View'} value={p.value || 'list'} onChange={noop} size={(p.size as any) ?? 'md'}>
          <SegmentedControlItem value="list" label="List" />
          <SegmentedControlItem value="board" label="Board" />
          <SegmentedControlItem value="calendar" label="Calendar" />
        </SegmentedControl>
      )
    case 'astryx-checkbox-list':
      return (
        <CheckboxList label={label || 'Notifications'} description={p.description || undefined} density={(p.density as any) ?? undefined}>
          <CheckboxListItem label="Email" value="email" />
          <CheckboxListItem label="SMS" value="sms" />
          <CheckboxListItem label="Push" value="push" />
        </CheckboxList>
      )
    case 'astryx-radio-list':
      return (
        <RadioList label={label || 'Plan'} value={p.value || 'pro'} onChange={noop} orientation={(p.orientation as any) ?? 'vertical'}>
          <RadioListItem label="Starter" value="starter" />
          <RadioListItem label="Pro" value="pro" />
          <RadioListItem label="Enterprise" value="enterprise" />
        </RadioList>
      )
    case 'astryx-field':
      return (
        <Field label={label || 'Email address'} inputID="astryx-pg-field" description={p.description || undefined}>
          <input id="astryx-pg-field" placeholder={p.placeholder || 'you@example.com'} style={{ width: '100%', padding: 8 }} />
        </Field>
      )
    case 'astryx-collapsible':
      return (
        <Collapsible trigger={p.trigger || 'Details'} defaultIsOpen>
          {slot ?? <Text type="body">{p.children || 'Collapsible body content.'}</Text>}
        </Collapsible>
      )
    case 'astryx-stack':
      return (
        <Stack direction={(p.direction as any) ?? 'vertical'} gap={Number(p.gap ?? 2) as any}>
          {slot ?? <>{box('Item one')}{box('Item two')}{box('Item three')}</>}
        </Stack>
      )
    case 'astryx-grid':
      return (
        <Grid columns={Number(p.columns ?? 3)} gap={Number(p.gap ?? 2) as any}>
          {slot ?? <>{box('1')}{box('2')}{box('3')}</>}
        </Grid>
      )
    case 'astryx-section':
      return (
        <Section variant={(p.variant as any) ?? undefined} padding={Number(p.padding ?? 6) as any}>
          {p.title ? <Heading level={4}>{p.title}</Heading> : null}
          {slot ?? <Text type="body">{p.children || 'Grouped page content lives inside a section.'}</Text>}
        </Section>
      )
    case 'astryx-center':
      return (
        <Center axis={(p.axis as any) ?? 'both'} style={{ minHeight: 96 }}>
          {slot ?? <Text type="label">Centered</Text>}
        </Center>
      )
    case 'astryx-aspect-ratio':
      return (
        <AspectRatio ratio={16 / 9} shape={(p.shape as any) ?? undefined}>
          <Center axis="both" style={{ background: 'var(--color-surface-neutral-subtle, #eee)', height: '100%' }}>
            <Text type="label">16 : 9</Text>
          </Center>
        </AspectRatio>
      )
    case 'astryx-breadcrumbs':
      return (
        <Breadcrumbs label={label || 'Breadcrumb'} variant={(p.variant as any) ?? undefined}>
          <BreadcrumbItem href="#">Home</BreadcrumbItem>
          <BreadcrumbItem href="#">Library</BreadcrumbItem>
          <BreadcrumbItem>Data</BreadcrumbItem>
        </Breadcrumbs>
      )
    case 'astryx-pagination':
      return <Pagination page={1} onChange={noop} totalItems={100} pageSize={10} variant={(p.variant as any) ?? 'pages'} size={(p.size as any) ?? 'md'} />
    case 'astryx-tab-list':
      return (
        <TabList value={p.value || 'overview'} onChange={noop} size={(p.size as any) ?? 'md'}>
          <Tab value="overview" label="Overview" />
          <Tab value="activity" label="Activity" />
          <Tab value="settings" label="Settings" />
        </TabList>
      )
    case 'astryx-stepper':
      return (
        <Stepper activeStep={1}>
          <Step step={0} label="Cart" />
          <Step step={1} label="Shipping" />
          <Step step={2} label="Payment" />
        </Stepper>
      )
    case 'astryx-list':
      return (
        <List density={(p.density as any) ?? undefined} hasDividers={p.hasDividers === 'true'}>
          <ListItem label="First item" />
          <ListItem label="Second item" />
          <ListItem label="Third item" />
        </List>
      )
    case 'astryx-metadata-list':
      return (
        <MetadataList title={p.title || undefined} orientation={(p.orientation as any) ?? undefined}>
          <MetadataListItem label="Status">Active</MetadataListItem>
          <MetadataListItem label="Owner">Jamie Lee</MetadataListItem>
          <MetadataListItem label="Updated">2 hours ago</MetadataListItem>
        </MetadataList>
      )
    case 'astryx-table':
      return (
        <Table
          density={(p.density as any) ?? undefined}
          isStriped={p.isStriped === 'true'}
          hasHover={p.hasHover === 'true'}
          data={[
            { name: 'Alice Chen', role: 'Engineer', status: 'Active' },
            { name: 'Bob Smith', role: 'Designer', status: 'Away' },
            { name: 'Carol Diaz', role: 'PM', status: 'Active' },
          ]}
        />
      )
    case 'astryx-empty-state':
      return <EmptyState title={p.title || 'No results found'} description={p.description || 'Try adjusting your search or filter criteria.'} />
    case 'astryx-tooltip':
      return (
        <Tooltip content={p.children || 'Helpful tooltip text'}>
          <Button label="Hover me" variant="secondary" onClick={noop} />
        </Tooltip>
      )
    case 'astryx-popover':
      return (
        <Popover content={<Text type="body">{p.children || 'Popover content goes here.'}</Text>}>
          <Button label="Open popover" variant="secondary" onClick={noop} />
        </Popover>
      )

    // ── Overlays — closed by default; the trigger + an inline surface mock so
    //    the preview never portals a full-screen backdrop over the Playground.
    case 'astryx-dialog':
      return (
        <>
          <Dialog isOpen={false} onOpenChange={noop} variant={(p.variant as any) ?? undefined}>{null as any}</Dialog>
          {overlaySurface(p.title || 'Dialog title', p.children || 'Dialog body content.', 'Confirm')}
        </>
      )
    case 'astryx-alert-dialog':
      return (
        <>
          <AlertDialog isOpen={false} onOpenChange={noop} title="" description="" actionLabel="" onAction={noop} />
          {overlaySurface(p.title || 'Delete this item?', p.description || 'This action cannot be undone.', 'Delete')}
        </>
      )
    case 'astryx-command-palette':
      return (
        <>
          <CommandPalette isOpen={false} onOpenChange={noop} searchSource={ITEM_SOURCE as any} />
          {overlaySurface('Command palette', 'Type to search commands, pages and people…', 'Open ⌘K')}
        </>
      )
    case 'astryx-lightbox':
      return (
        <>
          <Lightbox isOpen={false} onOpenChange={noop} media={[{ type: 'image', src: '/logo_aide.png', alt: 'Sample' }] as any} />
          {overlaySurface('Lightbox', 'Full-screen media viewer with zoom and navigation.', 'View media')}
        </>
      )
    case 'astryx-bottom-sheet':
      return (
        <>
          <BottomSheet isOpen={false} label={label || 'Details'} onOpenChange={noop}>{null as any}</BottomSheet>
          {overlaySurface(label || 'Details', p.children || 'Slides up from the bottom on mobile.', 'Open sheet')}
        </>
      )
    case 'astryx-dropdown-menu':
      return <DropdownMenu button={{ label: label || 'Menu', variant: 'secondary' } as any} items={MENU_ITEMS as any} />
    case 'astryx-more-menu':
      return <MoreMenu label={label || 'More actions'} items={MENU_ITEMS as any} />
    case 'astryx-context-menu':
      return (
        <ContextMenu items={MENU_ITEMS as any}>
          <div style={{ padding: 16, border: '1px dashed var(--color-border-neutral, #ccc)', borderRadius: 8 }}>Right-click here</div>
        </ContextMenu>
      )
    case 'astryx-hover-card':
      return (
        <HoverCard content={<Text type="body">{p.children || 'Extra detail on hover.'}</Text>}>
          <Button label="Hover me" variant="secondary" onClick={noop} />
        </HoverCard>
      )

    // ── Navigation shells ──────────────────────────────────────────────────
    case 'astryx-app-shell':
      return (
        <div style={{ height: 220, border: '1px solid var(--color-border-neutral, #ccc)', borderRadius: 8, overflow: 'hidden' }}>
          <AppShell height="fill" topNav={<TopNav label="Acme" />} sideNav={<SideNav><SideNavItem label="Home" /><SideNavItem label="Reports" /></SideNav>}>
            <Text type="body">Main content area</Text>
          </AppShell>
        </div>
      )
    case 'astryx-side-nav':
      return (
        <SideNav>
          <SideNavItem label="Home" />
          <SideNavItem label="Projects" />
          <SideNavItem label="Reports" />
          <SideNavItem label="Settings" />
        </SideNav>
      )
    case 'astryx-top-nav':
      return (
        <TopNav label={label || 'Acme'}>
          <TopNavItem label="Product" />
          <TopNavItem label="Pricing" />
          <TopNavItem label="Docs" />
        </TopNav>
      )
    case 'astryx-mobile-nav':
      return (
        <MobileNav {...({ label: 'Menu' } as any)}>
          <SideNavItem label="Home" />
          <SideNavItem label="Search" />
          <SideNavItem label="Profile" />
        </MobileNav>
      )
    case 'astryx-tree-list':
      return <TreeList items={TREE_ITEMS as any} />
    case 'astryx-outline':
      return <Outline items={[{ id: 'a', label: 'Introduction' }, { id: 'b', label: 'Getting started' }, { id: 'c', label: 'API reference' }] as any} />
    case 'astryx-overflow-list':
      return (
        <OverflowList behavior={(p.behavior as any) ?? undefined}>
          {['Overview', 'Activity', 'Members', 'Settings', 'Billing', 'Integrations'].map((t) => (
            <Badge key={t} label={t} />
          ))}
        </OverflowList>
      )
    case 'astryx-tab-menu':
      return (
        <TabList value="all" onChange={noop}>
          <TabMenu
            label={label || 'More'}
            options={[
              { value: 'archived', label: 'Archived' },
              { value: 'trash', label: 'Trash' },
            ]}
          />
        </TabList>
      )

    // ── Advanced form controls ─────────────────────────────────────────────
    case 'astryx-selector':
      return (
        <Selector
          label={label || 'Country'}
          value={p.value || 'kr'}
          onChange={noop}
          options={[
            { value: 'kr', label: 'Korea' },
            { value: 'us', label: 'United States' },
            { value: 'jp', label: 'Japan' },
          ]}
        />
      )
    case 'astryx-multi-selector':
      return (
        <MultiSelector
          label={label || 'Tags'}
          value={['design']}
          onChange={noop}
          options={[
            { value: 'design', label: 'Design' },
            { value: 'eng', label: 'Engineering' },
            { value: 'pm', label: 'Product' },
          ]}
        />
      )
    case 'astryx-complex-selector':
      // ComplexSelector drives its trigger + options through render-prop children;
      // there is no meaningful static preview. Show the closed trigger surface.
      return box('Complex Selector — filter/sort builder (configure in code)')
    case 'astryx-typeahead':
      return <Typeahead label={label || 'Search fruit'} value={null as any} onChange={noop} searchSource={ITEM_SOURCE as any} />
    case 'astryx-tokenizer':
      return <Tokenizer label={label || 'Recipients'} value={[]} onChange={noop} searchSource={ITEM_SOURCE as any} />
    case 'astryx-date-input':
      return <DateInput label={label || 'Start date'} value={null as any} onChange={noop} />
    case 'astryx-time-input':
      return <TimeInput label={label || 'Start time'} value={null as any} onChange={noop} />
    case 'astryx-date-range-input':
      return <DateRangeInput label={label || 'Date range'} value={'' as any} onChange={noop} />
    case 'astryx-date-time-input':
      return <DateTimeInput label={label || 'Scheduled at'} value={null as any} onChange={noop} />
    case 'astryx-file-input':
      return <FileInput label={label || 'Attachments'} value={[]} onChange={noop} />
    case 'astryx-input-group':
      return (
        <InputGroup label={label || 'Website'}>
          <input placeholder="example.com" style={{ width: '100%', padding: 8 }} />
        </InputGroup>
      )
    case 'astryx-form-layout':
      return (
        <FormLayout>
          <Field label="First name" inputID="astryx-fl-1">
            <input id="astryx-fl-1" style={{ width: '100%', padding: 8 }} />
          </Field>
          <Field label="Last name" inputID="astryx-fl-2">
            <input id="astryx-fl-2" style={{ width: '100%', padding: 8 }} />
          </Field>
        </FormLayout>
      )
    case 'astryx-checkbox-input':
      return <CheckboxInput label={label || 'I agree to the terms'} value={p.value === 'true'} onChange={noop} />
    case 'astryx-selectable-card':
      return (
        <SelectableCard label={label || 'Standard plan'} isSelected onChange={noop}>
          <Text type="body">{p.children || '$12 / month'}</Text>
        </SelectableCard>
      )
    case 'astryx-power-search':
      return <PowerSearch config={{ fields: [] } as any} filters={[] as any} onChange={noop} placeholder={p.placeholder || 'Search…'} />
    case 'astryx-calendar':
      return <Calendar value={null as any} onChange={noop} />

    // ── Content / misc ────────────────────────────────────────────────────
    case 'astryx-carousel':
      return (
        <Carousel>
          {['One', 'Two', 'Three'].map((t) => (
            <div key={t} style={{ padding: 24, background: 'var(--color-surface-neutral-subtle, #eee)', borderRadius: 8 }}>
              <Text type="label">{t}</Text>
            </div>
          ))}
        </Carousel>
      )
    case 'astryx-markdown':
      return <Markdown>{p.children || '## Heading\n\nA paragraph with **bold** and _italic_ text, plus a list:\n\n- First\n- Second'}</Markdown>
    case 'astryx-code-block':
      return <CodeBlock code={"const greet = (name: string) => `Hello, ${name}`"} language="typescript" hasCopyButton />
    case 'astryx-toolbar':
      return (
        <Toolbar
          {...({
            label: label || 'Formatting',
            startContent: (
              <>
                <Button label="Bold" variant="ghost" onClick={noop} />
                <Button label="Italic" variant="ghost" onClick={noop} />
                <Button label="Link" variant="ghost" onClick={noop} />
              </>
            ),
          } as any)}
        />
      )
    case 'astryx-collapsible-group':
      return (
        <CollapsibleGroup>
          <Collapsible trigger="Shipping" defaultIsOpen>
            <Text type="body">Ships in 2–3 business days.</Text>
          </Collapsible>
          <Collapsible trigger="Returns">
            <Text type="body">30-day return window.</Text>
          </Collapsible>
        </CollapsibleGroup>
      )
    case 'astryx-toggle-button-group':
      return (
        <ToggleButtonGroup label={label || 'Alignment'} value="left" onChange={noop}>
          <ToggleButton label="Left" value="left" />
          <ToggleButton label="Center" value="center" />
          <ToggleButton label="Right" value="right" />
        </ToggleButtonGroup>
      )
    case 'astryx-avatar-status-dot':
      return <Avatar name={label || 'Alex Kim'} status={<AvatarStatusDot variant={(p.variant as any) ?? 'success'} />} />
    case 'astryx-chat-composer':
      return <ChatComposer onSubmit={noop} placeholder={p.placeholder || 'Message the assistant…'} />
    case 'astryx-chat-message-bubble':
      return <ChatMessageBubble>{p.children || 'Hi — how can I help you today?'}</ChatMessageBubble>

    default:
      return box(id)
  }
}

class PreviewBoundary extends Component<{ id: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return (
        <div style={{ padding: 8, border: '1px dashed #c33', borderRadius: 6, fontSize: 12, color: '#c33' }}>
          {this.props.id} — preview unavailable
        </div>
      )
    }
    return this.props.children
  }
}

function Rendered({ id, props, slot }: { id: string; props: Props; slot?: ReactNode }) {
  const entry = ASTRYX_CATALOG_BY_ID[id]
  if (!entry) return <Text type="supporting">{id}</Text>
  if (entry.composite) return <>{renderComposite(id, props, slot)}</>

  const Comp = SIMPLE[id]
  if (id === 'astryx-icon-button') {
    return <IconButton label={props.label || 'Action'} icon={<Icon icon={'settings' as any} />} variant={(props.variant as any) ?? 'secondary'} size={(props.size as any) ?? 'md'} isDisabled={props.isDisabled === 'true'} isLoading={props.isLoading === 'true'} onClick={noop} />
  }
  if (id === 'astryx-icon') {
    return <Icon icon={'star' as any} size={(props.size as any) ?? undefined} label={props.label || undefined} color={(props.color as any) ?? undefined} />
  }
  if (id === 'astryx-kbd') {
    return <Kbd keys={(props.keys || 'Cmd K') as any} />
  }
  if (id === 'astryx-citation') {
    return <Citation number={Number(props.number ?? 1)} source={{ title: 'Design Systems Handbook', url: '#' } as any} variant={(props.variant as any) ?? undefined} />
  }
  if (!Comp) return <Text type="supporting">{id}</Text>

  const { attrs, children } = coerce(id, props)
  return createElement(Comp, attrs, children)
}

/** Astryx catalog renderer. Wrapper pins light theme + full width. */
export function AstryxComponentPreview({ id, props = {}, slot }: AstryxComponentPreviewProps) {
  return (
    <div data-theme="light" style={{ width: '100%' }}>
      <PreviewBoundary id={id}>
        <Rendered id={id} props={props} slot={slot} />
      </PreviewBoundary>
    </div>
  )
}

export default AstryxComponentPreview
