import fs from 'fs'
import path from 'path'
import type { UIStructureIR } from './layout-archetypes'

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
    | 'invalid-icon'          // 존재하지 않는 Material Symbols 이름 (자동 교정됨)
  severity: 'severe' | 'minor'
  detail: string
}

// ── Material Symbols 화이트리스트 ─────────────────────────────────────────────
// 흔히 쓰이는 유효 아이콘. LLM이 무효 이름을 쓰면 화면에 영문 텍스트가 그대로 노출되므로
// 무효 이름은 키워드 매핑 → 폴백 순으로 코드가 직접 교정한다 (LLM 호출 없음).
const VALID_MATERIAL_SYMBOLS = new Set([
  'home', 'search', 'settings', 'person', 'menu', 'close', 'add', 'remove', 'check', 'star',
  'favorite', 'notifications', 'mail', 'call', 'chat', 'chat_bubble', 'send', 'share', 'edit',
  'delete', 'arrow_back', 'arrow_forward', 'arrow_upward', 'arrow_downward', 'chevron_left',
  'chevron_right', 'expand_more', 'expand_less', 'more_vert', 'more_horiz', 'refresh', 'sync',
  'download', 'upload', 'visibility', 'visibility_off', 'lock', 'lock_open', 'key', 'shield',
  'verified', 'info', 'help', 'warning', 'error', 'cancel', 'check_circle', 'add_circle',
  'do_not_disturb_on', 'schedule', 'calendar_today', 'calendar_month', 'event', 'alarm', 'timer',
  'history', 'update', 'trending_up', 'trending_down', 'trending_flat', 'bar_chart', 'pie_chart',
  'show_chart', 'monitoring', 'analytics', 'insights', 'leaderboard', 'speed', 'bolt', 'flash_on',
  'wallet', 'account_balance_wallet', 'account_balance', 'payments', 'credit_card', 'savings',
  'attach_money', 'paid', 'currency_exchange', 'receipt', 'receipt_long', 'request_quote',
  'shopping_cart', 'shopping_bag', 'storefront', 'store', 'sell', 'local_offer', 'redeem',
  'card_giftcard', 'loyalty', 'workspace_premium', 'military_tech', 'emoji_events', 'stars',
  'local_shipping', 'local_mall', 'inventory', 'inventory_2', 'package_2', 'box', 'category',
  'apps', 'grid_view', 'view_list', 'list', 'list_alt', 'table_rows', 'dashboard', 'space_dashboard',
  'restaurant', 'restaurant_menu', 'lunch_dining', 'dinner_dining', 'local_cafe', 'coffee',
  'local_pizza', 'fastfood', 'bakery_dining', 'ramen_dining', 'icecream', 'cake', 'liquor',
  'nutrition', 'egg', 'set_meal', 'kitchen', 'soup_kitchen', 'delivery_dining', 'takeout_dining',
  'directions_walk', 'directions_run', 'directions_bike', 'directions_car', 'directions_bus',
  'flight', 'flight_takeoff', 'flight_land', 'train', 'subway', 'local_taxi', 'map', 'place',
  'location_on', 'my_location', 'near_me', 'navigation', 'explore', 'public', 'travel_explore',
  'luggage', 'beach_access', 'hotel', 'bed', 'king_bed', 'villa', 'cottage', 'apartment', 'house',
  'fitness_center', 'exercise', 'sports_gymnastics', 'self_improvement', 'spa', 'monitor_heart',
  'favorite_border', 'ecg_heart', 'cardiology', 'vital_signs', 'medication', 'pill', 'vaccines',
  'medical_services', 'local_hospital', 'stethoscope', 'health_and_safety', 'psychology',
  'sentiment_satisfied', 'sentiment_very_satisfied', 'mood', 'sleep', 'bedtime', 'dark_mode',
  'light_mode', 'wb_sunny', 'nightlight', 'water_drop', 'humidity_percentage', 'thermostat',
  'school', 'menu_book', 'auto_stories', 'book', 'import_contacts', 'library_books', 'quiz',
  'assignment', 'task_alt', 'checklist', 'fact_check', 'grading', 'workspace', 'edit_note',
  'sticky_note_2', 'note_add', 'description', 'article', 'feed', 'newspaper', 'campaign',
  'play_arrow', 'play_circle', 'pause', 'pause_circle', 'stop', 'skip_next', 'skip_previous',
  'music_note', 'headphones', 'mic', 'videocam', 'movie', 'live_tv', 'smart_display', 'theaters',
  'photo_camera', 'image', 'photo_library', 'collections', 'palette', 'brush', 'draw',
  'pets', 'cruelty_free', 'park', 'forest', 'eco', 'potted_plant', 'grass', 'yard', 'compost',
  'group', 'groups', 'person_add', 'people', 'diversity_3', 'family_restroom', 'child_care',
  'thumb_up', 'thumb_down', 'comment', 'forum', 'reviews', 'rate_review', 'bookmark',
  'bookmark_border', 'flag', 'report', 'block', 'qr_code', 'qr_code_scanner', 'barcode_scanner',
  'smartphone', 'phone_iphone', 'tablet', 'computer', 'laptop', 'watch', 'devices', 'wifi',
  'signal_cellular_alt', 'network_check', 'bluetooth', 'battery_full', 'battery_charging_full',
  'work', 'business_center', 'badge', 'corporate_fare', 'domain', 'meeting_room', 'handshake',
  'rocket_launch', 'lightbulb', 'tips_and_updates', 'auto_awesome', 'magic_button', 'smart_toy',
  'support_agent', 'headset_mic', 'contact_support', 'help_center', 'question_answer', 'sms',
  'language', 'translate', 'g_translate', 'filter_list', 'tune', 'sort', 'swap_vert', 'swap_horiz',
  'open_in_new', 'launch', 'link', 'content_copy', 'ios_share', 'print', 'save', 'cloud',
  'cloud_upload', 'cloud_download', 'folder', 'folder_open', 'attach_file', 'circle', 'square',
  'crown', 'diamond', 'token', 'toll', 'paid_outline', 'percent', 'discount', 'price_check',
  'price_change', 'shopping_basket', 'add_shopping_cart', 'remove_shopping_cart', 'point_of_sale',
])

