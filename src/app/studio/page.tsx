'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  Sparkles, Upload, Download, RefreshCw, ArrowLeft, Check,
  SlidersHorizontal, X, Moon, Sun, Pencil, Send, ChevronDown,
  CornerUpLeft, CornerUpRight, Image as ImageIcon, Shapes,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import DotField from '@/components/DotField'
import type { Question, QuestionnaireResponse, TweakSpec, TweakVariable, AppDomain } from '@/lib/gemini'
import { getVariantStyles, getVariantInfo } from '@/lib/variant-refs'
import { type DesignPreset, DESIGN_PRESETS } from '@/lib/design-presets'
import { saveHistoryItem, compressThumbnail, loadHistory, deleteHistoryItem, type HistoryItem } from '@/lib/history'

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
  tagName: string; text: string; className: string
  fontFamily: string; fontSize: string; fontWeight: string
  color: string; textAlign: string; lineHeight: string; letterSpacing: string
  width: string; height: string; opacity: string
  paddingTop: string; paddingRight: string; paddingBottom: string; paddingLeft: string
  marginTop: string; marginRight: string; marginBottom: string; marginLeft: string
  borderWidth: string; borderRadius: string; backgroundColor: string; backgroundImage: string
}

// Detect web vs mobile for history items that pre-date the platform field
function guessPlatform(item: { platform?: 'mobile' | 'web'; brief: string; html: string }): 'mobile' | 'web' {
  if (item.platform) return item.platform
  const b = item.brief.toLowerCase()
  const webKw = ['웹', 'web', '랜딩', 'landing', '대시보드', 'dashboard',
                 '데스크탑', 'desktop', '어드민', 'admin', '홈페이지', 'homepage', 'saas', '관리자 페이지']
  if (webKw.some(k => b.includes(k))) return 'web'
  // Width hints: web-generated HTML typically references 1440 or 1200px containers
  if (item.html.includes('1440') || /max-width:\s*1[0-9]{3}px/.test(item.html)) return 'web'
  return 'mobile'
}

// ─── Inspector script injected into generated HTML ───────────────────────────

// Always injected: handles dark mode, brand color, navigation (no inspector UI)
const BRIDGE_SCRIPT = `<script data-aide-inject="1">
(function(){
  // 1. Block <a> link navigation (allow #anchors only)
  //    Skip [data-screen] subtrees — prototype router handles those in bubble phase
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('[data-screen]'))return;
    var el=e.target;
    while(el&&el.tagName){
      if(el.tagName==='A'){
        var h=el.getAttribute('href')||'';
        if(!h.startsWith('#')){e.preventDefault();e.stopPropagation();}
        return;
      }
      el=el.parentElement;
    }
  },true);

  // 2. Block form submissions
  document.addEventListener('submit',function(e){e.preventDefault();e.stopPropagation();},true);

  // 3. Override Location.prototype.href setter — blocks location.href = 'url'
  try{
    var locDesc=Object.getOwnPropertyDescriptor(Location.prototype,'href');
    if(locDesc&&locDesc.set){
      Object.defineProperty(Location.prototype,'href',{
        get:locDesc.get,
        set:function(v){if(typeof v==='string'&&v.startsWith('#')){locDesc.set.call(this,v);}},
        configurable:true
      });
    }
  }catch(e){}

  // 4. Override location.assign / replace
  try{window.location.assign=function(){};}catch(e){}
  try{window.location.replace=function(){};}catch(e){}

  // 5. Override history API
  try{
    var noop=function(){};
    history.pushState=noop;
    history.replaceState=noop;
    history.go=noop;
    history.back=noop;
    history.forward=noop;
  }catch(e){}

  // 6. Block window.open
  try{window.open=function(){return null;};}catch(e){}

  // 7. Last-resort beforeunload
  window.addEventListener('beforeunload',function(e){e.preventDefault();e.returnValue='';},true);

  // 8. postMessage bridge (dark mode, brand color)
  window.addEventListener('message',function(e){
    if(!e.data)return;
    var d=e.data;
    if(d.type==='aide:dark'){document.documentElement.style.filter=d.on?'invert(1) hue-rotate(180deg)':'';}
    if(d.type==='aide:brand'){var r=document.documentElement;r.style.setProperty('--color-primary',d.color);r.style.setProperty('--primary',d.color);}
  });
})();
</script>`

