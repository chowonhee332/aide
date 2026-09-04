import Link from 'next/link'
import {
  ArrowLeft, Bell, Check, ChevronDown, ChevronRight, Clock3,
  Download, MoreHorizontal, Plus, Settings,
  Sparkles, Upload, User, X,
} from '@/components/ui/material-icon'
import { AUI_AI_GUIDE, AUI_COMPONENT_CATEGORIES, AUI_DEVELOP_COMMANDS, AUI_DOCUMENTATION, AUI_SHOWCASE_SECTIONS, AUI_TOKEN_GROUPS, AUI_TOKEN_ENTRIES, AUI_SCHEMA_VERSION } from '@/lib/aide-product-tokens'
import {
  AIDE_ACCESSIBILITY_REQUIREMENTS, AIDE_ACCESSIBILITY_STANDARD,
  AIDE_REFERENCE_CATALOG,
} from '@/lib/aide-design-contract'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field as UIField, Input } from '@/components/ui/field'
import { Checkbox, Switch } from '@/components/ui/selection-control'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ListRow, ListRowText } from '@/components/ui/list-row'
import { Progress, Skeleton } from '@/components/ui/progress'
import { Result } from '@/components/ui/result'
import { SearchField } from '@/components/ui/search-field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { InlineMessage, Loader, Toast } from '@/components/ui/feedback'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Menu as UIMenu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Radio, RadioGroup } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { Chip } from '@/components/ui/chip'
import { Asset, Avatar } from '@/components/ui/asset'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCaption, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ResponsiveActionBar } from '@/components/ui/responsive-action-bar'
import { ResponsiveGrid } from '@/components/ui/responsive-grid'
import { ListSection, ListSectionContent, ListSectionFooter, ListSectionHeader } from '@/components/ui/list-section'
import { FieldGroup } from '@/components/ui/field-group'
import { Prose, TextHighlight } from '@/components/ui/prose'
import { DetailHeader } from '@/components/ui/detail-header'
import { NumberField } from '@/components/ui/number-field'
import { Slider } from '@/components/ui/slider'
import { Rating } from '@/components/ui/rating'
import { Stepper } from '@/components/ui/stepper'
import { BarChart } from '@/components/ui/bar-chart'
import { Agreement } from '@/components/ui/agreement'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverCloseButton, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Keypad } from '@/components/ui/keypad'
import { Breadcrumb, Navigation, NavigationMenuButton } from '@/components/ui/navigation'
import { componentImplementationState } from '@/lib/aide-component-coverage'
import { GetStartedPage } from '@/components/aide-docs/DocsPage'

/* Every list below is derived from aide.md — never hand-listed here.
   Editing the md contract updates this showcase and the product together. */

const colors = (AUI_TOKEN_GROUPS.color ?? []).map((t) => [t.key, `var(${t.cssVar})`] as const)

const radii = (AUI_TOKEN_GROUPS.radius ?? [])
  .filter((t) => t.key !== 'pill')
  .map((t) => [t.key, `var(${t.cssVar})`] as const)

const spacing = (AUI_TOKEN_GROUPS.space ?? []).map(
  (t) => [t.key.replace('space-', ''), parseInt(t.value, 10)] as const,
)

const motion = (AUI_TOKEN_GROUPS.motion ?? []).filter((t) => t.key !== 'easing')

const gradients = AUI_TOKEN_GROUPS.gradient ?? []
const blurs = AUI_TOKEN_GROUPS.blur ?? []

/** Full-value elevation tokens; the bare colour tokens are building blocks, not shadows. */
const elevations = (AUI_TOKEN_GROUPS.shadow ?? []).filter((t) => t.value.includes(' '))

const implementedCount = AIDE_REFERENCE_CATALOG.filter((item) => componentImplementationState(item.id) === 'implemented').length
const excludedCount = AIDE_REFERENCE_CATALOG.length - implementedCount
const DOCUMENTATION_ANCHORS: Record<string, string> = {
  'get-started': 'get-started',
  foundations: 'foundations',
  components: 'actions',
  patterns: 'layouts',
  develop: 'develop',
  'ai-and-tools': 'ai-and-tools',
}
const DOCUMENTATION_ITEM_ANCHORS: Record<string, string> = {
  color: 'foundations', typography: 'typography', spacing: 'tokens', radius: 'tokens', elevation: 'tokens', motion: 'tokens', gradient: 'brand',
  actions: 'actions', inputs: 'inputs', selection: 'selection', navigation: 'layouts', 'data-display': 'data', feedback: 'feedback', overlays: 'overlays',
  landing: 'brand', 'list-screen': 'data', 'detail-screen': 'compositions', 'form-screen': 'inputs', dashboard: 'data', workspace: 'layouts', loading: 'feedback', empty: 'feedback', 'error-and-recovery': 'feedback',
}

function documentationAnchor(group: string, item?: string) {
  if (!item) return DOCUMENTATION_ANCHORS[group] ?? 'get-started'
  return DOCUMENTATION_ITEM_ANCHORS[item] ?? DOCUMENTATION_ANCHORS[group] ?? 'get-started'
}

/** Rebuild each typography scale from its `--aui-type-<scale>-*` parts. */
const typeScale = Object.values(
  (AUI_TOKEN_GROUPS.typography ?? []).reduce<
    Record<string, { name: string; size: string; leading: string; weight: string; role: string }>
  >((acc, entry) => {
    const match = entry.cssVar.match(/^--aui-type-(.+)-(size|leading|weight|tracking|family)$/)
    if (!match) return acc
    const [, scale, part] = match
    const row = (acc[scale] ??= {
      name: scale.replace(/-/g, ' '),
      size: '',
      leading: '',
      weight: '',
      role: entry.description ?? '',
    })
    if (part === 'size') row.size = entry.value
    if (part === 'leading') row.leading = entry.value
    if (part === 'weight') row.weight = entry.value
    return acc
  }, {}),
).filter((row) => row.size && row.leading)

