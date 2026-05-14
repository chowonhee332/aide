'use client'

import { ArrowLeft, Check } from 'lucide-react'

interface DesignMdPreviewProps {
  md: string
  url: string
  screenshot?: string
  onApply: () => void
  onBack: () => void
}

interface ParsedDesign {
  name: string
  description: string
  colors: { key: string; value: string }[]
  fontFamily: string
  typography: { name: string; fontSize: string; fontWeight: string; lineHeight: string }[]
  rounded: { name: string; value: string }[]
  buttonPrimary: { bg: string; text: string; radius: string } | null
  buttonSecondary: { bg: string; text: string; radius: string } | null
  overviewText: string
  colorsHeadline: string
  typographyNote: string
}

function extractYamlSection(yaml: string, sectionName: string): string {
  const lines = yaml.split('\n')
  let inSection = false
  const result: string[] = []
  for (const line of lines) {
    if (line === `${sectionName}:`) {
      inSection = true
      continue
    }
    if (inSection) {
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t')) break
      result.push(line)
    }
  }
  return result.join('\n')
}

function extractMdSection(md: string, heading: string): string {
  const re = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`)
  const m = md.match(re)
  if (!m) return ''
  return (m[1].split('\n').find(l => l.trim().length > 0) ?? '').trim()
}

function resolveColorRef(value: string, colorMap: Record<string, string>): string {
  return value.replace(/\{colors\.(\w+)\}/g, (_, k) => colorMap[k] ?? value)
}

function parseDesignMd(md: string): ParsedDesign {
  const empty: ParsedDesign = {
    name: 'Design System', description: '', colors: [], fontFamily: 'sans-serif',
    typography: [], rounded: [], buttonPrimary: null, buttonSecondary: null,
    overviewText: '', colorsHeadline: '', typographyNote: '',
  }

  const fmMatch = md.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return empty
  const yaml = fmMatch[1]

  const name = yaml.match(/^name:\s*["']?(.*?)["']?\s*$/m)?.[1] ?? 'Design System'
  const description = yaml.match(/^description:\s*["']?(.*?)["']?\s*$/m)?.[1] ?? ''

  const colorSection = extractYamlSection(yaml, 'colors')
  const colorMap: Record<string, string> = {}
  for (const [, k, v] of colorSection.matchAll(/^\s+(\w+):\s*["']?(#[0-9a-fA-F]{3,8})["']?/gm)) {
    colorMap[k] = v
  }
  const colors = Object.entries(colorMap).map(([key, value]) => ({ key, value }))

  const fontFamily = yaml.match(/fontFamily:\s*["']?(.*?)["']?\s*$/m)?.[1] ?? 'sans-serif'
  const typSection = extractYamlSection(yaml, 'typography')
  const typography: ParsedDesign['typography'] = []
  for (const [, tName, props] of typSection.matchAll(/^\s+(\w+):\s*\{([^}]+)\}/gm)) {
    if (tName === 'fontFamily') continue
    const fontSize = props.match(/fontSize:\s*["']?(\d+px)["']?/)?.[1] ?? ''
    const fontWeight = props.match(/fontWeight:\s*["']?(\w+)["']?/)?.[1] ?? '400'
    const lineHeight = props.match(/lineHeight:\s*["']?([0-9.]+)["']?/)?.[1] ?? '1.5'
    if (fontSize) typography.push({ name: tName, fontSize, fontWeight, lineHeight })
  }

  const roundedSection = extractYamlSection(yaml, 'rounded')
  const rounded: ParsedDesign['rounded'] = []
  for (const [, k, v] of roundedSection.matchAll(/^\s+(\w+):\s*["']?([0-9]+px|9999px)["']?/gm)) {
    rounded.push({ name: k, value: v })
  }

  const compSection = extractYamlSection(yaml, 'components')
  function parseComponent(compName: string) {
    const re = new RegExp(`\\s+${compName}:\\n([\\s\\S]*?)(?=\\n\\s+\\w+-\\w+:|$)`)
    const m = compSection.match(re)
    if (!m) return null
    const block = m[1]
    const bg = resolveColorRef(block.match(/backgroundColor:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim() ?? '', colorMap)
    const text = resolveColorRef(block.match(/textColor:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim() ?? '', colorMap)
    const radiusRef = block.match(/rounded:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim() ?? ''
    const radiusMatch = radiusRef.match(/\{rounded\.(\w+)\}/)
    const radius = radiusMatch ? (rounded.find(r => r.name === radiusMatch[1])?.value ?? '8px') : radiusRef
    return { bg, text, radius }
  }

  const bodyStart = md.indexOf('\n---\n')
  const bodyMd = bodyStart >= 0 ? md.slice(bodyStart + 5) : ''
  const overviewText = extractMdSection(bodyMd, 'Overview') || description
  const colorsHeadline = extractMdSection(bodyMd, 'Colors')
  const typographyNote = extractMdSection(bodyMd, 'Typography')

  return {
    name, description, colors, fontFamily, typography, rounded,
    buttonPrimary: parseComponent('button-primary'),
    buttonSecondary: parseComponent('button-secondary'),
    overviewText, colorsHeadline, typographyNote,
  }
}

const TYPE_SAMPLES: Record<string, string> = {
  display: 'Display Headline',
  h1: 'Heading One',
  h2: 'Heading Two',
  h3: 'Heading Three',
  body: 'Body text. The quick brown fox.',
  bodySmall: 'Small body text sample.',
  label: 'Label Text',
  caption: 'Caption · Detail',
}

const BRAND_KEYS = ['primary', 'secondary', 'accent', 'brand', 'cta', 'action']
const SURFACE_KEYS = ['surface', 'background', 'base', 'canvas', 'bg']
const TEXT_KEYS = ['onSurface', 'onBackground', 'onPrimary', 'onSecondary', 'text', 'ink', 'hairline', 'border', 'outline', 'muted', 'subtle', 'divider', 'on', 'error']

function colorCategory(key: string): 'brand' | 'surface' | 'text' | 'other' {
  const k = key.toLowerCase()
  if (BRAND_KEYS.some(s => k === s.toLowerCase() || k.startsWith(s.toLowerCase()))) return 'brand'
  if (SURFACE_KEYS.some(s => k === s.toLowerCase() || k.includes(s.toLowerCase()))) return 'surface'
  if (TEXT_KEYS.some(s => k === s.toLowerCase() || k.includes(s.toLowerCase()))) return 'text'
  return 'other'
}

function isVeryLight(hex: string): boolean {
  if (hex.length < 4) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 230
}

function ColorSwatch({ colorKey, value }: { colorKey: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px', minWidth: '52px' }}>
      <div style={{
        width: '52px', height: '40px', borderRadius: '8px',
        backgroundColor: value,
        border: isVeryLight(value) ? '1px solid #e8e8e8' : 'none',
        flexShrink: 0,
      }} />
      <span style={{ color: '#888', fontSize: '9px', lineHeight: 1.3, maxWidth: '54px', wordBreak: 'break-all' }}>
        {colorKey}
      </span>
      <span style={{ color: '#bbb', fontSize: '8px', letterSpacing: '0.02em', fontFamily: 'monospace' }}>
        {value.toLowerCase()}
      </span>
    </div>
  )
}

function DocSection({ label, children, noBorder }: { label: string; children: React.ReactNode; noBorder?: boolean }) {
  return (
    <div style={{ padding: '20px 24px', borderBottom: noBorder ? 'none' : '1px solid #f0f0f0' }}>
      <p style={{ color: '#bbb', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

export function DesignMdPreview({ md, url, screenshot, onApply, onBack }: DesignMdPreviewProps) {
  const d = parseDesignMd(md)

  const categorized = d.colors.reduce<{
    brand: typeof d.colors
    surface: typeof d.colors
    text: typeof d.colors
    other: typeof d.colors
  }>((acc, c) => {
    const cat = colorCategory(c.key)
    acc[cat].push(c)
    return acc
  }, { brand: [], surface: [], text: [], other: [] })

  const brandColors = [...categorized.brand, ...categorized.other].slice(0, 8)
  const fontName = d.fontFamily.split(',')[0].replace(/['"]/g, '').trim()
  const domainLabel = url.replace(/^https?:\/\//, '').split('/')[0]

  const hasColors = d.colors.length > 0
  const hasTypography = d.typography.length > 0
  const hasShapes = d.rounded.filter(r => r.name !== 'none' && r.name !== 'full').length > 0
  const hasComponents = !!(d.buttonPrimary?.bg || d.buttonSecondary?.bg)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)', fontSize: '12px', padding: '2px 0',
          }}
        >
          <ArrowLeft size={12} />
          다시 입력
        </button>
        <button
          onClick={onApply}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '100px',
            border: 'none', cursor: 'pointer',
            backgroundColor: 'rgba(255,255,255,0.9)', color: '#111111',
            fontSize: '12px', fontWeight: 600, letterSpacing: '-0.12px',
          }}
        >
          <Check size={12} strokeWidth={2.5} />
          이 디자인 적용하기
        </button>
      </div>

      {/* Document */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        maxHeight: '500px',
        overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.08)',
        scrollbarWidth: 'thin',
        scrollbarColor: '#e0e0e0 transparent',
      }}>

        {/* Hero */}
        <div style={{
          padding: '24px 24px 20px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex', gap: '14px', alignItems: 'flex-start',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              color: '#bbb', fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px',
            }}>
              Design System
            </p>
            <h2 style={{
              color: '#111', fontSize: '18px', fontWeight: 700,
              letterSpacing: '-0.6px', lineHeight: 1.15, marginBottom: '10px',
            }}>
              {d.name}
            </h2>
            {d.overviewText && (
              <p style={{
                color: '#666', fontSize: '11px', lineHeight: 1.6,
                letterSpacing: '-0.11px', marginBottom: '10px',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } as React.CSSProperties}>
                {d.overviewText}
              </p>
            )}
            <p style={{ color: '#ccc', fontSize: '10px', letterSpacing: '-0.1px' }}>
              {domainLabel}
            </p>
          </div>
          {screenshot && (
            <div style={{
              width: '80px', flexShrink: 0,
              borderRadius: '8px', overflow: 'hidden',
              border: '1px solid #f0f0f0',
            }}>
              <img
                src={screenshot} alt="site preview"
                style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }}
              />
            </div>
          )}
        </div>

        {/* Colors */}
        {hasColors && (
          <DocSection label="Colors">
            {d.colorsHeadline && (
              <p style={{
                color: '#333', fontSize: '13px', fontWeight: 600,
                letterSpacing: '-0.4px', marginBottom: '16px', lineHeight: 1.3,
              }}>
                {d.colorsHeadline}
              </p>
            )}
            {brandColors.length > 0 && (
              <>
                <p style={{ color: '#bbb', fontSize: '9px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Brand &amp; Accent
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {brandColors.map(c => <ColorSwatch key={c.key} colorKey={c.key} value={c.value} />)}
                </div>
              </>
            )}
            {categorized.surface.length > 0 && (
              <>
                <p style={{ color: '#bbb', fontSize: '9px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Surface
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {categorized.surface.map(c => <ColorSwatch key={c.key} colorKey={c.key} value={c.value} />)}
                </div>
              </>
            )}
            {categorized.text.length > 0 && (
              <>
                <p style={{ color: '#bbb', fontSize: '9px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Text &amp; Hairlines
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {categorized.text.map(c => <ColorSwatch key={c.key} colorKey={c.key} value={c.value} />)}
                </div>
              </>
            )}
          </DocSection>
        )}

        {/* Typography */}
        {hasTypography && (
          <DocSection label="Typography">
            <p style={{
              color: '#333', fontSize: '13px', fontWeight: 600,
              letterSpacing: '-0.4px', marginBottom: '4px',
            }}>
              {fontName}
            </p>
            {d.typographyNote && (
              <p style={{ color: '#999', fontSize: '11px', marginBottom: '18px', lineHeight: 1.5 }}>
                {d.typographyNote}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {d.typography.slice(0, 7).map((t, i) => (
                <div
                  key={t.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 1fr 44px',
                    alignItems: 'baseline',
                    gap: '12px',
                    padding: '9px 0',
                    borderTop: i === 0 ? 'none' : '1px solid #f5f5f5',
                  }}
                >
                  <span style={{
                    color: '#ccc', fontSize: '8px', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    {t.name}
                  </span>
                  <span style={{
                    color: '#111', overflow: 'hidden', whiteSpace: 'nowrap',
                    fontFamily: `"${fontName}", -apple-system, BlinkMacSystemFont, sans-serif`,
                    fontSize: t.fontSize, fontWeight: t.fontWeight, lineHeight: 1.2,
                  }}>
                    {TYPE_SAMPLES[t.name] ?? t.name}
                  </span>
                  <span style={{ color: '#ccc', fontSize: '9px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {t.fontSize}
                  </span>
                </div>
              ))}
            </div>
          </DocSection>
        )}

        {/* Shapes */}
        {hasShapes && (
          <DocSection label="Shapes" noBorder={!hasComponents}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {d.rounded
                .filter(r => r.name !== 'none')
                .slice(0, 6)
                .map(r => (
                  <div key={r.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '52px', height: '34px',
                      borderRadius: r.value,
                      border: '1.5px solid #e0e0e0',
                      backgroundColor: '#f8f8f8',
                    }} />
                    <span style={{ color: '#bbb', fontSize: '8px', textAlign: 'center', fontFamily: 'monospace' }}>
                      {r.value}
                    </span>
                  </div>
                ))}
            </div>
          </DocSection>
        )}

        {/* Components */}
        {hasComponents && (
          <DocSection label="Components" noBorder>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {d.buttonPrimary?.bg && (
                <div style={{
                  padding: '9px 20px',
                  borderRadius: d.buttonPrimary.radius || '8px',
                  backgroundColor: d.buttonPrimary.bg,
                  color: d.buttonPrimary.text || '#ffffff',
                  fontSize: '13px', fontWeight: 600,
                  fontFamily: `"${fontName}", sans-serif`,
                  letterSpacing: '-0.13px',
                }}>
                  Primary Button
                </div>
              )}
              {d.buttonSecondary && (d.buttonSecondary.bg || d.buttonPrimary?.bg) && (
                <div style={{
                  padding: '9px 20px',
                  borderRadius: d.buttonSecondary.radius || '8px',
                  backgroundColor: d.buttonSecondary.bg || 'transparent',
                  color: d.buttonSecondary.text || d.buttonPrimary?.bg || '#111',
                  fontSize: '13px', fontWeight: 600,
                  fontFamily: `"${fontName}", sans-serif`,
                  letterSpacing: '-0.13px',
                  border: `1.5px solid ${d.buttonSecondary.text || d.buttonPrimary?.bg || '#ddd'}`,
                }}>
                  Secondary Button
                </div>
              )}
            </div>
          </DocSection>
        )}

      </div>
    </div>
  )
}
