import { NextRequest, NextResponse } from 'next/server'
import { generatePro } from '@/lib/gemini'
import { GEMINI_ECONOMY_MODEL } from '@/lib/gemini-model-policy'
import { generateDesignDirections, selectDirectionsForVisualRoles, selectDiverseDirections } from '@/lib/design-direction'
import type { DesignDirectionRequest } from '@/lib/design-canvas-ir'
import { buildDesignCanvasIR } from '@/lib/design-canvas-renderer'

export const maxDuration = 120

function isRequest(value: unknown): value is DesignDirectionRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, unknown>
  return typeof request.brief === 'string'
    && request.brief.trim().length > 0
    && (request.platform === 'mobile' || request.platform === 'web')
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    if (!isRequest(body)) {
      return NextResponse.json({ error: '서비스 설명과 플랫폼이 필요합니다.' }, { status: 400 })
    }
    const apiKey = req.headers.get('x-gemini-key') ?? undefined
    // 방향 발산은 짧은 구조화 JSON 작업이다. 완성 HTML만 3.6 Flash에 남기고
    // 이 단계는 고처리량용 GA Lite를 사용해 입력·출력 비용을 줄인다.
    const directions = await generateDesignDirections(body, prompt => generatePro(prompt, apiKey, GEMINI_ECONOMY_MODEL))
    const selected = body.visualRoles?.length === 3
      ? selectDirectionsForVisualRoles(directions, body.visualRoles)
      : selectDiverseDirections(directions, 3)
    const selectedCanvases = selected.map(direction => buildDesignCanvasIR(direction, body))
    // Every candidate gets a deterministic wireframe so the user can pick 3 of N
    // instead of the pipeline silently auto-narrowing. Same IR the picked
    // direction feeds into generateUI — no throwaway mock UI.
    const canvases = directions.map(direction => buildDesignCanvasIR(direction, body))
    return NextResponse.json({
      directions,
      selected,
      selectedCanvases,
      canvases,
    })
  } catch (error) {
    console.error('[generate-directions]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '디자인 방향 생성에 실패했습니다.' },
      { status: 500 },
    )
  }
}