// Only injected in edit mode: adds inspector selection UI + style update handling
const INSPECTOR_SCRIPT = `<script data-aide-inject="1">
(function(){
  var sel=null;
  var sb=document.createElement('div');
  sb.setAttribute('data-aide-inject','1');
  sb.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;outline:2px solid #0055ff;outline-offset:0;box-sizing:border-box;border-radius:2px;transition:all 80ms ease;display:none';
  var hb=document.createElement('div');
  hb.setAttribute('data-aide-inject','1');
  hb.style.cssText='position:fixed;pointer-events:none;z-index:2147483646;background:rgba(0,85,255,0.07);box-sizing:border-box;transition:all 50ms ease';
  document.body.appendChild(sb);document.body.appendChild(hb);
  function box(el,div){var r=el.getBoundingClientRect();div.style.left=r.left+'px';div.style.top=r.top+'px';div.style.width=r.width+'px';div.style.height=r.height+'px';}
  function report(el){
    var cs=getComputedStyle(el),r=el.getBoundingClientRect();
    parent.postMessage({type:'aide:select',styles:{tagName:el.tagName.toLowerCase(),className:el.className||'',text:(el.textContent||'').trim().slice(0,80),fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,color:cs.color,textAlign:cs.textAlign,lineHeight:cs.lineHeight,letterSpacing:cs.letterSpacing,width:Math.round(r.width)+'px',height:Math.round(r.height)+'px',opacity:cs.opacity,paddingTop:cs.paddingTop,paddingRight:cs.paddingRight,paddingBottom:cs.paddingBottom,paddingLeft:cs.paddingLeft,marginTop:cs.marginTop,marginRight:cs.marginRight,marginBottom:cs.marginBottom,marginLeft:cs.marginLeft,borderWidth:cs.borderWidth,borderRadius:cs.borderRadius,backgroundColor:cs.backgroundColor,backgroundImage:cs.backgroundImage}},'*');
  }
  document.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();sel=e.target;sb.style.display='block';box(sel,sb);report(sel);},true);
  document.addEventListener('mouseover',function(e){if(e.target!==sel)box(e.target,hb);},true);
  window.addEventListener('message',function(e){
    if(!e.data)return;
    var d=e.data;
    if(d.type==='aide:update'&&sel){sel.style[d.prop]=d.value;report(sel);}
    if(d.type==='aide:setVideoSrc'&&sel){
      function makeVideo(src,ref){var v=document.createElement('video');v.src=src;v.autoplay=true;v.muted=true;v.loop=true;v.playsInline=true;v.style.cssText=ref.style.cssText;v.className=ref.className;return v;}
      if(sel.tagName==='VIDEO'){sel.src=d.url;}
      else if(sel.tagName==='IMG'){var v=makeVideo(d.url,sel);sel.parentNode.replaceChild(v,sel);sel=v;}
      else{var ci=sel.querySelector('img');if(ci){var v2=makeVideo(d.url,ci);ci.parentNode.replaceChild(v2,ci);sel=v2;}else{sel.style.backgroundImage='none';var v3=document.createElement('video');v3.src=d.url;v3.autoplay=true;v3.muted=true;v3.loop=true;v3.playsInline=true;v3.style.cssText='width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;';sel.style.position='relative';sel.appendChild(v3);sel=v3;}}
      report(sel);
    }
    if(d.type==='aide:navigate'){sel=null;sb.style.display='none';}
    if(d.type==='aide:pulse'){
      if(d.on&&sel){
        sel.style.transition='outline 0.4s ease, outline-offset 0.4s ease';
        var count=0;var iv=setInterval(function(){
          sel.style.outline=count%2===0?'3px solid #0055ff':'3px solid rgba(0,85,255,0.3)';
          sel.style.outlineOffset=count%2===0?'0px':'4px';
          count++;if(count>6)clearInterval(iv);
        },400);
        sel._pulseIv=iv;
      } else if(!d.on&&sel){
        clearInterval(sel._pulseIv);
        sel.style.outline='';sel.style.outlineOffset='';sel.style.transition='';
      }
    }
    if(d.type==='aide:setIcon'&&sel){
      var t=sel;
      // Material Symbols/Icons: textContent가 아이콘 이름
      if(t.tagName==='SPAN'||t.tagName==='I'){
        // 자식 노드를 모두 제거하고 텍스트만 설정
        while(t.firstChild)t.removeChild(t.firstChild);
        t.appendChild(document.createTextNode(d.name));
      } else if(t.tagName==='SVG'||t.tagName==='svg'){
        // SVG는 부모에 Material Symbol span을 삽입해 대체
        var sp=document.createElement('span');
        sp.className='material-symbols-outlined';
        sp.style.cssText=t.style.cssText||'font-size:24px';
        sp.textContent=d.name;
        t.parentNode.replaceChild(sp,t);
        sel=sp;
      }
      setTimeout(function(){report(sel);},50);
    }
    if(d.type==='aide:replaceImage'&&sel){
      var url=d.url;
      if(sel.tagName==='IMG'){
        sel.src=url;
      } else {
        var childImg=sel.querySelector('img');
        if(childImg){
          childImg.src=url;
        } else {
          sel.style.backgroundImage='url("'+url+'")';
          sel.style.backgroundSize='cover';
          sel.style.backgroundPosition='center';
        }
      }
      report(sel);
    }
    if(d.type==='aide:replaceIconWithImg'&&sel){
      var img=document.createElement('img');
      img.src=d.url;
      var sz=sel.tagName==='SVG'||sel.tagName==='svg'
        ?(sel.getAttribute('width')||'24')+'px'
        :(parseFloat(getComputedStyle(sel).fontSize)||24)+'px';
      img.style.cssText='width:'+sz+';height:'+sz+';object-fit:contain;display:inline-block;vertical-align:middle;';
      sel.parentNode.replaceChild(img,sel);
      sel=img;
      setTimeout(function(){report(sel);},50);
    }
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

// ─── Expanding overlay ────────────────────────────────────────────────────────

const EXPAND_STAGES = [
  '서브 화면 레이아웃 설계 중...',
  '화면 간 내비게이션 연결 중...',
  '인터랙션 & 트랜지션 추가 중...',
  '최종 완성도 높이는 중...',
]

function ExpandingOverlay({ image, platform, variantLabel }: { image?: string; platform?: string; variantLabel?: string }) {
  const [stageIdx, setStageIdx] = useState(0)
  const isMob = platform !== 'web'

  useEffect(() => {
    const t = setInterval(() => setStageIdx(i => (i + 1) % EXPAND_STAGES.length), 2600)
    return () => clearInterval(t)
  }, [])

  const W = isMob ? 76 : 118
  const H = isMob ? 130 : 80

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(248,248,248,0.93)', backdropFilter: 'blur(12px)' }}>
      <style>{`
        @keyframes ep-draw { to { stroke-dashoffset: 0 } }
        @keyframes ep-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes ep-slide { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
        @keyframes ep-bar  { 0%,100%{ transform:translateX(-100%) } 50%{ transform:translateX(200%) } }
        .ep-fr2 { stroke-dasharray:700; stroke-dashoffset:700; animation: ep-draw 1.0s cubic-bezier(.4,0,.2,1) 0.4s forwards }
        .ep-h2  { stroke-dasharray:220; stroke-dashoffset:220; animation: ep-draw 0.4s ease 1.1s forwards }
        .ep-b2  { stroke-dasharray:340; stroke-dashoffset:340; animation: ep-draw 0.45s ease 1.4s forwards }
        .ep-c2  { stroke-dasharray:240; stroke-dashoffset:240; animation: ep-draw 0.4s ease 1.7s forwards }
        .ep-fr3 { stroke-dasharray:700; stroke-dashoffset:700; animation: ep-draw 1.0s cubic-bezier(.4,0,.2,1) 1.2s forwards }
        .ep-h3  { stroke-dasharray:220; stroke-dashoffset:220; animation: ep-draw 0.4s ease 1.9s forwards }
        .ep-b3  { stroke-dasharray:340; stroke-dashoffset:340; animation: ep-draw 0.45s ease 2.2s forwards }
        .ep-c3  { stroke-dasharray:240; stroke-dashoffset:240; animation: ep-draw 0.4s ease 2.5s forwards }
        .ep-arr { opacity:0 }
        .ep-arr1 { animation: ep-slide 0.3s ease 1.35s forwards }
        .ep-arr2 { animation: ep-slide 0.3s ease 2.15s forwards }
        .ep-stage { animation: ep-fade 0.4s ease forwards }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>

        {/* ── Three screens ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Screen 1: selected thumbnail */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: W, height: H,
              borderRadius: isMob ? 10 : 6,
              overflow: 'hidden',
              boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
              border: '2.5px solid #111111',
              flexShrink: 0,
            }}>
              {image
                ? <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', background: '#e4e4e4' }} />}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#111111', letterSpacing: '-0.01em' }}>{variantLabel ?? '선택된 시안'}</span>
          </div>

          {/* Arrow 1 */}
          <div className="ep-arr ep-arr1" style={{ color: '#bbbbbb', fontSize: 20, lineHeight: '1' }}>→</div>

          {/* Screen 2: wireframe drawing */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {isMob ? (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
                <rect className="ep-fr2" x="2" y="2" width={W-4} height={H-4} rx="9" stroke="#222" strokeWidth="2"/>
                <line className="ep-h2" x1="10" y1="20" x2={W-10} y2="20" stroke="#bbb" strokeWidth="1.2"/>
                <rect className="ep-b2" x="8" y="28" width={W-16} height={Math.round(H*0.3)} rx="4" stroke="#999" strokeWidth="1.4"/>
                <line className="ep-c2" x1="8" y1={H*0.68} x2={W*0.7} y2={H*0.68} stroke="#ccc" strokeWidth="1.2"/>
                <rect className="ep-c2" x="8" y={H*0.73} width={W-16} height={Math.round(H*0.16)} rx="3" stroke="#ddd" strokeWidth="1.2"/>
              </svg>
            ) : (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
                <rect className="ep-fr2" x="2" y="2" width={W-4} height={H-4} rx="5" stroke="#222" strokeWidth="2"/>
                <line className="ep-h2" x1="2" y1="17" x2={W-2} y2="17" stroke="#ccc" strokeWidth="1.2"/>
                <rect className="ep-b2" x="8" y="23" width={W-16} height={Math.round(H*0.32)} rx="3" stroke="#999" strokeWidth="1.4"/>
                <rect className="ep-c2" x="8" y={H*0.65} width={(W-20)/2} height={Math.round(H*0.25)} rx="3" stroke="#ccc" strokeWidth="1.2"/>
                <rect className="ep-c2" x={8+(W-20)/2+4} y={H*0.65} width={(W-20)/2} height={Math.round(H*0.25)} rx="3" stroke="#ccc" strokeWidth="1.2"/>
              </svg>
            )}
            <span style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>서브 화면</span>
          </div>

          {/* Arrow 2 */}
          <div className="ep-arr ep-arr2" style={{ color: '#bbbbbb', fontSize: 20, lineHeight: '1' }}>→</div>

          {/* Screen 3: wireframe drawing */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {isMob ? (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
                <rect className="ep-fr3" x="2" y="2" width={W-4} height={H-4} rx="9" stroke="#222" strokeWidth="2"/>
                <line className="ep-h3" x1="10" y1="20" x2={W-10} y2="20" stroke="#bbb" strokeWidth="1.2"/>
                <rect className="ep-b3" x="8" y="28" width={W-16} height={Math.round(H*0.38)} rx="4" stroke="#999" strokeWidth="1.4"/>
                <rect className="ep-c3" x="8" y={H*0.72} width={W-16} height={Math.round(H*0.18)} rx="3" stroke="#ddd" strokeWidth="1.2"/>
                <line className="ep-c3" x1="8" y1={H*0.94} x2={W*0.5} y2={H*0.94} stroke="#eee" strokeWidth="1"/>
              </svg>
            ) : (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
                <rect className="ep-fr3" x="2" y="2" width={W-4} height={H-4} rx="5" stroke="#222" strokeWidth="2"/>
                <line className="ep-h3" x1="2" y1="17" x2={W-2} y2="17" stroke="#ccc" strokeWidth="1.2"/>
                <rect className="ep-b3" x="8" y="23" width={Math.round((W-20)*0.42)} height={H-30} rx="3" stroke="#999" strokeWidth="1.4"/>
                <rect className="ep-c3" x={8+Math.round((W-20)*0.42)+4} y="23" width={Math.round((W-20)*0.54)} height={Math.round((H-30)/2-2)} rx="3" stroke="#ccc" strokeWidth="1.2"/>
                <rect className="ep-c3" x={8+Math.round((W-20)*0.42)+4} y={23+Math.round((H-30)/2)+2} width={Math.round((W-20)*0.54)} height={Math.round((H-30)/2-2)} rx="3" stroke="#ccc" strokeWidth="1.2"/>
              </svg>
            )}
            <span style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>내비게이션</span>
          </div>
        </div>

        {/* ── Text ── */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111111', letterSpacing: '-0.03em', margin: 0 }}>
            선택한 시안으로 프로토타입을 완성하고 있습니다
          </h2>
          <p key={stageIdx} className="ep-stage" style={{ fontSize: 13, color: '#888888', margin: 0 }}>
            {EXPAND_STAGES[stageIdx]}
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ width: 220, height: 3, backgroundColor: '#e8e8e8', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: '#111111', borderRadius: 2, animation: 'ep-bar 1.8s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [step, setStep] = useState<Step>(1)
  const [platform, setPlatform] = useState<'mobile' | 'web'>('mobile')
  const [designPreset, setDesignPreset] = useState<DesignPreset>('ktds')
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
  const [wfAnimKey, setWfAnimKey] = useState(0)
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
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [pickedIcon, setPickedIcon] = useState<string | null>(null)
  const [originalIconText, setOriginalIconText] = useState<string | null>(null)
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

  // GNB history tabs
  const [gnbHistory, setGnbHistory] = useState<HistoryItem[]>([])
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)

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
  const studioAreaRef = useRef<HTMLDivElement>(null)
  const studioTransformRef = useRef<HTMLDivElement>(null)
  const studioScaleRef = useRef(1)
  const studioPanRef = useRef({ x: 0, y: 0 })
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
      loadHistory().then(items => {
        setGnbHistory(items.filter(h => !h.itemType || h.itemType === 'design').slice(0, 30))
        const item = items.find(h => h.id === historyId)
        if (item) loadHistoryItemIntoEditor(item)
      })
      return
    }

    const briefParam = params.get('brief')
    const presetParam = params.get('preset')
    const platformParam = params.get('platform')
    if (!briefParam) return

    const preset: DesignPreset = (presetParam && presetParam in DESIGN_PRESETS)
      ? presetParam as DesignPreset
      : 'ktds'

    setBrief(briefParam)
    setDesignPreset(preset)
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
      // Ctrl/Meta + scroll → 줌 (커서 기준)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const factor = e.deltaY > 0 ? 0.92 : 1 / 0.92
        const curZoom = canvasZoomRef.current
        const curPan = canvasPanRef.current
        const newZoom = Math.min(Math.max(curZoom * factor, 0.15), 4)
        const newPan = {
          x: mouseX - (mouseX - curPan.x) * (newZoom / curZoom),
          y: mouseY - (mouseY - curPan.y) * (newZoom / curZoom),
        }
        canvasZoomRef.current = newZoom
        canvasPanRef.current = newPan
        applyTransform(newPan, newZoom)
        return
      }
      // 트랙패드/마우스 스크롤 → 양방향 패닝
      e.preventDefault()
      const newPan = { x: canvasPanRef.current.x - e.deltaX, y: canvasPanRef.current.y - e.deltaY }
      canvasPanRef.current = newPan
      applyTransform(newPan, canvasZoomRef.current)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [step])

  // Canvas zoom/pan (step 4 studio)
  useEffect(() => {
    if (step !== 4) return
    const el = studioAreaRef.current
    if (!el) return
    const applyTransform = (pan: { x: number; y: number }, scale: number) => {
      const t = studioTransformRef.current
      if (t) t.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${scale})`
    }
    const onWheel = (e: WheelEvent) => {
      // Ctrl/Meta + scroll → 줌
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const factor = e.deltaY > 0 ? 0.92 : 1 / 0.92
        const cur = studioScaleRef.current
        const newScale = Math.min(Math.max(cur * factor, 0.15), 4)
        studioScaleRef.current = newScale
        applyTransform(studioPanRef.current, newScale)
        return
      }
      // 트랙패드/마우스 스크롤 → 양방향 패닝
      e.preventDefault()
      const newPan = { x: studioPanRef.current.x - e.deltaX, y: studioPanRef.current.y - e.deltaY }
      studioPanRef.current = newPan
      applyTransform(newPan, studioScaleRef.current)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [step])

  // Spacebar pan: hold space → grab cursor, drag → pan canvas
  useEffect(() => {
    if (step !== 3 && step !== 4) return
    const isStudio = step === 4
    const el = (isStudio ? studioAreaRef : canvasAreaRef).current
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
      const curPan = isStudio ? studioPanRef.current : canvasPanRef.current
      panStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, panX: curPan.x, panY: curPan.y }
      el.style.cursor = 'grabbing'
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return
      const dx = e.clientX - panStartRef.current.mouseX
      const dy = e.clientY - panStartRef.current.mouseY
      const newPan = { x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy }
      if (isStudio) {
        studioPanRef.current = newPan
        const t = studioTransformRef.current
        if (t) t.style.transform = `translate(${newPan.x}px,${newPan.y}px) scale(${studioScaleRef.current})`
      } else {
        canvasPanRef.current = newPan
        const t = canvasTransformRef.current
        if (t) t.style.transform = `translate(${newPan.x}px,${newPan.y}px) scale(${canvasZoomRef.current})`
      }
    }
    const onMouseUp = () => {
      if (!isPanningRef.current) return
      isPanningRef.current = false
      el.style.cursor = spaceDownRef.current ? 'grab' : ''
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

  // Wireframe animation loop while analyzing
  useEffect(() => {
    if (!isAnalyzing) return
    const id = setInterval(() => setWfAnimKey(k => k + 1), 4000)
    return () => clearInterval(id)
  }, [isAnalyzing])

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

  useEffect(() => {
    if (step !== 4) return
    loadHistory().then(items => setGnbHistory(items.filter(h => !h.itemType || h.itemType === 'design').slice(0, 30)))
  }, [step])

  const handleStyleUpdate = useCallback((prop: string, value: string) => {
    sendToIframe({ type: 'aide:update', prop, value })
  }, [sendToIframe])

  const loadHistoryItemIntoEditor = useCallback((item: HistoryItem) => {
    setBrief(item.brief)
    if (item.preset && item.preset in DESIGN_PRESETS) setDesignPreset(item.preset as DesignPreset)
    setPlatform(guessPlatform(item))
    const loaded: GenerateResult = { html: item.html, image: item.thumbnail }
    setVariants([loaded, null])
    setActiveVariant(0)
    setHistoryA([item.html]); setHistoryIndexA(0)
    setHistoryB([]); setHistoryIndexB(-1)
    const extractedColor = item.html.match(/--color-primary:\s*(#[0-9a-fA-F]{3,8})/i)?.[1] ?? '#0055ff'
    setBrandColor(extractedColor); setDebouncedBrandColor(extractedColor)
    setCurrentHistoryId(item.id)
    setEditMode(false)
    setSelectedStyles(null)
    setChatMessages([])
    setZoom(60)
    setStep(4)
  }, [])

  const commitIframeHtml = useCallback(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    // inspector가 동적으로 추가한 overlay div 제거 (serialize 전에)
    doc.querySelectorAll('[data-aide-inject="1"]:not(script)').forEach(el => el.remove())
    // pulse/inspector가 직접 적용한 인라인 outline 스타일 제거
    doc.querySelectorAll<HTMLElement>('*').forEach(el => {
      if (el.style?.outline?.includes('0055ff')) {
        el.style.outline = ''
        el.style.outlineOffset = ''
        el.style.transition = ''
      }
    })
    const raw = doc.documentElement.outerHTML
    if (!raw) return
    const cleaned = raw.replace(/<script data-aide-inject="1">[\s\S]*?<\/script>/g, '')
    setVariants(prev => {
      const updated = [...prev] as [GenerateResult | null, GenerateResult | null]
      if (updated[activeVariant]) updated[activeVariant] = { ...updated[activeVariant]!, html: cleaned }
      return updated
    })
    if (activeVariant === 0) {
      setHistoryA(prev => [...prev.slice(0, historyIndexA + 1), cleaned].slice(-30))
      setHistoryIndexA(prev => prev + 1)
    } else {
      setHistoryB(prev => [...prev.slice(0, historyIndexB + 1), cleaned].slice(-30))
      setHistoryIndexB(prev => prev + 1)
    }
  }, [activeVariant, historyIndexA, historyIndexB])


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
      const baseParams = { designMd: effectiveDesignMd, brief, answers, projectSummary: questionnaire.projectSummary, logoDataUrl, brandColors: brandColors.length > 0 ? brandColors : undefined, mainOnly: true, referenceImageBase64, platform, modelId, heroImagePrompt: questionnaire.heroImageDecision?.generate ? questionnaire.heroImageDecision.prompt : undefined }
      const variantStyles = getVariantStyles((questionnaire.domain ?? 'other') as AppDomain)
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
              platform,
              itemType: 'variant',
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

      if (data.image) {
        compressThumbnail(data.image).then(async thumbnail => {
          const newId = await saveHistoryItem({
            brief,
            preset: designPreset !== 'none' ? designPreset : null,
            designMdFileName: sessionStorage.getItem('designMdFileName') ?? null,
            html: data.html,
            thumbnail,
            platform,
            itemType: 'design',
          })
          if (newId) {
            setCurrentHistoryId(newId)
            loadHistory().then(items => {
              setGnbHistory(items.filter(h => !h.itemType || h.itemType === 'design').slice(0, 30))
            })
          }
        })
      }

      const headers = apiHeaders()
      const requestedHtml = data.html
      tweakRequestHtmlRef.current = requestedHtml
      setIsAnalyzingTweakA(true)
      fetch('/api/analyze-tweaks', { method: 'POST', headers, body: JSON.stringify({ html: requestedHtml, brief }) })
        .then(r => r.ok ? r.json() : null)
        .then(spec => {
          if (tweakRequestHtmlRef.current !== requestedHtml) return
          setTweakSpecA(spec?.states?.length ? spec : null)
          if (spec?.variables?.length) {
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
    setDesignPreset('ktds'); setLogoDataUrl(null); setLogoLoading(false); setBrandColors([])
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
        body: JSON.stringify({ html: result.html, message: userMsg, brief, designMd: effectiveDesignMd, logoDataUrl }),
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
          .then(r => r.ok ? r.json() : null)
          .then(spec => {
            if (tweakRequestHtmlRef.current !== refinedHtml) return
            setTweakSpecA(spec?.states?.length ? spec : null)
            if (spec?.variables?.length) {
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
          .then(r => r.ok ? r.json() : null)
          .then(spec => {
            if (tweakRequestHtmlRef.current !== refinedHtml) return
            setTweakSpecB(spec?.states?.length ? spec : null)
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
        {isExpandingPrototype && <ExpandingOverlay image={pickedVariantIdx !== null ? (mainVariants[pickedVariantIdx]?.image ?? undefined) : undefined} platform={platform} variantLabel={pickedVariantIdx !== null ? ['시안 A','시안 B','시안 C'][pickedVariantIdx] : undefined} />}

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

        {/* Content area: left panel + canvas */}
        <div className="flex-1 flex overflow-hidden">

        {/* Left panel */}
        {(() => {
          const selectedVariant = selectedCard?.startsWith('variant-') ? selectedCard.replace('variant-', '') as 'A' | 'B' | 'C' : null
          const variantIdx = selectedVariant ? (['A', 'B', 'C'].indexOf(selectedVariant) as 0 | 1 | 2) : null
          const variant = variantIdx !== null ? mainVariants[variantIdx] : null

          const VARIANT_INFO = getVariantInfo((questionnaire?.domain ?? 'other') as AppDomain)

          return (
            <div style={{ width: 252, flexShrink: 0, borderRight: '1px solid rgba(0,0,0,0.09)', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', padding: '24px 20px' }}>
              {selectedCard === 'design-md' ? (() => {
                const preset = DESIGN_PRESETS[designPreset]
                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ paddingBottom: 18, borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                        {designPreset !== 'none' && preset.color && (
                          <div style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: preset.color, flexShrink: 0 }} />
                        )}
                        {designPreset === 'none' && (
                          <div style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: '#f4f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                          </div>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#111111', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{preset.label}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#888888', lineHeight: 1.55, letterSpacing: '-0.1px' }}>{preset.description}</p>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {/* Color palette */}
                      {preset.palette && preset.palette.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>컬러 팔레트</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {preset.palette.map(swatch => (
                              <div key={swatch.hex} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: swatch.hex, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                                <div>
                                  <p style={{ fontSize: 11.5, fontWeight: 600, color: '#333333', margin: 0, lineHeight: 1.2 }}>{swatch.name}</p>
                                  <p style={{ fontSize: 10, color: '#aaaaaa', margin: 0, fontFamily: 'monospace', letterSpacing: '0.03em' }}>{swatch.hex}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fonts */}
                      {preset.fonts && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>타이포그래피</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: '#aaaaaa' }}>Headline</span>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#333333' }}>{preset.fonts.headline}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: '#aaaaaa' }}>Body</span>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#333333' }}>{preset.fonts.body}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Traits */}
                      {preset.traits && preset.traits.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>디자인 특성</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {preset.traits.map(trait => (
                              <span key={trait} style={{ fontSize: 11, fontWeight: 500, color: '#555555', backgroundColor: '#f4f4f6', borderRadius: 6, padding: '4px 8px', lineHeight: 1.2 }}>{trait}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Typography Scale */}
                      {preset.typographyScale && preset.typographyScale.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>타이포그래피 스케일</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {preset.typographyScale.map(step => (
                              <div key={step.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 36, flexShrink: 0, textAlign: 'right' }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#aaaaaa', fontFamily: 'monospace' }}>{step.size}</span>
                                </div>
                                <div style={{ width: 1, height: 14, backgroundColor: '#e8e8ea', flexShrink: 0 }} />
                                <span style={{ fontSize: parseInt(step.size) > 20 ? 14 : 12, fontWeight: step.weight >= 600 ? 600 : step.weight >= 500 ? 500 : 400, color: '#222222', lineHeight: 1, letterSpacing: '-0.1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{step.name}</span>
                                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#cccccc', fontFamily: 'monospace' }}>{step.weight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Colors */}
                      {preset.statusColors && preset.statusColors.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>상태 색상</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
                            {preset.statusColors.map(s => (
                              <div key={s.hex} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: s.hex, flexShrink: 0 }} />
                                <div>
                                  <p style={{ fontSize: 11, fontWeight: 600, color: '#333333', margin: 0, lineHeight: 1.2 }}>{s.name}</p>
                                  <p style={{ fontSize: 9.5, color: '#aaaaaa', margin: 0, fontFamily: 'monospace' }}>{s.hex}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Radius Tokens */}
                      {preset.radiusTokens && preset.radiusTokens.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>Border Radius</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px', alignItems: 'flex-end' }}>
                            {preset.radiusTokens.map(r => {
                              const px = parseInt(r.value)
                              const sz = Math.min(Math.max(px === 9999 || px >= 100 ? 20 : px * 1.2, 6), 20)
                              return (
                                <div key={r.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                  <div style={{ width: sz + 4, height: sz + 4, border: '1.5px solid #c8c8cc', borderRadius: px >= 999 ? 9999 : Math.min(px, (sz + 4) / 2), backgroundColor: '#f4f4f6' }} />
                                  <span style={{ fontSize: 9.5, color: '#aaaaaa', fontFamily: 'monospace', lineHeight: 1 }}>{r.name}</span>
                                  <span style={{ fontSize: 9, color: '#cccccc', fontFamily: 'monospace', lineHeight: 1 }}>{r.value}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })() : !selectedVariant ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 48 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#f4f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#aaaaaa" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  </div>
                  <p style={{ fontSize: 12.5, color: '#aaaaaa', textAlign: 'center', lineHeight: 1.65, letterSpacing: '-0.1px' }}>시안을 클릭하면<br />스타일 분석을 보여드립니다</p>
                </div>
              ) : (() => {
                const info = VARIANT_INFO[selectedVariant]
                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ paddingBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{selectedVariant}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#111111', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{info.name}</span>
                      </div>
                      {/* Strategy badge */}
                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#1a75ff', backgroundColor: 'rgba(26,117,255,0.09)', borderRadius: 5, padding: '3px 7px', letterSpacing: '0.02em', marginBottom: 8 }}>{info.strategy}</span>
                      <p style={{ fontSize: 11.5, color: '#555555', lineHeight: 1.6, letterSpacing: '-0.1px', margin: 0 }}>{info.tagline}</p>
                    </div>

                    {/* Analysis */}
                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Rationale */}
                      <div style={{ backgroundColor: '#f8f8fa', borderRadius: 8, padding: '10px 11px' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>UX 전략 근거</p>
                        <p style={{ fontSize: 11.5, color: '#444444', lineHeight: 1.65, letterSpacing: '-0.1px', margin: 0 }}>{info.rationale}</p>
                      </div>

                      {/* Key Points */}
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>설계 포인트</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {info.points.map((point, i) => {
                            const [before, after] = point.split(' → ')
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                                <div style={{ width: 17, height: 17, borderRadius: '50%', backgroundColor: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1.5 }}>
                                  <span style={{ fontSize: 8.5, fontWeight: 800, color: '#ffffff' }}>{i + 1}</span>
                                </div>
                                <p style={{ fontSize: 11.5, color: '#444444', lineHeight: 1.6, letterSpacing: '-0.1px', margin: 0 }}>
                                  {after ? (
                                    <>{before} <span style={{ color: '#aaaaaa', fontWeight: 400 }}>→</span> <span style={{ color: '#1a75ff', fontWeight: 500 }}>{after}</span></>
                                  ) : point}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Best for */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, paddingTop: 2 }}>
                        <svg style={{ marginTop: 1, flexShrink: 0 }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaaaaa" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                        <span style={{ fontSize: 11, color: '#888888', letterSpacing: '-0.05px', lineHeight: 1.55 }}><span style={{ fontWeight: 600, color: '#555555' }}>적합한 컨텍스트</span>  {info.bestFor}</span>
                      </div>

                      {/* Expected effect */}
                      <div style={{ backgroundColor: 'rgba(26,117,255,0.05)', borderRadius: 8, padding: '9px 11px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <svg style={{ marginTop: 1.5, flexShrink: 0 }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a75ff" strokeWidth="2.2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                        <span style={{ fontSize: 11, color: '#444444', letterSpacing: '-0.05px', lineHeight: 1.6 }}><span style={{ fontWeight: 700, color: '#1a75ff' }}>기대 효과</span>  {info.expectedEffect}</span>
                      </div>
                    </div>

                    {/* CTA */}
                    {variant && (
                      <button
                        onClick={() => handlePickVariant(variantIdx as 0|1|2)}
                        style={{ marginTop: 16, width: '100%', padding: '11px 0', borderRadius: '10px', backgroundColor: '#111111', color: '#ffffff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', letterSpacing: '-0.2px', transition: 'background 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#333333' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#111111' }}
                      >
                        이 시안으로 진행
                      </button>
                    )}
                    {!variant && (
                      <div style={{ marginTop: 16, width: '100%', padding: '11px 0', borderRadius: '10px', backgroundColor: '#f4f4f6', color: '#cccccc', fontSize: 13, fontWeight: 600, textAlign: 'center', letterSpacing: '-0.2px' }}>
                        생성 중...
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )
        })()}

        {/* Canvas: all cards laid out on the dotted surface */}
        <div ref={canvasAreaRef} className="flex-1 overflow-hidden relative" onClick={() => setSelectedCard(null)}>
          <div ref={canvasTransformRef} style={{ transformOrigin: '0 0', display: 'flex', alignItems: 'flex-start', gap: 24, padding: 40, width: 'max-content' }}>
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
            const isDark = designPreset === 'linear'
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
                    {/* Buttons */}
                    <div style={{ backgroundColor: cellBg, padding: '10px 10px', flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        <button style={{ backgroundColor: preset.color, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 4px', fontSize: 9, fontWeight: 600, cursor: 'default' }}>Primary</button>
                        <button style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)', color: ink, border: 'none', borderRadius: 6, padding: '6px 4px', fontSize: 9, fontWeight: 500, cursor: 'default' }}>Secondary</button>
                        <button style={{ backgroundColor: 'transparent', color: ink, border: `1px solid ${isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'}`, borderRadius: 6, padding: '6px 4px', fontSize: 9, fontWeight: 500, cursor: 'default' }}>Outline</button>
                        <button style={{ backgroundColor: 'transparent', color: ink, border: 'none', borderRadius: 6, padding: '6px 4px', fontSize: 9, fontWeight: 500, cursor: 'default' }}>Ghost</button>
                      </div>
                      <button style={{ backgroundColor: '#ff4242', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 4px', fontSize: 9, fontWeight: 600, cursor: 'default', width: '100%' }}>Negative</button>
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
                      <img src={variant.image} alt={`시안 ${letter}`} className="w-full h-full object-cover object-top" />
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

        </div>{/* ← closes content-area flex wrapper */}

        {generateError && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 text-sm text-[#ff6b6b]" style={{ borderRadius: '8px', backgroundColor: 'rgba(30,30,30,0.9)', border: '1px solid rgba(255,107,107,0.3)', backdropFilter: 'blur(8px)' }}>
            {generateError}
          </div>
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
          {/* Scrollable history tabs */}
          <div className="flex items-stretch overflow-x-auto" style={{ scrollbarWidth: 'none', flex: '1 1 0', minWidth: 0 }}>
            {gnbHistory.map(item => {
              const isActive = item.id === currentHistoryId
              return (
                <div
                  key={item.id}
                  className="group"
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    padding: '0 8px 0 14px',
                    maxWidth: 180,
                    borderRight: '1px solid rgba(0,0,0,0.06)',
                    borderBottom: isActive ? '2px solid #111111' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    height: '100%',
                  }}
                >
                  <button
                    onClick={() => loadHistoryItemIntoEditor(item)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: isActive ? '#111111' : '#666666',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      textAlign: 'left',
                      transition: 'color 0.1s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#111111' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#666666' }}
                  >
                    {item.brief.length > 16 ? item.brief.slice(0, 16) + '…' : item.brief}
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      await deleteHistoryItem(item.id)
                      const updated = gnbHistory.filter(h => h.id !== item.id)
                      setGnbHistory(updated)
                      if (isActive) {
                        if (updated.length > 0) loadHistoryItemIntoEditor(updated[0])
                        else setStep(1)
                      }
                    }}
                    style={{
                      flexShrink: 0,
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      color: '#999999',
                      fontSize: 11,
                      opacity: 0,
                      transition: 'opacity 0.1s, background-color 0.1s',
                      padding: 0,
                    }}
                    className="group-hover:!opacity-100"
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = '#333333' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#999999' }}
                    title="탭 닫기"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
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
              onClick={() => { if (editMode) commitIframeHtml(); setEditMode(e => !e); setSelectedStyles(null) }}
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
          <div ref={studioAreaRef} className="flex-1 overflow-hidden relative flex flex-col items-center justify-center">
            <div
              ref={studioTransformRef}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
              }}
            >
              {isMobile ? (
                <MobileFrame scale={zoom / 100} darkMode={darkMode}>
                  <iframe
                    ref={iframeRef}
                    srcDoc={displayHtml}
                    style={{ width: 390, height: 844, border: 'none', display: 'block' }}
                    sandbox="allow-scripts allow-same-origin"
                    title="Generated UI"
                  />
                </MobileFrame>
              ) : isTablet ? (
                <TabletFrame scale={zoom / 100}>
                  <iframe
                    ref={iframeRef}
                    srcDoc={displayHtml}
                    style={{ width: 834, height: 1170, border: 'none', display: 'block' }}
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
          </div>

          {/* Right: icon picker panel */}
          {editMode && iconPickerOpen && (
            <IconPickerPanel
              pickedIcon={pickedIcon}
              onPick={(name) => { setPickedIcon(name); sendToIframe({ type: 'aide:setIcon', name }) }}
              onApply={() => { setIconPickerOpen(false); setPickedIcon(null); setOriginalIconText(null) }}
              onCancel={() => {
                if (originalIconText !== null) sendToIframe({ type: 'aide:setIcon', name: originalIconText })
                setIconPickerOpen(false); setPickedIcon(null); setOriginalIconText(null)
              }}
            />
          )}

          {/* Right: properties panel (edit mode only, hidden when Creon or icon picker is open) */}
          {editMode && !creonOpen && !iconPickerOpen && <PropertiesPanel styles={selectedStyles} onUpdate={handleStyleUpdate}
            onCreonReplace={selectedStyles && (() => {
              const s = selectedStyles
              const visualTag = ['img', 'svg', 'canvas', 'video', 'figure', 'picture'].includes(s.tagName)
              const hasBgImage = s.backgroundImage && s.backgroundImage !== 'none'
              const w = parseFloat(s.width), h = parseFloat(s.height)
              const isSquarish = !isNaN(w) && !isNaN(h) && w < 300 && h < 300 && (w / h) > 0.5 && (w / h) < 2.0
              return visualTag || hasBgImage || isSquarish
            })() ? () => { setCreonOpen(true); sendToIframe({ type: 'aide:pulse', on: true }) } : undefined}
            onIconChange={selectedStyles && (() => {
              const s = selectedStyles
              const isMaterialSymbol = (s.tagName === 'span' || s.tagName === 'i') &&
                (s.className.includes('material-symbol') || s.className.includes('material-icon'))
              const isSvg = s.tagName === 'svg'
              return isMaterialSymbol || isSvg
            })() ? () => { setOriginalIconText(selectedStyles.text); setPickedIcon(null); setIconPickerOpen(true) } : undefined}
          />}

          {/* Right: Creon asset panel */}
          {creonOpen && (
            <div style={{ width: 520, borderLeft: '1px solid rgba(0,0,0,0.09)', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111111' }}>Creon Assets</span>
                <button onClick={() => { sendToIframe({ type: 'aide:pulse', on: false }); setCreonOpen(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#666666' }}>
                  <X size={14} />
                </button>
              </div>
              {creonAsset && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.09)', backgroundColor: '#f7f7f7', flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: '#666666', marginBottom: 6 }}>선택된 에셋{selectedStyles ? ' — 아래 버튼으로 적용' : ' — Edit 모드에서 요소를 클릭 후 적용'}</p>
                  {/\.(mp4|webm|mov)(\?|$)/i.test(creonAsset) ? (
                    <video src={creonAsset} autoPlay muted loop playsInline style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                  ) : (
                    <img src={creonAsset} alt="selected asset" style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                  )}
                  {selectedStyles && (() => {
                    const s = selectedStyles
                    const isIcon = ((s.tagName === 'span' || s.tagName === 'i') &&
                      (s.className.includes('material-symbol') || s.className.includes('material-icon'))) ||
                      s.tagName === 'svg'
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                        {!isIcon && (
                          <button
                            onClick={() => {
                              if (/\.(mp4|webm|mov)(\?|$)/i.test(creonAsset)) {
                                sendToIframe({ type: 'aide:update', prop: 'backgroundImage', value: 'none' })
                                sendToIframe({ type: 'aide:setVideoSrc', url: creonAsset })
                              } else {
                                sendToIframe({ type: 'aide:replaceImage', url: creonAsset })
                              }
                              sendToIframe({ type: 'aide:pulse', on: false })
                            }}
                            style={{ width: '100%', padding: '5px 0', fontSize: 12, fontWeight: 600, color: '#ffffff', backgroundColor: '#111111', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >
                            선택된 요소에 적용
                          </button>
                        )}
                        {isIcon && (
                          <button
                            onClick={() => {
                              sendToIframe({ type: 'aide:replaceIconWithImg', url: creonAsset })
                              sendToIframe({ type: 'aide:pulse', on: false })
                            }}
                            style={{ width: '100%', padding: '5px 0', fontSize: 12, fontWeight: 600, color: '#ffffff', backgroundColor: '#111111', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >
                            Aide에 적용하기
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
              <iframe
                src="https://creon-two.vercel.app/?v=2"
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
      {isExpandingPrototype && <ExpandingOverlay image={pickedVariantIdx !== null ? (mainVariants[pickedVariantIdx]?.image ?? undefined) : undefined} platform={platform} variantLabel={pickedVariantIdx !== null ? ['시안 A','시안 B','시안 C'][pickedVariantIdx] : undefined} />}

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 px-8 py-4 flex items-center" style={{ backgroundColor: F.canvas, borderBottom: `1px solid ${F.hairlineSoft}` }}>
        <a href="/" className="font-bold text-lg transition-colors" style={{ letterSpacing: '-0.05em', color: F.ink, textDecoration: 'none' }}>
          Aide
        </a>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── Step 1: Input ── */}
        {step === 1 && isAnalyzing && (
          <div className="flex-1 flex items-center justify-center px-8 py-16">
            <style>{`
              @keyframes wf-draw { to { stroke-dashoffset: 0 } }
              @keyframes wf-fade { from { opacity: 0 } to { opacity: 1 } }
              @keyframes wf-spin { to { transform: rotate(360deg) } }
              @keyframes wf-pulse-bar { 0%,100%{opacity:0.4} 50%{opacity:1} }
              /* Mobile wireframe classes */
              .wf-phone { stroke-dasharray:900; stroke-dashoffset:900; animation: wf-draw 1.4s cubic-bezier(.4,0,.2,1) forwards }
              .wf-hdr  { stroke-dasharray:240; stroke-dashoffset:240; animation: wf-draw 0.55s ease 1.0s  forwards }
              .wf-hero { stroke-dasharray:380; stroke-dashoffset:380; animation: wf-draw 0.5s  ease 1.4s  forwards }
              .wf-c1   { stroke-dasharray:260; stroke-dashoffset:260; animation: wf-draw 0.45s ease 1.75s forwards }
              .wf-c2   { stroke-dasharray:260; stroke-dashoffset:260; animation: wf-draw 0.45s ease 1.95s forwards }
              .wf-l1   { stroke-dasharray:120; stroke-dashoffset:120; animation: wf-draw 0.35s ease 2.2s  forwards }
              .wf-l2   { stroke-dasharray:100; stroke-dashoffset:100; animation: wf-draw 0.3s  ease 2.35s forwards }
              .wf-bar  { opacity:0; animation: wf-fade 0.4s  ease 2.55s forwards }
              .wf-tab  { opacity:0; animation: wf-fade 0.35s ease 2.75s forwards }
              /* Web wireframe classes — dasharray matches actual element perimeters */
              .wf-web-hdr  { stroke-dasharray:300; stroke-dashoffset:300; animation: wf-draw 0.55s ease 1.0s  forwards }
              .wf-web-hero { stroke-dasharray:560; stroke-dashoffset:560; animation: wf-draw 0.65s ease 1.4s  forwards }
              .wf-web-c1   { stroke-dasharray:600; stroke-dashoffset:600; animation: wf-draw 0.6s  ease 1.75s forwards }
              .wf-web-c2   { stroke-dasharray:270; stroke-dashoffset:270; animation: wf-draw 0.45s ease 2.1s  forwards }
              .wf-web-l1   { stroke-dasharray:270; stroke-dashoffset:270; animation: wf-draw 0.4s  ease 2.3s  forwards }
              .wf-web-l2   { stroke-dasharray:290; stroke-dashoffset:290; animation: wf-draw 0.35s ease 2.5s  forwards }
              .wf-web-bar  { opacity:0; animation: wf-fade 0.4s ease 2.7s forwards }
              .wf-dot1 { animation: wf-pulse-bar 1.2s ease 0.0s infinite }
              .wf-dot2 { animation: wf-pulse-bar 1.2s ease 0.2s infinite }
              .wf-dot3 { animation: wf-pulse-bar 1.2s ease 0.4s infinite }
            `}</style>
            <div style={{ display: 'flex', gap: 56, alignItems: 'center', maxWidth: 780, width: '100%' }}>

              {/* Wireframe animation */}
              <div key={wfAnimKey} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                {platform === 'web' ? (
                  <svg width="260" height="180" viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Browser shell */}
                    <rect className="wf-phone" x="4" y="4" width="252" height="172" rx="10" stroke="#222222" strokeWidth="2.5" />
                    {/* Browser top bar */}
                    <line className="wf-web-hdr" x1="4" y1="28" x2="256" y2="28" stroke="#dddddd" strokeWidth="1.2" />
                    {/* Traffic lights */}
                    <circle className="wf-web-hdr" cx="18" cy="16" r="4" stroke="#dddddd" strokeWidth="1.2" />
                    <circle className="wf-web-hdr" cx="30" cy="16" r="4" stroke="#dddddd" strokeWidth="1.2" />
                    <circle className="wf-web-hdr" cx="42" cy="16" r="4" stroke="#dddddd" strokeWidth="1.2" />
                    {/* URL bar */}
                    <rect className="wf-web-hdr" x="70" y="10" width="120" height="12" rx="6" stroke="#eeeeee" strokeWidth="1.2" />
                    {/* Nav bar */}
                    <rect className="wf-web-hero" x="12" y="34" width="236" height="22" rx="4" stroke="#cccccc" strokeWidth="1.4" />
                    <rect className="wf-web-hero" x="18" y="39" width="40" height="12" rx="2" stroke="#aaaaaa" strokeWidth="1.2" />
                    <line className="wf-web-hero" x1="160" y1="39" x2="190" y2="39" stroke="#dddddd" strokeWidth="1.2" />
                    <line className="wf-web-hero" x1="196" y1="39" x2="218" y2="39" stroke="#dddddd" strokeWidth="1.2" />
                    <rect className="wf-web-hero" x="224" y="38" width="18" height="14" rx="3" stroke="#aaaaaa" strokeWidth="1.2" />
                    {/* Hero banner */}
                    <rect className="wf-web-c1" x="12" y="62" width="236" height="46" rx="6" stroke="#aaaaaa" strokeWidth="1.6" />
                    <line className="wf-web-c1" x1="22" y1="76" x2="100" y2="76" stroke="#cccccc" strokeWidth="1.3" />
                    <line className="wf-web-c1" x1="22" y1="86" x2="76" y2="86" stroke="#dddddd" strokeWidth="1.2" />
                    <rect className="wf-web-c1" x="192" y="72" width="48" height="20" rx="4" stroke="#bbbbbb" strokeWidth="1.3" />
                    {/* Three content cards */}
                    <rect className="wf-web-c2" x="12" y="116" width="72" height="48" rx="5" stroke="#bbbbbb" strokeWidth="1.4" />
                    <line className="wf-web-c2" x1="18" y1="130" x2="66" y2="130" stroke="#cccccc" strokeWidth="1.2" />
                    <line className="wf-web-c2" x1="18" y1="140" x2="50" y2="140" stroke="#dddddd" strokeWidth="1.1" />
                    <rect className="wf-web-c2" x="94" y="116" width="72" height="48" rx="5" stroke="#bbbbbb" strokeWidth="1.4" />
                    <line className="wf-web-c2" x1="100" y1="130" x2="148" y2="130" stroke="#cccccc" strokeWidth="1.2" />
                    <line className="wf-web-c2" x1="100" y1="140" x2="132" y2="140" stroke="#dddddd" strokeWidth="1.1" />
                    <rect className="wf-web-l1" x="176" y="116" width="72" height="48" rx="5" stroke="#bbbbbb" strokeWidth="1.4" />
                    <line className="wf-web-l1" x1="182" y1="130" x2="230" y2="130" stroke="#cccccc" strokeWidth="1.2" />
                    <line className="wf-web-l1" x1="182" y1="140" x2="214" y2="140" stroke="#dddddd" strokeWidth="1.1" />
                    {/* Footer */}
                    <line className="wf-web-l2" x1="4" y1="166" x2="256" y2="166" stroke="#eeeeee" strokeWidth="1" />
                    <line className="wf-web-bar" x1="90" y1="171" x2="170" y2="171" stroke="#dddddd" strokeWidth="1.2" />
                  </svg>
                ) : (
                  <svg width="148" height="268" viewBox="0 0 148 268" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Phone shell */}
                    <rect className="wf-phone" x="4" y="4" width="140" height="260" rx="20" stroke="#222222" strokeWidth="2.5" />
                    {/* Notch */}
                    <rect className="wf-hdr" x="50" y="4" width="48" height="10" rx="5" stroke="#cccccc" strokeWidth="1.5" />
                    {/* Status bar dots */}
                    <rect className="wf-hdr" x="16" y="22" width="32" height="4" rx="2" stroke="#dddddd" strokeWidth="1.2" />
                    <rect className="wf-hdr" x="100" y="22" width="28" height="4" rx="2" stroke="#dddddd" strokeWidth="1.2" />
                    {/* Hero card */}
                    <rect className="wf-hero" x="16" y="38" width="116" height="68" rx="10" stroke="#aaaaaa" strokeWidth="1.8" />
                    <line className="wf-hero" x1="28" y1="56" x2="90" y2="56" stroke="#cccccc" strokeWidth="1.4" />
                    <line className="wf-hero" x1="28" y1="68" x2="72" y2="68" stroke="#dddddd" strokeWidth="1.2" />
                    <rect className="wf-hero" x="28" y="80" width="48" height="14" rx="4" stroke="#bbbbbb" strokeWidth="1.4" />
                    {/* Two stat cards */}
                    <rect className="wf-c1" x="16" y="118" width="52" height="52" rx="8" stroke="#bbbbbb" strokeWidth="1.6" />
                    <line className="wf-c1" x1="26" y1="134" x2="58" y2="134" stroke="#cccccc" strokeWidth="1.2" />
                    <line className="wf-c1" x1="26" y1="144" x2="46" y2="144" stroke="#dddddd" strokeWidth="1.2" />
                    <rect className="wf-c2" x="80" y="118" width="52" height="52" rx="8" stroke="#bbbbbb" strokeWidth="1.6" />
                    <line className="wf-c2" x1="90" y1="134" x2="122" y2="134" stroke="#cccccc" strokeWidth="1.2" />
                    <line className="wf-c2" x1="90" y1="144" x2="110" y2="144" stroke="#dddddd" strokeWidth="1.2" />
                    {/* List item lines */}
                    <line className="wf-l1" x1="16" y1="184" x2="132" y2="184" stroke="#dddddd" strokeWidth="1.3" />
                    <line className="wf-l2" x1="16" y1="198" x2="100" y2="198" stroke="#eeeeee" strokeWidth="1.2" />
                    {/* Progress bar */}
                    <rect className="wf-bar" x="16" y="214" width="116" height="7" rx="3.5" fill="#eeeeee" />
                    <rect className="wf-bar" x="16" y="214" width="70" height="7" rx="3.5" fill="#222222" />
                    {/* Tab divider */}
                    <line className="wf-tab" x1="4" y1="234" x2="144" y2="234" stroke="#eeeeee" strokeWidth="1" />
                    {/* Tab icons */}
                    <rect className="wf-tab" x="22" y="242" width="20" height="18" rx="3" fill="#eeeeee" />
                    <rect className="wf-tab" x="64" y="242" width="20" height="18" rx="3" fill="#222222" />
                    <rect className="wf-tab" x="106" y="242" width="20" height="18" rx="3" fill="#eeeeee" />
                  </svg>
                )}
                {/* Animated dots */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div className="wf-dot1" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#cccccc' }} />
                  <div className="wf-dot2" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#cccccc' }} />
                  <div className="wf-dot3" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#cccccc' }} />
                </div>
              </div>

              {/* Right: info + steps */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: '#111111', marginBottom: 6 }}>
                    정확한 시안을 위해 분석 중입니다
                  </h2>
                  <p style={{ fontSize: 14, color: '#888888', lineHeight: 1.55 }}>선택하신 내용을 바탕으로 맞춤형 질문지를 만들고 있어요</p>
                </div>

                {/* Logo + Design system row */}
                {(logoDataUrl || designPreset !== 'none') && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {logoDataUrl && (
                      <div style={{ padding: '10px 14px', borderRadius: 12, backgroundColor: '#f7f7f7', border: '1px solid #eeeeee', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 80 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Logo</p>
                        <img src={logoDataUrl} alt="logo" style={{ height: 28, maxWidth: 72, objectFit: 'contain', borderRadius: 4 }} />
                      </div>
                    )}
                    {designPreset !== 'none' && (
                      <div style={{ flex: 1, padding: '10px 14px', borderRadius: 12, backgroundColor: '#f7f7f7', border: '1px solid #eeeeee' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>Design System</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: DESIGN_PRESETS[designPreset].color ?? '#888', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111111' }}>{DESIGN_PRESETS[designPreset].label}</span>
                          <span style={{ fontSize: 12, color: '#888888' }}>{DESIGN_PRESETS[designPreset].description}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Brief preview */}
                <div style={{ padding: '14px 18px', borderRadius: 12, backgroundColor: '#f7f7f7', border: '1px solid #eeeeee' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#bbbbbb', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>기획서</p>
                  <p style={{ fontSize: 13, color: '#444444', lineHeight: 1.65, maxHeight: 72, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>{brief}</p>
                </div>

                {/* Step indicators */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: '요청사항 파악 완료', done: true },
                    ...(logoDataUrl ? [{ label: '브랜드 로고 인식 완료', done: true }] : []),
                    ...(designPreset !== 'none' ? [{ label: `${DESIGN_PRESETS[designPreset].label} 가이드라인 적용 완료`, done: true }] : []),
                    { label: '맞춤형 질문지 생성 중...', done: false, active: true },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: item.done ? '#111111' : '#f0f0f0', border: item.active ? '1.5px solid #dddddd' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {item.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="2,5.5 4,7.5 8,3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        {item.active && <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #aaaaaa', borderTopColor: '#111111', animation: 'wf-spin 0.75s linear infinite' }} />}
                      </div>
                      <span style={{ fontSize: 13, color: item.done ? '#111111' : '#999999', fontWeight: item.active ? 500 : 400, letterSpacing: '-0.1px' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && !isAnalyzing && (
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
                    {(Object.keys(DESIGN_PRESETS).filter(k => k !== 'none') as DesignPreset[]).map(key => {
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

function MobileFrame({ children, scale = 1, darkMode = false }: { children: React.ReactNode; scale?: number; darkMode?: boolean }) {
  const frameW = 408
  const frameH = 934
  const scaledW = Math.round(frameW * scale)
  const scaledH = Math.round(frameH * scale)
  const now = new Date()
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const statusBg = darkMode ? '#0f0f10' : '#fff'
  const iconColor = darkMode ? '#fff' : '#1c1b14'
  return (
    <div className="shrink-0" style={{ width: scaledW, height: scaledH, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: frameW, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div className="relative" style={{ borderRadius: 46, background: '#1c1c1c', padding: '9px 9px 9px', boxShadow: '0 0 0 1px rgba(255,255,255,0.07) inset, 0 0 0 2px #000 inset' }}>
          {/* Volume up — right (Android/Pixel) */}
          <div style={{ position: 'absolute', top: 120, right: -3, width: 3, height: 36, background: '#2e2e2e', borderRadius: 9999 }} />
          {/* Volume down — right */}
          <div style={{ position: 'absolute', top: 166, right: -3, width: 3, height: 36, background: '#2e2e2e', borderRadius: 9999 }} />
          {/* Power — right, below volume */}
          <div style={{ position: 'absolute', top: 224, right: -3, width: 3, height: 56, background: '#2e2e2e', borderRadius: 9999 }} />
          {/* Screen — 390×916 (390px = AI 생성 기준, 916 = 48 statusbar + 844 content + 24 nav) */}
          <div style={{ borderRadius: 37, overflow: 'hidden', width: 390, height: 916, display: 'flex', flexDirection: 'column' }}>
            {/* Android Material You Status Bar — 48px (Figma node 102:3 실측) */}
            <div style={{ flexShrink: 0, height: 48, background: statusBg, display: 'flex', alignItems: 'center', paddingLeft: 17, paddingRight: 14, transition: 'background 0.3s' }}>
              {/* Dot indicator (Figma: Ellipse 1, 4×4px) */}
              <div style={{ width: 4, height: 4, background: iconColor, borderRadius: 9999, marginRight: 13, flexShrink: 0 }} />
              {/* Time — Roboto Medium 14px, opacity 0.6 (Figma node 102:4) */}
              <span style={{ fontSize: 14, fontWeight: 500, fontFamily: 'Roboto, sans-serif', color: iconColor, opacity: 0.6, letterSpacing: 0 }}>{timeStr}</span>
              <div style={{ flex: 1 }} />
              {/* Signal — filled wedge 17×13 (Figma node 102:6) */}
              <svg width="17" height="13" viewBox="0 0 17 13" fill="none" style={{ marginRight: 4 }}>
                <path d="M17 0 L17 13 L0 13 Z" fill={iconColor}/>
              </svg>
              {/* WiFi — filled arcs 14×14 (Figma node 102:7) */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4 }}>
                <path d="M7 2.5C4.5 2.5 2.2 3.5 0.5 5.2L2 6.7C3.3 5.3 5.1 4.5 7 4.5s3.7.8 5 2.2l1.5-1.5C11.8 3.5 9.5 2.5 7 2.5z" fill={iconColor}/>
                <path d="M7 6.5C5.5 6.5 4.2 7.1 3.2 8.1l1.5 1.5C5.3 9 6.1 8.5 7 8.5s1.7.5 2.3 1.1l1.5-1.5C9.8 7.1 8.5 6.5 7 6.5z" fill={iconColor}/>
                <circle cx="7" cy="12.5" r="1.5" fill={iconColor}/>
              </svg>
              {/* Battery — solid filled with terminal (Figma node 102:8 Union) */}
              <svg width="17" height="13" viewBox="0 0 19 13" fill="none">
                <rect x="0" y="1.5" width="15" height="10" rx="2" fill={iconColor}/>
                <path d="M16 4.5v4a2 2 0 0 0 0-4z" fill={iconColor}/>
              </svg>
            </div>
            {/* App content area */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {children}
            </div>
            {/* Android gesture nav — indicator 70×3px, borderRadius 21 (Figma 실측) */}
            <div style={{ flexShrink: 0, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: statusBg, transition: 'background 0.3s' }}>
              <div style={{ width: 70, height: 3, background: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', borderRadius: 21 }} />
            </div>
          </div>
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
  const now = new Date()
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return (
    <div className="shrink-0" style={{ width: scaledW, height: scaledH, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: frameW, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div className="relative" style={{ borderRadius: 24, background: '#1a1a1a', padding: '12px 12px 16px', boxShadow: '0 40px 100px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 0 2px #000 inset' }}>
          {/* Side button */}
          <div style={{ position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)', width: 4, height: 60, background: '#2a2a2a', borderRadius: 9999 }} />
          {/* Screen — iPad Air 10.9": 834×1194 */}
          <div style={{ borderRadius: 14, overflow: 'hidden', width: 834, height: 1194, display: 'flex', flexDirection: 'column' }}>
            {/* iPadOS Status Bar — real element, 24px */}
            <div style={{ flexShrink: 0, height: 24, display: 'flex', alignItems: 'center', paddingLeft: 20, paddingRight: 16, background: '#000' }}>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: '-apple-system, SF Pro Display, sans-serif', color: '#fff' }}>{timeStr}</span>
              <div style={{ flex: 1 }} />
              <svg width="14" height="10" viewBox="0 0 17 12" fill="none" style={{ marginRight: 5 }}>
                <rect x="0" y="7" width="3" height="5" rx="1" fill="white"/>
                <rect x="4.5" y="4.5" width="3" height="7.5" rx="1" fill="white"/>
                <rect x="9" y="2" width="3" height="10" rx="1" fill="white"/>
                <rect x="13.5" y="0" width="3" height="12" rx="1" fill="white"/>
              </svg>
              <svg width="14" height="10" viewBox="0 0 16 12" fill="none" style={{ marginRight: 5 }}>
                <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill="white"/>
                <path d="M3.5 6.5C4.8 5.2 6.3 4.5 8 4.5s3.2.7 4.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                <path d="M1 3.5C3 1.5 5.4.5 8 .5s5 1 7 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
              <svg width="22" height="10" viewBox="0 0 25 12" fill="none">
                <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" strokeOpacity="0.35"/>
                <rect x="2" y="2" width="17" height="8" rx="2" fill="white"/>
                <path d="M23 4v4a2 2 0 0 0 0-4z" fill="white" fillOpacity="0.4"/>
              </svg>
            </div>
            {/* App content area — below status bar, no overlap */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {children}
            </div>
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
    <div className="shrink-0" style={{ width: scaledW, borderRadius: 12, overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.13)' }}>
      {/* macOS Sequoia title bar */}
      <div style={{ height: 32, background: '#ebebeb', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, borderBottom: '0.5px solid rgba(0,0,0,0.08)', position: 'relative' }}>
        {/* Traffic lights */}
        <div style={{ width: 13, height: 13, borderRadius: 9999, background: '#ff5f57' }} />
        <div style={{ width: 13, height: 13, borderRadius: 9999, background: '#febc2e' }} />
        <div style={{ width: 13, height: 13, borderRadius: 9999, background: '#28c840' }} />
        {/* Centered toolbar area */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 60, height: 20, background: 'rgba(0,0,0,0.06)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5 2l3 3-3 3" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ width: 160, height: 20, background: 'rgba(0,0,0,0.05)', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 7, gap: 5 }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><rect x="1.5" y="4.5" width="7" height="5" rx="1.2" stroke="rgba(0,0,0,0.3)" strokeWidth="1.1"/><path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="rgba(0,0,0,0.3)" strokeWidth="1.1" strokeLinecap="round"/></svg>
            <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontFamily: '-apple-system, SF Pro Text, sans-serif', letterSpacing: 0.1 }}>localhost:3000</span>
          </div>
        </div>
      </div>
      {/* Viewport */}
      <div style={{ width: scaledW, height: scaledH, overflow: 'hidden', background: '#fff' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function PropertiesPanel({ styles, onUpdate, onCreonReplace, onIconChange }: { styles: ElementStyles | null; onUpdate: (prop: string, val: string) => void; onCreonReplace?: () => void; onIconChange?: () => void }) {
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
    <div className="w-72 shrink-0 border-l border-[rgba(0,0,0,0.09)] bg-white flex flex-col text-[13px]">
      <div className="flex-1 overflow-y-auto">
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

      {(onCreonReplace || onIconChange) && (
        <div className="px-3 py-3 border-t border-[rgba(0,0,0,0.07)] flex flex-col gap-2 shrink-0">
          {onCreonReplace && (
            <button
              onClick={onCreonReplace}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold"
              style={{ backgroundColor: '#111111', color: '#ffffff', border: 'none', cursor: 'pointer' }}
            >
              <ImageIcon size={13} />
              Creon에서 변경
            </button>
          )}
          {onIconChange && (
            <button
              onClick={onIconChange}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold"
              style={{ backgroundColor: '#f0f0f0', color: '#111111', border: '1px solid rgba(0,0,0,0.09)', cursor: 'pointer' }}
            >
              <Shapes size={13} />
              아이콘 변경
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Icon Picker ──────────────────────────────────────────────────────────────

// Fallback icons shown instantly while full list loads
const FALLBACK_ICONS = [
  'home', 'search', 'menu', 'close', 'settings', 'person', 'favorite', 'star',
  'add', 'edit', 'delete', 'share', 'arrow_back', 'arrow_forward', 'check',
  'notifications', 'shopping_cart', 'email', 'phone', 'camera',
]

// Module-level cache so re-opening the panel doesn't re-fetch
let _iconListCache: string[] | null = null

async function fetchMaterialIconNames(): Promise<string[]> {
  if (_iconListCache) return _iconListCache

  const SESSION_KEY = 'aide_material_icons_v1'
  try {
    const cached = sessionStorage.getItem(SESSION_KEY)
    if (cached) {
      _iconListCache = JSON.parse(cached)
      return _iconListCache!
    }
  } catch { /* ignore */ }

  const res = await fetch(
    'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints'
  )
  const text = await res.text()
  const icons = text.trim().split('\n')
    .map(line => line.split(' ')[0].trim())
    .filter(Boolean)
    .sort()

  _iconListCache = icons
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(icons)) } catch { /* quota exceeded */ }
  return icons
}

function IconPickerPanel({ pickedIcon, onPick, onApply, onCancel }: {
  pickedIcon: string | null
  onPick: (name: string) => void
  onApply: () => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const [allIcons, setAllIcons] = useState<string[]>(_iconListCache ?? FALLBACK_ICONS)
  const [loading, setLoading] = useState(!_iconListCache)

  useEffect(() => {
    const id = 'aide-material-symbols'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0'
      document.head.appendChild(link)
    }
  }, [])

  useEffect(() => {
    if (_iconListCache) return
    fetchMaterialIconNames()
      .then(icons => { setAllIcons(icons); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? allIcons.filter(n => n.includes(q)) : allIcons
  }, [query, allIcons])

  return (
    <div
      className="fixed right-4 top-[60px] bottom-4 z-30 flex flex-col overflow-hidden bg-white border border-[rgba(0,0,0,0.09)] w-72"
      style={{ borderRadius: '14px', boxShadow: 'rgba(0,0,0,0.08) 0 0 0 1px, rgba(0,0,0,0.12) 0 8px 24px 0' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,0,0,0.07)] shrink-0">
        <span className="text-[14px] font-semibold text-[#111111]">아이콘 변경</span>
        <button onClick={onCancel} className="text-[#666666] hover:text-[#111111] transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[rgba(0,0,0,0.07)] shrink-0">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="아이콘 검색..."
          className="w-full bg-[#f0f0f0] text-[13px] text-[#111111] placeholder:text-[#999999] px-3 py-1.5 outline-none"
          style={{ borderRadius: '8px', border: '1px solid rgba(0,0,0,0.09)' }}
        />
      </div>

      {/* Current pick preview */}
      {pickedIcon && (
        <div className="px-4 py-2 border-b border-[rgba(0,0,0,0.07)] flex items-center gap-2 bg-[#f8f8f8] shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#0055ff' }}>{pickedIcon}</span>
          <span className="text-[13px] text-[#0055ff] font-medium">{pickedIcon}</span>
        </div>
      )}

      {/* Icon grid */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-[#888888]">
            <Spinner />
            <span>아이콘 불러오는 중...</span>
          </div>
        )}
        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {filtered.map(name => (
            <button
              key={name}
              title={name}
              onClick={() => onPick(name)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg transition-all"
              style={pickedIcon === name
                ? { backgroundColor: '#0055ff15', outline: '1.5px solid #0055ff' }
                : { backgroundColor: 'transparent' }
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: pickedIcon === name ? '#0055ff' : '#333333' }}>{name}</span>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-[13px] text-[#999999] py-8">검색 결과 없음</p>
        )}
      </div>

      {/* Apply / Cancel */}
      <div className="px-3 py-3 border-t border-[rgba(0,0,0,0.07)] flex gap-2 shrink-0">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-[13px] font-medium border transition-all"
          style={{ borderRadius: '8px', backgroundColor: '#f0f0f0', borderColor: 'rgba(0,0,0,0.09)', color: '#666666' }}
        >
          취소
        </button>
        <button
          onClick={onApply}
          disabled={!pickedIcon}
          className="flex-1 py-2 text-[13px] font-medium border transition-all disabled:opacity-40"
          style={{ borderRadius: '8px', backgroundColor: '#111111', borderColor: '#111111', color: '#ffffff' }}
        >
          적용
        </button>
      </div>
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


