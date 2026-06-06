export type DesignPreset = string

export interface ColorSwatch {
  name: string
  hex: string
}

export interface TypographyStep {
  name: string
  size: string
  weight: number
}

export interface RadiusToken {
  name: string
  value: string
}

export interface DesignPresetMeta {
  label: string
  md: string
  color?: string
  description?: string
  palette?: ColorSwatch[]
  fonts?: { headline: string; body: string }
  traits?: string[]
  typographyScale?: TypographyStep[]
  statusColors?: ColorSwatch[]
  radiusTokens?: RadiusToken[]
}

interface WebpackRequireContext {
  keys(): string[]
  (key: string): string
}

interface WebpackRequire {
  context(directory: string, useSubdirectories: boolean, regExp: RegExp): WebpackRequireContext
}

// Auto-import all .md files from design-systems directory via webpack require.context
const mdContext = (require as unknown as WebpackRequire).context('./design-systems', false, /\.md$/)
const MD_FILES: Record<string, string> = {}
mdContext.keys().forEach((key: string) => {
  const id = key.replace('./', '').replace('.md', '')
  MD_FILES[id] = mdContext(key) as string
})

function extractField(md: string, field: string): string {
  const re = new RegExp(`^${field}:\\s*["']?([^\\n"']+)["']?\\s*$`, 'm')
  const m = md.match(re)
  return m ? m[1].trim() : ''
}

