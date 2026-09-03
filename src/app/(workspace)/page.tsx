'use client'

import { useState, useCallback, useMemo, useRef, useEffect, startTransition } from 'react'
import {
  ArrowUp, ArrowRight, FileText, Upload, X,
  Check, ChevronDown, Palette, Share2,
  Clock, Trash2, ExternalLink, Link2, KeyRound,
  Smartphone, Monitor,
  Download, Eye, EyeOff, Coins, Menu as MenuIcon,
  LoaderCircle,
} from '@/components/ui/material-icon'
import { type DesignPreset, DESIGN_PRESETS } from '@/lib/design-presets'
import Grainient from '@/components/Grainient'
import { DesignMdPreview } from '@/components/DesignMdPreview'
import { loadHistory } from '@/lib/history'
import type { GeminiUsageSummary } from '@/lib/gemini-usage'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AIDE_UI } from '@/lib/aide-ui'
import { writeStudioNewHandoff } from '@/lib/studio-route-handoff'
import { Button, buttonVariants } from '@/components/ui/button'
import { Menu, MenuTrigger, MenuContent, MenuItem } from '@/components/ui/menu'

const F = {
  canvas:       AIDE_UI.canvas,
  surface:      AIDE_UI.surface,
  surface1:     AIDE_UI.page,
  surface2:     AIDE_UI.fill,
  ink:          AIDE_UI.text,
  inkMuted:     AIDE_UI.textMuted,
  inkSubtle:    AIDE_UI.textAssistive,
  primary:      AIDE_UI.primary,
  primaryActive:AIDE_UI.primaryStrong,
  primarySoft:  AIDE_UI.primarySoft,
  hairline:     AIDE_UI.border,
  hairlineSoft: AIDE_UI.borderSubtle,
}

// Home is entered through the persistent workspace LNB. Do not render a
// second, landing-specific global navigation above the canvas.
const LANDING_GNB_ENABLED = false

function formatCompactTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`
  return value.toLocaleString()
}

function UsageTrendChart({ data }: { data: GeminiUsageSummary['byDay'] }) {
  const width = 620
  const height = 176
  const left = 10
  const right = 10
  const top = 12
  const bottom = 30
  const graphWidth = width - left - right
  const graphHeight = height - top - bottom
  const maxCost = Math.max(...data.map(day => day.costUsd), 0.0001)
  const points = data.map((day, index) => ({
    ...day,
    x: left + (data.length <= 1 ? graphWidth / 2 : (index / (data.length - 1)) * graphWidth),
    y: top + graphHeight - (day.costUsd / maxCost) * graphHeight,
  }))
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const areaPath = points.length
    ? `${linePath} L ${points.at(-1)!.x.toFixed(1)} ${(top + graphHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(top + graphHeight).toFixed(1)} Z`
    : ''
  const labelIndexes = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])

  return (
    <div style={{ border: `1px solid ${F.hairlineSoft}`, borderRadius: 'var(--aui-radius-card)', padding: 'var(--aui-space-4)', background: F.surface }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--aui-space-2)' }}>
        <span style={{ fontSize: 'var(--aui-type-body-size)', fontWeight: 'var(--aui-weight-semibold)', color: F.ink }}>최근 14일 비용 추이</span>
        <span style={{ fontSize: 'var(--aui-type-caption-size)', color: F.inkMuted }}>일별 추정 비용 · USD</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="최근 14일 Gemini API 비용 추이" style={{ width: '100%', height: '176px', display: 'block', overflow: 'visible' }}>
        {[0, 0.5, 1].map(ratio => {
          const y = top + graphHeight * ratio
          return <line key={ratio} x1={left} y1={y} x2={width - right} y2={y} stroke={F.hairlineSoft} strokeWidth="1" strokeDasharray={ratio === 1 ? undefined : '4 5'} />
        })}
        <defs>
          <linearGradient id="usage-cost-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={F.primary} stopOpacity="0.24" />
            <stop offset="100%" stopColor={F.primary} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill="url(#usage-cost-area)" />}
        {linePath && <path d={linePath} fill="none" stroke={F.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((point, index) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r={point.costUsd > 0 ? 4 : 2.5} fill={point.costUsd > 0 ? F.primary : F.hairline} stroke={F.surface} strokeWidth="2">
              <title>{`${point.date} · ${point.calls}회 · $${point.costUsd.toFixed(4)}`}</title>
            </circle>
            {labelIndexes.has(index) && <text x={point.x} y={height - 7} textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'} fontSize="11" fill={F.inkMuted}>{point.date.slice(5).replace('-', '.')}</text>}
          </g>
        ))}
      </svg>
    </div>
  )
}

function UsageModelBreakdown({ rows, totalCost }: { rows: GeminiUsageSummary['byModel']; totalCost: number }) {
  const colors = [F.primary, '#7C5CFC', '#17A673', '#E59A2F', '#E45D6F', '#5A7184']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aui-space-3)' }}>
      <div style={{ fontSize: 'var(--aui-type-body-size)', fontWeight: 'var(--aui-weight-semibold)', color: F.ink }}>모델별 비용</div>
      {rows.map((row, index) => {
        const ratio = totalCost > 0 ? row.costUsd / totalCost : 0
        return (
          <div key={row.model} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--aui-space-3)', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--aui-space-2)', marginBottom: 6 }}>
                <span style={{ color: F.ink, fontSize: 'var(--aui-type-caption-size)', fontWeight: 'var(--aui-weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.model}</span>
                <span style={{ color: F.inkMuted, fontSize: 'var(--aui-type-caption-size)', flexShrink: 0 }}>{row.calls}회 · {(ratio * 100).toFixed(ratio >= 0.1 ? 0 : 1)}%</span>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: 'var(--aui-border-subtle)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(ratio * 100, row.costUsd > 0 ? 1.5 : 0)}%`, height: '100%', borderRadius: 999, background: colors[index % colors.length], transition: 'width 300ms ease' }} />
              </div>
            </div>
            <span style={{ color: F.ink, fontSize: 'var(--aui-type-caption-size)', fontWeight: 'var(--aui-weight-semibold)', minWidth: 68, textAlign: 'right' }}>${row.costUsd.toFixed(4)}</span>
          </div>
        )
      })}
    </div>
  )
}

type ApiKeyTab = 'gemini' | 'unsplash' | 'figma'

const API_KEY_META: Record<ApiKeyTab, { label: string; title: string; storageKey: string; placeholder: string; description: string }> = {
  gemini: {
    label: 'Gemini',
    title: 'Gemini API Key',
    storageKey: 'aide_gemini_api_key',
    placeholder: 'AIza...',
    description: 'UI 생성, 질문 생성, 3D 이미지 생성에 사용합니다. 입력하면 서버 환경변수보다 이 키를 우선 사용합니다.',
  },
  unsplash: {
    label: 'Unsplash',
    title: 'Unsplash Access Key',
    storageKey: 'aide_unsplash_access_key',
    placeholder: 'Unsplash Access Key',
    description: '시안 안의 실사 썸네일과 배경 이미지를 불러올 때 사용합니다. 없으면 서버 키 또는 기본 큐레이션 이미지로 대체됩니다.',
  },
  figma: {
    label: 'Figma Plugin',
    title: 'code.to.design API Key',
    storageKey: 'aide_code_to_design_api_key',
    placeholder: 'zpka_...',
    description: '완성된 HTML을 Figma에 붙여넣을 수 있는 데이터로 변환할 때 사용합니다.',
  },
}

function readClientApiKeys(): Record<ApiKeyTab, string> {
  if (typeof window === 'undefined') return { gemini: '', unsplash: '', figma: '' }
  return {
    gemini: localStorage.getItem(API_KEY_META.gemini.storageKey) ?? '',
    unsplash: localStorage.getItem(API_KEY_META.unsplash.storageKey) ?? '',
    figma: localStorage.getItem(API_KEY_META.figma.storageKey) ?? '',
  }
}

function buildClientApiHeaders(): Record<string, string> {
  const keys = readClientApiKeys()
  return {
    'Content-Type': 'application/json',
    ...(keys.gemini && { 'x-gemini-key': keys.gemini }),
    ...(keys.unsplash && { 'x-unsplash-key': keys.unsplash }),
    ...(keys.figma && { 'x-code-to-design-key': keys.figma }),
  }
}

type AsIsAnalysis = {
  sourceUrl: string
  pageTitle: string
  pagePurpose: string
  layoutType: string
  sections: Array<{ heading: string; ctaSamples: string[]; repeatedItemCount: number }>
  primaryCtas: Array<{ text: string }>
  globalNavigation: Array<{ text: string }>
  redesignFocus: string[]
  shellContract?: {
    topAppBar: { present: boolean; title: string; leftAction: string; rightAction: string; preserveExactly: boolean }
    bottomNavigation: { present: boolean }
    brandLogo: { present: boolean }
  }
}

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let hue = 0
  switch (max) {
    case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: hue = ((b - r) / d + 2) / 6; break
    case b: hue = ((r - g) / d + 4) / 6; break
  }
  return [hue, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) { const v = Math.round(l * 255); return '#' + [v, v, v].map(c => c.toString(16).padStart(2, '0')).join('') }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

function deriveSecondaryColor(primaryHex: string): string {
  const [h, s, l] = hexToHsl(primaryHex)
  // 같은 색조에서 어두운 shade (primary의 700 단계 느낌)
  const newL = Math.max(0.12, l - 0.22)
  const newS = Math.min(1, s * 1.08)
  return hslToHex(h, newS, newL)
}

function extractColorsFromImage(dataUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const size = 80
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve([]); return }
      ctx.drawImage(img, 0, 0, size, size)
      const { data } = ctx.getImageData(0, 0, size, size)

      const buckets: Record<string, number> = {}
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        if (a < 128) continue
        if (r > 230 && g > 230 && b > 230) continue
        if (r < 25 && g < 25 && b < 25) continue
        if (Math.max(r, g, b) - Math.min(r, g, b) < 30) continue
        const key = `${(r >> 3) << 3},${(g >> 3) << 3},${(b >> 3) << 3}`
        buckets[key] = (buckets[key] || 0) + 1
      }

      const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1])
      const selected: [number, number, number][] = []
      for (const [key] of sorted) {
        const [r, g, b] = key.split(',').map(Number)
        const tooClose = selected.some(([sr, sg, sb]) =>
          Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2) < 60
        )
        if (!tooClose) {
          selected.push([r, g, b])
          if (selected.length >= 3) break
        }
      }

      const colors = selected.map(([r, g, b]) =>
        '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
      )
      // 추출된 색이 1개뿐이면 같은 hue의 어두운 shade를 secondary로 자동 파생
      if (colors.length === 1) colors.push(deriveSecondaryColor(colors[0]))
      resolve(colors)
    }
    img.onerror = () => resolve([])
    img.src = dataUrl
  })
}

export default function Home() {
  const settingsPanel = useSearchParams().get('settings')
  return <HomeContent key={settingsPanel ?? 'home'} settingsPanel={settingsPanel} />
}

