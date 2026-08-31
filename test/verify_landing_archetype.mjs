import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const archetypes = readFileSync(new URL('../src/lib/layout-archetypes.ts', import.meta.url), 'utf8')
const designIntel = readFileSync(new URL('../src/lib/design-intelligence.ts', import.meta.url), 'utf8')

// 1. 랜딩 아키타입이 ARCHETYPE_POOL에 있는가
assert.match(archetypes, /['"]brand-landing['"]:/)
assert.match(archetypes, /['"]product-showcase['"]:/)
console.log('✓ Landing archetypes (brand-landing, product-showcase) exist in ARCHETYPE_POOL')

// 2. 랜딩 아키타입이 forbid 조건에 sideNav와 bottomNav를 포함하는가
assert.match(archetypes, /forbid:.*['"]side navigation['"]/)
assert.match(archetypes, /forbid:.*['"]bottom navigation['"]/)
console.log('✓ Landing archetypes forbid side navigation and bottom navigation')

// 3. LANDING_ARCHETYPES 풀이 정의되어 있는가
assert.match(archetypes, /const LANDING_ARCHETYPES/)
assert.match(archetypes, /LANDING_ARCHETYPES:\s*Record<['"]A['"].*['"]C['"]/)
console.log('✓ LANDING_ARCHETYPES constant defined for A/B/C variants')

// 4. assignVariantArchetypes 함수가 isLandingIntent 파라미터를 받는가
assert.match(archetypes, /export function assignVariantArchetypes\([^)]*isLandingIntent/)
console.log('✓ assignVariantArchetypes accepts isLandingIntent parameter')

// 5. assignVariantArchetypes가 랜딩 의도일 때 LANDING_ARCHETYPES를 사용하는가
assert.match(archetypes, /if \(isLandingIntent\)/)
assert.match(archetypes, /LANDING_ARCHETYPES\[slot\]/)
console.log('✓ assignVariantArchetypes uses LANDING_ARCHETYPES when isLandingIntent is true')

// 6. buildVariantStructures가 isLandingIntent 파라미터를 받는가
assert.match(archetypes, /isLandingIntent\?:\s*boolean/)
console.log('✓ buildVariantStructures accepts isLandingIntent parameter')

// 7. buildVariantStructures가 랜딩 의도일 때 sideNav를 false로 강제하는가
assert.match(archetypes, /const sideNav = args\.isLandingIntent \? false/)
console.log('✓ buildVariantStructures forces sideNav to false for landing intent')

// 8. buildVariantStructures의 chrome 객체가 bottomNav를 랜딩 의도에 따라 설정하는가
assert.match(archetypes, /bottomNav: args\.isLandingIntent \? false/)
console.log('✓ buildVariantStructures forces bottomNav to false for landing intent')

// 9. 디자인 인텔리전스에서 detectLandingIntent 함수가 정의되어 있는가
assert.match(designIntel, /export function detectLandingIntent/)
console.log('✓ detectLandingIntent function exported from design-intelligence')

// 10. 디자인 인텔리전스에서 랜딩 의도를 감지하는 키워드가 포함되어 있는가
assert.match(designIntel, /랜딩|landing page|brand site/)
console.log('✓ detectLandingIntent includes landing-related keywords')

// 11. buildDesignIntelligencePlan에서 detectLandingIntent를 호출하는가
assert.match(designIntel, /const isLandingIntent = detectLandingIntent\(/)
console.log('✓ buildDesignIntelligencePlan calls detectLandingIntent')

// 12. buildDesignIntelligencePlan에서 isLandingIntent를 assignVariantArchetypes에 전달하는가
assert.match(designIntel, /assignVariantArchetypes.*isLandingIntent/)
console.log('✓ buildDesignIntelligencePlan passes isLandingIntent to assignVariantArchetypes')

// 13. buildDesignIntelligencePlan에서 isLandingIntent를 buildVariantStructures에 전달하는가
assert.match(designIntel, /isLandingIntent,/)
console.log('✓ buildDesignIntelligencePlan passes isLandingIntent to buildVariantStructures')

console.log('\n✅ All landing archetype tests passed!')
