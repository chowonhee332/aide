import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assignVariantArchetypes, buildVariantStructures, normalizeAuthoredStructures, bestArchetypeFor, SECTION_VOCABULARY } from '../src/lib/layout-archetypes.ts'
import { buildDesignCanvasIR } from '../src/lib/design-canvas-renderer.ts'

// LLM이 브리프로 작성한 구조 5개 → 사용자가 고른 3개(순서 = A·B·C) → 아키타입 + 섹션 recipe
// → variantStructures(MANDATORY 프롬프트 블록)까지 그대로 이어지는지 검증한다.
// 이 연결이 끊기면 시안이 brief/domain 해시로 뽑혀 A/B/C가 다 비슷해진다.

const VOCAB = Object.keys(SECTION_VOCABULARY)

// ── 1. 고른 아키타입 id를 순서대로 A·B·C에 고정 ──────────────────────────────
{
  const picked = ['card-carousel', 'kpi-dashboard', 'feed-stream']
  const arch = assignVariantArchetypes('아무 브리프', 'other', false, picked)
  assert.equal(arch.A.id, 'card-carousel', 'A = 첫 번째로 고른 구조')
  assert.equal(arch.B.id, 'kpi-dashboard', 'B = 두 번째')
  assert.equal(arch.C.id, 'feed-stream', 'C = 세 번째')
}

// ── 2. 잘못된 id는 무시하고 휴리스틱으로 폴백 (던지지 않는다) ────────────────
{
  const arch = assignVariantArchetypes('x', 'other', false, ['bogus', 'nope', 'nada'])
  for (const key of ['A', 'B', 'C']) {
    assert.ok(arch[key] && typeof arch[key].id === 'string' && arch[key].id !== 'bogus', `${key}: 폴백 아키타입이 유효`)
  }
}

// ── 3. variantStructures가 고른 아키타입을 렌더 + 서로 구분된다 ──────────────
{
  const picked = ['card-carousel', 'kpi-dashboard', 'feed-stream']
  const arch = assignVariantArchetypes('x', 'other', false, picked)
  const structures = buildVariantStructures({
    archetypes: arch,
    visualPolicies: ['no-image', 'creon-object-3d', 'real-photo'],
    platform: 'mobile',
    domain: 'other',
  })
  assert.equal(structures.A.archetypeId, 'card-carousel')
  assert.equal(structures.B.archetypeId, 'kpi-dashboard')
  assert.equal(structures.C.archetypeId, 'feed-stream')

  const signatures = new Set([structures.A, structures.B, structures.C].map(s => s.structureSignature))
  assert.equal(signatures.size, 3, '세 시안의 structureSignature가 모두 다르다')

  for (const key of ['A', 'B', 'C']) {
    assert.equal(structures[key].chrome.bottomNav, true, `${key}: 모바일 하단 앱바`)
    assert.equal(structures[key].chrome.sideNav, false, `${key}: 모바일에 LNB 없음`)
  }
}

// ── 4. 웹 sideNavByVariant: LNB를 요구하는 시안만 sideNav on ─────────────────
{
  const arch = assignVariantArchetypes('x', 'other', false, ['feed-stream', 'magazine-editorial', 'split-workspace'])
  const structures = buildVariantStructures({
    archetypes: arch,
    visualPolicies: ['no-image', 'no-image', 'no-image'],
    platform: 'web',
    domain: 'other',
    sideNavByVariant: { A: true, B: false, C: true },
  })
  assert.equal(structures.A.chrome.sideNav, true, 'A: sideNav on')
  assert.equal(structures.B.chrome.sideNav, false, 'B: sideNav off')
  assert.equal(structures.C.chrome.sideNav, true, 'C: sideNav on')
  for (const key of ['A', 'B', 'C']) {
    assert.equal(structures[key].chrome.bottomNav, false, `${key}: 웹에는 하단 탭바 없음`)
  }
}

