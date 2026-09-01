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

// Ensures studio card body is the 4-column token grid (color swatches · typography · components ×2)
assert.match(studio, /gridTemplateColumns: '175px 140px 1fr 1fr', gap: 1/)
assert.equal((studio.match(/flexDirection: 'column', gap: 1/g) ?? []).length >= 4, true)

console.log('shared variant content and token preview contract verified')
