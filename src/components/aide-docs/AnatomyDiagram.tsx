'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ComponentPreview } from './ComponentPreview'
import { humanizeId } from '@/lib/aide-docs'

interface AnatomyPart {
  name: string
  description: string
  optional: boolean
}

interface Box { w: number; h: number; cx: number; cy: number }

// 파트 개수에 따라 핀을 배치할 방향(도). 왼쪽→위→오른쪽→아래→대각선 순으로,
// 리딩/라벨/트레일링처럼 좌우 대칭인 anatomy를 자연스럽게 표현한다.
const PIN_ANGLES = [180, -90, 0, 90, -45, -135, 45, 135]

function edgeAndPinPoint(box: Box, angleDeg: number, pinGap: number) {
  const angle = (angleDeg * Math.PI) / 180
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const hw = box.w / 2
  const hh = box.h / 2
  const candidates: number[] = []
  if (Math.abs(dx) > 1e-6) candidates.push(hw / Math.abs(dx))
  if (Math.abs(dy) > 1e-6) candidates.push(hh / Math.abs(dy))
  const t = Math.min(...candidates)
  return {
    edge: { x: box.cx + t * dx, y: box.cy + t * dy },
    pin: { x: box.cx + (t + pinGap) * dx, y: box.cy + (t + pinGap) * dy },
  }
}

/** anatomy 파트마다 번호 핀을 실물 프리뷰 둘레에 배치하고 연결선을 그려 시각적으로 짚어준다. */
export function AnatomyDiagram({ componentId, parts }: { componentId: string; parts: AnatomyPart[] }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null)
  const [box, setBox] = useState<Box | null>(null)

  useLayoutEffect(() => {
    const stage = stageRef.current
    const preview = previewRef.current
    if (!stage || !preview) return
    const update = () => {
      const stageRect = stage.getBoundingClientRect()
      const previewRect = preview.getBoundingClientRect()
      setStageSize({ w: stageRect.width, h: stageRect.height })
      setBox({
        w: previewRect.width,
        h: previewRect.height,
        cx: previewRect.left - stageRect.left + previewRect.width / 2,
        cy: previewRect.top - stageRect.top + previewRect.height / 2,
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [componentId, parts.length])

  const pinGap = 56
  const points = box
    ? parts.map((_, index) => edgeAndPinPoint(box, PIN_ANGLES[index % PIN_ANGLES.length], pinGap))
    : []

  return (
    <div className="docs-anatomy-visual">
      <div className="docs-anatomy-stage" ref={stageRef}>
        <div className="docs-anatomy-subject" ref={previewRef}><ComponentPreview id={componentId}/></div>
        {stageSize && points.length ? (
          <svg className="docs-anatomy-lines" width={stageSize.w} height={stageSize.h} aria-hidden="true">
            {points.map((point, index) => (
              <g key={index}>
                <line x1={point.pin.x} y1={point.pin.y} x2={point.edge.x} y2={point.edge.y}/>
                <circle cx={point.edge.x} cy={point.edge.y} r={3}/>
              </g>
            ))}
          </svg>
        ) : null}
        {points.map((point, index) => (
          <span className="docs-anatomy-pin" key={index} style={{ left: point.pin.x, top: point.pin.y }} aria-hidden="true">{index + 1}</span>
        ))}
      </div>
      <ul className="docs-anatomy-legend">{parts.map((part, index) => (
        <li key={`${part.name}-${index}`}>{index + 1}. {humanizeId(part.name)}{part.optional ? <em> 선택</em> : null}</li>
      ))}</ul>
    </div>
  )
}
