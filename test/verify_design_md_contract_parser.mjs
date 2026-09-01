import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseFencedDesignContract, assertAideContractParse } from '../src/lib/design-md-contract.ts'

const aideSource = fs.readFileSync('src/lib/design-systems/aide.md', 'utf8')
const originalWarn = console.warn

// Test 1: Valid aide.md parses without warnings
let warningCount = 0
console.warn = (msg) => {
  if (msg.includes('[design-md-contract]')) warningCount++
  originalWarn(msg)
}

const parsed = parseFencedDesignContract(aideSource)
assert.ok(parsed, 'aide.md must parse successfully')
assert.ok(parsed.colors && Object.keys(parsed.colors).length > 0, 'aide.md must have colors')
assert.ok(parsed.spacing && Object.keys(parsed.spacing).length > 0, 'aide.md must have spacing')
assert.ok(parsed.layout && Object.keys(parsed.layout).length > 0, 'aide.md must have layout values from responsive.modes')
assert.ok(parsed.typography && Object.keys(parsed.typography).length > 0, 'aide.md must have typography scales')
assert.equal(warningCount, 0, 'valid aide.md must not trigger empty-parent warnings')

console.warn = originalWarn

// Test 2: Assert function passes on valid aide.md
try {
  assertAideContractParse(aideSource)
} catch (e) {
  assert.fail(`assertAideContractParse should not throw on valid aide.md: ${e.message}`)
}

// Test 3: Minimal valid contract (baseline)
const minimalValid = `
\`\`\`yaml
contract:
  tokens:
    color:
      primary:
        $value: '#000000'
    dimension:
      space-4:
        $value: 4px
    radius: {}
    shadow: {}
    typography: {}
  responsive:
    modes:
      compact:
        page-padding: 16px
    grid:
      gutter: 20px
\`\`\`
`
const minimalParsed = parseFencedDesignContract(minimalValid)
assert.ok(minimalParsed, 'minimal valid contract must parse')
assert.ok(minimalParsed.layout['page-padding'] === '16px', 'must extract page-padding from responsive.modes.compact')

// Test 4: Warn-only on customer DESIGN.md with empty responsive.modes (typo key)
const customerWithTypo = `
\`\`\`yaml
contract:
  tokens:
    color:
      primary:
        $value: '#000000'
    dimension: {}
    radius: {}
    shadow: {}
    typography: {}
  responsive:
    modes:
      compact:
        wrong-key-padding: 16px
    grid:
      gutter: 20px
\`\`\`
`
warningCount = 0
console.warn = (msg) => {
  if (msg.includes('[design-md-contract]')) warningCount++
  originalWarn(msg)
}
const parsedTypo = parseFencedDesignContract(customerWithTypo)
assert.ok(parsedTypo, 'customer DESIGN.md with typo must parse (warn-only)')
assert.ok(warningCount > 0, 'should warn when responsive.modes produces no layout values')

console.warn = originalWarn

// Test 5: Assert throws on responsive.modes present but empty
const brokenResponsive = `
\`\`\`yaml
contract:
  tokens:
    color: {}
    dimension: {}
    radius: {}
    shadow: {}
    typography: {}
  responsive:
    modes:
      compact:
        broken-key: 16px
    grid:
      gutter: 20px
\`\`\`
`
try {
  assertAideContractParse(brokenResponsive)
  assert.fail('should throw when responsive.modes is present but produces no layout values')
} catch (e) {
  assert.ok(e.message.includes('responsive.modes'), 'error must mention responsive.modes')
}

// Test 6: Assert throws on typography present but empty (all invalid scales)
const brokenTypography = `
\`\`\`yaml
contract:
  tokens:
    color: {}
    dimension: {}
    radius: {}
    shadow: {}
    typography:
      headline:
        description: no $value here
      body:
        $value:
          notFontSize: 16px
  responsive:
    modes:
      compact:
        page-padding: 16px
    grid:
      gutter: 20px
\`\`\`
`
try {
  assertAideContractParse(brokenTypography)
  assert.fail('should throw when typography is present but produces no valid scales')
} catch (e) {
  assert.ok(e.message.includes('typography'), 'error must mention typography')
}

console.log('design-md-contract parser verification passed')