const SHOWCASE_RENDERER_IDS = [
  'brand', 'foundations', 'typography', 'tokens', 'actions', 'inputs', 'selection',
  'data', 'feedback', 'overlays', 'compositions', 'specialized', 'layouts', 'accessibility',
] as const

const showcaseSectionById = new Map(AUI_SHOWCASE_SECTIONS.map((section, index) => [section.id, { ...section, index }]))
const missingRenderers = AUI_SHOWCASE_SECTIONS.filter((section) => !SHOWCASE_RENDERER_IDS.includes(section.id as typeof SHOWCASE_RENDERER_IDS[number]))
const missingManifestEntries = SHOWCASE_RENDERER_IDS.filter((id) => !showcaseSectionById.has(id))
if (missingRenderers.length || missingManifestEntries.length) {
  throw new Error(`aide.md visualization mismatch — unknown: ${missingRenderers.map((section) => section.id).join(', ') || 'none'}; missing: ${missingManifestEntries.join(', ') || 'none'}`)
}

function Section({ id, children }: { id: string; eyebrow?: string; title?: string; description?: string; children: React.ReactNode }) {
  const section = showcaseSectionById.get(id)
  if (!section) throw new Error(`aide.md: visualization renderer metadata missing for ${id}`)
  return <section className="aui-section" id={id} style={{ order: 10 + section.index }}><div className="aui-section-head"><span>{section.eyebrow}</span><h2>{section.title}</h2><p>{section.description}</p></div>{children}{id === 'tokens' && <div className="component-token-board"><h3>Component tokens</h3><div>{(AUI_TOKEN_GROUPS.component ?? []).map((token)=><span key={token.cssVar}><b>{token.key}</b><code>{token.value}</code></span>)}</div></div>}</section>
}

function Field({ label, placeholder, state }: { label: string; placeholder: string; state?: 'error' | 'success' | 'disabled' }) {
  return <UIField label={label} error={state === 'error' ? '입력 내용을 다시 확인해 주세요.' : undefined}><div className="relative"><Input placeholder={placeholder} disabled={state === 'disabled'} aria-invalid={state === 'error' || undefined} className={state === 'success' ? 'pr-9' : undefined}/>{state === 'success'&&<Check aria-hidden size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aui-positive)]"/>}</div></UIField>
}