// ── 5. 랜딩 의도는 sideNavByVariant보다 우선 (전부 off) ─────────────────────
{
  const arch = assignVariantArchetypes('x', 'other', true, ['brand-landing', 'product-showcase', 'brand-landing'])
  const structures = buildVariantStructures({
    archetypes: arch,
    visualPolicies: ['no-image', 'no-image', 'no-image'],
    platform: 'web',
    domain: 'business',
    isLandingIntent: true,
    sideNavByVariant: { A: true, B: true, C: true },
  })
  for (const key of ['A', 'B', 'C']) {
    assert.equal(structures[key].chrome.sideNav, false, `${key}: 랜딩은 sideNav 강제 off`)
  }
}

// ── 6. authoredRecipes/densityByVariant가 아키타입 sectionRecipe를 덮어쓴다 ──
{
  const arch = assignVariantArchetypes('x', 'other', false, ['kpi-dashboard', 'kpi-dashboard', 'kpi-dashboard'])
  const structures = buildVariantStructures({
    archetypes: arch,
    visualPolicies: ['no-image', 'no-image', 'no-image'],
    platform: 'mobile',
    domain: 'other',
    authoredRecipes: {
      A: ['kpi-band', 'quick-actions', 'timeline-list'],
      B: ['search-bar', 'category-chips', 'result-grid', 'recommendation-list'],
      C: ['photo-hero', 'featured-cards', 'trust-section', 'cta-footer'],
    },
    densityByVariant: { A: 'compact', B: 'balanced', C: 'airy' },
  })
  // 같은 아키타입 3개라도 authored recipe가 다르면 시그니처가 갈린다
  const sigs = new Set(['A', 'B', 'C'].map(k => structures[k].structureSignature))
  assert.equal(sigs.size, 3, 'authored recipe가 다르면 structureSignature도 다르다')
  assert.deepEqual(structures.A.sections.map(s => s.role), ['kpi-band', 'quick-actions', 'timeline-list'], 'A 섹션은 authored recipe 그대로')
  assert.equal(structures.B.sections.length, 4, 'B 섹션 수 = authored recipe 길이')
  assert.equal(structures.A.sections[0].density, 'compact', 'A 밀도 = densityByVariant')
  assert.equal(structures.C.sections[0].density, 'airy', 'C 밀도 = densityByVariant')
  // 3개 미만이면 무시하고 아키타입 recipe 사용
  const tooShort = buildVariantStructures({
    archetypes: arch, visualPolicies: ['no-image', 'no-image', 'no-image'], platform: 'mobile', domain: 'other',
    authoredRecipes: { A: ['kpi-band', 'quick-actions'] },
  })
  assert.deepEqual(tooShort.A.sections.map(s => s.role), arch.A.sectionRecipe, '섹션 2개면 아키타입 recipe로 폴백')
}

