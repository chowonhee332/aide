#!/usr/bin/env node
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

// All test scripts in execution order
const tests = [
  'test/verify_prompt_contracts.mjs',
  'test/verify_prompt_budget.mjs',
  'test/verify_model_routing.mjs',
  'test/verify_sales_input_history.mjs',
  'test/verify_unified_aide_design_system.mjs',
  ['NODE_NO_WARNINGS=1 node', 'test/verify_design_md_contract_parser.mjs'],
  'test/verify_shared_variant_content.mjs',
  'test/verify_asis_shell_contract.mjs',
  'test/verify_service_subtype.mjs',
  'test/verify_hero_object_scale.mjs',
  'test/verify_landing_archetype.mjs',
  'test/verify_desk_research.mjs',
  'test/verify_design_preset_contract.mjs',
  ['NODE_NO_WARNINGS=1 node', 'test/verify_platform_baseline.mjs'],
  ['NODE_NO_WARNINGS=1 node --experimental-strip-types', 'test/verify_design_direction_roles.mjs'],
  ['NODE_NO_WARNINGS=1 node --experimental-strip-types', 'test/verify_direction_structure_lock.mjs'],
  ['NODE_NO_WARNINGS=1 node --experimental-strip-types', 'test/verify_structure_to_archetype.mjs'],
  'scripts/check-studio-contract.mjs'
]

const results = []
let failureCount = 0

console.log(`Running ${tests.length} test scripts...\n`)

for (const test of tests) {
  const [prefix, script] = Array.isArray(test) ? test : [null, test]
  const cmd = prefix ? `${prefix} ${script}` : `node ${script}`
  const testName = Array.isArray(test) ? test[1] : test

  try {
    execSync(cmd, { cwd: projectRoot, stdio: 'inherit' })
    results.push(`✓ ${testName}`)
  } catch {
    results.push(`✗ ${testName}`)
    failureCount++
  }
}

console.log('\n' + '='.repeat(60))
console.log('Test Results:')
console.log('='.repeat(60))
results.forEach(r => console.log(r))
console.log('='.repeat(60))

if (failureCount > 0) {
  console.log(`\n${failureCount}/${tests.length} test(s) failed.`)
  process.exit(1)
} else {
  console.log(`\nAll ${tests.length} test(s) passed.`)
  process.exit(0)
}