function LegacyAideProductUIShowcase() {
  return <main className="product-showcase">
    <style>{`
      .product-showcase{min-height:100vh;display:flex;flex-direction:column;background:var(--aui-page);color:var(--aui-text);font-family:var(--font-pretendard);scroll-behavior:smooth}.product-showcase *{box-sizing:border-box}.product-showcase button,.product-showcase input{font:inherit}
      .showcase-nav{order:0;position:sticky;top:0;z-index:50;height:var(--aui-header-height);padding:0 24px;display:grid;grid-template-columns:minmax(190px,1fr) auto minmax(190px,1fr);align-items:center;gap:24px;background:var(--aui-glass-surface-strong);backdrop-filter:blur(var(--aui-blur-glass-strong));box-shadow:0 1px 0 var(--aui-shadow-line)}.showcase-nav a{color:var(--aui-text);text-decoration:none}.showcase-brand{display:flex;min-width:0;align-items:center;gap:10px;font-size:14px;font-weight:750}.showcase-brand-mark{display:grid;width:30px;height:30px;place-items:center;border-radius:10px;background:var(--aui-primary);color:var(--aui-on-primary);font-size:14px;font-weight:850;letter-spacing:-.04em}.showcase-brand-name{white-space:nowrap}.showcase-menu{display:flex;align-items:center;justify-content:center;gap:2px}.showcase-menu a{display:flex;min-height:40px;align-items:center;padding:0 12px;border-radius:var(--aui-radius-control);color:var(--aui-text-neutral);font-size:13px;font-weight:650;white-space:nowrap}.showcase-menu a:hover,.showcase-menu a:focus-visible{background:var(--aui-surface-muted);color:var(--aui-text);outline:none}.showcase-actions{display:flex;min-width:0;align-items:center;justify-content:flex-end;gap:8px}.showcase-back{display:flex;min-height:40px;align-items:center;gap:7px;padding:0 10px;border-radius:var(--aui-radius-control);font-size:13px;font-weight:650}.showcase-back:hover,.showcase-back:focus-visible{background:var(--aui-surface-muted);outline:none}.doc-badge{padding:6px 10px;border-radius:var(--aui-radius-pill);background:var(--aui-primary-soft);color:var(--aui-primary-heavy);font-size:11px;font-weight:750}.version{font-size:11px;color:var(--aui-text-muted);white-space:nowrap}
      .showcase-hero{order:2;width:100%;max-width:var(--aui-content-max);margin:0 auto;padding:72px 24px 52px;display:grid;grid-template-columns:1.2fr .8fr;gap:48px;align-items:end;position:relative}.showcase-hero:before{content:'';position:absolute;inset:20px 0;border-radius:var(--aui-radius-overlay);background:var(--aui-gradient-brand-hero-soft);filter:blur(var(--aui-blur-glass-strong));opacity:.7;z-index:-1}.showcase-hero h1{font-size:var(--aui-type-display-large-size);line-height:var(--aui-type-display-large-leading);font-weight:var(--aui-type-display-large-weight);letter-spacing:var(--aui-type-display-large-tracking);margin:16px 0}.showcase-hero p{max-width:680px;color:var(--aui-text-muted);font-size:16px;line-height:1.7}.hero-kicker{color:var(--aui-primary);font-size:12px;font-weight:700;letter-spacing:.08em}.principle-list{display:grid;gap:8px}.principle-list div{display:flex;gap:12px;align-items:center;padding:12px 14px;background:var(--aui-glass-surface);backdrop-filter:blur(var(--aui-blur-glass));border:1px solid var(--aui-glass-border);border-radius:var(--aui-radius-control);font-size:13px}.principle-list b{color:var(--aui-primary)}
      .portal-tabs{order:1;position:sticky;top:var(--aui-header-height);z-index:40;display:flex;justify-content:center;gap:4px;padding:8px 24px;background:var(--aui-surface-raised);box-shadow:0 1px 0 var(--aui-shadow-line);overflow-x:auto}.portal-tabs a{min-height:40px;display:flex;align-items:center;padding:0 14px;border-radius:var(--aui-radius-control);color:var(--aui-text-neutral);font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap}.portal-tabs a:hover,.portal-tabs a:focus-visible{background:var(--aui-primary-soft);color:var(--aui-primary-heavy)}
      .jump-nav{order:3;width:100%;max-width:1200px;margin:0 auto 20px;padding:18px 24px 0;display:flex;gap:6px;flex-wrap:wrap}.jump-nav a{padding:8px 12px;border-radius:var(--aui-radius-pill);background:var(--aui-surface-muted);color:var(--aui-text-neutral);font-size:12px;text-decoration:none}.jump-nav a:hover{background:var(--aui-primary-soft);color:var(--aui-primary-heavy)}
      .aui-section{width:100%;max-width:1200px;margin:auto;padding:56px 24px}.aui-section-head{max-width:720px;margin-bottom:28px}.aui-section-head>span{color:var(--aui-primary);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.aui-section-head h2{font-size:28px;line-height:38px;margin:6px 0}.aui-section-head p{color:var(--aui-text-muted);font-size:15px;line-height:24px}
      .color-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.swatch{overflow:hidden;background:var(--aui-surface);border-radius:var(--aui-radius-control);box-shadow:var(--aui-shadow-card)}.swatch-color{height:68px}.swatch-label{padding:10px}.swatch-label b,.swatch-label code{display:block}.swatch-label b{font-size:12px}.swatch-label code{margin-top:3px;font-size:10px;color:var(--aui-text-muted)}
      .type-board,.demo-card{background:var(--aui-surface);border-radius:var(--aui-radius-card)}.type-board{padding:8px 20px}.type-row{display:grid;grid-template-columns:110px 1fr 180px;gap:16px;align-items:center;padding:18px 0}.type-row+.type-row{box-shadow:0 -1px 0 var(--aui-shadow-line)}.type-row>span,.type-row>code{font-size:12px;color:var(--aui-text-muted)}
      .foundation-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.demo-card{padding:20px}.demo-card h3{font-size:15px;margin:0 0 16px}.token-row{display:flex;align-items:center;gap:10px;min-height:34px;font-size:12px;color:var(--aui-text-muted)}.space-bar{height:8px;border-radius:2px;background:var(--aui-primary)}.radius-box{width:42px;height:28px;background:var(--aui-primary-soft);border:1px solid var(--aui-primary)}.shadow-box{height:52px;display:grid;place-items:center;margin:12px 0;background:var(--aui-surface);border-radius:var(--aui-radius-control);font-size:11px;color:var(--aui-text-muted)}.shadow-box.card{box-shadow:var(--aui-shadow-card)}.shadow-box.elevated{box-shadow:var(--aui-shadow-elevated)}
      .component-token-board{margin-top:16px;padding:20px;border-radius:var(--aui-radius-card);background:var(--aui-surface)}.component-token-board h3{margin:0 0 16px;font-size:15px}.component-token-board>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.component-token-board span{display:flex;min-width:0;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:var(--aui-radius-sm);background:var(--aui-surface-muted);font-size:12px}.component-token-board b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.component-token-board code{color:var(--aui-text-muted)}
      .brand-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.brand-sample{min-height:180px;padding:20px;display:flex;flex-direction:column;justify-content:flex-end;border-radius:var(--aui-radius-card);overflow:hidden}.brand-sample b,.brand-sample code{display:block}.brand-sample code{margin-top:5px;font-size:11px}.brand-rule{background:var(--aui-surface);color:var(--aui-text)}.brand-rule strong{font-size:32px;line-height:1}.brand-rule p{margin:8px 0 0;color:var(--aui-text-muted);font-size:13px;line-height:1.5}
      .component-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.component-grid>*{min-width:0}.component-wide{grid-column:1/-1}.component-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.component-title h3{margin:0}.component-title span{font-size:11px;color:var(--aui-text-muted)}.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.stack{display:grid;gap:12px}
      .form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.metric{padding:16px;border-radius:var(--aui-radius-control);background:var(--aui-surface-muted)}.metric span{font-size:12px;color:var(--aui-text-muted)}.metric strong{display:block;margin-top:6px;font-size:22px}
      .a11y-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.a11y-item{padding:14px;border-radius:var(--aui-radius-control);background:var(--aui-surface);font-size:13px}.a11y-item:before{content:'✓';color:var(--aui-positive);font-weight:800;margin-right:8px}
      .guide-section{order:30;width:100%;max-width:1200px;margin:auto;padding:56px 24px}.guide-section+.guide-section{order:31}.guide-section-head{max-width:720px;margin-bottom:24px}.guide-section-head span{color:var(--aui-primary);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.guide-section-head h2{margin:6px 0;font-size:28px;line-height:38px}.guide-section-head p{color:var(--aui-text-muted);line-height:1.6}.guide-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.guide-card{padding:20px;border-radius:var(--aui-radius-card);background:var(--aui-surface)}.guide-card h3{margin:0 0 10px;font-size:15px}.guide-card p,.guide-card li{color:var(--aui-text-muted);font-size:13px;line-height:1.6}.guide-card ul{margin:0;padding-left:18px}.guide-card code{display:block;padding:10px 12px;border-radius:var(--aui-radius-sm);background:var(--aui-surface-muted);color:var(--aui-text-neutral);font-size:11px;overflow:auto}.guide-chip-list{display:flex;flex-wrap:wrap;gap:6px}.guide-chip-list span{padding:6px 9px;border-radius:var(--aui-radius-pill);background:var(--aui-primary-soft);color:var(--aui-primary-heavy);font-size:11px}
      .navigation-preview{overflow:hidden;border-radius:var(--aui-radius-control);background:var(--aui-surface-muted)}.navigation-preview-header{display:flex;min-height:56px;align-items:center;gap:8px;padding:6px 10px;background:var(--aui-surface)}.navigation-preview-header strong{font-size:14px}.navigation-preview-body{display:grid;grid-template-columns:176px minmax(0,1fr);min-height:196px}.navigation-preview-side{padding:10px;background:var(--aui-surface)}.navigation-preview-canvas{display:grid;place-items:center;padding:20px;background:var(--aui-surface-sunken);color:var(--aui-text-assistive);font-size:13px}.bottom-navigation-preview{display:flex;min-height:252px;flex-direction:column;overflow:hidden;border-radius:var(--aui-radius-control);background:var(--aui-surface-muted)}.bottom-navigation-preview>div{flex:1;padding:18px;background:var(--aui-surface)}.action-preview{display:flex;min-height:180px;align-items:flex-end;overflow:hidden;border-radius:var(--aui-radius-control);background:var(--aui-surface-sunken)}.action-preview>[data-slot=responsive-action-bar]{width:100%}
      .docs-side{display:none;position:fixed;z-index:30;top:var(--aui-header-height);bottom:0;width:var(--docs-side-width);padding:32px 12px 48px;overflow-y:auto;overscroll-behavior:contain;background:var(--aui-page);scrollbar-width:thin}.docs-side-left{--docs-side-width:240px;left:24px}.docs-side-right{--docs-side-width:220px;right:24px}.docs-side h2{margin:0 12px 18px;color:var(--aui-text-assistive);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.docs-nav-group{margin-bottom:22px}.docs-nav-group>a{display:flex;min-height:36px;align-items:center;padding:0 12px;border-radius:var(--aui-radius-sm);color:var(--aui-text);font-size:13px;font-weight:700;text-decoration:none}.docs-nav-group ul,.docs-toc{list-style:none;margin:4px 0 0;padding:0}.docs-nav-group li a,.docs-toc a{display:flex;min-height:32px;align-items:center;padding:5px 12px;border-radius:var(--aui-radius-sm);color:var(--aui-text-muted);font-size:12px;line-height:1.35;text-decoration:none}.docs-nav-group li a:hover,.docs-nav-group>a:hover,.docs-toc a:hover{background:var(--aui-surface-muted);color:var(--aui-text)}.docs-toc{box-shadow:-1px 0 0 var(--aui-border-subtle)}.docs-toc a{border-left:2px solid transparent;border-radius:0}.docs-toc a:focus-visible{border-left-color:var(--aui-primary);color:var(--aui-primary-heavy);outline:none}
      @media(min-width:1100px){.docs-side-left{display:block}.portal-tabs,.jump-nav{display:none}.showcase-hero,.aui-section,.guide-section{width:calc(100% - 300px);max-width:1040px;margin-left:280px;margin-right:20px}.showcase-hero{padding-top:56px;padding-bottom:40px}.aui-section,.guide-section{padding-top:48px;padding-bottom:48px}}
      @media(min-width:1400px){.docs-side-right{display:block}.showcase-hero,.aui-section,.guide-section{width:calc(100% - 520px);max-width:1040px;margin-left:280px;margin-right:240px}}
      @media(max-width:1099px){.showcase-nav{grid-template-columns:auto minmax(0,1fr) auto}.showcase-menu{justify-content:flex-start;overflow-x:auto;scrollbar-width:none}.showcase-menu::-webkit-scrollbar{display:none}.portal-tabs{display:none}.version{display:none}}
      @media(max-width:900px){.showcase-hero{grid-template-columns:1fr}.color-grid{grid-template-columns:repeat(3,1fr)}.foundation-grid,.brand-grid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:900px){.guide-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:720px){.showcase-nav{height:auto;min-height:var(--aui-header-height);grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'brand actions' 'menu menu';gap:0;padding:8px 16px}.showcase-brand{grid-area:brand}.showcase-menu{grid-area:menu;margin:6px -4px -2px;padding-bottom:2px}.showcase-menu a{min-height:36px;padding:0 10px}.showcase-actions{grid-area:actions}.showcase-back span,.doc-badge{display:none}.docs-side{top:104px}.showcase-hero{padding-top:48px}.showcase-hero h1{font-size:36px}.color-grid,.component-grid,.foundation-grid,.form-grid,.metric-grid,.a11y-grid,.component-token-board>div,.guide-grid{grid-template-columns:1fr}.component-wide{grid-column:auto}.type-row{grid-template-columns:82px 1fr}.type-row code{display:none}.navigation-preview-body{grid-template-columns:1fr}.navigation-preview-canvas{min-height:96px}}
      @media(prefers-reduced-motion:reduce){.product-showcase *{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important}}
    `}</style>

    <nav className="showcase-nav" aria-label="Aide 디자인 시스템">
      <a className="showcase-brand" href="#get-started" aria-label="Aide Design System 홈">
        <span className="showcase-brand-mark" aria-hidden>W</span>
        <span className="showcase-brand-name">Aide Design System</span>
      </a>
      <div className="showcase-menu">
        {AUI_DOCUMENTATION.navigation.map((id)=><a key={id} href={`#${DOCUMENTATION_ANCHORS[id]}`}>{AUI_DOCUMENTATION.pages[id].title}</a>)}
      </div>
      <div className="showcase-actions">
        <span className="doc-badge">PRODUCT UI</span>
        <span className="version">v{AUI_SCHEMA_VERSION} · {AUI_TOKEN_ENTRIES.length} tokens</span>
        <Link className="showcase-back" href="/"><ArrowLeft size={16}/><span>Aide</span></Link>
      </div>
    </nav>
    <aside className="docs-side docs-side-left" aria-label="전체 문서 탐색"><h2>Documentation</h2>{AUI_DOCUMENTATION.navigation.map((group)=>{const page=AUI_DOCUMENTATION.pages[group];const items=group==='components'?Object.keys(AUI_COMPONENT_CATEGORIES):page.items;return <div className="docs-nav-group" key={group}><a href={`#${documentationAnchor(group)}`}>{page.title}</a>{items?.length?<ul>{items.map((item)=><li key={item}><a href={`#${documentationAnchor(group,item)}`}>{item.replaceAll('-',' ')}</a></li>)}</ul>:null}</div>})}</aside>
    <aside className="docs-side docs-side-right" aria-label="현재 페이지 목차"><h2>On this page</h2><ul className="docs-toc">{AUI_SHOWCASE_SECTIONS.map((section)=><li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}<li><a href="#develop">Develop</a></li><li><a href="#ai-and-tools">AI &amp; Tools</a></li></ul></aside>
    <header className="showcase-hero" id="get-started"><div><span className="hero-kicker">AIDE DESIGN SYSTEM</span><h1>{AUI_DOCUMENTATION.title}</h1><p>{AUI_DOCUMENTATION.description}</p></div><div className="principle-list">{[[AUI_TOKEN_ENTRIES.length,'Design tokens'],[implementedCount,'Implemented capabilities'],[excludedCount,'Security or deprecated exclusions'],['3 modes','Compact · Medium · Wide'],[AIDE_ACCESSIBILITY_STANDARD,'Accessibility target']].map(([value,label])=><div key={String(label)}><b>{value}</b>{label}</div>)}</div></header>
    <nav className="portal-tabs" aria-label="디자인 시스템 가이드">{AUI_DOCUMENTATION.navigation.map((id)=><a key={id} href={`#${DOCUMENTATION_ANCHORS[id]}`}>{AUI_DOCUMENTATION.pages[id].title}</a>)}</nav>
    <nav className="jump-nav">{AUI_SHOWCASE_SECTIONS.map((section)=><a key={section.id} href={`#${section.id}`}>{section.navigation}</a>)}</nav>

    <Section id="brand" eyebrow="Identity" title="Brand expression" description="Aide의 cyan–blue–violet 표현은 주목을 만드는 영역에만 사용하고, 실제 제작 workspace는 중립 surface를 유지합니다."><div className="brand-grid">{gradients.map((g)=><div className="brand-sample" key={g.key} style={{background:`var(${g.cssVar})`,color:g.key==='brand-hero'?'var(--aui-on-dark)':'var(--aui-text)'}}><b>{g.key}</b><code>{g.cssVar}</code></div>)}<div className="brand-sample brand-rule"><strong>100 / 20 / 0</strong><p>Landing 100%, 문서·empty state 20%, dense workspace content 0%. Glass blur는 {blurs.map((b)=>`${b.key} ${b.value}`).join(' · ')}만 사용합니다.</p></div></div></Section>

    <Section id="foundations" eyebrow="Foundations" title="Color tokens" description="Aide 제품 UI의 시맨틱 색상입니다. 화면 컴포넌트는 직접 색상값을 만들지 않고 이 토큰을 사용합니다."><div className="color-grid">{colors.map(([name,value])=><div className="swatch" key={name}><div className="swatch-color" style={{background:value}}/><div className="swatch-label"><b>{name}</b><code>--aui-{name}</code></div></div>)}</div></Section>
    <Section id="typography" eyebrow="Foundations" title="Typography" description="Pretendard 기반의 제품 UI 타입 스케일입니다. Landing을 제외한 작업 화면은 compact scale을 우선합니다."><div className="type-board">{typeScale.map((t)=><div className="type-row" key={t.name}><span>{t.name}</span><div style={{fontSize:t.size,lineHeight:t.leading,fontWeight:Number(t.weight)}}>Aide로 더 빠르게 설계하세요</div><code>{t.size}/{t.leading} · {t.weight}{t.role?` · ${t.role}`:''}</code></div>)}</div></Section>
    <Section id="tokens" eyebrow="Foundations" title="Spacing, radius, elevation, motion" description="4px 기반 간격과 목적 중심의 radius, elevation, motion 체계입니다."><div className="foundation-grid"><div className="demo-card"><h3>Spacing</h3>{spacing.map(([name,value])=><div className="token-row" key={name}><i className="space-bar" style={{width:value}}/>space-{name} · {value}px</div>)}</div><div className="demo-card"><h3>Radius</h3>{radii.map(([name,value])=><div className="token-row" key={name}><i className="radius-box" style={{borderRadius:value}}/>{name}</div>)}</div><div className="demo-card"><h3>Elevation</h3>{elevations.map((e)=><div key={e.key} className="shadow-box" style={{boxShadow:`var(${e.cssVar})`}}>{e.key}</div>)}</div><div className="demo-card"><h3>Motion</h3>{motion.map((m)=><div className="token-row" key={m.key}><b>{m.key}</b>{m.value}{m.description?` · ${m.description}`:''}</div>)}</div></div></Section>


    <Section id="actions" eyebrow="Components" title="Actions" description="행동의 우선순위, 위험도, 크기와 상태를 일관되게 표현합니다."><div className="component-grid"><div className="demo-card component-wide"><div className="component-title"><h3>Button variants</h3><span>32 / 40 / 48px</span></div><div className="row"><Button>생성하기</Button><Button variant="secondary">미리보기</Button><Button variant="outline">내보내기</Button><Button variant="ghost">취소</Button><Button variant="destructive">삭제</Button><Button disabled>비활성</Button></div><div className="row" style={{marginTop:12}}><Button><Sparkles/>AI로 만들기</Button><Button variant="outline" size="icon" aria-label="알림"><Bell/></Button><Button variant="ghost" size="icon-sm" aria-label="더보기"><MoreHorizontal/></Button><Button variant="secondary"><Download/>다운로드</Button></div></div></div></Section>
    <Section id="inputs" eyebrow="Components" title="Inputs and forms" description="기본, focus, 성공, 오류, 비활성 상태와 선택형 입력을 함께 정의합니다."><div className="component-grid"><div className="demo-card"><div className="component-title"><h3>Text fields</h3><span>default / validation</span></div><div className="form-grid"><Field label="프로젝트 이름" placeholder="이름을 입력하세요"/><Field label="저장 위치" placeholder="Aide Workspace" state="success"/><Field label="공유 이메일" placeholder="name@company.com" state="error"/><Field label="비활성 필드" placeholder="수정할 수 없음" state="disabled"/></div></div><div className="demo-card"><div className="component-title"><h3>Search and select</h3><span>native semantics</span></div><div className="stack"><UIField label="컴포넌트 검색"><SearchField placeholder="컴포넌트 검색" defaultValue="Button"/></UIField><UIField label="모델"><Select defaultValue="gemini"><option value="gemini">Gemini 3.1 Pro</option><option value="claude">Claude Sonnet</option><option value="gpt">GPT</option></Select></UIField></div></div><div className="demo-card"><h3>Textarea</h3><UIField label="서비스 설명" help="최대 500자"><Textarea placeholder="어떤 서비스를 만들지 설명해 주세요."/></UIField></div><div className="demo-card"><h3>Radio group</h3><RadioGroup name="visibility" label="프로젝트 공개 범위"><Radio value="public" defaultChecked>공개</Radio><Radio value="team">팀만</Radio><Radio value="private">비공개</Radio></RadioGroup></div><div className="demo-card component-wide"><div className="component-title"><h3>Selection controls</h3><span>실제 native control</span></div><div className="row"><Checkbox defaultChecked>자동 저장</Checkbox><Checkbox>댓글 알림</Checkbox><Switch defaultChecked>프로토타입 모드</Switch><Switch>개발자 모드</Switch></div></div></div></Section>
    <Section id="selection" eyebrow="Components" title="Selection and navigation" description="Tabs는 목적지, segmented control은 로컬 모드, chips는 필터에 사용합니다."><div className="component-grid"><div className="demo-card"><h3>Tabs</h3><Tabs defaultValue="design"><TabsList><TabsTrigger value="design">Design</TabsTrigger><TabsTrigger value="prototype">Prototype</TabsTrigger><TabsTrigger value="inspect">Inspect</TabsTrigger></TabsList><TabsContent value="design">Design canvas가 선택되었습니다.</TabsContent><TabsContent value="prototype">Prototype mode</TabsContent><TabsContent value="inspect">Inspect mode</TabsContent></Tabs><h3 style={{marginTop:24}}>Segmented control</h3><SegmentedControl label="미리보기 기기" defaultValue="desktop" options={[{value:'desktop',label:'Desktop'},{value:'tablet',label:'Tablet'},{value:'mobile',label:'Mobile'}]}/></div><div className="demo-card"><h3>Chips and status</h3><div className="row"><Chip selected>전체</Chip><Chip>레이아웃</Chip><Chip>입력</Chip><Chip removable><Plus size={13}/>필터</Chip></div><div className="row" style={{marginTop:16}}><Badge variant="success"><Check/>저장됨</Badge><Badge variant="warning"><Clock3/>생성 중</Badge><Badge variant="neutral">Draft</Badge></div></div></div></Section>
    <Section id="data" eyebrow="Components" title="Cards, lists and data display" description="정보를 그룹화하되 모든 섹션을 카드로 만들지 않습니다. 반복 데이터는 행과 구분선을 우선합니다."><div className="component-grid"><Card><CardHeader><CardTitle>프로젝트 요약</CardTitle><CardDescription>실제 공용 Card와 Asset 조합</CardDescription><CardAction><Badge variant="success">활성</Badge></CardAction></CardHeader><CardContent><Asset src="/logo_aide.png" alt="Aide 로고" fill sizes="(max-width: 620px) 100vw, 320px" shape="rounded" fit="contain" className="h-24 [&_img]:p-4"/><Separator className="my-4"/><div className="metric-grid"><div className="metric"><span>생성 시안</span><strong>24</strong></div><div className="metric"><span>완료율</span><strong>82%</strong></div><div className="metric"><span>이번 주</span><strong>+18%</strong></div></div><Progress value={82} label="완료율" className="mt-4"/></CardContent><CardFooter><Button variant="ghost" size="dense">상세 보기</Button></CardFooter></Card><div className="demo-card"><h3>List rows and avatar</h3>{[['프로덕트 랜딩','2분 전에 수정됨'],['Studio workspace','자동 저장됨'],['Playground','3개 컴포넌트']].map(([a,b],i)=><ListRow key={a} leading={<Avatar fallback={i===0?'PL':i===1?'SW':'PG'} size="sm"/>} contents={<ListRowText title={a} description={b}/>} trailing={<ChevronRight size={16}/>}/>)}</div><div className="demo-card component-wide"><h3>Responsive table</h3><TableContainer><Table><TableCaption>프로젝트 생성 현황</TableCaption><TableHeader><TableRow><TableHead>프로젝트</TableHead><TableHead>상태</TableHead><TableHead numeric>화면 수</TableHead><TableHead>수정일</TableHead></TableRow></TableHeader><TableBody>{[['Landing','완료','12','오늘'],['Workspace','진행 중','8','어제'],['Playground','초안','3','7월 20일']].map((row)=><TableRow key={row[0]}><TableCell className="font-semibold">{row[0]}</TableCell><TableCell>{row[1]}</TableCell><TableCell numeric>{row[2]}</TableCell><TableCell>{row[3]}</TableCell></TableRow>)}</TableBody></Table></TableContainer></div></div></Section>
    <Section id="feedback" eyebrow="Components" title="Feedback and system status" description="저장, 생성, 오류, 비어 있음과 로딩 상태를 색만이 아니라 아이콘과 문장으로 전달합니다."><div className="component-grid"><div className="demo-card"><h3>Inline messages</h3><div className="stack"><InlineMessage tone="info">새로운 Studio 기능을 사용할 수 있어요.</InlineMessage><InlineMessage tone="success">변경사항을 저장했어요.</InlineMessage><InlineMessage tone="warning">연결 상태를 확인하고 있어요.</InlineMessage><InlineMessage tone="error" title="생성 실패">잠시 후 다시 시도해 주세요.</InlineMessage></div></div><div className="demo-card"><h3>Toast and loading</h3><Toast tone="success" title="링크를 복사했어요."/><div className="stack" style={{marginTop:18}}><Loader label="컴포넌트를 생성하고 있어요."/><Skeleton className="w-[82%]"/><Skeleton className="w-[56%]"/></div></div><div className="demo-card component-wide"><Result figure={<div className="grid size-12 place-items-center rounded-full bg-[var(--aui-primary-soft)] text-[var(--aui-primary)]"><Upload size={20}/></div>} title="아직 업로드한 파일이 없어요" description="design.md를 추가하면 프로젝트 디자인 시스템을 적용할 수 있어요." action={<Button variant="outline"><Upload/>파일 추가</Button>}/></div></div></Section>
    <Section id="overlays" eyebrow="Components" title="Overlays" description="Dialog, alert dialog, popover, tooltip, menu와 sheet는 focus 복원과 예측 가능한 닫기 동작을 제공합니다."><div className="demo-card"><h3>Interactive overlays</h3><div className="row"><Dialog><DialogTrigger asChild><Button variant="outline">Confirm Dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>프로젝트를 삭제할까요?</DialogTitle><DialogDescription>삭제한 프로젝트와 생성 결과는 복구할 수 없습니다.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="ghost">취소</Button></DialogClose><Button variant="destructive">프로젝트 삭제</Button></DialogFooter></DialogContent></Dialog><AlertDialog><AlertDialogTrigger render={<Button variant="outline"/>}>Alert Dialog</AlertDialogTrigger><AlertDialogContent><AlertDialogTitle>연결이 끊겼습니다</AlertDialogTitle><AlertDialogDescription>네트워크를 확인한 후 다시 시도해 주세요.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel render={<Button/>}>확인</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog><Popover><PopoverTrigger render={<Button variant="outline"/>}>Popover</PopoverTrigger><PopoverContent><PopoverCloseButton/><PopoverTitle>프로젝트 정보</PopoverTitle><PopoverDescription>현재 문서의 상태와 수정 정보를 표시합니다.</PopoverDescription></PopoverContent></Popover><TooltipProvider><Tooltip><TooltipTrigger render={<Button variant="outline"/>}>도움말</TooltipTrigger><TooltipContent>버튼과 아이콘의 의미를 짧게 설명합니다.</TooltipContent></Tooltip></TooltipProvider><UIMenu><MenuTrigger render={<Button variant="outline"/>}>프로젝트 메뉴<ChevronDown/></MenuTrigger><MenuContent><MenuItem><Settings/>프로젝트 설정</MenuItem><MenuItem><Download/>파일로 내보내기</MenuItem><MenuItem><User/>멤버 관리</MenuItem><MenuSeparator/><MenuItem destructive><X/>프로젝트 나가기</MenuItem></MenuContent></UIMenu><Sheet><SheetTrigger asChild><Button variant="outline">모바일 Sheet</Button></SheetTrigger><SheetContent><SheetTitle className="pr-12 text-lg font-bold">프로젝트 옵션</SheetTitle><SheetDescription className="mt-2 text-sm leading-6 text-[var(--aui-text-muted)]">작은 화면에서는 중요한 보조 작업을 하단 Sheet로 제공합니다.</SheetDescription><div className="mt-5 grid gap-2"><Button>변경사항 적용</Button><Button variant="ghost">초기화</Button></div></SheetContent></Sheet></div></div></Section>
    <Section id="compositions" eyebrow="Composed patterns" title="Reusable compositions" description="core 컴포넌트를 실제 서비스 화면 단위로 조합합니다."><div className="stack"><DetailHeader eyebrow="PROJECT" title="Aide Design System" description="토큰과 컴포넌트 계약을 하나의 프로젝트 기준으로 관리합니다." metadata="마지막 수정: 오늘" actions={<><Button variant="outline">공유</Button><Button>편집</Button></>}/><ResponsiveGrid minItemWidth="260px"><ListSection><ListSectionHeader title="최근 화면" description="최근 수정된 프로젝트 화면" action={<Badge variant="info">3</Badge>}/><ListSectionContent>{['Landing','Studio','Playground'].map((item)=><ListRow key={item} contents={<ListRowText title={item} description="자동 저장됨"/>} trailing={<ChevronRight/>}/>)}</ListSectionContent><ListSectionFooter>모든 화면 보기</ListSectionFooter></ListSection><div className="demo-card"><FieldGroup label="서비스 URL" help="프로토콜과 도메인을 나누어 입력합니다."><Select aria-label="프로토콜" defaultValue="https"><option>https</option><option>http</option></Select><Input aria-label="도메인" placeholder="example.com"/></FieldGroup><Prose className="mt-6"><h2>설계 원칙</h2><p>반복되는 화면은 <TextHighlight>공통 계약과 토큰</TextHighlight>을 사용해 일관되게 구성합니다.</p></Prose></div></ResponsiveGrid></div></Section>
    <Section id="specialized" eyebrow="Specialized components" title="Feature-specific controls" description="필요한 서비스에서 선택적으로 사용하는 기능 컴포넌트입니다. 보안 키패드는 별도 감사 구현이 필요하므로 제외합니다."><div className="component-grid"><div className="demo-card"><h3>Numeric input</h3><div className="row"><NumberField label="인원" defaultValue={2} min={1} max={10}/><NumberField label="수량" defaultValue={1} min={0} max={20}/></div><div className="mt-6"><Slider label="투명도" defaultValue={72} min={0} max={100}/></div></div><div className="demo-card"><h3>Rating</h3><Rating label="결과 만족도" defaultValue={4}/></div><div className="demo-card component-wide"><h3>Progress stepper</h3><Stepper current={1} steps={[{id:'brief',label:'기획 입력',description:'요구사항 정리'},{id:'generate',label:'UI 생성',description:'시안 제작 중'},{id:'refine',label:'수정',description:'피드백 반영'},{id:'export',label:'내보내기'}]}/></div><div className="demo-card"><BarChart label="주간 생성 화면" data={[{label:'월',value:8},{label:'화',value:12},{label:'수',value:7},{label:'목',value:16},{label:'금',value:11}]} valueLabel={(value)=>`${value}개`}/></div><div className="demo-card"><h3>Agreement v4</h3><Agreement items={[{id:'terms',label:'서비스 이용약관',required:true,href:'#terms'},{id:'privacy',label:'개인정보 처리방침',required:true,href:'#privacy'},{id:'marketing',label:'업데이트 소식 수신',required:false}]}/></div><div className="demo-card component-wide"><h3>General keypads</h3><div className="component-grid"><Keypad type="alphabet" label="영문 키패드"/><Keypad type="number" label="숫자 키패드"/></div></div></div></Section>
    <Section id="layouts" eyebrow="Patterns" title="Navigation and action bars" description="실제 탐색과 CTA 패턴만 비교합니다."><div className="component-grid"><div className="demo-card component-wide"><h3>Top navigation</h3><Navigation variant="top" activeId="design" items={[{id:'design',label:'Design'},{id:'prototype',label:'Prototype'},{id:'inspect',label:'Inspect'}]}/></div><div className="demo-card"><h3>Side navigation in workspace</h3><div className="navigation-preview"><div className="navigation-preview-header"><NavigationMenuButton/><strong>Aide Studio</strong></div><div className="navigation-preview-body"><div className="navigation-preview-side"><Navigation variant="side" activeId="projects" items={[{id:'home',label:'홈'},{id:'projects',label:'프로젝트'},{id:'settings',label:'설정'}]}/></div><div className="navigation-preview-canvas">Workspace content</div></div></div></div><div className="demo-card"><h3>Breadcrumb and bottom navigation</h3><div className="bottom-navigation-preview"><div><Breadcrumb items={[{label:'Aide',href:'#'},{label:'Studio',href:'#'},{label:'프로젝트'}]}/></div><Navigation variant="bottom" activeId="home" items={[{id:'home',label:'홈'},{id:'search',label:'검색'},{id:'profile',label:'내 정보'}]}/></div></div><div className="demo-card"><h3>Single CTA</h3><div className="action-preview"><ResponsiveActionBar><Button>계속하기</Button></ResponsiveActionBar></div></div><div className="demo-card"><h3>Double CTA</h3><div className="action-preview"><ResponsiveActionBar><Button variant="ghost">취소</Button><Button>변경사항 저장</Button></ResponsiveActionBar></div></div></div></Section>
    <Section id="accessibility" eyebrow="Quality" title="Interaction and accessibility" description={`${AIDE_ACCESSIBILITY_STANDARD} 기준을 aide.md에서 직접 표시합니다.`}><div className="a11y-grid">{AIDE_ACCESSIBILITY_REQUIREMENTS.map(item=><div className="a11y-item" key={item}>{item}</div>)}</div></Section>
    <section className="guide-section" id="develop"><div className="guide-section-head"><span>Develop</span><h2>{AUI_DOCUMENTATION.pages.develop.title}</h2><p>MD 계약을 검증하고 CSS·JSON으로 내보내 실제 제품 컴포넌트에서 사용하는 방법입니다.</p></div><div className="guide-grid"><div className="guide-card"><h3>Documentation</h3><div className="guide-chip-list">{AUI_DOCUMENTATION.pages.develop.items?.map((item)=><span key={item}>{item}</span>)}</div></div>{Object.entries(AUI_DEVELOP_COMMANDS).map(([name,command])=><div className="guide-card" key={name}><h3>{name}</h3><code>{Array.isArray(command)?command.join(' && '):command}</code></div>)}</div></section>
    <section className="guide-section" id="ai-and-tools"><div className="guide-section-head"><span>AI &amp; Tools</span><h2>{AUI_DOCUMENTATION.pages['ai-and-tools'].title}</h2><p>{AUI_AI_GUIDE.skill.purpose}</p></div><div className="guide-grid"><div className="guide-card"><h3>{AUI_AI_GUIDE.skill.id}</h3><ol>{AUI_AI_GUIDE.skill.workflow?.map((step)=><li key={step}>{step}</li>)}</ol></div><div className="guide-card"><h3>llms.txt</h3><code>{AUI_AI_GUIDE.llmsTxt.route}</code><div className="guide-chip-list mt-3">{AUI_AI_GUIDE.llmsTxt.contents?.map((item)=><span key={item}>{item}</span>)}</div></div><div className="guide-card"><h3>Roadmap</h3><ul>{AUI_AI_GUIDE.futureIntegrations.map((item)=><li key={item}>{item}</li>)}</ul></div></div></section>
  </main>
}

// Kept temporarily while the routed documentation pages reach feature parity.
void LegacyAideProductUIShowcase

export default function AideUiIndexPage() {
  return <GetStartedPage/>
}
