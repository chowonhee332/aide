'use client'

import { useState, useCallback, useRef, useEffect, startTransition } from 'react'
import {
  ArrowUp, ArrowRight, FileText, Upload, X,
  Check, ChevronDown, Zap, Palette, Share2,
  Clock, Trash2, ExternalLink, Link2, KeyRound,
  Download,
} from 'lucide-react'
import { type DesignPreset, DESIGN_PRESETS } from '@/lib/design-presets'
import Grainient from '@/components/Grainient'
import { DesignMdPreview } from '@/components/DesignMdPreview'
import { type HistoryItem, loadHistory, deleteHistoryItem, relativeTime } from '@/lib/history'
import dynamic from 'next/dynamic'
import StudioView from '@/components/StudioView'

const CircularGallery = dynamic(() => import('@/components/CircularGallery'), { ssr: false })

const F = {
  canvas:       '#ffffff',
  surface1:     '#F7F7F8',
  surface2:     'rgba(112,115,124,0.08)',
  ink:          '#171719',
  inkMuted:     'rgba(55,56,60,0.61)',
  primary:      '#0066FF', // Electric Blue
  primaryActive:'#3d1bd9',
  hairline:     'rgba(112,115,124,0.16)',
  hairlineSoft: 'rgba(112,115,124,0.16)',
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
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)
  const [apiKeyTab, setApiKeyTab] = useState<ApiKeyTab>('gemini')
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<ApiKeyTab, string>>({ gemini: '', unsplash: '', figma: '' })
  const [apiKeyValidating, setApiKeyValidating] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [apiKeyError, setApiKeyError] = useState('')
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

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [historyModalTab, setHistoryModalTab] = useState<'board' | 'variant' | 'design'>('board')
  const historyMatchesTab = useCallback((item: HistoryItem, tab: 'board' | 'variant' | 'design') => {
    // 대지 탭: 모든 board 레코드 (진행 단계 무관)
    if (tab === 'board') return item.itemType === 'board'
    // 시안 탭: variants가 있는 board OR 구버전 variant 레코드
    if (tab === 'variant') return (
      (item.itemType === 'board' && (item.board?.mainVariants?.some(Boolean) ?? false)) ||
      item.itemType === 'variant'
    )
    // 디자인 탭: 프로토타입이 있는 board (시안 데이터도 board 안에 함께 유지됨)
    return item.itemType === 'board' && !!item.board?.prototypeHtml
  }, [])

  useEffect(() => {
    loadHistory().then(items => startTransition(() => setHistoryItems(items)))
  }, [])

  useEffect(() => {
    if (historyModalOpen) {
      loadHistory().then(items => startTransition(() => setHistoryItems(items)))
    }
  }, [historyModalOpen])

  const [briefDesc, setBriefDesc] = useState('')
  const [briefFeatures, setBriefFeatures] = useState('')
  const brief = [
    briefDesc.trim(),
    briefFeatures.trim() ? `핵심 기능:\n${briefFeatures.trim()}` : '',
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
  const [sourceTab, setSourceTab] = useState<'asis' | 'wireframe' | 'reference' | 'brand' | 'planning'>('asis')
  const [refPageImage, setRefPageImage] = useState<string | null>(null)
  const [refImageKind, setRefImageKind] = useState<'wireframe' | 'reference'>('reference')
  const [asIsAnalysis, setAsIsAnalysis] = useState<AsIsAnalysis | null>(null)
  const [refPageUrlInput, setRefPageUrlInput] = useState('')
  const [refCapturing, setRefCapturing] = useState(false)
  const [refError, setRefError] = useState<string | null>(null)
  const [refPreviewOpen, setRefPreviewOpen] = useState(false)
  const [refSearchQuery, setRefSearchQuery] = useState('')
  const [refSearchResults, setRefSearchResults] = useState<{ url: string; title: string; source: string }[]>([])
  const [refSearching, setRefSearching] = useState(false)

  const [prdDoc, setPrdDoc] = useState<string | null>(null)
  const [prdDocFileName, setPrdDocFileName] = useState<string | null>(null)
  const [iaImage, setIaImage] = useState<string | null>(null)
  const [iaImageFileName, setIaImageFileName] = useState<string | null>(null)
  const [iaText, setIaText] = useState<string | null>(null)
  const prdFileInputRef = useRef<HTMLInputElement>(null)
  const iaImageInputRef = useRef<HTMLInputElement>(null)

  const [modelId, setModelId] = useState<string>('gemini-3.1-pro-preview')
  const [modelDropOpen, setModelDropOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('aide_model')
    if (saved) startTransition(() => setModelId(saved))
  }, [])

  const [brandPanelOpen, setBrandPanelOpen] = useState(false)
  const [brandLogo, setBrandLogo] = useState<string | null>(null)
  const [brandLogoName, setBrandLogoName] = useState<string | null>(null)
  const [brandColors, setBrandColors] = useState<string[]>([])
  const [extractedBrandColors, setExtractedBrandColors] = useState<string[]>([])
  const [extractingColors, setExtractingColors] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [studioTrigger, setStudioTrigger] = useState<{
    brief: string
    preset?: string
    platform?: string
    historyId?: string
  } | null>(null)

  // URL → design.md 생성 전용 모달 state
  const [genMdModalOpen, setGenMdModalOpen] = useState(false)
  const [genMdUrl, setGenMdUrl] = useState('')
  const [genMdAnalyzing, setGenMdAnalyzing] = useState(false)
  const [genMdError, setGenMdError] = useState<string | null>(null)
  const [genMdResult, setGenMdResult] = useState<string | null>(null)
  const [genMdScreenshot, setGenMdScreenshot] = useState<string | null>(null)
  const [genMdCopied, setGenMdCopied] = useState(false)
  const [genMdCaptureStatus, setGenMdCaptureStatus] = useState<'full' | 'partial' | 'blocked' | null>(null)

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
    setDesignMdFileName(genMdUrl.trim())
    setDesignPreset('none')
    setAppliedUrlScreenshot(genMdScreenshot)
    setGenMdModalOpen(false)
    setGenMdResult(null)
    setGenMdScreenshot(null)
    setGenMdCaptureStatus(null)
    setGenMdUrl('')
  }

  const closeGenMdModal = () => {
    setGenMdModalOpen(false)
    setGenMdUrl('')
    setGenMdError(null)
    setGenMdResult(null)
    setGenMdScreenshot(null)
    setGenMdCaptureStatus(null)
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
    setRefError(null)
  }

  const handlePrdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setPrdDoc(text)
      setPrdDocFileName(file.name)
    }
    reader.readAsText(file)
    if (prdFileInputRef.current) prdFileInputRef.current.value = ''
  }

  const handleIaImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
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

  const clearPlanning = () => {
    setPrdDoc(null)
    setPrdDocFileName(null)
    setIaImage(null)
    setIaText(null)
    setIaImageFileName(null)
  }

  const handleSubmit = useCallback(() => {
    if (!brief.trim()) return
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
    sessionStorage.setItem('aide_model', modelId)
    setStudioTrigger({
      brief: brief.trim(),
      preset: designPreset !== 'none' ? designPreset : undefined,
    })
  }, [brief, designPreset, designMdContent, asIsAnalysis, refPageImage, refImageKind, brandLogo, brandColors, prdDoc, iaImage, iaText, modelId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = brief.trim().length > 0
  const designButtonLabel = designMdFileName ?? null

  if (studioTrigger) {
    return (
      <StudioView
        triggerBrief={studioTrigger.brief}
        triggerPreset={studioTrigger.preset}
        triggerPlatform={studioTrigger.platform}
        historyId={studioTrigger.historyId}
        onBack={() => setStudioTrigger(null)}
      />
    )
  }

  return (
    <div style={{
      backgroundColor: F.canvas,
      fontFamily: "var(--font-inter), Circular, -apple-system, system-ui, Roboto, \"Helvetica Neue\", sans-serif",
    }}>
      <style>{`
        ::placeholder { color: rgba(0,0,0,0.3); }
        textarea:focus { outline: none; }
        .tpl-scroll { scrollbar-width: none; }
        .tpl-scroll::-webkit-scrollbar { display: none; }
        @keyframes marquee-left { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes marquee-right { from { transform: translateX(-50%) } to { transform: translateX(0) } }
        .marquee-left { animation: marquee-left 32s linear infinite; display: flex; width: max-content; }
        .marquee-right { animation: marquee-right 28s linear infinite; display: flex; width: max-content; }
        .history-card:hover .history-card-overlay { opacity: 1 !important; }
        @keyframes scroll-cue {
          0%, 100% { transform: translateY(0); opacity: 0.45; }
          50% { transform: translateY(7px); opacity: 1; }
        }
        .scroll-cue-dot { animation: scroll-cue 1.45s ease-in-out infinite; }
      `}</style>

      {/* ── URL → design.md 생성 모달 ── */}
      {genMdModalOpen && (
        <div
          onClick={closeGenMdModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '640px',
              backgroundColor: '#ffffff', borderRadius: '24px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 48px)',
            }}
          >
            {/* 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: `1px solid ${F.hairlineSoft}`, flexShrink: 0,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <FileText size={16} color={F.primary} />
                  <span style={{ fontWeight: 700, fontSize: '16px', color: F.ink, letterSpacing: '-0.5px' }}>
                    design.md 자동 생성
                  </span>
                </div>
                <p style={{ color: F.inkMuted, fontSize: '13px', margin: 0, letterSpacing: '-0.13px' }}>
                  서비스 URL만 넣으면 AI가 디자인 시스템 파일을 만들어드려요
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
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {!genMdResult ? (
                <>
                  {/* URL 입력 */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: genMdError ? '8px' : '0' }}>
                    <input
                      type="text"
                      value={genMdUrl}
                      onChange={e => { setGenMdUrl(e.target.value); setGenMdError(null) }}
                      onKeyDown={e => e.key === 'Enter' && handleGenMdAnalyze()}
                      placeholder="서비스 URL 입력 (예: ktds.com, toss.im)"
                      autoFocus
                      style={{
                        flex: 1, padding: '12px 14px', borderRadius: '12px',
                        border: genMdError ? '1.5px solid rgba(255,80,80,0.5)' : `1.5px solid ${F.hairline}`,
                        backgroundColor: F.surface1, color: F.ink,
                        fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                        letterSpacing: '-0.14px',
                      }}
                    />
                    <button
                      onClick={handleGenMdAnalyze}
                      disabled={!genMdUrl.trim() || genMdAnalyzing}
                      style={{
                        padding: '12px 20px', borderRadius: '12px', flexShrink: 0,
                        border: 'none',
                        cursor: genMdUrl.trim() && !genMdAnalyzing ? 'pointer' : 'default',
                        backgroundColor: genMdUrl.trim() && !genMdAnalyzing ? F.ink : F.surface2,
                        color: genMdUrl.trim() && !genMdAnalyzing ? '#fff' : 'rgba(0,0,0,0.25)',
                        fontSize: '14px', fontWeight: 600, letterSpacing: '-0.14px',
                        transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {genMdAnalyzing ? '분석 중…' : '생성하기'}
                    </button>
                  </div>

                  {genMdError && (
                    <p style={{ color: 'rgba(220,50,50,0.85)', fontSize: '12px', margin: '8px 0 0', letterSpacing: '-0.12px' }}>
                      {genMdError}
                    </p>
                  )}

                  {/* 로딩 상태 */}
                  {genMdAnalyzing && (
                    <div style={{
                      marginTop: '24px', padding: '32px', borderRadius: '16px',
                      backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                    }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        border: `3px solid ${F.hairlineSoft}`,
                        borderTopColor: F.primary,
                        animation: 'spin 0.9s linear infinite',
                      }} />
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: F.ink, fontSize: '14px', fontWeight: 600, margin: '0 0 4px', letterSpacing: '-0.14px' }}>
                          웹사이트를 분석하고 있어요
                        </p>
                        <p style={{ color: F.inkMuted, fontSize: '13px', margin: 0, letterSpacing: '-0.13px' }}>
                          색상, 타이포그래피, 레이아웃을 읽는 중입니다
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 안내 */}
                  {!genMdAnalyzing && !genMdError && (
                    <div style={{
                      marginTop: '16px', padding: '16px', borderRadius: '12px',
                      backgroundColor: `${F.primary}08`, border: `1px solid ${F.primary}15`,
                    }}>
                      <p style={{ color: F.inkMuted, fontSize: '12px', margin: 0, lineHeight: 1.6, letterSpacing: '-0.12px' }}>
                        AI가 사이트를 스크린샷하고 색상·폰트·컴포넌트 패턴을 추출해<br />
                        Google Stitch 규격의 design.md 파일을 생성합니다.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 보안 차단 경고 배너 */}
                  {genMdCaptureStatus === 'blocked' && (
                    <div style={{
                      marginBottom: '12px', padding: '12px 14px', borderRadius: '10px',
                      backgroundColor: 'rgba(255, 160, 0, 0.08)', border: '1px solid rgba(255, 160, 0, 0.3)',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0 }}>⚠️</span>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 600, color: '#b45309', letterSpacing: '-0.12px' }}>
                          보안으로 인해 사이트 직접 확인 불가
                        </p>
                        <p style={{ margin: 0, fontSize: '11.5px', color: '#92400e', lineHeight: 1.55, letterSpacing: '-0.1px' }}>
                          Cloudflare 또는 봇 차단으로 실제 디자인을 캡처하지 못했습니다.
                          로고에서 추출된 브랜드 컬러와 범용 디자인시스템을 기반으로 생성했습니다.
                        </p>
                      </div>
                    </div>
                  )}
                  {genMdCaptureStatus === 'partial' && (
                    <div style={{
                      marginBottom: '12px', padding: '10px 14px', borderRadius: '10px',
                      backgroundColor: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)',
                      display: 'flex', gap: '8px', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>ℹ️</span>
                      <p style={{ margin: 0, fontSize: '11.5px', color: '#1e40af', lineHeight: 1.5, letterSpacing: '-0.1px' }}>
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
                padding: '16px 24px', borderTop: `1px solid ${F.hairlineSoft}`,
                display: 'flex', gap: '8px', flexShrink: 0, justifyContent: 'flex-end',
              }}>
                <button
                  onClick={handleGenMdDownload}
                  style={{
                    padding: '10px 16px', borderRadius: '10px',
                    border: `1px solid ${F.hairline}`, backgroundColor: '#fff',
                    color: F.ink, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    letterSpacing: '-0.13px', display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <Download size={13} />
                  .md 저장
                </button>
                <button
                  onClick={handleGenMdCopy}
                  style={{
                    padding: '10px 16px', borderRadius: '10px',
                    border: `1px solid ${F.hairline}`, backgroundColor: '#fff',
                    color: genMdCopied ? '#00a060' : F.ink, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    letterSpacing: '-0.13px', display: 'flex', alignItems: 'center', gap: '6px',
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
            backgroundColor: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '960px',
              backgroundColor: F.surface1, borderRadius: '16px',
              border: `1px solid ${F.hairline}`,
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 48px)',
            }}
          >
            {/* 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: `1px solid ${F.hairlineSoft}`, flexShrink: 0,
            }}>
              <span style={{ color: F.inkMuted, fontSize: '13px', letterSpacing: '-0.13px' }}>
                현재 페이지 레퍼런스
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => { setRefPreviewOpen(false); setRefPanelOpen(true); setDesignPanelOpen(false) }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', border: `1px solid ${F.hairline}`,
                    backgroundColor: F.canvas, color: F.ink,
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.12px',
                    fontFamily: 'inherit',
                  }}
                >
                  변경하기
                </button>
                <button
                  onClick={() => { clearRefPage(); setRefPreviewOpen(false) }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,80,80,0.25)',
                    backgroundColor: 'rgba(255,80,80,0.08)', color: 'rgba(255,100,100,0.8)',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.12px',
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
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div className="fixed inset-0 pointer-events-none">
          <Grainient
            color1="#95c7cd"
            color2="#0066FF"
            color3="#B497CF"
            timeSpeed={1}
            colorBalance={0}
            warpStrength={1}
            warpFrequency={3.7}
            warpSpeed={2.5}
            warpAmplitude={50}
            blendAngle={5}
            blendSoftness={0.05}
            rotationAmount={400}
            noiseScale={2}
            grainAmount={0.1}
            grainScale={1.5}
            grainAnimated={false}
            contrast={1.5}
            gamma={1}
            saturation={0.8}
            centerX={0}
            centerY={0}
            zoom={0.9}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '300px', background: `linear-gradient(to bottom, ${F.canvas} 0%, transparent 100%)` }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: `linear-gradient(to top, ${F.canvas} 0%, transparent 100%)` }} />
        </div>

        <header style={{
          position: 'fixed',
          top: scrolled ? '24px' : '0',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          width: scrolled ? 'calc(100% - 48px)' : '100%',
          maxWidth: scrolled ? '1000px' : 'none',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div style={{
            backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.4)' : 'transparent',
            backdropFilter: scrolled ? 'blur(16px)' : 'none',
            borderBottom: !scrolled ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
            border: scrolled ? '1px solid rgba(255, 255, 255, 0.3)' : undefined,
            borderRadius: scrolled ? '20px' : '0',
            padding: scrolled ? '12px 24px' : '20px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.04)' : 'none',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {/* 좌측: 로고 */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                aria-label="Aide 홈으로 이동"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <img src="/logo_aide.png" alt="Aide" style={{ height: 58, width: 'auto', display: 'block', objectFit: 'contain' }} />
              </button>
            </div>


            {/* 우측: 액션 */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={openApiKeyModal}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: scrolled ? F.inkMuted : 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
                  padding: '6px', borderRadius: '8px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = F.ink }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = scrolled ? F.inkMuted : 'rgba(0,0,0,0.6)' }}
                title="API Key 설정"
              >
                <KeyRound size={18} />
              </button>
              <button
                onClick={() => setHistoryModalOpen(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: scrolled ? F.inkMuted : 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
                  padding: '6px', borderRadius: '8px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = F.ink }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = scrolled ? F.inkMuted : 'rgba(0,0,0,0.6)' }}
                title="히스토리"
              >
                <Clock size={18} />
              </button>
              <button
                onClick={async () => {
                  const items = await loadHistory()
                  if (items.length > 0) {
                    setStudioTrigger({ brief: '', historyId: items[0].id })
                  }
                }}
                style={{
                  backgroundColor: scrolled ? '#fff' : 'rgba(255,255,255,0.9)', color: '#171719',
                  fontSize: '14px', fontWeight: 600, padding: '10px 20px', borderRadius: '12px',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  letterSpacing: '-0.14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = scrolled ? '#fff' : 'rgba(255,255,255,0.9)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Studio <ArrowRight size={14} strokeWidth={2.5} />
                </span>
              </button>
            </div>
          </div>
        </header>


        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24" style={{ paddingBottom: '100px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
            fontSize: '13px', fontWeight: 600, padding: '6px 16px', borderRadius: '100px',
            backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            marginBottom: '24px', letterSpacing: '-0.13px',
          }}>
            <span style={{ backgroundColor: '#fff', color: '#171719', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginRight: '4px' }}>NEW</span>
            Just shipped v2.0
          </div>

          <h1 style={{
            fontSize: 'clamp(40px, 6.5vw, 72px)', fontWeight: 800, color: '#fff',
            textAlign: 'center', lineHeight: 1.15, letterSpacing: '-2px',
            fontFamily: 'var(--font-poppins)',
            marginBottom: '24px', maxWidth: '860px',
            textShadow: '0 2px 20px rgba(0,0,0,0.1)',
            textWrap: 'balance',
          } as React.CSSProperties}>
            Start with Aide.<br />Iterate into a design.
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.5vw, 18px)', color: 'rgba(255,255,255,0.72)',
            textAlign: 'center', lineHeight: 1.6, maxWidth: '560px',
            marginBottom: '52px',
          }}>
            Aide turns your brief and design system into UI prototypes — generate, compare, and refine through conversation.
          </p>


          {/* Input card */}
          <div style={{
            width: '100%', maxWidth: '700px', borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            padding: '22px 22px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}>
            {(designPreset !== 'none' || designButtonLabel) && (() => {
              const isUrl = !!designButtonLabel && (designButtonLabel.startsWith('http://') || designButtonLabel.startsWith('https://'))
              const chipLabel = designButtonLabel
                ? (isUrl ? (() => { try { return new URL(designButtonLabel).hostname.replace(/^www\./, '') } catch { return designButtonLabel } })() : designButtonLabel)
                : `${designPreset}.md`
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px 4px 9px', borderRadius: '100px',
                    border: `1px solid ${F.hairlineSoft}`, backgroundColor: '#ffffff',
                    color: 'rgba(0,0,0,0.7)', fontSize: '12px', fontWeight: 500,
                  }}>
                    <FileText size={11} />
                    <span>{chipLabel}</span>
                    <button
                      onClick={designButtonLabel ? clearDesign : () => setDesignPreset('none')}
                      style={{ display: 'flex', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.4)', padding: 0, marginLeft: '2px' }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>이 design.md 파일의 디자인 시스템 사용</span>
                </div>
              )
            })()}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: F.primary, marginBottom: '4px', letterSpacing: '-0.1px' }}>
                  ㅇ 서비스 설명
                </div>
                <textarea
                  value={briefDesc}
                  onChange={e => setBriefDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && briefDesc.trim()) { e.preventDefault(); handleSubmit() } }}
                  placeholder="어떤 서비스인지 2-3문장으로 적어주세요.&#10;예) 반려식물을 키우는 사람들이 물주기·일조량을 기록하고 AI가 식물 상태를 진단해주는 앱"
                  rows={2}
                  style={{
                    width: '100%', background: 'none', border: 'none', outline: 'none',
                    color: 'rgba(0,0,0,0.9)', fontSize: '14px', lineHeight: 1.5,
                    letterSpacing: '-0.13px', resize: 'none', fontFamily: 'inherit',
                    caretColor: F.primary,
                  }}
                />
              </div>
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: F.primary, marginBottom: '4px', letterSpacing: '-0.1px' }}>
                  ㅇ 핵심 기능
                </div>
                <textarea
                  value={briefFeatures}
                  onChange={e => setBriefFeatures(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && briefDesc.trim()) { e.preventDefault(); handleSubmit() } }}
                  placeholder="주요 기능을 줄바꿈으로 나열해주세요.&#10;예) - 식물 상태 기록 (물주기, 햇빛, 온도)&#10;- AI 진단 및 케어 추천&#10;- 스토어 (식물·용품 구매)"
                  rows={3}
                  style={{
                    width: '100%', background: 'none', border: 'none', outline: 'none',
                    color: 'rgba(0,0,0,0.9)', fontSize: '14px', lineHeight: 1.5,
                    letterSpacing: '-0.13px', resize: 'none', fontFamily: 'inherit',
                    caretColor: F.primary,
                  }}
                />
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '14px',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                {/* + source button */}
                <button
                  onClick={() => { setRefPanelOpen(v => !v); setDesignPanelOpen(false); setBrandPanelOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '38px', height: '38px', borderRadius: '50%',
                    border: 'none',
                    backgroundColor: refPanelOpen ? F.ink : 'rgba(0,0,0,0.08)',
                    color: refPanelOpen ? F.canvas : 'rgba(0,0,0,0.55)',
                    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                  }}
                  title="리디자인 소스 추가"
                >
                  <span style={{ fontSize: '20px', lineHeight: 1, marginTop: '-1px' }}>+</span>
                </button>

                {/* Source chips */}
                {asIsAnalysis ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => { setRefPanelOpen(true); setSourceTab('asis'); setDesignPanelOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '0 12px', height: '38px', borderRadius: '100px',
                        border: 'none', backgroundColor: 'rgba(0,0,0,0.08)',
                        color: 'rgba(0,0,0,0.65)', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', letterSpacing: '-0.13px',
                      }}
                    >
                      <Link2 size={12} />
                      As-is
                      <span style={{ color: 'rgba(0,0,0,0.42)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(() => { try { return new URL(asIsAnalysis.sourceUrl).hostname.replace(/^www\./, '') } catch { return asIsAnalysis.pageTitle || '분석됨' } })()}
                      </span>
                    </button>
                    <button
                      onClick={clearAsIs}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'rgba(55,56,60,0.61)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null}

                {refPageImage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => setRefPreviewOpen(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px 4px 6px', borderRadius: '100px',
                        border: '1px solid rgba(0,0,0,0.1)', backgroundColor: '#ffffff',
                        color: 'rgba(0,0,0,0.7)', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', letterSpacing: '-0.13px',
                      }}
                    >
                      <img
                        src={`data:image/png;base64,${refPageImage}`}
                        alt="ref"
                        style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }}
                      />
                      {refImageKind === 'wireframe' ? '와이어프레임' : '참고자료'}
                    </button>
                    <button
                      onClick={clearRefPage}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'rgba(55,56,60,0.61)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null}

                {(brandLogo !== null || brandColors.length > 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => { setRefPanelOpen(true); setSourceTab('brand'); setDesignPanelOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '0 12px', height: '38px', borderRadius: '100px',
                        border: 'none', backgroundColor: 'rgba(0,0,0,0.08)',
                        color: 'rgba(0,0,0,0.65)', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', letterSpacing: '-0.13px',
                      }}
                    >
                      {brandLogo ? (
                        <img src={brandLogo} alt="logo" style={{ width: 14, height: 14, objectFit: 'contain', borderRadius: 2 }} />
                      ) : (
                        <Palette size={11} />
                      )}
                      브랜드
                      {brandColors.length > 0 && (
                        <div style={{ display: 'flex', gap: 3 }}>
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
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'rgba(55,56,60,0.61)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {(prdDoc !== null || iaImage !== null) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => { setRefPanelOpen(true); setSourceTab('planning'); setDesignPanelOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '0 12px', height: '38px', borderRadius: '100px',
                        border: 'none', backgroundColor: `${F.primary}18`,
                        color: F.primary, fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', letterSpacing: '-0.13px',
                      }}
                    >
                      <FileText size={11} />
                      기획서
                      {prdDoc && iaImage ? ' 2' : ''}
                    </button>
                    <button
                      onClick={clearPlanning}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'rgba(55,56,60,0.61)',
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
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '0 13px', height: '38px', borderRadius: '100px',
                    border: 'none',
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    color: 'rgba(0,0,0,0.55)', fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer', letterSpacing: '-0.13px', transition: 'all 0.15s',
                  }}
                >
                  <FileText size={11} />
                  design.md
                </button>

              </div>

              {/* 모델 선택 드롭다운 + 전송 버튼 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setModelDropOpen(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '0 10px 0 12px', height: '38px', borderRadius: '100px',
                      border: 'none', backgroundColor: 'rgba(0,0,0,0.08)',
                      color: 'rgba(0,0,0,0.55)', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', letterSpacing: '-0.1px', transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Zap size={11} />
                    {modelId === 'gemini-3.1-pro-preview' ? 'Gemini 3.1 Pro' : 'Gemini 3.0 Flash'}
                    <ChevronDown size={11} />
                  </button>
                  {modelDropOpen && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
                      backgroundColor: '#ffffff', border: `1px solid ${F.hairline}`,
                      borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      overflow: 'hidden', zIndex: 100, minWidth: '180px',
                    }}>
                      {([
                        { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', desc: '고품질 · 느림' },
                        { id: 'gemini-2.0-flash', label: 'Gemini 3.0 Flash', desc: '빠름 · 가벼움' },
                      ] as const).map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setModelId(opt.id)
                            localStorage.setItem('aide_model', opt.id)
                            setModelDropOpen(false)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '10px 14px', border: 'none',
                            backgroundColor: modelId === opt.id ? F.surface1 : '#ffffff',
                            cursor: 'pointer', textAlign: 'left', gap: '12px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: F.ink, letterSpacing: '-0.13px' }}>{opt.label}</div>
                            <div style={{ fontSize: '11px', color: F.inkMuted, marginTop: '1px' }}>{opt.desc}</div>
                          </div>
                          {modelId === opt.id && <Check size={13} color={F.primary} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: canSubmit ? 'pointer' : 'default', transition: 'all 0.2s',
                    backgroundColor: canSubmit ? F.ink : F.surface2,
                    color: canSubmit ? F.canvas : 'rgba(0,0,0,0.25)', border: 'none',
                  }}
                >
                  <ArrowUp size={17} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>

          {designPanelOpen && (
            <div style={{
              width: '100%', maxWidth: '700px', marginTop: '8px',
              borderRadius: '16px', backgroundColor: F.surface1,
              border: `1px solid ${F.hairline}`, padding: '16px',
            }}>
              <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {(Object.keys(DESIGN_PRESETS).filter(k => k !== 'none') as DesignPreset[]).map(key => {
                  const preset = DESIGN_PRESETS[key]
                  const isActive = designPreset === key
                  return (
                    <button
                      key={key}
                      onClick={() => { setDesignPreset(isActive ? 'none' : key); if (!isActive) setDesignPanelOpen(false) }}
                      style={{
                        padding: '12px 12px', borderRadius: '10px', textAlign: 'left',
                        cursor: 'pointer',
                        border: isActive ? `1px solid ${preset.color}40` : `1px solid ${F.hairlineSoft}`,
                        backgroundColor: isActive ? `${preset.color}18` : F.surface2,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: preset.color, flexShrink: 0 }} />
                        <span style={{ color: isActive ? preset.color : F.ink, fontSize: '13px', fontWeight: 600, letterSpacing: '-0.5px' }}>
                          {preset.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                <span style={{ color: F.inkMuted, fontSize: '11px', letterSpacing: '-0.11px' }}>또는 직접 입력</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px',
                  border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                  color: F.inkMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  marginBottom: '10px', letterSpacing: '-0.13px',
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
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={e => { setUrlInput(e.target.value); setUrlError(null) }}
                      onKeyDown={e => e.key === 'Enter' && handleUrlAnalyze()}
                      placeholder="타사 서비스 URL 붙여넣기 (예: airbnb.com)"
                      disabled={urlAnalyzing}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '10px',
                        border: urlError ? '1px solid rgba(255,80,80,0.5)' : urlAnalyzing ? `1px solid ${F.primary}` : `1px solid ${F.hairline}`,
                        backgroundColor: urlAnalyzing ? 'rgba(0,85,255,0.04)' : F.surface2, color: F.ink,
                        fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                        letterSpacing: '-0.13px', transition: 'all 0.2s',
                      }}
                    />
                    <button
                      onClick={handleUrlAnalyze}
                      disabled={!urlInput.trim() || urlAnalyzing}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '10px 14px', borderRadius: '10px', flexShrink: 0,
                        border: 'none', cursor: urlInput.trim() && !urlAnalyzing ? 'pointer' : 'default',
                        backgroundColor: urlInput.trim() && !urlAnalyzing ? F.ink : F.surface2,
                        color: urlInput.trim() && !urlAnalyzing ? F.canvas : 'rgba(0,0,0,0.25)',
                        fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px',
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
                    <p style={{ fontSize: '11px', color: F.primary, marginTop: '6px', letterSpacing: '-0.11px', opacity: 0.7 }}>
                      페이지를 열고 디자인 토큰을 추출하고 있습니다 (10~30초)
                    </p>
                  )}
                  {urlError && (
                    <p style={{ color: 'rgba(255,80,80,0.8)', fontSize: '12px', marginTop: '6px', letterSpacing: '-0.12px' }}>
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
              borderRadius: '16px', backgroundColor: F.surface1,
              border: `1px solid ${F.hairline}`, padding: '16px',
            }}>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />

              {/* Logo section */}
              <p style={{ fontSize: '12px', fontWeight: 600, color: F.inkMuted, marginBottom: '8px', letterSpacing: '-0.12px' }}>로고</p>
              {brandLogo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, marginBottom: '14px' }}>
                  <img src={brandLogo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} />
                  <span style={{ fontSize: '12px', color: F.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandLogoName}</span>
                  <button onClick={clearBrand} style={{ border: 'none', background: 'none', cursor: 'pointer', color: F.inkMuted, display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px', marginBottom: '14px',
                    border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                    color: F.inkMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    letterSpacing: '-0.13px',
                  }}
                >
                  <Upload size={13} />
                  로고 이미지 업로드
                </button>
              )}

              {/* Colors section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: F.inkMuted, letterSpacing: '-0.12px', margin: 0 }}>브랜드 컬러</p>
                {extractingColors && (
                  <span style={{ fontSize: '11px', color: F.inkMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <circle cx="5" cy="5" r="4" fill="none" stroke={F.inkMuted} strokeWidth="1.5" strokeDasharray="6 4" />
                    </svg>
                    로고에서 추출 중…
                  </span>
                )}
                {brandColors.length > 0 && !extractingColors && (
                  <span style={{ fontSize: '11px', color: F.primary, fontWeight: 600 }}>적용됨</span>
                )}
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              {brandLogo && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <button
                    onClick={handleExtractBrandColors}
                    disabled={extractingColors}
                    style={{
                      height: 32, padding: '0 11px', borderRadius: 9,
                      border: `1px solid ${F.hairline}`, backgroundColor: F.surface2,
                      color: extractingColors ? F.inkMuted : F.ink, fontSize: 12, fontWeight: 600,
                      cursor: extractingColors ? 'default' : 'pointer',
                    }}
                  >
                    {extractingColors ? '추출 중...' : '컬러 추출'}
                  </button>
                  <button
                    onClick={handleApplyBrandColors}
                    disabled={extractedBrandColors.length === 0}
                    style={{
                      height: 32, padding: '0 11px', borderRadius: 9, border: 'none',
                      backgroundColor: extractedBrandColors.length > 0 ? F.ink : F.hairlineSoft,
                      color: extractedBrandColors.length > 0 ? '#ffffff' : F.inkMuted,
                      fontSize: 12, fontWeight: 700,
                      cursor: extractedBrandColors.length > 0 ? 'pointer' : 'default',
                    }}
                  >
                    적용하기
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {extractedBrandColors.map((color, i) => (
                  <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <label style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: color, cursor: 'pointer', display: 'block', border: '2px solid rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
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
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: F.inkMuted }}>{color.toUpperCase()}</span>
                  </div>
                ))}
                {extractedBrandColors.length < 5 && (
                  <button
                    onClick={() => setExtractedBrandColors([...extractedBrandColors, '#000000'])}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1.5px dashed ${F.hairline}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: F.inkMuted, fontSize: '20px', lineHeight: 1 }}
                  >
                    +
                  </button>
                )}
                {extractedBrandColors.length === 0 && !brandLogo && (
                  <span style={{ fontSize: 12, color: F.inkMuted }}>로고를 먼저 업로드해 주세요.</span>
                )}
                {extractedBrandColors.length === 0 && brandLogo && !extractingColors && (
                  <span style={{ fontSize: 12, color: F.inkMuted }}>컬러 추출을 누르면 후보 컬러가 표시됩니다.</span>
                )}
              </div>
            </div>
          )}

          {refPanelOpen && (
            <div style={{
              width: '100%', maxWidth: '700px', marginTop: '8px',
              borderRadius: '16px', backgroundColor: F.surface1,
              border: `1px solid ${F.hairline}`, padding: '16px',
            }}>
              <input ref={refImageInputRef} type="file" accept="image/*" onChange={handleRefImageUpload} style={{ display: 'none' }} />
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />

              <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, backgroundColor: F.surface2, marginBottom: 14 }}>
                {([
                  ['planning', '기획서'],
                  ['asis', 'As-is URL'],
                  ['wireframe', '와이어프레임'],
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
                      borderRadius: 9,
                      backgroundColor: sourceTab === key ? F.canvas : 'transparent',
                      color: sourceTab === key ? F.ink : F.inkMuted,
                      boxShadow: sourceTab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: F.ink, letterSpacing: '-0.13px' }}>
                  {sourceTab === 'planning' ? 'PRD · IA · 기획 문서'
                    : sourceTab === 'asis' ? '리디자인할 기존 화면'
                    : sourceTab === 'wireframe' ? '구조로 사용할 와이어프레임'
                    : sourceTab === 'reference' ? '분위기와 패턴 참고자료'
                    : '브랜드 정체성 자료'}
                </div>
                <div style={{ fontSize: 12, color: F.inkMuted, marginTop: 3, lineHeight: 1.45 }}>
                  {sourceTab === 'planning' ? 'PRD 문서나 IA 메뉴구조도를 첨부하면 화면 구조·메뉴·기능을 기획 내용 그대로 구현합니다.'
                    : sourceTab === 'asis' ? '기존 서비스의 정보 구조, 섹션, CTA, 문제점을 분석합니다. 스타일은 가져오지 않고 선택한 design.md를 따릅니다.'
                    : sourceTab === 'wireframe' ? '기획 와이어프레임, 손그림, 피그마 캡처를 올리면 구조를 기준으로 화면을 만듭니다.'
                    : sourceTab === 'reference' ? '좋아하는 이미지나 서비스 URL을 넣으면 무드, 밀도, 레이아웃 리듬만 참고합니다.'
                    : '로고와 컬러를 넣으면 브랜드 요소를 화면에 자연스럽게 반영합니다.'}
                </div>
              </div>

              {sourceTab === 'planning' && (
                <>
                  <input ref={prdFileInputRef} type="file" accept=".txt,.md,.markdown,.pdf" onChange={handlePrdFileUpload} style={{ display: 'none' }} />
                  <input ref={iaImageInputRef} type="file" accept="image/*,.xlsx,.xls" onChange={handleIaImageUpload} style={{ display: 'none' }} />

                  {/* PRD 문서 */}
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: F.inkMuted, marginBottom: '8px', letterSpacing: '-0.12px' }}>PRD 문서</p>
                    {prdDoc ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: F.surface2, border: `1px solid ${F.hairline}` }}>
                        <FileText size={16} color={F.primary} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: F.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prdDocFileName}</div>
                          <div style={{ fontSize: '11px', color: F.inkMuted, marginTop: 2 }}>{prdDoc.length.toLocaleString()}자</div>
                        </div>
                        <button onClick={() => { setPrdDoc(null); setPrdDocFileName(null) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: F.inkMuted, display: 'flex', padding: 2 }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => prdFileInputRef.current?.click()}
                        style={{
                          width: '100%', padding: '14px', borderRadius: '10px',
                          border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                          color: F.inkMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                          letterSpacing: '-0.13px',
                        }}
                      >
                        <Upload size={13} />
                        PRD · 기획 문서 업로드 (.txt, .md)
                      </button>
                    )}
                  </div>

                  {/* IA 메뉴구조도 */}
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: F.inkMuted, marginBottom: '8px', letterSpacing: '-0.12px' }}>IA 메뉴구조도 / 와이어프레임</p>
                    {iaText ? (
                      <div style={{ position: 'relative', borderRadius: '10px', border: `1px solid ${F.hairline}`, backgroundColor: F.surface2, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 22 }}>📊</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: F.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iaImageFileName}</div>
                            <div style={{ fontSize: 11, color: F.inkMuted, marginTop: 2 }}>엑셀 파싱 완료 · {iaText.length.toLocaleString()}자</div>
                          </div>
                          <button onClick={() => { setIaText(null); setIaImageFileName(null) }}
                            style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%', border: 'none', backgroundColor: F.hairline, color: F.inkMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : iaImage ? (
                      <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${F.hairline}`, backgroundColor: F.surface2 }}>
                        <img src={`data:image/png;base64,${iaImage}`} alt="IA" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', display: 'block' }} />
                        <div style={{ position: 'absolute', top: 6, right: 6 }}>
                          <button onClick={() => { setIaImage(null); setIaImageFileName(null) }}
                            style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={12} />
                          </button>
                        </div>
                        {iaImageFileName && (
                          <div style={{ padding: '6px 10px', fontSize: 11, color: F.inkMuted }}>{iaImageFileName}</div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => iaImageInputRef.current?.click()}
                        style={{
                          width: '100%', padding: '14px', borderRadius: '10px',
                          border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                          color: F.inkMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                          letterSpacing: '-0.13px',
                        }}
                      >
                        <Upload size={13} />
                        IA 메뉴구조도 · 이미지 또는 엑셀 업로드
                      </button>
                    )}
                  </div>
                </>
              )}

              {sourceTab === 'asis' && asIsAnalysis && (
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: F.inkMuted, marginBottom: 4 }}>분석 완료</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: F.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {asIsAnalysis.pageTitle || asIsAnalysis.sourceUrl}
                      </div>
                      <div style={{ fontSize: 12, color: F.inkMuted, marginTop: 4 }}>
                        {asIsAnalysis.layoutType} · 섹션 {asIsAnalysis.sections.length}개 · CTA {asIsAnalysis.primaryCtas.length}개
                      </div>
                    </div>
                    <button onClick={clearAsIs} style={{ border: 'none', background: 'none', cursor: 'pointer', color: F.inkMuted, display: 'flex', padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {(sourceTab === 'wireframe' || sourceTab === 'reference') && (
                <button
                  onClick={() => refImageInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px',
                    border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                    color: F.inkMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    marginBottom: '14px', letterSpacing: '-0.13px',
                  }}
                >
                  <Upload size={13} />
                  {sourceTab === 'wireframe' ? '와이어프레임 이미지 업로드' : '참고 이미지 업로드'}
                </button>
              )}

              {sourceTab === 'reference' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                    <span style={{ color: F.inkMuted, fontSize: '11px', letterSpacing: '-0.11px' }}>또는 드리블·앱스토어 검색</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={refSearchQuery}
                      onChange={e => setRefSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRefSearch()}
                      placeholder="예: coffee app, 배달 앱, fitness tracker"
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '10px',
                        border: `1px solid ${F.hairline}`, backgroundColor: F.surface2,
                        color: F.ink, fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                        letterSpacing: '-0.13px',
                      }}
                    />
                    <button
                      onClick={handleRefSearch}
                      disabled={!refSearchQuery.trim() || refSearching}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', flexShrink: 0,
                        border: 'none', cursor: refSearchQuery.trim() && !refSearching ? 'pointer' : 'default',
                        backgroundColor: refSearchQuery.trim() && !refSearching ? F.ink : F.surface2,
                        color: refSearchQuery.trim() && !refSearching ? F.canvas : 'rgba(0,0,0,0.25)',
                        fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px',
                        transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {refSearching ? '검색 중…' : '검색'}
                    </button>
                  </div>
                  {refSearchResults.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                      {refSearchResults.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => handleRefSearchImageSelect(img.url)}
                          title={`${img.title} (${img.source})`}
                          style={{
                            padding: 0, border: `1px solid ${F.hairline}`, borderRadius: '8px',
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
                            padding: '3px 5px', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
                            fontSize: '9px', color: '#fff', textAlign: 'left',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {img.source}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {refSearching && (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: F.inkMuted, fontSize: '12px' }}>
                      드리블 · 앱스토어 검색 중…
                    </div>
                  )}
                </>
              )}

              {sourceTab === 'brand' && (
                <>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: F.inkMuted, marginBottom: '8px', letterSpacing: '-0.12px' }}>로고</p>
                  {brandLogo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, marginBottom: '14px' }}>
                      <img src={brandLogo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} />
                      <span style={{ fontSize: '12px', color: F.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandLogoName}</span>
                      <button onClick={clearBrand} style={{ border: 'none', background: 'none', cursor: 'pointer', color: F.inkMuted, display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '10px', marginBottom: '14px',
                        border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                        color: F.inkMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                        letterSpacing: '-0.13px',
                      }}
                    >
                      <Upload size={13} />
                      로고 이미지 업로드
                    </button>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: F.inkMuted, letterSpacing: '-0.12px', margin: 0 }}>브랜드 컬러</p>
                    {extractingColors && <span style={{ fontSize: '11px', color: F.inkMuted }}>로고에서 추출 중...</span>}
                    {brandColors.length > 0 && !extractingColors && <span style={{ fontSize: '11px', color: F.primary, fontWeight: 600 }}>적용됨</span>}
                  </div>
                  {brandLogo && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <button
                        onClick={handleExtractBrandColors}
                        disabled={extractingColors}
                        style={{
                          height: 32, padding: '0 11px', borderRadius: 9,
                          border: `1px solid ${F.hairline}`, backgroundColor: F.surface2,
                          color: extractingColors ? F.inkMuted : F.ink, fontSize: 12, fontWeight: 600,
                          cursor: extractingColors ? 'default' : 'pointer',
                        }}
                      >
                        {extractingColors ? '추출 중...' : '컬러 추출'}
                      </button>
                      <button
                        onClick={handleApplyBrandColors}
                        disabled={extractedBrandColors.length === 0}
                        style={{
                          height: 32, padding: '0 11px', borderRadius: 9, border: 'none',
                          backgroundColor: extractedBrandColors.length > 0 ? F.ink : F.hairlineSoft,
                          color: extractedBrandColors.length > 0 ? '#ffffff' : F.inkMuted,
                          fontSize: 12, fontWeight: 700,
                          cursor: extractedBrandColors.length > 0 ? 'pointer' : 'default',
                        }}
                      >
                        적용하기
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {extractedBrandColors.map((color, i) => (
                      <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <label style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: color, cursor: 'pointer', display: 'block', border: '2px solid rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
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
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: F.inkMuted }}>{color.toUpperCase()}</span>
                      </div>
                    ))}
                    {extractedBrandColors.length < 5 && (
                      <button
                        onClick={() => setExtractedBrandColors([...extractedBrandColors, '#000000'])}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1.5px dashed ${F.hairline}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: F.inkMuted, fontSize: '20px', lineHeight: 1 }}
                      >
                        +
                      </button>
                    )}
                    {extractedBrandColors.length === 0 && !brandLogo && (
                      <span style={{ fontSize: 12, color: F.inkMuted }}>로고를 먼저 업로드해 주세요.</span>
                    )}
                    {extractedBrandColors.length === 0 && brandLogo && !extractingColors && (
                      <span style={{ fontSize: 12, color: F.inkMuted }}>컬러 추출을 누르면 후보 컬러가 표시됩니다.</span>
                    )}
                  </div>
                </>
              )}

              {(sourceTab === 'asis' || sourceTab === 'reference') && (
                <>
              {sourceTab === 'reference' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                  <span style={{ color: F.inkMuted, fontSize: '11px', letterSpacing: '-0.11px' }}>또는 URL로 캡처</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                </div>
              )}
              {sourceTab === 'asis' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                <span style={{ color: F.inkMuted, fontSize: '11px', letterSpacing: '-0.11px' }}>URL 입력</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
              </div>
              )}

              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={refPageUrlInput}
                  onChange={e => { setRefPageUrlInput(e.target.value); setRefError(null) }}
                  onKeyDown={e => e.key === 'Enter' && (sourceTab === 'asis' ? handleAsIsAnalyze() : handleRefCapture())}
                  placeholder={sourceTab === 'asis' ? '리뉴얼할 기존 서비스 URL (예: company.com)' : '참고할 서비스 URL (예: airbnb.com)'}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '10px',
                    border: refError ? '1px solid rgba(255,80,80,0.5)' : `1px solid ${F.hairline}`,
                    backgroundColor: F.surface2, color: F.ink,
                    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                    letterSpacing: '-0.13px',
                  }}
                />
                <button
                  onClick={sourceTab === 'asis' ? handleAsIsAnalyze : handleRefCapture}
                  disabled={!refPageUrlInput.trim() || refCapturing}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', flexShrink: 0,
                    border: 'none', cursor: refPageUrlInput.trim() && !refCapturing ? 'pointer' : 'default',
                    backgroundColor: refPageUrlInput.trim() && !refCapturing ? F.ink : F.surface2,
                    color: refPageUrlInput.trim() && !refCapturing ? F.canvas : 'rgba(0,0,0,0.25)',
                    fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  <Link2 size={12} />
                  {refCapturing ? (sourceTab === 'asis' ? '분석 중…' : '캡처 중…') : (sourceTab === 'asis' ? '분석하기' : '캡처하기')}
                </button>
              </div>
                </>
              )}
              {refError && (
                <p style={{ color: 'rgba(255,80,80,0.8)', fontSize: '12px', marginTop: '6px', letterSpacing: '-0.12px' }}>
                  {refError}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', letterSpacing: '-0.13px', margin: 0 }}>
              Enter로 전송 · Shift+Enter로 줄바꿈
            </p>
            <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <button
              onClick={() => setGenMdModalOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.85)', fontSize: '13px', letterSpacing: '-0.13px',
                display: 'flex', alignItems: 'center', gap: '5px', padding: 0,
                fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px',
                textDecorationColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <FileText size={12} />
              design.md 없으신가요? URL로 자동 생성하기
            </button>
          </div>

          <button
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            aria-label="Scroll to examples"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '28px',
              transform: 'translateX(-50%)',
              width: '34px',
              height: '54px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.46)',
              backgroundColor: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '10px',
              cursor: 'pointer',
              boxShadow: '0 10px 32px rgba(0,0,0,0.08)',
            }}
          >
            <span
              className="scroll-cue-dot"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'block',
              }}
            />
          </button>
        </main>
      </section>


      {/* History Gallery Section */}
      {historyItems.length > 0 && (
        <section
          id="showcase"
          style={{
            background: 'transparent',
            height: '100vh',
            boxSizing: 'border-box',
            overflow: 'hidden',
            padding: 'clamp(180px, 20vh, 250px) 0 0',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px 40px', textAlign: 'center' }}>
            <h2 style={{
              fontFamily: 'var(--font-poppins), sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(38px, 5.5vw, 72px)',
              lineHeight: 1.1,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              margin: '0 auto 18px',
              maxWidth: '900px',
            }}>
              See What You Can Build
            </h2>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.72)',
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: '620px',
              margin: '0 auto',
            }}>
              Real screens generated from briefs, brand cues, and design systems.
            </p>
          </div>
          <div style={{ height: 'calc(100vh - clamp(380px, 46vh, 500px))', minHeight: '420px', position: 'relative' }}>
            <CircularGallery
              items={(historyItems.some(i => i.itemType === 'board') ? historyItems.filter(i => i.itemType === 'board') : historyItems)
                .filter(i => i.thumbnail)
                .map(i => ({ id: i.id, image: i.thumbnail, text: i.brief, platform: i.platform ?? 'web' }))}
              bend={4}
              textColor="#171719"
              borderRadius={0.025}
              scrollSpeed={2}
              scrollEase={0.05}
              onItemClick={(itemId: string) => setStudioTrigger({ brief: '', historyId: itemId })}
            />
          </div>
        </section>
      )}

      {/* API Key modal */}
      {apiKeyModalOpen && (
        <div
          onClick={() => setApiKeyModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: F.canvas, borderRadius: '20px', padding: '32px', width: '520px', maxWidth: 'calc(100vw - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <KeyRound size={20} color={F.primary} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: F.ink, margin: 0 }}>{activeApiKeyMeta.title}</h2>
            </div>
            <div style={{ display: 'flex', gap: '6px', padding: '4px', borderRadius: '12px', background: F.surface1, margin: '14px 0 16px' }}>
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
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderRadius: '9px',
                      padding: '9px 8px',
                      background: active ? F.canvas : 'transparent',
                      color: active ? F.ink : F.inkMuted,
                      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      fontSize: '13px',
                      fontWeight: active ? 700 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    {API_KEY_META[tab].label}{saved ? ' · 저장됨' : ''}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: '13px', color: F.inkMuted, marginBottom: '20px', lineHeight: 1.6 }}>
              {activeApiKeyMeta.description} 브라우저 localStorage에만 저장됩니다.
            </p>
            <input
              type="password"
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
                width: '100%', boxSizing: 'border-box', borderRadius: '10px',
                border: `1.5px solid ${apiKeyStatus === 'valid' ? '#00BF40' : apiKeyStatus === 'invalid' ? '#FF4242' : F.hairline}`,
                padding: '10px 14px', fontSize: '14px', color: F.ink, outline: 'none',
                fontFamily: 'monospace', marginBottom: apiKeyError ? '8px' : '16px',
                background: apiKeyValidating ? F.surface1 : F.canvas,
              }}
              onFocus={e => { if (apiKeyStatus === 'idle') e.currentTarget.style.borderColor = F.primary }}
              onBlur={e => { if (apiKeyStatus === 'idle') e.currentTarget.style.borderColor = F.hairline }}
            />
            {apiKeyError && (
              <p style={{ fontSize: '12px', color: '#FF4242', margin: '0 0 16px', lineHeight: 1.5 }}>{apiKeyError}</p>
            )}
            {apiKeyStatus === 'valid' && (
              <p style={{ fontSize: '12px', color: '#00BF40', margin: '0 0 16px', lineHeight: 1.5 }}>✓ 저장되었습니다.</p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setApiKeyModalOpen(false)}
                disabled={apiKeyValidating}
                style={{ padding: '9px 18px', borderRadius: '10px', border: `1px solid ${F.hairline}`, background: 'none', fontSize: '14px', cursor: 'pointer', color: F.inkMuted }}
              >
                취소
              </button>
              <button
                onClick={handleValidateAndSave}
                disabled={apiKeyValidating || !activeApiKeyInput.trim()}
                style={{
                  padding: '9px 18px', borderRadius: '10px', border: 'none',
                  background: apiKeyValidating || !activeApiKeyInput.trim() ? F.hairline : F.primary,
                  color: apiKeyValidating || !activeApiKeyInput.trim() ? F.inkMuted : '#fff',
                  fontSize: '14px', fontWeight: 600,
                  cursor: apiKeyValidating || !activeApiKeyInput.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {apiKeyValidating ? (apiKeyTab === 'gemini' ? '검증 중...' : '저장 중...') : apiKeyTab === 'gemini' ? '검증 후 저장' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyModalOpen && (
        <div
          onClick={() => setHistoryModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '680px', maxHeight: '80vh',
              borderRadius: '20px', backgroundColor: F.canvas,
              border: `1px solid ${F.hairline}`,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '16px 24px 0', borderBottom: `1px solid ${F.hairlineSoft}`,
              display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color={F.inkMuted} />
                  <span style={{ color: F.ink, fontSize: '15px', fontWeight: 600, letterSpacing: '-0.3px' }}>히스토리</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {historyItems.filter(h => historyMatchesTab(h, historyModalTab)).length > 0 && (
                    <button
                      onClick={() => {
                        const toDelete = historyItems.filter(h => historyMatchesTab(h, historyModalTab))
                        Promise.all(toDelete.map(h => deleteHistoryItem(h.id))).then(() => {
                          setHistoryItems(prev => prev.filter(h => !historyMatchesTab(h, historyModalTab)))
                        })
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(200,50,50,0.6)', fontSize: '12px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        letterSpacing: '-0.12px', padding: '2px 0', fontFamily: 'inherit',
                      }}
                    >
                      <Trash2 size={11} />
                      탭 삭제
                    </button>
                  )}
                  <button
                    onClick={() => setHistoryModalOpen(false)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: F.inkMuted, display: 'flex', alignItems: 'center',
                      padding: '4px', borderRadius: '6px', fontFamily: 'inherit',
                      fontSize: '18px', lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['board', 'variant', 'design'] as const).map(tab => {
                  const label = tab === 'board' ? '대지' : tab === 'variant' ? '시안' : '디자인'
                  const count = historyItems.filter(h => historyMatchesTab(h, tab)).length
                  const isActive = historyModalTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => setHistoryModalTab(tab)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '13px', fontWeight: isActive ? 600 : 400,
                        color: isActive ? F.ink : F.inkMuted,
                        padding: '6px 12px', borderRadius: '8px 8px 0 0',
                        borderBottom: isActive ? `2px solid ${F.ink}` : '2px solid transparent',
                        letterSpacing: '-0.13px', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                      {count > 0 && (
                        <span style={{
                          fontSize: '10px', fontWeight: 500,
                          color: isActive ? 'rgba(0,0,0,0.5)' : F.inkMuted,
                          backgroundColor: isActive ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.04)',
                          borderRadius: '100px', padding: '1px 5px',
                        }}>{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {(() => {
                const filteredItems = historyItems.filter(h => historyMatchesTab(h, historyModalTab))
                const emptyLabel = historyModalTab === 'board'
                  ? '아직 저장된 대지가 없습니다'
                  : historyModalTab === 'variant'
                    ? '아직 생성한 시안이 없습니다'
                    : '아직 완성한 디자인이 없습니다'
                return filteredItems.length === 0 ? (
                <div style={{
                  padding: '64px 24px', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                }}>
                  <Clock size={28} color={F.inkMuted} />
                  <p style={{ color: F.inkMuted, fontSize: '14px', letterSpacing: '-0.14px', margin: 0 }}>
                    {emptyLabel}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: '14px', overflow: 'hidden',
                        backgroundColor: F.surface1, border: `1px solid ${F.hairline}`,
                        display: 'flex', flexDirection: 'column',
                        boxShadow: 'rgba(0, 0, 0, 0.04) 0 2px 6px',
                      }}
                    >
                      <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden', flexShrink: 0, backgroundColor: F.surface2 }}>
                        {(() => {
                          // 디자인 탭: 프로토타입 썸네일 우선, 시안 탭: 첫 시안 이미지 우선
                          const thumbSrc = historyModalTab === 'design' && item.board?.prototypeThumbnail
                            ? item.board.prototypeThumbnail
                            : historyModalTab === 'variant'
                            ? (item.board?.mainVariants?.find(v => v?.image)?.image ?? item.thumbnail)
                            : item.thumbnail
                          return (
                            <img
                              src={thumbSrc}
                              alt={item.brief}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                            />
                          )
                        })()}
                      </div>
                      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{
                          color: 'rgba(0,0,0,0.8)', fontSize: '13px', lineHeight: 1.4,
                          letterSpacing: '-0.13px', margin: 0,
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        } as React.CSSProperties}>
                          {item.brief}
                        </p>
                        {(() => {
                          const variantCount = item.board?.mainVariants?.filter(Boolean).length ?? 0
                          const hasPrototype = !!item.board?.prototypeHtml
                          const tags: { label: string; accent?: boolean; muted?: boolean }[] = []
                          if (item.itemType === 'board') {
                            if (item.board?.designSystemName) tags.push({ label: item.board.designSystemName })
                            if (variantCount > 0) tags.push({ label: `${variantCount} 시안` })
                            if (hasPrototype) tags.push({ label: 'Prototype', accent: true })
                          } else if (item.itemType === 'variant') {
                            tags.push({ label: '시안', muted: true })
                          }
                          return tags.length > 0 ? (
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {tags.map(({ label, accent, muted }) => (
                                <span key={label} style={{
                                  fontSize: '10px', fontWeight: 600, borderRadius: '100px', padding: '2px 7px', letterSpacing: '-0.1px',
                                  color: accent ? '#0066FF' : muted ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.72)',
                                  backgroundColor: accent ? 'rgba(0,85,255,0.08)' : 'rgba(0,0,0,0.045)',
                                }}>
                                  {label}
                                </span>
                              ))}
                            </div>
                          ) : null
                        })()}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {item.preset && item.preset in DESIGN_PRESETS && (
                              <span style={{
                                fontSize: '10px', fontWeight: 500,
                                color: DESIGN_PRESETS[item.preset as DesignPreset].color,
                                backgroundColor: `${DESIGN_PRESETS[item.preset as DesignPreset].color}18`,
                                borderRadius: '100px', padding: '2px 7px',
                                border: `1px solid ${DESIGN_PRESETS[item.preset as DesignPreset].color}30`,
                                letterSpacing: '-0.1px',
                              }}>
                                {DESIGN_PRESETS[item.preset as DesignPreset].label}
                              </span>
                            )}
                            <span style={{ color: F.inkMuted, fontSize: '10px', letterSpacing: '-0.1px' }}>
                              {relativeTime(item.createdAt)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={() => { deleteHistoryItem(item.id).then(() => setHistoryItems(h => h.filter(x => x.id !== item.id))) }}
                              style={{
                                width: '28px', height: '28px', borderRadius: '6px',
                                border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                                color: F.inkMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,50,50,0.8)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,80,80,0.1)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = F.inkMuted; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                            >
                              <Trash2 size={12} />
                            </button>
                            <button
                              onClick={() => {
                                setHistoryModalOpen(false)
                                setStudioTrigger({ brief: '', historyId: item.id })
                              }}
                              style={{
                                width: '28px', height: '28px', borderRadius: '6px',
                                border: 'none', backgroundColor: 'rgba(0,0,0,0.04)', cursor: 'pointer',
                                color: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.08)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.04)' }}
                            >
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
