import fs from 'fs'
import path from 'path'
import type { UIStructureIR } from './layout-archetypes'
import { VALID_MATERIAL_SYMBOLS, ICON_FALLBACK_RULES } from './material-symbols'

/**
 * 구조 계약 검증 (3층 안전망).
 *
 * 1층(결정론 주입)·2층(UIStructureIR 사전 계약)이 품질의 주력이고,
 * 이 모듈은 "계약을 실제로 지켰는지"를 문자열 파싱으로 대조하는 안전망이다.
 * - 재생성 루프 금지: severe 위반만 핀포인트 수정 1회 (호출부 책임)
 * - 모든 결과를 로컬 jsonl에 적재 → 반복 패턴이 보이면 그 항목을 1·2층으로 승격하고
 *   이 lint에서 제거한다 (졸업 사이클).
 */

export type StructureViolation = {
  code:
    | 'no-section-attrs'      // data-ui-section 속성이 전혀 없음 (섹션 검사 불가)
    | 'missing-section'       // required 섹션 누락
    | 'section-order'         // 섹션 등장 순서가 IR과 다름
    | 'missing-visual'        // required visual slot placeholder 누락
    | 'missing-top-nav'       // 상단 네비 누락
    | 'missing-bottom-nav'    // 모바일 하단 네비 누락
    | 'center-floating-cta'   // design system 금지 패턴: center-floating CTA
    | 'invalid-icon'          // 존재하지 않는 Material Symbols 이름 (자동 교정됨)
    | 'off-grid-rhythm'       // telemetry: 정규화 밴드 밖 off-grid 간격/off-scale 타입
  severity: 'severe' | 'minor'
  detail: string
}


/**
 * Material Symbols 무효 이름을 코드가 직접 교정한다 (LLM 호출 없음).
 * 반환: 교정된 html과 교정 내역(로그용).
 */