function HomeContent({ settingsPanel }: { settingsPanel: string | null }) {
  const router = useRouter()
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(settingsPanel === 'api')
  const [apiKeyTab, setApiKeyTab] = useState<ApiKeyTab>('gemini')
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<ApiKeyTab, string>>({ gemini: '', unsplash: '', figma: '' })
  const [apiKeyValidating, setApiKeyValidating] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [apiKeyError, setApiKeyError] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const activeApiKeyMeta = API_KEY_META[apiKeyTab]
  const activeApiKeyInput = apiKeyInputs[apiKeyTab]

  const openApiKeyModal = () => {
    setApiKeyInputs(readClientApiKeys())
    setApiKeyTab('gemini')
    setApiKeyStatus('idle')
    setApiKeyError('')
    setApiKeyModalOpen(true)
  }

  const handleValidateAndSave = async () => {
    const trimmed = activeApiKeyInput.trim()
    if (!trimmed) {
      setApiKeyError('API Key를 입력해주세요.')
      return
    }
    setApiKeyValidating(true)
    setApiKeyStatus('idle')
    setApiKeyError('')
    try {
      if (apiKeyTab !== 'gemini') {
        localStorage.setItem(activeApiKeyMeta.storageKey, trimmed)
        setApiKeyStatus('valid')
        setTimeout(() => setApiKeyModalOpen(false), 600)
        return
      }
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      })
      const data = await res.json()
      if (data.valid) {
        localStorage.setItem(activeApiKeyMeta.storageKey, trimmed)
        setApiKeyStatus('valid')
        setTimeout(() => setApiKeyModalOpen(false), 800)
      } else {
        setApiKeyStatus('invalid')
        setApiKeyError(data.error ?? '유효하지 않은 API Key입니다.')
      }
    } catch {
      setApiKeyStatus('invalid')
      setApiKeyError('네트워크 오류가 발생했습니다.')
    } finally {
      setApiKeyValidating(false)
    }
  }


  // GNB: full-width transparent bar at the top, collapses to a floating
  // frosted pill once the page is scrolled
  const [navScrolled, setNavScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const [usageModalOpen, setUsageModalOpen] = useState(settingsPanel === 'billing')
  const [usageSummary, setUsageSummary] = useState<GeminiUsageSummary | null>(null)
  const [usageLoading, setUsageLoading] = useState(settingsPanel === 'billing')
  useEffect(() => {
    if (!usageModalOpen) return
    fetch('/api/usage')
      .then(res => res.json())
      .then((data: GeminiUsageSummary) => startTransition(() => setUsageSummary(data)))
      .catch(() => startTransition(() => setUsageSummary(null)))
      .finally(() => setUsageLoading(false))
  }, [usageModalOpen])

  const [platform, setPlatform] = useState<'mobile' | 'web'>('mobile')
  // 'ai'  = 브리프 → A/B/C HTML 시안 (기존 파이프라인)
  // 'compose' = 브리프 → 가장 맞는 Astryx 템플릿 1개를 Playground에서 바로 연다
  const [genMode, setGenMode] = useState<'ai' | 'compose'>('ai')
  const [templateMatching, setTemplateMatching] = useState(false)
  const [templateMatchError, setTemplateMatchError] = useState<string | null>(null)
  const [briefDesc, setBriefDesc] = useState('')
  const [briefFeatures, setBriefFeatures] = useState('')
  const [briefAudience, setBriefAudience] = useState('')
  const [briefConstraints, setBriefConstraints] = useState('')
  const [briefDetailsOpen, setBriefDetailsOpen] = useState(false)
  const brief = [
    briefDesc.trim() ? `사용자 요청:\n${briefDesc.trim()}` : '',
    briefAudience.trim() ? `주요 사용자:\n${briefAudience.trim()}` : '',
    briefFeatures.trim() ? `핵심 기능 또는 필수 정보:\n${briefFeatures.trim()}` : '',
    briefConstraints.trim() ? `추가 요청:\n${briefConstraints.trim()}` : '',
  ].filter(Boolean).join('\n\n')
  const [designPreset, setDesignPreset] = useState<DesignPreset>('none')
  const [designPanelOpen, setDesignPanelOpen] = useState(false)
  const [designMdContent, setDesignMdContent] = useState<string | null>(null)
  const [designMdFileName, setDesignMdFileName] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [urlAnalyzing, setUrlAnalyzing] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlPreviewMd, setUrlPreviewMd] = useState<string | null>(null)
  const [urlPreviewScreenshot, setUrlPreviewScreenshot] = useState<string | null>(null)
  const [appliedUrlScreenshot, setAppliedUrlScreenshot] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const refImageInputRef = useRef<HTMLInputElement>(null)

  const [refPanelOpen, setRefPanelOpen] = useState(false)
  const [sourceTab, setSourceTab] = useState<'asis' | 'wireframe' | 'reference' | 'brand' | 'planning'>('planning')
  const [refPageImage, setRefPageImage] = useState<string | null>(null)
  const [refImageKind, setRefImageKind] = useState<'wireframe' | 'reference'>('reference')
  const [asIsAnalysis, setAsIsAnalysis] = useState<AsIsAnalysis | null>(null)
  // 네이티브 앱·사내 시스템처럼 URL이 없는 as-is는 캡처 이미지로만 분석할 수 있다.
  const [asIsShots, setAsIsShots] = useState<Array<{ name: string; data: string; mimeType: string }>>([])
  const asIsShotInputRef = useRef<HTMLInputElement>(null)
  const [refPageUrlInput, setRefPageUrlInput] = useState('')
  const [refCapturing, setRefCapturing] = useState(false)
  const [refError, setRefError] = useState<string | null>(null)
  const [refPreviewOpen, setRefPreviewOpen] = useState(false)
  const [refSearchQuery, setRefSearchQuery] = useState('')
  const [refSearchResults, setRefSearchResults] = useState<{ url: string; title: string; source: string }[]>([])
  const [refSearching, setRefSearching] = useState(false)

  // RFP·제안요청서·기능요구사항을 함께 올리는 경우가 많아 문서는 여러 건을 받는다.
  // 다운스트림은 여전히 하나의 문자열(prdDoc)만 보므로 파이프라인은 그대로 둔다.
  const [prdDocEntries, setPrdDocEntries] = useState<Array<{ name: string; text: string }>>([])
  const [prdParsing, setPrdParsing] = useState(false)
  // 생성 프롬프트가 prdDoc을 10,000자에서 자른다(gemini.ts). 문서를 그냥 이어붙이면
  // 긴 RFP 하나가 예산을 다 먹고 뒤 문서(보통 기능요구사항)가 통째로 사라진다.
  // 문서마다 몫을 주고, 남는 몫은 더 긴 문서에 되돌려준다.
  const prdDoc = useMemo(() => {
    if (!prdDocEntries.length) return null
    const BUDGET = 10000
    const overhead = prdDocEntries.reduce((sum, entry) => sum + entry.name.length + 24, 0)
    let remaining = Math.max(BUDGET - overhead, prdDocEntries.length * 200)

    // 짧은 문서부터 확정해야 남는 몫이 긴 문서로 흘러간다.
    const order = prdDocEntries
      .map((entry, index) => ({ index, len: entry.text.length }))
      .sort((a, b) => a.len - b.len)
    const allowance = new Array<number>(prdDocEntries.length).fill(0)
    let left = order.length
    for (const { index, len } of order) {
      const share = Math.floor(remaining / left)
      const take = Math.min(len, share)
      allowance[index] = take
      remaining -= take
      left -= 1
    }

    return prdDocEntries
      .map((entry, index) => {
        const body = entry.text.slice(0, allowance[index])
        const cut = body.length < entry.text.length ? '\n\n[이하 생략]' : ''
        return `# 첨부 문서: ${entry.name}\n\n${body}${cut}`
      })
      .join('\n\n---\n\n')
  }, [prdDocEntries])
  const [iaImage, setIaImage] = useState<string | null>(null)
  const [iaImageFileName, setIaImageFileName] = useState<string | null>(null)
  const [iaText, setIaText] = useState<string | null>(null)
  const [htmlSourceUrlInput, setHtmlSourceUrlInput] = useState('')
  const [htmlSourceLoading, setHtmlSourceLoading] = useState(false)
  const prdFileInputRef = useRef<HTMLInputElement>(null)
  const iaImageInputRef = useRef<HTMLInputElement>(null)

  const [brandPanelOpen, setBrandPanelOpen] = useState(false)
  const [brandLogo, setBrandLogo] = useState<string | null>(null)
  const [brandLogoName, setBrandLogoName] = useState<string | null>(null)
  const [brandColors, setBrandColors] = useState<string[]>([])
  const [extractedBrandColors, setExtractedBrandColors] = useState<string[]>([])
  const [extractingColors, setExtractingColors] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // URL → design.md 생성 전용 모달 state
  const [genMdModalOpen, setGenMdModalOpen] = useState(false)
  const [genMdUrl, setGenMdUrl] = useState('')
  const [genMdAnalyzing, setGenMdAnalyzing] = useState(false)
  const [genMdError, setGenMdError] = useState<string | null>(null)
  const [genMdResult, setGenMdResult] = useState<string | null>(null)
  const [genMdScreenshot, setGenMdScreenshot] = useState<string | null>(null)
  const [genMdCopied, setGenMdCopied] = useState(false)
  const [genMdCaptureStatus, setGenMdCaptureStatus] = useState<'full' | 'partial' | 'blocked' | null>(null)
  // URL이 없는 서비스는 캡처만으로 design.md를 만든다.
  const [genMdShots, setGenMdShots] = useState<Array<{ name: string; data: string; mimeType: string }>>([])
  const [genMdSourceLabel, setGenMdSourceLabel] = useState<string | null>(null)
  const genMdShotInputRef = useRef<HTMLInputElement>(null)

  const handleGenMdAnalyze = async () => {
    if (!genMdUrl.trim() || genMdAnalyzing) return
    setGenMdAnalyzing(true)
    setGenMdError(null)
    setGenMdResult(null)
    setGenMdScreenshot(null)
    setGenMdCaptureStatus(null)
    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: buildClientApiHeaders(),
        body: JSON.stringify({ url: genMdUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenMdError(data.error ?? '분석 실패')
        return
      }
      setGenMdResult(data.designMd)
      setGenMdScreenshot(data.screenshot ?? null)
      setGenMdCaptureStatus(data.captureStatus ?? null)
    } catch {
      setGenMdError('네트워크 오류가 발생했습니다.')
    } finally {
      setGenMdAnalyzing(false)
    }
  }

  const handleGenMdShotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (genMdShotInputRef.current) genMdShotInputRef.current.value = ''
    if (!files.length) return
    setGenMdError(null)
    const loaded = await Promise.all(
      files.map(
        file =>
          new Promise<{ name: string; data: string; mimeType: string }>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = ev =>
              resolve({
                name: file.name,
                data: (ev.target?.result as string).split(',')[1],
                mimeType: file.type || 'image/png',
              })
            reader.onerror = () => reject(new Error('read failed'))
            reader.readAsDataURL(file)
          }),
      ),
    )
    setGenMdShots(prev => [...prev, ...loaded].slice(0, 10))
  }

  const handleGenMdShotAnalyze = async () => {
    if (!genMdShots.length || genMdAnalyzing) return
    setGenMdAnalyzing(true)
    setGenMdError(null)
    setGenMdResult(null)
    setGenMdScreenshot(null)
    setGenMdCaptureStatus(null)
    try {
      const res = await fetch('/api/analyze-screens-design-md', {
        method: 'POST',
        headers: buildClientApiHeaders(),
        body: JSON.stringify({
          images: genMdShots.map(shot => ({ data: shot.data, mimeType: shot.mimeType })),
          serviceName: genMdUrl.trim() || '캡처 화면',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenMdError(data.error ?? '캡처 분석에 실패했습니다.')
        return
      }
      setGenMdResult(data.designMd)
      // 대표 1장을 미리보기로 쓴다. URL 경로의 screenshot 자리와 같은 역할.
      setGenMdScreenshot(`data:${genMdShots[0].mimeType};base64,${genMdShots[0].data}`)
      setGenMdSourceLabel(`캡처 ${genMdShots.length}장${genMdUrl.trim() ? ` · ${genMdUrl.trim()}` : ''}`)
    } catch {
      setGenMdError('네트워크 오류가 발생했습니다.')
    } finally {
      setGenMdAnalyzing(false)
    }
  }

  const handleGenMdDownload = () => {
    if (!genMdResult) return
    const blob = new Blob([genMdResult], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'design.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGenMdCopy = async () => {
    if (!genMdResult) return
    await navigator.clipboard.writeText(genMdResult)
    setGenMdCopied(true)
    setTimeout(() => setGenMdCopied(false), 2000)
  }

  const handleGenMdUseInStudio = () => {
    if (!genMdResult) return
    setDesignMdContent(genMdResult)
    setDesignMdFileName(genMdSourceLabel ?? genMdUrl.trim())
    setDesignPreset('none')
    setAppliedUrlScreenshot(genMdScreenshot)
    setGenMdModalOpen(false)
    setGenMdResult(null)
    setGenMdScreenshot(null)
    setGenMdCaptureStatus(null)
    setGenMdUrl('')
    setGenMdShots([])
    setGenMdSourceLabel(null)
  }

  const closeGenMdModal = () => {
    setGenMdModalOpen(false)
    setGenMdUrl('')
    setGenMdError(null)
    setGenMdResult(null)
    setGenMdScreenshot(null)
    setGenMdCaptureStatus(null)
    setGenMdShots([])
    setGenMdSourceLabel(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setDesignMdContent(ev.target?.result as string)
      setDesignMdFileName(file.name)
      setDesignPreset('none')
      setDesignPanelOpen(false)
    }
    reader.readAsText(file)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setBrandLogo(dataUrl)
      setBrandLogoName(file.name)
      setExtractedBrandColors([])
      setBrandColors([])
    }
    reader.readAsDataURL(file)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleExtractBrandColors = async () => {
    if (!brandLogo || extractingColors) return
    setExtractingColors(true)
    try {
      const extracted = await extractColorsFromImage(brandLogo)
      setExtractedBrandColors(extracted)
    } finally {
      setExtractingColors(false)
    }
  }

  const handleApplyBrandColors = () => {
    if (extractedBrandColors.length === 0) return
    setBrandColors(extractedBrandColors)
  }

  const clearBrand = () => {
    setBrandLogo(null)
    setBrandLogoName(null)
    setBrandColors([])
    setExtractedBrandColors([])
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const clearDesign = () => {
    setDesignPreset('none')
    setDesignMdContent(null)
    setDesignMdFileName(null)
    setUrlInput('')
    setUrlError(null)
    setUrlPreviewMd(null)
    setUrlPreviewScreenshot(null)
    setAppliedUrlScreenshot(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUrlAnalyze = async () => {
    if (!urlInput.trim() || urlAnalyzing) return
    setUrlAnalyzing(true)
    setUrlError(null)
    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: buildClientApiHeaders(),
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUrlError(data.error ?? '분석 실패')
        return
      }
      setUrlPreviewMd(data.designMd)
      setUrlPreviewScreenshot(data.screenshot ?? null)
    } catch {
      setUrlError('네트워크 오류가 발생했습니다.')
    } finally {
      setUrlAnalyzing(false)
    }
  }

  const handleApplyUrlDesign = () => {
    if (!urlPreviewMd) return
    setDesignMdContent(urlPreviewMd)
    setDesignMdFileName(urlInput.trim())
    setDesignPreset('none')
    setAppliedUrlScreenshot(urlPreviewScreenshot)
    setUrlPreviewMd(null)
    setUrlPreviewScreenshot(null)
    setDesignPanelOpen(false)
  }

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setRefPageImage(base64)
      setRefImageKind(sourceTab === 'wireframe' ? 'wireframe' : 'reference')
      setRefPanelOpen(false)
      setRefError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleAsIsAnalyze = async () => {
    if (!refPageUrlInput.trim() || refCapturing) return
    setRefCapturing(true)
    setRefError(null)
    try {
      const res = await fetch('/api/analyze-asis-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: refPageUrlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setRefError(data.error ?? 'As-is 분석 실패'); return }
      setAsIsAnalysis(data.analysis)
      setRefPanelOpen(false)
    } catch {
      setRefError('네트워크 오류가 발생했습니다.')
    } finally {
      setRefCapturing(false)
    }
  }

  const handleAsIsShotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (asIsShotInputRef.current) asIsShotInputRef.current.value = ''
    if (!files.length) return
    setRefError(null)

    const loaded = await Promise.all(
      files.map(
        file =>
          new Promise<{ name: string; data: string; mimeType: string }>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = ev =>
              resolve({
                name: file.name,
                data: (ev.target?.result as string).split(',')[1],
                mimeType: file.type || 'image/png',
              })
            reader.onerror = () => reject(new Error('read failed'))
            reader.readAsDataURL(file)
          }),
      ),
    )
    setAsIsShots(prev => [...prev, ...loaded].slice(0, 12))
  }

  const handleAsIsShotAnalyze = async () => {
    if (!asIsShots.length || refCapturing) return
    setRefCapturing(true)
    setRefError(null)
    try {
      const res = await fetch('/api/analyze-asis-images', {
        method: 'POST',
        headers: buildClientApiHeaders(),
        body: JSON.stringify({
          images: asIsShots.map(shot => ({ data: shot.data, mimeType: shot.mimeType })),
          serviceName: refPageUrlInput.trim() || brief.slice(0, 60) || '캡처 화면',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRefError(data.error ?? '캡처 화면 분석에 실패했습니다.')
        return
      }
      setAsIsAnalysis(data.analysis)
      setRefPanelOpen(false)
    } catch {
      setRefError('네트워크 오류가 발생했습니다.')
    } finally {
      setRefCapturing(false)
    }
  }

  const handleRefCapture = async () => {
    if (!refPageUrlInput.trim() || refCapturing) return
    setRefCapturing(true)
    setRefError(null)
    try {
      const res = await fetch('/api/capture-url', {
        method: 'POST',
        headers: buildClientApiHeaders(),
        body: JSON.stringify({ url: refPageUrlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setRefError(data.error ?? '캡처 실패'); return }
      setRefPageImage(data.screenshot)
      setRefImageKind('reference')
      setRefPanelOpen(false)
    } catch {
      setRefError('네트워크 오류가 발생했습니다.')
    } finally {
      setRefCapturing(false)
    }
  }

  const handleRefSearch = async () => {
    if (!refSearchQuery.trim() || refSearching) return
    setRefSearching(true)
    setRefSearchResults([])
    try {
      const res = await fetch(`/api/reference-search?q=${encodeURIComponent(refSearchQuery.trim())}`)
      const data = await res.json()
      if (res.ok && data.images) setRefSearchResults(data.images)
    } catch {
      // silent fail — user can retry
    } finally {
      setRefSearching(false)
    }
  }

  const handleRefSearchImageSelect = async (imageUrl: string) => {
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string
        const base64 = dataUrl.split(',')[1]
        setRefPageImage(base64)
        setRefImageKind('reference')
        setRefPanelOpen(false)
      }
      reader.readAsDataURL(blob)
    } catch {
      // If CORS blocks direct fetch, open in new tab as fallback
      window.open(imageUrl, '_blank')
    }
  }

  const clearRefPage = () => {
    setRefPageImage(null)
    setRefImageKind('reference')
    setRefPageUrlInput('')
    setRefError(null)
    if (refImageInputRef.current) refImageInputRef.current.value = ''
  }

  const clearAsIs = () => {
    setAsIsAnalysis(null)
    setAsIsShots([])
    setRefError(null)
  }

  const readAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = ev => resolve((ev.target?.result as string).split(',')[1])
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(file)
    })

  const handlePrdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (prdFileInputRef.current) prdFileInputRef.current.value = ''
    if (!files.length) return

    const isPdf = (file: File) => /\.pdf$/i.test(file.name) || file.type === 'application/pdf'
    const isImage = (file: File) => file.type.startsWith('image/')

    const images = files.filter(isImage)
    const pdfs = files.filter(isPdf)
    const texts = files.filter(file => !isImage(file) && !isPdf(file))

    // 텍스트류는 브라우저에서 그대로 읽는다.
    for (const file of texts) {
      const text = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = ev => resolve(ev.target?.result as string)
        reader.readAsText(file)
      })
      const isHtml = /\.html?$/i.test(file.name)
      setPrdDocEntries(prev => [
        ...prev,
        { name: file.name, text: isHtml ? `[HTML 화면기획서: ${file.name}]\n\n${text}` : text },
      ])
    }

    if (!images.length && !pdfs.length) return

    // PDF는 스캔본인 경우가 많고, 캡처 이미지는 애초에 텍스트가 없다.
    // 둘 다 서버에서 Gemini로 읽는다. 이미지 여러 장은 표가 페이지를 넘어가므로
    // 한 문서로 묶어 한 번에 넘긴다.
    setPrdParsing(true)
    setRefError(null)
    try {
      const jobs: Array<{ label: string; files: File[] }> = [
        ...pdfs.map(file => ({ label: file.name, files: [file] })),
        ...(images.length
          ? [{
              label: images.length > 1 ? `${images[0].name} 외 ${images.length - 1}장` : images[0].name,
              files: images,
            }]
          : []),
      ]

      for (const job of jobs) {
        const payload = await Promise.all(
          job.files.map(async file => ({
            data: await readAsBase64(file),
            mimeType: isPdf(file) ? 'application/pdf' : file.type,
          })),
        )
        const res = await fetch('/api/parse-document', {
          method: 'POST',
          headers: buildClientApiHeaders(),
          body: JSON.stringify({ files: payload, fileName: job.label }),
        })
        const json = await res.json()
        if (!res.ok) {
          setRefError(json.error ?? '문서를 분석하지 못했습니다.')
          continue
        }
        setPrdDocEntries(prev => [...prev, { name: job.label, text: json.text }])
      }
    } catch {
      setRefError('문서 분석 중 오류가 발생했습니다.')
    } finally {
      setPrdParsing(false)
    }
  }

  const handleIaImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    const isHtml = /\.html?$/i.test(file.name)
    if (isExcel) {
      const reader = new FileReader()
      reader.onload = async ev => {
        const data = ev.target?.result
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(data, { type: 'array' })
        const lines: string[] = []
        workbook.SheetNames.forEach(sheetName => {
          lines.push(`[시트: ${sheetName}]`)
          const sheet = workbook.Sheets[sheetName]
          const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
          lines.push(csv)
        })
        setIaText(lines.join('\n'))
        setIaImage(null)
        setIaImageFileName(file.name)
      }
      reader.readAsArrayBuffer(file)
    } else if (isHtml) {
      const reader = new FileReader()
      reader.onload = ev => {
        const text = ev.target?.result as string
        setIaText(`[HTML 화면기획서: ${file.name}]\n\n${text}`)
        setIaImage(null)
        setIaImageFileName(file.name)
      }
      reader.readAsText(file)
    } else {
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string
        const base64 = dataUrl.split(',')[1]
        setIaImage(base64)
        setIaText(null)
        setIaImageFileName(file.name)
      }
      reader.readAsDataURL(file)
    }
    if (iaImageInputRef.current) iaImageInputRef.current.value = ''
  }

  const handleHtmlSourceUrlImport = async () => {
    if (!htmlSourceUrlInput.trim() || htmlSourceLoading) return
    setHtmlSourceLoading(true)
    setRefError(null)
    try {
      const res = await fetch('/api/fetch-html-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: htmlSourceUrlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRefError(data.error ?? 'HTML 링크를 가져오지 못했습니다.')
        return
      }
      setPrdDocEntries(prev => [
        ...prev,
        {
          name: data.title ? `${data.title} · ${data.url}` : data.url,
          text: `[HTML 화면기획서 링크: ${data.url}]\n\n${data.html}`,
        },
      ])
      setHtmlSourceUrlInput('')
    } catch {
      setRefError('네트워크 오류가 발생했습니다.')
    } finally {
      setHtmlSourceLoading(false)
    }
  }

  const clearPlanning = () => {
    setPrdDocEntries([])
    setIaImage(null)
    setIaText(null)
    setIaImageFileName(null)
    setHtmlSourceUrlInput('')
  }

  const handleComposeSubmit = useCallback(async () => {
    if (!briefDesc.trim() || templateMatching) return
    setTemplateMatching(true)
    setTemplateMatchError(null)
    try {
      const response = await fetch('/api/match-template', {
        method: 'POST',
        headers: buildClientApiHeaders(),
        body: JSON.stringify({ brief: brief.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || '템플릿 매칭에 실패했습니다.')
      const device = platform === 'web' ? 'desktop' : 'mobile'
      router.push(`/playground?template=${encodeURIComponent(data.id)}&device=${device}`)
    } catch (error) {
      setTemplateMatchError(error instanceof Error ? error.message : '템플릿 매칭에 실패했습니다.')
    } finally {
      setTemplateMatching(false)
    }
  }, [brief, briefDesc, platform, router, templateMatching])

  const handleSubmit = useCallback(() => {
    if (!brief.trim()) return
    if (genMode === 'compose') { void handleComposeSubmit(); return }
    if (designMdContent) {
      sessionStorage.setItem('designMd', designMdContent)
    } else {
      sessionStorage.removeItem('designMd')
    }
    if (asIsAnalysis) {
      sessionStorage.setItem('asIsAnalysis', JSON.stringify(asIsAnalysis))
    } else {
      sessionStorage.removeItem('asIsAnalysis')
    }
    if (refPageImage) {
      sessionStorage.setItem('referenceImage', refPageImage)
      sessionStorage.setItem('referenceImageKind', refImageKind)
    } else {
      sessionStorage.removeItem('referenceImage')
      sessionStorage.removeItem('referenceImageKind')
    }
    if (brandLogo) {
      sessionStorage.setItem('brandLogo', brandLogo)
    } else {
      sessionStorage.removeItem('brandLogo')
    }
    if (brandColors.length > 0) {
      sessionStorage.setItem('brandColors', JSON.stringify(brandColors))
    } else {
      sessionStorage.removeItem('brandColors')
    }
    if (prdDoc) {
      sessionStorage.setItem('prdDoc', prdDoc)
    } else {
      sessionStorage.removeItem('prdDoc')
    }
    if (iaImage) {
      sessionStorage.setItem('iaImage', iaImage)
    } else {
      sessionStorage.removeItem('iaImage')
    }
    if (iaText) {
      sessionStorage.setItem('iaText', iaText)
    } else {
      sessionStorage.removeItem('iaText')
    }
    sessionStorage.removeItem('aide_model')
    writeStudioNewHandoff({
      brief: brief.trim(),
      preset: designPreset !== 'none' ? designPreset : undefined,
      platform,
    })
    router.push('/studio/new')
  }, [brief, genMode, handleComposeSubmit, platform, designPreset, designMdContent, asIsAnalysis, refPageImage, refImageKind, brandLogo, brandColors, prdDoc, iaImage, iaText, router])

  const canSubmit = brief.trim().length > 0
  const designButtonLabel = designMdFileName ?? null

  return (
    <div style={{
      backgroundColor: F.canvas,
      fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    }}>
      <style>{`
        ::placeholder { color: var(--aui-scrim); }
        textarea:focus { outline: none; }
        .hero-brief-card ::placeholder { color: var(--aui-scrim); }
        .tpl-scroll { scrollbar-width: none; }
        .tpl-scroll::-webkit-scrollbar { display: none; }
        @keyframes marquee-left { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes marquee-right { from { transform: translateX(-50%) } to { transform: translateX(0) } }
        .marquee-left { animation: marquee-left 32s linear infinite; display: flex; width: max-content; }
        .marquee-right { animation: marquee-right 28s linear infinite; display: flex; width: max-content; }
        .brief-details-grid { display: grid; grid-template-columns: minmax(0, .72fr) minmax(0, 1.28fr); gap: 12px; padding-top: 10px; }
        .landing-hero-shell { padding: var(--aui-space-4); box-sizing: border-box; }
        .landing-hero-card { min-height: calc(100vh - (var(--aui-space-4) * 2)); border-radius: 16px; }
        @media (max-width: 720px) {
          .brief-details-grid { grid-template-columns: 1fr; }
          .landing-hero-shell { padding: var(--aui-space-3); }
          .landing-hero-card { min-height: calc(100vh - (var(--aui-space-3) * 2)); border-radius: 12px; }
        }
        .history-card:hover .history-card-overlay { opacity: 1 !important; }
        @keyframes scroll-cue {
          0%, 100% { transform: translateY(0); opacity: 0.45; }
          50% { transform: translateY(7px); opacity: 1; }
        }
        .scroll-cue-dot { animation: scroll-cue 1.45s ease-in-out infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── URL → design.md 생성 모달 ── */}
      {genMdModalOpen && (
        <div
          onClick={closeGenMdModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'var(--aui-scrim-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: "var(--aui-space-6)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '640px',
              backgroundColor: 'var(--aui-on-dark)', borderRadius: "var(--aui-radius-overlay)",
              boxShadow: "var(--aui-shadow-modal)",
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 48px)',
            }}
          >
            {/* 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: `var(--aui-space-5) var(--aui-space-6)`, borderBottom: `1px solid ${F.hairlineSoft}`, flexShrink: 0,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", marginBottom: '2px' }}>
                  <FileText size={16} color={F.primary} />
                  <span style={{ fontWeight: "var(--aui-weight-bold)", fontSize: "var(--aui-type-body-size)", color: F.ink, letterSpacing: "var(--aui-tracking-tighter)" }}>
                    design.md 자동 생성
                  </span>
                </div>
                <p style={{ color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", margin: 0, letterSpacing: "var(--aui-tracking-tight)" }}>
                  서비스 URL 또는 화면 캡처로 AI가 디자인 시스템 파일을 만들어드려요
                </p>
              </div>
              <button
                onClick={closeGenMdModal}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                  backgroundColor: F.surface2, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <X size={14} color={F.inkMuted} />
              </button>
            </div>

            {/* 본문 */}
            <div style={{ padding: `var(--aui-space-5) var(--aui-space-6)`, overflowY: 'auto', flex: 1 }}>
              {!genMdResult ? (
                <>
                  {/* URL 입력 */}
                  <div style={{ display: 'flex', gap: "var(--aui-space-2)", marginBottom: genMdError ? '8px' : '0' }}>
                    <input
                      type="text"
                      value={genMdUrl}
                      onChange={e => { setGenMdUrl(e.target.value); setGenMdError(null) }}
                      onKeyDown={e => e.key === 'Enter' && handleGenMdAnalyze()}
                      placeholder="서비스 URL 입력 (예: ktds.com, toss.im)"
                      autoFocus
                      style={{
                        flex: 1, padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)",
                        border: genMdError ? '1.5px solid color-mix(in srgb, var(--aui-negative) 50%, transparent)' : `1.5px solid ${F.hairline}`,
                        backgroundColor: F.surface1, color: F.ink,
                        fontSize: "var(--aui-type-label-size)", fontFamily: 'inherit', outline: 'none',
                        letterSpacing: "var(--aui-tracking-tight)",
                      }}
                    />
                    <button
                      onClick={handleGenMdAnalyze}
                      disabled={!genMdUrl.trim() || genMdAnalyzing}
                      style={{
                        padding: `var(--aui-space-3) var(--aui-space-5)`, borderRadius: "var(--aui-radius-control)", flexShrink: 0,
                        border: 'none',
                        cursor: genMdUrl.trim() && !genMdAnalyzing ? 'pointer' : 'default',
                        backgroundColor: genMdUrl.trim() && !genMdAnalyzing ? F.ink : F.surface2,
                        color: genMdUrl.trim() && !genMdAnalyzing ? 'var(--aui-on-dark)' : 'var(--aui-scrim-soft)',
                        fontSize: "var(--aui-type-label-size)", fontWeight: "var(--aui-weight-semibold)", letterSpacing: "var(--aui-tracking-tight)",
                        transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {genMdAnalyzing ? '분석 중…' : '생성하기'}
                    </button>
                  </div>

                  {genMdError && (
                    <p style={{ color: 'var(--aui-negative)', fontSize: "var(--aui-type-caption-size)", margin: `var(--aui-space-2) 0 0`, letterSpacing: "var(--aui-tracking-tight)" }}>
                      {genMdError}
                    </p>
                  )}

                  {/* URL이 없는 서비스(네이티브 앱·사내 시스템)는 캡처로만 만들 수 있다. */}
                  {!genMdAnalyzing && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", margin: `var(--aui-space-4) 0` }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                        <span style={{ color: F.inkMuted, fontSize: "var(--aui-type-micro-size)", letterSpacing: "var(--aui-tracking-tight)" }}>또는 화면 캡처로</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                      </div>

                      <input
                        ref={genMdShotInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={handleGenMdShotUpload}
                        style={{ display: 'none' }}
                      />

                      {genMdShots.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: "var(--aui-space-2)", marginBottom: "var(--aui-space-3)" }}>
                          {genMdShots.map((shot, index) => (
                            <div key={`${shot.name}-${index}`} style={{ position: 'relative', width: 52, height: 90, borderRadius: "var(--aui-radius-sm)", overflow: 'hidden', border: `1px solid ${F.hairline}`, backgroundColor: F.surface2 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`data:${shot.mimeType};base64,${shot.data}`} alt={shot.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button
                                onClick={() => setGenMdShots(prev => prev.filter((_, i) => i !== index))}
                                aria-label={`${shot.name} 제거`}
                                style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: 'var(--aui-scrim-strong)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: "var(--aui-space-2)" }}>
                        <button
                          onClick={() => genMdShotInputRef.current?.click()}
                          style={{
                            flex: 1, padding: "var(--aui-space-4)", borderRadius: "var(--aui-radius-control)",
                            border: `1px dashed ${F.hairline}`, backgroundColor: F.surface1,
                            color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: "var(--aui-space-2)",
                            letterSpacing: "var(--aui-tracking-tight)",
                          }}
                        >
                          <Upload size={13} />
                          {genMdShots.length ? `캡처 추가 (${genMdShots.length}/10)` : '앱·화면 캡처 업로드'}
                        </button>
                        {genMdShots.length > 0 && (
                          <button
                            onClick={handleGenMdShotAnalyze}
                            style={{
                              padding: `var(--aui-space-3) var(--aui-space-5)`, borderRadius: "var(--aui-radius-control)", flexShrink: 0,
                              border: 'none', cursor: 'pointer', backgroundColor: F.ink, color: 'var(--aui-on-dark)',
                              fontSize: "var(--aui-type-label-size)", fontWeight: "var(--aui-weight-semibold)",
                              letterSpacing: "var(--aui-tracking-tight)", whiteSpace: 'nowrap',
                            }}
                          >
                            캡처로 생성
                          </button>
                        )}
                      </div>

                      {genMdShots.length > 0 && (
                        <p style={{ color: F.inkMuted, fontSize: "var(--aui-type-caption-size)", margin: `var(--aui-space-3) 0 0`, lineHeight: "var(--aui-leading-relaxed)", letterSpacing: "var(--aui-tracking-tight)" }}>
                          캡처에는 기본 상태만 담겨 있어 hover·pressed 같은 상태값과 정확한 폰트 이름은 추정되지 않습니다.
                          같은 화면이 여러 장일수록 토큰이 정확해집니다. 생성 후 값을 확인해 주세요.
                        </p>
                      )}
                    </>
                  )}

                  {/* 로딩 상태 */}
                  {genMdAnalyzing && (
                    <div style={{
                      marginTop: '24px', padding: "var(--aui-space-8)", borderRadius: "var(--aui-radius-card)",
                      backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-4)",
                    }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        border: `3px solid ${F.hairlineSoft}`,
                        borderTopColor: F.primary,
                        animation: 'spin 0.9s linear infinite',
                      }} />
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: F.ink, fontSize: "var(--aui-type-label-size)", fontWeight: "var(--aui-weight-semibold)", margin: `0 0 var(--aui-space-1)`, letterSpacing: "var(--aui-tracking-tight)" }}>
                          {genMdShots.length ? '캡처 화면을 분석하고 있어요' : '웹사이트를 분석하고 있어요'}
                        </p>
                        <p style={{ color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", margin: 0, letterSpacing: "var(--aui-tracking-tight)" }}>
                          {genMdShots.length ? '배율을 환산하고 색상·타이포그래피를 읽는 중입니다' : '색상, 타이포그래피, 레이아웃을 읽는 중입니다'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 안내 */}
                  {!genMdAnalyzing && !genMdError && (
                    <div style={{
                      marginTop: '16px', padding: "var(--aui-space-4)", borderRadius: "var(--aui-radius-control)",
                      backgroundColor: `${F.primary}08`, border: `1px solid ${F.primary}15`,
                    }}>
                      <p style={{ color: F.inkMuted, fontSize: "var(--aui-type-caption-size)", margin: 0, lineHeight: "var(--aui-leading-relaxed)", letterSpacing: "var(--aui-tracking-tight)" }}>
                        URL을 넣으면 사이트를 스크린샷하고 CSS까지 읽어 정확한 토큰을 뽑습니다.<br />
                        URL이 없는 앱·사내 시스템은 화면 캡처로 만들 수 있고, 이 경우 값은 추정치입니다.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 보안 차단 경고 배너 */}
                  {genMdCaptureStatus === 'blocked' && (
                    <div style={{
                      marginBottom: '12px', padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)",
                      backgroundColor: 'var(--aui-caution-soft)', border: '1px solid var(--aui-caution-border)',
                      display: 'flex', gap: "var(--aui-space-3)", alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: "var(--aui-icon-sm)", lineHeight: "var(--aui-leading-none)", flexShrink: 0 }}>⚠️</span>
                      <div>
                        <p style={{ margin: `0 0 var(--aui-space-1) 0`, fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-caution-text)', letterSpacing: "var(--aui-tracking-tight)" }}>
                          보안으로 인해 사이트 직접 확인 불가
                        </p>
                        <p style={{ margin: 0, fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-caution-text)', lineHeight: "var(--aui-leading-relaxed)", letterSpacing: "var(--aui-tracking-tight)" }}>
                          Cloudflare 또는 봇 차단으로 실제 디자인을 캡처하지 못했습니다.
                          로고에서 추출된 브랜드 컬러와 범용 디자인시스템을 기반으로 생성했습니다.
                        </p>
                      </div>
                    </div>
                  )}
                  {genMdCaptureStatus === 'partial' && (
                    <div style={{
                      marginBottom: '12px', padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)",
                      backgroundColor: 'var(--aui-primary-soft)', border: '1px solid var(--aui-primary-muted)',
                      display: 'flex', gap: "var(--aui-space-2)", alignItems: 'center',
                    }}>
                      <span style={{ fontSize: "var(--aui-type-label-size)", flexShrink: 0 }}>ℹ️</span>
                      <p style={{ margin: 0, fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-primary-strong)', lineHeight: "var(--aui-leading-normal)", letterSpacing: "var(--aui-tracking-tight)" }}>
                        CSS 소스 추출이 제한되어 스크린샷 기반으로 분석했습니다.
                      </p>
                    </div>
                  )}

                  <DesignMdPreview
                    md={genMdResult}
                    url={genMdUrl}
                    screenshot={genMdScreenshot ?? undefined}
                    onApply={handleGenMdUseInStudio}
                    onBack={() => { setGenMdResult(null); setGenMdScreenshot(null); setGenMdCaptureStatus(null) }}
                    variant="light"
                  />
                </>
              )}
            </div>

            {/* 푸터 액션 */}
            {genMdResult && (
              <div style={{
                padding: `var(--aui-space-4) var(--aui-space-6)`, borderTop: `1px solid ${F.hairlineSoft}`,
                display: 'flex', gap: "var(--aui-space-2)", flexShrink: 0, justifyContent: 'flex-end',
              }}>
                <button
                  onClick={handleGenMdDownload}
                  style={{
                    padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)",
                    border: `1px solid ${F.hairline}`, backgroundColor: 'var(--aui-on-dark)',
                    color: F.ink, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer',
                    letterSpacing: "var(--aui-tracking-tight)", display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)",
                  }}
                >
                  <Download size={13} />
                  .md 저장
                </button>
                <button
                  onClick={handleGenMdCopy}
                  style={{
                    padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)",
                    border: `1px solid ${F.hairline}`, backgroundColor: 'var(--aui-on-dark)',
                    color: genMdCopied ? 'var(--aui-positive)' : F.ink, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer',
                    letterSpacing: "var(--aui-tracking-tight)", display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)",
                    transition: 'color 0.15s',
                  }}
                >
                  {genMdCopied ? <Check size={13} /> : <Share2 size={13} />}
                  {genMdCopied ? '복사됨' : '복사'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 레퍼런스 이미지 전체보기 모달 ── */}
      {refPreviewOpen && refPageImage && (
        <div
          onClick={() => setRefPreviewOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'var(--aui-inverse-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: "var(--aui-space-6)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '960px',
              backgroundColor: F.surface1, borderRadius: "var(--aui-radius-card)",
              border: `1px solid ${F.hairline}`,
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 48px)',
            }}
          >
            {/* 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: `var(--aui-space-3) var(--aui-space-4)`, borderBottom: `1px solid ${F.hairlineSoft}`, flexShrink: 0,
            }}>
              <span style={{ color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", letterSpacing: "var(--aui-tracking-tight)" }}>
                현재 페이지 레퍼런스
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
                <button
                  onClick={() => { setRefPreviewOpen(false); setRefPanelOpen(true); setDesignPanelOpen(false) }}
                  style={{
                    padding: `var(--aui-space-2) var(--aui-space-3)`, borderRadius: "var(--aui-radius-sm)", border: `1px solid ${F.hairline}`,
                    backgroundColor: F.canvas, color: F.ink,
                    fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer', letterSpacing: "var(--aui-tracking-tight)",
                    fontFamily: 'inherit',
                  }}
                >
                  변경하기
                </button>
                <button
                  onClick={() => { clearRefPage(); setRefPreviewOpen(false) }}
                  style={{
                    padding: `var(--aui-space-2) var(--aui-space-3)`, borderRadius: "var(--aui-radius-sm)", border: '1px solid var(--aui-negative-border)',
                    backgroundColor: 'var(--aui-negative-soft)', color: 'var(--aui-negative)',
                    fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer', letterSpacing: "var(--aui-tracking-tight)",
                    fontFamily: 'inherit',
                  }}
                >
                  제거
                </button>
                <button
                  onClick={() => setRefPreviewOpen(false)}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                    backgroundColor: F.surface2, color: F.inkMuted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {/* 이미지 */}
            <div style={{ overflow: 'auto', flexShrink: 1 }}>
              <img
                src={`data:image/png;base64,${refPageImage}`}
                alt="reference page"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="landing-hero-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: F.canvas }}>
        <div className="landing-hero-card" style={{ display: 'flex', flex: 1, flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* The moving field is a self-contained WebGL card (mesh gradient +
              slow domain warp + grain, matched to arcade.software's hero),
              leaving the surrounding landing page on the canonical white canvas. */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {genMode === 'compose'
              ? <Grainient
                  key="compose"
                  color1="#c9e2ff" color2="#2eaf84" color3="#c3fffa"
                  timeSpeed={0.35} colorBalance={0.25}
                  warpStrength={3.35} warpFrequency={6} warpSpeed={0.4} warpAmplitude={29}
                  blendAngle={0} blendSoftness={0.05} rotationAmount={500}
                  noiseScale={2} grainAmount={0.1} grainScale={2} grainAnimated={false}
                  contrast={1.5} gamma={1} saturation={1}
                  centerX={0} centerY={0} zoom={0.9}
                />
              : <Grainient
                  key="ai"
                  color1="#c9e2ff" color2="#2a65ff" color3="#c3fffa"
                  timeSpeed={0.35} colorBalance={0.25}
                  warpStrength={3.35} warpFrequency={6} warpSpeed={0.4} warpAmplitude={29}
                  blendAngle={0} blendSoftness={0.05} rotationAmount={500}
                  noiseScale={2} grainAmount={0.1} grainScale={2} grainAnimated={false}
                  contrast={1.5} gamma={1} saturation={1}
                  centerX={0} centerY={0} zoom={0.9}
                />}
          </div>

        {LANDING_GNB_ENABLED && <header
          style={{
            position: 'fixed',
            top: navScrolled ? '32px' : '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            width: navScrolled ? 'auto' : 'calc(100% - 32px)',
            maxWidth: navScrolled ? 'calc(100% - 64px)' : '1400px',
            transition: 'top .32s cubic-bezier(.4,0,.2,1), max-width .32s cubic-bezier(.4,0,.2,1)',
          }}
        >
          <div style={{
            backgroundColor: navScrolled ? 'var(--aui-glass-surface-strong)' : 'transparent',
            backdropFilter: navScrolled ? 'blur(24px) saturate(1.5)' : 'none',
            WebkitBackdropFilter: navScrolled ? 'blur(24px) saturate(1.5)' : 'none',
            border: navScrolled ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
            borderRadius: 'var(--aui-radius-pill)',
            padding: navScrolled ? '10px 14px 10px 16px' : '24px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: navScrolled ? '64px' : "var(--aui-space-6)",
            boxShadow: navScrolled ? "0 8px 32px rgba(8, 30, 90, 0.2)" : 'none',
            transition: 'background-color .32s ease, padding .32s ease, box-shadow .32s ease, border-color .32s ease, gap .32s ease',
          }}>
            {/* 좌측: 로고 */}
            <div style={{ display: 'flex', flexShrink: 0 }}>
              <Button
                type="button"
                aria-label="Aide 홈으로 이동"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                variant="ghost"
                className="h-auto p-0 hover:bg-transparent"
              >
                <img src="/logo_aide_wh.png" alt="Aide" style={{ height: 42, width: 'auto', display: 'block', objectFit: 'contain', filter: 'invert(1)' }} />
              </Button>
            </div>

            {/* 우측: 액션 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", flexShrink: 0 }}>
              {!navScrolled && (
                <>
                  <Button onClick={() => { setUsageLoading(true); setUsageModalOpen(true) }} variant="ghost" size="icon" aria-label="Price" title="Price" className="rounded-[var(--aui-radius-pill)] text-[var(--aui-text-strong)] hover:bg-[var(--aui-glass-surface-strong)] hover:text-[var(--aui-text-strong)]">
                    <Coins size={18} />
                  </Button>
                  <Button onClick={() => router.push('/projects')} variant="ghost" size="icon" aria-label="Projects" title="Projects" className="rounded-[var(--aui-radius-pill)] text-[var(--aui-text-strong)] hover:bg-[var(--aui-glass-surface-strong)] hover:text-[var(--aui-text-strong)]">
                    <Clock size={18} />
                  </Button>
                  <Button onClick={openApiKeyModal} variant="ghost" size="icon" aria-label="API" title="API" className="rounded-[var(--aui-radius-pill)] text-[var(--aui-text-strong)] hover:bg-[var(--aui-glass-surface-strong)] hover:text-[var(--aui-text-strong)]">
                    <KeyRound size={18} />
                  </Button>
                </>
              )}

              <Link href="/aide-ui" className={buttonVariants({ variant: 'ghost', className: 'group/ds relative rounded-[var(--aui-radius-pill)] px-3.5 text-[var(--aui-text-strong)] hover:bg-[var(--aui-glass-surface-strong)] hover:text-[var(--aui-text-strong)]' })}>
                <span className="inline-block transition-transform duration-200 group-hover/ds:-translate-x-1.5">Design System</span>
                <ArrowRight
                  size={16}
                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-x-1 -translate-y-1/2 opacity-0 transition-[opacity,transform] duration-200 group-hover/ds:translate-x-0 group-hover/ds:opacity-100"
                />
              </Link>

              <Button
                onClick={() => router.push('/playground')}
                variant="ghost"
                className="group/pg relative rounded-[var(--aui-radius-pill)] px-3.5 text-[var(--aui-text-strong)] hover:bg-[var(--aui-glass-surface-strong)] hover:text-[var(--aui-text-strong)]"
              >
                <span className="inline-block transition-transform duration-200 group-hover/pg:-translate-x-1.5">Playground</span>
                <ArrowRight
                  size={16}
                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-x-1 -translate-y-1/2 opacity-0 transition-[opacity,transform] duration-200 group-hover/pg:translate-x-0 group-hover/pg:opacity-100"
                />
              </Button>

              <Button
                onClick={async () => {
                  const items = await loadHistory()
                  if (items.length > 0) router.push(`/studio/${encodeURIComponent(items[0].id)}`)
                }}
                className="group/st relative rounded-[var(--aui-radius-pill)] px-3.5 bg-[var(--aui-glass-surface-strong)] text-[var(--aui-text-strong)] shadow-[var(--aui-shadow-raised)] hover:bg-white/90"
              >
                <span className="inline-block transition-transform duration-200 group-hover/st:-translate-x-1.5">Studio</span>
                <ArrowRight
                  size={16}
                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-x-1 -translate-y-1/2 opacity-0 transition-[opacity,transform] duration-200 group-hover/st:translate-x-0 group-hover/st:opacity-100"
                />
              </Button>

              {navScrolled && (
                <Menu>
                  <MenuTrigger
                    aria-label="메뉴"
                    title="메뉴"
                    className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'rounded-[var(--aui-radius-pill)] text-[var(--aui-text-strong)] hover:bg-[var(--aui-glass-surface-strong)] hover:text-[var(--aui-text-strong)]' })}
                  >
                    <MenuIcon size={20} />
                  </MenuTrigger>
                  <MenuContent className="min-w-[184px] bg-white p-1.5">
                    <MenuItem onClick={() => { setUsageLoading(true); setUsageModalOpen(true) }}>
                      <Coins size={16} /> Price
                    </MenuItem>
                    <MenuItem onClick={() => router.push('/projects')}>
                      <Clock size={16} /> 프로젝트
                    </MenuItem>
                    <MenuItem onClick={openApiKeyModal}>
                      <KeyRound size={16} /> API
                    </MenuItem>
                  </MenuContent>
                </Menu>
              )}
            </div>
          </div>
        </header>}


        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24" style={{ paddingBottom: '100px' }}>
          <h1 style={{
            fontSize: '60px', fontWeight: "var(--aui-type-display-hero-weight)", color: F.ink,
            textAlign: 'center', lineHeight: "var(--aui-type-display-hero-leading)", letterSpacing: "var(--aui-type-display-hero-tracking)",
            fontFamily: 'inherit',
            marginBottom: '24px', maxWidth: 'var(--aui-hero-title-max)',
            textShadow: 'none',
            textWrap: 'balance',
          } as React.CSSProperties}>
            Start with Aide.<br />Iterate into a design.
          </h1>
          <p style={{
            fontSize: '16px', color: F.ink,
            textAlign: 'center', lineHeight: "var(--aui-leading-relaxed)", maxWidth: 'var(--aui-hero-copy-max)',
            marginBottom: '52px',
          }}>
            Aide turns your brief and design system into UI prototypes — generate, compare, and refine through conversation.
          </p>


          {/* 생성 방식 토글 — AI가 HTML을 짜는 기존 경로 vs 브리프에 맞는 Astryx 템플릿 1개 열기 */}
          <div
            role="radiogroup"
            aria-label="생성 방식"
            style={{
              display: 'inline-flex', alignSelf: 'center', alignItems: 'center', gap: '2px', padding: '4px',
              marginBottom: '18px', borderRadius: 'var(--aui-radius-pill)',
              backgroundColor: 'rgba(0,0,0,0.16)',
              backdropFilter: 'blur(var(--aui-blur-glass-strong))',
              WebkitBackdropFilter: 'blur(var(--aui-blur-glass-strong))',
              border: 'none',
            }}
          >
            {([
              ['ai', 'AI 생성'],
              ['compose', '템플릿'],
            ] as const).map(([value, label]) => {
              const active = genMode === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => { setGenMode(value); setTemplateMatchError(null) }}
                  style={{
                    flexShrink: 0, whiteSpace: 'nowrap',
                    padding: '7px 20px', borderRadius: 'var(--aui-radius-pill)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    fontSize: 'var(--aui-type-compact-size)', fontWeight: 'var(--aui-weight-semibold)',
                    letterSpacing: 'var(--aui-tracking-tight)',
                    backgroundColor: active ? '#ffffff' : 'transparent',
                    color: active ? F.ink : '#ffffff',
                    boxShadow: active ? 'var(--aui-shadow-sm)' : 'none',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Input card */}
          <div className="hero-brief-card" style={{
            width: '100%', maxWidth: 'var(--aui-content-narrow)', borderRadius: '24px',
            background: 'linear-gradient(rgba(255,255,255,0.86), rgba(255,255,255,0.86)) padding-box, linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.85)) border-box',
            backdropFilter: 'blur(var(--aui-blur-glass-strong))',
            WebkitBackdropFilter: 'blur(var(--aui-blur-glass-strong))',
            border: '1px solid transparent',
            padding: `var(--aui-space-6) var(--aui-space-6) var(--aui-space-4)`,
            boxShadow: 'var(--aui-shadow-floating)',
          }}>
            {genMode === 'ai' && (designPreset !== 'none' || designButtonLabel) && (() => {
              const isUrl = !!designButtonLabel && (designButtonLabel.startsWith('http://') || designButtonLabel.startsWith('https://'))
              const chipLabel = designButtonLabel
                ? (isUrl ? (() => { try { return new URL(designButtonLabel).hostname.replace(/^www\./, '') } catch { return designButtonLabel } })() : designButtonLabel)
                : `${designPreset}.md`
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", marginBottom: '10px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)",
                    padding: `var(--aui-space-1) var(--aui-space-3) var(--aui-space-1) var(--aui-space-2)`, borderRadius: "var(--aui-radius-pill)",
                    border: `1px solid ${F.hairlineSoft}`, backgroundColor: 'var(--aui-on-dark)',
                    color: 'var(--aui-scrim-strong)', fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-medium)",
                  }}>
                    <FileText size={11} />
                    <span>{chipLabel}</span>
                    <button
                      onClick={designButtonLabel ? clearDesign : () => setDesignPreset('none')}
                      style={{ display: 'flex', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--aui-scrim)', padding: 0, marginLeft: '2px' }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                  <span style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-scrim)' }}>이 design.md 파일의 디자인 시스템 사용</span>
                </div>
              )
            })()}
            <div style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-3)" }}>
              <div>
                <textarea
                  aria-label="어떤 화면이 필요한가요?"
                  value={briefDesc}
                  onChange={e => setBriefDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && briefDesc.trim()) { e.preventDefault(); handleSubmit() } }}
                  placeholder="예) SaaS 고객사에 제안할 VOC 통합관리 어드민. 문의 접수 현황, 상태별 티켓, SLA 지연 알림과 담당자 배정을 한눈에 보여줘."
                  rows={4}
                  style={{
                    width: '100%', background: 'none', border: 'none', outline: 'none',
                    color: 'var(--aui-scrim-strong)', fontSize: "var(--aui-type-label-size)", lineHeight: "var(--aui-leading-normal)",
                    letterSpacing: "var(--aui-tracking-tight)", resize: 'none', fontFamily: 'inherit',
                    caretColor: F.primary,
                  }}
                />
              </div>
              <div style={{ borderTop: '1px solid var(--aui-shadow-line)', paddingTop: '10px' }}>
                <button type="button" aria-expanded={briefDetailsOpen} onClick={() => setBriefDetailsOpen(value => !value)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', border: 0, background: 'transparent', color: F.inkMuted, fontSize: 'var(--aui-type-caption-size)', fontWeight: 'var(--aui-weight-semibold)', cursor: 'pointer' }}>
                  <ChevronDown size={14} style={{ transform: briefDetailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }} />
                  상세 입력 <span style={{ color: F.inkSubtle, fontWeight: 'var(--aui-weight-regular)' }}>선택사항</span>
                </button>
                {briefDetailsOpen && (
                  <div className="brief-details-grid">
                    <label style={{ display: 'grid', gap: '5px', color: F.inkMuted, fontSize: 'var(--aui-type-caption-size)', fontWeight: 'var(--aui-weight-semibold)' }}>
                      주요 사용자
                      <input value={briefAudience} onChange={event => setBriefAudience(event.target.value)} placeholder="예) CS 운영 담당자와 서비스 기획자" style={{ width: '100%', minHeight: '40px', padding: '0 12px', border: `1px solid ${F.hairlineSoft}`, borderRadius: 'var(--aui-radius-control)', background: F.surface, color: F.ink, font: 'inherit', outline: 'none' }} />
                    </label>
                    <label style={{ display: 'grid', gap: '5px', color: F.inkMuted, fontSize: 'var(--aui-type-caption-size)', fontWeight: 'var(--aui-weight-semibold)' }}>
                      핵심 기능 또는 필수 정보
                      <input value={briefFeatures} onChange={event => setBriefFeatures(event.target.value)} placeholder="예) 티켓 목록, 처리 상태, SLA 알림, 주간 리포트" style={{ width: '100%', minHeight: '40px', padding: '0 12px', border: `1px solid ${F.hairlineSoft}`, borderRadius: 'var(--aui-radius-control)', background: F.surface, color: F.ink, font: 'inherit', outline: 'none' }} />
                    </label>
                    <label style={{ gridColumn: '1 / -1', display: 'grid', gap: '5px', color: F.inkMuted, fontSize: 'var(--aui-type-caption-size)', fontWeight: 'var(--aui-weight-semibold)' }}>
                      강조하거나 피하고 싶은 구성
                      <input value={briefConstraints} onChange={event => setBriefConstraints(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && briefDesc.trim()) { event.preventDefault(); handleSubmit() } }} placeholder="예) 대량 목록을 빠르게 훑도록, 불필요한 그래프 남발은 피하기" style={{ width: '100%', minHeight: '40px', padding: '0 12px', border: `1px solid ${F.hairlineSoft}`, borderRadius: 'var(--aui-radius-control)', background: F.surface, color: F.ink, font: 'inherit', outline: 'none' }} />
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '14px',
              gap: "var(--aui-space-2)",
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                {/* + source button — 조합 모드는 디자인 시스템이 Astryx로 고정이라 소스/DESIGN.md가 없다 */}
                <button
                  onClick={() => { setRefPanelOpen(v => !v); setDesignPanelOpen(false); setBrandPanelOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '38px', height: '38px', borderRadius: '50%',
                    border: 'none',
                    backgroundColor: refPanelOpen ? F.ink : 'var(--aui-border-subtle)',
                    color: refPanelOpen ? F.canvas : 'var(--aui-scrim-strong)',
                    cursor: genMode === 'ai' ? 'pointer' : 'default',
                    transition: 'all 0.15s', flexShrink: 0,
                    visibility: genMode === 'ai' ? 'visible' : 'hidden',
                    pointerEvents: genMode === 'ai' ? 'auto' : 'none',
                  }}
                  title="리디자인 소스 추가"
                  tabIndex={genMode === 'ai' ? 0 : -1}
                  aria-hidden={genMode !== 'ai'}
                >
                  <span style={{ fontSize: "var(--aui-icon-md)", lineHeight: "var(--aui-leading-none)", marginTop: '-1px' }}>+</span>
                </button>
                {/* App / Web 토글 — 이 선택이 설문의 "메인 구조" 보기를 결정한다 */}
                <div role="radiogroup" aria-label="플랫폼" style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '3px', borderRadius: 'var(--aui-radius-pill)', backgroundColor: 'var(--aui-border-subtle)', flexShrink: 0 }}>
                  {([['mobile', '앱', Smartphone], ['web', '웹', Monitor]] as const).map(([value, label, Icon]) => {
                    const active = platform === value
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setPlatform(value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '0 var(--aui-space-3)', height: '32px', borderRadius: 'var(--aui-radius-pill)',
                          border: 'none', cursor: 'pointer', letterSpacing: 'var(--aui-tracking-tight)',
                          fontSize: 'var(--aui-type-compact-size)', fontWeight: 'var(--aui-weight-semibold)',
                          backgroundColor: active ? 'var(--aui-on-dark)' : 'transparent',
                          color: active ? 'var(--aui-scrim-strong)' : 'var(--aui-scrim)',
                          boxShadow: active ? 'var(--aui-shadow-sm)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Icon size={13} /> {label}
                      </button>
                    )
                  })}
                </div>

                {/* 소스 칩 + DESIGN.md — 조합 모드에선 디자인 시스템이 Astryx 고정이라 노출하지 않는다 */}
                <div style={{ display: 'contents', visibility: genMode === 'ai' ? 'visible' : 'hidden' }} aria-hidden={genMode !== 'ai'}>
                {asIsAnalysis ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)" }}>
                    <button
                      onClick={() => { setRefPanelOpen(true); setSourceTab('asis'); setDesignPanelOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)",
                        padding: `0 var(--aui-space-3)`, height: '38px', borderRadius: "var(--aui-radius-pill)",
                        border: 'none', backgroundColor: 'var(--aui-border-subtle)',
                        color: 'var(--aui-scrim-strong)', fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)",
                        cursor: 'pointer', letterSpacing: "var(--aui-tracking-tight)",
                      }}
                    >
                      <Link2 size={12} />
                      As-is
                      <span style={{ color: 'var(--aui-text-muted)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(() => { try { return new URL(asIsAnalysis.sourceUrl).hostname.replace(/^www\./, '') } catch { return asIsAnalysis.pageTitle || '분석됨' } })()}
                      </span>
                    </button>
                    <button
                      onClick={clearAsIs}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--aui-text-muted)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null}

                {refPageImage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)" }}>
                    <button
                      onClick={() => setRefPreviewOpen(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)",
                        padding: `var(--aui-space-1) var(--aui-space-3) var(--aui-space-1) var(--aui-space-2)`, borderRadius: "var(--aui-radius-pill)",
                        border: '1px solid var(--aui-shadow-medium)', backgroundColor: 'var(--aui-on-dark)',
                        color: 'var(--aui-scrim-strong)', fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)",
                        cursor: 'pointer', letterSpacing: "var(--aui-tracking-tight)",
                      }}
                    >
                      <img
                        src={`data:image/png;base64,${refPageImage}`}
                        alt="ref"
                        style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: "var(--aui-radius-sm)", flexShrink: 0 }}
                      />
                      {refImageKind === 'wireframe' ? '와이어프레임' : '참고자료'}
                    </button>
                    <button
                      onClick={clearRefPage}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--aui-text-muted)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null}

                {(brandLogo !== null || brandColors.length > 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)" }}>
                    <button
                      onClick={() => { setRefPanelOpen(true); setSourceTab('brand'); setDesignPanelOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)",
                        padding: `0 var(--aui-space-3)`, height: '38px', borderRadius: "var(--aui-radius-pill)",
                        border: 'none', backgroundColor: 'var(--aui-border-subtle)',
                        color: 'var(--aui-scrim-strong)', fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)",
                        cursor: 'pointer', letterSpacing: "var(--aui-tracking-tight)",
                      }}
                    >
                      {brandLogo ? (
                        <img src={brandLogo} alt="logo" style={{ width: 14, height: 14, objectFit: 'contain', borderRadius: "var(--aui-radius-sm)" }} />
                      ) : (
                        <Palette size={11} />
                      )}
                      브랜드
                      {brandColors.length > 0 && (
                        <div style={{ display: 'flex', gap: "var(--aui-space-1)" }}>
                          {brandColors.slice(0, 3).map((c, i) => (
                            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c, display: 'inline-block' }} />
                          ))}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={clearBrand}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--aui-text-muted)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {(prdDoc !== null || iaImage !== null || iaText !== null) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)" }}>
                    <button
                      onClick={() => { setRefPanelOpen(true); setSourceTab('planning'); setDesignPanelOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)",
                        padding: `0 var(--aui-space-3)`, height: '38px', borderRadius: "var(--aui-radius-pill)",
                        border: 'none', backgroundColor: `${F.primary}18`,
                        color: F.primary, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)",
                        cursor: 'pointer', letterSpacing: "var(--aui-tracking-tight)",
                      }}
                    >
                      <FileText size={11} />
                      기획/화면 설계
                      {[prdDoc, iaImage, iaText].filter(Boolean).length > 1 ? ` ${[prdDoc, iaImage, iaText].filter(Boolean).length}` : ''}
                    </button>
                    <button
                      onClick={clearPlanning}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--aui-text-muted)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* DESIGN.md button */}
                <button
                  onClick={() => {
                    const isOpening = !designPanelOpen
                    if (isOpening && designMdFileName?.startsWith('http') && designMdContent) {
                      setUrlInput(designMdFileName)
                      setUrlPreviewMd(designMdContent)
                      setUrlPreviewScreenshot(appliedUrlScreenshot)
                    } else if (!isOpening) {
                      setUrlPreviewMd(null)
                      setUrlPreviewScreenshot(null)
                    }
                    setDesignPanelOpen(v => !v)
                    setBrandPanelOpen(false)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)",
                    padding: `0 var(--aui-space-3)`, height: '38px', borderRadius: "var(--aui-radius-pill)",
                    border: 'none',
                    backgroundColor: 'var(--aui-border-subtle)',
                    color: 'var(--aui-scrim-strong)', fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)",
                    cursor: 'pointer', letterSpacing: "var(--aui-tracking-tight)", transition: 'all 0.15s',
                  }}
                >
                  <FileText size={11} />
                  design.md
                </button>
                </div>

              </div>

              {/* 모델은 기능별 정책으로 자동 라우팅한다. 사용자는 생성만 실행한다. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", flexShrink: 0, position: 'relative' }}>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || templateMatching}
                  style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: canSubmit && !templateMatching ? 'pointer' : 'default', transition: 'all 0.2s',
                    backgroundColor: canSubmit ? F.ink : F.surface2,
                    color: canSubmit ? F.canvas : 'var(--aui-scrim-soft)', border: 'none',
                  }}
                >
                  {templateMatching
                    ? <LoaderCircle size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : <ArrowUp size={17} strokeWidth={2.2} />}
                </button>
              </div>
            </div>
            {genMode === 'compose' && (templateMatchError || templateMatching) && (
              <div style={{ marginTop: '10px', fontSize: 'var(--aui-type-caption-size)', color: templateMatchError ? 'var(--aui-danger, #d92d20)' : 'var(--aui-scrim)' }}>
                {templateMatchError || '브리프에 맞는 템플릿을 찾는 중…'}
              </div>
            )}
          </div>

          {designPanelOpen && (
            <div style={{
              width: '100%', maxWidth: '700px', marginTop: '8px',
              borderRadius: "var(--aui-radius-overlay)",
              background: 'linear-gradient(rgba(255,255,255,0.6), rgba(255,255,255,0.6)) padding-box, linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.8)) border-box',
              backdropFilter: 'blur(var(--aui-blur-glass-strong))', WebkitBackdropFilter: 'blur(var(--aui-blur-glass-strong))',
              border: '1px solid transparent', padding: "var(--aui-space-4)",
            }}>
              <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: "var(--aui-space-2)", marginBottom: '14px' }}>
                {(Object.keys(DESIGN_PRESETS).filter(k => k !== 'none') as DesignPreset[]).map(key => {
                  const preset = DESIGN_PRESETS[key]
                  const isActive = designPreset === key
                  return (
                    <button
                      key={key}
                      onClick={() => { setDesignPreset(isActive ? 'none' : key); if (!isActive) setDesignPanelOpen(false) }}
                      style={{
                        padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-control)", textAlign: 'left',
                        cursor: 'pointer',
                        border: isActive ? `1px solid ${preset.color}40` : `1px solid ${F.hairlineSoft}`,
                        backgroundColor: isActive ? `${preset.color}18` : F.surface2,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: preset.color, flexShrink: 0 }} />
                        <span style={{ color: isActive ? preset.color : F.ink, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)", letterSpacing: "var(--aui-tracking-tighter)" }}>
                          {preset.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", margin: `var(--aui-space-4) 0` }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                <span style={{ color: F.inkMuted, fontSize: "var(--aui-type-micro-size)", letterSpacing: "var(--aui-tracking-tight)" }}>또는 직접 입력</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', padding: "var(--aui-space-4)", borderRadius: "var(--aui-radius-control)",
                  border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                  color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: "var(--aui-space-2)",
                  marginBottom: '10px', letterSpacing: "var(--aui-tracking-tight)",
                }}
              >
                <Upload size={13} />
                DESIGN.md 파일 업로드
              </button>

              {urlPreviewMd ? (
                <DesignMdPreview
                  md={urlPreviewMd}
                  url={urlInput}
                  screenshot={urlPreviewScreenshot ?? undefined}
                  onApply={handleApplyUrlDesign}
                  onBack={() => { setUrlPreviewMd(null); setUrlPreviewScreenshot(null) }}
                />
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: "var(--aui-space-2)" }}>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={e => { setUrlInput(e.target.value); setUrlError(null) }}
                      onKeyDown={e => e.key === 'Enter' && handleUrlAnalyze()}
                      placeholder="타사 서비스 URL 붙여넣기 (예: airbnb.com)"
                      disabled={urlAnalyzing}
                      style={{
                        flex: 1, padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-control)",
                        border: urlError ? '1px solid color-mix(in srgb, var(--aui-negative) 50%, transparent)' : urlAnalyzing ? `1px solid ${F.primary}` : `1px solid ${F.hairline}`,
                        backgroundColor: urlAnalyzing ? 'var(--aui-primary-tint)' : F.surface2, color: F.ink,
                        fontSize: "var(--aui-type-compact-size)", fontFamily: 'inherit', outline: 'none',
                        letterSpacing: "var(--aui-tracking-tight)", transition: 'all 0.2s',
                      }}
                    />
                    <button
                      onClick={handleUrlAnalyze}
                      disabled={!urlInput.trim() || urlAnalyzing}
                      style={{
                        display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)",
                        padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)", flexShrink: 0,
                        border: 'none', cursor: urlInput.trim() && !urlAnalyzing ? 'pointer' : 'default',
                        backgroundColor: urlInput.trim() && !urlAnalyzing ? F.ink : F.surface2,
                        color: urlInput.trim() && !urlAnalyzing ? F.canvas : 'var(--aui-scrim-soft)',
                        fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", letterSpacing: "var(--aui-tracking-tight)",
                        transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {urlAnalyzing && (
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeOpacity="0.3" />
                          <path d="M21 12a9 9 0 00-9-9" />
                        </svg>
                      )}
                      {urlAnalyzing ? '분석 중…' : '분석하기'}
                    </button>
                  </div>
                  {urlAnalyzing && (
                    <p style={{ fontSize: "var(--aui-type-micro-size)", color: F.primary, marginTop: '6px', letterSpacing: "var(--aui-tracking-tight)", opacity: 0.7 }}>
                      페이지를 열고 디자인 토큰을 추출하고 있습니다 (10~30초)
                    </p>
                  )}
                  {urlError && (
                    <p style={{ color: 'var(--aui-negative)', fontSize: "var(--aui-type-caption-size)", marginTop: '6px', letterSpacing: "var(--aui-tracking-tight)" }}>
                      {urlError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {brandPanelOpen && (
            <div style={{
              width: '100%', maxWidth: '700px', marginTop: '8px',
              borderRadius: "var(--aui-radius-overlay)",
              background: 'linear-gradient(rgba(255,255,255,0.6), rgba(255,255,255,0.6)) padding-box, linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.8)) border-box',
              backdropFilter: 'blur(var(--aui-blur-glass-strong))', WebkitBackdropFilter: 'blur(var(--aui-blur-glass-strong))',
              border: '1px solid transparent', padding: "var(--aui-space-4)",
            }}>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />

              {/* Logo section */}
              <p style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: F.inkMuted, marginBottom: '8px', letterSpacing: "var(--aui-tracking-tight)" }}>로고</p>
              {brandLogo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-control)", backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, marginBottom: '14px' }}>
                  <img src={brandLogo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: "var(--aui-radius-sm)" }} />
                  <span style={{ fontSize: "var(--aui-type-caption-size)", color: F.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandLogoName}</span>
                  <button onClick={clearBrand} style={{ border: 'none', background: 'none', cursor: 'pointer', color: F.inkMuted, display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    width: '100%', padding: "var(--aui-space-4)", borderRadius: "var(--aui-radius-control)", marginBottom: '14px',
                    border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                    color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: "var(--aui-space-2)",
                    letterSpacing: "var(--aui-tracking-tight)",
                  }}
                >
                  <Upload size={13} />
                  로고 이미지 업로드
                </button>
              )}

              {/* Colors section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", marginBottom: '8px' }}>
                <p style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: F.inkMuted, letterSpacing: "var(--aui-tracking-tight)", margin: 0 }}>브랜드 컬러</p>
                {extractingColors && (
                  <span style={{ fontSize: "var(--aui-type-micro-size)", color: F.inkMuted, display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <circle cx="5" cy="5" r="4" fill="none" stroke={F.inkMuted} strokeWidth="1.5" strokeDasharray="6 4" />
                    </svg>
                    로고에서 추출 중…
                  </span>
                )}
                {brandColors.length > 0 && !extractingColors && (
                  <span style={{ fontSize: "var(--aui-type-micro-size)", color: F.primary, fontWeight: "var(--aui-weight-semibold)" }}>적용됨</span>
                )}
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              {brandLogo && (
                <div style={{ display: 'flex', gap: "var(--aui-space-2)", marginBottom: 10 }}>
                  <button
                    onClick={handleExtractBrandColors}
                    disabled={extractingColors}
                    style={{
                      height: 32, padding: `0 var(--aui-space-3)`, borderRadius: "var(--aui-radius-sm)",
                      border: `1px solid ${F.hairline}`, backgroundColor: F.surface2,
                      color: extractingColors ? F.inkMuted : F.ink, fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)",
                      cursor: extractingColors ? 'default' : 'pointer',
                    }}
                  >
                    {extractingColors ? '추출 중...' : '컬러 추출'}
                  </button>
                  <button
                    onClick={handleApplyBrandColors}
                    disabled={extractedBrandColors.length === 0}
                    style={{
                      height: 32, padding: `0 var(--aui-space-3)`, borderRadius: "var(--aui-radius-sm)", border: 'none',
                      backgroundColor: extractedBrandColors.length > 0 ? F.ink : F.hairlineSoft,
                      color: extractedBrandColors.length > 0 ? 'var(--aui-on-dark)' : F.inkMuted,
                      fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-bold)",
                      cursor: extractedBrandColors.length > 0 ? 'pointer' : 'default',
                    }}
                  >
                    적용하기
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", flexWrap: 'wrap' }}>
                {extractedBrandColors.map((color, i) => (
                  <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-1)" }}>
                    <label style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: color, cursor: 'pointer', display: 'block', border: '2px solid var(--aui-border-subtle)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                      <input
                        type="color"
                        value={color}
                        onChange={e => { const next = [...extractedBrandColors]; next[i] = e.target.value; setExtractedBrandColors(next) }}
                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                      />
                    </label>
                    <button
                      onClick={() => setExtractedBrandColors(extractedBrandColors.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >
                      <X size={8} />
                    </button>
                    <span style={{ fontSize: "var(--aui-type-meta-size)", fontFamily: 'monospace', color: F.inkMuted }}>{color.toUpperCase()}</span>
                  </div>
                ))}
                {extractedBrandColors.length < 5 && (
                  <button
                    onClick={() => setExtractedBrandColors([...extractedBrandColors, 'var(--aui-inverse-surface)'])}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1.5px dashed ${F.hairline}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: F.inkMuted, fontSize: "var(--aui-icon-md)", lineHeight: "var(--aui-leading-none)" }}
                  >
                    +
                  </button>
                )}
                {extractedBrandColors.length === 0 && !brandLogo && (
                  <span style={{ fontSize: "var(--aui-type-caption-size)", color: F.inkMuted }}>로고를 먼저 업로드해 주세요.</span>
                )}
                {extractedBrandColors.length === 0 && brandLogo && !extractingColors && (
                  <span style={{ fontSize: "var(--aui-type-caption-size)", color: F.inkMuted }}>컬러 추출을 누르면 후보 컬러가 표시됩니다.</span>
                )}
              </div>
            </div>
          )}

          {refPanelOpen && (
            <div style={{
              width: '100%', maxWidth: '700px', marginTop: '8px',
              borderRadius: "var(--aui-radius-overlay)",
              background: 'linear-gradient(rgba(255,255,255,0.6), rgba(255,255,255,0.6)) padding-box, linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.8)) border-box',
              backdropFilter: 'blur(var(--aui-blur-glass-strong))', WebkitBackdropFilter: 'blur(var(--aui-blur-glass-strong))',
              border: '1px solid transparent', padding: "var(--aui-space-4)",
            }}>
              <input ref={refImageInputRef} type="file" accept="image/*" onChange={handleRefImageUpload} style={{ display: 'none' }} />
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />

              <div style={{ display: 'flex', gap: "var(--aui-space-1)", padding: "var(--aui-space-1)", borderRadius: "var(--aui-radius-control)", backgroundColor: F.surface2, marginBottom: 14 }}>
                {([
                  ['planning', '기획/화면 설계'],
                  ['asis', 'As-is 화면'],
                  ['reference', '참고자료'],
                  ['brand', '브랜드'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSourceTab(key)}
                    style={{
                      flex: 1,
                      height: 34,
                      border: 'none',
                      borderRadius: "var(--aui-radius-sm)",
                      backgroundColor: sourceTab === key ? F.canvas : 'transparent',
                      color: sourceTab === key ? F.ink : F.inkMuted,
                      boxShadow: sourceTab === key ? "var(--aui-shadow-subtle)" : 'none',
                      fontSize: "var(--aui-type-caption-size)",
                      fontWeight: "var(--aui-weight-bold)",
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-bold)", color: F.ink, letterSpacing: "var(--aui-tracking-tight)" }}>
                  {sourceTab === 'planning' ? '기획/화면 설계 자료'
                    : sourceTab === 'asis' ? '리디자인할 기존 화면'
                    : sourceTab === 'wireframe' ? '구조로 사용할 와이어프레임'
                    : sourceTab === 'reference' ? '분위기와 패턴 참고자료'
                    : '브랜드 정체성 자료'}
                </div>
                <div style={{ fontSize: "var(--aui-type-caption-size)", color: F.inkMuted, marginTop: 3, lineHeight: "var(--aui-leading-normal)" }}>
                  {sourceTab === 'planning' ? 'PRD, IA, 와이어프레임, HTML 화면기획서를 한곳에 첨부합니다. 텍스트와 콘텐츠는 원본과 동일하게 유지하고 레이아웃만 새 방향으로 변형합니다.'
                    : sourceTab === 'asis' ? '기존 서비스의 정보 구조, 섹션, CTA, 문제점을 분석합니다. 스타일은 가져오지 않고 선택한 design.md를 따릅니다.'
                    : sourceTab === 'wireframe' ? '기획 와이어프레임, 손그림, 피그마 캡처를 올리면 구조를 기준으로 화면을 만듭니다.'
                    : sourceTab === 'reference' ? '좋아하는 이미지나 서비스 URL을 넣으면 무드, 밀도, 레이아웃 리듬만 참고합니다.'
                    : '로고와 컬러를 넣으면 브랜드 요소를 화면에 자연스럽게 반영합니다.'}
                </div>
              </div>

              {sourceTab === 'planning' && (
                <>
                  <input ref={prdFileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.markdown,.html,.htm" multiple onChange={handlePrdFileUpload} style={{ display: 'none' }} />
                  <input ref={iaImageInputRef} type="file" accept="image/*,.xlsx,.xls,.html,.htm" onChange={handleIaImageUpload} style={{ display: 'none' }} />

                  {/* PRD 문서 */}
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-bold)", color: F.inkMuted, marginBottom: '8px', letterSpacing: "var(--aui-tracking-tight)" }}>기획 문서 / RFP / HTML 화면기획서</p>
                    {prdDocEntries.map((entry, index) => (
                      <div key={`${entry.name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-control)", backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, marginBottom: "var(--aui-space-2)" }}>
                        <FileText size={16} color={F.primary} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)", color: F.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</div>
                          <div style={{ fontSize: "var(--aui-type-micro-size)", color: F.inkMuted, marginTop: 2 }}>{entry.text.length.toLocaleString()}자</div>
                        </div>
                        <button onClick={() => setPrdDocEntries(prev => prev.filter((_, i) => i !== index))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: F.inkMuted, display: 'flex', padding: "var(--aui-space-1)" }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => prdFileInputRef.current?.click()}
                      disabled={prdParsing}
                      style={{
                        width: '100%', padding: "var(--aui-space-4)", borderRadius: "var(--aui-radius-control)",
                        border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                        color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)",
                        cursor: prdParsing ? 'wait' : 'pointer', opacity: prdParsing ? 0.6 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: "var(--aui-space-2)",
                        letterSpacing: "var(--aui-tracking-tight)",
                      }}
                    >
                      {prdParsing ? (
                        <>
                          <div className="size-3 rounded-full animate-spin" style={{ border: `2px solid ${F.hairline}`, borderTopColor: F.ink }} />
                          문서 분석 중… (스캔·캡처는 시간이 걸립니다)
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          {prdDocEntries.length ? '문서 추가' : 'RFP · 요구사항 업로드 (PDF, 캡처 이미지, .txt, .md, .html)'}
                        </>
                      )}
                    </button>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-bold)", color: F.inkMuted, marginBottom: '8px', letterSpacing: "var(--aui-tracking-tight)" }}>HTML 화면기획서 링크</p>
                    <div style={{ display: 'flex', gap: "var(--aui-space-2)" }}>
                      <input
                        type="text"
                        value={htmlSourceUrlInput}
                        onChange={e => { setHtmlSourceUrlInput(e.target.value); setRefError(null) }}
                        onKeyDown={e => e.key === 'Enter' && handleHtmlSourceUrlImport()}
                        placeholder="HTML 화면기획서 URL 붙여넣기"
                        style={{
                          flex: 1, padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-control)",
                          border: refError ? '1px solid color-mix(in srgb, var(--aui-negative) 50%, transparent)' : `1px solid ${F.hairline}`,
                          backgroundColor: F.surface2, color: F.ink,
                          fontSize: "var(--aui-type-compact-size)", fontFamily: 'inherit', outline: 'none',
                          letterSpacing: "var(--aui-tracking-tight)",
                        }}
                      />
                      <button
                        onClick={handleHtmlSourceUrlImport}
                        disabled={!htmlSourceUrlInput.trim() || htmlSourceLoading}
                        style={{
                          padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)", flexShrink: 0,
                          border: 'none', cursor: htmlSourceUrlInput.trim() && !htmlSourceLoading ? 'pointer' : 'default',
                          backgroundColor: htmlSourceUrlInput.trim() && !htmlSourceLoading ? F.ink : F.surface2,
                          color: htmlSourceUrlInput.trim() && !htmlSourceLoading ? F.canvas : 'var(--aui-scrim-soft)',
                          fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", letterSpacing: "var(--aui-tracking-tight)",
                          transition: 'all 0.15s', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)",
                        }}
                      >
                        <Link2 size={12} />
                        {htmlSourceLoading ? '가져오는 중…' : '가져오기'}
                      </button>
                    </div>
                  </div>

                  {/* IA 메뉴구조도 */}
                  <div>
                    <p style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-bold)", color: F.inkMuted, marginBottom: '8px', letterSpacing: "var(--aui-tracking-tight)" }}>IA 메뉴구조도 / 와이어프레임</p>
                    {iaText ? (
                      <div style={{ position: 'relative', borderRadius: "var(--aui-radius-control)", border: `1px solid ${F.hairline}`, backgroundColor: F.surface2, padding: `var(--aui-space-3) var(--aui-space-4)` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
                          <FileText size={18} color={F.primary} style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)", color: F.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iaImageFileName}</div>
                            <div style={{ fontSize: "var(--aui-type-micro-size)", color: F.inkMuted, marginTop: 2 }}>텍스트 파싱 완료 · {iaText.length.toLocaleString()}자</div>
                          </div>
                          <button onClick={() => { setIaText(null); setIaImageFileName(null) }}
                            style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%', border: 'none', backgroundColor: F.hairline, color: F.inkMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : iaImage ? (
                      <div style={{ position: 'relative', borderRadius: "var(--aui-radius-control)", overflow: 'hidden', border: `1px solid ${F.hairline}`, backgroundColor: F.surface2 }}>
                        <img src={`data:image/png;base64,${iaImage}`} alt="IA" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', display: 'block' }} />
                        <div style={{ position: 'absolute', top: 6, right: 6 }}>
                          <button onClick={() => { setIaImage(null); setIaImageFileName(null) }}
                            style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', backgroundColor: 'var(--aui-scrim-strong)', color: 'var(--aui-on-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={12} />
                          </button>
                        </div>
                        {iaImageFileName && (
                          <div style={{ padding: `var(--aui-space-2) var(--aui-space-3)`, fontSize: "var(--aui-type-micro-size)", color: F.inkMuted }}>{iaImageFileName}</div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => iaImageInputRef.current?.click()}
                        style={{
                          width: '100%', padding: "var(--aui-space-4)", borderRadius: "var(--aui-radius-control)",
                          border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                          color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: "var(--aui-space-2)",
                          letterSpacing: "var(--aui-tracking-tight)",
                        }}
                      >
                        <Upload size={13} />
                        IA · 와이어프레임 · HTML 업로드
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: 10, padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-control)", backgroundColor: 'var(--aui-primary-tint)', border: `1px solid var(--aui-primary-muted)`, color: F.inkMuted, fontSize: "var(--aui-type-caption-size)", lineHeight: "var(--aui-leading-relaxed)" }}>
                    업로드한 화면기획서의 텍스트, 메뉴명, 버튼명, 콘텐츠 문구는 유지하고 레이아웃·정보 위계·반응형 배치만 새롭게 구성합니다.
                  </div>
                </>
              )}

              {sourceTab === 'asis' && asIsAnalysis && (
                <div style={{ padding: "var(--aui-space-3)", borderRadius: "var(--aui-radius-control)", backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: "var(--aui-space-3)", alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "var(--aui-type-caption-size)", color: F.inkMuted, marginBottom: 4 }}>분석 완료</div>
                      <div style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-bold)", color: F.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {asIsAnalysis.pageTitle || asIsAnalysis.sourceUrl}
                      </div>
                      <div style={{ fontSize: "var(--aui-type-caption-size)", color: F.inkMuted, marginTop: 4 }}>
                        {asIsAnalysis.layoutType} · 섹션 {asIsAnalysis.sections.length}개 · CTA {asIsAnalysis.primaryCtas.length}개
                      </div>
                    </div>
                    <button onClick={clearAsIs} style={{ border: 'none', background: 'none', cursor: 'pointer', color: F.inkMuted, display: 'flex', padding: "var(--aui-space-1)" }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {(sourceTab === 'wireframe' || sourceTab === 'reference') && (
                <button
                  onClick={() => refImageInputRef.current?.click()}
                  style={{
                    width: '100%', padding: "var(--aui-space-4)", borderRadius: "var(--aui-radius-control)",
                    border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                    color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: "var(--aui-space-2)",
                    marginBottom: '14px', letterSpacing: "var(--aui-tracking-tight)",
                  }}
                >
                  <Upload size={13} />
                  {sourceTab === 'wireframe' ? '와이어프레임 이미지 업로드' : '참고 이미지 업로드'}
                </button>
              )}

              {sourceTab === 'reference' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", marginBottom: '12px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                    <span style={{ color: F.inkMuted, fontSize: "var(--aui-type-micro-size)", letterSpacing: "var(--aui-tracking-tight)" }}>또는 드리블·앱스토어 검색</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                  </div>
                  <div style={{ display: 'flex', gap: "var(--aui-space-2)", marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={refSearchQuery}
                      onChange={e => setRefSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRefSearch()}
                      placeholder="예: coffee app, 배달 앱, fitness tracker"
                      style={{
                        flex: 1, padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-control)",
                        border: `1px solid ${F.hairline}`, backgroundColor: F.surface2,
                        color: F.ink, fontSize: "var(--aui-type-compact-size)", fontFamily: 'inherit', outline: 'none',
                        letterSpacing: "var(--aui-tracking-tight)",
                      }}
                    />
                    <button
                      onClick={handleRefSearch}
                      disabled={!refSearchQuery.trim() || refSearching}
                      style={{
                        padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)", flexShrink: 0,
                        border: 'none', cursor: refSearchQuery.trim() && !refSearching ? 'pointer' : 'default',
                        backgroundColor: refSearchQuery.trim() && !refSearching ? F.ink : F.surface2,
                        color: refSearchQuery.trim() && !refSearching ? F.canvas : 'var(--aui-scrim-soft)',
                        fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", letterSpacing: "var(--aui-tracking-tight)",
                        transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {refSearching ? '검색 중…' : '검색'}
                    </button>
                  </div>
                  {refSearchResults.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: "var(--aui-space-2)", marginBottom: '12px' }}>
                      {refSearchResults.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => handleRefSearchImageSelect(img.url)}
                          title={`${img.title} (${img.source})`}
                          style={{
                            padding: 0, border: `1px solid ${F.hairline}`, borderRadius: "var(--aui-radius-sm)",
                            overflow: 'hidden', cursor: 'pointer', backgroundColor: F.surface2,
                            aspectRatio: '4/3', position: 'relative',
                          }}
                        >
                          <img
                            src={img.url}
                            alt={img.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            padding: `var(--aui-space-1) var(--aui-space-1)`, background: 'linear-gradient(transparent, var(--aui-scrim-strong))',
                            fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-on-dark)', textAlign: 'left',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {img.source}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {refSearching && (
                    <div style={{ textAlign: 'center', padding: `var(--aui-space-4) 0`, color: F.inkMuted, fontSize: "var(--aui-type-caption-size)" }}>
                      드리블 · 앱스토어 검색 중…
                    </div>
                  )}
                </>
              )}

              {sourceTab === 'brand' && (
                <>
                  <p style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: F.inkMuted, marginBottom: '8px', letterSpacing: "var(--aui-tracking-tight)" }}>로고</p>
                  {brandLogo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-control)", backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, marginBottom: '14px' }}>
                      <img src={brandLogo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: "var(--aui-radius-sm)" }} />
                      <span style={{ fontSize: "var(--aui-type-caption-size)", color: F.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandLogoName}</span>
                      <button onClick={clearBrand} style={{ border: 'none', background: 'none', cursor: 'pointer', color: F.inkMuted, display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      style={{
                        width: '100%', padding: "var(--aui-space-4)", borderRadius: "var(--aui-radius-control)", marginBottom: '14px',
                        border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                        color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: "var(--aui-space-2)",
                        letterSpacing: "var(--aui-tracking-tight)",
                      }}
                    >
                      <Upload size={13} />
                      로고 이미지 업로드
                    </button>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", marginBottom: '8px' }}>
                    <p style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: F.inkMuted, letterSpacing: "var(--aui-tracking-tight)", margin: 0 }}>브랜드 컬러</p>
                    {extractingColors && <span style={{ fontSize: "var(--aui-type-micro-size)", color: F.inkMuted }}>로고에서 추출 중...</span>}
                    {brandColors.length > 0 && !extractingColors && <span style={{ fontSize: "var(--aui-type-micro-size)", color: F.primary, fontWeight: "var(--aui-weight-semibold)" }}>적용됨</span>}
                  </div>
                  {brandLogo && (
                    <div style={{ display: 'flex', gap: "var(--aui-space-2)", marginBottom: 10 }}>
                      <button
                        onClick={handleExtractBrandColors}
                        disabled={extractingColors}
                        style={{
                          height: 32, padding: `0 var(--aui-space-3)`, borderRadius: "var(--aui-radius-sm)",
                          border: `1px solid ${F.hairline}`, backgroundColor: F.surface2,
                          color: extractingColors ? F.inkMuted : F.ink, fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)",
                          cursor: extractingColors ? 'default' : 'pointer',
                        }}
                      >
                        {extractingColors ? '추출 중...' : '컬러 추출'}
                      </button>
                      <button
                        onClick={handleApplyBrandColors}
                        disabled={extractedBrandColors.length === 0}
                        style={{
                          height: 32, padding: `0 var(--aui-space-3)`, borderRadius: "var(--aui-radius-sm)", border: 'none',
                          backgroundColor: extractedBrandColors.length > 0 ? F.ink : F.hairlineSoft,
                          color: extractedBrandColors.length > 0 ? 'var(--aui-on-dark)' : F.inkMuted,
                          fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-bold)",
                          cursor: extractedBrandColors.length > 0 ? 'pointer' : 'default',
                        }}
                      >
                        적용하기
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", flexWrap: 'wrap' }}>
                    {extractedBrandColors.map((color, i) => (
                      <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-1)" }}>
                        <label style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: color, cursor: 'pointer', display: 'block', border: '2px solid var(--aui-border-subtle)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                          <input
                            type="color"
                            value={color}
                            onChange={e => { const next = [...extractedBrandColors]; next[i] = e.target.value; setExtractedBrandColors(next) }}
                            style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                          />
                        </label>
                        <button
                          onClick={() => setExtractedBrandColors(extractedBrandColors.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        >
                          <X size={8} />
                        </button>
                        <span style={{ fontSize: "var(--aui-type-meta-size)", fontFamily: 'monospace', color: F.inkMuted }}>{color.toUpperCase()}</span>
                      </div>
                    ))}
                    {extractedBrandColors.length < 5 && (
                      <button
                        onClick={() => setExtractedBrandColors([...extractedBrandColors, 'var(--aui-inverse-surface)'])}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1.5px dashed ${F.hairline}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: F.inkMuted, fontSize: "var(--aui-icon-md)", lineHeight: "var(--aui-leading-none)" }}
                      >
                        +
                      </button>
                    )}
                    {extractedBrandColors.length === 0 && !brandLogo && (
                      <span style={{ fontSize: "var(--aui-type-caption-size)", color: F.inkMuted }}>로고를 먼저 업로드해 주세요.</span>
                    )}
                    {extractedBrandColors.length === 0 && brandLogo && !extractingColors && (
                      <span style={{ fontSize: "var(--aui-type-caption-size)", color: F.inkMuted }}>컬러 추출을 누르면 후보 컬러가 표시됩니다.</span>
                    )}
                  </div>
                </>
              )}

              {(sourceTab === 'asis' || sourceTab === 'reference') && (
                <>
              {sourceTab === 'reference' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", marginBottom: '14px' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                  <span style={{ color: F.inkMuted, fontSize: "var(--aui-type-micro-size)", letterSpacing: "var(--aui-tracking-tight)" }}>또는 URL로 캡처</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                </div>
              )}
              {sourceTab === 'asis' && (
                <>
                  {/* 네이티브 앱·사내 시스템은 URL이 없다. 캡처 이미지가 유일한 as-is 근거인 경우를 지원한다. */}
                  <input
                    ref={asIsShotInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={handleAsIsShotUpload}
                    style={{ display: 'none' }}
                  />
                  {asIsShots.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: "var(--aui-space-2)", marginBottom: "var(--aui-space-3)" }}>
                      {asIsShots.map((shot, index) => (
                        <div key={`${shot.name}-${index}`} style={{ position: 'relative', width: 56, height: 96, borderRadius: "var(--aui-radius-sm)", overflow: 'hidden', border: `1px solid ${F.hairline}`, backgroundColor: F.surface2 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`data:${shot.mimeType};base64,${shot.data}`} alt={shot.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            onClick={() => setAsIsShots(prev => prev.filter((_, i) => i !== index))}
                            aria-label={`${shot.name} 제거`}
                            style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: 'var(--aui-scrim-strong)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: "var(--aui-space-2)", marginBottom: '14px' }}>
                    <button
                      onClick={() => asIsShotInputRef.current?.click()}
                      style={{
                        flex: 1, padding: "var(--aui-space-4)", borderRadius: "var(--aui-radius-control)",
                        border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                        color: F.inkMuted, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: "var(--aui-space-2)",
                        letterSpacing: "var(--aui-tracking-tight)",
                      }}
                    >
                      <Upload size={13} />
                      {asIsShots.length ? `캡처 추가 (${asIsShots.length}/12)` : '앱·화면 캡처 업로드 (URL 없을 때)'}
                    </button>
                    {asIsShots.length > 0 && (
                      <button
                        onClick={handleAsIsShotAnalyze}
                        disabled={refCapturing}
                        style={{
                          padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)", flexShrink: 0,
                          border: 'none', cursor: refCapturing ? 'default' : 'pointer',
                          backgroundColor: refCapturing ? F.surface2 : F.ink,
                          color: refCapturing ? 'var(--aui-scrim-soft)' : F.canvas,
                          fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", letterSpacing: "var(--aui-tracking-tight)",
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {refCapturing ? '분석 중…' : '캡처 분석하기'}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", marginBottom: '14px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                    <span style={{ color: F.inkMuted, fontSize: "var(--aui-type-micro-size)", letterSpacing: "var(--aui-tracking-tight)" }}>또는 URL 입력</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: "var(--aui-space-2)" }}>
                <input
                  type="text"
                  value={refPageUrlInput}
                  onChange={e => { setRefPageUrlInput(e.target.value); setRefError(null) }}
                  onKeyDown={e => e.key === 'Enter' && (sourceTab === 'asis' ? handleAsIsAnalyze() : handleRefCapture())}
                  placeholder={sourceTab === 'asis' ? '리뉴얼할 기존 서비스 URL (예: company.com)' : '참고할 서비스 URL (예: airbnb.com)'}
                  style={{
                    flex: 1, padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-control)",
                    border: refError ? '1px solid color-mix(in srgb, var(--aui-negative) 50%, transparent)' : `1px solid ${F.hairline}`,
                    backgroundColor: F.surface2, color: F.ink,
                    fontSize: "var(--aui-type-compact-size)", fontFamily: 'inherit', outline: 'none',
                    letterSpacing: "var(--aui-tracking-tight)",
                  }}
                />
                <button
                  onClick={sourceTab === 'asis' ? handleAsIsAnalyze : handleRefCapture}
                  disabled={!refPageUrlInput.trim() || refCapturing}
                  style={{
                    padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)", flexShrink: 0,
                    border: 'none', cursor: refPageUrlInput.trim() && !refCapturing ? 'pointer' : 'default',
                    backgroundColor: refPageUrlInput.trim() && !refCapturing ? F.ink : F.surface2,
                    color: refPageUrlInput.trim() && !refCapturing ? F.canvas : 'var(--aui-scrim-soft)',
                    fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", letterSpacing: "var(--aui-tracking-tight)",
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)",
                  }}
                >
                  <Link2 size={12} />
                  {refCapturing ? (sourceTab === 'asis' ? '분석 중…' : '캡처 중…') : (sourceTab === 'asis' ? '분석하기' : '캡처하기')}
                </button>
              </div>
                </>
              )}
              {refError && (
                <p style={{ color: 'var(--aui-negative)', fontSize: "var(--aui-type-caption-size)", marginTop: '6px', letterSpacing: "var(--aui-tracking-tight)" }}>
                  {refError}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', visibility: genMode === 'ai' ? 'visible' : 'hidden', alignItems: 'center', gap: "var(--aui-space-4)", marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }} aria-hidden={genMode !== 'ai'}>
            <button
              onClick={() => setGenMdModalOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#ffffff', fontSize: "var(--aui-type-compact-size)", letterSpacing: "var(--aui-tracking-tight)",
                display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)", padding: 0,
                fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px',
                textDecorationColor: 'rgba(255,255,255,0.55)',
              }}
            >
              <FileText size={12} />
              design.md 없으신가요? URL·화면 캡처로 자동 생성하기
            </button>
          </div>

        </main>
        </div>
      </section>


            {/* API Key modal */}
      {apiKeyModalOpen && (
        <div
          onClick={() => setApiKeyModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'var(--aui-scrim)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: F.canvas, borderRadius: "var(--aui-radius-overlay)", padding: "var(--aui-space-8)", width: '520px', maxWidth: 'calc(100vw - 32px)', boxShadow: "var(--aui-shadow-modal)" }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)", marginBottom: '8px' }}>
              <KeyRound size={20} color={F.primary} />
              <h2 style={{ fontSize: "var(--aui-type-section-title-size)", fontWeight: "var(--aui-weight-bold)", color: F.ink, margin: 0 }}>{activeApiKeyMeta.title}</h2>
            </div>
            <div style={{ display: 'flex', gap: "var(--aui-space-2)", padding: "var(--aui-space-1)", borderRadius: "var(--aui-radius-control)", background: F.surface1, margin: `var(--aui-space-4) 0 var(--aui-space-4)` }}>
              {(Object.keys(API_KEY_META) as ApiKeyTab[]).map(tab => {
                const active = apiKeyTab === tab
                const saved = Boolean(apiKeyInputs[tab]?.trim())
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setApiKeyTab(tab)
                      setApiKeyStatus('idle')
                      setApiKeyError('')
                      setShowApiKey(false)
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderRadius: "var(--aui-radius-sm)",
                      padding: `var(--aui-space-2) var(--aui-space-2)`,
                      background: active ? F.canvas : 'transparent',
                      color: active ? F.ink : F.inkMuted,
                      boxShadow: active ? "var(--aui-shadow-subtle)" : 'none',
                      fontSize: "var(--aui-type-compact-size)",
                      fontWeight: active ? 700 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    {API_KEY_META[tab].label}{saved ? ' · 저장됨' : ''}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: "var(--aui-type-compact-size)", color: F.inkMuted, marginBottom: '20px', lineHeight: "var(--aui-leading-relaxed)" }}>
              {activeApiKeyMeta.description} 브라우저 localStorage에만 저장됩니다.
            </p>
            <div style={{ position: 'relative', marginBottom: apiKeyError ? '8px' : '16px' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={activeApiKeyInput}
                onChange={e => {
                  setApiKeyInputs(prev => ({ ...prev, [apiKeyTab]: e.target.value }))
                  setApiKeyStatus('idle')
                  setApiKeyError('')
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleValidateAndSave() }}
                placeholder={activeApiKeyMeta.placeholder}
                autoFocus
                disabled={apiKeyValidating}
                style={{
                  width: '100%', boxSizing: 'border-box', borderRadius: "var(--aui-radius-control)",
                  border: `1.5px solid ${apiKeyStatus === 'valid' ? 'var(--aui-positive)' : apiKeyStatus === 'invalid' ? 'var(--aui-negative)' : F.hairline}`,
                  padding: `var(--aui-space-3) var(--aui-space-10) var(--aui-space-3) var(--aui-space-4)`, fontSize: "var(--aui-type-label-size)", color: F.ink, outline: 'none',
                  fontFamily: 'monospace',
                  background: apiKeyValidating ? F.surface1 : F.canvas,
                }}
                onFocus={e => { if (apiKeyStatus === 'idle') e.currentTarget.style.borderColor = F.primary }}
                onBlur={e => { if (apiKeyStatus === 'idle') e.currentTarget.style.borderColor = F.hairline }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', padding: "var(--aui-space-1)", cursor: 'pointer',
                  color: F.inkMuted, display: 'flex', alignItems: 'center',
                }}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {apiKeyError && (
              <p style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-negative)', margin: `0 0 var(--aui-space-4)`, lineHeight: "var(--aui-leading-normal)" }}>{apiKeyError}</p>
            )}
            {apiKeyStatus === 'valid' && (
              <p style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-positive)', margin: `0 0 var(--aui-space-4)`, lineHeight: "var(--aui-leading-normal)" }}>✓ 저장되었습니다.</p>
            )}
            <div style={{ display: 'flex', gap: "var(--aui-space-2)", justifyContent: 'flex-end' }}>
              <button
                onClick={() => setApiKeyModalOpen(false)}
                disabled={apiKeyValidating}
                style={{ padding: `var(--aui-space-2) var(--aui-space-5)`, borderRadius: "var(--aui-radius-control)", border: `1px solid ${F.hairline}`, background: 'none', fontSize: "var(--aui-type-label-size)", cursor: 'pointer', color: F.inkMuted }}
              >
                취소
              </button>
              <button
                onClick={handleValidateAndSave}
                disabled={apiKeyValidating || !activeApiKeyInput.trim()}
                style={{
                  padding: `var(--aui-space-2) var(--aui-space-5)`, borderRadius: "var(--aui-radius-control)", border: 'none',
                  background: apiKeyValidating || !activeApiKeyInput.trim() ? F.hairline : F.primary,
                  color: apiKeyValidating || !activeApiKeyInput.trim() ? F.inkMuted : 'var(--aui-on-dark)',
                  fontSize: "var(--aui-type-label-size)", fontWeight: "var(--aui-weight-semibold)",
                  cursor: apiKeyValidating || !activeApiKeyInput.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {apiKeyValidating ? (apiKeyTab === 'gemini' ? '검증 중...' : '저장 중...') : apiKeyTab === 'gemini' ? '검증 후 저장' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage modal */}
      {usageModalOpen && (
        <div
          onClick={() => setUsageModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'var(--aui-scrim)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: "var(--aui-space-6)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '720px', maxHeight: '88vh',
              borderRadius: "var(--aui-radius-overlay)", backgroundColor: F.canvas,
              border: `1px solid ${F.hairline}`,
              boxShadow: "var(--aui-shadow-modal)",
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              padding: `var(--aui-space-4) var(--aui-space-6)`, borderBottom: `1px solid ${F.hairlineSoft}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
                <Coins size={16} color={F.inkMuted} />
                <span style={{ color: F.ink, fontSize: "var(--aui-type-body-size)", fontWeight: "var(--aui-weight-semibold)", letterSpacing: "var(--aui-tracking-tighter)" }}>Gemini 사용량</span>
              </div>
              <button
                onClick={() => setUsageModalOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: F.inkMuted, display: 'flex', alignItems: 'center',
                  padding: "var(--aui-space-1)", borderRadius: "var(--aui-radius-sm)", fontFamily: 'inherit',
                  fontSize: "var(--aui-type-section-title-size)", lineHeight: "var(--aui-leading-none)",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "var(--aui-space-6)", overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: "var(--aui-space-4)" }}>
              <p style={{ margin: 0, fontSize: "var(--aui-type-caption-size)", color: F.inkMuted, lineHeight: 1.5 }}>
                Aide가 이 기기에서 직접 호출한 Gemini API 요청 기준 추정치입니다. Google 공식 청구 금액과 다를 수 있습니다.
              </p>
              {usageLoading ? (
                <div style={{ fontSize: "var(--aui-type-body-size)", color: F.inkMuted }}>불러오는 중...</div>
              ) : !usageSummary || usageSummary.totalCalls === 0 ? (
                <div style={{ fontSize: "var(--aui-type-body-size)", color: F.inkMuted }}>아직 기록된 호출이 없습니다.</div>
              ) : (
                <>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 'var(--aui-space-2)',
                  }}>
                    {[
                      { label: '추정 비용', value: `$${usageSummary.totalCostUsd.toFixed(4)}`, accent: true },
                      { label: 'API 호출', value: `${usageSummary.totalCalls.toLocaleString()}회` },
                      { label: '전체 토큰', value: formatCompactTokens(usageSummary.totalPromptTokens + usageSummary.totalOutputTokens) },
                    ].map(metric => (
                      <div key={metric.label} style={{ padding: 'var(--aui-space-4)', borderRadius: 'var(--aui-radius-card)', backgroundColor: metric.accent ? F.primarySoft : 'var(--aui-border-subtle)', minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--aui-type-caption-size)', color: F.inkMuted, marginBottom: 5 }}>{metric.label}</div>
                        <div style={{ fontSize: 'var(--aui-type-section-title-size)', fontWeight: 'var(--aui-weight-semibold)', color: metric.accent ? F.primaryActive : F.ink, overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.value}</div>
                      </div>
                    ))}
                  </div>
                  <UsageTrendChart data={usageSummary.byDay} />
                  <UsageModelBreakdown rows={usageSummary.byModel} totalCost={usageSummary.totalCostUsd} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--aui-space-2)', borderTop: `1px solid ${F.hairlineSoft}`, fontSize: 'var(--aui-type-caption-size)', color: F.inkMuted }}>
                    <span>입력 {formatCompactTokens(usageSummary.totalPromptTokens)} 토큰</span>
                    <span>출력 {formatCompactTokens(usageSummary.totalOutputTokens)} 토큰</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