// ── 7. normalizeAuthoredStructures: 항상 유효한 서로 다른 5개로 수리 ─────────
{
  // 정상 입력 통과 + reason trim
  const ok = normalizeAuthoredStructures(
    [
      { name: '요약', reason: '  수치 먼저  ', sections: ['kpi-band', 'quick-actions', 'recommendation-list'], density: 'compact' },
      { name: '탐색', reason: '찾기 흐름', sections: ['search-bar', 'category-chips', 'result-grid'], density: 'balanced' },
      { name: '피드', reason: '', sections: ['photo-hero', 'feed-post', 'feed-post'], density: 'balanced' },
      { name: '비교', reason: '', sections: ['summary-hero', 'comparison-table', 'conversion-cta'], density: 'compact' },
      { name: '가이드', reason: '', sections: ['progress-hero', 'stepper-form', 'cta-footer'], density: 'balanced' },
    ],
    'mobile', 'B', 'other', false,
  )
  assert.equal(ok.length, 5, '유효 5개 그대로')
  assert.equal(ok[0].reason, '수치 먼저', 'reason trim')
  assert.ok(ok.every(s => s.sections.length >= 3 && s.sections.every(x => typeof x === 'string')), '전부 3섹션 이상')

  // 모르는 슬러그 제거 + 리드섹션 없으면 앞에 삽입 + 개수 부족 → 폴백으로 5개 채움
  const repaired = normalizeAuthoredStructures(
    [{ name: 'x', sections: ['bogus-slug', 'quick-actions', 'recommendation-list', 'timeline-list'] }],
    'mobile', 'B2B 어드민', 'business', false,
  )
  assert.equal(repaired.length, 5, '항상 5개')
  assert.equal(new Set(repaired.map(s => `${s.nav ?? 'none'}|${s.sections.join('+')}`)).size, 5, '서로 다른 5개')
  assert.ok(repaired.every(s => s.sections.every(slug => VOCAB.includes(slug) || slug.length > 0)), '알 수 없는 슬러그 제거됨')
  assert.equal(repaired[0].sections[0], 'summary-hero', '리드형 아니면 summary-hero 앞에 삽입')
  assert.ok(!('bogus-slug' in repaired[0].sections), 'bogus 슬러그 없음')

  // 모바일은 nav 무시, 웹은 WEB_NAVS 안으로
  const mobileNav = normalizeAuthoredStructures([{ name: 'x', sections: ['kpi-band', 'quick-actions', 'timeline-list'], nav: 'sidebar' }], 'mobile', 'B', 'other', false)
  assert.equal(mobileNav[0].nav, undefined, '모바일은 nav 없음')
  const webNav = normalizeAuthoredStructures([{ name: 'x', sections: ['kpi-band', 'quick-actions', 'timeline-list'], nav: 'nonsense' }], 'web', 'B', 'business', false)
  assert.equal(webNav[0].nav, 'top-bar', '웹에서 잘못된 nav → top-bar')

  // 빈 입력 → 전부 결정론 폴백 5개
  const empty = normalizeAuthoredStructures(undefined, 'web', 'B2B 인보이스 관리 어드민', 'business', false)
  assert.equal(empty.length, 5, 'null 입력도 5개')
  assert.equal(new Set(empty.map(s => s.sections.join('+'))).size >= 3, true, 'null 입력도 대체로 서로 다름')
}

// ── 8. 브리프가 다르면 폴백 구조도 다르다 ("앱이면 무조건 이거" 회귀 방지) ──
{
  const running = normalizeAuthoredStructures(undefined, 'mobile', '러닝 기록 앱. 이번 주 거리·페이스·칼로리 요약', 'health', false)
  const portfolio = normalizeAuthoredStructures(undefined, 'mobile', '사진작가 포트폴리오. 작업물을 한 장씩 크게 감상', 'entertainment', false)
  const runSig = running.map(s => s.sections.join('+')).join(' / ')
  const portSig = portfolio.map(s => s.sections.join('+')).join(' / ')
  assert.notEqual(runSig, portSig, '같은 mobile인데 브리프가 다르면 폴백 구조도 다르다')
  // 결정론: 같은 입력 → 같은 출력
  const again = normalizeAuthoredStructures(undefined, 'mobile', '러닝 기록 앱. 이번 주 거리·페이스·칼로리 요약', 'health', false)
  assert.equal(runSig, again.map(s => s.sections.join('+')).join(' / '), '결정론')
}

// ── 8b. LLM이 2개만 줘도 수리 후 5개가 서로 확연히 다르다 (섹션 겹침 ≤ 2) ──
{
  const raw = [
    { name: '감상', reason: '몰입', sections: ['photo-hero', 'horizontal-rail', 'recommendation-list'], density: 'balanced' },
    { name: '탐색', reason: '찾기', sections: ['search-bar', 'category-chips', 'result-grid', 'recommendation-list'], density: 'balanced' },
  ]
  const out = normalizeAuthoredStructures(raw, 'mobile', '사진작가 포트폴리오 앱', 'entertainment', false)
  assert.equal(out.length, 5, '2개 입력 → 5개로 채움')
  assert.ok(out.every(s => s.reason), '패딩된 구조도 이유가 붙는다')
  let maxOverlap = 0
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
    maxOverlap = Math.max(maxOverlap, out[i].sections.filter(x => out[j].sections.includes(x)).length)
  }
  assert.ok(maxOverlap <= 2, `5개 구조의 최대 섹션 겹침이 2 이하 (got ${maxOverlap})`)
}

