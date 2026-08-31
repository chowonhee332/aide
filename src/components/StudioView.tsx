'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  Sparkles, Upload, Download, RefreshCw, ArrowLeft, Check,
  SlidersHorizontal, X, Moon, Sun, Pencil, Send, ChevronDown,
  CornerUpLeft, CornerUpRight, Image as ImageIcon, Shapes, Zap,
} from '@/components/ui/material-icon'
import { cn } from '@/lib/utils'
import DotField from '@/components/DotField'
import type { Question, QuestionnaireResponse, TweakSpec, TweakVariable, AppDomain, AsIsPageAnalysis } from '@/lib/gemini'
import { DOMAIN_KEY_TO_LABEL, DOMAIN_LABEL_TO_KEY, DOMAIN_HOME_EMPHASIS_OPTIONS } from '@/lib/domain-constants'
import { getVariantInfo } from '@/lib/variant-refs'
import { buildDesignIntelligencePlan, detectLandingIntent } from '@/lib/design-intelligence'
import { type DesignPreset, DESIGN_PRESETS } from '@/lib/design-presets'
import { saveHistoryItem, updateHistoryItem, compressThumbnail, loadHistory, deleteHistoryItem, type HistoryItem } from '@/lib/history'
import { AIDE_UI, DEFAULT_GENERATED_BRAND_COLOR } from '@/lib/aide-ui'
import { Button } from '@/components/ui/button'
import type { DesignCanvasIR, DesignDirection } from '@/lib/design-canvas-ir'
import { GEMINI_DESIGN_MODEL } from '@/lib/gemini-model-policy'
import { compileStudioDesignTheme, type StudioDesignTheme, type UIScreenIR, type UIScreenSection, type UIScreenVariant } from '@/lib/ui-screen-ir'
import { serializeUIScreenToHtml } from '@/lib/ui-screen-serializer'
import { screenIrToNodeGraph, validateNodeGraph } from '@/lib/ui-node-graph'
import { UINodeGraphCanvas } from '@/components/UINodeGraphCanvas'

