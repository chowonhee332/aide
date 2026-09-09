import * as React from "react"
import { Stepper as AstryxStepper, Step as AstryxStep } from "@astryxdesign/core/Stepper"

type Step = { id: string; label: React.ReactNode; description?: React.ReactNode }

/**
 * `stepper` from the aide.md `component_registry`, rendered by Astryx.
 *
 * The `steps`/`current` array API is kept; Astryx takes `<Step>` children and derives
 * completed/active/upcoming from `activeStep`, which replaces the hand-drawn
 * indicator circles, check marks and connector lines this component used to position
 * absolutely for both orientations.
 */
function Stepper({
  steps,
  current,
  orientation = "horizontal",
  className,
}: {
  steps: Step[]
  current: number
  orientation?: "horizontal" | "vertical"
  className?: string
}) {
  return (
    <div className={className}>
      <AstryxStepper activeStep={current} orientation={orientation} label="진행 단계">
        {steps.map((step, index) => (
          <AstryxStep
            key={step.id}
            step={index}
            label={String(step.label)}
            description={step.description === undefined ? undefined : String(step.description)}
          />
        ))}
      </AstryxStepper>
    </div>
  )
}
export { Stepper, type Step }
