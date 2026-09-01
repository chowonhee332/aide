import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const intelligence = readFileSync(new URL('../src/lib/design-intelligence.ts', import.meta.url), 'utf8')
const gemini = readFileSync(new URL('../src/lib/gemini.ts', import.meta.url), 'utf8')
const studio = readFileSync(new URL('../src/components/StudioView.tsx', import.meta.url), 'utf8')

// Ensures sharedMustShow array is defined and used exactly 3 times for A/B/C variants
assert.match(intelligence, /const sharedMustShow = \[/)
assert.equal((intelligence.match(/mustShow: sharedMustShow/g) ?? []).length, 3)

// Ensures the design prompt documents shared content contract (uses substring matching instead of exact text)
assert.match(gemini, /contentInventory.*A\/B\/C.*공통/)
assert.match(gemini, /콘텐츠.*집합/)
assert.match(gemini, /팔레트.*hex/)

// Ensures studio card renders token reference section
assert.match(studio, /Token Reference/)

// Ensures studio displays tokens and their approximate components (allows text variation in display format)
assert.match(studio, /토큰.*컴포넌트/)

// Ensures studio card body has color, typography, and component bands (allows header text variation)
assert.match(studio, /색상.*타이포.*컴포넌트/)
assert.match(studio, /색상/)
assert.match(studio, /타이포그래피/)

console.log('shared variant content and token preview contract verified')
