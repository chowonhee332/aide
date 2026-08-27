'use client'

import { useState } from 'react'
import { ComponentPreview } from './ComponentPreview'
import { humanizeId } from '@/lib/aide-docs'

/**
 * 계약의 `props`(recipe properties)를 그대로 조작 패널로 만든다.
 * 값 목록을 손으로 다시 적지 않으므로, MD에 옵션이 추가되면 패널에도 바로 나타난다.
 */
export interface PlaygroundProp {
  name: string
  values: string[]
}

export function ComponentPlayground({
  id,
  props: contractProps,
  previewSize,
}: {
  id: string
  props: PlaygroundProp[]
  previewSize: string
}) {
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    Object.fromEntries(contractProps.map((prop) => [prop.name, prop.values[0]])),
  )

  if (!contractProps.length) {
    return <div className={`docs-detail-preview docs-detail-preview-${previewSize}`}><ComponentPreview id={id}/></div>
  }

  return <div className="docs-playground">
    <div className={`docs-playground-stage docs-detail-preview-${previewSize}`}>
      <ComponentPreview id={id} props={selection}/>
    </div>
    <div className="docs-playground-controls">
      {contractProps.map((prop) => (
        <fieldset key={prop.name}>
          <legend>{humanizeId(prop.name)}</legend>
          {prop.values.map((value) => {
            const checked = selection[prop.name] === value
            return (<label key={value} data-checked={checked}>
              <input
                type="radio"
                name={`${id}-${prop.name}`}
                value={value}
                checked={checked}
                onChange={() => setSelection((current) => ({ ...current, [prop.name]: value }))}
              />
              <span>{humanizeId(value)}</span>
            </label>)
          })}
        </fieldset>
      ))}
    </div>
  </div>
}
