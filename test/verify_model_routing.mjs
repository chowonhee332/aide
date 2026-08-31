import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const gemini = read('src/lib/gemini.ts')
const generate = read('src/app/api/generate/route.ts')
const expand = read('src/app/api/expand/route.ts')
const directions = read('src/app/api/generate-directions/route.ts')
const refine = read('src/app/api/refine/route.ts')
const policy = read('src/lib/gemini-model-policy.ts')
const landing = read('src/app/page.tsx')
const studio = read('src/components/StudioView.tsx')

const failures = []
if (!gemini.includes('modelId = GEMINI_DESIGN_MODEL')) failures.push('A/B/C generation must default to the design model')
if (!gemini.includes('domain, GEMINI_ECONOMY_MODEL)')) failures.push('automatic structure repair must use the economy model')
if (!generate.includes('modelId: params.modelId || GEMINI_DESIGN_MODEL')) failures.push('generate API must reserve the design model for initial HTML')
if (!expand.includes('modelId: GEMINI_ECONOMY_MODEL')) failures.push('prototype expansion must force the economy model')
if (!directions.includes('GEMINI_ECONOMY_MODEL')) failures.push('direction generation must use the economy model')
if (!refine.includes('GEMINI_ECONOMY_MODEL')) failures.push('conversational refinement must use the economy model by default')
if (!policy.includes("GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image'")) failures.push('proposal imagery must use the Flash image model (no pro-image)')
if (policy.includes('GEMINI_DESIGN_MODEL_PRO_EXPERIMENT')) failures.push('the A-variant Pro experiment constant must be removed once reverted to Flash')
if (studio.includes('PRO_EXPERIMENT')) failures.push('studio must not route the A variant to the Pro experiment model')
if (!policy.includes("GEMINI_IMAGE_SIZE = '2K'")) failures.push('core proposal imagery must request 2K output')
if (!gemini.includes('.webp({')) failures.push('generated proposal imagery must be optimized to WebP for UI delivery')
if (landing.includes('Gemini 3.7 Flash') || landing.includes('modelDropOpen')) failures.push('landing must not expose a manual model selector')
if (studio.includes("sessionStorage.getItem('aide_model')")) failures.push('studio must use fixed function routing instead of a stored manual model')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Gemini routing keeps the design model limited to initial design composition.')
