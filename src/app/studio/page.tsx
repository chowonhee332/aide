'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  Sparkles, Upload, Download, RefreshCw, ArrowLeft, Check,
  SlidersHorizontal, X, Moon, Sun, Pencil, Send, ChevronDown,
  CornerUpLeft, CornerUpRight, Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import DotField from '@/components/DotField'
import type { Question, QuestionnaireResponse, TweakSpec, TweakVariable } from '@/lib/gemini'
import { type DesignPreset, DESIGN_PRESETS } from '@/lib/design-presets'
import { saveHistoryItem, compressThumbnail, loadHistory } from '@/lib/history'

// ─── Airbnb design tokens ────────────────────────────────────────────────────
const F = {
  canvas: '#ffffff', surface1: '#f7f7f7', surface2: '#f2f2f2',
  ink: '#222222', inkMuted: '#6a6a6a', inkSubtle: '#b0b0b0',
  primary: '#ff385c', primaryActive: '#e00b41',
  hairline: '#dddddd', hairlineSoft: '#ebebeb',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

interface GenerateResult { html: string; image: string }

interface ElementStyles {
  tagName: string; text: string
  fontFamily: string; fontSize: string; fontWeight: string
  color: string; textAlign: string; lineHeight: string; letterSpacing: string
  width: string; height: string; opacity: string
  paddingTop: string; paddingRight: string; paddingBottom: string; paddingLeft: string
  marginTop: string; marginRight: string; marginBottom: string; marginLeft: string
  borderWidth: string; borderRadius: string; backgroundColor: string
}

// ─── Inspector script injected into generated HTML ───────────────────────────

// Always injected: handles dark mode, brand color, navigation (no inspector UI)
const BRIDGE_SCRIPT = `<script>
(function(){
  window.addEventListener('message',function(e){
    if(!e.data)return;
    var d=e.data;
    if(d.type==='aide:dark'){document.documentElement.style.filter=d.on?'invert(1) hue-rotate(180deg)':'';}
    if(d.type==='aide:brand'){var r=document.documentElement;r.style.setProperty('--color-primary',d.color);r.style.setProperty('--primary',d.color);}
  });
})();
</script>`

// Only injected in edit mode: adds inspector selection UI + style update handling
const INSPECTOR_SCRIPT = `<script>
(function(){
  var sel=null;
  var sb=document.createElement('div');
  sb.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;outline:2px solid #0055ff;outline-offset:0;box-sizing:border-box;border-radius:2px;transition:all 80ms ease;display:none';
  var hb=document.createElement('div');
  hb.style.cssText='position:fixed;pointer-events:none;z-index:2147483646;background:rgba(0,85,255,0.07);box-sizing:border-box;transition:all 50ms ease';
  document.body.appendChild(sb);document.body.appendChild(hb);
  function box(el,div){var r=el.getBoundingClientRect();div.style.left=r.left+'px';div.style.top=r.top+'px';div.style.width=r.width+'px';div.style.height=r.height+'px';}
  function report(el){
    var cs=getComputedStyle(el),r=el.getBoundingClientRect();
    parent.postMessage({type:'aide:select',styles:{tagName:el.tagName.toLowerCase(),text:(el.textContent||'').trim().slice(0,80),fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,color:cs.color,textAlign:cs.textAlign,lineHeight:cs.lineHeight,letterSpacing:cs.letterSpacing,width:Math.round(r.width)+'px',height:Math.round(r.height)+'px',opacity:cs.opacity,paddingTop:cs.paddingTop,paddingRight:cs.paddingRight,paddingBottom:cs.paddingBottom,paddingLeft:cs.paddingLeft,marginTop:cs.marginTop,marginRight:cs.marginRight,marginBottom:cs.marginBottom,marginLeft:cs.marginLeft,borderWidth:cs.borderWidth,borderRadius:cs.borderRadius,backgroundColor:cs.backgroundColor}},'*');
  }
  document.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();sel=e.target;sb.style.display='block';box(sel,sb);report(sel);},true);
  document.addEventListener('mouseover',function(e){if(e.target!==sel)box(e.target,hb);},true);
  window.addEventListener('message',function(e){
    if(!e.data)return;
    var d=e.data;
    if(d.type==='aide:update'&&sel){sel.style[d.prop]=d.value;report(sel);}
    if(d.type==='aide:navigate'){sel=null;sb.style.display='none';}
  });
})();
</script>`

function injectBridge(html: string): string {
  if (html.includes('</body>')) return html.replace('</body>', BRIDGE_SCRIPT + '</body>')
  return html + BRIDGE_SCRIPT
}

function injectInspector(html: string): string {
  const withBridge = injectBridge(html)
  if (withBridge.includes('</body>')) return withBridge.replace('</body>', INSPECTOR_SCRIPT + '</body>')
  return withBridge + INSPECTOR_SCRIPT
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return rgb
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
}

function fmtVal(v: string): string {
  const n = parseFloat(v)
  if (isNaN(n)) return v
  return (Math.round(n * 10) / 10).toString()
}

function formatVarDisplay(value: number, v: TweakVariable): string {
  if (v.unit === '%') return `${value}%`
  if (value >= 1000) return `${value.toLocaleString('ko-KR')}${v.unit}`
  return `${value}${v.unit}`
}


async function resizeLogo(file: File): Promise<string> {
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const maxW = 300
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png', 0.85))
    }
    img.src = url
  })
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [step, setStep] = useState<Step>(1)
  const [platform, setPlatform] = useState<'mobile' | 'web'>('mobile')
  const [designPreset, setDesignPreset] = useState<DesignPreset>('none')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [logoLoading, setLogoLoading] = useState(false)
  const [brandColors, setBrandColors] = useState<string[]>([])
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [brief, setBrief] = useState('')

  const apiHeaders = useCallback((): Record<string, string> => {
    const key = typeof window !== 'undefined' ? (localStorage.getItem('aide_gemini_api_key') ?? '') : ''
    return { 'Content-Type': 'application/json', ...(key && { 'x-gemini-key': key }) }
  }, [])

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireResponse | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingB, setIsGeneratingB] = useState(false)
  const [isGeneratingC, setIsGeneratingC] = useState(false)
  const [isExpandingPrototype, setIsExpandingPrototype] = useState(false)
  const [mainVariants, setMainVariants] = useState<[GenerateResult|null, GenerateResult|null, GenerateResult|null]>([null, null, null])
  const [pickedVariantIdx, setPickedVariantIdx] = useState<0|1|2|null>(null)
  const [generateError, setGenerateError] = useState('')
  const [expandedVariant, setExpandedVariant] = useState<{ image: string; letter: string } | null>(null)
  const generationIdRef = useRef(0)
  const bgFetchAbortRef = useRef<AbortController | null>(null)
  const tweakRequestHtmlRef = useRef<string | null>(null)

  // Screen navigation (step 4)
  const [screens, setScreens] = useState<Array<{ id: string; label: string }>>([])
  const [activeScreenId, setActiveScreenId] = useState('')

  // A/B variants
  const [variants, setVariants] = useState<[GenerateResult | null, GenerateResult | null]>([null, null])
  const [activeVariant, setActiveVariant] = useState<0 | 1>(0)
  const [tweakSpecA, setTweakSpecA] = useState<TweakSpec | null>(null)
  const [tweakSpecB, setTweakSpecB] = useState<TweakSpec | null>(null)
  const [isAnalyzingTweakA, setIsAnalyzingTweakA] = useState(false)
  const [isAnalyzingTweakB, setIsAnalyzingTweakB] = useState(false)

  // Derived from active variant
  const result = variants[activeVariant]
  const tweakSpec = activeVariant === 0 ? tweakSpecA : tweakSpecB
  const isAnalyzingTweaks = activeVariant === 0 ? isAnalyzingTweakA : isAnalyzingTweakB

  // Editor state
  const [selectedStyles, setSelectedStyles] = useState<ElementStyles | null>(null)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [creonOpen, setCreonOpen] = useState(false)
  const [creonAsset, setCreonAsset] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [brandColor, setBrandColor] = useState('#ff385c')
  const [debouncedBrandColor, setDebouncedBrandColor] = useState('#ff385c')
  const brandDebounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Share / zoom UI state
  const [shareOpen, setShareOpen] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [zoom, setZoom] = useState(60)
  const [copyLinkDone, setCopyLinkDone] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)

  // Per-variant undo/redo history
  const [historyA, setHistoryA] = useState<string[]>([])
  const [historyIndexA, setHistoryIndexA] = useState(-1)
  const [historyB, setHistoryB] = useState<string[]>([])
  const [historyIndexB, setHistoryIndexB] = useState(-1)

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Tweaks spec (variables + states)
  const [activeStateId, setActiveStateId] = useState('typical')
  const [varValues, setVarValues] = useState<Record<string, number>>({})
  const varUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detect device type from answers + platform state
  const answerStr = Object.values(answers).map(v => Array.isArray(v) ? v.join('') : v).join('')
  const isTablet = platform !== 'web' && (answerStr.includes('태블릿') || answerStr.includes('iPad'))
  const isMobile = platform !== 'web' && !isTablet && !answerStr.includes('웹') && !answerStr.includes('데스크탑')

  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 })
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const selectedCardRef = useRef<string | null>(null)
  const canvasZoomRef = useRef(1)
  const canvasPanRef = useRef({ x: 0, y: 0 })
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const canvasTransformRef = useRef<HTMLDivElement>(null)
  const spaceDownRef = useRef(false)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 })

  const activeHistory = activeVariant === 0 ? historyA : historyB
  const activeHistoryIndex = activeVariant === 0 ? historyIndexA : historyIndexB
  const canUndo = activeHistoryIndex > 0
  const canRedo = activeHistoryIndex < activeHistory.length - 1

  // Computed HTML with state + variable replacements applied
  const displayHtml = useMemo(() => {
    if (!result?.html) return ''
    let html = result.html
    if (tweakSpec) {
      const state = tweakSpec.states.find(s => s.id === activeStateId)
      state?.replacements.forEach(r => { html = html.split(r.from).join(r.to) })
      tweakSpec.variables.forEach(v => {
        const val = varValues[v.id] ?? v.currentValue
        if (val !== v.currentValue) {
          const newDisplay = formatVarDisplay(val, v)
          v.currentDisplayStrings.forEach(pattern => {
            html = html.split(pattern).join(newDisplay)
          })
        }
      })
    }
    // 브랜드 컬러: HTML에 하드코딩된 hex를 교체 (CSS 변수를 안 쓰는 경우 대응)
    const origPrimary = html.match(/--color-primary:\s*(#[0-9a-fA-F]{3,8})/i)?.[1]?.toLowerCase()
    if (origPrimary && debouncedBrandColor.toLowerCase() !== origPrimary) {
      html = html.split(origPrimary).join(debouncedBrandColor.toLowerCase())
    }
    return editMode ? injectInspector(html) : injectBridge(html)
  }, [result, tweakSpec, activeStateId, varValues, debouncedBrandColor, editMode])

  // Auto-start from landing page URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Load from history
    const historyId = params.get('historyId')
    if (historyId) {
      const item = loadHistory().find(h => h.id === historyId)
      if (item) {
        setBrief(item.brief)
        if (item.preset && item.preset in DESIGN_PRESETS) setDesignPreset(item.preset as DesignPreset)
        const result: GenerateResult = { html: item.html, image: item.thumbnail }
        setVariants([result, null])
        setActiveVariant(0)
        setHistoryA([item.html]); setHistoryIndexA(0)
        setHistoryB([]); setHistoryIndexB(-1)
        const extractedColor = item.html.match(/--color-primary:\s*(#[0-9a-fA-F]{3,8})/i)?.[1] ?? '#0055ff'
        setBrandColor(extractedColor); setDebouncedBrandColor(extractedColor)
        setZoom(60)
        setStep(4)
      }
      return
    }

    const briefParam = params.get('brief')
    const presetParam = params.get('preset')
    const platformParam = params.get('platform')
    if (!briefParam) return

    const preset: DesignPreset = (presetParam && presetParam in DESIGN_PRESETS)
      ? presetParam as DesignPreset
      : 'none'

    setBrief(briefParam)
    if (preset !== 'none') setDesignPreset(preset)
    if (platformParam === 'web' || platformParam === 'mobile') setPlatform(platformParam)

    const brandLogoFromStorage = sessionStorage.getItem('brandLogo')
    if (brandLogoFromStorage) setLogoDataUrl(brandLogoFromStorage)

    const brandColorsFromStorage = sessionStorage.getItem('brandColors')
    if (brandColorsFromStorage) {
      try { setBrandColors(JSON.parse(brandColorsFromStorage)) } catch { /* ignore */ }
    }

    const effectiveDesignMd = DESIGN_PRESETS[preset].md
    setIsAnalyzing(true)
    setAnalyzeError('')
    fetch('/api/analyze', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ designMd: effectiveDesignMd, brief: briefParam, platform: platformParam }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setQuestionnaire(data)
        setAnswers({})
        setStep(2)
      })
      .catch(err => setAnalyzeError(err instanceof Error ? err.message : '오류가 발생했습니다'))
      .finally(() => setIsAnalyzing(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Keep refs in sync for wheel handler
  useEffect(() => { canvasZoomRef.current = canvasZoom }, [canvasZoom])
  useEffect(() => { canvasPanRef.current = canvasPan }, [canvasPan])
  useEffect(() => { selectedCardRef.current = selectedCard }, [selectedCard])

  // Canvas zoom/pan (step 3)
  useEffect(() => {
    if (step !== 3) return
    const el = canvasAreaRef.current
    if (!el) return
    const applyTransform = (pan: { x: number; y: number }, zoom: number) => {
      const t = canvasTransformRef.current
      if (t) t.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`
    }
    const onWheel = (e: WheelEvent) => {
      if (selectedCardRef.current) {
        const scrollEl = (e.target as Element).closest('[data-card-scroll]') as HTMLElement | null
        if (scrollEl) {
          e.preventDefault()
          scrollEl.scrollTop += e.deltaY
          scrollEl.scrollLeft += e.deltaX
          return
        }
      }
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        const curZoom = canvasZoomRef.current
        const curPan = canvasPanRef.current
        const newZoom = Math.min(Math.max(curZoom * factor, 0.2), 4)
        const newPan = {
          x: mouseX - (mouseX - curPan.x) * (newZoom / curZoom),
          y: mouseY - (mouseY - curPan.y) * (newZoom / curZoom),
        }
        canvasZoomRef.current = newZoom
        canvasPanRef.current = newPan
        applyTransform(newPan, newZoom)
      } else {
        const newPan = { x: canvasPanRef.current.x - e.deltaX, y: canvasPanRef.current.y - e.deltaY }
        canvasPanRef.current = newPan
        applyTransform(newPan, canvasZoomRef.current)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [step])

  // Spacebar pan: hold space → grab cursor, drag → pan canvas
  useEffect(() => {
    if (step !== 3) return
    const el = canvasAreaRef.current
    if (!el) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !spaceDownRef.current && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        spaceDownRef.current = true
        el.style.cursor = 'grab'
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false
        isPanningRef.current = false
        el.style.cursor = ''
      }
    }
    const onMouseDown = (e: MouseEvent) => {
      if (!spaceDownRef.current) return
      e.preventDefault()
      isPanningRef.current = true
      panStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, panX: canvasPanRef.current.x, panY: canvasPanRef.current.y }
      el.style.cursor = 'grabbing'
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return
      const dx = e.clientX - panStartRef.current.mouseX
      const dy = e.clientY - panStartRef.current.mouseY
      const newPan = { x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy }
      canvasPanRef.current = newPan
      const t = canvasTransformRef.current
      if (t) t.style.transform = `translate(${newPan.x}px,${newPan.y}px) scale(${canvasZoomRef.current})`
    }
    const onMouseUp = () => {
      if (!isPanningRef.current) return
      isPanningRef.current = false
      el.style.cursor = spaceDownRef.current ? 'grab' : ''
      // sync React state once at drag end so other logic stays consistent
      setCanvasPan({ ...canvasPanRef.current })
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [step])

  // Listen for messages from iframe and Creon panel
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data) return
      if (e.data.type === 'aide:select') setSelectedStyles(e.data.styles)
      if (e.data.type === 'aide:screens') { setScreens(e.data.screens ?? []); if (e.data.screens?.[0]) setActiveScreenId(e.data.screens[0].id) }
      if (e.data.type === 'aide:screen') setActiveScreenId(e.data.id)
      if (e.data.type === 'creon:asset') {
        const url: string = e.data.url || e.data.dataUrl
        if (url) setCreonAsset(url)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const sendToIframe = useCallback((msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*')
  }, [])

  const handleUndo = useCallback(() => {
    if (activeVariant === 0) {
      if (historyIndexA <= 0) return
      const idx = historyIndexA - 1
      setHistoryIndexA(idx)
      setVariants(prev => {
        const u = [...prev] as [GenerateResult | null, GenerateResult | null]
        if (u[0]) u[0] = { ...u[0], html: historyA[idx] }
        return u
      })
    } else {
      if (historyIndexB <= 0) return
      const idx = historyIndexB - 1
      setHistoryIndexB(idx)
      setVariants(prev => {
        const u = [...prev] as [GenerateResult | null, GenerateResult | null]
        if (u[1]) u[1] = { ...u[1], html: historyB[idx] }
        return u
      })
    }
    setSelectedStyles(null)
  }, [activeVariant, historyIndexA, historyIndexB, historyA, historyB])

  const handleRedo = useCallback(() => {
    if (activeVariant === 0) {
      if (historyIndexA >= historyA.length - 1) return
      const idx = historyIndexA + 1
      setHistoryIndexA(idx)
      setVariants(prev => {
        const u = [...prev] as [GenerateResult | null, GenerateResult | null]
        if (u[0]) u[0] = { ...u[0], html: historyA[idx] }
        return u
      })
    } else {
      if (historyIndexB >= historyB.length - 1) return
      const idx = historyIndexB + 1
      setHistoryIndexB(idx)
      setVariants(prev => {
        const u = [...prev] as [GenerateResult | null, GenerateResult | null]
        if (u[1]) u[1] = { ...u[1], html: historyB[idx] }
        return u
      })
    }
    setSelectedStyles(null)
  }, [activeVariant, historyIndexA, historyIndexB, historyA, historyB])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false)
      if (zoomRef.current && !zoomRef.current.contains(e.target as Node)) setZoomOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    if (step !== 4) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [step, handleUndo, handleRedo])

  const handleStyleUpdate = useCallback((prop: string, value: string) => {
    sendToIframe({ type: 'aide:update', prop, value })
  }, [sendToIframe])


  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoLoading(true)
    try {
      const dataUrl = await resizeLogo(file)
      setLogoDataUrl(dataUrl)
    } finally {
      setLogoLoading(false)
      e.target.value = ''
    }
  }, [])

  const handleAnalyze = async () => {
    if (!brief.trim()) return
    const effectiveDesignMd = DESIGN_PRESETS[designPreset].md
    setIsAnalyzing(true)
    setAnalyzeError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ designMd: effectiveDesignMd, brief, platform }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuestionnaire(data)
      setAnswers({})
      setStep(2)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAnswer = useCallback((questionId: string, value: string, type: 'single' | 'multi' | 'text') => {
    setAnswers(prev => {
      if (type === 'single') {
        if (prev[questionId] === value) { const { [questionId]: _, ...rest } = prev; return rest }
        return { ...prev, [questionId]: value }
      }
      if (type === 'multi') {
        const current = (prev[questionId] as string[]) ?? []
        const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
        return { ...prev, [questionId]: updated }
      }
      return { ...prev, [questionId]: value }
    })
  }, [])

  const handleGenerate = async () => {
    if (!questionnaire) return
    const effectiveDesignMd = DESIGN_PRESETS[designPreset].md
    setIsGenerating(true)
    setIsGeneratingB(false)
    setIsGeneratingC(false)
    setGenerateError('')
    setMainVariants([null, null, null])
    setStep(3)
    const genId = ++generationIdRef.current
    try {
      const referenceImageBase64 = sessionStorage.getItem('referenceImage') ?? undefined
      const modelId = sessionStorage.getItem('aide_model') ?? undefined
      const baseParams = { designMd: effectiveDesignMd, brief, answers, projectSummary: questionnaire.projectSummary, logoDataUrl, brandColors: brandColors.length > 0 ? brandColors : undefined, mainOnly: true, referenceImageBase64, platform, modelId }
      const variantStyles = [
        `클래식/카드형 (시안 A):
- 레이아웃: 흰색 배경에 그림자 있는 카드(box-shadow: 0 2px 8px rgba(0,0,0,0.08)) 그리드
- 핵심 KPI: 섹션 내 52px bold, primary 색상, 아래 보조 텍스트 13px gray
- 상단 헤더: 흰색 배경, 브랜드명 + 알림 아이콘, 아래 얇은 구분선
- 섹션 제목: 15px, font-weight 600, #222
- 카드 내부 패딩: 20px
- 진행 상태 바/링: primary 색상, 배경은 primary 10% 투명도
- 전체 분위기: 신뢰감 있고 정보가 명확하게 계층화된 클래식 앱`,

        `볼드/히어로형 (시안 B):
- 최상단 히어로 카드: primary 배경색, 흰 텍스트, 핵심 KPI 64px font-weight:800, 히어로 카드 border-radius:20px, box-shadow: 0 12px 32px rgba(0,0,0,0.15)
- 히어로 카드 내부: KPI 숫자 압도적으로 크게 + 목표 대비 진행률 바 (흰색 배경 20% 투명도)
- 나머지 카드: 흰색 배경, 섀도우 있는 elevated 카드
- 섹션 제목: 17px semibold, 카드 간 간격 16px
- 하단 탭바: 흰색 배경, 그림자 있음, 활성 아이콘 primary 색
- 전체 분위기: 임팩트 있고 KPI가 화면을 지배하는 Bold 레이아웃`,

        `미니멀/타이포형 (시안 C):
- 배경: #fafafa 아주 연한 회색
- 헤더: 로고/앱명 20px bold, 날짜 13px gray, 패딩 20px
- KPI: 56px font-weight:800, color: #111, 바로 아래 단위/설명 12px gray (컬러 최소화)
- 카드: border: 1px solid #e8e8e8, border-radius:16px, box-shadow: 0 1px 4px rgba(0,0,0,0.06), 배경 흰색
- 섹션 간 여백: 28px, 카드 내부 패딩: 22px
- primary 색상은 진행바·active 탭 아이콘 2-3개에만 제한 사용
- 전체 분위기: 군더더기 없는 미니멀, 타이포그래피가 주인공`,
      ]
      const headers = apiHeaders()

      const saveVariantHistory = (result: GenerateResult) => {
        if (result.image) {
          compressThumbnail(result.image).then(thumbnail => {
            saveHistoryItem({
              brief,
              preset: designPreset !== 'none' ? designPreset : null,
              designMdFileName: sessionStorage.getItem('designMdFileName') ?? null,
              html: result.html,
              thumbnail,
            })
          })
        }
      }

      // 시안 A 먼저 생성
      const resA = await fetch('/api/generate', { method: 'POST', headers, body: JSON.stringify({ ...baseParams, variantStyle: variantStyles[0] }) })
      const jsonA = await resA.json()
      if (jsonA.error) throw new Error(jsonA.error)

      if (generationIdRef.current !== genId) return
      setMainVariants([jsonA as GenerateResult, null, null])
      saveVariantHistory(jsonA as GenerateResult)

      // 시안 B (3초 딜레이), 완료 후 시안 C 순차 생성
      bgFetchAbortRef.current?.abort()
      const abort = new AbortController()
      bgFetchAbortRef.current = abort

      setTimeout(async () => {
        if (generationIdRef.current !== genId || abort.signal.aborted) return
        try {
          setIsGeneratingB(true)
          const resB = await fetch('/api/generate', { method: 'POST', headers, body: JSON.stringify({ ...baseParams, variantStyle: variantStyles[1] }), signal: abort.signal })
          const jsonB = await resB.json()
          setIsGeneratingB(false)
          if (generationIdRef.current !== genId || abort.signal.aborted) return
          if (!jsonB.error) {
            setMainVariants(prev => [prev[0], jsonB as GenerateResult, prev[2]])
            saveVariantHistory(jsonB as GenerateResult)
            setIsGeneratingC(true)
            try {
              const resC = await fetch('/api/generate', { method: 'POST', headers, body: JSON.stringify({ ...baseParams, variantStyle: variantStyles[2] }), signal: abort.signal })
              const jsonC = await resC.json()
              if (generationIdRef.current === genId && !abort.signal.aborted && !jsonC.error) {
                setMainVariants(prev => [prev[0], prev[1], jsonC as GenerateResult])
                saveVariantHistory(jsonC as GenerateResult)
              }
            } finally {
              setIsGeneratingC(false)
            }
          }
        } catch (e) {
          if ((e as Error)?.name !== 'AbortError') {
            setIsGeneratingB(false)
            setIsGeneratingC(false)
          }
        }
      }, 3000)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePickVariant = async (idx: 0|1|2) => {
    const chosen = mainVariants[idx]
    if (!chosen || !questionnaire) return
    bgFetchAbortRef.current?.abort()
    bgFetchAbortRef.current = null
    setIsGeneratingB(false); setIsGeneratingC(false)
    const effectiveDesignMd = DESIGN_PRESETS[designPreset].md
    setIsExpandingPrototype(true)
    setPickedVariantIdx(idx)
    setGenerateError('')
    try {
      const res = await fetch('/api/expand', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          mainHtml: chosen.html,
          designMd: effectiveDesignMd,
          brief,
          answers,
          projectSummary: questionnaire.projectSummary,
          logoDataUrl,
          brandColors: brandColors.length > 0 ? brandColors : undefined,
          platform,
          modelId: sessionStorage.getItem('aide_model') ?? undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setVariants([data, null])
      setActiveVariant(0)
      setSelectedStyles(null)
      setTweakSpecA(null); setTweakSpecB(null)
      setIsAnalyzingTweakA(false); setIsAnalyzingTweakB(false)
      setActiveStateId('typical')
      setVarValues({})
      setScreens([]); setActiveScreenId('')
      const extractedColor = (data.html as string).match(/--color-primary:\s*(#[0-9a-fA-F]{3,8})/i)?.[1] ?? '#ff385c'
      setBrandColor(extractedColor); setDebouncedBrandColor(extractedColor)
      setHistoryA([data.html]); setHistoryIndexA(0)
      setHistoryB([]); setHistoryIndexB(-1)
      setZoom(isMobile ? 100 : isTablet ? 70 : 60)
      setStep(4)

      const headers = apiHeaders()
      const requestedHtml = data.html
      tweakRequestHtmlRef.current = requestedHtml
      setIsAnalyzingTweakA(true)
      fetch('/api/analyze-tweaks', { method: 'POST', headers, body: JSON.stringify({ html: requestedHtml, brief }) })
        .then(r => r.json())
        .then(spec => {
          if (tweakRequestHtmlRef.current !== requestedHtml) return
          setTweakSpecA(spec.variables || spec.states ? spec : null)
          if (spec.variables?.length) {
            const defaults: Record<string, number> = {}
            spec.variables.forEach((v: TweakVariable) => { defaults[v.id] = v.currentValue })
            setVarValues(defaults)
          }
        })
        .catch(() => { if (tweakRequestHtmlRef.current === requestedHtml) setTweakSpecA(null) })
        .finally(() => { if (tweakRequestHtmlRef.current === requestedHtml) setIsAnalyzingTweakA(false) })
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsExpandingPrototype(false)
    }
  }

  const handleReset = () => {
    tweakRequestHtmlRef.current = null
    setStep(1); setVariants([null, null]); setActiveVariant(0); setQuestionnaire(null)
    setAnswers({}); setGenerateError(''); setAnalyzeError('')
    setSelectedStyles(null); setDarkMode(false); setBrandColor('#ff385c'); setDebouncedBrandColor('#ff385c')
    setTweakSpecA(null); setTweakSpecB(null)
    setIsAnalyzingTweakA(false); setIsAnalyzingTweakB(false)
    setActiveStateId('typical'); setVarValues({})
    setEditMode(false); setChatMessages([]); setChatInput('')
    setHistoryA([]); setHistoryIndexA(-1); setHistoryB([]); setHistoryIndexB(-1)
    setShareOpen(false); setZoomOpen(false); setZoom(60)
    setDesignPreset('none'); setLogoDataUrl(null); setLogoLoading(false); setBrandColors([])
    setMainVariants([null, null, null]); setPickedVariantIdx(null)
    setIsGeneratingB(false); setIsGeneratingC(false); setIsExpandingPrototype(false)
    setScreens([]); setActiveScreenId('')
    bgFetchAbortRef.current?.abort()
    bgFetchAbortRef.current = null
    ++generationIdRef.current
  }

  const handleRetryVariant = async (idx: 1 | 2) => {
    if (!questionnaire) return
    const effectiveDesignMd = DESIGN_PRESETS[designPreset].md
    const baseParams = { designMd: effectiveDesignMd, brief, answers, projectSummary: questionnaire.projectSummary, logoDataUrl, brandColors: brandColors.length > 0 ? brandColors : undefined, mainOnly: true, platform }
    const headers = apiHeaders()
    const genId = generationIdRef.current
    if (idx === 1) {
      bgFetchAbortRef.current?.abort()
      const abort = new AbortController()
      bgFetchAbortRef.current = abort
      setIsGeneratingB(true)
      try {
        const res = await fetch('/api/generate', { method: 'POST', headers, body: JSON.stringify(baseParams), signal: abort.signal })
        const json = await res.json()
        if (generationIdRef.current === genId && !abort.signal.aborted && !json.error)
          setMainVariants(prev => [prev[0], json as GenerateResult, prev[2]])
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
      } finally { setIsGeneratingB(false) }
    } else {
      setIsGeneratingC(true)
      try {
        const res = await fetch('/api/generate', { method: 'POST', headers, body: JSON.stringify(baseParams) })
        const json = await res.json()
        if (generationIdRef.current === genId && !json.error)
          setMainVariants(prev => [prev[0], prev[1], json as GenerateResult])
      } catch { /* silent */ }
      finally { setIsGeneratingC(false) }
    }
  }

  const handleRefine = async () => {
    if (!chatInput.trim() || !result || isRefining) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsRefining(true)
    try {
      const effectiveDesignMd = DESIGN_PRESETS[designPreset].md
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ html: result.html, message: userMsg, brief, designMd: effectiveDesignMd }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setVariants(prev => {
        const updated = [...prev] as [GenerateResult | null, GenerateResult | null]
        if (updated[activeVariant]) updated[activeVariant] = { ...updated[activeVariant]!, html: data.html }
        return updated
      })
      if (activeVariant === 0) {
        setHistoryA(prev => [...prev.slice(0, historyIndexA + 1), data.html].slice(-30))
        setHistoryIndexA(prev => prev + 1)
      } else {
        setHistoryB(prev => [...prev.slice(0, historyIndexB + 1), data.html].slice(-30))
        setHistoryIndexB(prev => prev + 1)
      }
      setSelectedStyles(null)
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.summary }])

      const refinedHtml = data.html
      const headers = apiHeaders()
      tweakRequestHtmlRef.current = refinedHtml
      if (activeVariant === 0) {
        setTweakSpecA(null)
        setIsAnalyzingTweakA(true)
        fetch('/api/analyze-tweaks', { method: 'POST', headers, body: JSON.stringify({ html: refinedHtml, brief }) })
          .then(r => r.json())
          .then(spec => {
            if (tweakRequestHtmlRef.current !== refinedHtml) return
            setTweakSpecA(spec.variables || spec.states ? spec : null)
            if (spec.variables?.length) {
              const defaults: Record<string, number> = {}
              spec.variables.forEach((v: TweakVariable) => { defaults[v.id] = v.currentValue })
              setVarValues(defaults)
            }
          })
          .catch(() => { if (tweakRequestHtmlRef.current === refinedHtml) setTweakSpecA(null) })
          .finally(() => { if (tweakRequestHtmlRef.current === refinedHtml) setIsAnalyzingTweakA(false) })
      } else {
        setTweakSpecB(null)
        setIsAnalyzingTweakB(true)
        fetch('/api/analyze-tweaks', { method: 'POST', headers, body: JSON.stringify({ html: refinedHtml, brief }) })
          .then(r => r.json())
          .then(spec => {
            if (tweakRequestHtmlRef.current !== refinedHtml) return
            setTweakSpecB(spec.variables || spec.states ? spec : null)
          })
          .catch(() => { if (tweakRequestHtmlRef.current === refinedHtml) setTweakSpecB(null) })
          .finally(() => { if (tweakRequestHtmlRef.current === refinedHtml) setIsAnalyzingTweakB(false) })
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.' }])
    } finally {
      setIsRefining(false)
    }
  }

  const handleStateChange = useCallback((stateId: string) => {
    setActiveStateId(stateId)
    setVarValues(prev => {
      if (!tweakSpec) return prev
      const defaults: Record<string, number> = {}
      tweakSpec.variables.forEach(v => { defaults[v.id] = v.currentValue })
      return defaults
    })
  }, [tweakSpec])

  const handleVarChange = useCallback((id: string, value: number) => {
    if (varUpdateTimer.current) clearTimeout(varUpdateTimer.current)
    varUpdateTimer.current = setTimeout(() => {
      setVarValues(prev => ({ ...prev, [id]: value }))
    }, 250)
  }, [])

  const downloadHtml = () => {
    if (!result) return
    const blob = new Blob([result.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'ui-design.html'; a.click()
    URL.revokeObjectURL(url)
    setShareOpen(false)
  }

  const downloadPng = () => {
    if (!result?.image) return
    const a = document.createElement('a'); a.href = result.image; a.download = 'ui-design.png'; a.click()
    setShareOpen(false)
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopyLinkDone(true)
    setShareOpen(false)
    setTimeout(() => setCopyLinkDone(false), 2000)
  }

  const handleDarkMode = (on: boolean) => {
    setDarkMode(on)
    sendToIframe({ type: 'aide:dark', on })
  }

  const handleBrandColor = (color: string) => {
    setBrandColor(color)
    sendToIframe({ type: 'aide:brand', color })
    clearTimeout(brandDebounceTimer.current)
    brandDebounceTimer.current = setTimeout(() => setDebouncedBrandColor(color), 500)
  }

  const answeredCount = questionnaire ? Object.keys(answers).length : 0

  // ─── Step 3: Generation canvas view ──────────────────────────────────────
  if (step === 3) {
    const preset = DESIGN_PRESETS[designPreset]
    const hasDesign = designPreset !== 'none' && !!preset.palette
    const isAnyGenerating = isGenerating || isGeneratingB || isGeneratingC

    return (
      <div
        className="h-screen overflow-hidden flex flex-col text-[#111111]"
        style={{
          fontFamily: "'Inter', -apple-system, sans-serif",
          backgroundColor: '#f4f4f6',
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        {isExpandingPrototype && <ExpandingOverlay />}

        {/* Header */}
        <div className="h-11 border-b border-[rgba(0,0,0,0.09)] flex items-stretch shrink-0 bg-white">
          <a href="/" className="flex items-center px-4 text-[#111111] font-bold text-[15px] border-r border-[rgba(0,0,0,0.09)] hover:bg-[#ebebeb] transition-colors shrink-0">
            Aide
          </a>
          <div className="px-5 text-[13px] flex items-center gap-2 text-[#666666]">
            {isAnyGenerating ? (
              <>
                <svg className="animate-spin shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeOpacity="0.3" />
                  <path d="M21 12a9 9 0 00-9-9" />
                </svg>
                시안 생성 중...
              </>
            ) : '시안을 선택해주세요'}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 px-4">
            <button
              onClick={handleGenerate}
              disabled={isAnyGenerating}
              className="flex items-center gap-1.5 text-[13px] text-[#666666] hover:text-[#111111] transition-colors disabled:opacity-40"
            >
              <RefreshCw size={13} /> 다시 생성
            </button>
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-[13px] text-[#666666] hover:text-[#111111] transition-colors">
              <ArrowLeft size={14} /> 뒤로
            </button>
          </div>
        </div>

        {/* Canvas: all cards laid out on the dotted surface */}
        <div ref={canvasAreaRef} className="flex-1 overflow-hidden relative" onClick={() => setSelectedCard(null)}>
          <div ref={canvasTransformRef} style={{ transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`, transformOrigin: '0 0', display: 'flex', alignItems: 'flex-start', gap: 24, padding: 40, width: 'max-content' }}>
          <style>{`@keyframes aide-bar{0%{transform:translateX(-150%)}100%{transform:translateX(500%)}}`}</style>

          {/* DESIGN.md text card */}
          {hasDesign && preset.md && (() => {
            const rawMd = preset.md.startsWith('---\n')
              ? (() => { const end = preset.md.indexOf('\n---\n', 4); return end !== -1 ? preset.md.slice(end + 5) : preset.md })()
              : preset.md

            function parseMdInline(text: string): React.ReactNode[] {
              return text.split(/(\*\*[^*]+\*\*|`[^`\n]+`)/).map((s, j) => {
                if (s.startsWith('**') && s.endsWith('**'))
                  return <strong key={j} style={{ fontWeight: 700, color: '#111111' }}>{s.slice(2, -2)}</strong>
                if (s.startsWith('`') && s.endsWith('`'))
                  return <code key={j} style={{ fontFamily: 'monospace', fontSize: '0.85em', backgroundColor: 'rgba(0,0,0,0.06)', padding: '0 3px', borderRadius: 3, color: '#c7254e' }}>{s.slice(1, -1)}</code>
                return s
              })
            }

            // Parse lines into segments: heading | bullet | codeblock | table | hr | blank | text
            type Seg =
              | { t: 'h1' | 'h2' | 'h3' | 'h4'; text: string; i: number }
              | { t: 'bullet'; text: string; i: number }
              | { t: 'code'; lines: string[]; i: number }
              | { t: 'table'; rows: string[][]; i: number }
              | { t: 'hr'; i: number }
              | { t: 'blank'; i: number }
              | { t: 'text'; text: string; i: number }
            const segs: Seg[] = []
            const lines = rawMd.split('\n')
            let li = 0
            while (li < lines.length) {
              const line = lines[li]
              if (line.startsWith('```')) {
                const codeLines: string[] = []
                li++
                while (li < lines.length && !lines[li].startsWith('```')) { codeLines.push(lines[li]); li++ }
                li++
                segs.push({ t: 'code', lines: codeLines, i: segs.length })
              } else if (line.startsWith('|')) {
                const rows: string[][] = []
                while (li < lines.length && lines[li].startsWith('|')) {
                  const cells = lines[li].split('|').slice(1, -1).map(c => c.trim())
                  if (!cells.every(c => /^[-: ]+$/.test(c))) rows.push(cells)
                  li++
                }
                if (rows.length) segs.push({ t: 'table', rows, i: segs.length })
              } else if (/^#{4} /.test(line)) { segs.push({ t: 'h4', text: line.slice(5), i: segs.length }); li++ }
              else if (/^#{3} /.test(line)) { segs.push({ t: 'h3', text: line.slice(4), i: segs.length }); li++ }
              else if (/^#{2} /.test(line)) { segs.push({ t: 'h2', text: line.slice(3), i: segs.length }); li++ }
              else if (/^# /.test(line))    { segs.push({ t: 'h1', text: line.slice(2), i: segs.length }); li++ }
              else if (/^[-*] /.test(line)) { segs.push({ t: 'bullet', text: line.replace(/^[-*] /, ''), i: segs.length }); li++ }
              else if (/^---+$/.test(line.trim())) { segs.push({ t: 'hr', i: segs.length }); li++ }
              else if (line.trim() === '')   { segs.push({ t: 'blank', i: segs.length }); li++ }
              else                           { segs.push({ t: 'text', text: line, i: segs.length }); li++ }
            }

            return (
              <div key="design-md" className="shrink-0 flex flex-col overflow-hidden" onClick={e => { e.stopPropagation(); setSelectedCard('design-md') }} style={{ width: 300, height: 560, borderRadius: 16, backgroundColor: '#ffffff', border: selectedCard === 'design-md' ? '2px solid #1a75ff' : '1px solid rgba(0,0,0,0.08)', cursor: 'default', outline: selectedCard === 'design-md' ? '3px solid rgba(26,117,255,0.18)' : 'none', outlineOffset: '2px' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111111' }}>DESIGN.md</span>
                  <span style={{ fontSize: 11, color: '#aaaaaa', marginLeft: 2 }}>{preset.label}</span>
                </div>
                <div data-card-scroll="design-md" style={{ overflowY: 'auto', padding: '14px 14px 18px', flex: 1 }}>
                  {segs.map(seg => {
                    const k = seg.i
                    if (seg.t === 'blank') return <div key={k} style={{ height: 5 }} />
                    if (seg.t === 'hr')    return <div key={k} style={{ height: 1, backgroundColor: '#eeeeee', margin: '8px 0' }} />
                    if (seg.t === 'h1')    return <p key={k} style={{ fontSize: 14, fontWeight: 700, color: '#111111', margin: '14px 0 4px', lineHeight: 1.3 }}>{parseMdInline(seg.text)}</p>
                    if (seg.t === 'h2')    return <p key={k} style={{ fontSize: 12, fontWeight: 700, color: '#111111', margin: '10px 0 3px', lineHeight: 1.3 }}>{parseMdInline(seg.text)}</p>
                    if (seg.t === 'h3')    return <p key={k} style={{ fontSize: 11, fontWeight: 600, color: '#333333', margin: '8px 0 2px' }}>{parseMdInline(seg.text)}</p>
                    if (seg.t === 'h4')    return <p key={k} style={{ fontSize: 10, fontWeight: 600, color: '#555555', margin: '6px 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{parseMdInline(seg.text)}</p>
                    if (seg.t === 'bullet') return <p key={k} style={{ fontSize: 11, color: '#444444', margin: '1px 0 1px 8px', lineHeight: 1.5 }}>{'• '}{parseMdInline(seg.text)}</p>
                    if (seg.t === 'code')  return (
                      <pre key={k} style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: '#f5f5f5', borderRadius: 6, padding: '8px 10px', margin: '4px 0', overflowX: 'auto', color: '#333333', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {seg.lines.join('\n')}
                      </pre>
                    )
                    if (seg.t === 'table') return (
                      <div key={k} style={{ overflowX: 'auto', margin: '4px 0' }}>
                        <table style={{ fontSize: 10, borderCollapse: 'collapse', width: '100%' }}>
                          <tbody>
                            {seg.rows.map((row, ri) => (
                              <tr key={ri} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                {row.map((cell, ci) => (
                                  <td key={ci} style={{ padding: '3px 6px', color: ri === 0 ? '#111111' : '#555555', fontWeight: ri === 0 ? 600 : 400, whiteSpace: 'nowrap' }}>
                                    {parseMdInline(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                    return <p key={k} style={{ fontSize: 11, color: '#555555', margin: '1px 0', lineHeight: 1.6 }}>{parseMdInline((seg as { text: string }).text)}</p>
                  })}
                </div>
              </div>
            )
          })()}

          {/* Design system card — grid visualization */}
          {hasDesign ? (() => {
            const isDark = designPreset === 'framer'
            const outerBg = isDark ? '#111111' : '#e8e8eb'
            const cellBg = isDark ? '#1a1a1a' : '#ffffff'
            const gridLine = isDark ? '#272727' : '#e0e0e3'
            const ink = isDark ? '#ffffff' : '#111111'
            const muted = isDark ? '#666666' : '#999999'
            const subtle = isDark ? '#252525' : '#f4f4f5'
            const border = isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)'

            function genTints(hex: string): string[] {
              const h = hex.replace('#', '')
              const r = parseInt(h.slice(0, 2), 16)
              const g = parseInt(h.slice(2, 4), 16)
              const b = parseInt(h.slice(4, 6), 16)
              const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
              const mix = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number) =>
                `#${toHex(r1 + (r2 - r1) * t)}${toHex(g1 + (g2 - g1) * t)}${toHex(b1 + (b2 - b1) * t)}`
              return [
                mix(0, 0, 0, r, g, b, 0.2), mix(0, 0, 0, r, g, b, 0.4),
                mix(0, 0, 0, r, g, b, 0.6), mix(0, 0, 0, r, g, b, 0.8),
                hex,
                mix(r, g, b, 255, 255, 255, 0.3), mix(r, g, b, 255, 255, 255, 0.55),
                mix(r, g, b, 255, 255, 255, 0.75), mix(r, g, b, 255, 255, 255, 0.9),
              ]
            }

            function isLightHex(hex: string): boolean {
              const h = hex.replace('#', '')
              return parseInt(h.slice(0, 2), 16) * 0.299 + parseInt(h.slice(2, 4), 16) * 0.587 + parseInt(h.slice(4, 6), 16) * 0.114 > 150
            }

            return (
              <div className="shrink-0 flex flex-col overflow-hidden" onClick={e => { e.stopPropagation(); setSelectedCard('style-plan') }} style={{ width: 660, height: 560, borderRadius: 16, backgroundColor: outerBg, border: selectedCard === 'style-plan' ? '2px solid #1a75ff' : (isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)'), cursor: 'default', outline: selectedCard === 'style-plan' ? '3px solid rgba(26,117,255,0.18)' : 'none', outlineOffset: '2px' }}>

                {/* Header */}
                <div style={{ padding: '10px 14px', borderBottom: border, display: 'flex', alignItems: 'center', gap: 8, backgroundColor: cellBg }}>
                  <Sparkles size={11} style={{ color: preset.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{preset.label} Style Plan</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {(['A', 'B', 'C'] as const).map((l, i) => {
                      const v = mainVariants[i]
                      const loading = i === 0 ? isGenerating : i === 1 ? isGeneratingB : isGeneratingC
                      return <div key={l} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: v ? '#22c55e' : loading ? preset.color : isDark ? '#2a2a2a' : '#e0e0e0', transition: 'background-color 0.3s' }} />
                    })}
                  </div>
                </div>

                {/* 4-column grid */}
                <div data-card-scroll="style-plan" style={{ display: 'grid', gridTemplateColumns: '185px 1fr 1fr 1fr', gap: 1, backgroundColor: gridLine, flex: 1, overflowY: 'auto' }}>

                  {/* Col 1: Color swatches + tint strips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {preset.palette!.map(swatch => {
                      const tints = genTints(swatch.hex)
                      const onSwatch = isLightHex(swatch.hex) ? '#111111' : '#ffffff'
                      return (
                        <div key={swatch.name} style={{ backgroundColor: cellBg, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                          <div style={{ backgroundColor: swatch.hex, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: onSwatch }}>{swatch.name}</span>
                            <span style={{ fontSize: 9, fontFamily: 'monospace', color: onSwatch, opacity: 0.75 }}>{swatch.hex.toUpperCase()}</span>
                          </div>
                          <div style={{ display: 'flex', height: 14 }}>
                            {tints.map((t, ti) => <div key={ti} style={{ flex: 1, backgroundColor: t }} />)}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Col 2: Typography */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {([
                      { label: 'Headline', font: preset.fonts!.headline, size: 64, weight: 700 },
                      { label: 'Body',     font: preset.fonts!.body,     size: 52, weight: 400 },
                      { label: 'Label',    font: preset.fonts!.body,     size: 42, weight: 500 },
                      { label: 'Caption',  font: preset.fonts!.body,     size: 34, weight: 400 },
                    ] as const).slice(0, preset.palette!.length).map(({ label, font, size, weight }, i) => (
                      <div key={i} style={{ backgroundColor: cellBg, padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 9, fontWeight: 500, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                          <span style={{ fontSize: 8, color: isDark ? '#333' : '#ccc', maxWidth: 55, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{font.split(',')[0].trim()}</span>
                        </div>
                        <div style={{ fontSize: size, fontWeight: weight, color: ink, lineHeight: 1, fontFamily: font, letterSpacing: '-0.02em', overflow: 'hidden' }}>Aa</div>
                      </div>
                    ))}
                  </div>

                  {/* Col 3: Components */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* 2×2 Buttons */}
                    <div style={{ backgroundColor: cellBg, padding: '10px 10px', flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                        <button style={{ backgroundColor: preset.color, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 4px', fontSize: 9, fontWeight: 600, cursor: 'default' }}>Primary</button>
                        <button style={{ backgroundColor: 'transparent', color: ink, border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`, borderRadius: 6, padding: '6px 4px', fontSize: 9, cursor: 'default' }}>Outline</button>
                        <button style={{ backgroundColor: subtle, color: ink, border: 'none', borderRadius: 6, padding: '6px 4px', fontSize: 9, cursor: 'default' }}>Ghost</button>
                        <button style={{ backgroundColor: isDark ? '#222' : '#e8e8e8', color: muted, border: 'none', borderRadius: 6, padding: '6px 4px', fontSize: 9, cursor: 'default' }}>Disabled</button>
                      </div>
                    </div>

                    {/* Dividers */}
                    <div style={{ backgroundColor: cellBg, padding: '10px 10px', display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 1.5, borderRadius: 2, backgroundColor: preset.color, width: '100%' }} />
                        <div style={{ height: 1.5, borderRadius: 2, backgroundColor: isDark ? '#2a2a2a' : '#e4e4e4', width: '75%' }} />
                        <div style={{ height: 1.5, borderRadius: 2, backgroundColor: isDark ? '#2a2a2a' : '#e4e4e4', width: '50%' }} />
                      </div>
                    </div>

                    {/* Toggle + checkbox + radio */}
                    <div style={{ backgroundColor: cellBg, padding: '10px 10px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <div style={{ width: 32, height: 18, borderRadius: 9, backgroundColor: preset.color, display: 'flex', alignItems: 'center', padding: '0 2px' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#fff', marginLeft: 'auto' }} />
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: preset.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${preset.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: preset.color }} />
                      </div>
                    </div>

                    {/* Nav icons */}
                    <div style={{ backgroundColor: cellBg, padding: '10px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1 }}>
                      {['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'].map((d, i) => (
                        <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="1.8"><path d={d}/></svg>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Col 4: UI Patterns */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Search */}
                    <div style={{ backgroundColor: cellBg, padding: '10px 10px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: subtle, border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)', borderRadius: 7, padding: '6px 8px' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <span style={{ fontSize: 10, color: muted }}>Search</span>
                      </div>
                    </div>

                    {/* List rows */}
                    <div style={{ backgroundColor: cellBg, padding: '0 10px', flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                      {[100, 75, 55].map((w, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: i < 2 ? (isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)') : 'none' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: i === 0 ? preset.color : subtle, flexShrink: 0 }} />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? '#2a2a2a' : '#e8e8e8', width: `${w}%` }} />
                            <div style={{ height: 4, borderRadius: 3, backgroundColor: isDark ? '#222' : '#f0f0f0', width: `${Math.round(w * 0.6)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Badge + chips */}
                    <div style={{ backgroundColor: cellBg, padding: '10px 10px', flex: 1, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <div style={{ backgroundColor: preset.color, color: '#fff', borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 600 }}>New</div>
                      <div style={{ backgroundColor: subtle, color: ink, border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', borderRadius: 20, padding: '2px 8px', fontSize: 9 }}>Filter</div>
                      <div style={{ backgroundColor: subtle, color: ink, border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', borderRadius: 20, padding: '2px 8px', fontSize: 9 }}>Sort</div>
                    </div>

                    {/* Action icons */}
                    <div style={{ backgroundColor: cellBg, padding: '10px 10px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                      {['M12 5v14M5 12l7 7 7-7', 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0', 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'].map((d, i) => (
                        <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="1.8"><path d={d}/></svg>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer: progress bar */}
                <div style={{ padding: '9px 14px', borderTop: border, display: 'flex', alignItems: 'center', gap: 8, backgroundColor: cellBg }}>
                  <div style={{ flex: 1, height: 2, backgroundColor: isDark ? '#1e1e1e' : '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '40%', backgroundColor: preset.color, borderRadius: 2, animation: 'aide-bar 1.4s ease-in-out infinite' }} />
                  </div>
                  <span style={{ fontSize: 10, color: muted }}>{isAnyGenerating ? '생성 중...' : '완료'}</span>
                </div>
              </div>
            )
          })() : (
            /* No design system: simple spinner card */
            <div className="shrink-0 flex flex-col items-center justify-center gap-4" style={{ width: 280, padding: '32px 24px', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
              <div className="size-10 rounded-full animate-spin" style={{ border: '2px solid rgba(0,0,0,0.08)', borderTopColor: '#0055ff' }} />
              <p style={{ fontSize: 13, color: '#888888', textAlign: 'center', lineHeight: 1.6 }}>AI가 최적의 디자인을<br />설계하고 있습니다</p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['A', 'B', 'C'] as const).map((letter, idx) => {
                  const variant = mainVariants[idx]
                  const isLoadingThis = idx === 0 ? isGenerating : idx === 1 ? isGeneratingB : isGeneratingC
                  return (
                    <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={isLoadingThis ? 'animate-spin' : ''} style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(variant ? { backgroundColor: '#111111' } : isLoadingThis ? { border: '2px solid rgba(0,0,0,0.10)', borderTopColor: '#111111' } : { backgroundColor: '#ebebeb' }) }}>
                        {variant && <Check size={7} color="#ffffff" />}
                      </div>
                      <span style={{ fontSize: 12, color: '#666666' }}>시안 {letter}</span>
                      <span style={{ fontSize: 11, marginLeft: 'auto', color: variant ? '#22c55e' : isLoadingThis ? '#999999' : '#cccccc' }}>
                        {variant ? '완료' : isLoadingThis ? '생성 중...' : '대기 중'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3 variant artboard cards */}
          <div className="flex items-center gap-6 overflow-x-auto">
            {(['A', 'B', 'C'] as const).map((letter, idx) => {
              const variant = mainVariants[idx]
              const isLoadingThis = idx === 0 ? isGenerating : idx === 1 ? isGeneratingB : isGeneratingC
              const isFailed = !variant && !isLoadingThis && idx > 0
              const cardW = isMobile ? 180 : isTablet ? 220 : 320
              return (
                <div key={letter} className="flex flex-col gap-3 shrink-0" style={{ width: cardW }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold" style={{ color: '#222222' }}>시안 {letter}</span>
                    {isLoadingThis && (
                      <div className="flex items-center gap-1.5 text-[13px]" style={{ color: '#888888' }}>
                        <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeOpacity="0.3" />
                          <path d="M21 12a9 9 0 00-9-9" />
                        </svg>
                        생성 중
                      </div>
                    )}
                    {variant && !isLoadingThis && (
                      <span className="text-[12px]" style={{ color: '#888888' }}>완료</span>
                    )}
                  </div>
                  <div
                    className="relative overflow-hidden bg-white"
                    onClick={e => { e.stopPropagation(); setSelectedCard(`variant-${letter}`) }}
                    style={{
                      borderRadius: '12px',
                      aspectRatio: isMobile ? '402/874' : isTablet ? '834/1194' : '1440/1024',
                      border: selectedCard === `variant-${letter}` ? '2px solid #1a75ff' : '2px solid rgba(255,255,255,0.7)',
                      outline: selectedCard === `variant-${letter}` ? '3px solid rgba(26,117,255,0.18)' : 'none',
                      outlineOffset: '2px',
                      cursor: 'default',
                    }}
                  >
                    {variant ? (
                      <button
                        className="w-full h-full block group relative"
                        onClick={() => setExpandedVariant({ image: variant.image, letter })}
                      >
                        <img src={variant.image} alt={`시안 ${letter}`} className="w-full h-full object-cover object-top" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                          <span className="text-white text-[13px] font-medium px-3 py-1.5 rounded-full bg-black/70">크게 보기</span>
                        </div>
                      </button>
                    ) : isLoadingThis ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-8 rounded-full animate-spin" style={{ border: '2px solid rgba(0,0,0,0.08)', borderTopColor: '#0055ff' }} />
                      </div>
                    ) : isFailed ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <span className="text-[13px] text-[#999999]">생성 실패</span>
                        <button onClick={() => handleRetryVariant(idx as 1 | 2)} className="flex items-center gap-1 text-[13px] text-[#666666] hover:text-[#111111] transition-colors">
                          <RefreshCw size={11} /> 다시 시도
                        </button>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-8 rounded-full" style={{ border: '2px solid rgba(0,0,0,0.08)', borderTopColor: 'rgba(0,0,0,0.3)' }} />
                      </div>
                    )}
                  </div>
                  {variant && (
                    <button
                      onClick={() => handlePickVariant(idx as 0|1|2)}
                      className="w-full py-2.5 text-[13px] font-medium text-white transition-colors"
                      style={{ borderRadius: '100px', backgroundColor: '#111111' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#333333' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#111111' }}
                    >
                      이 시안으로 진행
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          </div>
        </div>

        {generateError && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 text-sm text-[#ff6b6b]" style={{ borderRadius: '8px', backgroundColor: 'rgba(30,30,30,0.9)', border: '1px solid rgba(255,107,107,0.3)', backdropFilter: 'blur(8px)' }}>
            {generateError}
          </div>
        )}

        {expandedVariant && (
          <ImageExpandModal
            image={expandedVariant.image}
            letter={expandedVariant.letter}
            onClose={() => setExpandedVariant(null)}
          />
        )}
      </div>
    )
  }

  // ─── Step 4: Figma-style full-screen editor ──────────────────────────────
  if (step === 4 && result) {
    return (
      <div className="h-screen overflow-hidden flex flex-col text-[#111111]" style={{ fontFamily: "'Inter', -apple-system, sans-serif", backgroundColor: '#f4f4f6', backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>

        {/* Tab bar */}
        <div className="h-11 border-b border-[rgba(0,0,0,0.09)] flex items-stretch shrink-0 bg-white">
          <a href="/" className="flex items-center px-4 text-[#111111] font-bold text-[15px] border-r border-[rgba(0,0,0,0.09)] hover:bg-[#ebebeb] transition-colors shrink-0">
            aide
          </a>
          <button className="px-4 text-[13px] text-[#666666] hover:text-[#111111] hover:bg-[#ebebeb] transition-colors border-r border-[rgba(0,0,0,0.09)]">
            Design Files
          </button>
          <div className="px-5 text-[13px] flex items-center border-b-2 border-[#111111] text-[#111111]">
            시안 {pickedVariantIdx !== null ? (['A', 'B', 'C'] as const)[pickedVariantIdx] : 'A'}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 px-4">
            <div className="relative" ref={shareRef}>
              <button
                onClick={() => setShareOpen(o => !o)}
                className="text-[13px] font-medium text-[#111111] px-4 py-1.5 transition-colors shrink-0 flex items-center gap-1.5"
                style={{ borderRadius: '100px', backgroundColor: '#ffffff' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e0e0e0' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff' }}
              >
                공유 <ChevronDown size={11} />
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[rgba(0,0,0,0.09)] overflow-hidden z-50" style={{ borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                  <button onClick={handleCopyLink} className="w-full flex items-start gap-2.5 px-4 py-2.5 hover:bg-[#f0f0f0] transition-colors text-left">
                    {copyLinkDone
                      ? <><span className="text-[#22c55e] mt-0.5">✓</span><span className="text-[13px] text-[#22c55e]">복사됨!</span></>
                      : <><span className="text-[16px] mt-0.5 shrink-0">🔗</span>
                          <span>
                            <span className="block text-[13px] text-[#111111]">링크 복사</span>
                            <span className="block text-[13px] text-[#666666] leading-tight">결과물을 저장하지 않으므로<br />HTML을 먼저 다운로드 하세요</span>
                          </span>
                        </>
                    }
                  </button>
                  <div className="h-px bg-[rgba(0,0,0,0.06)] mx-3" />
                  <button onClick={downloadHtml} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#111111] hover:bg-[#f0f0f0] transition-colors text-left">
                    <span className="text-[16px]">📄</span> HTML 다운로드
                  </button>
                  <button onClick={downloadPng} disabled={!result?.image} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-[#f0f0f0] transition-colors text-left disabled:opacity-40" style={{ color: '#111111' }}>
                    <span className="text-[16px]">🖼️</span> PNG 내보내기
                  </button>
                  <div className="h-px bg-[rgba(0,0,0,0.06)] mx-3" />
                  <div className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#666666] cursor-not-allowed">
                    <span className="text-[16px]">🎨</span>
                    <span>Figma로 내보내기</span>
                    <span className="ml-auto text-[13px] bg-[#f0f0f0] text-[#666666] px-1.5 py-0.5 rounded-full border border-[rgba(0,0,0,0.07)]">준비 중</span>
                  </div>
                </div>
              )}
            </div>
            <div className="size-7 flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ borderRadius: '9999px', backgroundColor: '#111111' }}>
              W
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="h-9 border-b border-[rgba(0,0,0,0.09)] flex items-center px-4 shrink-0 bg-white">
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="flex items-center justify-center size-7 rounded hover:bg-[#ebebeb] transition-colors disabled:opacity-30"
              style={{ color: '#666666' }}
              title="실행 취소 (⌘Z)"
            >
              <CornerUpLeft size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="flex items-center justify-center size-7 rounded hover:bg-[#ebebeb] transition-colors disabled:opacity-30"
              style={{ color: '#666666' }}
              title="다시 실행 (⌘⇧Z)"
            >
              <CornerUpRight size={14} />
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-[#666666]">
              <SlidersHorizontal size={12} />
              <span>Tweaks</span>
              <Toggle on={tweaksOpen} onChange={setTweaksOpen} />
            </div>
            <div className="w-px h-4 bg-[rgba(0,0,0,0.09)]" />
            <button
              onClick={() => { setEditMode(e => !e); setSelectedStyles(null) }}
              className="flex items-center gap-1.5 text-[13px] px-2.5 py-1 border transition-colors"
              style={{ borderRadius: '6px', ...(editMode ? { backgroundColor: '#111111', color: '#ffffff', borderColor: '#111111' } : { color: '#666666', borderColor: 'rgba(0,0,0,0.09)' }) }}
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={() => setCreonOpen(o => !o)}
              className="flex items-center gap-1.5 text-[13px] px-2.5 py-1 border transition-colors"
              style={{ borderRadius: '6px', ...(creonOpen ? { backgroundColor: '#111111', color: '#ffffff', borderColor: '#111111' } : { color: '#666666', borderColor: 'rgba(0,0,0,0.09)' }) }}
              title="Creon 에셋 패널"
            >
              <ImageIcon size={12} /> Creon
            </button>
            <button
              onClick={() => { const next = !darkMode; setDarkMode(next); sendToIframe({ type: 'aide:dark', on: next }) }}
              className="flex items-center justify-center size-7 rounded hover:bg-[#ebebeb] transition-colors"
              style={{ color: '#666666' }}
              title={darkMode ? '라이트 모드' : '다크 모드'}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <div className="w-px h-4 bg-[rgba(0,0,0,0.09)]" />
            <div className="relative" ref={zoomRef}>
              <button
                onClick={() => setZoomOpen(o => !o)}
                className="flex items-center gap-1 text-[13px] text-[#666666] hover:text-[#111111] transition-colors"
              >
                <span>{zoom}%</span>
                <ChevronDown size={11} />
              </button>
              {zoomOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-28 bg-white border border-[rgba(0,0,0,0.09)] overflow-hidden z-50" style={{ borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                  {[50, 60, 75, 100].map(z => (
                    <button
                      key={z}
                      onClick={() => { setZoom(z); setZoomOpen(false) }}
                      className="w-full px-3 py-2 text-[13px] text-left hover:bg-[#f0f0f0] transition-colors flex items-center justify-between"
                      style={{ color: zoom === z ? '#111111' : '#666666' }}
                    >
                      <span>{z}%</span>
                      {zoom === z && <Check size={10} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-[rgba(0,0,0,0.09)]" />
            <button onClick={downloadHtml} className="flex items-center gap-1 text-[13px] text-[#666666] hover:text-[#111111] transition-colors">
              <Download size={12} />HTML
            </button>
            <button onClick={handleReset} className="flex items-center gap-1 text-[13px] text-[#666666] hover:text-[#111111] transition-colors ml-1">
              <RefreshCw size={11} />새로 만들기
            </button>
          </div>
        </div>

        {/* Screen navigation */}
        {screens.length > 0 && (
          <div className="h-9 border-b border-[rgba(0,0,0,0.09)] flex items-center px-4 gap-1 shrink-0 overflow-x-auto bg-white">
            {screens.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveScreenId(s.id); sendToIframe({ type: 'aide:navigate', id: s.id }) }}
                className="px-3 py-1 text-[13px] shrink-0 transition-colors"
                style={{ borderRadius: '100px', ...(activeScreenId === s.id ? { backgroundColor: '#111111', color: '#ffffff' } : { color: '#666666' }) }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel: description + chat */}
          <div className="w-64 shrink-0 border-r border-[rgba(0,0,0,0.09)] bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.07)] shrink-0">
              <p className="text-[13px] font-semibold text-[#111111] mb-1 leading-[1.4]">
                {questionnaire?.projectSummary?.split('.')[0] || '서비스 요약'}
              </p>
              {questionnaire?.projectSummary && (
                <p className="text-[13px] text-[#666666] leading-[1.6] mt-1">{questionnaire.projectSummary}</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
                  <Sparkles size={16} className="text-[#999999]" />
                  <p className="text-[13px] text-[#666666] leading-[1.6]">대화로 디자인을<br />수정할 수 있습니다</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className="max-w-[85%] px-3 py-2 text-[14px] leading-[1.5]"
                      style={{
                        borderRadius: '10px',
                        ...(msg.role === 'user'
                          ? { backgroundColor: '#111111', color: '#ffffff' }
                          : { backgroundColor: '#f0f0f0', color: '#444444' }),
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isRefining && (
                <div className="flex justify-start">
                  <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2 text-[13px] text-[#666666]" style={{ borderRadius: '10px' }}>
                    <div className="size-3 rounded-full animate-spin" style={{ border: '1.5px solid rgba(0,0,0,0.15)', borderTopColor: 'rgba(0,0,0,0.6)' }} />
                    수정 중...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-[rgba(0,0,0,0.07)] shrink-0">
              <div className="flex items-end gap-2 bg-[#f0f0f0] px-3 py-2" style={{ borderRadius: '10px' }}>
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefine() }
                  }}
                  placeholder="수정 요청을 입력하세요..."
                  className="flex-1 bg-transparent text-[13px] text-[#111111] placeholder:text-[#999999] resize-none outline-none leading-[1.5]"
                  style={{ maxHeight: '96px', minHeight: '20px' }}
                  rows={1}
                  disabled={isRefining}
                />
                <button
                  onClick={handleRefine}
                  disabled={!chatInput.trim() || isRefining}
                  className="shrink-0 size-7 flex items-center justify-center rounded-full transition-colors"
                  style={{ backgroundColor: chatInput.trim() && !isRefining ? '#111111' : '#dddddd' }}
                >
                  <Send size={12} style={{ color: chatInput.trim() && !isRefining ? '#ffffff' : '#999999', marginLeft: '1px' }} />
                </button>
              </div>
              <p className="text-[13px] text-[#999999] mt-1.5 pl-1">Enter 전송 · Shift+Enter 줄바꿈</p>
            </div>
          </div>

          {/* Center: preview */}
          <div className="flex-1 flex flex-col items-center justify-center overflow-auto p-8">
            {isMobile ? (
              <MobileFrame scale={zoom / 100}>
                <iframe
                  ref={iframeRef}
                  srcDoc={displayHtml}
                  style={{ width: 402, height: 874, border: 'none', display: 'block' }}
                  sandbox="allow-scripts allow-same-origin"
                  title="Generated UI"
                />
              </MobileFrame>
            ) : isTablet ? (
              <TabletFrame scale={zoom / 100}>
                <iframe
                  ref={iframeRef}
                  srcDoc={displayHtml}
                  style={{ width: 834, height: 1194, border: 'none', display: 'block' }}
                  sandbox="allow-scripts allow-same-origin"
                  title="Generated UI"
                />
              </TabletFrame>
            ) : (
              <DesktopFrame scale={zoom / 100}>
                <div style={{ width: 1440, height: 1024, transformOrigin: 'top left', transform: `scale(${zoom / 100})`, overflow: 'hidden' }}>
                  <iframe
                    ref={iframeRef}
                    srcDoc={displayHtml}
                    style={{ width: 1440, height: 1024, border: 'none', display: 'block' }}
                    sandbox="allow-scripts allow-same-origin"
                    title="Generated UI"
                  />
                </div>
              </DesktopFrame>
            )}
          </div>

          {/* Right: properties panel (edit mode only) */}
          {editMode && <PropertiesPanel styles={selectedStyles} onUpdate={handleStyleUpdate} />}

          {/* Right: Creon asset panel */}
          {creonOpen && (
            <div style={{ width: 300, borderLeft: '1px solid rgba(0,0,0,0.09)', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111111' }}>Creon Assets</span>
                <button onClick={() => setCreonOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#666666' }}>
                  <X size={14} />
                </button>
              </div>
              {creonAsset && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.09)', backgroundColor: '#f7f7f7', flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: '#666666', marginBottom: 6 }}>선택된 에셋{selectedStyles ? ' — 아래 버튼으로 적용' : ' — Edit 모드에서 요소를 클릭 후 적용'}</p>
                  <img src={creonAsset} alt="selected asset" style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                  {selectedStyles && (
                    <button
                      onClick={() => {
                        sendToIframe({ type: 'aide:update', prop: 'backgroundImage', value: `url("${creonAsset}")` })
                        sendToIframe({ type: 'aide:update', prop: 'backgroundSize', value: 'cover' })
                        sendToIframe({ type: 'aide:update', prop: 'backgroundPosition', value: 'center' })
                      }}
                      style={{ marginTop: 6, width: '100%', padding: '5px 0', fontSize: 12, fontWeight: 600, color: '#ffffff', backgroundColor: '#111111', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                    >
                      선택된 요소에 적용
                    </button>
                  )}
                </div>
              )}
              <iframe
                src="http://localhost:3000"
                style={{ flex: 1, border: 'none', width: '100%', minHeight: 0 }}
                allow="clipboard-read; clipboard-write"
                title="Creon"
              />
            </div>
          )}
        </div>

        {tweaksOpen && (
          <TweaksModal
            darkMode={darkMode}
            brandColor={brandColor}
            onDarkMode={handleDarkMode}
            onBrandColor={handleBrandColor}
            onClose={() => setTweaksOpen(false)}
            tweakSpec={tweakSpec}
            isLoadingTweaks={isAnalyzingTweaks}
            activeStateId={activeStateId}
            varValues={varValues}
            onStateChange={handleStateChange}
            onVarChange={handleVarChange}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Inter', -apple-system, sans-serif", backgroundColor: F.surface1, color: F.ink }}>
      {isExpandingPrototype && <ExpandingOverlay />}

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 px-8 py-4 flex items-center" style={{ backgroundColor: F.canvas, borderBottom: `1px solid ${F.hairlineSoft}` }}>
        <a href="/" className="font-bold text-lg transition-colors" style={{ letterSpacing: '-0.05em', color: F.ink, textDecoration: 'none' }}>
          Aide
        </a>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── Step 1: Input ── */}
        {step === 1 && (
          <div className="max-w-5xl mx-auto w-full px-8 py-12">
            <div className="mb-10">
              <h1 className="text-[28px] font-bold mb-2" style={{ letterSpacing: '-0.05em', color: F.ink }}>UI 시안 만들기</h1>
              <p className="text-[16px] leading-[1.6]" style={{ color: F.inkMuted }}>
                디자인 시스템과 기획서를 입력하면 AI가 맞춤형 질문을 생성합니다
              </p>
            </div>

            {/* Design System + Logo (left) / 기획서 (right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

              {/* ── Left: Design System preset + Logo ── */}
              <div className="flex flex-col gap-5">

                {/* Design System */}
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-medium" style={{ color: F.ink }}>
                    Design System <span className="ml-2 text-[13px] font-normal" style={{ color: F.inkMuted }}>선택사항</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['airbnb', 'framer', 'ktds', 'uber'] as const).map(key => {
                      const preset = DESIGN_PRESETS[key]
                      const isActive = designPreset === key
                      return (
                        <button
                          key={key}
                          onClick={() => setDesignPreset(isActive ? 'none' : key)}
                          className="flex flex-col gap-1.5 p-3 text-left border transition-all"
                          style={{
                            borderRadius: '12px',
                            borderColor: isActive ? F.ink : F.hairlineSoft,
                            backgroundColor: isActive ? F.surface2 : F.canvas,
                            outline: 'none',
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: preset.color }}
                            />
                            <span className="text-[13px] font-semibold" style={{ color: F.ink }}>{preset.label}</span>
                            {isActive && (
                              <span className="ml-auto text-[11px] font-600 px-2 py-0.5 rounded-full" style={{ backgroundColor: F.primary, color: '#ffffff' }}>
                                선택됨
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] leading-snug" style={{ color: F.inkMuted }}>{preset.description}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[13px]" style={{ color: F.inkMuted }}>
                    {designPreset === 'none' ? 'AI가 브랜드에 맞는 디자인 시스템을 직접 설계합니다' : `${DESIGN_PRESETS[designPreset].label} 가이드라인을 적용합니다`}
                  </p>
                </div>

                {/* Logo Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-medium" style={{ color: F.ink }}>
                    회사 로고 <span className="ml-2 text-[13px] font-normal" style={{ color: F.inkMuted }}>선택사항</span>
                  </label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  {logoLoading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-6 border border-dashed bg-white" style={{ borderRadius: '12px', borderColor: F.hairline }}>
                      <div className="size-4 rounded-full animate-spin" style={{ border: `2px solid ${F.hairline}`, borderTopColor: F.ink }} />
                      <span className="text-[13px]" style={{ color: F.inkMuted }}>처리 중...</span>
                    </div>
                  ) : logoDataUrl ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-white border" style={{ borderRadius: '12px', borderColor: F.hairlineSoft }}>
                      <img src={logoDataUrl} alt="logo" className="h-8 object-contain" />
                      <span className="flex-1 text-[13px]" style={{ color: F.inkMuted }}>로고가 UI에 자동으로 삽입됩니다</span>
                      <button
                        onClick={() => setLogoDataUrl(null)}
                        className="transition-colors"
                        style={{ color: F.inkMuted }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-6 border border-dashed transition-colors text-center"
                      style={{ borderRadius: '12px', borderColor: F.hairline, backgroundColor: F.canvas }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = F.surface1 }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = F.canvas }}
                    >
                      <Upload size={18} style={{ color: F.inkSubtle }} />
                      <span className="text-[13px]" style={{ color: F.inkMuted }}>로고 이미지 업로드</span>
                      <span className="text-[13px]" style={{ color: F.inkSubtle }}>PNG · SVG · JPG</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ── Right: 기획서 ── */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-medium" style={{ color: F.ink }}>
                    기획서 / 요청사항 <span className="ml-2 text-[13px] font-normal" style={{ color: F.primary }}>필수</span>
                  </label>
                  <span className="text-[13px]" style={{ color: F.inkMuted }}>{brief.length} / 2000</span>
                </div>
                <div
                  className="flex-1 min-h-[360px] flex flex-col"
                  style={{ borderRadius: '12px', border: `1px solid ${F.hairlineSoft}`, backgroundColor: F.canvas }}
                  onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = F.hairline }}
                  onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = F.hairlineSoft }}
                >
                  {designPreset !== 'none' && (
                    <div className="flex items-center gap-2 px-4 pt-3">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px]" style={{ backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`, color: F.ink }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span>{designPreset}.md</span>
                        <button onClick={() => setDesignPreset('none')} className="flex items-center" style={{ color: F.inkMuted }}>
                          <X size={11} />
                        </button>
                      </div>
                      <span className="text-[12px]" style={{ color: F.inkMuted }}>이 design.md 파일의 디자인 시스템 사용</span>
                    </div>
                  )}
                  <textarea
                    value={brief}
                    onChange={e => setBrief(e.target.value.slice(0, 2000))}
                    placeholder={designPreset !== 'none'
                      ? `${DESIGN_PRESETS[designPreset].label} 디자인 시스템을 활용하여 어떤 화면을 만들고 싶으신가요?\n\n예시:\n${DESIGN_PRESETS[designPreset].label} 스타일로 대시보드를 만들어주세요. 주요 지표와 사용자 활동을 한눈에 볼 수 있어야 합니다.`
                      : `어떤 화면을 만들고 싶으신가요?\n\n예시:\n피트니스 앱의 홈 화면을 만들어주세요. 오늘의 운동 목표와 진행 상황을 볼 수 있어야 합니다.`}
                    className="flex-1 p-4 text-sm resize-none leading-relaxed bg-transparent outline-none"
                    style={{ color: F.ink }}
                  />
                </div>
              </div>
            </div>

            {analyzeError && (
              <div className="mb-4 px-4 py-3 text-sm" style={{ borderRadius: '12px', color: F.primary, backgroundColor: 'rgba(255,56,92,0.08)', border: `1px solid rgba(255,56,92,0.2)` }}>
                {analyzeError}
              </div>
            )}

            <PrimaryButton onClick={handleAnalyze} disabled={!brief.trim() || isAnalyzing} loading={isAnalyzing} loadingText="AI가 기획서를 분석하고 있습니다...">
              <Sparkles size={16} /> 분석하고 질문지 생성하기
            </PrimaryButton>
          </div>
        )}

        {/* ── Step 2: Questionnaire ── */}
        {step === 2 && questionnaire && (
          <div className="max-w-3xl mx-auto w-full px-8 py-12">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-[22px] font-bold mb-1" style={{ letterSpacing: '-0.05em' }}>세부 옵션 선택</h1>
                <p className="text-[14px] text-[#666666]">{questionnaire.projectSummary}</p>
              </div>
              <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-[#666666] hover:text-[#111111] transition-colors mt-1">
                <ArrowLeft size={14} /> 뒤로
              </button>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-1 bg-[#f0f0f0] overflow-hidden" style={{ borderRadius: '9999px' }}>
                <div className="h-full transition-all duration-300" style={{ width: `${(answeredCount / questionnaire.questions.length) * 100}%`, backgroundColor: '#111111', borderRadius: '9999px' }} />
              </div>
              <span className="text-[13px] text-[#666666] shrink-0">{answeredCount} / {questionnaire.questions.length} 답변</span>
            </div>

            <div className="space-y-8 mb-10">
              {questionnaire.questions.map((q, idx) => (
                <QuestionCard key={q.id} index={idx + 1} question={q} answer={answers[q.id]} onAnswer={(value) => handleAnswer(q.id, value, q.type)} />
              ))}
            </div>

            {generateError && (
              <div className="mb-4 px-4 py-3 text-sm text-[#ff6b6b]" style={{ borderRadius: '8px', backgroundColor: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)' }}>
                {generateError}
              </div>
            )}

            <PrimaryButton onClick={handleGenerate} disabled={isGenerating} loading={isGenerating} loadingText="시안 A를 생성하고 있습니다... (60~90초 소요)">
              <Sparkles size={16} /> UI 시안 생성하기
            </PrimaryButton>

            {answeredCount === 0 && (
              <p className="text-center text-[13px] text-[#666666] mt-3">
                옵션을 선택하지 않아도 됩니다 — AI가 최선의 선택을 합니다
              </p>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

// ─── Device frames ────────────────────────────────────────────────────────────

function MobileFrame({ children, scale = 1 }: { children: React.ReactNode; scale?: number }) {
  const frameW = 426
  const frameH = 920
  const scaledW = Math.round(frameW * scale)
  const scaledH = Math.round(frameH * scale)
  return (
    <div className="shrink-0" style={{ width: scaledW, height: scaledH, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: frameW, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div className="relative" style={{ borderRadius: 52, background: '#1a1a1a', padding: '12px 12px 16px', boxShadow: '0 40px 100px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 0 2px #000 inset' }}>
          {/* Dynamic Island */}
          <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', width: 126, height: 37, background: '#000', borderRadius: 20, zIndex: 10, boxShadow: '0 0 0 1.5px #2a2a2a' }} />
          {/* Screen — iOS 17: 402×874 */}
          <div style={{ borderRadius: 40, overflow: 'hidden', width: 402, height: 874 }}>
            {children}
          </div>
          {/* Home indicator */}
          <div style={{ margin: '8px auto 0', width: 134, height: 5, background: 'rgba(255,255,255,0.35)', borderRadius: 9999 }} />
        </div>
      </div>
    </div>
  )
}

function TabletFrame({ children, scale = 0.7 }: { children: React.ReactNode; scale?: number }) {
  const frameW = 858
  const frameH = 1218
  const scaledW = Math.round(frameW * scale)
  const scaledH = Math.round(frameH * scale)
  return (
    <div className="shrink-0" style={{ width: scaledW, height: scaledH, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: frameW, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div className="relative" style={{ borderRadius: 24, background: '#1a1a1a', padding: '12px 12px 16px', boxShadow: '0 40px 100px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 0 2px #000 inset' }}>
          {/* Home indicator */}
          <div style={{ position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)', width: 4, height: 60, background: '#2a2a2a', borderRadius: 9999 }} />
          {/* Screen — iPad Air 10.9": 834×1194 */}
          <div style={{ borderRadius: 14, overflow: 'hidden', width: 834, height: 1194 }}>
            {children}
          </div>
          {/* Home bar */}
          <div style={{ margin: '8px auto 0', width: 120, height: 5, background: 'rgba(255,255,255,0.35)', borderRadius: 9999 }} />
        </div>
      </div>
    </div>
  )
}

function DesktopFrame({ children, scale = 0.6 }: { children: React.ReactNode; scale?: number }) {
  const scaledW = Math.round(1440 * scale)
  const scaledH = Math.round(1024 * scale)
  return (
    <div className="shrink-0" style={{ width: scaledW + 2, borderRadius: 12, background: '#e8e8e8', padding: '0 1px 1px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
      {/* Browser chrome */}
      <div style={{ height: 40, background: '#d4d4d4', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 6 }}>
        <div style={{ width: 12, height: 12, borderRadius: 9999, background: '#ff5f57' }} />
        <div style={{ width: 12, height: 12, borderRadius: 9999, background: '#ffbd2e' }} />
        <div style={{ width: 12, height: 12, borderRadius: 9999, background: '#28c840' }} />
        <div style={{ flex: 1, margin: '0 12px', height: 24, background: 'rgba(255,255,255,0.6)', borderRadius: 6 }} />
      </div>
      {/* Viewport */}
      <div style={{ width: scaledW, height: scaledH, overflow: 'hidden', borderRadius: '0 0 11px 11px', background: '#fff' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function PropertiesPanel({ styles, onUpdate }: { styles: ElementStyles | null; onUpdate: (prop: string, val: string) => void }) {
  if (!styles) {
    return (
      <div className="w-72 shrink-0 border-l border-[rgba(0,0,0,0.09)] bg-white flex flex-col items-center justify-center text-center p-8">
        <div className="size-12 bg-[#e8e8e8] rounded-full flex items-center justify-center mb-4" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
          <SlidersHorizontal size={20} className="text-[#999999]" />
        </div>
        <p className="text-[13px] text-[#666666] leading-[1.6]">요소를 클릭하면<br />스타일을 확인하고<br />수정할 수 있습니다</p>
      </div>
    )
  }

  const color = rgbToHex(styles.color)
  const bg = rgbToHex(styles.backgroundColor)

  return (
    <div className="w-72 shrink-0 border-l border-[rgba(0,0,0,0.09)] bg-white overflow-y-auto text-[13px]">
      {/* Element label */}
      <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.07)] flex items-center gap-2">
        <span className="text-[13px] font-mono bg-[#f0f0f0] text-[#666666] px-1.5 py-0.5 rounded">&lt;{styles.tagName}&gt;</span>
        {styles.text && <span className="text-[#666666] truncate">{styles.text}</span>}
      </div>

      {/* TYPOGRAPHY */}
      <Section label="TYPOGRAPHY">
        <PropRow label="Font">
          <EditField value={styles.fontFamily.split(',')[0].replace(/['"]/g, '').trim()} prop="fontFamily" onUpdate={onUpdate} wide />
        </PropRow>
        <TwoCol
          left={<PropRow label="Size"><EditField value={fmtVal(styles.fontSize)} suffix="px" prop="fontSize" onUpdate={onUpdate} /></PropRow>}
          right={<PropRow label="Weight"><EditField value={styles.fontWeight} prop="fontWeight" onUpdate={onUpdate} /></PropRow>}
        />
        <TwoCol
          left={
            <PropRow label="Color">
              <div className="flex items-center gap-1.5">
                <ColorSwatch color={color} prop="color" onUpdate={onUpdate} />
                <EditField value={color} prop="color" onUpdate={onUpdate} />
              </div>
            </PropRow>
          }
          right={<PropRow label="Align"><AlignField value={styles.textAlign} prop="textAlign" onUpdate={onUpdate} /></PropRow>}
        />
        <TwoCol
          left={<PropRow label="Line"><EditField value={fmtVal(styles.lineHeight)} prop="lineHeight" onUpdate={onUpdate} /></PropRow>}
          right={<PropRow label="Tracking"><EditField value={fmtVal(styles.letterSpacing)} suffix="px" prop="letterSpacing" onUpdate={onUpdate} /></PropRow>}
        />
      </Section>

      {/* SIZE */}
      <Section label="SIZE">
        <TwoCol
          left={<PropRow label="Width"><EditField value={styles.width} prop="width" onUpdate={onUpdate} /></PropRow>}
          right={<PropRow label="Height"><EditField value={styles.height} prop="height" onUpdate={onUpdate} /></PropRow>}
        />
      </Section>

      {/* BOX */}
      <Section label="BOX">
        <PropRow label="Opacity"><EditField value={styles.opacity} prop="opacity" onUpdate={onUpdate} /></PropRow>
        <PropRow label="BG Color">
          <div className="flex items-center gap-1.5">
            <ColorSwatch color={bg} prop="backgroundColor" onUpdate={onUpdate} />
            <EditField value={bg} prop="backgroundColor" onUpdate={onUpdate} />
          </div>
        </PropRow>
        <PropRow label="Padding" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2 pl-2">
          {(['Top', 'Right', 'Bottom', 'Left'] as const).map(side => (
            <PropRow key={side} label={side[0]}>
              <EditField value={fmtVal(styles[`padding${side}` as keyof ElementStyles])} suffix="px" prop={`padding${side}`} onUpdate={onUpdate} />
            </PropRow>
          ))}
        </div>
        <PropRow label="Margin" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2 pl-2">
          {(['Top', 'Right', 'Bottom', 'Left'] as const).map(side => (
            <PropRow key={side} label={side[0]}>
              <EditField value={fmtVal(styles[`margin${side}` as keyof ElementStyles])} suffix="px" prop={`margin${side}`} onUpdate={onUpdate} />
            </PropRow>
          ))}
        </div>
        <PropRow label="Border"><EditField value={fmtVal(styles.borderWidth)} suffix="px" prop="borderWidth" onUpdate={onUpdate} /></PropRow>
        <PropRow label="Radius"><EditField value={fmtVal(styles.borderRadius)} suffix="px" prop="borderRadius" onUpdate={onUpdate} /></PropRow>
      </Section>
    </div>
  )
}

// ─── Tweaks modal ─────────────────────────────────────────────────────────────

function TweaksModal({ darkMode, brandColor, onDarkMode, onBrandColor, onClose, tweakSpec, isLoadingTweaks, activeStateId, varValues, onStateChange, onVarChange }: {
  darkMode: boolean; brandColor: string
  onDarkMode: (on: boolean) => void; onBrandColor: (c: string) => void; onClose: () => void
  tweakSpec: TweakSpec | null; isLoadingTweaks: boolean
  activeStateId: string; varValues: Record<string, number>
  onStateChange: (id: string) => void; onVarChange: (id: string, value: number) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto bg-white border border-[rgba(0,0,0,0.09)] w-72 overflow-y-auto max-h-[90vh]" style={{ borderRadius: '14px', boxShadow: 'rgba(0,0,0,0.08) 0 0 0 1px, rgba(0,0,0,0.12) 0 8px 24px 0' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.07)]">
          <span className="text-[14px] font-semibold text-[#111111]">Tweaks</span>
          <button onClick={onClose} className="text-[#666666] hover:text-[#111111] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* 시나리오 */}
        <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.07)]">
          <p className="text-[13px] font-semibold text-[#999999] uppercase tracking-wider mb-2.5">시나리오</p>
          {isLoadingTweaks ? (
            <div className="flex items-center gap-2 text-[13px] text-[#666666]">
              <Spinner /> 분석 중...
            </div>
          ) : tweakSpec?.states.length ? (
            <div className="flex gap-1.5">
              {tweakSpec.states.map(state => (
                <button
                  key={state.id}
                  onClick={() => onStateChange(state.id)}
                  className="flex-1 text-[13px] py-1.5 border transition-all"
                  style={{
                    borderRadius: '6px',
                    ...(activeStateId === state.id
                      ? { background: '#111111', color: '#ffffff', borderColor: '#111111' }
                      : { background: '#f0f0f0', color: '#666666', borderColor: 'rgba(0,0,0,0.09)' }),
                  }}
                >
                  {state.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#999999]">UI를 생성하면 시나리오가 분석됩니다</p>
          )}
        </div>

        {/* 데이터 변수 슬라이더 */}
        {!isLoadingTweaks && tweakSpec && tweakSpec.variables.length > 0 && (
          <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.07)]">
            <p className="text-[13px] font-semibold text-[#999999] uppercase tracking-wider mb-3">데이터</p>
            <div className="space-y-4">
              {tweakSpec.variables.map(v => (
                <SliderField
                  key={v.id}
                  variable={v}
                  value={varValues[v.id] ?? v.currentValue}
                  onChange={onVarChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* 테마 */}
        <div className="p-5">
          <p className="text-[13px] font-semibold text-[#999999] uppercase tracking-wider mb-3">테마</p>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] text-[#111111]">
              {darkMode ? <Moon size={14} /> : <Sun size={14} />}
              다크 모드
            </div>
            <Toggle on={darkMode} onChange={onDarkMode} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#111111]">브랜드 컬러</span>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#666666] font-mono">{brandColor}</span>
              <label className="cursor-pointer">
                <div className="size-7 border-2 cursor-pointer" style={{ borderRadius: '9999px', backgroundColor: brandColor, borderColor: 'rgba(0,0,0,0.12)', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
                <input type="color" value={brandColor} onChange={e => onBrandColor(e.target.value)} className="sr-only" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function PrimaryButton({ onClick, disabled, loading, loadingText, children }: {
  onClick: () => void; disabled: boolean; loading: boolean; loadingText: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 text-white font-medium flex items-center justify-center gap-2.5 transition-colors text-[16px]"
      style={{ borderRadius: '100px', backgroundColor: disabled ? F.hairline : F.primary, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = F.primaryActive }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.backgroundColor = F.primary }}
    >
      {loading ? <><Spinner />{loadingText}</> : children}
    </button>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[rgba(0,0,0,0.07)] px-4 py-3">
      <p className="text-[13px] font-semibold text-[#999999] uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function TwoCol({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-3">{left}{right}</div>
}

function PropRow({ label, children, wide }: { label: string; children?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('flex items-center', wide ? 'flex-col items-start gap-0.5' : 'justify-between gap-2')}>
      <span className="text-[13px] text-[#666666] shrink-0">{label}</span>
      {children}
    </div>
  )
}

function EditField({ value, prop, suffix = '', onUpdate, wide }: {
  value: string; prop: string; suffix?: string; onUpdate: (prop: string, val: string) => void; wide?: boolean
}) {
  const [val, setVal] = useState(value)
  const [scrubbing, setScrubbing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const scrubRef = useRef<{ startX: number; startVal: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setVal(value) }, [value])
  const numVal = parseFloat(val)
  const isNum = !isNaN(numVal)
  const commit = (raw: string) => { clearTimeout(timerRef.current); onUpdate(prop, raw) }

  const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!isNum || document.activeElement === inputRef.current) return
    e.preventDefault()
    scrubRef.current = { startX: e.clientX, startVal: numVal }
    setScrubbing(true)

    const onMove = (me: MouseEvent) => {
      if (!scrubRef.current) return
      const delta = Math.round((me.clientX - scrubRef.current.startX) * (me.shiftKey ? 0.1 : 1))
      const next = Math.max(0, scrubRef.current.startVal + delta)
      const nextStr = String(next)
      setVal(nextStr)
      clearTimeout(timerRef.current)
      onUpdate(prop, nextStr + (suffix || ''))
    }
    const onUp = () => {
      scrubRef.current = null
      setScrubbing(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <input
      ref={inputRef}
      value={val}
      onChange={e => {
        const raw = e.target.value; setVal(raw)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => onUpdate(prop, raw + (suffix && !raw.includes(suffix) ? suffix : '')), 120)
      }}
      onBlur={() => { if (!scrubbing) commit(val + (suffix && !val.includes(suffix) ? suffix : '')) }}
      onKeyDown={e => {
        if (e.key === 'Enter') { commit(val + (suffix && !val.includes(suffix) ? suffix : '')); e.currentTarget.blur() }
        if (isNum && e.key === 'ArrowUp') { e.preventDefault(); const n = numVal + (e.shiftKey ? 10 : 1); setVal(String(n)); commit(String(n) + (suffix || '')) }
        if (isNum && e.key === 'ArrowDown') { e.preventDefault(); const n = Math.max(0, numVal - (e.shiftKey ? 10 : 1)); setVal(String(n)); commit(String(n) + (suffix || '')) }
      }}
      onMouseDown={handleMouseDown}
      style={{ cursor: isNum && document.activeElement !== inputRef.current ? (scrubbing ? 'ew-resize' : 'col-resize') : undefined }}
      className={cn(
        'text-[13px] text-[#111111] bg-[#f0f0f0] border border-transparent hover:border-[rgba(0,0,0,0.15)] focus:border-[rgba(0,0,0,0.4)] outline-none rounded-[4px] transition-colors font-mono',
        wide ? 'w-full px-2 py-1' : 'w-20 px-1.5 py-1 text-right'
      )}
    />
  )
}

function AlignField({ value, prop, onUpdate }: { value: string; prop: string; onUpdate: (p: string, v: string) => void }) {
  const options: Array<{ value: string; icon: React.ReactNode }> = [
    { value: 'left', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 2h10M1 5h7M1 8h9M1 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { value: 'center', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 2h10M2.5 5h7M1.5 8h9M3 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { value: 'right', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 2h10M4 5h7M2 8h9M5 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]
  return (
    <div className="flex gap-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onUpdate(prop, opt.value)}
          className="flex items-center justify-center w-7 h-6 rounded transition-colors"
          style={value === opt.value ? { background: '#111111', color: '#ffffff' } : { background: '#e8e8e8', color: '#666666' }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}

function ColorSwatch({ color, prop, onUpdate }: { color: string; prop: string; onUpdate: (p: string, v: string) => void }) {
  return (
    <label className="cursor-pointer">
      <div className="size-4 border border-[rgba(0,0,0,0.15)]" style={{ borderRadius: '2px', backgroundColor: color }} />
      <input type="color" value={color.startsWith('#') ? color : '#000000'} onChange={e => onUpdate(prop, e.target.value)} className="sr-only" />
    </label>
  )
}

function SliderField({ variable, value, onChange }: {
  variable: TweakVariable
  value: number
  onChange: (id: string, value: number) => void
}) {
  const [display, setDisplay] = useState(value)

  useEffect(() => { setDisplay(value) }, [value])

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] text-[#666666]">{variable.label}</span>
        <span className="text-[13px] font-medium text-[#111111] font-mono">
          {formatVarDisplay(display, variable)}
        </span>
      </div>
      <input
        type="range"
        min={variable.min}
        max={variable.max}
        step={variable.step}
        value={display}
        onChange={e => {
          const v = Number(e.target.value)
          setDisplay(v)
          onChange(variable.id, v)
        }}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: '#0055ff' }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[13px] text-[#999999]">{formatVarDisplay(variable.min, variable)}</span>
        <span className="text-[13px] text-[#999999]">{formatVarDisplay(variable.max, variable)}</span>
      </div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ backgroundColor: on ? '#0055ff' : '#cccccc' }}
    >
      <div
        className="absolute top-0.5 size-4 bg-white rounded-full shadow transition-all"
        style={{ left: on ? '22px' : '2px' }}
      />
    </button>
  )
}

function QuestionCard({ index, question, answer, onAnswer }: {
  index: number; question: Question; answer: string | string[] | undefined; onAnswer: (value: string) => void
}) {
  const isSelected = (value: string) => {
    if (!answer) return false
    if (Array.isArray(answer)) return answer.includes(value)
    return answer === value
  }
  const hasAnswer = answer !== undefined && answer !== '' && (!Array.isArray(answer) || answer.length > 0)

  return (
    <div>
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 size-6 flex items-center justify-center text-xs font-medium mt-0.5 transition-colors" style={{ borderRadius: '9999px', ...(hasAnswer ? { backgroundColor: '#111111', color: '#ffffff' } : { backgroundColor: '#e8e8e8', color: '#666666', border: '1px solid rgba(0,0,0,0.09)' }) }}>
          {hasAnswer ? <Check size={11} /> : index}
        </span>
        <div>
          <h3 className="text-[15px] font-medium text-[#111111]">{question.question}</h3>
          {question.description && <p className="text-[13px] text-[#666666] mt-0.5">{question.description}</p>}
        </div>
      </div>

      <div className="pl-9">
        {question.type === 'text' ? (
          <textarea
            value={(answer as string) ?? ''}
            onChange={e => onAnswer(e.target.value)}
            className="w-full bg-[#f0f0f0] border p-3 text-sm text-[#111111] placeholder:text-[#999999] resize-none"
            style={{ borderRadius: '8px', outline: 'none', borderColor: 'rgba(0,0,0,0.09)' }}
            rows={3}
            placeholder="자유롭게 입력해주세요..."
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.09)' }}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {question.options?.map(option => (
              <button
                key={option}
                onClick={() => onAnswer(option)}
                className="px-4 py-2 text-sm border transition-all"
                style={{ borderRadius: '8px', ...(isSelected(option) ? { backgroundColor: '#111111', borderColor: '#111111', color: '#ffffff' } : { backgroundColor: '#f5f5f5', borderColor: 'rgba(0,0,0,0.09)', color: '#666666' }) }}
              >
                {option}
              </button>
            ))}
            {question.hasDecideForMe && (
              <button onClick={() => onAnswer('AI가 결정')} className="px-4 py-2 text-sm border flex items-center gap-1.5 transition-all" style={{ borderRadius: '8px', borderStyle: 'dashed', ...(isSelected('AI가 결정') ? { backgroundColor: 'rgba(0,85,255,0.08)', borderColor: '#0055ff', color: '#0055ff' } : { backgroundColor: '#f5f5f5', borderColor: 'rgba(0,0,0,0.09)', color: '#666666' }) }}>
                <Sparkles size={12} /> AI가 결정
              </button>
            )}
            {question.hasExplore && (
              <button onClick={() => onAnswer('다양하게 보기')} className="px-4 py-2 text-sm border transition-all" style={{ borderRadius: '8px', borderStyle: 'dashed', ...(isSelected('다양하게 보기') ? { backgroundColor: '#e8e8e8', borderColor: 'rgba(0,0,0,0.25)', color: '#111111' } : { backgroundColor: '#f5f5f5', borderColor: 'rgba(0,0,0,0.09)', color: '#666666' }) }}>
                ✦ 다양하게 보기
              </button>
            )}
          </div>
        )}
        {question.type === 'multi' && <p className="text-[13px] text-[#666666] mt-2">복수 선택 가능</p>}
      </div>
    </div>
  )
}

function Spinner() {
  return <div className="size-4 rounded-full animate-spin" style={{ border: '2px solid rgba(0,0,0,0.15)', borderTopColor: 'rgba(0,0,0,0.6)' }} />
}

function DesignSystemCardPreview({ preset }: { preset: DesignPreset }) {
  const meta = DESIGN_PRESETS[preset]
  const hasDesign = preset !== 'none' && !!meta.palette

  if (!hasDesign) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="size-10 rounded-full animate-spin" style={{ border: '2px solid rgba(0,0,0,0.10)', borderTopColor: '#0055ff' }} />
        <span className="text-[13px] text-[#666666]">생성 중...</span>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5 py-5" style={{ backgroundColor: '#f0f0f0' }}>
      <style>{`@keyframes aide-bar{0%{transform:translateX(-150%)}100%{transform:translateX(500%)}}`}</style>

      <div className="flex flex-col items-center gap-2">
        <div className="size-9 rounded-full flex items-center justify-center" style={{ background: `${meta.color}18`, border: `1.5px solid ${meta.color}50` }}>
          <Sparkles size={16} style={{ color: meta.color }} className="animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold px-2 py-0.5 rounded-full text-[#111111]" style={{ backgroundColor: meta.color }}>{meta.label}</span>
          <span className="text-[13px] text-[#666666]">적용 중</span>
        </div>
      </div>

      <div className="w-full max-w-[260px]">
        <p className="text-[13px] font-semibold text-[#999999] uppercase tracking-wider mb-2">Color Palette</p>
        <div className="flex gap-1.5">
          {meta.palette!.map(swatch => (
            <div key={swatch.name} className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full h-7 rounded-md border border-[#111111]/10" style={{ backgroundColor: swatch.hex }} />
              <span className="text-[13px] text-[#999999] font-mono leading-none">{swatch.hex}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-[260px]">
        <p className="text-[13px] font-semibold text-[#999999] uppercase tracking-wider mb-2">Typography</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-bold text-[#111111] leading-none">{meta.label}</span>
            <span className="text-[13px] text-[#999999]">{meta.fonts!.headline}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] text-[#666666] leading-none">The quick brown fox</span>
            <span className="text-[13px] text-[#999999]">{meta.fonts!.body}</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[260px]">
        <div className="flex flex-wrap gap-1">
          {meta.traits!.map(trait => (
            <span key={trait} className="text-[13px] px-2 py-0.5 rounded-full text-[#666666]" style={{ backgroundColor: '#e0e0e0' }}>{trait}</span>
          ))}
        </div>
      </div>

      <div className="w-full max-w-[260px] bg-[#f0f0f0] h-1 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: '40%', backgroundColor: meta.color, animation: 'aide-bar 1.4s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

function ImageExpandModal({ image, letter, onClose }: { image: string; letter: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}
    >
      <div className="relative flex flex-col items-center gap-3 max-h-full max-w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-white/70 text-[13px] font-medium">시안 {letter}</span>
          <button onClick={onClose} className="flex items-center gap-1 text-white/60 hover:text-white transition-colors text-[13px]">
            <X size={15} /> 닫기
          </button>
        </div>
        <img
          src={image}
          alt={`시안 ${letter}`}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl"
          style={{ boxShadow: '0 8px 48px rgba(0,0,0,0.5)' }}
        />
      </div>
    </div>
  )
}

function ExpandingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(245,245,245,0.94)', backdropFilter: 'blur(4px)' }}>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="size-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.06)', border: '2px solid rgba(0,0,0,0.12)' }}>
          <Sparkles size={28} className="text-[#111111] animate-pulse" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-[#111111] mb-1" style={{ letterSpacing: '-0.03em' }}>선택한 시안으로 프로토타입을 완성하고 있습니다</h2>
          <p className="text-[14px] text-[#666666]">서브 화면과 내비게이션을 추가하고 있습니다</p>
        </div>
        <div className="w-64 bg-[#f0f0f0] h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: '40%', backgroundColor: '#0055ff', animation: 'aide-bar 1.4s ease-in-out infinite' }}
          />
        </div>
      </div>
    </div>
  )
}