export function sanitizeMaterialSymbols(html: string): { html: string; corrections: Array<{ from: string; to: string }> } {
  const corrections: Array<{ from: string; to: string }> = []
  const next = html.replace(
    /(<span\b[^>]*class=["'][^"']*material-symbols[^"']*["'][^>]*>)\s*([a-z0-9_ ]+?)\s*(<\/span>)/gi,
    (whole, open: string, name: string, close: string) => {
      const clean = name.trim().toLowerCase().replace(/\s+/g, '_')
      if (VALID_MATERIAL_SYMBOLS.has(clean)) {
        return clean === name.trim() ? whole : `${open}${clean}${close}`
      }
      const fallback = ICON_FALLBACK_RULES.find(([re]) => re.test(clean))?.[1] ?? 'circle'
      corrections.push({ from: name.trim(), to: fallback })
      return `${open}${fallback}${close}`
    },
  )
  return { html: next, corrections }
}

/**
 * Material Symbols 폰트가 생성 HTML에 로드되도록 보장한다.
 *
 * 프롬프트는 `<span class="material-symbols-rounded">home</span>` 형태를 요구하지만
 * 그 폰트를 넣어주는 곳이 없어서, iframe 안에서는 리거처 이름("home", "circle")이
 * 그대로 글자로 찍혔다. 아이콘은 결정론적 코드의 책임이므로 여기서 주입한다.
 */
const MATERIAL_SYMBOLS_FAMILY: Record<string, string> = {
  rounded: 'Material+Symbols+Rounded',
  outlined: 'Material+Symbols+Outlined',
  sharp: 'Material+Symbols+Sharp',
}

export function ensureMaterialSymbolsFont(html: string): string {
  const used = Object.keys(MATERIAL_SYMBOLS_FAMILY)
    .filter(variant => new RegExp(`material-symbols-${variant}`, 'i').test(html))
  if (used.length === 0) return html

  const links = used
    // family 문자열의 '+'는 정규식 수량자라 그대로 쓰면 중복 감지가 안 된다.
    .filter(variant => !html.toLowerCase().includes(MATERIAL_SYMBOLS_FAMILY[variant].toLowerCase()))
    .map(variant => `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${MATERIAL_SYMBOLS_FAMILY[variant]}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />`)
  if (links.length === 0) return html

  // 리거처가 렌더되기 전에는 이름이 글자로 보인다. font-display: block으로 가린다.
  const guard = `<style>.material-symbols-rounded,.material-symbols-outlined,.material-symbols-sharp{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-feature-settings:'liga';-webkit-font-smoothing:antialiased}</style>`
  const block = links.join('') + guard

  if (/<head\b[^>]*>/i.test(html)) return html.replace(/(<head\b[^>]*>)/i, `$1${block}`)
  if (/<html\b[^>]*>/i.test(html)) return html.replace(/(<html\b[^>]*>)/i, `$1<head>${block}</head>`)
  return block + html
}

// ── IR 대조 lint ──────────────────────────────────────────────────────────────

/**
 * data-ui-section 속성이 없는 <section> 요소에 레이아웃 클래스 기반으로 속성을 주입한다.
 * layout-{id} 클래스가 있고 IR sections에 해당 id가 있을 때만 주입.
 */
export function injectSectionAttrs(html: string, ir: UIStructureIR): string {
  const irIds = new Set(ir.sections.map(s => s.id))
  return html.replace(/<section\b([^>]*)>/gi, (match, attrs: string) => {
    if (/data-ui-section/i.test(attrs)) return match
    const layoutMatch = /\blayout-([a-z][a-z0-9-]*)/.exec(attrs)
    if (!layoutMatch) return match
    const candidateId = layoutMatch[1]
    if (!irIds.has(candidateId)) return match
    return `<section${attrs} data-ui-section="${candidateId}">`
  })
}

/**
 * data-ui-section 속성 기반으로 섹션 블록을 IR 순서로 DOM 재배치한다 (1층 결정론).
 * 중첩 <section> 처리: 깊이 카운팅 방식으로 완전한 블록을 추출.
 * 재배치 불가(섹션 누락 등)이면 null 반환.
 */
export function repairSectionOrder(html: string, irOrder: string[]): string | null {
  interface Block { id: string; start: number; end: number }
  const blocks: Block[] = []

  let pos = 0
  while (pos < html.length) {
    const tagStart = html.indexOf('<section', pos)
    if (tagStart === -1) break

    // '<section' 뒤 문자가 '>' 또는 공백이어야 실제 section 태그
    const charAfter = html[tagStart + 8]
    if (charAfter !== '>' && !/\s/.test(charAfter ?? '')) {
      pos = tagStart + 8
      continue
    }

    const tagEnd = html.indexOf('>', tagStart)
    if (tagEnd === -1) break
    const openTagStr = html.slice(tagStart, tagEnd + 1)
    const idMatch = /data-ui-section=["']([^"']+)["']/.exec(openTagStr)

    if (!idMatch || !irOrder.includes(idMatch[1])) {
      pos = tagEnd + 1
      continue
    }

    const id = idMatch[1]
    let depth = 1
    let i = tagEnd + 1
    let found = false

    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf('<section', i)
      const nextClose = html.indexOf('</section>', i)
      if (nextClose === -1) break

      // nextOpen이 유효한 section 태그인지 확인
      const validNextOpen = nextOpen !== -1 && (() => {
        const c = html[nextOpen + 8]
        return c === '>' || /\s/.test(c ?? '')
      })()

      if (validNextOpen && nextOpen < nextClose) {
        depth++
        i = nextOpen + 9
      } else {
        depth--
        if (depth === 0) {
          blocks.push({ id, start: tagStart, end: nextClose + 10 })
          pos = nextClose + 10
          found = true
        } else {
          i = nextClose + 10
        }
      }
    }

    if (!found) pos = tagEnd + 1
  }

  if (blocks.length < 2) return null

  blocks.sort((a, b) => a.start - b.start)

  const foundIds = blocks.map(b => b.id)
  const desiredOrder = irOrder.filter(id => foundIds.includes(id))
  if (desiredOrder.join(',') === foundIds.join(',')) return null // 이미 올바른 순서

  const idToContent = new Map(blocks.map(b => [b.id, html.slice(b.start, b.end)]))

  let result = ''
  let lastEnd = 0
  for (let i = 0; i < blocks.length; i++) {
    result += html.slice(lastEnd, blocks[i].start)
    result += idToContent.get(desiredOrder[i]) ?? html.slice(blocks[i].start, blocks[i].end)
    lastEnd = blocks[i].end
  }
  result += html.slice(lastEnd)
  return result
}

export function lintStructure(html: string, ir: UIStructureIR): StructureViolation[] {
  const violations: StructureViolation[] = []

  // 1) 섹션 존재/순서 — data-ui-section 속성 기반
  const foundSections = [...html.matchAll(/data-ui-section=["']([^"']+)["']/g)].map(m => m[1])
  if (foundSections.length === 0) {
    // 속성이 전혀 없으면 섹션 단위 검증 불가 — minor로 기록만 (졸업 후보 관찰용)
    violations.push({ code: 'no-section-attrs', severity: 'minor', detail: 'data-ui-section 속성이 출력에 없음' })
  } else {
    const required = ir.sections.filter(s => s.required)
    for (const section of required) {
      if (!foundSections.includes(section.id)) {
        violations.push({ code: 'missing-section', severity: 'severe', detail: `${section.id} (${section.role})` })
      }
    }
    // 순서: IR 순서 부분수열인지 (누락 제외하고 상대 순서만 검사)
    const irOrder = ir.sections.map(s => s.id).filter(id => foundSections.includes(id))
    const actualOrder = foundSections.filter(id => irOrder.includes(id))
    if (irOrder.join('>') !== actualOrder.join('>')) {
      violations.push({ code: 'section-order', severity: 'severe', detail: `IR ${irOrder.join('>')} vs 실제 ${actualOrder.join('>')}` })
    }
  }

  // 2) required visual slot — placeholder 패턴 존재 (이미지 해석 전 호출 전제)
  const needs = new Set(ir.visualSlots.filter(s => s.required).map(s => s.kind))
  if (needs.has('HERO_3D') && !/%%(?:HERO_3D|SHARED_HERO_3D|MASCOT_3D|REWARD_OBJECT_3D)/.test(html)) {
    violations.push({ code: 'missing-visual', severity: 'severe', detail: 'HERO_3D placeholder 없음' })
  }
  if (needs.has('SCENE_3D') && !/%%(?:SCENE_3D|SHARED_HERO_3D_SCENE|HERO_SCENE_3D)/.test(html)) {
    violations.push({ code: 'missing-visual', severity: 'severe', detail: 'SCENE_3D placeholder 없음' })
  }
  if (needs.has('REAL_PHOTO') && !/%%IMG_\d|%%THUMB:/.test(html)) {
    violations.push({ code: 'missing-visual', severity: 'severe', detail: '실사 이미지 placeholder 없음' })
  }

  // 3) chrome — 상단/하단 네비
  const hasTopNavEl = /class=["'][^"']*\b(?:top-navigation|app-header|global-nav|top-nav|header-bar|navbar|app-bar|nav-header)\b/i.test(html) || /<header\b/i.test(html)
  if (ir.chrome.topNav && !hasTopNavEl) {
    violations.push({ code: 'missing-top-nav', severity: 'severe', detail: '상단 네비(top-navigation/header) 없음' })
  }
  const hasBottomNavEl = /class=["'][^"']*\b(?:bottom-navigation|mobile-tabbar|tabbar|tab-bar|bottom-nav|nav-bottom|bottom-bar|tab-navigation|bottom-tabs)\b/i.test(html)
  if (ir.chrome.bottomNav && !hasBottomNavEl) {
    violations.push({ code: 'missing-bottom-nav', severity: 'severe', detail: '하단 네비(bottom-navigation/tabbar) 없음' })
  }

  // 4) CTA — center-floating 금지 (design system 명시 금지)
  const hasCenterFloatingCta =
    /class=["'][^"']*\b(?:fab|floating-cta|cta-float|fab-cta|cta-floating|fixed-cta)\b/i.test(html) ||
    /style=["'][^"']*position\s*:\s*(?:fixed|absolute)[^"']*(?:left|right)\s*:\s*50%/i.test(html) ||
    /style=["'][^"']*(?:left|right)\s*:\s*50%[^"']*position\s*:\s*(?:fixed|absolute)/i.test(html)
  if (hasCenterFloatingCta) {
    violations.push({ code: 'center-floating-cta', severity: 'severe', detail: 'center-floating CTA 감지 — design system 금지 패턴' })
  }

  // 5) off-grid 간격/타입 — telemetry only (minor). 결정론 정규화가 대부분 교정하므로
  //    여기 남는 건 정규화 밴드 밖(padding/margin, 큰 값, 인라인 style)이다. 반복되면
  //    정규화 확장 또는 계약 승격 신호. (severe 아님 → 재생성 유발 안 함)
  const offGridSpacing = [...html.matchAll(/(?:gap|row-gap|column-gap|padding|margin)(?:-(?:top|right|bottom|left))?\s*:\s*([^;{}"']*?\b\d+px\b[^;{}"']*)/gi)]
    .flatMap(m => [...m[1].matchAll(/\b(\d+)px\b/g)].map(x => Number(x[1])))
    .filter(n => n > 0 && n % 4 !== 0)
  const offScaleType = [...html.matchAll(/font-size\s*:\s*(\d+)px/gi)]
    .map(m => Number(m[1]))
    .filter(n => ![11, 12, 13, 14, 15, 18, 20, 24, 32, 40, 56].includes(n))
  if (offGridSpacing.length + offScaleType.length > 0) {
    violations.push({
      code: 'off-grid-rhythm',
      severity: 'minor',
      detail: `off-grid 간격 ${offGridSpacing.length}건(${[...new Set(offGridSpacing)].sort((a, b) => a - b).join(',')}) · off-scale font-size ${offScaleType.length}건(${[...new Set(offScaleType)].sort((a, b) => a - b).join(',')})`,
    })
  }

  return violations
}

/** severe 위반만으로 짧은 핀포인트 수정문 생성 — 일반론 체크리스트 금지 */
export function buildStructureRepairMessage(violations: StructureViolation[], ir: UIStructureIR): string {
  const lines = violations.map(v => {
    if (v.code === 'missing-section') {
      const section = ir.sections.find(s => v.detail.startsWith(s.id))
      return `- 누락된 섹션 추가: <section class="aide-section layout-${section?.layout ?? ''}" data-ui-section="${v.detail.split(' ')[0]}"> — 역할: ${section?.role}, 콘텐츠: ${section?.content.join(', ')}`
    }
    if (v.code === 'missing-visual') return `- 누락된 비주얼 추가: ${v.detail} — IR의 visual slot 규칙대로 placeholder img를 해당 섹션에 1회 삽입`
    if (v.code === 'missing-top-nav') return `- 상단 네비 추가: <header class="top-navigation">…</header> (스크롤 영역 밖, aide-logo-slot 포함)`
    if (v.code === 'missing-bottom-nav') return `- 하단 네비 추가: <nav class="bottom-navigation">…</nav> (fixed, 스크롤 영역 밖)`
    if (v.code === 'section-order') {
      const targetOrder = v.detail.split(' vs ')[0].replace('IR ', '')
      return `- 섹션 순서 수정: data-ui-section 속성의 <section> 요소를 아래 순서로 DOM 재배치 (콘텐츠·스타일 변경 금지, 순서만): ${targetOrder.split('>').join(' → ')}`
    }
    if (v.code === 'center-floating-cta') return `- center-floating CTA 제거: .fab/.floating-cta 클래스나 position:fixed+left:50% 버튼을 삭제하고, scroll-body 맨 끝에 full-width 인라인 CTA 버튼으로 교체`
    return `- ${v.code}: ${v.detail}`
  })
  return `구조 계약(UI Structure IR) 위반이 발견되었습니다. 아래 항목만 정확히 수정하고, 나머지 마크업·스타일·콘텐츠는 한 글자도 바꾸지 마세요.\n\n${lines.join('\n')}`
}

// ── 로컬 위반 로그 (.aide-logs/violations.jsonl) ─────────────────────────────
// 반복 패턴을 데이터로 확인해 1·2층으로 승격하기 위한 적재. 깨끗한 생성도 기록(분모).

export type StructureLintRecord = {
  ts: string
  domain?: string
  subtype?: string
  variant: string
  archetypeId: string
  draft: boolean
  violations: StructureViolation[]
  iconCorrections: Array<{ from: string; to: string }>
  repaired: boolean
  repairFixed: boolean
}

export function logStructureRecord(record: StructureLintRecord): void {
  try {
    const dir = path.join(process.cwd(), '.aide-logs')
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(path.join(dir, 'violations.jsonl'), JSON.stringify(record) + '\n')
  } catch (err) {
    console.warn('[structure-lint] log write failed:', err instanceof Error ? err.message : String(err))
  }
}
