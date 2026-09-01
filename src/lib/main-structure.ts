import type {
  CanvasComposition,
  CanvasNavigation,
  CanvasPlatform,
  DesignCanvasIR,
  DesignDirection,
} from './design-canvas-ir'
import { buildDesignCanvasIR } from './design-canvas-renderer'
import { ARCHETYPE_POOL, bestArchetypeFor, type AuthoredStructure } from './layout-archetypes'

/**
 * 설문의 "메인 구조" — 고정 목록이 아니라 분석 단계에서 LLM이 이 서비스 전용으로
 * 작성한 AuthoredStructure 5개다(gemini.ts serviceAnalysis.authoredStructures).
 * 이 모듈은 그중 사용자가 고른 3개를 생성 파이프라인(아키타입 · variantStructures ·
 * precomputedDesignIntentPlan)으로 잇는다.
 */

/** 설문 답(구조 이름) → 원본 AuthoredStructure. */
export function authoredFromAnswer(
  name: string | undefined,
  pool: readonly AuthoredStructure[] | undefined,
): AuthoredStructure | null {
  if (!name || !pool) return null
  return pool.find(structure => structure.name === name.trim()) ?? null
}

// A=정보형 · B=전환형 · C=탐색형 — bestArchetypeFor가 교집합 0일 때만 쓰는 슬롯 기본값.
const SLOT_FALLBACK_ARCHETYPE: [string, string, string] = ['kpi-dashboard', 'object-hero', 'magazine-editorial']

const CONTENT_PATTERN_TO_COMPOSITION: Record<string, CanvasComposition> = {
  'dense-list': 'dashboard',
  'two-col-grid': 'editorial',
  bento: 'dashboard',
  feed: 'feed',
  'rail-stack': 'carousel',
  timeline: 'dashboard',
  comparison: 'dashboard',
  widgets: 'workspace',
  form: 'guided',
}

function navFor(authored: AuthoredStructure, platform: CanvasPlatform): CanvasNavigation {
  if (platform !== 'web') return 'bottom-tabs'
  return authored.nav ?? 'top-bar'
}

export interface PickedStructurePlan {
  authored: [AuthoredStructure, AuthoredStructure, AuthoredStructure]
  archetypeIds: [string, string, string]
  authoredRecipes: Record<'A' | 'B' | 'C', string[]>
  densityByVariant: Record<'A' | 'B' | 'C', AuthoredStructure['density']>
  sideNavByVariant: Record<'A' | 'B' | 'C', boolean>
}

/** 설문에서 고른 구조 이름 3개(순서 = A·B·C) → 생성 계획. 3개 미만/미매칭이면 null. */
export function pickedStructurePlan(
  pickedNames: readonly string[] | undefined,
  authoredPool: readonly AuthoredStructure[] | undefined,
): PickedStructurePlan | null {
  if (!pickedNames || pickedNames.length < 3 || !authoredPool) return null
  const picked = pickedNames.slice(0, 3).map(name => authoredFromAnswer(name, authoredPool))
  if (picked.some(structure => !structure)) return null
  const authored = picked as [AuthoredStructure, AuthoredStructure, AuthoredStructure]
  const keys = ['A', 'B', 'C'] as const
  const archetypeIds = authored.map((structure, i) =>
    bestArchetypeFor(structure.sections, SLOT_FALLBACK_ARCHETYPE[i]),
  ) as [string, string, string]

  return {
    authored,
    archetypeIds,
    authoredRecipes: Object.fromEntries(keys.map((k, i) => [k, authored[i].sections])) as PickedStructurePlan['authoredRecipes'],
    densityByVariant: Object.fromEntries(keys.map((k, i) => [k, authored[i].density])) as PickedStructurePlan['densityByVariant'],
    sideNavByVariant: Object.fromEntries(
      keys.map((k, i) => [k, authored[i].nav === 'sidebar' || authored[i].nav === 'top-and-side']),
    ) as PickedStructurePlan['sideNavByVariant'],
  }
}

const CAROUSEL_LIKE = new Set<CanvasComposition>(['carousel', 'immersive', 'editorial'])

/** 고른 구조 → A/B/C 한 자리에 넣을 결정론 DesignDirection (precomputedDesignIntentPlan 용). */
export function directionFromStructure(
  authored: AuthoredStructure,
  index: number,
  platform: CanvasPlatform,
  fallbackArchetypeId: string = SLOT_FALLBACK_ARCHETYPE[index % 3],
): DesignDirection {
  const archetype = ARCHETYPE_POOL[bestArchetypeFor(authored.sections, fallbackArchetypeId)]
  const composition = CONTENT_PATTERN_TO_COMPOSITION[archetype.contentPattern] ?? 'dashboard'
  return {
    id: `direction-${index + 1}`,
    name: authored.name,
    thesis: authored.reason || authored.name,
    userFeeling: '',
    composition,
    density: authored.density,
    mediaMode: CAROUSEL_LIKE.has(composition) ? 'illustration' : 'none',
    navigation: navFor(authored, platform),
    focalPoint: '',
    primaryAction: '시작하기',
    sectionFlow: authored.sections,
    paletteIntent: '',
    typographyIntent: '',
    signatureMove: archetype.description,
    avoid: archetype.forbid,
  }
}

/** 설문 카드 미리보기용 대표 캔버스 — 최종 시안이 아니라 뼈대 스케치. */
export function previewCanvasForStructure(authored: AuthoredStructure, platform: CanvasPlatform): DesignCanvasIR {
  const direction = directionFromStructure(authored, 0, platform)
  return buildDesignCanvasIR(direction, { brief: direction.name, projectSummary: direction.name, platform })
}
