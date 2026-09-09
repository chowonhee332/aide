import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const boundary = new Error('OFFLINE_MODEL_BOUNDARY')
const calls = []
const cache = new Map()
const blocked = () => { throw new Error('Network/write is forbidden in methodology tests') }
const readOnlyFs = Object.fromEntries(
  Object.keys(fs).map(key => [key, /^(read|exists|stat|lstat|realpath|access)/.test(key) || key === 'constants' ? fs[key] : blocked]),
)

// Transpile into memory only. Mirror webpack's existing asset/source handling
// for MD, execute real local modules, and stop at the Google SDK boundary.
function load(filename) {
  if (filename.endsWith('.md')) return fs.readFileSync(filename, 'utf8')
  if (cache.has(filename)) return cache.get(filename).exports
  const loadedModule = { exports: {} }
  cache.set(filename, loadedModule)
  const nativeRequire = createRequire(filename)
  const require = id => {
    if (id === '@google/genai') return {
      GoogleGenAI: class {
        models = {
          generateContentStream: async args => { calls.push(args); throw boundary },
          generateContent: async args => { calls.push(args); throw boundary },
        }
      },
    }
    if (id === 'fs' || id === 'node:fs') return readOnlyFs
    if (/^(?:node:)?(?:https?|net|tls|child_process)$/.test(id)) return new Proxy({}, { get: () => blocked })
    if (id.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), id)
      const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.json`].find(p => fs.existsSync(p) && fs.statSync(p).isFile())
      assert.ok(resolved, `Cannot resolve ${id} from ${filename}`)
      if (/\.(?:ts|tsx|md)$/.test(resolved)) return load(resolved)
      return nativeRequire(resolved)
    }
    return nativeRequire(id)
  }
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText
  vm.runInNewContext(compiled, {
    module: loadedModule, exports: loadedModule.exports, require,
    process: { env: {}, cwd: () => root }, Buffer, URL, Error,
    console: { log() {}, warn() {}, error() {} },
    fetch: blocked, setTimeout: blocked, clearTimeout() {},
  }, { filename })
  return loadedModule.exports
}

const methods = load(path.join(root, 'src/lib/generation-methodology.ts'))
const stages = ['analysis', 'composition', 'image', 'review', 'expansion']
let total = 0
for (const stage of stages) {
  const source = fs.readFileSync(path.join(root, `src/lib/generation-methods/${stage}.md`), 'utf8')
  const prompt = methods.getGenerationMethodology(stage)
  assert.match(prompt, new RegExp(`^## Aide methodology ${stage}@1`))
  assert.equal(methods.compileGenerationMethod(stage, `\uFEFF${source.replace(/\n/g, '\r\n')}`), prompt)
  assert.ok(prompt.length <= methods.GENERATION_METHOD_LIMITS[stage])
  assert.doesNotMatch(prompt, /#[a-f\d]{6}\b|\b\d+px\b/i, 'methodology must not duplicate tokens')
  assert.throws(() => methods.compileGenerationMethod(stage, source.replace(` ${stage}@1`, ' wrong@1')), /Invalid id/)
  assert.throws(() => methods.compileGenerationMethod(stage, source.replace('@1', '@0')), /Invalid id/)
  for (const section of ['Input', 'Method', 'Output', 'Guardrails']) {
    assert.throws(() => methods.compileGenerationMethod(stage, source.replace(`## ${section}`, '## Missing')), /Missing/)
  }
  assert.throws(() => methods.compileGenerationMethod(stage, source + 'x'.repeat(5000)), /budget/)
  total += prompt.length
}
assert.ok(total <= 5000, 'aggregate methodology character budget exceeded (not a token count)')
assert.throws(() => methods.getGenerationMethodology('../analysis'), /Unknown stage/)
assert.throws(() => methods.getGenerationMethodology('toString'), /Unknown stage/)
assert.throws(() => methods.compileGenerationMethod('unknown', ''), /Unknown stage/)
assert.throws(() => methods.compileGenerationMethod('analysis', ''), /Invalid id/)

const gemini = load(path.join(root, 'src/lib/gemini.ts'))
const params = {
  designMd: '', brief: 'VOC 문의 처리 웹 대시보드', answers: {},
  projectSummary: '문의 처리', platform: 'web', domain: 'business', mainOnly: true,
  visualPolicy: 'no-image',
}
function promptText(call) {
  if (typeof call.contents === 'string') return call.contents
  const contents = Array.isArray(call.contents) ? call.contents : [call.contents]
  return contents.flatMap(c => c.parts ?? []).map(p => p.text ?? '').join('\n')
}
function checkStage(prompt, stage) {
  assert.deepEqual([...prompt.matchAll(/## Aide methodology ([a-z]+)@\d+/g)].map(m => m[1]), [stage])
}
async function checkCall(stage, operation, catches = false) {
  calls.length = 0
  if (catches) assert.equal(await operation(), null)
  else await assert.rejects(operation, /OFFLINE_MODEL_BOUNDARY/)
  assert.equal(calls.length, 1, `${stage} must not add a model call or retry`)
  const prompt = promptText(calls[0])
  checkStage(prompt, stage)
  return prompt
}

const analysisPrompt = await checkCall('analysis', () => gemini.analyzeAndGenerateQuestions('', params.brief, 'web'))
assert.match(analysisPrompt, /"serviceAnalysis"/)
assert.match(analysisPrompt, /"authoredStructures"/)
assert.doesNotMatch(analysisPrompt, /아래 false 조건을 읽지 마라/)
const compositionPrompt = await checkCall('composition', () => gemini.generateUI(params))
// The composition MD owns the "follow the chosen structure" stance. The large
// prompt must not re-add the unconditional three-zone mandate it contradicts.
assert.doesNotMatch(compositionPrompt, /화면을 반드시 3개 영역|12컬럼 기반의 가로 밀도/)
assert.doesNotMatch(compositionPrompt, /화면을 3개 영역으로 나눈다|반드시 3개 이상의 의미 있는 영역으로 구성/)
assert.match(compositionPrompt, /확정 골격을 바꾸지 않는다/)
await checkCall('image', () => gemini.generateHeroImage('a ceramic cup', undefined, 'scene'), true)
assert.equal(calls[0].config.responseModalities[0], 'IMAGE')
assert.equal(calls[0].config.imageConfig.aspectRatio, '16:9')
await checkCall('image', () => gemini.generateHeroImage('a ceramic cup', undefined, 'scene-card-cover'), true)
assert.equal(calls[0].config.imageConfig.aspectRatio, '3:4')
await checkCall('image', () => gemini.generateHeroImage('a ceramic cup', undefined, 'transparent'), true)
assert.equal(calls[0].config.imageConfig.aspectRatio, '1:1')
const expectedReferences = [1, 2, 3]
  .map(i => path.join(root, `src/lib/creon-refs/reference_${i}.png`))
  .filter(file => fs.existsSync(file))
  .map(file => fs.readFileSync(file).toString('base64'))
assert.deepEqual(Array.from(calls[0].contents.parts.filter(p => p.inlineData), p => p.inlineData.data), expectedReferences)
const mainHtml = '<html><head></head><body><main>선택한 화면</main></body></html>'
const expansionPrompt = await checkCall('expansion', () => gemini.expandToPrototype(mainHtml, params))
assert.ok(expansionPrompt.includes(mainHtml), 'selected HTML must still be passed unchanged when it has no embedded images')

const reviewer = load(path.join(root, 'src/lib/design-visual-review.ts'))
let reviewCalls = 0
const result = await reviewer.reviewDesignScreenshot({
  screenshotBase64: 'fixture', html: '<div class="content">문의</div>', platform: 'web',
  generateVision: async (prompt, image) => {
    reviewCalls++
    checkStage(prompt, 'review')
    assert.match(prompt, /반드시 DOM 인벤토리에 있는 class/)
    assert.equal(image, 'fixture')
    return JSON.stringify({ score: 90, needsPatch: false, summary: '국소 문제 없음', issues: [], cssPatch: '' })
  },
})
assert.equal(reviewCalls, 1)
assert.equal(result.needsPatch, false)
assert.equal(reviewer.injectVisualReviewCss(mainHtml, result), mainHtml)
console.log(`Generation methodology: 5 real call sites isolated, validation and ${total}-character aggregate budget passed; no network/model execution.`)