function extractColorsPrimary(md: string): string {
  const m = md.match(/^  primary:\s*["']?(#[0-9a-fA-F]+)["']?/m)
  return m ? m[1] : ''
}

function deriveLabel(md: string, id: string): string {
  const rawName = extractField(md, 'name')
  const cleaned = rawName.replace(/-design-analysis$/i, '').replace(/-/g, ' ').trim()
  if (cleaned) return cleaned
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function buildAideDefaultMd(sourceMd: string): string {
  if (!sourceMd.trim()) return ''
  return sourceMd
    .replace(/^name:\s*["']?KTDS Design System["']?\s*$/m, 'name: Aide Design System')
    .replace(/^description:\s*"KT DS 엔터프라이즈 UI 시스템/m, 'description: "Aide 기본 UI 시스템')
    .replace(
      /---\n/,
      `---\n# Aide default preset: this virtual DESIGN.md reuses ktds.md tokens and component rules, but its design-system name is Aide. When no preset is selected, refer to the selected system as Aide, not KTDS or kt ds.\n`,
    )
}

// Rich metadata for known presets — palette, fonts, traits, scale, etc.
const RICH_META: Record<string, Omit<DesignPresetMeta, 'md'>> = {
  ktds: {
    label: 'kt ds',
    color: '#1a75ff',
    description: 'kt ds의 디자인 시스템',
    palette: [
      { name: 'Primary', hex: '#1a75ff' },
      { name: 'Surface Alt', hex: '#f7f7f8' },
      { name: 'Neutral', hex: '#70737c' },
      { name: 'Negative', hex: '#ff4242' },
    ],
    fonts: { headline: 'Pretendard', body: 'Pretendard' },
    traits: ['enterprise grade', 'accessible', 'structured layout'],
    typographyScale: [
      { name: 'Display', size: '32px', weight: 700 },
      { name: 'Headline', size: '24px', weight: 700 },
      { name: 'Title 1', size: '20px', weight: 600 },
      { name: 'Title 2', size: '18px', weight: 600 },
      { name: 'Body 1', size: '16px', weight: 400 },
      { name: 'Body 2', size: '14px', weight: 400 },
      { name: 'Caption 1', size: '12px', weight: 400 },
      { name: 'Caption 2', size: '11px', weight: 400 },
    ],
    statusColors: [
      { name: 'Positive', hex: '#00c244' },
      { name: 'Info', hex: '#0066ff' },
      { name: 'Caution', hex: '#ff9200' },
      { name: 'Negative', hex: '#ff4242' },
    ],
    radiusTokens: [
      { name: 'xs', value: '2px' },
      { name: 'sm', value: '4px' },
      { name: 'md', value: '8px' },
      { name: 'lg', value: '12px' },
      { name: 'xl', value: '16px' },
      { name: '2xl', value: '20px' },
      { name: 'full', value: '9999px' },
    ],
  },
  ibm: {
    label: 'IBM',
    color: '#0f62fe',
    description: '엔터프라이즈 Carbon — 단일 블루 액센트, 제로 라운드',
    palette: [
      { name: 'IBM Blue', hex: '#0f62fe' },
      { name: 'Ink', hex: '#161616' },
      { name: 'Canvas', hex: '#ffffff' },
      { name: 'Surface', hex: '#f4f4f4' },
    ],
    fonts: { headline: 'IBM Plex Sans', body: 'IBM Plex Sans' },
    traits: ['square corners', 'single accent', 'enterprise flat'],
    typographyScale: [
      { name: 'Display XL', size: '76px', weight: 300 },
      { name: 'Display LG', size: '60px', weight: 300 },
      { name: 'Display MD', size: '42px', weight: 300 },
      { name: 'Headline', size: '32px', weight: 400 },
      { name: 'Body', size: '16px', weight: 400 },
      { name: 'Body SM', size: '14px', weight: 400 },
      { name: 'Caption', size: '12px', weight: 400 },
    ],
    radiusTokens: [
      { name: 'none', value: '0px' },
      { name: 'xs', value: '2px' },
      { name: 'sm', value: '4px' },
    ],
  },
  notion: {
    label: 'Notion',
    color: '#5645d4',
    description: '올인원 워크스페이스 — 파스텔 카드와 네이비 히어로',
    palette: [
      { name: 'Primary', hex: '#5645d4' },
      { name: 'Brand Navy', hex: '#0a1530' },
      { name: 'Canvas', hex: '#ffffff' },
      { name: 'Hairline', hex: '#e5e3df' },
    ],
    fonts: { headline: 'Notion Sans', body: 'Notion Sans' },
    traits: ['pastel feature cards', 'rectangular buttons', 'workspace mockup'],
    typographyScale: [
      { name: 'Hero Display', size: '80px', weight: 600 },
      { name: 'Display LG', size: '56px', weight: 600 },
      { name: 'Heading 1', size: '48px', weight: 600 },
      { name: 'Heading 2', size: '36px', weight: 600 },
      { name: 'Body MD', size: '16px', weight: 400 },
      { name: 'Body SM', size: '14px', weight: 400 },
      { name: 'Caption', size: '13px', weight: 400 },
    ],
    radiusTokens: [
      { name: 'xs', value: '4px' },
      { name: 'sm', value: '6px' },
      { name: 'md', value: '8px' },
      { name: 'lg', value: '12px' },
      { name: 'xl', value: '16px' },
      { name: 'full', value: '9999px' },
    ],
  },
  shopify: {
    label: 'Shopify',
    color: '#95bf47',
    description: '커머스 플랫폼 — 시네마틱 블랙 캔버스, 알로에 그린 액센트',
    palette: [
      { name: 'Canvas Night', hex: '#000000' },
      { name: 'Canvas Cream', hex: '#fbfbf5' },
      { name: 'Aloe', hex: '#c1fbd4' },
      { name: 'Pistachio', hex: '#d4f9e0' },
    ],
    fonts: { headline: 'Neue Haas Grotesk Display', body: 'Inter' },
    traits: ['dual-track canvas', 'pill buttons', 'editorial type'],
    typographyScale: [
      { name: 'Display XXL', size: '96px', weight: 330 },
      { name: 'Display XL', size: '70px', weight: 330 },
      { name: 'Display LG', size: '55px', weight: 330 },
      { name: 'Body LG', size: '18px', weight: 400 },
      { name: 'Body', size: '16px', weight: 400 },
      { name: 'Caption', size: '13px', weight: 400 },
    ],
    radiusTokens: [
      { name: 'pill', value: '9999px' },
      { name: 'md', value: '8px' },
      { name: 'sm', value: '4px' },
    ],
  },
}

// ktds first, then alphabetical for the rest
const PRESET_ORDER = ['ktds']
const sortedIds = Object.keys(MD_FILES).sort((a, b) => {
  const ai = PRESET_ORDER.indexOf(a)
  const bi = PRESET_ORDER.indexOf(b)
  if (ai !== -1 && bi !== -1) return ai - bi
  if (ai !== -1) return -1
  if (bi !== -1) return 1
  return a.localeCompare(b)
})

// Presets that exist as MD files but should not appear in the UI selector
const HIDDEN_PRESETS = new Set(['aide'])

// Build DESIGN_PRESETS: 'none' + all auto-discovered .md files (enriched with RICH_META)
export const DESIGN_PRESETS: Record<string, DesignPresetMeta> = {
  none: {
    label: '기본',
    md: buildAideDefaultMd(MD_FILES.ktds ?? ''),
    color: '#1a75ff',
    description: 'kt ds 기반 규칙을 Aide 기본 디자인 시스템 명칭으로 사용합니다',
  },
}

for (const id of sortedIds) {
  if (HIDDEN_PRESETS.has(id)) continue
  const md = MD_FILES[id]
  const rich = RICH_META[id]
  DESIGN_PRESETS[id] = {
    label: rich?.label ?? deriveLabel(md, id),
    md,
    color: rich?.color ?? (extractColorsPrimary(md) || undefined),
    description: rich?.description ?? extractField(md, 'description'),
    palette: rich?.palette,
    fonts: rich?.fonts,
    traits: rich?.traits,
    typographyScale: rich?.typographyScale,
    statusColors: rich?.statusColors,
    radiusTokens: rich?.radiusTokens,
  }
}