// Aide product chrome tokens. Generated previews use their selected DESIGN.md separately.
const F = {
  // 서피스
  canvas:          AIDE_UI.page,
  surface:         AIDE_UI.surface,
  surface1:        AIDE_UI.surface,
  // 텍스트
  ink:             AIDE_UI.text,
  inkMuted:        AIDE_UI.textMuted,
  inkAlternative:  AIDE_UI.textAssistive,
  inkSubtle:       AIDE_UI.textAssistive,
  // Primary
  primary:         AIDE_UI.primary,
  primaryActive:   AIDE_UI.primaryStrong,
  // 보더
  hairline:        AIDE_UI.border,
  hairlineSoft:    AIDE_UI.borderSubtle,
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4
const DEFAULT_AIDE_LOGO_SRC = '/logo_aide.png'

interface GenerateResult {
  html: string
  image: string
  has3dHero?: boolean
  imageWarnings?: string[]
  variantDescription?: {
    strategy?: string
    intent?: string
    layoutThesis?: string
  }
  designDirection?: DesignDirection
  designCanvas?: DesignCanvasIR
  screenIr?: UIScreenIR
}

type GenerationEventStatus = 'active' | 'done' | 'error'
type GenerationEventKind = 'read' | 'think' | 'design' | 'image' | 'render' | 'review' | 'artifact' | 'summary' | 'error'

interface GenerationEvent {
  id: string
  kind: GenerationEventKind
  title: string
  detail?: string
  status: GenerationEventStatus
  variant?: 'A' | 'B' | 'C'
}

interface ElementStyles {
  tagName: string; text: string; className: string
  fontFamily: string; fontSize: string; fontWeight: string
  color: string; textAlign: string; lineHeight: string; letterSpacing: string
  width: string; height: string; opacity: string
  paddingTop: string; paddingRight: string; paddingBottom: string; paddingLeft: string
  marginTop: string; marginRight: string; marginBottom: string; marginLeft: string
  borderWidth: string; borderRadius: string; backgroundColor: string; backgroundImage: string
}

/**
 * Studio 비교 프리뷰용: 앱셸의 고정 높이·내부 스크롤·고정 chrome을 풀어 페이지가
 * 자연스럽게 흐르게 한다. 이렇게 해야 iframe scrollHeight = 실제 전체 콘텐츠 높이가
 * 되어 A/B/C 3개가 모두 펼쳐진 상태로 보인다 (앱셸을 쓰면 scrollHeight가 뷰포트 높이로
 * 측정돼 나머지가 카드의 overflow:hidden에 잘린다).
 */
function flattenForPreview(html: string): string {
  const css = `<style data-aide-preview-flatten="1">
html,body{height:auto!important;min-height:0!important;overflow:visible!important}
.app-shell,[data-layout-variant],.app,.screen,.phone-screen,.mobile-shell,.page-shell,.home-screen{display:block!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}
.content-scroll,.page-scroll,.aide-page,.scroll-body,.main-content,.content,.scroll-content,main{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}
header,.app-header,.top-navigation,.global-nav,.aide-shell-appbar,.bottom-navigation,.mobile-tabbar,.bottom-tabbar,[class*="tabbar"],[class*="bottom-bar"],[class*="fixed-bottom"]{position:static!important;inset:auto!important;transform:none!important;width:auto!important;max-width:100%!important;margin:0!important;flex:none!important}
</style>`
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${css}</head>`)
  if (/<body[^>]*>/i.test(html)) return html.replace(/(<body[^>]*>)/i, `$1${css}`)
  return css + html
}

function patchHeroToScene(html: string, base64: string, mimeType: string): string {
  const dataUrl = `data:${mimeType};base64,${base64}`
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // 1) img.aide-hero-3d 찾기
  const heroImg = doc.querySelector<HTMLImageElement>('img.aide-hero-3d')
    ?? doc.querySelector<HTMLImageElement>('[data-aide-required-visual="creon-object-3d"] img')
  if (!heroImg) return html

  // 2) .aide-visual-stage (이미지 래퍼) 찾기
  const stageClasses = ['aide-visual-stage', 'mascot-stage', 'hero-visual', 'scene-visual', 'reward-stage']
  let stageEl: HTMLElement | null = heroImg.parentElement
  while (stageEl && !stageClasses.some(c => stageEl!.classList.contains(c))) {
    stageEl = stageEl.parentElement
  }

  // 3) 히어로 카드 = stage의 부모 (텍스트+이미지+CTA를 모두 품는 컨테이너)
  const heroCard: HTMLElement | null = stageEl?.parentElement ?? heroImg.parentElement?.parentElement ?? null
  if (!heroCard) return html

  // 4) 히어로 카드를 scene 컨테이너로 변환 — 카드가 아니라 화면 끝까지 가는 전체 배너로
  heroCard.setAttribute('data-aide-required-visual', 'scene-3d-card-cover')
  heroCard.style.position = 'relative'
  heroCard.style.overflow = 'hidden'
  heroCard.style.minHeight = '380px'
  // 페이지 좌우/상단 여백을 음수 마진으로 깨서 풀블리드(전체 배너)로 만든다
  heroCard.style.marginLeft = 'calc(-1 * var(--aide-page-padding, 16px))'
  heroCard.style.marginRight = 'calc(-1 * var(--aide-page-padding, 16px))'
  heroCard.style.marginTop = 'calc(-1 * var(--aide-section-gap, 16px))'
  heroCard.style.borderRadius = '0'
  heroCard.style.border = 'none'
  heroCard.style.boxShadow = 'none'
  // 콘텐츠 레이어는 다시 좌우 여백을 확보 (텍스트/CTA가 화면 끝에 붙지 않게)
  heroCard.style.padding = 'var(--aide-card-padding, 16px) var(--aide-page-padding, 16px)'

  // 5) stage 자리에 씬 이미지 삽입 (absolute full-cover)
  const sceneImg = doc.createElement('img')
  sceneImg.className = 'aide-hero-3d aide-hero-scene-img'
  sceneImg.src = dataUrl
  sceneImg.alt = ''
  sceneImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 35%;display:block;z-index:0;'
  if (stageEl) {
    heroCard.replaceChild(sceneImg, stageEl)
  } else {
    heroCard.insertBefore(sceneImg, heroCard.firstChild)
  }

  // 6) 그라데이션 오버레이 — Dim을 약하게. 텍스트가 있는 상/하단만 살짝, 가운데(피사체)는 거의 투명
  const overlay = doc.createElement('div')
  overlay.className = 'aide-scene-overlay'
  overlay.setAttribute('aria-hidden', 'true')
  overlay.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.34) 0%,rgba(0,0,0,0.05) 32%,rgba(0,0,0,0) 55%,rgba(0,0,0,0.42) 100%);pointer-events:none;z-index:1;'
  sceneImg.insertAdjacentElement('afterend', overlay)

  // 7) 나머지 자식(텍스트, CTA)을 씬 위로 올리고 white + 텍스트 그림자로 가독성 확보 (Dim 약하게 대신)
  Array.from(heroCard.children).forEach(child => {
    const el = child as HTMLElement
    if (el === sceneImg || el === overlay) return
    el.style.position = 'relative'
    el.style.zIndex = '2'
    // 텍스트가 씬 위에서 보이도록 색상 + 그림자 조정
    const isBtn = el.tagName === 'BUTTON' || el.querySelector('button')
    if (!isBtn) {
      const computedColor = el.style.color
      if (!computedColor || computedColor === 'inherit' || computedColor === 'initial') {
        el.style.color = '#ffffff'
      }
      if (!el.style.textShadow) el.style.textShadow = '0 1px 10px rgba(0,0,0,0.45)'
    }
    // 내부 텍스트 요소들도 white + 그림자 적용
    el.querySelectorAll<HTMLElement>('p, span, h1, h2, h3, h4, small, label').forEach(t => {
      if (!t.style.color || t.style.color === 'inherit') t.style.color = '#ffffff'
      if (!t.style.textShadow) t.style.textShadow = '0 1px 10px rgba(0,0,0,0.45)'
    })
  })

  return '<!DOCTYPE html>' + doc.documentElement.outerHTML
}

function platformLabel(platform?: 'mobile' | 'web') {
  return platform === 'web' ? '웹 서비스' : '모바일 앱'
}

function platformFromIntent(value?: string): 'mobile' | 'web' | null {
  if (!value) return null
  if (value.includes('웹') || value.includes('랜딩') || value.includes('대시보드') || value.includes('포털')) return 'web'
  if (value.includes('모바일')) return 'mobile'
  return null
}

async function readUIScreenStream(
  response: Response,
  onPatch: (patch: { variant: UIScreenVariant; screen?: Omit<UIScreenIR, 'sections'>; section?: UIScreenSection }) => void,
  onStep?: (label: string) => void,
): Promise<{ variants: GenerateResult[]; theme: StudioDesignTheme }> {
  if (!response.ok || !response.body) throw new Error(await response.text().catch(() => `생성 요청에 실패했습니다. (${response.status})`))
  const reader = response.body.getReader(); const decoder = new TextDecoder()
  let buffer = ''; let result: { variants: GenerateResult[]; theme: StudioDesignTheme } | null = null
  const handleBlock = (block: string) => {
    let eventName = 'message'; const data: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim()
      if (line.startsWith('data:')) data.push(line.slice(5).trim())
    }
    if (!data.length) return
    const payload = JSON.parse(data.join('\n'))
    if (eventName === 'ui_patch') onPatch(payload)
    else if (eventName === 'step') onStep?.(payload.label)
    else if (eventName === 'error') throw new Error(payload.error || '구조화 UI 생성에 실패했습니다.')
    else if (eventName === 'done') result = payload
  }
  while (true) {
    const { value, done } = await reader.read(); if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n'); buffer = blocks.pop() ?? ''
    for (const block of blocks) if (block.trim()) handleBlock(block)
  }
  buffer += decoder.decode(); if (buffer.trim()) handleBlock(buffer)
  if (!result) throw new Error('구조화 UI 결과를 받지 못했습니다.')
  return result
}

async function readLegacyGenerateStream(response: Response, onStep?: (label: string) => void): Promise<GenerateResult> {
  if (!response.ok || !response.body) throw new Error(await response.text().catch(() => `생성 요청에 실패했습니다. (${response.status})`))
  const reader = response.body.getReader(); const decoder = new TextDecoder()
  let buffer = ''; let result: GenerateResult | null = null
  const handleBlock = (block: string) => {
    let eventName = 'message'; const data: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim()
      if (line.startsWith('data:')) data.push(line.slice(5).trim())
    }
    if (!data.length) return
    const payload = JSON.parse(data.join('\n'))
    if (eventName === 'step' && typeof payload.label === 'string') onStep?.(payload.label)
    else if (eventName === 'error') throw new Error(payload.error || 'HTML UI 생성에 실패했습니다.')
    else if (eventName === 'done') result = payload as GenerateResult
  }
  while (true) {
    const { value, done } = await reader.read(); if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n'); buffer = blocks.pop() ?? ''
    for (const block of blocks) if (block.trim()) handleBlock(block)
  }
  buffer += decoder.decode(); if (buffer.trim()) handleBlock(buffer)
  if (!result) throw new Error('HTML UI 생성 결과를 받지 못했습니다.')
  return result
}

function readStoredAsIsAnalysis(): AsIsPageAnalysis | undefined {
  const raw = sessionStorage.getItem('asIsAnalysis')
  if (!raw) return undefined
  try { return JSON.parse(raw) as AsIsPageAnalysis }
  catch { sessionStorage.removeItem('asIsAnalysis'); return undefined }
}

function defaultAnswersFromAnalysis(data: QuestionnaireResponse): Record<string, string> {
  const domain = data.domain ?? 'other'
  const isB2B = domain === 'business' || domain === 'productivity'
  const serviceType = isB2B
    ? 'B2B — 업무/기업용 (대시보드·관리자·SaaS 스타일, 정보 밀도 중심)'
    : 'B2C — 소비자용 (Toss·카카오·네이버 스타일, 직관적·감성적)'
  const domainLabel = DOMAIN_KEY_TO_LABEL[domain] ?? '기타'
  const homeOptions = DOMAIN_HOME_EMPHASIS_OPTIONS[domain] ?? DOMAIN_HOME_EMPHASIS_OPTIONS.other
  // hero_3d default: use AI's heroImageDecision result
  const hero3dDefault = data.heroImageDecision?.generate === false
    ? '3D 생성 안 함'
    : data.heroImageDecision?.heroSubject
    ? `직접 입력: ${data.heroImageDecision.heroSubject}`
    : 'AI가 자동 결정'
  // 제거된 질문들 — UI에는 안 나오지만 생성 코드가 여전히 사용하므로 스마트 기본값 유지
  const primaryJourney = data.serviceAnalysis?.primaryJourney || (domain === 'health' || domain === 'entertainment' || domain === 'social'
    ? '목표 달성/보상 수령'
    : domain === 'commerce' || domain === 'food'
    ? '신청/구매 전환'
    : domain === 'business'
    ? '데이터 확인'
    : 'AI가 결정')
  const firstScreenFocus = domain === 'business' ? '핵심 지표' : domain === 'commerce' || domain === 'food' ? '대표 CTA' : 'AI가 결정'

  // 새 질문들 기본값 — AI가 브리프에서 추론한 타겟 우선, 없으면 도메인 폴백
  const targetAudience = data.serviceAnalysis?.targetAudience
    || (domain === 'business' ? '30-40대 직장인'
    : domain === 'entertainment' || domain === 'social' ? '10-20대 MZ세대'
    : domain === 'finance' || domain === 'health' ? '30-40대 직장인'
    : 'AI가 결정')
  const visualDirection = domain === 'business' || domain === 'finance'
    ? '신뢰감 있는 전문적 (금융·의료 스타일)'
    : domain === 'entertainment' || domain === 'social'
    ? '활기차고 강렬한 (게임·리워드 스타일)'
    : '밝고 친근한 (카카오·토스 스타일)'

  return {
    hero_3d: hero3dDefault,
    service_type: serviceType,
    platform_intent: platformLabel(data.recommendedPlatform?.platform),
    domain: domainLabel,
    home_emphasis: homeOptions[0] ?? 'AI가 결정',
    primary_journey: primaryJourney,
    first_screen_focus: firstScreenFocus,
    visual_density: '균형형',
    variant_strategy: '세 방향 모두 다르게',
    target_audience: targetAudience,
    visual_direction: visualDirection,
  }
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
  sb.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;outline:2px solid #0066FF;outline-offset:0;box-sizing:border-box;border-radius:2px;transition:all 80ms ease;display:none';
  var hb=document.createElement('div');
  hb.setAttribute('data-aide-inject','1');
  hb.style.cssText='position:fixed;pointer-events:none;z-index:2147483646;background:rgba(0,85,255,0.07);box-sizing:border-box;transition:all 50ms ease';
  document.body.appendChild(sb);document.body.appendChild(hb);
  function box(el,div){var r=el.getBoundingClientRect();div.style.left=r.left+'px';div.style.top=r.top+'px';div.style.width=r.width+'px';div.style.height=r.height+'px';}
  function getSharedClasses(el){
    if(!el.className||typeof el.className!=='string')return[];
    var names=el.className.split(/\\s+/).filter(function(c){return c&&c.length>1&&!/[\\[\\]:.#,+~>()^$*|@{}]/.test(c);});
    var screens=document.querySelectorAll('.aide-screen');
    if(screens.length<2)return[];
    var shared=[];
    for(var i=0;i<names.length;i++){
      var cls=names[i];
      var count=0;
      var esc=typeof CSS!=='undefined'&&CSS.escape?CSS.escape(cls):cls;
      for(var j=0;j<screens.length;j++){try{if(screens[j].querySelector('.'+esc))count++;}catch(e){}}
      if(count>=2)shared.push(cls);
    }
    return shared;
  }
  function report(el){
    var cs=getComputedStyle(el),r=el.getBoundingClientRect();
    var sharedClasses=getSharedClasses(el);
    parent.postMessage({type:'aide:select',sharedClasses:sharedClasses,styles:{tagName:el.tagName.toLowerCase(),className:el.className||'',text:(el.textContent||'').trim().slice(0,80),fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,color:cs.color,textAlign:cs.textAlign,lineHeight:cs.lineHeight,letterSpacing:cs.letterSpacing,width:Math.round(r.width)+'px',height:Math.round(r.height)+'px',opacity:cs.opacity,paddingTop:cs.paddingTop,paddingRight:cs.paddingRight,paddingBottom:cs.paddingBottom,paddingLeft:cs.paddingLeft,marginTop:cs.marginTop,marginRight:cs.marginRight,marginBottom:cs.marginBottom,marginLeft:cs.marginLeft,borderWidth:cs.borderWidth,borderRadius:cs.borderRadius,backgroundColor:cs.backgroundColor,backgroundImage:cs.backgroundImage}},'*');
  }
  document.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();sel=e.target;sb.style.display='block';box(sel,sb);report(sel);},true);
  document.addEventListener('mouseover',function(e){if(e.target!==sel)box(e.target,hb);},true);
  window.addEventListener('message',function(e){
    if(!e.data)return;
    var d=e.data;
    if(d.type==='aide:update'&&sel){sel.style[d.prop]=d.value;report(sel);}
    if(d.type==='aide:update-all'&&d.selector&&d.prop){var targets=document.querySelectorAll(d.selector);for(var i=0;i<targets.length;i++){targets[i].style[d.prop]=d.value;}if(sel)report(sel);}
    if(d.type==='aide:setIcon-all'&&d.selector&&d.name){var its=document.querySelectorAll(d.selector);for(var ii=0;ii<its.length;ii++){var it=its[ii];if(it.tagName==='SPAN'||it.tagName==='I'){while(it.firstChild)it.removeChild(it.firstChild);it.appendChild(document.createTextNode(d.name));}}if(sel)setTimeout(function(){report(sel);},50);}
    if(d.type==='aide:replaceImage-all'&&d.selector&&d.url){var rts=document.querySelectorAll(d.selector);for(var ri=0;ri<rts.length;ri++){var rt=rts[ri];if(rt.tagName==='IMG'){rt.src=d.url;}else{var rci=rt.querySelector('img');if(rci){rci.src=d.url;}else{rt.style.backgroundImage='url("'+d.url+'")';rt.style.backgroundSize='cover';rt.style.backgroundPosition='center';}}}}
    if(d.type==='aide:replaceIconWithImg-all'&&d.selector&&d.url){var xts=document.querySelectorAll(d.selector);for(var xi=0;xi<xts.length;xi++){var xt=xts[xi];var ximg=document.createElement('img');ximg.src=d.url;var xsz=(parseFloat(getComputedStyle(xt).fontSize)||24)+'px';ximg.style.cssText='width:'+xsz+';height:'+xsz+';object-fit:contain;display:inline-block;vertical-align:middle;';if(xt.parentNode)xt.parentNode.replaceChild(ximg,xt);}if(sel)setTimeout(function(){report(sel);},50);}
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
          sel.style.outline=count%2===0?'3px solid #0066FF':'3px solid rgba(0,85,255,0.3)';
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
      var imgW=d.width; var imgH=d.height;
      if(sel.tagName==='IMG'){
        sel.src=url;
        if(imgW){sel.style.width=imgW;sel.style.height='auto';}
        if(imgH){sel.style.height=imgH;}
      } else {
        var childImg=sel.querySelector('img');
        if(childImg){
          childImg.src=url;
          if(imgW){childImg.style.width=imgW;childImg.style.height='auto';}
          if(imgH){childImg.style.height=imgH;}
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function htmlEncodeBasic(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildTextVariants(value: string): string[] {
  const normalized = value.trim()
  if (!normalized) return []
  const variants = new Set<string>([normalized, htmlEncodeBasic(normalized)])
  variants.add(normalized.replace(/\s+/g, ' '))
  variants.add(normalized.replace(/\s+/g, '&nbsp;'))
  variants.add(normalized.replace(/,/g, ''))
  variants.add(normalized.replace(/(\d)\s+(\d)/g, '$1&nbsp;$2'))
  return [...variants].filter(Boolean).sort((a, b) => b.length - a.length)
}

function replaceTweakText(html: string, from: string, to: string): string {
  if (!from.trim() || from === to) return html
  let next = html
  for (const variant of buildTextVariants(from)) {
    next = next.split(variant).join(to)
    if (/\s/.test(variant)) {
      const flexible = escapeRegExp(variant).replace(/\s+/g, '(?:\\s|&nbsp;)+')
      next = next.replace(new RegExp(flexible, 'g'), to)
    }
  }
  return next
}

function applyTweakSpecToHtml(
  html: string,
  tweakSpec: TweakSpec | null,
  activeStateId: string,
  varValues: Record<string, number>,
): string {
  if (!tweakSpec) return html
  let next = html
  const state = tweakSpec.states.find(s => s.id === activeStateId)
  state?.replacements.forEach(r => { next = replaceTweakText(next, r.from, r.to) })
  tweakSpec.variables.forEach(v => {
    const val = varValues[v.id] ?? v.currentValue
    if (val !== v.currentValue) {
      const newDisplay = formatVarDisplay(val, v)
      v.currentDisplayStrings.forEach(pattern => {
        next = replaceTweakText(next, pattern, newDisplay)
      })
    }
  })
  return next
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
  const H = isMob ? 165 : 84

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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-10)" }}>

        {/* ── Three screens ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-4)" }}>

          {/* Screen 1: selected thumbnail */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-2)" }}>
            <div style={{
              width: W, height: H,
              borderRadius: isMob ? 10 : 6,
              overflow: 'hidden',
              boxShadow: "var(--aui-shadow-raised)",
              border: '2.5px solid var(--aui-text)',
              flexShrink: 0,
            }}>
              {image
                ? <img src={image} alt={`${variantLabel ?? '선택된 시안'} 미리보기`} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'top center', display: 'block', background: 'var(--aui-surface)' }} />
                : <div style={{ width: '100%', height: '100%', background: 'rgba(112,115,124,0.16)' }} />}
            </div>
            <span style={{ fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text)', letterSpacing: "var(--aui-tracking-tight)" }}>{variantLabel ?? '선택된 시안'}</span>
          </div>

          {/* Arrow 1 */}
          <div className="ep-arr ep-arr1" style={{ color: 'rgba(55,56,60,0.28)', fontSize: "var(--aui-icon-md)", lineHeight: "var(--aui-leading-none)" }}>→</div>

          {/* Screen 2: wireframe drawing */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-2)" }}>
            {isMob ? (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
                <rect className="ep-fr2" x="2" y="2" width={W-4} height={H-4} rx="9" stroke="var(--aui-text)" strokeWidth="2"/>
                <line className="ep-h2" x1="10" y1="20" x2={W-10} y2="20" stroke="rgba(55,56,60,0.28)" strokeWidth="1.2"/>
                <rect className="ep-b2" x="8" y="28" width={W-16} height={Math.round(H*0.3)} rx="4" stroke="rgba(55,56,60,0.61)" strokeWidth="1.4"/>
                <line className="ep-c2" x1="8" y1={H*0.68} x2={W*0.7} y2={H*0.68} stroke="rgba(55,56,60,0.16)" strokeWidth="1.2"/>
                <rect className="ep-c2" x="8" y={H*0.73} width={W-16} height={Math.round(H*0.16)} rx="3" stroke="rgba(112,115,124,0.16)" strokeWidth="1.2"/>
              </svg>
            ) : (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
                <rect className="ep-fr2" x="2" y="2" width={W-4} height={H-4} rx="5" stroke="var(--aui-text)" strokeWidth="2"/>
                <line className="ep-h2" x1="2" y1="17" x2={W-2} y2="17" stroke="rgba(55,56,60,0.16)" strokeWidth="1.2"/>
                <rect className="ep-b2" x="8" y="23" width={W-16} height={Math.round(H*0.32)} rx="3" stroke="rgba(55,56,60,0.61)" strokeWidth="1.4"/>
                <rect className="ep-c2" x="8" y={H*0.65} width={(W-20)/2} height={Math.round(H*0.25)} rx="3" stroke="rgba(55,56,60,0.16)" strokeWidth="1.2"/>
                <rect className="ep-c2" x={8+(W-20)/2+4} y={H*0.65} width={(W-20)/2} height={Math.round(H*0.25)} rx="3" stroke="rgba(55,56,60,0.16)" strokeWidth="1.2"/>
              </svg>
            )}
            <span style={{ fontSize: "var(--aui-type-micro-size)", color: 'rgba(55,56,60,0.61)', fontWeight: "var(--aui-weight-medium)" }}>서브 화면</span>
          </div>

          {/* Arrow 2 */}
          <div className="ep-arr ep-arr2" style={{ color: 'rgba(55,56,60,0.28)', fontSize: "var(--aui-icon-md)", lineHeight: "var(--aui-leading-none)" }}>→</div>

          {/* Screen 3: wireframe drawing */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-2)" }}>
            {isMob ? (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
                <rect className="ep-fr3" x="2" y="2" width={W-4} height={H-4} rx="9" stroke="var(--aui-text)" strokeWidth="2"/>
                <line className="ep-h3" x1="10" y1="20" x2={W-10} y2="20" stroke="rgba(55,56,60,0.28)" strokeWidth="1.2"/>
                <rect className="ep-b3" x="8" y="28" width={W-16} height={Math.round(H*0.38)} rx="4" stroke="rgba(55,56,60,0.61)" strokeWidth="1.4"/>
                <rect className="ep-c3" x="8" y={H*0.72} width={W-16} height={Math.round(H*0.18)} rx="3" stroke="rgba(112,115,124,0.16)" strokeWidth="1.2"/>
                <line className="ep-c3" x1="8" y1={H*0.94} x2={W*0.5} y2={H*0.94} stroke="rgba(112,115,124,0.16)" strokeWidth="1"/>
              </svg>
            ) : (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
                <rect className="ep-fr3" x="2" y="2" width={W-4} height={H-4} rx="5" stroke="var(--aui-text)" strokeWidth="2"/>
                <line className="ep-h3" x1="2" y1="17" x2={W-2} y2="17" stroke="rgba(55,56,60,0.16)" strokeWidth="1.2"/>
                <rect className="ep-b3" x="8" y="23" width={Math.round((W-20)*0.42)} height={H-30} rx="3" stroke="rgba(55,56,60,0.61)" strokeWidth="1.4"/>
                <rect className="ep-c3" x={8+Math.round((W-20)*0.42)+4} y="23" width={Math.round((W-20)*0.54)} height={Math.round((H-30)/2-2)} rx="3" stroke="rgba(55,56,60,0.16)" strokeWidth="1.2"/>
                <rect className="ep-c3" x={8+Math.round((W-20)*0.42)+4} y={23+Math.round((H-30)/2)+2} width={Math.round((W-20)*0.54)} height={Math.round((H-30)/2-2)} rx="3" stroke="rgba(55,56,60,0.16)" strokeWidth="1.2"/>
              </svg>
            )}
            <span style={{ fontSize: "var(--aui-type-micro-size)", color: 'rgba(55,56,60,0.61)', fontWeight: "var(--aui-weight-medium)" }}>내비게이션</span>
          </div>
        </div>

        {/* ── Text ── */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: "var(--aui-space-2)" }}>
          <h2 style={{ fontSize: "var(--aui-type-section-title-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text)', letterSpacing: "var(--aui-tracking-tighter)", margin: 0 }}>
            선택한 시안으로 프로토타입을 완성하고 있습니다
          </h2>
          <p key={stageIdx} className="ep-stage" style={{ fontSize: "var(--aui-type-compact-size)", color: 'rgba(55,56,60,0.61)', margin: 0 }}>
            {EXPAND_STAGES[stageIdx]}
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ width: 220, height: 3, backgroundColor: 'rgba(112,115,124,0.16)', borderRadius: "var(--aui-radius-sm)", overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: 'var(--aui-text)', borderRadius: "var(--aui-radius-sm)", animation: 'ep-bar 1.8s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Parse custom design.md YAML frontmatter ─────────────────────────────────

function parseCustomDesignMdMeta(md: string): {
  color: string
  palette: { name: string; hex: string }[]
  fonts: { headline: string; body: string }
  isDark: boolean
} | null {
  if (!md.startsWith('---\n')) return null
  const end = md.indexOf('\n---\n', 4)
  if (end === -1) return null
  const yaml = md.slice(4, end)

  const colorEntries: { name: string; hex: string }[] = []
  const colorLineRe = /^  (\w+):\s*["']?(#[0-9a-fA-F]{3,8})["']?/gm
  let m: RegExpExecArray | null
  while ((m = colorLineRe.exec(yaml)) !== null) {
    colorEntries.push({ name: m[1], hex: m[2] })
  }

  const primaryEntry = colorEntries.find(e => e.name === 'primary')
  const color = primaryEntry?.hex ?? '#0066FF'

  const paletteNames = ['primary', 'secondary', 'surface', 'background', 'error', 'accent', 'tertiary']
  const palette: { name: string; hex: string }[] = []
  for (const name of paletteNames) {
    const e = colorEntries.find(e => e.name === name)
    if (e && !palette.some(p => p.hex === e.hex)) {
      palette.push({ name: name.charAt(0).toUpperCase() + name.slice(1), hex: e.hex })
    }
    if (palette.length >= 4) break
  }
  if (palette.length === 0) palette.push({ name: 'Primary', hex: color })

  const fontFamilyMatch = yaml.match(/^  fontFamily:\s*["']?([^"'\n]+)["']?/m)
  const fontFamily = fontFamilyMatch ? fontFamilyMatch[1].trim().split(',')[0].trim() : 'sans-serif'
  const fonts = { headline: fontFamily, body: fontFamily }

  const bgEntry = colorEntries.find(e => e.name === 'background')
  let isDark = false
  if (bgEntry) {
    const h = bgEntry.hex.replace('#', '')
    if (h.length >= 6) {
      const lum = parseInt(h.slice(0, 2), 16) * 0.299 + parseInt(h.slice(2, 4), 16) * 0.587 + parseInt(h.slice(4, 6), 16) * 0.114
      isDark = lum < 100
    }
  }

  return { color, palette, fonts, isDark }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StudioViewProps {
  triggerBrief: string
  triggerPreset?: string
  triggerPlatform?: string
  historyId?: string
  onBack?: () => void
}

export default function StudioView({ triggerBrief, triggerPreset, triggerPlatform, historyId, onBack }: StudioViewProps) {
  const [step, setStep] = useState<Step>(1)
  const [startedFromLanding, setStartedFromLanding] = useState(false)
  const [platform, setPlatform] = useState<'mobile' | 'web'>('mobile')
  const [designPreset, setDesignPreset] = useState<DesignPreset>('none')
  const [customDesignMd, setCustomDesignMd] = useState<string | null>(null)
  const customDesignMdName = customDesignMd
    ? (customDesignMd.match(/name:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim() ?? 'Custom')
    : null
  const effectiveDesignMd = customDesignMd ?? DESIGN_PRESETS[designPreset].md
  const selectedDesignPreset = DESIGN_PRESETS[designPreset] ?? DESIGN_PRESETS.none
  const visualizedDesignPreset = designPreset === 'none'
    ? DESIGN_PRESETS.none
    : selectedDesignPreset
  const designSystemDisplayName = customDesignMdName ?? (designPreset === 'none' ? 'Aide design system' : `${designPreset}.md`)
  const designSystemDescription = customDesignMd
    ? 'custom design.md'
    : designPreset === 'none'
      ? DESIGN_PRESETS.none.description
      : selectedDesignPreset.description

  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(DEFAULT_AIDE_LOGO_SRC)
  const [logoLoading, setLogoLoading] = useState(false)
  const [brandColors, setBrandColors] = useState<string[]>([])
  const [extractedColors, setExtractedColors] = useState<string[]>([])
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [briefDesc, setBriefDesc] = useState('')
  const [briefFeatures, setBriefFeatures] = useState('')
  const brief = [
    briefDesc.trim(),
    briefFeatures.trim() ? `핵심 기능:\n${briefFeatures.trim()}` : '',
  ].filter(Boolean).join('\n\n')
  const setBrief = (value: string) => {
    const parts = value.split(/\n\n핵심 기능:\n/)
    setBriefDesc(parts[0] ?? '')
    setBriefFeatures(parts[1] ?? '')
  }

  const apiHeaders = useCallback((): Record<string, string> => {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' }
    const geminiKey = localStorage.getItem('aide_gemini_api_key') ?? ''
    const unsplashKey = localStorage.getItem('aide_unsplash_access_key') ?? ''
    const codeToDesignKey = localStorage.getItem('aide_code_to_design_api_key') ?? ''
    return {
      'Content-Type': 'application/json',
      ...(geminiKey && { 'x-gemini-key': geminiKey }),
      ...(unsplashKey && { 'x-unsplash-key': unsplashKey }),
      ...(codeToDesignKey && { 'x-code-to-design-key': codeToDesignKey }),
    }
  }, [])

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [wfAnimKey, setWfAnimKey] = useState(0)
  const [analyzeError, setAnalyzeError] = useState('')
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireResponse | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingB, setIsGeneratingB] = useState(false)
  const [isGeneratingBScene, setIsGeneratingBScene] = useState(false)
  const [isGeneratingC, setIsGeneratingC] = useState(false)
  const [bSceneImage, setBSceneImage] = useState<{ base64: string; mimeType: string } | null>(null)
  const [bHeroStyle, setBHeroStyle] = useState<'object' | 'scene'>('object')
  const [variantContentHeights, setVariantContentHeights] = useState<[number | null, number | null, number | null]>([null, null, null])
  const variantIframeRefs = useRef<[HTMLIFrameElement | null, HTMLIFrameElement | null, HTMLIFrameElement | null]>([null, null, null])
  const [variantGenerationStarted, setVariantGenerationStarted] = useState(false)
  const [variantFailed, setVariantFailed] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [isExpandingPrototype, setIsExpandingPrototype] = useState(false)
  const [mainVariants, setMainVariants] = useState<[GenerateResult|null, GenerateResult|null, GenerateResult|null]>([null, null, null])
  const [generationEngine, setGenerationEngine] = useState<'node-graph' | 'legacy-html'>('legacy-html')
  const [streamingScreens, setStreamingScreens] = useState<[UIScreenIR|null, UIScreenIR|null, UIScreenIR|null]>([null, null, null])
  const [streamingActiveNodes, setStreamingActiveNodes] = useState<[string|null, string|null, string|null]>([null, null, null])
  const [studioTheme, setStudioTheme] = useState<StudioDesignTheme>(() => compileStudioDesignTheme(''))
  const [pickedVariantIdx, setPickedVariantIdx] = useState<0|1|2|null>(null)
  const [generateError, setGenerateError] = useState('')
  const [generationEvents, setGenerationEvents] = useState<GenerationEvent[]>([])
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
  const [selectedSharedClasses, setSelectedSharedClasses] = useState<string[]>([])
  const [syncAllScreens, setSyncAllScreens] = useState(false)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [creonOpen, setCreonOpen] = useState(false)
  const [creonAsset, setCreonAsset] = useState<string | null>(null)
  const [creonImageWidth, setCreonImageWidth] = useState<number>(100)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [pickedIcon, setPickedIcon] = useState<string | null>(null)
  const [originalIconText, setOriginalIconText] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [brandColor, setBrandColor] = useState(DEFAULT_GENERATED_BRAND_COLOR)
  const [debouncedBrandColor, setDebouncedBrandColor] = useState(DEFAULT_GENERATED_BRAND_COLOR)
  const brandDebounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const screenIframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map())
  const [focusedScreenId, setFocusedScreenId] = useState<string>('')

  // Share / zoom UI state
  const [shareOpen, setShareOpen] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [zoom, setZoom] = useState(60)
  const [previewWidth, setPreviewWidth] = useState(390)
  const [copyLinkDone, setCopyLinkDone] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)

  // Figma export state
  const [figmaExportOpen, setFigmaExportOpen] = useState(false)
  const [isFigmaExporting, setIsFigmaExporting] = useState(false)
  const [figmaExportError, setFigmaExportError] = useState<string | null>(null)
  const [figmaClipboardHtml, setFigmaClipboardHtml] = useState('')
  const [figmaClipboardCopied, setFigmaClipboardCopied] = useState(false)

  // Per-variant undo/redo history
  const [historyA, setHistoryA] = useState<string[]>([])
  const [historyIndexA, setHistoryIndexA] = useState(-1)
  const [historyB, setHistoryB] = useState<string[]>([])
  const [historyIndexB, setHistoryIndexB] = useState(-1)
  const [irHistory, setIrHistory] = useState<UIScreenIR[]>([])
  const [irHistoryIndex, setIrHistoryIndex] = useState(-1)

  // GNB history tabs
  const [gnbHistory, setGnbHistory] = useState<HistoryItem[]>([])
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [currentBoardHistoryId, setCurrentBoardHistoryId] = useState<string | null>(null)
  const currentBoardHistoryIdRef = useRef<string | null>(null)

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
  const hasActiveIr = Boolean(result?.screenIr)
  const canUndo = hasActiveIr ? irHistoryIndex > 0 : activeHistoryIndex > 0
  const canRedo = hasActiveIr ? irHistoryIndex >= 0 && irHistoryIndex < irHistory.length - 1 : activeHistoryIndex < activeHistory.length - 1

  // Computed HTML with state + variable replacements applied
  const displayHtml = useMemo(() => {
    if (!result?.html) return ''
    let html = applyTweakSpecToHtml(result.html, tweakSpec, activeStateId, varValues)
    // 브랜드 컬러: HTML에 하드코딩된 hex를 교체 (CSS 변수를 안 쓰는 경우 대응)
    const origPrimary = html.match(/--color-primary:\s*(#[0-9a-fA-F]{3,8})/i)?.[1]?.toLowerCase()
    if (origPrimary && debouncedBrandColor.toLowerCase() !== origPrimary) {
      html = html.split(origPrimary).join(debouncedBrandColor.toLowerCase())
    }
    return editMode ? injectInspector(html) : injectBridge(html)
  }, [result, tweakSpec, activeStateId, varValues, debouncedBrandColor, editMode])

  // Auto-start from props (triggered by landing page submit)
  useEffect(() => {
    const savedEngine = localStorage.getItem('aide_generation_engine')
    if (savedEngine === 'legacy-html' || savedEngine === 'node-graph') setGenerationEngine(savedEngine)
  }, [])

  const changeGenerationEngine = useCallback((engine: 'node-graph' | 'legacy-html') => {
    setGenerationEngine(engine)
    try { localStorage.setItem('aide_generation_engine', engine) }
    catch { /* 저장공간이 가득 차도 현재 세션의 엔진 변경은 유지한다. */ }
  }, [])

  useEffect(() => {
    // Load from history
    if (historyId) {
      loadHistory().then(items => {
        setGnbHistory(items.filter(h => h.itemType === 'board' || !h.itemType || h.itemType === 'design').slice(0, 30))
        const item = items.find(h => h.id === historyId)
        if (item) loadHistoryItemIntoEditor(item)
      })
      return
    }

    if (!triggerBrief) return

    setStartedFromLanding(true)
    const preset: DesignPreset = (triggerPreset && triggerPreset in DESIGN_PRESETS)
      ? triggerPreset as DesignPreset
      : 'none'

    setBrief(triggerBrief)
    setDesignPreset(preset)
    if (triggerPlatform === 'web' || triggerPlatform === 'mobile') setPlatform(triggerPlatform)

    const brandLogoFromStorage = sessionStorage.getItem('brandLogo')
    setLogoDataUrl(brandLogoFromStorage || DEFAULT_AIDE_LOGO_SRC)

    const brandColorsFromStorage = sessionStorage.getItem('brandColors')
    if (brandColorsFromStorage) {
      try { setBrandColors(JSON.parse(brandColorsFromStorage)) } catch { /* ignore */ }
    }

    const customMdFromStorage = sessionStorage.getItem('designMd')
    if (customMdFromStorage) setCustomDesignMd(customMdFromStorage)

    const effectiveDesignMdForAnalyze = customMdFromStorage ?? DESIGN_PRESETS[preset].md
    const prdDoc = sessionStorage.getItem('prdDoc') ?? undefined
    setIsAnalyzing(true)
    setAnalyzeError('')
    const autoStartAbort = new AbortController()
    fetch('/api/analyze', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ designMd: effectiveDesignMdForAnalyze, brief: triggerBrief, platform: triggerPlatform, prdDoc }),
      signal: autoStartAbort.signal,
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        if (data.recommendedPlatform?.platform === 'web' || data.recommendedPlatform?.platform === 'mobile') {
          setPlatform(data.recommendedPlatform.platform)
          if (data.recommendedPlatform.platform === 'web') {
            setPreviewWidth(1440)
            setZoom(60)
          } else {
            setPreviewWidth(390)
            setZoom(100)
          }
        }
        setQuestionnaire(data)
        setAnswers(data.domain ? { domain: DOMAIN_KEY_TO_LABEL[data.domain as AppDomain] ?? '기타' } : {})
        setStep(2)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setAnalyzeError(err instanceof Error ? err.message : '오류가 발생했습니다')
      })
      .finally(() => setIsAnalyzing(false))
    return () => autoStartAbort.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Keep refs in sync for wheel handler
  useEffect(() => { selectedCardRef.current = selectedCard }, [selectedCard])

  // Canvas zoom/pan (step 3 + step 4 unified — both use canvasAreaRef/canvasTransformRef)
  useEffect(() => {
    if (step !== 3 && step !== 4) return
    const el = canvasAreaRef.current
    if (!el) return
    const applyTransform = (pan: { x: number; y: number }, zoom: number) => {
      const t = canvasTransformRef.current
      if (t) {
        t.style.transition = 'transform 0.18s ease-out'
        t.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`
      }
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
      // Ctrl/Meta + scroll → 줌 (cursor-based)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        // Use a milder factor for smoother zoom
        const factor = e.deltaY > 0 ? 0.9875 : 1 / 0.9875
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
      // Trackpad/mouse scroll → pan
      e.preventDefault()
      const newPan = { x: canvasPanRef.current.x - e.deltaX, y: canvasPanRef.current.y - e.deltaY }
      canvasPanRef.current = newPan
      applyTransform(newPan, canvasZoomRef.current)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [step])

  // (step 4 zoom/pan 제거됨 — step 3+4 공통 canvasAreaRef 효과로 통합)

  // Spacebar pan: hold space → grab cursor, drag → pan canvas (step 3+4 공통 canvasAreaRef)
  useEffect(() => {
    if (step !== 3 && step !== 4) return
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
      const t = canvasTransformRef.current
      if (t) t.style.transition = ''
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
      if (e.data.type === 'aide:select') {
        setSelectedStyles(e.data.styles)
        setSelectedSharedClasses(e.data.sharedClasses || [])
        setSyncAllScreens(false)
      }
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
    // 다중 프레임 모드: 포커스된 iframe으로 전송, 없으면 첫 번째로
    if (screenIframeRefs.current.size > 0) {
      const target = focusedScreenId
        ? screenIframeRefs.current.get(focusedScreenId)
        : screenIframeRefs.current.values().next().value
      target?.contentWindow?.postMessage(msg, '*')
    } else {
      iframeRef.current?.contentWindow?.postMessage(msg, '*')
    }
  }, [focusedScreenId])

  const appendGenerationEvent = useCallback((event: Omit<GenerationEvent, 'id'>) => {
    setGenerationEvents(prev => [
      ...prev,
      { ...event, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
    ].slice(-80))
  }, [])

  const handleUndo = useCallback(() => {
    if (variants[activeVariant]?.screenIr && irHistoryIndex > 0) {
      const idx = irHistoryIndex - 1; const screenIr = irHistory[idx]
      setIrHistoryIndex(idx)
      setVariants(prev => { const next = [...prev] as [GenerateResult|null,GenerateResult|null]; if (next[activeVariant]) next[activeVariant] = { ...next[activeVariant]!, screenIr, html: serializeUIScreenToHtml(screenIr, studioTheme) }; return next })
      return
    }
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
  }, [activeVariant, historyIndexA, historyIndexB, historyA, historyB, irHistory, irHistoryIndex, studioTheme, variants])

  const handleRedo = useCallback(() => {
    if (variants[activeVariant]?.screenIr && irHistoryIndex < irHistory.length - 1) {
      const idx = irHistoryIndex + 1; const screenIr = irHistory[idx]
      setIrHistoryIndex(idx)
      setVariants(prev => { const next = [...prev] as [GenerateResult|null,GenerateResult|null]; if (next[activeVariant]) next[activeVariant] = { ...next[activeVariant]!, screenIr, html: serializeUIScreenToHtml(screenIr, studioTheme) }; return next })
      return
    }
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
  }, [activeVariant, historyIndexA, historyIndexB, historyA, historyB, irHistory, irHistoryIndex, studioTheme, variants])

  const commitScreenIr = useCallback((screenIr: UIScreenIR) => {
    setVariants(prev => { const next = [...prev] as [GenerateResult|null,GenerateResult|null]; if (next[activeVariant]) next[activeVariant] = { ...next[activeVariant]!, screenIr, html: serializeUIScreenToHtml(screenIr, studioTheme) }; return next })
    setIrHistory(prev => [...prev.slice(0, irHistoryIndex + 1), screenIr].slice(-30))
    setIrHistoryIndex(prev => Math.min(29, prev + 1))
  }, [activeVariant, irHistoryIndex, studioTheme])

  const moveIrSection = useCallback((sectionId: string, offset: -1 | 1) => {
    const current = variants[activeVariant]?.screenIr; if (!current) return
    const index = current.sections.findIndex(section => section.id === sectionId); const target = index + offset
    if (index < 0 || target < 0 || target >= current.sections.length) return
    const sections = [...current.sections]; [sections[index], sections[target]] = [sections[target], sections[index]]
    commitScreenIr({ ...current, sections })
  }, [activeVariant, commitScreenIr, variants])

  const removeIrSection = useCallback((sectionId: string) => {
    const current = variants[activeVariant]?.screenIr; if (!current || current.sections.length <= 1) return
    commitScreenIr({ ...current, sections: current.sections.filter(section => section.id !== sectionId) })
  }, [activeVariant, commitScreenIr, variants])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false)
      if (zoomRef.current && !zoomRef.current.contains(e.target as Node)) setZoomOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Wireframe animation loop while loading screen is visible
  useEffect(() => {
    if (!isAnalyzing && !startedFromLanding) return
    const id = setInterval(() => setWfAnimKey(k => k + 1), 4000)
    return () => clearInterval(id)
  }, [isAnalyzing, startedFromLanding])

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

  useEffect(() => { currentBoardHistoryIdRef.current = currentBoardHistoryId }, [currentBoardHistoryId])

  useEffect(() => {
    if (step !== 4) return
    loadHistory().then(items => setGnbHistory(items.filter(h => h.itemType === 'board' || !h.itemType || h.itemType === 'design').slice(0, 30)))
  }, [step])

  // 히스토리 로드 등으로 mainVariants가 바뀌면 iframe 높이 재측정
  useEffect(() => {
    if (mainVariants.every(v => !v)) return
    const readHeights = () => {
      setVariantContentHeights(prev => {
        const next = [...prev] as [number | null, number | null, number | null]
        let changed = false
        variantIframeRefs.current.forEach((iframe, idx) => {
          if (!iframe || !mainVariants[idx]) return
          try {
            const h = iframe.contentDocument?.documentElement.scrollHeight || iframe.contentDocument?.body?.scrollHeight
            if (h && h > 100 && h !== prev[idx]) { next[idx] = h; changed = true }
          } catch { /* cross-origin guard */ }
        })
        return changed ? next : prev
      })
    }
    // 폰트/이미지 로드 대기 후 측정 (이미지 많은 페이지는 늦게 커진다)
    const t1 = setTimeout(readHeights, 300)
    const t2 = setTimeout(readHeights, 1000)
    const t3 = setTimeout(readHeights, 2500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [mainVariants])

  const handleStyleUpdate = useCallback((prop: string, value: string) => {
    if (syncAllScreens && selectedSharedClasses.length > 0) {
      const selector = '.aide-screen .' + selectedSharedClasses[0]
      sendToIframe({ type: 'aide:update-all', selector, prop, value })
    } else {
      sendToIframe({ type: 'aide:update', prop, value })
    }
  }, [sendToIframe, syncAllScreens, selectedSharedClasses])

  const loadHistoryItemIntoEditor = useCallback((item: HistoryItem) => {
    setBrief(item.brief)
    if (item.preset && item.preset in DESIGN_PRESETS) setDesignPreset(item.preset as DesignPreset)
    setPlatform(guessPlatform(item))
    if (item.board) {
      if (item.board.designMd) setCustomDesignMd(item.board.designMd)
      setLogoDataUrl(item.board.logoDataUrl ?? DEFAULT_AIDE_LOGO_SRC)
      setBrandColors(item.board.brandColors ?? [])
      if (item.board.generationEngine) changeGenerationEngine(item.board.generationEngine)
      const restoredQuestionnaire = item.board.questionnaire as QuestionnaireResponse | null | undefined
      setQuestionnaire(restoredQuestionnaire ?? null)
      setAnswers(item.board.answers ?? (restoredQuestionnaire ? defaultAnswersFromAnalysis(restoredQuestionnaire) : {}))
      const sourceContext = item.board.sourceContext
      if (sourceContext) {
        const restoreSessionValue = (key: string, value: string | undefined) => {
          if (value) sessionStorage.setItem(key, value)
          else sessionStorage.removeItem(key)
        }
        restoreSessionValue('prdDoc', sourceContext.prdDoc)
        restoreSessionValue('iaImage', sourceContext.iaImage)
        restoreSessionValue('iaText', sourceContext.iaText)
        restoreSessionValue('referenceImage', sourceContext.referenceImage)
        restoreSessionValue('referenceImageKind', sourceContext.referenceImageKind)
        if (sourceContext.asIsAnalysis) sessionStorage.setItem('asIsAnalysis', JSON.stringify(sourceContext.asIsAnalysis))
        else sessionStorage.removeItem('asIsAnalysis')
      }
      const boardVariantList = (item.board.mainVariants ?? []).slice(0, 3).map(v => v && !v.isCanvasPreview ? {
        html: v.html,
        image: v.image ?? item.thumbnail,
        imageWarnings: v.imageWarnings,
        variantDescription: v.variantDescription as GenerateResult['variantDescription'],
        designDirection: v.designDirection as DesignDirection | undefined,
        designCanvas: v.designCanvas as DesignCanvasIR | undefined,
        screenIr: v.screenIr as UIScreenIR | undefined,
      } : null)
      const boardVariants: [GenerateResult | null, GenerateResult | null, GenerateResult | null] = [
        boardVariantList[0] ?? null,
        boardVariantList[1] ?? null,
        boardVariantList[2] ?? null,
      ]
      const firstRealVariant = boardVariants.find((variant): variant is GenerateResult => !!variant)
      const savedPrototypeHtml = item.board.prototypeHtml ?? ''
      const restoredStage = item.board.stage ?? (savedPrototypeHtml ? 'prototype-ready' : 'variants-ready')
      const editorHtml = savedPrototypeHtml || firstRealVariant?.html || ''
      const prototypeImage = item.board.prototypeThumbnail ?? item.thumbnail
      setMainVariants(boardVariants)
      setStudioTheme(compileStudioDesignTheme(item.board.designMd ?? ''))
      setPickedVariantIdx(item.board.pickedVariantIdx ?? null)
      setVariants(editorHtml ? [{ html: editorHtml, image: prototypeImage }, null] : [null, null])
      setActiveVariant(0)
      setHistoryA(editorHtml ? [editorHtml] : []); setHistoryIndexA(editorHtml ? 0 : -1)
      setHistoryB([]); setHistoryIndexB(-1)
      setScreens(item.board.prototypeScreens ?? [])
      setActiveScreenId(item.board.prototypeScreens?.[0]?.id ?? '')
      const extractedColor = editorHtml.match(/--color-primary:\s*(#[0-9a-fA-F]{3,8})/i)?.[1] ?? 'var(--aui-primary)'
      setBrandColor(extractedColor); setDebouncedBrandColor(extractedColor)
      setCurrentHistoryId(item.id)
      setCurrentBoardHistoryId(item.id)
      setBSceneImage(item.board.bSceneImage ?? null)
      setBHeroStyle('object')
      setVariantGenerationStarted(boardVariants.some(Boolean))
      setEditMode(false)
      setSelectedStyles(null)
      setChatMessages([])
      setZoom(60)
      // Explicitly restore the user's next action. A/B/C-only histories return
      // to the comparison board so "이 시안으로 진행" remains available.
      setStep(restoredStage === 'prototype-ready' ? 4 : 3)
      return
    }
    const loaded: GenerateResult = { html: item.html, image: item.thumbnail }
    setVariants([loaded, null])
    setActiveVariant(0)
    setHistoryA([item.html]); setHistoryIndexA(0)
    setHistoryB([]); setHistoryIndexB(-1)
    const extractedColor = item.html.match(/--color-primary:\s*(#[0-9a-fA-F]{3,8})/i)?.[1] ?? 'var(--aui-primary)'
    setBrandColor(extractedColor); setDebouncedBrandColor(extractedColor)
    setCurrentHistoryId(item.id)
    setCurrentBoardHistoryId(null)
    setEditMode(false)
    setSelectedStyles(null)
    setChatMessages([])
    setZoom(60)
    setStep(4)
  }, [changeGenerationEngine])

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
      setExtractedColors([])
      setBrandColors([])
    } finally {
      setLogoLoading(false)
      e.target.value = ''
    }
  }, [])

  const handleExtractColors = useCallback(() => {
    if (!logoDataUrl || logoDataUrl === DEFAULT_AIDE_LOGO_SRC) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 64; canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, 64, 64)
      const data = ctx.getImageData(0, 0, 64, 64).data
      const colorMap: Record<string, number> = {}
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        if (a < 128) continue
        if (r > 220 && g > 220 && b > 220) continue
        if (r < 35 && g < 35 && b < 35) continue
        if (Math.max(r, g, b) - Math.min(r, g, b) < 30) continue
        const qr = Math.round(r / 32) * 32
        const qg = Math.round(g / 32) * 32
        const qb = Math.round(b / 32) * 32
        const key = `${qr},${qg},${qb}`
        colorMap[key] = (colorMap[key] ?? 0) + 1
      }
      const top = Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([key]) => {
          const [r, g, b] = key.split(',').map(Number)
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        })
      setExtractedColors(top)
      if (top.length > 0) setBrandColors([top[0]])
    }
    img.src = logoDataUrl
  }, [logoDataUrl])

  const handleSwatchClick = useCallback((color: string) => {
    setBrandColors(prev => {
      const [p, s] = [prev[0], prev[1]]
      if (color === p) return s ? [s] : []
      if (color === s) return p ? [p] : []
      if (!p) return [color, ...(s ? [s] : [])]
      if (!s) return [p, color]
      return [color, s]
    })
  }, [])

  const handleAnalyze = async () => {
    if (!brief.trim()) return
    const effectiveDesignMd = customDesignMd ?? DESIGN_PRESETS[designPreset].md
    setIsAnalyzing(true)
    setAnalyzeError('')
    clearGeneratedBoard()
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: apiHeaders(),
      body: JSON.stringify({ designMd: effectiveDesignMd, brief }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.recommendedPlatform?.platform === 'web' || data.recommendedPlatform?.platform === 'mobile') {
        setPlatform(data.recommendedPlatform.platform)
        if (data.recommendedPlatform.platform === 'web') {
          setPreviewWidth(1440)
          setZoom(60)
        } else {
          setPreviewWidth(390)
          setZoom(100)
        }
      }
      setQuestionnaire(data)
      setAnswers(defaultAnswersFromAnalysis(data))
      setStep(2)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
    }
  }

  useEffect(() => {
    if (!questionnaire) return
    setAnswers(prev => ({ ...defaultAnswersFromAnalysis(questionnaire), ...prev }))
  }, [questionnaire])

  const handleAnswer = useCallback((questionId: string, value: string, type: 'single' | 'multi' | 'text') => {
    setAnswers(prev => {
      if (type === 'single') {
        return { ...prev, [questionId]: value }
      }
      if (type === 'multi') {
        const current = (prev[questionId] as string[]) ?? []
        const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
        return { ...prev, [questionId]: updated }
      }
      return { ...prev, [questionId]: value }
    })

    if (questionId === 'domain') {
      const domainKey = DOMAIN_LABEL_TO_KEY[value] ?? 'other'
      const newOptions = DOMAIN_HOME_EMPHASIS_OPTIONS[domainKey]
      setQuestionnaire(prev => {
        if (!prev) return prev
        return {
          ...prev,
          questions: prev.questions.map(q =>
            q.id === 'home_emphasis' ? { ...q, options: newOptions } : q
          ),
        }
      })
      setAnswers(prev => ({ ...prev, home_emphasis: newOptions[0] ?? 'AI가 결정' }))
    }
    if (questionId === 'platform_intent') {
      const next = platformFromIntent(value)
      if (next) {
        setPlatform(next)
        if (next === 'web') {
          setPreviewWidth(1440)
          setZoom(60)
        } else {
          setPreviewWidth(390)
          setZoom(100)
        }
      }
    }
  }, [])

  const buildGenerationContext = useCallback((questionnaireOverride = questionnaire, answersOverride = answers) => {
    if (!questionnaireOverride) return null
    const activeQuestionnaire = questionnaireOverride
    const activeAnswers = answersOverride

    // hero_3d questionnaire answer takes priority
    const hero3dAnswer = typeof activeAnswers['hero_3d'] === 'string' ? activeAnswers['hero_3d'] : ''
    // AI가 분석 단계에서 정한 히어로 소재(serviceAnalysis.heroVisualSubject)를 정규식 매핑보다 우선 사용
    const aiHeroSubject = activeQuestionnaire.serviceAnalysis?.heroVisualSubject || undefined
    const analyzeHeroSubject = activeQuestionnaire.heroImageDecision?.heroSubject || aiHeroSubject || activeQuestionnaire.heroImageDecision?.prompt || undefined
    let heroSubject: string | undefined
    if (hero3dAnswer.startsWith('직접 입력: ')) {
      heroSubject = hero3dAnswer.replace('직접 입력: ', '').trim() || undefined
    } else if (hero3dAnswer === 'AI가 자동 결정' || hero3dAnswer === '') {
      heroSubject = analyzeHeroSubject
    }
    // "3D 생성 안 함" → heroSubject remains undefined, needsScene3d = false
    const wants3D = hero3dAnswer !== '3D 생성 안 함'
    // brief(한국어 전체)로 폴백하면 정규식이 깎아내므로, AI subject를 먼저 쓴다
    const heroPrompt = heroSubject || aiHeroSubject || (wants3D && activeQuestionnaire.heroImageDecision?.generate ? brief : undefined)
    const domainFromAnswer = typeof activeAnswers['domain'] === 'string' ? DOMAIN_LABEL_TO_KEY[activeAnswers['domain']] : undefined
    const effectiveDomain = (domainFromAnswer ?? activeQuestionnaire.domain ?? 'other') as AppDomain
    const needsScene3d = wants3D && Boolean(heroSubject || activeQuestionnaire.heroImageDecision?.generate || activeQuestionnaire.heroImageDecision?.heroSubject || activeQuestionnaire.heroImageDecision?.prompt)
    const { generationPlan, visualPolicies, sharedVisualSubject } = buildDesignIntelligencePlan({
      brief,
      domain: effectiveDomain,
      platform,
      projectSummary: activeQuestionnaire.projectSummary,
      answers: activeAnswers,
      heroSubject,
      heroPrompt,
      needsScene3d,
      serviceAnalysis: activeQuestionnaire.serviceAnalysis,
      shellContract: readStoredAsIsAnalysis()?.shellContract,
    })
    return { heroSubject, heroPrompt, effectiveDomain, sharedVisualSubject, generationPlan, visualPolicies }
  }, [answers, brief, platform, questionnaire])

  const refreshBoardHistoryTabs = useCallback(() => {
    loadHistory().then(items => {
      setGnbHistory(items.filter(h => h.itemType === 'board' || !h.itemType || h.itemType === 'design').slice(0, 30))
    })
  }, [])

  const persistBoardHistory = useCallback(async (options?: {
    mainVariantsOverride?: [GenerateResult | null, GenerateResult | null, GenerateResult | null]
    prototypeHtml?: string
    prototypeImage?: string
    pickedIdx?: 0 | 1 | 2 | null
    prototypeScreens?: Array<{ id: string; label: string }>
  }) => {
    const variantsSnapshot = options?.mainVariantsOverride ?? mainVariants
    const firstVariant = variantsSnapshot.find((variant): variant is GenerateResult => !!variant)
    const thumbnailSource = options?.prototypeImage ?? firstVariant?.image
    const html = options?.prototypeHtml ?? firstVariant?.html ?? ''
    if (!thumbnailSource || !html) return null

    const thumbnail = await compressThumbnail(thumbnailSource)
    const storedVariants = await Promise.all(variantsSnapshot.map(async variant => variant ? {
      html: variant.html,
      image: variant.image ? await compressThumbnail(variant.image) : undefined,
      imageWarnings: variant.imageWarnings,
      variantDescription: variant.variantDescription,
      designDirection: variant.designDirection,
      designCanvas: variant.designCanvas,
      screenIr: variant.screenIr,
    } : null))
    const boardPayload: NonNullable<HistoryItem['board']> = {
      stage: options?.prototypeHtml ? 'prototype-ready' : 'variants-ready',
      designSystemName: designSystemDisplayName,
      designMd: customDesignMd ?? DESIGN_PRESETS[designPreset].md,
      mainVariants: storedVariants,
      pickedVariantIdx: options?.pickedIdx ?? pickedVariantIdx,
      prototypeHtml: options?.prototypeHtml ?? null,
      prototypeThumbnail: options?.prototypeImage ? thumbnail : null,
      prototypeScreens: options?.prototypeScreens ?? screens,
      questionnaire,
      answers,
      generationEngine,
      bSceneImage,
      logoDataUrl,
      brandColors,
      sourceContext: {
        asIsAnalysis: readStoredAsIsAnalysis(),
        prdDoc: sessionStorage.getItem('prdDoc') ?? undefined,
        iaImage: sessionStorage.getItem('iaImage') ?? undefined,
        iaText: sessionStorage.getItem('iaText') ?? undefined,
        referenceImage: sessionStorage.getItem('referenceImage') ?? undefined,
        referenceImageKind: sessionStorage.getItem('referenceImageKind') ?? undefined,
      },
    }
    const item = {
      brief,
      preset: designPreset !== 'none' ? designPreset : null,
      designMdFileName: sessionStorage.getItem('designMdFileName') ?? null,
      html,
      thumbnail,
      platform,
      itemType: 'board' as const,
      board: boardPayload,
    }

    if (currentBoardHistoryId) {
      await updateHistoryItem(currentBoardHistoryId, item)
      refreshBoardHistoryTabs()
      return currentBoardHistoryId
    }

    const newId = await saveHistoryItem(item)
    if (newId) {
      setCurrentBoardHistoryId(newId)
      setCurrentHistoryId(newId)
      refreshBoardHistoryTabs()
    }
    return newId
  }, [answers, bSceneImage, brandColors, brief, currentBoardHistoryId, customDesignMd, designPreset, designSystemDisplayName, generationEngine, logoDataUrl, mainVariants, pickedVariantIdx, platform, questionnaire, refreshBoardHistoryTabs, screens])

  const clearGeneratedBoard = useCallback(() => {
    setVariantGenerationStarted(false)
    setCurrentBoardHistoryId(null)
  }, [])

  const handleGenerate = async () => {
    if (!questionnaire) return
    const effectiveDesignMd = customDesignMd ?? DESIGN_PRESETS[designPreset].md
    setVariantGenerationStarted(true)
    setVariantFailed([false, false, false])
    setIsGenerating(true)
    setIsGeneratingB(false)
    setIsGeneratingBScene(false)
    setIsGeneratingC(false)
    setGenerateError('')
    setMainVariants([null, null, null])
    setStreamingScreens([null, null, null])
    setStreamingActiveNodes([null, null, null])
    setStudioTheme(compileStudioDesignTheme(effectiveDesignMd))
    setBSceneImage(null)
    setBHeroStyle('object')
    setVariantContentHeights([null, null, null])
    setGenerationEvents([
      {
        id: `seed-${Date.now()}-read`,
        kind: 'read',
        title: '기획서와 입력 맥락을 읽는 중',
        detail: brief.trim().slice(0, 90) + (brief.trim().length > 90 ? '...' : ''),
        status: 'done',
      },
      {
        id: `seed-${Date.now()}-think`,
        kind: 'think',
        title: '서비스 의도와 핵심 사용자 여정 정리',
        detail: questionnaire.projectSummary,
        status: 'done',
      },
      {
        id: `seed-${Date.now()}-design`,
        kind: 'design',
        title: `${designSystemDisplayName} 분석`,
        detail: designSystemDescription,
        status: 'done',
      },
    ])
    setStep(3)
    const genId = ++generationIdRef.current
    try {
      const generationContext = buildGenerationContext()
      if (!generationContext) return
      const { effectiveDomain } = generationContext
      const headers = apiHeaders()
      let selectedDirections: DesignDirection[] = []
      try {
        appendGenerationEvent({ kind: 'design', title: '서로 다른 6개 디자인 방향 탐색', status: 'done' })
        const directionResponse = await fetch('/api/generate-directions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            brief,
            projectSummary: questionnaire.projectSummary,
            platform,
            domain: effectiveDomain,
            targetAudience: questionnaire.serviceAnalysis?.targetAudience,
            primaryJourney: questionnaire.serviceAnalysis?.primaryJourney,
            coreObjects: questionnaire.serviceAnalysis?.coreObjects,
            keyDataPoints: questionnaire.serviceAnalysis?.keyDataPoints,
            contentSeed: questionnaire.serviceAnalysis?.contentSeed,
            designSystemSummary: effectiveDesignMd.slice(0, 1600),
            visualRoles: generationContext.visualPolicies.map(policy => policy === 'real-photo' ? 'photo' : policy === 'no-image' ? 'data' : '3d'),
          }),
        })
        if (directionResponse.ok) {
          const directionData = await directionResponse.json() as { selected?: DesignDirection[] }
          selectedDirections = directionData.selected ?? []
        }
      } catch (error) {
        console.warn('[design-directions]', error)
      }
      if (generationIdRef.current !== genId || selectedDirections.length < 3) {
        throw new Error('디자인 방향을 준비하지 못했습니다.')
      }

      const variantLetters = ['A', 'B', 'C'] as const
      const boardVariants: [GenerateResult | null, GenerateResult | null, GenerateResult | null] = [null, null, null]
      const abort = new AbortController()
      bgFetchAbortRef.current?.abort()
      bgFetchAbortRef.current = abort
      setIsGenerating(true); setIsGeneratingB(true); setIsGeneratingC(true)

      if (generationEngine === 'legacy-html') {
        appendGenerationEvent({ kind: 'artifact', title: '기존 HTML 고품질 엔진으로 생성', detail: 'Node Graph 변환 없이 세 시안을 독립적으로 디자인합니다.', status: 'done' })
        const asIsAnalysis = readStoredAsIsAnalysis()
        const visualPolicies = generationContext.visualPolicies

        // 자동 데스크 리서치: LLM이 실제 레퍼런스 사이트를 지목 → 자체 캡처 → 세 시안 프롬프트에 참고로 주입.
        // 실패해도 generation을 막지 않는다 (route가 {references:[]} 반환).
        let deskResearchRefs: Array<{ url: string; rationale: string; screenshotBase64: string }> = []
        try {
          appendGenerationEvent({ kind: 'design', title: '데스크 리서치 · 레퍼런스 수집 중', status: 'done' })
          const drRes = await fetch('/api/desk-research', {
            method: 'POST', headers, signal: abort.signal,
            body: JSON.stringify({
              brief,
              projectSummary: questionnaire.projectSummary,
              platform,
              isLandingIntent: detectLandingIntent(brief, platform === 'web' ? 'web' : 'mobile'),
            }),
          })
          if (drRes.ok) {
            const drData = await drRes.json() as { references?: Array<{ url: string; rationale: string; screenshotBase64: string }> }
            deskResearchRefs = drData.references ?? []
            if (deskResearchRefs.length > 0) {
              appendGenerationEvent({ kind: 'design', title: `데스크 리서치 · 레퍼런스 ${deskResearchRefs.length}건 확보`, detail: deskResearchRefs.map(r => r.url).join('\n'), status: 'done' })
            }
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === 'AbortError')) console.warn('[desk-research]', error)
        }
        const htmlResults = await Promise.allSettled(selectedDirections.slice(0, 3).map(async (direction, idx) => {
          const letter = variantLetters[idx]
          const modelId = GEMINI_DESIGN_MODEL
          const response = await fetch('/api/generate', {
            method: 'POST', headers, signal: abort.signal,
            body: JSON.stringify({
              designMd: effectiveDesignMd,
              brief,
              answers,
              projectSummary: questionnaire.projectSummary,
              logoDataUrl: logoDataUrl === DEFAULT_AIDE_LOGO_SRC ? undefined : logoDataUrl,
              brandColors: brandColors.length ? brandColors : undefined,
              mainOnly: true,
              platform,
              modelId,
              domain: effectiveDomain,
              generationPlan: generationContext.generationPlan,
              heroSubject: generationContext.heroSubject,
              heroImagePrompt: generationContext.heroPrompt,
              sharedVisualSubject: generationContext.sharedVisualSubject,
              visualPolicy: visualPolicies[idx],
              qualityMode: 'draft',
              criticalReview: false,
              asIsAnalysis,
              deskResearchRefs,
              prdDoc: sessionStorage.getItem('prdDoc') ?? undefined,
              iaImageBase64: sessionStorage.getItem('iaImage') ?? undefined,
              iaText: sessionStorage.getItem('iaText') ?? undefined,
              referenceImageBase64: sessionStorage.getItem('referenceImage') ?? undefined,
              referenceImageKind: sessionStorage.getItem('referenceImageKind') ?? undefined,
              variantStyle: `시안 ${letter} · ${direction.name}\n${direction.thesis}\n구도: ${direction.composition}\n서명 요소: ${direction.signatureMove}\n금지: ${direction.avoid.join(', ')}`,
              precomputedDesignIntentPlan: JSON.stringify(direction),
            }),
          })
          const result = await readLegacyGenerateStream(response, label => appendGenerationEvent({ kind: label.includes('이미지') ? 'image' : label.includes('스크린샷') ? 'render' : 'design', title: `시안 ${letter} · ${label}`, status: 'done', variant: letter }))
          boardVariants[idx] = { ...result, designDirection: direction }
          setMainVariants(previous => { const next = [...previous] as [GenerateResult|null, GenerateResult|null, GenerateResult|null]; next[idx] = boardVariants[idx]; return next })
          if (idx === 0) setIsGenerating(false)
          if (idx === 1) setIsGeneratingB(false)
          if (idx === 2) setIsGeneratingC(false)
          return result
        }))
        if (generationIdRef.current !== genId || abort.signal.aborted) return
        setIsGenerating(false); setIsGeneratingB(false); setIsGeneratingC(false)
        const failedVariants = htmlResults.map(result => result.status === 'rejected') as [boolean, boolean, boolean]
        setVariantFailed(failedVariants)
        const completedCount = htmlResults.filter(result => result.status === 'fulfilled').length
        if (completedCount > 0) {
          persistBoardHistory({ mainVariantsOverride: boardVariants }).catch(() => {})
          appendGenerationEvent({ kind: 'summary', title: `${questionnaire.projectSummary}의 HTML 디자인 시안 ${completedCount}개를 완성했습니다`, detail: selectedDirections.map((direction, idx) => boardVariants[idx] ? `시안 ${variantLetters[idx]}: ${direction.name}` : `시안 ${variantLetters[idx]}: 생성 실패`).join('\n'), status: 'done' })
          if (completedCount < 3) setGenerateError('일부 시안 생성에 실패했습니다. 완성된 시안은 그대로 선택하거나 실패한 시안을 다시 생성할 수 있습니다.')
        } else {
          const firstFailure = htmlResults.find(result => result.status === 'rejected')
          throw firstFailure?.status === 'rejected' ? firstFailure.reason : new Error('시안 생성에 실패했습니다.')
        }
        return
      }

      appendGenerationEvent({ kind: 'artifact', title: '구조화 UI 데이터 생성 시작', detail: 'HTML 없이 화면 블록을 순서대로 설계합니다.', status: 'done' })
      const response = await fetch('/api/generate-ui-ir', {
        method: 'POST', headers, signal: abort.signal,
        body: JSON.stringify({
          brief, projectSummary: questionnaire.projectSummary, platform, designMd: effectiveDesignMd,
          directions: selectedDirections, modelId: GEMINI_DESIGN_MODEL,
          contentSeed: questionnaire.serviceAnalysis?.contentSeed,
          coreObjects: questionnaire.serviceAnalysis?.coreObjects,
          keyDataPoints: questionnaire.serviceAnalysis?.keyDataPoints,
          shellContract: readStoredAsIsAnalysis()?.shellContract,
        }),
      })
      const data = await readUIScreenStream(response, patch => {
        const idx = ({ A: 0, B: 1, C: 2 } as const)[patch.variant]
        setStreamingScreens(previous => {
          const next = [...previous] as [UIScreenIR|null, UIScreenIR|null, UIScreenIR|null]
          if (patch.screen) next[idx] = { ...patch.screen, sections: [] }
          if (patch.section && next[idx]) next[idx] = { ...next[idx]!, sections: [...next[idx]!.sections, patch.section] }
          return next
        })
        setStreamingActiveNodes(previous => {
          const next = [...previous] as [string|null, string|null, string|null]
          next[idx] = patch.section?.id ?? (patch.screen ? 'root' : null)
          return next
        })
        if (patch.section) appendGenerationEvent({ kind: 'artifact', title: `시안 ${patch.variant} · ${patch.section.title ?? patch.section.type}`, status: 'done', variant: patch.variant })
      })
      if (generationIdRef.current !== genId || abort.signal.aborted) return
      setStudioTheme(data.theme)
      data.variants.slice(0, 3).forEach((result, idx) => {
        boardVariants[idx] = { ...result, designDirection: selectedDirections[idx] }
      })
      setMainVariants(boardVariants)
      setStreamingScreens([null, null, null])
      setStreamingActiveNodes([null, null, null])
      setIsGenerating(false); setIsGeneratingB(false); setIsGeneratingC(false)

      if (generationIdRef.current === genId && !abort.signal.aborted && boardVariants.some(Boolean)) {
        persistBoardHistory({ mainVariantsOverride: boardVariants }).catch(() => {})
        appendGenerationEvent({
          kind: 'summary',
          title: `${questionnaire.projectSummary}의 구조화 UI 시안을 완성했습니다`,
          detail: boardVariants.map((variant, idx) => variant ? `시안 ${variantLetters[idx]}: ${variant.variantDescription?.strategy ?? selectedDirections[idx].name}` : '').filter(Boolean).join('\n'),
          status: 'done',
        })
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : '오류가 발생했습니다')
      setVariantFailed([true, true, true])
      setStreamingScreens([null, null, null])
      setStreamingActiveNodes([null, null, null])
    } finally {
      setIsGenerating(false)
      setIsGeneratingB(false)
      setIsGeneratingBScene(false)
      setIsGeneratingC(false)
    }
  }

  const handlePickVariant = async (idx: 0|1|2) => {
    const baseChosen = mainVariants[idx]
    if (!baseChosen) return
    bgFetchAbortRef.current?.abort()
    bgFetchAbortRef.current = null
    setIsGeneratingB(false); setIsGeneratingC(false)
    setIsExpandingPrototype(true)
    setPickedVariantIdx(idx)
    setGenerateError('')
    try {
      let activeQuestionnaire = questionnaire
      let activeAnswers = answers
      if (!activeQuestionnaire) {
        const recoveryResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ designMd: effectiveDesignMd, brief, platform, prdDoc: sessionStorage.getItem('prdDoc') ?? undefined }),
        })
        const recovered = await recoveryResponse.json()
        if (!recoveryResponse.ok || recovered.error) throw new Error(recovered.error || '이전 시안의 기획 문맥을 복구하지 못했습니다.')
        activeQuestionnaire = recovered as QuestionnaireResponse
        activeAnswers = defaultAnswersFromAnalysis(activeQuestionnaire)
        setQuestionnaire(activeQuestionnaire)
        setAnswers(activeAnswers)
      }
      let chosen: GenerateResult = baseChosen

      if (idx === 1 && bHeroStyle === 'scene' && bSceneImage) {
        chosen = { ...chosen, html: patchHeroToScene(chosen.html, bSceneImage.base64, bSceneImage.mimeType) }
      }

      const generationContext = buildGenerationContext(activeQuestionnaire, activeAnswers)
      if (!generationContext) throw new Error('시안 확장에 필요한 기획 문맥이 없습니다.')
      let data = chosen
      let prototypeScreens: Array<{ id: string; label: string }> = [{ id: 'screen-home', label: '홈' }]
      try {
        const expandResponse = await fetch('/api/expand', {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({
            mainHtml: chosen.html,
            designMd: effectiveDesignMd,
            brief,
            answers: activeAnswers,
            projectSummary: activeQuestionnaire.projectSummary,
            logoDataUrl: logoDataUrl === DEFAULT_AIDE_LOGO_SRC ? undefined : logoDataUrl,
            brandColors: brandColors.length ? brandColors : undefined,
            platform,
            modelId: GEMINI_DESIGN_MODEL,
            domain: generationContext.effectiveDomain,
            generationPlan: generationContext.generationPlan,
            heroSubject: generationContext.heroSubject,
            heroImagePrompt: generationContext.heroPrompt,
            sharedVisualSubject: generationContext.sharedVisualSubject,
            criticalReview: true,
            precomputedDesignIntentPlan: chosen.designDirection ? JSON.stringify(chosen.designDirection) : undefined,
            asIsAnalysis: readStoredAsIsAnalysis(),
            prdDoc: sessionStorage.getItem('prdDoc') ?? undefined,
            iaImageBase64: sessionStorage.getItem('iaImage') ?? undefined,
            iaText: sessionStorage.getItem('iaText') ?? undefined,
            referenceImageBase64: sessionStorage.getItem('referenceImage') ?? undefined,
            referenceImageKind: sessionStorage.getItem('referenceImageKind') ?? undefined,
          }),
        })
        const expanded = await expandResponse.json()
        if (!expandResponse.ok || expanded.error) throw new Error(expanded.error || '멀티스크린 확장에 실패했습니다.')
        data = {
          ...chosen,
          html: expanded.html,
          image: expanded.image ?? chosen.image,
          imageWarnings: [...(chosen.imageWarnings ?? []), ...(expanded.imageWarnings ?? [])],
          screenIr: undefined,
        }
        prototypeScreens = expanded.screens?.length ? expanded.screens : prototypeScreens
      } catch (expandError) {
        setGenerateError(`선택한 메인 시안은 보존했습니다. 추가 화면 확장만 실패했습니다: ${expandError instanceof Error ? expandError.message : '알 수 없는 오류'}`)
      }
      setVariants([data, null])
      setActiveVariant(0)
      setSelectedStyles(null)
      setTweakSpecA(null); setTweakSpecB(null)
      setIsAnalyzingTweakA(false); setIsAnalyzingTweakB(false)
      setActiveStateId('typical')
      setVarValues({})
      setScreens(prototypeScreens); setActiveScreenId(prototypeScreens[0]?.id ?? 'screen-home'); setFocusedScreenId('')
      screenIframeRefs.current.clear()
      const extractedColor = (data.html as string).match(/--color-primary:\s*(#[0-9a-fA-F]{3,8})/i)?.[1] ?? DEFAULT_GENERATED_BRAND_COLOR
      setBrandColor(extractedColor); setDebouncedBrandColor(extractedColor)
      setHistoryA([data.html]); setHistoryIndexA(0)
      setIrHistory(data.screenIr ? [data.screenIr] : []); setIrHistoryIndex(data.screenIr ? 0 : -1)
      setHistoryB([]); setHistoryIndexB(-1)
      setZoom(isMobile ? 100 : isTablet ? 70 : 60)
      setPreviewWidth(isMobile ? 390 : isTablet ? 768 : 1440)
      // Stay on step 3 canvas — completed design card appears inline

      if (data.image) {
        persistBoardHistory({
          prototypeHtml: data.html,
          prototypeImage: data.image,
          pickedIdx: idx,
          prototypeScreens,
        }).then(newId => {
          if (newId) {
            setCurrentHistoryId(newId)
            setCurrentBoardHistoryId(newId)
          }
        }).catch(() => {})
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
          setActiveStateId('typical')
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
    setStartedFromLanding(false)
    setAnswers({}); setGenerateError(''); setAnalyzeError('')
    setSelectedStyles(null); setDarkMode(false); setBrandColor(DEFAULT_GENERATED_BRAND_COLOR); setDebouncedBrandColor(DEFAULT_GENERATED_BRAND_COLOR)
    setTweakSpecA(null); setTweakSpecB(null)
    setIsAnalyzingTweakA(false); setIsAnalyzingTweakB(false)
    setActiveStateId('typical'); setVarValues({})
    setEditMode(false); setChatMessages([]); setChatInput('')
    setHistoryA([]); setHistoryIndexA(-1); setHistoryB([]); setHistoryIndexB(-1)
    setShareOpen(false); setZoomOpen(false); setZoom(60)
    setDesignPreset('none'); setLogoDataUrl(null); setLogoLoading(false); setBrandColors([])
    setMainVariants([null, null, null]); setPickedVariantIdx(null)
    setGenerationEvents([])
    setIsGeneratingB(false); setIsGeneratingC(false); setIsExpandingPrototype(false)
    setScreens([]); setActiveScreenId('')
    clearGeneratedBoard()
    bgFetchAbortRef.current?.abort()
    bgFetchAbortRef.current = null
    ++generationIdRef.current
  }

  const handleRefine = async () => {
    if (!chatInput.trim() || !result || isRefining) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsRefining(true)
    try {
      const effectiveDesignMd = customDesignMd ?? DESIGN_PRESETS[designPreset].md
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ html: result.html, message: userMsg, brief, designMd: effectiveDesignMd, logoDataUrl }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setVariants(prev => {
        const updated = [...prev] as [GenerateResult | null, GenerateResult | null]
        if (updated[activeVariant]) {
          updated[activeVariant] = {
            ...updated[activeVariant]!,
            html: data.html,
            imageWarnings: data.imageWarnings ?? updated[activeVariant]!.imageWarnings,
          }
        }
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
            setActiveStateId('typical')
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
            setActiveStateId('typical')
            if (spec?.variables?.length) {
              const defaults: Record<string, number> = {}
              spec.variables.forEach((v: TweakVariable) => { defaults[v.id] = v.currentValue })
              setVarValues(defaults)
            }
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

  const handleTweakEvent = useCallback((script: string) => {
    const iframe = variantIframeRefs.current[activeVariant]
    if (!iframe?.contentWindow) return
    try {
      (iframe.contentWindow as Window & { eval: (s: string) => void }).eval(script)
    } catch { /* ignore script errors */ }
  }, [activeVariant])

  const downloadHtml = () => {
    if (!result) return
    const blob = new Blob([result.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'ui-design.html'; a.click()
    URL.revokeObjectURL(url)
    setShareOpen(false)
  }

  const exportToFigma = async () => {
    if (!result?.html) return
    setShareOpen(false)
    setFigmaExportOpen(true)
    setIsFigmaExporting(true)
    setFigmaExportError(null)
    setFigmaClipboardHtml('')
    setFigmaClipboardCopied(false)

    try {
      const res = await fetch('/api/export-figma', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ html: result.html, platform, screens }),
      })
      if (!res.ok) throw new Error(await res.text())
      const bundle = await res.json() as { clipboardHtml?: string }
      if (!bundle.clipboardHtml) throw new Error('code.to.design 응답에 clipboard 데이터가 없습니다')
      setFigmaClipboardHtml(bundle.clipboardHtml)
      const copied = await copyFigmaClipboard(bundle.clipboardHtml)
      setFigmaClipboardCopied(copied)
    } catch (err) {
      setFigmaExportError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsFigmaExporting(false)
    }
  }

  const copyFigmaClipboard = async (clipboardHtml: string) => {
    try {
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([clipboardHtml], { type: 'text/html' }),
          'text/plain': new Blob(['Paste into Figma'], { type: 'text/plain' }),
        }),
      ])
      return true
    } catch {
      return false
    }
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

  // ─── Step 3: Generation canvas view ──────────────────────────────────────
  if (step === 3) {
    const preset = visualizedDesignPreset
    const hasDesign = !!preset.palette || !!customDesignMd
    const isAnyGenerating = isGenerating || isGeneratingB || isGeneratingC

    return (
      <div
        className="h-screen overflow-hidden flex flex-col text-[var(--aui-text)] relative"
        style={{
          fontFamily: "var(--font-pretendard)",
          backgroundColor: 'var(--aui-surface-muted)',
        }}
      >
        {/* Header */}
        <div className="border-b border-[var(--aui-shadow-soft)] flex items-stretch shrink-0 bg-white" style={{ height: '56px' }}>
          <Button onClick={onBack} aria-label="Aide 홈으로 이동" variant="ghost" className="h-full rounded-none border-r border-[var(--aui-shadow-soft)] px-4 shrink-0">
            <img src="/logo_aide.png" alt="Aide" className="h-14 w-auto object-contain" />
          </Button>
          <div className="px-5 text-[13px] flex items-center gap-2 text-[var(--aui-text-muted)]">
            {isAnyGenerating ? (
              <>
                <svg className="animate-spin shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeOpacity="0.3" />
                  <path d="M21 12a9 9 0 00-9-9" />
                </svg>
                시안 생성 중...
              </>) : mainVariants.every(v => !v)
              ? '시안을 생성하세요'
              : '시안을 선택해주세요'}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 px-4">
            {mainVariants.every(v => !v) && !isAnyGenerating && (
              <Button
                onClick={handleGenerate}
                disabled={isAnyGenerating}
                size="dense"
              >
                <Sparkles size={13} /> 시안 A/B/C 생성
              </Button>
            )}
            {mainVariants.some(v => !!v) && (
              <Button
                onClick={() => handleGenerate()}
                disabled={isAnyGenerating}
                variant="ghost"
                size="dense"
              >
                <RefreshCw size={13} /> 다시 생성
              </Button>
            )}
            <Button onClick={() => { clearGeneratedBoard(); setStep(2) }} disabled={isAnyGenerating} variant="ghost" size="dense">
              <ArrowLeft size={14} /> 설문
            </Button>
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
            <div style={{ width: 252, flexShrink: 0, borderRight: '1px solid var(--aui-shadow-soft)', backgroundColor: 'var(--aui-on-dark)', display: 'flex', flexDirection: 'column', padding: `var(--aui-space-6) var(--aui-space-5)` }}>
              {selectedCard === 'design-md' ? (() => {
                const preset = visualizedDesignPreset
                const sidebarMeta = customDesignMd ? parseCustomDesignMdMeta(customDesignMd) : null
                const baseSidebarPalette = sidebarMeta?.palette ?? preset.palette
                const sidebarPalette = brandColors[0]
                  ? [
                      { name: 'Primary', hex: brandColors[0] },
                      ...(brandColors[1] ? [{ name: 'Secondary', hex: brandColors[1] }] : []),
                      ...(baseSidebarPalette ?? []).filter(s => s.name !== 'Primary' && s.name !== 'Secondary'),
                    ]
                  : baseSidebarPalette
                const sidebarFonts = sidebarMeta?.fonts ?? preset.fonts
                const sidebarColor = brandColors[0] ?? sidebarMeta?.color ?? preset.color
                const sidebarLabel = designSystemDisplayName
                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--aui-shadow-line)', marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", marginBottom: 9 }}>
                        {sidebarColor ? (
                          <div style={{ width: 26, height: 26, borderRadius: "var(--aui-radius-sm)", backgroundColor: sidebarColor, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 26, height: 26, borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--aui-text-muted)" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                          </div>
                        )}
                        <span style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text)', letterSpacing: "var(--aui-tracking-tighter)", lineHeight: "var(--aui-leading-tight)" }}>{sidebarLabel}</span>
                      </div>
                      <p style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-text-muted)', lineHeight: "var(--aui-leading-relaxed)", letterSpacing: "var(--aui-tracking-tight)" }}>{customDesignMd ? 'custom design.md' : preset.description}</p>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: "var(--aui-space-5)" }}>
                      {/* Color palette */}
                      {sidebarPalette && sidebarPalette.length > 0 && (
                        <div>
                          <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 10 }}>컬러 팔레트</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-2)" }}>
                            {sidebarPalette.map(swatch => (
                              <div key={swatch.hex} style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)" }}>
                                <div style={{ width: 22, height: 22, borderRadius: "var(--aui-radius-sm)", backgroundColor: swatch.hex, border: '1px solid var(--aui-border-subtle)', flexShrink: 0 }} />
                                <div>
                                  <p style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text-neutral)', margin: 0, lineHeight: "var(--aui-leading-tight)" }}>{swatch.name}</p>
                                  <p style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-assistive)', margin: 0, fontFamily: 'monospace', letterSpacing: "var(--aui-tracking-slight)" }}>{swatch.hex}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fonts */}
                      {sidebarFonts && (
                        <div>
                          <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 10 }}>타이포그래피</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-2)" }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-assistive)' }}>Headline</span>
                              <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text-neutral)' }}>{sidebarFonts.headline}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-assistive)' }}>Body</span>
                              <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text-neutral)' }}>{sidebarFonts.body}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Traits */}
                      {preset.traits && preset.traits.length > 0 && (
                        <div>
                          <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 10 }}>디자인 특성</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: "var(--aui-space-2)" }}>
                            {preset.traits.map(trait => (
                              <span key={trait} style={{ fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-medium)", color: 'var(--aui-text-muted)', backgroundColor: 'var(--aui-surface-muted)', borderRadius: "var(--aui-radius-sm)", padding: `var(--aui-space-1) var(--aui-space-2)`, lineHeight: "var(--aui-leading-tight)" }}>{trait}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Typography Scale */}
                      {preset.typographyScale && preset.typographyScale.length > 0 && (
                        <div>
                          <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 10 }}>타이포그래피 스케일</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-1)" }}>
                            {preset.typographyScale.map(step => (
                              <div key={step.name} style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
                                <div style={{ width: 36, flexShrink: 0, textAlign: 'right' }}>
                                  <span style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', fontFamily: 'monospace' }}>{step.size}</span>
                                </div>
                                <div style={{ width: 1, height: 14, backgroundColor: 'var(--aui-border)', flexShrink: 0 }} />
                                <span style={{ fontSize: parseInt(step.size) > 20 ? "var(--aui-type-label-size)" : "var(--aui-type-caption-size)", fontWeight: step.weight >= 600 ? 600 : step.weight >= 500 ? 500 : 400, color: 'var(--aui-text)', lineHeight: "var(--aui-leading-none)", letterSpacing: "var(--aui-tracking-tight)", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{step.name}</span>
                                <span style={{ marginLeft: 'auto', fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-disabled)', fontFamily: 'monospace' }}>{step.weight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Colors */}
                      {preset.statusColors && preset.statusColors.length > 0 && (
                        <div>
                          <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 10 }}>상태 색상</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `var(--aui-space-2) var(--aui-space-3)` }}>
                            {preset.statusColors.map(s => (
                              <div key={s.hex} style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
                                <div style={{ width: 16, height: 16, borderRadius: "var(--aui-radius-sm)", backgroundColor: s.hex, flexShrink: 0 }} />
                                <div>
                                  <p style={{ fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text-neutral)', margin: 0, lineHeight: "var(--aui-leading-tight)" }}>{s.name}</p>
                                  <p style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-assistive)', margin: 0, fontFamily: 'monospace' }}>{s.hex}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Radius Tokens */}
                      {preset.radiusTokens && preset.radiusTokens.length > 0 && (
                        <div>
                          <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 10 }}>Border Radius</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: `var(--aui-space-2) var(--aui-space-2)`, alignItems: 'flex-end' }}>
                            {preset.radiusTokens.map(r => {
                              const px = parseInt(r.value)
                              const sz = Math.min(Math.max(px === 9999 || px >= 100 ? 20 : px * 1.2, 6), 20)
                              return (
                                <div key={r.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-1)" }}>
                                  <div style={{ width: sz + 4, height: sz + 4, border: '1.5px solid var(--aui-border)', borderRadius: px >= 999 ? 9999 : Math.min(px, (sz + 4) / 2), backgroundColor: 'var(--aui-surface-muted)' }} />
                                  <span style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-assistive)', fontFamily: 'monospace', lineHeight: "var(--aui-leading-none)" }}>{r.name}</span>
                                  <span style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-disabled)', fontFamily: 'monospace', lineHeight: "var(--aui-leading-none)" }}>{r.value}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })() : !selectedVariant ? (() => {
                const iconForEvent = (event: GenerationEvent) => {
                  const stroke = event.status === 'error' ? 'var(--aui-negative)' : event.status === 'done' ? 'var(--aui-positive)' : 'var(--aui-text-muted)'
                  if (event.status === 'active') {
                    return <div className="animate-spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--aui-shadow-medium)', borderTopColor: 'var(--aui-text)' }} />
                  }
                  if (event.kind === 'summary') {
                    return <Sparkles size={14} color={stroke} strokeWidth={2} />
                  }
                  if (event.kind === 'image') {
                    return <ImageIcon size={14} color={stroke} strokeWidth={1.9} />
                  }
                  if (event.kind === 'artifact' || event.kind === 'read') {
                    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>
                  }
                  if (event.kind === 'review') {
                    return <Check size={14} color={stroke} strokeWidth={2.2} />
                  }
                  if (event.status === 'error') {
                    return <X size={14} color={stroke} strokeWidth={2.2} />
                  }
                  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9"><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>
                }

                const visibleEvents: GenerationEvent[] = generationEvents.length > 0
                  ? generationEvents
                  : [{
                      id: 'empty',
                      kind: 'design' as GenerationEventKind,
                      title: '시안을 클릭하면 스타일 분석을 보여드립니다',
                      detail: `${designSystemDisplayName} 기반으로 생성된 A/B/C 시안의 의도와 설계 포인트를 확인할 수 있습니다.`,
                      status: 'done' as GenerationEventStatus,
                    }]

                return (
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--aui-shadow-line)', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", marginBottom: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Sparkles size={13} />
                        </div>
                        <span style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text)', letterSpacing: "var(--aui-tracking-tighter)" }}>생성 진행</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: "var(--aui-space-2)" }}>
                        <span style={{ fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-primary)', backgroundColor: 'var(--aui-primary-tint)', borderRadius: "var(--aui-radius-pill)", padding: `var(--aui-space-1) var(--aui-space-2)`, lineHeight: "var(--aui-leading-none)" }}>{designSystemDisplayName}</span>
                        <span style={{ fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text-muted)', backgroundColor: 'var(--aui-surface-muted)', borderRadius: "var(--aui-radius-pill)", padding: `var(--aui-space-1) var(--aui-space-2)`, lineHeight: "var(--aui-leading-none)" }}>{platformLabel(platform)}</span>
                      </div>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {visibleEvents.map((event, idx) => {
                          const isLast = idx === visibleEvents.length - 1
                          const isSummary = event.kind === 'summary'
                          return (
                            <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', columnGap: "var(--aui-space-3)" }}>
                              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                {!isLast && <div style={{ position: 'absolute', top: 19, bottom: -2, width: 1, backgroundColor: 'var(--aui-border)' }} />}
                                <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: event.status === 'active' ? 'var(--aui-on-dark)' : 'var(--aui-page)', border: '1px solid var(--aui-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                                  {iconForEvent(event)}
                                </div>
                              </div>
                              <div style={{ paddingBottom: isSummary ? 16 : 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", marginTop: 1 }}>
                                  <p style={{ fontSize: isSummary ? "var(--aui-type-compact-size)" : "var(--aui-type-caption-size)", fontWeight: isSummary ? 750 : 600, color: event.status === 'error' ? 'var(--aui-negative)' : 'var(--aui-text-neutral)', letterSpacing: "var(--aui-tracking-tight)", lineHeight: "var(--aui-leading-snug)", margin: 0 }}>{event.title}</p>
                                  {event.variant && <span style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-muted)', backgroundColor: 'var(--aui-surface-muted)', borderRadius: "var(--aui-radius-sm)", padding: `var(--aui-space-1) var(--aui-space-1)`, lineHeight: "var(--aui-leading-tight)" }}>{event.variant}</span>}
                                </div>
                                {event.detail && (
                                  <p style={{ whiteSpace: 'pre-line', fontSize: isSummary ? "var(--aui-type-caption-size)" : "var(--aui-type-micro-size)", color: isSummary ? 'var(--aui-text-neutral)' : 'var(--aui-text-muted)', lineHeight: isSummary ? 1.72 : 1.55, letterSpacing: "var(--aui-tracking-tight)", margin: `var(--aui-space-1) 0 0` }}>{event.detail}</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {generateError && (
                        <div style={{ marginTop: 4, padding: `var(--aui-space-3) var(--aui-space-3)`, borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-negative-soft)', border: '1px solid var(--aui-negative-border)', color: 'var(--aui-negative)', fontSize: "var(--aui-type-caption-size)", lineHeight: "var(--aui-leading-relaxed)" }}>
                          {generateError}
                        </div>
                      )}
                    </div>

                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--aui-shadow-line)', marginTop: 12 }}>
                      <p style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-muted)', lineHeight: "var(--aui-leading-relaxed)", letterSpacing: "var(--aui-tracking-tight)", margin: 0 }}>
                        생성이 끝난 뒤 시안 카드를 클릭하면 각 방향의 UX 전략과 설계 포인트를 볼 수 있습니다.
                      </p>
                    </div>
                  </div>
                )
              })() : (() => {
                const info = VARIANT_INFO[selectedVariant]
                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--aui-shadow-line)', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", marginBottom: 10 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-extrabold)", color: 'var(--aui-on-dark)', lineHeight: "var(--aui-leading-none)" }}>{selectedVariant}</span>
                        </div>
                        <span style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text)', letterSpacing: "var(--aui-tracking-tighter)", lineHeight: "var(--aui-leading-tight)" }}>{info.name}</span>
                      </div>
                      {/* Strategy badge */}
                      <span style={{ display: 'inline-block', fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-primary)', backgroundColor: 'var(--aui-primary-tint)', borderRadius: "var(--aui-radius-sm)", padding: `var(--aui-space-1) var(--aui-space-2)`, letterSpacing: "var(--aui-tracking-slight)", marginBottom: 8 }}>{info.strategy}</span>
                      <p style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-text-muted)', lineHeight: "var(--aui-leading-relaxed)", letterSpacing: "var(--aui-tracking-tight)", margin: 0 }}>{info.tagline}</p>
                    </div>

                    {/* Analysis */}
                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: "var(--aui-space-4)" }}>
                      {/* Rationale */}
                      <div style={{ backgroundColor: 'var(--aui-page)', borderRadius: "var(--aui-radius-sm)", padding: `var(--aui-space-3) var(--aui-space-3)` }}>
                        <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 5 }}>UX 전략 근거</p>
                        <p style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-text-neutral)', lineHeight: "var(--aui-leading-relaxed)", letterSpacing: "var(--aui-tracking-tight)", margin: 0 }}>{info.rationale}</p>
                      </div>

                      {/* Key Points */}
                      <div>
                        <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 10 }}>설계 포인트</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-3)" }}>
                          {info.points.map((point, i) => {
                            const [before, after] = point.split(' → ')
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: "var(--aui-space-2)" }}>
                                <div style={{ width: 17, height: 17, borderRadius: '50%', backgroundColor: 'var(--aui-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1.5 }}>
                                  <span style={{ fontSize: "var(--aui-type-nano-size)", fontWeight: "var(--aui-weight-extrabold)", color: 'var(--aui-on-dark)' }}>{i + 1}</span>
                                </div>
                                <p style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-text-neutral)', lineHeight: "var(--aui-leading-relaxed)", letterSpacing: "var(--aui-tracking-tight)", margin: 0 }}>
                                  {after ? (
                                    <>{before} <span style={{ color: 'var(--aui-text-assistive)', fontWeight: "var(--aui-weight-regular)" }}>→</span> <span style={{ color: 'var(--aui-primary)', fontWeight: "var(--aui-weight-medium)" }}>{after}</span></>
                                  ) : point}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Best for */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: "var(--aui-space-2)", paddingTop: 2 }}>
                        <svg style={{ marginTop: 1, flexShrink: 0 }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--aui-text-assistive)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                        <span style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-muted)', letterSpacing: "var(--aui-tracking-tight)", lineHeight: "var(--aui-leading-relaxed)" }}><span style={{ fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text-muted)' }}>적합한 컨텍스트</span>  {info.bestFor}</span>
                      </div>

                      {/* Expected effect */}
                      <div style={{ backgroundColor: 'var(--aui-primary-tint)', borderRadius: "var(--aui-radius-sm)", padding: `var(--aui-space-2) var(--aui-space-3)`, display: 'flex', alignItems: 'flex-start', gap: "var(--aui-space-2)" }}>
                        <svg style={{ marginTop: 1.5, flexShrink: 0 }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--aui-primary)" strokeWidth="2.2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                        <span style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-neutral)', letterSpacing: "var(--aui-tracking-tight)", lineHeight: "var(--aui-leading-relaxed)" }}><span style={{ fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-primary)' }}>기대 효과</span>  {info.expectedEffect}</span>
                      </div>
                    </div>

                    {/* CTA */}
                    {variant && (
                      <button
                        onClick={() => handlePickVariant(variantIdx as 0|1|2)}
                        className="hover:!bg-[var(--aui-text-neutral)]"
                        style={{ marginTop: 16, width: '100%', padding: `var(--aui-space-3) 0`, borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)', fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)", border: 'none', cursor: 'pointer', letterSpacing: "var(--aui-tracking-tight)", transition: 'background 0.15s' }}
                      >
                        이 시안으로 진행
                      </button>
                    )}
                    {!variant && (
                      <div style={{ marginTop: 16, width: '100%', padding: `var(--aui-space-3) 0`, borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-surface-muted)', color: 'var(--aui-text-disabled)', fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)", textAlign: 'center', letterSpacing: "var(--aui-tracking-tight)" }}>
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
        <div ref={canvasAreaRef} className="flex-1 overflow-hidden relative isolate" onClick={() => setSelectedCard(null)}>
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>
            <DotField />
          </div>
          <div ref={canvasTransformRef} style={{ transformOrigin: '0 0', display: 'flex', alignItems: 'flex-start', gap: "var(--aui-space-6)", padding: "var(--aui-space-10)", width: 'max-content' }}>
          <style>{`@keyframes aide-bar{0%{transform:translateX(-150%)}100%{transform:translateX(500%)}}`}</style>

          {/* DESIGN.md text card */}
          {hasDesign && (customDesignMd || preset.md) && (() => {
            const activeMd = customDesignMd ?? preset.md
            const rawMd = activeMd.startsWith('---\n')
              ? (() => { const end = activeMd.indexOf('\n---\n', 4); return end !== -1 ? activeMd.slice(end + 5) : activeMd })()
              : activeMd

            function parseMdInline(text: string): React.ReactNode[] {
              return text.split(/(\*\*[^*]+\*\*|`[^`\n]+`)/).map((s, j) => {
                if (s.startsWith('**') && s.endsWith('**'))
                  return <strong key={j} style={{ fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text)' }}>{s.slice(2, -2)}</strong>
                if (s.startsWith('`') && s.endsWith('`'))
                  return <code key={j} style={{ fontFamily: 'monospace', fontSize: '0.85em', backgroundColor: 'var(--aui-border-subtle)', padding: `0 var(--aui-space-1)`, borderRadius: "var(--aui-radius-sm)", color: 'var(--aui-negative)' }}>{s.slice(1, -1)}</code>
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
              <div key="design-md" className="shrink-0 flex flex-col overflow-hidden" onClick={e => { e.stopPropagation(); setSelectedCard('design-md') }} style={{ width: 300, height: 560, borderRadius: "var(--aui-radius-card)", backgroundColor: 'var(--aui-on-dark)', border: selectedCard === 'design-md' ? '2px solid var(--aui-primary)' : '1px solid var(--aui-border-subtle)', cursor: 'default', outline: selectedCard === 'design-md' ? '3px solid var(--aui-primary-muted)' : 'none', outlineOffset: '2px' }}>
                <div style={{ padding: `var(--aui-space-3) var(--aui-space-4)`, borderBottom: '1px solid var(--aui-shadow-line)', display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--aui-text-muted)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text)' }}>DESIGN.md</span>
                  <span style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-assistive)', marginLeft: 2 }}>{designSystemDisplayName}</span>
                </div>
                <div data-card-scroll="design-md" style={{ overflowY: 'auto', padding: `var(--aui-space-4) var(--aui-space-4) var(--aui-space-5)`, flex: 1 }}>
                  {segs.map(seg => {
                    const k = seg.i
                    if (seg.t === 'blank') return <div key={k} style={{ height: 5 }} />
                    if (seg.t === 'hr')    return <div key={k} style={{ height: 1, backgroundColor: 'var(--aui-border)', margin: `var(--aui-space-2) 0` }} />
                    if (seg.t === 'h1')    return <p key={k} style={{ fontSize: "var(--aui-type-label-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text)', margin: `var(--aui-space-4) 0 var(--aui-space-1)`, lineHeight: "var(--aui-leading-snug)" }}>{parseMdInline(seg.text)}</p>
                    if (seg.t === 'h2')    return <p key={k} style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text)', margin: `var(--aui-space-3) 0 var(--aui-space-1)`, lineHeight: "var(--aui-leading-snug)" }}>{parseMdInline(seg.text)}</p>
                    if (seg.t === 'h3')    return <p key={k} style={{ fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text-neutral)', margin: `var(--aui-space-2) 0 var(--aui-space-1)` }}>{parseMdInline(seg.text)}</p>
                    if (seg.t === 'h4')    return <p key={k} style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text-muted)', margin: `var(--aui-space-2) 0 var(--aui-space-1)`, textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-slight)" }}>{parseMdInline(seg.text)}</p>
                    if (seg.t === 'bullet') return <p key={k} style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-neutral)', margin: `var(--aui-space-1) 0 var(--aui-space-1) var(--aui-space-2)`, lineHeight: "var(--aui-leading-normal)" }}>{'• '}{parseMdInline(seg.text)}</p>
                    if (seg.t === 'code')  return (
                      <pre key={k} style={{ fontSize: "var(--aui-type-meta-size)", fontFamily: 'monospace', backgroundColor: 'var(--aui-surface-muted)', borderRadius: "var(--aui-radius-sm)", padding: `var(--aui-space-2) var(--aui-space-3)`, margin: `var(--aui-space-1) 0`, overflowX: 'auto', color: 'var(--aui-text-neutral)', lineHeight: "var(--aui-leading-relaxed)", whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {seg.lines.join('\n')}
                      </pre>
                    )
                    if (seg.t === 'table') return (
                      <div key={k} style={{ overflowX: 'auto', margin: `var(--aui-space-1) 0` }}>
                        <table style={{ fontSize: "var(--aui-type-meta-size)", borderCollapse: 'collapse', width: '100%' }}>
                          <tbody>
                            {seg.rows.map((row, ri) => (
                              <tr key={ri} style={{ borderBottom: '1px solid var(--aui-border-subtle)' }}>
                                {row.map((cell, ci) => (
                                  <td key={ci} style={{ padding: `var(--aui-space-1) var(--aui-space-2)`, color: ri === 0 ? 'var(--aui-text)' : 'var(--aui-text-muted)', fontWeight: ri === 0 ? 600 : 400, whiteSpace: 'nowrap' }}>
                                    {parseMdInline(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                    return <p key={k} style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-muted)', margin: `var(--aui-space-1) 0`, lineHeight: "var(--aui-leading-relaxed)" }}>{parseMdInline((seg as { text: string }).text)}</p>
                  })}
                </div>
              </div>
            )
          })()}

          {/* Design system card — grid visualization */}
          {hasDesign ? (() => {
            const customMeta = customDesignMd ? parseCustomDesignMdMeta(customDesignMd) : null
            const basePalette = (customMeta?.palette ?? preset.palette) ?? [{ name: 'Primary', hex: 'var(--aui-primary)' }]
            const effectivePalette = brandColors[0]
              ? [
                  { name: 'Primary', hex: brandColors[0] },
                  ...(brandColors[1] ? [{ name: 'Secondary', hex: brandColors[1] }] : []),
                  ...basePalette.filter(s => s.name !== 'Primary' && s.name !== 'Secondary'),
                ]
              : basePalette
            const effectiveFonts = (customMeta?.fonts ?? preset.fonts) ?? { headline: 'sans-serif', body: 'sans-serif' }
            const effectiveColor = brandColors[0] ?? (customMeta?.color ?? preset.color) ?? 'var(--aui-primary)'
            const isDark = customMeta?.isDark ?? false
            const outerBg = isDark ? 'var(--aui-on-dark-faint)' : 'var(--aui-border-subtle)'
            const cellBg = isDark ? 'var(--aui-inverse-surface)' : 'var(--aui-on-dark)'
            const gridLine = isDark ? 'var(--aui-on-dark-faint)' : 'var(--aui-border-subtle)'
            const ink = isDark ? 'var(--aui-on-dark)' : 'var(--aui-text)'
            const muted = isDark ? 'var(--aui-text-muted)' : 'var(--aui-text-muted)'
            const subtle = isDark ? 'var(--aui-inverse-surface)' : 'var(--aui-surface-muted)'
            const border = isDark ? '1px solid var(--aui-on-dark-faint)' : '1px solid var(--aui-shadow-line)'

            // Derived design tokens from preset RICH_META (customMeta has no token fields)
            const effectiveTypographyScale = preset.typographyScale
            const effectiveRadiusTokens = preset.radiusTokens
            const effectiveStatusColors = preset.statusColors

            const btnRadius = effectiveRadiusTokens?.find((t: { name: string; value: string }) => ['control', 'md', 'button'].includes(t.name))?.value
              ?? effectiveRadiusTokens?.find((t: { name: string; value: string }) => t.name === 'sm')?.value
              ?? '6px'
            const hasPill = effectiveRadiusTokens?.some((t: { name: string; value: string }) => t.name === 'pill' || t.value === '9999px' || t.value === '999px') ?? false
            const chipRadius = hasPill ? '9999px' : (effectiveRadiusTokens?.find((t: { name: string; value: string }) => ['xl', 'lg', 'full'].includes(t.name))?.value ?? '20px')
            const badgeRadius = effectiveRadiusTokens?.find((t: { name: string; value: string }) => ['xs', 'sm'].includes(t.name))?.value ?? '4px'
            const negativeColor = effectiveStatusColors?.find((s: { name: string; hex: string }) => s.name.toLowerCase().includes('negative'))?.hex ?? 'var(--aui-negative)'

            const TYPO_VISUAL_SIZES = [58, 46, 36, 28]
            type TypoRow = { label: string; font: string; size: number; weight: number; actualSize: string | null }
            const typoRows: TypoRow[] = effectiveTypographyScale
              ? effectiveTypographyScale.slice(0, Math.min(effectivePalette.length, 4)).map((step: { name: string; size: string; weight: number }, i: number): TypoRow => ({
                  label: step.name,
                  font: i === 0 ? effectiveFonts.headline : effectiveFonts.body,
                  size: TYPO_VISUAL_SIZES[i] ?? 24,
                  weight: step.weight,
                  actualSize: step.size,
                }))
              : [
                  { label: 'Headline', font: effectiveFonts.headline, size: 58, weight: 700, actualSize: null },
                  { label: 'Body',     font: effectiveFonts.body,     size: 46, weight: 400, actualSize: null },
                  { label: 'Label',    font: effectiveFonts.body,     size: 36, weight: 500, actualSize: null },
                  { label: 'Caption',  font: effectiveFonts.body,     size: 28, weight: 400, actualSize: null },
                ]

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

            const stylePlanLabel = designSystemDisplayName

            return (
              <div className="shrink-0 flex flex-col overflow-hidden" onClick={e => { e.stopPropagation(); setSelectedCard('style-plan') }} style={{ width: 680, height: 560, borderRadius: "var(--aui-radius-card)", backgroundColor: outerBg, border: selectedCard === 'style-plan' ? '2px solid var(--aui-primary)' : (isDark ? '1px solid var(--aui-on-dark-faint)' : '1px solid var(--aui-border-subtle)'), cursor: 'default', outline: selectedCard === 'style-plan' ? '3px solid var(--aui-primary-muted)' : 'none', outlineOffset: '2px' }}>

                {/* Header */}
                <div style={{ padding: `var(--aui-space-3) var(--aui-space-4)`, borderBottom: border, display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", backgroundColor: cellBg }}>
                  <Sparkles size={11} style={{ color: effectiveColor }} />
                  <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: ink }}>{stylePlanLabel} Token Reference</span>
                  <span style={{ fontSize: "var(--aui-type-nano-size)", color: muted }}>
                    {customDesignMd ? 'DESIGN.md' : designPreset === 'none' ? 'aide.md 계약' : `${designPreset}.md`} · 토큰 실값 / 컴포넌트는 근사
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: "var(--aui-space-1)", alignItems: 'center' }}>
                    {(['A', 'B', 'C'] as const).map((l, i) => {
                      const v = mainVariants[i]
                      const loading = i === 0 ? isGenerating : i === 1 ? isGeneratingB : isGeneratingC
                      return <div key={l} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: v ? 'var(--aui-positive)' : loading ? effectiveColor : isDark ? 'var(--aui-inverse-surface-raised)' : 'var(--aui-border)', transition: 'background-color 0.3s' }} />
                    })}
                  </div>
                </div>

                {/* 4-column grid */}
                <div data-card-scroll="style-plan" style={{ display: 'grid', gridTemplateColumns: '175px 140px 1fr 1fr', gap: 1, backgroundColor: gridLine, flex: 1, overflowY: 'auto' }}>

                  {/* Col 1: Color swatches + tint strips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {effectivePalette.map(swatch => {
                      const tints = genTints(swatch.hex)
                      const onSwatch = isLightHex(swatch.hex) ? 'var(--aui-text)' : 'var(--aui-on-dark)'
                      return (
                        <div key={swatch.name} style={{ backgroundColor: cellBg, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                          <div style={{ backgroundColor: swatch.hex, padding: `var(--aui-space-3) var(--aui-space-3)`, display: 'flex', flexDirection: 'column', gap: "var(--aui-space-1)", flex: 1 }}>
                            <span style={{ fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-semibold)", color: onSwatch }}>{swatch.name}</span>
                            <span style={{ fontSize: "var(--aui-type-meta-size)", fontFamily: 'monospace', color: onSwatch, opacity: 0.75 }}>{swatch.hex.toUpperCase()}</span>
                          </div>
                          <div style={{ display: 'flex', height: 14 }}>
                            {tints.map((t, ti) => <div key={ti} style={{ flex: 1, backgroundColor: t }} />)}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Col 2: Typography — reads from preset.typographyScale */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {typoRows.map(({ label, font, size, weight, actualSize }, i) => (
                      <div key={i} style={{ backgroundColor: cellBg, padding: `var(--aui-space-2) var(--aui-space-3)`, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: "var(--aui-space-1)", overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: "var(--aui-space-1)" }}>
                          <span style={{ fontSize: "var(--aui-type-nano-size)", fontWeight: "var(--aui-weight-semibold)", color: muted, textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wide)", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 70 }}>{label}</span>
                          <span style={{ fontSize: "var(--aui-type-nano-size)", color: isDark ? 'var(--aui-text-neutral)' : 'var(--aui-text-assistive)', flexShrink: 0 }}>{font.split(',')[0].trim()}</span>
                        </div>
                        {actualSize && (
                          <span style={{ fontSize: "var(--aui-type-nano-size)", color: isDark ? 'var(--aui-text-neutral)' : 'var(--aui-text-disabled)', fontFamily: 'monospace', lineHeight: "var(--aui-leading-none)" }}>{actualSize} · {weight}</span>
                        )}
                        <div style={{ fontSize: size, fontWeight: weight, color: ink, lineHeight: "var(--aui-leading-none)", fontFamily: font, letterSpacing: "var(--aui-tracking-tight)", overflow: 'hidden', marginTop: 'auto' }}>Aa</div>
                      </div>
                    ))}
                  </div>

                  {/* Col 3: illustrative token samples, not runtime component instances */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Buttons — radius from radiusTokens.md, negative from statusColors */}
                    <div style={{ backgroundColor: cellBg, padding: `var(--aui-space-3) var(--aui-space-3)`, flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: "var(--aui-space-1)" }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: "var(--aui-space-1)" }}>
                        <button style={{ backgroundColor: effectiveColor, color: 'var(--aui-on-dark)', border: 'none', borderRadius: btnRadius, padding: `var(--aui-space-2) var(--aui-space-1)`, fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-semibold)", cursor: 'default' }}>Primary</button>
                        <button style={{ backgroundColor: isDark ? 'var(--aui-on-dark-faint)' : 'var(--aui-shadow-line)', color: ink, border: 'none', borderRadius: btnRadius, padding: `var(--aui-space-2) var(--aui-space-1)`, fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'default' }}>Secondary</button>
                        <button style={{ backgroundColor: 'transparent', color: ink, border: `1px solid ${isDark ? 'var(--aui-on-dark-faint)' : 'var(--aui-scrim-soft)'}`, borderRadius: btnRadius, padding: `var(--aui-space-2) var(--aui-space-1)`, fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'default' }}>Outline</button>
                        <button style={{ backgroundColor: 'transparent', color: ink, border: 'none', borderRadius: btnRadius, padding: `var(--aui-space-2) var(--aui-space-1)`, fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'default' }}>Ghost</button>
                      </div>
                      <button style={{ backgroundColor: negativeColor, color: 'var(--aui-on-dark)', border: 'none', borderRadius: btnRadius, padding: `var(--aui-space-2) var(--aui-space-1)`, fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-semibold)", cursor: 'default', width: '100%' }}>Negative</button>
                    </div>

                    {/* Dividers */}
                    <div style={{ backgroundColor: cellBg, padding: `var(--aui-space-3) var(--aui-space-3)`, display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: "var(--aui-space-2)" }}>
                        <div style={{ height: 1, backgroundColor: effectiveColor, width: '100%' }} />
                        <div style={{ height: 1, backgroundColor: gridLine, width: '75%' }} />
                        <div style={{ height: 1, backgroundColor: gridLine, width: '50%' }} />
                      </div>
                    </div>

                    {/* Toggle + checkbox + radio */}
                    <div style={{ backgroundColor: cellBg, padding: `var(--aui-space-3) var(--aui-space-3)`, display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", flex: 1 }}>
                      <div style={{ width: 32, height: 18, borderRadius: "var(--aui-radius-sm)", backgroundColor: effectiveColor, display: 'flex', alignItems: 'center', padding: `0 var(--aui-space-1)` }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: 'var(--aui-on-dark)', marginLeft: 'auto' }} />
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: "var(--aui-radius-sm)", backgroundColor: effectiveColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="var(--aui-on-dark)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${effectiveColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: effectiveColor }} />
                      </div>
                    </div>

                    {/* Nav icons */}
                    <div style={{ backgroundColor: cellBg, padding: `var(--aui-space-3) var(--aui-space-3)`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1 }}>
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
                    <div style={{ backgroundColor: cellBg, padding: `var(--aui-space-3) var(--aui-space-3)`, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)", backgroundColor: subtle, border: isDark ? '1px solid var(--aui-on-dark-faint)' : '1px solid var(--aui-shadow-line)', borderRadius: "var(--aui-radius-sm)", padding: `var(--aui-space-2) var(--aui-space-2)` }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <span style={{ fontSize: "var(--aui-type-meta-size)", color: muted }}>Search</span>
                      </div>
                    </div>

                    {/* List rows */}
                    <div style={{ backgroundColor: cellBg, padding: `0 var(--aui-space-3)`, flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: "var(--aui-space-1)" }}>
                      {[100, 75, 55].map((w, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", padding: `var(--aui-space-1) 0`, borderBottom: i < 2 ? (isDark ? '1px solid var(--aui-on-dark-faint)' : '1px solid var(--aui-border-subtle)') : 'none' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: i === 0 ? effectiveColor : subtle, flexShrink: 0 }} />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: "var(--aui-space-1)" }}>
                            <div style={{ height: 6, borderRadius: "var(--aui-radius-sm)", backgroundColor: isDark ? 'var(--aui-inverse-surface-raised)' : 'var(--aui-border)', width: `${w}%` }} />
                            <div style={{ height: 4, borderRadius: "var(--aui-radius-sm)", backgroundColor: isDark ? 'var(--aui-text)' : 'var(--aui-border-subtle)', width: `${Math.round(w * 0.6)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Badge + chips — radius from radiusTokens */}
                    <div style={{ backgroundColor: cellBg, padding: `var(--aui-space-3) var(--aui-space-3)`, flex: 1, display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)", flexWrap: 'wrap' }}>
                      <div style={{ backgroundColor: effectiveColor, color: 'var(--aui-on-dark)', borderRadius: badgeRadius, padding: `var(--aui-space-1) var(--aui-space-2)`, fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-semibold)" }}>New</div>
                      <div style={{ backgroundColor: subtle, color: ink, border: isDark ? '1px solid var(--aui-on-dark-faint)' : '1px solid var(--aui-shadow-medium)', borderRadius: chipRadius, padding: `var(--aui-space-1) var(--aui-space-2)`, fontSize: "var(--aui-type-meta-size)" }}>Filter</div>
                      <div style={{ backgroundColor: subtle, color: ink, border: isDark ? '1px solid var(--aui-on-dark-faint)' : '1px solid var(--aui-shadow-medium)', borderRadius: chipRadius, padding: `var(--aui-space-1) var(--aui-space-2)`, fontSize: "var(--aui-type-meta-size)" }}>Sort</div>
                    </div>

                    {/* Action icons */}
                    <div style={{ backgroundColor: cellBg, padding: `var(--aui-space-3) var(--aui-space-3)`, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                      {['M12 5v14M5 12l7 7 7-7', 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0', 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'].map((d, i) => (
                        <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="1.8"><path d={d}/></svg>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )
          })() : (
            /* No design system: simple spinner card */
            <div className="shrink-0 flex flex-col items-center justify-center gap-4" style={{ width: 280, padding: `var(--aui-space-8) var(--aui-space-6)`, borderRadius: "var(--aui-radius-card)", backgroundColor: 'var(--aui-on-dark-strong)', border: `1px solid ${F.hairlineSoft}`, boxShadow: "var(--aui-shadow-floating)" }}>
              <div className="size-10 rounded-full animate-spin" style={{ border: '2px solid var(--aui-border-subtle)', borderTopColor: 'var(--aui-primary)' }} />
              <p style={{ fontSize: "var(--aui-type-compact-size)", color: 'var(--aui-text-muted)', textAlign: 'center', lineHeight: "var(--aui-leading-relaxed)" }}>AI가 최적의 디자인을<br />설계하고 있습니다</p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: "var(--aui-space-2)" }}>
                {(['A', 'B', 'C'] as const).map((letter, idx) => {
                  const variant = mainVariants[idx]
                  const isLoadingThis = idx === 0 ? isGenerating : idx === 1 ? isGeneratingB : isGeneratingC
                  return (
                    <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
                      <div className={isLoadingThis ? 'animate-spin' : ''} style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(variant ? { backgroundColor: 'var(--aui-text)' } : isLoadingThis ? { border: '2px solid var(--aui-shadow-medium)', borderTopColor: 'var(--aui-text)' } : { backgroundColor: 'var(--aui-border)' }) }}>
                        {variant && <Check size={7} color="var(--aui-on-dark)" />}
                      </div>
                      <span style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-text-muted)' }}>시안 {letter}</span>
                      <span style={{ fontSize: "var(--aui-type-micro-size)", marginLeft: 'auto', color: variant ? 'var(--aui-positive)' : isLoadingThis ? 'var(--aui-text-muted)' : 'var(--aui-text-disabled)' }}>
                        {variant ? '완료' : isLoadingThis ? '생성 중...' : '대기 중'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="shrink-0 flex flex-col gap-2" style={{ width: isMobile ? 340 : isTablet ? 520 : 420 }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold" style={{ color: 'var(--aui-text)' }}>생성 엔진</p>
                <p className="text-[11px]" style={{ color: 'var(--aui-text-muted)' }}>{generationEngine === 'legacy-html' ? '기존 품질의 자유도 높은 HTML 시안' : '편집·실시간 생성을 위한 Node Graph 실험'}</p>
              </div>
              <div className="flex items-center p-1" style={{ borderRadius: 'var(--aui-radius-control)', background: 'var(--aui-surface-muted)', border: '1px solid var(--aui-border-subtle)' }}>
                <button type="button" disabled={isAnyGenerating} onClick={() => changeGenerationEngine('node-graph')} className="px-3 py-1.5 text-[11px] font-medium disabled:opacity-50" style={{ border: 0, borderRadius: 'var(--aui-radius-sm)', cursor: isAnyGenerating ? 'not-allowed' : 'pointer', background: generationEngine === 'node-graph' ? 'var(--aui-on-dark)' : 'transparent', color: generationEngine === 'node-graph' ? 'var(--aui-text)' : 'var(--aui-text-muted)', boxShadow: generationEngine === 'node-graph' ? 'var(--aui-shadow-subtle)' : 'none' }}>Node Graph</button>
                <button type="button" disabled={isAnyGenerating} onClick={() => changeGenerationEngine('legacy-html')} className="px-3 py-1.5 text-[11px] font-medium disabled:opacity-50" style={{ border: 0, borderRadius: 'var(--aui-radius-sm)', cursor: isAnyGenerating ? 'not-allowed' : 'pointer', background: generationEngine === 'legacy-html' ? 'var(--aui-on-dark)' : 'transparent', color: generationEngine === 'legacy-html' ? 'var(--aui-text)' : 'var(--aui-text-muted)', boxShadow: generationEngine === 'legacy-html' ? 'var(--aui-shadow-subtle)' : 'none' }}>기존 HTML</button>
              </div>
            </div>
            {generationEngine === 'node-graph' && <button type="button" disabled={isAnyGenerating} onClick={() => changeGenerationEngine('legacy-html')} className="self-start text-[11px] underline underline-offset-2 disabled:opacity-50" style={{ border: 0, padding: 0, background: 'transparent', color: 'var(--aui-text-muted)', cursor: isAnyGenerating ? 'not-allowed' : 'pointer' }}>품질이 낮으면 기존 HTML로 바로 돌아가기</button>}
          </div>

          {mainVariants.every(v => !v) && !isAnyGenerating && (
            <div
              className="flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors shrink-0"
              style={{ borderRadius: "var(--aui-radius-card)", border: '2px dashed var(--aui-shadow-medium)', minHeight: 280, width: isMobile ? 340 : isTablet ? 520 : 760, padding: "var(--aui-space-8)" }}
              onClick={handleGenerate}
            >
              <div className="mb-3 size-11 flex items-center justify-center bg-[var(--aui-surface-muted)]" style={{ borderRadius: "var(--aui-radius-control)" }}>
                <Shapes size={20} color="var(--aui-text-muted)" />
              </div>
              <p className="text-[13px] font-semibold text-[var(--aui-text-neutral)] mb-1">시안 생성</p>
              <p className="text-[12px] text-[var(--aui-text-muted)] text-center">A/B/C 디자인 시안을 바로 생성합니다</p>
            </div>
          )}

          {/* 3 variant artboard cards — only visible after generation starts */}
          {variantGenerationStarted && <div className="flex items-start gap-6 overflow-x-auto">
            {(['A', 'B', 'C'] as const).map((letter, idx) => {
              const variant = mainVariants[idx]
              const isLoadingThis = idx === 0 ? isGenerating : idx === 1 ? isGeneratingB : isGeneratingC
              const isFailed = variantFailed[idx]
              const cardW = isMobile ? 180 : isTablet ? 220 : 320
              const previewNativeW = platform === 'mobile' ? 390 : 1440
              const previewNativeH = platform === 'mobile' ? 844 : 1024
              const previewScale = cardW / previewNativeW
              const fallbackCardH = Math.round(previewNativeH * previewScale)
              const contentNativeH = variantContentHeights[idx]
              const cardH = contentNativeH ? Math.round(contentNativeH * previewScale) : fallbackCardH
              return (
                <div key={letter} className="flex flex-col gap-3 shrink-0" style={{ width: cardW }}>
                  <div className="flex items-center gap-2" style={{ minHeight: 26 }}>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--aui-text)' }}>시안 {letter}</span>
                    {isLoadingThis && (
                      <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--aui-text-muted)' }}>
                        <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeOpacity="0.3" />
                          <path d="M21 12a9 9 0 00-9-9" />
                        </svg>
                        생성 중
                      </div>
                    )}
                    {variant && !isLoadingThis && (
                      <span className="text-[12px]" style={{ color: 'var(--aui-text-muted)' }}>완료</span>
                    )}
                    {/* B 시안 히어로 스타일 토글 */}
                    {letter === 'B' && variant && (
                      <div className="ml-auto flex items-center" style={{ gap: "var(--aui-space-1)", padding: "var(--aui-space-1)", borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-border-subtle)' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setBHeroStyle('object') }}
                          style={{ padding: `var(--aui-space-1) var(--aui-space-2)`, borderRadius: "var(--aui-radius-sm)", fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-medium)", border: 'none', cursor: 'pointer', transition: 'all 0.12s', backgroundColor: bHeroStyle === 'object' ? 'var(--aui-on-dark)' : 'transparent', color: bHeroStyle === 'object' ? 'var(--aui-text)' : 'var(--aui-text-muted)', boxShadow: bHeroStyle === 'object' ? "var(--aui-shadow-subtle)" : 'none' }}
                        >
                          오브젝트
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); if (bSceneImage) setBHeroStyle('scene') }}
                          disabled={!bSceneImage && !isGeneratingBScene}
                          style={{ padding: `var(--aui-space-1) var(--aui-space-2)`, borderRadius: "var(--aui-radius-sm)", fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-medium)", border: 'none', cursor: bSceneImage ? 'pointer' : 'not-allowed', transition: 'all 0.12s', backgroundColor: bHeroStyle === 'scene' ? 'var(--aui-on-dark)' : 'transparent', color: bHeroStyle === 'scene' ? 'var(--aui-text)' : bSceneImage ? 'var(--aui-text-muted)' : 'var(--aui-text-disabled)', boxShadow: bHeroStyle === 'scene' ? "var(--aui-shadow-subtle)" : 'none', display: 'flex', alignItems: 'center', gap: "var(--aui-space-1)" }}
                        >
                          {isGeneratingBScene && bHeroStyle !== 'scene' && (
                            <svg className="animate-spin" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeOpacity="0.3" />
                              <path d="M21 12a9 9 0 00-9-9" />
                            </svg>
                          )}
                          씬
                        </button>
                      </div>
                    )}
                    {letter !== 'B' && variant?.imageWarnings?.length ? (
                      <span
                        className="ml-auto text-[11px] px-1.5 py-0.5"
                        style={{ color: 'var(--aui-caution-text)', backgroundColor: 'var(--aui-caution-soft)', border: '1px solid var(--aui-caution-border)', borderRadius: "var(--aui-radius-sm)" }}
                        title={variant.imageWarnings.join('\n')}
                      >
                        이미지 대체
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="relative bg-white"
                    onClick={e => { e.stopPropagation(); setSelectedCard(`variant-${letter}`) }}
                    style={{
                      borderRadius: "var(--aui-radius-control)",
                      height: cardH,
                      overflow: 'hidden',
                      border: (isExpandingPrototype && pickedVariantIdx === idx) ? '2px solid var(--aui-primary)' : selectedCard === `variant-${letter}` ? '2px solid var(--aui-primary)' : '2px solid var(--aui-on-dark-muted)',
                      outline: (isExpandingPrototype && pickedVariantIdx === idx) ? '3px solid var(--aui-primary-muted)' : selectedCard === `variant-${letter}` ? '3px solid var(--aui-primary-muted)' : 'none',
                      outlineOffset: '2px',
                      cursor: 'default',
                    }}
                  >
                    {/* 선택 시안 완성 중 오버레이 */}
                    {isExpandingPrototype && pickedVariantIdx === idx && (
                      <div style={{ position: 'absolute', inset: 0, zIndex: 10, backgroundColor: 'var(--aui-on-dark-strong)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: "var(--aui-space-3)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--aui-primary-muted)', borderTopColor: 'var(--aui-primary)', animation: 'spin 0.85s linear infinite' }} />
                        <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-primary)', letterSpacing: "var(--aui-tracking-tight)" }}>선택 시안 완성 중...</span>
                      </div>
                    )}
                    {variant?.screenIr ? (
                      <div style={{ width: previewNativeW, height: contentNativeH ?? previewNativeH, transform: `scale(${previewScale})`, transformOrigin: 'top left', position: 'relative', overflow: 'hidden', background: studioTheme.background }}>
                        {(() => { const graph = screenIrToNodeGraph(variant.screenIr!, studioTheme); return validateNodeGraph(graph).valid ? <UINodeGraphCanvas graph={graph} theme={studioTheme}/> : null })()}
                      </div>
                    ) : variant ? (
                      <iframe
                        ref={el => { variantIframeRefs.current[idx] = el }}
                        srcDoc={flattenForPreview(letter === 'B' && bHeroStyle === 'scene' && bSceneImage ? patchHeroToScene(variant.html, bSceneImage.base64, bSceneImage.mimeType) : variant.html)}
                        title={`시안 ${letter} 프리뷰`}
                        sandbox="allow-scripts allow-same-origin"
                        scrolling="no"
                        onLoad={e => {
                          try {
                            const doc = (e.currentTarget as HTMLIFrameElement).contentDocument
                            if (!doc) return
                            const h = doc.documentElement.scrollHeight || doc.body?.scrollHeight
                            if (h && h > 100) {
                              setVariantContentHeights(prev => {
                                const next = [...prev] as [number | null, number | null, number | null]
                                next[idx] = h
                                return next
                              })
                            }
                          } catch { /* cross-origin guard */ }
                        }}
                        style={{
                          width: previewNativeW,
                          height: contentNativeH ?? previewNativeH,
                          border: 'none',
                          display: 'block',
                          transform: `scale(${previewScale})`,
                          transformOrigin: 'top left',
                          backgroundColor: 'var(--aui-on-dark)',
                        }}
                      />
                    ) : isLoadingThis && streamingScreens[idx] ? (
                      <div style={{ width: previewNativeW, height: previewNativeH, transform: `scale(${previewScale})`, transformOrigin: 'top left', position: 'relative', overflow: 'hidden', background: studioTheme.background, pointerEvents: 'none' }}>
                        {(() => { const graph = screenIrToNodeGraph(streamingScreens[idx]!, studioTheme); return <UINodeGraphCanvas graph={graph} theme={studioTheme} activeNodeId={streamingActiveNodes[idx]}/> })()}
                      </div>
                    ) : isLoadingThis ? (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="size-8 rounded-full animate-spin" style={{ border: '2px solid var(--aui-border-subtle)', borderTopColor: 'var(--aui-primary)' }} />
                        </div>
                      </>
                    ) : isFailed ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <span className="text-[13px] text-[var(--aui-text-muted)]">생성 실패</span>
                        <button onClick={handleGenerate} className="flex items-center gap-1 text-[13px] text-[var(--aui-text-muted)] hover:text-[var(--aui-text)] transition-colors">
                          <RefreshCw size={11} /> 다시 시도
                        </button>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-8 rounded-full" style={{ border: '2px solid var(--aui-border-subtle)', borderTopColor: 'var(--aui-scrim)' }} />
                      </div>
                    )}
                  </div>
                  {variant && (
                    <button
                      onClick={() => handlePickVariant(idx as 0|1|2)}
                      className="w-full py-2.5 text-[13px] font-medium text-white transition-colors hover:!bg-[var(--aui-text-neutral)]"
                      style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-text)' }}
                    >
                      이 시안으로 진행
                    </button>
                  )}
                </div>
              )
            })}
          </div>}

          {/* ── 프로토타입 카드: 생성 중 or 완료 ── */}
          {(isExpandingPrototype || result) && pickedVariantIdx !== null && (() => {
            const cardW = isMobile ? 180 : isTablet ? 220 : 320
            const nativeW = platform === 'mobile' ? 390 : 1440
            const nativeH = platform === 'mobile' ? 844 : 1024
            const scale = cardW / nativeW
            const cardH = Math.round(nativeH * scale)
            const pickedLabel = ['A', 'B', 'C'][pickedVariantIdx]
            return (
              <div className="flex items-start gap-6 shrink-0">
                {/* 구분 화살표 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: "var(--aui-space-1)", paddingTop: 24, color: 'var(--aui-text-disabled)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                </div>
                {/* 프로토타입 카드 */}
                <div className="flex flex-col gap-3 shrink-0" style={{ width: cardW }}>
                  {/* 헤더 */}
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--aui-text)' }}>완성 시안 {pickedLabel}</span>
                    {isExpandingPrototype && (
                      <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--aui-primary)' }}>
                        <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeOpacity="0.3" />
                          <path d="M21 12a9 9 0 00-9-9" />
                        </svg>
                        생성 중
                      </div>
                    )}
                    {!isExpandingPrototype && result && (
                      <>
                        <span className="text-[12px]" style={{ color: 'var(--aui-positive)' }}>완료</span>
                        <button
                          onClick={() => setStep(4)}
                          className="ml-auto flex items-center gap-1 text-[12px] font-semibold transition-colors"
                          style={{ color: 'var(--aui-primary)' }}
                        >
                          편집 →
                        </button>
                      </>
                    )}
                  </div>

                  {/* 서브 화면 탭 (screens가 있을 때만) */}
                  {!isExpandingPrototype && screens.length > 1 && (
                    <div style={{ display: 'flex', gap: "var(--aui-space-1)", flexWrap: 'wrap' }}>
                      {screens.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setActiveScreenId(s.id)
                            sendToIframe({ type: 'aide:navigate', id: s.id })
                          }}
                          style={{
                            padding: `var(--aui-space-1) var(--aui-space-3)`, borderRadius: "var(--aui-radius-pill)", fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-medium)", border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                            backgroundColor: activeScreenId === s.id ? 'var(--aui-text)' : 'var(--aui-border-subtle)',
                            color: activeScreenId === s.id ? 'var(--aui-on-dark)' : 'var(--aui-text-muted)',
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 프레임 */}
                  <div className="relative overflow-hidden bg-white" style={{ borderRadius: "var(--aui-radius-control)", height: cardH, border: '2px solid var(--aui-primary)', outline: '3px solid var(--aui-primary-muted)', outlineOffset: 2 }}>
                    {isExpandingPrototype ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--aui-primary-muted)', borderTopColor: 'var(--aui-primary)', animation: 'spin 0.85s linear infinite' }} />
                        <span style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-muted)', letterSpacing: "var(--aui-tracking-tight)" }}>멀티스크린 확장 중</span>
                      </div>
                    ) : result ? (
                      <iframe
                        ref={iframeRef}
                        srcDoc={result.html}
                        style={{ width: nativeW, height: nativeH, border: 'none', display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left' }}
                        sandbox="allow-scripts allow-same-origin"
                        title="프로토타입 미리보기"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })()}

          </div>
        </div>

        </div>{/* ← closes content-area flex wrapper */}

        {generateError && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 text-sm text-[var(--aui-negative)]" style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-inverse-surface)', border: '1px solid var(--aui-negative-border)', backdropFilter: 'blur(8px)' }}>
            {generateError}
          </div>
        )}

      </div>
    )
  }

  // ─── Step 4: Figma-style full-screen editor ──────────────────────────────
  if (step === 4 && result) {
    return (
      <div className="h-screen overflow-hidden flex flex-col text-[var(--aui-text)] relative" style={{ fontFamily: "var(--font-pretendard)", backgroundColor: 'var(--aui-surface-muted)' }}>

        {/* Tab bar */}
        <div className="border-b border-[var(--aui-shadow-soft)] flex items-stretch shrink-0 bg-white" style={{ height: '56px' }}>
          <button onClick={onBack} aria-label="Aide 홈으로 이동" className="flex items-center px-3 border-r border-[var(--aui-shadow-soft)] hover:bg-[var(--aui-border)] transition-colors shrink-0">
            <img src="/logo_aide.png" alt="Aide" className="h-14 w-auto object-contain" />
          </button>
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
                    gap: "var(--aui-space-1)",
                    padding: `0 var(--aui-space-2) 0 var(--aui-space-4)`,
                    maxWidth: 180,
                    borderRight: '1px solid var(--aui-border-subtle)',
                    borderBottom: isActive ? `2px solid ${F.primary}` : '2px solid transparent',
                    backgroundColor: 'transparent',
                    height: '100%',
                  }}
                >
                  <button
                    onClick={() => loadHistoryItemIntoEditor(item)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: "var(--aui-type-compact-size)",
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: isActive ? F.primary : F.inkAlternative,
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      textAlign: 'left',
                      transition: 'color 0.1s',
                    }}
                    className={isActive ? undefined : 'hover:!text-[var(--aui-text)]'}
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
                        else { setStartedFromLanding(false); setStep(1) }
                      }
                    }}
                    style={{
                      flexShrink: 0,
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: "var(--aui-radius-sm)",
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--aui-text-muted)',
                      fontSize: "var(--aui-type-micro-size)",
                      opacity: 0,
                      transition: 'opacity 0.1s, background-color 0.1s',
                      padding: 0,
                    }}
                    className="group-hover:!opacity-100 hover:!bg-[var(--aui-border-subtle)] hover:!text-[var(--aui-text-neutral)]"
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
                className="text-[13px] font-medium text-[var(--aui-text)] px-4 py-1.5 transition-colors shrink-0 flex items-center gap-1.5 hover:!bg-[var(--aui-border)]"
                style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-on-dark)' }}
              >
                공유 <ChevronDown size={11} />
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white overflow-hidden z-50" style={{ borderRadius: "var(--aui-radius-sm)", boxShadow: "var(--aui-shadow-floating)", border: `1px solid ${F.hairlineSoft}` }}>
                  <button onClick={handleCopyLink} className="w-full flex items-start gap-2.5 px-4 py-2.5 hover:bg-[var(--aui-border-subtle)] transition-colors text-left">
                    {copyLinkDone
                      ? <><span className="text-[var(--aui-positive)] mt-0.5">✓</span><span className="text-[13px] text-[var(--aui-positive)]">복사됨!</span></>
                      : <><span className="text-[16px] mt-0.5 shrink-0">🔗</span>
                          <span>
                            <span className="block text-[13px] text-[var(--aui-text)]">링크 복사</span>
                            <span className="block text-[13px] text-[var(--aui-text-muted)] leading-tight">결과물을 저장하지 않으므로<br />HTML을 먼저 다운로드 하세요</span>
                          </span>
                        </>
                    }
                  </button>
                  <div className="h-px bg-[var(--aui-border-subtle)] mx-3" />
                  <button onClick={downloadHtml} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--aui-text)] hover:bg-[var(--aui-border-subtle)] transition-colors text-left">
                    <span className="text-[16px]">📄</span> HTML 다운로드
                  </button>
                  <button onClick={downloadPng} disabled={!result?.image} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-[var(--aui-border-subtle)] transition-colors text-left disabled:opacity-40" style={{ color: 'var(--aui-text)' }}>
                    <span className="text-[16px]">🖼️</span> PNG 내보내기
                  </button>
                  <div className="h-px bg-[var(--aui-border-subtle)] mx-3" />
                  <button onClick={exportToFigma} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--aui-text)] hover:bg-[var(--aui-border-subtle)] transition-colors text-left">
                    <span className="text-[16px]">🎨</span> Figma로 내보내기
                  </button>
                </div>
              )}
            </div>
            <div className="size-7 flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ borderRadius: "var(--aui-radius-pill)", backgroundColor: 'var(--aui-text)' }}>
              W
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="h-9 border-b border-[var(--aui-shadow-soft)] flex items-center px-4 shrink-0 bg-white">
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="flex items-center justify-center size-7 rounded hover:bg-[var(--aui-border)] transition-colors disabled:opacity-30"
              style={{ color: 'var(--aui-text-muted)' }}
              title="실행 취소 (⌘Z)"
            >
              <CornerUpLeft size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="flex items-center justify-center size-7 rounded hover:bg-[var(--aui-border)] transition-colors disabled:opacity-30"
              style={{ color: 'var(--aui-text-muted)' }}
              title="다시 실행 (⌘⇧Z)"
            >
              <CornerUpRight size={14} />
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded overflow-hidden border border-[var(--aui-shadow-soft)]">
              <button
                onClick={() => { setPlatform('mobile'); setPreviewWidth(390); setZoom(100) }}
                className="px-3 py-1 text-[12px] font-medium transition-colors"
                style={platform === 'mobile' ? { background: 'var(--aui-text)', color: 'var(--aui-on-dark)' } : { color: 'var(--aui-text-muted)', background: 'transparent' }}
              >앱</button>
              <button
                onClick={() => { setPlatform('web'); setPreviewWidth(1440); setZoom(60) }}
                className="px-3 py-1 text-[12px] font-medium transition-colors border-l border-[var(--aui-shadow-soft)]"
                style={platform === 'web' ? { background: 'var(--aui-text)', color: 'var(--aui-on-dark)' } : { color: 'var(--aui-text-muted)', background: 'transparent' }}
              >웹</button>
            </div>
            <div className="w-px h-4 bg-[var(--aui-shadow-soft)]" />
            <div className="flex items-center gap-2 text-[13px] text-[var(--aui-text-muted)]">
              <SlidersHorizontal size={12} />
              <span>Tweaks</span>
              <Toggle on={tweaksOpen} onChange={setTweaksOpen} />
            </div>
            <div className="w-px h-4 bg-[var(--aui-shadow-soft)]" />
            <button
              onClick={() => { if (editMode) commitIframeHtml(); setEditMode(e => !e); setSelectedStyles(null); setSelectedSharedClasses([]); setSyncAllScreens(false) }}
              className="flex items-center gap-1.5 text-[13px] px-2.5 py-1 border transition-colors"
              style={{ borderRadius: "var(--aui-radius-sm)", ...(editMode ? { backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)', borderColor: 'var(--aui-text)' } : { color: 'var(--aui-text-muted)', borderColor: 'var(--aui-shadow-soft)' }) }}
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={() => setCreonOpen(o => !o)}
              className="flex items-center gap-1.5 text-[13px] px-2.5 py-1 border transition-colors"
              style={{ borderRadius: "var(--aui-radius-sm)", ...(creonOpen ? { backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)', borderColor: 'var(--aui-text)' } : { color: 'var(--aui-text-muted)', borderColor: 'var(--aui-shadow-soft)' }) }}
              title="Creon 에셋 패널"
            >
              <ImageIcon size={12} /> Creon
            </button>
            <button
              onClick={() => { const next = !darkMode; setDarkMode(next); sendToIframe({ type: 'aide:dark', on: next }) }}
              className="flex items-center justify-center size-7 rounded hover:bg-[var(--aui-border)] transition-colors"
              style={{ color: 'var(--aui-text-muted)' }}
              title={darkMode ? '라이트 모드' : '다크 모드'}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <div className="w-px h-4 bg-[var(--aui-shadow-soft)]" />
            <div className="relative" ref={zoomRef}>
              <button
                onClick={() => setZoomOpen(o => !o)}
                className="flex items-center gap-1 text-[13px] text-[var(--aui-text-muted)] hover:text-[var(--aui-text)] transition-colors"
              >
                <span>{zoom}%</span>
                <ChevronDown size={11} />
              </button>
              {zoomOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-28 bg-white overflow-hidden z-50" style={{ borderRadius: "var(--aui-radius-sm)", boxShadow: "var(--aui-shadow-floating)", border: `1px solid ${F.hairlineSoft}` }}>
                  {[50, 60, 75, 100].map(z => (
                    <button
                      key={z}
                      onClick={() => { setZoom(z); setZoomOpen(false) }}
                      className="w-full px-3 py-2 text-[13px] text-left hover:bg-[var(--aui-border-subtle)] transition-colors flex items-center justify-between"
                      style={{ color: zoom === z ? 'var(--aui-text)' : 'var(--aui-text-muted)' }}
                    >
                      <span>{z}%</span>
                      {zoom === z && <Check size={10} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-[var(--aui-shadow-soft)]" />
            <button onClick={downloadHtml} className="flex items-center gap-1 text-[13px] text-[var(--aui-text-muted)] hover:text-[var(--aui-text)] transition-colors">
              <Download size={12} />HTML
            </button>
            <button onClick={handleReset} className="flex items-center gap-1 text-[13px] text-[var(--aui-text-muted)] hover:text-[var(--aui-text)] transition-colors ml-1">
              <RefreshCw size={11} />새로 만들기
            </button>
          </div>
        </div>

        {/* Screen navigation */}
        {screens.length > 0 && (
          <div className="h-9 border-b border-[var(--aui-shadow-soft)] flex items-center px-4 gap-1 shrink-0 overflow-x-auto bg-white">
            {screens.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveScreenId(s.id); sendToIframe({ type: 'aide:navigate', id: s.id }) }}
                className="px-3 py-1 text-[13px] shrink-0 transition-colors"
                style={{ borderRadius: "var(--aui-radius-sm)", ...(activeScreenId === s.id ? { backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)' } : { color: 'var(--aui-text-muted)' }) }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel: description + chat */}
          <div className="w-64 shrink-0 border-r border-[var(--aui-shadow-soft)] bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--aui-shadow-line)] shrink-0">
              <p className="text-[13px] font-semibold text-[var(--aui-text)] mb-1 leading-[1.4]">
                {questionnaire?.projectSummary?.split('.')[0] || '서비스 요약'}
              </p>
              {questionnaire?.projectSummary && (
                <p className="text-[13px] text-[var(--aui-text-muted)] leading-[1.6] mt-1">{questionnaire.projectSummary}</p>
              )}
            </div>
            {result?.screenIr && (
              <div className="px-3 py-3 border-b border-[var(--aui-shadow-line)] shrink-0 max-h-56 overflow-y-auto">
                <div className="text-[11px] font-semibold text-[var(--aui-text-muted)] mb-2">화면 구조</div>
                <div className="space-y-1">
                  {result.screenIr.sections.map((section, index) => (
                    <div key={section.id} className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-[var(--aui-border-subtle)]">
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-[var(--aui-text)] truncate">{section.title || section.type}</div>
                        <div className="text-[10px] text-[var(--aui-text-muted)]">{section.type}</div>
                      </div>
                      <button disabled={index === 0} onClick={() => moveIrSection(section.id, -1)} className="size-6 text-[12px] disabled:opacity-20" title="위로 이동">↑</button>
                      <button disabled={index === result.screenIr!.sections.length - 1} onClick={() => moveIrSection(section.id, 1)} className="size-6 text-[12px] disabled:opacity-20" title="아래로 이동">↓</button>
                      <button disabled={result.screenIr!.sections.length <= 1} onClick={() => removeIrSection(section.id)} className="size-6 text-[12px] text-[var(--aui-negative)] disabled:opacity-20" title="삭제">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
                  <Sparkles size={16} className="text-[var(--aui-text-muted)]" />
                  <p className="text-[13px] text-[var(--aui-text-muted)] leading-[1.6]">대화로 디자인을<br />수정할 수 있습니다</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className="max-w-[85%] px-3 py-2 text-[14px] leading-[1.5]"
                      style={{
                        borderRadius: "var(--aui-radius-control)",
                        ...(msg.role === 'user'
                          ? { backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)' }
                          : { backgroundColor: 'var(--aui-border-subtle)', color: 'var(--aui-text-neutral)' }),
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isRefining && (
                <div className="flex justify-start">
                  <div className="bg-[var(--aui-border-subtle)] px-3 py-2 flex items-center gap-2 text-[13px] text-[var(--aui-text-muted)]" style={{ borderRadius: "var(--aui-radius-control)" }}>
                    <div className="size-3 rounded-full animate-spin" style={{ border: '1.5px solid var(--aui-shadow-medium)', borderTopColor: 'var(--aui-scrim-strong)' }} />
                    수정 중...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-[var(--aui-shadow-line)] shrink-0">
              <div className="flex items-end gap-2 bg-[var(--aui-border-subtle)] px-3 py-2" style={{ borderRadius: "var(--aui-radius-control)" }}>
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefine() }
                  }}
                  placeholder="수정 요청을 입력하세요..."
                  className="flex-1 bg-transparent text-[13px] text-[var(--aui-text)] placeholder:text-[var(--aui-text-muted)] resize-none outline-none leading-[1.5]"
                  style={{ maxHeight: '96px', minHeight: '20px' }}
                  rows={1}
                  disabled={isRefining}
                />
                <button
                  onClick={handleRefine}
                  disabled={!chatInput.trim() || isRefining}
                  className="shrink-0 size-7 flex items-center justify-center rounded-full transition-colors"
                  style={{ backgroundColor: chatInput.trim() && !isRefining ? 'var(--aui-text)' : 'var(--aui-border)' }}
                >
                  <Send size={12} style={{ color: chatInput.trim() && !isRefining ? 'var(--aui-on-dark)' : 'var(--aui-text-muted)', marginLeft: '1px' }} />
                </button>
              </div>
              <p className="text-[13px] text-[var(--aui-text-muted)] mt-1.5 pl-1">Enter 전송 · Shift+Enter 줄바꿈</p>
            </div>
          </div>

          {/* Center: unified canvas — Design System + Variants + Prototype */}
          <div ref={canvasAreaRef} className="flex-1 overflow-hidden relative isolate" onClick={() => setSelectedCard(null)}>
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>
              <DotField />
            </div>
            <div ref={canvasTransformRef} style={{ transformOrigin: '0 0', display: 'flex', alignItems: 'flex-start', gap: "var(--aui-space-8)", padding: "var(--aui-space-10)", width: 'max-content' }}>

              {/* ── 디자인 시스템 카드 ── */}
              {(() => {
                const p4Preset = visualizedDesignPreset
                const p4HasDesign = !!p4Preset.palette || !!customDesignMd
                if (!p4HasDesign) return null
                const p4Meta = customDesignMd ? parseCustomDesignMdMeta(customDesignMd) : null
                const p4Palette = (p4Meta?.palette ?? p4Preset.palette) ?? [{ name: 'Primary', hex: 'var(--aui-primary)' }]
                const p4Fonts = (p4Meta?.fonts ?? p4Preset.fonts) ?? { headline: 'sans-serif', body: 'sans-serif' }
                const p4Color = (p4Meta?.color ?? p4Preset.color) ?? 'var(--aui-primary)'
                const p4Dark = p4Meta?.isDark ?? false
                const p4Bg = p4Dark ? 'var(--aui-text)' : 'var(--aui-on-dark)'
                const p4Ink = p4Dark ? 'var(--aui-on-dark)' : 'var(--aui-text)'
                const p4Muted = p4Dark ? 'var(--aui-text-muted)' : 'var(--aui-text-muted)'
                const p4Border = p4Dark ? '1px solid var(--aui-on-dark-faint)' : '1px solid var(--aui-border-subtle)'
                return (
                  <div
                    onClick={e => { e.stopPropagation(); setSelectedCard('design-md') }}
                    style={{
                      width: 200, borderRadius: "var(--aui-radius-card)", backgroundColor: p4Bg, border: selectedCard === 'design-md' ? `2px solid ${p4Color}` : p4Border,
                      outline: selectedCard === 'design-md' ? `3px solid ${p4Color}28` : 'none', outlineOffset: 2,
                      overflow: 'hidden', flexShrink: 0, cursor: 'default',
                    }}
                  >
                    {/* 헤더 */}
                    <div style={{ padding: `var(--aui-space-3) var(--aui-space-3)`, borderBottom: p4Border, display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", backgroundColor: p4Dark ? 'var(--aui-inverse-surface)' : 'var(--aui-page)' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={p4Color} strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span style={{ fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-bold)", color: p4Ink, letterSpacing: "var(--aui-tracking-tight)" }}>DESIGN.md</span>
                    </div>
                    <div style={{ padding: `var(--aui-space-3) var(--aui-space-3) var(--aui-space-4)`, display: 'flex', flexDirection: 'column', gap: "var(--aui-space-3)" }}>
                      {/* 디자인 시스템 이름 */}
                      <span style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-bold)", color: p4Ink, letterSpacing: "var(--aui-tracking-tighter)" }}>{designSystemDisplayName}</span>
                      {/* 팔레트 */}
                      <div>
                        <span style={{ fontSize: "var(--aui-type-meta-size)", color: p4Muted, textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wide)", fontWeight: "var(--aui-weight-semibold)" }}>Colors</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: "var(--aui-space-1)", marginTop: 5 }}>
                          {p4Palette.slice(0, 5).map((sw: { name: string; hex: string }) => (
                            <div key={sw.name} title={`${sw.name} ${sw.hex}`} style={{ width: 20, height: 20, borderRadius: "var(--aui-radius-sm)", backgroundColor: sw.hex, border: '1px solid var(--aui-shadow-medium)', flexShrink: 0 }} />
                          ))}
                        </div>
                      </div>
                      {/* 폰트 */}
                      <div>
                        <span style={{ fontSize: "var(--aui-type-meta-size)", color: p4Muted, textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wide)", fontWeight: "var(--aui-weight-semibold)" }}>Typography</span>
                        <p style={{ fontSize: "var(--aui-type-micro-size)", color: p4Ink, margin: `var(--aui-space-1) 0 0`, lineHeight: "var(--aui-leading-normal)", letterSpacing: "var(--aui-tracking-tight)" }}>
                          {p4Fonts.headline !== p4Fonts.body
                            ? <><span style={{ fontWeight: "var(--aui-weight-bold)" }}>{p4Fonts.headline}</span><br/><span style={{ opacity: 0.7 }}>{p4Fonts.body}</span></>
                            : <span style={{ fontWeight: "var(--aui-weight-semibold)" }}>{p4Fonts.headline}</span>
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* ── 시안 A/B/C 썸네일 ── */}
              {mainVariants.some(v => !!v) && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: "var(--aui-space-4)" }}>
                  {(['A', 'B', 'C'] as const).map((letter, idx) => {
                    const variant = mainVariants[idx]
                    const isPicked = pickedVariantIdx === idx
                    const thumbW = platform === 'web' ? 260 : 160
                    const nativeW = platform === 'mobile' ? 390 : 1440
                    const nativeH = platform === 'mobile' ? 844 : 1024
                    const thumbScale = thumbW / nativeW
                    const thumbH = Math.round(nativeH * thumbScale)
                    return (
                      <div key={letter} style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-2)", width: thumbW }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)" }}>
                          <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: isPicked ? 'var(--aui-primary)' : 'var(--aui-text-muted)', letterSpacing: "var(--aui-tracking-tight)" }}>시안 {letter}</span>
                          {isPicked && <span style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-primary)', fontWeight: "var(--aui-weight-bold)", background: 'var(--aui-primary-tint)', padding: `var(--aui-space-1) var(--aui-space-2)`, borderRadius: "var(--aui-radius-sm)" }}>선택됨</span>}
                        </div>
                        <div style={{
                          height: thumbH, borderRadius: "var(--aui-radius-control)", overflow: 'hidden', position: 'relative',
                          border: isPicked ? '2px solid var(--aui-primary)' : '1.5px solid var(--aui-shadow-medium)',
                          outline: isPicked ? '3px solid var(--aui-primary-muted)' : 'none',
                          outlineOffset: 2,
                          background: 'var(--aui-on-dark)',
                        }}>
                          {variant ? (
                            <iframe
                              srcDoc={variant.html}
                              style={{ width: nativeW, height: nativeH, border: 'none', display: 'block', transform: `scale(${thumbScale})`, transformOrigin: 'top left', pointerEvents: 'none' }}
                              sandbox="allow-scripts allow-same-origin"
                              scrolling="no"
                              title={`시안 ${letter}`}
                            />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--aui-border-subtle)', borderTopColor: 'var(--aui-text-assistive)', animation: 'spin 1s linear infinite' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── 구분선 화살표 ── */}
              {mainVariants.some(v => !!v) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: "var(--aui-space-1)", paddingTop: 24, color: 'var(--aui-text-disabled)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                  <span style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-disabled)', letterSpacing: "var(--aui-tracking-tight)", whiteSpace: 'nowrap' }}>프로토타입</span>
                </div>
              )}

              {/* ── 프로토타입 프레임(들) ── */}
              {screens.length > 1 ? (
                screens.map((screen, idx) => {
                  const isFocused = focusedScreenId === screen.id || (idx === 0 && !focusedScreenId)
                  return (
                    <div
                      key={screen.id}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-3)" }}
                      onClick={e => { e.stopPropagation(); setFocusedScreenId(screen.id); setActiveScreenId(screen.id) }}
                    >
                      <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: isFocused ? 'var(--aui-text)' : 'var(--aui-text-muted)', letterSpacing: "var(--aui-tracking-tight)", userSelect: 'none' }}>
                        {screen.label}
                      </span>
                      <div style={{ outline: isFocused ? '2px solid var(--aui-primary)' : '2px solid transparent', outlineOffset: 4, borderRadius: platform === 'mobile' ? 12 : 8, transition: 'outline-color 0.15s' }}>
                        <ResponsiveFrame previewWidth={previewWidth} onWidthChange={setPreviewWidth} zoom={zoom} platform={platform}>
                          <iframe
                            ref={el => {
                              if (el) {
                                screenIframeRefs.current.set(screen.id, el)
                                if (idx === 0) (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el
                              }
                            }}
                            srcDoc={displayHtml}
                            style={{ width: previewWidth, height: platform === 'mobile' ? 844 : 1024, border: 'none', display: 'block' }}
                            sandbox="allow-scripts allow-same-origin"
                            title={screen.label}
                            onLoad={() => {
                              const el = screenIframeRefs.current.get(screen.id)
                              el?.contentWindow?.postMessage({ type: 'aide:navigate', id: screen.id }, '*')
                            }}
                          />
                        </ResponsiveFrame>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-3)" }}>
                  <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text)', letterSpacing: "var(--aui-tracking-tight)", userSelect: 'none' }}>프로토타입</span>
                  <ResponsiveFrame previewWidth={previewWidth} onWidthChange={setPreviewWidth} zoom={zoom} platform={platform}>
                    <iframe
                      ref={iframeRef}
                      srcDoc={displayHtml}
                      style={{ width: previewWidth, height: platform === 'mobile' ? 844 : 1024, border: 'none', display: 'block' }}
                      sandbox="allow-scripts allow-same-origin"
                      title="Generated UI"
                    />
                  </ResponsiveFrame>
                </div>
              )}
            </div>
          </div>

          {/* Right: icon picker panel */}
          {editMode && iconPickerOpen && (
            <IconPickerPanel
              pickedIcon={pickedIcon}
              onPick={(name) => {
                setPickedIcon(name)
                if (syncAllScreens && selectedSharedClasses.length > 0) {
                  const selector = '.aide-screen ' + selectedSharedClasses.map(c => '.' + c).join('')
                  sendToIframe({ type: 'aide:setIcon-all', selector, name })
                } else {
                  sendToIframe({ type: 'aide:setIcon', name })
                }
              }}
              onApply={() => { setIconPickerOpen(false); setPickedIcon(null); setOriginalIconText(null) }}
              onCancel={() => {
                if (originalIconText !== null) sendToIframe({ type: 'aide:setIcon', name: originalIconText })
                setIconPickerOpen(false); setPickedIcon(null); setOriginalIconText(null)
              }}
            />
          )}

          {/* Right: properties panel (edit mode only, hidden when Creon or icon picker is open) */}
          {editMode && !creonOpen && !iconPickerOpen && <PropertiesPanel styles={selectedStyles} onUpdate={handleStyleUpdate}
            sharedClasses={selectedSharedClasses} syncAllScreens={syncAllScreens} onToggleSync={() => setSyncAllScreens(v => !v)}
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
            <div style={{ width: 520, borderLeft: '1px solid var(--aui-shadow-soft)', backgroundColor: 'var(--aui-on-dark)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ padding: `var(--aui-space-2) var(--aui-space-3)`, borderBottom: '1px solid var(--aui-shadow-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text)' }}>Creon Assets</span>
                <button onClick={() => { sendToIframe({ type: 'aide:pulse', on: false }); setCreonOpen(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: "var(--aui-radius-sm)", border: 'none', background: 'none', cursor: 'pointer', color: 'var(--aui-text-muted)' }}>
                  <X size={14} />
                </button>
              </div>
              {creonAsset && (
                <div style={{ padding: `var(--aui-space-2) var(--aui-space-3)`, borderBottom: '1px solid var(--aui-shadow-soft)', backgroundColor: 'var(--aui-page)', flexShrink: 0 }}>
                  <p style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-muted)', marginBottom: 6 }}>선택된 에셋{selectedStyles ? ' — 아래 버튼으로 적용' : ' — Edit 모드에서 요소를 클릭 후 적용'}</p>
                  {/\.(mp4|webm|mov)(\?|$)/i.test(creonAsset) ? (
                    <video src={creonAsset} autoPlay muted loop playsInline style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: "var(--aui-radius-sm)", display: 'block' }} />
                  ) : (
                    <img src={creonAsset} alt="selected asset" style={{ width: '100%', height: 72, objectFit: 'contain', borderRadius: "var(--aui-radius-sm)", display: 'block', background: 'var(--aui-border)' }} />
                  )}
                  {/* 이미지 크기 조절 슬라이더 */}
                  {!/\.(mp4|webm|mov)(\?|$)/i.test(creonAsset) && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: "var(--aui-type-micro-size)", color: 'var(--aui-text-muted)' }}>이미지 크기</span>
                        <span style={{ fontSize: "var(--aui-type-micro-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text)', fontVariantNumeric: 'tabular-nums' }}>{creonImageWidth}%</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={200}
                        value={creonImageWidth}
                        onChange={e => setCreonImageWidth(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--aui-text)' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-assistive)' }}>20%</span>
                        <button onClick={() => setCreonImageWidth(100)} style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>초기화</button>
                        <span style={{ fontSize: "var(--aui-type-meta-size)", color: 'var(--aui-text-assistive)' }}>200%</span>
                      </div>
                    </div>
                  )}
                  {selectedStyles && (() => {
                    const s = selectedStyles
                    const isIcon = ((s.tagName === 'span' || s.tagName === 'i') &&
                      (s.className.includes('material-symbol') || s.className.includes('material-icon'))) ||
                      s.tagName === 'svg'
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-1)", marginTop: 6 }}>
                        {!isIcon && (
                          <button
                            onClick={() => {
                              const isSyncMode = syncAllScreens && selectedSharedClasses.length > 0
                              const selector = isSyncMode ? '.aide-screen ' + selectedSharedClasses.map(c => '.' + c).join('') : ''
                              const widthVal = `${creonImageWidth}%`
                              if (/\.(mp4|webm|mov)(\?|$)/i.test(creonAsset)) {
                                sendToIframe({ type: 'aide:update', prop: 'backgroundImage', value: 'none' })
                                sendToIframe({ type: 'aide:setVideoSrc', url: creonAsset })
                              } else if (isSyncMode) {
                                sendToIframe({ type: 'aide:replaceImage-all', selector, url: creonAsset })
                              } else {
                                sendToIframe({ type: 'aide:replaceImage', url: creonAsset, width: widthVal })
                              }
                              sendToIframe({ type: 'aide:pulse', on: false })
                            }}
                            style={{ width: '100%', padding: `var(--aui-space-1) 0`, fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-on-dark)', backgroundColor: 'var(--aui-text)', border: 'none', borderRadius: "var(--aui-radius-sm)", cursor: 'pointer' }}
                          >
                            선택된 요소에 적용
                          </button>
                        )}
                        {isIcon && (
                          <button
                            onClick={() => {
                              if (syncAllScreens && selectedSharedClasses.length > 0) {
                                const selector = '.aide-screen ' + selectedSharedClasses.map(c => '.' + c).join('')
                                sendToIframe({ type: 'aide:replaceIconWithImg-all', selector, url: creonAsset })
                              } else {
                                sendToIframe({ type: 'aide:replaceIconWithImg', url: creonAsset })
                              }
                              sendToIframe({ type: 'aide:pulse', on: false })
                            }}
                            style={{ width: '100%', padding: `var(--aui-space-1) 0`, fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-on-dark)', backgroundColor: 'var(--aui-text)', border: 'none', borderRadius: "var(--aui-radius-sm)", cursor: 'pointer' }}
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
            onEvent={handleTweakEvent}
          />
        )}

        {figmaExportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--aui-scrim)', backdropFilter: 'blur(6px)' }}>
            <div className="bg-white w-full max-w-md mx-4 overflow-hidden" style={{ borderRadius: "var(--aui-radius-card)", boxShadow: "var(--aui-shadow-floating)", border: `1px solid ${F.hairlineSoft}` }}>
              {figmaExportError ? (
                <div className="flex flex-col items-center gap-5 px-8 py-10">
                  <div className="size-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--aui-negative-soft)', border: '1.5px solid var(--aui-negative-border)' }}>
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[15px] font-semibold text-[var(--aui-text)] mb-1">내보내기 실패</p>
                    <p className="text-[13px] text-[var(--aui-text-muted)] leading-relaxed">{figmaExportError}</p>
                  </div>
                  <button
                    onClick={() => setFigmaExportOpen(false)}
                    className="w-full py-2.5 text-[13px] font-semibold rounded-xl transition-colors"
                    style={{ backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)' }}
                  >
                    닫기
                  </button>
                </div>
              ) : isFigmaExporting ? (
                <div className="flex flex-col items-center gap-5 px-8 py-10">
                  <div className="size-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--aui-primary)10', border: '1.5px solid var(--aui-primary)30' }}>
                    <span className="text-2xl">🎨</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[15px] font-semibold text-[var(--aui-text)] mb-1">Figma 데이터 생성 중...</p>
                    <p className="text-[13px] text-[var(--aui-text-muted)]">code.to.design으로 변환하고 있습니다</p>
                  </div>
                  <div className="w-full h-1 bg-[var(--aui-border-subtle)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--aui-primary)] rounded-full" style={{ width: '60%', animation: 'figma-bar 1.6s ease-in-out infinite' }} />
                  </div>
                  <style>{`@keyframes figma-bar{0%{transform:translateX(-150%)}100%{transform:translateX(300%)}}`}</style>
                </div>
              ) : (
                <div className="flex flex-col gap-0">
                  <div className="flex flex-col items-center gap-4 px-8 pt-8 pb-6">
                    <div className="size-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--aui-positive)10', border: '1.5px solid var(--aui-positive)40' }}>
                      <span className="text-2xl">✅</span>
                    </div>
                    <div className="text-center">
                      <p className="text-[15px] font-semibold text-[var(--aui-text)] mb-1">
                        {figmaClipboardCopied ? 'Figma 붙여넣기 준비 완료!' : 'Figma 데이터 생성 완료'}
                      </p>
                      <p className="text-[13px] text-[var(--aui-text-muted)] leading-relaxed">
                        {figmaClipboardCopied
                          ? '이제 Figma 캔버스에서 Cmd+V로 붙여넣으세요'
                          : '아래 버튼으로 클립보드에 복사한 뒤 Figma에 붙여넣으세요'}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex flex-col gap-3">
                    {[
                      { step: '1', text: 'Figma 데스크톱 앱 열기' },
                      { step: '2', text: figmaClipboardCopied ? '빈 캔버스에서 Cmd+V 붙여넣기' : '아래 버튼으로 Figma 클립보드 복사' },
                      { step: '3', text: '붙여넣어진 editable layer 확인' },
                    ].map(item => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--aui-text)' }}>
                          <span className="text-[11px] font-bold text-white">{item.step}</span>
                        </div>
                        <p className="text-[13px] text-[var(--aui-text-neutral)] leading-snug pt-0.5">{item.text}</p>
                      </div>
                    ))}

                    <div className="mt-1 p-3 rounded-xl text-[12px] text-[var(--aui-text-muted)] leading-relaxed" style={{ backgroundColor: 'var(--aui-page)', border: '1px solid var(--aui-border)' }}>
                      code.to.design API가 HTML/CSS를 Figma paste 데이터로 변환했습니다. 별도 플러그인 설치 없이 Figma 캔버스에 붙여넣으면 됩니다.
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex flex-col gap-2">
                    {!figmaClipboardCopied && figmaClipboardHtml && (
                      <button
                        onClick={async () => setFigmaClipboardCopied(await copyFigmaClipboard(figmaClipboardHtml))}
                        className="w-full py-2.5 text-[13px] font-semibold rounded-xl transition-colors"
                        style={{ backgroundColor: 'var(--aui-primary)', color: 'var(--aui-on-dark)' }}
                      >
                        Figma 클립보드 복사
                      </button>
                    )}
                    <button
                      onClick={() => setFigmaExportOpen(false)}
                      className="w-full py-2.5 text-[13px] font-semibold rounded-xl transition-colors"
                      style={{ backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)' }}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-pretendard)", backgroundColor: F.canvas, color: F.ink }}>
      {isExpandingPrototype && <ExpandingOverlay image={pickedVariantIdx !== null ? (mainVariants[pickedVariantIdx]?.image ?? undefined) : undefined} platform={platform} variantLabel={pickedVariantIdx !== null ? ['시안 A','시안 B','시안 C'][pickedVariantIdx] : undefined} />}

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 px-8 flex items-center" style={{ height: 'var(--aui-toolbar-height)', backgroundColor: F.surface, borderBottom: `1px solid ${F.hairlineSoft}` }}>
        <button onClick={onBack} aria-label="Aide 홈으로 이동" className="transition-colors" style={{ border: 'none', background: 'transparent', padding: 0, textDecoration: 'none' }}>
          <img src="/logo_aide.png" alt="Aide" className="h-14 w-auto object-contain" />
        </button>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── Step 1: Input ── */}
        {step === 1 && (isAnalyzing || startedFromLanding) && (
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
            <div style={{ display: 'flex', gap: "var(--aui-space-10)", alignItems: 'center', maxWidth: 780, width: '100%' }}>

              {/* Wireframe animation */}
              <div key={wfAnimKey} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: "var(--aui-space-5)" }}>
                {platform === 'web' ? (
                  <svg width="260" height="180" viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Browser shell */}
                    <rect className="wf-phone" x="4" y="4" width="252" height="172" rx="10" stroke="var(--aui-text)" strokeWidth="2.5" />
                    {/* Browser top bar */}
                    <line className="wf-web-hdr" x1="4" y1="28" x2="256" y2="28" stroke="var(--aui-border)" strokeWidth="1.2" />
                    {/* Traffic lights */}
                    <circle className="wf-web-hdr" cx="18" cy="16" r="4" stroke="var(--aui-border)" strokeWidth="1.2" />
                    <circle className="wf-web-hdr" cx="30" cy="16" r="4" stroke="var(--aui-border)" strokeWidth="1.2" />
                    <circle className="wf-web-hdr" cx="42" cy="16" r="4" stroke="var(--aui-border)" strokeWidth="1.2" />
                    {/* URL bar */}
                    <rect className="wf-web-hdr" x="70" y="10" width="120" height="12" rx="6" stroke="var(--aui-border)" strokeWidth="1.2" />
                    {/* Nav bar */}
                    <rect className="wf-web-hero" x="12" y="34" width="236" height="22" rx="4" stroke="var(--aui-text-disabled)" strokeWidth="1.4" />
                    <rect className="wf-web-hero" x="18" y="39" width="40" height="12" rx="2" stroke="var(--aui-text-assistive)" strokeWidth="1.2" />
                    <line className="wf-web-hero" x1="160" y1="39" x2="190" y2="39" stroke="var(--aui-border)" strokeWidth="1.2" />
                    <line className="wf-web-hero" x1="196" y1="39" x2="218" y2="39" stroke="var(--aui-border)" strokeWidth="1.2" />
                    <rect className="wf-web-hero" x="224" y="38" width="18" height="14" rx="3" stroke="var(--aui-text-assistive)" strokeWidth="1.2" />
                    {/* Hero banner */}
                    <rect className="wf-web-c1" x="12" y="62" width="236" height="46" rx="6" stroke="var(--aui-text-assistive)" strokeWidth="1.6" />
                    <line className="wf-web-c1" x1="22" y1="76" x2="100" y2="76" stroke="var(--aui-text-disabled)" strokeWidth="1.3" />
                    <line className="wf-web-c1" x1="22" y1="86" x2="76" y2="86" stroke="var(--aui-border)" strokeWidth="1.2" />
                    <rect className="wf-web-c1" x="192" y="72" width="48" height="20" rx="4" stroke="var(--aui-text-assistive)" strokeWidth="1.3" />
                    {/* Three content cards */}
                    <rect className="wf-web-c2" x="12" y="116" width="72" height="48" rx="5" stroke="var(--aui-text-assistive)" strokeWidth="1.4" />
                    <line className="wf-web-c2" x1="18" y1="130" x2="66" y2="130" stroke="var(--aui-text-disabled)" strokeWidth="1.2" />
                    <line className="wf-web-c2" x1="18" y1="140" x2="50" y2="140" stroke="var(--aui-border)" strokeWidth="1.1" />
                    <rect className="wf-web-c2" x="94" y="116" width="72" height="48" rx="5" stroke="var(--aui-text-assistive)" strokeWidth="1.4" />
                    <line className="wf-web-c2" x1="100" y1="130" x2="148" y2="130" stroke="var(--aui-text-disabled)" strokeWidth="1.2" />
                    <line className="wf-web-c2" x1="100" y1="140" x2="132" y2="140" stroke="var(--aui-border)" strokeWidth="1.1" />
                    <rect className="wf-web-l1" x="176" y="116" width="72" height="48" rx="5" stroke="var(--aui-text-assistive)" strokeWidth="1.4" />
                    <line className="wf-web-l1" x1="182" y1="130" x2="230" y2="130" stroke="var(--aui-text-disabled)" strokeWidth="1.2" />
                    <line className="wf-web-l1" x1="182" y1="140" x2="214" y2="140" stroke="var(--aui-border)" strokeWidth="1.1" />
                    {/* Footer */}
                    <line className="wf-web-l2" x1="4" y1="166" x2="256" y2="166" stroke="var(--aui-border)" strokeWidth="1" />
                    <line className="wf-web-bar" x1="90" y1="171" x2="170" y2="171" stroke="var(--aui-border)" strokeWidth="1.2" />
                  </svg>
                ) : (
                  <svg width="148" height="268" viewBox="0 0 148 268" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Phone shell */}
                    <rect className="wf-phone" x="4" y="4" width="140" height="260" rx="20" stroke="var(--aui-text)" strokeWidth="2.5" />
                    {/* Notch */}
                    <rect className="wf-hdr" x="50" y="4" width="48" height="10" rx="5" stroke="var(--aui-text-disabled)" strokeWidth="1.5" />
                    {/* Status bar dots */}
                    <rect className="wf-hdr" x="16" y="22" width="32" height="4" rx="2" stroke="var(--aui-border)" strokeWidth="1.2" />
                    <rect className="wf-hdr" x="100" y="22" width="28" height="4" rx="2" stroke="var(--aui-border)" strokeWidth="1.2" />
                    {/* Hero card */}
                    <rect className="wf-hero" x="16" y="38" width="116" height="68" rx="10" stroke="var(--aui-text-assistive)" strokeWidth="1.8" />
                    <line className="wf-hero" x1="28" y1="56" x2="90" y2="56" stroke="var(--aui-text-disabled)" strokeWidth="1.4" />
                    <line className="wf-hero" x1="28" y1="68" x2="72" y2="68" stroke="var(--aui-border)" strokeWidth="1.2" />
                    <rect className="wf-hero" x="28" y="80" width="48" height="14" rx="4" stroke="var(--aui-text-assistive)" strokeWidth="1.4" />
                    {/* Two stat cards */}
                    <rect className="wf-c1" x="16" y="118" width="52" height="52" rx="8" stroke="var(--aui-text-assistive)" strokeWidth="1.6" />
                    <line className="wf-c1" x1="26" y1="134" x2="58" y2="134" stroke="var(--aui-text-disabled)" strokeWidth="1.2" />
                    <line className="wf-c1" x1="26" y1="144" x2="46" y2="144" stroke="var(--aui-border)" strokeWidth="1.2" />
                    <rect className="wf-c2" x="80" y="118" width="52" height="52" rx="8" stroke="var(--aui-text-assistive)" strokeWidth="1.6" />
                    <line className="wf-c2" x1="90" y1="134" x2="122" y2="134" stroke="var(--aui-text-disabled)" strokeWidth="1.2" />
                    <line className="wf-c2" x1="90" y1="144" x2="110" y2="144" stroke="var(--aui-border)" strokeWidth="1.2" />
                    {/* List item lines */}
                    <line className="wf-l1" x1="16" y1="184" x2="132" y2="184" stroke="var(--aui-border)" strokeWidth="1.3" />
                    <line className="wf-l2" x1="16" y1="198" x2="100" y2="198" stroke="var(--aui-border)" strokeWidth="1.2" />
                    {/* Progress bar */}
                    <rect className="wf-bar" x="16" y="214" width="116" height="7" rx="3.5" fill="var(--aui-border)" />
                    <rect className="wf-bar" x="16" y="214" width="70" height="7" rx="3.5" fill="var(--aui-text)" />
                    {/* Tab divider */}
                    <line className="wf-tab" x1="4" y1="234" x2="144" y2="234" stroke="var(--aui-border)" strokeWidth="1" />
                    {/* Tab icons */}
                    <rect className="wf-tab" x="22" y="242" width="20" height="18" rx="3" fill="var(--aui-border)" />
                    <rect className="wf-tab" x="64" y="242" width="20" height="18" rx="3" fill="var(--aui-text)" />
                    <rect className="wf-tab" x="106" y="242" width="20" height="18" rx="3" fill="var(--aui-border)" />
                  </svg>
                )}
                {/* Animated dots */}
                <div style={{ display: 'flex', gap: "var(--aui-space-2)", alignItems: 'center' }}>
                  <div className="wf-dot1" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--aui-text-disabled)' }} />
                  <div className="wf-dot2" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--aui-text-disabled)' }} />
                  <div className="wf-dot3" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--aui-text-disabled)' }} />
                </div>
              </div>

              {/* Right: info + steps */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: "var(--aui-space-6)" }}>
                <div>
                  <h2 style={{ fontSize: "var(--aui-type-page-title-size)", fontWeight: "var(--aui-weight-bold)", letterSpacing: "var(--aui-tracking-tighter)", color: 'var(--aui-text)', marginBottom: 6 }}>
                    {analyzeError ? '질문지 생성에 실패했습니다' : '정확한 시안을 위해 분석 중입니다'}
                  </h2>
                  <p style={{ fontSize: "var(--aui-type-label-size)", color: 'var(--aui-text-muted)', lineHeight: "var(--aui-leading-relaxed)" }}>
                    {analyzeError ? '입력 내용은 유지되어 있어요. 다시 시도하거나 세부 내용을 수정할 수 있습니다.' : '선택하신 내용을 바탕으로 맞춤형 질문지를 만들고 있어요'}
                  </p>
                </div>

                {/* Logo + Design system row */}
                {(logoDataUrl || !!effectiveDesignMd) && (
                  <div style={{ display: 'flex', gap: "var(--aui-space-3)" }}>
                    {logoDataUrl && (
                      <div style={{ padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)", backgroundColor: 'var(--aui-page)', border: '1px solid var(--aui-border)', display: 'flex', flexDirection: 'column', gap: "var(--aui-space-2)", minWidth: 80 }}>
                        <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)" }}>Logo</p>
                        <img src={logoDataUrl} alt="logo" style={{ height: 28, maxWidth: 72, objectFit: 'contain', borderRadius: "var(--aui-radius-sm)" }} />
                      </div>
                    )}
                    {!!effectiveDesignMd && (
                      <div style={{ flex: 1, padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)", backgroundColor: 'var(--aui-page)', border: '1px solid var(--aui-border)' }}>
                        <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 8 }}>Design System</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", flexWrap: 'wrap' }}>
                          <div style={{ width: 12, height: 12, borderRadius: "var(--aui-radius-sm)", backgroundColor: customDesignMd ? 'var(--aui-primary)' : (visualizedDesignPreset.color ?? 'var(--aui-text-muted)'), flexShrink: 0 }} />
                          <span style={{ fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text)' }}>{designSystemDisplayName}</span>
                          <span style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-text-muted)' }}>{designSystemDescription}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Brief preview */}
                <div style={{ padding: `var(--aui-space-4) var(--aui-space-5)`, borderRadius: "var(--aui-radius-control)", backgroundColor: 'var(--aui-page)', border: '1px solid var(--aui-border)' }}>
                  <p style={{ fontSize: "var(--aui-type-meta-size)", fontWeight: "var(--aui-weight-bold)", color: 'var(--aui-text-assistive)', textTransform: 'uppercase', letterSpacing: "var(--aui-tracking-wider)", marginBottom: 8 }}>기획서</p>
                  <p style={{ fontSize: "var(--aui-type-compact-size)", color: 'var(--aui-text-neutral)', lineHeight: "var(--aui-leading-relaxed)", maxHeight: 72, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>{brief}</p>
                </div>

                {/* Step indicators */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-3)" }}>
                  {[
                    { label: '요청사항 파악 완료', done: true },
                    ...(logoDataUrl ? [{ label: '브랜드 로고 인식 완료', done: true }] : []),
                    ...(effectiveDesignMd ? [{ label: `${designSystemDisplayName} 가이드라인 적용 완료`, done: true }] : []),
                    { label: analyzeError ? '질문지 생성 실패' : '맞춤형 질문지 생성 중...', done: false, active: !analyzeError },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-3)" }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: item.done ? 'var(--aui-text)' : 'var(--aui-border-subtle)', border: item.active ? '1.5px solid var(--aui-border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {item.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="2,5.5 4,7.5 8,3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        {item.active && <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--aui-text-assistive)', borderTopColor: 'var(--aui-text)', animation: 'wf-spin 0.75s linear infinite' }} />}
                      </div>
                      <span style={{ fontSize: "var(--aui-type-compact-size)", color: item.done ? 'var(--aui-text)' : 'var(--aui-text-muted)', fontWeight: item.active ? 500 : 400, letterSpacing: "var(--aui-tracking-tight)" }}>{item.label}</span>
                    </div>
                  ))}
                </div>

                {analyzeError && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: "var(--aui-space-3)" }}>
                    <div style={{ padding: `var(--aui-space-3) var(--aui-space-4)`, borderRadius: "var(--aui-radius-control)", backgroundColor: 'var(--aui-negative-soft)', border: '1px solid var(--aui-negative-border)', color: F.primary, fontSize: "var(--aui-type-compact-size)", lineHeight: "var(--aui-leading-relaxed)" }}>
                      {analyzeError}
                    </div>
                    <div style={{ display: 'flex', gap: "var(--aui-space-2)" }}>
                      <button
                        onClick={handleAnalyze}
                        disabled={!brief.trim() || isAnalyzing}
                        style={{ height: 38, padding: `0 var(--aui-space-4)`, borderRadius: "var(--aui-radius-sm)", border: 'none', backgroundColor: F.ink, color: 'var(--aui-on-dark)', fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-semibold)", cursor: 'pointer' }}
                      >
                        다시 시도
                      </button>
                      <button
                        onClick={() => { setStartedFromLanding(false); setAnalyzeError('') }}
                        style={{ height: 38, padding: `0 var(--aui-space-4)`, borderRadius: "var(--aui-radius-sm)", border: `1px solid ${F.hairline}`, backgroundColor: F.canvas, color: F.ink, fontSize: "var(--aui-type-compact-size)", fontWeight: "var(--aui-weight-medium)", cursor: 'pointer' }}
                      >
                        입력 내용 수정
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 1 && !isAnalyzing && !startedFromLanding && (
          <div className="max-w-5xl mx-auto w-full px-8 py-12">
            <div className="mb-10">
              <h1 className="text-[28px] font-bold mb-2" style={{ letterSpacing: "var(--aui-tracking-tighter)", color: F.ink }}>UI 시안 만들기</h1>
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
                            borderRadius: "var(--aui-radius-sm)",
                            borderColor: isActive ? F.primary : F.hairline,
                            backgroundColor: isActive ? 'var(--aui-primary-soft)' : F.surface,
                            outline: 'none',
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: preset.color }}
                            />
                            <span className="text-[13px] font-semibold" style={{ color: isActive ? F.primary : F.ink }}>{preset.label}</span>
                            {isActive && (
                              <span className="ml-auto text-[11px] font-600 px-2 py-0.5" style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: F.primary, color: 'var(--aui-on-dark)' }}>
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
                    {`${designSystemDisplayName} 가이드라인을 적용합니다`}
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
                    <div className="flex items-center justify-center gap-2 px-4 py-6 border border-dashed bg-white" style={{ borderRadius: "var(--aui-radius-control)", borderColor: F.hairline }}>
                      <div className="size-4 rounded-full animate-spin" style={{ border: `2px solid ${F.hairline}`, borderTopColor: F.ink }} />
                      <span className="text-[13px]" style={{ color: F.inkMuted }}>처리 중...</span>
                    </div>
                  ) : logoDataUrl ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-white border" style={{ borderRadius: "var(--aui-radius-control)", borderColor: F.hairlineSoft }}>
                      <img src={logoDataUrl} alt="logo" className="h-8 object-contain" />
                      <span className="flex-1 text-[13px]" style={{ color: F.inkMuted }}>로고가 UI에 자동으로 삽입됩니다</span>
                      <button
                        onClick={() => { setLogoDataUrl(null); setBrandColors([]); setExtractedColors([]) }}
                        className="transition-colors"
                        style={{ color: F.inkMuted }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-6 border border-dashed transition-colors text-center hover:!bg-[var(--aui-surface)]"
                      style={{ borderRadius: "var(--aui-radius-control)", borderColor: F.hairline, backgroundColor: F.canvas }}
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
                    서비스 정보 <span className="ml-2 text-[13px] font-normal" style={{ color: F.primary }}>필수</span>
                  </label>
                  <span className="text-[13px]" style={{ color: F.inkMuted }}>{brief.length} / 2000</span>
                </div>
                {(designPreset !== 'none' || !!customDesignMd) && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px]" style={{ backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`, color: F.ink }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span>{customDesignMdName ?? designPreset}.md</span>
                      <button onClick={() => { setDesignPreset('none'); setCustomDesignMd(null) }} className="flex items-center" style={{ color: F.inkMuted }}>
                        <X size={11} />
                      </button>
                    </div>
                    <span className="text-[12px]" style={{ color: F.inkMuted }}>이 design.md 파일의 디자인 시스템 사용</span>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {/* 서비스 설명 */}
                  <div
                    className="flex flex-col"
                    style={{ borderRadius: "var(--aui-radius-control)", border: `1px solid ${F.hairlineSoft}`, backgroundColor: F.canvas }}
                    onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = F.hairline }}
                    onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = F.hairlineSoft }}
                  >
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                      <span className="text-[12px] font-semibold" style={{ color: F.primary }}>ㅇ</span>
                      <span className="text-[13px] font-semibold" style={{ color: F.ink }}>서비스 설명</span>
                    </div>
                    <textarea
                      value={briefDesc}
                      onChange={e => setBriefDesc(e.target.value)}
                      placeholder="어떤 서비스인지, 무엇을 해결하는지 2-3문장으로 적어주세요.&#10;예) 반려식물을 키우는 사람들이 물주기·일조량·영양 상태를 기록하고 AI가 식물 상태를 진단해주는 앱"
                      className="px-4 pb-4 pt-1 text-sm resize-none leading-relaxed bg-transparent outline-none min-h-[100px]"
                      style={{ color: F.ink }}
                    />
                  </div>
                  {/* 핵심 기능 */}
                  <div
                    className="flex flex-col"
                    style={{ borderRadius: "var(--aui-radius-control)", border: `1px solid ${F.hairlineSoft}`, backgroundColor: F.canvas }}
                    onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = F.hairline }}
                    onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = F.hairlineSoft }}
                  >
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                      <span className="text-[12px] font-semibold" style={{ color: F.primary }}>ㅇ</span>
                      <span className="text-[13px] font-semibold" style={{ color: F.ink }}>핵심 기능</span>
                    </div>
                    <textarea
                      value={briefFeatures}
                      onChange={e => setBriefFeatures(e.target.value)}
                      placeholder="주요 기능을 줄바꿈으로 나열해주세요. 구체적일수록 생성 품질이 올라가요.&#10;예) - 식물 상태 기록 (물주기, 햇빛, 온도)&#10;- AI 진단 및 케어 추천&#10;- 성장 일지 및 사진 기록&#10;- 스토어 (식물·용품 구매)"
                      className="px-4 pb-4 pt-1 text-sm resize-none leading-relaxed bg-transparent outline-none min-h-[140px]"
                      style={{ color: F.ink }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {analyzeError && (
              <div className="mb-4 px-4 py-3 text-sm" style={{ borderRadius: "var(--aui-radius-control)", color: F.primary, backgroundColor: 'var(--aui-negative-soft)', border: `1px solid var(--aui-negative-border)` }}>
                {analyzeError}
              </div>
            )}

            <PrimaryButton onClick={handleAnalyze} disabled={!brief.trim() || isAnalyzing} loading={isAnalyzing} loadingText="AI가 기획서를 분석하고 있습니다...">
              <Sparkles size={16} /> 분석하고 질문지 생성하기
            </PrimaryButton>
          </div>
        )}

        {/* ── Step 2: AI Criteria Review ── */}
        {step === 2 && questionnaire && (
          <div className="max-w-3xl mx-auto w-full px-8 py-12">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-[22px] font-bold mb-1" style={{ letterSpacing: "var(--aui-tracking-tighter)" }}>이 기준으로 만들게요</h1>
                <p className="text-[14px] text-[var(--aui-text-muted)]">{questionnaire.projectSummary}</p>
              </div>
              <button onClick={() => { clearGeneratedBoard(); setStartedFromLanding(false); setStep(1) }} className="flex items-center gap-1.5 text-sm text-[var(--aui-text-muted)] hover:text-[var(--aui-text)] transition-colors mt-1">
                <ArrowLeft size={14} /> 뒤로
              </button>
            </div>

            <div className="mb-8 flex items-center justify-between gap-4 px-4 py-3" style={{ borderRadius: "var(--aui-radius-control)", backgroundColor: 'var(--aui-on-dark)', border: '1px solid var(--aui-border-subtle)' }}>
              <div>
                <div className="text-[13px] font-semibold text-[var(--aui-text)]">
                  AI 추천값을 미리 선택해뒀어요
                </div>
                <div className="text-[12px] text-[var(--aui-text-muted)] mt-0.5">
                  필요하면 아래 버튼만 바꾸고 바로 시안을 생성하면 됩니다.
                </div>
              </div>
              <div className="shrink-0 text-[12px] font-semibold px-3 py-2" style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-surface-muted)', color: 'var(--aui-text)', border: '1px solid var(--aui-border-subtle)' }}>
                {platform === 'web' ? '웹 프리뷰' : '모바일 프리뷰'}
              </div>
            </div>

            {/* Logo Upload + Color Picker */}
            <div className="mb-8">
              <input
                type="file"
                id="logo-upload-step2"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              {logoLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-4 border border-dashed bg-white" style={{ borderRadius: "var(--aui-radius-control)", borderColor: F.hairline }}>
                  <div className="size-4 rounded-full animate-spin" style={{ border: `2px solid ${F.hairline}`, borderTopColor: F.ink }} />
                  <span className="text-[13px]" style={{ color: F.inkMuted }}>처리 중...</span>
                </div>
              ) : !logoDataUrl || logoDataUrl === DEFAULT_AIDE_LOGO_SRC ? (
                <label htmlFor="logo-upload-step2" className="flex items-center gap-3 px-4 py-4 border border-dashed cursor-pointer" style={{ borderRadius: "var(--aui-radius-control)", borderColor: F.hairline, backgroundColor: F.canvas }}>
                  <Upload size={18} style={{ color: F.inkSubtle }} />
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: F.ink }}>로고 업로드 <span className="font-normal ml-1" style={{ color: F.inkMuted }}>선택사항</span></div>
                    <div className="text-[12px] mt-0.5" style={{ color: F.inkSubtle }}>로고에서 브랜드 컬러를 추출할 수 있어요 · PNG · SVG · JPG</div>
                  </div>
                </label>
              ) : (
                <div className="border bg-white" style={{ borderRadius: "var(--aui-radius-control)", borderColor: F.hairlineSoft }}>
                  {/* Logo row */}
                  <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: extractedColors.length > 0 ? `1px solid ${F.hairlineSoft}` : 'none' }}>
                    <img src={logoDataUrl} alt="logo" className="h-8 object-contain" />
                    <span className="flex-1 text-[13px]" style={{ color: F.inkMuted }}>로고가 UI에 자동으로 삽입됩니다</span>
                    <button
                      onClick={handleExtractColors}
                      className="text-[12px] font-semibold px-3 py-1.5 transition-opacity"
                      style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: F.ink, color: 'var(--aui-on-dark)' }}
                    >
                      색상 추출하기
                    </button>
                    <button onClick={() => { setLogoDataUrl(null); setBrandColors([]); setExtractedColors([]) }} className="transition-colors ml-1" style={{ color: F.inkMuted }}>
                      <X size={14} />
                    </button>
                  </div>

                  {/* Extracted palette */}
                  {extractedColors.length > 0 && (
                    <div className="px-4 py-3">
                      <div className="text-[12px] mb-3" style={{ color: F.inkMuted }}>클릭해서 선택 — 첫 클릭: 프라이머리, 두 번째 클릭: 서브컬러</div>
                      <div className="flex items-end gap-3 flex-wrap">
                        {extractedColors.map(color => {
                          const isPrimary = brandColors[0] === color
                          const isSub = brandColors[1] === color
                          return (
                            <button
                              key={color}
                              onClick={() => handleSwatchClick(color)}
                              className="flex flex-col items-center gap-1"
                              title={color}
                            >
                              <div
                                className="w-9 h-9 rounded-full"
                                style={{
                                  backgroundColor: color,
                                  outline: isPrimary ? `3px solid ${F.ink}` : isSub ? `3px solid ${color}` : `2px solid ${F.hairline}`,
                                  outlineOffset: '2px',
                                  transform: (isPrimary || isSub) ? 'scale(1.15)' : 'scale(1)',
                                  transition: 'transform 0.1s, outline 0.1s',
                                }}
                              />
                              <span className="text-[10px] font-semibold" style={{ color: isPrimary ? F.ink : isSub ? color : 'transparent' }}>
                                {isPrimary ? '주' : isSub ? '서브' : '-'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Brand Colors — always visible */}
            <div className="mb-8">
              <div className="text-[13px] font-medium mb-2.5" style={{ color: F.ink }}>
                브랜드 컬러 <span className="font-normal ml-1" style={{ color: F.inkMuted }}>선택사항</span>
              </div>
              <div className="space-y-2">
                {([
                  { label: '프라이머리', idx: 0, fallback: DEFAULT_GENERATED_BRAND_COLOR, hint: '클릭해서 색상 선택' },
                  { label: '서브컬러',   idx: 1, fallback: 'var(--aui-inverse-surface)', hint: brandColors[0] ? '클릭해서 색상 선택' : '프라이머리 먼저 선택' },
                ] as const).map(({ label, idx, fallback, hint }) => {
                  const color = brandColors[idx] ?? null
                  const disabled = idx === 1 && !brandColors[0]
                  return (
                    <div key={label} className="flex items-center gap-3 px-3 py-2.5 border bg-white" style={{ borderRadius: "var(--aui-radius-control)", borderColor: F.hairlineSoft, opacity: disabled ? 0.45 : 1 }}>
                      <span className="text-[12px] w-[60px] shrink-0" style={{ color: F.inkMuted }}>{label}</span>
                      <label className={`relative shrink-0${disabled ? ' pointer-events-none' : ' cursor-pointer'}`}>
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: color ?? 'var(--aui-surface-muted)', borderColor: F.hairline }} />
                        {!disabled && (
                          <input
                            type="color"
                            value={color ?? fallback}
                            onChange={e => {
                              const v = e.target.value
                              setBrandColors(prev =>
                                idx === 0
                                  ? [v, ...(prev[1] ? [prev[1]] : [])]
                                  : prev[0] ? [prev[0], v] : []
                              )
                            }}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          />
                        )}
                      </label>
                      {color
                        ? <span className="text-[12px] font-mono flex-1" style={{ color: F.ink }}>{color}</span>
                        : <span className="text-[12px] flex-1" style={{ color: F.inkSubtle }}>{hint}</span>
                      }
                      {color && (
                        <button
                          onClick={() => setBrandColors(prev =>
                            idx === 0
                              ? (prev[1] ? [prev[1]] : [])
                              : (prev[0] ? [prev[0]] : [])
                          )}
                          style={{ color: F.inkMuted }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-8 mb-10">
              {questionnaire.questions
                .filter(q => q.id === 'platform_intent' || q.id === 'hero_3d')
                .map((q, idx) => (
                  <QuestionCard key={q.id} index={idx + 1} question={q} answer={answers[q.id]} onAnswer={(value) => handleAnswer(q.id, value, q.type)} />
                ))}
            </div>

            {generateError && (
              <div className="mb-4 px-4 py-3 text-sm text-[var(--aui-negative)]" style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-negative-soft)', border: '1px solid var(--aui-negative-border)' }}>
                {generateError}
              </div>
            )}

            <PrimaryButton onClick={() => { setGenerateError(''); setStep(3); setTimeout(() => handleGenerate(), 50) }} disabled={false} loading={false} loadingText="">
              바로 시안 생성하기 →
            </PrimaryButton>
          </div>
        )}

      </main>
    </div>
  )
}

function ResponsiveFrame({
  previewWidth,
  onWidthChange,
  zoom,
  platform,
  children,
}: {
  previewWidth: number
  onWidthChange: (w: number) => void
  zoom: number
  platform: 'mobile' | 'web'
  children: React.ReactNode
}) {
  const scale = zoom / 100
  const frameH = platform === 'mobile' ? 844 : 1024
  const scaledW = Math.round(previewWidth * scale)
  const scaledH = Math.round(frameH * scale)

  const getBreakpoint = (w: number) => {
    if (w < 480) return { label: 'Mobile', color: 'var(--aui-positive)' }
    if (w < 1024) return { label: 'Tablet', color: 'var(--aui-caution)' }
    return { label: 'Desktop', color: 'var(--aui-primary)' }
  }
  const bp = getBreakpoint(previewWidth)

  const dragRef = useRef<{ startX: number; startW: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const snapToZone = (w: number) => (w < 480 ? 390 : w < 1024 ? 768 : 1440)

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragRef.current = { startX: e.clientX, startW: previewWidth }
    let latestW = previewWidth
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = (ev.clientX - dragRef.current.startX) / scale
      const newW = Math.max(320, Math.min(1920, Math.round(dragRef.current.startW + delta)))
      latestW = newW
      onWidthChange(newW)
    }
    const onUp = () => {
      dragRef.current = null
      setIsDragging(false)
      onWidthChange(snapToZone(latestW))
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      {/* 브레이크포인트 인디케이터 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: "var(--aui-space-2)", marginBottom: 10, paddingLeft: 2 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: bp.color, flexShrink: 0 }} />
        <span style={{ fontSize: "var(--aui-type-caption-size)", fontWeight: "var(--aui-weight-semibold)", color: 'var(--aui-text-neutral)' }}>{bp.label}</span>
        <span style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-text-muted)' }}>{previewWidth}px</span>
      </div>

      {/* 프레임 + 드래그 핸들 */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {/* 프레임 셸 */}
        <div
          style={{
            width: scaledW,
            flexShrink: 0,
            borderRadius: "var(--aui-radius-control)",
            overflow: 'hidden',
            border: '0.5px solid var(--aui-shadow-medium)',
            boxShadow: "var(--aui-shadow-raised)",
            background: 'var(--aui-on-dark)',
          }}
        >
          {/* 콘텐츠 클립 영역 */}
          <div style={{ width: scaledW, height: scaledH, overflow: 'hidden', position: 'relative' }}>
            {isDragging && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'ew-resize' }} />
            )}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: previewWidth,
                height: frameH,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              {children}
            </div>
          </div>
        </div>

        {/* 오른쪽 드래그 핸들 */}
        <div
          onMouseDown={handleDragStart}
          title="드래그하여 너비 조절"
          style={{
            width: 20,
            height: scaledH,
            cursor: 'ew-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ width: 4, height: 40, background: 'var(--aui-shadow-medium)', borderRadius: "var(--aui-radius-sm)" }} />
        </div>
      </div>
    </div>
  )
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function PropertiesPanel({ styles, onUpdate, onCreonReplace, onIconChange, sharedClasses, syncAllScreens, onToggleSync }: { styles: ElementStyles | null; onUpdate: (prop: string, val: string) => void; onCreonReplace?: () => void; onIconChange?: () => void; sharedClasses?: string[]; syncAllScreens?: boolean; onToggleSync?: () => void }) {
  if (!styles) {
    return (
      <div className="w-72 shrink-0 border-l border-[var(--aui-shadow-soft)] bg-white flex flex-col items-center justify-center text-center p-8">
        <div className="size-12 bg-[var(--aui-border)] rounded-full flex items-center justify-center mb-4" style={{ border: '1px solid var(--aui-shadow-line)' }}>
          <SlidersHorizontal size={20} className="text-[var(--aui-text-muted)]" />
        </div>
        <p className="text-[13px] text-[var(--aui-text-muted)] leading-[1.6]">요소를 클릭하면<br />스타일을 확인하고<br />수정할 수 있습니다</p>
      </div>
    )
  }

  const color = rgbToHex(styles.color)
  const bg = rgbToHex(styles.backgroundColor)
  const isShared = sharedClasses && sharedClasses.length > 0

  return (
    <div className="w-72 shrink-0 border-l border-[var(--aui-shadow-soft)] bg-white flex flex-col text-[13px]">
      <div className="flex-1 overflow-y-auto">
      {/* Element label */}
      <div className="px-4 py-3 border-b border-[var(--aui-shadow-line)] flex items-center gap-2">
        <span className="text-[13px] font-mono bg-[var(--aui-border-subtle)] text-[var(--aui-text-muted)] px-1.5 py-0.5 rounded">&lt;{styles.tagName}&gt;</span>
        {styles.text && <span className="text-[var(--aui-text-muted)] truncate">{styles.text}</span>}
      </div>

      {/* Shared component sync toggle */}
      {isShared && (
        <div
          className="px-4 py-2.5 border-b border-[var(--aui-shadow-line)] flex items-center justify-between cursor-pointer"
          style={{ backgroundColor: syncAllScreens ? 'var(--aui-primary-tint)' : 'var(--aui-page)' }}
          onClick={onToggleSync}
        >
          <div className="flex items-center gap-2">
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--aui-primary)', flexShrink: 0 }} />
            <span style={{ fontSize: "var(--aui-type-caption-size)", color: 'var(--aui-text-neutral)', fontWeight: "var(--aui-weight-medium)" }}>공통 컴포넌트 — 모든 화면 동기화</span>
          </div>
          <div
            style={{
              width: 32, height: 18, borderRadius: "var(--aui-radius-sm)", flexShrink: 0,
              backgroundColor: syncAllScreens ? 'var(--aui-primary)' : 'var(--aui-text-disabled)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: syncAllScreens ? 16 : 2,
              width: 14, height: 14, borderRadius: '50%', backgroundColor: 'var(--aui-on-dark)',
              transition: 'left 0.2s', boxShadow: "var(--aui-shadow-subtle)",
            }} />
          </div>
        </div>
      )}

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
        <div className="px-3 py-3 border-t border-[var(--aui-shadow-line)] flex flex-col gap-2 shrink-0">
          {onCreonReplace && (
            <button
              onClick={onCreonReplace}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold"
              style={{ backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)', border: 'none', cursor: 'pointer' }}
            >
              <ImageIcon size={13} />
              Creon에서 변경
            </button>
          )}
          {onIconChange && (
            <button
              onClick={onIconChange}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold"
              style={{ backgroundColor: 'var(--aui-border-subtle)', color: 'var(--aui-text)', border: '1px solid var(--aui-shadow-soft)', cursor: 'pointer' }}
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
      className="fixed right-4 top-[60px] bottom-4 z-30 flex flex-col overflow-hidden bg-white w-72"
      style={{ borderRadius: "var(--aui-radius-card)", boxShadow: "var(--aui-shadow-floating)", border: `1px solid ${F.hairlineSoft}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--aui-shadow-line)] shrink-0">
        <span className="text-[14px] font-semibold text-[var(--aui-text)]">아이콘 변경</span>
        <button onClick={onCancel} className="text-[var(--aui-text-muted)] hover:text-[var(--aui-text)] transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[var(--aui-shadow-line)] shrink-0">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="아이콘 검색..."
          className="w-full bg-[var(--aui-border-subtle)] text-[13px] text-[var(--aui-text)] placeholder:text-[var(--aui-text-muted)] px-3 py-1.5 outline-none"
          style={{ borderRadius: "var(--aui-radius-sm)", border: '1px solid var(--aui-shadow-soft)' }}
        />
      </div>

      {/* Current pick preview */}
      {pickedIcon && (
        <div className="px-4 py-2 border-b border-[var(--aui-shadow-line)] flex items-center gap-2 bg-[var(--aui-page)] shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: "var(--aui-icon-lg)", color: 'var(--aui-primary)' }}>{pickedIcon}</span>
          <span className="text-[13px] text-[var(--aui-primary)] font-medium">{pickedIcon}</span>
        </div>
      )}

      {/* Icon grid */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-[var(--aui-text-muted)]">
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
                ? { backgroundColor: 'var(--aui-primary)15', outline: '1.5px solid var(--aui-primary)' }
                : { backgroundColor: 'transparent' }
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: "var(--aui-icon-md)", color: pickedIcon === name ? 'var(--aui-primary)' : 'var(--aui-text-neutral)' }}>{name}</span>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-[13px] text-[var(--aui-text-muted)] py-8">검색 결과 없음</p>
        )}
      </div>

      {/* Apply / Cancel */}
      <div className="px-3 py-3 border-t border-[var(--aui-shadow-line)] flex gap-2 shrink-0">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-[13px] font-medium border transition-all"
          style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-border-subtle)', borderColor: 'var(--aui-shadow-soft)', color: 'var(--aui-text-muted)' }}
        >
          취소
        </button>
        <button
          onClick={onApply}
          disabled={!pickedIcon}
          className="flex-1 py-2 text-[13px] font-medium border transition-all disabled:opacity-40"
          style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: 'var(--aui-text)', borderColor: 'var(--aui-text)', color: 'var(--aui-on-dark)' }}
        >
          적용
        </button>
      </div>
    </div>
  )
}

// ─── Tweaks modal ─────────────────────────────────────────────────────────────

function TweaksModal({ darkMode, brandColor, onDarkMode, onBrandColor, onClose, tweakSpec, isLoadingTweaks, activeStateId, varValues, onStateChange, onVarChange, onEvent }: {
  darkMode: boolean; brandColor: string
  onDarkMode: (on: boolean) => void; onBrandColor: (c: string) => void; onClose: () => void
  tweakSpec: TweakSpec | null; isLoadingTweaks: boolean
  activeStateId: string; varValues: Record<string, number>
  onStateChange: (id: string) => void; onVarChange: (id: string, value: number) => void
  onEvent: (script: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto bg-white w-72 overflow-y-auto max-h-[90vh]" style={{ borderRadius: "var(--aui-radius-card)", boxShadow: "var(--aui-shadow-floating)", border: `1px solid ${F.hairlineSoft}` }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--aui-shadow-line)]">
          <span className="text-[14px] font-semibold text-[var(--aui-text)]">Tweaks</span>
          <button onClick={onClose} className="text-[var(--aui-text-muted)] hover:text-[var(--aui-text)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* 시나리오 */}
        <div className="px-5 py-4 border-b border-[var(--aui-shadow-line)]">
          <p className="text-[13px] font-semibold text-[var(--aui-text-muted)] uppercase tracking-wider mb-2.5">시나리오</p>
          {isLoadingTweaks ? (
            <div className="flex items-center gap-2 text-[13px] text-[var(--aui-text-muted)]">
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
                    borderRadius: "var(--aui-radius-sm)",
                    ...(activeStateId === state.id
                      ? { background: 'var(--aui-text)', color: 'var(--aui-on-dark)', borderColor: 'var(--aui-text)' }
                      : { background: 'var(--aui-border-subtle)', color: 'var(--aui-text-muted)', borderColor: 'var(--aui-shadow-soft)' }),
                  }}
                >
                  {state.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[var(--aui-text-muted)]">UI를 생성하면 시나리오가 분석됩니다</p>
          )}
        </div>

        {/* 데이터 변수 슬라이더 */}
        {!isLoadingTweaks && tweakSpec && tweakSpec.variables.length > 0 && (
          <div className="px-5 py-4 border-b border-[var(--aui-shadow-line)]">
            <p className="text-[13px] font-semibold text-[var(--aui-text-muted)] uppercase tracking-wider mb-3">데이터</p>
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

        {/* 핵심 순간 */}
        {!isLoadingTweaks && tweakSpec && tweakSpec.events.length > 0 && (
          <div className="px-5 py-4 border-b border-[var(--aui-shadow-line)]">
            <p className="text-[13px] font-semibold text-[var(--aui-text-muted)] uppercase tracking-wider mb-2.5">핵심 순간</p>
            <div className="flex flex-col gap-2">
              {tweakSpec.events.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => onEvent(ev.script)}
                  className="flex items-center gap-2 w-full text-left text-[13px] py-2 px-3 border transition-all hover:bg-[var(--aui-surface-muted)]"
                  style={{ borderRadius: "var(--aui-radius-sm)", borderColor: 'var(--aui-shadow-soft)', background: 'var(--aui-page)', color: 'var(--aui-text)' }}
                >
                  <Zap size={13} style={{ color: 'var(--aui-caution)', flexShrink: 0 }} />
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 테마 */}
        <div className="p-5">
          <p className="text-[13px] font-semibold text-[var(--aui-text-muted)] uppercase tracking-wider mb-3">테마</p>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] text-[var(--aui-text)]">
              {darkMode ? <Moon size={14} /> : <Sun size={14} />}
              다크 모드
            </div>
            <Toggle on={darkMode} onChange={onDarkMode} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--aui-text)]">브랜드 컬러</span>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[var(--aui-text-muted)] font-mono">{brandColor}</span>
              <label className="cursor-pointer">
                <div className="size-7 border-2 cursor-pointer" style={{ borderRadius: "var(--aui-radius-pill)", backgroundColor: brandColor, borderColor: 'var(--aui-shadow-medium)', boxShadow: "var(--aui-shadow-ring)" }} />
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
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      size="lg"
      className="w-full"
      aria-busy={loading}
    >
      {loading ? <><Spinner />{loadingText}</> : children}
    </Button>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--aui-shadow-line)] px-4 py-3">
      <p className="text-[13px] font-semibold text-[var(--aui-text-muted)] uppercase tracking-wider mb-2">{label}</p>
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
      <span className="text-[13px] text-[var(--aui-text-muted)] shrink-0">{label}</span>
      {children}
    </div>
  )
}

function EditField({ value, prop, suffix = '', onUpdate, wide }: {
  value: string; prop: string; suffix?: string; onUpdate: (prop: string, val: string) => void; wide?: boolean
}) {
  const [localVal, setLocalVal] = useState({ source: value, value })
  const val = localVal.source === value ? localVal.value : value
  const setVal = (next: string) => setLocalVal({ source: value, value: next })
  const [scrubbing, setScrubbing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const scrubRef = useRef<{ startX: number; startVal: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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
      style={{ cursor: isNum ? (scrubbing ? 'ew-resize' : 'col-resize') : undefined }}
      className={cn(
        'text-[13px] text-[var(--aui-text)] bg-[var(--aui-border-subtle)] border border-transparent hover:border-[var(--aui-shadow-medium)] focus:border-[var(--aui-scrim)] outline-none rounded-[4px] transition-colors font-mono',
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
          style={value === opt.value ? { background: 'var(--aui-text)', color: 'var(--aui-on-dark)' } : { background: 'var(--aui-border)', color: 'var(--aui-text-muted)' }}
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
      <div className="size-4 border border-[var(--aui-shadow-medium)]" style={{ borderRadius: "var(--aui-radius-sm)", backgroundColor: color }} />
      <input type="color" value={color.startsWith('#') ? color : 'var(--aui-inverse-surface)'} onChange={e => onUpdate(prop, e.target.value)} className="sr-only" />
    </label>
  )
}

function SliderField({ variable, value, onChange }: {
  variable: TweakVariable
  value: number
  onChange: (id: string, value: number) => void
}) {
  const [localDisplay, setLocalDisplay] = useState({ source: value, value })
  const display = localDisplay.source === value ? localDisplay.value : value
  const setDisplay = (next: number) => setLocalDisplay({ source: value, value: next })

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] text-[var(--aui-text-muted)]">{variable.label}</span>
        <span className="text-[13px] font-medium text-[var(--aui-text)] font-mono">
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
        style={{ accentColor: 'var(--aui-primary)' }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[13px] text-[var(--aui-text-muted)]">{formatVarDisplay(variable.min, variable)}</span>
        <span className="text-[13px] text-[var(--aui-text-muted)]">{formatVarDisplay(variable.max, variable)}</span>
      </div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ backgroundColor: on ? 'var(--aui-primary)' : 'var(--aui-text-disabled)' }}
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
  const isDomainQuestion = question.id === 'domain'
  const isDomainOther = isDomainQuestion && typeof answer === 'string' && (answer === '기타' || answer.startsWith('기타: '))
  const customDomainText = isDomainOther && typeof answer === 'string' && answer.startsWith('기타: ')
    ? answer.slice('기타: '.length)
    : ''

  const isHero3DQuestion = question.id === 'hero_3d'
  const isHero3DManual = isHero3DQuestion && typeof answer === 'string' && (answer === '직접 입력' || answer.startsWith('직접 입력: '))
  const hero3DKeyword = isHero3DManual && typeof answer === 'string' && answer.startsWith('직접 입력: ')
    ? answer.slice('직접 입력: '.length)
    : ''

  const isSelected = (value: string) => {
    if (isDomainQuestion && value === '기타') return isDomainOther
    if (isHero3DQuestion && value === '직접 입력') return isHero3DManual
    if (!answer) return false
    if (Array.isArray(answer)) return answer.includes(value)
    return answer === value
  }
  const hasAnswer = answer !== undefined && answer !== '' && (!Array.isArray(answer) || answer.length > 0)

  return (
    <div>
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 size-6 flex items-center justify-center text-xs font-medium mt-0.5 transition-colors" style={{ borderRadius: "var(--aui-radius-sm)", ...(hasAnswer ? { backgroundColor: 'var(--aui-text)', color: 'var(--aui-on-dark)' } : { backgroundColor: 'var(--aui-border)', color: 'var(--aui-text-muted)', border: '1px solid var(--aui-shadow-soft)' }) }}>
          {hasAnswer ? <Check size={11} /> : index}
        </span>
        <div>
          <h3 className="text-[15px] font-medium text-[var(--aui-text)]">{question.question}</h3>
          {question.description && <p className="text-[13px] text-[var(--aui-text-muted)] mt-0.5">{question.description}</p>}
        </div>
      </div>

      <div className="pl-9">
        {question.type === 'text' ? (
          <textarea
            value={(answer as string) ?? ''}
            onChange={e => onAnswer(e.target.value)}
            className="w-full bg-[var(--aui-border-subtle)] border p-3 text-sm text-[var(--aui-text)] placeholder:text-[var(--aui-text-muted)] resize-none"
            style={{ borderRadius: "var(--aui-radius-sm)", outline: 'none', borderColor: 'var(--aui-shadow-soft)' }}
            rows={3}
            placeholder="자유롭게 입력해주세요..."
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--aui-scrim)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--aui-shadow-soft)' }}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {question.options?.map(option => (
              <button
                key={option}
                onClick={() => onAnswer(option)}
                className="px-4 py-2 text-sm border transition-all inline-flex items-center gap-1.5"
                style={{ borderRadius: "var(--aui-radius-sm)", ...(isSelected(option) ? { backgroundColor: 'var(--aui-primary-soft)', borderColor: F.primary, color: F.primary } : { backgroundColor: F.surface, borderColor: F.hairline, color: F.ink }) }}
              >
                {isSelected(option) && <Check size={13} />}
                {option}
              </button>
            ))}
            {question.hasDecideForMe && (
              <button onClick={() => onAnswer('AI가 결정')} className="px-4 py-2 text-sm border flex items-center gap-1.5 transition-all" style={{ borderRadius: "var(--aui-radius-sm)", borderStyle: 'dashed', ...(isSelected('AI가 결정') ? { backgroundColor: 'var(--aui-primary-soft)', borderColor: F.primary, color: F.primary } : { backgroundColor: F.surface, borderColor: F.hairline, color: F.ink }) }}>
                <Sparkles size={12} /> AI가 결정
              </button>
            )}
            {question.hasExplore && (
              <button onClick={() => onAnswer('다양하게 보기')} className="px-4 py-2 text-sm border transition-all" style={{ borderRadius: "var(--aui-radius-sm)", borderStyle: 'dashed', ...(isSelected('다양하게 보기') ? { backgroundColor: 'var(--aui-primary-soft)', borderColor: F.primary, color: F.primary } : { backgroundColor: F.surface, borderColor: F.hairline, color: F.ink }) }}>
                ✦ 다양하게 보기
              </button>
            )}
          </div>
        )}
        {isDomainOther && (
          <input
            type="text"
            value={customDomainText}
            onChange={e => onAnswer(e.target.value ? `기타: ${e.target.value}` : '기타')}
            className="mt-2 w-full bg-[var(--aui-border-subtle)] border px-3 py-2 text-sm text-[var(--aui-text)] placeholder:text-[var(--aui-text-muted)]"
            style={{ borderRadius: "var(--aui-radius-sm)", outline: 'none', borderColor: 'var(--aui-shadow-soft)' }}
            placeholder="예: 부동산, 물류, 교육 등..."
            autoFocus
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--aui-scrim)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--aui-shadow-soft)' }}
          />
        )}
        {isHero3DManual && (
          <div className="mt-2">
            <input
              type="text"
              value={hero3DKeyword}
              onChange={e => onAnswer(e.target.value ? `직접 입력: ${e.target.value}` : '직접 입력')}
              className="w-full bg-[var(--aui-border-subtle)] border px-3 py-2 text-sm text-[var(--aui-text)] placeholder:text-[var(--aui-text-muted)]"
              style={{ borderRadius: "var(--aui-radius-sm)", outline: 'none', borderColor: 'var(--aui-shadow-soft)' }}
              placeholder="예: 귀여운 로봇, 스마트폰 캐릭터, 달리는 강아지..."
              autoFocus
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--aui-scrim)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--aui-shadow-soft)' }}
            />
            <p className="text-[11px] text-[var(--aui-text-muted)] mt-1">한국어로 입력해도 돼요. Creon 3D 스타일로 생성됩니다.</p>
          </div>
        )}
        {question.type === 'multi' && <p className="text-[13px] text-[var(--aui-text-muted)] mt-2">복수 선택 가능</p>}
      </div>
    </div>
  )
}

function Spinner() {
  return <div className="size-4 rounded-full animate-spin" style={{ border: '2px solid var(--aui-shadow-medium)', borderTopColor: 'var(--aui-scrim-strong)' }} />
}
