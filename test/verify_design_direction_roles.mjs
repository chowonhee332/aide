import assert from 'node:assert/strict'
import { selectDirectionsForVisualRoles } from '../src/lib/design-direction.ts'

const base = {
  userFeeling: '명확함', density: 'balanced', navigation: 'bottom-tabs',
  focalPoint: '핵심', primaryAction: '시작', sectionFlow: ['핵심'],
  paletteIntent: '계약 토큰', typographyIntent: '제품형', signatureMove: '고유 구조', avoid: [],
}
const directions = [
  { ...base, id: 'photo', name: '에디토리얼', thesis: '실사 탐색', composition: 'editorial', mediaMode: 'photo' },
  { ...base, id: 'data', name: '데이터 보드', thesis: '정보 판단', composition: 'dashboard', mediaMode: 'data' },
  { ...base, id: '3d', name: '몰입 스테이지', thesis: '장면 몰입', composition: 'immersive', mediaMode: 'illustration' },
  { ...base, id: 'generic-1', name: '일반 피드', thesis: '일반', composition: 'feed', mediaMode: 'none' },
  { ...base, id: 'generic-2', name: '일반 가이드', thesis: '일반', composition: 'guided', mediaMode: 'none' },
  { ...base, id: 'generic-3', name: '일반 작업', thesis: '일반', composition: 'workspace', mediaMode: 'none' },
]

const selected = selectDirectionsForVisualRoles(directions, ['data', '3d', 'photo'])
assert.deepEqual(selected.map(direction => direction.id), ['data', '3d', 'photo'])
assert.equal(new Set(selected.map(direction => direction.id)).size, 3)

console.log('Design directions align with A/B/C visual roles.')
