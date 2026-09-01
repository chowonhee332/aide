import assert from 'node:assert/strict'
import { generateDesignDirections } from '../src/lib/design-direction.ts'
import { buildDesignCanvasIR } from '../src/lib/design-canvas-renderer.ts'

// LLM 없이 fallback 경로만 검증한다. generateText가 던지면 FALLBACK_DIRECTIONS로
// 폴백하고, structure lock이 그 위에 적용된다.
const boom = async () => { throw new Error('no model in test') }

const APP_CASES = [
  ['app-card', 'carousel'],
  ['app-list', 'feed'],
  ['app-grid', 'editorial'],
  ['app-dashboard', 'dashboard'],
  ['app-discovery', 'commerce'],
  ['app-map', 'map'],
  ['app-guided', 'guided'],
  ['app-immersive', 'immersive'],
]
const WEB_CASES = [
  ['web-gnb', 'top-bar', ['editorial', 'feed', 'commerce']],
  ['web-lnb', 'sidebar', ['feed', 'dashboard']],
  ['web-dashboard', 'top-and-side', ['dashboard']],
  ['web-split', 'sidebar', ['workspace']],
  ['web-minimal', 'minimal', ['editorial', 'guided', 'immersive']],
]

function shellRoles(ir) {
  return ir.nodes.filter(n => n.kind === 'navigation').map(n => n.role)
}

// ── 앱: composition 고정, navigation은 항상 bottom-tabs ──────────────────────
for (const [structure, composition] of APP_CASES) {
  const req = { brief: 'x', platform: 'mobile', structure }
  const directions = await generateDesignDirections(req, boom)
  assert.equal(directions.length, 6, `${structure}: 6 directions`)
  for (const d of directions) {
    assert.equal(d.composition, composition, `${structure}: composition locked`)
    assert.equal(d.navigation, 'bottom-tabs', `${structure}: mobile nav`)
  }
  const ir = buildDesignCanvasIR(directions[0], req)
  const roles = shellRoles(ir)
  assert.ok(roles.includes('app-header'), `${structure}: header node`)
  assert.ok(roles.includes('bottom-tabs'), `${structure}: bottom app bar node`)
  assert.ok(!roles.includes('sidebar'), `${structure}: no LNB on mobile`)
  // 헤더는 최상단, 하단바는 최하단
  const header = ir.nodes.find(n => n.role === 'app-header')
  const tabbar = ir.nodes.find(n => n.role === 'bottom-tabs')
  assert.equal(header.y, 0, `${structure}: header at top`)
  assert.equal(tabbar.y + tabbar.height, ir.height, `${structure}: tabbar at bottom`)
}

// ── 웹: navigation(셸) 고정, composition은 풀 안에서만 ──────────────────────
for (const [structure, navigation, pool] of WEB_CASES) {
  const req = { brief: 'x', platform: 'web', structure }
  const directions = await generateDesignDirections(req, boom)
  assert.equal(directions.length, 6, `${structure}: 6 directions`)
  for (const d of directions) {
    assert.equal(d.navigation, navigation, `${structure}: web shell locked`)
    assert.ok(pool.includes(d.composition), `${structure}: composition in pool (${d.composition})`)
  }
  const ir = buildDesignCanvasIR(directions[0], req)
  const roles = shellRoles(ir)
  assert.ok(roles.includes('footer'), `${structure}: footer node`)
  if (navigation === 'sidebar') {
    assert.ok(roles.includes('sidebar') && !roles.includes('top-bar'), `${structure}: LNB only`)
  } else if (navigation === 'top-and-side') {
    assert.ok(roles.includes('sidebar') && roles.includes('top-bar'), `${structure}: GNB + LNB`)
  } else {
    assert.ok(roles.includes('top-bar') && !roles.includes('sidebar'), `${structure}: GNB only`)
  }
}

// ── 6개 방향이 실제로 서로 다르다 (밀도/미디어/흐름) ───────────────────────
{
  const directions = await generateDesignDirections({ brief: 'x', platform: 'mobile', structure: 'app-card' }, boom)
  const fingerprints = new Set(directions.map(d => `${d.density}|${d.mediaMode}|${d.signatureMove}`))
  assert.ok(fingerprints.size >= 4, `app-card: 6 방향이 최소 4가지로 갈린다 (got ${fingerprints.size})`)
}

console.log('Structure lock carries composition/shell into every direction + wireframe.')