// 무효 아이콘 이름 → 의미 기반 폴백 (키워드 포함 매칭, 위에서 아래 우선)
const ICON_FALLBACK_RULES: Array<[RegExp, string]> = [
  [/dog|cat|pet|animal|paw/i, 'pets'],
  [/food|meal|dish|menu_item|eat/i, 'restaurant'],
  [/pizza/i, 'local_pizza'],
  [/coffee|cafe|drink|beverage/i, 'local_cafe'],
  [/money|cash|won|price|cost|fee/i, 'payments'],
  [/coin|point|reward/i, 'paid'],
  [/coupon|ticket|voucher/i, 'local_offer'],
  [/gift|present/i, 'card_giftcard'],
  [/cart|basket/i, 'shopping_cart'],
  [/shop|market|store/i, 'storefront'],
  [/walk|step|run|jog/i, 'directions_walk'],
  [/heart|health|pulse/i, 'monitor_heart'],
  [/medicine|drug|pharma/i, 'medication'],
  [/hospital|clinic|doctor/i, 'local_hospital'],
  [/plant|tree|leaf|garden/i, 'potted_plant'],
  [/water|drop|rain/i, 'water_drop'],
  [/sun|weather|day/i, 'wb_sunny'],
  [/moon|night|sleep/i, 'bedtime'],
  [/book|read|study|learn|course/i, 'menu_book'],
  [/quiz|test|exam/i, 'quiz'],
  [/task|todo|mission|goal/i, 'task_alt'],
  [/chart|graph|stat|report|analytic/i, 'bar_chart'],
  [/trend|grow/i, 'trending_up'],
  [/calendar|date|day|schedule/i, 'calendar_month'],
  [/time|clock|hour/i, 'schedule'],
  [/bell|notif|alert/i, 'notifications'],
  [/chat|message|talk/i, 'chat_bubble'],
  [/mail|email/i, 'mail'],
  [/user|profile|account|my/i, 'person'],
  [/family|member|friend|group/i, 'groups'],
  [/car|drive|vehicle/i, 'directions_car'],
  [/bus|transit/i, 'directions_bus'],
  [/plane|fly|flight|air/i, 'flight'],
  [/train|rail/i, 'train'],
  [/map|location|place|gps|pin/i, 'place'],
  [/travel|trip|tour/i, 'travel_explore'],
  [/hotel|stay|room|bed/i, 'hotel'],
  [/camera|photo/i, 'photo_camera'],
  [/video|movie|film/i, 'movie'],
  [/music|song|audio/i, 'music_note'],
  [/play/i, 'play_circle'],
  [/game|quest|level/i, 'emoji_events'],
  [/trophy|award|badge|medal|rank/i, 'emoji_events'],
  [/crown|premium|vip/i, 'workspace_premium'],
  [/fire|hot|streak/i, 'bolt'],
  [/wallet|bank|balance/i, 'account_balance_wallet'],
  [/card|credit/i, 'credit_card'],
  [/save|saving|piggy/i, 'savings'],
  [/secure|safe|protect|shield/i, 'shield'],
  [/lock|password/i, 'lock'],
  [/scan|qr/i, 'qr_code_scanner'],
  [/phone|mobile|call/i, 'smartphone'],
  [/wifi|signal|network|data/i, 'wifi'],
  [/box|package|delivery|ship/i, 'local_shipping'],
  [/work|job|office|biz/i, 'work'],
  [/idea|tip|bulb/i, 'lightbulb'],
  [/ai|robot|bot|smart/i, 'smart_toy'],
  [/magic|sparkle|wand/i, 'auto_awesome'],
  [/support|cs|agent|상담/i, 'support_agent'],
  [/doc|file|paper|form/i, 'description'],
  [/news|article|feed/i, 'feed'],
  [/filter|sort/i, 'tune'],
  [/link|url/i, 'link'],
  [/share/i, 'share'],
  [/edit|write|pen/i, 'edit'],
  [/search|find/i, 'search'],
  [/home|house/i, 'home'],
]

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

// ── IR 대조 lint ──────────────────────────────────────────────────────────────

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
      violations.push({ code: 'section-order', severity: 'minor', detail: `IR ${irOrder.join('>')} vs 실제 ${actualOrder.join('>')}` })
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
  if (needs.has('REAL_PHOTO') && !/%%IMG_\d|%%THUMB:|images\.unsplash/.test(html)) {
    violations.push({ code: 'missing-visual', severity: 'severe', detail: '실사 이미지 placeholder 없음' })
  }

  // 3) chrome — 상단/하단 네비
  if (ir.chrome.topNav && !/class=["'][^"']*\b(?:top-navigation|app-header|global-nav)\b/.test(html) && !/<header\b/i.test(html)) {
    violations.push({ code: 'missing-top-nav', severity: 'severe', detail: '상단 네비(top-navigation/header) 없음' })
  }
  if (ir.chrome.bottomNav && !/class=["'][^"']*\b(?:bottom-navigation|mobile-tabbar|tabbar|tab-bar|bottom-nav)\b/.test(html)) {
    violations.push({ code: 'missing-bottom-nav', severity: 'severe', detail: '하단 네비(bottom-navigation/tabbar) 없음' })
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
