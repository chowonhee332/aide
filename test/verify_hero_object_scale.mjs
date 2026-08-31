import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const gemini = readFileSync(new URL('../src/lib/gemini.ts', import.meta.url), 'utf8')

// 결정론 히어로 스케일 가드가 존재하고 체인에 연결돼 있다.
assert.match(gemini, /function injectHeroObjectScale\(/)
assert.match(gemini, /html = injectHeroObjectScale\(html, effectiveVisualPolicy\)/)
// ensureRequiredVariantVisuals 바로 뒤에 온다.
assert.match(gemini, /ensureRequiredVariantVisuals\([\s\S]{0,200}?\n\s*html = injectHeroObjectScale\(/)

// 3D 오브젝트 정책에서만 동작, 카드 표지(scene-3d-card-cover)는 제외.
assert.match(gemini, /visualPolicy !== 'creon-object-3d' && visualPolicy !== 'scene-3d'\) return html/)

// 가드 스타일: 히어로 이미지를 중앙·contain·크게 (!important 로 모델 인라인 override).
assert.match(gemini, /data-aide-hero-scale="1"/)
assert.match(gemini, /img\.aide-hero-3d[^{]*\{[\s\S]*?object-fit:contain!important/)
assert.match(gemini, /width:min\(100%,560px\)!important/)
assert.match(gemini, /min-height:clamp\(320px,44vw,480px\)/)

// 주입 기본 스테이지가 더 이상 우측 하단 코너 장식이 아니다.
assert.doesNotMatch(gemini, /aide-3d-asset" src="\$\{requiredPlaceholder\}"[^>]*right:-6%/)
assert.match(gemini, /data-aide-required-visual="creon-object-3d"[^>]*min-height:clamp\(320px,44vw,480px\)/)

console.log('hero object scale guard verified')
