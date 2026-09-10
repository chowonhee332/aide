import assert from 'node:assert/strict'
import { buildDemoMemoryGraph, MEMORY_DOMAINS } from '../src/lib/memory-graph.ts'

const first = buildDemoMemoryGraph()
const second = buildDemoMemoryGraph()

assert.equal(first.nodes.length, 840, 'demo memory graph must exercise a realistically dense node set')
assert.ok(first.edges.length > first.nodes.length, 'graph must include more than a simple tree of relationships')
assert.equal(new Set(first.nodes.map(node => node.id)).size, first.nodes.length, 'memory node IDs must be unique')
assert.deepEqual(first, second, 'demo graph must be deterministic across renders')

for (const domain of MEMORY_DOMAINS) {
  assert.equal(first.nodes.filter(node => node.domain === domain.id).length, 120, `${domain.id} must have an equal demo cluster`)
}

for (const edge of first.edges) {
  assert.ok(first.nodes.some(node => node.id === edge.source), `missing source node: ${edge.source}`)
  assert.ok(first.nodes.some(node => node.id === edge.target), `missing target node: ${edge.target}`)
}

console.log('Memory graph verification passed.')