// ── 8c. 섹션 순서가 다르면 와이어프레임 실루엣도 다르다 (composition 뭉개기 회귀) ──
{
  const mk = (sections) => ({
    id: 'd', name: 'x', thesis: 'x', userFeeling: '', composition: 'dashboard', density: 'balanced',
    mediaMode: 'none', navigation: 'bottom-tabs', focalPoint: '', primaryAction: '시작',
    sectionFlow: sections, paletteIntent: '', typographyIntent: '', signatureMove: '', avoid: [],
  })
  const req = { brief: 'x', projectSummary: 'x', platform: 'mobile' }
  const sig = ir => ir.nodes.filter(n => n.id.startsWith('sec-')).map(n => n.role).join('|')
  const a = sig(buildDesignCanvasIR(mk(['kpi-band', 'quick-actions', 'data-table', 'timeline-list']), req))
  const b = sig(buildDesignCanvasIR(mk(['photo-hero', 'horizontal-rail', 'recommendation-list']), req))
  const c = sig(buildDesignCanvasIR(mk(['object-3d-hero', 'category-rail', 'result-grid', 'trust-section']), req))
  assert.ok(a && b && c, '세 구조 모두 섹션 밴드를 그린다')
  assert.equal(new Set([a, b, c]).size, 3, '섹션 recipe가 다르면 와이어프레임 role 시퀀스도 다르다')
  assert.match(a, /kpi\|kpi/, 'kpi-band → 여러 kpi 노드')
  assert.match(a, /table-cell/, 'data-table → 테이블 셀')
  assert.match(b, /focal-point/, 'photo-hero → focal 노드')
}

// ── 9. bestArchetypeFor: authored 섹션과 겹치는 아키타입을 고른다 ────────────
{
  assert.equal(bestArchetypeFor(['kpi-band', 'quick-actions', 'status-analysis', 'recommendation-list'], 'object-hero'), 'kpi-dashboard', 'KPI 섹션 → kpi-dashboard')
  assert.equal(bestArchetypeFor(['search-bar', 'category-rail', 'result-grid', 'curated-collection'], 'kpi-dashboard'), 'search-explore', '검색 섹션 → search-explore')
  assert.equal(bestArchetypeFor(['zzz', 'yyy'], 'magazine-editorial'), 'magazine-editorial', '교집합 0 → fallback')
}

// ── 10. 소스 배선 — 파이프라인이 authoredStructures를 실제로 쓴다 ────────────
{
  const di = readFileSync(new URL('../src/lib/design-intelligence.ts', import.meta.url), 'utf8')
  assert.match(di, /assignVariantArchetypes\([^)]*input\.pickedArchetypeIds/, 'pickedArchetypeIds → assignVariantArchetypes')
  assert.match(di, /authoredRecipes:\s*input\.authoredRecipes/, 'authoredRecipes → buildVariantStructures')

  const studio = readFileSync(new URL('../src/components/StudioView.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(studio, /MAIN_STRUCTURE_LABELS|mainStructureOptions|recommendedStructuresFor/, '고정 목록 심볼 제거됨')
  assert.match(studio, /serviceAnalysis\?\.authoredStructures/, 'StudioView가 authoredStructures 참조')
  assert.match(studio, /authoredRecipes:\s*structurePlan\?\.authoredRecipes/, 'authoredRecipes를 buildDesignIntelligencePlan에 전달')

  const gemini = readFileSync(new URL('../src/lib/gemini.ts', import.meta.url), 'utf8')
  assert.match(gemini, /authoredStructures.*서로 다른 접근 5개.*직접 작성/s, '분석 프롬프트가 구조 5개 작성을 요청')
  assert.match(gemini, /정확히 5개/, '프롬프트가 정확히 5개를 강제')
  assert.match(gemini, /buildSectionVocabularyPrompt\(platform/, '프롬프트에 섹션 어휘 주입')
  assert.match(gemini, /authoredStructures:\s*normalizeAuthoredStructures\(/, '파싱이 수리층을 거친다')
}

console.log('LLM이 작성한 구조 5개 → 고른 3개가 아키타입 + 섹션 recipe로 A/B/C variantStructures까지 이어진다.')
