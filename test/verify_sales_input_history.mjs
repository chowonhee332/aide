import fs from 'node:fs'

const landing = fs.readFileSync('src/app/page.tsx', 'utf8')
const studio = fs.readFileSync('src/components/StudioView.tsx', 'utf8')
const history = fs.readFileSync('src/lib/history.ts', 'utf8')
const failures = []

if (!landing.includes('어떤 화면이 필요한가요?')) failures.push('landing must lead with one natural-language request')
if (!landing.includes('상세 입력 <span')) failures.push('detailed fields must remain optional and collapsible')
if (!landing.includes("e.metaKey || e.ctrlKey")) failures.push('primary prompt must submit with Cmd/Ctrl+Enter')
if (!landing.includes('Enter로 줄바꿈 · Cmd/Ctrl+Enter로 생성')) failures.push('keyboard guidance must match actual behavior')
if (!landing.includes('사용자 요청:\\n')) failures.push('the primary request must retain a semantic label in the model brief')

if (!history.includes("stage?: 'variants-ready' | 'prototype-ready'")) failures.push('history must persist the workflow stage')
if (!studio.includes("setStep(restoredStage === 'prototype-ready' ? 4 : 3)")) failures.push('history restore must return to the exact next step')
if (!studio.includes("image: variant.image ? await compressThumbnail(variant.image) : undefined")) failures.push('A/B/C previews must be compressed before persistence')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Sales prompt and resumable A/B/C history contracts passed.')
