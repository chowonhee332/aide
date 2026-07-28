/**
 * Shared `{group.token}` alias resolution for the design contracts.
 *
 * Two compilers consume this:
 * - `src/lib/aide-product-tokens.ts` (webpack, runtime `--aui-*` injection)
 * - `scripts/design-system.mjs` (node, `design:lint` / `design:export`)
 *
 * Keeping one implementation is what stops the two from drifting apart. The file
 * holds pure functions only — no contract loading — and is authored as ESM
 * JavaScript with JSDoc types so both Node and TypeScript consume it natively.
 */

export const TOKEN_ALIAS = /\{([a-zA-Z0-9_.-]+)\}/g

/**
 * A DTCG token leaf: anything carrying `$value`.
 * @typedef {{ $value: unknown, $description?: string }} TokenLeaf
 */

/**
 * @typedef {object} ResolveOptions
 * @property {string[]} [skipAliases] Aliases to leave as literal text. The contracts
 *   document their own syntax with `alias_syntax: "{group.token}"`, which is prose,
 *   not a reference.
 * @property {string} [label] Prefix for thrown errors so the failing contract is identifiable.
 */

/**
 * @param {unknown} node
 * @returns {node is TokenLeaf}
 */
export function isLeaf(node) {
  return typeof node === 'object' && node !== null && '$value' in node
}

/**
 * Follow a dotted path and unwrap a `$value` leaf if that is where it lands.
 * @param {Record<string, unknown>} root
 * @param {string} path
 * @returns {unknown}
 */
export function valueAtPath(root, path) {
  /** @type {unknown} */
  let current = root
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null || !(segment in current)) return undefined
    current = /** @type {Record<string, unknown>} */ (current)[segment]
  }
  return isLeaf(current) ? current.$value : current
}

/**
 * Replace every `{group.token}` with its resolved value, recursively.
 * A string that is exactly one alias adopts the target's type instead of being
 * stringified, so numeric and object tokens survive aliasing.
 *
 * @param {unknown} value
 * @param {Record<string, unknown>} roots
 * @param {ResolveOptions} [options]
 * @param {string[]} [stack]
 * @returns {unknown}
 */
export function resolveAliases(value, roots, options = {}, stack = []) {
  const { skipAliases = [], label = 'design contract' } = options

  if (Array.isArray(value)) return value.map((item) => resolveAliases(item, roots, options, stack))
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, resolveAliases(child, roots, options, stack)]),
    )
  }
  if (typeof value !== 'string') return value

  const aliases = [...value.matchAll(TOKEN_ALIAS)]
  if (!aliases.length) return value

  let resolved = value
  for (const match of aliases) {
    const alias = match[1]
    if (skipAliases.includes(alias)) continue
    if (stack.includes(alias)) {
      throw new Error(`${label}: circular token alias: ${[...stack, alias].join(' -> ')}`)
    }
    const target = valueAtPath(roots, alias)
    if (target === undefined) throw new Error(`${label}: unresolved token alias: {${alias}}`)

    const next = resolveAliases(target, roots, options, [...stack, alias])
    if (value === match[0] && typeof next !== 'string') return next
    resolved = resolved.replace(match[0], String(next))
  }
  return resolved
}
